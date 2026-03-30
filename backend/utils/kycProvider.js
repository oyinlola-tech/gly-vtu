import { logger } from './logger.js';

const PROVIDER = (process.env.KYC_PROVIDER || 'mock').toLowerCase();
const BASE_URL = (process.env.KYC_PROVIDER_BASE_URL || '').replace(/\/$/, '');
const BVN_PATH = process.env.KYC_PROVIDER_BVN_PATH || '/bvn';
const NIN_PATH = process.env.KYC_PROVIDER_NIN_PATH || '/nin';
const AUTH_HEADER = process.env.KYC_PROVIDER_AUTH_HEADER || 'Authorization';
const AUTH_TYPE = process.env.KYC_PROVIDER_AUTH_TYPE || 'Bearer';
const AUTH_TOKEN = process.env.KYC_PROVIDER_TOKEN || '';
const TIMEOUT_MS = Number(process.env.KYC_PROVIDER_TIMEOUT_MS || 10000);

export function kycProviderEnabled() {
  if (PROVIDER === 'mock') return true;
  return Boolean(BASE_URL);
}

function normalizeName(name) {
  if (!name) return '';
  return String(name)
    .toLowerCase()
    .replace(/[^a-z\s'-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function nameTokens(name) {
  const normalized = normalizeName(name);
  return normalized ? normalized.split(' ').filter(Boolean) : [];
}

export function namesMatchLoose(nameA, nameB) {
  const tokensA = nameTokens(nameA);
  const tokensB = nameTokens(nameB);
  if (!tokensA.length || !tokensB.length) return false;
  if (tokensA.length !== tokensB.length) return false;
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  if (setA.size !== setB.size) return false;
  for (const token of setA) {
    if (!setB.has(token)) return false;
  }
  return true;
}

function parseNameFromResponse(data) {
  const full =
    data?.full_name ||
    data?.fullName ||
    data?.name ||
    data?.data?.full_name ||
    data?.data?.fullName ||
    data?.data?.name ||
    null;
  const first =
    data?.first_name ||
    data?.firstName ||
    data?.data?.first_name ||
    data?.data?.firstName ||
    null;
  const last =
    data?.last_name ||
    data?.lastName ||
    data?.data?.last_name ||
    data?.data?.lastName ||
    null;
  if (full) return { fullName: String(full), firstName: first || null, lastName: last || null };
  if (first || last) {
    return {
      fullName: `${first || ''} ${last || ''}`.trim(),
      firstName: first || null,
      lastName: last || null,
    };
  }
  return { fullName: null, firstName: null, lastName: null };
}

function parseDobFromResponse(data) {
  return (
    data?.dob ||
    data?.date_of_birth ||
    data?.dateOfBirth ||
    data?.data?.dob ||
    data?.data?.date_of_birth ||
    data?.data?.dateOfBirth ||
    null
  );
}

function parsePhoneFromResponse(data) {
  return data?.phone || data?.phone_number || data?.data?.phone || data?.data?.phone_number || null;
}

function parseGenderFromResponse(data) {
  return data?.gender || data?.data?.gender || null;
}

function parseReferenceFromResponse(data) {
  return (
    data?.reference ||
    data?.ref ||
    data?.request_id ||
    data?.data?.reference ||
    data?.data?.ref ||
    data?.data?.request_id ||
    null
  );
}

function parseVerifiedFlag(data) {
  if (typeof data?.verified === 'boolean') return data.verified;
  if (typeof data?.data?.verified === 'boolean') return data.data.verified;
  const status =
    data?.status ||
    data?.data?.status ||
    data?.verification_status ||
    data?.data?.verification_status ||
    '';
  if (typeof status === 'string') {
    const normalized = status.toLowerCase();
    if (['verified', 'success', 'successful', 'passed', 'valid'].includes(normalized)) {
      return true;
    }
    if (['failed', 'rejected', 'invalid'].includes(normalized)) {
      return false;
    }
  }
  return null;
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timeout);
  }
}

async function verifyGeneric(type, payload) {
  const path = type === 'bvn' ? BVN_PATH : NIN_PATH;
  if (!BASE_URL) {
    throw new Error('KYC provider base URL missing');
  }

  const headers = { 'Content-Type': 'application/json' };
  if (AUTH_TOKEN) {
    headers[AUTH_HEADER] = AUTH_TYPE ? `${AUTH_TYPE} ${AUTH_TOKEN}` : AUTH_TOKEN;
  }

  const res = await fetchWithTimeout(`${BASE_URL}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.message || 'KYC provider request failed');
  }
  return data;
}

function verifyMock(type, payload) {
  const idValue = type === 'bvn' ? payload?.bvn : payload?.nin;
  const invalid = String(idValue || '').endsWith('0');
  const fullName = payload?.fullName || `${payload?.firstName || ''} ${payload?.lastName || ''}`.trim();
  return {
    verified: !invalid,
    status: !invalid ? 'verified' : 'failed',
    data: {
      fullName,
      dob: payload?.dob || null,
      phone: payload?.phone || null,
    },
    reference: `mock-${type}-${Date.now()}`,
  };
}

export async function verifyIdentity({ type, payload }) {
  const provider = PROVIDER;
  const requestPayload = {
    ...(type === 'bvn' ? { bvn: payload?.bvn } : { nin: payload?.nin }),
    fullName: payload?.fullName || null,
    firstName: payload?.firstName || null,
    lastName: payload?.lastName || null,
    dob: payload?.dob || null,
    phone: payload?.phone || null,
    gender: payload?.gender || null,
  };

  let raw;
  try {
    raw = provider === 'mock' ? verifyMock(type, requestPayload) : await verifyGeneric(type, requestPayload);
  } catch (err) {
    logger.warn('KYC provider error', { provider, type, error: logger.format(err) });
    throw err;
  }

  const verified = parseVerifiedFlag(raw);
  const name = parseNameFromResponse(raw);
  const result = {
    provider,
    verified: verified === null ? false : verified,
    status: verified === null ? 'unknown' : verified ? 'verified' : 'failed',
    fullName: name.fullName,
    firstName: name.firstName,
    lastName: name.lastName,
    dob: parseDobFromResponse(raw),
    phone: parsePhoneFromResponse(raw),
    gender: parseGenderFromResponse(raw),
    reference: parseReferenceFromResponse(raw),
    raw,
  };

  return result;
}

