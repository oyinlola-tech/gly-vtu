export function isNonEmptyString(value, max = 255) {
  return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= max;
}

export function isValidAmount(value, min = 1, max = 1_000_000) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return false;
  return amount >= min && amount <= max;
}

export function isValidPhone(value) {
  if (!isNonEmptyString(value, 20)) return false;
  const digits = value.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15;
}

export function isValidServiceId(value) {
  if (!isNonEmptyString(value, 80)) return false;
  return /^[a-z0-9-]+$/i.test(value.trim());
}

export function normalizeAccount(value) {
  if (!isNonEmptyString(value, 60)) return '';
  return value.trim();
}
