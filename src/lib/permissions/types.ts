/**
 * 数据权限系统类型定义
 * 
 * 权限范围说明：
 * - all: 全部数据（管理员级别）
 * - self: 仅自己创建/负责的数据
 * - role: 同角色用户的数据
 * - manage: 自己管理的数据（如项目负责人看到的项目数据）
 */

// ============================================
// 数据权限范围枚举
// ============================================

export enum DataScope {
  NONE = 'none',       // 无权限
  ALL = 'all',           // 全部数据
  SELF = 'self',         // 仅自己的数据
  ROLE = 'role',         // 同角色数据
  MANAGE = 'manage',     // 自己管理的数据
}

// ============================================
// 资源类型定义
// ============================================

export type ResourceType = 
  | 'customer' 
  | 'project' 
  | 'solution' 
  | 'task' 
  | 'opportunity' 
  | 'bidding' 
  | 'quotation'
  | 'knowledge'
  | 'staff';

// ============================================
// 权限级别定义
// ============================================

export enum PermissionLevel {
  NONE = 0,       // 无权限
  READ = 1,       // 只读权限
  WRITE = 2,      // 读写权限（CRUD）
  ADMIN = 3,      // 管理权限（包含删除、团队成员管理等）
  SUPER = 4,      // 超级管理员权限
}

// ============================================
// 角色数据权限配置
// ============================================

export interface RoleDataPermission {
  id: number;
  roleId: number | null;
  resource: ResourceType;
  scope: DataScope;
  allowedFields?: string[];
  conditions?: Record<string, any>;
}

// ============================================
// 权限上下文
// ============================================

export interface PermissionContext {
  userId: number;
  roleId: number | null;
  roleCode: string | null;
  dataPermission: RoleDataPermission | null;
}

// ============================================
// 资源字段映射
// ============================================

export const RESOURCE_FIELD_MAP: Record<ResourceType, {
  creatorField: string;
  tableName: string;
  managerField?: string;
}> = {
  customer: {
    creatorField: 'createdBy',
    tableName: 'bus_customer',
  },
  project: {
    creatorField: 'createdBy',
    tableName: 'bus_project',
    managerField: 'managerId',
  },
  solution: {
    creatorField: 'authorId',
    tableName: 'bus_solution',
  },
  task: {
    creatorField: 'createdBy',
    tableName: 'bus_project_task',
    managerField: 'assigneeId',
  },
  opportunity: {
    creatorField: 'createdBy',
    tableName: 'bus_opportunity',
    managerField: 'ownerId',
  },
  bidding: {
    creatorField: 'createdBy',
    tableName: 'bus_project_bidding',
  },
  quotation: {
    creatorField: 'createdBy',
    tableName: 'bus_quotation',
  },
  knowledge: {
    creatorField: 'authorId',
    tableName: 'bus_solution',
  },
  staff: {
    creatorField: 'id',
    tableName: 'sys_user',
  },
};

// ============================================
// 管理员角色代码
// ============================================

export const ADMIN_ROLE_CODES = ['admin', 'super_admin', 'system_admin'];

// ============================================
// 默认权限配置
// ============================================

export const DEFAULT_ROLE_PERMISSIONS: Record<string, Record<ResourceType, DataScope>> = {
  // 管理员 - 全部权限
  admin: {
    customer: DataScope.ALL,
    project: DataScope.ALL,
    solution: DataScope.ALL,
    task: DataScope.ALL,
    opportunity: DataScope.ALL,
    bidding: DataScope.ALL,
    quotation: DataScope.ALL,
    knowledge: DataScope.ALL,
    staff: DataScope.ALL,
  },
  // 销售 - 自己的客户，自己负责的项目
  sales: {
    customer: DataScope.SELF,
    project: DataScope.MANAGE,
    solution: DataScope.ALL,
    task: DataScope.SELF,
    opportunity: DataScope.SELF,
    bidding: DataScope.MANAGE,
    quotation: DataScope.SELF,
    knowledge: DataScope.ALL,
    staff: DataScope.SELF,
  },
  // 售前工程师 - 同角色的数据
  presales: {
    customer: DataScope.ROLE,
    project: DataScope.MANAGE,
    solution: DataScope.ALL,
    task: DataScope.SELF,
    opportunity: DataScope.ROLE,
    bidding: DataScope.MANAGE,
    quotation: DataScope.SELF,
    knowledge: DataScope.ALL,
    staff: DataScope.SELF,
  },
  // 售前经理 - 同角色数据 + 管理权限
  presales_manager: {
    customer: DataScope.ALL,
    project: DataScope.ALL,
    solution: DataScope.ALL,
    task: DataScope.ROLE,
    opportunity: DataScope.ROLE,
    bidding: DataScope.ALL,
    quotation: DataScope.ROLE,
    knowledge: DataScope.ALL,
    staff: DataScope.ROLE,
  },
};

// ============================================
// 权限检查结果
// ============================================

export interface PermissionCheckResult {
  allowed: boolean;
  level: PermissionLevel;
  scope: DataScope;
  reason?: string;
}
