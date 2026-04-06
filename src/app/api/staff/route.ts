import { db } from '@/db';
import { roles, staffProfiles, userRoles, users } from '@/db/schema';
import { and, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { errorResponse, successResponse } from '@/lib/api-response';
import { withAuth } from '@/lib/auth-middleware';

const STAFF_WRITE_BLOCKED_MESSAGE = '人员账号新增、编辑、删除已收敛到“系统设置 / 用户配置”，人员管理仅保留档案与关系视图。';

async function ensureStaffProfiles() {
  await db.execute(sql`
    INSERT INTO bus_staff_profile (user_id, employee_id, status, created_at, updated_at)
    SELECT
      u.id,
      CONCAT('AUTO', LPAD(u.id::text, 6, '0')),
      COALESCE(u.status, 'active'),
      NOW(),
      NOW()
    FROM sys_user u
    LEFT JOIN bus_staff_profile sp ON sp.user_id = u.id
    WHERE sp.user_id IS NULL
  `);
}

async function listStaffArchives() {
  const staffList = await db
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
      hireDate: sql<string | null>`COALESCE(${staffProfiles.joinDate}, ${users.hireDate})`,
      position: sql<string | null>`COALESCE(${staffProfiles.jobTitle}, ${users.position})`,
      location: sql<string | null>`COALESCE(${staffProfiles.baseLocation}, ${users.location})`,
      birthday: users.birthday,
      gender: users.gender,
    })
    .from(users)
    .leftJoin(staffProfiles, and(eq(staffProfiles.userId, users.id), isNull(staffProfiles.deletedAt)))
    .leftJoin(roles, eq(users.roleId, roles.id))
    .orderBy(desc(users.createdAt));

  if (staffList.length === 0) {
    return [];
  }

  const userIds = staffList.map((item) => item.id);
  const userRoleRows = await db
    .select({
      userId: userRoles.userId,
      roleId: userRoles.roleId,
      roleName: roles.roleName,
      roleCode: roles.roleCode,
    })
    .from(userRoles)
    .leftJoin(roles, eq(userRoles.roleId, roles.id))
    .where(inArray(userRoles.userId, userIds));

  const userRolesMap = userRoleRows.reduce((acc, row) => {
    if (!acc[row.userId]) {
      acc[row.userId] = [];
    }

    if (row.roleId) {
      acc[row.userId].push({
        id: row.roleId,
        name: row.roleName,
        code: row.roleCode,
      });
    }

    return acc;
  }, {} as Record<number, Array<{ id: number; name: string | null; code: string | null }>>);

  return staffList.map((staff) => {
    const mappedRoles = userRolesMap[staff.id] || [];
    return {
      ...staff,
      roleIds: mappedRoles.map((role) => role.id),
      roleNames: mappedRoles.map((role) => role.name).filter(Boolean),
      roleCodes: mappedRoles.map((role) => role.code).filter(Boolean),
    };
  });
}

export const GET = withAuth(async () => {
  try {
    await ensureStaffProfiles();
    return successResponse(await listStaffArchives());
  } catch (error) {
    console.error('Failed to fetch staff archives:', error);
    return errorResponse('INTERNAL_ERROR', '获取人员档案列表失败');
  }
});

export const POST = withAuth(async () => {
  return errorResponse('METHOD_NOT_ALLOWED', STAFF_WRITE_BLOCKED_MESSAGE, { status: 405 });
});

export const PUT = withAuth(async () => {
  return errorResponse('METHOD_NOT_ALLOWED', STAFF_WRITE_BLOCKED_MESSAGE, { status: 405 });
});

export const DELETE = withAuth(async () => {
  return errorResponse('METHOD_NOT_ALLOWED', STAFF_WRITE_BLOCKED_MESSAGE, { status: 405 });
});