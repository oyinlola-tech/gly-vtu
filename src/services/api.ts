// API Service Layer for GLY VTU - Nigerian Fintech App
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.glyvtu.ng';

// Mock response helper for development
function mockResponse<T>(data: T, delay = 1000): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(data), delay);
  });
}

// ============= AUTHENTICATION APIs =============
export const authAPI = {
  register: async (data: { email: string; phone: string; password: string; firstName: string; lastName: string }) => {
    return mockResponse({
      success: true,
      user: {
        id: '123456',
        name: `${data.firstName} ${data.lastName}`,
        email: data.email,
        phone: data.phone,
        accountNumber: '8085472417',
        kycLevel: 0,
        hasPin: false,
      },
      token: 'mock-jwt-token-12345',
    });
  },

  login: async (data: { email: string; password: string }) => {
    return mockResponse({
      success: true,
      user: {
        id: '123456',
        name: 'Victor Jimoh',
        email: data.email,
        phone: '+2348085472417',
        accountNumber: '8085472417',
        kycLevel: 2,
        hasPin: true,
      },
      token: 'mock-jwt-token-12345',
    });
  },

  verifyDevice: async (data: { code: string; userId: string }) => {
    return mockResponse({ success: true, message: 'Device verified successfully' });
  },

  forgotPassword: async (data: { email: string }) => {
    return mockResponse({ success: true, message: 'OTP sent to your email' });
  },

  resetPassword: async (data: { email: string; otp: string; newPassword: string }) => {
    return mockResponse({ success: true, message: 'Password reset successfully' });
  },

  setPin: async (data: { pin: string }) => {
    return mockResponse({ success: true, message: 'PIN set successfully' });
  },

  verifyPin: async (data: { pin: string }) => {
    return mockResponse({
      success: data.pin === '1234',
      message: data.pin === '1234' ? 'PIN verified' : 'Invalid PIN',
    }, 500);
  },
};

// ============= USER APIs =============
export const userAPI = {
  getProfile: async () => {
    return mockResponse({
      success: true,
      user: {
        id: '123456',
        name: 'Victor Jimoh',
        email: 'victor@glyvtu.ng',
        phone: '+2348085472417',
        accountNumber: '8085472417',
        kycLevel: 2,
        hasPin: true,
        bvn: '22144455667',
        createdAt: '2024-01-15T10:30:00Z',
      },
    });
  },

  submitKYC: async (data: { level: 1 | 2; bvn?: string; nin?: string; address?: string; dateOfBirth?: string }) => {
    return mockResponse({
      success: true,
      message: 'KYC submitted successfully',
      kycLevel: data.level,
    });
  },

  updateProfile: async (data: any) => {
    return mockResponse({ success: true, message: 'Profile updated successfully' });
  },
};

// ============= WALLET APIs =============
export const walletAPI = {
  getBalance: async () => {
    return mockResponse({
      success: true,
      balance: 20000000.00,
      currency: 'NGN',
      lastUpdated: new Date().toISOString(),
    });
  },

  sendMoney: async (data: { recipientType: string; amount: number; recipient: string; bankCode?: string; narration?: string; pin: string }) => {
    return mockResponse({
      success: true,
      transaction: {
        id: 'TXN' + Date.now(),
        reference: 'NGS' + Math.random().toString(36).substring(2, 15),
        amount: data.amount,
        recipient: data.recipient,
        status: 'successful',
        timestamp: new Date().toISOString(),
      },
    }, 2000);
  },

  getTransactions: async (params?: any) => {
    return mockResponse({
      success: true,
      transactions: [
        { id: '1', type: 'credit', amount: 5000.00, description: 'Money received from Umaru Abubakar', recipient: 'Umaru Abubakar', status: 'successful', timestamp: '2024-03-29T09:33:00Z', reference: 'NGS000000667911237829202' },
        { id: '2', type: 'debit', amount: 2500.00, description: 'Transfer to NGOZI UCHE', recipient: 'NGOZI UCHE', bank: 'UNITED BANK OF AFRICA PLC', status: 'successful', timestamp: '2024-03-29T12:35:00Z', reference: 'NGS000000667911237829203' },
        { id: '3', type: 'debit', amount: 1000.00, description: 'MTN Airtime Purchase', recipient: '08012345678', status: 'successful', timestamp: '2024-03-28T15:20:00Z', reference: 'NGS000000667911237829204' },
      ],
      pagination: { page: params?.page || 1, limit: params?.limit || 20, total: 45, pages: 3 },
    });
  },

  getTransactionDetails: async (id: string) => {
    return mockResponse({
      success: true,
      transaction: {
        id, type: 'debit', amount: 2500.00, description: 'Transfer to Bank Account', recipient: 'NGOZI UCHE',
        bank: 'UNITED BANK OF AFRICA PLC', accountNumber: '2007895421', status: 'successful',
        timestamp: '2024-03-29T12:35:00Z', reference: 'NGS000000667911237829202', narration: 'Money for transport',
      },
    });
  },
};

