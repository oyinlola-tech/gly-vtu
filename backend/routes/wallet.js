import express from 'express';
import { pool } from '../config/db.js';
import { requireUser } from '../middleware/auth.js';
import { nanoid } from 'nanoid';
import crypto from 'crypto';
import { sendReceiptEmail } from '../utils/email.js';
import { logAudit } from '../utils/audit.js';
import { verifyTransactionPin, isValidPin } from '../utils/pin.js';
import { enforceKycLimits } from '../utils/kycLimits.js';
import { checkIdempotency, completeIdempotency } from '../utils/idempotency.js';
import { logSecurityEvent } from '../utils/securityEvents.js';
import { checkWithdrawalAnomaly, checkNewRecipientAnomaly } from '../utils/anomalies.js';
import { applyUserPII, hashEmail, hashPhone } from '../utils/encryption.js';
import { buildTransactionMetadata } from '../utils/transactionMetadata.js';
import { validateRequest, walletSendSchema, walletReceiveSchema } from '../middleware/requestValidation.js';
import { logger } from '../utils/logger.js';
import { createTransfer } from '../utils/flutterwave.js';

const router = express.Router();

const INTERNAL_TRANSFER_COOLDOWN_SECONDS = Number(
  process.env.INTERNAL_TRANSFER_COOLDOWN_SECONDS || 10
);

function isEmail(value) {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 254) return false;
  if (trimmed.includes(' ')) return false;
  const at = trimmed.indexOf('@');
  if (at <= 0 || at !== trimmed.lastIndexOf('@')) return false;
  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);
  if (!local || !domain || domain.length < 3) return false;
  if (!domain.includes('.') || domain.startsWith('.') || domain.endsWith('.')) return false;
  return true;
}

function isPhone(value) {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed) return false;

  const isAllDigits = (str) => {
    for (let i = 0; i < str.length; i += 1) {
      const code = str.charCodeAt(i);
      if (code < 48 || code > 57) return false;
    }
    return true;
  };

  const normalized = trimmed.startsWith('+') ? trimmed.slice(1) : trimmed;
  if (!isAllDigits(normalized)) return false;
  if (normalized.length < 7 || normalized.length > 15) return false;
  return true;
}

function maskEmail(email) {
  if (!email) return '';
  const [name, domain] = String(email).split('@');
  if (!domain) return '***';
  const safeName = name.length <= 2 ? `${name[0] || ''}*` : `${name.slice(0, 2)}***`;
  return `${safeName}@${domain}`;
}

function maskPhone(phone) {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length < 4) return '****';
  return `${digits.slice(0, 2)}****${digits.slice(-2)}`;
}

async function checkInternalTransferCooldown({ userId, recipient, amount }) {
  if (!INTERNAL_TRANSFER_COOLDOWN_SECONDS) return { ok: true };
  const fingerprint = crypto
    .createHash('sha256')
    .update(`${userId}:${recipient}:${amount}:internal`)
    .digest('hex');

  const [rows] = await pool.query(
    `SELECT id FROM idempotency_keys
     WHERE user_id = ? AND route = 'wallet.send.cooldown' AND idem_key = ?
       AND created_at > DATE_SUB(NOW(), INTERVAL ? SECOND)
     LIMIT 1`,
    [userId, fingerprint, INTERNAL_TRANSFER_COOLDOWN_SECONDS]
  );
  if (rows.length) {
    return { ok: false, status: 429, error: 'Duplicate transfer detected. Please wait before retrying.' };
  }

  await pool.query(
    'INSERT INTO idempotency_keys (id, user_id, idem_key, route, request_hash, status) VALUES (UUID(), ?, ?, ?, ?, ?)',
    [userId, fingerprint, 'wallet.send.cooldown', fingerprint, 'complete']
  );
  await pool.query(
    `DELETE FROM idempotency_keys
     WHERE route = 'wallet.send.cooldown'
       AND created_at < DATE_SUB(NOW(), INTERVAL ? SECOND)`,
    [INTERNAL_TRANSFER_COOLDOWN_SECONDS * 6]
  );
  return { ok: true };
}


