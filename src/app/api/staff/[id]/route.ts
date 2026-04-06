import { db } from '@/db';
import { roles, staffProfiles, userRoles, users } from '@/db/schema';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { errorResponse, successResponse } from '@/lib/api-response';
import { withAuth } from '@/lib/auth-middleware';

const STAFF_WRITE_BLOCKED_MESSAGE = '人员账号新增、编辑、删除已收敛到“系统设置 / 用户配置”，人员管理仅保留档案与关系视图。';

async function ensureStaffProfile(userId: number) {
  await db.execute(sql`
    INSERT INTO bus_staff_profile (user_id, employee_id, status, created_at, updated_at)
    SELECT ${userId}, CONCAT('AUTO', LPAD(${userId}::text, 6, '0')), COALESCE(u.status, 'active'), NOW(), NOW()
    FROM sys_user u
    WHERE u.id = ${userId}
      AND NOT EXISTS (
        SELECT 1 FROM bus_staff_profile sp WHERE sp.user_id = ${userId}
      )
  `);
}

export const GET = withAuth(async (_request, { params }) => {
  try {
    const staffId = parseInt(params?.id || '', 10);

    if (Number.isNaN(staffId)) {
      return errorResponse('BAD_REQUEST', '无效的人员ID');
    }

    await ensureStaffProfile(staffId);

    const staff = await db
      .select({
        id: users.id,
        profileId: staffProfiles.id,
        employeeId: staffProfiles.employeeId,
        username: users.username,
        realName: users.realName,
        email: users.email,
        phone: users.phone,
        department: users.department,
        roleId: users.roleId,
        roleName: roles.roleName,
        roleCode: roles.roleCode,
        status: users.status,
        profileStatus: staffProfiles.status,
        avatar: sql<string | null>`COALESCE(${staffProfiles.avatar}, ${users.avatar})`,
        lastLoginTime: users.lastLoginTime,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        hireDate: sql<string | null>`COALESCE(${staffProfiles.joinDate}, ${users.hireDate})`,
        position: sql<string | null>`COALESCE(${staffProfiles.jobTitle}, ${users.position})`,
        location: sql<string | null>`COALESCE(${staffProfiles.baseLocation}, ${users.location})`,
        birthday: users.birthday,
        gender: users.gender,
      })
      .from(users)
      .leftJoin(staffProfiles, and(eq(staffProfiles.userId, users.id), isNull(staffProfiles.deletedAt)))
      .leftJoin(roles, eq(users.roleId, roles.id))
      .where(eq(users.id, staffId))
      .limit(1);

    if (staff.length === 0) {
      return errorResponse('NOT_FOUND', '人员不存在');
    }

    const mappedRoles = await db
      .select({
        roleId: userRoles.roleId,
        roleName: roles.roleName,
        roleCode: roles.roleCode,
      })
      .from(userRoles)
      .leftJoin(roles, eq(userRoles.roleId, roles.id))
      .where(eq(userRoles.userId, staffId));

    return successResponse({
      ...staff[0],
      roleIds: mappedRoles.map((role) => role.roleId),
      roleNames: mappedRoles.map((role) => role.roleName).filter(Boolean),
      roleCodes: mappedRoles.map((role) => role.roleCode).filter(Boolean),
    });
  } catch (error) {
    console.error('Failed to fetch staff archive detail:', error);
    return errorResponse('INTERNAL_ERROR', '获取人员档案信息失败');
  }
});

export const PUT = withAuth(async () => {
  return errorResponse('METHOD_NOT_ALLOWED', STAFF_WRITE_BLOCKED_MESSAGE, { status: 405 });
});

export const DELETE = withAuth(async () => {
  return errorResponse('METHOD_NOT_ALLOWED', STAFF_WRITE_BLOCKED_MESSAGE, { status: 405 });
});