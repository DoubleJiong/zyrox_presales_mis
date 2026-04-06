import { NextRequest, NextResponse } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { extractToken, revokeToken } from '@/lib/jwt';
import { shouldUseSecureCookies } from '@/lib/auth-cookie';

/**
 * POST /api/auth/logout
 * 用户登出
 */
export async function POST(request: NextRequest) {
  try {
    const token = extractToken(request);

    if (token) {
      await revokeToken(token);
    }

    const secureCookies = shouldUseSecureCookies(request);

    // 构建响应
    const response = successResponse({
      message: '登出成功',
    });

    // 清除Cookie
    response.cookies.set('token', '', {
      httpOnly: true,
      secure: secureCookies,
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });

    response.cookies.set('refresh_token', '', {
      httpOnly: true,
      secure: secureCookies,
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });

    // 清除其他可能的认证Cookie
    response.cookies.set('session', '', {
      httpOnly: true,
      maxAge: 0,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return errorResponse('INTERNAL_ERROR', '登出失败');
  }
}

/**
 * GET /api/auth/logout
 * GET方式登出（用于重定向场景）
 */
export async function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL('/login', request.url));
  const secureCookies = shouldUseSecureCookies(request);

  // 清除Cookie
  response.cookies.set('token', '', {
    httpOnly: true,
    secure: secureCookies,
    maxAge: 0,
    path: '/',
  });

  response.cookies.set('refresh_token', '', {
    httpOnly: true,
    secure: secureCookies,
    maxAge: 0,
    path: '/',
  });

  return response;
}
