/**
 * 数据权限配置管理API
 * 
 * 功能：
 * - GET: 获取角色数据权限配置
 * - POST: 创建/更新数据权限配置
 * - DELETE: 删除数据权限配置
 */

import { NextRequest } from 'next/server';
import { db } from '@/db';
import { roles, roleDataPermissions } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withAuth } from '@/lib/auth-middleware';

// 资源类型列表
const RESOURCE_TYPES = ['customer', 'project', 'solution', 'task', 'opportunity', 'bidding', 'arbitration', 'alert'] as const;

// 数据范围列表
const DATA_SCOPES = ['all', 'self', 'role', 'manage'] as const;

/**
 * GET /api/settings/data-permissions
 * 获取数据权限配置列表
 * 参数：roleId（可选，指定角色ID）
 */
export const GET = withAuth(async (req: NextRequest, { userId }) => {
  try {
    const { searchParams } = new URL(req.url);
    const roleId = searchParams.get('roleId');

    let permissions;
    if (roleId) {
      // 获取指定角色的数据权限配置
      permissions = await db.query.roleDataPermissions.findMany({
        where: eq(roleDataPermissions.roleId, parseInt(roleId)),
        with: { role: true },
      });
    } else {
      // 获取所有数据权限配置
      permissions = await db.query.roleDataPermissions.findMany({
        with: { role: true },
      });
    }

    // 获取所有角色（用于下拉选择）
    const allRoles = await db.query.roles.findMany({
      columns: { id: true, roleName: true, roleCode: true },
    });

    return successResponse({
      permissions,
      roles: allRoles,
      resourceTypes: RESOURCE_TYPES,
      dataScopes: DATA_SCOPES,
    });
  } catch (error) {
    console.error('Failed to fetch data permissions:', error);
    return errorResponse('INTERNAL_ERROR', '获取数据权限配置失败');
  }
});

/**
 * POST /api/settings/data-permissions
 * 创建或更新数据权限配置
 */
export const POST = withAuth(async (req: NextRequest, { userId }) => {
  try {
    const body = await req.json();
    const { roleId, resource, scope, allowedFields, conditions } = body;
    const normalizedRoleId = Number(roleId);

    // 参数验证
    if (!roleId || !resource || !scope) {
      return errorResponse('BAD_REQUEST', '缺少必要参数');
    }

    if (!Number.isInteger(normalizedRoleId) || normalizedRoleId <= 0) {
      return errorResponse('BAD_REQUEST', '无效的角色ID');
    }

    if (!RESOURCE_TYPES.includes(resource)) {
      return errorResponse('BAD_REQUEST', '无效的资源类型');
    }

    if (!DATA_SCOPES.includes(scope)) {
      return errorResponse('BAD_REQUEST', '无效的数据范围');
    }

    // 检查角色是否存在
    const role = await db.query.roles.findFirst({
      where: eq(roles.id, normalizedRoleId),
    });

    if (!role) {
      return errorResponse('NOT_FOUND', '角色不存在');
    }

    // 检查是否已存在配置
    const existing = await db.query.roleDataPermissions.findFirst({
      where: and(
        eq(roleDataPermissions.roleId, normalizedRoleId),
        eq(roleDataPermissions.resource, resource)
      ),
    });

    let result;
    if (existing) {
      // 更新现有配置
      result = await db
        .update(roleDataPermissions)
        .set({
          scope,
          allowedFields: allowedFields || null,
          conditions: conditions || null,
          updatedAt: new Date(),
        })
        .where(eq(roleDataPermissions.id, existing.id))
        .returning();
    } else {
      // 创建新配置
      result = await db
        .insert(roleDataPermissions)
        .values({
          roleId: normalizedRoleId,
          resource,
          scope,
          allowedFields: allowedFields || null,
          conditions: conditions || null,
        })
        .returning();
    }

    return successResponse(result[0]);
  } catch (error) {
    console.error('Failed to save data permission:', error);
    return errorResponse('INTERNAL_ERROR', '保存数据权限配置失败');
  }
});

/**
 * DELETE /api/settings/data-permissions
 * 删除数据权限配置
 */
export const DELETE = withAuth(async (req: NextRequest, { userId }) => {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return errorResponse('BAD_REQUEST', '缺少配置ID');
    }

    await db
      .delete(roleDataPermissions)
      .where(eq(roleDataPermissions.id, parseInt(id)));

    return successResponse({ deleted: true });
  } catch (error) {
    console.error('Failed to delete data permission:', error);
    return errorResponse('INTERNAL_ERROR', '删除数据权限配置失败');
  }
});
