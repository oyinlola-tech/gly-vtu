import express from 'express';
import { pool } from '../config/db.js';
import { requireUser } from '../middleware/auth.js';
import { nanoid } from 'nanoid';
import { sendReceiptEmail, sendBillFailedEmail } from '../utils/email.js';
import { logAudit } from '../utils/audit.js';
import { verifyTransactionPin, isValidPin } from '../utils/pin.js';
import {
  vtpassEnabled,
  getServiceCategories,
  getServicesByIdentifier,
  getServiceVariations,
  buyService,
  generateRequestId,
} from '../utils/vtpass.js';
import {
  isValidAmount,
  isValidPhone,
  isValidServiceId,
  normalizeAccount,
} from '../utils/validation.js';
import { billsLimiter } from '../middleware/rateLimiters.js';
import { sanitizeVtpassPayload } from '../utils/sanitize.js';
import { enforceKycLimits } from '../utils/kycLimits.js';
import { checkIdempotency, completeIdempotency } from '../utils/idempotency.js';
import { logSecurityEvent } from '../utils/securityEvents.js';
import { applyUserPII } from '../utils/encryption.js';
import { buildTransactionMetadata } from '../utils/transactionMetadata.js';
import {
  validateRequest,
  billsQuoteSchema,
  billsPaySchema,
  billsPayCardSchema,
} from '../middleware/requestValidation.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

router.get('/categories', async (req, res) => {
  /*
    #swagger.tags = ['Bills']
    #swagger.summary = 'List active bill categories'
    #swagger.responses[200] = {
      description: 'Categories',
      schema: { type: 'array', items: { $ref: '#/definitions/BillCategory' } }
    }
  */
  if (vtpassEnabled) {
    try {
      const data = await getServiceCategories();
      const raw = data?.content || [];
      const mapped = raw.map((cat) => {
        const identifier = (cat?.identifier || '').toLowerCase();
        const codeMap = {
          airtime: 'airtime',
          data: 'data',
          'tv-subscription': 'tv',
          'electricity-bill': 'electricity',
        };
        const code = codeMap[identifier] || identifier || cat?.name?.toLowerCase()?.replace(/\s+/g, '-');
        return {
          code,
          name: cat?.name || code,
          description: cat?.description || cat?.name || code,
        };
      });
      return res.json(mapped);
    } catch (err) {
      logger.error('VTpass categories error', { error: err.message });
    }
  }

  const [rows] = await pool.query(
    'SELECT id, code, name, description FROM bill_categories WHERE active = 1 ORDER BY name'
  );
  return res.json(rows);
});

router.get('/providers', async (req, res) => {
  /*
    #swagger.tags = ['Bills']
    #swagger.summary = 'List bill providers by category code'
    #swagger.parameters['category'] = {
      in: 'query',
      required: true,
      type: 'string'
    }
    #swagger.responses[200] = {
      description: 'Providers',
      schema: { type: 'array', items: { $ref: '#/definitions/BillProvider' } }
    }
    #swagger.responses[400] = { description: 'Validation error', schema: { $ref: '#/definitions/ErrorResponse' } }
  */
  const { category } = req.query;
  if (!category) return res.status(400).json({ error: 'Category required' });

  if (vtpassEnabled) {
    const identifierMap = {
      airtime: 'airtime',
      data: 'data',
      tv: 'tv-subscription',
      electricity: 'electricity-bill',
    };
    const identifier = identifierMap[String(category).toLowerCase()] || String(category);
    try {
      const data = await getServicesByIdentifier(identifier);
      const list = data?.content || [];
      const mapped = list.map((svc) => ({
        id: svc?.serviceID || svc?.serviceId || svc?.id || svc?.name,
        name: svc?.name || svc?.serviceName || svc?.serviceID,
        code: svc?.serviceID || svc?.serviceId || svc?.name?.toLowerCase()?.replace(/\s+/g, '-'),
        logo_url: svc?.image || null,
        category_code: String(category),
      }));
      return res.json(mapped);
    } catch (err) {
      logger.error('VTpass providers error', { error: err.message });
      return res.status(502).json({ error: 'Unable to fetch providers' });
    }
  }

  const [rows] = await pool.query(
    `SELECT p.id, p.name, p.code, p.logo_url, c.code as category_code
     FROM bill_providers p
     JOIN bill_categories c ON c.id = p.category_id
     WHERE c.code = ? AND p.active = 1`,
    [category]
  );
  return res.json(rows);
});

