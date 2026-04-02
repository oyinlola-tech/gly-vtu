import express from 'express';
import argon2 from 'argon2';
import crypto from 'crypto';
import { pool } from '../config/db.js';
import {
  signAccessToken,
  issueRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  setAccessCookie,
  clearAccessCookie,
} from '../utils/tokens.js';
import { createOtp, verifyOtp } from '../utils/otp.js';
import { sendOtpEmail, sendWelcomeEmail, sendSecurityEmail, sendLoginFailedEmail } from '../utils/email.js';
import { createVirtualAccountForCustomer, createCustomer } from '../utils/flutterwave.js';
import { sanitizeFlutterwaveAccount } from '../utils/sanitize.js';
import { logAudit } from '../utils/audit.js';
import { requireUser } from '../middleware/auth.js';
import { generateCsrfToken } from '../middleware/csrf.js';
import { otpLimiter } from '../middleware/rateLimiters.js';
import { enforceSecurityQuestion } from '../utils/securityQuestionGuard.js';
import { encryptCookieValue, decryptCookieValue } from '../utils/secureCookie.js';
import zxcvbn from 'zxcvbn';
import { checkFailedLoginAnomaly } from '../utils/anomalies.js';
import { logSecurityEvent } from '../utils/securityEvents.js';
import { verifyTotp, verifyBackupCode } from '../utils/totp.js';
import { 
  registrationSchema, 
  loginSchema,
  validateRequest 
} from '../middleware/requestValidation.js';
import { encryptPII, encryptJson, hashEmail, hashPhone, applyUserPII } from '../utils/encryption.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is required');
}
const USE_COOKIE_REFRESH = (process.env.COOKIE_REFRESH || 'true') === 'true';
const isProd = process.env.NODE_ENV === 'production';
const MIN_PASSWORD_LENGTH = 10;
const MIN_ZXCVBN_SCORE = 3;
const LOGIN_LOCK_MAX = Number(process.env.LOGIN_LOCK_MAX || 5);
const LOGIN_LOCK_MINUTES = Number(process.env.LOGIN_LOCK_MINUTES || 15);
const DEVICE_ID_COOKIE = 'device_id';

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

function setRefreshCookie(res, token, expiresAt) {
  if (!USE_COOKIE_REFRESH) return;
  const encrypted = encryptCookieValue(token);
  res.cookie('refresh_token', encrypted, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    expires: expiresAt,
    path: '/',
    domain: process.env.COOKIE_DOMAIN || undefined,
  });
}

function setCsrfCookie(res, token) {
  res.cookie('csrf_token', token, {
    httpOnly: false,
    sameSite: 'lax',
    secure: isProd,
    maxAge: 1000 * 60 * 60 * 6,
    path: '/',
    domain: process.env.COOKIE_DOMAIN || undefined,
  });
}

function issueCsrf(res) {
  const token = generateCsrfToken();
  setCsrfCookie(res, token);
  return token;
}

function logAsyncError(context, err) {
  logger.error(context, { error: logger.format(err) });
}

function isValidDeviceId(value) {
  return typeof value === 'string' && /^[a-f0-9-]{36}$/i.test(value);
}

function setDeviceIdCookie(res, deviceId) {
  res.cookie(DEVICE_ID_COOKIE, deviceId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    maxAge: 365 * 24 * 60 * 60 * 1000,
    path: '/',
    domain: process.env.COOKIE_DOMAIN || undefined,
  });
}

function requireCsrfForCookieRefresh(req) {
  const cookieToken = req.cookies?.refresh_token;
  if (!cookieToken) return true;
  const csrfCookie = req.cookies?.csrf_token;
  const csrfHeader = req.headers['x-csrf-token'];
  return Boolean(csrfCookie && csrfHeader && csrfCookie === csrfHeader);
}

