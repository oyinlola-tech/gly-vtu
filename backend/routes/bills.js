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
  isNonEmptyString,
  isValidAmount,
  isValidPhone,
  isValidServiceId,
  normalizeAccount,
} from '../utils/validation.js';
import { billsLimiter } from '../middleware/rateLimiters.js';

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
      console.error('VTpass categories error', err.message);
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
      console.error('VTpass providers error', err.message);
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
  } catch (err) {
    return res.status(502).json({ error: 'Unable to fetch variations' });
  }
});

router.post('/quote', requireUser, async (req, res) => {
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
  const { providerCode, amount, variationCode } = req.body || {};
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
    } catch (err) {
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

router.post('/pay', billsLimiter, requireUser, async (req, res) => {
  /*
    #swagger.tags = ['Bills']
    #swagger.summary = 'Pay a bill'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.parameters['body'] = { in: 'body', required: true, schema: { $ref: '#/definitions/BillsPayRequest' } }
    #swagger.responses[200] = { description: 'Payment success', schema: { $ref: '#/definitions/BillsPayResponse' } }
    #swagger.responses[400] = { description: 'Validation error', schema: { $ref: '#/definitions/ErrorResponse' } }
  */
  const { providerCode, amount, account, pin, variationCode, phone, subscriptionType } = req.body || {};
  const numericAmount = Number(amount);
  if (!providerCode || !isValidServiceId(providerCode) || !account) {
    return res.status(400).json({ error: 'Invalid request' });
  }
  if (!variationCode && !isValidAmount(numericAmount)) {
    return res.status(400).json({ error: 'Invalid amount' });
  }
  if (!isValidPin(pin)) return res.status(400).json({ error: 'Invalid transaction PIN' });
  if (phone && !isValidPhone(phone)) return res.status(400).json({ error: 'Invalid phone number' });
  const safeAccount = normalizeAccount(account);
  if (!safeAccount) return res.status(400).json({ error: 'Invalid account' });
  try {
    await verifyTransactionPin(req.user.sub, pin);
  } catch (err) {
    return res.status(400).json({ error: err.message });
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
      const [[user]] = await pool.query('SELECT full_name, email, phone FROM users WHERE id = ?', [
        req.user.sub,
      ]);
      const payload = {
        request_id: requestId,
        serviceID: providerCode,
        billersCode: safeAccount,
        amount: resolvedAmount,
        phone: phone || user?.phone || '',
        variation_code: variationCode || undefined,
        subscription_type: subscriptionType || undefined,
      };

      const vtpassRes = await buyService(payload);
      const responseCode = vtpassRes?.response_description || vtpassRes?.code || '';
      const status =
        responseCode === '000' || responseCode === 'SUCCESS' ? 'success' : 'pending';

      const reference = `BILL-${requestId}`;
      const userMeta = user;
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
            }).catch(console.error);
          }
          return res.status(400).json({ error: 'Insufficient balance' });
        }

        await conn.query('UPDATE wallets SET balance = balance - ? WHERE user_id = ?', [
          resolvedAmount,
          req.user.sub,
        ]);

        await conn.query(
          'INSERT INTO bill_orders (id, user_id, provider_id, amount, fee, total, status, reference) VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?)',
          [req.user.sub, null, resolvedAmount, 0, resolvedAmount, status, reference]
        );
        await conn.query(
          'INSERT INTO transactions (id, user_id, type, amount, fee, total, status, reference, metadata) VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            req.user.sub,
            'bill',
            resolvedAmount,
            0,
            resolvedAmount,
            status,
            reference,
            JSON.stringify({ provider: providerCode, account: safeAccount, vtpass: vtpassRes }),
          ]
        );
        await conn.commit();
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
          }).catch(console.error);
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
        }).catch(console.error);
        return res.json({
          message: status === 'success' ? 'Bill paid' : 'Payment pending',
          reference,
          total: resolvedAmount,
          status,
          vtpass: vtpassRes,
        });
      } finally {
        conn.release();
      }
    } catch (err) {
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
  if (!rows.length) return res.status(404).json({ error: 'Provider not found' });

  const pricing = rows[0];
  const markup =
    pricing.markup_type === 'percent'
      ? (numericAmount * Number(pricing.markup_value)) / 100
      : Number(pricing.markup_value);
  const fee = Number(pricing.base_fee) + markup;
  const total = numericAmount + fee;

  const [[user]] = await pool.query('SELECT full_name, email FROM users WHERE id = ?', [
    req.user.sub,
  ]);
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
        }).catch(console.error);
      }
      return res.status(400).json({ error: 'Insufficient balance' });
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
    await conn.query(
      'INSERT INTO transactions (id, user_id, type, amount, fee, total, status, reference, metadata) VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        req.user.sub,
        'bill',
        numericAmount,
        fee,
        total,
        'success',
        reference,
        JSON.stringify({ provider: pricing.name, account }),
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
    }).catch(console.error);
    logAudit({
      actorType: 'user',
      actorId: req.user.sub,
      action: 'bill.paid',
      entityType: 'bill_order',
      entityId: reference,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: { provider: pricing.name, account },
    }).catch(console.error);
    return res.json({ message: 'Bill paid', reference, total });
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
      }).catch(console.error);
    }
    return res.status(500).json({ error: 'Payment failed' });
  } finally {
    conn.release();
  }
});

router.post('/pay-card', billsLimiter, requireUser, async (req, res) => {
  /*
    #swagger.tags = ['Bills']
    #swagger.summary = 'Pay a bill with external card'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.parameters['body'] = { in: 'body', required: true, schema: { $ref: '#/definitions/BillsPayRequest' } }
    #swagger.responses[200] = { description: 'Checkout created', schema: { type: 'object' } }
    #swagger.responses[400] = { description: 'Validation error', schema: { $ref: '#/definitions/ErrorResponse' } }
  */
  const { providerCode, amount, account, variationCode } = req.body || {};
  const numericAmount = Number(amount);
  if (!providerCode || !isValidServiceId(providerCode) || !account) {
    return res.status(400).json({ error: 'Invalid request' });
  }
  if (!variationCode && !isValidAmount(numericAmount)) {
    return res.status(400).json({ error: 'Invalid amount' });
  }
  const safeAccount = normalizeAccount(account);
  if (!safeAccount) return res.status(400).json({ error: 'Invalid account' });

  const checkoutBase = (process.env.CARD_CHECKOUT_URL || '').trim();
  if (!checkoutBase) {
    return res.status(400).json({ error: 'Card payments not configured' });
  }

  let pricing = { name: providerCode, currency: 'NGN' };
  let resolvedAmount = numericAmount;
  if (vtpassEnabled && variationCode) {
    const variations = await getServiceVariations(providerCode);
    const items = variations?.content?.variations || [];
    const match = items.find((v) => v.variation_code === variationCode);
    if (!match) return res.status(400).json({ error: 'Invalid variation code' });
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
  await pool.query(
    'INSERT INTO transactions (id, user_id, type, amount, fee, total, status, reference, metadata) VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      req.user.sub,
      'bill',
      resolvedAmount,
      fee,
      total,
      'pending',
      reference,
      JSON.stringify({
        provider: pricing.name,
        account: safeAccount,
        channel: 'card',
        cardProvider: provider,
        variationCode,
      }),
    ]
  );

  const checkoutUrl = `${checkoutBase}?reference=${encodeURIComponent(
    reference
  )}&amount=${encodeURIComponent(total)}&currency=${encodeURIComponent(pricing.currency)}`;

  return res.json({
    message: 'Card checkout created',
    reference,
    total,
    currency: pricing.currency,
    checkoutUrl,
  });
});

export default router;
