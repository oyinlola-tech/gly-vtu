export function isNonEmptyString(value, max = 255) {
  return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= max;
}

export function isValidAmount(value, min = 1, max = 1_000_000) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return false;
  return amount >= min && amount <= max;
}

export function isValidNigerianPhone(value) {
  if (!isNonEmptyString(value, 20)) return false;

  const cleaned = value.replace(/[\s\-().+]/g, '');
  const patterns = [
    /^\+234[789]\d{9}$/,
    /^0[789]\d{9}$/,
    /^234[789]\d{9}$/,
  ];

  const isValid = patterns.some((pattern) => pattern.test(cleaned));
  if (!isValid) return false;

  const invalidPrefixes = ['0000', '9999'];
  const prefix = cleaned.substring(0, 4);
  if (invalidPrefixes.includes(prefix)) return false;

  return true;
}

export function isValidPhone(value) {
  return isValidNigerianPhone(value);
}

export function isValidServiceId(value) {
  if (!isNonEmptyString(value, 80)) return false;
  return /^[a-z0-9-]+$/i.test(value.trim());
}

export function normalizeAccount(value) {
  if (!isNonEmptyString(value, 60)) return '';
  return value.trim();
}
