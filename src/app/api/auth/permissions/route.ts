import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';
import { db } from '@/db';
import { users, roles } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { successResponse, errorResponse } from '@/lib/api-response';

/**
 * GET /api/auth/permissions
 * 获取当前用户权限信息（用于前端权限控制）
 */
export const GET = withAuth(async (request: NextRequest, { userId }) => {
  try {
    const result = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        realName: users.realName,
        roleId: users.roleId,
        roleCode: roles.roleCode,
        permissions: roles.permissions,
      })
      .from(users)
      .leftJoin(roles, eq(users.roleId, roles.id))
      .where(eq(users.id, userId))
      .limit(1);

    if (result.length === 0) {
      return errorResponse('NOT_FOUND', '用户不存在', { status: 404 });
    }

    const user = result[0];

    // 判断是否为超级管理员
    const normalizedRoleCode = user.roleCode?.toUpperCase() || null;
    const isSuperAdmin = normalizedRoleCode === 'ADMIN' || normalizedRoleCode === 'SUPER_ADMIN' || (user.permissions || []).includes('*');

    return successResponse({
      id: user.id,
      username: user.username,
      realName: user.realName,
      email: user.email,
      roleCode: user.roleCode,
      permissions: user.permissions || [],
      isSuperAdmin,
    });
  } catch (error) {
    console.error('Get permissions error:', error);
    return errorResponse('INTERNAL_ERROR', '获取权限信息失败', { status: 500 });
  }
});
