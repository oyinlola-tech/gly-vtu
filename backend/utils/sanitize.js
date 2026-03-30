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
