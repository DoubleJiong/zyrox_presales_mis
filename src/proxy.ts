import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Token 黑名单缓存（内存缓存，定期清理）
const tokenBlacklistCache = new Set<string>();
let lastCacheCleanup = Date.now();
const CACHE_CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 分钟

/**
 * 使用 Web Crypto API 计算 SHA256 哈希（Edge Runtime 兼容）
 */
async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * 检查 Token 是否在黑名单中（通过 API 调用）
 * 注意：由于 Edge Runtime 限制，这里使用 fetch 调用内部 API
 */
async function isTokenBlacklisted(token: string, request: NextRequest): Promise<boolean> {
  try {
    const tokenHash = await sha256(token);

    if (tokenBlacklistCache.has(tokenHash)) {
      return true;
    }

    const apiUrl = new URL('/api/auth/check-blacklist', request.nextUrl.origin);
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tokenHash }),
    });

    if (!response.ok) {
      throw new Error(`Blacklist check failed with status ${response.status}`);
    }

    const data = await response.json();
    if (data.blacklisted) {
      tokenBlacklistCache.add(tokenHash);
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error checking token blacklist:', error);
    throw error;
  }
}

/**
 * 清理过期的缓存
 */
function cleanupCache() {
  const now = Date.now();
  if (now - lastCacheCleanup > CACHE_CLEANUP_INTERVAL) {
    tokenBlacklistCache.clear();
    lastCacheCleanup = now;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  cleanupCache();

  const publicPaths = [
    '/login',
    '/register',
    '/api/health',
    '/api/health/ready',
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/refresh',
    '/api/auth/check-blacklist',
    '/api/db/seed',
    '/api/events',
  ];

  if (
    publicPaths.some(path => pathname.startsWith(path)) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  let token = request.cookies.get('token')?.value;

  if (!token) {
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  }

  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { success: false, error: '请先登录', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  let isBlacklisted = false;
  try {
    isBlacklisted = await isTokenBlacklisted(token, request);
  } catch {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { success: false, error: '会话校验暂时不可用，请稍后重试', code: 'AUTH_VALIDATION_UNAVAILABLE' },
        { status: 503 }
      );
    }

    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('error', 'auth_validation_unavailable');
    return NextResponse.redirect(loginUrl);
  }

  if (isBlacklisted) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { success: false, error: '登录已失效，请重新登录', code: 'TOKEN_REVOKED' },
        { status: 401 }
      );
    }

    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('error', 'token_revoked');
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};