router.post('/send-registration-otp', otpLimiter, async (req, res) => {
  /*
    #swagger.tags = ['Auth']
    #swagger.summary = 'Send OTP for registration'
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: { type: 'object', properties: { email: { type: 'string' } } }
    }
    #swagger.responses[200] = { description: 'OTP sent', schema: { $ref: '#/definitions/MessageResponse' } }
  */
  const { email } = req.body || {};
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email required' });
  }

  const emailHash = hashEmail(email);
  const [existing] = await pool.query('SELECT id FROM users WHERE email_hash = ?', [emailHash]);
  if (existing.length) {
    return res.status(409).json({ error: 'User already exists' });
  }

  const otp = createOtp();
  await pool.query(
    'INSERT INTO email_otps (id, email_hash, otp_hash, expires_at) VALUES (UUID(), ?, ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE)) ON DUPLICATE KEY UPDATE otp_hash = VALUES(otp_hash), expires_at = VALUES(expires_at)',
    [emailHash, otp.hash]
  );

  sendOtpEmail({
    to: email,
    subject: 'Verify your email for GLY-VTU registration',
    otp: otp.plain,
  }).catch((err) => logger.error('Send registration OTP email failed', { error: logger.format(err) }));

  return res.json({ message: 'OTP sent' });
});

router.post('/verify-registration-otp', otpLimiter, async (req, res) => {
  /*
    #swagger.tags = ['Auth']
    #swagger.summary = 'Verify OTP for registration'
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: { type: 'object', properties: { email: { type: 'string' }, otp: { type: 'string' } } }
    }
    #swagger.responses[200] = { description: 'OTP verified', schema: { $ref: '#/definitions/MessageResponse' } }
  */
  const { email, otp } = req.body || {};
  if (!email || !otp) {
    return res.status(400).json({ error: 'Email and OTP required' });
  }

  const emailHash = hashEmail(email);
  const verified = await verifyOtp(emailHash, otp);
  if (!verified) {
    return res.status(401).json({ error: 'Invalid or expired OTP' });
  }

  return res.json({ message: 'OTP verified' });
});