router.get('/variations', async (req, res) => {
  /*
    #swagger.tags = ['Bills']
    #swagger.summary = 'List service variations (plans)'
    #swagger.parameters['serviceID'] = {
      in: 'query',
      required: true,
      type: 'string'
    }
    #swagger.responses[200] = { description: 'Variations', schema: { type: 'object' } }
    #swagger.responses[400] = { description: 'Validation error', schema: { $ref: '#/definitions/ErrorResponse' } }
  */
  const { serviceID } = req.query;
  if (!serviceID || !isValidServiceId(serviceID)) {
    return res.status(400).json({ error: 'Service ID required' });
  }
  if (!vtpassEnabled) return res.status(400).json({ error: 'Variations not available' });
  try {
    const data = await getServiceVariations(String(serviceID));
    return res.json(data?.content || {});
  } catch {
    return res.status(502).json({ error: 'Unable to fetch variations' });
  }
});

router.post('/quote', requireUser, validateRequest(billsQuoteSchema), async (req, res) => {
  /*
    #swagger.tags = ['Bills']
    #swagger.summary = 'Get bill payment quote'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.parameters['body'] = { in: 'body', required: true, schema: { $ref: '#/definitions/BillsQuoteRequest' } }
    #swagger.responses[200] = {
      description: 'Quote',
      schema: { $ref: '#/definitions/BillQuoteResponse' }
    }
  */
  const { providerCode, amount, variationCode } = req.validated || req.body || {};
  const numericAmount = Number(amount);
  if (!providerCode || !isValidServiceId(providerCode)) {
    return res.status(400).json({ error: 'Invalid provider' });
  }
  if (!variationCode && !isValidAmount(numericAmount)) {
    return res.status(400).json({ error: 'Invalid request' });
  }

  if (vtpassEnabled) {
    try {
      let resolvedAmount = numericAmount;
      if (variationCode) {
        const variations = await getServiceVariations(providerCode);
        const items = variations?.content?.variations || [];
        const match = items.find((v) => v.variation_code === variationCode);
        if (!match) return res.status(400).json({ error: 'Invalid variation code' });
        resolvedAmount = Number(match.variation_amount || match.amount || numericAmount || 0);
      }
      return res.json({
        provider: providerCode,
        amount: resolvedAmount,
        fee: 0,
        total: resolvedAmount,
        currency: 'NGN',
      });
    } catch {
      return res.status(502).json({ error: 'Unable to fetch quote' });
    }
  }

  const [rows] = await pool.query(
    `SELECT p.id, p.name, pr.base_fee, pr.markup_type, pr.markup_value, pr.currency
     FROM bill_providers p
     JOIN bill_pricing pr ON pr.provider_id = p.id
     WHERE p.code = ? AND p.active = 1 AND pr.active = 1`,
    [providerCode]
  );
  if (!rows.length) return res.status(404).json({ error: 'Provider not found' });

  const pricing = rows[0];
  const markup =
    pricing.markup_type === 'percent'
      ? (numericAmount * Number(pricing.markup_value)) / 100
      : Number(pricing.markup_value);
  const fee = Number(pricing.base_fee) + markup;
  const total = numericAmount + fee;

  return res.json({
    provider: pricing.name,
    amount: numericAmount,
    fee,
    total,
    currency: pricing.currency,
  });
});

