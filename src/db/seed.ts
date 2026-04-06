// @ts-nocheck
/**
 * 数据库初始化脚本（优化版）
 * 用于填充基础数据和测试数据，支持真实数据库部署
 */

import bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';

import { db } from './index';
import {
  roles,
  users,
  customers,
  leads,
  opportunities,
  projects,
  tasks,
  solutions,
  solutionSubSchemes,
  arbitrations,
  performances,
  performanceRecords,
  alertRules,
  alertHistories,
  presalesServiceTypes,
  projectPresalesRecords,
  subsidiaries,
  attributes,
  customerTypes,
  projectTypes,
  solutionTypes,
} from './schema';

function dateOnly(value: string | null): string | null {
  return value;
}

async function getSeedPasswordContext() {
  const seedInitialPassword = process.env.SEED_INITIAL_PASSWORD?.trim() || randomUUID();
  const defaultPasswordHash = await bcrypt.hash(seedInitialPassword, 10);
  const passwordResetAt = new Date();

  if (!process.env.SEED_INITIAL_PASSWORD) {
    console.warn('未设置 SEED_INITIAL_PASSWORD，已为本次 seed 生成一次性初始密码并强制首登改密。');
  }

  return {
    defaultPasswordHash,
    passwordResetAt,
  };
}

// ============================================
// 1. 基础数据插入（使用事务确保一致性）
// ============================================

/**
 * 插入角色数据
 */
async function seedRoles() {
  console.log('📝 插入角色数据...');
  try {
    const rolesData = [
      { id: 1, roleName: '系统管理员', roleCode: 'ADMIN', description: '系统管理员，拥有全部权限', status: 'active', permissions: ['*'], createdAt: new Date(), updatedAt: new Date() },
      { id: 2, roleName: '售前经理', roleCode: 'PRESALES_MANAGER', description: '负责售前团队管理和项目统筹', status: 'active', permissions: ['project:*', 'customer:*', 'solution:*', 'user:view'], createdAt: new Date(), updatedAt: new Date() },
      { id: 3, roleName: '解决方案经理', roleCode: 'SOLUTION_MANAGER', description: '负责解决方案管理', status: 'active', permissions: ['solution:*', 'project:view', 'customer:view'], createdAt: new Date(), updatedAt: new Date() },
      { id: 4, roleName: '项目经理', roleCode: 'PROJECT_MANAGER', description: '负责项目交付和推进', status: 'active', permissions: ['project:*', 'task:*', 'customer:view'], createdAt: new Date(), updatedAt: new Date() },
      { id: 5, roleName: '售前工程师', roleCode: 'PRESALES_ENGINEER', description: '负责售前技术支持', status: 'active', permissions: ['project:view', 'customer:view', 'solution:create'], createdAt: new Date(), updatedAt: new Date() },
      { id: 6, roleName: '普通用户', roleCode: 'USER', description: '普通用户，只读权限', status: 'active', permissions: ['project:view', 'customer:view', 'solution:view'], createdAt: new Date(), updatedAt: new Date() },
    ];

    for (const role of rolesData) {
      await db.insert(roles).values(role).onConflictDoNothing();
    }
    console.log('✅ 角色数据插入完成');
  } catch (error) {
    console.error('❌ 角色数据插入失败:', error);
    throw error;
  }
}

/**
 * 插入用户数据
 */
async function seedUsers() {
  console.log('📝 插入用户数据...');
  try {
    const { defaultPasswordHash, passwordResetAt } = await getSeedPasswordContext();

    const usersData = [
      { id: 1, username: 'admin', password: defaultPasswordHash, realName: '管理员', email: 'admin@zhengyuan.com', phone: '13800138000', roleId: 1, status: 'active', department: '技术部', mustChangePassword: true, passwordResetAt, lastLoginTime: new Date(), createdAt: new Date(), updatedAt: new Date() },
      { id: 2, username: 'zhangwei', password: defaultPasswordHash, realName: '张伟', email: 'zhangwei@zhengyuan.com', phone: '13800138001', roleId: 2, status: 'active', department: '售前部', mustChangePassword: true, passwordResetAt, lastLoginTime: new Date(Date.now() - 86400000), createdAt: new Date(), updatedAt: new Date() },
      { id: 3, username: 'lifang', password: defaultPasswordHash, realName: '李芳', email: 'lifang@zhengyuan.com', phone: '13800138002', roleId: 3, status: 'active', department: '解决方案部', mustChangePassword: true, passwordResetAt, lastLoginTime: new Date(Date.now() - 172800000), createdAt: new Date(), updatedAt: new Date() },
      { id: 4, username: 'wangming', password: defaultPasswordHash, realName: '王明', email: 'wangming@zhengyuan.com', phone: '13800138003', roleId: 4, status: 'active', department: '项目管理部', mustChangePassword: true, passwordResetAt, lastLoginTime: new Date(Date.now() - 259200000), createdAt: new Date(), updatedAt: new Date() },
      { id: 5, username: 'liuhua', password: defaultPasswordHash, realName: '刘华', email: 'liuhua@zhengyuan.com', phone: '13800138004', roleId: 5, status: 'active', department: '售前部', mustChangePassword: true, passwordResetAt, lastLoginTime: new Date(Date.now() - 345600000), createdAt: new Date(), updatedAt: new Date() },
      { id: 6, username: 'chenxi', password: defaultPasswordHash, realName: '陈曦', email: 'chenxi@zhengyuan.com', phone: '13800138005', roleId: 5, status: 'active', department: '售前部', mustChangePassword: true, passwordResetAt, lastLoginTime: new Date(Date.now() - 432000000), createdAt: new Date(), updatedAt: new Date() },
      { id: 7, username: 'zhaoyang', password: defaultPasswordHash, realName: '赵阳', email: 'zhaoyang@zhengyuan.com', phone: '13800138006', roleId: 3, status: 'active', department: '解决方案部', mustChangePassword: true, passwordResetAt, lastLoginTime: new Date(Date.now() - 518400000), createdAt: new Date(), updatedAt: new Date() },
      { id: 8, username: 'zhoujiu', password: defaultPasswordHash, realName: '周九', email: 'zhoujiu@zhengyuan.com', phone: '13800138007', roleId: 5, status: 'active', department: '售前部', mustChangePassword: true, passwordResetAt, lastLoginTime: new Date(Date.now() - 604800000), createdAt: new Date(), updatedAt: new Date() },
    ];

    for (const user of usersData) {
      await db.insert(users).values(user).onConflictDoNothing();
    }
    console.log('✅ 用户数据插入完成');
  } catch (error) {
    console.error('❌ 用户数据插入失败:', error);
    throw error;
  }
}