router.post('/register', validateRequest(registrationSchema), async (req, res) => {
  /*
    #swagger.tags = ['Auth']
    #swagger.summary = 'Register a new user'
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: { $ref: '#/definitions/AuthRegisterRequest' }
    }
    #swagger.responses[201] = { description: 'Created', schema: { $ref: '#/definitions/MessageResponse' } }
    #swagger.responses[400] = { description: 'Validation error', schema: { $ref: '#/definitions/ErrorResponse' } }
    #swagger.responses[409] = { description: 'User exists', schema: { $ref: '#/definitions/ErrorResponse' } }
  */
  // Use validated request data instead of raw body
  const { fullName, email, phone, password, dateOfBirth, agreedToTerms } = req.validated || req.body || {};
  
  // Verify agreement to terms (already validated but double-check)
  if (!agreedToTerms) {
    return res.status(400).json({ error: 'You must agree to the terms and conditions' });
  }

  const passwordError = validatePasswordStrength(password);
  if (passwordError) {
    return res.status(400).json({ error: passwordError });
  }

  const emailHash = hashEmail(email);
  const phoneHash = phone ? hashPhone(phone) : null;
  const [existing] = phoneHash
    ? await pool.query('SELECT id FROM users WHERE email_hash = ? OR phone_hash = ?', [
        emailHash,
        phoneHash,
      ])
    : await pool.query('SELECT id FROM users WHERE email_hash = ?', [emailHash]);
  if (existing.length) {
    return res.status(409).json({ error: 'User already exists' });
  }

  const passwordHash = await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 2 ** 16, // 64 MB
    timeCost: 3,
    parallelism: 1,
  });
  const userId = crypto.randomUUID();
  
  try {
    // Encrypt PII before storing
    const encryptedEmail = encryptPII(email, userId);
    const encryptedPhone = phone ? encryptPII(phone, userId) : null;
    const encryptedFullName = encryptPII(fullName, userId);
    const encryptedKyc = encryptJson({}, userId);
    
    await pool.query(
      `INSERT INTO users
       (id, full_name, email, phone, password_hash, password_updated_at, kyc_level, kyc_status, kyc_payload, date_of_birth,
        full_name_encrypted, email_encrypted, phone_encrypted, email_hash, phone_hash, kyc_payload_encrypted)
       VALUES (?, ?, ?, ?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        null,
        null,
        null,
        passwordHash,
        1,
        'pending',
        JSON.stringify({}),
        dateOfBirth,
        encryptedFullName,
        encryptedEmail,
        encryptedPhone,
        emailHash,
        phoneHash,
        encryptedKyc,
      ]
    );
    await pool.query('INSERT INTO wallets (id, user_id, balance, currency) VALUES (UUID(), ?, 0, ?)', [
      userId,
      'NGN',
    ]);

    let flutterwaveCustomerId = null;
    try {
      const customer = await createCustomer({
        name: fullName,
        email,
        phone: phone || undefined,
      });
      const customerData = customer?.data || {};
      flutterwaveCustomerId =
        customerData.id || customerData.customer_id || customerData.customerId || null;
      if (flutterwaveCustomerId) {
        await pool.query('UPDATE users SET kyc_payload = ?, kyc_payload_encrypted = ? WHERE id = ?', [
          JSON.stringify({ flutterwave_customer_id: flutterwaveCustomerId }),
          encryptJson({ flutterwave_customer_id: flutterwaveCustomerId }, userId),
          userId,
        ]);
      }
    } catch (err) {
      // Customer creation can be retried later
      logger.warn('Flutterwave customer creation failed', { error: logger.format(err) });
    }

    const accountReference = `GLY-${userId}`;
    try {
      const reserved = await createVirtualAccountForCustomer({
        email,
        tx_ref: accountReference,
        firstName: fullName?.split(' ')[0] || fullName,
        lastName: fullName?.split(' ').slice(1).join(' ') || fullName,
        customerId: flutterwaveCustomerId || undefined,
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
          account.account_name || fullName,
          account.account_number || '',
          account.bank_name || '',
          account.bank_code || null,
          account.status || 'ACTIVE',
          JSON.stringify(sanitizeFlutterwaveAccount(account)),
        ]
      );

      sendWelcomeEmail({
        to: email,
        name: fullName,
        accountNumber: account.account_number,
        bankName: account.bank_name,
      }).catch((err) => logAsyncError('Send welcome email failed', err));
    } catch (err) {
      logger.warn('Virtual account creation failed', { error: logger.format(err) });
      sendWelcomeEmail({ to: email, name: fullName }).catch((err) =>
        logAsyncError('Send welcome email failed', err)
      );
    }
    logAudit({
      actorType: 'user',
      actorId: userId,
      action: 'user.register',
      entityType: 'user',
      entityId: userId,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    }).catch((err) => logAsyncError('Audit log failed (user.register)', err));
    return res.status(201).json({ message: 'Registered successfully' });
  } catch {
    await pool.query('DELETE FROM wallets WHERE user_id = ?', [userId]);
    await pool.query('DELETE FROM users WHERE id = ?', [userId]);
    return res.status(500).json({ error: 'Account creation failed' });
  }
});

router.post('/login', otpLimiter, validateRequest(loginSchema), async (req, res) => {
  /*
    #swagger.tags = ['Auth']
    #swagger.summary = 'Login and obtain tokens'
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: { $ref: '#/definitions/AuthLoginRequest' }
    }
    #swagger.responses[200] = { description: 'Logged in', schema: { $ref: '#/definitions/AuthLoginResponse' } }
    #swagger.responses[401] = { description: 'Invalid credentials', schema: { $ref: '#/definitions/ErrorResponse' } }
  */
  // Use validated request data
  const { email, password, deviceId: bodyDeviceId } = req.validated || req.body || {};
  const deviceId = bodyDeviceId || req.cookies?.[DEVICE_ID_COOKIE] || null;

  const [rows] = await pool.query('SELECT * FROM users WHERE email_hash = ? LIMIT 1', [
    hashEmail(email),
  ]);
  if (!rows.length) return res.status(401).json({ error: 'Invalid credentials' });

  const user = applyUserPII(rows[0]);
  if (user.login_locked_until && new Date(user.login_locked_until) > new Date()) {
    return res.status(403).json({ error: 'Account temporarily locked. Try later.' });
  }
  if (user.login_locked_until && new Date(user.login_locked_until) <= new Date()) {
    await pool.query(
      'UPDATE users SET login_failed_attempts = 0, login_locked_until = NULL WHERE id = ?',
      [user.id]
    );
    user.login_failed_attempts = 0;
    user.login_locked_until = null;
  }
  const ok = await argon2.verify(user.password_hash, password);
  if (!ok) {
    const nextAttempts = Number(user.login_failed_attempts || 0) + 1;
    const lockedUntil =
      nextAttempts >= LOGIN_LOCK_MAX
        ? new Date(Date.now() + LOGIN_LOCK_MINUTES * 60 * 1000)
        : null;
    await pool.query(
      'UPDATE users SET login_failed_attempts = ?, login_locked_until = ?, last_login_failed_at = NOW() WHERE id = ?',
      [nextAttempts, lockedUntil, user.id]
    );
    checkFailedLoginAnomaly({
      actorId: user.id,
      actorType: 'user',
      attempts: nextAttempts,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    if (lockedUntil) {
      logSecurityEvent({
        type: 'account.locked.failed_login',
        severity: 'high',
        actorType: 'user',
        actorId: user.id,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        metadata: { lockedUntil },
      }).catch(() => null);
      return res.status(403).json({ error: 'Account locked due to failed attempts. Try later.' });
    }
    sendLoginFailedEmail({
      to: user.email || email,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    }).catch((err) => logAsyncError('Login failed email send error', err));
    logAudit({
      actorType: 'user',
      actorId: user.id,
      action: 'login.failed',
      entityType: 'user',
      entityId: user.id,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    }).catch((err) => logAsyncError('Audit log failed (login.failed)', err));
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  await pool.query(
    'UPDATE users SET login_failed_attempts = 0, login_locked_until = NULL, last_login_failed_at = NULL, last_login_at = NOW(), last_login_ip = ? WHERE id = ?',
    [req.ip, user.id]
  );

  const [devices] = await pool.query(
    'SELECT id FROM user_devices WHERE user_id = ? AND device_id = ? LIMIT 1',
    [user.id, deviceId || '']
  );
  if (!devices.length) {
    try {
      const { code } = await createOtp({
        userId: user.id,
        email: user.email || email,
        purpose: 'device_login',
      });
      await sendOtpEmail({ to: user.email || email, code, purpose: 'device_login' });
      logAudit({
        actorType: 'user',
        actorId: user.id,
        action: 'otp.device_login.requested',
        entityType: 'user',
        entityId: user.id,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      }).catch((err) => logAsyncError('Audit log failed (otp.device_login.requested)', err));
      return res.json({ otpRequired: true, message: 'OTP sent to email' });
    } catch (err) {
      if (err.code === 'OTP_COOLDOWN' || err.code === 'OTP_LIMIT') {
        return res.status(429).json({ error: 'Too many OTP requests. Try later.' });
      }
      throw err;
    }
  }

  await pool.query(
    'UPDATE user_devices SET last_seen = NOW(), ip_address = ?, user_agent = ? WHERE user_id = ? AND device_id = ?',
    [req.ip, req.headers['user-agent'] || null, user.id, deviceId]
  );

  if (user.totp_enabled) {
    const totpToken = req.body?.totp || null;
    const backupCode = req.body?.backupCode || null;
    if (!totpToken && !backupCode) {
      return res.json({ totpRequired: true });
    }
    let totpValid = false;
    if (totpToken && user.totp_secret) {
      totpValid = verifyTotp({ token: totpToken, secret: user.totp_secret });
    }
    if (!totpValid && backupCode) {
      const used = new Set(JSON.parse(user.backup_codes_used || '[]'));
      const codes = JSON.parse(user.totp_backup_codes || '[]');
      const matched = await verifyBackupCode(backupCode, codes);
      if (matched && !used.has(matched)) {
        used.add(matched);
        await pool.query('UPDATE users SET backup_codes_used = ? WHERE id = ?', [
          JSON.stringify([...used]),
          user.id,
        ]);
        totpValid = true;
      }
    }
    if (!totpValid) {
      return res.status(401).json({ error: 'Invalid TOTP code' });
    }
  }

  const accessToken = signAccessToken({ type: 'user', sub: user.id }, JWT_SECRET);
  setAccessCookie(res, accessToken, 'user');
  const refresh = await issueRefreshToken({
    userId: user.id,
    deviceId: deviceId || null,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'] || null,
  });
  setRefreshCookie(res, refresh.raw, refresh.expiresAt);
  const csrfToken = issueCsrf(res);

  return res.json({
    csrfToken,
    user: { id: user.id, fullName: user.full_name, email: user.email, phone: user.phone },
  });
});

router.post('/verify-device', otpLimiter, async (req, res) => {
  /*
    #swagger.tags = ['Auth']
    #swagger.summary = 'Verify new device with OTP'
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: { $ref: '#/definitions/VerifyDeviceRequest' }
    }
    #swagger.responses[200] = { description: 'Device verified', schema: { $ref: '#/definitions/AuthLoginResponse' } }
    #swagger.responses[400] = { description: 'Invalid OTP or payload', schema: { $ref: '#/definitions/ErrorResponse' } }
  */
  const { email, code, deviceId: bodyDeviceId, label, securityAnswer } = req.body || {};
  const deviceId = bodyDeviceId || req.cookies?.[DEVICE_ID_COOKIE] || null;
  if (!email || !deviceId) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  if (!code && !securityAnswer) {
    return res.status(400).json({ error: 'OTP code or security answer required' });
  }

  let user = null;
  if (code) {
    const otp = await verifyOtp({ email, purpose: 'device_login', code });
    if (!otp) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }
    const [rows] = await pool.query(
      `SELECT id, full_name, email, phone, full_name_encrypted, email_encrypted, phone_encrypted,
              totp_enabled, totp_secret, totp_backup_codes, backup_codes_used
       FROM users WHERE id = ?`,
      [otp.user_id]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    user = applyUserPII(rows[0]);
  } else {
    const [rows] = await pool.query(
      `SELECT id, full_name, email, phone, full_name_encrypted, email_encrypted, phone_encrypted,
              totp_enabled, totp_secret, totp_backup_codes, backup_codes_used
       FROM users WHERE email_hash = ? LIMIT 1`,
      [hashEmail(email)]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    const enforcement = await enforceSecurityQuestion({
      userId: rows[0].id,
      answer: securityAnswer,
      flow: 'device_verify',
    });
    if (!enforcement.ok) {
      return res.status(enforcement.status).json({ error: enforcement.message });
    }
    user = applyUserPII(rows[0]);
  }

  if (user?.totp_enabled) {
    const totpToken = req.body?.totp || null;
    const backupCode = req.body?.backupCode || null;
    if (!totpToken && !backupCode) {
      return res.json({ totpRequired: true });
    }
    let totpValid = false;
    if (totpToken && user.totp_secret) {
      totpValid = verifyTotp({ token: totpToken, secret: user.totp_secret });
    }
    if (!totpValid && backupCode) {
      const used = new Set(JSON.parse(user.backup_codes_used || '[]'));
      const codes = JSON.parse(user.totp_backup_codes || '[]');
      const matched = await verifyBackupCode(backupCode, codes);
      if (matched && !used.has(matched)) {
        used.add(matched);
        await pool.query('UPDATE users SET backup_codes_used = ? WHERE id = ?', [
          JSON.stringify([...used]),
          user.id,
        ]);
        totpValid = true;
      }
    }
    if (!totpValid) {
      return res.status(401).json({ error: 'Invalid TOTP code' });
    }
  }

  await pool.query(
    `INSERT INTO user_devices (id, user_id, device_id, label, ip_address, user_agent)
     VALUES (UUID(), ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE last_seen = NOW(), ip_address = VALUES(ip_address), user_agent = VALUES(user_agent)`,
    [user.id, deviceId, label || null, req.ip, req.headers['user-agent'] || null]
  );
  await pool.query('UPDATE users SET last_login_at = NOW(), last_login_ip = ? WHERE id = ?', [
    req.ip,
    user.id,
  ]);

  const accessToken = signAccessToken({ type: 'user', sub: user.id }, JWT_SECRET);
  setAccessCookie(res, accessToken, 'user');
  const refresh = await issueRefreshToken({
    userId: user.id,
    deviceId: deviceId || null,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'] || null,
  });
  setRefreshCookie(res, refresh.raw, refresh.expiresAt);
  const csrfToken = issueCsrf(res);

  sendSecurityEmail({
    to: user.email || email,
    title: 'New Device Verified',
    message: `A new device was verified for your account. If this wasn't you, reset your password immediately.`,
  }).catch((err) => logAsyncError('Security email send error (device verified)', err));

  logAudit({
    actorType: 'user',
    actorId: user.id,
    action: 'device.verified',
    entityType: 'device',
    entityId: deviceId,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  }).catch((err) => logAsyncError('Audit log failed (device.verified)', err));

  return res.json({
    csrfToken,
    user,
  });
});

