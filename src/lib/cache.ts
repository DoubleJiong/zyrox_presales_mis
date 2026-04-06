/**
 * 数据缓存工具
 * 提供 SWR 风格的数据获取和缓存机制
 */

import * as React from 'react';

// ============ 缓存存储 ============

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

class CacheStore {
  private cache = new Map<string, CacheEntry<any>>();
  private listeners = new Map<string, Set<(key: string) => void>>();

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // 检查是否过期
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  set<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): void {
    const now = Date.now();
    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + ttl,
    });
    this.notifyListeners(key);
  }

  delete(key: string): void {
    this.cache.delete(key);
    this.notifyListeners(key);
  }

  clear(): void {
    this.cache.clear();
    this.listeners.forEach((listeners, key) => {
      listeners.forEach((listener) => listener(key));
    });
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  subscribe(key: string, listener: (key: string) => void): () => void {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key)!.add(listener);

    return () => {
      this.listeners.get(key)?.delete(listener);
    };
  }

  private notifyListeners(key: string): void {
    this.listeners.get(key)?.forEach((listener) => listener(key));
  }
}

// 全局缓存实例
export const cacheStore = new CacheStore();

// ============ SWR Hook ============

export interface SWROptions<T> {
  // 缓存键
  key: string;
  // 数据获取函数
  fetcher: () => Promise<T>;
  // 缓存时间（毫秒）
  ttl?: number;
  // 是否启用
  enabled?: boolean;
  // 初始数据
  initialData?: T;
  // 刷新间隔
  refreshInterval?: number;
  // 聚焦时刷新
  revalidateOnFocus?: boolean;
  // 网络重连时刷新
  revalidateOnReconnect?: boolean;
  // 失败重试次数
  retryCount?: number;
  // 重试间隔
  retryInterval?: number;
  // 成功回调
  onSuccess?: (data: T) => void;
  // 失败回调
  onError?: (error: Error) => void;
}

export interface SWRResult<T> {
  data: T | undefined;
  error: Error | undefined;
  isLoading: boolean;
  isValidating: boolean;
  mutate: (data?: T, shouldRevalidate?: boolean) => Promise<void>;
  revalidate: () => Promise<void>;
}

/**
 * SWR 风格的数据获取 Hook
 */
