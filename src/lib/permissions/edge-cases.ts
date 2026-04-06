/**
 * 权限边界场景处理工具
 * 处理复杂权限场景，如：
 * 1. 项目负责人变更时的权限交接
 * 2. 项目删除时关联合同的权限检查
 * 3. 跨部门协作的权限共享
 */

import { db } from '@/db';
import { projects, projectMembers, contracts, opportunities, users, roles } from '@/db/schema';
import { and, eq, sql } from 'drizzle-orm';
import { isSystemAdmin, getPermissionLevel, PermissionLevel } from './project';

/**
 * 权限边界检查结果
 */
export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
  requiresConfirmation?: boolean;
  affectedResources?: Array<{
    type: string;
    id: number;
    name: string;
    action: string;
  }>;
}

/**
 * 检查项目是否可以删除
 * - 检查是否存在关联合同
 * - 检查是否存在进行中的商机
 */
export async function checkProjectDeletionPermission(
  projectId: number,
  userId: number
): Promise<PermissionCheckResult> {
  try {
    // 1. 检查基础权限
    const level = await getPermissionLevel(projectId, userId);
    if (level < PermissionLevel.ADMIN) {
      return {
        allowed: false,
        reason: '只有项目负责人或系统管理员可以删除项目',
      };
    }

    // 2. 检查是否存在关联合同
    const relatedContracts = await db
      .select({ id: contracts.id, contractName: contracts.contractName, contractStatus: contracts.contractStatus })
      .from(contracts)
      .where(eq(contracts.projectId, projectId));

    if (relatedContracts.length > 0) {
      // 存在已签署的合同，不允许删除
      const signedContracts = relatedContracts.filter(c => 
        ['signed', 'executing', 'completed'].includes(c.contractStatus || '')
      );
      
      if (signedContracts.length > 0) {
        return {
          allowed: false,
          reason: '项目存在已签署的合同，无法删除',
          affectedResources: signedContracts.map(c => ({
            type: 'contract',
            id: c.id,
            name: c.contractName || '',
            action: '阻止删除',
          })),
        };
      }

      // 存在草稿或待签署的合同，需要确认
      return {
        allowed: false,
        reason: '项目存在关联合同，请先删除或转移合同',
        requiresConfirmation: true,
        affectedResources: relatedContracts.map(c => ({
          type: 'contract',
          id: c.id,
          name: c.contractName || '',
          action: '需要删除或转移',
        })),
      };
    }

    return { allowed: true };
  } catch (error) {
    console.error('Error checking project deletion permission:', error);
    return {
      allowed: false,
      reason: '权限检查失败',
    };
  }
}

/**
 * 项目负责人变更权限交接
 * 确保新负责人获得必要的权限
 */
export async function transferProjectManager(
  projectId: number,
  newManagerId: number,
  currentUserId: number
): Promise<PermissionCheckResult> {
  try {
    // 1. 检查当前用户是否有权限转移
    const level = await getPermissionLevel(projectId, currentUserId);
    if (level < PermissionLevel.ADMIN) {
      return {
        allowed: false,
        reason: '只有项目负责人或系统管理员可以转移项目负责人',
      };
    }

    // 2. 检查新负责人是否存在
    const newUser = await db
      .select({ id: users.id, realName: users.realName })
      .from(users)
      .where(eq(users.id, newManagerId))
      .limit(1);

    if (!newUser.length) {
      return {
        allowed: false,
        reason: '指定的新负责人不存在',
      };
    }

    // 3. 检查新负责人是否已经是项目成员
    const existingMember = await db
      .select()
      .from(projectMembers)
      .where(and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.userId, newManagerId)
      ))
      .limit(1);

    // 使用事务处理权限交接
    await db.transaction(async (tx) => {
      // 更新项目负责人
      await tx
        .update(projects)
        .set({ managerId: newManagerId, updatedAt: new Date() })
        .where(eq(projects.id, projectId));

      // 如果新负责人不是成员，添加为 manager
      if (!existingMember.length) {
        await tx.insert(projectMembers).values({
          projectId,
          userId: newManagerId,
          role: 'manager',
          invitedBy: currentUserId,
        });
      } else {
        // 更新角色为 manager
        await tx
          .update(projectMembers)
          .set({ role: 'manager' })
          .where(and(
            eq(projectMembers.projectId, projectId),
            eq(projectMembers.userId, newManagerId)
          ));
      }
    });

    return { allowed: true };
  } catch (error) {
    console.error('Error transferring project manager:', error);
    return {
      allowed: false,
      reason: '项目负责人转移失败',
    };
  }
}