router.post('/forgot-password', otpLimiter, async (req, res) => {
  /*
    #swagger.tags = ['Auth']
    #swagger.summary = 'Request password reset OTP'
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: { $ref: '#/definitions/ForgotPasswordRequest' }
    }
    #swagger.responses[200] = { description: 'OTP dispatched', schema: { $ref: '#/definitions/MessageResponse' } }
  */
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: 'Email required' });
  const [rows] = await pool.query('SELECT id FROM users WHERE email_hash = ? LIMIT 1', [
    hashEmail(email),
  ]);
  if (!rows.length) return res.json({ message: 'OTP sent if account exists' });

  try {
    const { code } = await createOtp({
      userId: rows[0].id,
      email,
      purpose: 'password_reset',
    });
    await sendOtpEmail({ to: email, code, purpose: 'password_reset' });
    logAudit({
      actorType: 'user',
      actorId: rows[0].id,
      action: 'otp.password_reset.requested',
      entityType: 'user',
      entityId: rows[0].id,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    }).catch((err) => logAsyncError('Audit log failed (otp.password_reset.requested)', err));
  } catch (err) {
    if (err.code === 'OTP_COOLDOWN' || err.code === 'OTP_LIMIT') {
      return res.status(429).json({ error: 'Too many OTP requests. Try later.' });
    }
    throw err;
  }
  return res.json({ message: 'OTP sent if account exists' });
});

