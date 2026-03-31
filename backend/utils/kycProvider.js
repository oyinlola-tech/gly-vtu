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

// SECURITY: Sanitize and validate KYC provider responses
function sanitizeString(value, maxLength = 255) {
  if (value === null || value === undefined) return null;
  const str = String(value).trim();
  if (!str) return null;
  // Remove control characters and limit length
  const sanitized = str.replace(/[\x00-\x1F\x7F]/g, '').slice(0, maxLength);
  return sanitized || null;
}

function sanitizeName(value) {
  const name = sanitizeString(value, 100);
  if (!name) return null;
  // Names should be alphanumeric + spaces, hyphens, apostrophes only
  const valid = /^[a-zA-Z\s'-]+$/.test(name);
  if (!valid) {
    logger.warn('KYC: Potentially malicious name detected', { name: name.slice(0, 20) });
    return null;
  }
  return name;
}

function sanitizePhone(value) {
  if (value === null || value === undefined) return null;
  const str = String(value).trim();
  // Extract only digits
  const digitsOnly = str.replace(/\D/g, '');
  // Nigerian phone numbers are typically 11 digits
  if (digitsOnly.length < 7 || digitsOnly.length > 15) {
    logger.warn('KYC: Invalid phone length', { length: digitsOnly.length });
    return null;
  }
  return digitsOnly;
}

function validateDate(value) {
  if (!value) return null;
  const str = String(value).trim();
  // Validate ISO date format YYYY-MM-DD
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(str)) return null;
  
  const date = new Date(str);
  if (isNaN(date.getTime())) return null;
  // Reject future dates (birth dates must be in past)
  if (date > new Date()) return null;
  // Reject dates before year 1900
  if (date.getFullYear() < 1900) return null;
  
  return str;
}

function validateGender(value) {
  if (!value) return null;
  const normalized = String(value).toLowerCase().trim();
  if (['male', 'female', 'other'].includes(normalized)) {
    return normalized;
  }
  logger.warn('KYC: Invalid gender value', { value: normalized });
  return null;
}

function validateConfidenceScore(value) {
  if (value === null || value === undefined) return 0;
  const num = Number(value);
  if (isNaN(num)) return 0;
  if (num < 0 || num > 100) {
    logger.warn('KYC: Invalid confidence score', { value: num });
    return 0;
  }
  return Math.round(num);
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

  // SECURITY: Sanitize and validate all KYC provider response data
  // This prevents injection attacks if the provider is compromised or MITM'd
  const verified = parseVerifiedFlag(raw);
  const rawName = parseNameFromResponse(raw);
  
  // Sanitize name fields
  const fullName = sanitizeName(rawName.fullName);
  const firstName = sanitizeName(rawName.firstName);
  const lastName = sanitizeName(rawName.lastName);
  
  // Validate other fields
  const dob = validateDate(parseDobFromResponse(raw));
  const phone = sanitizePhone(parsePhoneFromResponse(raw));
  const gender = validateGender(parseGenderFromResponse(raw));
  const reference = sanitizeString(parseReferenceFromResponse(raw), 100);
  
  // Log if any validation failed
  if (!fullName && rawName.fullName) {
    logger.warn('KYC: Full name validation failed', { 
      rawName: String(rawName.fullName).slice(0, 20),
      reason: 'Contains invalid characters or is empty after sanitization'
    });
  }

  const result = {
    provider,
    verified: verified === null ? false : verified,
    status: verified === null ? 'unknown' : verified ? 'verified' : 'failed',
    fullName,
    firstName,
    lastName,
    dob,
    phone,
    gender,
    reference,
    raw, // Keep raw for audit logging (but don't use for any security decisions)
  };

  return result;
    lastName: name.lastName,
    dob: parseDobFromResponse(raw),
    phone: parsePhoneFromResponse(raw),
    gender: parseGenderFromResponse(raw),
    reference: parseReferenceFromResponse(raw),
    raw,
  };

  return result;
}

