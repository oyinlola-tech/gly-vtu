import crypto from 'crypto';
import { pool } from '../config/db.js';

function hashBody(body) {
  return crypto.createHash('sha256').update(JSON.stringify(body || {})).digest('hex');
}

export async function checkIdempotency({ userId, key, route, body }) {
  if (!key) return { ok: true, hit: false };
  const bodyHash = hashBody(body);
  const [rows] = await pool.query(
    'SELECT id, status, response_json, request_hash FROM idempotency_keys WHERE user_id = ? AND idem_key = ? AND route = ? LIMIT 1',
    [userId, key, route]
  );
  if (!rows.length) {
    await pool.query(
      'INSERT INTO idempotency_keys (id, user_id, idem_key, route, request_hash, status) VALUES (UUID(), ?, ?, ?, ?, ?)',
      [userId, key, route, bodyHash, 'processing']
    );
    return { ok: true, hit: false, bodyHash };
  }
  const row = rows[0];
  if (row.request_hash && row.request_hash !== bodyHash) {
    return { ok: false, status: 409, error: 'Idempotency key mismatch' };
  }
  if (row.status === 'processing') {
    return { ok: false, status: 409, error: 'Request already in progress' };
  }
  return { ok: true, hit: true, response: row.response_json ? JSON.parse(row.response_json) : null };
}

export async function completeIdempotency({ userId, key, route, response, status = 'complete' }) {
  if (!key) return;
  await pool.query(
    'UPDATE idempotency_keys SET status = ?, response_json = ? WHERE user_id = ? AND idem_key = ? AND route = ?',
    [status, JSON.stringify(response || {}), userId, key, route]
  );
}
