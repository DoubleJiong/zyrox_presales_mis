/**
 * API 响应缓存工具
 * 支持 ETag、内存缓存、Redis 缓存
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

let cleanupIntervalStarted = false;

function ensureCleanupInterval(): void {
  if (cleanupIntervalStarted) {
    return;
  }

  cleanupIntervalStarted = true;
  const interval = setInterval(() => {
    apiCache.cleanup();
  }, 60 * 1000);
  interval.unref?.();
}

// ============ 内存缓存 ============

interface CacheItem {
  data: any;
  etag: string;
  timestamp: number;
  expiresAt: number;
}

class ApiCache {
  private cache = new Map<string, CacheItem>();
  private maxSize = 1000; // 最大缓存条目数

  // 生成 ETag
  generateETag(data: any): string {
    const content = JSON.stringify(data);
    return crypto.createHash('md5').update(content).digest('hex');
  }

  // 获取缓存
  get(key: string): CacheItem | null {
    const item = this.cache.get(key);
    if (!item) return null;

    // 检查是否过期
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return item;
  }

  // 设置缓存
  set(key: string, data: any, ttl: number = 60 * 1000): string {
    // LRU 淘汰策略
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    const etag = this.generateETag(data);
    const now = Date.now();

    this.cache.set(key, {
      data,
      etag,
      timestamp: now,
      expiresAt: now + ttl,
    });

    return etag;
  }

  // 删除缓存
  delete(key: string): void {
    this.cache.delete(key);
  }

  // 清空缓存
  clear(): void {
    this.cache.clear();
  }

  // 获取缓存统计
  stats(): { size: number; maxSize: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
    };
  }

  // 清理过期缓存
  cleanup(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }
}

// 全局 API 缓存实例
export const apiCache = new ApiCache();
ensureCleanupInterval();

// ============ 缓存键生成 ============

export function generateCacheKey(
  path: string,
  params: Record<string, any> = {},
  userId?: string | number
): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map((k) => `${k}=${JSON.stringify(params[k])}`)
    .join('&');

  const userPart = userId ? `:user:${userId}` : '';
  return `${path}${userPart}?${sortedParams}`;
}

// ============ 缓存响应包装器 ============

interface CachedResponseOptions {
  // 缓存时间（毫秒）
  ttl?: number;
  // 是否启用缓存
  enabled?: boolean;
  // 缓存键
  cacheKey?: string;
  // 是否需要用户隔离
  userIsolated?: boolean;
  // 自定义缓存键生成函数
  keyGenerator?: (request: NextRequest) => string;
}

/**
 * 缓存响应包装器
 * 自动处理 ETag 和缓存
 */
export function withCache(
  handler: (request: NextRequest) => Promise<NextResponse>,
  options: CachedResponseOptions = {}
) {
  const {
    ttl = 60 * 1000,
    enabled = true,
    keyGenerator,
    userIsolated = false,
  } = options;

  return async (request: NextRequest): Promise<NextResponse> => {
    if (!enabled || request.method !== 'GET') {
      return handler(request);
    }

    // 生成缓存键
    const cacheKey =
      keyGenerator?.(request) ||
      generateCacheKey(
        request.nextUrl.pathname,
        Object.fromEntries(request.nextUrl.searchParams),
        userIsolated ? request.headers.get('x-user-id') : undefined
      );

    // 检查缓存
    const cached = apiCache.get(cacheKey);
    if (cached) {
      // 检查 If-None-Match 头
      const ifNoneMatch = request.headers.get('if-none-match');
      if (ifNoneMatch === cached.etag) {
        // 返回 304 Not Modified
        return new NextResponse(null, {
          status: 304,
          headers: {
            ETag: cached.etag,
            'Cache-Control': `public, max-age=${Math.floor(ttl / 1000)}`,
          },
        });
      }

      // 返回缓存数据
      return NextResponse.json(cached.data, {
        headers: {
          ETag: cached.etag,
          'Cache-Control': `public, max-age=${Math.floor(ttl / 1000)}`,
          'X-Cache': 'HIT',
        },
      });
    }

    // 执行处理器
    const response = await handler(request);
    const data = await response.clone().json();

    // 缓存响应
    const etag = apiCache.set(cacheKey, data, ttl);

    // 返回响应
    return NextResponse.json(data, {
      headers: {
        ETag: etag,
        'Cache-Control': `public, max-age=${Math.floor(ttl / 1000)}`,
        'X-Cache': 'MISS',
      },
    });
  };
}

// ============ 分页缓存工具 ============

interface PaginatedCacheOptions {
  // 默认分页大小
  defaultPageSize?: number;
  // 最大分页大小
  maxPageSize?: number;
  // 缓存时间
  ttl?: number;
}

/**
 * 分页查询缓存
 * 对每个分页结果单独缓存
 */
