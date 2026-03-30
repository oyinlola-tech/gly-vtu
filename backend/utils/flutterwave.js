import crypto from 'crypto';

const BASE_URL = (process.env.FLW_BASE_URL || 'https://api.flutterwave.com').replace(/\/$/, '');
const SECRET_KEY = (process.env.FLW_SECRET_KEY || '').trim();

function headers() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${SECRET_KEY}`,
  };
}

export function flutterwaveEnabled() {
  return Boolean(SECRET_KEY);
}

async function flwRequest(method, path, payload) {
  if (!SECRET_KEY) {
    throw new Error('Flutterwave secret key missing');
  }
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: headers(),
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
  if (!secret) return false;
  const header = (req.headers['verif-hash'] || '').toString();
  return header && header === secret;
}
