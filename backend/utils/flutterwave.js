import crypto from 'crypto';
import { getSecret } from './secretsManager.js';

const BASE_URL = (process.env.FLW_BASE_URL || 'https://api.flutterwave.com').replace(/\/$/, '');
let cachedSecret = null;

async function getFlutterwaveSecret() {
  if (cachedSecret) return cachedSecret;
  cachedSecret = await getSecret('gly-vtu/flutterwave-secret-key', {
    envFallback: 'FLW_SECRET_KEY',
  });
  return cachedSecret;
}

export function flutterwaveEnabled() {
  return Boolean(process.env.FLW_SECRET_KEY || process.env.AWS_SECRETS_ENABLED === 'true');
}

async function flwRequest(method, path, payload) {
  const secret = await getFlutterwaveSecret();
  if (!secret) {
    throw new Error('Flutterwave secret key missing');
  }
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secret}`,
    },
    body: payload ? JSON.stringify(payload) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.message || 'Flutterwave request failed');
  }
  return data;
}

export async function createVirtualAccount({ email, bvn, tx_ref, firstName, lastName }) {
  const payload = {
    email,
    bvn: bvn || undefined,
    tx_ref: tx_ref || `GLY-${crypto.randomUUID()}`,
    is_permanent: true,
    first_name: firstName,
    last_name: lastName,
  };
  return flwRequest('POST', '/v3/virtual-account-numbers', payload);
}

export async function createCustomer({ name, email, phone }) {
  const payload = {
    name,
    email,
    phone: phone || undefined,
    phone_number: phone || undefined,
  };
  return flwRequest('POST', '/v3/customers', payload);
}

export async function updateCustomer(customerId, payload = {}) {
  if (!customerId) throw new Error('customerId required');
  return flwRequest('PUT', `/v3/customers/${customerId}`, payload);
}

export async function createVirtualAccountForCustomer({
  email,
  bvn,
  tx_ref,
  firstName,
  lastName,
  customerId,
}) {
  const payload = {
    email,
    bvn: bvn || undefined,
    tx_ref: tx_ref || `GLY-${crypto.randomUUID()}`,
    is_permanent: true,
    first_name: firstName,
    last_name: lastName,
    customer_id: customerId || undefined,
  };
  return flwRequest('POST', '/v3/virtual-account-numbers', payload);
}

export async function fetchVirtualAccount(orderRef) {
  if (!orderRef) throw new Error('order_ref required');
  return flwRequest('GET', `/v3/virtual-account-numbers/${orderRef}`);
}

export async function getBanks(country = 'NG') {
  return flwRequest('GET', `/v3/banks/${country}`);
}

export async function resolveBankAccount({ account_number, account_bank }) {
  return flwRequest('POST', '/v3/accounts/resolve', {
    account_number,
    account_bank,
  });
}

export async function listVirtualCards() {
  return flwRequest('GET', '/v3/virtual-cards');
}

export async function createVirtualCard(payload) {
  return flwRequest('POST', '/v3/virtual-cards', payload);
}

export async function blockVirtualCard(cardId) {
  return flwRequest('PUT', `/v3/virtual-cards/${cardId}/status/block`);
}

export async function unblockVirtualCard(cardId) {
  return flwRequest('PUT', `/v3/virtual-cards/${cardId}/status/unblock`);
}

export function verifyFlutterwaveWebhook(req) {
  const secret = process.env.FLW_WEBHOOK_HASH || '';
  if (!secret) {
    return false;
  }
  
  // Get the verif-hash from request headers
  const signature = (req.headers['verif-hash'] || '').toString();
  if (!signature) {
    return false;
  }
  
  // Get the raw body for HMAC calculation
  const rawBody = Buffer.isBuffer(req.rawBody) 
    ? req.rawBody 
    : Buffer.from(JSON.stringify(req.body || ''));
  
  // Calculate HMAC-SHA256
  try {
    const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    
    // Use timing-safe comparison to prevent timing attacks
    if (expected.length !== signature.length) {
      return false;
    }
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}
