/**
 * RBAC 权限系统定义
 * 基于角色的访问控制（Role-Based Access Control）
 */

// =====================================================
// 权限定义
// =====================================================

// 模块权限
export const PERMISSIONS = {
  // 客户管理
  CUSTOMER_VIEW: 'customer:view',
  CUSTOMER_CREATE: 'customer:create',
  CUSTOMER_UPDATE: 'customer:update',
  CUSTOMER_DELETE: 'customer:delete',
  CUSTOMER_EXPORT: 'customer:export',

  // 项目管理
  PROJECT_VIEW: 'project:view',
  PROJECT_CREATE: 'project:create',
  PROJECT_UPDATE: 'project:update',
  PROJECT_DELETE: 'project:delete',
  PROJECT_EXPORT: 'project:export',

  // 线索管理
  LEAD_VIEW: 'lead:view',
  LEAD_CREATE: 'lead:create',
  LEAD_UPDATE: 'lead:update',
  LEAD_DELETE: 'lead:delete',
  LEAD_CONVERT: 'lead:convert',

  // 解决方案
  SOLUTION_VIEW: 'solution:view',
  SOLUTION_CREATE: 'solution:create',
  SOLUTION_UPDATE: 'solution:update',
  SOLUTION_DELETE: 'solution:delete',

  // 绩效管理
  PERFORMANCE_VIEW: 'performance:view',
  PERFORMANCE_CREATE: 'performance:create',
  PERFORMANCE_UPDATE: 'performance:update',
  PERFORMANCE_DELETE: 'performance:delete',

  // 预警管理
  ALERT_VIEW: 'alert:view',
  ALERT_CREATE: 'alert:create',
  ALERT_UPDATE: 'alert:update',
  ALERT_DELETE: 'alert:delete',

  // 仲裁管理
  ARBITRATION_VIEW: 'arbitration:view',
  ARBITRATION_CREATE: 'arbitration:create',
  ARBITRATION_UPDATE: 'arbitration:update',
  ARBITRATION_DELETE: 'arbitration:delete',

  // 人员管理
  USER_VIEW: 'user:view',
  USER_CREATE: 'user:create',
  USER_UPDATE: 'user:update',
  USER_DELETE: 'user:delete',

  // 角色管理
  ROLE_VIEW: 'role:view',
  ROLE_CREATE: 'role:create',
  ROLE_UPDATE: 'role:update',
  ROLE_DELETE: 'role:delete',

  // 系统设置
  SETTINGS_VIEW: 'settings:view',
  SETTINGS_UPDATE: 'settings:update',

  // 数据字典
  DICT_VIEW: 'dict:view',
  DICT_CREATE: 'dict:create',
  DICT_UPDATE: 'dict:update',
  DICT_DELETE: 'dict:delete',

  // 数据大屏
  DATASCREEN_VIEW: 'datascreen:view',
  DATASCREEN_EXPORT: 'datascreen:export',

  // 操作日志
  LOG_VIEW: 'log:view',
  LOG_EXPORT: 'log:export',

  // 工作台
  WORKSPACE_VIEW: 'workspace:view',
} as const;

// 权限类型
export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

// =====================================================
// 角色定义
// =====================================================

