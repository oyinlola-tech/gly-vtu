import express from 'express';
import { pool } from '../config/db.js';
import { requireAdmin } from '../middleware/adminAuth.js';
import { requirePermission } from '../middleware/permissions.js';
import { logAudit } from '../utils/audit.js';
import { sendKycStatusEmail } from '../utils/email.js';
import { createVirtualAccountForCustomer } from '../utils/flutterwave.js';
import { sanitizeFlutterwaveAccount } from '../utils/sanitize.js';
import { sendReservedAccountEmail } from '../utils/email.js';
import { applyUserPII, decryptJson } from '../utils/encryption.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

router.get('/', requireAdmin, requirePermission('users:read'), async (req, res) => {
  /*
    #swagger.tags = ['Admin Users']
    #swagger.summary = 'List users'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.responses[200] = { description: 'Users', schema: { type: 'array', items: { $ref: '#/definitions/AdminUserListItem' } } }
  */
  const [rows] = await pool.query(
    'SELECT id, full_name, email, phone, full_name_encrypted, email_encrypted, phone_encrypted, kyc_level, kyc_status, created_at FROM users ORDER BY created_at DESC LIMIT 200'
  );
  return res.json(rows.map((row) => applyUserPII(row)));
});

router.put('/:id/kyc', requireAdmin, requirePermission('users:kyc'), async (req, res) => {
  /*
    #swagger.tags = ['Admin Users']
    #swagger.summary = 'Update user KYC status'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.parameters['body'] = { in: 'body', required: true, schema: { $ref: '#/definitions/AdminKycUpdateRequest' } }
    #swagger.responses[200] = { description: 'Updated', schema: { $ref: '#/definitions/MessageResponse' } }
  */
  const { status, level } = req.body || {};
  if (!['verified', 'rejected', 'pending'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  const nextLevel = Number(level || 1);
  if (![1, 2, 3].includes(nextLevel)) {
    return res.status(400).json({ error: 'Invalid level' });
  }
  await pool.query('UPDATE users SET kyc_status = ?, kyc_level = ? WHERE id = ?', [
    status,
    nextLevel,
    req.params.id,
  ]);
  const [[userRaw]] = await pool.query(
    'SELECT id, full_name, email, full_name_encrypted, email_encrypted FROM users WHERE id = ?',
    [req.params.id]
  );
  const user = applyUserPII(userRaw);
  if (user?.email) {
    sendKycStatusEmail({
      to: user.email,
      name: user.full_name,
      status,
    }).catch((err) => logger.error('KYC status email send error', { error: logger.format(err) }));
  }
  logAudit({
    actorType: 'admin',
    actorId: req.admin.sub,
    action: 'admin.kyc.update',
    entityType: 'user',
    entityId: req.params.id,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    metadata: { status, level: Number(level || 1) },
  }).catch((err) => logger.error('Audit log failed (admin.kyc.update)', { error: logger.format(err) }));
  return res.json({ message: 'KYC updated' });
});

router.post('/:id/reserved-account', requireAdmin, requirePermission('accounts:write'), async (req, res) => {
  /*
    #swagger.tags = ['Admin Users']
    #swagger.summary = 'Create reserved account for user'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.responses[200] = { description: 'Created', schema: { $ref: '#/definitions/MessageResponse' } }
    #swagger.responses[409] = { description: 'Already exists', schema: { $ref: '#/definitions/ErrorResponse' } }
  */
  const userId = req.params.id;
  const [existing] = await pool.query(
    'SELECT id FROM reserved_accounts WHERE user_id = ? LIMIT 1',
    [userId]
  );
  if (existing.length) return res.status(409).json({ error: 'Account already exists' });

  const [[userRaw]] = await pool.query(
    'SELECT id, full_name, email, full_name_encrypted, email_encrypted, kyc_payload, kyc_payload_encrypted FROM users WHERE id = ?',
    [userId]
  );
  const user = applyUserPII(userRaw);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const payload =
    decryptJson(user.kyc_payload_encrypted, userId) ||
    (user.kyc_payload ? JSON.parse(user.kyc_payload) : {});
  const customerId = payload.flutterwave_customer_id;

  const accountReference = `GLY-${userId}`;
  const reserved = await createVirtualAccountForCustomer({
    email: user.email,
    tx_ref: accountReference,
    firstName: user.full_name?.split(' ')[0] || user.full_name,
    lastName: user.full_name?.split(' ').slice(1).join(' ') || user.full_name,
    customerId: customerId || undefined,
  });
  const account = reserved?.data || reserved?.response || {};
  await pool.query(
    `INSERT INTO reserved_accounts
     (id, user_id, provider, account_reference, reservation_reference, account_name, account_number, bank_name, bank_code, status, raw_response)
     VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      'flutterwave',
      accountReference,
      account.order_ref || account.reference || null,
      account.account_name || user.full_name,
      account.account_number || '',
      account.bank_name || '',
      account.bank_code || null,
      account.status || 'ACTIVE',
      JSON.stringify(sanitizeFlutterwaveAccount(account)),
    ]
  );
  sendReservedAccountEmail({
    to: user.email,
    name: user.full_name,
    accountNumber: account.account_number,
    bankName: account.bank_name,
  }).catch((err) => logger.error('Reserved account email send error', { error: logger.format(err) }));
  logAudit({
    actorType: 'admin',
    actorId: req.admin.sub,
    action: 'admin.reserved_account.create',
    entityType: 'user',
    entityId: userId,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  }).catch((err) => logger.error('Audit log failed (admin.reserved_account.create)', { error: logger.format(err) }));
  return res.json({ message: 'Reserved account created' });
});

export default router;
