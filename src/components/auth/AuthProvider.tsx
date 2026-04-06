'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';

// =====================================================
// 类型定义
// =====================================================

export interface User {
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
  lastLoginTime: Date | null;
  createdAt: Date | null;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
}

// =====================================================
// Context
// =====================================================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// =====================================================
// Auth Provider
// =====================================================

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const isAuthenticated = user !== null;

  // 获取当前用户信息
  const fetchUser = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include',
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setUser(result.data);
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Fetch user error:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 初始化时获取用户信息
  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // 登录
  const login = useCallback(async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      const result = await response.json();

      if (result.success && result.data) {
        setUser(result.data.user);
        return { success: true };
      } else {
        return { success: false, error: result.error || '登录失败' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: '网络错误，请稍后重试' };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 登出
  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      router.push('/login');
    }
  }, [router]);

  // 刷新用户信息
  const refreshUser = useCallback(async () => {
    await fetchUser();
  }, [fetchUser]);

  // 检查权限
  const hasPermission = useCallback((permission: string): boolean => {
    if (!user) return false;
    if (user.permissions.includes('*')) return true;
    return user.permissions.includes(permission);
  }, [user]);

  // 检查是否有任一权限
  const hasAnyPermission = useCallback((permissions: string[]): boolean => {
    return permissions.some((p) => hasPermission(p));
  }, [hasPermission]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated,
        login,
        logout,
        refreshUser,
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
  children: ReactNode;
  permissions?: string[];
  fallback?: ReactNode;
}

export function RequireAuth({ children, permissions = [], fallback = null }: RequireAuthProps) {
  const { isAuthenticated, isLoading, hasAnyPermission } = useAuth();

  if (isLoading) {
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
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">权限不足</h2>
          <p className="text-muted-foreground">您没有访问此页面的权限</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// =====================================================
// 使用示例
// =====================================================

/**
 * 在 layout.tsx 中使用：
 * 
 * import { AuthProvider } from '@/components/auth/AuthProvider';
 * 
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         <AuthProvider>
 *           {children}
 *         </AuthProvider>
 *       </body>
 *     </html>
 *   );
 * }
 * 
 * 在组件中使用：
 * 
 * import { useAuth } from '@/components/auth/AuthProvider';
 * 
 * function MyComponent() {
 *   const { user, isAuthenticated, hasPermission } = useAuth();
 *   
 *   if (!isAuthenticated) {
 *     return <div>请先登录</div>;
 *   }
 *   
 *   return (
 *     <div>
 *       <h1>欢迎, {user?.realName}</h1>
 *       {hasPermission('settings:view') && <SettingsButton />}
 *     </div>
 *   );
 * }
 */
