import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { operationLogs } from '@/db/schema';
import { sql } from 'drizzle-orm';
import { successResponse, errorResponse } from '@/lib/api-response';
import { superAdminOnly, withAuth } from '@/lib/auth-middleware';

/**
 * POST /api/settings/reset-system
 * 恢复出厂设置 - 重置系统基础数据
 * 仅限管理员操作
 * 
 * 注意：此操作只重置基础配置数据，不会影响业务数据
 */
export const POST = superAdminOnly(async (request: NextRequest, { userId }) => {
  try {
    // 执行种子数据初始化
    const result = await executeSeedData();

    // 记录操作日志
    try {
      await db.insert(operationLogs).values({
        userId,
        module: '系统设置',
        action: '恢复出厂设置',
        resource: 'system',
        method: 'POST',
        path: '/api/settings/reset-system',
        result,
        status: result.success ? 'success' : 'failed',
        error: result.success ? null : result.error,
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
        userAgent: request.headers.get('user-agent') || null,
      });
    } catch (logError) {
      console.error('Failed to log operation:', logError);
    }

    // 获取重置后的数据统计
    const stats = await getSystemStats();

    return successResponse({
      message: '系统已恢复出厂设置',
      executionResult: result,
      stats,
    });
  } catch (error: any) {
    console.error('Reset system error:', error);
    return errorResponse('INTERNAL_ERROR', `恢复出厂设置失败: ${error.message}`, { status: 500 });
  }
});

/**
 * GET /api/settings/reset-system
 * 获取系统当前数据统计
 */
export const GET = withAuth(async () => {
  try {
    const stats = await getSystemStats();
    return successResponse(stats);
  } catch (error) {
    console.error('Get system stats error:', error);
    return errorResponse('INTERNAL_ERROR', '获取系统统计失败', { status: 500 });
  }
});

async function getSystemStats() {
  const tables = [
    { name: '角色', table: 'sys_role' },
    { name: '客户类型', table: 'sys_customer_type' },
    { name: '项目类型', table: 'sys_project_type' },
    { name: '解决方案类型', table: 'sys_solution_type' },
    { name: '售前服务类型', table: 'sys_presales_service_type' },
    { name: '分子公司', table: 'sys_subsidiary' },
    { name: '字典分类', table: 'sys_attribute_category' },
    { name: '字典属性', table: 'sys_attribute' },
    { name: '用户', table: 'sys_user' },
    { name: '项目', table: 'bus_project' },
    { name: '客户', table: 'bus_customer' },
    { name: '解决方案', table: 'bus_solution' },
  ];

  const stats: Record<string, number> = {};

  for (const { name, table } of tables) {
    try {
      const result = await db.execute(sql`SELECT COUNT(*) as count FROM ${sql.identifier(table)} WHERE deleted_at IS NULL`);
      stats[name] = Number((result as any)[0]?.count || 0);
    } catch {
      stats[name] = 0;
    }
  }

  return stats;
}