router.post('/reset-password', async (req, res) => {
  /*
    #swagger.tags = ['Auth']
    #swagger.summary = 'Reset password using OTP'
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: { $ref: '#/definitions/ResetPasswordRequest' }
    }
    #swagger.responses[200] = { description: 'Password reset', schema: { $ref: '#/definitions/MessageResponse' } }
    #swagger.responses[400] = { description: 'Invalid OTP or payload', schema: { $ref: '#/definitions/ErrorResponse' } }
  */
  const { email, code, newPassword } = req.body || {};
  if (!email || !code || !newPassword) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  const passwordError = validatePasswordStrength(newPassword);
  if (passwordError) {
    return res.status(400).json({ error: passwordError });
  }
  const otp = await verifyOtp({ email, purpose: 'password_reset', code });
  if (!otp) return res.status(400).json({ error: 'Invalid or expired OTP' });
  const passwordHash = await argon2.hash(newPassword, {
    type: argon2.argon2id,
    memoryCost: 2 ** 16,
    timeCost: 3,
    parallelism: 1,
  });
  await pool.query('UPDATE users SET password_hash = ?, password_updated_at = NOW() WHERE id = ?', [
    passwordHash,
    otp.user_id,
  ]);
  sendSecurityEmail({
    to: email,
    title: 'Password Updated',
    message: 'Your GLY VTU password was changed successfully.',
  }).catch((err) => logAsyncError('Security email send error (password reset)', err));
  logAudit({
    actorType: 'user',
    actorId: otp.user_id,
    action: 'user.password_reset',
    entityType: 'user',
    entityId: otp.user_id,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  }).catch((err) => logAsyncError('Audit log failed (user.password_reset)', err));
  return res.json({ message: 'Password reset successful' });
});

