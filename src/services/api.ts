import type {
  AdminBillPricing,
  AdminBillProvider,
  BillCategory,
  BillProvider,
  BillQuoteRequest,
  BillQuoteResponse,
  BillVariationsResponse,
  BillsPayCardRequest,
  BillsPayCardResponse,
  BillsPayRequest,
  BillsPayResponse,
} from '../types/bills';

const API_BASE_URL = (import.meta.env as any).VITE_API_URL || '/app/api';
const ADMIN_API_BASE_URL = (import.meta.env as any).VITE_ADMIN_API_URL || '/app/admin/api';

const DEVICE_ID_KEY = 'gly_device_id';

function getDeviceId() {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    try {
      localStorage.setItem(DEVICE_ID_KEY, deviceId);
    } catch {
      // ignore storage errors
    }
  }
  return deviceId;
}

function createIdempotencyKey() {
  return crypto.randomUUID();
}

// CSRF Token is now handled via httpOnly cookies by the server
// No longer stored in localStorage for XSS protection
async function ensureCsrfToken() {
  // CSRF token is automatically sent as httpOnly cookie
  // This function kept for compatibility but no longer stores token
  return null; // CSRF token is handled server-side via cookies
}

async function ensureAdminCsrfToken() {
  // CSRF token is automatically sent as httpOnly cookie
  // This function kept for compatibility but no longer stores token
  return null; // CSRF token is handled server-side via cookies
}

async function parseResponse(res: Response) {
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return res.json();
  }
  return res.text();
}

async function refreshAccessToken() {
  const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ deviceId: getDeviceId() }),
  });
  const data = await parseResponse(res);
  if (!res.ok) throw new Error(data?.error || 'Session expired');
  // CSRF token is now httpOnly cookie, no need to store
  return true;
}

