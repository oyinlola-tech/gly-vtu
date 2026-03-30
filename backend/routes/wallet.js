import express from 'express';
import { pool } from '../config/db.js';
import { requireUser } from '../middleware/auth.js';
import { nanoid } from 'nanoid';
import { sendReceiptEmail } from '../utils/email.js';
import { logAudit } from '../utils/audit.js';
import { verifyTransactionPin, isValidPin } from '../utils/pin.js';
import { enforceKycLimits } from '../utils/kycLimits.js';
import { checkIdempotency, completeIdempotency } from '../utils/idempotency.js';
import { logSecurityEvent } from '../utils/securityEvents.js';
import { checkWithdrawalAnomaly } from '../utils/anomalies.js';

const router = express.Router();


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

router.post('/send', requireUser, async (req, res) => {
  /*
    #swagger.tags = ['Wallet']
    #swagger.summary = 'Send money to bank or internal user'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.parameters['body'] = { in: 'body', required: true, schema: { $ref: '#/definitions/WalletSendRequest' } }
    #swagger.responses[200] = { description: 'Transfer created', schema: { $ref: '#/definitions/WalletSendResponse' } }
    #swagger.responses[400] = { description: 'Validation error', schema: { $ref: '#/definitions/ErrorResponse' } }
  */
  const { amount, pin, accountNumber, bankCode, accountName, to, channel } = req.body || {};
  const idemKey = (req.headers['x-idempotency-key'] || '').toString().trim() || null;
  const idem = await checkIdempotency({
    userId: req.user.sub,
    key: idemKey,
    route: 'wallet.send',
    body: req.body,
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
  const isBank = channel === 'bank' || accountNumber || bankCode;
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
  let bankName = null;
  if (isBank) {
    if (!accountNumber || !bankCode || !accountName) {
      return respond(400, { error: 'Account number, bank, and name are required' });
    }
    const [[bank]] = await pool.query('SELECT name FROM banks WHERE code = ? AND active = 1', [
      bankCode,
    ]);
    if (!bank) return respond(400, { error: 'Invalid bank selected' });
    bankName = bank.name;
  } else {
    if (!to) return respond(400, { error: 'Recipient required' });
    const [targets] = await pool.query(
      'SELECT id FROM users WHERE email = ? OR phone = ? LIMIT 1',
      [to, to]
    );
    if (!targets.length) return respond(404, { error: 'Recipient not found' });
    recipientId = targets[0].id;
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [walletRows] = await conn.query(
      'SELECT balance FROM wallets WHERE user_id = ? FOR UPDATE',
      [req.user.sub]
    );
    if (!walletRows.length) throw new Error('Wallet missing');
    if (Number(walletRows[0].balance) < numericAmount) {
      await conn.rollback();
      return respond(400, { error: 'Insufficient balance' });
    }

    await conn.query('UPDATE wallets SET balance = balance - ? WHERE user_id = ?', [
      numericAmount,
      req.user.sub,
    ]);

    const reference = `TX-${nanoid(10)}`;
    if (isBank) {
      await conn.query(
        'INSERT INTO transactions (id, user_id, type, amount, fee, total, status, reference, metadata) VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          req.user.sub,
          'send',
          numericAmount,
          0,
          numericAmount,
          'pending',
          reference,
          JSON.stringify({
            channel: 'bank',
            bankCode,
            bankName,
            accountNumber,
            accountName,
          }),
        ]
      );
    } else {
      await conn.query('UPDATE wallets SET balance = balance + ? WHERE user_id = ?', [
        numericAmount,
        recipientId,
      ]);
      await conn.query(
        'INSERT INTO transactions (id, user_id, type, amount, fee, total, status, reference, metadata) VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          req.user.sub,
          'send',
          numericAmount,
          0,
          numericAmount,
          'success',
          reference,
          JSON.stringify({ to, channel: 'internal' }),
        ]
      );
      await conn.query(
        'INSERT INTO transactions (id, user_id, type, amount, fee, total, status, reference, metadata) VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          recipientId,
          'receive',
          numericAmount,
          0,
          numericAmount,
          'success',
          reference,
          JSON.stringify({ from: req.user.sub }),
        ]
      );
    }
    await conn.commit();
    const [[sender]] = await pool.query(
      'SELECT full_name, email FROM users WHERE id = ?',
      [req.user.sub]
    );
    sendReceiptEmail({
      to: sender.email,
      name: sender.full_name,
      title: isBank ? 'Transfer Initiated' : 'Transfer Successful',
      details: [
        `Amount: NGN ${numericAmount.toFixed(2)}`,
        isBank ? `Recipient: ${accountName} (${accountNumber})` : `Recipient: ${to}`,
        `Reference: ${reference}`,
      ],
    }).catch(console.error);
    if (!isBank) {
      const [[recipient]] = await pool.query(
        'SELECT full_name, email FROM users WHERE id = ?',
        [recipientId]
      );
      sendReceiptEmail({
        to: recipient.email,
        name: recipient.full_name,
        title: 'Money Received',
        details: [
          `Amount: NGN ${numericAmount.toFixed(2)}`,
          `Sender: ${sender.full_name}`,
          `Reference: ${reference}`,
        ],
      }).catch(console.error);
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
    }).catch(console.error);
    if (isBank) {
      checkWithdrawalAnomaly({
        userId: req.user.sub,
        amount: numericAmount,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      }).catch(() => null);
    }
    return respond(200, {
      message: isBank ? 'Transfer initiated' : 'Transfer completed',
      reference,
      status: isBank ? 'pending' : 'success',
    });
  } catch (err) {
    await conn.rollback();
    return respond(500, { error: 'Transfer failed' });
  } finally {
    conn.release();
  }
});

router.post('/receive', requireUser, async (req, res) => {
  /*
    #swagger.tags = ['Wallet']
    #swagger.summary = 'Request money from another user'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.parameters['body'] = { in: 'body', required: true, schema: { $ref: '#/definitions/WalletReceiveRequest' } }
    #swagger.responses[200] = { description: 'Request created', schema: { $ref: '#/definitions/WalletReceiveResponse' } }
  */
  const { amount, note } = req.body || {};
  const numericAmount = Number(amount);
  if (!numericAmount || numericAmount <= 0) {
    return res.status(400).json({ error: 'Invalid amount' });
  }

  const reference = `REQ-${nanoid(10)}`;
  await pool.query(
    'INSERT INTO transactions (id, user_id, type, amount, fee, total, status, reference, metadata) VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      req.user.sub,
      'request',
      numericAmount,
      0,
      numericAmount,
      'pending',
      reference,
      JSON.stringify({ note }),
    ]
  );
  return res.json({ message: 'Money request created', reference });
});

export default router;