/**
 * 插入售前服务类型数据
 */
async function seedPresalesServiceTypes() {
  console.log('📝 插入售前服务类型数据...');
  try {
    const serviceTypesData = [
      {
        id: 1, serviceCode: 'ANALYSIS', serviceName: '需求调研与分析', serviceCategory: 'analysis',
        description: '深入了解客户需求，进行需求分析和梳理', weight: 20, standardDuration: 8,
        isRequired: true, sortOrder: 1, status: 'active', createdAt: new Date(), updatedAt: new Date()
      },
      {
        id: 2, serviceCode: 'SOLUTION_DESIGN', serviceName: '方案设计与编写', serviceCategory: 'design',
        description: '根据需求设计技术方案和商业方案', weight: 30, standardDuration: 16,
        isRequired: true, sortOrder: 2, status: 'active', createdAt: new Date(), updatedAt: new Date()
      },
      {
        id: 3, serviceCode: 'PRESENTATION', serviceName: '方案演示与讲解', serviceCategory: 'presentation',
        description: '向客户演示方案，进行技术交流', weight: 25, standardDuration: 4,
        isRequired: true, sortOrder: 3, status: 'active', createdAt: new Date(), updatedAt: new Date()
      },
      {
        id: 4, serviceCode: 'NEGOTIATION', serviceName: '商务谈判与答疑', serviceCategory: 'negotiation',
        description: '参与商务谈判，解答客户疑问', weight: 25, standardDuration: 8,
        isRequired: false, sortOrder: 4, status: 'active', createdAt: new Date(), updatedAt: new Date()
      },
      {
        id: 5, serviceCode: 'PROTOTYPE', serviceName: '原型设计与开发', serviceCategory: 'design',
        description: '快速原型设计和功能演示', weight: 15, standardDuration: 24,
        isRequired: false, sortOrder: 5, status: 'active', createdAt: new Date(), updatedAt: new Date()
      },
      {
        id: 6, serviceCode: 'POC', serviceName: 'POC概念验证', serviceCategory: 'analysis',
        description: '技术可行性验证和概念证明', weight: 20, standardDuration: 40,
        isRequired: false, sortOrder: 6, status: 'active', createdAt: new Date(), updatedAt: new Date()
      },
    ];

    for (const serviceType of serviceTypesData) {
      await db.insert(presalesServiceTypes).values(serviceType).onConflictDoNothing();
    }
    console.log('✅ 售前服务类型数据插入完成');
  } catch (error) {
    console.error('❌ 售前服务类型数据插入失败:', error);
    throw error;
  }
}

/**
 * 插入预警规则数据
 */