router.get('/balance', requireUser, async (req, res) => {
  /*
    #swagger.tags = ['Wallet']
    #swagger.summary = 'Get wallet balance'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.responses[200] = { description: 'Balance', schema: { $ref: '#/definitions/WalletBalance' } }
    #swagger.responses[404] = { description: 'Wallet not found', schema: { $ref: '#/definitions/ErrorResponse' } }
  */
  const [rows] = await pool.query(
    'SELECT balance, currency FROM wallets WHERE user_id = ?',
    [req.user.sub]
  );
  if (!rows.length) return res.status(404).json({ error: 'Wallet not found' });
  return res.json(rows[0]);
});

router.post('/recipient-lookup', requireUser, async (req, res) => {
  const recipient = String(req.body?.recipient || '').trim();
  if (!recipient) return res.status(400).json({ error: 'Recipient required' });
  if (!isEmail(recipient) && !isPhone(recipient)) {
    return res.status(400).json({ error: 'Recipient must be an email or phone number' });
  }

  const [rows] = await pool.query(
    `SELECT id, full_name, email, phone, full_name_encrypted, email_encrypted, phone_encrypted
     FROM users WHERE email_hash = ? OR phone_hash = ? LIMIT 1`,
    [hashEmail(recipient), hashPhone(recipient)]
  );
  if (!rows.length) return res.json({ found: false });
  const user = applyUserPII(rows[0]);
  const [[reserved]] = await pool.query(
    `SELECT account_number, bank_code, bank_name, account_name
     FROM reserved_accounts WHERE user_id = ? AND provider = 'flutterwave' LIMIT 1`,
    [user.id]
  );

  return res.json({
    found: true,
    recipient: {
      id: user.id,
      fullName: user.full_name || null,
      emailMasked: maskEmail(user.email),
      phoneMasked: maskPhone(user.phone),
      hasFlutterwaveAccount: Boolean(reserved?.account_number && reserved?.bank_code),
      bankName: reserved?.bank_name || null,
    },
  });
});