/**
 * 检查跨部门协作权限
 * 判断用户是否可以访问其他部门的数据
 */
export async function checkCrossDepartmentAccess(
  targetUserId: number,
  currentUserId: number
): Promise<PermissionCheckResult> {
  try {
    // 系统管理员可以跨部门访问
    if (await isSystemAdmin(currentUserId)) {
      return { allowed: true };
    }

    // 获取当前用户的部门
    const currentUser = await db
      .select({ department: users.department })
      .from(users)
      .where(eq(users.id, currentUserId))
      .limit(1);

    // 获取目标用户的部门
    const targetUser = await db
      .select({ department: users.department })
      .from(users)
      .where(eq(users.id, targetUserId))
      .limit(1);

    if (!currentUser.length || !targetUser.length) {
      return { allowed: false, reason: '用户不存在' };
    }

    // 同一部门可以访问
    if (currentUser[0].department === targetUser[0].department) {
      return { allowed: true };
    }

    return {
      allowed: false,
      reason: '您没有权限访问其他部门的数据',
    };
  } catch (error) {
    console.error('Error checking cross department access:', error);
    return {
      allowed: false,
      reason: '权限检查失败',
    };
  }
}

/**
 * 数据导出权限检查
 * 检查用户是否可以导出敏感数据
 */
export async function checkDataExportPermission(
  userId: number,
  dataType: 'customers' | 'projects' | 'contracts' | 'opportunities'
): Promise<PermissionCheckResult> {
  try {
    // 检查是否是系统管理员
    if (await isSystemAdmin(userId)) {
      return { allowed: true };
    }

    // 获取用户角色
    const user = await db
      .select({ roleCode: roles.roleCode })
      .from(users)
      .leftJoin(roles, eq(users.roleId, roles.id))
      .where(eq(users.id, userId))
      .limit(1);

    const roleCode = user[0]?.roleCode?.toLowerCase() || '';

    // 销售主管以上可以导出客户和商机
    if (['sales_manager', 'sales_director', 'general_manager'].includes(roleCode)) {
      if (['customers', 'opportunities'].includes(dataType)) {
        return { allowed: true };
      }
    }

    // 项目主管以上可以导出项目
    if (['project_manager', 'project_director', 'general_manager'].includes(roleCode)) {
      if (dataType === 'projects') {
        return { allowed: true };
      }
    }

    // 合同需要更高级别权限
    if (['contract_manager', 'finance', 'general_manager'].includes(roleCode)) {
      if (dataType === 'contracts') {
        return { allowed: true };
      }
    }

    return {
      allowed: false,
      reason: `您没有导出${dataType}数据的权限`,
    };
  } catch (error) {
    console.error('Error checking data export permission:', error);
    return {
      allowed: false,
      reason: '权限检查失败',
    };
  }
}

/**
 * 批量操作权限检查
 * 检查用户是否可以对多个资源执行操作
 */
export async function checkBatchOperationPermission(
  resourceType: 'project' | 'customer' | 'contract',
  resourceIds: number[],
  userId: number,
  action: 'read' | 'write' | 'delete'
): Promise<PermissionCheckResult> {
  try {
    const deniedResources: Array<{ id: number; reason: string }> = [];

    for (const resourceId of resourceIds) {
      if (resourceType === 'project') {
        const level = await getPermissionLevel(resourceId, userId);
        
        if (action === 'read' && level < PermissionLevel.READ) {
          deniedResources.push({ id: resourceId, reason: '无读取权限' });
        } else if (action === 'write' && level < PermissionLevel.WRITE) {
          deniedResources.push({ id: resourceId, reason: '无编辑权限' });
        } else if (action === 'delete' && level < PermissionLevel.ADMIN) {
          deniedResources.push({ id: resourceId, reason: '无删除权限' });
        }
      }
    }

    if (deniedResources.length === resourceIds.length) {
      return {
        allowed: false,
        reason: '您没有权限操作任何选中的资源',
      };
    }

    if (deniedResources.length > 0) {
      return {
        allowed: true,
        reason: `部分资源无权限操作：${deniedResources.map(r => `ID ${r.id}: ${r.reason}`).join('; ')}`,
        affectedResources: deniedResources.map(r => ({
          type: resourceType,
          id: r.id,
          name: '',
          action: r.reason,
        })),
      };
    }

    return { allowed: true };
  } catch (error) {
    console.error('Error checking batch operation permission:', error);
    return {
      allowed: false,
      reason: '权限检查失败',
    };
  }
}
