function pick(obj, keys) {
  const out = {};
  keys.forEach((k) => {
    if (obj && obj[k] !== undefined && obj[k] !== null) out[k] = obj[k];
  });
  return out;
}

export function sanitizeFlutterwaveAccount(account = {}) {
  return {
    ...pick(account, [
      'order_ref',
      'reference',
      'account_number',
      'account_name',
      'bank_name',
      'bank_code',
      'status',
    ]),
  };
}

export function sanitizeFlutterwaveCard(card = {}) {
  return {
    ...pick(card, ['id', 'card_id', 'masked_pan', 'expiry', 'currency', 'status', 'amount']),
  };
}

export function sanitizeFlutterwaveWebhook(payload = {}) {
  const data = payload.data || {};
  return {
    event: payload.event,
    data: {
      id: data.id || null,
      tx_ref: data.tx_ref || null,
      flw_ref: data.flw_ref || null,
      status: data.status || null,
      currency: data.currency || null,
      amount: data.amount || null,
      payment_type: data.payment_type || null,
    },
  };
}

export function sanitizeVtpassPayload(payload = {}) {
  const data = payload.data || {};
  const tx = data?.content?.transactions || {};
  return {
    type: payload.type || null,
    data: {
      requestId: data.requestId || data.request_id || null,
      status: tx.status || null,
      transactionId: tx.transactionId || null,
      amount: tx.amount || null,
      serviceID: tx.serviceID || null,
    },
  };
}

// SECURITY: Basic text sanitization to reduce stored XSS risk in user-generated content.
// This strips HTML tags and control chars, then trims and length-limits the content.
export function sanitizeUserText(value, maxLen = 2000) {
  if (value === null || value === undefined) return '';
  const raw = String(value);
  const noTags = raw.replace(/<[^>]*>/g, '');
  const noCtl = noTags.replace(/[\u0000-\u001F\u007F]/g, '');
  const trimmed = noCtl.trim();
  if (trimmed.length <= maxLen) return trimmed;
  return trimmed.slice(0, maxLen);
}
