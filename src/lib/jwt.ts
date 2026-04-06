/**
 * JWT 认证工具类
 * 提供完整的 Token 生成、验证、刷新功能
 * 本文件是第一阶段唯一的认证与会话权威实现。
 */

import jwt from 'jsonwebtoken';
import { db } from '@/db';
import { roles, tokenBlacklist, users } from '@/db/schema';
import { and, eq, gt, lt } from 'drizzle-orm';
import { getAuthEnv } from '@/shared/config/env';

// =====================================================
// 配置
// =====================================================

const JWT_EXPIRES_IN = '7d'; // Token 有效期
const JWT_REFRESH_EXPIRES_IN = '30d'; // 刷新 Token 有效期
const ISSUER = 'zhengyuan-presales';
export const ACCESS_TOKEN_COOKIE_NAME = 'token';
export const REFRESH_TOKEN_COOKIE_NAME = 'refresh_token';

type ExtractTokenOptions = {
  allowQueryToken?: boolean;
};

function getJwtSecret(): string {
  return getAuthEnv().JWT_SECRET;
}

// =====================================================
// 类型定义
// =====================================================

export interface JwtPayload {
  userId: number;
  email: string;
  roleCode: string;
  roleId: number;
  iat: number;
  exp: number;
  iss: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshTokenExpiresIn: number;
}

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  realName: string;
  phone: string | null;
  department: string | null;
  avatar: string | null;
  roleId: number | null;
  roleCode: string | null;
  roleName: string | null;
  permissions: string[] | null;
  status: string;
}

// =====================================================
// Token 生成
// =====================================================

/**
 * 生成访问 Token
 */
export function generateAccessToken(user: {
  id: number;
  email: string;
  roleCode: string | null;
  roleId: number | null;
}): string {
  const payload = {
    userId: user.id,
    email: user.email,
    roleCode: user.roleCode || 'user',
    roleId: user.roleId || 0,
  };

  return jwt.sign(payload, getJwtSecret(), {
    algorithm: 'HS256',
    expiresIn: JWT_EXPIRES_IN,
    issuer: ISSUER,
  });
}

/**
 * 生成刷新 Token
 */
export function generateRefreshToken(userId: number): string {
  const payload = {
    userId,
    type: 'refresh',
  };

  return jwt.sign(payload, getJwtSecret(), {
    algorithm: 'HS256',
    expiresIn: JWT_REFRESH_EXPIRES_IN,
    issuer: ISSUER,
  });
}

/**
 * 生成 Token 对（访问 + 刷新）
 */
export function generateTokenPair(user: {
  id: number;
  email: string;
  roleCode: string | null;
  roleId: number | null;
}): TokenPair {
  return {
    accessToken: generateAccessToken(user),
    refreshToken: generateRefreshToken(user.id),
    expiresIn: 7 * 24 * 60 * 60 * 1000, // 7天（毫秒）
    refreshTokenExpiresIn: 30 * 24 * 60 * 60 * 1000, // 30天（毫秒）
  };
}

// =====================================================
// Token 验证
// =====================================================

/**
 * 验证 Token
 */
export function verifyToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret(), {
      issuer: ISSUER,
    }) as JwtPayload;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      console.warn('Token expired:', error.expiredAt);
    } else if (error instanceof jwt.JsonWebTokenError) {
      console.warn('Invalid token:', error.message);
    }
    return null;
  }
}

/**
 * 验证刷新 Token
 */
export function verifyRefreshToken(token: string): { userId: number } | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret(), {
      issuer: ISSUER,
    }) as { userId: number; type: string };

    if (decoded.type !== 'refresh') {
      return null;
    }

    return { userId: decoded.userId };
  } catch (error) {
    return null;
  }
}

/**
 * 从请求中提取 Token
 */
export function extractToken(request: Request, options: ExtractTokenOptions = {}): string | null {
  const { allowQueryToken = false } = options;

  // 方式1: Authorization Header
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // 方式2: Cookie
  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').map((c) => c.trim());
    for (const cookie of cookies) {
      if (cookie.startsWith('token=')) {
        return cookie.substring(6);
      }
      if (cookie.startsWith('access_token=')) {
        return cookie.substring(13);
      }
    }
  }

  if (allowQueryToken) {
    const url = new URL(request.url);
    const queryToken = url.searchParams.get('token');
    if (queryToken) {
      return queryToken;
    }
  }

  return null;
}

export function extractRefreshToken(request: Request): string | null {
  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').map((c) => c.trim());
    for (const cookie of cookies) {
      if (cookie.startsWith(`${REFRESH_TOKEN_COOKIE_NAME}=`)) {
        return cookie.substring(REFRESH_TOKEN_COOKIE_NAME.length + 1);
      }
    }
  }

  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return null;
}

/**
 * 从请求中解析用户ID
 */
export function extractUserId(request: Request): number | null {
  const token = extractToken(request);
  if (!token) {
    return null;
  }

  const payload = verifyToken(token);
  return payload?.userId || null;
}

