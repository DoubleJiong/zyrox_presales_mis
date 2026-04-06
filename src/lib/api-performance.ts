/**
 * API性能优化工具
 * 
 * 提供缓存、查询优化和性能监控功能
 */

import { NextRequest, NextResponse } from 'next/server';

// ============================================
// 内存缓存
// ============================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>();
  private maxSize = 1000;

  /**
   * 获取缓存
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.timestamp + entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * 设置缓存
   */
  set<T>(key: string, data: T, ttl: number = 60000): void {
    // LRU淘汰策略
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  /**
   * 删除缓存
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 获取缓存统计
   */
  stats(): { size: number; maxSize: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
    };
  }
}

// 全局缓存实例
export const apiCache = new MemoryCache();

// ============================================
// 缓存中间件
// ============================================

interface CacheOptions {
  ttl?: number; // 缓存时间（毫秒）
  keyGenerator?: (request: NextRequest) => string;
}

/**
 * 生成缓存键
 */
function defaultKeyGenerator(request: NextRequest): string {
  const url = new URL(request.url);
  const userId = request.headers.get('x-user-id') || 'anonymous';
  return `${userId}:${url.pathname}${url.search}`;
}

/**
 * 缓存响应中间件
 */
export function withCache(options: CacheOptions = {}) {
  const { ttl = 60000, keyGenerator = defaultKeyGenerator } = options;

  return function (
    handler: (request: NextRequest, context: any) => Promise<NextResponse>
  ) {
    return async function (
      request: NextRequest,
      context: any
    ): Promise<NextResponse> {
      // 仅缓存GET请求
      if (request.method !== 'GET') {
        return handler(request, context);
      }

      const cacheKey = keyGenerator(request);
      const cached = apiCache.get<string>(cacheKey);

      if (cached) {
        return new NextResponse(cached, {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'X-Cache': 'HIT',
          },
        });
      }

      const response = await handler(request, context);

      // 仅缓存成功响应
      if (response.status === 200) {
        const clonedResponse = response.clone();
        const body = await clonedResponse.text();
        apiCache.set(cacheKey, body, ttl);

        // 添加缓存头
        response.headers.set('X-Cache', 'MISS');
        response.headers.set('Cache-Control', `max-age=${Math.floor(ttl / 1000)}`);
      }

      return response;
    };
  };
}

// ============================================
// 查询优化
// ============================================

/**
 * 分页参数验证和标准化
 */
export function normalizePagination(
  page?: string | number,
  pageSize?: string | number
): { offset: number; limit: number; page: number; pageSize: number } {
  // 处理page参数
  let p: number;
  if (page !== undefined && page !== null) {
    const parsed = parseInt(String(page));
    p = isNaN(parsed) ? 1 : parsed;
  } else {
    p = 1;
  }
  p = Math.max(1, p);

  // 处理pageSize参数
  let ps: number;
  if (pageSize !== undefined && pageSize !== null) {
    const parsed = parseInt(String(pageSize));
    ps = isNaN(parsed) ? 20 : parsed;
  } else {
    ps = 20;
  }
  ps = Math.min(100, Math.max(1, ps));

  return {
    offset: (p - 1) * ps,
    limit: ps,
    page: p,
    pageSize: ps,
  };
}

/**
 * 排序参数验证和标准化
 */
export function normalizeSort(
  sortField?: string,
  sortOrder?: string,
  allowedFields: string[] = []
): { field: string; order: 'asc' | 'desc' } {
  const field = allowedFields.includes(sortField || '') ? sortField! : 'createdAt';
  const order = sortOrder?.toLowerCase() === 'desc' ? 'desc' : 'asc';

  return { field, order };
}

/**
 * 批量查询优化器
 * 将多个单独查询合并为一个批量查询
 */
export class BatchQueryOptimizer<T, R> {
  private queue: Array<{
    param: T;
    resolve: (result: R) => void;
    reject: (error: Error) => void;
  }> = [];
  private timeout: NodeJS.Timeout | null = null;
  private batchSize: number;
  private delay: number;
  private executor: (params: T[]) => Promise<R[]>;

  constructor(
    executor: (params: T[]) => Promise<R[]>,
    options: { batchSize?: number; delay?: number } = {}
  ) {
    this.executor = executor;
    this.batchSize = options.batchSize || 10;
    this.delay = options.delay || 10;
  }

