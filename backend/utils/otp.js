import crypto from 'crypto';
import argon2 from 'argon2';
import { pool } from '../config/db.js';

export function generateOtp() {
  // Use cryptographically strong RNG for OTPs
  return String(crypto.randomInt(100000, 1000000));
}

export async function createOtp({ userId = null, email, purpose, ttlMinutes = 10 }) {
  const cooldownSeconds = Number(process.env.OTP_COOLDOWN_SECONDS || 60);
  const maxPerHour = Number(process.env.OTP_MAX_PER_HOUR || 5);

  const [recent] = await pool.query(
    `SELECT created_at FROM email_otps
     WHERE email = ? AND purpose = ?
     ORDER BY created_at DESC
     LIMIT 1`,
    [email, purpose]
  );
  if (recent.length) {
    const last = new Date(recent[0].created_at).getTime();
    if (Date.now() - last < cooldownSeconds * 1000) {
      const err = new Error('OTP requested too quickly');
      err.code = 'OTP_COOLDOWN';
      throw err;
    }
  }

  const [countRows] = await pool.query(
    `SELECT COUNT(*) as total FROM email_otps
     WHERE email = ? AND purpose = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)`,
    [email, purpose]
  );
  if (countRows[0].total >= maxPerHour) {
    const err = new Error('OTP rate limit exceeded');
    err.code = 'OTP_LIMIT';
    throw err;
  }

  const code = generateOtp();
  const codeHash = await argon2.hash(code, {
    type: argon2.argon2id,
    memoryCost: 2 ** 16,
    timeCost: 3,
    parallelism: 1,
  });
  const expires = new Date(Date.now() + ttlMinutes * 60 * 1000);
  await pool.query(
    'INSERT INTO email_otps (id, user_id, email, purpose, code_hash, expires_at) VALUES (UUID(), ?, ?, ?, ?, ?)',
    [userId, email, purpose, codeHash, expires]
  );
  return { code, expires };
}

export async function verifyOtp({ email, purpose, code }) {
  const [rows] = await pool.query(
    `SELECT id, user_id, expires_at, consumed_at, code_hash
     FROM email_otps
     WHERE email = ? AND purpose = ?
     ORDER BY created_at DESC
     LIMIT 5`,
    [email, purpose]
  );
  if (!rows.length) return null;

  for (const row of rows) {
    if (row.consumed_at) continue;
    if (new Date(row.expires_at) < new Date()) continue;
    const matches = await argon2.verify(row.code_hash, code);
    if (!matches) continue;

    await pool.query('UPDATE email_otps SET consumed_at = NOW() WHERE id = ?', [row.id]);
    return row;
  }

  return null;
}
