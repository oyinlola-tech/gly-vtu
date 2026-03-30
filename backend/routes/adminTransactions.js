import express from 'express';
import { pool } from '../config/db.js';
import { requireAdmin } from '../middleware/adminAuth.js';
import { requirePermission } from '../middleware/permissions.js';
import { logAudit } from '../utils/audit.js';
import { checkIdempotency, completeIdempotency } from '../utils/idempotency.js';
import { logSecurityEvent } from '../utils/securityEvents.js';

const router = express.Router();

router.get('/', requireAdmin, requirePermission('transactions:read'), async (req, res) => {
  /*
    #swagger.tags = ['Admin Transactions']
    #swagger.summary = 'List recent transactions'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.responses[200] = { description: 'Transactions', schema: { type: 'array', items: { $ref: '#/definitions/AdminTransaction' } } }
  */
  const [rows] = await pool.query(
    `SELECT t.id, u.full_name, t.type, t.amount, t.fee, t.total, t.status, t.reference, t.created_at,
        t.metadata, v.status as vtpass_status, v.updated_at as vtpass_updated_at
     FROM transactions t
     JOIN users u ON u.id = t.user_id
     LEFT JOIN vtpass_events v ON v.request_id = SUBSTRING(t.reference, 6)
     ORDER BY t.created_at DESC
     LIMIT 200`
  );
  return res.json(rows);
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
  const [[volume]] = await pool.query('SELECT SUM(total) as total FROM transactions WHERE status = \"success\"');
  return res.json({
    users: users.total,
    transactions: tx.total,
    volume: Number(volume.total || 0),
  });
});

router.get('/held-topups', requireAdmin, requirePermission('transactions:read'), async (req, res) => {
  const [rows] = await pool.query(
    `SELECT t.id, t.user_id, u.full_name, t.amount, t.reference, t.metadata, t.created_at
     FROM transactions t
     JOIN users u ON u.id = t.user_id
     WHERE t.type = 'topup' AND t.status = 'pending'
       AND JSON_EXTRACT(t.metadata, '$.reason') = 'kyc_limit'
     ORDER BY t.created_at DESC
     LIMIT 200`
  );
  return res.json(rows);
});

router.post(
  '/held-topups/:reference/approve',
  requireAdmin,
  requirePermission('transactions:write'),
  async (req, res) => {
    const reference = req.params.reference;
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
    const [[tx]] = await pool.query(
      'SELECT user_id, amount, status FROM transactions WHERE reference = ? AND type = ? LIMIT 1',
      [reference, 'topup']
    );
    if (!tx) return respond(404, { error: 'Transaction not found' });
    if (tx.status !== 'pending') return respond(400, { error: 'Not pending' });

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query('UPDATE wallets SET balance = balance + ? WHERE user_id = ?', [
        tx.amount,
        tx.user_id,
      ]);
      await conn.query('UPDATE transactions SET status = ? WHERE reference = ?', [
        'success',
        reference,
      ]);
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      return respond(500, { error: 'Approval failed' });
    } finally {
      conn.release();
    }

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

    return respond(200, { message: 'Topup approved', reference });
  }
);

router.post(
  '/held-topups/:reference/reject',
  requireAdmin,
  requirePermission('transactions:write'),
  async (req, res) => {
    const reference = req.params.reference;
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

export default router;
