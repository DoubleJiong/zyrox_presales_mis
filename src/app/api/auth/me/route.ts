import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';
import { db } from '@/db';
import { users, roles } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { successResponse, errorResponse } from '@/lib/api-response';

/**
 * GET /api/auth/me
 * 获取当前登录用户信息
 */
export const GET = withAuth(async (request: NextRequest, { userId }) => {
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
        mustChangePassword: users.mustChangePassword,
        passwordChangedAt: users.passwordChangedAt,
        passwordResetAt: users.passwordResetAt,
        lastLoginTime: users.lastLoginTime,
        createdAt: users.createdAt,
        roleName: roles.roleName,
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

    return successResponse({
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
      permissions: user.permissions || [],
      status: user.status,
      mustChangePassword: user.mustChangePassword,
      passwordChangedAt: user.passwordChangedAt,
      passwordResetAt: user.passwordResetAt,
      lastLoginTime: user.lastLoginTime,
      createdAt: user.createdAt,
    });
  } catch (error) {
    console.error('Get current user error:', error);
    return errorResponse('INTERNAL_ERROR', '获取用户信息失败', { status: 500 });
  }
});
