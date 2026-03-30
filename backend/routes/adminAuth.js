import express from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../config/db.js';
import {
  signAccessToken,
  issueRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  setAccessCookie,
  clearAccessCookie,
} from '../utils/tokens.js';
import { requireAdmin } from '../middleware/adminAuth.js';
import { logAudit } from '../utils/audit.js';
import { createOtp, verifyOtp } from '../utils/otp.js';
import { sendOtpEmail, sendSecurityEmail } from '../utils/email.js';
import { generateCsrfToken } from '../middleware/csrf.js';
import { otpLimiter } from '../middleware/rateLimiters.js';
import { encryptCookieValue, decryptCookieValue } from '../utils/secureCookie.js';
import zxcvbn from 'zxcvbn';
import { checkFailedLoginAnomaly } from '../utils/anomalies.js';
import { logSecurityEvent } from '../utils/securityEvents.js';
import {
  generateTotpSecret,
  generateTotpQr,
  verifyTotp,
  generateBackupCodes,
  hashBackupCode,
} from '../utils/totp.js';

const router = express.Router();

const JWT_ADMIN_SECRET = process.env.JWT_ADMIN_SECRET || process.env.JWT_SECRET || 'dev_secret_change_me';
const USE_COOKIE_REFRESH = (process.env.COOKIE_REFRESH || 'true') === 'true';
const isProd = process.env.NODE_ENV === 'production';
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

