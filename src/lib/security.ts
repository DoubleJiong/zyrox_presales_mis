/**
 * 安全防护中间件
 * 包含XSS防护、CSRF防护、SQL注入防护、接口限流等
 */

import { NextRequest, NextResponse } from 'next/server';
import { sanitizeUnknownValue } from '@/lib/input-sanitization';

// =====================================================
// XSS防护
// =====================================================

// 危险标签列表
const DANGEROUS_TAGS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
  /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
  /<embed\b[^>]*>/gi,
  /<form\b[^>]*>/gi,
];

// 危险属性列表
const DANGEROUS_ATTRS = [
  /on\w+\s*=/gi,           // 事件处理器
  /javascript\s*:/gi,       // javascript协议
  /vbscript\s*:/gi,         // vbscript协议
  /data\s*:/gi,             // data协议（可能包含恶意代码）
];

/**
 * 清理XSS攻击向量
 */
export function sanitizeXss(input: string): string {
  return sanitizeUnknownValue(input) as string;
}

/**
 * 清理请求体中的XSS
 */
export function sanitizeRequestBody(body: unknown): unknown {
  return sanitizeUnknownValue(body);
}

// =====================================================
// CSRF防护
// =====================================================

// CSRF Token配置
const CSRF_TOKEN_LENGTH = 32;
const CSRF_TOKEN_EXPIRY = 60 * 60 * 1000; // 1小时

// Token存储（生产环境应使用Redis）
const csrfTokenStore = new Map<string, { userId: number; expiry: number }>();

/**
 * 生成CSRF Token
 */
export function generateCsrfToken(): string {
  const array = new Uint8Array(CSRF_TOKEN_LENGTH);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * 存储CSRF Token
 */
export function storeCsrfToken(token: string, userId: number): void {
  csrfTokenStore.set(token, {
    userId,
    expiry: Date.now() + CSRF_TOKEN_EXPIRY,
  });

  // 清理过期token
  for (const [key, value] of csrfTokenStore.entries()) {
    if (value.expiry < Date.now()) {
      csrfTokenStore.delete(key);
    }
  }
}

/**
 * 验证CSRF Token
 */
export function verifyCsrfToken(token: string, userId: number): boolean {
  const stored = csrfTokenStore.get(token);

  if (!stored) {
    return false;
  }

  if (stored.expiry < Date.now()) {
    csrfTokenStore.delete(token);
    return false;
  }

  if (stored.userId !== userId) {
    return false;
  }

  return true;
}

/**
 * 清除CSRF Token
 */
export function clearCsrfToken(token: string): void {
  csrfTokenStore.delete(token);
}

// 不需要CSRF验证的路径
const CSRF_EXEMPT_PATHS = [
  '/api/auth',
  '/api/login',
  '/api/logout',
  '/api/health',
];

/**
 * 检查是否需要CSRF验证
 */
export function requiresCsrfCheck(method: string, path: string): boolean {
  // 只对修改操作进行CSRF验证
  if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(method.toUpperCase())) {
    return false;
  }

  // 检查豁免路径
  return !CSRF_EXEMPT_PATHS.some(exempt => path.startsWith(exempt));
}

// =====================================================
// SQL注入防护
// =====================================================

// SQL注入检测模式
const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE)\b)/i,
  /(\b(UNION|JOIN)\b.*\b(SELECT|INSERT|UPDATE|DELETE)\b)/i,
  /(--)|(\/\*)|(\*\/)/,  // SQL注释
  /('|")\s*(OR|AND)\s*('|")/i,  // 字符串拼接
  /\b(OR|AND)\s+\d+\s*=\s*\d+/i,  // 布尔注入
  /;\s*(SELECT|INSERT|UPDATE|DELETE|DROP)/i,  // 多语句注入
];

/**
 * 检测SQL注入
 */
export function detectSqlInjection(input: string): boolean {
  for (const pattern of SQL_INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      return true;
    }
  }
  return false;
}

/**
 * 检查请求中的SQL注入
 */
export function checkSqlInjection(data: unknown): { safe: boolean; suspicious?: string } {
  if (typeof data === 'string') {
    if (detectSqlInjection(data)) {
      return { safe: false, suspicious: data.substring(0, 100) };
    }
  }

  if (Array.isArray(data)) {
    for (const item of data) {
      const result = checkSqlInjection(item);
      if (!result.safe) {
        return result;
      }
    }
  }

  if (data && typeof data === 'object') {
    for (const value of Object.values(data)) {
      const result = checkSqlInjection(value);
      if (!result.safe) {
        return result;
      }
    }
  }

  return { safe: true };
}

// =====================================================
// 接口限流
// =====================================================

