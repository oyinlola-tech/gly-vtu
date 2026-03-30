import express from 'express';
import { pool } from '../config/db.js';
import { requireUser } from '../middleware/auth.js';
import { createVirtualCard, blockVirtualCard, unblockVirtualCard } from '../utils/flutterwave.js';
import { logAudit } from '../utils/audit.js';

const router = express.Router();

router.get('/', requireUser, async (req, res) => {
  const [rows] = await pool.query(
    `SELECT id, card_id, masked_pan, expiry, currency, status, balance, created_at
     FROM virtual_cards WHERE user_id = ? ORDER BY created_at DESC`,
    [req.user.sub]
  );
  return res.json(rows);
});

router.post('/', requireUser, async (req, res) => {
  const { amount, currency = 'NGN' } = req.body || {};
  const numericAmount = Number(amount);
  if (!numericAmount || numericAmount <= 0) {
    return res.status(400).json({ error: 'Invalid amount' });
  }

  const [[user]] = await pool.query(
    'SELECT full_name, email, kyc_level, kyc_payload FROM users WHERE id = ?',
    [req.user.sub]
  );
  const payload = user?.kyc_payload ? JSON.parse(user.kyc_payload) : {};
  if (!payload?.bvn && !payload?.nin) {
    return res.status(400).json({ error: 'BVN or NIN required to create a virtual card' });
  }
  if (!payload?.address) {
    return res.status(400).json({ error: 'KYC address required to create a virtual card' });
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
      return res.status(400).json({ error: 'Insufficient wallet balance' });
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
        JSON.stringify(created || {}),
      ]
    );
    await conn.query(
      'INSERT INTO transactions (id, user_id, type, amount, fee, total, status, reference, metadata) VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        req.user.sub,
        'send',
        numericAmount,
        0,
        numericAmount,
        'success',
        `CARD-${card.id || Date.now()}`,
        JSON.stringify({ reason: 'virtual_card_funding', provider: 'flutterwave', card_id: card.id }),
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
    }).catch(console.error);

    return res.status(201).json({ message: 'Card created', card });
  } catch (err) {
    await conn.rollback();
    return res.status(500).json({ error: 'Card creation failed' });
  } finally {
    conn.release();
  }
});

router.post('/:cardId/freeze', requireUser, async (req, res) => {
  const { cardId } = req.params;
  if (!cardId) return res.status(400).json({ error: 'Card ID required' });
  await blockVirtualCard(cardId);
  await pool.query('UPDATE virtual_cards SET status = ? WHERE card_id = ? AND user_id = ?', [
    'frozen',
    cardId,
    req.user.sub,
  ]);
  return res.json({ message: 'Card frozen' });
});

router.post('/:cardId/unfreeze', requireUser, async (req, res) => {
  const { cardId } = req.params;
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
