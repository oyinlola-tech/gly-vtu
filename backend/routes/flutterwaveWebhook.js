import express from 'express';
import { pool } from '../config/db.js';
import { verifyFlutterwaveWebhook } from '../utils/flutterwave.js';
import { sanitizeFlutterwaveWebhook } from '../utils/sanitize.js';
import { sendReceiptEmail } from '../utils/email.js';

const router = express.Router();

router.post('/', async (req, res) => {
  if (!verifyFlutterwaveWebhook(req)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const payload = req.body || {};
  const event = payload.event || '';
  const data = payload.data || {};
  const status = data.status || '';

  await pool.query(
    `INSERT INTO flutterwave_events (id, event_id, tx_ref, flw_ref, status, raw_payload)
     VALUES (UUID(), ?, ?, ?, ?, ?)`,
    [
      data.id || null,
      data.tx_ref || null,
      data.flw_ref || null,
      status || 'unknown',
      JSON.stringify(sanitizeFlutterwaveWebhook(payload)),
    ]
  );

  if (event !== 'charge.completed') {
    return res.json({ message: 'Ignored' });
  }
  if (status !== 'successful') {
    return res.json({ message: 'Ignored' });
  }
  if (String(data.currency || '').toUpperCase() !== 'NGN') {
    return res.json({ message: 'Ignored' });
  }

  const txRef = data.tx_ref;
  if (!txRef) return res.json({ message: 'No tx_ref' });

  const [[account]] = await pool.query(
    'SELECT user_id, account_number, bank_name FROM reserved_accounts WHERE account_reference = ? AND provider = ? LIMIT 1',
    [txRef, 'flutterwave']
  );
  if (!account) return res.json({ message: 'Account not found' });

  const amount = Number(data.amount || 0);
  if (!amount || amount <= 0) return res.json({ message: 'Invalid amount' });

  const reference = `FLW-${data.flw_ref || data.id || txRef}`;
  const [existing] = await pool.query(
    'SELECT id FROM transactions WHERE reference = ? LIMIT 1',
    [reference]
  );
  if (existing.length) return res.json({ message: 'Already processed' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('UPDATE wallets SET balance = balance + ? WHERE user_id = ?', [
      amount,
      account.user_id,
    ]);
    await conn.query(
      'INSERT INTO transactions (id, user_id, type, amount, fee, total, status, reference, metadata) VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        account.user_id,
        'topup',
        amount,
        0,
        amount,
        'success',
        reference,
        JSON.stringify({
          provider: 'flutterwave',
          tx_ref: txRef,
          flw_ref: data.flw_ref || null,
          payment_type: data.payment_type || null,
        }),
      ]
    );
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    return res.status(500).json({ error: 'Failed to credit wallet' });
  } finally {
    conn.release();
  }

  const [[user]] = await pool.query('SELECT full_name, email FROM users WHERE id = ?', [
    account.user_id,
  ]);
  if (user?.email) {
    sendReceiptEmail({
      to: user.email,
      name: user.full_name,
      title: 'Wallet Top-Up Successful',
      details: [
        `Amount: NGN ${amount.toFixed(2)}`,
        `Reference: ${reference}`,
        `Bank: ${account.bank_name || 'Flutterwave'}`,
      ],
    }).catch(console.error);
  }

  return res.json({ message: 'OK' });
});

export default router;
