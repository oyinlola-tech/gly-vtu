import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { authAPI, userAPI, tokenStore } from '../services/api';

interface User {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  accountNumber?: string;
  bankName?: string;
  kycLevel?: number;
  kycStatus?: string;
  hasPin?: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (
    email: string,
    password: string,
    totp?: string,
    backupCode?: string
  ) => Promise<{ otpRequired?: boolean; totpRequired?: boolean; email?: string; needsPin?: boolean }>;
  register: (data: RegisterPayload) => Promise<void>;
  logout: () => void;
  verifyPin: (pin: string) => Promise<boolean>;
  setUser: (user: User) => void;
  refreshProfile: () => Promise<void>;
}

type RegisterPayload = {
  email: string;
  phone: string;
  password: string;
  firstName: string;
  lastName: string;
  bvn?: string;
  nin?: string;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const isAuthenticated = !!user;

  const refreshProfile = useCallback(async () => {
    try {
      const profile = await userAPI.getProfile();
      const security = await userAPI.getSecurityStatus();
      setUser({
        id: profile.id,
        fullName: profile.full_name,
        email: profile.email,
        phone: profile.phone,
        accountNumber: profile.account_number,
        bankName: profile.bank_name,
        kycLevel: profile.kyc_level,
        kycStatus: profile.kyc_status,
        hasPin: security?.pinSet,
      });
    } catch {
      tokenStore.clear();
      setUser(null);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      refreshProfile();
    }
  }, [user, refreshProfile]);

  const login = async (email: string, password: string, totp?: string, backupCode?: string) => {
    const response = await authAPI.login({ email, password, totp, backupCode });
    if (response?.otpRequired) {
      return { otpRequired: true, email };
    }
    if (response?.totpRequired) {
      return { totpRequired: true, email };
    }
    const profile = await userAPI.getProfile();
    const security = await userAPI.getSecurityStatus();
    const mappedUser = {
      id: profile.id,
      fullName: profile.full_name,
      email: profile.email,
      phone: profile.phone,
      accountNumber: profile.account_number,
      bankName: profile.bank_name,
      kycLevel: profile.kyc_level,
      kycStatus: profile.kyc_status,
      hasPin: security?.pinSet,
    };
    setUser(mappedUser);
    return { needsPin: !security?.pinSet };
  };

  const register = async (data: RegisterPayload) => {
    await authAPI.register(data);
  };

  const logout = () => {
    setUser(null);
    tokenStore.clear();
    authAPI.logout().catch(() => null);
  };

  const verifyPin = async (pin: string): Promise<boolean> => {
    try {
      const response = await userAPI.verifyPin(pin);
      return response.valid;
    } catch {
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated, login, register, logout, verifyPin, setUser, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
