import express from 'express';
import { pool } from '../config/db.js';
import { verifyFlutterwaveWebhook } from '../utils/flutterwave.js';
import { sanitizeFlutterwaveWebhook } from '../utils/sanitize.js';
import { enforceKycLimits } from '../utils/kycLimits.js';
import { sendReceiptEmail } from '../utils/email.js';
import { logSecurityEvent } from '../utils/securityEvents.js';
import { logger } from '../utils/logger.js';
import { webhookLimiter } from '../middleware/rateLimiters.js';
import { applyUserPII } from '../utils/encryption.js';
import { buildTransactionMetadata } from '../utils/transactionMetadata.js';

const router = express.Router();

// Utility to get request IP
function getRequestIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return String(forwarded).split(',')[0].trim();
  }
  return req.ip;
}

// IP whitelist validation for Flutterwave webhooks - MANDATORY in production
function isIpAllowed(req) {
  const list = (process.env.FLW_WEBHOOK_IPS || '')
    .split(',')
    .map((ip) => ip.trim())
    .filter(Boolean);
  
  // In production, IP whitelist MUST be configured
  if (process.env.NODE_ENV === 'production' && !list.length) {
    logger.error('FLW_WEBHOOK_IPS not configured in production', {
      severity: 'critical',
      remedy: 'Set FLW_WEBHOOK_IPS environment variable with comma-separated Flutterwave IPs'
    });
    return false;
  }
  
  // In non-production, only allow all if explicitly enabled
  if (!list.length) {
    if (process.env.NODE_ENV !== 'production' && process.env.ALLOW_ANY_WEBHOOK_IP === 'true') {
      logger.warn('Webhook IP validation disabled (dev only)');
      return true;
    }
    return false;
  }
  
  const ip = getRequestIp(req);
  const allowed = list.includes(ip);
  
  if (!allowed && process.env.NODE_ENV === 'production') {
    logger.warn('Webhook IP rejected (not in whitelist)', { ip });
  }
  
  return allowed;
}

router.post('/', webhookLimiter, async (req, res) => {
  // Check IP whitelist first
  if (!isIpAllowed(req)) {
    logSecurityEvent({
      type: 'webhook.flutterwave.ip_rejected',
      severity: 'high',
      actorType: 'system',
      ip: getRequestIp(req),
      userAgent: req.headers['user-agent'],
      metadata: { reason: 'IP not whitelisted' },
    }).catch(() => null);
    return res.status(403).json({ error: 'IP not allowed' });
  }

  // Verify webhook signature
  if (!verifyFlutterwaveWebhook(req)) {
    logSecurityEvent({
      type: 'webhook.flutterwave.invalid',
      severity: 'high',
      actorType: 'system',
      ip: getRequestIp(req),
      userAgent: req.headers['user-agent'],
      metadata: { signature: Boolean(req.headers['verif-hash']) },
    }).catch(() => null);
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const payload = req.body || {};
  const event = payload.event || '';
  const data = payload.data || {};
  const status = data.status || '';
  
  // SECURITY: Deduplicate webhook events using Flutterwave's unique event ID
  // This prevents double-crediting if Flutterwave retries webhook delivery
  // Each webhook has a unique id field that identifies it across retries
  const eventId = data.id || data.event_id;
  if (eventId) {
    // Check if this event was already processed in the last 5 minutes
    const [[existing]] = await pool.query(
      'SELECT id, processed_at FROM flutterwave_events WHERE event_id = ? AND processed_at > ? LIMIT 1',
      [eventId, new Date(Date.now() - 5 * 60 * 1000)]
    );
    if (existing && existing.processed_at) {
      // Duplicate event - return success without reprocessing
      logger.debug('Webhook duplicate detected and ignored', { 
        eventId, 
        originalTime: existing.processed_at 
      });
      return res.json({ message: 'OK' }); // Return OK so Flutterwave doesn't retry
    }
  }

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
    logSecurityEvent({
      type: 'webhook.flutterwave.currency_mismatch',
      severity: 'medium',
      actorType: 'system',
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: { currency: data.currency, tx_ref: data.tx_ref },
    }).catch(() => null);
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

  const [[userRow]] = await pool.query('SELECT kyc_level FROM users WHERE id = ?', [
    account.user_id,
  ]);
  const limitCheck = await enforceKycLimits({
    userId: account.user_id,
    level: userRow?.kyc_level || 1,
    amount,
    types: ['topup'],
  });
  if (!limitCheck.ok) {
    const { safe, encrypted } = buildTransactionMetadata(
      { provider: 'flutterwave', reason: 'kyc_limit' },
      account.user_id
    );
    await pool.query(
      'INSERT INTO transactions (id, user_id, type, amount, fee, total, status, reference, metadata, metadata_encrypted) VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        account.user_id,
        'topup',
        amount,
        0,
        amount,
        'pending',
        reference,
        safe ? JSON.stringify(safe) : null,
        encrypted,
      ]
    );
    logSecurityEvent({
      type: 'kyc.limit.topup_hold',
      severity: 'medium',
      actorType: 'user',
      actorId: account.user_id,
      entityType: 'transaction',
      entityId: reference,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: { amount, message: limitCheck.message },
    }).catch(() => null);
    return res.json({ message: 'Held for KYC limits' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.query('SET TRANSACTION ISOLATION LEVEL SERIALIZABLE');
    await conn.beginTransaction();

    const { safe, encrypted } = buildTransactionMetadata(
      {
        provider: 'flutterwave',
        tx_ref: txRef,
        flw_ref: data.flw_ref || null,
        payment_type: data.payment_type || null,
      },
      account.user_id
    );

    try {
      // Insert first to claim the unique reference and prevent double-credit
      await conn.query(
        'INSERT INTO transactions (id, user_id, type, amount, fee, total, status, reference, metadata, metadata_encrypted) VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          account.user_id,
          'topup',
          amount,
          0,
          amount,
          'pending',
          reference,
          safe ? JSON.stringify(safe) : null,
          encrypted,
        ]
      );
    } catch (err) {
      if (err?.code === 'ER_DUP_ENTRY') {
        await conn.rollback();
        return res.json({ message: 'Already processed' });
      }
      throw err;
    }

    const [[wallet]] = await conn.query(
      'SELECT id, balance FROM wallets WHERE user_id = ? FOR UPDATE',
      [account.user_id]
    );
    if (!wallet) {
      await conn.rollback();
      return res.status(404).json({ error: 'Wallet not found' });
    }

    await conn.query('UPDATE wallets SET balance = balance + ? WHERE id = ?', [
      amount,
      wallet.id,
    ]);
    await conn.query('UPDATE transactions SET status = ? WHERE reference = ?', [
      'success',
      reference,
    ]);

    await conn.commit();
  } catch (_) {
    await conn.rollback();
    return res.status(500).json({ error: 'Failed to credit wallet' });
  } finally {
    conn.release();
  }

  const [[userRaw]] = await pool.query(
    'SELECT id, full_name, email, full_name_encrypted, email_encrypted FROM users WHERE id = ?',
    [account.user_id]
  );
  const user = applyUserPII(userRaw);
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
    }).catch((err) => logger.error('Receipt email send error (flutterwave)', { error: logger.format(err) }));
  }

  return res.json({ message: 'OK' });
});

export default router;
