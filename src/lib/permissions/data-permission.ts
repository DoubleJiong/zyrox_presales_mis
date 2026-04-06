/**
 * 数据权限控制服务
 * 
 * 数据范围类型：
 * - all: 全部数据
 * - self: 仅自己的数据
 * - role: 本角色的数据
 * - manage: 下级及自己的数据
 */

import { db } from '@/db';
import { users, roles, roleDataPermissions } from '@/db/schema';
import { eq, and, sql, inArray } from 'drizzle-orm';

// 数据范围类型
export type DataScope = 'all' | 'self' | 'role' | 'manage';

// 资源类型
export type ResourceType = 'customer' | 'project' | 'solution' | 'task' | 'opportunity' | 'bidding' | 'arbitration' | 'alert';

// 数据权限配置
export interface DataPermission {
  resource: ResourceType;
  scope: DataScope;
  allowedFields?: string[];
  conditions?: Record<string, any>;
}

// 用户数据权限上下文
export interface UserDataContext {
  userId: number;
  roleId: number | null;
  roleCode: string | null;
  isSystemAdmin: boolean;
}

/**
 * 获取用户数据上下文
 */
export async function getUserDataContext(userId: number): Promise<UserDataContext> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    with: { role: true },
  });

  const role = user?.role as any;
  const roleCode = role?.roleCode?.toLowerCase() || null;
  const isSystemAdmin = ['admin', 'super_admin', 'system_admin'].includes(roleCode || '');

  return {
    userId,
    roleId: user?.roleId || null,
    roleCode,
    isSystemAdmin,
  };
}

/**
 * 获取用户对特定资源的数据权限配置
 */
export async function getDataPermission(
  userId: number,
  resource: ResourceType
): Promise<DataPermission> {
  const context = await getUserDataContext(userId);

  // 系统管理员拥有全部权限
  if (context.isSystemAdmin) {
    return {
      resource,
      scope: 'all',
    };
  }

  // 查询角色数据权限配置
  if (context.roleId) {
    const permission = await db.query.roleDataPermissions.findFirst({
      where: and(
        eq(roleDataPermissions.roleId, context.roleId),
        eq(roleDataPermissions.resource, resource)
      ),
    });

    if (permission) {
      return {
        resource,
        scope: permission.scope as DataScope,
        allowedFields: permission.allowedFields || undefined,
        conditions: permission.conditions || undefined,
      };
    }
  }

  // 默认返回自己的数据
  return {
    resource,
    scope: 'self',
  };
}

/**
 * 获取用户对特定资源的所有数据权限配置
 */
export async function getAllDataPermissions(userId: number): Promise<Map<ResourceType, DataPermission>> {
  const context = await getUserDataContext(userId);
  const permissions = new Map<ResourceType, DataPermission>();

  // 系统管理员拥有全部权限
  if (context.isSystemAdmin) {
    const resources: ResourceType[] = ['customer', 'project', 'solution', 'task', 'opportunity', 'bidding', 'arbitration', 'alert'];
    resources.forEach(resource => {
      permissions.set(resource, { resource, scope: 'all' });
    });
    return permissions;
  }

  // 查询角色的所有数据权限配置
  if (context.roleId) {
    const permList = await db.query.roleDataPermissions.findMany({
      where: eq(roleDataPermissions.roleId, context.roleId),
    });

    permList.forEach(perm => {
      permissions.set(perm.resource as ResourceType, {
        resource: perm.resource as ResourceType,
        scope: perm.scope as DataScope,
        allowedFields: perm.allowedFields || undefined,
        conditions: perm.conditions || undefined,
      });
    });
  }

  return permissions;
}

/**
 * 构建数据过滤条件
 * 根据 scope 生成 SQL WHERE 条件
 */
export function buildDataFilter(
  context: UserDataContext,
  resource: ResourceType,
  tableName: string = 't'
): { condition: string; params: any[] } {
  const params: any[] = [];

  // 系统管理员不过滤
  if (context.isSystemAdmin) {
    return { condition: '1=1', params };
  }

  // 根据 scope 构建条件
  switch (resource) {
    case 'project':
      return buildProjectDataFilter(context, tableName);
    case 'customer':
      return buildCustomerDataFilter(context, tableName);
    case 'task':
      return buildTaskDataFilter(context, tableName);
    case 'solution':
      return buildSolutionDataFilter(context, tableName);
    default:
      return { condition: `${tableName}.created_by = ?`, params: [context.userId] };
  }
}

