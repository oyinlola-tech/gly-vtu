import express from 'express';
import { pool } from '../config/db.js';
import { requireUser } from '../middleware/auth.js';
import { createVirtualCard, blockVirtualCard, unblockVirtualCard } from '../utils/flutterwave.js';
import { sanitizeFlutterwaveCard } from '../utils/sanitize.js';
import { enforceKycLimits } from '../utils/kycLimits.js';
import { logAudit } from '../utils/audit.js';
import { isValidAmount, isNonEmptyString } from '../utils/validation.js';
import { checkIdempotency, completeIdempotency } from '../utils/idempotency.js';
import { logSecurityEvent } from '../utils/securityEvents.js';
import { applyUserPII, decryptJson } from '../utils/encryption.js';
import { buildTransactionMetadata } from '../utils/transactionMetadata.js';
import { verifyTransactionPin, isValidPin } from '../utils/pin.js';
import {
  validateRequest,
  validateParams,
  cardCreateSchema,
  cardIdParamSchema,
  cardSettingsSchema,
  cardAuthorizeSchema,
} from '../middleware/requestValidation.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

router.get('/', requireUser, async (req, res) => {
  const [rows] = await pool.query(
    `SELECT id, card_id, masked_pan, expiry, currency, status, balance, created_at
     FROM virtual_cards WHERE user_id = ? ORDER BY created_at DESC`,
    [req.user.sub]
  );
  return res.json(rows);
});

router.post('/', requireUser, validateRequest(cardCreateSchema), async (req, res) => {
  const { amount, currency = 'NGN' } = req.validated || req.body || {};
  const idemKey = (req.headers['x-idempotency-key'] || '').toString().trim() || null;
  const idem = await checkIdempotency({
    userId: req.user.sub,
    key: idemKey,
    route: 'cards.create',
    body: req.validated || req.body,
  });
  if (!idem.ok) return res.status(idem.status).json({ error: idem.error });
  if (idem.hit) return res.json(idem.response || {});

  async function respond(status, payload) {
    await completeIdempotency({
      userId: req.user.sub,
      key: idemKey,
      route: 'cards.create',
      response: payload,
    });
    return res.status(status).json(payload);
  }
  const { pin } = req.validated || req.body || {};
  const numericAmount = Number(amount);
  if (!isValidAmount(numericAmount, 100, 5_000_000)) {
    return respond(400, { error: 'Invalid amount' });
  }
  
  // PIN verification required for card funding (financial transaction security)
  if (!isValidPin(pin)) return respond(400, { error: 'PIN must be exactly 6 digits' });
  try {
    await verifyTransactionPin(req.user.sub, pin);
  } catch (err) {
    return respond(400, { error: err.message });
  }

  const [[userRaw]] = await pool.query(
    'SELECT id, full_name, email, full_name_encrypted, email_encrypted, kyc_level, kyc_status, kyc_payload, kyc_payload_encrypted FROM users WHERE id = ?',
    [req.user.sub]
  );
  if (!userRaw) return respond(404, { error: 'User not found' });
  const user = applyUserPII(userRaw);
  if (Number(user.kyc_level || 1) < 3) {
    logSecurityEvent({
      type: 'kyc.insufficient.card',
      severity: 'medium',
      actorType: 'user',
      actorId: req.user.sub,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: { level: user.kyc_level || 1 },
    }).catch(() => null);
    return respond(403, { error: 'Level 3 KYC required to create a virtual card' });
  }
  if (String(user.kyc_status || 'pending') !== 'verified') {
    logSecurityEvent({
      type: 'kyc.unverified.card',
      severity: 'medium',
      actorType: 'user',
      actorId: req.user.sub,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: { status: user.kyc_status || 'pending' },
    }).catch(() => null);
    return respond(403, { error: 'KYC must be verified to create a virtual card' });
  }
  const payload = decryptJson(user?.kyc_payload_encrypted, req.user.sub) || (user?.kyc_payload ? JSON.parse(user.kyc_payload) : {});
  if (!payload?.bvn && !payload?.nin) {
    return respond(400, { error: 'BVN or NIN required to create a virtual card' });
  }
  if (!payload?.address) {
    return respond(400, { error: 'KYC address required to create a virtual card' });
  }
  const limitCheck = await enforceKycLimits({
    userId: req.user.sub,
    level: user.kyc_level || 1,
    amount: numericAmount,
    types: ['send'],
  });
  if (!limitCheck.ok) {
    logSecurityEvent({
      type: 'kyc.limit.card',
      severity: 'medium',
      actorType: 'user',
      actorId: req.user.sub,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: { amount: numericAmount, message: limitCheck.message },
    }).catch(() => null);
    return respond(403, { error: limitCheck.message });
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
      return respond(400, { error: 'Insufficient wallet balance' });
    }

    const flwPayload = {
      currency,
      amount: numericAmount,
      billing_name: user.full_name,
      billing_address: payload.address,
      billing_city: payload.city || 'Lagos',
      billing_state: payload.state || 'Lagos',
      billing_zip: payload.postalCode || '100001',
      billing_country: payload.country || 'NG',
    };
    const created = await createVirtualCard(flwPayload);
    const card = created?.data || {};

    await conn.query('UPDATE wallets SET balance = balance - ? WHERE user_id = ?', [
      numericAmount,
      req.user.sub,
    ]);
    await conn.query(
      'INSERT INTO virtual_cards (id, user_id, provider, card_id, masked_pan, expiry, currency, status, balance, raw_response) VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        req.user.sub,
        'flutterwave',
        card.id || card.card_id || '',
        card.masked_pan || card.masked_pan || '',
        card.expiry || '',
        currency,
        card.is_active === false ? 'frozen' : 'active',
        Number(card.amount || numericAmount),
        JSON.stringify(sanitizeFlutterwaveCard(card)),
      ]
    );
    const { safe, encrypted } = buildTransactionMetadata(
      { reason: 'virtual_card_funding', provider: 'flutterwave', card_id: card.id },
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
        `CARD-${card.id || Date.now()}`,
        safe ? JSON.stringify(safe) : null,
        encrypted,
      ]
    );
    await conn.commit();

    logAudit({
      actorType: 'user',
      actorId: req.user.sub,
      action: 'card.create',
      entityType: 'virtual_card',
      entityId: card.id || '',
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    }).catch((err) => logger.error('Audit log failed (card.create)', { error: logger.format(err) }));

    return respond(201, { message: 'Card created', card });
  } catch {
    await conn.rollback();
    return res.status(500).json({ error: 'Card creation failed' });
  } finally {
    conn.release();
  }
});