async function seedAlertRules() {
  console.log('📝 插入预警规则数据...');
  try {
    const alertRulesData = [
      {
        id: 1, ruleName: '项目长期未更新', ruleCode: 'PROJECT_NOT_UPDATED', ruleType: 'project', ruleCategory: 'not_updated',
        conditionField: 'updatedAt', conditionOperator: 'gt', thresholdValue: 7, thresholdUnit: 'day',
        severity: 'high', status: 'active', checkFrequency: 'daily',
        notificationChannels: ['email', 'system'], recipientIds: [1, 2],
        description: '当项目超过7天未更新时触发预警', createdBy: 1,
        createdAt: new Date(Date.now() - 86400000 * 5), updatedAt: new Date(Date.now() - 86400000 * 2),
        lastTriggeredAt: new Date(Date.now() - 86400000), triggerCount: 12
      },
      {
        id: 2, ruleName: '客户长期未跟进', ruleCode: 'CUSTOMER_NOT_FOLLOWED', ruleType: 'customer', ruleCategory: 'inactive',
        conditionField: 'lastCooperationDate', conditionOperator: 'gt', thresholdValue: 30, thresholdUnit: 'day',
        severity: 'medium', status: 'active', checkFrequency: 'weekly',
        notificationChannels: ['email', 'sms'], recipientIds: [2],
        description: '当客户超过30天未跟进时触发预警', createdBy: 1,
        createdAt: new Date(Date.now() - 86400000 * 10), updatedAt: new Date(Date.now() - 86400000 * 5),
        lastTriggeredAt: new Date(Date.now() - 86400000 * 3), triggerCount: 8
      },
      {
        id: 3, ruleName: '用户长期未登录', ruleCode: 'USER_NOT_LOGIN', ruleType: 'user', ruleCategory: 'inactive',
        conditionField: 'lastLoginTime', conditionOperator: 'gt', thresholdValue: 15, thresholdUnit: 'day',
        severity: 'low', status: 'active', checkFrequency: 'daily',
        notificationChannels: ['email'], recipientIds: [1],
        description: '当用户超过15天未登录时触发预警', createdBy: 1,
        createdAt: new Date(Date.now() - 86400000 * 7), updatedAt: new Date(Date.now() - 86400000 * 3),
        lastTriggeredAt: new Date(Date.now() - 86400000), triggerCount: 5
      },
      {
        id: 4, ruleName: '解决方案长期未引用', ruleCode: 'SOLUTION_NOT_REFERENCED', ruleType: 'solution', ruleCategory: 'not_referenced',
        conditionField: 'lastUsedAt', conditionOperator: 'gt', thresholdValue: 90, thresholdUnit: 'day',
        severity: 'low', status: 'active', checkFrequency: 'monthly',
        notificationChannels: ['system'], recipientIds: [3],
        description: '当解决方案超过90天未被引用时触发预警', createdBy: 1,
        createdAt: new Date(Date.now() - 86400000 * 15), updatedAt: new Date(Date.now() - 86400000 * 10),
        lastTriggeredAt: new Date(Date.now() - 86400000 * 7), triggerCount: 2
      },
      {
        id: 5, ruleName: '商机超期未跟进', ruleCode: 'OPPORTUNITY_OVERDUE', ruleType: 'opportunity', ruleCategory: 'overdue',
        conditionField: 'expectedCloseDate', conditionOperator: 'gt', thresholdValue: 3, thresholdUnit: 'day',
        severity: 'high', status: 'active', checkFrequency: 'daily',
        notificationChannels: ['email', 'system', 'sms'], recipientIds: [2, 4],
        description: '当商机预计结束日期超过3天未关闭时触发预警', createdBy: 1,
        createdAt: new Date(Date.now() - 86400000 * 3), updatedAt: new Date(Date.now() - 86400000),
        lastTriggeredAt: new Date(), triggerCount: 3
      },
      {
        id: 6, ruleName: '线索长期未跟进', ruleCode: 'LEAD_NOT_FOLLOWED', ruleType: 'lead', ruleCategory: 'not_updated',
        conditionField: 'createdAt', conditionOperator: 'gt', thresholdValue: 3, thresholdUnit: 'day',
        severity: 'medium', status: 'active', checkFrequency: 'daily',
        notificationChannels: ['email', 'system'], recipientIds: [2],
        description: '当线索超过3天未跟进时触发预警', createdBy: 1,
        createdAt: new Date(Date.now() - 86400000 * 20), updatedAt: new Date(Date.now() - 86400000 * 8),
        lastTriggeredAt: new Date(Date.now() - 86400000 * 2), triggerCount: 15
      },
      {
        id: 7, ruleName: '项目超期未交付', ruleCode: 'PROJECT_OVERDUE', ruleType: 'project', ruleCategory: 'overdue',
        conditionField: 'expectedDeliveryDate', conditionOperator: 'gt', thresholdValue: 1, thresholdUnit: 'day',
        severity: 'critical', status: 'active', checkFrequency: 'daily',
        notificationChannels: ['email', 'sms', 'system'], recipientIds: [2, 3],
        description: '当项目超过预计交付日期1天时触发严重预警', createdBy: 1,
        createdAt: new Date(Date.now() - 86400000 * 25), updatedAt: new Date(Date.now() - 86400000 * 12),
        lastTriggeredAt: new Date(Date.now() - 86400000 * 4), triggerCount: 7
      },
      {
        id: 8, ruleName: '项目进度滞后', ruleCode: 'PROJECT_BEHIND_SCHEDULE', ruleType: 'project', ruleCategory: 'not_updated',
        conditionField: 'progress', conditionOperator: 'lt', thresholdValue: 50, thresholdUnit: 'percent',
        severity: 'medium', status: 'inactive', checkFrequency: 'weekly',
        notificationChannels: ['system'], recipientIds: [2],
        description: '当项目进度低于50%时触发预警', createdBy: 1,
        createdAt: new Date(Date.now() - 86400000 * 30), updatedAt: new Date(Date.now() - 86400000 * 20),
        lastTriggeredAt: new Date(Date.now() - 86400000 * 10), triggerCount: 10
      },
    ];

    for (const rule of alertRulesData) {
      await db.insert(alertRules).values(rule).onConflictDoNothing();
    }
    console.log('✅ 预警规则数据插入完成');
  } catch (error) {
    console.error('❌ 预警规则数据插入失败:', error);
    throw error;
  }
}

/**
 * 插入客户类型数据
 */
async function seedCustomerTypes() {
  console.log('📝 插入客户类型数据...');
  try {
    const customerTypesData = [
      { id: 1, name: '高校', code: 'UNIVERSITY', description: '普通高校、本科院校及高等院校客户', status: 'active', createdAt: new Date(), updatedAt: new Date() },
      { id: 2, name: '政府', code: 'GOVERNMENT', description: '政府机关和事业单位客户', status: 'active', createdAt: new Date(), updatedAt: new Date() },
      { id: 3, name: '企业', code: 'ENTERPRISE', description: '企业和商业机构客户', status: 'active', createdAt: new Date(), updatedAt: new Date() },
      { id: 4, name: '医院', code: 'HOSPITAL', description: '医院及医疗卫生机构客户', status: 'active', createdAt: new Date(), updatedAt: new Date() },
      { id: 5, name: 'K12', code: 'K12', description: '中小学、幼儿园及基础教育客户', status: 'active', createdAt: new Date(), updatedAt: new Date() },
      { id: 6, name: '高职', code: 'HIGHER_VOCATIONAL', description: '高职高专、职业学院及职业大学客户', status: 'active', createdAt: new Date(), updatedAt: new Date() },
      { id: 7, name: '中专', code: 'SECONDARY_VOCATIONAL', description: '中专、中职及中等职业学校客户', status: 'active', createdAt: new Date(), updatedAt: new Date() },
      { id: 8, name: '军警', code: 'MILITARY_POLICE', description: '军队、武警、公安及警务院校客户', status: 'active', createdAt: new Date(), updatedAt: new Date() },
    ];

    for (const customerType of customerTypesData) {
      await db.insert(customerTypes).values(customerType).onConflictDoNothing();
    }
    console.log('✅ 客户类型数据插入完成');
  } catch (error) {
    console.error('❌ 客户数据插入失败:', error);
    throw error;
  }
}