router.post('/pay', billsLimiter, requireUser, validateRequest(billsPaySchema), async (req, res) => {
  /*
    #swagger.tags = ['Bills']
    #swagger.summary = 'Pay a bill'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.parameters['body'] = { in: 'body', required: true, schema: { $ref: '#/definitions/BillsPayRequest' } }
    #swagger.responses[200] = { description: 'Payment success', schema: { $ref: '#/definitions/BillsPayResponse' } }
    #swagger.responses[400] = { description: 'Validation error', schema: { $ref: '#/definitions/ErrorResponse' } }
  */
  const { providerCode, amount, account, pin, variationCode, phone, subscriptionType } = req.validated || req.body || {};
  const idemKey = (req.headers['x-idempotency-key'] || '').toString().trim() || null;
  const idem = await checkIdempotency({
    userId: req.user.sub,
    key: idemKey,
    route: 'bills.pay',
    body: req.validated || req.body,
  });
  if (!idem.ok) return res.status(idem.status).json({ error: idem.error });
  if (idem.hit) return res.json(idem.response || {});

  async function respond(status, payload) {
    await completeIdempotency({
      userId: req.user.sub,
      key: idemKey,
      route: 'bills.pay',
      response: payload,
    });
    return res.status(status).json(payload);
  }
  const numericAmount = Number(amount);
  if (!providerCode || !isValidServiceId(providerCode) || !account) {
    return respond(400, { error: 'Invalid request' });
  }
  if (!variationCode && !isValidAmount(numericAmount)) {
    return respond(400, { error: 'Invalid amount' });
  }
  if (!isValidPin(pin)) return respond(400, { error: 'PIN must be exactly 6 digits' });
  if (phone && !isValidPhone(phone)) return respond(400, { error: 'Invalid phone number' });
  const safeAccount = normalizeAccount(account);
  if (!safeAccount) return respond(400, { error: 'Invalid account' });
  try {
    await verifyTransactionPin(req.user.sub, pin);
  } catch (err) {
    return respond(400, { error: err.message });
  }

  const [[userRaw]] = await pool.query(
    'SELECT id, full_name, email, phone, full_name_encrypted, email_encrypted, phone_encrypted, kyc_level, kyc_status FROM users WHERE id = ?',
    [req.user.sub]
  );
  if (!userRaw) return respond(404, { error: 'User not found' });
  const userMeta = applyUserPII(userRaw);

  const limitCheck = await enforceKycLimits({
    userId: req.user.sub,
    level: userMeta.kyc_level || 1,
    amount: numericAmount,
    types: ['bill'],
  });
  if (!limitCheck.ok) {
    logSecurityEvent({
      type: 'kyc.limit.bill',
      severity: 'medium',
      actorType: 'user',
      actorId: req.user.sub,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: { amount: numericAmount, message: limitCheck.message },
    }).catch(() => null);
    return respond(403, { error: limitCheck.message });
  }

  if (vtpassEnabled) {
    try {
      let resolvedAmount = numericAmount;
      if (variationCode) {
        const variations = await getServiceVariations(providerCode);
        const items = variations?.content?.variations || [];
        const match = items.find((v) => v.variation_code === variationCode);
        if (!match) return res.status(400).json({ error: 'Invalid variation code' });
        resolvedAmount = Number(match.variation_amount || match.amount || numericAmount || 0);
      }
      const requestId = generateRequestId();
      const reference = `BILL-${requestId}`;
      const user = userMeta;

      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        const [walletRows] = await conn.query(
          'SELECT balance FROM wallets WHERE user_id = ? FOR UPDATE',
          [req.user.sub]
        );
        if (!walletRows.length) throw new Error('Wallet missing');
        if (Number(walletRows[0].balance) < resolvedAmount) {
          await conn.rollback();
          if (userMeta?.email) {
            sendBillFailedEmail({
              to: userMeta.email,
              name: userMeta.full_name,
              details: [
                `Service: ${providerCode}`,
                `Amount: NGN ${resolvedAmount.toFixed(2)}`,
                `Reason: Insufficient balance`,
              ],
            }).catch((err) => logger.error('Async operation failed', { error: logger.format(err) }));
          }
          return respond(400, { error: 'Insufficient balance' });
        }

        await conn.query('UPDATE wallets SET balance = balance - ? WHERE user_id = ?', [
          resolvedAmount,
          req.user.sub,
        ]);

        await conn.query(
          'INSERT INTO bill_orders (id, user_id, provider_id, amount, fee, total, status, reference) VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?)',
          [req.user.sub, null, resolvedAmount, 0, resolvedAmount, 'pending', reference]
        );
        const { safe, encrypted } = buildTransactionMetadata(
          { provider: providerCode, account: safeAccount },
          req.user.sub
        );
        await conn.query(
          'INSERT INTO transactions (id, user_id, type, amount, fee, total, status, reference, metadata, metadata_encrypted) VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            req.user.sub,
            'bill',
            resolvedAmount,
            0,
            resolvedAmount,
            'pending',
            reference,
            safe ? JSON.stringify(safe) : null,
            encrypted,
          ]
        );
        await conn.commit();
      } finally {
        conn.release();
      }

      let vtpassRes = null;
      let status = 'pending';
      try {
        const payload = {
          request_id: requestId,
          serviceID: providerCode,
          billersCode: safeAccount,
          amount: resolvedAmount,
          phone: phone || user?.phone || '',
          variation_code: variationCode || undefined,
          subscription_type: subscriptionType || undefined,
        };
        vtpassRes = await buyService(payload);
        const responseCode = vtpassRes?.response_description || vtpassRes?.code || '';
        status = responseCode === '000' || responseCode === 'SUCCESS' ? 'success' : 'pending';
      } catch {
        status = 'failed';
      }

      await pool.query('UPDATE bill_orders SET status = ? WHERE reference = ?', [
        status,
        reference,
      ]);
      const { safe: updateSafe, encrypted: updateEncrypted } = buildTransactionMetadata(
        {
          provider: providerCode,
          account: safeAccount,
          vtpass: vtpassRes ? sanitizeVtpassPayload(vtpassRes) : null,
        },
        req.user.sub
      );
      await pool.query(
        'UPDATE transactions SET status = ?, metadata = ?, metadata_encrypted = ? WHERE reference = ?',
        [
          status,
          updateSafe ? JSON.stringify(updateSafe) : null,
          updateEncrypted,
          reference,
        ]
      );

      if (status === 'failed') {
        await pool.query('UPDATE wallets SET balance = balance + ? WHERE user_id = ?', [
          resolvedAmount,
          req.user.sub,
        ]);
        if (userMeta?.email) {
          sendBillFailedEmail({
            to: userMeta.email,
            name: userMeta.full_name,
            details: [
              `Service: ${providerCode}`,
              `Amount: NGN ${resolvedAmount.toFixed(2)}`,
              `Reason: Provider failed`,
            ],
          }).catch((err) => logger.error('Async operation failed', { error: logger.format(err) }));
        }
        return respond(502, { error: 'VTpass payment failed' });
      }

      if (userMeta?.email && status === 'success') {
        sendReceiptEmail({
          to: userMeta.email,
          name: userMeta.full_name,
          title: 'Bill Payment Successful',
          details: [
            `Service: ${providerCode}`,
            `Amount: NGN ${resolvedAmount.toFixed(2)}`,
            `Reference: ${reference}`,
          ],
        }).catch((err) => logger.error('Async operation failed', { error: logger.format(err) }));
      }
      logAudit({
        actorType: 'user',
        actorId: req.user.sub,
        action: 'bill.paid',
        entityType: 'bill_order',
        entityId: reference,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        metadata: { provider: providerCode, account: safeAccount },
      }).catch((err) => logger.error('Async operation failed', { error: logger.format(err) }));
      return respond(200, {
        message: status === 'success' ? 'Bill paid' : 'Payment pending',
        reference,
        total: resolvedAmount,
        status,
        vtpass: vtpassRes ? sanitizeVtpassPayload(vtpassRes) : null,
      });
    } catch {
      return res.status(502).json({ error: 'VTpass payment failed' });
    }
  }

  const [rows] = await pool.query(
    `SELECT p.id, p.name, pr.base_fee, pr.markup_type, pr.markup_value, pr.currency
     FROM bill_providers p
     JOIN bill_pricing pr ON pr.provider_id = p.id
     WHERE p.code = ? AND p.active = 1 AND pr.active = 1`,
    [providerCode]
  );
  if (!rows.length) return respond(404, { error: 'Provider not found' });

  const pricing = rows[0];
  const markup =
    pricing.markup_type === 'percent'
      ? (numericAmount * Number(pricing.markup_value)) / 100
      : Number(pricing.markup_value);
  const fee = Number(pricing.base_fee) + markup;
  const total = numericAmount + fee;

      const user = userMeta;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [walletRows] = await conn.query(
      'SELECT balance FROM wallets WHERE user_id = ? FOR UPDATE',
      [req.user.sub]
    );
    if (!walletRows.length) throw new Error('Wallet missing');
    if (Number(walletRows[0].balance) < total) {
      await conn.rollback();
      if (user?.email) {
        sendBillFailedEmail({
          to: user.email,
          name: user.full_name,
          details: [
            `Service: ${pricing.name}`,
            `Amount: NGN ${numericAmount.toFixed(2)}`,
            `Reason: Insufficient balance`,
          ],
        }).catch((err) => logger.error('Async operation failed', { error: logger.format(err) }));
      }
      return respond(400, { error: 'Insufficient balance' });
    }

    await conn.query('UPDATE wallets SET balance = balance - ? WHERE user_id = ?', [
      total,
      req.user.sub,
    ]);

    const reference = `BILL-${nanoid(10)}`;
    await conn.query(
      'INSERT INTO bill_orders (id, user_id, provider_id, amount, fee, total, status, reference) VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?)',
      [req.user.sub, pricing.id, numericAmount, fee, total, 'success', reference]
    );
    const { safe: safeMeta, encrypted: encryptedMeta } = buildTransactionMetadata(
      { provider: pricing.name, account },
      req.user.sub
    );
    await conn.query(
      'INSERT INTO transactions (id, user_id, type, amount, fee, total, status, reference, metadata, metadata_encrypted) VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        req.user.sub,
        'bill',
        numericAmount,
        fee,
        total,
        'success',
        reference,
        safeMeta ? JSON.stringify(safeMeta) : null,
        encryptedMeta,
      ]
    );
    await conn.commit();
    sendReceiptEmail({
      to: user.email,
      name: user.full_name,
      title: 'Bill Payment Successful',
      details: [
        `Service: ${pricing.name}`,
        `Amount: NGN ${numericAmount.toFixed(2)}`,
        `Fee: NGN ${fee.toFixed(2)}`,
        `Total: NGN ${total.toFixed(2)}`,
        `Reference: ${reference}`,
      ],
    }).catch((err) => logger.error('Async operation failed', { error: logger.format(err) }));
    logAudit({
      actorType: 'user',
      actorId: req.user.sub,
      action: 'bill.paid',
      entityType: 'bill_order',
      entityId: reference,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: { provider: pricing.name, account },
    }).catch((err) => logger.error('Async operation failed', { error: logger.format(err) }));
    return respond(200, { message: 'Bill paid', reference, total });
  } catch (err) {
    await conn.rollback();
    if (user?.email) {
      sendBillFailedEmail({
        to: user.email,
        name: user.full_name,
        details: [
          `Service: ${pricing?.name || providerCode}`,
          `Amount: NGN ${numericAmount.toFixed(2)}`,
          `Reason: ${err.message || 'Processing error'}`,
        ],
      }).catch((err) => logger.error('Async operation failed', { error: logger.format(err) }));
    }
    return respond(500, { error: 'Payment failed' });
  } finally {
    conn.release();
  }
});

