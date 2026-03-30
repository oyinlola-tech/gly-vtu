import express from 'express';
import { pool } from '../config/db.js';
import { requireUser } from '../middleware/auth.js';
import { createVirtualAccountForCustomer, updateCustomer } from '../utils/flutterwave.js';
import { sanitizeFlutterwaveAccount } from '../utils/sanitize.js';
import { sendReservedAccountEmail } from '../utils/email.js';
import {
  isValidPin,
  setTransactionPin,
  verifyTransactionPin,
  getPinStatus,
  validatePinComplexity,
} from '../utils/pin.js';
import { logAudit } from '../utils/audit.js';
import bcrypt from 'bcryptjs';
import { QUESTIONS, normalizeAnswer, isValidSecurityAnswer } from '../utils/securityQuestions.js';
import {
  generateTotpSecret,
  generateTotpQr,
  verifyTotp,
  generateBackupCodes,
  hashBackupCode,
} from '../utils/totp.js';
import zxcvbn from 'zxcvbn';
import { getKycLimitConfig } from '../utils/kycLimits.js';
import { logSecurityEvent } from '../utils/securityEvents.js';
import { changePasswordSchema, validateRequest } from '../middleware/requestValidation.js';
import { logger } from '../utils/logger.js';

const router = express.Router();
const MIN_PASSWORD_LENGTH = 10;
const MIN_ZXCVBN_SCORE = 3;

function validatePasswordStrength(password) {
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  }
  const score = zxcvbn(password).score;
  if (score < MIN_ZXCVBN_SCORE) {
    return 'Password is too weak';
  }
  return null;
}

router.get('/profile', requireUser, async (req, res) => {
  /*
    #swagger.tags = ['User']
    #swagger.summary = 'Get user profile and reserved account'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.responses[200] = { description: 'Profile', schema: { $ref: '#/definitions/UserProfile' } }
    #swagger.responses[404] = { description: 'Not found', schema: { $ref: '#/definitions/ErrorResponse' } }
  */
  const [rows] = await pool.query(
    `SELECT u.id, u.full_name, u.email, u.phone, u.kyc_level, u.kyc_status, u.kyc_payload,
            r.account_number, r.bank_name, r.account_name
     FROM users u
     LEFT JOIN reserved_accounts r ON r.user_id = u.id
     WHERE u.id = ?`,
    [req.user.sub]
  );
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  return res.json(rows[0]);
});

router.put('/profile', requireUser, async (req, res) => {
  /*
    #swagger.tags = ['User']
    #swagger.summary = 'Update profile'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: { $ref: '#/definitions/UpdateProfileRequest' }
    }
    #swagger.responses[200] = { description: 'Updated', schema: { $ref: '#/definitions/MessageResponse' } }
    #swagger.responses[400] = { description: 'Validation error', schema: { $ref: '#/definitions/ErrorResponse' } }
  */
  const { fullName, phone } = req.body || {};
  if (!fullName && !phone) return res.status(400).json({ error: 'Missing fields' });

  if (phone) {
    const [existing] = await pool.query(
      'SELECT id FROM users WHERE phone = ? AND id <> ? LIMIT 1',
      [phone, req.user.sub]
    );
    if (existing.length) return res.status(409).json({ error: 'Phone already in use' });
  }

  const updates = [];
  const values = [];
  if (fullName) {
    updates.push('full_name = ?');
    values.push(fullName);
  }
  if (phone) {
    updates.push('phone = ?');
    values.push(phone);
  }
  values.push(req.user.sub);
  await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);
  return res.json({ message: 'Profile updated' });
});

