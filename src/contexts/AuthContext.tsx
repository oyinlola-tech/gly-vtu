import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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

function getPersistableUser(user: User | null): Omit<User, 'accountNumber'> | null {
  if (!user) return null;
  const { accountNumber, ...rest } = user;
  return rest;
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
  register: (data: any) => Promise<void>;
  logout: () => void;
  verifyPin: (pin: string) => Promise<boolean>;
  setUser: (user: User) => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    // NOTE: User data is now stored in sessionStorage (not localStorage)
    // sessionStorage is cleared when the browser tab closes, reducing XSS attack surface
    // Full profile will be fetched from /api/user/profile on app load
    const saved = sessionStorage.getItem('user');
    return saved ? (JSON.parse(saved) as Omit<User, 'accountNumber'>) : null;
  });

  const isAuthenticated = !!user;

  const refreshProfile = async () => {
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
    } catch (error) {
      tokenStore.clear();
      setUser(null);
    }
  };

  useEffect(() => {
    if (user) {
      const safeUser = getPersistableUser(user);
      // SECURITY: Store in sessionStorage (cleared on tab close) instead of localStorage
      // This reduces the window of opportunity for XSS attacks to steal user data
      sessionStorage.setItem('user', JSON.stringify(safeUser));
    } else {
      sessionStorage.removeItem('user');
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      refreshProfile();
    }
  }, []);

  const login = async (email: string, password: string, totp?: string, backupCode?: string) => {
    try {
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
    } catch (error) {
      throw error;
    }
  };

  const register = async (data: any) => {
    try {
      await authAPI.register(data);
    } catch (error) {
      throw error;
    }
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
    } catch (error) {
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
