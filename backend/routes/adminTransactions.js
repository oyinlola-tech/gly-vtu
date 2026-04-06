import express from 'express';
import { pool } from '../config/db.js';
import { requireAdmin } from '../middleware/adminAuth.js';
import { requirePermission } from '../middleware/permissions.js';
import { logAudit } from '../utils/audit.js';
import { checkIdempotency, completeIdempotency } from '../utils/idempotency.js';
import { logSecurityEvent } from '../utils/securityEvents.js';
import { applyUserPII } from '../utils/encryption.js';
import { runFullReconciliation } from '../utils/reconciliation.js';
import { hydrateTransactionMetadata } from '../utils/transactionMetadata.js';
import { toCsv, csvRow } from '../utils/csv.js';
import {
  validateParams,
  validateRequest,
  adminReferenceParamSchema,
  adminTransactionsExportSchema,
} from '../middleware/requestValidation.js';

const router = express.Router();

router.get('/', requireAdmin, requirePermission('transactions:read'), async (req, res) => {
  /*
    #swagger.tags = ['Admin Transactions']
    #swagger.summary = 'List recent transactions'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.responses[200] = { description: 'Transactions', schema: { type: 'array', items: { $ref: '#/definitions/AdminTransaction' } } }
  */
  const [rows] = await pool.query(
    `SELECT t.id, u.id as user_id, u.full_name, u.full_name_encrypted, t.type, t.amount, t.fee, t.total, t.status, t.reference, t.created_at,
        t.metadata, t.metadata_encrypted, v.status as vtpass_status, v.updated_at as vtpass_updated_at
     FROM transactions t
     JOIN users u ON u.id = t.user_id
     LEFT JOIN vtpass_events v ON v.request_id = SUBSTRING(t.reference, 6)
     ORDER BY t.created_at DESC
     LIMIT 200`
  );
  const mapped = rows.map((row) => {
    const meta = hydrateTransactionMetadata(row, row.user_id);
    const rest = { ...row };
    delete rest.metadata_encrypted;
    return applyUserPII({ ...rest, metadata: meta });
  });
  return res.json(mapped);
});

router.get('/metrics', requireAdmin, requirePermission('transactions:read'), async (req, res) => {
  /*
    #swagger.tags = ['Admin Transactions']
    #swagger.summary = 'Transaction metrics'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.responses[200] = {
      description: 'Metrics',
      schema: {
        type: 'object',
        properties: {
          users: { type: 'number' },
          transactions: { type: 'number' },
          volume: { type: 'number' }
        }
      }
    }
  */
  const [[users]] = await pool.query('SELECT COUNT(*) as total FROM users');
  const [[tx]] = await pool.query('SELECT COUNT(*) as total FROM transactions');
  const [[volume]] = await pool.query("SELECT SUM(total) as total FROM transactions WHERE status = 'success'");
  return res.json({
    users: users.total,
    transactions: tx.total,
    volume: Number(volume.total || 0),
  });
});