  /**
   * 添加查询到队列
   */
  query(param: T): Promise<R> {
    return new Promise((resolve, reject) => {
      this.queue.push({ param, resolve, reject });

      if (this.queue.length >= this.batchSize) {
        this.flush();
      } else if (!this.timeout) {
        this.timeout = setTimeout(() => this.flush(), this.delay);
      }
    });
  }

  /**
   * 执行批量查询
   */
  private async flush(): Promise<void> {
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }

    const batch = this.queue.splice(0, this.batchSize);
    if (batch.length === 0) return;

    try {
      const params = batch.map(item => item.param);
      const results = await this.executor(params);

      batch.forEach((item, index) => {
        item.resolve(results[index]);
      });
    } catch (error) {
      batch.forEach(item => {
        item.reject(error instanceof Error ? error : new Error(String(error)));
      });
    }
  }
}

// ============================================
// 性能监控
// ============================================

interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private maxMetrics = 10000;

  /**
   * 记录性能指标
   */
  record(
    name: string,
    duration: number,
    metadata?: Record<string, any>
  ): void {
    if (this.metrics.length >= this.maxMetrics) {
      this.metrics.shift();
    }

    this.metrics.push({
      name,
      duration,
      timestamp: Date.now(),
      metadata,
    });
  }

  /**
   * 获取性能统计
   */
  getStats(name?: string): {
    count: number;
    avgDuration: number;
    maxDuration: number;
    minDuration: number;
    p95Duration: number;
  } {
    const filtered = name
      ? this.metrics.filter(m => m.name === name)
      : this.metrics;

    if (filtered.length === 0) {
      return {
        count: 0,
        avgDuration: 0,
        maxDuration: 0,
        minDuration: 0,
        p95Duration: 0,
      };
    }

    const durations = filtered.map(m => m.duration).sort((a, b) => a - b);
    const sum = durations.reduce((a, b) => a + b, 0);
    const p95Index = Math.floor(durations.length * 0.95);

    return {
      count: filtered.length,
      avgDuration: sum / filtered.length,
      maxDuration: durations[durations.length - 1],
      minDuration: durations[0],
      p95Duration: durations[p95Index],
    };
  }

  /**
   * 获取慢查询
   */
  getSlowQueries(threshold: number = 1000): PerformanceMetric[] {
    return this.metrics.filter(m => m.duration > threshold);
  }

  /**
   * 清空指标
   */
  clear(): void {
    this.metrics = [];
  }
}

// 全局性能监控实例
export const performanceMonitor = new PerformanceMonitor();

/**
 * 性能监控中间件
 */
export function withPerformanceMonitoring(name: string) {
  return function (
    handler: (request: NextRequest, context: any) => Promise<NextResponse>
  ) {
    return async function (
      request: NextRequest,
      context: any
    ): Promise<NextResponse> {
      const startTime = Date.now();

      try {
        const response = await handler(request, context);

        const duration = Date.now() - startTime;
        performanceMonitor.record(name, duration, {
          method: request.method,
          status: response.status,
        });

        // 添加性能头
        response.headers.set('X-Response-Time', `${duration}ms`);

        return response;
      } catch (error) {
        const duration = Date.now() - startTime;
        performanceMonitor.record(name, duration, {
          method: request.method,
          error: true,
        });

        throw error;
      }
    };
  };
}

// ============================================
// 查询优化工具
// ============================================

/**
 * 延迟加载工具函数
 * 用于延迟加载非关键字段
 */
export async function lazyLoad<T>(
  loader: () => Promise<T>,
  condition: boolean = true
): Promise<T | null> {
  if (!condition) return null;
  return loader();
}

/**
 * 并行加载多个资源
 */
export async function parallelLoad<T extends Record<string, () => Promise<any>>>(
  loaders: T
): Promise<{ [K in keyof T]: Awaited<ReturnType<T[K]>> }> {
  const entries = Object.entries(loaders);
  const results = await Promise.all(entries.map(([, loader]) => loader()));

  return entries.reduce((acc, [key], index) => {
    acc[key as keyof T] = results[index];
    return acc;
  }, {} as { [K in keyof T]: Awaited<ReturnType<T[K]>> });
}

/**
 * 选择性字段加载
 */
export function selectFields<T extends object, K extends keyof T>(
  obj: T,
  fields: K[]
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  fields.forEach(field => {
    if (field in obj) {
      result[field] = obj[field];
    }
  });
  return result;
}
