'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldOff, AlertTriangle, Home, ArrowLeft, RefreshCw } from 'lucide-react';

// 判断是否为权限类错误
function isPermissionError(error: Error & { digest?: string }): boolean {
  const msg = error.message?.toLowerCase() ?? '';
  return (
    msg.includes('forbidden') ||
    msg.includes('403') ||
    msg.includes('权限') ||
    msg.includes('permission') ||
    msg.includes('unauthorized') ||
    msg.includes('401')
  );
}

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    // 仅记录真实系统错误，权限错误不需要上报
    if (!isPermissionError(error)) {
      console.error('[RouteError]', error);
    }
  }, [error]);

  const permissionError = isPermissionError(error);

  if (permissionError) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="w-full max-w-md rounded-lg border bg-card p-8 shadow-sm text-center">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-muted p-4">
              <ShieldOff className="h-8 w-8 text-muted-foreground" />
            </div>
          </div>
          <h2 className="text-xl font-semibold mb-2">没有访问权限</h2>
          <p className="text-sm text-muted-foreground mb-6">
            您没有权限访问此页面或执行此操作。<br />
            如需申请权限，请联系系统管理员。
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => router.back()}
              className="inline-flex items-center justify-center gap-2 rounded-md border bg-background px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              返回上一页
            </button>
            <button
              onClick={() => router.push('/')}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Home className="h-4 w-4" />
              回到首页
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="w-full max-w-md rounded-lg border bg-card p-8 shadow-sm text-center">
        <div className="flex justify-center mb-4">
          <div className="rounded-full bg-muted p-4">
            <AlertTriangle className="h-8 w-8 text-muted-foreground" />
          </div>
        </div>
        <h2 className="text-xl font-semibold mb-2">页面加载出错</h2>
        <p className="text-sm text-muted-foreground mb-6">
          页面加载时遇到了问题，请尝试刷新。<br />
          如果问题持续出现，请联系管理员。
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center justify-center gap-2 rounded-md border bg-background px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            返回上一页
          </button>
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            重试
          </button>
        </div>
      </div>
    </div>
  );
}
