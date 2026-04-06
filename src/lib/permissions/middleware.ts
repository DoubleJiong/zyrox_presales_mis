/**
 * 数据权限中间件
 * 
 * 提供数据层面的权限控制，与API路由集成
 * 支持查询过滤、操作校验等功能
 */

import { NextRequest, NextResponse } from 'next/server';
import { SQL, and, eq } from 'drizzle-orm';
import { 
  DataScope, 
  ResourceType, 
  PermissionLevel,
  PermissionContext,
  PermissionCheckResult,
  ADMIN_ROLE_CODES,
} from './types';
import { 
  getPermissionContext, 
  buildScopeCondition,
  checkRecordPermission,
} from './data-scope';
import { errorResponse } from '@/lib/api-response';

// ============================================
// 类型定义
// ============================================

export interface DataPermissionOptions {
  resource: ResourceType;
  requiredLevel?: PermissionLevel;
  checkOwnership?: boolean;
  ownershipField?: string;
}

export interface PermissionContextWithExtras extends PermissionContext {
  scopeCondition?: SQL<unknown>;
}

// ============================================
// 权限上下文创建函数
// ============================================

/**
 * 创建权限上下文并构建查询条件
 */
export async function createPermissionContext(
  userId: number,
  resource: ResourceType
): Promise<PermissionContextWithExtras> {
  const context = await getPermissionContext(userId, resource);
  const scopeCondition = buildScopeCondition(context, resource);
  
  return {
    ...context,
    scopeCondition,
  };
}

/**
 * 检查是否有全部数据权限
 */
export function hasFullAccess(context: PermissionContext): boolean {
  return ADMIN_ROLE_CODES.includes(context.roleCode) || 
    context.dataPermission?.scope === DataScope.ALL;
}

/**
 * 检查是否只能访问自己的数据
 */
export function isSelfOnly(context: PermissionContext): boolean {
  return context.dataPermission?.scope === DataScope.SELF;
}

/**
 * 检查是否有管理权限
 */
export function hasManageScope(context: PermissionContext): boolean {
  return context.dataPermission?.scope === DataScope.MANAGE;
}

// ============================================
// API 权限装饰器
// ============================================

/**
 * 数据权限中间件
 * 为API添加数据权限检查
 */
export function withDataPermission(
  resource: ResourceType,
  options: {
    requiredLevel?: PermissionLevel;
    checkRecordAccess?: boolean;
    recordIdParam?: string;
  } = {}
) {
  const { 
    requiredLevel = PermissionLevel.READ,
    checkRecordAccess = false,
    recordIdParam = 'id',
  } = options;

  return function(
    handler: (
      req: NextRequest, 
      context: { 
        userId: number; 
        params?: Record<string, string>;
        permission: PermissionContextWithExtras;
      }
    ) => Promise<NextResponse>
  ) {
    return async (
      req: NextRequest, 
      routeContext?: { params: Promise<Record<string, string>> }
    ) => {
      // 解析动态路由参数
      let params: Record<string, string> | undefined;
      if (routeContext?.params) {
        params = await routeContext.params;
      }

      // 从请求头获取用户ID（假设已经过 withAuth 中间件）
      const userIdHeader = req.headers.get('x-user-id');
      const userId = userIdHeader ? parseInt(userIdHeader) : 0;

      if (!userId) {
        return errorResponse('UNAUTHORIZED', '请先登录', { status: 401 });
      }

      try {
        // 创建权限上下文
        const permission = await createPermissionContext(userId, resource);

        // 如果需要检查特定记录的访问权限
        if (checkRecordAccess && params?.[recordIdParam]) {
          const recordId = parseInt(params[recordIdParam]);
          const checkResult = await checkRecordPermission(
            userId,
            resource,
            recordId,
            requiredLevel
          );

          if (!checkResult.allowed) {
            return errorResponse(
              'FORBIDDEN',
              checkResult.reason || '无权访问此数据',
              { status: 403 }
            );
          }
        }

        // 调用实际处理函数
        return handler(req, { userId, params, permission });
      } catch (error) {
        console.error('Data permission check failed:', error);
        return errorResponse('INTERNAL_ERROR', '权限检查失败', { status: 500 });
      }
    };
  };
}

// ============================================
// 权限检查工具函数
// ============================================

/**
 * 检查用户是否有创建权限
 */
export async function canCreate(
  userId: number,
  resource: ResourceType
): Promise<boolean> {
  const context = await getPermissionContext(userId, resource);
  return context.dataPermission?.scope !== undefined;
}

/**
 * 检查用户是否有读取权限
 */
export async function canRead(
  userId: number,
  resource: ResourceType
): Promise<boolean> {
  return canCreate(userId, resource);
}

/**
 * 检查用户是否有更新权限
 */
export async function canUpdate(
  userId: number,
  resource: ResourceType,
  recordId?: number
): Promise<boolean> {
  if (recordId) {
    const result = await checkRecordPermission(
      userId, 
      resource, 
      recordId, 
      PermissionLevel.WRITE
    );
    return result.allowed;
  }
  
  const context = await getPermissionContext(userId, resource);
  return context.dataPermission?.scope !== undefined;
}

/**
 * 检查用户是否有删除权限
 */
export async function canDelete(
  userId: number,
  resource: ResourceType,
  recordId?: number
): Promise<boolean> {
  if (recordId) {
    const result = await checkRecordPermission(
      userId, 
      resource, 
      recordId, 
      PermissionLevel.ADMIN
    );
    return result.allowed;
  }
  
  const context = await getPermissionContext(userId, resource);
  return ADMIN_ROLE_CODES.includes(context.roleCode);
}

/**
 * 获取用户可访问的用户ID列表
 * 用于 ROLE 范围的数据过滤
 */
export async function getAccessibleUserIds(
  userId: number,
  resource: ResourceType
): Promise<number[]> {
  const context = await getPermissionContext(userId, resource);
  
  if (hasFullAccess(context)) {
    return []; // 空数组表示可以访问所有
  }
  
  // 目前简化处理，只返回自己的ID
  // 后续可以根据角色查询同角色用户
  return [userId];
}

// ============================================
// 导出
// ============================================

export { DataScope, PermissionLevel } from './types';
export type { ResourceType, PermissionContext } from './types';
