import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { hashToken, pool } from '../config/db.js';

const ACCESS_TTL = process.env.JWT_ACCESS_TTL || '15m';
const REFRESH_TTL_DAYS = Number(process.env.JWT_REFRESH_DAYS || 14);
const ACCESS_COOKIE_MINUTES = Number(process.env.JWT_ACCESS_COOKIE_MINUTES || 15);
const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || 'auth_token';
const ADMIN_AUTH_COOKIE_NAME = process.env.ADMIN_AUTH_COOKIE_NAME || 'admin_auth_token';
const isProd = process.env.NODE_ENV === 'production';
const cookieDomain = process.env.COOKIE_DOMAIN || undefined;

function baseCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    path: '/',
    domain: cookieDomain,
  };
}

function addDays(days) {
  const expires = new Date();
  expires.setDate(expires.getDate() + days);
  return expires;
}

export function signAccessToken(payload, secret) {
  return jwt.sign(payload, secret, { expiresIn: ACCESS_TTL });
}

export function setAccessCookie(res, token, type = 'user') {
  const name = type === 'admin' ? ADMIN_AUTH_COOKIE_NAME : AUTH_COOKIE_NAME;
  res.cookie(name, token, {
    ...baseCookieOptions(),
    maxAge: ACCESS_COOKIE_MINUTES * 60 * 1000,
  });
}

export function clearAccessCookie(res, type = 'user') {
  const name = type === 'admin' ? ADMIN_AUTH_COOKIE_NAME : AUTH_COOKIE_NAME;
  res.clearCookie(name, baseCookieOptions());
}

export async function issueRefreshToken({
  userId = null,
  adminId = null,
  familyId = null,
  deviceId = null,
  ipAddress = null,
  userAgent = null,
}) {
  const raw = crypto.randomBytes(48).toString('hex');
  const tokenHash = hashToken(raw);
  const expiresAt = addDays(REFRESH_TTL_DAYS);
  const refreshFamilyId = familyId || crypto.randomUUID();
  await pool.query(
    'INSERT INTO refresh_tokens (id, user_id, admin_id, refresh_family_id, device_id, ip_address, user_agent, token_hash, expires_at) VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?)',
    [userId, adminId, refreshFamilyId, deviceId, ipAddress, userAgent, tokenHash, expiresAt]
  );
  return { raw, expiresAt, familyId: refreshFamilyId };
}

export async function revokeRefreshToken(raw) {
  const tokenHash = hashToken(raw);
  await pool.query(
    'UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = ?',
    [tokenHash]
  );
}

export async function rotateRefreshToken(raw, { userId = null, adminId = null }) {
  const tokenHash = hashToken(raw);
  const [rows] = await pool.query(
    'SELECT id, revoked_at, expires_at, refresh_family_id, device_id, ip_address, user_agent FROM refresh_tokens WHERE token_hash = ? LIMIT 1',
    [tokenHash]
  );
  if (!rows.length) return null;
  if (rows[0].revoked_at) return null;
  if (new Date(rows[0].expires_at) < new Date()) return null;

  await pool.query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = ?', [
    tokenHash,
  ]);
  return issueRefreshToken({
    userId,
    adminId,
    familyId: rows[0].refresh_family_id,
    deviceId: rows[0].device_id,
    ipAddress: rows[0].ip_address,
    userAgent: rows[0].user_agent,
  });
}