// 系统预设角色
export const SYSTEM_ROLES = {
  // 超级管理员 - 拥有所有权限
  SUPER_ADMIN: {
    code: 'super_admin',
    name: '超级管理员',
    description: '系统最高权限，拥有所有功能',
    permissions: Object.values(PERMISSIONS),
  },

  // 管理员 - 大部分权限
  ADMIN: {
    code: 'admin',
    name: '管理员',
    description: '系统管理员，拥有大部分管理权限',
    permissions: [
      PERMISSIONS.CUSTOMER_VIEW,
      PERMISSIONS.CUSTOMER_CREATE,
      PERMISSIONS.CUSTOMER_UPDATE,
      PERMISSIONS.CUSTOMER_DELETE,
      PERMISSIONS.CUSTOMER_EXPORT,
      PERMISSIONS.PROJECT_VIEW,
      PERMISSIONS.PROJECT_CREATE,
      PERMISSIONS.PROJECT_UPDATE,
      PERMISSIONS.PROJECT_DELETE,
      PERMISSIONS.PROJECT_EXPORT,
      PERMISSIONS.LEAD_VIEW,
      PERMISSIONS.LEAD_CREATE,
      PERMISSIONS.LEAD_UPDATE,
      PERMISSIONS.LEAD_DELETE,
      PERMISSIONS.LEAD_CONVERT,
      PERMISSIONS.SOLUTION_VIEW,
      PERMISSIONS.SOLUTION_CREATE,
      PERMISSIONS.SOLUTION_UPDATE,
      PERMISSIONS.SOLUTION_DELETE,
      PERMISSIONS.PERFORMANCE_VIEW,
      PERMISSIONS.PERFORMANCE_CREATE,
      PERMISSIONS.PERFORMANCE_UPDATE,
      PERMISSIONS.ALERT_VIEW,
      PERMISSIONS.ALERT_CREATE,
      PERMISSIONS.ALERT_UPDATE,
      PERMISSIONS.ARBITRATION_VIEW,
      PERMISSIONS.ARBITRATION_CREATE,
      PERMISSIONS.ARBITRATION_UPDATE,
      PERMISSIONS.USER_VIEW,
      PERMISSIONS.USER_CREATE,
      PERMISSIONS.USER_UPDATE,
      PERMISSIONS.ROLE_VIEW,
      PERMISSIONS.SETTINGS_VIEW,
      PERMISSIONS.SETTINGS_UPDATE,
      PERMISSIONS.DICT_VIEW,
      PERMISSIONS.DICT_CREATE,
      PERMISSIONS.DICT_UPDATE,
      PERMISSIONS.DATASCREEN_VIEW,
      PERMISSIONS.DATASCREEN_EXPORT,
      PERMISSIONS.LOG_VIEW,
      PERMISSIONS.WORKSPACE_VIEW,
    ],
  },

  // 部门经理
  DEPT_MANAGER: {
    code: 'dept_manager',
    name: '部门经理',
    description: '部门经理，管理本部门业务',
    permissions: [
      PERMISSIONS.CUSTOMER_VIEW,
      PERMISSIONS.CUSTOMER_CREATE,
      PERMISSIONS.CUSTOMER_UPDATE,
      PERMISSIONS.CUSTOMER_EXPORT,
      PERMISSIONS.PROJECT_VIEW,
      PERMISSIONS.PROJECT_CREATE,
      PERMISSIONS.PROJECT_UPDATE,
      PERMISSIONS.PROJECT_EXPORT,
      PERMISSIONS.LEAD_VIEW,
      PERMISSIONS.LEAD_CREATE,
      PERMISSIONS.LEAD_UPDATE,
      PERMISSIONS.LEAD_CONVERT,
      PERMISSIONS.SOLUTION_VIEW,
      PERMISSIONS.SOLUTION_CREATE,
      PERMISSIONS.SOLUTION_UPDATE,
      PERMISSIONS.PERFORMANCE_VIEW,
      PERMISSIONS.PERFORMANCE_CREATE,
      PERMISSIONS.PERFORMANCE_UPDATE,
      PERMISSIONS.ALERT_VIEW,
      PERMISSIONS.ALERT_CREATE,
      PERMISSIONS.ALERT_UPDATE,
      PERMISSIONS.ARBITRATION_VIEW,
      PERMISSIONS.ARBITRATION_CREATE,
      PERMISSIONS.USER_VIEW,
      PERMISSIONS.DATASCREEN_VIEW,
      PERMISSIONS.LOG_VIEW,
      PERMISSIONS.WORKSPACE_VIEW,
    ],
  },

  // 销售人员
  SALES: {
    code: 'sales',
    name: '销售人员',
    description: '一线销售人员',
    permissions: [
      PERMISSIONS.CUSTOMER_VIEW,
      PERMISSIONS.CUSTOMER_CREATE,
      PERMISSIONS.CUSTOMER_UPDATE,
      PERMISSIONS.PROJECT_VIEW,
      PERMISSIONS.PROJECT_CREATE,
      PERMISSIONS.PROJECT_UPDATE,
      PERMISSIONS.LEAD_VIEW,
      PERMISSIONS.LEAD_CREATE,
      PERMISSIONS.LEAD_UPDATE,
      PERMISSIONS.LEAD_CONVERT,
      PERMISSIONS.SOLUTION_VIEW,
      PERMISSIONS.SOLUTION_CREATE,
      PERMISSIONS.PERFORMANCE_VIEW,
      PERMISSIONS.ALERT_VIEW,
      PERMISSIONS.ALERT_CREATE,
      PERMISSIONS.ARBITRATION_VIEW,
      PERMISSIONS.DATASCREEN_VIEW,
      PERMISSIONS.WORKSPACE_VIEW,
    ],
  },

  // 只读用户
  VIEWER: {
    code: 'viewer',
    name: '只读用户',
    description: '只能查看数据，不能修改',
    permissions: [
      PERMISSIONS.CUSTOMER_VIEW,
      PERMISSIONS.PROJECT_VIEW,
      PERMISSIONS.LEAD_VIEW,
      PERMISSIONS.SOLUTION_VIEW,
      PERMISSIONS.PERFORMANCE_VIEW,
      PERMISSIONS.ALERT_VIEW,
      PERMISSIONS.DATASCREEN_VIEW,
      PERMISSIONS.WORKSPACE_VIEW,
    ],
  },
} as const;

