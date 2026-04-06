/**
 * 数据权限服务
 * 
 * 核心功能：
 * 1. 根据角色和资源获取数据权限范围
 * 2. 构建数据查询条件
 * 3. 检查用户对特定资源的操作权限
 */

import { eq, and, SQL, sql } from 'drizzle-orm';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { 
  DataScope, 
  ResourceType, 
  PermissionLevel,
  PermissionContext,
  RoleDataPermission,
  RESOURCE_FIELD_MAP,
  ADMIN_ROLE_CODES,
  DEFAULT_ROLE_PERMISSIONS,
  PermissionCheckResult,
} from './types';

// 重新导出 DataScope 以便其他模块使用
export { DataScope };

// 类型定义
interface UserRole {
  id: number;
  roleName: string;
  roleCode: string;
}

interface UserWithRole {
  id: number;
  realName: string;
  roleId: number | null;
  role?: UserRole | null;
}

// ============================================
// 权限服务类
// ============================================

export class DataPermissionService {
  
  /**
   * 获取用户对指定资源的权限上下文
   */
  static async getPermissionContext(
    userId: number,
    resource: ResourceType
  ): Promise<PermissionContext> {
    // 获取用户信息
    const userResult = await db.query.users.findFirst({
      where: eq(schema.users.id, userId),
      with: {
        role: true,
      },
    });

    if (!userResult) {
      throw new Error(`User not found: ${userId}`);
    }

    // 类型断言处理
    const user = userResult as unknown as UserWithRole;
    const role = user.role;
    const normalizedRoleCode = role?.roleCode?.toLowerCase() || null;
    
    if (!role) {
      // 用户没有分配角色时，返回一个受限的权限上下文
      // 返回 SELF 范围，但用户实际上没有任何权限访问
      console.warn(`User ${userId} has no role assigned, returning restricted context`);
      return {
        userId,
        roleId: null,
        roleCode: null,
        dataPermission: {
          id: 0,
          roleId: 0,
          resource,
          scope: DataScope.NONE, // 无权限
        },
      };
    }

    // 获取角色数据权限配置
    let dataPermission: RoleDataPermission | null = null;

    // 管理员角色默认全部权限
    if (normalizedRoleCode && ADMIN_ROLE_CODES.includes(normalizedRoleCode)) {
      dataPermission = {
        id: 0,
        roleId: role.id,
        resource,
        scope: DataScope.ALL,
      };
    } else {
      // 查询数据库中的权限配置
      const permission = await db.query.roleDataPermissions.findFirst({
        where: and(
          eq(schema.roleDataPermissions.roleId, role.id),
          eq(schema.roleDataPermissions.resource, resource)
        ),
      });

      if (permission) {
        let allowedFields: string[] | undefined;
        let conditions: Record<string, any> | undefined;
        
        if (permission.allowedFields) {
          try {
            allowedFields = JSON.parse(permission.allowedFields as unknown as string);
          } catch {
            allowedFields = undefined;
          }
        }
        
        if (permission.conditions) {
          try {
            conditions = JSON.parse(permission.conditions as unknown as string);
          } catch {
            conditions = undefined;
          }
        }

        dataPermission = {
          id: permission.id,
          roleId: permission.roleId,
          resource: permission.resource as ResourceType,
          scope: permission.scope as DataScope,
          allowedFields,
          conditions,
        };
      } else {
        // 使用默认权限配置
        const defaultScope = (normalizedRoleCode && DEFAULT_ROLE_PERMISSIONS[normalizedRoleCode]?.[resource]) || DataScope.SELF;
        dataPermission = {
          id: 0,
          roleId: role.id,
          resource,
          scope: defaultScope,
        };
      }
    }

    return {
      userId,
      roleId: role.id,
      roleCode: role.roleCode,
      dataPermission,
    };
  }

  /**
   * 构建数据范围查询条件
   */
  static buildScopeCondition(
    context: PermissionContext,
    resource: ResourceType,
    tableAlias?: string
  ): SQL<unknown> | undefined {
    const { userId, dataPermission } = context;
    const resourceConfig = RESOURCE_FIELD_MAP[resource];
    
    if (!resourceConfig) {
      throw new Error(`Unknown resource type: ${resource}`);
    }

    if (!dataPermission) {
      const fieldName = resourceConfig.creatorField;
      return tableAlias 
        ? eq(sql.raw(`${tableAlias}.${fieldName}`), userId)
        : eq(sql.raw(fieldName), userId);
    }

    const prefix = tableAlias ? `${tableAlias}.` : '';

    switch (dataPermission.scope) {
      case DataScope.NONE:
        // 无权限：返回一个永远为 false 的条件
        return sql`1 = 0`;

      case DataScope.ALL:
        return undefined;

      case DataScope.SELF:
        return eq(sql.raw(`${prefix}${resourceConfig.creatorField}`), userId);

      case DataScope.ROLE:
        return eq(sql.raw(`${prefix}${resourceConfig.creatorField}`), userId);

      case DataScope.MANAGE:
        if (resourceConfig.managerField) {
          return sql`(${sql.raw(prefix + resourceConfig.creatorField)} = ${userId} OR ${sql.raw(prefix + resourceConfig.managerField)} = ${userId})`;
        }
        return eq(sql.raw(`${prefix}${resourceConfig.creatorField}`), userId);

      default:
        return eq(sql.raw(`${prefix}${resourceConfig.creatorField}`), userId);
    }
  }

  /**
   * 检查用户对特定记录的权限
   */
  static async checkRecordPermission(
    userId: number,
    resource: ResourceType,
    _recordId: number,
    requiredLevel: PermissionLevel
  ): Promise<PermissionCheckResult> {
    const context = await this.getPermissionContext(userId, resource);
    
    if (ADMIN_ROLE_CODES.includes(context.roleCode)) {
      return {
        allowed: true,
        level: PermissionLevel.SUPER,
        scope: DataScope.ALL,
      };
    }

    const resourceConfig = RESOURCE_FIELD_MAP[resource];
    if (!resourceConfig) {
      return {
        allowed: false,
        level: PermissionLevel.NONE,
        scope: DataScope.SELF,
        reason: 'Unknown resource type',
      };
    }

    const scope = context.dataPermission?.scope || DataScope.SELF;
    const level = PermissionLevel.READ;

    return {
      allowed: level >= requiredLevel,
      level,
      scope,
    };
  }

  /**
   * 获取用户可访问的资源ID列表
   */
  static async getAccessibleResourceIds(
    userId: number,
    resource: ResourceType
  ): Promise<number[]> {
    const context = await this.getPermissionContext(userId, resource);
    
    const tableMap: Partial<Record<ResourceType, any>> = {
      customer: schema.customers,
      project: schema.projects,
      solution: schema.solutions,
      task: schema.tasks,
      opportunity: schema.opportunities,
      bidding: schema.projectBiddings,
      quotation: schema.quotations,
      knowledge: schema.solutions,
      staff: schema.users,
    };

    const table = tableMap[resource];
    if (!table) return [];

    const condition = this.buildScopeCondition(context, resource);

    const query = condition 
      ? db.select({ id: table.id }).from(table).where(condition)
      : db.select({ id: table.id }).from(table);

    const results = await query;
    return results.map(r => r.id);
  }
}

// ============================================
// 导出便捷方法
// ============================================

export const getPermissionContext = DataPermissionService.getPermissionContext;
export const buildScopeCondition = DataPermissionService.buildScopeCondition;
export const checkRecordPermission = DataPermissionService.checkRecordPermission;
export const getAccessibleResourceIds = DataPermissionService.getAccessibleResourceIds;