export function useSWR<T>(options: SWROptions<T>): SWRResult<T> {
  const {
    key,
    fetcher,
    ttl = 5 * 60 * 1000,
    enabled = true,
    initialData,
    refreshInterval,
    revalidateOnFocus = true,
    revalidateOnReconnect = true,
    retryCount = 3,
    retryInterval = 1000,
    onSuccess,
    onError,
  } = options;

  const [data, setData] = React.useState<T | undefined>(() => {
    // 首先尝试从缓存获取
    const cached = cacheStore.get<T>(key);
    return cached ?? initialData;
  });
  const [error, setError] = React.useState<Error | undefined>();
  const [isLoading, setIsLoading] = React.useState(!cacheStore.has(key));
  const [isValidating, setIsValidating] = React.useState(false);

  const retryRef = React.useRef(0);
  const mountedRef = React.useRef(true);

  // 数据获取
  const fetchData = React.useCallback(
    async (shouldRetry = true) => {
      if (!enabled) return;

      setIsValidating(true);

      try {
        const result = await fetcher();
        if (mountedRef.current) {
          setData(result);
          setError(undefined);
          cacheStore.set(key, result, ttl);
          retryRef.current = 0;
          onSuccess?.(result);
        }
      } catch (err) {
        if (mountedRef.current) {
          const error = err instanceof Error ? err : new Error(String(err));
          setError(error);
          onError?.(error);

          // 重试逻辑
          if (shouldRetry && retryRef.current < retryCount) {
            retryRef.current++;
            setTimeout(() => fetchData(true), retryInterval * retryRef.current);
          }
        }
      } finally {
        if (mountedRef.current) {
          setIsLoading(false);
          setIsValidating(false);
        }
      }
    },
    [key, fetcher, ttl, enabled, retryCount, retryInterval, onSuccess, onError]
  );

  // 手动更新数据
  const mutate = React.useCallback(
    async (newData?: T, shouldRevalidate = true) => {
      if (newData !== undefined) {
        setData(newData);
        cacheStore.set(key, newData, ttl);
      }
      if (shouldRevalidate) {
        await fetchData(false);
      }
    },
    [key, ttl, fetchData]
  );

  // 重新验证
  const revalidate = React.useCallback(async () => {
    await fetchData(false);
  }, [fetchData]);

  // 监听缓存变化
  React.useEffect(() => {
    const unsubscribe = cacheStore.subscribe(key, () => {
      const cached = cacheStore.get<T>(key);
      if (cached !== undefined) {
        setData(cached);
      }
    });

    return unsubscribe;
  }, [key]);

  // 初始加载
  React.useEffect(() => {
    mountedRef.current = true;

    if (enabled && !cacheStore.has(key)) {
      fetchData();
    }

    return () => {
      mountedRef.current = false;
    };
  }, [key, enabled, fetchData]);

  // 定时刷新
  React.useEffect(() => {
    if (!refreshInterval || !enabled) return;

    const interval = setInterval(() => {
      fetchData(false);
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval, enabled, fetchData]);

  // 聚焦时刷新
  React.useEffect(() => {
    if (!revalidateOnFocus) return;

    const handleFocus = () => {
      fetchData(false);
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [revalidateOnFocus, fetchData]);

  // 网络重连时刷新
  React.useEffect(() => {
    if (!revalidateOnReconnect) return;

    const handleOnline = () => {
      fetchData(false);
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [revalidateOnReconnect, fetchData]);

  return {
    data,
    error,
    isLoading,
    isValidating,
    mutate,
    revalidate,
  };
}

// ============ 请求去重 ============

const pendingRequests = new Map<string, Promise<any>>();

/**
 * 去重请求包装器
 * 相同的请求在短时间内只发送一次
 */
export function dedupeRequest<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 1000
): Promise<T> {
  // 检查是否有正在进行的请求
  const pending = pendingRequests.get(key);
  if (pending) {
    return pending;
  }

  // 检查缓存
  const cached = cacheStore.get<T>(key);
  if (cached !== null) {
    return Promise.resolve(cached);
  }

  // 发起新请求
  const request = fetcher()
    .then((result) => {
      cacheStore.set(key, result, ttl);
      return result;
    })
    .finally(() => {
      // 延迟删除，防止短时间内重复请求
      setTimeout(() => {
        pendingRequests.delete(key);
      }, 100);
    });

  pendingRequests.set(key, request);
  return request;
}

// ============ 批量请求 ============

interface BatchRequestOptions<K, V> {
  // 批量获取函数
  batchFetcher: (keys: K[]) => Promise<Map<K, V>>;
  // 批处理延迟（毫秒）
  batchDelay?: number;
  // 最大批量大小
  maxBatchSize?: number;
}

/**
 * 批量请求聚合器
 * 将多个独立请求聚合为批量请求
 */
export function createBatchLoader<K, V>(options: BatchRequestOptions<K, V>) {
  const { batchFetcher, batchDelay = 10, maxBatchSize = 100 } = options;

  let batchQueue: Array<{
    key: K;
    resolve: (value: V) => void;
    reject: (error: Error) => void;
  }> = [];
  let batchTimer: NodeJS.Timeout | null = null;

  const executeBatch = async () => {
    const batch = batchQueue.splice(0, maxBatchSize);
    if (batch.length === 0) return;

    const keys = batch.map((item) => item.key);

    try {
      const results = await batchFetcher(keys);
      batch.forEach((item) => {
        const value = results.get(item.key);
        if (value !== undefined) {
          item.resolve(value);
        } else {
          item.reject(new Error(`Key ${String(item.key)} not found in batch results`));
        }
      });
    } catch (error) {
      batch.forEach((item) => {
        item.reject(error instanceof Error ? error : new Error(String(error)));
      });
    }
  };

  const scheduleBatch = () => {
    if (batchTimer) return;

    batchTimer = setTimeout(() => {
      batchTimer = null;
      executeBatch();
    }, batchDelay);
  };

  return {
    load: (key: K): Promise<V> => {
      return new Promise((resolve, reject) => {
        batchQueue.push({ key, resolve, reject });
        scheduleBatch();
      });
    },

    clear: () => {
      if (batchTimer) {
        clearTimeout(batchTimer);
        batchTimer = null;
      }
      batchQueue = [];
    },
  };
}

// ============ 查询参数缓存 ============

interface QueryCacheKey {
  url: string;
  params: Record<string, any>;
}

function serializeQueryKey(key: QueryCacheKey): string {
  const sortedParams = Object.keys(key.params)
    .sort()
    .map((k) => `${k}=${JSON.stringify(key.params[k])}`)
    .join('&');
  return `${key.url}?${sortedParams}`;
}

/**
 * 查询缓存 Hook
 * 用于缓存 API 查询结果
 */
export function useQueryCache<T>(
  url: string,
  params: Record<string, any>,
  options?: {
    ttl?: number;
    enabled?: boolean;
  }
) {
  const key = serializeQueryKey({ url, params });

  return useSWR<T>({
    key,
    fetcher: async () => {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          searchParams.set(k, String(v));
        }
      });

      const response = await fetch(`${url}?${searchParams}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.success ? data.data : data;
    },
    ttl: options?.ttl,
    enabled: options?.enabled,
  });
}
