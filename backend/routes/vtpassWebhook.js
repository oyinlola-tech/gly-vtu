import express from 'express';
import crypto from 'crypto';
import { pool } from '../config/db.js';
import { sendReceiptEmail } from '../utils/email.js';
import { sanitizeVtpassPayload } from '../utils/sanitize.js';

const router = express.Router();

function getRequestIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return String(forwarded).split(',')[0].trim();
  }
  return req.ip;
}

function verifyVtpassWebhook(req) {
  const secret = (process.env.VTPASS_WEBHOOK_SECRET || '').trim();
  const signature = (req.headers['x-vtpass-signature'] || '').toString();
  if (!secret || !signature) return false;
  const raw = req.rawBody || '';
  const expected = crypto.createHmac('sha256', secret).update(raw).digest('hex');
  if (expected.length !== signature.length) return false;
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

function ipAllowed(req) {
  const list = (process.env.VTPASS_WEBHOOK_IPS || '')
    .split(',')
    .map((ip) => ip.trim())
    .filter(Boolean);
  if (!list.length) return process.env.NODE_ENV !== 'production';
  const ip = getRequestIp(req);
  return list.includes(ip);
}

router.post('/', async (req, res) => {
  if (!verifyVtpassWebhook(req) || !ipAllowed(req)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
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
    [requestId, transactionId || null, status, JSON.stringify(sanitizeVtpassPayload(payload))]
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