router.post('/pay-card', billsLimiter, requireUser, validateRequest(billsPayCardSchema), async (req, res) => {
  /*
    #swagger.tags = ['Bills']
    #swagger.summary = 'Pay a bill with external card'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.parameters['body'] = { in: 'body', required: true, schema: { $ref: '#/definitions/BillsPayRequest' } }
    #swagger.responses[200] = { description: 'Checkout created', schema: { type: 'object' } }
    #swagger.responses[400] = { description: 'Validation error', schema: { $ref: '#/definitions/ErrorResponse' } }
  */
  const { providerCode, amount, account, variationCode } = req.validated || req.body || {};
  const idemKey = (req.headers['x-idempotency-key'] || '').toString().trim() || null;
  const idem = await checkIdempotency({
    userId: req.user.sub,
    key: idemKey,
    route: 'bills.pay-card',
    body: req.validated || req.body,
  });
  if (!idem.ok) return res.status(idem.status).json({ error: idem.error });
  if (idem.hit) return res.json(idem.response || {});

  async function respond(status, payload) {
    await completeIdempotency({
      userId: req.user.sub,
      key: idemKey,
      route: 'bills.pay-card',
      response: payload,
    });
    return res.status(status).json(payload);
  }
  const numericAmount = Number(amount);
  if (!providerCode || !isValidServiceId(providerCode) || !account) {
    return respond(400, { error: 'Invalid request' });
  }
  if (!variationCode && !isValidAmount(numericAmount)) {
    return respond(400, { error: 'Invalid amount' });
  }
  const safeAccount = normalizeAccount(account);
  if (!safeAccount) return respond(400, { error: 'Invalid account' });

  const checkoutBase = (process.env.CARD_CHECKOUT_URL || '').trim();
  if (!checkoutBase) {
    return respond(400, { error: 'Card payments not configured' });
  }

  let pricing = { name: providerCode, currency: 'NGN' };
  let resolvedAmount = numericAmount;
  if (vtpassEnabled && variationCode) {
    const variations = await getServiceVariations(providerCode);
    const items = variations?.content?.variations || [];
    const match = items.find((v) => v.variation_code === variationCode);
    if (!match) return respond(400, { error: 'Invalid variation code' });
    resolvedAmount = Number(match.variation_amount || match.amount || numericAmount || 0);
  }
  const fee = 0;
  const total = resolvedAmount + fee;

  const reference = `BILL-CARD-${nanoid(10)}`;
  const provider = process.env.CARD_PROVIDER || 'external_card';

  await pool.query(
    'INSERT INTO bill_orders (id, user_id, provider_id, amount, fee, total, status, reference) VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?)',
    [req.user.sub, null, resolvedAmount, fee, total, 'pending', reference]
  );
  const { safe: cardSafe, encrypted: cardEncrypted } = buildTransactionMetadata(
    {
      provider: pricing.name,
      account: safeAccount,
      channel: 'card',
      cardProvider: provider,
      variationCode,
    },
    req.user.sub
  );
  await pool.query(
    'INSERT INTO transactions (id, user_id, type, amount, fee, total, status, reference, metadata, metadata_encrypted) VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      req.user.sub,
      'bill',
      resolvedAmount,
      fee,
      total,
      'pending',
      reference,
      cardSafe ? JSON.stringify(cardSafe) : null,
      cardEncrypted,
    ]
  );

  const checkoutUrl = `${checkoutBase}?reference=${encodeURIComponent(
    reference
  )}&amount=${encodeURIComponent(total)}&currency=${encodeURIComponent(pricing.currency)}`;

  return respond(200, {
    message: 'Card checkout created',
    reference,
    total,
    currency: pricing.currency,
    checkoutUrl,
  });
});

export default router;

