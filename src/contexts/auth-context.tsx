'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// =====================================================
// 类型定义
// =====================================================

interface User {
  id: number;
  username: string;
  email: string;
  realName: string;
  phone: string | null;
  department: string | null;
  avatar: string | null;
  roleId: number | null;
  roleCode: string | null;
  roleName: string | null;
  permissions: string[];
  status: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  loading: boolean;
  isAuthenticated: boolean;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
}

// =====================================================
// Helper - 安全访问 localStorage
// =====================================================
const safeLocalStorage = {
  getItem: (key: string): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(key);
  },
  setItem: (key: string, value: string): void => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(key, value);
  },
  removeItem: (key: string): void => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(key);
  },
};

// =====================================================
// Context
// =====================================================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// =====================================================
// Auth Provider
// =====================================================

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  const isAuthenticated = user !== null;

  // 客户端挂载
  useEffect(() => {
    setMounted(true);
  }, []);

  // 获取用户信息的函数
  const fetchCurrentUser = useCallback(async () => {
    if (!mounted) return;
    
    try {
      const storedToken = safeLocalStorage.getItem('token');
      if (!storedToken) {
        setLoading(false);
        return;
      }

      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${storedToken}`,
        },
        credentials: 'include',
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setUser(result.data);
          setToken(storedToken);
        } else {
          // Token无效，尝试刷新
          const refreshed = await refreshToken();
          if (!refreshed) {
            clearAuth();
          }
        }
      } else if (response.status === 401) {
        // Token过期，尝试刷新
        const refreshed = await refreshToken();
        if (!refreshed) {
          clearAuth();
        }
      }
    } catch (error) {
      console.error('Fetch user error:', error);
    } finally {
      setLoading(false);
    }
  }, [mounted]);

  // 刷新Token
  const refreshToken = async (): Promise<boolean> => {
    try {
      const storedRefreshToken = safeLocalStorage.getItem('refresh_token');
      if (!storedRefreshToken) {
        return false;
      }

      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: storedRefreshToken }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          safeLocalStorage.setItem('token', result.data.accessToken);
          if (result.data.refreshToken) {
            safeLocalStorage.setItem('refresh_token', result.data.refreshToken);
          }
          setToken(result.data.accessToken);
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Refresh token error:', error);
      return false;
    }
  };

  // 清除认证信息
  const clearAuth = useCallback(() => {
    safeLocalStorage.removeItem('token');
    safeLocalStorage.removeItem('refresh_token');
    safeLocalStorage.removeItem('user');
    setUser(null);
    setToken(null);
  }, []);

  // 初始化 - 只在客户端挂载后执行
  useEffect(() => {
    if (mounted) {
      fetchCurrentUser();
    }
  }, [mounted, fetchCurrentUser]);

  // 登录
  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setLoading(true);
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        return false;
      }

      // 保存到 localStorage
      safeLocalStorage.setItem('token', data.data.accessToken);
      safeLocalStorage.setItem('refresh_token', data.data.refreshToken);

      // 更新状态
      setToken(data.data.accessToken);
      setUser(data.data.user);

      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // 登出
  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      clearAuth();
      router.push('/login');
    }
  };

  // 刷新用户信息
  const refreshUser = async () => {
    await fetchCurrentUser();
  };

  // 检查权限
  const hasPermission = useCallback((permission: string): boolean => {
    if (!user) return false;
    if (user.permissions.includes('*')) return true;
    return user.permissions.includes(permission);
  }, [user]);

  // 检查是否有任一权限
  const hasAnyPermission = useCallback((permissions: string[]): boolean => {
    if (!user) return false;
    if (user.permissions.includes('*')) return true;
    return permissions.some((p) => user.permissions.includes(p));
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        refreshUser,
        loading,
        isAuthenticated,
        hasPermission,
        hasAnyPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// =====================================================
// Hook
// =====================================================

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// =====================================================
// 权限守卫组件
// =====================================================

interface RequireAuthProps {
  children: React.ReactNode;
  permissions?: string[];
  fallback?: React.ReactNode;
}

export function RequireAuth({ children, permissions = [], fallback }: RequireAuthProps) {
  const { isAuthenticated, loading, hasAnyPermission } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    return null;
  }

  if (permissions.length > 0 && !hasAnyPermission(permissions)) {
    return fallback || (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-sm p-6">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-muted p-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
            </div>
          </div>
          <h2 className="text-xl font-semibold mb-2">没有访问权限</h2>
          <p className="text-sm text-muted-foreground mb-5">您没有权限访问此页面。如需申请权限，请联系系统管理员。</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => typeof window !== 'undefined' && window.history.back()} className="inline-flex items-center gap-1.5 rounded-md border bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors">返回上一页</button>
            <a href="/" className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">回到首页</a>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
