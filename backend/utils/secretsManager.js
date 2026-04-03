import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { logger } from './logger.js';

const cache = new Map();
let client = null;

function getClient() {
  if (client) return client;
  const region = process.env.AWS_SECRETS_REGION || process.env.AWS_REGION;
  if (!region) return null;
  client = new SecretsManagerClient({ region });
  return client;
}

function isAwsEnabled() {
  return process.env.AWS_SECRETS_ENABLED === 'true';
}

export async function getSecret(secretName, options = {}) {
  const { envFallback } = options;

  if (!isAwsEnabled()) {
    return envFallback ? process.env[envFallback] || null : null;
  }

  if (cache.has(secretName)) {
    return cache.get(secretName);
  }

  const awsClient = getClient();
  if (!awsClient) {
    logger.warn('AWS secrets enabled but region not configured, falling back to env', {
      secretName,
    });
    return envFallback ? process.env[envFallback] || null : null;
  }

  try {
    const command = new GetSecretValueCommand({ SecretId: secretName });
    const response = await awsClient.send(command);
    const value = response.SecretString || null;
    cache.set(secretName, value);
    return value;
  } catch (err) {
    logger.error('Failed to fetch secret from AWS', {
      secretName,
      error: err?.message || String(err),
    });
    return envFallback ? process.env[envFallback] || null : null;
  }
}

export function clearSecretCache() {
  cache.clear();
}

