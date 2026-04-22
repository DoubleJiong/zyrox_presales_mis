import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';
import { db } from '@/db';
import { users, roles, userRoles } from '@/db/schema';
import { eq, isNull } from 'drizzle-orm';
import { successResponse, errorResponse } from '@/lib/api-response';

/**
 * GET /api/auth/permissions
 * 获取当前用户权限信息（用于前端权限控制）
 * 合并主角色（users.roleId）和附加角色（sys_user_role）的权限
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

    // 查询附加角色（sys_user_role 表），合并权限
    const additionalRoles = await db
      .select({
        roleCode: roles.roleCode,
        permissions: roles.permissions,
      })
      .from(userRoles)
      .leftJoin(roles, eq(userRoles.roleId, roles.id))
      .where(eq(userRoles.userId, userId));

    // 合并所有权限（主角色 + 附加角色），去重
    const allPermissions: string[] = [...(user.permissions || [])];
    let primaryRoleCode = user.roleCode;
    let isSuperAdmin = false;

    // 检查主角色是否为超级管理员
    const primaryNormalized = user.roleCode?.toUpperCase() || null;
    if (primaryNormalized === 'ADMIN' || primaryNormalized === 'SUPER_ADMIN' || (user.permissions || []).includes('*')) {
      isSuperAdmin = true;
    }

    for (const ar of additionalRoles) {
      const arNormalized = ar.roleCode?.toUpperCase() || null;
      if (arNormalized === 'ADMIN' || arNormalized === 'SUPER_ADMIN' || (ar.permissions || []).includes('*')) {
        isSuperAdmin = true;
      }
      for (const p of (ar.permissions || [])) {
        if (!allPermissions.includes(p)) {
          allPermissions.push(p);
        }
      }
    }

    return successResponse({
      id: user.id,
      username: user.username,
      realName: user.realName,
      email: user.email,
      roleCode: primaryRoleCode,
      permissions: allPermissions,
      isSuperAdmin,
    });
  } catch (error) {
    console.error('Get permissions error:', error);
    return errorResponse('INTERNAL_ERROR', '获取权限信息失败', { status: 500 });
  }
});