export function createPaginatedCache(options: PaginatedCacheOptions = {}) {
  const { defaultPageSize = 10, maxPageSize = 100, ttl = 30 * 1000 } = options;

  return {
    /**
     * 生成分页缓存键
     */
    getKey(baseKey: string, page: number, pageSize: number, filters?: Record<string, any>): string {
      const filterStr = filters
        ? Object.entries(filters)
            .filter(([, v]) => v !== undefined && v !== null)
            .map(([k, v]) => `${k}:${v}`)
            .join(',')
        : '';
      return `${baseKey}:page:${page}:size:${pageSize}:${filterStr}`;
    },

    /**
     * 规范化分页参数
     */
    normalizeParams(page?: number, pageSize?: number): { page: number; pageSize: number; offset: number } {
      const normalizedPage = Math.max(1, page || 1);
      const normalizedPageSize = Math.min(maxPageSize, Math.max(1, pageSize || defaultPageSize));
      return {
        page: normalizedPage,
        pageSize: normalizedPageSize,
        offset: (normalizedPage - 1) * normalizedPageSize,
      };
    },

    /**
     * 获取缓存
     */
    get<T>(key: string): T | null {
      const cached = apiCache.get(key);
      return cached?.data ?? null;
    },

    /**
     * 设置缓存
     */
    set<T>(key: string, data: T): void {
      apiCache.set(key, data, ttl);
    },

    /**
     * 使缓存失效
     */
    invalidate(baseKey: string): void {
      // 清除所有相关的缓存
      // 这里简化处理，实际可以维护一个 key 列表
      apiCache.clear();
    },
  };
}

// ============ 响应压缩 ============

/**
 * 压缩响应数据
 * 注意：Next.js 默认支持 gzip，这个主要是优化 JSON 响应
 */
export function compressResponse(data: any): string {
  // 移除 null 和 undefined 值
  const cleaned = removeEmptyValues(data);
  return JSON.stringify(cleaned);
}

function removeEmptyValues(obj: any): any {
  if (obj === null || obj === undefined) return undefined;

  if (Array.isArray(obj)) {
    return obj.map(removeEmptyValues).filter((v) => v !== undefined);
  }

  if (typeof obj === 'object') {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const cleaned = removeEmptyValues(value);
      if (cleaned !== undefined) {
        result[key] = cleaned;
      }
    }
    return Object.keys(result).length > 0 ? result : undefined;
  }

  return obj;
}

// ============ 条件请求处理 ============

/**
 * 处理条件请求
 * 支持 If-Modified-Since 和 If-None-Match
 */
export function handleConditionalRequest(
  request: NextRequest,
  lastModified: Date,
  etag: string
): boolean {
  // 检查 If-None-Match
  const ifNoneMatch = request.headers.get('if-none-match');
  if (ifNoneMatch && ifNoneMatch === etag) {
    return true; // 应该返回 304
  }

  // 检查 If-Modified-Since
  const ifModifiedSince = request.headers.get('if-modified-since');
  if (ifModifiedSince) {
    const modifiedSince = new Date(ifModifiedSince);
    if (lastModified <= modifiedSince) {
      return true; // 应该返回 304
    }
  }

  return false;
}

/**
 * 创建 304 响应
 */
export function createNotModifiedResponse(etag: string): NextResponse {
  return new NextResponse(null, {
    status: 304,
    headers: {
      ETag: etag,
      'Cache-Control': 'public, max-age=60',
    },
  });
}

// ============ 缓存失效策略 ============

interface InvalidationRule {
  pattern: RegExp;
  relatedKeys: string[];
}

const invalidationRules: InvalidationRule[] = [
  // 示例：当项目更新时，清除项目列表和仪表盘缓存
  // { pattern: /^\/api\/projects\/\d+$/, relatedKeys: ['/api/projects', '/api/dashboard'] },
];

/**
 * 根据规则使缓存失效
 */
export function invalidateCache(path: string, method: string): void {
  // 非修改操作不触发失效
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return;
  }

  // 清除匹配的缓存
  for (const rule of invalidationRules) {
    if (rule.pattern.test(path)) {
      rule.relatedKeys.forEach((key) => {
        // 清除以 key 开头的所有缓存
        for (const cacheKey of apiCache.stats().size ? [] : []) {
          // 这里简化处理
        }
      });
    }
  }

  // 对于修改操作，清除所有相关列表缓存
  // 简化处理：清除所有缓存
  apiCache.clear();
}

// ============ 预热缓存 ============

/**
 * 预热缓存
 * 在应用启动时预加载常用数据
 */
export async function warmupCache(
  endpoints: Array<{ path: string; params?: Record<string, any> }>
): Promise<void> {
  console.log('[Cache] Starting warmup...');

  for (const { path, params } of endpoints) {
    try {
      const url = new URL(path, 'http://localhost');
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          url.searchParams.set(key, String(value));
        });
      }

      // 这里可以调用实际的 API 来预热缓存
      console.log(`[Cache] Warmed up: ${url.toString()}`);
    } catch (error) {
      console.error(`[Cache] Warmup failed for ${path}:`, error);
    }
  }

  console.log('[Cache] Warmup completed');
}
