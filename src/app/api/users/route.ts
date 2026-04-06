import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, roles, staffProfiles, userRoles } from '@/db/schema';
import { desc, eq, inArray, and, sql } from 'drizzle-orm';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withAuth } from '@/lib/auth-middleware';
import { DataPermissionService, DataScope } from '@/lib/permissions/data-scope';
import { ADMIN_ROLE_CODES } from '@/lib/permissions/types';
import { markAdminPasswordReset, markInitialPasswordLifecycle } from '@/modules/identity/password-lifecycle-service';

async function syncUsersIdSequence() {
  await db.execute(sql`
    SELECT setval(
      pg_get_serial_sequence('sys_user', 'id'),
      COALESCE((SELECT MAX(id) FROM sys_user), 1),
      true
    )
  `);
}

async function listUsersWithRoles() {
  const userList = await db
    .select({
      id: users.id,
      username: users.username,
      email: users.email,
      name: users.realName,
      avatar: users.avatar,
      status: users.status,
      department: users.department,
      phone: users.phone,
      baseLocation: users.baseLocation,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .orderBy(desc(users.createdAt));

  if (userList.length === 0) {
    return [];
  }

  const userIds = userList.map((user) => user.id);
  const userRoleRows = await db
    .select({
      userId: users.id,
      roleId: userRoles.roleId,
      roleName: roles.roleName,
      roleCode: roles.roleCode,
      primaryRoleId: users.roleId,
    })
    .from(users)
    .leftJoin(userRoles, eq(userRoles.userId, users.id))
    .leftJoin(roles, eq(sql`COALESCE(${userRoles.roleId}, ${users.roleId})`, roles.id))
    .where(inArray(users.id, userIds));

  const userRolesMap = userRoleRows
    .map(({ primaryRoleId, ...rest }) => ({
      ...rest,
      roleId: rest.roleId ?? primaryRoleId,
    }))
    .reduce((acc, row) => {
      if (!acc[row.userId]) {
        acc[row.userId] = [];
      }
      if (row.roleId && row.roleName && row.roleCode) {
        acc[row.userId].push({
          id: row.roleId,
          name: row.roleName,
          code: row.roleCode,
        });
      }
      return acc;
    }, {} as Record<number, Array<{ id: number; name: string; code: string }>>);

  return userList.map((user) => {
    const roleList = userRolesMap[user.id] || [];
    return {
      ...user,
      roles: roleList.map((role) => role.id),
      roleIds: roleList.map((role) => role.id),
      roleNames: roleList.map((role) => role.name),
      roleCodes: roleList.map((role) => role.code),
    };
  });
}

// 允许按角色代码搜索的角色列表（这些角色搜索时不受数据权限限制）
const SEARCHABLE_ROLE_CODES = [
  'admin',
  'presale_manager',
  'hq_presale_engineer',
  'regional_presale_engineer',
  'solution_engineer',
];

// GET - 获取用户列表
export const GET = withAuth(async (request, { userId }) => {
  try {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword');
    const roleCodes = searchParams.get('roleCodes'); // 支持按角色代码筛选，逗号分隔
    const includeRoles = searchParams.get('includeRoles') === 'true';
    
    // 解析角色代码参数
    const roleCodeList = roleCodes ? roleCodes.split(',').map(r => r.trim()) : [];
    const isValidRoleSearch = roleCodeList.length > 0 && roleCodeList.every(r => SEARCHABLE_ROLE_CODES.includes(r));
    
    // 获取当前用户的数据权限范围
    const context = await DataPermissionService.getPermissionContext(userId, 'staff');
    const scope = context.dataPermission?.scope || DataScope.NONE;

    if (includeRoles) {
      if (!(scope === DataScope.ALL || ADMIN_ROLE_CODES.includes(context.roleCode || ''))) {
        return errorResponse('FORBIDDEN', '您没有权限查看完整用户管理列表');
      }

      return successResponse(await listUsersWithRoles());
    }

    let userList;

    // 构建搜索条件
    const searchCondition = keyword 
      ? sql`(${users.realName} ILIKE ${`%${keyword}%`} OR ${users.email} ILIKE ${`%${keyword}%`} OR ${users.username} ILIKE ${`%${keyword}%`})`
      : null;

    // 如果是按角色代码搜索且是有效的角色代码，则绕过数据权限限制
    if (isValidRoleSearch) {
      // 查询角色ID
      const roleRecords = await db
        .select({ id: roles.id, roleCode: roles.roleCode })
        .from(roles)
        .where(inArray(roles.roleCode, roleCodeList));
      
      const roleIds = roleRecords.map(r => r.id);
      
      // 通过 userRoles 表查询用户
      if (roleIds.length > 0) {
        const usersByRole = await db
          .selectDistinct({
            id: users.id,
            username: users.username,
            realName: users.realName,
            email: users.email,
            department: users.department,
            status: users.status,
            roleId: users.roleId,
          })
          .from(users)
          .innerJoin(userRoles, eq(users.id, userRoles.userId))
          .where(
            and(
              inArray(userRoles.roleId, roleIds),
              eq(users.status, 'active'),
              searchCondition
            )
          )
          .orderBy(desc(users.createdAt))
          .limit(50);
        
        return successResponse(usersByRole);
      }
    }

    if (scope === DataScope.ALL || ADMIN_ROLE_CODES.includes(context.roleCode || '')) {
      // 全部数据权限 - 可以看到所有用户
      userList = await db
        .select({
          id: users.id,
          username: users.username,
          realName: users.realName,
          email: users.email,
          department: users.department,
          status: users.status,
          roleId: users.roleId,
        })
        .from(users)
        .where(searchCondition ? and(eq(users.status, 'active'), searchCondition) : eq(users.status, 'active'))
        .orderBy(desc(users.createdAt))
        .limit(20);
    } else if (scope === DataScope.ROLE && context.roleId) {
      // 同角色数据权限 - 只能看到同角色的用户
      userList = await db
        .select({
          id: users.id,
          username: users.username,
          realName: users.realName,
          email: users.email,
          department: users.department,
          status: users.status,
          roleId: users.roleId,
        })
        .from(users)
        .where(searchCondition 
          ? and(eq(users.roleId, context.roleId), eq(users.status, 'active'), searchCondition)
          : and(eq(users.roleId, context.roleId), eq(users.status, 'active')))
        .orderBy(desc(users.createdAt))
        .limit(20);
    } else if (scope === DataScope.SELF) {
      // 仅自己的数据
      userList = await db
        .select({
          id: users.id,
          username: users.username,
          realName: users.realName,
          email: users.email,
          department: users.department,
          status: users.status,
          roleId: users.roleId,
        })
        .from(users)
        .where(eq(users.id, userId))
        .orderBy(desc(users.createdAt));
    } else {
      // 无权限
      return errorResponse('FORBIDDEN', '您没有权限查看用户列表');
    }

    return successResponse(userList);
  } catch (error) {
    console.error('Failed to fetch users:', error);
    return errorResponse('INTERNAL_ERROR', '获取用户列表失败');
  }
});

// POST - 创建用户
export const POST = withAuth(async (request: NextRequest, { userId }) => {
  try {
    const body = await request.json();
    const { username, email, name, password, roleIds, status, department, phone, baseLocation } = body;
    const primaryRoleId = Array.isArray(roleIds) && roleIds.length > 0 ? roleIds[0] : null;

    if (!username || !email || !name || !password) {
      return errorResponse('BAD_REQUEST', '用户名、邮箱、姓名和密码为必填项');
    }

    await syncUsersIdSequence();

    const bcrypt = require('bcrypt');
    const passwordHash = await bcrypt.hash(password, 10);

    const [newUser] = await db
      .insert(users)
      .values({
        username,
        email,
        realName: name,
        password: passwordHash,
        roleId: primaryRoleId,
        department: department || null,
        phone: phone || null,
        baseLocation: baseLocation || null,
        status: status || 'active',
        mustChangePassword: true,
        passwordResetAt: new Date(),
        passwordResetBy: userId,
      })
      .returning();

    await markInitialPasswordLifecycle(newUser.id, userId);

    if (Array.isArray(roleIds) && roleIds.length > 0) {
      await db.insert(userRoles).values(
        roleIds.map((roleId: number) => ({
          userId: newUser.id,
          roleId,
        }))
      );
    }

    return successResponse({
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      name: newUser.realName,
      status: newUser.status,
      roleIds: roleIds || [],
    }, { status: 201 });
  } catch (error: any) {
    console.error('Failed to create user:', error);
    if (error?.code === '23505') {
      return errorResponse('BAD_REQUEST', '用户名或邮箱已存在');
    }
    return errorResponse('INTERNAL_ERROR', '创建用户失败');
  }
});

// PUT - 更新用户
export const PUT = withAuth(async (request: NextRequest, { userId }) => {
  try {
    const body = await request.json();
    const { id, email, name, roleIds, status, department, phone, baseLocation, password } = body;
    const primaryRoleId = Array.isArray(roleIds) && roleIds.length > 0 ? roleIds[0] : null;

    if (!id) {
      return errorResponse('BAD_REQUEST', '用户ID为必填项');
    }

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (email !== undefined) updateData.email = email;
    if (name !== undefined) updateData.realName = name;
    if (status !== undefined) updateData.status = status;
    if (department !== undefined) updateData.department = department;
    if (phone !== undefined) updateData.phone = phone;
    if (baseLocation !== undefined) updateData.baseLocation = baseLocation;
    if (roleIds !== undefined) updateData.roleId = primaryRoleId;

    if (password) {
      const bcrypt = require('bcrypt');
      updateData.password = await bcrypt.hash(password, 10);
      updateData.mustChangePassword = true;
      updateData.passwordResetAt = new Date();
      updateData.passwordResetBy = userId;
    }

    const [updatedUser] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();

    if (!updatedUser) {
      return errorResponse('NOT_FOUND', '用户不存在');
    }

    if (roleIds !== undefined && Array.isArray(roleIds)) {
      await db.delete(userRoles).where(eq(userRoles.userId, id));

      if (roleIds.length > 0) {
        await db.insert(userRoles).values(
          roleIds.map((roleId: number) => ({
            userId: id,
            roleId,
          }))
        );
      }
    }

    if (password) {
      await markAdminPasswordReset(id, userId);
    }

    return successResponse({
      id: updatedUser.id,
      username: updatedUser.username,
      email: updatedUser.email,
      name: updatedUser.realName,
      status: updatedUser.status,
      roleIds,
    });
  } catch (error) {
    console.error('Failed to update user:', error);
    return errorResponse('INTERNAL_ERROR', '更新用户失败');
  }
});

// DELETE - 删除用户
export const DELETE = withAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get('id') || '');

    if (!id) {
      return errorResponse('BAD_REQUEST', '用户ID为必填项');
    }

  await db.delete(staffProfiles).where(eq(staffProfiles.userId, id));
    await db.delete(userRoles).where(eq(userRoles.userId, id));
    await db.delete(users).where(eq(users.id, id));

    return successResponse({ success: true });
  } catch (error) {
    console.error('Failed to delete user:', error);
    return errorResponse('INTERNAL_ERROR', '删除用户失败');
  }
});
