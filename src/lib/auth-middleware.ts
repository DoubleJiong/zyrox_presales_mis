import { NextRequest, NextResponse } from 'next/server';
import { getUserPermissions, checkApiPermission, type UserWithPermissions } from '@/lib/rbac';
import { successResponse, errorResponse } from '@/lib/api-response';
import { performSecurityChecks, addSecurityHeaders } from '@/lib/security';
import { getValidatedAuthContext, type AuthUser } from '@/lib/jwt';
import type { Permission } from '@/lib/permissions';

/**
 * 认证中间件
 * 验证用户身份和权限
 */

// 不需要认证的路径（精确匹配）
const PUBLIC_PATHS = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/refresh',
  '/api/login',
  '/api/logout',
  '/api/health',
  '/api/public',
  '/api/db/seed',
];

/**
 * 从请求中提取用户信息
 * 使用JWT验证
 */
async function extractUser(req: NextRequest): Promise<{ userId: number; user: AuthUser | null } | null> {
  const authContext = await getValidatedAuthContext(req);
  if (!authContext) {
    return null;
  }

  return { userId: authContext.payload.userId, user: authContext.user };
}

/**
 * 认证中间件包装器
 * 包装API处理函数，自动进行认证和权限检查
 * 支持动态路由params参数
 */
export function withAuth(
  handler: (req: NextRequest, context: { userId: number; user?: AuthUser; params?: Record<string, string> }) => Promise<NextResponse>,
  options: {
    requiredPermissions?: Permission[];
    skipSecurityCheck?: boolean;
  } = {}
) {
  return async (req: NextRequest, routeContext?: { params: Promise<Record<string, string>> }) => {
    const { requiredPermissions = [], skipSecurityCheck = false } = options;
    const path = req.nextUrl.pathname;
    const method = req.method;

    // 解析动态路由参数
    let params: Record<string, string> | undefined;
    if (routeContext?.params) {
      params = await routeContext.params;
    }

    // 安全检查
    if (!skipSecurityCheck) {
      const securityResult = await performSecurityChecks(req);
      if (!securityResult.allowed) {
        const response = errorResponse(
          'SECURITY_VIOLATION',
          securityResult.error || '安全检查失败',
          { status: securityResult.status || 400 }
        );
        return addSecurityHeaders(response);
      }
    }

    // 检查是否是公开路径
    const isPublicPath = PUBLIC_PATHS.some(p => path.startsWith(p));
    if (isPublicPath) {
      return handler(req, { userId: 0, params });
    }

    // 提取用户信息
    const authResult = await extractUser(req);

    if (!authResult) {
      const response = errorResponse('UNAUTHORIZED', '请先登录', { status: 401 });
      return addSecurityHeaders(response);
    }

    const { userId, user } = authResult;

    // 获取用户权限信息
    const userPermissions = await getUserPermissions(userId);
    if (!userPermissions) {
      const response = errorResponse('UNAUTHORIZED', '用户不存在或已禁用', { status: 401 });
      return addSecurityHeaders(response);
    }

    // 检查API权限
    const permissionCheck = await checkApiPermission(userId, method, path);
    if (!permissionCheck.allowed) {
      const response = errorResponse(
        'FORBIDDEN',
        permissionCheck.reason || '没有访问权限',
        { status: 403 }
      );
      return addSecurityHeaders(response);
    }

    // 检查特定权限要求
    if (requiredPermissions.length > 0) {
      const hasRequiredPermissions = requiredPermissions.some(
        p => userPermissions.permissions.includes(p)
      );
      if (!hasRequiredPermissions && !userPermissions.isSuperAdmin) {
        const response = errorResponse(
          'FORBIDDEN',
          `需要权限: ${requiredPermissions.join(', ')}`,
          { status: 403 }
        );
        return addSecurityHeaders(response);
      }
    }

    // 调用实际处理函数
    const response = await handler(req, { userId, user: user || undefined, params });
    return addSecurityHeaders(response);
  };
}

/**
 * 可选认证中间件
 * 如果用户已登录则验证，未登录也允许访问
 */
export function withOptionalAuth(
  handler: (
    req: NextRequest,
    context: { userId: number | null; user: UserWithPermissions | null }
  ) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    const authResult = await extractUser(req);
    const userId = authResult?.userId || null;
    const user = userId ? await getUserPermissions(userId) : null;

    const response = await handler(req, { userId, user });
    return addSecurityHeaders(response);
  };
}

/**
 * 管理员权限中间件
 * 仅允许管理员访问
 */
export function adminOnly(
  handler: (req: NextRequest, context: { userId: number }) => Promise<NextResponse>
) {
  return withAuth(handler, {
    requiredPermissions: ['settings:view', 'settings:update'],
  });
}

/**
 * 超级管理员权限中间件
 * 仅允许超级管理员访问
 */
export function superAdminOnly(
  handler: (req: NextRequest, context: { userId: number }) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    const authResult = await extractUser(req);

    if (!authResult) {
      const response = errorResponse('UNAUTHORIZED', '请先登录', { status: 401 });
      return addSecurityHeaders(response);
    }

    const user = await getUserPermissions(authResult.userId);
    if (!user || !user.isSuperAdmin) {
      const response = errorResponse('FORBIDDEN', '需要超级管理员权限', { status: 403 });
      return addSecurityHeaders(response);
    }

    const response = await handler(req, { userId: authResult.userId });
    return addSecurityHeaders(response);
  };
}

/**
 * 数据所有权检查中间件
 * 检查用户是否有权访问特定数据
 */
export function withOwnershipCheck<T>(
  getResource: (id: string, userId: number) => Promise<T | null>,
  checkOwnership: (resource: T, userId: number) => boolean,
  handler: (
    req: NextRequest,
    context: { userId: number; resource: T }
  ) => Promise<NextResponse>,
  options: { resourceIdParam?: string } = {}
) {
  return withAuth(async (req, context) => {
    const { resourceIdParam = 'id' } = options;
    const resourceId = req.nextUrl.searchParams.get(resourceIdParam) ||
                       req.nextUrl.pathname.split('/').filter(Boolean).pop();

    if (!resourceId) {
      return errorResponse('BAD_REQUEST', '缺少资源ID', { status: 400 });
    }

    const resource = await getResource(resourceId, context.userId);
    if (!resource) {
      return errorResponse('NOT_FOUND', '资源不存在', { status: 404 });
    }

    // 获取用户权限检查是否为管理员
    const userPerms = await getUserPermissions(context.userId);
    const isAdmin = userPerms?.isSuperAdmin || userPerms?.permissions.some((p: string) => p === '*') || false;

    if (!isAdmin && !checkOwnership(resource, context.userId)) {
      return errorResponse('FORBIDDEN', '没有权限访问此资源', { status: 403 });
    }

    return handler(req, { ...context, resource });
  });
}

// 导出类型
export type { AuthUser };