function parseJson(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function setRefreshCookie(res, token, expiresAt) {
  if (!USE_COOKIE_REFRESH) return;
  const encrypted = encryptCookieValue(token);
  res.cookie('admin_refresh_token', encrypted, {
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
    httpOnly: true,
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

function requireCsrfForCookieRefresh(req) {
  const cookieToken = req.cookies?.admin_refresh_token;
  if (!cookieToken) return true;
  const csrfCookie = req.cookies?.csrf_token;
  const csrfHeader = req.headers['x-csrf-token'];
  return Boolean(csrfCookie && csrfHeader && csrfCookie === csrfHeader);
}

router.post('/login', otpLimiter, async (req, res) => {
  /*
    #swagger.tags = ['Admin Auth']
    #swagger.summary = 'Admin login'
    #swagger.parameters['body'] = { in: 'body', required: true, schema: { $ref: '#/definitions/AuthLoginRequest' } }
    #swagger.responses[200] = { description: 'Logged in', schema: { $ref: '#/definitions/AdminLoginResponse' } }
    #swagger.responses[401] = { description: 'Invalid credentials', schema: { $ref: '#/definitions/ErrorResponse' } }
  */
  const { email, password, deviceId } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Missing credentials' });

  const [rows] = await pool.query('SELECT * FROM admin_users WHERE email = ? LIMIT 1', [email]);
  if (!rows.length) return res.status(401).json({ error: 'Invalid credentials' });

  const admin = rows[0];
  const ok = await bcrypt.compare(password, admin.password_hash);
  if (!ok) {
    checkFailedLoginAnomaly({
      actorId: admin.id,
      actorType: 'admin',
      attempts: 1,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    logSecurityEvent({
      type: 'admin.login.failed',
      severity: 'medium',
      actorType: 'admin',
      actorId: admin.id,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    }).catch(() => null);
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // TOTP is now mandatory for all admin accounts
  if (!admin.totp_secret || !admin.totp_enabled) {
    logSecurityEvent({
      type: 'admin.login.totp_not_configured',
      severity: 'high',
      actorType: 'admin',
      actorId: admin.id,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: { message: 'Admin account missing TOTP configuration' },
    }).catch(() => null);
    return res.status(403).json({ 
      error: 'Two-Factor Authentication (TOTP) is required for admin accounts. Please contact support to enable TOTP.' 
    });
  }

  const totpToken = req.body?.totp || null;
  const backupCode = req.body?.backupCode || null;
  if (!totpToken && !backupCode) {
    return res.json({ totpRequired: true });
  }

  let totpValid = false;
  if (totpToken) {
    totpValid = verifyTotp({ token: totpToken, secret: admin.totp_secret });
  }

  if (!totpValid && backupCode) {
    const backupCodes = parseJson(admin.totp_backup_codes, []);
    const usedCodes = new Set(parseJson(admin.backup_codes_used, []));
    const hashed = hashBackupCode(backupCode);
    if (backupCodes.includes(hashed) && !usedCodes.has(hashed)) {
      usedCodes.add(hashed);
      await pool.query('UPDATE admin_users SET backup_codes_used = ? WHERE id = ?', [
        JSON.stringify([...usedCodes]),
        admin.id,
      ]);
      totpValid = true;
    }
  }

  if (!totpValid) {
    logSecurityEvent({
      type: 'admin.login.totp_failed',
      severity: 'medium',
      actorType: 'admin',
      actorId: admin.id,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    }).catch(() => null);
    return res.status(401).json({ error: 'Invalid TOTP code' });
  }

  const accessToken = signAccessToken({ type: 'admin', sub: admin.id }, JWT_ADMIN_SECRET);
  setAccessCookie(res, accessToken, 'admin');
  const refresh = await issueRefreshToken({
    adminId: admin.id,
    deviceId: deviceId || null,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'] || null,
  });
  setRefreshCookie(res, refresh.raw, refresh.expiresAt);
  const csrfToken = issueCsrf(res);
  logAudit({
    actorType: 'admin',
    actorId: admin.id,
    action: 'admin.login',
    entityType: 'admin',
    entityId: admin.id,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  }).catch(console.error);

  return res.json({
    csrfToken,
    admin: { id: admin.id, name: admin.name, email: admin.email, role: admin.role },
  });
});

router.post('/totp/setup', requireAdmin, async (req, res) => {
  const [[admin]] = await pool.query(
    'SELECT id, email, name FROM admin_users WHERE id = ? LIMIT 1',
    [req.admin.sub]
  );
  if (!admin) return res.status(404).json({ error: 'Admin not found' });

  const secret = generateTotpSecret(admin.email || admin.name || 'admin');
  const qrCode = await generateTotpQr(secret.otpauth_url);

  await pool.query(
    'UPDATE admin_users SET totp_secret = ?, totp_enabled = 0 WHERE id = ?',
    [secret.base32, admin.id]
  );

  return res.json({
    secret: secret.base32,
    otpauthUrl: secret.otpauth_url,
    qrCode,
  });
});

router.post('/totp/enable', requireAdmin, async (req, res) => {
  const { token } = req.body || {};
  if (!token) return res.status(400).json({ error: 'TOTP code required' });
  const [[admin]] = await pool.query(
    'SELECT id, totp_secret FROM admin_users WHERE id = ? LIMIT 1',
    [req.admin.sub]
  );
  if (!admin?.totp_secret) return res.status(400).json({ error: 'TOTP not set up' });

  const valid = verifyTotp({ token, secret: admin.totp_secret });
  if (!valid) return res.status(400).json({ error: 'Invalid TOTP code' });

  const backupCodes = generateBackupCodes();
  const hashed = backupCodes.map((code) => hashBackupCode(code));
  await pool.query(
    'UPDATE admin_users SET totp_enabled = 1, totp_backup_codes = ?, backup_codes_used = ? WHERE id = ?',
    [JSON.stringify(hashed), JSON.stringify([]), admin.id]
  );

  return res.json({ enabled: true, backupCodes });
});

router.post('/totp/disable', requireAdmin, async (req, res) => {
  const { token, backupCode } = req.body || {};
  const [[admin]] = await pool.query(
    'SELECT id, totp_secret, totp_backup_codes, backup_codes_used FROM admin_users WHERE id = ? LIMIT 1',
    [req.admin.sub]
  );
  if (!admin) return res.status(404).json({ error: 'Admin not found' });

  let valid = false;
  if (token && admin.totp_secret) {
    valid = verifyTotp({ token, secret: admin.totp_secret });
  }
  if (!valid && backupCode) {
    const backupCodes = parseJson(admin.totp_backup_codes, []);
    const usedCodes = new Set(parseJson(admin.backup_codes_used, []));
    const hashed = hashBackupCode(backupCode);
    if (backupCodes.includes(hashed) && !usedCodes.has(hashed)) {
      usedCodes.add(hashed);
      await pool.query('UPDATE admin_users SET backup_codes_used = ? WHERE id = ?', [
        JSON.stringify([...usedCodes]),
        admin.id,
      ]);
      valid = true;
    }
  }
  if (!valid) return res.status(400).json({ error: 'Invalid TOTP or backup code' });

  await pool.query(
    'UPDATE admin_users SET totp_enabled = 0, totp_secret = NULL, totp_backup_codes = NULL, backup_codes_used = NULL WHERE id = ?',
    [admin.id]
  );

  return res.json({ disabled: true });
});

router.post('/refresh', async (req, res) => {
  /*
    #swagger.tags = ['Admin Auth']
    #swagger.summary = 'Refresh admin access token'
    #swagger.parameters['body'] = { in: 'body', schema: { $ref: '#/definitions/RefreshRequest' } }
    #swagger.responses[200] = { description: 'Tokens refreshed', schema: { $ref: '#/definitions/AuthTokensResponse' } }
  */
  const cookieToken = req.cookies?.admin_refresh_token;
  if (!requireCsrfForCookieRefresh(req)) {
    return res.status(403).json({ error: 'CSRF validation failed' });
  }
  const deviceId = req.body?.deviceId || null;
  const incoming = cookieToken ? decryptCookieValue(cookieToken) : req.body?.refreshToken;
  if (!incoming) return res.status(400).json({ error: 'Refresh token required' });

  const [tokenRow] = await pool.query(
    'SELECT admin_id, refresh_family_id, device_id, ip_address, user_agent FROM refresh_tokens WHERE token_hash = SHA2(?, 256) LIMIT 1',
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

  const rotated = await rotateRefreshToken(incoming, { adminId: tokenRow[0].admin_id });
  if (!rotated) {
    await pool.query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE admin_id = ?', [
      tokenRow[0].admin_id,
    ]);
    return res.status(401).json({ error: 'Expired token' });
  }

  const accessToken = signAccessToken({ type: 'admin', sub: tokenRow[0].admin_id }, JWT_ADMIN_SECRET);
  setAccessCookie(res, accessToken, 'admin');
  setRefreshCookie(res, rotated.raw, rotated.expiresAt);
  const csrfToken = issueCsrf(res);

  return res.json({
    csrfToken,
  });
});

router.post('/logout', requireAdmin, async (req, res) => {
  /*
    #swagger.tags = ['Admin Auth']
    #swagger.summary = 'Admin logout'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.parameters['body'] = { in: 'body', schema: { $ref: '#/definitions/RefreshRequest' } }
    #swagger.responses[200] = { description: 'Logged out', schema: { $ref: '#/definitions/MessageResponse' } }
  */
  const cookieToken = req.cookies?.admin_refresh_token;
  const incoming = cookieToken ? decryptCookieValue(cookieToken) : req.body?.refreshToken;
  if (incoming) await revokeRefreshToken(incoming);
  res.clearCookie('admin_refresh_token');
  res.clearCookie('csrf_token');
  clearAccessCookie(res, 'admin');
  logAudit({
    actorType: 'admin',
    actorId: req.admin?.sub || null,
    action: 'admin.logout',
    entityType: 'admin',
    entityId: req.admin?.sub || null,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  }).catch(console.error);
  return res.json({ message: 'Logged out' });
});

router.get('/me', requireAdmin, async (req, res) => {
  /*
    #swagger.tags = ['Admin Auth']
    #swagger.summary = 'Get current admin profile'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.responses[200] = {
      description: 'Admin',
      schema: { type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' }, email: { type: 'string' }, role: { type: 'string' } } }
    }
  */
  const [rows] = await pool.query(
    'SELECT id, name, email, role FROM admin_users WHERE id = ?',
    [req.admin.sub]
  );
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  return res.json(rows[0]);
});

router.post('/forgot-password', otpLimiter, async (req, res) => {
  /*
    #swagger.tags = ['Admin Auth']
    #swagger.summary = 'Request admin password reset OTP'
    #swagger.parameters['body'] = { in: 'body', required: true, schema: { $ref: '#/definitions/ForgotPasswordRequest' } }
    #swagger.responses[200] = { description: 'OTP dispatched', schema: { $ref: '#/definitions/MessageResponse' } }
  */
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: 'Email required' });
  const [rows] = await pool.query('SELECT id FROM admin_users WHERE email = ? LIMIT 1', [email]);
  if (!rows.length) return res.json({ message: 'OTP sent if account exists' });
  try {
    const { code } = await createOtp({
      userId: rows[0].id,
      email,
      purpose: 'admin_password_reset',
    });
    await sendOtpEmail({ to: email, code, purpose: 'password_reset' });
    logAudit({
      actorType: 'admin',
      actorId: rows[0].id,
      action: 'admin.password_reset.requested',
      entityType: 'admin',
      entityId: rows[0].id,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    }).catch(console.error);
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
    #swagger.tags = ['Admin Auth']
    #swagger.summary = 'Reset admin password using OTP'
    #swagger.parameters['body'] = { in: 'body', required: true, schema: { $ref: '#/definitions/ResetPasswordRequest' } }
    #swagger.responses[200] = { description: 'Password reset', schema: { $ref: '#/definitions/MessageResponse' } }
  */
  const { email, code, newPassword } = req.body || {};
  if (!email || !code || !newPassword) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  const passwordError = validatePasswordStrength(newPassword);
  if (passwordError) {
    return res.status(400).json({ error: passwordError });
  }
  const otp = await verifyOtp({ email, purpose: 'admin_password_reset', code });
  if (!otp) return res.status(400).json({ error: 'Invalid or expired OTP' });

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await pool.query('UPDATE admin_users SET password_hash = ? WHERE email = ?', [
    passwordHash,
    email,
  ]);
  await pool.query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE admin_id = ?', [
    otp.user_id,
  ]);
  sendSecurityEmail({
    to: email,
    title: 'Admin Password Updated',
    message: 'Your admin password was changed successfully.',
  }).catch(console.error);
  logAudit({
    actorType: 'admin',
    actorId: otp.user_id,
    action: 'admin.password_reset',
    entityType: 'admin',
    entityId: otp.user_id,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  }).catch(console.error);
  return res.json({ message: 'Password reset successful' });
});

router.get('/csrf', (req, res) => {
  /*
    #swagger.tags = ['Admin Auth']
    #swagger.summary = 'Get CSRF token for admin session'
    #swagger.responses[200] = {
      description: 'CSRF token',
      schema: { type: 'object', properties: { csrfToken: { type: 'string' } } }
    }
  */
  const token = issueCsrf(res);
  return res.json({ csrfToken: token });
});

export default router;