// =====================================================
// 权限分组（用于前端展示）
// =====================================================

export const PERMISSION_GROUPS = {
  customer: {
    name: '客户管理',
    permissions: [
      { key: PERMISSIONS.CUSTOMER_VIEW, label: '查看客户' },
      { key: PERMISSIONS.CUSTOMER_CREATE, label: '创建客户' },
      { key: PERMISSIONS.CUSTOMER_UPDATE, label: '编辑客户' },
      { key: PERMISSIONS.CUSTOMER_DELETE, label: '删除客户' },
      { key: PERMISSIONS.CUSTOMER_EXPORT, label: '导出客户' },
    ],
  },
  project: {
    name: '项目管理',
    permissions: [
      { key: PERMISSIONS.PROJECT_VIEW, label: '查看项目' },
      { key: PERMISSIONS.PROJECT_CREATE, label: '创建项目' },
      { key: PERMISSIONS.PROJECT_UPDATE, label: '编辑项目' },
      { key: PERMISSIONS.PROJECT_DELETE, label: '删除项目' },
      { key: PERMISSIONS.PROJECT_EXPORT, label: '导出项目' },
    ],
  },
  lead: {
    name: '线索管理',
    permissions: [
      { key: PERMISSIONS.LEAD_VIEW, label: '查看线索' },
      { key: PERMISSIONS.LEAD_CREATE, label: '创建线索' },
      { key: PERMISSIONS.LEAD_UPDATE, label: '编辑线索' },
      { key: PERMISSIONS.LEAD_DELETE, label: '删除线索' },
      { key: PERMISSIONS.LEAD_CONVERT, label: '转化线索' },
    ],
  },
  solution: {
    name: '解决方案',
    permissions: [
      { key: PERMISSIONS.SOLUTION_VIEW, label: '查看解决方案' },
      { key: PERMISSIONS.SOLUTION_CREATE, label: '创建解决方案' },
      { key: PERMISSIONS.SOLUTION_UPDATE, label: '编辑解决方案' },
      { key: PERMISSIONS.SOLUTION_DELETE, label: '删除解决方案' },
    ],
  },
  performance: {
    name: '绩效管理',
    permissions: [
      { key: PERMISSIONS.PERFORMANCE_VIEW, label: '查看绩效' },
      { key: PERMISSIONS.PERFORMANCE_CREATE, label: '创建绩效' },
      { key: PERMISSIONS.PERFORMANCE_UPDATE, label: '编辑绩效' },
      { key: PERMISSIONS.PERFORMANCE_DELETE, label: '删除绩效' },
    ],
  },
  alert: {
    name: '预警管理',
    permissions: [
      { key: PERMISSIONS.ALERT_VIEW, label: '查看预警' },
      { key: PERMISSIONS.ALERT_CREATE, label: '创建预警' },
      { key: PERMISSIONS.ALERT_UPDATE, label: '编辑预警' },
      { key: PERMISSIONS.ALERT_DELETE, label: '删除预警' },
    ],
  },
  arbitration: {
    name: '仲裁管理',
    permissions: [
      { key: PERMISSIONS.ARBITRATION_VIEW, label: '查看仲裁' },
      { key: PERMISSIONS.ARBITRATION_CREATE, label: '创建仲裁' },
      { key: PERMISSIONS.ARBITRATION_UPDATE, label: '编辑仲裁' },
      { key: PERMISSIONS.ARBITRATION_DELETE, label: '删除仲裁' },
    ],
  },
  user: {
    name: '人员管理',
    permissions: [
      { key: PERMISSIONS.USER_VIEW, label: '查看用户' },
      { key: PERMISSIONS.USER_CREATE, label: '创建用户' },
      { key: PERMISSIONS.USER_UPDATE, label: '编辑用户' },
      { key: PERMISSIONS.USER_DELETE, label: '删除用户' },
    ],
  },
  role: {
    name: '角色管理',
    permissions: [
      { key: PERMISSIONS.ROLE_VIEW, label: '查看角色' },
      { key: PERMISSIONS.ROLE_CREATE, label: '创建角色' },
      { key: PERMISSIONS.ROLE_UPDATE, label: '编辑角色' },
      { key: PERMISSIONS.ROLE_DELETE, label: '删除角色' },
    ],
  },
  settings: {
    name: '系统设置',
    permissions: [
      { key: PERMISSIONS.SETTINGS_VIEW, label: '查看设置' },
      { key: PERMISSIONS.SETTINGS_UPDATE, label: '修改设置' },
    ],
  },
  dict: {
    name: '数据字典',
    permissions: [
      { key: PERMISSIONS.DICT_VIEW, label: '查看字典' },
      { key: PERMISSIONS.DICT_CREATE, label: '创建字典' },
      { key: PERMISSIONS.DICT_UPDATE, label: '编辑字典' },
      { key: PERMISSIONS.DICT_DELETE, label: '删除字典' },
    ],
  },
  datascreen: {
    name: '数据大屏',
    permissions: [
      { key: PERMISSIONS.DATASCREEN_VIEW, label: '查看大屏' },
      { key: PERMISSIONS.DATASCREEN_EXPORT, label: '导出数据' },
    ],
  },
  log: {
    name: '操作日志',
    permissions: [
      { key: PERMISSIONS.LOG_VIEW, label: '查看日志' },
      { key: PERMISSIONS.LOG_EXPORT, label: '导出日志' },
    ],
  },
} as const;

