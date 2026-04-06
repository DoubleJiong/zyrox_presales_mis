/**
 * 数据权限模块
 * 
 * 导出所有权限相关的类型、服务和工具
 */

// 类型定义
export type { 
  RoleDataPermission,
  PermissionContext,
  PermissionCheckResult,
} from './types';

export {
  DataScope,
  PermissionLevel,
  RESOURCE_FIELD_MAP,
  ADMIN_ROLE_CODES,
  DEFAULT_ROLE_PERMISSIONS,
} from './types';

// 资源类型需要单独导出
export type { ResourceType } from './types';

// 核心服务
export {
  DataPermissionService,
  getPermissionContext,
  buildScopeCondition,
  checkRecordPermission,
  getAccessibleResourceIds,
} from './data-scope';

// 查询构建器
export {
  PermissionQueryBuilder,
} from './query-builder';

export type { 
  QueryOptions,
  FilterCondition,
} from './query-builder';

// 中间件和工具
export {
  withDataPermission,
  createPermissionContext,
  hasFullAccess,
  isSelfOnly,
  hasManageScope,
  canCreate,
  canRead,
  canUpdate,
  canDelete,
  getAccessibleUserIds,
} from './middleware';

export type { 
  PermissionContextWithExtras,
  DataPermissionOptions,
} from './middleware';
