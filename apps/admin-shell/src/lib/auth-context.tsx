import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Message } from '@arco-design/web-react';
import { http } from './http';

export type AdminUser = {
  id: string;
  username: string;
  status: string;
};

type AuthContextValue = {
  admin: AdminUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const response = await http.get('/session/me');
      setAdmin(response.data.admin ?? null);
    } catch {
      setAdmin(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const response = await http.post('/session/login', {
        username,
        password,
      });
      setAdmin(response.data.admin);
      Message.success('登录成功');
    } catch (error: any) {
      Message.error(error?.response?.data?.message || '登录失败，请检查用户名和密码');
      throw error;
    }
  };

  const logout = async () => {
    await http.post('/session/logout');
    setAdmin(null);
    Message.success('已退出登录');
  };

  const value = useMemo(
    () => ({
      admin,
      loading,
      login,
      logout,
      refresh,
    }),
    [admin, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth 必须在 AuthProvider 内使用');
  }
  return context;
}