router.put('/kyc', requireUser, async (req, res) => {
  /*
    #swagger.tags = ['User']
    #swagger.summary = 'Submit KYC data'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: { $ref: '#/definitions/KycRequest' }
    }
    #swagger.responses[200] = { description: 'Submitted', schema: { $ref: '#/definitions/MessageResponse' } }
    #swagger.responses[400] = { description: 'Validation error', schema: { $ref: '#/definitions/ErrorResponse' } }
  */
  const { level, payload } = req.body || {};
  if (!level || !payload) return res.status(400).json({ error: 'Missing KYC data' });
  const targetLevel = Number(level);
  if (![2, 3].includes(targetLevel)) return res.status(400).json({ error: 'Invalid level' });

  const [[user]] = await pool.query(
    'SELECT full_name, email, phone, kyc_level, kyc_payload FROM users WHERE id = ?',
    [req.user.sub]
  );
  if (!user) return res.status(404).json({ error: 'Not found' });

  if (targetLevel === 2) {
    if (!payload.bvn && !payload.nin) {
      logSecurityEvent({
        type: 'kyc.validation.failed',
        severity: 'low',
        actorType: 'user',
        actorId: req.user.sub,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        metadata: { level: targetLevel, reason: 'missing_bvn_nin' },
      }).catch(() => null);
      return res.status(400).json({ error: 'BVN or NIN is required for Level 2' });
    }
    if (!payload.dob) {
      logSecurityEvent({
        type: 'kyc.validation.failed',
        severity: 'low',
        actorType: 'user',
        actorId: req.user.sub,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        metadata: { level: targetLevel, reason: 'missing_dob' },
      }).catch(() => null);
      return res.status(400).json({ error: 'Date of birth is required for Level 2' });
    }
  }
  if (targetLevel === 3) {
    if (!payload.address) {
      logSecurityEvent({
        type: 'kyc.validation.failed',
        severity: 'low',
        actorType: 'user',
        actorId: req.user.sub,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        metadata: { level: targetLevel, reason: 'missing_address' },
      }).catch(() => null);
      return res.status(400).json({ error: 'Address is required for Level 3' });
    }
    if (Number(user.kyc_level || 1) < 2) {
      return res.status(400).json({ error: 'Complete Level 2 verification first' });
    }
  }

  if (payload.phone && payload.phone !== user.phone) {
    const [existing] = await pool.query(
      'SELECT id FROM users WHERE phone = ? AND id <> ? LIMIT 1',
      [payload.phone, req.user.sub]
    );
    if (existing.length) return res.status(409).json({ error: 'Phone already in use' });
    await pool.query('UPDATE users SET phone = ? WHERE id = ?', [payload.phone, req.user.sub]);
  }

  const existingPayload = user.kyc_payload ? JSON.parse(user.kyc_payload) : {};
  const mergedPayload = { ...existingPayload, ...payload };

  await pool.query(
    'UPDATE users SET kyc_level = ?, kyc_status = ?, kyc_payload = ? WHERE id = ?',
    [targetLevel, 'pending', JSON.stringify(mergedPayload), req.user.sub]
  );

  if (targetLevel === 2) {
    const customerId = existingPayload.flutterwave_customer_id || mergedPayload.flutterwave_customer_id;
    if (customerId) {
      updateCustomer(customerId, {
        bvn: mergedPayload.bvn || undefined,
        nin: mergedPayload.nin || undefined,
        dob: mergedPayload.dob || undefined,
      }).catch(() => null);
    }
    const [existing] = await pool.query(
      'SELECT id FROM reserved_accounts WHERE user_id = ? LIMIT 1',
      [req.user.sub]
    );
    if (!existing.length) {
      try {
        const accountReference = `GLY-${req.user.sub}`;
        const reserved = await createVirtualAccountForCustomer({
          email: user.email,
          bvn: mergedPayload.bvn || null,
          tx_ref: accountReference,
          firstName: user.full_name?.split(' ')[0] || user.full_name,
          lastName: user.full_name?.split(' ').slice(1).join(' ') || user.full_name,
          customerId: customerId || undefined,
        });
        const account = reserved?.data || reserved?.response || {};
        await pool.query(
          `INSERT INTO reserved_accounts
           (id, user_id, provider, account_reference, reservation_reference, account_name, account_number, bank_name, bank_code, status, raw_response)
           VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE account_number = VALUES(account_number), bank_name = VALUES(bank_name), raw_response = VALUES(raw_response)`,
          [
            req.user.sub,
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
        if (user?.email) {
          sendReservedAccountEmail({
            to: user.email,
            name: user.full_name,
            accountNumber: account.account_number,
            bankName: account.bank_name,
          }).catch(console.error);
        }
      } catch (err) {
        // Keep KYC submission; reserved account can be retried later.
      }
    }
  }

  return res.json({ message: 'KYC submitted' });
});

router.get('/security', requireUser, async (req, res) => {
  /*
    #swagger.tags = ['User']
    #swagger.summary = 'Get security status'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.responses[200] = {
      description: 'Security status',
      schema: { type: 'object', properties: { pinSet: { type: 'boolean' }, biometricEnabled: { type: 'boolean' } } }
    }
  */
  const status = await getPinStatus(req.user.sub);
  if (!status) return res.status(404).json({ error: 'Not found' });
  const [[row]] = await pool.query(
    'SELECT security_question_enabled, totp_enabled FROM users WHERE id = ?',
    [req.user.sub]
  );
  return res.json({
    ...status,
    securityQuestionEnabled: Boolean(row?.security_question_enabled),
    totpEnabled: Boolean(row?.totp_enabled),
  });
});

function csvEscape(value) {
  const str = value === null || value === undefined ? '' : String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

router.get('/security-events', requireUser, async (req, res) => {
  const exportCsv = String(req.query.export || '').toLowerCase() === 'csv';
  const limit = Math.min(Number(req.query.limit || 50), 200);
  const offset = Math.max(Number(req.query.offset || 0), 0);

  const [rows] = await pool.query(
    `SELECT id, event_type, severity, ip_address, user_agent, metadata, created_at
     FROM security_events
     WHERE actor_type = 'user' AND actor_id = ?
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    [req.user.sub, limit, offset]
  );

  if (!exportCsv) {
    return res.json(rows || []);
  }

  const header = ['id', 'event_type', 'severity', 'ip_address', 'user_agent', 'metadata', 'created_at'];
  const lines = [header.join(',')];
  for (const row of rows || []) {
    lines.push(
      [
        row.id,
        row.event_type,
        row.severity,
        row.ip_address || '',
        row.user_agent || '',
        row.metadata ? JSON.stringify(row.metadata) : '',
        row.created_at ? new Date(row.created_at).toISOString() : '',
      ]
        .map(csvEscape)
        .join(',')
    );
  }

  const filename = `security-events-${new Date().toISOString().slice(0, 10)}.csv`;
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  return res.send(lines.join('\n'));
});

router.get('/kyc/limits', requireUser, async (req, res) => {
  const [[user]] = await pool.query(
    'SELECT kyc_level, kyc_status FROM users WHERE id = ? LIMIT 1',
    [req.user.sub]
  );
  if (!user) return res.status(404).json({ error: 'Not found' });
  const level = Number(user.kyc_level || 1);
  return res.json({
    level,
    status: user.kyc_status || 'pending',
    limits: {
      send: getKycLimitConfig(level, 'send'),
      bill: getKycLimitConfig(level, 'bill'),
      topup: getKycLimitConfig(level, 'topup'),
    },
  });
});

router.get('/sessions', requireUser, async (req, res) => {
  const [rows] = await pool.query(
    `SELECT id, device_id, label, last_seen, ip_address, user_agent, trusted
     FROM user_devices WHERE user_id = ? ORDER BY last_seen DESC`,
    [req.user.sub]
  );
  return res.json(rows);
});

router.post('/sessions/:id/revoke', requireUser, async (req, res) => {
  const [deviceRows] = await pool.query(
    'SELECT device_id FROM user_devices WHERE id = ? AND user_id = ? LIMIT 1',
    [req.params.id, req.user.sub]
  );
  const device = deviceRows?.[0];
  if (!device) return res.status(404).json({ error: 'Device not found' });
  await pool.query('UPDATE user_devices SET trusted = 0 WHERE id = ? AND user_id = ?', [
    req.params.id,
    req.user.sub,
  ]);
  await pool.query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = ? AND device_id = ?', [
    req.user.sub,
    device.device_id,
  ]);
  logAudit({
    actorType: 'user',
    actorId: req.user.sub,
    action: 'device.revoked',
    entityType: 'device',
    entityId: device.device_id,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  }).catch(() => null);
  return res.json({ message: 'Session revoked' });
});

router.post('/sessions/:id/label', requireUser, async (req, res) => {
  const label = String(req.body?.label || '').trim();
  if (!label || label.length > 80) {
    return res.status(400).json({ error: 'Label is required (max 80 chars)' });
  }
  const [rows] = await pool.query(
    'SELECT id FROM user_devices WHERE id = ? AND user_id = ? LIMIT 1',
    [req.params.id, req.user.sub]
  );
  if (!rows.length) return res.status(404).json({ error: 'Device not found' });
  await pool.query('UPDATE user_devices SET label = ? WHERE id = ? AND user_id = ?', [
    label,
    req.params.id,
    req.user.sub,
  ]);
  return res.json({ message: 'Device label updated' });
});

router.post('/password/change', requireUser, validateRequest(changePasswordSchema), async (req, res) => {
  const { currentPassword, newPassword } = req.validated || req.body || {};
  
  const passwordError = validatePasswordStrength(newPassword);
  if (passwordError) return res.status(400).json({ error: passwordError });
  const [[user]] = await pool.query(
    'SELECT id, password_hash, email FROM users WHERE id = ? LIMIT 1',
    [req.user.sub]
  );
  if (!user) return res.status(404).json({ error: 'User not found' });
  const ok = await bcrypt.compare(currentPassword, user.password_hash);
  if (!ok) {
    logSecurityEvent({
      type: 'password.change.failed',
      severity: 'medium',
      actorType: 'user',
      actorId: req.user.sub,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    }).catch(() => null);
    return res.status(400).json({ error: 'Invalid password' });
  }
  const passwordHash = await bcrypt.hash(newPassword, 12);
  await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [
    passwordHash,
    req.user.sub,
  ]);
  await pool.query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = ?', [
    req.user.sub,
  ]);
  logAudit({
    actorType: 'user',
    actorId: req.user.sub,
    action: 'user.password.change',
    entityType: 'user',
    entityId: req.user.sub,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  }).catch(() => null);
  logSecurityEvent({
    type: 'password.changed',
    severity: 'low',
    actorType: 'user',
    actorId: req.user.sub,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  }).catch(() => null);
  return res.json({ message: 'Password updated' });
});

router.post('/pin/setup', requireUser, async (req, res) => {
  /*
    #swagger.tags = ['User']
    #swagger.summary = 'Create transaction PIN'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.parameters['body'] = { in: 'body', required: true, schema: { $ref: '#/definitions/PinSetupRequest' } }
    #swagger.responses[200] = { description: 'Created', schema: { $ref: '#/definitions/MessageResponse' } }
  */
  const { pin } = req.body || {};
  const pinError = validatePinComplexity(pin);
  if (pinError) return res.status(400).json({ error: pinError });
  const [[row]] = await pool.query(
    'SELECT transaction_pin_hash FROM users WHERE id = ?',
    [req.user.sub]
  );
  if (row?.transaction_pin_hash) {
    return res.status(409).json({ error: 'Transaction PIN already set' });
  }
  await setTransactionPin(req.user.sub, pin);
  logAudit({
    actorType: 'user',
    actorId: req.user.sub,
    action: 'pin.setup',
    entityType: 'user',
    entityId: req.user.sub,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  }).catch(console.error);
  return res.json({ message: 'Transaction PIN created' });
});

router.post('/pin/change', requireUser, async (req, res) => {
  /*
    #swagger.tags = ['User']
    #swagger.summary = 'Change transaction PIN'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.parameters['body'] = { in: 'body', required: true, schema: { $ref: '#/definitions/PinChangeRequest' } }
    #swagger.responses[200] = { description: 'Updated', schema: { $ref: '#/definitions/MessageResponse' } }
    #swagger.responses[400] = { description: 'Invalid PIN', schema: { $ref: '#/definitions/ErrorResponse' } }
  */
  const { currentPin, newPin } = req.body || {};
  const pinError = validatePinComplexity(newPin);
  if (pinError) return res.status(400).json({ error: pinError });
  try {
    await verifyTransactionPin(req.user.sub, currentPin);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
  await setTransactionPin(req.user.sub, newPin);
  logAudit({
    actorType: 'user',
    actorId: req.user.sub,
    action: 'pin.changed',
    entityType: 'user',
    entityId: req.user.sub,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  }).catch(console.error);
  return res.json({ message: 'Transaction PIN updated' });
});

router.post('/pin/verify', requireUser, async (req, res) => {
  /*
    #swagger.tags = ['User']
    #swagger.summary = 'Verify transaction PIN'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.parameters['body'] = { in: 'body', required: true, schema: { $ref: '#/definitions/PinVerifyRequest' } }
    #swagger.responses[200] = {
      description: 'Verification result',
      schema: { type: 'object', properties: { valid: { type: 'boolean' } } }
    }
    #swagger.responses[400] = { description: 'Invalid PIN', schema: { $ref: '#/definitions/ErrorResponse' } }
  */
  const { pin } = req.body || {};
  if (!isValidPin(pin)) return res.status(400).json({ error: 'PIN must be exactly 6 digits' });
  try {
    await verifyTransactionPin(req.user.sub, pin);
    return res.json({ valid: true });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

router.post('/biometric', requireUser, async (req, res) => {
  /*
    #swagger.tags = ['User']
    #swagger.summary = 'Enable or disable biometric login'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.parameters['body'] = { in: 'body', required: true, schema: { $ref: '#/definitions/BiometricRequest' } }
    #swagger.responses[200] = { description: 'Updated', schema: { $ref: '#/definitions/MessageResponse' } }
  */
  const { enabled } = req.body || {};
  const [[row]] = await pool.query(
    'SELECT transaction_pin_hash FROM users WHERE id = ?',
    [req.user.sub]
  );
  if (!row?.transaction_pin_hash) {
    return res.status(400).json({ error: 'Set a transaction PIN first' });
  }
  await pool.query('UPDATE users SET biometric_enabled = ? WHERE id = ?', [
    enabled ? 1 : 0,
    req.user.sub,
  ]);
  logAudit({
    actorType: 'user',
    actorId: req.user.sub,
    action: enabled ? 'biometric.enabled' : 'biometric.disabled',
    entityType: 'user',
    entityId: req.user.sub,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  }).catch(console.error);
  return res.json({ message: 'Biometric preference updated' });
});

router.get('/security-questions', requireUser, async (req, res) => {
  return res.json(QUESTIONS);
});

router.get('/security-question', requireUser, async (req, res) => {
  const [[row]] = await pool.query(
    'SELECT security_question, security_updated_at, security_question_enabled FROM users WHERE id = ?',
    [req.user.sub]
  );
  return res.json({
    question: row?.security_question || null,
    updatedAt: row?.security_updated_at || null,
    enabled: Boolean(row?.security_question_enabled),
  });
});

router.post('/security-question/set', requireUser, async (req, res) => {
  const { question, answer } = req.body || {};
  if (!question || !answer) {
    return res.status(400).json({ error: 'Question and answer are required' });
  }
  if (!QUESTIONS.includes(question)) {
    return res.status(400).json({ error: 'Invalid security question' });
  }
  if (!isValidSecurityAnswer(answer)) {
    return res.status(400).json({ error: 'Security answer is too weak' });
  }
  const answerHash = await bcrypt.hash(normalizeAnswer(answer), 12);
  await pool.query(
    'UPDATE users SET security_question = ?, security_answer_hash = ?, security_updated_at = NOW() WHERE id = ?',
    [question, answerHash, req.user.sub]
  );
  logAudit({
    actorType: 'user',
    actorId: req.user.sub,
    action: 'security.question.set',
    entityType: 'user',
    entityId: req.user.sub,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  }).catch(console.error);
  return res.json({ message: 'Security question updated' });
});

router.post('/security-question/enable', requireUser, async (req, res) => {
  const { enabled } = req.body || {};
  const [[row]] = await pool.query(
    'SELECT security_question FROM users WHERE id = ?',
    [req.user.sub]
  );
  if (enabled && !row?.security_question) {
    return res.status(400).json({ error: 'Set a security question first' });
  }
  await pool.query('UPDATE users SET security_question_enabled = ? WHERE id = ?', [
    enabled ? 1 : 0,
    req.user.sub,
  ]);
  logAudit({
    actorType: 'user',
    actorId: req.user.sub,
    action: enabled ? 'security.question.enabled' : 'security.question.disabled',
    entityType: 'user',
    entityId: req.user.sub,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  }).catch(console.error);
  return res.json({ message: enabled ? 'Security question enabled' : 'Security question disabled' });
});

router.post('/security-question/verify', requireUser, async (req, res) => {
  const { answer } = req.body || {};
  if (!answer) return res.status(400).json({ error: 'Answer required' });
  const [[row]] = await pool.query(
    'SELECT security_answer_hash FROM users WHERE id = ?',
    [req.user.sub]
  );
  if (!row?.security_answer_hash) {
    return res.status(400).json({ error: 'Security question not set' });
  }
  const ok = await bcrypt.compare(normalizeAnswer(answer), row.security_answer_hash);
  if (!ok) return res.status(400).json({ error: 'Incorrect answer' });
  return res.json({ valid: true });
});

router.post('/totp/setup', requireUser, async (req, res) => {
  const [[user]] = await pool.query(
    'SELECT email, totp_enabled FROM users WHERE id = ?',
    [req.user.sub]
  );
  if (!user) return res.status(404).json({ error: 'User not found' });

  const secret = generateTotpSecret(user.email || 'user');
  const qrCode = await generateTotpQr(secret.otpauth_url);

  await pool.query(
    'UPDATE users SET totp_secret = ?, totp_enabled = 0 WHERE id = ?',
    [secret.base32, req.user.sub]
  );

  return res.json({
    secret: secret.base32,
    otpauthUrl: secret.otpauth_url,
    qrCode,
  });
});

router.post('/totp/enable', requireUser, async (req, res) => {
  const { token } = req.body || {};
  if (!token) return res.status(400).json({ error: 'TOTP code required' });

  const [[user]] = await pool.query(
    'SELECT totp_secret FROM users WHERE id = ?',
    [req.user.sub]
  );
  if (!user?.totp_secret) return res.status(400).json({ error: 'TOTP not set up' });

  const valid = verifyTotp({ token, secret: user.totp_secret });
  if (!valid) return res.status(400).json({ error: 'Invalid TOTP code' });

  const backupCodes = generateBackupCodes();
  const hashed = backupCodes.map((code) => hashBackupCode(code));
  await pool.query(
    'UPDATE users SET totp_enabled = 1, totp_backup_codes = ?, backup_codes_used = ? WHERE id = ?',
    [JSON.stringify(hashed), JSON.stringify([]), req.user.sub]
  );

  return res.json({ enabled: true, backupCodes });
});

router.post('/totp/disable', requireUser, async (req, res) => {
  const { token, backupCode } = req.body || {};
  const [[user]] = await pool.query(
    'SELECT totp_secret, totp_backup_codes, backup_codes_used FROM users WHERE id = ?',
    [req.user.sub]
  );
  if (!user) return res.status(404).json({ error: 'User not found' });

  let valid = false;
  if (token && user.totp_secret) {
    valid = verifyTotp({ token, secret: user.totp_secret });
  }
  if (!valid && backupCode) {
    const used = new Set(JSON.parse(user.backup_codes_used || '[]'));
    const codes = JSON.parse(user.totp_backup_codes || '[]');
    const hashed = hashBackupCode(backupCode);
    if (codes.includes(hashed) && !used.has(hashed)) {
      used.add(hashed);
      await pool.query('UPDATE users SET backup_codes_used = ? WHERE id = ?', [
        JSON.stringify([...used]),
        req.user.sub,
      ]);
      valid = true;
    }
  }
  if (!valid) return res.status(400).json({ error: 'Invalid TOTP or backup code' });

  await pool.query(
    'UPDATE users SET totp_enabled = 0, totp_secret = NULL, totp_backup_codes = NULL, backup_codes_used = NULL WHERE id = ?',
    [req.user.sub]
  );

  return res.json({ disabled: true });
});

export default router;
