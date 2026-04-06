const cache = new Map();

export async function getSecret(secretName, options = {}) {
  const { envFallback } = options;
  if (cache.has(secretName)) return cache.get(secretName);
  const value = envFallback ? process.env[envFallback] || null : null;
  cache.set(secretName, value);
  return value;
}

export function clearSecretCache() {
  cache.clear();
}
