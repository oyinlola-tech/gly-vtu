const sensitivePatterns = [
  'secret',
  'token',
  'password',
  'password_hash',
  'api_key',
  'apikey',
  'authorization',
  'cookie',
  'set-cookie',
  'session',
  'pin',
  'otp',
  'totp',
  'bvn',
  'nin',
  'ssn',
  'account_number',
  'accountnumber',
  'card_number',
  'cardnumber',
  'cvv',
  'email',
  'phone',
  'full_name',
  'fullname',
  'kyc_payload',
  'raw_body',
  'rawdata',
  'key',
  'private',
  'backup_code',
  'refresh_token',
  'access_token',
  'device_id',
];

function redact(obj, depth = 0) {
  if (!obj || typeof obj !== 'object') return obj;
  if (depth > 10) return '[REDACTED_DEPTH]';

  if (Array.isArray(obj)) {
    return obj.map((item) => redact(item, depth + 1));
  }

  const clone = { ...obj };
  for (const [key, value] of Object.entries(clone)) {
    const lower = key.toLowerCase();
    const isSensitive = sensitivePatterns.some((pattern) => lower.includes(pattern));
    if (isSensitive) {
      if (typeof value === 'string' && value.length > 0) {
        clone[key] = `[REDACTED_${value.length}_CHARS]`;
      } else if (typeof value === 'number') {
        clone[key] = '[REDACTED_NUMBER]';
      } else {
        clone[key] = '[REDACTED]';
      }
      continue;
    }
    if (value && typeof value === 'object') {
      clone[key] = redact(value, depth + 1);
    }
  }

  return clone;
}

function format(err) {
  if (!err) return '';
  if (err instanceof Error) return err.message;
  return String(err);
}

export const logger = {
  debug: (msg, meta) => console.debug(msg, meta ? redact(meta) : ''),
  info: (msg, meta) => console.log(msg, meta ? redact(meta) : ''),
  warn: (msg, meta) => console.warn(msg, meta ? redact(meta) : ''),
  error: (msg, meta) => console.error(msg, meta ? redact(meta) : ''),
  format,
};