/**
 * 插入项目类型数据
 */
async function seedProjectTypes() {
  console.log('📝 插入项目类型数据...');
  try {
    const projectTypesData = [
      { id: 1, name: '软件', code: 'software', description: '软件项目', status: 'active', createdAt: new Date(), updatedAt: new Date() },
      { id: 2, name: '集成', code: 'integration', description: '集成项目', status: 'active', createdAt: new Date(), updatedAt: new Date() },
      { id: 3, name: '咨询', code: 'consulting', description: '咨询项目', status: 'active', createdAt: new Date(), updatedAt: new Date() },
      { id: 4, name: '维护', code: 'maintenance', description: '维护项目', status: 'active', createdAt: new Date(), updatedAt: new Date() },
      { id: 5, name: '其他', code: 'other', description: '其他项目', status: 'active', createdAt: new Date(), updatedAt: new Date() },
    ];

    for (const projectType of projectTypesData) {
      await db.insert(projectTypes).values(projectType).onConflictDoNothing();
    }
    console.log('✅ 项目类型数据插入完成');
  } catch (error) {
    console.error('❌ 项目类型数据插入失败:', error);
    throw error;
  }
}

/**
 * 插入解决方案类型数据
 */
async function seedSolutionTypes() {
  console.log('📝 插入解决方案类型数据...');
  try {
    const solutionTypesData = [
      { id: 1, name: '技术方案', code: 'TECHNICAL', description: '技术实现方案', status: 'active', createdAt: new Date(), updatedAt: new Date() },
      { id: 2, name: '商业方案', code: 'BUSINESS', description: '商业合作方案', status: 'active', createdAt: new Date(), updatedAt: new Date() },
      { id: 3, name: '综合方案', code: 'INTEGRATED', description: '技术与商业综合方案', status: 'active', createdAt: new Date(), updatedAt: new Date() },
      { id: 4, name: '演示方案', code: 'PRESENTATION', description: '演示汇报方案', status: 'active', createdAt: new Date(), updatedAt: new Date() },
    ];

    for (const solutionType of solutionTypesData) {
      await db.insert(solutionTypes).values(solutionType).onConflictDoNothing();
    }
    console.log('✅ 解决方案类型数据插入完成');
  } catch (error) {
    console.error('❌ 解决方案类型数据插入失败:', error);
    throw error;
  }
}

/**
 * 插入分子公司数据
 */
async function seedSubsidiaries() {
  console.log('📝 插入分子公司数据...');
  try {
    const subsidiariesData = [
      { id: 1, subsidiaryCode: 'BJ001', subsidiaryName: '北京总公司', companyType: 'independent', regions: ['北京', '华北'], address: '北京市海淀区', contactPerson: '张总', contactPhone: '010-12345678', status: 'active', createdAt: new Date(), updatedAt: new Date() },
      { id: 2, subsidiaryCode: 'SH001', subsidiaryName: '上海分公司', companyType: 'sales_branch', regions: ['上海', '华东'], address: '上海市浦东新区', contactPerson: '李总', contactPhone: '021-87654321', status: 'active', createdAt: new Date(), updatedAt: new Date() },
      { id: 3, subsidiaryCode: 'GZ001', subsidiaryName: '广州分公司', companyType: 'sales_branch', regions: ['广州', '华南'], address: '广州市天河区', contactPerson: '王总', contactPhone: '020-11112222', status: 'active', createdAt: new Date(), updatedAt: new Date() },
      { id: 4, subsidiaryCode: 'CD001', subsidiaryName: '成都分公司', companyType: 'sales_branch', regions: ['成都', '西南'], address: '成都市高新区', contactPerson: '赵总', contactPhone: '028-33334444', status: 'active', createdAt: new Date(), updatedAt: new Date() },
      { id: 5, subsidiaryCode: 'HZ001', subsidiaryName: '杭州分公司', companyType: 'sales_branch', regions: ['杭州', '浙江'], address: '杭州市西湖区', contactPerson: '陈总', contactPhone: '0571-88888888', status: 'active', createdAt: new Date(), updatedAt: new Date() },
      { id: 6, subsidiaryCode: 'NB001', subsidiaryName: '宁波分公司', companyType: 'sales_branch', regions: ['宁波', '浙江'], address: '宁波市鄞州区', contactPerson: '周总', contactPhone: '0574-99999999', status: 'active', createdAt: new Date(), updatedAt: new Date() },
      { id: 7, subsidiaryCode: 'WZ001', subsidiaryName: '温州分公司', companyType: 'sales_branch', regions: ['温州', '浙江'], address: '温州市鹿城区', contactPerson: '吴总', contactPhone: '0577-77777777', status: 'active', createdAt: new Date(), updatedAt: new Date() },
      { id: 8, subsidiaryCode: 'JX001', subsidiaryName: '嘉兴分公司', companyType: 'sales_branch', regions: ['嘉兴', '浙江'], address: '嘉兴市南湖区', contactPerson: '郑总', contactPhone: '0573-66666666', status: 'active', createdAt: new Date(), updatedAt: new Date() },
    ];

    for (const subsidiary of subsidiariesData) {
      await db.insert(subsidiaries).values(subsidiary).onConflictDoNothing();
    }
    console.log('✅ 分子公司数据插入完成');
  } catch (error) {
    console.error('❌ 分子公司数据插入失败:', error);
    throw error;
  }
}