interface RateLimitConfig {
  windowMs: number;      // 时间窗口（毫秒）
  maxRequests: number;   // 最大请求数
  keyGenerator?: (req: NextRequest) => string;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// 限流存储（生产环境应使用Redis）
const rateLimitStore = new Map<string, RateLimitEntry>();

// 默认限流配置
const DEFAULT_RATE_LIMITS: Record<string, RateLimitConfig> = {
  // 全局限流
  global: { windowMs: 60 * 1000, maxRequests: 300 },
  // 登录限流（防暴力破解）
  login: { windowMs: 15 * 60 * 1000, maxRequests: 10 },
  // API限流（开发和测试环境需要更高的限制）
  api: { windowMs: 60 * 1000, maxRequests: 300 },
  // 导出限流
  export: { windowMs: 60 * 1000, maxRequests: 20 },
};

/**
 * 检查限流
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetTime) {
    // 创建新窗口
    const newEntry: RateLimitEntry = {
      count: 1,
      resetTime: now + config.windowMs,
    };
    rateLimitStore.set(key, newEntry);

    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: newEntry.resetTime,
    };
  }

  if (entry.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
    };
  }

  // 增加计数
  entry.count++;
  rateLimitStore.set(key, entry);

  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.resetTime,
  };
}

/**
 * 获取限流配置
 */
export function getRateLimitConfig(path: string): RateLimitConfig {
  // /api/auth/me 是获取当前用户信息的接口，使用更宽松的限流
  if (path === '/api/auth/me') {
    return DEFAULT_RATE_LIMITS.api; // 使用 API 限流（60次/分钟）
  }
  if (path.includes('/login') && !path.includes('/api/auth/me')) {
    return DEFAULT_RATE_LIMITS.login;
  }
  if (path.includes('/export')) {
    return DEFAULT_RATE_LIMITS.export;
  }
  return DEFAULT_RATE_LIMITS.api;
}

/**
 * 获取客户端IP
 */
export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  return 'unknown';
}

/**
 * 生成限流key
 */
export function generateRateLimitKey(req: NextRequest, userId?: number): string {
  const ip = getClientIp(req);
  const path = req.nextUrl.pathname;
  const user = userId || 'anonymous';

  return `${ip}:${user}:${path}`;
}

// =====================================================
// 安全响应头
// =====================================================

/**
 * 添加安全响应头
 */
export function addSecurityHeaders(response: NextResponse): NextResponse {
  // 防止点击劫持
  response.headers.set('X-Frame-Options', 'DENY');

  // 防止MIME类型嗅探
  response.headers.set('X-Content-Type-Options', 'nosniff');

  // XSS保护
  response.headers.set('X-XSS-Protection', '1; mode=block');

  // 引用策略
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // 内容安全策略
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "font-src 'self' data:; " +
    "connect-src 'self' https:; " +
    "frame-ancestors 'none';"
  );

  // 权限策略
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=()'
  );

  return response;
}

// =====================================================
// 安全中间件主函数
// =====================================================

export interface SecurityCheckResult {
  allowed: boolean;
  error?: string;
  status?: number;
}

/**
 * 执行安全检查
 */
export async function performSecurityChecks(
  req: NextRequest,
  userId?: number
): Promise<SecurityCheckResult> {
  const method = req.method;
  const path = req.nextUrl.pathname;

  // 1. 限流检查
  const rateLimitKey = generateRateLimitKey(req, userId);
  const rateLimitConfig = getRateLimitConfig(path);
  const rateLimitResult = checkRateLimit(rateLimitKey, rateLimitConfig);

  if (!rateLimitResult.allowed) {
    return {
      allowed: false,
      error: '请求过于频繁，请稍后再试',
      status: 429,
    };
  }

  // 2. SQL注入检查（仅对有请求体的操作）
  if (['POST', 'PUT', 'PATCH'].includes(method)) {
    try {
      const body = await req.clone().json();
      const sqlCheck = checkSqlInjection(body);
      if (!sqlCheck.safe) {
        console.warn(`[Security] SQL injection attempt detected: ${sqlCheck.suspicious}`);
        return {
          allowed: false,
          error: '请求包含非法内容',
          status: 400,
        };
      }
    } catch {
      // JSON解析失败，忽略
    }
  }

  // 3. CSRF检查（需要实现时启用）
  // if (requiresCsrfCheck(method, path) && userId) {
  //   const csrfToken = req.headers.get('X-CSRF-Token');
  //   if (!csrfToken || !verifyCsrfToken(csrfToken, userId)) {
  //     return {
  //       allowed: false,
  //       error: 'CSRF验证失败',
  //       status: 403,
  //     };
  //   }
  // }

  return { allowed: true };
}

/**
 * 安全中间件包装器
 */
export function withSecurity(
  handler: (req: NextRequest) => Promise<NextResponse>
): (req: NextRequest) => Promise<NextResponse> {
  return async (req: NextRequest) => {
    // 执行安全检查
    const securityResult = await performSecurityChecks(req);

    if (!securityResult.allowed) {
      const response = NextResponse.json(
        { error: securityResult.error },
        { status: securityResult.status || 400 }
      );
      return addSecurityHeaders(response);
    }

    // 执行处理器
    const response = await handler(req);
    return addSecurityHeaders(response);
  };
}