async function refreshAdminAccessToken() {
  const res = await fetch(`${ADMIN_API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ deviceId: getDeviceId() }),
  });
  const data = await parseResponse(res);
  if (!res.ok) throw new Error(data?.error || 'Session expired');
  // CSRF token is now httpOnly cookie, no need to store
  return true;
}

async function request<T>(
  base: string,
  path: string,
  options: RequestInit = {},
  config: { auth?: boolean; admin?: boolean } = {}
): Promise<T> {
  const { auth = true, admin = false } = config;
  const headers: Record<string, string> = {
    ...(options.headers ? (options.headers as Record<string, string>) : {}),
  };
  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${base}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (response.status === 401 && auth && !admin) {
    try {
      await refreshAccessToken();
      const retryHeaders = { ...headers };
      const retry = await fetch(`${base}${path}`, {
        ...options,
        headers: retryHeaders,
        credentials: 'include',
      });
      const retryData = await parseResponse(retry);
      if (!retry.ok) throw new Error(retryData?.error || 'Request failed');
      return retryData as T;
    } catch (err) {
      throw err;
    }
  }
  if (response.status === 401 && auth && admin) {
    try {
      await refreshAdminAccessToken();
      const retryHeaders = { ...headers };
      const retry = await fetch(`${base}${path}`, {
        ...options,
        headers: retryHeaders,
        credentials: 'include',
      });
      const retryData = await parseResponse(retry);
      if (!retry.ok) throw new Error(retryData?.error || 'Request failed');
      return retryData as T;
    } catch (err) {
      throw err;
    }
  }

  const data = await parseResponse(response);
  if (!response.ok) {
    throw new Error(data?.error || data?.message || 'Request failed');
  }
  return data as T;
}

// ============= AUTHENTICATION APIs =============
export const authAPI = {
  register: async (data: {
    email: string;
    phone: string;
    password: string;
    firstName: string;
    lastName: string;
    bvn?: string;
    nin?: string;
  }) => {
    return request<{ message: string }>(
      API_BASE_URL,
      '/auth/register',
      {
        method: 'POST',
        body: JSON.stringify({
          fullName: `${data.firstName} ${data.lastName}`.trim(),
          email: data.email,
          phone: data.phone,
          password: data.password,
          bvn: data.bvn,
          nin: data.nin,
        }),
      },
      { auth: false }
    );
  },

  login: async (data: { email: string; password: string; deviceId?: string; totp?: string; backupCode?: string }) => {
    return request<any>(
      API_BASE_URL,
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          deviceId: data.deviceId || getDeviceId(),
          totp: data.totp,
          backupCode: data.backupCode,
        }),
      },
      { auth: false }
    );
    // CSRF token is now httpOnly cookie, automatically sent by browser
  },

  verifyDevice: async (data: {
    email: string;
    code?: string;
    deviceId?: string;
    label?: string;
    securityAnswer?: string;
    totp?: string;
    backupCode?: string;
  }) => {
    return request<any>(
      API_BASE_URL,
      '/auth/verify-device',
      {
        method: 'POST',
        body: JSON.stringify({
          email: data.email,
          code: data.code,
          deviceId: data.deviceId || getDeviceId(),
          label: data.label,
          securityAnswer: data.securityAnswer,
          totp: data.totp,
          backupCode: data.backupCode,
        }),
      },
      { auth: false }
    );
    // CSRF token is now httpOnly cookie, automatically sent by browser
  },

  forgotPassword: async (data: { email: string }) => {
    return request<{ message: string }>(
      API_BASE_URL,
      '/auth/forgot-password',
      { method: 'POST', body: JSON.stringify(data) },
      { auth: false }
    );
  },

  resetPassword: async (data: { email: string; code: string; newPassword: string }) => {
    return request<{ message: string }>(
      API_BASE_URL,
      '/auth/reset-password',
      { method: 'POST', body: JSON.stringify(data) },
      { auth: false }
    );
  },

  logout: async () => {
    await request<{ message: string }>(
      API_BASE_URL,
      '/auth/logout',
      { method: 'POST' },
      { auth: false }
    );
    // CSRF token cleared server-side via httpOnly cookie
  },

  me: async () => {
    return request<any>(API_BASE_URL, '/auth/me');
  },

  getSecurityQuestion: async (email: string) => {
    return request<{ enabled: boolean; question: string | null }>(
      API_BASE_URL,
      '/auth/security-question',
      { method: 'POST', body: JSON.stringify({ email }) },
      { auth: false }
    );
  },

  // Additional auth methods for security pages
  getProfile: async () => {
    return request<any>(API_BASE_URL, '/auth/me');
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    return request<{ message: string }>(
      API_BASE_URL,
      '/user/password/change',
      { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) }
    );
  },

  initiateTwoFactor: async () => {
    return request<{ secret: string; qrCode: string }>(
      API_BASE_URL,
      '/user/totp/setup',
      { method: 'POST' }
    );
  },

  verifyTwoFactor: async (code: string, secret: string) => {
    return request<{ backupCodes: string[] }>(
      API_BASE_URL,
      '/user/totp/verify',
      { method: 'POST', body: JSON.stringify({ code, secret }) }
    );
  },

  enable2FA: async (secret: string, code: string) => {
    return request<{ message: string }>(
      API_BASE_URL,
      '/user/totp/enable',
      { method: 'POST', body: JSON.stringify({ token: code }) }
    );
  },

  disable2FA: async () => {
    return request<{ message: string }>(
      API_BASE_URL,
      '/user/totp/disable',
      { method: 'POST', body: JSON.stringify({}) }
    );
  },
};

// ============= USER APIs =============
export const userAPI = {
  getProfile: async () => {
    return request<any>(API_BASE_URL, '/user/profile');
  },

  submitKYC: async (data: { level: 1 | 2; payload: Record<string, any> }) => {
    return request<{ message: string }>(
      API_BASE_URL,
      '/user/kyc',
      { method: 'PUT', body: JSON.stringify(data) }
    );
  },

  updateProfile: async (data: { fullName: string; phone: string }) => {
    return request<{ message: string }>(
      API_BASE_URL,
      '/user/profile',
      { method: 'PUT', body: JSON.stringify(data) }
    );
  },

  getKycLimits: async () => {
    return request<any>(API_BASE_URL, '/user/kyc/limits');
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    return request<{ message: string }>(
      API_BASE_URL,
      '/user/password/change',
      { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) }
    );
  },

  getSessions: async () => {
    return request<any[]>(API_BASE_URL, '/user/sessions');
  },

  revokeSession: async (id: string) => {
    return request<{ message: string }>(
      API_BASE_URL,
      `/user/sessions/${id}/revoke`,
      { method: 'POST' }
    );
  },
  renameSession: async (id: string, label: string) => {
    return request<{ message: string }>(
      API_BASE_URL,
      `/user/sessions/${id}/label`,
      { method: 'POST', body: JSON.stringify({ label }) }
    );
  },

  getSecurityStatus: async () => {
    return request<any>(API_BASE_URL, '/user/security');
  },
  getSecurityEvents: async (params?: { limit?: number; offset?: number }) => {
    const search = new URLSearchParams();
    if (params?.limit) search.set('limit', String(params.limit));
    if (params?.offset) search.set('offset', String(params.offset));
    const query = search.toString();
    return request<any[]>(
      API_BASE_URL,
      `/user/security-events${query ? `?${query}` : ''}`
    );
  },
  downloadSecurityEvents: async () => {
    const res = await fetch(`${API_BASE_URL}/user/security-events?export=csv`, {
      credentials: 'include',
    });
    if (!res.ok) {
      const error = await parseResponse(res);
      throw new Error(error?.error || 'Download failed');
    }
    return res.blob();
  },

  setPin: async (pin: string) => {
    return request<{ message: string }>(
      API_BASE_URL,
      '/user/pin/setup',
      { method: 'POST', body: JSON.stringify({ pin }) }
    );
  },

  changePin: async (currentPin: string, newPin: string) => {
    return request<{ message: string }>(
      API_BASE_URL,
      '/user/pin/change',
      { method: 'POST', body: JSON.stringify({ currentPin, newPin }) }
    );
  },

  verifyPin: async (pin: string) => {
    return request<{ valid: boolean }>(
      API_BASE_URL,
      '/user/pin/verify',
      { method: 'POST', body: JSON.stringify({ pin }) }
    );
  },

  toggleBiometric: async (enabled: boolean) => {
    return request<{ message: string }>(
      API_BASE_URL,
      '/user/biometric',
      { method: 'POST', body: JSON.stringify({ enabled }) }
    );
  },

  getSecurityQuestions: async () => {
    return request<string[]>(API_BASE_URL, '/user/security-questions');
  },

  getSecurityQuestion: async () => {
    return request<any>(API_BASE_URL, '/user/security-question');
  },

  setSecurityQuestion: async (question: string, answer: string) => {
    return request<{ message: string }>(
      API_BASE_URL,
      '/user/security-question/set',
      { method: 'POST', body: JSON.stringify({ question, answer }) }
    );
  },

  enableSecurityQuestion: async (enabled: boolean) => {
    return request<{ message: string }>(
      API_BASE_URL,
      '/user/security-question/enable',
      { method: 'POST', body: JSON.stringify({ enabled }) }
    );
  },
  setupTotp: async () => {
    return request<any>(API_BASE_URL, '/user/totp/setup', { method: 'POST' });
  },
  enableTotp: async (token: string) => {
    return request<any>(API_BASE_URL, '/user/totp/enable', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  },
  disableTotp: async (payload: { token?: string; backupCode?: string }) => {
    return request<any>(API_BASE_URL, '/user/totp/disable', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // Wallet & Transaction methods
  getTransactions: async () => {
    return request<any[]>(API_BASE_URL, '/transactions');
  },

  getWalletInfo: async () => {
    return request<any>(API_BASE_URL, '/wallet/info');
  },

  getTopupOptions: async () => {
    return request<any[]>(API_BASE_URL, '/wallet/topup-options');
  },

  initiateTopup: async (providerId: string, amount: number) => {
    return request<any>(API_BASE_URL, '/wallet/topup', {
      method: 'POST',
      body: JSON.stringify({ providerId, amount }),
    });
  },
};

// ============= WALLET APIs =============
export const walletAPI = {
  getBalance: async () => {
    return request<any>(API_BASE_URL, '/wallet/balance');
  },

  sendMoney: async (data: {
    amount: number;
    pin: string;
    accountNumber?: string;
    bankCode?: string;
    accountName?: string;
    to?: string;
    channel?: string;
  }) => {
    return request<any>(API_BASE_URL, '/wallet/send', {
      method: 'POST',
      headers: { 'X-Idempotency-Key': createIdempotencyKey() },
      body: JSON.stringify(data),
    });
  },

  requestMoney: async (data: { amount: number; note?: string }) => {
    return request<any>(API_BASE_URL, '/wallet/receive', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getTransactions: async () => {
    return request<any[]>(API_BASE_URL, '/transactions');
  },

  sendStatement: async (data: { startDate: string; endDate: string }) => {
    return request<{ message: string }>(API_BASE_URL, '/transactions/statement', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  downloadStatement: async (data: { startDate: string; endDate: string }) => {
    const res = await fetch(`${API_BASE_URL}/transactions/statement/download`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
      credentials: 'include',
    });
    if (!res.ok) {
      const error = await parseResponse(res);
      throw new Error(error?.error || 'Download failed');
    }
    return res.blob();
  },
};

export const transactionsAPI = {
  getById: async (id: string) => {
    return request<any>(API_BASE_URL, `/transactions/${id}`);
  },
  downloadReceipt: async (id: string) => {
    const res = await fetch(`${API_BASE_URL}/transactions/${id}/receipt`, {
      credentials: 'include',
    });
    if (!res.ok) {
      const error = await parseResponse(res);
      throw new Error(error?.error || 'Download failed');
    }
    return res.blob();
  },
};

// ============= BILLS PAYMENT APIs =============
export const billsAPI = {
  getCategories: async () => {
    return request<BillCategory[]>(API_BASE_URL, '/bills/categories', {}, { auth: false });
  },

  getProviders: async (category: string) => {
    return request<BillProvider[]>(
      API_BASE_URL,
      `/bills/providers?category=${encodeURIComponent(category)}`,
      {},
      { auth: false }
    );
  },

  getVariations: async (serviceID: string) => {
    return request<BillVariationsResponse>(
      API_BASE_URL,
      `/bills/variations?serviceID=${encodeURIComponent(serviceID)}`,
      {},
      { auth: false }
    );
  },

  getQuote: async (data: BillQuoteRequest) => {
    return request<BillQuoteResponse>(API_BASE_URL, '/bills/quote', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  pay: async (data: BillsPayRequest) => {
    return request<BillsPayResponse>(API_BASE_URL, '/bills/pay', {
      method: 'POST',
      headers: { 'X-Idempotency-Key': createIdempotencyKey() },
      body: JSON.stringify(data),
    });
  },

  payWithCard: async (data: BillsPayCardRequest) => {
    return request<BillsPayCardResponse>(API_BASE_URL, '/bills/pay-card', {
      method: 'POST',
      headers: { 'X-Idempotency-Key': createIdempotencyKey() },
      body: JSON.stringify(data),
    });
  },
};

// ============= BANKS APIs =============
export const banksAPI = {
  getBanks: async () => {
    return request<any[]>(API_BASE_URL, '/banks');
  },

  resolveAccount: async (data: { accountNumber: string; bankCode: string }) => {
    return request<any>(API_BASE_URL, '/banks/resolve', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// ============= NOTIFICATIONS APIs =============
export const notificationsAPI = {
  list: async () => {
    return request<any[]>(API_BASE_URL, '/notifications');
  },
  unreadCount: async () => {
    return request<{ unread: number }>(API_BASE_URL, '/notifications/unread-count');
  },
  markRead: async (ids: string[]) => {
    return request<{ message: string }>(API_BASE_URL, '/notifications/read', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    });
  },
  markAll: async () => {
    return request<{ message: string }>(API_BASE_URL, '/notifications/read-all', {
      method: 'POST',
    });
  },
};

// ============= CONVERSATIONS APIs =============
export const conversationsAPI = {
  getMine: async () => {
    return request<any>(API_BASE_URL, '/conversations/me');
  },
  send: async (text: string) => {
    return request<any>(API_BASE_URL, '/conversations/send', {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  },
};

// ============= VIRTUAL CARDS APIs =============
export const cardsAPI = {
  list: async () => {
    return request<any[]>(API_BASE_URL, '/cards');
  },
  create: async (amount: number, currency = 'NGN') => {
    return request<any>(API_BASE_URL, '/cards', {
      method: 'POST',
      headers: { 'X-Idempotency-Key': createIdempotencyKey() },
      body: JSON.stringify({ amount, currency }),
    });
  },
  freeze: async (cardId: string) => {
    return request<{ message: string }>(API_BASE_URL, `/cards/${cardId}/freeze`, {
      method: 'POST',
    });
  },
  unfreeze: async (cardId: string) => {
    return request<{ message: string }>(API_BASE_URL, `/cards/${cardId}/unfreeze`, {
      method: 'POST',
    });
  },
  getSettings: async (cardId: string) => {
    return request<any>(API_BASE_URL, `/cards/${cardId}/settings`);
  },
  updateSettings: async (cardId: string, payload: any) => {
    return request<{ message: string }>(API_BASE_URL, `/cards/${cardId}/settings`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },
};

// ============= ADMIN APIs =============
export const adminAPI = {
  login: async (data: { email: string; password: string; totp?: string }) => {
    const response = await request<any>(
      ADMIN_API_BASE_URL,
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ ...data, deviceId: getDeviceId() }),
      },
      { auth: false, admin: true }
    );
    // CSRF token is now httpOnly cookie, automatically sent by browser
    return response;
  },
  me: async () => {
    return request<any>(ADMIN_API_BASE_URL, '/auth/me', {}, { admin: true });
  },

  refresh: async () => {
    const csrfToken = await ensureAdminCsrfToken();
    const response = await request<any>(
      ADMIN_API_BASE_URL,
      '/auth/refresh',
      {
        method: 'POST',
        headers: csrfToken ? { 'X-CSRF-Token': csrfToken } : undefined,
        body: JSON.stringify({ deviceId: getDeviceId() }),
      },
      { auth: false, admin: true }
    );
    // CSRF token is now httpOnly cookie, automatically sent by browser
    return response;
  },

  logout: async () => {
    await request<any>(
      ADMIN_API_BASE_URL,
      '/auth/logout',
      { method: 'POST' },
      { auth: false, admin: true }
    );
    // CSRF token cleared via httpOnly cookie
  },

  getFinanceOverview: async () => {
    return request<any>(ADMIN_API_BASE_URL, '/finance/overview', {}, { admin: true });
  },

  getUsers: async () => {
    return request<any[]>(ADMIN_API_BASE_URL, '/users', {}, { admin: true });
  },

  getTransactions: async () => {
    return request<any[]>(ADMIN_API_BASE_URL, '/transactions', {}, { admin: true });
  },

  getAudit: async () => {
    return request<any[]>(ADMIN_API_BASE_URL, '/audit', {}, { admin: true });
  },

  getAuditLogs: async (params?: {
    limit?: number;
    offset?: number;
    actorType?: string;
    actorId?: string;
    action?: string;
    entityType?: string;
    from?: string;
    to?: string;
  }) => {
    const search = new URLSearchParams();
    if (params?.limit) search.set('limit', String(params.limit));
    if (params?.offset) search.set('offset', String(params.offset));
    if (params?.actorType) search.set('actorType', params.actorType);
    if (params?.actorId) search.set('actorId', params.actorId);
    if (params?.action) search.set('action', params.action);
    if (params?.entityType) search.set('entityType', params.entityType);
    if (params?.from) search.set('from', params.from);
    if (params?.to) search.set('to', params.to);
    const query = search.toString();
    return request<any[]>(
      ADMIN_API_BASE_URL,
      `/audit${query ? `?${query}` : ''}`,
      {},
      { admin: true }
    );
  },

  getHeldTopups: async () => {
    return request<any[]>(ADMIN_API_BASE_URL, '/transactions/held-topups', {}, { admin: true });
  },

  approveHeldTopup: async (reference: string) => {
    return request<{ message: string }>(
      ADMIN_API_BASE_URL,
      `/transactions/held-topups/${reference}/approve`,
      { method: 'POST', headers: { 'X-Idempotency-Key': createIdempotencyKey() } },
      { admin: true }
    );
  },

  rejectHeldTopup: async (reference: string) => {
    return request<{ message: string }>(
      ADMIN_API_BASE_URL,
      `/transactions/held-topups/${reference}/reject`,
      { method: 'POST' },
      { admin: true }
    );
  },

  getAdminAdjustments: async (status?: string) => {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    return request<any[]>(ADMIN_API_BASE_URL, `/finance/adjustments${query}`, {}, { admin: true });
  },

  requestAdminAdjustment: async (payload: {
    userId: string;
    type: 'credit' | 'debit';
    amount: number;
    reason?: string;
  }) => {
    return request<{ message: string }>(
      ADMIN_API_BASE_URL,
      '/finance/adjustments',
      { method: 'POST', body: JSON.stringify(payload) },
      { admin: true }
    );
  },

  approveAdminAdjustment: async (id: string) => {
    return request<{ message: string }>(
      ADMIN_API_BASE_URL,
      `/finance/adjustments/${id}/approve`,
      { method: 'POST', headers: { 'X-Idempotency-Key': createIdempotencyKey() } },
      { admin: true }
    );
  },

  rejectAdminAdjustment: async (id: string) => {
    return request<{ message: string }>(
      ADMIN_API_BASE_URL,
      `/finance/adjustments/${id}/reject`,
      { method: 'POST' },
      { admin: true }
    );
  },

  getConversations: async () => {
    return request<any[]>(ADMIN_API_BASE_URL, '/conversations', {}, { admin: true });
  },

  getConversationMessages: async (id: string) => {
    return request<any[]>(
      ADMIN_API_BASE_URL,
      `/conversations/${id}/messages`,
      {},
      { admin: true }
    );
  },

  sendConversationMessage: async (id: string, text: string) => {
    return request<any>(
      ADMIN_API_BASE_URL,
      `/conversations/${id}/send`,
      { method: 'POST', body: JSON.stringify({ text }) },
      { admin: true }
    );
  },

  sendNotification: async (payload: {
    title: string;
    body: string;
    type?: string;
    userId?: string;
    force?: boolean;
    data?: Record<string, any>;
  }) => {
    return request<{ message: string }>(
      ADMIN_API_BASE_URL,
      '/notifications',
      { method: 'POST', body: JSON.stringify(payload) },
      { admin: true }
    );
  },

  getBillPricing: async () => {
    return request<AdminBillPricing[]>(ADMIN_API_BASE_URL, '/bills/pricing', {}, { admin: true });
  },

  updateBillPricing: async (
    id: string,
    payload: {
      baseFee: number;
      markupType: 'flat' | 'percent';
      markupValue: number;
      currency: string;
      active: boolean;
    }
  ) => {
    return request<{ message: string }>(
      ADMIN_API_BASE_URL,
      `/bills/pricing/${id}`,
      { method: 'PUT', body: JSON.stringify(payload) },
      { admin: true }
    );
  },

  getBillProviders: async () => {
    return request<AdminBillProvider[]>(ADMIN_API_BASE_URL, '/bills/providers', {}, { admin: true });
  },

  updateBillProvider: async (
    id: string,
    payload: { name: string; code: string; logoUrl?: string; active: boolean }
  ) => {
    return request<{ message: string }>(
      ADMIN_API_BASE_URL,
      `/bills/providers/${id}`,
      { method: 'PUT', body: JSON.stringify(payload) },
      { admin: true }
    );
  },

  getVtpassEvents: async (params?: { limit?: number; offset?: number; status?: string }) => {
    const search = new URLSearchParams();
    if (params?.limit) search.set('limit', String(params.limit));
    if (params?.offset) search.set('offset', String(params.offset));
    if (params?.status) search.set('status', params.status);
    const query = search.toString();
    return request<any[]>(ADMIN_API_BASE_URL, `/vtpass/events${query ? `?${query}` : ''}`, {}, { admin: true });
  },

  requeryVtpass: async (requestId: string) => {
    return request<{ message: string }>(
      ADMIN_API_BASE_URL,
      '/vtpass/requery',
      { method: 'POST', body: JSON.stringify({ requestId }) },
      { admin: true }
    );
  },

  requeryFlutterwaveVirtualAccount: async (payload: { userId?: string; accountReference?: string }) => {
    return request<any>(
      ADMIN_API_BASE_URL,
      '/flutterwave/virtual-accounts/requery',
      { method: 'POST', body: JSON.stringify(payload) },
      { admin: true }
    );
  },
};

export const tokenStore = {
  clear: () => {
    // CSRF tokens cleared via httpOnly cookies
  },
  getDeviceId,
};
