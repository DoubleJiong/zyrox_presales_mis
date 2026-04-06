/**
 * RBAC 权限检查工具
 * 提供权限验证功能
 */

import { PERMISSIONS, SYSTEM_ROLES, API_PERMISSIONS, type Permission } from './permissions';

// =====================================================
// 类型定义
// =====================================================

export interface UserWithPermissions {
  id: number;
  username: string;
  realName: string;
  email: string;
  roleCode: string | null;
  permissions: Permission[];
  isSuperAdmin: boolean;
}

// =====================================================
// 权限缓存
// =====================================================

// 内存缓存用户权限（生产环境应使用Redis）
const permissionCache = new Map<number, {
  user: UserWithPermissions;
  expiry: number;
}>();

const CACHE_TTL = 5 * 60 * 1000; // 5分钟

/**
 * 清除用户权限缓存
 */
export function clearPermissionCache(userId: number): void {
  permissionCache.delete(userId);
}

/**
 * 清除所有权限缓存
 */
export function clearAllPermissionCache(): void {
  permissionCache.clear();
}

// =====================================================
// 权限获取
// =====================================================

/**
 * 获取用户权限信息
 * 支持两种角色来源：
 * 1. users.roleId 字段（单角色模式）
 * 2. sys_user_role 表（多角色模式）
 */
export async function getUserPermissions(userId: number): Promise<UserWithPermissions | null> {
  const [{ db }, schemaModule, drizzleOrm] = await Promise.all([
    import('@/db'),
    import('@/db/schema'),
    import('drizzle-orm'),
  ]);
  const { users, roles, userRoles } = schemaModule;
  const { eq, and, isNull } = drizzleOrm;

  // 检查缓存
  const cached = permissionCache.get(userId);
  if (cached && cached.expiry > Date.now()) {
    return cached.user;
  }

  // 查询用户信息（包含 roleId）
  const user = await db
    .select({
      id: users.id,
      username: users.username,
      realName: users.realName,
      email: users.email,
      roleId: users.roleId,
    })
    .from(users)
    .where(
      and(
        eq(users.id, userId),
        isNull(users.deletedAt)
      )
    )
    .limit(1);

  if (!user[0]) {
    return null;
  }

  const userInfo = user[0];

  // 收集所有角色信息
  const allRoles: { roleId: number | null; roleCode: string | null; permissions: Permission[] }[] = [];

  // 1. 查询用户的主角色（从 users.roleId）
  if (userInfo.roleId) {
    const primaryRole = await db
      .select({
        id: roles.id,
        roleCode: roles.roleCode,
        permissions: roles.permissions,
      })
      .from(roles)
      .where(
        and(
          eq(roles.id, userInfo.roleId),
          isNull(roles.deletedAt),
          eq(roles.status, 'active')
        )
      )
      .limit(1);

    if (primaryRole[0]) {
      allRoles.push({
        roleId: primaryRole[0].id,
        roleCode: primaryRole[0].roleCode,
        permissions: (primaryRole[0].permissions || []) as Permission[],
      });
    }
  }

  // 2. 查询用户的额外角色（从 sys_user_role 表）
  const userRolesList = await db
    .select({
      roleId: userRoles.roleId,
      roleCode: roles.roleCode,
      permissions: roles.permissions,
    })
    .from(userRoles)
    .leftJoin(roles, eq(userRoles.roleId, roles.id))
    .where(
      and(
        eq(userRoles.userId, userId),
        isNull(roles.deletedAt),
        eq(roles.status, 'active')
      )
    );

  for (const ur of userRolesList) {
    // 避免重复添加同一个角色
    if (!allRoles.find(r => r.roleId === ur.roleId)) {
      allRoles.push({
        roleId: ur.roleId,
        roleCode: ur.roleCode,
        permissions: (ur.permissions || []) as Permission[],
      });
    }
  }

  // 合并所有角色的权限
  let permissions: Permission[] = [];
  let roleCode: string | null = null;
  let isSuperAdmin = false;

  if (allRoles.length > 0) {
    // 使用第一个角色作为主角色编码（用于兼容性）
    roleCode = allRoles[0].roleCode;

    for (const role of allRoles) {
      if (role.permissions && role.permissions.length > 0) {
        permissions = [...permissions, ...role.permissions];
      }

      // 检查是否是超级管理员
      if (role.roleCode === SYSTEM_ROLES.SUPER_ADMIN.code) {
        isSuperAdmin = true;
      }
    }

    // 去重
    permissions = [...new Set(permissions)];

    // 如果是超级管理员，给予所有权限
    if (isSuperAdmin) {
      permissions = Object.values(PERMISSIONS);
    }
  }

  const userWithPermissions: UserWithPermissions = {
    id: userInfo.id,
    username: userInfo.username,
    realName: userInfo.realName,
    email: userInfo.email,
    roleCode,
    permissions,
    isSuperAdmin,
  };

  // 更新缓存
  permissionCache.set(userId, {
    user: userWithPermissions,
    expiry: Date.now() + CACHE_TTL,
  });

  return userWithPermissions;
}

