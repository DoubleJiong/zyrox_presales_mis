import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { sql } from 'drizzle-orm';
import { attributes, attributeCategories } from '@/db/schema';

/**
 * 数据字典迁移 API
 * POST /api/migrations/dictionary
 * 执行数据字典模块的数据库迁移
 */
export async function POST(request: NextRequest) {
  try {
    const results: string[] = [];

    // 1. 检查并创建 attributeCategories 表
    try {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS sys_attribute_category (
          id SERIAL PRIMARY KEY,
          category_code VARCHAR(50) NOT NULL UNIQUE,
          category_name VARCHAR(100) NOT NULL,
          description TEXT,
          icon VARCHAR(50),
          is_system BOOLEAN NOT NULL DEFAULT FALSE,
          sort_order INTEGER NOT NULL DEFAULT 0,
          status VARCHAR(20) NOT NULL DEFAULT 'active',
          deleted_at TIMESTAMP,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `);
      results.push('Created sys_attribute_category table');
    } catch (e) {
      results.push(`sys_attribute_category table: ${(e as Error).message}`);
    }

    // 2. 创建分类表索引
    try {
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_attr_cat_code ON sys_attribute_category(category_code)
      `);
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_attr_cat_status ON sys_attribute_category(status)
      `);
      results.push('Created indexes on sys_attribute_category');
    } catch (e) {
      results.push(`Category indexes: ${(e as Error).message}`);
    }

    // 3. 为 attributes 表添加新字段
    const alterStatements = [
      `ALTER TABLE sys_attribute ADD COLUMN IF NOT EXISTS parent_id INTEGER REFERENCES sys_attribute(id)`,
      `ALTER TABLE sys_attribute ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0`,
      `ALTER TABLE sys_attribute ADD COLUMN IF NOT EXISTS is_system BOOLEAN NOT NULL DEFAULT FALSE`,
      `ALTER TABLE sys_attribute ADD COLUMN IF NOT EXISTS extra_data JSONB`,
    ];

    for (const stmt of alterStatements) {
      try {
        await db.execute(sql.raw(stmt));
      } catch (e) {
        // 字段可能已存在，忽略错误
      }
    }
    results.push('Added new columns to sys_attribute');

    // 4. 创建 attributes 表索引
    try {
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_attribute_parent ON sys_attribute(parent_id)
      `);
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_attribute_code ON sys_attribute(code)
      `);
      results.push('Created indexes on sys_attribute');
    } catch (e) {
      results.push(`Attribute indexes: ${(e as Error).message}`);
    }

    // 5. 创建唯一索引（先尝试删除旧的）
    try {
      await db.execute(sql`
        DROP INDEX IF EXISTS sys_attribute_code_unique
      `);
    } catch (e) {
      // 忽略
    }

    try {
      await db.execute(sql`
        CREATE UNIQUE INDEX IF NOT EXISTS unq_attribute_category_code 
        ON sys_attribute(category, code) 
        WHERE deleted_at IS NULL
      `);
      results.push('Created unique index on (category, code)');
    } catch (e) {
      results.push(`Unique index: ${(e as Error).message}`);
    }

    // 6. 初始化字典分类数据
    const categories = [
      { code: 'customer_type', name: '客户类型', desc: '客户分类：高校、高职、中专、K12、政府、企业、军警、医院', icon: 'Building2', order: 1 },
      { code: 'project_type', name: '项目类型', desc: '项目分类：软件、集成、咨询、维护等', icon: 'FolderKanban', order: 2 },
      { code: 'project_status', name: '项目状态', desc: '项目生命周期状态', icon: 'CircleDot', order: 3 },
      { code: 'industry', name: '客户类型', desc: '客户类型分类', icon: 'Building', order: 4 },
      { code: 'region', name: '区域', desc: '地理区域划分', icon: 'MapPin', order: 5 },
      { code: 'priority', name: '优先级', desc: '优先级等级', icon: 'AlertCircle', order: 6 },
      { code: 'demand_type', name: '需求类型', desc: '客户需求分类', icon: 'FileText', order: 7 },
      { code: 'intent_level', name: '意向等级', desc: '客户意向程度', icon: 'TrendingUp', order: 8 },
      { code: 'opportunity_stage', name: '商机阶段', desc: '商机流程阶段', icon: 'Target', order: 9 },
      { code: 'solution_type', name: '解决方案类型', desc: '解决方案分类', icon: 'FileSpreadsheet', order: 10 },
      { code: 'service_type', name: '服务类型', desc: '售前服务类型', icon: 'Settings', order: 11 },
      { code: 'arbitration_type', name: '仲裁类型', desc: '仲裁申请类型', icon: 'Gavel', order: 12 },
      { code: 'alert_severity', name: '预警严重程度', desc: '预警严重级别', icon: 'AlertTriangle', order: 13 },
      { code: 'alert_category', name: '预警分类', desc: '预警规则分类', icon: 'Bell', order: 14 },
      { code: 'member_role', name: '成员角色', desc: '项目团队成员角色', icon: 'Users', order: 15 },
      { code: 'file_type', name: '文件类型', desc: '文档文件类型', icon: 'FileIcon', order: 16 },
    ];

    for (const cat of categories) {
      try {
        await db.execute(sql`
          INSERT INTO sys_attribute_category (category_code, category_name, description, icon, is_system, sort_order, status)
          VALUES (${cat.code}, ${cat.name}, ${cat.desc}, ${cat.icon}, true, ${cat.order}, 'active')
          ON CONFLICT (category_code) DO NOTHING
        `);
      } catch (e) {
        // 忽略已存在的记录
      }
    }
    results.push(`Initialized ${categories.length} categories`);

    // 7. 初始化字典项数据
    const dictionaryItems = [
      // 客户类型
      { category: 'customer_type', items: [
        { code: 'university', name: '高校', value: 'university', order: 1 },
        { code: 'government', name: '政府', value: 'government', order: 2 },
        { code: 'enterprise', name: '企业', value: 'enterprise', order: 3 },
        { code: 'hospital', name: '医院', value: 'hospital', order: 4 },
        { code: 'k12', name: 'K12', value: 'k12', order: 5 },
        { code: 'higher_vocational', name: '高职', value: 'higher_vocational', order: 6 },
        { code: 'secondary_vocational', name: '中专', value: 'secondary_vocational', order: 7 },
        { code: 'military_police', name: '军警', value: 'military_police', order: 8 },
      ]},
      // 项目类型
      { category: 'project_type', items: [
        { code: 'software', name: '软件', value: 'software', order: 1 },
        { code: 'integration', name: '集成', value: 'integration', order: 2 },
        { code: 'consulting', name: '咨询', value: 'consulting', order: 3 },
        { code: 'maintenance', name: '维护', value: 'maintenance', order: 4 },
        { code: 'other', name: '其他', value: 'other', order: 5 },
      ]},
      // 项目状态
      { category: 'project_status', items: [
        { code: 'draft', name: '草稿', value: 'draft', order: 1 },
        { code: 'opportunity', name: '商机', value: 'opportunity', order: 2 },
        { code: 'proposal', name: '方案', value: 'proposal', order: 3 },
        { code: 'negotiation', name: '洽谈', value: 'negotiation', order: 4 },
        { code: 'contract', name: '合同', value: 'contract', order: 5 },
        { code: 'implementation', name: '实施', value: 'implementation', order: 6 },
        { code: 'completed', name: '完成', value: 'completed', order: 7 },
        { code: 'lost', name: '失败', value: 'lost', order: 8 },
      ]},
      // 行业类型
      { category: 'industry', items: [
        { code: 'university', name: '高校', value: 'university', order: 1 },
        { code: 'government', name: '政府', value: 'government', order: 2 },
        { code: 'enterprise', name: '企业', value: 'enterprise', order: 3 },
        { code: 'hospital', name: '医院', value: 'hospital', order: 4 },
        { code: 'k12', name: 'K12', value: 'k12', order: 5 },
        { code: 'higher_vocational', name: '高职', value: 'higher_vocational', order: 6 },
        { code: 'secondary_vocational', name: '中专', value: 'secondary_vocational', order: 7 },
        { code: 'military_police', name: '军警', value: 'military_police', order: 8 },
      ]},
      // 区域
      { category: 'region', items: [
        { code: 'north_china', name: '华北', value: '华北', order: 1 },
        { code: 'east_china', name: '华东', value: '华东', order: 2 },
        { code: 'south_china', name: '华南', value: '华南', order: 3 },
        { code: 'central_china', name: '华中', value: '华中', order: 4 },
        { code: 'northwest', name: '西北', value: '西北', order: 5 },
        { code: 'southwest', name: '西南', value: '西南', order: 6 },
        { code: 'northeast', name: '东北', value: '东北', order: 7 },
        { code: 'hmt', name: '港澳台', value: '港澳台', order: 8 },
        { code: 'overseas', name: '海外', value: '海外', order: 9 },
      ]},
      // 优先级
      { category: 'priority', items: [
        { code: 'high', name: '高', value: 'high', order: 1 },
        { code: 'medium', name: '中', value: 'medium', order: 2 },
        { code: 'low', name: '低', value: 'low', order: 3 },
      ]},
      // 需求类型
      { category: 'demand_type', items: [
        { code: 'software', name: '软件系统', value: 'software', order: 1 },
        { code: 'hardware', name: '硬件设备', value: 'hardware', order: 2 },
        { code: 'consulting', name: '咨询服务', value: 'consulting', order: 3 },
        { code: 'integration', name: '集成项目', value: 'integration', order: 4 },
        { code: 'other', name: '其他', value: 'other', order: 5 },
      ]},
      // 意向等级
      { category: 'intent_level', items: [
        { code: 'high', name: '高意向', value: 'high', order: 1 },
        { code: 'medium', name: '中意向', value: 'medium', order: 2 },
        { code: 'low', name: '低意向', value: 'low', order: 3 },
      ]},
      // 商机阶段
      { category: 'opportunity_stage', items: [
        { code: 'lead', name: '线索', value: 'lead', order: 1 },
        { code: 'qualified', name: '合格线索', value: 'qualified', order: 2 },
        { code: 'proposal', name: '方案报价', value: 'proposal', order: 3 },
        { code: 'negotiation', name: '招标投标', value: 'negotiation', order: 4 },
        { code: 'closed_won', name: '赢单', value: 'closed_won', order: 5 },
        { code: 'closed_lost', name: '输单', value: 'closed_lost', order: 6 },
      ]},
      // 解决方案类型
      { category: 'solution_type', items: [
        { code: 'technical', name: '技术方案', value: 'technical', order: 1 },
        { code: 'commercial', name: '商务方案', value: 'commercial', order: 2 },
        { code: 'integrated', name: '综合方案', value: 'integrated', order: 3 },
        { code: 'product', name: '产品方案', value: 'product', order: 4 },
        { code: 'implementation', name: '实施方案', value: 'implementation', order: 5 },
        { code: 'maintenance', name: '运维方案', value: 'maintenance', order: 6 },
      ]},
      // 服务类型
      { category: 'service_type', items: [
        { code: 'analysis', name: '分析类', value: 'analysis', order: 1 },
        { code: 'design', name: '设计类', value: 'design', order: 2 },
        { code: 'presentation', name: '演示类', value: 'presentation', order: 3 },
        { code: 'negotiation', name: '谈判类', value: 'negotiation', order: 4 },
        { code: 'site_visit', name: '现场拜访', value: 'site_visit', order: 5 },
        { code: 'phone', name: '电话沟通', value: 'phone', order: 6 },
        { code: 'wechat', name: '微信沟通', value: 'wechat', order: 7 },
        { code: 'email', name: '邮件沟通', value: 'email', order: 8 },
        { code: 'video_meeting', name: '视频会议', value: 'video_meeting', order: 9 },
      ]},
      // 仲裁类型
      { category: 'arbitration_type', items: [
        { code: 'cost', name: '成本仲裁', value: 'cost', order: 1 },
        { code: 'workload', name: '工作量仲裁', value: 'workload', order: 2 },
        { code: 'dispute', name: '争议仲裁', value: 'dispute', order: 3 },
      ]},
      // 预警严重程度
      { category: 'alert_severity', items: [
        { code: 'low', name: '低', value: 'low', order: 1 },
        { code: 'medium', name: '中', value: 'medium', order: 2 },
        { code: 'high', name: '高', value: 'high', order: 3 },
        { code: 'critical', name: '严重', value: 'critical', order: 4 },
      ]},
      // 预警分类
      { category: 'alert_category', items: [
        { code: 'not_updated', name: '未更新', value: 'not_updated', order: 1 },
        { code: 'inactive', name: '不活跃', value: 'inactive', order: 2 },
        { code: 'overdue', name: '超期', value: 'overdue', order: 3 },
        { code: 'not_used', name: '未使用', value: 'not_used', order: 4 },
        { code: 'not_referenced', name: '未引用', value: 'not_referenced', order: 5 },
      ]},
      // 成员角色
      { category: 'member_role', items: [
        { code: 'project_manager', name: '项目经理', value: '项目经理', order: 1 },
        { code: 'tech_lead', name: '技术负责人', value: '技术负责人', order: 2 },
        { code: 'presale_engineer', name: '售前工程师', value: '售前工程师', order: 3 },
        { code: 'dev_engineer', name: '开发工程师', value: '开发工程师', order: 4 },
        { code: 'test_engineer', name: '测试工程师', value: '测试工程师', order: 5 },
        { code: 'product_manager', name: '产品经理', value: '产品经理', order: 6 },
        { code: 'ui_designer', name: 'UI设计师', value: 'UI设计师', order: 7 },
        { code: 'consultant', name: '顾问', value: '顾问', order: 8 },
      ]},
      // 文件类型
      { category: 'file_type', items: [
        { code: 'ppt', name: 'PowerPoint (PPT)', value: 'ppt', order: 1 },
        { code: 'word', name: 'Word文档', value: 'word', order: 2 },
        { code: 'excel', name: 'Excel表格', value: 'excel', order: 3 },
        { code: 'pdf', name: 'PDF文档', value: 'pdf', order: 4 },
        { code: 'video', name: '视频文件', value: 'video', order: 5 },
      ]},
    ];

    let totalItems = 0;
    for (const group of dictionaryItems) {
      for (const item of group.items) {
        try {
          await db.execute(sql`
            INSERT INTO sys_attribute (category, code, name, value, sort_order, is_system, status, value_type)
            VALUES (${group.category}, ${item.code}, ${item.name}, ${item.value}, ${item.order}, true, 'active', 'string')
            ON CONFLICT (category, code) WHERE deleted_at IS NULL DO NOTHING
          `);
          totalItems++;
        } catch (e) {
          // 忽略已存在的记录
        }
      }
    }
    results.push(`Initialized ${totalItems} dictionary items`);

    return NextResponse.json({
      success: true,
      message: 'Dictionary migration completed successfully',
      results,
    });
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json({
      success: false,
      error: (error as Error).message,
    }, { status: 500 });
  }
}

/**
 * GET /api/migrations/dictionary
 * 检查迁移状态
 */
export async function GET() {
  try {
    // 检查表是否存在
    const categoryTableCheck = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'sys_attribute_category'
      ) as exists
    `);

    const attributeColumns = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'sys_attribute'
    `);

    // 统计数据
    let categoryCount = 0;
    let itemCount = 0;

    try {
      const catResult = await db.execute(sql`
        SELECT COUNT(*) as count FROM sys_attribute_category WHERE deleted_at IS NULL
      `);
      categoryCount = Number(catResult[0]?.count || 0);
    } catch (e) {
      // 表可能不存在
    }

    try {
      const itemResult = await db.execute(sql`
        SELECT COUNT(*) as count FROM sys_attribute WHERE deleted_at IS NULL
      `);
      itemCount = Number(itemResult[0]?.count || 0);
    } catch (e) {
      // 表可能不存在
    }

    return NextResponse.json({
      success: true,
      status: {
        categoryTableExists: categoryTableCheck[0]?.exists || false,
        attributeColumns: attributeColumns.map((c: any) => c.column_name),
        categoryCount,
        itemCount,
      },
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: (error as Error).message,
    }, { status: 500 });
  }
}