router.post('/refresh', async (req, res) => {
  /*
    #swagger.tags = ['Auth']
    #swagger.summary = 'Refresh access token'
    #swagger.parameters['body'] = {
      in: 'body',
      schema: { $ref: '#/definitions/RefreshRequest' }
    }
    #swagger.responses[200] = { description: 'Tokens refreshed', schema: { $ref: '#/definitions/AuthTokensResponse' } }
    #swagger.responses[401] = { description: 'Invalid token', schema: { $ref: '#/definitions/ErrorResponse' } }
  */
  const cookieToken = req.cookies?.refresh_token;
  if (!requireCsrfForCookieRefresh(req)) {
    return res.status(403).json({ error: 'CSRF validation failed' });
  }
  const deviceId = req.body?.deviceId || req.cookies?.[DEVICE_ID_COOKIE] || null;
  if (cookieToken && !deviceId) {
    return res.status(400).json({ error: 'Device ID required' });
  }
  const incoming = cookieToken ? decryptCookieValue(cookieToken) : req.body?.refreshToken;
  if (!incoming) return res.status(400).json({ error: 'Refresh token required' });

  const [tokenRow] = await pool.query(
    'SELECT user_id, refresh_family_id, device_id, ip_address, user_agent FROM refresh_tokens WHERE token_hash = SHA2(?, 256) LIMIT 1',
    [incoming]
  );
  if (!tokenRow.length) return res.status(401).json({ error: 'Invalid token' });
  if (tokenRow[0].device_id && !deviceId) {
    await pool.query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE refresh_family_id = ?', [
      tokenRow[0].refresh_family_id,
    ]);
    return res.status(401).json({ error: 'Invalid token' });
  }
  if (deviceId && tokenRow[0].device_id && tokenRow[0].device_id !== deviceId) {
    await pool.query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE refresh_family_id = ?', [
      tokenRow[0].refresh_family_id,
    ]);
    return res.status(401).json({ error: 'Invalid token' });
  }
  const currentIp = req.ip;
  const currentUa = req.headers['user-agent'] || '';
  if (
    (tokenRow[0].ip_address && tokenRow[0].ip_address !== currentIp) ||
    (tokenRow[0].user_agent && tokenRow[0].user_agent !== currentUa)
  ) {
    await pool.query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE refresh_family_id = ?', [
      tokenRow[0].refresh_family_id,
    ]);
    return res.status(401).json({ error: 'Invalid token' });
  }

  const rotated = await rotateRefreshToken(incoming, { userId: tokenRow[0].user_id });
  if (!rotated) {
    await pool.query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = ?', [
      tokenRow[0].user_id,
    ]);
    return res.status(401).json({ error: 'Expired token' });
  }

  const accessToken = signAccessToken({ type: 'user', sub: tokenRow[0].user_id }, JWT_SECRET);
  setAccessCookie(res, accessToken, 'user');
  setRefreshCookie(res, rotated.raw, rotated.expiresAt);
  const csrfToken = issueCsrf(res);

  return res.json({
    csrfToken,
  });
});

