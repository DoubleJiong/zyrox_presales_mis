import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { roleDataPermissions } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { withAuth } from '@/lib/auth-middleware';
import { successResponse, errorResponse } from '@/lib/api-response';
import { hasFullAccess } from '@/lib/permissions/middleware';
import { getPermissionContext } from '@/lib/permissions/data-scope';
import type { ResourceType } from '@/lib/permissions/types';
import type { DataScope } from '@/lib/permissions/types';

// GET - 获取角色的数据权限配置
export const GET = withAuth(async (
  request: NextRequest,
  context: { userId: number; user?: any; params?: Record<string, string> }
) => {
  try {
    const roleId = parseInt(context.params?.id || '0');

    if (!roleId) {
      return errorResponse('BAD_REQUEST', '无效的角色ID');
    }

    // 查询角色的数据权限配置
    const permissions = await db
      .select()
      .from(roleDataPermissions)
      .where(eq(roleDataPermissions.roleId, roleId));

    // 格式化返回数据
    const formattedPermissions = permissions.map(p => ({
      resource: p.resource,
      scope: p.scope,
      allowedFields: p.allowedFields ? JSON.parse(p.allowedFields as unknown as string) : undefined,
    }));

    return successResponse(formattedPermissions);
  } catch (error) {
    console.error('Failed to fetch role permissions:', error);
    return errorResponse('INTERNAL_ERROR', '获取角色权限失败');
  }
});

// PUT - 更新角色的数据权限配置
export const PUT = withAuth(async (
  request: NextRequest,
  context: { userId: number; user?: any; params?: Record<string, string> }
) => {
  try {
    const roleId = parseInt(context.params?.id || '0');
    const userId = context.userId;

    if (!roleId) {
      return errorResponse('BAD_REQUEST', '无效的角色ID');
    }

    // 检查管理员权限
    const permissionContext = await getPermissionContext(userId, 'staff' as ResourceType);
    if (!hasFullAccess(permissionContext)) {
      return errorResponse('FORBIDDEN', '仅管理员可以修改权限配置');
    }

    const body = await request.json();
    const { permissions } = body as { permissions: Array<{ resource: ResourceType; scope: DataScope }> };

    if (!Array.isArray(permissions)) {
      return errorResponse('BAD_REQUEST', '权限配置格式错误');
    }

    // 更新权限配置
    for (const perm of permissions) {
      // 检查是否已存在
      const existing = await db
        .select()
        .from(roleDataPermissions)
        .where(
          and(
            eq(roleDataPermissions.roleId, roleId),
            eq(roleDataPermissions.resource, perm.resource)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        // 更新
        await db
          .update(roleDataPermissions)
          .set({
            scope: perm.scope,
            updatedAt: new Date(),
          })
          .where(eq(roleDataPermissions.id, existing[0].id));
      } else {
        // 创建
        await db.insert(roleDataPermissions).values({
          roleId,
          resource: perm.resource,
          scope: perm.scope,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }

    return successResponse({ message: '权限配置已更新' });
  } catch (error) {
    console.error('Failed to update role permissions:', error);
    return errorResponse('INTERNAL_ERROR', '更新权限配置失败');
  }
});