export async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(token)
  );

  return Array.from(new Uint8Array(digest))
    .map((part) => part.toString(16).padStart(2, '0'))
    .join('');
}

export async function isTokenBlacklistedByHash(tokenHash: string): Promise<boolean> {
  const [blacklistedToken] = await db
    .select({ id: tokenBlacklist.id })
    .from(tokenBlacklist)
    .where(
      and(
        eq(tokenBlacklist.tokenHash, tokenHash),
        gt(tokenBlacklist.expiresAt, new Date())
      )
    )
    .limit(1);

  return Boolean(blacklistedToken);
}

export async function isTokenBlacklisted(token: string): Promise<boolean> {
  const tokenHash = await hashToken(token);
  return isTokenBlacklistedByHash(tokenHash);
}

export async function revokeToken(token: string): Promise<void> {
  const decoded = jwt.decode(token) as jwt.JwtPayload | null;
  const exp = typeof decoded?.exp === 'number' ? decoded.exp : null;

  if (!exp) {
    return;
  }

  const tokenHash = await hashToken(token);
  const userId = typeof decoded?.userId === 'number' ? decoded.userId : null;

  await db.insert(tokenBlacklist).values({
    tokenHash,
    userId,
    expiresAt: new Date(exp * 1000),
  }).onConflictDoNothing();

  await db.delete(tokenBlacklist).where(lt(tokenBlacklist.expiresAt, new Date()));
}

export async function getValidatedAuthContext(
  request: Request,
  options: ExtractTokenOptions = {}
): Promise<{ token: string; payload: JwtPayload; user: AuthUser } | null> {
  const token = extractToken(request, options);
  if (!token) {
    return null;
  }

  const payload = verifyToken(token);
  if (!payload) {
    return null;
  }

  if (await isTokenBlacklisted(token)) {
    return null;
  }

  const user = await getAuthUser(payload.userId);
  if (!user) {
    return null;
  }

  return { token, payload, user };
}

// =====================================================
// 用户信息获取
// =====================================================

/**
 * 根据用户ID获取完整用户信息
 */
export async function getAuthUser(userId: number): Promise<AuthUser | null> {
  try {
    const result = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        realName: users.realName,
        phone: users.phone,
        department: users.department,
        avatar: users.avatar,
        roleId: users.roleId,
        status: users.status,
        roleName: roles.roleName,
        roleCode: roles.roleCode,
        permissions: roles.permissions,
      })
      .from(users)
      .leftJoin(roles, eq(users.roleId, roles.id))
      .where(eq(users.id, userId))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    const user = result[0];

    // 检查用户状态
    if (user.status !== 'active') {
      return null;
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      realName: user.realName,
      phone: user.phone,
      department: user.department,
      avatar: user.avatar,
      roleId: user.roleId,
      roleCode: user.roleCode,
      roleName: user.roleName,
      permissions: user.permissions,
      status: user.status,
    };
  } catch (error) {
    console.error('Get auth user error:', error);
    return null;
  }
}

/**
 * 从请求中获取认证用户
 */
export async function getAuthUserFromRequest(request: Request): Promise<AuthUser | null> {
  const authContext = await getValidatedAuthContext(request);
  return authContext?.user || null;
}

// =====================================================
// 权限检查
// =====================================================

/**
 * 检查用户是否有指定权限
 */
export function hasPermission(user: AuthUser, permission: string): boolean {
  if (!user.permissions) {
    return false;
  }

  // 超级管理员拥有所有权限
  if (user.permissions.includes('*')) {
    return true;
  }

  return user.permissions.includes(permission);
}

/**
 * 检查用户是否有任一权限
 */
export function hasAnyPermission(user: AuthUser, permissions: string[]): boolean {
  return permissions.some((p) => hasPermission(user, p));
}

/**
 * 检查用户是否有所有权限
 */
export function hasAllPermissions(user: AuthUser, permissions: string[]): boolean {
  return permissions.every((p) => hasPermission(user, p));
}

// =====================================================
// Token 刷新
// =====================================================

/**
 * 使用刷新 Token 获取新的 Token 对
 */
export async function refreshTokens(refreshToken: string): Promise<TokenPair | null> {
  const decoded = verifyRefreshToken(refreshToken);
  if (!decoded) {
    return null;
  }

  const user = await getAuthUser(decoded.userId);
  if (!user) {
    return null;
  }

  return generateTokenPair(user);
}

// =====================================================
// 开发环境辅助
// =====================================================

/**
 * 为开发环境生成测试 Token
 */
export function generateDevToken(userId: number = 1): string {
  return jwt.sign(
    {
      userId,
      email: 'dev@zhengyuan.com',
      roleCode: 'admin',
      roleId: 1,
    },
    getJwtSecret(),
    {
      expiresIn: '1h',
      issuer: ISSUER,
    }
  );
}

/**
 * 解码 Token（不验证，用于调试）
 */
export function decodeToken(token: string): jwt.JwtPayload | null {
  try {
    return jwt.decode(token) as jwt.JwtPayload;
  } catch {
    return null;
  }
}
