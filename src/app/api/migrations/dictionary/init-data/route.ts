import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { attributes, attributeCategories } from '@/db/schema';
import { eq, isNull, and } from 'drizzle-orm';

/**
 * 初始化字典数据
 * POST /api/migrations/dictionary/init-data
 */
export async function POST(request: NextRequest) {
  try {
    const results: string[] = [];

    // 定义所有字典项
    const dictionaryItems = [
      // 客户类型
      { category: 'customer_type', code: 'university', name: '高校', value: 'university', order: 1 },
      { category: 'customer_type', code: 'government', name: '政府', value: 'government', order: 2 },
      { category: 'customer_type', code: 'enterprise', name: '企业', value: 'enterprise', order: 3 },
      { category: 'customer_type', code: 'hospital', name: '医院', value: 'hospital', order: 4 },
      { category: 'customer_type', code: 'k12', name: 'K12', value: 'k12', order: 5 },
      { category: 'customer_type', code: 'higher_vocational', name: '高职', value: 'higher_vocational', order: 6 },
      { category: 'customer_type', code: 'secondary_vocational', name: '中专', value: 'secondary_vocational', order: 7 },
      { category: 'customer_type', code: 'military_police', name: '军警', value: 'military_police', order: 8 },

      // 项目类型
      { category: 'project_type', code: 'software', name: '软件', value: 'software', order: 1 },
      { category: 'project_type', code: 'integration', name: '集成', value: 'integration', order: 2 },
      { category: 'project_type', code: 'consulting', name: '咨询', value: 'consulting', order: 3 },
      { category: 'project_type', code: 'maintenance', name: '维护', value: 'maintenance', order: 4 },
      { category: 'project_type', code: 'other', name: '其他', value: 'other', order: 5 },

      // 项目状态
      { category: 'project_status', code: 'draft', name: '草稿', value: 'draft', order: 1 },
      { category: 'project_status', code: 'opportunity', name: '商机', value: 'opportunity', order: 2 },
      { category: 'project_status', code: 'proposal', name: '方案', value: 'proposal', order: 3 },
      { category: 'project_status', code: 'negotiation', name: '洽谈', value: 'negotiation', order: 4 },
      { category: 'project_status', code: 'contract', name: '合同', value: 'contract', order: 5 },
      { category: 'project_status', code: 'implementation', name: '实施', value: 'implementation', order: 6 },
      { category: 'project_status', code: 'completed', name: '完成', value: 'completed', order: 7 },
      { category: 'project_status', code: 'lost', name: '失败', value: 'lost', order: 8 },

      // 行业类型
      { category: 'industry', code: 'university', name: '高校', value: 'university', order: 1 },
      { category: 'industry', code: 'government', name: '政府', value: 'government', order: 2 },
      { category: 'industry', code: 'enterprise', name: '企业', value: 'enterprise', order: 3 },
      { category: 'industry', code: 'hospital', name: '医院', value: 'hospital', order: 4 },
      { category: 'industry', code: 'k12', name: 'K12', value: 'k12', order: 5 },
      { category: 'industry', code: 'higher_vocational', name: '高职', value: 'higher_vocational', order: 6 },
      { category: 'industry', code: 'secondary_vocational', name: '中专', value: 'secondary_vocational', order: 7 },
      { category: 'industry', code: 'military_police', name: '军警', value: 'military_police', order: 8 },

      // 区域
      { category: 'region', code: 'north_china', name: '华北', value: '华北', order: 1 },
      { category: 'region', code: 'east_china', name: '华东', value: '华东', order: 2 },
      { category: 'region', code: 'south_china', name: '华南', value: '华南', order: 3 },
      { category: 'region', code: 'central_china', name: '华中', value: '华中', order: 4 },
      { category: 'region', code: 'northwest', name: '西北', value: '西北', order: 5 },
      { category: 'region', code: 'southwest', name: '西南', value: '西南', order: 6 },
      { category: 'region', code: 'northeast', name: '东北', value: '东北', order: 7 },
      { category: 'region', code: 'hmt', name: '港澳台', value: '港澳台', order: 8 },
      { category: 'region', code: 'overseas', name: '海外', value: '海外', order: 9 },

      // 优先级
      { category: 'priority', code: 'high', name: '高', value: 'high', order: 1 },
      { category: 'priority', code: 'medium', name: '中', value: 'medium', order: 2 },
      { category: 'priority', code: 'low', name: '低', value: 'low', order: 3 },

      // 需求类型 (可能已存在)
      { category: 'demand_type', code: 'software', name: '软件系统', value: 'software', order: 1 },
      { category: 'demand_type', code: 'hardware', name: '硬件设备', value: 'hardware', order: 2 },
      { category: 'demand_type', code: 'consulting', name: '咨询服务', value: 'consulting', order: 3 },
      { category: 'demand_type', code: 'integration', name: '集成项目', value: 'integration', order: 4 },
      { category: 'demand_type', code: 'other', name: '其他', value: 'other', order: 5 },

      // 意向等级 (可能已存在)
      { category: 'intent_level', code: 'high', name: '高意向', value: 'high', order: 1 },
      { category: 'intent_level', code: 'medium', name: '中意向', value: 'medium', order: 2 },
      { category: 'intent_level', code: 'low', name: '低意向', value: 'low', order: 3 },

      // 商机阶段
      { category: 'opportunity_stage', code: 'lead', name: '线索', value: 'lead', order: 1 },
      { category: 'opportunity_stage', code: 'qualified', name: '合格线索', value: 'qualified', order: 2 },
      { category: 'opportunity_stage', code: 'proposal', name: '方案报价', value: 'proposal', order: 3 },
      { category: 'opportunity_stage', code: 'negotiation', name: '招标投标', value: 'negotiation', order: 4 },
      { category: 'opportunity_stage', code: 'closed_won', name: '赢单', value: 'closed_won', order: 5 },
      { category: 'opportunity_stage', code: 'closed_lost', name: '输单', value: 'closed_lost', order: 6 },

      // 解决方案类型
      { category: 'solution_type', code: 'technical', name: '技术方案', value: 'technical', order: 1 },
      { category: 'solution_type', code: 'commercial', name: '商务方案', value: 'commercial', order: 2 },
      { category: 'solution_type', code: 'integrated', name: '综合方案', value: 'integrated', order: 3 },
      { category: 'solution_type', code: 'product', name: '产品方案', value: 'product', order: 4 },
      { category: 'solution_type', code: 'implementation', name: '实施方案', value: 'implementation', order: 5 },
      { category: 'solution_type', code: 'maintenance', name: '运维方案', value: 'maintenance', order: 6 },

      // 服务类型
      { category: 'service_type', code: 'analysis', name: '分析类', value: 'analysis', order: 1 },
      { category: 'service_type', code: 'design', name: '设计类', value: 'design', order: 2 },
      { category: 'service_type', code: 'presentation', name: '演示类', value: 'presentation', order: 3 },
      { category: 'service_type', code: 'negotiation', name: '谈判类', value: 'negotiation', order: 4 },
      { category: 'service_type', code: 'site_visit', name: '现场拜访', value: 'site_visit', order: 5 },
      { category: 'service_type', code: 'phone', name: '电话沟通', value: 'phone', order: 6 },
      { category: 'service_type', code: 'wechat', name: '微信沟通', value: 'wechat', order: 7 },
      { category: 'service_type', code: 'email', name: '邮件沟通', value: 'email', order: 8 },
      { category: 'service_type', code: 'video_meeting', name: '视频会议', value: 'video_meeting', order: 9 },

      // 仲裁类型
      { category: 'arbitration_type', code: 'cost', name: '成本仲裁', value: 'cost', order: 1 },
      { category: 'arbitration_type', code: 'workload', name: '工作量仲裁', value: 'workload', order: 2 },
      { category: 'arbitration_type', code: 'dispute', name: '争议仲裁', value: 'dispute', order: 3 },

      // 预警严重程度
      { category: 'alert_severity', code: 'low', name: '低', value: 'low', order: 1 },
      { category: 'alert_severity', code: 'medium', name: '中', value: 'medium', order: 2 },
      { category: 'alert_severity', code: 'high', name: '高', value: 'high', order: 3 },
      { category: 'alert_severity', code: 'critical', name: '严重', value: 'critical', order: 4 },

      // 预警分类
      { category: 'alert_category', code: 'not_updated', name: '未更新', value: 'not_updated', order: 1 },
      { category: 'alert_category', code: 'inactive', name: '不活跃', value: 'inactive', order: 2 },
      { category: 'alert_category', code: 'overdue', name: '超期', value: 'overdue', order: 3 },
      { category: 'alert_category', code: 'not_used', name: '未使用', value: 'not_used', order: 4 },
      { category: 'alert_category', code: 'not_referenced', name: '未引用', value: 'not_referenced', order: 5 },

      // 成员角色
      { category: 'member_role', code: 'project_manager', name: '项目经理', value: '项目经理', order: 1 },
      { category: 'member_role', code: 'tech_lead', name: '技术负责人', value: '技术负责人', order: 2 },
      { category: 'member_role', code: 'presale_engineer', name: '售前工程师', value: '售前工程师', order: 3 },
      { category: 'member_role', code: 'dev_engineer', name: '开发工程师', value: '开发工程师', order: 4 },
      { category: 'member_role', code: 'test_engineer', name: '测试工程师', value: '测试工程师', order: 5 },
      { category: 'member_role', code: 'product_manager', name: '产品经理', value: '产品经理', order: 6 },
      { category: 'member_role', code: 'ui_designer', name: 'UI设计师', value: 'UI设计师', order: 7 },
      { category: 'member_role', code: 'consultant', name: '顾问', value: '顾问', order: 8 },

      // 文件类型
      { category: 'file_type', code: 'ppt', name: 'PowerPoint (PPT)', value: 'ppt', order: 1 },
      { category: 'file_type', code: 'word', name: 'Word文档', value: 'word', order: 2 },
      { category: 'file_type', code: 'excel', name: 'Excel表格', value: 'excel', order: 3 },
      { category: 'file_type', code: 'pdf', name: 'PDF文档', value: 'pdf', order: 4 },
      { category: 'file_type', code: 'video', name: '视频文件', value: 'video', order: 5 },

      // 客户状态
      { category: 'customer_status', code: 'potential', name: '潜在', value: 'potential', order: 1 },
      { category: 'customer_status', code: 'active', name: '活跃', value: 'active', order: 2 },
      { category: 'customer_status', code: 'inactive', name: '非活跃', value: 'inactive', order: 3 },
      { category: 'customer_status', code: 'lost', name: '已流失', value: 'lost', order: 4 },

      // 跟进类型
      { category: 'followup_type', code: 'site_visit', name: '现场拜访', value: 'site_visit', order: 1 },
      { category: 'followup_type', code: 'phone', name: '电话沟通', value: 'phone', order: 2 },
      { category: 'followup_type', code: 'wechat', name: '微信沟通', value: 'wechat', order: 3 },
      { category: 'followup_type', code: 'email', name: '邮件沟通', value: 'email', order: 4 },
      { category: 'followup_type', code: 'video_meeting', name: '视频会议', value: 'video_meeting', order: 5 },

      // 子方案类型
      { category: 'sub_scheme_type', code: 'technical', name: '技术方案', value: 'technical', order: 1 },
      { category: 'sub_scheme_type', code: 'business', name: '商务方案', value: 'business', order: 2 },
      { category: 'sub_scheme_type', code: 'architecture', name: '架构方案', value: 'architecture', order: 3 },
      { category: 'sub_scheme_type', code: 'implementation', name: '实施方案', value: 'implementation', order: 4 },
      { category: 'sub_scheme_type', code: 'other', name: '其他', value: 'other', order: 99 },

      // 日程类型
      { category: 'schedule_type', code: 'meeting', name: '会议', value: 'meeting', order: 1 },
      { category: 'schedule_type', code: 'visit', name: '拜访', value: 'visit', order: 2 },
      { category: 'schedule_type', code: 'call', name: '电话', value: 'call', order: 3 },
      { category: 'schedule_type', code: 'presentation', name: '演示', value: 'presentation', order: 4 },
      { category: 'schedule_type', code: 'online', name: '线上会议', value: 'online', order: 5 },
      { category: 'schedule_type', code: 'task', name: '任务', value: 'task', order: 6 },
      { category: 'schedule_type', code: 'reminder', name: '提醒', value: 'reminder', order: 7 },
      { category: 'schedule_type', code: 'other', name: '其他', value: 'other', order: 99 },

      // 待办类型
      { category: 'todo_type', code: 'followup', name: '跟进', value: 'followup', order: 1 },
      { category: 'todo_type', code: 'document', name: '文档', value: 'document', order: 2 },
      { category: 'todo_type', code: 'bidding', name: '投标', value: 'bidding', order: 3 },
      { category: 'todo_type', code: 'meeting', name: '会议', value: 'meeting', order: 4 },
      { category: 'todo_type', code: 'approval', name: '审批', value: 'approval', order: 5 },
      { category: 'todo_type', code: 'other', name: '其他', value: 'other', order: 99 },

      // 待办状态
      { category: 'todo_status', code: 'pending', name: '待处理', value: 'pending', order: 1 },
      { category: 'todo_status', code: 'in_progress', name: '进行中', value: 'in_progress', order: 2 },
      { category: 'todo_status', code: 'completed', name: '已完成', value: 'completed', order: 3 },
      { category: 'todo_status', code: 'cancelled', name: '已取消', value: 'cancelled', order: 4 },
    ];

    let inserted = 0;
    let skipped = 0;

    for (const item of dictionaryItems) {
      try {
        // 检查是否已存在
        const existing = await db.select()
          .from(attributes)
          .where(and(
            eq(attributes.category, item.category),
            eq(attributes.code, item.code),
            isNull(attributes.deletedAt)
          ))
          .limit(1);

        if (existing.length === 0) {
          await db.insert(attributes).values({
            category: item.category,
            code: item.code,
            name: item.name,
            value: item.value,
            sortOrder: item.order,
            isSystem: true,
            status: 'active',
            valueType: 'string',
          });
          inserted++;
        } else {
          skipped++;
        }
      } catch (e) {
        // 忽略错误，继续处理
        skipped++;
      }
    }

    results.push(`Inserted: ${inserted} items`);
    results.push(`Skipped: ${skipped} items (already exist)`);

    return NextResponse.json({
      success: true,
      message: 'Dictionary data initialized',
      results,
    });
  } catch (error) {
    console.error('Init data error:', error);
    return NextResponse.json({
      success: false,
      error: (error as Error).message,
    }, { status: 500 });
  }
}