/**
 * 构建项目数据过滤条件
 */
function buildProjectDataFilter(
  context: UserDataContext,
  tableName: string
): { condition: string; params: any[] } {
  const params: any[] = [];
  const conditions: string[] = [];

  // 1. 作为项目负责人
  conditions.push(`${tableName}.manager_id = ?`);
  params.push(context.userId);

  // 2. 作为项目团队成员
  conditions.push(`EXISTS (
    SELECT 1 FROM bus_project_member pm 
    WHERE pm.project_id = ${tableName}.id 
    AND pm.user_id = ?
  )`);
  params.push(context.userId);

  // 3. 没有负责人的项目（方便分配）
  conditions.push(`${tableName}.manager_id IS NULL`);

  return {
    condition: `(${conditions.join(' OR ')})`,
    params,
  };
}

/**
 * 构建客户数据过滤条件
 */
function buildCustomerDataFilter(
  context: UserDataContext,
  tableName: string
): { condition: string; params: any[] } {
  const params: any[] = [];
  const conditions: string[] = [];

  // 1. 作为客户负责人
  conditions.push(`${tableName}.owner_id = ?`);
  params.push(context.userId);

  // 2. 作为客户团队成员
  conditions.push(`EXISTS (
    SELECT 1 FROM bus_staff_customer_relation cr 
    WHERE cr.customer_id = ${tableName}.id 
    AND cr.staff_id = ?
  )`);
  params.push(context.userId);

  // 3. 有项目关联的客户
  conditions.push(`EXISTS (
    SELECT 1 FROM bus_project p 
    WHERE p.customer_id = ${tableName}.id
    AND (p.manager_id = ? OR EXISTS (
      SELECT 1 FROM bus_project_member pm WHERE pm.project_id = p.id AND pm.user_id = ?
    ))
  )`);
  params.push(context.userId, context.userId);

  return {
    condition: `(${conditions.join(' OR ')})`,
    params,
  };
}

/**
 * 构建任务数据过滤条件
 */
function buildTaskDataFilter(
  context: UserDataContext,
  tableName: string
): { condition: string; params: any[] } {
  const params: any[] = [];
  const conditions: string[] = [];

  // 1. 作为任务负责人
  conditions.push(`${tableName}.assignee_id = ?`);
  params.push(context.userId);

  // 2. 作为任务创建者
  conditions.push(`${tableName}.created_by = ?`);
  params.push(context.userId);

  // 3. 项目相关的任务
  conditions.push(`EXISTS (
    SELECT 1 FROM bus_project p
    LEFT JOIN bus_project_member pm ON pm.project_id = p.id AND pm.user_id = ?
    WHERE p.id = ${tableName}.project_id
    AND (p.manager_id = ? OR pm.id IS NOT NULL)
  )`);
  params.push(context.userId, context.userId);

  return {
    condition: `(${conditions.join(' OR ')})`,
    params,
  };
}

/**
 * 构建解决方案数据过滤条件
 */
function buildSolutionDataFilter(
  context: UserDataContext,
  tableName: string
): { condition: string; params: any[] } {
  const params: any[] = [];
  const conditions: string[] = [];

  // 1. 作为创建者
  conditions.push(`${tableName}.creator_id = ?`);
  params.push(context.userId);

  // 2. 作为项目相关的方案
  conditions.push(`EXISTS (
    SELECT 1 FROM bus_project p
    LEFT JOIN bus_project_member pm ON pm.project_id = p.id AND pm.user_id = ?
    WHERE p.id = ${tableName}.project_id
    AND (p.manager_id = ? OR pm.id IS NOT NULL)
  )`);
  params.push(context.userId, context.userId);

  // 3. 公开的方案
  conditions.push(`${tableName}.is_public = true`);

  return {
    condition: `(${conditions.join(' OR ')})`,
    params,
  };
}

/**
 * 检查是否有全部数据权限
 */
export async function hasAllDataPermission(
  userId: number,
  resource: ResourceType
): Promise<boolean> {
  const permission = await getDataPermission(userId, resource);
  return permission.scope === 'all';
}

/**
 * 检查是否有仅自己的数据权限
 */
export async function hasSelfDataPermission(
  userId: number,
  resource: ResourceType
): Promise<boolean> {
  const permission = await getDataPermission(userId, resource);
  return permission.scope === 'self';
}