/**
 * 插入属性配置数据
 */
async function seedAttributes() {
  console.log('📝 插入属性配置数据...');
  try {
    const attributesData = [
      {
        id: 1,
        category: 'project_metadata',
        code: 'PROJECT_SOURCE',
        name: '项目来源',
        value: '客户推荐',
        valueType: 'select',
        extraData: { options: ['客户推荐', '市场推广', '合作渠道', '内部推荐'], defaultValue: '', isRequired: false },
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 2,
        category: 'project_metadata',
        code: 'PROJECT_SCALE',
        name: '项目规模',
        value: '中型',
        valueType: 'select',
        extraData: { options: ['小型', '中型', '大型', '超大型'], defaultValue: '中型', isRequired: false },
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 3,
        category: 'project_metadata',
        code: 'TECH_STACK',
        name: '技术栈',
        value: 'Java',
        valueType: 'multi_select',
        extraData: { options: ['Java', 'Python', 'Node.js', 'Go', '.NET'], defaultValue: '', isRequired: false },
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 4,
        category: 'customer_metadata',
        code: 'CUSTOMER_LEVEL',
        name: '客户级别',
        value: 'C类',
        valueType: 'select',
        extraData: { options: ['A类', 'B类', 'C类', 'D类'], defaultValue: 'C类', isRequired: false },
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    for (const attribute of attributesData) {
      await db.insert(attributes).values(attribute).onConflictDoNothing();
    }
    console.log('✅ 属性配置数据插入完成');
  } catch (error) {
    console.error('❌ 属性配置数据插入失败:', error);
    throw error;
  }
}

/**
 * 插入解决方案与模板数据
 */
async function seedSolutions() {
  console.log('📝 插入解决方案与子方案数据...');
  try {
    const solutionsData = [
      {
        id: 1,
        solutionCode: 'SOL-TPL-2026020101',
        solutionName: '智慧校园标准解决方案模板',
        solutionTypeId: 1,
        version: '1.0',
        scenario: 'education',
        description: '智慧校园项目的标准解决方案模板',
        authorId: 2,
        ownerId: 2,
        isTemplate: true,
        status: 'published',
        publishDate: new Date(),
        isPublic: true,
        viewCount: 15,
        downloadCount: 6,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 2,
        solutionCode: 'SOL-2026020101',
        solutionName: '智慧校园解决方案 V1.0',
        solutionTypeId: 1,
        version: '1.0',
        scenario: 'education',
        description: '智慧校园项目的正式解决方案',
        authorId: 2,
        ownerId: 2,
        reviewerId: 1,
        templateId: 1,
        status: 'published',
        approvalStatus: 'approved',
        approvalDate: new Date(),
        publishDate: new Date(),
        tags: ['智慧校园', '教育信息化', '物联网'],
        isPublic: true,
        viewCount: 120,
        downloadCount: 15,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 3,
        solutionCode: 'SOL-2026020102',
        solutionName: '企业数字化转型方案',
        solutionTypeId: 2,
        version: '0.1',
        scenario: 'enterprise',
        description: '企业数字化转型商业方案',
        authorId: 3,
        ownerId: 3,
        status: 'draft',
        approvalStatus: 'pending',
        tags: ['数字化转型', '企业服务'],
        isPublic: false,
        viewCount: 5,
        downloadCount: 0,
        createdAt: new Date(Date.now() - 86400000),
        updatedAt: new Date(Date.now() - 86400000),
      },
    ];

    const subSchemesData = [
      {
        id: 1,
        solutionId: 2,
        subSchemeCode: 'SUB-SOL-2026020101-TECH',
        subSchemeName: '智慧校园技术方案',
        subSchemeType: 'technical',
        sortOrder: 1,
        version: '1.0',
        description: '智慧校园项目技术方案',
        responsibleUserId: 2,
        status: 'approved',
        viewCount: 80,
        downloadCount: 10,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 2,
        solutionId: 2,
        subSchemeCode: 'SUB-SOL-2026020101-BIZ',
        subSchemeName: '智慧校园商务方案',
        subSchemeType: 'business',
        sortOrder: 2,
        version: '1.0',
        description: '智慧校园项目商务方案',
        responsibleUserId: 3,
        status: 'approved',
        viewCount: 40,
        downloadCount: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 3,
        solutionId: 3,
        subSchemeCode: 'SUB-SOL-2026020102-BIZ',
        subSchemeName: '企业数字化转型商业方案',
        subSchemeType: 'business',
        sortOrder: 1,
        version: '0.1',
        description: '企业数字化转型商业方案草稿',
        responsibleUserId: 3,
        status: 'draft',
        viewCount: 5,
        downloadCount: 0,
        createdAt: new Date(Date.now() - 86400000),
        updatedAt: new Date(Date.now() - 86400000),
      },
    ];

    for (const solution of solutionsData) {
      await db.insert(solutions).values(solution).onConflictDoNothing();
    }

    for (const subScheme of subSchemesData) {
      await db.insert(solutionSubSchemes).values(subScheme).onConflictDoNothing();
    }

    console.log('✅ 解决方案与子方案数据插入完成');
  } catch (error) {
    console.error('❌ 解决方案与子方案数据插入失败:', error);
    throw error;
  }
}

// ============================================
// 2. 业务数据插入
// ============================================

/**
 * 插入客户数据
 */
async function seedCustomers() {
  console.log('📝 插入客户数据...');
  try {
    const customersData = [
      {
        id: 1, customerId: 'CUST001', customerName: '北京师范大学', customerType: 'education', region: '华北',
        status: 'active', totalAmount: '0.00', currentProjectCount: 1, lastCooperationDate: null, maxProjectAmount: '0.00',
        contactName: '张教授', contactPhone: '010-58800001', contactEmail: 'zhang@bnu.edu.cn',
        address: '北京市海淀区新街口外大街19号', description: '教育部直属重点大学，长期合作伙伴',
        subsidiaryId: 1, createdAt: new Date(), updatedAt: new Date()
      },
      {
        id: 2, customerId: 'CUST002', customerName: '上海交通大学', customerType: 'education', region: '华东',
        status: 'active', totalAmount: '0.00', currentProjectCount: 0, lastCooperationDate: null, maxProjectAmount: '0.00',
        contactName: '李主任', contactPhone: '021-54740001', contactEmail: 'li@sjtu.edu.cn',
        address: '上海市东川路800号', description: '985工程重点建设高校',
        subsidiaryId: 2, createdAt: new Date(Date.now() - 86400000), updatedAt: new Date(Date.now() - 86400000)
      },
      {
        id: 3, customerId: 'CUST003', customerName: '浙江大学', customerType: 'education', region: '华东',
        status: 'active', totalAmount: '0.00', currentProjectCount: 0, lastCooperationDate: null, maxProjectAmount: '0.00',
        contactName: '王处长', contactPhone: '0571-87950001', contactEmail: 'wang@zju.edu.cn',
        address: '浙江省杭州市西湖区余杭塘路866号', description: '中国顶尖学府之一',
        subsidiaryId: 2, createdAt: new Date(Date.now() - 172800000), updatedAt: new Date(Date.now() - 172800000)
      },
      {
        id: 4, customerId: 'CUST004', customerName: '北京市人民政府', customerType: 'government', region: '华北',
        status: 'active', totalAmount: '4800000.00', currentProjectCount: 0, lastCooperationDate: dateOnly('2026-03-31'), maxProjectAmount: '4800000.00',
        contactName: '赵科长', contactPhone: '010-12345678', contactEmail: 'zhao@beijing.gov.cn',
        address: '北京市东城区正义路2号', description: '首都城市管理机构',
        subsidiaryId: 1, createdAt: new Date(Date.now() - 259200000), updatedAt: new Date(Date.now() - 259200000)
      },
      {
        id: 5, customerId: 'CUST005', customerName: '广东省教育厅', customerType: 'government', region: '华南',
        status: 'active', totalAmount: '0.00', currentProjectCount: 0, lastCooperationDate: null, maxProjectAmount: '0.00',
        contactName: '刘处长', contactPhone: '020-87654321', contactEmail: 'liu@gd.gov.cn',
        address: '广东省广州市东风东路723号', description: '省级教育主管部门',
        subsidiaryId: 3, createdAt: new Date(Date.now() - 345600000), updatedAt: new Date(Date.now() - 345600000)
      },
      {
        id: 6, customerId: 'CUST006', customerName: '浙江省科技厅', customerType: 'government', region: '华东',
        status: 'active', totalAmount: '0.00', currentProjectCount: 0, lastCooperationDate: null, maxProjectAmount: '0.00',
        contactName: '陈主任', contactPhone: '0571-87050001', contactEmail: 'chen@zj.gov.cn',
        address: '浙江省杭州市环城西路33号', description: '省级科技管理部门',
        subsidiaryId: 2, createdAt: new Date(Date.now() - 432000000), updatedAt: new Date(Date.now() - 432000000)
      },
      {
        id: 7, customerId: 'CUST007', customerName: '华为技术有限公司', customerType: 'enterprise', region: '华南',
        status: 'active', totalAmount: '0.00', currentProjectCount: 1, lastCooperationDate: null, maxProjectAmount: '0.00',
        contactName: '周总监', contactPhone: '0755-28780808', contactEmail: 'zhou@huawei.com',
        address: '广东省深圳市龙岗区坂田华为基地', description: '全球领先的信息与通信技术解决方案供应商',
        subsidiaryId: 3, createdAt: new Date(Date.now() - 518400000), updatedAt: new Date(Date.now() - 518400000)
      },
      {
        id: 8, customerId: 'CUST008', customerName: '腾讯科技有限公司', customerType: 'enterprise', region: '华南',
        status: 'active', totalAmount: '0.00', currentProjectCount: 0, lastCooperationDate: null, maxProjectAmount: '0.00',
        contactName: '吴经理', contactPhone: '0755-86013388', contactEmail: 'wu@tencent.com',
        address: '广东省深圳市南山区科技园科技中一路', description: '中国最大的互联网综合服务提供商之一',
        subsidiaryId: 3, createdAt: new Date(Date.now() - 604800000), updatedAt: new Date(Date.now() - 604800000)
      },
      {
        id: 9, customerId: 'CUST009', customerName: '阿里巴巴集团', customerType: 'enterprise', region: '华东',
        status: 'active', totalAmount: '0.00', currentProjectCount: 0, lastCooperationDate: null, maxProjectAmount: '0.00',
        contactName: '郑副总裁', contactPhone: '0571-85022088', contactEmail: 'zheng@alibaba.com',
        address: '浙江省杭州市余杭区文一西路969号', description: '全球领先的电子商务平台',
        subsidiaryId: 2, createdAt: new Date(Date.now() - 691200000), updatedAt: new Date(Date.now() - 691200000)
      },
      {
        id: 10, customerId: 'CUST010', customerName: '京东集团', customerType: 'enterprise', region: '华北',
        status: 'active', totalAmount: '0.00', currentProjectCount: 0, lastCooperationDate: null, maxProjectAmount: '0.00',
        contactName: '孙总监', contactPhone: '010-89198888', contactEmail: 'sun@jd.com',
        address: '北京市亦庄经济技术开发区科创十一街18号', description: '中国领先的自营式电商企业',
        subsidiaryId: 1, createdAt: new Date(Date.now() - 777600000), updatedAt: new Date(Date.now() - 777600000)
      },
    ];

    for (const customer of customersData) {
      await db.insert(customers).values(customer).onConflictDoNothing();
    }
    console.log('✅ 客户数据插入完成');
  } catch (error) {
    console.error('❌ 客户数据插入失败:', error);
    throw error;
  }
}

/**
 * 插入项目数据
 */
async function seedProjects() {
  console.log('📝 插入项目数据...');
  try {
    const projectsData = [
      {
        id: 1, projectCode: 'PRJ2026020101', projectName: '智慧校园平台建设', customerId: 1, opportunityId: null,
        projectType: 'software', industry: 'education', region: '华北',
        description: '构建一体化智慧校园管理平台', managerId: 2,
        estimatedAmount: '1500000.00', actualAmount: '1200000.00',
        startDate: dateOnly('2026-01-01'), endDate: dateOnly('2026-06-30'), expectedDeliveryDate: dateOnly('2026-06-30'),
        status: 'ongoing', priority: 'high', progress: 45, risks: '技术难度较大',
        createdAt: new Date(), updatedAt: new Date()
      },
      {
        id: 2, projectCode: 'PRJ2026020102', projectName: '企业CRM系统升级', customerId: 7, opportunityId: null,
        projectType: 'integration', industry: 'enterprise', region: '华南',
        description: '升级现有CRM系统', managerId: 3,
        estimatedAmount: '800000.00', actualAmount: null,
        startDate: dateOnly('2026-02-01'), endDate: dateOnly('2026-04-30'), expectedDeliveryDate: dateOnly('2026-04-30'),
        status: 'draft', priority: 'medium', progress: 10, risks: null,
        createdAt: new Date(Date.now() - 86400000), updatedAt: new Date(Date.now() - 86400000)
      },
      {
        id: 3, projectCode: 'PRJ2026020103', projectName: '智慧城市管理系统', customerId: 4, opportunityId: null,
        projectType: 'software', industry: 'government', region: '华北',
        description: '构建智慧城市管理综合平台', managerId: 2,
        estimatedAmount: '5000000.00', actualAmount: '4800000.00',
        startDate: dateOnly('2025-10-01'), endDate: dateOnly('2026-03-31'), expectedDeliveryDate: dateOnly('2026-03-31'),
        status: 'completed', priority: 'high', progress: 100, risks: null,
        createdAt: new Date(Date.now() - 86400000 * 2), updatedAt: new Date(Date.now() - 86400000 * 2)
      },
    ];

    for (const project of projectsData) {
      await db.insert(projects).values(project).onConflictDoNothing();
    }
    console.log('✅ 项目数据插入完成');
  } catch (error) {
    console.error('❌ 项目数据插入失败:', error);
    throw error;
  }
}

/**
 * 插入项目任务数据
 */
async function seedTasks() {
  console.log('📝 插入项目任务数据...');
  try {
    const tasksData = [
      {
        id: 1, projectId: 1, taskName: '需求调研', taskType: 'survey',
        description: '深入调研客户需求', assigneeId: 2,
        estimatedHours: '40.00', actualHours: '42.00',
        startDate: dateOnly('2026-01-01'), dueDate: dateOnly('2026-01-10'), completedDate: dateOnly('2026-01-11'),
        status: 'completed', priority: 'high', progress: 100, parentId: null, sequence: 1,
        createdAt: new Date(), updatedAt: new Date()
      },
      {
        id: 2, projectId: 1, taskName: '方案设计', taskType: 'design',
        description: '设计技术方案', assigneeId: 3,
        estimatedHours: '80.00', actualHours: '75.00',
        startDate: dateOnly('2026-01-11'), dueDate: dateOnly('2026-01-25'), completedDate: dateOnly('2026-01-24'),
        status: 'completed', priority: 'high', progress: 100, parentId: null, sequence: 2,
        createdAt: new Date(), updatedAt: new Date()
      },
      {
        id: 3, projectId: 1, taskName: '系统开发', taskType: 'development',
        description: '系统开发实施', assigneeId: 4,
        estimatedHours: '200.00', actualHours: '150.00',
        startDate: dateOnly('2026-01-25'), dueDate: dateOnly('2026-05-30'), completedDate: null,
        status: 'in_progress', priority: 'high', progress: 60, parentId: null, sequence: 3,
        createdAt: new Date(), updatedAt: new Date()
      },
    ];

    for (const task of tasksData) {
      await db.insert(tasks).values(task).onConflictDoNothing();
    }
    console.log('✅ 项目任务数据插入完成');
  } catch (error) {
    console.error('❌ 项目任务数据插入失败:', error);
    throw error;
  }
}

/**
 * 插入售前服务记录数据
 */
async function seedProjectPresalesRecords() {
  console.log('📝 插入售前服务记录数据...');
  try {
    const projectPresalesRecordsData = [
      {
        id: 1, projectId: 1, serviceTypeId: 1, staffId: 2, stage: 'requirement',
        description: '深入调研客户需求，完成需求文档编写', workHours: '8.00',
        startTime: new Date('2026-01-02'), endTime: new Date('2026-01-05'),
        outcome: '完成需求调研报告，获得客户确认', weightScore: '160.00',
        remarks: '客户需求较为复杂，需要多次沟通',
        attachments: null, createdBy: 1,
        createdAt: new Date(), updatedAt: new Date()
      },
      {
        id: 2, projectId: 1, serviceTypeId: 2, staffId: 3, stage: 'design',
        description: '根据需求设计技术方案架构', workHours: '16.00',
        startTime: new Date('2026-01-10'), endTime: new Date('2026-01-15'),
        outcome: '完成技术方案设计，包括系统架构、数据库设计等', weightScore: '480.00',
        remarks: '方案设计符合客户预期',
        attachments: null, createdBy: 1,
        createdAt: new Date(), updatedAt: new Date()
      },
    ];

    for (const record of projectPresalesRecordsData) {
      await db.insert(projectPresalesRecords).values(record).onConflictDoNothing();
    }
    console.log('✅ 售前服务记录数据插入完成');
  } catch (error) {
    console.error('❌ 售前服务记录数据插入失败:', error);
    throw error;
  }
}

/**
 * 插入预警历史数据
 */
async function seedAlertHistories() {
  console.log('📝 插入预警历史数据...');
  try {
    const alertHistoriesData = [
      {
        id: 1, ruleId: 1, ruleName: '项目长期未更新', targetType: 'project', targetId: 1,
        targetName: '智慧校园平台建设', severity: 'high', status: 'pending',
        alertData: { condition: 'updatedAt > 7 days', currentValue: '12 days ago', thresholdValue: 7, thresholdUnit: 'day' },
        acknowledgedAt: null, acknowledgedBy: null, resolvedAt: null, resolvedBy: null, resolutionNote: null,
        createdAt: new Date(Date.now() - 86400000), updatedAt: new Date(Date.now() - 86400000)
      },
      {
        id: 2, ruleId: 2, ruleName: '客户长期未跟进', targetType: 'customer', targetId: 5,
        targetName: '广东省教育厅', severity: 'medium', status: 'acknowledged',
        alertData: { condition: 'lastCooperationDate > 30 days', currentValue: '45 days ago', thresholdValue: 30, thresholdUnit: 'day' },
        acknowledgedAt: new Date(Date.now() - 86400000 * 2), acknowledgedBy: 2,
        resolvedAt: null, resolvedBy: null, resolutionNote: null,
        createdAt: new Date(Date.now() - 86400000 * 2), updatedAt: new Date(Date.now() - 86400000 * 2)
      },
    ];

    for (const alertHistory of alertHistoriesData) {
      await db.insert(alertHistories).values(alertHistory).onConflictDoNothing();
    }
    console.log('✅ 预警历史数据插入完成');
  } catch (error) {
    console.error('❌ 预警历史数据插入失败:', error);
    throw error;
  }
}

/**
 * 插入绩效数据
 */
async function seedPerformances() {
  console.log('📝 插入绩效数据...');
  try {
    const performancesData = [
      {
        id: 1, userId: 2, year: 2026, month: 2,
        workloadScore: '85.00', qualityScore: '90.00', efficiencyScore: '88.00', innovationScore: '82.00',
        totalScore: '86.25', rank: '1', bonusAmount: '15000.00', status: 'reviewed', reviewerId: 1, reviewComments: '工作表现优秀',
        createdAt: new Date(), updatedAt: new Date()
      },
      {
        id: 2, userId: 3, year: 2026, month: 2,
        workloadScore: '78.00', qualityScore: '85.00', efficiencyScore: '80.00', innovationScore: '75.00',
        totalScore: '79.50', rank: '2', bonusAmount: '12000.00', status: 'reviewed', reviewerId: 1, reviewComments: '工作表现良好',
        createdAt: new Date(), updatedAt: new Date()
      },
    ];

    for (const performance of performancesData) {
      await db.insert(performances).values(performance).onConflictDoNothing();
    }
    console.log('✅ 绩效数据插入完成');
  } catch (error) {
    console.error('❌ 绩效数据插入失败:', error);
    throw error;
  }
}

/**
 * 插入绩效记录数据
 */
async function seedPerformanceRecords() {
  console.log('📝 插入绩效记录数据...');
  try {
    const performanceRecordsData = [
      {
        id: 1, performanceId: 1, recordType: 'project', recordId: 1,
        title: '智慧校园平台建设项目', description: '参与项目售前支持', score: '90.00', weight: '40.00',
        createdAt: new Date()
      },
      {
        id: 2, performanceId: 1, recordType: 'scheme', recordId: 1,
        title: '智慧校园解决方案', description: '编写技术方案', score: '85.00', weight: '30.00',
        createdAt: new Date()
      },
    ];

    for (const record of performanceRecordsData) {
      await db.insert(performanceRecords).values(record).onConflictDoNothing();
    }
    console.log('✅ 绩效记录数据插入完成');
  } catch (error) {
    console.error('❌ 绩效记录数据插入失败:', error);
    throw error;
  }
}

// ============================================
// 主函数
// ============================================

export async function seedDatabase() {
  console.log('🚀 开始数据库初始化...\n');

  try {
    // 1. 插入基础数据
    await seedRoles();
    await seedUsers();
    await seedPresalesServiceTypes();
    await seedAlertRules();
    await seedCustomerTypes();
    await seedProjectTypes();
    await seedSolutionTypes();
    await seedSubsidiaries();
    await seedAttributes();
    await seedSolutions();

    // 2. 插入业务数据
    await seedCustomers();
    await seedProjects();
    await seedTasks();
    await seedProjectPresalesRecords();
    await seedAlertHistories();
    await seedPerformances();
    await seedPerformanceRecords();

    console.log('\n✅ 数据库初始化完成！');
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error);
    throw error;
  }
}

// 如果直接运行此文件，执行初始化
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('✅ 数据库初始化成功！');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 数据库初始化失败:', error);
      process.exit(1);
    });
}
