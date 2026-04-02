import express from 'express';
import PDFDocument from 'pdfkit';
import { pool } from '../config/db.js';
import { requireAdmin } from '../middleware/adminAuth.js';
import { requirePermission } from '../middleware/permissions.js';
import { logAudit } from '../utils/audit.js';
import { checkIdempotency, completeIdempotency } from '../utils/idempotency.js';
import { logSecurityEvent } from '../utils/securityEvents.js';
import { buildTransactionMetadata } from '../utils/transactionMetadata.js';
import { checkAdminAdjustmentAnomaly } from '../utils/anomalies.js';
import { applyUserPII } from '../utils/encryption.js';

const router = express.Router();
const ADMIN_ADJUSTMENT_MAX = Number(process.env.ADMIN_ADJUSTMENT_MAX || 1000000);

router.get('/overview', requireAdmin, requirePermission('finance:read'), async (req, res) => {
  /*
    #swagger.tags = ['Admin Finance']
    #swagger.summary = 'Finance overview metrics'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.responses[200] = {
      description: 'Overview',
      schema: { $ref: '#/definitions/FinanceOverview' }
    }
  */
  const [[users]] = await pool.query('SELECT COUNT(*) as total FROM users');
  const [[volume]] = await pool.query('SELECT SUM(total) as total FROM transactions WHERE status = "success"');
  const [[revenue]] = await pool.query('SELECT SUM(fee) as total FROM transactions WHERE status = "success"');
  const [[credits]] = await pool.query(
    'SELECT SUM(total) as total FROM transactions WHERE status = "success" AND type IN ("receive")'
  );
  const [[debits]] = await pool.query(
    'SELECT SUM(total) as total FROM transactions WHERE status = "success" AND type IN ("send","bill","topup")'
  );
  const [[balances]] = await pool.query('SELECT SUM(balance) as total FROM wallets');

  return res.json({
    users: users.total,
    volume: Number(volume.total || 0),
    revenue: Number(revenue.total || 0),
    credits: Number(credits.total || 0),
    debits: Number(debits.total || 0),
    walletBalance: Number(balances.total || 0),
  });
});

router.get('/balances', requireAdmin, requirePermission('finance:read'), async (req, res) => {
  /*
    #swagger.tags = ['Admin Finance']
    #swagger.summary = 'List user wallet balances'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.parameters['limit'] = { in: 'query', type: 'number' }
    #swagger.parameters['offset'] = { in: 'query', type: 'number' }
    #swagger.responses[200] = { description: 'Balances', schema: { type: 'array', items: { $ref: '#/definitions/WalletBalanceRow' } } }
  */
  const limit = Math.min(Number(req.query.limit || 100), 200);
  const offset = Number(req.query.offset || 0);
  const [rows] = await pool.query(
    `SELECT u.id, u.full_name, u.email, u.full_name_encrypted, u.email_encrypted, w.balance, w.currency, w.updated_at
     FROM wallets w
     JOIN users u ON u.id = w.user_id
     ORDER BY w.balance DESC
     LIMIT ? OFFSET ?`,
    [limit, offset]
  );
  return res.json(rows.map((row) => applyUserPII(row)));
});

