import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { adminAPI } from '../services/api';

interface Admin {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AdminAuthContextType {
  admin: Admin | null;
  isAdmin: boolean;
  checking: boolean;
  login: (email: string, password: string, totp?: string) => Promise<any>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [checking, setChecking] = useState(true);

  const refresh = async () => {
    try {
      const profile = await adminAPI.me();
      setAdmin(profile);
    } catch {
      setAdmin(null);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const login = async (email: string, password: string, totp?: string) => {
    const response = await adminAPI.login({ email, password, totp });
    if (response?.admin) {
      setAdmin(response.admin);
    }
    return response;
  };

  const logout = () => {
    adminAPI.logout().catch(() => null);
    setAdmin(null);
  };

  return (
    <AdminAuthContext.Provider
      value={{
        admin,
        isAdmin: !!admin,
        checking,
        login,
        logout,
        refresh,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within AdminAuthProvider');
  }
  return context;
}