router.post('/send', requireUser, validateRequest(walletSendSchema), async (req, res) => {
  /*
    #swagger.tags = ['Wallet']
    #swagger.summary = 'Send money to bank or internal user'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.parameters['body'] = { in: 'body', required: true, schema: { $ref: '#/definitions/WalletSendRequest' } }
    #swagger.responses[200] = { description: 'Transfer created', schema: { $ref: '#/definitions/WalletSendResponse' } }
    #swagger.responses[400] = { description: 'Validation error', schema: { $ref: '#/definitions/ErrorResponse' } }
  */
  const { amount, pin, accountNumber, bankCode, accountName, to, channel } = req.validated || req.body || {};
  const idemKey = (req.headers['x-idempotency-key'] || '').toString().trim() || null;
  const idem = await checkIdempotency({
    userId: req.user.sub,
    key: idemKey,
    route: 'wallet.send',
    body: req.validated || req.body,
  });
  if (!idem.ok) return res.status(idem.status).json({ error: idem.error });
  if (idem.hit) return res.json(idem.response || {});

  async function respond(status, payload) {
    await completeIdempotency({
      userId: req.user.sub,
      key: idemKey,
      route: 'wallet.send',
      response: payload,
    });
    return res.status(status).json(payload);
  }
  const numericAmount = Number(amount);
  if (!numericAmount || numericAmount <= 0) {
    return respond(400, { error: 'Invalid payload' });
  }

  const [[user]] = await pool.query('SELECT kyc_level, kyc_status FROM users WHERE id = ?', [
    req.user.sub,
  ]);
  if (!user) return respond(404, { error: 'User not found' });
  if (!isValidPin(pin)) return respond(400, { error: 'PIN must be exactly 6 digits' });
  try {
    await verifyTransactionPin(req.user.sub, pin);
  } catch (err) {
    return respond(400, { error: err.message });
  }
  const isInternal = channel === 'internal';
  const isBank = channel === 'bank' || accountNumber || bankCode || isInternal;
  if (isBank) {
    if (Number(user.kyc_level || 1) < 2) {
      logSecurityEvent({
        type: 'kyc.insufficient.bank_transfer',
        severity: 'medium',
        actorType: 'user',
        actorId: req.user.sub,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        metadata: { level: user.kyc_level || 1 },
      }).catch(() => null);
      return respond(403, { error: 'Level 2 KYC required for bank transfers' });
    }
    if (String(user.kyc_status || 'pending') !== 'verified') {
      logSecurityEvent({
        type: 'kyc.unverified.bank_transfer',
        severity: 'medium',
        actorType: 'user',
        actorId: req.user.sub,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        metadata: { status: user.kyc_status || 'pending' },
      }).catch(() => null);
      return respond(403, { error: 'KYC must be verified for bank transfers' });
    }
  }
  const limitCheck = await enforceKycLimits({
    userId: req.user.sub,
    level: user.kyc_level || 1,
    amount: numericAmount,
    types: ['send'],
  });
  if (!limitCheck.ok) {
    logSecurityEvent({
      type: 'kyc.limit.send',
      severity: 'medium',
      actorType: 'user',
      actorId: req.user.sub,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: { amount: numericAmount, message: limitCheck.message },
    }).catch(() => null);
    return respond(403, { error: limitCheck.message });
  }
  let recipientId = null;
  let internalAccount = null;
  let internalRecipient = null;
  let bankName = null;
  if (isBank) {
    if (isInternal) {
      if (!to) return respond(400, { error: 'Recipient required' });
      const validRecipient = isEmail(to) || isPhone(to);
      if (!validRecipient) {
        return respond(400, { error: 'Recipient must be an email or phone number' });
      }
      const cooldown = await checkInternalTransferCooldown({
        userId: req.user.sub,
        recipient: String(to).trim().toLowerCase(),
        amount: numericAmount,
      });
      if (!cooldown.ok) {
        return respond(cooldown.status, { error: cooldown.error });
      }
      const [targets] = await pool.query(
        `SELECT id, full_name, email, phone, full_name_encrypted, email_encrypted, phone_encrypted
         FROM users WHERE email_hash = ? OR phone_hash = ? LIMIT 1`,
        [hashEmail(to), hashPhone(to)]
      );
      if (!targets.length) return respond(404, { error: 'Recipient not found' });
      internalRecipient = applyUserPII(targets[0]);
      if (internalRecipient.id === req.user.sub) {
        return respond(400, { error: 'Cannot transfer to your own account' });
      }
      const [[reserved]] = await pool.query(
        `SELECT account_number, bank_code, bank_name, account_name
         FROM reserved_accounts WHERE user_id = ? AND provider = 'flutterwave' LIMIT 1`,
        [internalRecipient.id]
      );
      if (!reserved?.account_number || !reserved?.bank_code) {
        return respond(400, { error: 'Recipient has no Flutterwave account' });
      }
      internalAccount = reserved;
      bankName = reserved.bank_name || 'Flutterwave';
    } else {
      if (!accountNumber || !bankCode || !accountName) {
        return respond(400, { error: 'Account number, bank, and name are required' });
      }
      const [[selfReserved]] = await pool.query(
        `SELECT account_number, bank_code FROM reserved_accounts
         WHERE user_id = ? AND provider = 'flutterwave' LIMIT 1`,
        [req.user.sub]
      );
      if (
        selfReserved?.account_number &&
        selfReserved?.bank_code &&
        selfReserved.account_number === accountNumber &&
        selfReserved.bank_code === bankCode
      ) {
        return respond(400, { error: 'Cannot transfer to your own account' });
      }
      const [[bank]] = await pool.query('SELECT name FROM banks WHERE code = ? AND active = 1', [
        bankCode,
      ]);
      if (!bank) return respond(400, { error: 'Invalid bank selected' });
      bankName = bank.name;
    }
  } else {
    if (!to) return respond(400, { error: 'Recipient required' });
    const validRecipient = isEmail(to) || isPhone(to);
    if (!validRecipient) {
      return respond(400, { error: 'Recipient must be an email or phone number' });
    }
    const [targets] = await pool.query(
      'SELECT id FROM users WHERE email_hash = ? OR phone_hash = ? LIMIT 1',
      [hashEmail(to), hashPhone(to)]
    );
    if (!targets.length) return respond(404, { error: 'Recipient not found' });
    recipientId = targets[0].id;
    if (recipientId === req.user.sub) {
      return respond(400, { error: 'Cannot transfer to your own account' });
    }
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    let senderBalance = null;
    if (!isBank) {
      const ids = [req.user.sub, recipientId].sort();
      const [walletRows] = await conn.query(
        'SELECT user_id, balance FROM wallets WHERE user_id IN (?, ?) FOR UPDATE',
        ids
      );
      const senderWallet = walletRows.find((row) => row.user_id === req.user.sub);
      const recipientWallet = walletRows.find((row) => row.user_id === recipientId);
      if (!senderWallet || !recipientWallet) {
        await conn.rollback();
        return respond(404, { error: 'Wallet not found' });
      }
      senderBalance = Number(senderWallet.balance);
    } else {
      const [walletRows] = await conn.query(
        'SELECT balance FROM wallets WHERE user_id = ? FOR UPDATE',
        [req.user.sub]
      );
      if (!walletRows.length) throw new Error('Wallet missing');
      senderBalance = Number(walletRows[0].balance);
    }

    if (senderBalance < numericAmount) {
      await conn.rollback();
      return respond(400, { error: 'Insufficient balance' });
    }

    await conn.query('UPDATE wallets SET balance = balance - ? WHERE user_id = ?', [
      numericAmount,
      req.user.sub,
    ]);

    const reference = `TX-${nanoid(10)}`;
    if (isBank) {
      const transferMeta = isInternal
        ? {
            channel: 'internal',
            recipientId: internalRecipient?.id,
            recipient: to,
            bankCode: internalAccount?.bank_code,
            bankName,
            accountNumber: internalAccount?.account_number,
            accountName: internalAccount?.account_name || internalRecipient?.full_name || '',
          }
        : {
            channel: 'bank',
            bankCode,
            bankName,
            accountNumber,
            accountName,
          };
      const { safe, encrypted } = buildTransactionMetadata(transferMeta, req.user.sub);
      await conn.query(
        'INSERT INTO transactions (id, user_id, type, amount, fee, total, status, reference, metadata, metadata_encrypted) VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          req.user.sub,
          'send',
          numericAmount,
          0,
          numericAmount,
          'pending',
          reference,
          safe ? JSON.stringify(safe) : null,
          encrypted,
        ]
      );
    } else {
      await conn.query('UPDATE wallets SET balance = balance + ? WHERE user_id = ?', [
        numericAmount,
        recipientId,
      ]);
      const { safe: senderSafe, encrypted: senderEncrypted } = buildTransactionMetadata(
        { to, channel: 'internal' },
        req.user.sub
      );
      await conn.query(
        'INSERT INTO transactions (id, user_id, type, amount, fee, total, status, reference, metadata, metadata_encrypted) VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          req.user.sub,
          'send',
          numericAmount,
          0,
          numericAmount,
          'success',
          reference,
          senderSafe ? JSON.stringify(senderSafe) : null,
          senderEncrypted,
        ]
      );
      const { safe: receiverSafe, encrypted: receiverEncrypted } = buildTransactionMetadata(
        { from: req.user.sub },
        recipientId
      );
      await conn.query(
        'INSERT INTO transactions (id, user_id, type, amount, fee, total, status, reference, metadata, metadata_encrypted) VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          recipientId,
          'receive',
          numericAmount,
          0,
          numericAmount,
          'success',
          reference,
          receiverSafe ? JSON.stringify(receiverSafe) : null,
          receiverEncrypted,
        ]
      );
    }
    await conn.commit();
    const [[senderRaw]] = await pool.query(
      'SELECT id, full_name, email, full_name_encrypted, email_encrypted FROM users WHERE id = ?',
      [req.user.sub]
    );
    const sender = applyUserPII(senderRaw);
    sendReceiptEmail({
      to: sender.email,
      name: sender.full_name,
      title: isBank ? 'Transfer Initiated' : 'Transfer Successful',
      details: [
        `Amount: NGN ${numericAmount.toFixed(2)}`,
        isBank
          ? `Recipient: ${
              isInternal
                ? internalAccount?.account_name || internalRecipient?.full_name || 'GLY VTU'
                : accountName
            } (${
              isInternal ? internalAccount?.account_number : accountNumber
            })`
          : `Recipient: ${to}`,
        `Reference: ${reference}`,
      ],
    }).catch((err) => logger.error('Receipt email send error (wallet)', { error: logger.format(err) }));
    if (!isBank) {
      const [[recipientRaw]] = await pool.query(
        'SELECT id, full_name, email, full_name_encrypted, email_encrypted FROM users WHERE id = ?',
        [recipientId]
      );
      const recipient = applyUserPII(recipientRaw);
      sendReceiptEmail({
        to: recipient.email,
        name: recipient.full_name,
        title: 'Money Received',
        details: [
          `Amount: NGN ${numericAmount.toFixed(2)}`,
          `Sender: ${sender.full_name}`,
          `Reference: ${reference}`,
        ],
      }).catch((err) =>
        logger.error('Receipt email send error (wallet recipient)', { error: logger.format(err) })
      );
    }
    logAudit({
      actorType: 'user',
      actorId: req.user.sub,
      action: isBank ? 'wallet.bank_transfer' : 'wallet.transfer',
      entityType: 'transaction',
      entityId: reference,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: isBank ? { bankCode, bankName, accountNumber } : { to },
    }).catch((err) => logger.error('Audit log failed (wallet.send)', { error: logger.format(err) }));
    if (isBank) {
      checkWithdrawalAnomaly({
        userId: req.user.sub,
        amount: numericAmount,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      }).catch(() => null);
    }

    // Check for new recipient anomaly
    if (!isBank && to) {
      checkNewRecipientAnomaly({
        userId: req.user.sub,
        recipient: to,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      }).catch(() => null);
    }

    if (isBank) {
      const transferPayload = isInternal
        ? {
            amount: numericAmount,
            account_number: internalAccount?.account_number,
            bank_code: internalAccount?.bank_code,
            narration: `GLY VTU internal transfer to ${internalRecipient?.full_name || to}`,
            reference,
          }
        : {
            amount: numericAmount,
            account_number: accountNumber,
            bank_code: bankCode,
            narration: `GLY VTU transfer to ${accountName}`,
            reference,
          };
      try {
        await createTransfer(transferPayload);
      } catch {
        // Refund on provider failure
        const refundConn = await pool.getConnection();
        try {
          await refundConn.beginTransaction();
          await refundConn.query('UPDATE wallets SET balance = balance + ? WHERE user_id = ?', [
            numericAmount,
            req.user.sub,
          ]);
          await refundConn.query('UPDATE transactions SET status = ? WHERE reference = ?', [
            'failed',
            reference,
          ]);
          await refundConn.commit();
        } catch {
          await refundConn.rollback();
        } finally {
          refundConn.release();
        }
        return respond(502, { error: 'Transfer failed with provider' });
      }
    }
    return respond(200, {
      message: isBank ? 'Transfer initiated' : 'Transfer completed',
      reference,
      status: isBank ? 'pending' : 'success',
    });
  } catch (err) {
    await conn.rollback();
    logger.error('Wallet transfer failed', { error: logger.format(err) });
    return respond(500, { error: 'Transfer failed' });
  } finally {
    conn.release();
  }
});

router.post('/receive', requireUser, validateRequest(walletReceiveSchema), async (req, res) => {
  /*
    #swagger.tags = ['Wallet']
    #swagger.summary = 'Request money from another user'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.parameters['body'] = { in: 'body', required: true, schema: { $ref: '#/definitions/WalletReceiveRequest' } }
    #swagger.responses[200] = { description: 'Request created', schema: { $ref: '#/definitions/WalletReceiveResponse' } }
  */
  const { amount, note } = req.validated || req.body || {};
  const numericAmount = Number(amount);
  if (!numericAmount || numericAmount <= 0) {
    return res.status(400).json({ error: 'Invalid amount' });
  }

  const reference = `REQ-${nanoid(10)}`;
  const { safe, encrypted } = buildTransactionMetadata({ note }, req.user.sub);
  await pool.query(
    'INSERT INTO transactions (id, user_id, type, amount, fee, total, status, reference, metadata, metadata_encrypted) VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      req.user.sub,
      'request',
      numericAmount,
      0,
      numericAmount,
      'pending',
      reference,
      safe ? JSON.stringify(safe) : null,
      encrypted,
    ]
  );
  return res.json({ message: 'Money request created', reference });
});

export default router;
