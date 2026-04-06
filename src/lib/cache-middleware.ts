import { NextRequest, NextResponse } from 'next/server';

/**
 * API响应缓存中间件
 * 用于缓存GET请求的响应，减少数据库查询
 */

type CacheEntry = {
  data: any;
  timestamp: number;
  ttl: number;
  etag: string;
};

type RouteCacheConfig = {
  ttl: number;
  methods: string[];
};

const cache = new Map<string, CacheEntry>();

const CACHE_CONFIG: {
  defaultTTL: number;
  routes: Record<string, RouteCacheConfig>;
} = {
  defaultTTL: 60 * 1000,
  routes: {
    '/api/customers': { ttl: 2 * 60 * 1000, methods: ['GET'] },
    '/api/projects': { ttl: 2 * 60 * 1000, methods: ['GET'] },
    '/api/opportunities': { ttl: 60 * 1000, methods: ['GET'] },
    '/api/solutions': { ttl: 5 * 60 * 1000, methods: ['GET'] },
    '/api/users': { ttl: 60 * 1000, methods: ['GET'] },
    '/api/dashboard': { ttl: 30 * 1000, methods: ['GET'] },
    '/api/data-screen': { ttl: 60 * 1000, methods: ['GET'] },
    '/api/performance': { ttl: 5 * 60 * 1000, methods: ['GET'] },
  },
};

let cleanupIntervalStarted = false;

function ensureCleanupInterval(): void {
  if (cleanupIntervalStarted || typeof setInterval === 'undefined') {
    return;
  }

  cleanupIntervalStarted = true;
  const interval = setInterval(() => {
    cleanExpiredCache();
  }, 60 * 1000);
  interval.unref?.();
}

function getCacheKey(request: NextRequest): string {
  const url = new URL(request.url);
  const pathname = url.pathname;
  const search = url.search;
  const headers = request.headers.get('authorization') || '';

  return `${pathname}${search}:${headers.slice(0, 50)}`;
}

function generateETag(data: any): string {
  const hash = JSON.stringify(data).split('').reduce((accumulator, character) => {
    accumulator = ((accumulator << 5) - accumulator) + character.charCodeAt(0);
    return accumulator & accumulator;
  }, 0);

  return `"${Math.abs(hash).toString(36)}"`;
}

function shouldCache(request: NextRequest): { should: boolean; ttl: number } {
  const method = request.method.toUpperCase();
  const url = new URL(request.url);
  const pathname = url.pathname;

  ensureCleanupInterval();

  if (method !== 'GET') {
    return { should: false, ttl: 0 };
  }

  for (const [route, config] of Object.entries(CACHE_CONFIG.routes)) {
    if (pathname.startsWith(route) && config.methods.includes(method)) {
      return { should: true, ttl: config.ttl };
    }
  }

  return { should: false, ttl: 0 };
}

export function getCache(request: NextRequest): { data: any; etag: string } | null {
  ensureCleanupInterval();

  const key = getCacheKey(request);
  const cached = cache.get(key);

  if (!cached) {
    return null;
  }

  if (Date.now() > cached.timestamp + cached.ttl) {
    cache.delete(key);
    return null;
  }

  const ifNoneMatch = request.headers.get('if-none-match');
  if (ifNoneMatch === cached.etag) {
    return { data: 'NOT_MODIFIED', etag: cached.etag };
  }

  return { data: cached.data, etag: cached.etag };
}

export function setCache(request: NextRequest, data: any, ttl?: number): void {
  ensureCleanupInterval();

  const { should, ttl: configTTL } = shouldCache(request);
  if (!should && !ttl) {
    return;
  }

  const key = getCacheKey(request);
  const etag = generateETag(data);

  cache.set(key, {
    data,
    timestamp: Date.now(),
    ttl: ttl ?? configTTL ?? CACHE_CONFIG.defaultTTL,
    etag,
  });
}

export function clearCache(pattern?: string): void {
  ensureCleanupInterval();

  if (!pattern) {
    cache.clear();
    return;
  }

  for (const key of cache.keys()) {
    if (key.includes(pattern)) {
      cache.delete(key);
    }
  }
}

export function cleanExpiredCache(): void {
  const now = Date.now();

  for (const [key, value] of cache.entries()) {
    if (now > value.timestamp + value.ttl) {
      cache.delete(key);
    }
  }
}

export function getCacheStats(): {
  size: number;
  keys: string[];
  hitRate: number;
} {
  ensureCleanupInterval();

  return {
    size: cache.size,
    keys: Array.from(cache.keys()),
    hitRate: 0,
  };
}

export function createCachedResponse(data: any, etag: string, status = 200): NextResponse {
  const response = NextResponse.json(data, { status });

  response.headers.set('ETag', etag);
  response.headers.set('Cache-Control', 'private, must-revalidate');

  return response;
}

export function createNotModifiedResponse(): NextResponse {
  return new NextResponse(null, { status: 304 });
}

/**
 * 使用示例:
 * 
 * // 在API路由中使用
 * export async function GET(request: NextRequest) {
 *   // 检查缓存
 *   const cached = getCache(request);
 *   if (cached) {
 *     if (cached.data === 'NOT_MODIFIED') {
 *       return createNotModifiedResponse();
 *     }
 *     return createCachedResponse(cached.data, cached.etag);
 *   }
 * 
 *   // 获取数据
 *   const data = await fetchData();
 * 
 *   // 设置缓存
 *   setCache(request, data);
 * 
 *   return NextResponse.json(data);
 * }
 * 
 * // 数据变更时清除相关缓存
 * export async function POST(request: NextRequest) {
 *   const result = await createData();
 *   clearCache('/api/customers'); // 清除客户相关缓存
 *   return NextResponse.json(result);
 * }
 */
