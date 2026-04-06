/**
 * 项目权限控制工具函数
 * 
 * 权限层级：
 * 1. 系统管理员 - 全部权限
 * 2. 项目负责人 - 项目所有权限
 * 3. 项目主管 - 项目CRUD权限
 * 4. 项目团队成员 - 项目CRUD权限
 */

import { db } from '@/db';
import { projects, projectMembers, users, roles, userRoles } from '@/db/schema';
import { and, eq, or } from 'drizzle-orm';

// 权限级别枚举
export enum PermissionLevel {
  NONE = 0,       // 无权限
  READ = 1,       // 只读权限
  WRITE = 2,      // 读写权限（CRUD）
  ADMIN = 3,      // 管理权限（包含删除、团队成员管理等）
  SUPER = 4,      // 超级管理员权限
}

// 用户在项目中的角色
export type ProjectRole = 'manager' | 'supervisor' | 'member' | null;

/**
 * 检查用户是否是系统管理员
 */
export async function isSystemAdmin(userId: number): Promise<boolean> {
  try {
    // 直接查询用户的角色信息
    const userWithRole = await db
      .select({
        userId: users.id,
        roleId: users.roleId,
        roleCode: roles.roleCode,
      })
      .from(users)
      .leftJoin(roles, eq(users.roleId, roles.id))
      .where(eq(users.id, userId))
      .limit(1);

    if (!userWithRole[0] || !userWithRole[0].roleCode) {
      // 尝试从 sys_user_role 表查询（支持多角色）
      const userRolesResult = await db
        .select({
          roleCode: roles.roleCode,
        })
        .from(userRoles)
        .innerJoin(roles, eq(userRoles.roleId, roles.id))
        .where(eq(userRoles.userId, userId))
        .limit(1);

      if (!userRolesResult[0] || !userRolesResult[0].roleCode) {
        return false;
      }

      const adminCodes = ['admin', 'super_admin', 'system_admin'];
      return adminCodes.includes(userRolesResult[0].roleCode.toLowerCase());
    }

    const adminCodes = ['admin', 'super_admin', 'system_admin'];
    return adminCodes.includes(userWithRole[0].roleCode.toLowerCase());
  } catch (error) {
    console.error('Error checking system admin:', error);
    return false;
  }
}

/**
 * 获取用户在项目中的角色
 */
export async function getProjectRole(
  projectId: number,
  userId: number
): Promise<ProjectRole> {
  try {
    // 1. 检查是否是项目负责人
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, projectId),
      columns: {
        managerId: true,
        deliveryManagerId: true,
      },
    });

    if (project?.managerId === userId) {
      return 'manager';
    }

    if (project?.deliveryManagerId === userId) {
      return 'supervisor';
    }

    // 2. 检查是否是项目团队成员
    const member = await db.query.projectMembers.findFirst({
      where: and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.userId, userId)
      ),
    });

    if (member) {
      return member.role as ProjectRole;
    }

    return null;
  } catch (error) {
    console.error('Error getting project role:', error);
    return null;
  }
}

/**
 * 获取用户的权限级别
 */
export async function getPermissionLevel(
  projectId: number,
  userId: number
): Promise<PermissionLevel> {
  try {
    // 1. 检查系统管理员
    if (await isSystemAdmin(userId)) {
      return PermissionLevel.SUPER;
    }

    // 2. 获取项目角色
    const role = await getProjectRole(projectId, userId);

    switch (role) {
      case 'manager':
        return PermissionLevel.ADMIN;
      case 'supervisor':
        return PermissionLevel.WRITE;
      case 'member':
        return PermissionLevel.WRITE;
      default:
        return PermissionLevel.NONE;
    }
  } catch (error) {
    console.error('Error getting permission level:', error);
    return PermissionLevel.NONE;
  }
}

/**
 * 检查用户是否有项目读取权限
 */
export async function canReadProject(
  projectId: number,
  userId: number
): Promise<boolean> {
  const level = await getPermissionLevel(projectId, userId);
  return level >= PermissionLevel.READ;
}

/**
 * 检查用户是否有项目写入权限
 */
export async function canWriteProject(
  projectId: number,
  userId: number
): Promise<boolean> {
  const level = await getPermissionLevel(projectId, userId);
  return level >= PermissionLevel.WRITE;
}

/**
 * 检查用户是否有项目管理权限（删除、团队成员管理等）
 */
export async function canAdminProject(
  projectId: number,
  userId: number
): Promise<boolean> {
  const level = await getPermissionLevel(projectId, userId);
  return level >= PermissionLevel.ADMIN;
}

/**
 * 检查用户是否可以管理团队成员
 */
export async function canManageMembers(
  projectId: number,
  userId: number
): Promise<boolean> {
  const level = await getPermissionLevel(projectId, userId);
  return level >= PermissionLevel.ADMIN;
}

/**
 * 获取用户可访问的项目ID列表
 */
export async function getAccessibleProjectIds(userId: number): Promise<number[]> {
  try {
    // 系统管理员可访问所有项目
    if (await isSystemAdmin(userId)) {
      const allProjects = await db.query.projects.findMany({
        columns: { id: true },
      });
      return allProjects.map((p) => p.id);
    }

    // 获取用户作为负责人的项目
    const managedProjects = await db.query.projects.findMany({
      where: or(eq(projects.managerId, userId), eq(projects.deliveryManagerId, userId)),
      columns: { id: true },
    });

    // 获取用户作为成员的项目
    const memberProjects = await db.query.projectMembers.findMany({
      where: eq(projectMembers.userId, userId),
      columns: { projectId: true },
    });

    // 合并去重
    const projectIds = new Set<number>();
    managedProjects.forEach((p) => projectIds.add(p.id));
    memberProjects.forEach((m) => projectIds.add(m.projectId));

    return Array.from(projectIds);
  } catch (error) {
    console.error('Error getting accessible projects:', error);
    return [];
  }
}

/**
 * 项目权限检查结果
 */
export interface PermissionCheckResult {
  allowed: boolean;
  level: PermissionLevel;
  role: ProjectRole;
  message?: string;
}

/**
 * 完整的权限检查
 */
export async function checkProjectPermission(
  projectId: number,
  userId: number,
  requiredLevel: PermissionLevel = PermissionLevel.READ
): Promise<PermissionCheckResult> {
  const level = await getPermissionLevel(projectId, userId);
  const role = await getProjectRole(projectId, userId);

  const allowed = level >= requiredLevel;

  return {
    allowed,
    level,
    role,
    message: allowed
      ? undefined
      : `需要 ${PermissionLevel[requiredLevel]} 权限，当前权限不足`,
  };
}
