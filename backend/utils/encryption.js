import crypto from 'crypto';
import { logger } from './logger.js';

const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const ENCRYPTION_SALT = 'gly-vtu-pii-encryption';
const ITERATIONS = 100000; // NIST recommended minimum

/**
 * Derive encryption key from master secret using PBKDF2
 * This is more secure than SHA256 for key derivation
 */
function getEncryptionKey() {
  const masterSecret = process.env.PII_ENCRYPTION_KEY || process.env.JWT_SECRET;

  if (!masterSecret) {
    throw new Error('PII_ENCRYPTION_KEY or JWT_SECRET required for encryption');
  }

  return crypto.pbkdf2Sync(
    masterSecret,
    ENCRYPTION_SALT,
    ITERATIONS,
    32, // 32 bytes for AES-256
    'sha256'
  );
}

/**
 * Encrypt sensitive personally identifiable information
 * 
 * @param {string} plaintext - The data to encrypt
 * @param {string} aad - Additional authenticated data (context, e.g., user ID)
 * @returns {string} Encrypted data in format: iv:encrypted:authTag
 */
export function encryptPII(plaintext, aad = null) {
  if (!plaintext) return null;

  try {
    const iv = crypto.randomBytes(16);
    const key = getEncryptionKey();

    const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);

    // Add authenticated data if provided (for integrity check)
    if (aad) {
      cipher.setAAD(Buffer.from(aad, 'utf8'));
    }

    let encrypted = cipher.update(String(plaintext), 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Format: iv:encrypted:authTag
    return `${iv.toString('hex')}:${encrypted}:${authTag.toString('hex')}`;
  } catch (err) {
    logger.error('PII encryption failed', { error: err.message });
    throw new Error('Failed to encrypt sensitive data');
  }
}

/**
 * Decrypt sensitive personally identifiable information
 * 
 * @param {string} encrypted - Encrypted data in format: iv:encrypted:authTag
 * @param {string} aad - Additional authenticated data (must match encryption AAD)
 * @returns {string|null} Decrypted plaintext or null on failure
 */
export function decryptPII(encrypted, aad = null) {
  if (!encrypted) return null;

  try {
    const parts = encrypted.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }

    const [ivHex, encryptedData, tagHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(tagHex, 'hex');
    const key = getEncryptionKey();

    const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    // Verify AAD if provided
    if (aad) {
      decipher.setAAD(Buffer.from(aad, 'utf8'));
    }

    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (err) {
    logger.error('PII decryption failed', {
      error: err.message,
      encryptedLength: encrypted?.length || 0
    });
    return null;
  }
}

/**
 * Batch encrypt multiple PII fields
 * Reduces code duplication when encrypting user records
 */
export function encryptMultiplePII(fields = {}, context = null) {
  const encrypted = {};

  for (const [key, value] of Object.entries(fields)) {
    if (value) {
      encrypted[`${key}_encrypted`] = encryptPII(value, context);
    } else {
      encrypted[`${key}_encrypted`] = null;
    }
  }

  return encrypted;
}

/**
 * Batch decrypt multiple PII fields
 */
export function decryptMultiplePII(encryptedRecord = {}, fields = [], context = null) {
  const decrypted = {};

  for (const field of fields) {
    const encryptedKey = `${field}_encrypted`;
    if (encryptedRecord[encryptedKey]) {
      decrypted[field] = decryptPII(encryptedRecord[encryptedKey], context);
    }
  }

  return decrypted;
}

/**
 * Hash a field for searching/matching without decryption
 * Useful for: email lookups, phone matching, etc.
 * 
 * Note: This creates a deterministic hash, which has privacy implications.
 * Consider tokenization instead for sensitive searches.
 */
export function hashPIIForSearch(plaintext, field = '') {
  if (!plaintext) return null;

  // Use HMAC for deterministic hashing
  const secret = process.env.PII_HASH_SECRET || process.env.JWT_SECRET;
  return crypto
    .createHmac('sha256', secret + field)
    .update(plaintext)
    .digest('hex');
}

/**
 * Check if a value can be safely displayed in logs
 * Returns true if the value has been properly redacted
 */
export function isSafeForLogging(value) {
  if (!value) return true;
  const stringValue = String(value).toLowerCase();

  const unsafePatterns = [
    'password',
    'secret',
    'token',
    'key',
    'credential',
    'apikey',
    'api_key'
  ];

  return !unsafePatterns.some(pattern => stringValue.includes(pattern));
}

/**
 * Sanitize an object for logging by removing/redacting sensitive fields
 */
export function sanitizeForLogging(obj, sensitiveFields = []) {
  if (!obj || typeof obj !== 'object') return obj;

  const defaultSensitiveFields = [
    'password',
    'pin',
    'token',
    'secret',
    'apiKey',
    'api_key',
    'authorization',
    'email_encrypted',
    'phone_encrypted'
  ];

  const fieldsToRedact = [...defaultSensitiveFields, ...sensitiveFields];

  const clone = JSON.parse(JSON.stringify(obj));

  function redactRecursive(obj, depth = 0) {
    if (depth > 10) return '[MAX_DEPTH_EXCEEDED]';
    if (!obj || typeof obj !== 'object') return obj;

    if (Array.isArray(obj)) {
      return obj.map(item => redactRecursive(item, depth + 1));
    }

    for (const [key, value] of Object.entries(obj)) {
      if (fieldsToRedact.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
        if (typeof value === 'string') {
          obj[key] = `[REDACTED_STRING_${value.length}]`;
        } else {
          obj[key] = '[REDACTED]';
        }
      } else if (typeof value === 'object' && value !== null) {
        obj[key] = redactRecursive(value, depth + 1);
      }
    }

    return obj;
  }

  return redactRecursive(clone);
}

export default {
  encryptPII,
  decryptPII,
  encryptMultiplePII,
  decryptMultiplePII,
  hashPIIForSearch,
  isSafeForLogging,
  sanitizeForLogging
};
