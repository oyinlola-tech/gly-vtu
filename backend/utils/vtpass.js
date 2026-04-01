import crypto from 'crypto';
import { getSecret } from './secretsManager.js';

const BASE_URL =
  (process.env.VTPASS_BASE_URL || '').trim() ||
  (process.env.VTPASS_ENV === 'sandbox' ? 'https://sandbox.vtpass.com' : 'https://vtpass.com');

let cachedKeys = null;

async function getVtpassKeys() {
  if (cachedKeys) return cachedKeys;
  const apiKey = await getSecret('gly-vtu/vtpass-api-key', { envFallback: 'VTPASS_API_KEY' });
  const publicKey = await getSecret('gly-vtu/vtpass-public-key', {
    envFallback: 'VTPASS_PUBLIC_KEY',
  });
  const secretKey = await getSecret('gly-vtu/vtpass-secret-key', {
    envFallback: 'VTPASS_SECRET_KEY',
  });
  cachedKeys = { apiKey: apiKey || '', publicKey: publicKey || '', secretKey: secretKey || '' };
  return cachedKeys;
}

export const vtpassEnabled = Boolean(
  process.env.VTPASS_API_KEY || process.env.VTPASS_PUBLIC_KEY || process.env.VTPASS_SECRET_KEY || process.env.AWS_SECRETS_ENABLED === 'true'
);

function buildUrl(path, params) {
  const url = new URL(path, BASE_URL);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;
      url.searchParams.set(key, String(value));
    });
  }
  return url.toString();
}

async function vtpassGet(path, params) {
  const { apiKey, publicKey } = await getVtpassKeys();
  if (!apiKey || !publicKey) {
    throw new Error('VTpass keys missing');
  }
  const res = await fetch(buildUrl(path, params), {
    headers: {
      'api-key': apiKey,
      'public-key': publicKey,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.response_description || data?.message || 'VTpass request failed');
  }
  return data;
}

async function vtpassPost(path, payload) {
  const { apiKey, secretKey } = await getVtpassKeys();
  if (!apiKey || !secretKey) {
    throw new Error('VTpass keys missing');
  }
  const res = await fetch(buildUrl(path), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey,
      'secret-key': secretKey,
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.response_description || data?.message || 'VTpass request failed');
  }
  return data;
}

export async function getServiceCategories() {
  return vtpassGet('/api/service-categories');
}

export async function getServicesByIdentifier(identifier) {
  return vtpassGet('/api/services', { identifier });
}

export async function getServiceVariations(serviceID) {
  return vtpassGet('/api/service-variations', { serviceID });
}

export async function buyService(payload) {
  return vtpassPost('/api/pay', payload);
}

export async function requeryService(requestId) {
  return vtpassPost('/api/requery', { request_id: requestId });
}

export function generateRequestId() {
  const now = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Africa/Lagos' })
  );
  const pad = (n) => String(n).padStart(2, '0');
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(
    now.getHours()
  )}${pad(now.getMinutes())}`;
  const suffix = crypto.randomBytes(4).toString('hex');
  return `${stamp}${suffix}`;
}
