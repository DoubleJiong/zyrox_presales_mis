'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

// =====================================================
// 类型定义
// =====================================================

export interface Permission {
  key: string;
  label: string;
}

export interface PermissionGroup {
  name: string;
  permissions: Permission[];
}

export interface UserPermissions {
  id: number;
  username: string;
  realName: string;
  email: string;
  roleCode: string | null;
  permissions: string[];
  isSuperAdmin: boolean;
}

interface PermissionContextType {
  user: UserPermissions | null;
  isLoading: boolean;
  hasPermission: (permission: string) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  refreshPermissions: () => Promise<void>;
}

// =====================================================
// Context
// =====================================================

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

function matchesPermission(grantedPermission: string, requiredPermission: string): boolean {
  if (grantedPermission === '*' || grantedPermission === requiredPermission) {
    return true;
  }

  if (!grantedPermission.endsWith(':*')) {
    return false;
  }

  const namespace = grantedPermission.slice(0, -2);
  return requiredPermission === namespace || requiredPermission.startsWith(`${namespace}:`);
}

function hasMatchingPermission(user: UserPermissions | null, requiredPermission: string): boolean {
  if (!user) {
    return false;
  }

  if (user.isSuperAdmin) {
    return true;
  }

  return user.permissions.some(permission => matchesPermission(permission, requiredPermission));
}

// =====================================================
// Provider
// =====================================================

interface PermissionProviderProps {
  children: ReactNode;
  initialUser?: UserPermissions | null;
}

export function PermissionProvider({ children, initialUser = null }: PermissionProviderProps) {
  const [user, setUser] = useState<UserPermissions | null>(initialUser);
  const [isLoading, setIsLoading] = useState(!initialUser);

  // 获取用户权限
  const fetchPermissions = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/permissions');
      if (response.ok) {
        const data = await response.json();
        setUser(data.data);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Failed to fetch permissions:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 初始化
  useEffect(() => {
    if (!initialUser) {
      fetchPermissions();
    }
  }, [initialUser, fetchPermissions]);

  // 检查单个权限
  const hasPermission = useCallback(
    (permission: string): boolean => {
      return hasMatchingPermission(user, permission);
    },
    [user]
  );

  // 检查所有权限
  const hasAllPermissions = useCallback(
    (permissions: string[]): boolean => {
      if (!user) return false;
      return permissions.every(permission => hasMatchingPermission(user, permission));
    },
    [user]
  );

  // 检查任一权限
  const hasAnyPermission = useCallback(
    (permissions: string[]): boolean => {
      if (!user) return false;
      return permissions.some(permission => hasMatchingPermission(user, permission));
    },
    [user]
  );

  // 刷新权限
  const refreshPermissions = useCallback(async () => {
    setIsLoading(true);
    await fetchPermissions();
  }, [fetchPermissions]);

  return (
    <PermissionContext.Provider
      value={{
        user,
        isLoading,
        hasPermission,
        hasAllPermissions,
        hasAnyPermission,
        refreshPermissions,
      }}
    >
      {children}
    </PermissionContext.Provider>
  );
}

// =====================================================
// Hook
// =====================================================

export function usePermissions() {
  const context = useContext(PermissionContext);
  if (context === undefined) {
    throw new Error('usePermissions must be used within a PermissionProvider');
  }
  return context;
}

// =====================================================
// 权限检查组件
// =====================================================

interface RequirePermissionProps {
  permission: string | string[];
  mode?: 'any' | 'all';
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * 权限检查组件
 * 只有拥有指定权限时才渲染子组件
 */
export function RequirePermission({
  permission,
  mode = 'any',
  children,
  fallback = null,
}: RequirePermissionProps) {
  const { hasPermission, hasAllPermissions, hasAnyPermission } = usePermissions();

  const permissions = Array.isArray(permission) ? permission : [permission];

  const hasAccess = mode === 'all'
    ? hasAllPermissions(permissions)
    : hasAnyPermission(permissions);

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

// =====================================================
// 权限按钮组件
// =====================================================

import { Button } from '@/components/ui/button';
import type { ComponentProps } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type ButtonProps = ComponentProps<typeof Button>;

interface PermissionButtonProps extends ButtonProps {
  permission: string | string[];
  mode?: 'any' | 'all';
  hideWhenNoPermission?: boolean;
  tooltipText?: string;
  children: React.ReactNode;
}

/**
 * 带权限检查的按钮组件
 */
export function PermissionButton({
  permission,
  mode = 'any',
  hideWhenNoPermission = false,
  tooltipText = '您没有此操作的权限',
  children,
  ...buttonProps
}: PermissionButtonProps) {
  const { hasPermission, hasAllPermissions, hasAnyPermission } = usePermissions();

  const permissions = Array.isArray(permission) ? permission : [permission];

  const hasAccess = mode === 'all'
    ? hasAllPermissions(permissions)
    : hasAnyPermission(permissions);

  if (!hasAccess && hideWhenNoPermission) {
    return null;
  }

  if (!hasAccess) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button {...buttonProps} disabled>
              {children}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{tooltipText}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return <Button {...buttonProps}>{children}</Button>;
}

// =====================================================
// 权限菜单项组件
// =====================================================

import { cn } from '@/lib/utils';

interface PermissionMenuItemProps {
  permission: string | string[];
  mode?: 'any' | 'all';
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

/**
 * 带权限检查的菜单项组件
 */
export function PermissionMenuItem({
  permission,
  mode = 'any',
  children,
  className,
  onClick,
}: PermissionMenuItemProps) {
  const { hasPermission, hasAllPermissions, hasAnyPermission } = usePermissions();

  const permissions = Array.isArray(permission) ? permission : [permission];

  const hasAccess = mode === 'all'
    ? hasAllPermissions(permissions)
    : hasAnyPermission(permissions);

  if (!hasAccess) {
    return null;
  }

  return (
    <div
      className={cn('cursor-pointer', className)}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

// =====================================================
// 权限页面组件
// =====================================================

interface RequireAuthProps {
  permissions?: string[];
  mode?: 'any' | 'all';
  children: ReactNode;
  loading?: ReactNode;
  unauthorized?: ReactNode;
}

/**
 * 页面级权限控制组件
 */
export function RequireAuth({
  permissions = [],
  mode = 'any',
  children,
  loading = <div className="flex items-center justify-center min-h-[400px]">加载中...</div>,
  unauthorized = (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <h2 className="text-2xl font-bold">无访问权限</h2>
      <p className="text-muted-foreground">您没有权限访问此页面</p>
    </div>
  ),
}: RequireAuthProps) {
  const { user, isLoading, hasAllPermissions, hasAnyPermission } = usePermissions();

  if (isLoading) {
    return <>{loading}</>;
  }

  if (!user) {
    return <>{unauthorized}</>;
  }

  if (permissions.length > 0) {
    const hasAccess = mode === 'all'
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions);

    if (!hasAccess) {
      return <>{unauthorized}</>;
    }
  }

  return <>{children}</>;
}

// =====================================================
// 导出
// =====================================================

export { PERMISSIONS, PERMISSION_GROUPS } from '@/lib/permissions';
