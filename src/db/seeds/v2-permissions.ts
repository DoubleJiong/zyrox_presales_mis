/**
 * V2.0 权限种子数据
 * 
 * 为各角色配置默认数据权限范围
 */

import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { DataScope, ResourceType } from '@/lib/permissions/types';

// ============================================
// 资源类型列表
// ============================================

const RESOURCES: ResourceType[] = [
  'customer',
  'project',
  'solution',
  'task',
  'opportunity',
  'bidding',
  'quotation',
  'knowledge',
  'staff',
];

// ============================================
// 角色权限配置
// ============================================

interface RolePermissionConfig {
  code: string;
  name: string;
  description: string;
  permissions: Record<ResourceType, DataScope>;
}

const ROLE_PERMISSIONS: RolePermissionConfig[] = [
  {
    code: 'admin',
    name: '系统管理员',
    description: '系统最高权限，可管理所有数据和配置',
    permissions: {
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
  },
  {
    code: 'sales_manager',
    name: '销售经理',
    description: '管理销售团队，查看团队客户和商机',
    permissions: {
      customer: DataScope.ROLE,
      project: DataScope.MANAGE,
      solution: DataScope.ALL,
      task: DataScope.ROLE,
      opportunity: DataScope.ROLE,
      bidding: DataScope.ROLE,
      quotation: DataScope.ROLE,
      knowledge: DataScope.ALL,
      staff: DataScope.ROLE,
    },
  },
  {
    code: 'sales',
    name: '销售人员',
    description: '管理自己的客户和商机',
    permissions: {
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
  },
  {
    code: 'presales_manager',
    name: '售前经理',
    description: '管理售前团队，协调资源',
    permissions: {
      customer: DataScope.ROLE,
      project: DataScope.ALL,
      solution: DataScope.ALL,
      task: DataScope.ROLE,
      opportunity: DataScope.ROLE,
      bidding: DataScope.ALL,
      quotation: DataScope.ROLE,
      knowledge: DataScope.ALL,
      staff: DataScope.ROLE,
    },
  },
  {
    code: 'presales',
    name: '售前工程师',
    description: '负责技术方案和投标支持',
    permissions: {
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
  },
  {
    code: 'project_manager',
    name: '项目经理',
    description: '管理项目进度和交付',
    permissions: {
      customer: DataScope.ROLE,
      project: DataScope.MANAGE,
      solution: DataScope.ALL,
      task: DataScope.MANAGE,
      opportunity: DataScope.ROLE,
      bidding: DataScope.ROLE,
      quotation: DataScope.ROLE,
      knowledge: DataScope.ALL,
      staff: DataScope.SELF,
    },
  },
  {
    code: 'delivery',
    name: '交付工程师',
    description: '负责项目实施和交付',
    permissions: {
      customer: DataScope.ROLE,
      project: DataScope.MANAGE,
      solution: DataScope.ALL,
      task: DataScope.MANAGE,
      opportunity: DataScope.SELF,
      bidding: DataScope.SELF,
      quotation: DataScope.SELF,
      knowledge: DataScope.ALL,
      staff: DataScope.SELF,
    },
  },
  {
    code: 'finance',
    name: '财务人员',
    description: '管理合同和回款',
    permissions: {
      customer: DataScope.ALL,
      project: DataScope.ALL,
      solution: DataScope.ALL,
      task: DataScope.SELF,
      opportunity: DataScope.ALL,
      bidding: DataScope.ALL,
      quotation: DataScope.ALL,
      knowledge: DataScope.ALL,
      staff: DataScope.SELF,
    },
  },
  {
    code: 'staff',
    name: '普通员工',
    description: '基础权限',
    permissions: {
      customer: DataScope.SELF,
      project: DataScope.SELF,
      solution: DataScope.ALL,
      task: DataScope.SELF,
      opportunity: DataScope.SELF,
      bidding: DataScope.SELF,
      quotation: DataScope.SELF,
      knowledge: DataScope.ALL,
      staff: DataScope.SELF,
    },
  },
];

// ============================================
// 种子数据函数
// ============================================

export async function seedRolePermissions() {
  console.log('开始插入角色数据权限配置...\n');

  for (const roleConfig of ROLE_PERMISSIONS) {
    // 查找或创建角色
    let role = await db.query.roles.findFirst({
      where: eq(schema.roles.roleCode, roleConfig.code),
    });

    if (!role) {
      // 创建角色
      const [newRole] = await db.insert(schema.roles).values({
        roleName: roleConfig.name,
        roleCode: roleConfig.code,
        description: roleConfig.description,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();
      role = newRole;
      console.log(`✓ 创建角色: ${roleConfig.name} (${roleConfig.code})`);
    } else {
      console.log(`→ 角色已存在: ${roleConfig.name} (${roleConfig.code})`);
    }

    // 为每个资源创建权限配置
    for (const resource of RESOURCES) {
      const scope = roleConfig.permissions[resource];

      // 检查是否已存在
      const existing = await db.query.roleDataPermissions.findFirst({
        where: and(
          eq(schema.roleDataPermissions.roleId, role.id),
          eq(schema.roleDataPermissions.resource, resource)
        ),
      });

      if (!existing) {
        await db.insert(schema.roleDataPermissions).values({
          roleId: role.id,
          resource,
          scope,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        console.log(`  ✓ 配置权限: ${resource} -> ${scope}`);
      } else {
        // 更新权限范围
        await db.update(schema.roleDataPermissions)
          .set({ scope, updatedAt: new Date() })
          .where(eq(schema.roleDataPermissions.id, existing.id));
        console.log(`  → 更新权限: ${resource} -> ${scope}`);
      }
    }
  }

  console.log('\n角色数据权限配置完成！');
}

// ============================================
// 报表订阅种子数据
// ============================================

export async function seedReportSubscriptions() {
  console.log('\n开始插入报表订阅配置...\n');

  // 获取管理员用户
  const adminUser = await db.query.users.findFirst({
    where: eq(schema.users.username, 'admin'),
  });

  if (!adminUser) {
    console.log('× 未找到管理员用户，跳过报表订阅配置');
    return;
  }

  const subscriptions = [
    {
      reportId: 1,
      reportType: 'weekly',
      userId: adminUser.id,
      frequency: 'weekly',
      dayOfWeek: 5,
      time: '17:00',
      channels: ['email'],
      enabled: true,
      createdAt: new Date(),
    },
    {
      reportId: 2,
      reportType: 'weekly',
      userId: adminUser.id,
      frequency: 'weekly',
      dayOfWeek: 5,
      time: '18:00',
      channels: ['email'],
      enabled: true,
      createdAt: new Date(),
    },
  ];

  for (const sub of subscriptions) {
    const existing = await db.query.reportSubscriptions.findFirst({
      where: and(
        eq(schema.reportSubscriptions.userId, sub.userId),
        eq(schema.reportSubscriptions.reportId, sub.reportId)
      ),
    });

    if (!existing) {
      await db.insert(schema.reportSubscriptions).values(sub);
      console.log(`✓ 创建订阅: reportId=${sub.reportId}`);
    } else {
      console.log(`→ 订阅已存在: reportId=${sub.reportId}`);
    }
  }

  console.log('\n报表订阅配置完成！');
}

// ============================================
// 主执行函数
// ============================================

export async function runSeed() {
  try {
    await seedRolePermissions();
    await seedReportSubscriptions();
    console.log('\n✅ 所有种子数据插入完成！');
  } catch (error) {
    console.error('种子数据插入失败:', error);
    throw error;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  runSeed()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
