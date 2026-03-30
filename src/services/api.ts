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

const API_BASE_URL = import.meta.env.VITE_API_URL || '/app/api';
const ADMIN_API_BASE_URL = import.meta.env.VITE_ADMIN_API_URL || '/app/admin/api';

const ACCESS_TOKEN_KEY = 'gly_access_token';
const REFRESH_TOKEN_KEY = 'gly_refresh_token';
const ADMIN_TOKEN_KEY = 'gly_admin_token';
const DEVICE_ID_KEY = 'gly_device_id';

function getStoredToken(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function setStoredToken(key: string, value: string | null) {
  try {
    if (value) {
      localStorage.setItem(key, value);
    } else {
      localStorage.removeItem(key);
    }
  } catch {
    // ignore storage errors
  }
}

function getDeviceId() {
  let deviceId = getStoredToken(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    setStoredToken(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

async function parseResponse(res: Response) {
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return res.json();
  }
  return res.text();
}

async function refreshAccessToken() {
  const refreshToken = getStoredToken(REFRESH_TOKEN_KEY);
  const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ refreshToken }),
  });
  const data = await parseResponse(res);
  if (!res.ok) throw new Error(data?.error || 'Session expired');
  if (data?.accessToken) setStoredToken(ACCESS_TOKEN_KEY, data.accessToken);
  if (data?.refreshToken) setStoredToken(REFRESH_TOKEN_KEY, data.refreshToken);
  return data?.accessToken;
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
  if (auth) {
    const token = admin ? getStoredToken(ADMIN_TOKEN_KEY) : getStoredToken(ACCESS_TOKEN_KEY);
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${base}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (response.status === 401 && auth && !admin) {
    try {
      const newToken = await refreshAccessToken();
      const retryHeaders = { ...headers, Authorization: `Bearer ${newToken}` };
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

  login: async (data: { email: string; password: string; deviceId?: string }) => {
    const response = await request<any>(
      API_BASE_URL,
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          deviceId: data.deviceId || getDeviceId(),
        }),
      },
      { auth: false }
    );
    if (response?.accessToken) setStoredToken(ACCESS_TOKEN_KEY, response.accessToken);
    if (response?.refreshToken) setStoredToken(REFRESH_TOKEN_KEY, response.refreshToken);
    return response;
  },

  verifyDevice: async (data: {
    email: string;
    code?: string;
    deviceId?: string;
    label?: string;
    securityAnswer?: string;
  }) => {
    const response = await request<any>(
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
        }),
      },
      { auth: false }
    );
    if (response?.accessToken) setStoredToken(ACCESS_TOKEN_KEY, response.accessToken);
    if (response?.refreshToken) setStoredToken(REFRESH_TOKEN_KEY, response.refreshToken);
    return response;
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
    const refreshToken = getStoredToken(REFRESH_TOKEN_KEY);
    await request<{ message: string }>(
      API_BASE_URL,
      '/auth/logout',
      { method: 'POST', body: JSON.stringify({ refreshToken }) },
      { auth: false }
    );
    setStoredToken(ACCESS_TOKEN_KEY, null);
    setStoredToken(REFRESH_TOKEN_KEY, null);
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

  getSecurityStatus: async () => {
    return request<any>(API_BASE_URL, '/user/security');
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
    const token = getStoredToken(ACCESS_TOKEN_KEY);
    const res = await fetch(`${API_BASE_URL}/transactions/statement/download`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
      body: JSON.stringify(data),
    });
  },

  payWithCard: async (data: BillsPayCardRequest) => {
    return request<BillsPayCardResponse>(API_BASE_URL, '/bills/pay-card', {
      method: 'POST',
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
};

// ============= ADMIN APIs =============
export const adminAPI = {
  login: async (data: { email: string; password: string }) => {
    const response = await request<any>(
      ADMIN_API_BASE_URL,
      '/auth/login',
      { method: 'POST', body: JSON.stringify(data) },
      { auth: false, admin: true }
    );
    if (response?.accessToken) setStoredToken(ADMIN_TOKEN_KEY, response.accessToken);
    if (response?.refreshToken) setStoredToken(REFRESH_TOKEN_KEY, response.refreshToken);
    return response;
  },

  refresh: async () => {
    const refreshToken = getStoredToken(REFRESH_TOKEN_KEY);
    const response = await request<any>(
      ADMIN_API_BASE_URL,
      '/auth/refresh',
      { method: 'POST', body: JSON.stringify({ refreshToken }) },
      { auth: false, admin: true }
    );
    if (response?.accessToken) setStoredToken(ADMIN_TOKEN_KEY, response.accessToken);
    if (response?.refreshToken) setStoredToken(REFRESH_TOKEN_KEY, response.refreshToken);
    return response;
  },

  logout: async () => {
    const refreshToken = getStoredToken(REFRESH_TOKEN_KEY);
    await request<any>(
      ADMIN_API_BASE_URL,
      '/auth/logout',
      { method: 'POST', body: JSON.stringify({ refreshToken }) },
      { auth: false, admin: true }
    );
    setStoredToken(ADMIN_TOKEN_KEY, null);
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
  getAccessToken: () => getStoredToken(ACCESS_TOKEN_KEY),
  getAdminToken: () => getStoredToken(ADMIN_TOKEN_KEY),
  clear: () => {
    setStoredToken(ACCESS_TOKEN_KEY, null);
    setStoredToken(REFRESH_TOKEN_KEY, null);
    setStoredToken(ADMIN_TOKEN_KEY, null);
  },
  getDeviceId,
};
