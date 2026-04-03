import express from 'express';
import crypto from 'crypto';
import { pool } from '../config/db.js';
import { sendReceiptEmail } from '../utils/email.js';
import { sanitizeVtpassPayload } from '../utils/sanitize.js';
import { logSecurityEvent } from '../utils/securityEvents.js';
import { webhookLimiter } from '../middleware/rateLimiters.js';
import { applyUserPII } from '../utils/encryption.js';
import { logger } from '../utils/logger.js';
import { getRequestIp } from '../utils/requestIp.js';
import { refundPendingBill } from '../utils/billRefund.js';

const router = express.Router();

function verifyVtpassWebhook(req, secret) {
  if (!secret) return false;
  const signature = (req.headers['x-vtpass-signature'] || '').toString();
  if (!signature) return false;
  const rawBody = Buffer.isBuffer(req.rawBody) ? req.rawBody : Buffer.from(req.rawBody || '');
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  try {
    if (expected.length !== signature.length) return false;
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

function ipAllowed(req) {
  const list = (process.env.VTPASS_WEBHOOK_IPS || '')
    .split(',')
    .map((ip) => ip.trim())
    .filter(Boolean);
  if (!list.length) {
    if (process.env.NODE_ENV === 'production') {
      logger.error('VTPASS_WEBHOOK_IPS not configured in production', {
        severity: 'critical',
      });
      return false;
    }
    if (process.env.ALLOW_ANY_WEBHOOK_IP === 'true') {
      logger.warn('Webhook IP validation disabled (dev only)');
      return true;
    }
    return false;
  }
  const ip = getRequestIp(req);
  return list.includes(ip);
}

router.post('/', webhookLimiter, async (req, res) => {
  const secret = (process.env.VTPASS_WEBHOOK_SECRET || '').trim();
  if (!secret) {
    logger.error('CRITICAL: VTPASS_WEBHOOK_SECRET not configured');
    return res.status(503).json({
      success: false,
      error: 'Service unavailable - webhook secret not configured',
    });
  }

  if (!ipAllowed(req)) {
    logSecurityEvent({
      type: 'webhook.vtpass.ip_rejected',
      severity: 'high',
      actorType: 'system',
      ip: getRequestIp(req),
      userAgent: req.headers['user-agent'],
      metadata: { ip: getRequestIp(req) },
    }).catch(() => null);
    return res.status(403).json({ error: 'IP not whitelisted' });
  }

  const signatureValid = verifyVtpassWebhook(req, secret);
  if (!signatureValid) {
    logSecurityEvent({
      type: 'webhook.vtpass.invalid',
      severity: 'high',
      actorType: 'system',
      ip: getRequestIp(req),
      userAgent: req.headers['user-agent'],
      metadata: {
        signature: Boolean(req.headers['x-vtpass-signature']),
        ipAllowed: true,
      },
    }).catch(() => null);
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

  if (tx.status !== status && status === 'failed') {
    await refundPendingBill(reference);
  } else if (tx.status !== status) {
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
      }).catch((err) =>
        logger.error('Receipt email send error (vtpass)', { error: logger.format(err) })
      );
    }
  }

  return res.json({ message: 'OK' });
});

export default router;