// ============= BILLS PAYMENT APIs =============
export const billsAPI = {
  getProviders: async (type: string) => {
    const providers: Record<string, any[]> = {
      airtime: [
        { code: 'MTN', name: 'MTN Nigeria', logo: '📱' },
        { code: 'GLO', name: 'Glo Mobile', logo: '📱' },
        { code: 'AIRTEL', name: 'Airtel Nigeria', logo: '📱' },
        { code: '9MOBILE', name: '9mobile', logo: '📱' },
      ],
      data: [
        { code: 'MTN', name: 'MTN Nigeria', logo: '📱' },
        { code: 'GLO', name: 'Glo Mobile', logo: '📱' },
        { code: 'AIRTEL', name: 'Airtel Nigeria', logo: '📱' },
        { code: '9MOBILE', name: '9mobile', logo: '📱' },
      ],
      tv: [
        { code: 'DSTV', name: 'DSTV', logo: '📺' },
        { code: 'GOTV', name: 'GOtv', logo: '📺' },
        { code: 'STARTIMES', name: 'Startimes', logo: '📺' },
        { code: 'SHOWMAX', name: 'Showmax', logo: '📺' },
      ],
      electricity: [
        { code: 'EKEDC', name: 'Eko Electricity', logo: '⚡' },
        { code: 'IKEDC', name: 'Ikeja Electric', logo: '⚡' },
        { code: 'AEDC', name: 'Abuja Electricity', logo: '⚡' },
        { code: 'PHED', name: 'Port Harcourt Electric', logo: '⚡' },
      ],
    };
    return mockResponse({ success: true, providers: providers[type] || [] });
  },

  getDataPlans: async (provider: string) => {
    return mockResponse({
      success: true,
      plans: [
        { code: '1GB', name: '1GB - 1 Day', amount: 300 },
        { code: '2GB', name: '2GB - 7 Days', amount: 500 },
        { code: '5GB', name: '5GB - 30 Days', amount: 1500 },
        { code: '10GB', name: '10GB - 30 Days', amount: 2500 },
        { code: '20GB', name: '20GB - 30 Days', amount: 4000 },
      ],
    });
  },

  buyAirtime: async (data: { network: string; phone: string; amount: number; pin: string }) => {
    return mockResponse({
      success: true,
      transaction: {
        id: 'TXN' + Date.now(),
        reference: 'NGS' + Math.random().toString(36).substring(2, 15),
        network: data.network,
        phone: data.phone,
        amount: data.amount,
        status: 'successful',
        timestamp: new Date().toISOString(),
      },
    }, 2000);
  },

  buyData: async (data: { network: string; phone: string; plan: string; amount: number; pin: string }) => {
    return mockResponse({
      success: true,
      transaction: {
        id: 'TXN' + Date.now(),
        reference: 'NGS' + Math.random().toString(36).substring(2, 15),
        network: data.network,
        phone: data.phone,
        plan: data.plan,
        amount: data.amount,
        status: 'successful',
        timestamp: new Date().toISOString(),
      },
    }, 2000);
  },
};

// ============= BANKS APIs =============
export const banksAPI = {
  getBanks: async () => {
    return mockResponse({
      success: true,
      banks: [
        { code: 'UBA', name: 'United Bank of Africa', logo: '🏦' },
        { code: 'GTB', name: 'GTBank', logo: '🏦' },
        { code: 'ACCESS', name: 'Access Bank', logo: '🏦' },
        { code: 'ZENITH', name: 'Zenith Bank', logo: '🏦' },
        { code: 'FIRSTBANK', name: 'First Bank', logo: '🏦' },
      ],
    });
  },

  resolveAccount: async (data: { accountNumber: string; bankCode: string }) => {
    return mockResponse({
      success: true,
      accountName: 'VICTOR JIMOH',
      accountNumber: data.accountNumber,
      bankCode: data.bankCode,
    }, 1500);
  },
};

// ============= ADMIN APIs =============
export const adminAPI = {
  login: async (data: { email: string; password: string }) => {
    return mockResponse({
      success: true,
      admin: { id: 'admin123', name: 'Admin User', email: data.email, role: 'super_admin' },
      token: 'mock-admin-token-12345',
    });
  },

  getFinanceOverview: async () => {
    return mockResponse({
      success: true,
      data: { totalBalance: 150000000, totalUsers: 12450, totalTransactions: 45678, revenue: 5000000 },
    });
  },

  getUsers: async () => {
    return mockResponse({
      success: true,
      users: [{ id: '1', name: 'Victor Jimoh', email: 'victor@example.com', phone: '+2348085472417', kycLevel: 2, balance: 20000000, status: 'active' }],
    });
  },
};

export default {
  auth: authAPI,
  user: userAPI,
  wallet: walletAPI,
  bills: billsAPI,
  banks: banksAPI,
  admin: adminAPI,
};
