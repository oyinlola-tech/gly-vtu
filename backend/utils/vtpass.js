import crypto from 'crypto';

const BASE_URL =
  (process.env.VTPASS_BASE_URL || '').trim() ||
  (process.env.VTPASS_ENV === 'sandbox' ? 'https://sandbox.vtpass.com' : 'https://vtpass.com');

const API_KEY = (process.env.VTPASS_API_KEY || '').trim();
const PUBLIC_KEY = (process.env.VTPASS_PUBLIC_KEY || '').trim();
const SECRET_KEY = (process.env.VTPASS_SECRET_KEY || '').trim();

export const vtpassEnabled = Boolean(API_KEY && PUBLIC_KEY && SECRET_KEY);

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
  const res = await fetch(buildUrl(path, params), {
    headers: {
      'api-key': API_KEY,
      'public-key': PUBLIC_KEY,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.response_description || data?.message || 'VTpass request failed');
  }
  return data;
}

async function vtpassPost(path, payload) {
  const res = await fetch(buildUrl(path), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': API_KEY,
      'secret-key': SECRET_KEY,
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