router.get('/:cardId/settings', requireUser, validateParams(cardIdParamSchema), async (req, res) => {
  const { cardId } = req.validatedParams;
  const [[card]] = await pool.query(
    'SELECT card_id FROM virtual_cards WHERE card_id = ? AND user_id = ? LIMIT 1',
    [cardId, req.user.sub]
  );
  if (!card) return res.status(404).json({ error: 'Card not found' });
  const [[row]] = await pool.query(
    'SELECT daily_limit, monthly_limit, merchant_locks, auto_freeze FROM card_settings WHERE card_id = ? AND user_id = ? LIMIT 1',
    [cardId, req.user.sub]
  );
  return res.json(
    row || { daily_limit: null, monthly_limit: null, merchant_locks: '', auto_freeze: 1 }
  );
});

router.put('/:cardId/settings', requireUser, validateParams(cardIdParamSchema), validateRequest(cardSettingsSchema), async (req, res) => {
  const { cardId } = req.validatedParams;
  const { dailyLimit, monthlyLimit, merchantLocks, autoFreeze } = req.validated || req.body || {};
  const [[card]] = await pool.query(
    'SELECT card_id FROM virtual_cards WHERE card_id = ? AND user_id = ? LIMIT 1',
    [cardId, req.user.sub]
  );
  if (!card) return res.status(404).json({ error: 'Card not found' });

  const daily = dailyLimit ? Number(dailyLimit) : null;
  const monthly = monthlyLimit ? Number(monthlyLimit) : null;
  if (daily !== null && !isValidAmount(daily, 100, 100_000_000)) {
    return res.status(400).json({ error: 'Invalid daily limit' });
  }
  if (monthly !== null && !isValidAmount(monthly, 100, 1_000_000_000)) {
    return res.status(400).json({ error: 'Invalid monthly limit' });
  }
  const locks = isNonEmptyString(merchantLocks, 500) ? merchantLocks : '';
  await pool.query(
    `INSERT INTO card_settings (id, user_id, card_id, daily_limit, monthly_limit, merchant_locks, auto_freeze)
     VALUES (UUID(), ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE daily_limit = VALUES(daily_limit), monthly_limit = VALUES(monthly_limit),
       merchant_locks = VALUES(merchant_locks), auto_freeze = VALUES(auto_freeze)`,
    [req.user.sub, cardId, daily, monthly, locks, autoFreeze ? 1 : 0]
  );
  return res.json({ message: 'Card settings updated' });
});

