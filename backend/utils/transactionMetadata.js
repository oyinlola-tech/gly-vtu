import { decryptJson, encryptJson } from './encryption.js';

const SENSITIVE_FIELDS = new Set([
  'accountNumber',
  'bankCode',
  'bankName',
  'accountName',
  'account',
  'to',
  'from',
  'recipient',
  'email',
  'phone',
  'bvn',
  'nin',
  'cardNumber',
  'cvv',
]);

function maskValue(value) {
  if (value === null || value === undefined) return value;
  const str = String(value);
  if (str.length <= 4) return `****`;
  return `${str.slice(0, 2)}****${str.slice(-2)}`;
}

export function buildTransactionMetadata(meta, aad = null) {
  if (!meta || typeof meta !== 'object') {
    return { safe: null, encrypted: null };
  }

  const safe = Array.isArray(meta) ? [...meta] : { ...meta };
  for (const key of Object.keys(safe)) {
    if (SENSITIVE_FIELDS.has(key)) {
      safe[key] = maskValue(safe[key]);
    }
  }

  const encrypted = encryptJson(meta, aad);
  return { safe, encrypted };
}

export function hydrateTransactionMetadata(row, aad = null) {
  if (!row) return null;
  if (row.metadata_encrypted) {
    const decrypted = decryptJson(row.metadata_encrypted, aad);
    if (decrypted) return decrypted;
  }

  let meta = row.metadata ?? null;
  if (typeof meta === 'string') {
    try {
      meta = JSON.parse(meta);
    } catch {
      meta = null;
    }
  }
  return meta || null;
}
