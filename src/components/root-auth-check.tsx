'use client';

import { useAuth } from '@/contexts/auth-context';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

/**
 * 根认证检查组件
 * 在根布局中检查认证状态
 * 
 * 使用 mounted 状态确保只在客户端渲染动态内容，
 * 避免服务端和客户端 hydration 不匹配
 */
export function RootAuthCheck({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  // 公共路径
  const publicPaths = ['/login', '/register', '/api'];
  const isPublicPath = publicPaths.some(path => pathname?.startsWith(path));

  // 只在客户端挂载后执行
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // 只在挂载后、非公共路径、未认证时重定向
    if (mounted && !loading && !isAuthenticated && !isPublicPath) {
      router.push(`/login?redirect=${encodeURIComponent(pathname || '/')}`);
    }
  }, [mounted, loading, isAuthenticated, isPublicPath, router, pathname]);

  // 公共路径不应被 mounted 门控阻塞，否则会退化成纯客户端回退。
  if (isPublicPath) {
    return <>{children}</>;
  }

  // 受保护路径在挂载前不渲染，避免未认证时服务端与客户端状态漂移。
  if (!mounted) {
    return null;
  }

  // 加载中显示加载状态
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">正在验证身份...</p>
        </div>
      </div>
    );
  }

  // 未认证时显示加载状态（等待重定向）
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">正在跳转到登录页...</p>
        </div>
      </div>
    );
  }

  // 已认证，显示内容
  return <>{children}</>;
}
