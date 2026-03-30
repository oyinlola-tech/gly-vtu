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
  login: (email: string, password: string) => Promise<{ otpRequired?: boolean; email?: string; needsPin?: boolean }>;
  register: (data: any) => Promise<void>;
  logout: () => void;
  verifyPin: (pin: string) => Promise<boolean>;
  setUser: (user: User) => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('user');
    return saved ? (JSON.parse(saved) as Omit<User, 'accountNumber'>) : null;
  });

  const isAuthenticated = !!user;

  const refreshProfile = async () => {
    if (!tokenStore.getAccessToken()) return;
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
      // if token is invalid, clear
      tokenStore.clear();
      setUser(null);
    }
  };

  useEffect(() => {
    if (user) {
      const safeUser = getPersistableUser(user);
      localStorage.setItem('user', JSON.stringify(safeUser));
    } else {
      localStorage.removeItem('user');
    }
  }, [user]);

  useEffect(() => {
    if (!user && tokenStore.getAccessToken()) {
      refreshProfile();
    }
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await authAPI.login({ email, password });
      if (response?.otpRequired) {
        return { otpRequired: true, email };
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