router.post('/:cardId/authorize', requireUser, validateParams(cardIdParamSchema), validateRequest(cardAuthorizeSchema), async (req, res) => {
  const { cardId } = req.validatedParams;
  const { amount, merchant } = req.validated || req.body || {};
  if (!isValidAmount(amount, 1, 1_000_000_000)) {
    return res.status(400).json({ error: 'Invalid amount' });
  }
  if (!merchant || !isNonEmptyString(merchant, 120)) {
    return res.status(400).json({ error: 'Merchant required' });
  }
  const [[card]] = await pool.query(
    'SELECT card_id, status FROM virtual_cards WHERE card_id = ? AND user_id = ? LIMIT 1',
    [cardId, req.user.sub]
  );
  if (!card) return res.status(404).json({ error: 'Card not found' });
  if (card.status === 'frozen') return res.status(403).json({ error: 'Card is frozen' });

  const [[settings]] = await pool.query(
    'SELECT daily_limit, monthly_limit, merchant_locks, auto_freeze FROM card_settings WHERE card_id = ? AND user_id = ? LIMIT 1',
    [cardId, req.user.sub]
  );
  const merchantList = String(settings?.merchant_locks || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (merchantList.length) {
    const hit = merchantList.some((m) => merchant.toLowerCase().includes(m));
    if (!hit) {
      if (settings?.auto_freeze) {
        await blockVirtualCard(cardId).catch(() => null);
        await pool.query('UPDATE virtual_cards SET status = ? WHERE card_id = ? AND user_id = ?', [
          'frozen',
          cardId,
          req.user.sub,
        ]);
      }
      return res.status(403).json({ error: 'Merchant not allowed' });
    }
  }

  const [[dailyRow]] = await pool.query(
    `SELECT SUM(amount) as total FROM card_spends
     WHERE card_id = ? AND DATE(created_at) = CURDATE()`,
    [cardId]
  );
  const [[monthlyRow]] = await pool.query(
    `SELECT SUM(amount) as total FROM card_spends
     WHERE card_id = ? AND YEAR(created_at) = YEAR(CURDATE()) AND MONTH(created_at) = MONTH(CURDATE())`,
    [cardId]
  );
  const dailyTotal = Number(dailyRow?.total || 0) + Number(amount);
  const monthlyTotal = Number(monthlyRow?.total || 0) + Number(amount);

  if (settings?.daily_limit && dailyTotal > Number(settings.daily_limit)) {
    if (settings?.auto_freeze) {
      await blockVirtualCard(cardId).catch(() => null);
      await pool.query('UPDATE virtual_cards SET status = ? WHERE card_id = ? AND user_id = ?', [
        'frozen',
        cardId,
        req.user.sub,
      ]);
    }
    return res.status(403).json({ error: 'Daily limit exceeded' });
  }
  if (settings?.monthly_limit && monthlyTotal > Number(settings.monthly_limit)) {
    if (settings?.auto_freeze) {
      await blockVirtualCard(cardId).catch(() => null);
      await pool.query('UPDATE virtual_cards SET status = ? WHERE card_id = ? AND user_id = ?', [
        'frozen',
        cardId,
        req.user.sub,
      ]);
    }
    return res.status(403).json({ error: 'Monthly limit exceeded' });
  }

  await pool.query(
    'INSERT INTO card_spends (id, user_id, card_id, amount, merchant) VALUES (UUID(), ?, ?, ?, ?)',
    [req.user.sub, cardId, Number(amount), merchant]
  );
  return res.json({ approved: true });
});

router.post('/:cardId/freeze', requireUser, validateParams(cardIdParamSchema), async (req, res) => {
  const { cardId } = req.validatedParams;
  if (!cardId) return res.status(400).json({ error: 'Card ID required' });
  await blockVirtualCard(cardId);
  await pool.query('UPDATE virtual_cards SET status = ? WHERE card_id = ? AND user_id = ?', [
    'frozen',
    cardId,
    req.user.sub,
  ]);
  return res.json({ message: 'Card frozen' });
});

router.post('/:cardId/unfreeze', requireUser, validateParams(cardIdParamSchema), async (req, res) => {
  const { cardId } = req.validatedParams;
  if (!cardId) return res.status(400).json({ error: 'Card ID required' });
  await unblockVirtualCard(cardId);
  await pool.query('UPDATE virtual_cards SET status = ? WHERE card_id = ? AND user_id = ?', [
    'active',
    cardId,
    req.user.sub,
  ]);
  return res.json({ message: 'Card unfrozen' });
});

export default router;
