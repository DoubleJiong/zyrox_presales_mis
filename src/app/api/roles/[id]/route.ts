import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { roles, roleDataPermissions, userRoles } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withAuth } from '@/lib/auth-middleware';

/**
 * GET /api/roles/[id] - 获取角色详情
 */
export const GET = withAuth(async (
  request: NextRequest,
  { userId, params }: { userId: number; params?: Record<string, string> }
) => {
  try {
    const id = params?.id;
    if (!id) {
      return errorResponse('BAD_REQUEST', '缺少角色ID', { status: 400 });
    }
    const roleId = parseInt(id);

    if (isNaN(roleId)) {
      return errorResponse('BAD_REQUEST', '无效的角色ID', { status: 400 });
    }

    // 查询角色基本信息
    const [role] = await db
      .select()
      .from(roles)
      .where(
        and(
          eq(roles.id, roleId),
          isNull(roles.deletedAt)
        )
      )
      .limit(1);

    if (!role) {
      return errorResponse('NOT_FOUND', '角色不存在', { status: 404 });
    }

    // 查询角色的数据权限配置
    const dataPermissions = await db
      .select()
      .from(roleDataPermissions)
      .where(eq(roleDataPermissions.roleId, roleId));

    // 查询角色关联的用户数量
    const [userCountResult] = await db
      .select({ count: userRoles.id })
      .from(userRoles)
      .where(eq(userRoles.roleId, roleId));

    return successResponse({
      ...role,
      dataPermissions,
      userCount: userCountResult?.count || 0,
    });
  } catch (error) {
    console.error('Failed to fetch role:', error);
    return errorResponse('INTERNAL_ERROR', '获取角色详情失败');
  }
});

/**
 * PUT /api/roles/[id] - 更新角色
 */
export const PUT = withAuth(async (
  request: NextRequest,
  { userId, params }: { userId: number; params?: Record<string, string> }
) => {
  try {
    const id = params?.id;
    if (!id) {
      return errorResponse('BAD_REQUEST', '缺少角色ID', { status: 400 });
    }
    const roleId = parseInt(id);
    const body = await request.json();

    if (isNaN(roleId)) {
      return errorResponse('BAD_REQUEST', '无效的角色ID', { status: 400 });
    }

    // 检查角色是否存在
    const [existingRole] = await db
      .select()
      .from(roles)
      .where(
        and(
          eq(roles.id, roleId),
          isNull(roles.deletedAt)
        )
      )
      .limit(1);

    if (!existingRole) {
      return errorResponse('NOT_FOUND', '角色不存在', { status: 404 });
    }

    // 更新角色
    const [updatedRole] = await db
      .update(roles)
      .set({
        roleName: body.roleName || existingRole.roleName,
        description: body.description !== undefined ? body.description : existingRole.description,
        permissions: body.permissions || existingRole.permissions,
        status: body.status || existingRole.status,
        updatedAt: new Date(),
      })
      .where(eq(roles.id, roleId))
      .returning();

    return successResponse(updatedRole);
  } catch (error) {
    console.error('Failed to update role:', error);
    return errorResponse('INTERNAL_ERROR', '更新角色失败');
  }
});

/**
 * DELETE /api/roles/[id] - 删除角色（软删除）
 */
export const DELETE = withAuth(async (
  request: NextRequest,
  { userId, params }: { userId: number; params?: Record<string, string> }
) => {
  try {
    const id = params?.id;
    if (!id) {
      return errorResponse('BAD_REQUEST', '缺少角色ID', { status: 400 });
    }
    const roleId = parseInt(id);

    if (isNaN(roleId)) {
      return errorResponse('BAD_REQUEST', '无效的角色ID', { status: 400 });
    }

    // 检查角色是否存在
    const [existingRole] = await db
      .select()
      .from(roles)
      .where(
        and(
          eq(roles.id, roleId),
          isNull(roles.deletedAt)
        )
      )
      .limit(1);

    if (!existingRole) {
      return errorResponse('NOT_FOUND', '角色不存在', { status: 404 });
    }

    // 检查是否有用户关联此角色
    const [userCountResult] = await db
      .select({ count: userRoles.id })
      .from(userRoles)
      .where(eq(userRoles.roleId, roleId));

    if (userCountResult && userCountResult.count > 0) {
      return errorResponse('BAD_REQUEST', '该角色下还有用户，无法删除', { status: 400 });
    }

    // 软删除角色
    await db
      .update(roles)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(roles.id, roleId));

    return successResponse({ message: '角色已删除' });
  } catch (error) {
    console.error('Failed to delete role:', error);
    return errorResponse('INTERNAL_ERROR', '删除角色失败');
  }
});