// =====================================================
// 权限检查
// =====================================================

/**
 * 检查用户是否拥有指定权限
 * 支持多种权限格式：
 * 1. 标准格式：customer:view（单数 + 冒号）
 * 2. 数据库格式：customers.view（复数 + 点号）
 * 3. 模块通配符：customers.* 或 customer.*（匹配该模块所有权限）
 * 4. 全局通配符：*（匹配所有权限）
 */
export function hasPermission(
  user: UserWithPermissions,
  permission: Permission
): boolean {
  // 超级管理员拥有所有权限
  if (user.isSuperAdmin) {
    return true;
  }

  // 检查是否有全局通配符权限
  if (user.permissions.includes('*' as Permission)) {
    return true;
  }

  // 精确匹配
  if (user.permissions.includes(permission)) {
    return true;
  }

  // 解析权限模块和操作
  // 标准格式：customer:view
  const [module, action] = permission.split(':');

  const moduleVariants = [module];

  // 检查各种可能的权限格式变体
  const permissionVariants = Array.from(new Set(moduleVariants.flatMap((variantModule) => [
    // 模块通配符（单数 + 冒号）：customer:* 匹配 customer:view
    `${variantModule}:*`,
    // 模块通配符（复数 + 冒号）：customers:* 匹配 customer:view
    `${variantModule}s:*`,
    // 模块通配符（复数 + 点号）：customers.* 匹配 customer:view
    `${variantModule}s.*`,
    // 模块通配符（单数 + 点号）：customer.* 匹配 customer:view
    `${variantModule}.*`,
    `${variantModule}:${action}`,
    // 数据库格式（复数 + 点号）：customers.view 匹配 customer:view
    `${variantModule}s.${action}`,
    // 数据库格式（单数 + 点号）：customer.view 匹配 customer:view
    `${variantModule}.${action}`,
  ])));

  // 检查是否有任一变体匹配
  for (const variant of permissionVariants) {
    if (user.permissions.includes(variant as Permission)) {
      return true;
    }
  }

  return false;
}

/**
 * 检查用户是否拥有所有指定权限
 */
export function hasAllPermissions(
  user: UserWithPermissions,
  permissions: Permission[]
): boolean {
  return permissions.every(p => hasPermission(user, p));
}

/**
 * 检查用户是否拥有任一指定权限
 */
export function hasAnyPermission(
  user: UserWithPermissions,
  permissions: Permission[]
): boolean {
  return permissions.some(p => hasPermission(user, p));
}

// =====================================================
// API权限检查
// =====================================================

/**
 * 获取API所需的权限
 */
export function getRequiredPermissions(
  method: string,
  path: string
): Permission[] | null {
  // 规范化路径
  const normalizedPath = path.replace(/\/\d+/g, ''); // 移除ID参数
  const key = `${method.toUpperCase()}:${normalizedPath}`;

  return API_PERMISSIONS[key] || null;
}