router.get('/export', requireAdmin, requirePermission('finance:read'), async (req, res) => {
  /*
    #swagger.tags = ['Admin Finance']
    #swagger.summary = 'Export finance report'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.parameters['format'] = { in: 'query', type: 'string', description: 'csv or pdf' }
    #swagger.parameters['from'] = { in: 'query', type: 'string' }
    #swagger.parameters['to'] = { in: 'query', type: 'string' }
    #swagger.responses[200] = { description: 'CSV or PDF report' }
  */
  const format = (req.query.format || 'csv').toString().toLowerCase();
  const safeFormat = format === 'pdf' ? 'pdf' : 'csv';
  const fromRaw = req.query.from;
  const toRaw = req.query.to;
  const fromDate = fromRaw ? new Date(fromRaw) : null;
  const toDate = toRaw ? new Date(toRaw) : null;
  const filters = [];
  const params = [];
  if (fromDate && !Number.isNaN(fromDate.getTime())) {
    filters.push('created_at >= ?');
    params.push(fromDate);
  }
  if (toDate && !Number.isNaN(toDate.getTime())) {
    filters.push('created_at <= ?');
    params.push(toDate);
  }
  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const fromLabel = fromDate && !Number.isNaN(fromDate.getTime()) ? fromDate.toISOString() : 'All time';
  const toLabel = toDate && !Number.isNaN(toDate.getTime()) ? toDate.toISOString() : 'Now';

  const [[volume]] = await pool.query(
    `SELECT SUM(total) as total FROM transactions ${where}`,
    params
  );
  const [[revenue]] = await pool.query(
    `SELECT SUM(fee) as total FROM transactions ${where}`,
    params
  );
  const [[credits]] = await pool.query(
    `SELECT SUM(total) as total FROM transactions ${where} ${
      where ? 'AND' : 'WHERE'
    } type IN ("receive")`,
    params
  );
  const [[debits]] = await pool.query(
    `SELECT SUM(total) as total FROM transactions ${where} ${
      where ? 'AND' : 'WHERE'
    } type IN ("send","bill","topup")`,
    params
  );

  if (safeFormat === 'pdf') {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="finance-report.pdf"');
    doc.pipe(res);
    doc.fontSize(18).text('GLY VTU Finance Report');
    doc.moveDown();
    doc.fontSize(12).text(`From: ${fromLabel}`);
    doc.fontSize(12).text(`To: ${toLabel}`);
    doc.moveDown();
    doc.fontSize(12).text(`Total Volume: ₦${Number(volume.total || 0).toFixed(2)}`);
    doc.fontSize(12).text(`Total Revenue: ₦${Number(revenue.total || 0).toFixed(2)}`);
    doc.fontSize(12).text(`Total Credits: ₦${Number(credits.total || 0).toFixed(2)}`);
    doc.fontSize(12).text(`Total Debits: ₦${Number(debits.total || 0).toFixed(2)}`);
    doc.end();
    return;
  }

  const csv = [
    ['Metric', 'Value'],
    ['From', fromLabel],
    ['To', toLabel],
    ['Total Volume', Number(volume.total || 0).toFixed(2)],
    ['Total Revenue', Number(revenue.total || 0).toFixed(2)],
    ['Total Credits', Number(credits.total || 0).toFixed(2)],
    ['Total Debits', Number(debits.total || 0).toFixed(2)],
  ]
    .map((row) =>
      row
        .map((c) => {
          let value = String(c);
          if (/^[=+\-@]/.test(value)) value = `'${value}`;
          return `"${value.replace(/"/g, '""')}"`;
        })
        .join(',')
    )
    .join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="finance-report.csv"');
  res.send(csv);
});

router.get('/adjustments', requireAdmin, requirePermission('transactions:read'), async (req, res) => {
  const status = req.query.status;
  const params = [];
  const where = status ? 'WHERE status = ?' : '';
  if (status) params.push(status);
  const [rows] = await pool.query(
    `SELECT a.id, a.user_id, u.full_name, u.full_name_encrypted, a.type, a.amount, a.status, a.reason, a.requested_by, a.approved_by, a.created_at
     FROM admin_adjustments a
     JOIN users u ON u.id = a.user_id
     ${where}
     ORDER BY a.created_at DESC
     LIMIT 200`,
    params
  );
  return res.json(rows.map((row) => applyUserPII(row)));
});

