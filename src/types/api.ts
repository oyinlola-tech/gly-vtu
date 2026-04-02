export type User = {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  totp_enabled?: boolean;
  kyc_level: number;
  kyc_status?: string;
  account_number?: string;
  bank_name?: string;
  created_at: string;
  updated_at: string;
  last_activity_at?: string;
};

export type Transaction = {
  id: string;
  type: string;
  amount: number;
  fee: number;
  status: string;
  description: string;
  created_at: string;
  updated_at: string;
  reference?: string;
  total?: number;
  createdAt?: string;
  completed_at?: string;
  completedAt?: string;
  failureReason?: string;
  metadata?: unknown;
  full_name?: string;
  vtpass_status?: string;
  provider?: string;
  account?: string;
  recipient_name?: string;
  recipient_bank?: string;
  recipient?: {
    name?: string;
    account?: string;
    bank?: string;
  };
};

export type WalletInfo = {
  balance: number;
  currency: string;
  lastUpdated?: string;
  accountNumber?: string;
  bankCode?: string;
  updated_at?: string;
  account_number?: string;
  bank_code?: string;
};

export type TopupOption = {
  id: string;
  name: string;
  amount: number;
  currency: string;
  provider?: string;
  minAmount?: number;
  maxAmount?: number;
  fee?: number;
  processingTime?: string;
};

export type SecurityStatus = {
  pinSet?: boolean;
  totpEnabled?: boolean;
  twoFactorEnabled?: boolean;
  backupCodesGenerated?: boolean;
  devicesCount?: number;
  lastActivityAt?: string;
  biometricEnabled?: boolean;
  securityQuestionEnabled?: boolean;
  loginFailedAttempts?: number;
  passwordUpdatedAt?: string | null;
  recentLogins?: Array<{
    ip: string | null;
    userAgent: string | null;
    lastSeen: string | null;
  }>;
  securityEvents?: Array<{
    id: string;
    type: string;
    title: string;
    description?: string;
    severity?: 'low' | 'medium' | 'high' | 'critical';
    createdAt: string;
    ipAddress?: string;
    userAgent?: string;
  }>;
  suspiciousActivities?: Array<{
    id: string;
    type: string;
    message: string;
    ip: string;
    timestamp: string;
    severity: 'low' | 'medium' | 'high';
  }>;
};

export type SecurityAlert = {
  id: string;
  type: string;
  message: string;
  created_at: string;
};

export type Session = {
  id: string;
  device: string;
  ip: string;
  last_active: string;
  current: boolean;
};

export type KYCLimits = {
  level: number;
  daily_limit: number;
  monthly_limit: number;
  currency: string;
};

export type TOTPSetup = {
  secret: string;
  qrCode: string;
};

export type Bank = {
  id: string;
  name: string;
  code: string;
  logo_url?: string;
};

export type ConversationMessage = {
  id: string;
  body: string;
  sender_type: 'user' | 'admin';
  created_at: string;
};

export type Conversation = {
  id: string;
  user_id?: string;
  full_name?: string;
  email?: string;
  last_message?: string;
  updated_at?: string;
};

export type SecurityQuestion = {
  id: string;
  question: string;
  enabled?: boolean;
};

export type SendMoneyResponse = {
  id: string;
  status: string;
  message?: string;
};

export type RecipientLookupResponse = {
  found: boolean;
  recipient?: {
    id: string;
    fullName?: string;
    emailMasked?: string;
    phoneMasked?: string;
    hasFlutterwaveAccount?: boolean;
    bankName?: string;
  };
};
