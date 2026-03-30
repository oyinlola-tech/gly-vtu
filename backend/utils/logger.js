function redact(obj, depth = 0) {
  if (!obj || typeof obj !== 'object') return obj;
  if (depth > 6) return '[REDACTED_DEPTH]';

  const keys = [
    'secret',
    'token',
    'password',
    'api_key',
    'apikey',
    'authorization',
    'cookie',
    'pin',
    'otp',
    'bvn',
    'nin',
    'account_number',
    'card_number',
    'cvv',
    'email',
    'phone',
  ];

  if (Array.isArray(obj)) {
    return obj.map((item) => redact(item, depth + 1));
  }

  const clone = { ...obj };
  for (const [key, value] of Object.entries(clone)) {
    const lower = key.toLowerCase();
    if (keys.some((k) => lower.includes(k))) {
      clone[key] = '[REDACTED]';
    } else if (value && typeof value === 'object') {
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
  info: (msg, meta) => console.log(msg, meta ? redact(meta) : ''),
  warn: (msg, meta) => console.warn(msg, meta ? redact(meta) : ''),
  error: (msg, meta) => console.error(msg, meta ? redact(meta) : ''),
  format,
};