router.post('/export', requireAdmin, requirePermission('transactions:read'), validateRequest(adminTransactionsExportSchema), async (req, res) => {
  const { type, status, search, userId, dateFrom, dateTo, limit } = req.validated || req.body || {};
  const filters = [];
  const params = [];

  if (userId) {
    filters.push('t.user_id = ?');
    params.push(userId);
  }
  if (type) {
    filters.push('t.type = ?');
    params.push(type);
  }
  if (status) {
    filters.push('t.status = ?');
    params.push(status);
  }
  if (search) {
    filters.push('t.reference LIKE ?');
    params.push(`%${String(search).trim()}%`);
  }
  if (dateFrom) {
    filters.push('t.created_at >= CONCAT(?, " 00:00:00")');
    params.push(dateFrom);
  }
  if (dateTo) {
    filters.push('t.created_at <= CONCAT(?, " 23:59:59")');
    params.push(dateTo);
  }

  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const capped = Math.min(Number(limit || 1000), 5000);

  const [rows] = await pool.query(
    `SELECT t.id, t.user_id, u.full_name, u.full_name_encrypted, t.type, t.amount, t.fee, t.total, t.status, t.reference, t.created_at
     FROM transactions t
     JOIN users u ON u.id = t.user_id
     ${where}
     ORDER BY t.created_at DESC
     LIMIT ?`,
    [...params, capped]
  );

  const header = csvRow('id', 'user_id', 'user_name', 'type', 'amount', 'fee', 'total', 'status', 'reference', 'created_at');
  const lines = [header];
  for (const row of rows || []) {
    const safe = applyUserPII(row);
    lines.push(
      csvRow(
        safe.id,
        safe.user_id,
        safe.full_name || '',
        safe.type,
        Number(safe.amount || 0).toFixed(2),
        Number(safe.fee || 0).toFixed(2),
        Number(safe.total || 0).toFixed(2),
        safe.status,
        safe.reference,
        safe.created_at ? new Date(safe.created_at).toISOString() : ''
      )
    );
  }

  const filename = `admin-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  return res.send(toCsv(lines));
});

router.get('/held-topups', requireAdmin, requirePermission('transactions:read'), async (req, res) => {
  const [rows] = await pool.query(
    `SELECT t.id, t.user_id, u.full_name, u.full_name_encrypted, t.amount, t.reference, t.metadata, t.metadata_encrypted, t.created_at
     FROM transactions t
     JOIN users u ON u.id = t.user_id
     WHERE t.type = 'topup' AND t.status = 'pending'
       AND JSON_EXTRACT(t.metadata, '$.reason') = 'kyc_limit'
     ORDER BY t.created_at DESC
     LIMIT 200`
  );
  const mapped = rows.map((row) => {
    const meta = hydrateTransactionMetadata(row, row.user_id);
    const rest = { ...row };
    delete rest.metadata_encrypted;
    return applyUserPII({ ...rest, metadata: meta });
  });
  return res.json(mapped);
});

router.post(
  '/held-topups/:reference/approve',
  requireAdmin,
  requirePermission('transactions:write'),
  validateParams(adminReferenceParamSchema),
  async (req, res) => {
    const reference = req.validatedParams.reference;
    let tx = null;
    const idemKey = (req.headers['x-idempotency-key'] || '').toString().trim() || null;
    const idem = await checkIdempotency({
      userId: req.admin.sub,
      key: idemKey,
      route: 'admin.topup.approve',
      body: req.body,
    });
    if (!idem.ok) return res.status(idem.status).json({ error: idem.error });
    if (idem.hit) return res.json(idem.response || {});

    async function respond(status, payload) {
      await completeIdempotency({
        userId: req.admin.sub,
        key: idemKey,
        route: 'admin.topup.approve',
        response: payload,
      });
      return res.status(status).json(payload);
    }
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [[txRow]] = await conn.query(
        'SELECT id, user_id, amount, status FROM transactions WHERE reference = ? AND type = ? FOR UPDATE',
        [reference, 'topup']
      );
      tx = txRow;
      if (!tx) {
        await conn.rollback();
        return respond(404, { error: 'Transaction not found' });
      }
      if (tx.status !== 'pending') {
        await conn.rollback();
        return respond(400, { error: 'Not pending' });
      }
      await conn.query('UPDATE wallets SET balance = balance + ? WHERE user_id = ?', [
        tx.amount,
        tx.user_id,
      ]);
      await conn.query('UPDATE transactions SET status = ? WHERE reference = ?', [
        'success',
        reference,
      ]);
      await conn.commit();
    } catch {
      await conn.rollback();
      return respond(500, { error: 'Approval failed' });
    } finally {
      conn.release();
    }

    if (tx) {
      logSecurityEvent({
        type: 'admin.topup.approved',
        severity: 'medium',
        actorType: 'admin',
        actorId: req.admin.sub,
        entityType: 'transaction',
        entityId: reference,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        metadata: { amount: tx.amount },
      }).catch(() => null);
      logAudit({
        actorType: 'admin',
        actorId: req.admin.sub,
        action: 'admin.topup.approve',
        entityType: 'transaction',
        entityId: reference,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      }).catch(() => null);
    }

    return respond(200, { message: 'Topup approved', reference });
  }
);

router.post(
  '/held-topups/:reference/reject',
  requireAdmin,
  requirePermission('transactions:write'),
  validateParams(adminReferenceParamSchema),
  async (req, res) => {
    const reference = req.validatedParams.reference;
    const [[tx]] = await pool.query(
      'SELECT user_id, amount, status FROM transactions WHERE reference = ? AND type = ? LIMIT 1',
      [reference, 'topup']
    );
    if (!tx) return res.status(404).json({ error: 'Transaction not found' });
    if (tx.status !== 'pending') return res.status(400).json({ error: 'Not pending' });

    await pool.query('UPDATE transactions SET status = ? WHERE reference = ?', [
      'failed',
      reference,
    ]);

    logAudit({
      actorType: 'admin',
      actorId: req.admin.sub,
      action: 'admin.topup.reject',
      entityType: 'transaction',
      entityId: reference,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    }).catch(() => null);

    return res.json({ message: 'Topup rejected', reference });
  }
);

router.post(
  '/reconcile',
  requireAdmin,
  requirePermission('transactions:write'),
  async (req, res) => {
    /*
      #swagger.tags = ['Admin Transactions']
      #swagger.summary = 'Run transaction reconciliation'
      #swagger.security = [{ "bearerAuth": [] }]
      #swagger.responses[200] = { description: 'Reconciliation results' }
    */
    try {
      const result = await runFullReconciliation();
      return res.json(result);
    } catch (error) {
      return res.status(500).json({ error: 'Reconciliation failed', details: error.message });
    }
  }
);

export default router;
