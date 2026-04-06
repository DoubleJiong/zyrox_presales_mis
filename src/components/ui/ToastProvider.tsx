'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { AlertCircle, CheckCircle, Info, X, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

// =====================================================
// 类型定义
// =====================================================

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
  success: (title: string, message?: string) => string;
  error: (title: string, message?: string) => string;
  warning: (title: string, message?: string) => string;
  info: (title: string, message?: string) => string;
}

// =====================================================
// Context
// =====================================================

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// =====================================================
// Toast Provider
// =====================================================

interface ToastProviderProps {
  children: ReactNode;
  maxToasts?: number;
}

export function ToastProvider({ children, maxToasts = 5 }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback(
    (toast: Omit<Toast, 'id'>) => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const newToast: Toast = {
        ...toast,
        id,
        duration: toast.duration ?? 5000,
      };

      setToasts((prev) => {
        const updated = [...prev, newToast];
        return updated.slice(-maxToasts);
      });

      // 自动移除
      if (newToast.duration && newToast.duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, newToast.duration);
      }

      return id;
    },
    [maxToasts, removeToast]
  );

  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  const success = useCallback(
    (title: string, message?: string) => addToast({ type: 'success', title, message }),
    [addToast]
  );

  const error = useCallback(
    (title: string, message?: string) => addToast({ type: 'error', title, message, duration: 8000 }),
    [addToast]
  );

  const warning = useCallback(
    (title: string, message?: string) => addToast({ type: 'warning', title, message }),
    [addToast]
  );

  const info = useCallback(
    (title: string, message?: string) => addToast({ type: 'info', title, message }),
    [addToast]
  );

  return (
    <ToastContext.Provider
      value={{ toasts, addToast, removeToast, clearToasts, success, error, warning, info }}
    >
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

// =====================================================
// Hook
// =====================================================

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

// =====================================================
// Toast Container
// =====================================================

interface ToastContainerProps {
  toasts: Toast[];
  removeToast: (id: string) => void;
}

function ToastContainer({ toasts, removeToast }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-0 right-0 z-[100] flex flex-col gap-2 p-4 max-w-md w-full pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
}

// =====================================================
// Toast Item
// =====================================================

interface ToastItemProps {
  toast: Toast;
  onClose: () => void;
}

const toastIcons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle className="h-5 w-5 text-green-500" />,
  error: <AlertCircle className="h-5 w-5 text-red-500" />,
  warning: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
  info: <Info className="h-5 w-5 text-blue-500" />,
};

const toastStyles: Record<ToastType, string> = {
  success: 'border-green-500/50 bg-green-50 dark:bg-green-950',
  error: 'border-red-500/50 bg-red-50 dark:bg-red-950',
  warning: 'border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950',
  info: 'border-blue-500/50 bg-blue-50 dark:bg-blue-950',
};

function ToastItem({ toast, onClose }: ToastItemProps) {
  return (
    <div
      className={cn(
        'pointer-events-auto flex items-start gap-3 p-4 rounded-lg border shadow-lg animate-in slide-in-from-right-full',
        toastStyles[toast.type]
      )}
    >
      {toastIcons[toast.type]}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">{toast.title}</p>
        {toast.message && (
          <p className="text-sm text-muted-foreground mt-1">{toast.message}</p>
        )}
        {toast.action && (
          <button
            onClick={toast.action.onClick}
            className="text-sm font-medium text-primary hover:underline mt-2"
          >
            {toast.action.label}
          </button>
        )}
      </div>
      <button
        onClick={onClose}
        className="text-muted-foreground hover:text-foreground transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

// =====================================================
// 全局错误处理
// =====================================================

export interface AppError {
  code: string;
  message: string;
  details?: unknown;
  stack?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: AppError | null;
}

export function parseError(error: unknown): AppError {
  if (error instanceof Error) {
    return {
      code: 'UNKNOWN_ERROR',
      message: error.message || '发生未知错误',
      stack: error.stack,
    };
  }

  if (typeof error === 'object' && error !== null) {
    const err = error as Record<string, unknown>;
    return {
      code: (err.code as string) || 'UNKNOWN_ERROR',
      message: (err.message as string) || '发生未知错误',
      details: err.details,
    };
  }

  return {
    code: 'UNKNOWN_ERROR',
    message: String(error) || '发生未知错误',
  };
}

// =====================================================
// API错误处理
// =====================================================

export interface ApiError {
  status: number;
  code: string;
  message: string;
  details?: unknown;
}

export function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    'code' in error &&
    'message' in error
  );
}

export function handleApiError(error: unknown, showToast = true): AppError {
  const appError = parseError(error);

  if (showToast && typeof window !== 'undefined') {
    // 延迟加载toast，避免循环依赖
    import('./ToastProvider').then(({ useToast }) => {
      // 这里需要通过全局事件或其他方式触发toast
    });
  }

  return appError;
}

// =====================================================
// 错误消息映射
// =====================================================

export const ERROR_MESSAGES: Record<string, string> = {
  // 认证相关
  UNAUTHORIZED: '请先登录',
  FORBIDDEN: '没有访问权限',
  INVALID_TOKEN: '登录已过期，请重新登录',
  LOGIN_FAILED: '用户名或密码错误',

  // 验证相关
  VALIDATION_ERROR: '数据验证失败',
  MISSING_ID: 'ID不能为空',
  INVALID_ID: '无效的ID',

  // 资源相关
  NOT_FOUND: '资源不存在',
  DUPLICATE: '资源已存在',
  IN_USE: '资源正在使用中，无法删除',

  // 服务器错误
  INTERNAL_ERROR: '服务器内部错误',
  SERVICE_UNAVAILABLE: '服务暂时不可用',
  RATE_LIMITED: '请求过于频繁，请稍后再试',

  // 网络错误
  NETWORK_ERROR: '网络连接失败',
  TIMEOUT: '请求超时',

  // 默认
  UNKNOWN_ERROR: '发生未知错误',
};

export function getErrorMessage(code: string): string {
  return ERROR_MESSAGES[code] || ERROR_MESSAGES.UNKNOWN_ERROR;
}
