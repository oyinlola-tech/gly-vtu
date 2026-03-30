function redact(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const clone = Array.isArray(obj) ? [...obj] : { ...obj };
  const keys = ['secret', 'token', 'password', 'api_key', 'apiKey', 'authorization'];
  keys.forEach((k) => {
    if (clone[k] !== undefined) clone[k] = '[REDACTED]';
  });
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
