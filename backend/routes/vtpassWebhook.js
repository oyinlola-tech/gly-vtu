import express from 'express';
import { pool } from '../config/db.js';
import { sendReceiptEmail } from '../utils/email.js';

const router = express.Router();

router.post('/', async (req, res) => {
  const payload = req.body || {};
  const type = payload.type || '';
  if (type !== 'transaction-update') {
    return res.status(200).json({ message: 'Ignored' });
  }

  const data = payload.data || {};
  const requestId = data.requestId || data.request_id;
  const transactionId = data?.content?.transactions?.transactionId;
  const statusRaw = data?.content?.transactions?.status || '';
  const status =
    statusRaw === 'delivered'
      ? 'success'
      : statusRaw === 'reversed' || statusRaw === 'failed'
        ? 'failed'
        : 'pending';

  if (!requestId) return res.status(400).json({ error: 'Missing requestId' });

  await pool.query(
    `INSERT INTO vtpass_events (id, request_id, transaction_id, status, raw_payload)
     VALUES (UUID(), ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE transaction_id = VALUES(transaction_id), status = VALUES(status), raw_payload = VALUES(raw_payload)`,
    [requestId, transactionId || null, status, JSON.stringify(payload)]
  );

  const reference = `BILL-${requestId}`;
  const [txRows] = await pool.query(
    'SELECT id, user_id, status, amount, total, reference FROM transactions WHERE reference = ? LIMIT 1',
    [reference]
  );
  if (!txRows.length) return res.json({ message: 'OK' });

  const tx = txRows[0];
  if (tx.status !== status) {
    await pool.query('UPDATE transactions SET status = ? WHERE id = ?', [status, tx.id]);
    await pool.query('UPDATE bill_orders SET status = ? WHERE reference = ?', [status, reference]);
  }

  if (status === 'success' && tx.status !== 'success') {
    const [[user]] = await pool.query('SELECT full_name, email FROM users WHERE id = ?', [
      tx.user_id,
    ]);
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

  return res.json({ message: 'OK' });
});

export default router;