router.post('/logout', async (req, res) => {
  /*
    #swagger.tags = ['Auth']
    #swagger.summary = 'Logout and revoke refresh token'
    #swagger.parameters['body'] = {
      in: 'body',
      schema: { $ref: '#/definitions/RefreshRequest' }
    }
    #swagger.responses[200] = { description: 'Logged out', schema: { $ref: '#/definitions/MessageResponse' } }
  */
  const cookieToken = req.cookies?.refresh_token;
  const incoming = cookieToken ? decryptCookieValue(cookieToken) : req.body?.refreshToken;
  if (incoming) await revokeRefreshToken(incoming);
  res.clearCookie('refresh_token');
  res.clearCookie('csrf_token');
  clearAccessCookie(res, 'user');
  return res.json({ message: 'Logged out' });
});

router.post('/logout-all', requireUser, async (req, res) => {
  /*
    #swagger.tags = ['Auth']
    #swagger.summary = 'Logout from all devices - revoke all sessions'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.parameters['body'] = {
      in: 'body',
      required: false,
      schema: { type: 'object', properties: { confirmPassword: { type: 'string' } } }
    }
    #swagger.responses[200] = { description: 'All sessions revoked', schema: { $ref: '#/definitions/MessageResponse' } }
    #swagger.responses[401] = { description: 'Invalid password', schema: { $ref: '#/definitions/ErrorResponse' } }
  */
  // SECURITY: Require password confirmation for logout-all (prevents attacker from logging out victim)
  const { confirmPassword } = req.body || {};
  if (!confirmPassword) {
    return res.status(400).json({ error: 'Password confirmation required' });
  }

  // Get current user password hash
  const [[userRow]] = await pool.query(
    'SELECT password_hash FROM users WHERE id = ? LIMIT 1',
    [req.user.sub]
  );
  if (!userRow) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Verify password
  const passwordValid = await argon2.verify(userRow.password_hash, confirmPassword);
  if (!passwordValid) {
    logSecurityEvent({
      type: 'logout_all.failed',
      severity: 'medium',
      actorType: 'user',
      actorId: req.user.sub,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: { reason: 'invalid_password' }
    }).catch(() => null);
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Revoke all refresh tokens for this user
  const [[result]] = await pool.query(
    'UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = ? AND revoked_at IS NULL',
    [req.user.sub]
  );
  const sessionsRevoked = result?.affectedRows || 0;

  // Log security event
  logSecurityEvent({
    type: 'logout_all.success',
    severity: 'medium',
    actorType: 'user',
    actorId: req.user.sub,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    metadata: { sessions_revoked: sessionsRevoked }
  }).catch(() => null);

  // Log audit event
  logAudit({
    actorType: 'user',
    actorId: req.user.sub,
    action: 'logout_all',
    entityType: 'user',
    entityId: req.user.sub,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    metadata: { sessions_revoked: sessionsRevoked }
  }).catch(() => null);

  // Clear cookies
  res.clearCookie('refresh_token');
  res.clearCookie('csrf_token');
  clearAccessCookie(res, 'user');

  return res.json({
    message: 'Logged out from all devices',
    sessionsRevoked
  });
});

router.get('/device-id', (req, res) => {
  const existing = req.cookies?.[DEVICE_ID_COOKIE];
  const deviceId = isValidDeviceId(existing) ? existing : crypto.randomUUID();
  setDeviceIdCookie(res, deviceId);
  return res.json({ deviceId });
});

router.get('/csrf', (req, res) => {
  /*
    #swagger.tags = ['Auth']
    #swagger.summary = 'Get CSRF token'
    #swagger.responses[200] = {
      description: 'CSRF token',
      schema: { type: 'object', properties: { csrfToken: { type: 'string' } } }
    }
  */
  const token = issueCsrf(res);
  return res.json({ csrfToken: token });
});

router.post('/security-question', async (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.json({ enabled: false, question: null });
  const [rows] = await pool.query(
    'SELECT security_question, security_question_enabled FROM users WHERE email_hash = ? LIMIT 1',
    [hashEmail(email)]
  );
  if (!rows.length || !rows[0].security_question_enabled) {
    return res.json({ enabled: false, question: null });
  }
  return res.json({ enabled: true, question: rows[0].security_question });
});

router.get('/me', requireUser, async (req, res) => {
  /*
    #swagger.tags = ['Auth']
    #swagger.summary = 'Get current user'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.responses[200] = { description: 'User', schema: { $ref: '#/definitions/UserProfile' } }
    #swagger.responses[404] = { description: 'Not found', schema: { $ref: '#/definitions/ErrorResponse' } }
  */
  const [rows] = await pool.query(
    `SELECT id, full_name, email, phone, full_name_encrypted, email_encrypted, phone_encrypted,
            kyc_level, kyc_status
     FROM users WHERE id = ?`,
    [req.user.sub]
  );
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  return res.json(applyUserPII(rows[0]));
});

export default router;
