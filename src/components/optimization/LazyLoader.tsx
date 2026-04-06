'use client';

import { useState, useEffect, Suspense } from 'react';
import { SkeletonDashboard } from '@/components/ui/skeleton';

/**
 * 首屏加载优化组件
 * 提供渐进式加载和骨架屏支持
 */

// =====================================================
// 延迟加载组件
// =====================================================

interface LazyLoaderProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  delay?: number;
}

export function LazyLoader({ 
  children, 
  fallback = <SkeletonDashboard />,
  delay = 0 
}: LazyLoaderProps) {
  const [isReady, setIsReady] = useState(delay === 0);

  useEffect(() => {
    if (delay > 0) {
      const timer = setTimeout(() => setIsReady(true), delay);
      return () => clearTimeout(timer);
    }
  }, [delay]);

  if (!isReady) {
    return <>{fallback}</>;
  }

  return (
    <Suspense fallback={fallback}>
      {children}
    </Suspense>
  );
}

// =====================================================
// 渐进式数据加载组件
// =====================================================

interface ProgressiveLoaderProps<T> {
  loader: () => Promise<T>;
  children: (data: T) => React.ReactNode;
  fallback?: React.ReactNode;
  delay?: number;
  onError?: (error: Error) => void;
}

export function ProgressiveLoader<T>({
  loader,
  children,
  fallback = <SkeletonDashboard />,
  delay = 0,
  onError,
}: ProgressiveLoaderProps<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      try {
        // 延迟加载
        if (delay > 0) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        const result = await loader();
        if (mounted) {
          setData(result);
        }
      } catch (err) {
        if (mounted) {
          const error = err instanceof Error ? err : new Error(String(err));
          setError(error);
          onError?.(error);
        }
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, [loader, delay, onError]);

  if (error) {
    return (
      <div className="flex items-center justify-center p-8 text-destructive">
        加载失败: {error.message}
      </div>
    );
  }

  if (!data) {
    return <>{fallback}</>;
  }

  return <>{children(data)}</>;
}

// =====================================================
// 优先级加载组件
// =====================================================

interface PriorityLoaderProps {
  children: React.ReactNode;
  priority?: 'high' | 'medium' | 'low';
  placeholder?: React.ReactNode;
}

export function PriorityLoader({
  children,
  priority = 'medium',
  placeholder = null,
}: PriorityLoaderProps) {
  const [isLoaded, setIsLoaded] = useState(priority === 'high');

  useEffect(() => {
    if (priority === 'high') {
      setIsLoaded(true);
      return;
    }

    // 使用 requestIdleCallback 或 setTimeout 延迟加载低优先级内容
    const loadDelay = {
      medium: 100,
      low: 500,
    }[priority];

    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, loadDelay);

    return () => clearTimeout(timer);
  }, [priority]);

  if (!isLoaded) {
    return <>{placeholder}</>;
  }

  return <>{children}</>;
}

// =====================================================
// 按需加载组件
// =====================================================

interface InViewLoaderProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  rootMargin?: string;
  threshold?: number;
}

export function InViewLoader({
  children,
  fallback = <div className="min-h-[200px]" />,
  rootMargin = '200px',
  threshold = 0.1,
}: InViewLoaderProps) {
  const [isInView, setIsInView] = useState(false);
  const [ref, setRef] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ref) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin,
        threshold,
      }
    );

    observer.observe(ref);

    return () => {
      observer.disconnect();
    };
  }, [ref, rootMargin, threshold]);

  return (
    <div ref={setRef}>
      {isInView ? children : fallback}
    </div>
  );
}

// =====================================================
// 数据预加载Hook
// =====================================================

interface PrefetchOptions {
  enabled?: boolean;
  delay?: number;
}

export function usePrefetch<T>(
  fetcher: () => Promise<T>,
  options: PrefetchOptions = {}
) {
  const { enabled = true, delay = 0 } = options;
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!enabled) return;

    let mounted = true;

    const prefetch = async () => {
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      setIsLoading(true);

      try {
        const result = await fetcher();
        if (mounted) {
          setData(result);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    prefetch();

    return () => {
      mounted = false;
    };
  }, [fetcher, enabled, delay]);

  return { data, isLoading, error };
}

// =====================================================
// 关键资源预加载Hook
// =====================================================

export function usePreloadResources() {
  useEffect(() => {
    // 预加载关键字体
    const fontUrls = [
      '/fonts/inter-var.woff2',
    ];

    fontUrls.forEach(url => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'font';
      link.type = 'font/woff2';
      link.crossOrigin = 'anonymous';
      link.href = url;
      document.head.appendChild(link);
    });

    // 预连接到API域名
    const apiOrigins = [
      process.env.NEXT_PUBLIC_API_URL,
    ].filter(Boolean) as string[];

    apiOrigins.forEach(origin => {
      const link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = origin;
      document.head.appendChild(link);
    });
  }, []);
}

// =====================================================
// 页面加载状态Hook
// =====================================================

export function usePageLoadState() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);

  useEffect(() => {
    // 模拟加载进度
    const progressInterval = setInterval(() => {
      setLoadProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + Math.random() * 15;
      });
    }, 100);

    // 页面加载完成
    const handleLoad = () => {
      setLoadProgress(100);
      setTimeout(() => setIsLoaded(true), 100);
    };

    if (document.readyState === 'complete') {
      handleLoad();
    } else {
      window.addEventListener('load', handleLoad);
    }

    return () => {
      clearInterval(progressInterval);
      window.removeEventListener('load', handleLoad);
    };
  }, []);

  return { isLoaded, loadProgress: Math.min(100, Math.round(loadProgress)) };
}

// =====================================================
// 页面加载进度条
// =====================================================

export function PageLoadingBar() {
  const { isLoaded, loadProgress } = usePageLoadState();

  if (isLoaded) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-muted">
      <div
        className="h-full bg-primary transition-all duration-300 ease-out"
        style={{ width: `${loadProgress}%` }}
      />
    </div>
  );
}
