import { NextRequest, NextResponse } from 'next/server';
import { extractRefreshToken, extractToken, refreshTokens, verifyToken } from '@/lib/jwt';
import { successResponse, errorResponse } from '@/lib/api-response';
import { shouldUseSecureCookies } from '@/lib/auth-cookie';

/**
 * POST /api/auth/refresh
 * 刷新访问令牌
 */
export async function POST(request: NextRequest) {
  try {
    // 尝试从请求体获取refresh token
    let refreshToken: string | null = null;

    try {
      const body = await request.json();
      refreshToken = body.refreshToken;
    } catch {
      // 请求体为空，继续尝试其他方式
    }

    // 尝试从Cookie获取
    if (!refreshToken) {
      refreshToken = extractRefreshToken(request);
    }

    if (!refreshToken) {
      return errorResponse('BAD_REQUEST', '缺少刷新令牌', { status: 400 });
    }

    // 刷新Token
    const tokens = await refreshTokens(refreshToken);

    if (!tokens) {
      return errorResponse('UNAUTHORIZED', '刷新令牌无效或已过期', { status: 401 });
    }

    const secureCookies = shouldUseSecureCookies(request);

    // 构建响应
    const response = successResponse({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
    });

    // 更新Cookie
    response.cookies.set('token', tokens.accessToken, {
      httpOnly: true,
      secure: secureCookies,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    response.cookies.set('refresh_token', tokens.refreshToken, {
      httpOnly: true,
      secure: secureCookies,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Token refresh error:', error);
    return errorResponse('INTERNAL_ERROR', '令牌刷新失败', { status: 500 });
  }
}

/**
 * GET /api/auth/refresh
 * 验证当前Token有效性
 */
export async function GET(request: NextRequest) {
  try {
    const token = extractToken(request);

    if (!token) {
      return errorResponse('UNAUTHORIZED', '未提供访问令牌', { status: 401 });
    }

    const payload = verifyToken(token);

    if (!payload) {
      return errorResponse('UNAUTHORIZED', '访问令牌无效或已过期', { status: 401 });
    }

    return successResponse({
      valid: true,
      userId: payload.userId,
      email: payload.email,
      roleCode: payload.roleCode,
      expiresAt: new Date(payload.exp * 1000).toISOString(),
    });
  } catch (error) {
    console.error('Token validation error:', error);
    return errorResponse('INTERNAL_ERROR', '令牌验证失败', { status: 500 });
  }
}