// =====================================================
// API路由权限映射
// =====================================================

export const API_PERMISSIONS: Record<string, Permission[]> = {
  // 客户相关
  'GET:/api/customers': [PERMISSIONS.CUSTOMER_VIEW],
  'POST:/api/customers': [PERMISSIONS.CUSTOMER_CREATE],
  'PUT:/api/customers': [PERMISSIONS.CUSTOMER_UPDATE],
  'DELETE:/api/customers': [PERMISSIONS.CUSTOMER_DELETE],
  'POST:/api/customers/export': [PERMISSIONS.CUSTOMER_EXPORT],

  // 项目相关
  'GET:/api/projects': [PERMISSIONS.PROJECT_VIEW],
  'POST:/api/projects': [PERMISSIONS.PROJECT_CREATE],
  'PUT:/api/projects': [PERMISSIONS.PROJECT_UPDATE],
  'DELETE:/api/projects': [PERMISSIONS.PROJECT_DELETE],
  'POST:/api/projects/export': [PERMISSIONS.PROJECT_EXPORT],

  // 线索相关
  'GET:/api/leads': [PERMISSIONS.LEAD_VIEW],
  'POST:/api/leads': [PERMISSIONS.LEAD_CREATE],
  'PUT:/api/leads': [PERMISSIONS.LEAD_UPDATE],
  'DELETE:/api/leads': [PERMISSIONS.LEAD_DELETE],
  'POST:/api/leads/convert': [PERMISSIONS.LEAD_CONVERT],

  // 解决方案
  'GET:/api/solutions': [PERMISSIONS.SOLUTION_VIEW],
  'POST:/api/solutions': [PERMISSIONS.SOLUTION_CREATE],
  'PUT:/api/solutions': [PERMISSIONS.SOLUTION_UPDATE],
  'DELETE:/api/solutions': [PERMISSIONS.SOLUTION_DELETE],

  // 绩效管理
  'GET:/api/performances': [PERMISSIONS.PERFORMANCE_VIEW],
  'POST:/api/performances': [PERMISSIONS.PERFORMANCE_CREATE],
  'PUT:/api/performances': [PERMISSIONS.PERFORMANCE_UPDATE],
  'DELETE:/api/performances': [PERMISSIONS.PERFORMANCE_DELETE],

  // 预警管理
  'GET:/api/alerts': [PERMISSIONS.ALERT_VIEW],
  'POST:/api/alerts': [PERMISSIONS.ALERT_CREATE],
  'PUT:/api/alerts': [PERMISSIONS.ALERT_UPDATE],
  'DELETE:/api/alerts': [PERMISSIONS.ALERT_DELETE],

  // 仲裁管理
  'GET:/api/arbitrations': [PERMISSIONS.ARBITRATION_VIEW],
  'POST:/api/arbitrations': [PERMISSIONS.ARBITRATION_CREATE],
  'PUT:/api/arbitrations': [PERMISSIONS.ARBITRATION_UPDATE],
  'DELETE:/api/arbitrations': [PERMISSIONS.ARBITRATION_DELETE],

  // 用户管理
  'GET:/api/users': [PERMISSIONS.USER_VIEW],
  'POST:/api/users': [PERMISSIONS.USER_CREATE],
  'PUT:/api/users': [PERMISSIONS.USER_UPDATE],
  'DELETE:/api/users': [PERMISSIONS.USER_DELETE],
  'GET:/api/staff': [PERMISSIONS.USER_VIEW],
  'POST:/api/staff': [PERMISSIONS.USER_CREATE],
  'PUT:/api/staff': [PERMISSIONS.USER_UPDATE],
  'DELETE:/api/staff': [PERMISSIONS.USER_DELETE],

  // 角色管理
  'GET:/api/roles': [PERMISSIONS.ROLE_VIEW],
  'POST:/api/roles': [PERMISSIONS.ROLE_CREATE],
  'PUT:/api/roles': [PERMISSIONS.ROLE_UPDATE],
  'DELETE:/api/roles': [PERMISSIONS.ROLE_DELETE],

  // 系统设置
  'GET:/api/settings': [PERMISSIONS.SETTINGS_VIEW],
  'PUT:/api/settings': [PERMISSIONS.SETTINGS_UPDATE],
  'GET:/api/settings/data-permissions': [PERMISSIONS.SETTINGS_VIEW],
  'POST:/api/settings/data-permissions': [PERMISSIONS.SETTINGS_UPDATE],
  'DELETE:/api/settings/data-permissions': [PERMISSIONS.SETTINGS_UPDATE],

  // 数据字典
  'GET:/api/dict': [PERMISSIONS.DICT_VIEW],
  'POST:/api/dict': [PERMISSIONS.DICT_CREATE],
  'PUT:/api/dict': [PERMISSIONS.DICT_UPDATE],
  'DELETE:/api/dict': [PERMISSIONS.DICT_DELETE],
  'GET:/api/dictionary': [PERMISSIONS.DICT_VIEW],
  'POST:/api/dictionary': [PERMISSIONS.DICT_CREATE],
  'PUT:/api/dictionary': [PERMISSIONS.DICT_UPDATE],
  'DELETE:/api/dictionary': [PERMISSIONS.DICT_DELETE],

  // 数据大屏
  'GET:/api/data-screen': [PERMISSIONS.DATASCREEN_VIEW],
  'GET:/api/data-screen/overview': [PERMISSIONS.DATASCREEN_VIEW],
  'GET:/api/data-screen/heatmap': [PERMISSIONS.DATASCREEN_VIEW],

  // 日志
  'GET:/api/logs': [PERMISSIONS.LOG_VIEW],
  'GET:/api/operation-logs': [PERMISSIONS.LOG_VIEW],
  'GET:/api/system-logs': [PERMISSIONS.LOG_VIEW],

  // 解决方案模板
  'GET:/api/solution-templates': [PERMISSIONS.SOLUTION_VIEW],
  'POST:/api/solution-templates': [PERMISSIONS.SOLUTION_CREATE],
  'PUT:/api/solution-templates': [PERMISSIONS.SOLUTION_UPDATE],
  'DELETE:/api/solution-templates': [PERMISSIONS.SOLUTION_DELETE],

  // 项目相关扩展
  'GET:/api/projects/starred': [PERMISSIONS.PROJECT_VIEW],
  'POST:/api/projects/starred': [PERMISSIONS.PROJECT_VIEW],
  'DELETE:/api/projects/starred': [PERMISSIONS.PROJECT_VIEW],
  'GET:/api/projects/my': [PERMISSIONS.PROJECT_VIEW],
  'GET:/api/projects/[id]/members': [PERMISSIONS.PROJECT_VIEW],
  'POST:/api/projects/[id]/members': [PERMISSIONS.PROJECT_UPDATE],
  'DELETE:/api/projects/[id]/members': [PERMISSIONS.PROJECT_UPDATE],
  'GET:/api/projects/[id]/knowledge-precipitation': [PERMISSIONS.PROJECT_VIEW],
  'POST:/api/projects/[id]/knowledge-precipitation': [PERMISSIONS.PROJECT_UPDATE],

  // 客户相关扩展
  'GET:/api/customers/[id]/follows': [PERMISSIONS.CUSTOMER_VIEW],
  'POST:/api/customers/[id]/follows': [PERMISSIONS.CUSTOMER_UPDATE],
  'GET:/api/customers/[id]/projects': [PERMISSIONS.CUSTOMER_VIEW],
  'POST:/api/customers/import': [PERMISSIONS.CUSTOMER_CREATE],
  'GET:/api/customers/export': [PERMISSIONS.CUSTOMER_EXPORT],

  // 工作日志
  'GET:/api/work-logs': [PERMISSIONS.WORKSPACE_VIEW],
  'POST:/api/work-logs': [PERMISSIONS.WORKSPACE_VIEW],
  'PUT:/api/work-logs': [PERMISSIONS.WORKSPACE_VIEW],
  'DELETE:/api/work-logs': [PERMISSIONS.WORKSPACE_VIEW],

  // 任务管理
  'GET:/api/tasks': [PERMISSIONS.WORKSPACE_VIEW],
  'POST:/api/tasks': [PERMISSIONS.WORKSPACE_VIEW],
  'PUT:/api/tasks': [PERMISSIONS.WORKSPACE_VIEW],
  'DELETE:/api/tasks': [PERMISSIONS.WORKSPACE_VIEW],

  // 日程管理
  'GET:/api/schedules': [PERMISSIONS.WORKSPACE_VIEW],
  'POST:/api/schedules': [PERMISSIONS.WORKSPACE_VIEW],
  'PUT:/api/schedules': [PERMISSIONS.WORKSPACE_VIEW],
  'DELETE:/api/schedules': [PERMISSIONS.WORKSPACE_VIEW],

  // 消息通知
  'GET:/api/messages': [PERMISSIONS.WORKSPACE_VIEW],
  'POST:/api/messages': [PERMISSIONS.WORKSPACE_VIEW],
  'DELETE:/api/messages': [PERMISSIONS.WORKSPACE_VIEW],
  'GET:/api/notifications': [PERMISSIONS.WORKSPACE_VIEW],
  'POST:/api/notifications': [PERMISSIONS.WORKSPACE_VIEW],
};