router.post(
  '/adjustments',
  requireAdmin,
  requirePermission('transactions:write'),
  async (req, res) => {
    const { userId, type, amount, reason } = req.body || {};
    const numericAmount = Number(amount);
    if (!userId || !['credit', 'debit'].includes(type)) {
      return res.status(400).json({ error: 'Invalid request' });
    }
    if (!numericAmount || numericAmount <= 0 || numericAmount > ADMIN_ADJUSTMENT_MAX) {
      return res.status(400).json({ error: 'Invalid amount' });
    }
    const [[user]] = await pool.query('SELECT id FROM users WHERE id = ?', [userId]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    await pool.query(
      `INSERT INTO admin_adjustments (id, user_id, type, amount, reason, requested_by)
       VALUES (UUID(), ?, ?, ?, ?, ?)`,
      [userId, type, numericAmount, reason || null, req.admin.sub]
    );
    logSecurityEvent({
      type: 'admin.adjustment.requested',
      severity: 'medium',
      actorType: 'admin',
      actorId: req.admin.sub,
      entityType: 'adjustment',
      entityId: userId,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: { type, amount: numericAmount, reason: reason || null },
    }).catch(() => null);
    checkAdminAdjustmentAnomaly({
      adminId: req.admin.sub,
      amount: numericAmount,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    logAudit({
      actorType: 'admin',
      actorId: req.admin.sub,
      action: 'admin.adjustment.request',
      entityType: 'adjustment',
      entityId: userId,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: { type, amount: numericAmount },
    }).catch(() => null);
    return res.status(201).json({ message: 'Adjustment requested' });
  }
);

router.post(
  '/adjustments/:id/approve',
  requireAdmin,
  requirePermission('transactions:write'),
  async (req, res) => {
    const id = req.params.id;
    const idemKey = (req.headers['x-idempotency-key'] || '').toString().trim() || null;
    const idem = await checkIdempotency({
      userId: req.admin.sub,
      key: idemKey,
      route: 'admin.adjustments.approve',
      body: req.body,
    });
    if (!idem.ok) return res.status(idem.status).json({ error: idem.error });
    if (idem.hit) return res.json(idem.response || {});

    async function respond(status, payload) {
      await completeIdempotency({
        userId: req.admin.sub,
        key: idemKey,
        route: 'admin.adjustments.approve',
        response: payload,
      });
      return res.status(status).json(payload);
    }
    const [[adj]] = await pool.query(
      'SELECT id, user_id, type, amount, status FROM admin_adjustments WHERE id = ? LIMIT 1',
      [id]
    );
    if (!adj) return respond(404, { error: 'Adjustment not found' });
    if (adj.status !== 'pending') return respond(400, { error: 'Not pending' });

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [walletRows] = await conn.query(
        'SELECT balance FROM wallets WHERE user_id = ? FOR UPDATE',
        [adj.user_id]
      );
      if (!walletRows.length) throw new Error('Wallet missing');
      if (adj.type === 'debit' && Number(walletRows[0].balance) < Number(adj.amount)) {
        await conn.rollback();
        return respond(400, { error: 'Insufficient balance' });
      }
      if (adj.type === 'credit') {
        await conn.query('UPDATE wallets SET balance = balance + ? WHERE user_id = ?', [
          adj.amount,
          adj.user_id,
        ]);
      } else {
        await conn.query('UPDATE wallets SET balance = balance - ? WHERE user_id = ?', [
          adj.amount,
          adj.user_id,
        ]);
      }
      const reference = `ADM-${id}`;
      const { safe, encrypted } = buildTransactionMetadata(
        { source: 'admin_adjustment', adjustment_id: id },
        adj.user_id
      );
      await conn.query(
        'INSERT INTO transactions (id, user_id, type, amount, fee, total, status, reference, metadata, metadata_encrypted) VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          adj.user_id,
          adj.type === 'credit' ? 'receive' : 'send',
          adj.amount,
          0,
          adj.amount,
          'success',
          reference,
          safe ? JSON.stringify(safe) : null,
          encrypted,
        ]
      );
      await conn.query(
        'UPDATE admin_adjustments SET status = ?, approved_by = ? WHERE id = ?',
        ['approved', req.admin.sub, id]
      );
      await conn.commit();
    } catch {
      await conn.rollback();
      return respond(500, { error: 'Approval failed' });
    } finally {
      conn.release();
    }

    logSecurityEvent({
      type: 'admin.adjustment.approved',
      severity: 'high',
      actorType: 'admin',
      actorId: req.admin.sub,
      entityType: 'adjustment',
      entityId: id,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: { amount: adj.amount, type: adj.type },
    }).catch(() => null);
    checkAdminAdjustmentAnomaly({
      adminId: req.admin.sub,
      amount: adj.amount,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    logAudit({
      actorType: 'admin',
      actorId: req.admin.sub,
      action: 'admin.adjustment.approve',
      entityType: 'adjustment',
      entityId: id,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    }).catch(() => null);
    return respond(200, { message: 'Adjustment approved', id });
  }
);

router.post(
  '/adjustments/:id/reject',
  requireAdmin,
  requirePermission('transactions:write'),
  async (req, res) => {
    const id = req.params.id;
    const [[adj]] = await pool.query(
      'SELECT id, status FROM admin_adjustments WHERE id = ? LIMIT 1',
      [id]
    );
    if (!adj) return res.status(404).json({ error: 'Adjustment not found' });
    if (adj.status !== 'pending') return res.status(400).json({ error: 'Not pending' });

    await pool.query('UPDATE admin_adjustments SET status = ?, approved_by = ? WHERE id = ?', [
      'rejected',
      req.admin.sub,
      id,
    ]);

    logAudit({
      actorType: 'admin',
      actorId: req.admin.sub,
      action: 'admin.adjustment.reject',
      entityType: 'adjustment',
      entityId: id,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    }).catch(() => null);
    return res.json({ message: 'Adjustment rejected', id });
  }
);

export default router;
