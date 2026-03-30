import express from 'express';
import { pool } from '../config/db.js';
import { requireAdmin } from '../middleware/adminAuth.js';
import { requirePermission } from '../middleware/permissions.js';
import { requeryService } from '../utils/vtpass.js';
import { sendReceiptEmail } from '../utils/email.js';
import { applyUserPII } from '../utils/encryption.js';

const router = express.Router();

router.get('/events', requireAdmin, requirePermission('bills:read'), async (req, res) => {
  const limit = Math.min(Number(req.query.limit || 100), 200);
  const offset = Number(req.query.offset || 0);
  const status = req.query.status || '';
  const filters = [];
  const params = [];
  if (status) {
    filters.push('status = ?');
    params.push(status);
  }
  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const [rows] = await pool.query(
    `SELECT request_id, transaction_id, status, updated_at
     FROM vtpass_events
     ${where}
     ORDER BY updated_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  return res.json(rows);
});

router.post('/requery', requireAdmin, requirePermission('bills:read'), async (req, res) => {
  const { requestId } = req.body || {};
  if (!requestId) return res.status(400).json({ error: 'Missing requestId' });
  const data = await requeryService(requestId);

  const statusRaw = data?.content?.transactions?.status || '';
  const status =
    statusRaw === 'delivered'
      ? 'success'
      : statusRaw === 'reversed' || statusRaw === 'failed'
        ? 'failed'
        : 'pending';

  await pool.query(
    `INSERT INTO vtpass_events (id, request_id, transaction_id, status, raw_payload)
     VALUES (UUID(), ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE transaction_id = VALUES(transaction_id), status = VALUES(status), raw_payload = VALUES(raw_payload)`,
    [requestId, data?.content?.transactions?.transactionId || null, status, JSON.stringify(data)]
  );

  const reference = `BILL-${requestId}`;
  const [txRows] = await pool.query(
    'SELECT id, user_id, status, amount, total, reference FROM transactions WHERE reference = ? LIMIT 1',
    [reference]
  );
  if (txRows.length) {
    const tx = txRows[0];
    if (tx.status !== status) {
      await pool.query('UPDATE transactions SET status = ? WHERE id = ?', [status, tx.id]);
      await pool.query('UPDATE bill_orders SET status = ? WHERE reference = ?', [status, reference]);
    }
    if (status === 'success' && tx.status !== 'success') {
      const [[userRaw]] = await pool.query(
        'SELECT id, full_name, email, full_name_encrypted, email_encrypted FROM users WHERE id = ?',
        [tx.user_id]
      );
      const user = applyUserPII(userRaw);
      if (user?.email) {
        sendReceiptEmail({
          to: user.email,
          name: user.full_name,
          title: 'Bill Payment Successful',
          details: [
            `Reference: ${reference}`,
            `Amount: NGN ${Number(tx.amount || 0).toFixed(2)}`,
            `Total: NGN ${Number(tx.total || 0).toFixed(2)}`,
          ],
        }).catch(console.error);
      }
    }
  }

  return res.json({ message: 'Requery complete', status, data });
});

export default router;