async function executeSeedData() {
  const results: { table: string; action: string; count: number }[] = [];

  try {
    // =====================================
    // 1. 重置角色数据（使用 DELETE 而非 TRUNCATE 以避免级联删除用户）
    // =====================================
    await db.execute(sql`DELETE FROM sys_role`);
    await db.execute(sql`
      INSERT INTO sys_role (id, role_name, role_code, description, permissions, status, created_at, updated_at) VALUES
      (1, '系统管理员', 'admin', '系统管理员，拥有所有权限', '["*"]', 'active', NOW(), NOW()),
      (2, '售前主管', 'presale_manager', '售前团队主管，负责团队管理和决策', '["dashboard.*", "projects.*", "customers.*", "solutions.*", "staff.*", "performances.*", "alerts.*", "schedules.*", "todos.*"]', 'active', NOW(), NOW()),
      (3, '总部售前工程师', 'hq_presale_engineer', '总部售前工程师，负责大型项目售前支持', '["dashboard.view", "projects.*", "customers.*", "solutions.*", "schedules.*", "todos.*", "work-logs.*"]', 'active', NOW(), NOW()),
      (4, '解决方案工程师', 'solution_engineer', '解决方案工程师，负责方案设计和编写', '["dashboard.view", "projects.view", "customers.view", "solutions.*", "templates.*"]', 'active', NOW(), NOW()),
      (5, '区域售前工程师', 'regional_presale_engineer', '区域售前工程师，负责区域项目售前支持', '["dashboard.view", "projects.view", "customers.view", "solutions.view", "schedules.*", "todos.*", "work-logs.*"]', 'active', NOW(), NOW()),
      (6, '销售代表', 'sales_rep', '销售代表，负责客户开发和商机管理', '["dashboard.view", "customers.*", "opportunities.*", "leads.*", "projects.view", "schedules.*", "todos.*"]', 'active', NOW(), NOW()),
      (7, '财务专员', 'finance_specialist', '财务专员，负责成本核算和仲裁审核', '["dashboard.view", "arbitrations.*", "performances.view"]', 'active', NOW(), NOW())
    `);
    // 重置序列
    await db.execute(sql`SELECT setval('sys_role_id_seq', 7, true)`);
    results.push({ table: '角色', action: '重置', count: 7 });

    // =====================================
    // 2. 重置客户类型
    // =====================================
    await db.execute(sql`DELETE FROM sys_customer_type`);
    await db.execute(sql`
      INSERT INTO sys_customer_type (id, code, name, description, status, created_at, updated_at) VALUES
      (1, 'UNIVERSITY', '高校', '普通高校、本科院校及高等院校客户', 'active', NOW(), NOW()),
      (2, 'GOVERNMENT', '政府', '政府机关和事业单位客户', 'active', NOW(), NOW()),
      (3, 'ENTERPRISE', '企业', '企业和商业机构客户', 'active', NOW(), NOW()),
      (4, 'HOSPITAL', '医院', '医院及医疗卫生机构客户', 'active', NOW(), NOW()),
      (5, 'K12', 'K12', '中小学、幼儿园及基础教育客户', 'active', NOW(), NOW()),
      (6, 'HIGHER_VOCATIONAL', '高职', '高职高专、职业学院及职业大学客户', 'active', NOW(), NOW()),
      (7, 'SECONDARY_VOCATIONAL', '中专', '中专、中职及中等职业学校客户', 'active', NOW(), NOW()),
      (8, 'MILITARY_POLICE', '军警', '军队、武警、公安及警务院校客户', 'active', NOW(), NOW())
    `);
    await db.execute(sql`SELECT setval('sys_customer_type_id_seq', 8, true)`);
    results.push({ table: '客户类型', action: '重置', count: 8 });

    // =====================================
    // 3. 重置项目类型
    // =====================================
    await db.execute(sql`DELETE FROM sys_project_type`);
    await db.execute(sql`
      INSERT INTO sys_project_type (id, code, name, description, status, created_at, updated_at) VALUES
      (1, 'software', '软件', '软件项目', 'active', NOW(), NOW()),
      (2, 'integration', '集成', '集成项目', 'active', NOW(), NOW()),
      (3, 'consulting', '咨询', '咨询项目', 'active', NOW(), NOW()),
      (4, 'maintenance', '维护', '维护项目', 'active', NOW(), NOW()),
      (5, 'other', '其他', '其他项目', 'active', NOW(), NOW())
    `);
    await db.execute(sql`SELECT setval('sys_project_type_id_seq', 5, true)`);
    results.push({ table: '项目类型', action: '重置', count: 5 });

    // =====================================
    // 4. 重置解决方案类型
    // =====================================
    await db.execute(sql`DELETE FROM sys_solution_type`);
    await db.execute(sql`
      INSERT INTO sys_solution_type (id, code, name, description, status, created_at, updated_at) VALUES
      (1, 'planning', '策划方案', '项目整体策划方案，包含项目目标、实施路径和预期成果', 'active', NOW(), NOW()),
      (2, 'declaration', '申报方案', '项目申报材料，用于项目立项和审批', 'active', NOW(), NOW()),
      (3, 'detailed', '详细方案', '项目详细设计方案，包含技术细节和实施步骤', 'active', NOW(), NOW()),
      (4, 'configuration', '配置单', '产品配置清单和报价单', 'active', NOW(), NOW()),
      (5, 'publicity', '宣传物料', '项目宣传资料和展示材料', 'active', NOW(), NOW())
    `);
    await db.execute(sql`SELECT setval('sys_solution_type_id_seq', 5, true)`);
    results.push({ table: '解决方案类型', action: '重置', count: 5 });

    // =====================================
    // 5. 重置售前服务类型
    // =====================================
    await db.execute(sql`DELETE FROM sys_presales_service_type`);
    await db.execute(sql`
      INSERT INTO sys_presales_service_type (id, service_code, service_name, service_category, description, weight, standard_duration, is_required, sort_order, status, created_at, updated_at) VALUES
      (1, 'requirement_analysis', '需求调研与分析', 'analysis', '深入了解客户业务需求，形成需求分析报告', 20, 8, true, 1, 'active', NOW(), NOW()),
      (2, 'scheme_design', '方案设计', 'design', '根据需求设计完整的技术方案和实施计划', 30, 16, true, 2, 'active', NOW(), NOW()),
      (3, 'product_demo', '产品演示', 'presentation', '向客户展示产品功能和特性', 15, 4, false, 3, 'active', NOW(), NOW()),
      (4, 'poc_test', 'POC测试', 'test', '在客户环境进行概念验证测试', 20, 8, false, 4, 'active', NOW(), NOW()),
      (5, 'bid_support', '投标支持', 'bid', '协助编写投标文件和技术答辩', 15, 12, false, 5, 'active', NOW(), NOW()),
      (6, 'technical_consulting', '技术咨询', 'consulting', '为客户提供技术咨询服务', 10, 4, false, 6, 'active', NOW(), NOW())
    `);
    await db.execute(sql`SELECT setval('sys_presales_service_type_id_seq', 6, true)`);
    results.push({ table: '售前服务类型', action: '重置', count: 6 });

    // =====================================
    // 6. 重置分子公司数据
    // =====================================
    await db.execute(sql`DELETE FROM sys_subsidiary`);
    await db.execute(sql`
      INSERT INTO sys_subsidiary (id, subsidiary_code, subsidiary_name, company_type, regions, address, contact_person, contact_phone, status, created_at, updated_at) VALUES
      (1, 'HZ001', '杭州分公司', 'sales_branch', '["杭州"]', '浙江省杭州市西湖区文三路xxx号', '张明', '13800001001', 'active', NOW(), NOW()),
      (2, 'NB002', '宁波分公司', 'sales_branch', '["宁波"]', '浙江省宁波市鄞州区高新区xxx路', '李华', '13800001002', 'active', NOW(), NOW()),
      (3, 'WZ003', '温州分公司', 'sales_branch', '["温州"]', '浙江省温州市鹿城区xxx路', '王强', '13800001003', 'active', NOW(), NOW()),
      (4, 'JX004', '嘉兴分公司', 'sales_branch', '["嘉兴"]', '浙江省嘉兴市南湖区xxx路', '赵刚', '13800001004', 'active', NOW(), NOW()),
      (5, 'HU005', '湖州分公司', 'sales_branch', '["湖州"]', '浙江省湖州市吴兴区xxx路', '刘洋', '13800001005', 'active', NOW(), NOW()),
      (6, 'SX006', '绍兴分公司', 'sales_branch', '["绍兴"]', '浙江省绍兴市越城区xxx路', '陈伟', '13800001006', 'active', NOW(), NOW()),
      (7, 'JH007', '金华分公司', 'sales_branch', '["金华"]', '浙江省金华市婺城区xxx路', '周涛', '13800001007', 'active', NOW(), NOW()),
      (8, 'QZ008', '衢州分公司', 'sales_branch', '["衢州"]', '浙江省衢州市柯城区xxx路', '吴勇', '13800001008', 'active', NOW(), NOW()),
      (9, 'ZS009', '舟山分公司', 'sales_branch', '["舟山"]', '浙江省舟山市定海区xxx路', '郑海', '13800001009', 'active', NOW(), NOW()),
      (10, 'TA010', '台州分公司', 'sales_branch', '["台州"]', '浙江省台州市椒江区xxx路', '孙磊', '13800001010', 'active', NOW(), NOW()),
      (11, 'LS011', '丽水分公司', 'sales_branch', '["丽水"]', '浙江省丽水市莲都区xxx路', '钱军', '13800001011', 'active', NOW(), NOW()),
      (12, 'SH012', '上海子公司', 'sales_subsidiary', '["上海"]', '上海市浦东新区xxx路', '黄涛', '13800001012', 'active', NOW(), NOW()),
      (13, 'JS013', '江苏子公司', 'sales_subsidiary', '["江苏", "安徽"]', '江苏省南京市鼓楼区xxx路', '马云飞', '13800001013', 'active', NOW(), NOW()),
      (14, 'FJ014', '福建子公司', 'sales_subsidiary', '["福建", "江西"]', '福建省福州市鼓楼区xxx路', '林海', '13800001014', 'active', NOW(), NOW()),
      (15, 'SD015', '山东子公司', 'sales_subsidiary', '["山东", "河南"]', '山东省济南市历下区xxx路', '韩磊', '13800001015', 'active', NOW(), NOW()),
      (16, 'BJ016', '北京子公司', 'sales_subsidiary', '["北京", "天津", "河北", "山西", "内蒙古"]', '北京市朝阳区xxx路', '唐明', '13800001016', 'active', NOW(), NOW()),
      (17, 'GD017', '广东子公司', 'sales_subsidiary', '["广东", "广西", "海南"]', '广东省广州市天河区xxx路', '谢华', '13800001017', 'active', NOW(), NOW()),
      (18, 'SC018', '四川子公司', 'sales_subsidiary', '["四川", "重庆", "贵州", "云南", "西藏"]', '四川省成都市高新区xxx路', '罗涛', '13800001018', 'active', NOW(), NOW()),
      (19, 'SN019', '陕西子公司', 'sales_subsidiary', '["陕西", "甘肃", "青海", "宁夏", "新疆"]', '陕西省西安市高新区xxx路', '高军', '13800001019', 'active', NOW(), NOW()),
      (20, 'LN020', '辽宁子公司', 'sales_subsidiary', '["辽宁", "吉林", "黑龙江"]', '辽宁省沈阳市沈河区xxx路', '宋涛', '13800001020', 'active', NOW(), NOW()),
      (21, 'HB021', '湖北子公司', 'sales_subsidiary', '["湖北", "湖南"]', '湖北省武汉市洪山区xxx路', '郭明', '13800001021', 'active', NOW(), NOW()),
      (22, 'QG022', '全国运营中心', 'independent', '["全国"]', '浙江省杭州市滨江区xxx路', '周总', '13800001022', 'active', NOW(), NOW()),
      (23, 'GJ023', '国际业务部', 'independent', '["香港", "澳门", "台湾"]', '浙江省杭州市西湖区xxx路', '王总', '13800001023', 'active', NOW(), NOW()),
      (24, 'AH024', '安徽分公司', 'sales_branch', '["安徽"]', '安徽省合肥市蜀山区xxx路', '李刚', '13800001024', 'inactive', NOW(), NOW()),
      (25, 'HN025', '河南分公司', 'sales_branch', '["河南"]', '河南省郑州市金水区xxx路', '张伟', '13800001025', 'inactive', NOW(), NOW()),
      (26, 'JX026', '江西分公司', 'sales_branch', '["江西"]', '江西省南昌市东湖区xxx路', '刘军', '13800001026', 'inactive', NOW(), NOW())
    `);
    await db.execute(sql`SELECT setval('sys_subsidiary_id_seq', 26, true)`);
    results.push({ table: '分子公司', action: '重置', count: 26 });

    // =====================================
    // 7. 重置字典分类（先删除子表数据）
    // =====================================
    await db.execute(sql`DELETE FROM sys_attribute`);
    await db.execute(sql`DELETE FROM sys_attribute_category`);
    await db.execute(sql`
      INSERT INTO sys_attribute_category (id, category_code, category_name, description, icon, is_system, sort_order, status, created_at, updated_at) VALUES
      (1, 'project_status', '项目状态', '项目状态相关字典', 'folder', true, 1, 'active', NOW(), NOW()),
      (2, 'project_stage', '项目阶段', '项目阶段相关字典', 'git-branch', true, 2, 'active', NOW(), NOW()),
      (3, 'project_priority', '项目优先级', '项目优先级相关字典', 'alert-circle', true, 3, 'active', NOW(), NOW()),
      (4, 'customer_level', '客户级别', '客户级别相关字典', 'award', true, 4, 'active', NOW(), NOW()),
      (5, 'customer_source', '客户来源', '客户来源相关字典', 'users', true, 5, 'active', NOW(), NOW()),
      (6, 'opportunity_stage', '商机阶段', '商机阶段相关字典', 'trending-up', true, 6, 'active', NOW(), NOW()),
      (7, 'solution_status', '方案状态', '方案状态相关字典', 'file-text', true, 7, 'active', NOW(), NOW()),
      (8, 'task_status', '任务状态', '任务状态相关字典', 'check-square', true, 8, 'active', NOW(), NOW()),
      (9, 'task_priority', '任务优先级', '任务优先级相关字典', 'flag', true, 9, 'active', NOW(), NOW()),
      (10, 'lead_status', '线索状态', '线索状态相关字典', 'phone', true, 10, 'active', NOW(), NOW()),
      (11, 'lead_source', '线索来源', '线索来源相关字典', 'radio', true, 11, 'active', NOW(), NOW()),
      (12, 'arbitration_status', '仲裁状态', '仲裁状态相关字典', 'balance-scale', true, 12, 'active', NOW(), NOW()),
      (13, 'arbitration_type', '仲裁类型', '仲裁类型相关字典', 'list', true, 13, 'active', NOW(), NOW()),
      (14, 'alert_severity', '预警级别', '预警级别相关字典', 'alert-triangle', true, 14, 'active', NOW(), NOW()),
      (15, 'region', '区域', '区域相关字典', 'map-pin', true, 15, 'active', NOW(), NOW()),
      (16, 'industry', '客户类型', '客户类型相关字典', 'briefcase', true, 16, 'active', NOW(), NOW())
    `);
    await db.execute(sql`SELECT setval('sys_attribute_category_id_seq', 16, true)`);
    results.push({ table: '字典分类', action: '重置', count: 16 });

    // =====================================
    // 8. 重置字典属性
    // 注意：attribute_key 有唯一约束，需要使用分类前缀保证唯一性
    // =====================================
    // 项目状态
    await db.execute(sql`
      INSERT INTO sys_attribute (category, attribute_key, name, attribute_value, attribute_type, description, sort_order, is_system, status, created_at, updated_at) VALUES
      ('project_status', 'project_status_lead', '商机线索', 'lead', 'string', '有项目线索和消息，但是主观判断并不一定会形成项目', 1, true, 'active', NOW(), NOW()),
      ('project_status', 'project_status_in_progress', '跟进中', 'in_progress', 'string', '售前大多数项目为此状态，此状态项目涵盖整个项目生命周期，废标，重新招标的也在这个状态中', 2, true, 'active', NOW(), NOW()),
      ('project_status', 'project_status_won', '已中标', 'won', 'string', '从收到中标通知书开始就可改为此状态，必须填写中标金额', 3, true, 'active', NOW(), NOW()),
      ('project_status', 'project_status_lost', '已丢标', 'lost', 'string', '项目已经丢标的明确状态', 4, true, 'active', NOW(), NOW()),
      ('project_status', 'project_status_on_hold', '已暂停', 'on_hold', 'string', '项目已暂停', 5, true, 'active', NOW(), NOW()),
      ('project_status', 'project_status_cancelled', '已取消', 'cancelled', 'string', '项目已取消', 6, true, 'active', NOW(), NOW())
    `);
    
    // 项目阶段
    await db.execute(sql`
      INSERT INTO sys_attribute (category, attribute_key, name, attribute_value, attribute_type, description, sort_order, is_system, status, created_at, updated_at) VALUES
      ('project_stage', 'project_stage_opportunity', '商机阶段', 'opportunity', 'string', '商机阶段', 1, true, 'active', NOW(), NOW()),
      ('project_stage', 'project_stage_bidding', '招标投标', 'bidding', 'string', '招投标阶段', 2, true, 'active', NOW(), NOW()),
      ('project_stage', 'project_stage_execution', '实施阶段', 'execution', 'string', '实施阶段', 3, true, 'active', NOW(), NOW()),
      ('project_stage', 'project_stage_acceptance', '验收阶段', 'acceptance', 'string', '验收阶段', 4, true, 'active', NOW(), NOW()),
      ('project_stage', 'project_stage_settlement', '结算阶段', 'settlement', 'string', '结算阶段', 5, true, 'active', NOW(), NOW()),
      ('project_stage', 'project_stage_archived', '归档', 'archived', 'string', '归档', 6, true, 'active', NOW(), NOW())
    `);

    // 项目优先级
    await db.execute(sql`
      INSERT INTO sys_attribute (category, attribute_key, name, attribute_value, attribute_type, description, sort_order, is_system, status, created_at, updated_at) VALUES
      ('project_priority', 'project_priority_critical', '紧急', 'critical', 'string', '紧急项目', 1, true, 'active', NOW(), NOW()),
      ('project_priority', 'project_priority_high', '高', 'high', 'string', '高优先级项目', 2, true, 'active', NOW(), NOW()),
      ('project_priority', 'project_priority_medium', '中', 'medium', 'string', '中优先级项目', 3, true, 'active', NOW(), NOW()),
      ('project_priority', 'project_priority_low', '低', 'low', 'string', '低优先级项目', 4, true, 'active', NOW(), NOW())
    `);

    // 客户级别
    await db.execute(sql`
      INSERT INTO sys_attribute (category, attribute_key, name, attribute_value, attribute_type, description, sort_order, is_system, status, created_at, updated_at) VALUES
      ('customer_level', 'customer_level_vip', 'VIP客户', 'vip', 'string', 'VIP级别客户', 1, true, 'active', NOW(), NOW()),
      ('customer_level', 'customer_level_key', '重点客户', 'key', 'string', '重点级别客户', 2, true, 'active', NOW(), NOW()),
      ('customer_level', 'customer_level_regular', '普通客户', 'regular', 'string', '普通级别客户', 3, true, 'active', NOW(), NOW()),
      ('customer_level', 'customer_level_potential', '潜力客户', 'potential', 'string', '潜力级别客户', 4, true, 'active', NOW(), NOW())
    `);

    // 客户来源
    await db.execute(sql`
      INSERT INTO sys_attribute (category, attribute_key, name, attribute_value, attribute_type, description, sort_order, is_system, status, created_at, updated_at) VALUES
      ('customer_source', 'customer_source_website', '官网', 'website', 'string', '官网来源', 1, true, 'active', NOW(), NOW()),
      ('customer_source', 'customer_source_referral', '转介绍', 'referral', 'string', '客户转介绍', 2, true, 'active', NOW(), NOW()),
      ('customer_source', 'customer_source_exhibition', '展会', 'exhibition', 'string', '展会获取', 3, true, 'active', NOW(), NOW()),
      ('customer_source', 'customer_source_marketing', '市场活动', 'marketing', 'string', '市场活动获取', 4, true, 'active', NOW(), NOW()),
      ('customer_source', 'customer_source_cold_call', '电话营销', 'cold_call', 'string', '电话营销获取', 5, true, 'active', NOW(), NOW()),
      ('customer_source', 'customer_source_other', '其他', 'other', 'string', '其他渠道', 6, true, 'active', NOW(), NOW())
    `);

    // 商机阶段
    await db.execute(sql`
      INSERT INTO sys_attribute (category, attribute_key, name, attribute_value, attribute_type, description, sort_order, is_system, status, created_at, updated_at) VALUES
      ('opportunity_stage', 'opp_stage_initial', '初步接触', 'initial', 'string', '初步接触阶段', 1, true, 'active', NOW(), NOW()),
      ('opportunity_stage', 'opp_stage_requirement', '需求确认', 'requirement', 'string', '需求确认阶段', 2, true, 'active', NOW(), NOW()),
      ('opportunity_stage', 'opp_stage_proposal', '方案报价', 'proposal', 'string', '方案报价阶段', 3, true, 'active', NOW(), NOW()),
      ('opportunity_stage', 'opp_stage_negotiation', '招标投标', 'negotiation', 'string', '招投标阶段', 4, true, 'active', NOW(), NOW()),
      ('opportunity_stage', 'opp_stage_won', '赢单', 'won', 'string', '赢单', 5, true, 'active', NOW(), NOW()),
      ('opportunity_stage', 'opp_stage_lost', '输单', 'lost', 'string', '输单', 6, true, 'active', NOW(), NOW())
    `);

    // 方案状态
    await db.execute(sql`
      INSERT INTO sys_attribute (category, attribute_key, name, attribute_value, attribute_type, description, sort_order, is_system, status, created_at, updated_at) VALUES
      ('solution_status', 'solution_status_draft', '草稿', 'draft', 'string', '方案草稿状态', 1, true, 'active', NOW(), NOW()),
      ('solution_status', 'solution_status_reviewing', '审核中', 'reviewing', 'string', '方案审核中', 2, true, 'active', NOW(), NOW()),
      ('solution_status', 'solution_status_approved', '已通过', 'approved', 'string', '方案已通过', 3, true, 'active', NOW(), NOW()),
      ('solution_status', 'solution_status_rejected', '已驳回', 'rejected', 'string', '方案已驳回', 4, true, 'active', NOW(), NOW()),
      ('solution_status', 'solution_status_published', '已发布', 'published', 'string', '方案已发布', 5, true, 'active', NOW(), NOW())
    `);

    // 任务状态
    await db.execute(sql`
      INSERT INTO sys_attribute (category, attribute_key, name, attribute_value, attribute_type, description, sort_order, is_system, status, created_at, updated_at) VALUES
      ('task_status', 'task_status_pending', '待处理', 'pending', 'string', '任务待处理', 1, true, 'active', NOW(), NOW()),
      ('task_status', 'task_status_in_progress', '进行中', 'in_progress', 'string', '任务进行中', 2, true, 'active', NOW(), NOW()),
      ('task_status', 'task_status_completed', '已完成', 'completed', 'string', '任务已完成', 3, true, 'active', NOW(), NOW()),
      ('task_status', 'task_status_cancelled', '已取消', 'cancelled', 'string', '任务已取消', 4, true, 'active', NOW(), NOW())
    `);

    // 任务优先级
    await db.execute(sql`
      INSERT INTO sys_attribute (category, attribute_key, name, attribute_value, attribute_type, description, sort_order, is_system, status, created_at, updated_at) VALUES
      ('task_priority', 'task_priority_urgent', '紧急', 'urgent', 'string', '紧急任务', 1, true, 'active', NOW(), NOW()),
      ('task_priority', 'task_priority_high', '高', 'high', 'string', '高优先级任务', 2, true, 'active', NOW(), NOW()),
      ('task_priority', 'task_priority_medium', '中', 'medium', 'string', '中优先级任务', 3, true, 'active', NOW(), NOW()),
      ('task_priority', 'task_priority_low', '低', 'low', 'string', '低优先级任务', 4, true, 'active', NOW(), NOW())
    `);

    // 线索状态
    await db.execute(sql`
      INSERT INTO sys_attribute (category, attribute_key, name, attribute_value, attribute_type, description, sort_order, is_system, status, created_at, updated_at) VALUES
      ('lead_status', 'lead_status_new', '新线索', 'new', 'string', '新线索', 1, true, 'active', NOW(), NOW()),
      ('lead_status', 'lead_status_contacted', '已联系', 'contacted', 'string', '已联系客户', 2, true, 'active', NOW(), NOW()),
      ('lead_status', 'lead_status_qualified', '已验证', 'qualified', 'string', '线索已验证', 3, true, 'active', NOW(), NOW()),
      ('lead_status', 'lead_status_converted', '已转化', 'converted', 'string', '线索已转化为商机', 4, true, 'active', NOW(), NOW()),
      ('lead_status', 'lead_status_invalid', '无效', 'invalid', 'string', '无效线索', 5, true, 'active', NOW(), NOW())
    `);

    // 线索来源
    await db.execute(sql`
      INSERT INTO sys_attribute (category, attribute_key, name, attribute_value, attribute_type, description, sort_order, is_system, status, created_at, updated_at) VALUES
      ('lead_source', 'lead_source_website', '官网', 'website', 'string', '官网咨询', 1, true, 'active', NOW(), NOW()),
      ('lead_source', 'lead_source_phone', '电话', 'phone', 'string', '电话咨询', 2, true, 'active', NOW(), NOW()),
      ('lead_source', 'lead_source_email', '邮件', 'email', 'string', '邮件咨询', 3, true, 'active', NOW(), NOW()),
      ('lead_source', 'lead_source_exhibition', '展会', 'exhibition', 'string', '展会获取', 4, true, 'active', NOW(), NOW()),
      ('lead_source', 'lead_source_referral', '转介绍', 'referral', 'string', '客户转介绍', 5, true, 'active', NOW(), NOW()),
      ('lead_source', 'lead_source_other', '其他', 'other', 'string', '其他渠道', 6, true, 'active', NOW(), NOW())
    `);

    // 仲裁状态
    await db.execute(sql`
      INSERT INTO sys_attribute (category, attribute_key, name, attribute_value, attribute_type, description, sort_order, is_system, status, created_at, updated_at) VALUES
      ('arbitration_status', 'arb_status_pending', '待处理', 'pending', 'string', '仲裁待处理', 1, true, 'active', NOW(), NOW()),
      ('arbitration_status', 'arb_status_processing', '处理中', 'processing', 'string', '仲裁处理中', 2, true, 'active', NOW(), NOW()),
      ('arbitration_status', 'arb_status_approved', '已通过', 'approved', 'string', '仲裁已通过', 3, true, 'active', NOW(), NOW()),
      ('arbitration_status', 'arb_status_rejected', '已驳回', 'rejected', 'string', '仲裁已驳回', 4, true, 'active', NOW(), NOW())
    `);

    // 仲裁类型
    await db.execute(sql`
      INSERT INTO sys_attribute (category, attribute_key, name, attribute_value, attribute_type, description, sort_order, is_system, status, created_at, updated_at) VALUES
      ('arbitration_type', 'arb_type_cost', '成本仲裁', 'cost', 'string', '成本相关仲裁', 1, true, 'active', NOW(), NOW()),
      ('arbitration_type', 'arb_type_performance', '绩效仲裁', 'performance', 'string', '绩效相关仲裁', 2, true, 'active', NOW(), NOW()),
      ('arbitration_type', 'arb_type_resource', '资源仲裁', 'resource', 'string', '资源分配仲裁', 3, true, 'active', NOW(), NOW())
    `);

    // 预警级别
    await db.execute(sql`
      INSERT INTO sys_attribute (category, attribute_key, name, attribute_value, attribute_type, description, sort_order, is_system, status, created_at, updated_at) VALUES
      ('alert_severity', 'alert_severity_critical', '紧急', 'critical', 'string', '紧急预警', 1, true, 'active', NOW(), NOW()),
      ('alert_severity', 'alert_severity_high', '高', 'high', 'string', '高优先级预警', 2, true, 'active', NOW(), NOW()),
      ('alert_severity', 'alert_severity_medium', '中', 'medium', 'string', '中优先级预警', 3, true, 'active', NOW(), NOW()),
      ('alert_severity', 'alert_severity_low', '低', 'low', 'string', '低优先级预警', 4, true, 'active', NOW(), NOW())
    `);

    // 区域（浙江省地市）
    await db.execute(sql`
      INSERT INTO sys_attribute (category, attribute_key, name, attribute_value, attribute_type, description, sort_order, is_system, status, created_at, updated_at) VALUES
      ('region', 'region_hangzhou', '杭州', '杭州', 'string', '杭州市', 1, true, 'active', NOW(), NOW()),
      ('region', 'region_ningbo', '宁波', '宁波', 'string', '宁波市', 2, true, 'active', NOW(), NOW()),
      ('region', 'region_wenzhou', '温州', '温州', 'string', '温州市', 3, true, 'active', NOW(), NOW()),
      ('region', 'region_jiaxing', '嘉兴', '嘉兴', 'string', '嘉兴市', 4, true, 'active', NOW(), NOW()),
      ('region', 'region_huzhou', '湖州', '湖州', 'string', '湖州市', 5, true, 'active', NOW(), NOW()),
      ('region', 'region_shaoxing', '绍兴', '绍兴', 'string', '绍兴市', 6, true, 'active', NOW(), NOW()),
      ('region', 'region_jinhua', '金华', '金华', 'string', '金华市', 7, true, 'active', NOW(), NOW()),
      ('region', 'region_quzhou', '衢州', '衢州', 'string', '衢州市', 8, true, 'active', NOW(), NOW()),
      ('region', 'region_zhoushan', '舟山', '舟山', 'string', '舟山市', 9, true, 'active', NOW(), NOW()),
      ('region', 'region_taizhou', '台州', '台州', 'string', '台州市', 10, true, 'active', NOW(), NOW()),
      ('region', 'region_lishui', '丽水', '丽水', 'string', '丽水市', 11, true, 'active', NOW(), NOW())
    `);

    // 行业
    await db.execute(sql`
      INSERT INTO sys_attribute (category, attribute_key, name, attribute_value, attribute_type, description, sort_order, is_system, status, created_at, updated_at) VALUES
      ('industry', 'industry_university', '高校', 'university', 'string', '普通高校、本科院校及高等院校客户', 1, true, 'active', NOW(), NOW()),
      ('industry', 'industry_government', '政府', 'government', 'string', '政府机关', 2, true, 'active', NOW(), NOW()),
      ('industry', 'industry_enterprise', '企业', 'enterprise', 'string', '企业和商业机构客户', 3, true, 'active', NOW(), NOW()),
      ('industry', 'industry_hospital', '医院', 'hospital', 'string', '医院及医疗卫生机构客户', 4, true, 'active', NOW(), NOW()),
      ('industry', 'industry_k12', 'K12', 'k12', 'string', '中小学、幼儿园及基础教育客户', 5, true, 'active', NOW(), NOW()),
      ('industry', 'industry_higher_vocational', '高职', 'higher_vocational', 'string', '高职高专、职业学院及职业大学客户', 6, true, 'active', NOW(), NOW()),
      ('industry', 'industry_secondary_vocational', '中专', 'secondary_vocational', 'string', '中专、中职及中等职业学校客户', 7, true, 'active', NOW(), NOW()),
      ('industry', 'industry_military_police', '军警', 'military_police', 'string', '军队、武警、公安及警务院校客户', 8, true, 'active', NOW(), NOW())
    `);

    results.push({ table: '字典属性', action: '重置', count: 86 });

    return { success: true, results };
  } catch (error: any) {
    console.error('Seed data error:', error);
    return { success: false, error: error.message, results };
  }
}