/**
 * 检查API访问权限
 */
export async function checkApiPermission(
  userId: number,
  method: string,
  path: string
): Promise<{ allowed: boolean; reason?: string }> {
  // 获取用户权限
  const user = await getUserPermissions(userId);
  if (!user) {
    return { allowed: false, reason: '用户不存在或已禁用' };
  }

  // 超级管理员放行
  if (user.isSuperAdmin) {
    return { allowed: true };
  }

  // 检查是否有通配符权限（拥有所有权限）
  if (user.permissions.includes('*' as Permission)) {
    return { allowed: true };
  }

  // 公开API路径（无需权限）
  const publicPaths = ['/api/auth', '/api/login', '/api/health', '/api/public'];
  if (publicPaths.some(p => path.startsWith(p))) {
    return { allowed: true };
  }

  // 获取API所需权限
  const requiredPermissions = getRequiredPermissions(method, path);

  // 如果没有定义权限要求，使用默认规则
  if (!requiredPermissions || requiredPermissions.length === 0) {
    // 对于未定义权限的API，检查用户是否有任何权限（至少有一个权限才能访问）
    if (user.permissions.length === 0) {
      return { allowed: false, reason: '没有访问权限，请联系管理员分配角色' };
    }
    // 有权限的用户可以访问未明确定义权限的API
    return { allowed: true };
  }

  // 检查权限
  const hasAccess = hasAnyPermission(user, requiredPermissions);
  if (!hasAccess) {
    return {
      allowed: false,
      reason: `需要权限: ${requiredPermissions.join(', ')}`,
    };
  }

  return { allowed: true };
}

// =====================================================
// 数据权限检查
// =====================================================

/**
 * 数据权限过滤条件
 */
export interface DataPermissionFilter {
  ownerOnly?: boolean;      // 只能查看自己创建的
  departmentOnly?: boolean;  // 只能查看本部门的
  customFilter?: Record<string, unknown>; // 自定义过滤条件
}

/**
 * 获取数据权限过滤条件
 */
export function getDataPermissionFilter(
  user: UserWithPermissions,
  resourceType: string
): DataPermissionFilter {
  // 超级管理员无限制
  if (user.isSuperAdmin) {
    return {};
  }

  // 根据角色类型设置数据权限
  switch (user.roleCode) {
    case SYSTEM_ROLES.ADMIN.code:
      // 管理员可以查看所有数据
      return {};

    case SYSTEM_ROLES.DEPT_MANAGER.code:
      // 部门经理只能查看本部门数据
      return { departmentOnly: true };

    case SYSTEM_ROLES.SALES.code:
      // 销售只能查看自己的数据
      return { ownerOnly: true };

    case SYSTEM_ROLES.VIEWER.code:
      // 只读用户可以查看所有数据
      return {};

    default:
      // 默认只能查看自己的数据
      return { ownerOnly: true };
  }
}

// =====================================================
// 权限初始化
// =====================================================

/**
 * 初始化系统角色
 */
export async function initializeRoles(): Promise<void> {
  const [{ db }, schemaModule, drizzleOrm] = await Promise.all([
    import('@/db'),
    import('@/db/schema'),
    import('drizzle-orm'),
  ]);
  const { roles } = schemaModule;
  const { eq } = drizzleOrm;

  for (const [key, role] of Object.entries(SYSTEM_ROLES)) {
    const existing = await db
      .select()
      .from(roles)
      .where(eq(roles.roleCode, role.code))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(roles).values({
        roleName: role.name,
        roleCode: role.code,
        description: role.description,
        permissions: [...role.permissions] as string[],
        status: 'active',
      });
      console.log(`[RBAC] Created role: ${role.name}`);
    } else {
      // 更新权限
      await db
        .update(roles)
        .set({
          permissions: [...role.permissions] as string[],
          updatedAt: new Date(),
        })
        .where(eq(roles.id, existing[0].id));
      console.log(`[RBAC] Updated role: ${role.name}`);
    }
  }
}
