import crypto from 'crypto';

// CRITICAL: COOKIE_ENC_SECRET must be a separate, strong secret (>=32 chars)
// DO NOT fall back to JWT_SECRET - each secret serves a different purpose
const COOKIE_ENC_SECRET = process.env.COOKIE_ENC_SECRET;
if (!COOKIE_ENC_SECRET) {
  throw new Error(
    'CRITICAL: COOKIE_ENC_SECRET environment variable must be set. ' +
    'It must be different from JWT_SECRET. ' +
    'Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
  );
}
if (COOKIE_ENC_SECRET.length < 32) {
  throw new Error('CRITICAL: COOKIE_ENC_SECRET must be at least 32 characters');
}

const ENCRYPTION_SALT = 'gly-vtu-cookie-encryption';
const ITERATIONS = 100000;

function getKey() {
  // Derive a 32-byte key from the configured secret using PBKDF2.
  return crypto.pbkdf2Sync(
    String(COOKIE_ENC_SECRET),
    ENCRYPTION_SALT,
    ITERATIONS,
    32,
    'sha256'
  );
}

export function encryptCookieValue(value) {
  if (!value) return value;
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    iv.toString('base64'),
    ciphertext.toString('base64'),
    tag.toString('base64'),
  ].join('.');
}

export function decryptCookieValue(value) {
  if (!value) return null;
  const parts = String(value).split('.');
  if (parts.length !== 3) return null;
  const [ivB64, ctB64, tagB64] = parts;
  try {
    const key = getKey();
    const iv = Buffer.from(ivB64, 'base64');
    const ciphertext = Buffer.from(ctB64, 'base64');
    const tag = Buffer.from(tagB64, 'base64');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return plaintext.toString('utf8');
  } catch (_) {
    return null;
  }
}
