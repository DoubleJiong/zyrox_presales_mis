/**
 * 执行解决方案模块升级数据库迁移
 */

import { db } from './index';
import { sql } from 'drizzle-orm';

async function runMigration() {
  console.log('开始执行解决方案模块升级迁移...');
  
  try {
    // 1. 增强 solutionVersions 表
    console.log('1. 增强 solutionVersions 表...');
    await db.execute(sql`
      ALTER TABLE bus_solution_version 
      ADD COLUMN IF NOT EXISTS snapshot_data jsonb,
      ADD COLUMN IF NOT EXISTS sub_schemes_snapshot jsonb,
      ADD COLUMN IF NOT EXISTS files_snapshot jsonb,
      ADD COLUMN IF NOT EXISTS team_snapshot jsonb,
      ADD COLUMN IF NOT EXISTS statistics_snapshot jsonb,
      ADD COLUMN IF NOT EXISTS change_source varchar(20) DEFAULT 'manual',
      ADD COLUMN IF NOT EXISTS parent_version_id integer REFERENCES bus_solution_version(id),
      ADD COLUMN IF NOT EXISTS is_published boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS published_at timestamp,
      ADD COLUMN IF NOT EXISTS published_by integer REFERENCES sys_user(id)
    `);
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_solution_version_parent ON bus_solution_version(parent_version_id)
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_solution_version_published ON bus_solution_version(is_published)
    `);
    console.log('✓ solutionVersions 表增强完成');
    
    // 2. 创建评审模板表
    console.log('2. 创建评审模板表...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS bus_review_template (
        id serial PRIMARY KEY,
        template_code varchar(50) NOT NULL UNIQUE,
        template_name varchar(200) NOT NULL,
        template_type varchar(50) NOT NULL,
        sub_scheme_type varchar(50),
        description text,
        criteria_config jsonb NOT NULL,
        applicable_industries jsonb,
        applicable_scenarios jsonb,
        review_levels integer DEFAULT 1,
        pass_score decimal(5,2) DEFAULT 60,
        is_active boolean DEFAULT true,
        is_default boolean DEFAULT false,
        created_by integer REFERENCES sys_user(id),
        created_at timestamp DEFAULT NOW(),
        updated_at timestamp DEFAULT NOW(),
        deleted_at timestamp
      )
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_review_template_type ON bus_review_template(template_type)
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_review_template_active ON bus_review_template(is_active)
    `);
    console.log('✓ 评审模板表创建完成');
    
    // 3. 增强 solutionReviews 表
    console.log('3. 增强 solutionReviews 表...');
    await db.execute(sql`
      ALTER TABLE bus_solution_review
      ADD COLUMN IF NOT EXISTS template_id integer REFERENCES bus_review_template(id),
      ADD COLUMN IF NOT EXISTS version_id integer REFERENCES bus_solution_version(id),
      ADD COLUMN IF NOT EXISTS review_round integer DEFAULT 1,
      ADD COLUMN IF NOT EXISTS total_score decimal(5,2),
      ADD COLUMN IF NOT EXISTS weighted_score decimal(5,2),
      ADD COLUMN IF NOT EXISTS review_duration integer,
      ADD COLUMN IF NOT EXISTS review_start_at timestamp,
      ADD COLUMN IF NOT EXISTS review_end_at timestamp
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_solution_review_template ON bus_solution_review(template_id)
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_solution_review_version ON bus_solution_review(version_id)
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_solution_review_round ON bus_solution_review(review_round)
    `);
    console.log('✓ solutionReviews 表增强完成');
    
    // 4. 创建评审详情表
    console.log('4. 创建评审详情表...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS bus_review_detail (
        id serial PRIMARY KEY,
        review_id integer REFERENCES bus_solution_review(id) ON DELETE CASCADE NOT NULL,
        criterion_code varchar(50) NOT NULL,
        criterion_name varchar(100) NOT NULL,
        criterion_weight decimal(5,4) NOT NULL,
        parent_code varchar(50),
        score integer NOT NULL,
        weighted_score decimal(5,2),
        comment text,
        evidence text,
        created_at timestamp DEFAULT NOW(),
        UNIQUE(review_id, criterion_code)
      )
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_review_detail_review ON bus_review_detail(review_id)
    `);
    console.log('✓ 评审详情表创建完成');
    
    // 5. 创建方案评分表
    console.log('5. 创建方案评分表...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS bus_solution_score (
        id serial PRIMARY KEY,
        solution_id integer REFERENCES bus_solution(id) NOT NULL UNIQUE,
        quality_score decimal(5,2) DEFAULT 0,
        business_value_score decimal(5,2) DEFAULT 0,
        user_recognition_score decimal(5,2) DEFAULT 0,
        activity_score decimal(5,2) DEFAULT 0,
        total_score decimal(5,2) DEFAULT 0,
        ranking integer,
        score_details jsonb,
        calculated_at timestamp,
        calculation_duration integer,
        created_at timestamp DEFAULT NOW(),
        updated_at timestamp DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_solution_score_total ON bus_solution_score(total_score DESC)
    `);
    console.log('✓ 方案评分表创建完成');
    
    // 6. 创建评分历史表
    console.log('6. 创建评分历史表...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS bus_solution_score_history (
        id serial PRIMARY KEY,
        solution_id integer REFERENCES bus_solution(id) NOT NULL,
        snapshot_date date NOT NULL,
        snapshot_type varchar(20) NOT NULL,
        quality_score decimal(5,2),
        business_value_score decimal(5,2),
        user_recognition_score decimal(5,2),
        activity_score decimal(5,2),
        total_score decimal(5,2),
        ranking integer,
        score_details jsonb,
        created_at timestamp DEFAULT NOW(),
        UNIQUE(solution_id, snapshot_date, snapshot_type)
      )
    `);
    console.log('✓ 评分历史表创建完成');
    
    // 7. 创建评分配置表
    console.log('7. 创建评分配置表...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS bus_score_config (
        id serial PRIMARY KEY,
        config_code varchar(50) NOT NULL UNIQUE,
        config_name varchar(100) NOT NULL,
        description text,
        dimension_weights jsonb NOT NULL,
        indicator_weights jsonb,
        normalization_params jsonb,
        is_active boolean DEFAULT true,
        is_default boolean DEFAULT false,
        created_by integer REFERENCES sys_user(id),
        created_at timestamp DEFAULT NOW(),
        updated_at timestamp DEFAULT NOW()
      )
    `);
    console.log('✓ 评分配置表创建完成');
    
    // 8. 增强 solutionProjects 表
    console.log('8. 增强 solutionProjects 表...');
    await db.execute(sql`
      ALTER TABLE bus_solution_project
      ADD COLUMN IF NOT EXISTS version_id integer REFERENCES bus_solution_version(id),
      ADD COLUMN IF NOT EXISTS contribution_confirmed boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS confirmed_at timestamp,
      ADD COLUMN IF NOT EXISTS confirmed_by integer REFERENCES sys_user(id),
      ADD COLUMN IF NOT EXISTS contribution_ratio decimal(4,3) DEFAULT 1.0,
      ADD COLUMN IF NOT EXISTS estimated_value decimal(15,2),
      ADD COLUMN IF NOT EXISTS actual_value decimal(15,2),
      ADD COLUMN IF NOT EXISTS value_currency varchar(10) DEFAULT 'CNY',
      ADD COLUMN IF NOT EXISTS win_contribution_score decimal(5,2),
      ADD COLUMN IF NOT EXISTS feedback_score decimal(3,2),
      ADD COLUMN IF NOT EXISTS feedback_content text
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_solution_project_version ON bus_solution_project(version_id)
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_solution_project_confirmed ON bus_solution_project(contribution_confirmed)
    `);
    console.log('✓ solutionProjects 表增强完成');
    
    // 9. 增强 solutionUsageRecord 表
    console.log('9. 增强 solutionUsageRecord 表...');
    await db.execute(sql`
      ALTER TABLE bus_solution_usage_record
      ADD COLUMN IF NOT EXISTS version_id integer REFERENCES bus_solution_version(id),
      ADD COLUMN IF NOT EXISTS usage_result varchar(50),
      ADD COLUMN IF NOT EXISTS result_project_id integer REFERENCES bus_project(id),
      ADD COLUMN IF NOT EXISTS conversion_days integer,
      ADD COLUMN IF NOT EXISTS effectiveness_score decimal(3,2),
      ADD COLUMN IF NOT EXISTS effectiveness_notes text
    `);
    console.log('✓ solutionUsageRecord 表增强完成');
    
    // 10. 增强 solutionStatsSummary 表
    console.log('10. 增强 solutionStatsSummary 表...');
    await db.execute(sql`
      ALTER TABLE bus_solution_stats_summary
      ADD COLUMN IF NOT EXISTS version_count integer DEFAULT 0,
      ADD COLUMN IF NOT EXISTS latest_version varchar(20),
      ADD COLUMN IF NOT EXISTS latest_version_at timestamp,
      ADD COLUMN IF NOT EXISTS review_count integer DEFAULT 0,
      ADD COLUMN IF NOT EXISTS review_pass_count integer DEFAULT 0,
      ADD COLUMN IF NOT EXISTS avg_review_score decimal(5,2),
      ADD COLUMN IF NOT EXISTS first_time_pass_rate decimal(5,2),
      ADD COLUMN IF NOT EXISTS quality_score decimal(5,2),
      ADD COLUMN IF NOT EXISTS business_value_score decimal(5,2),
      ADD COLUMN IF NOT EXISTS user_recognition_score decimal(5,2),
      ADD COLUMN IF NOT EXISTS activity_score decimal(5,2),
      ADD COLUMN IF NOT EXISTS total_score decimal(5,2),
      ADD COLUMN IF NOT EXISTS ranking integer,
      ADD COLUMN IF NOT EXISTS monthly_trend jsonb,
      ADD COLUMN IF NOT EXISTS last_30d_views integer DEFAULT 0,
      ADD COLUMN IF NOT EXISTS last_30d_downloads integer DEFAULT 0,
      ADD COLUMN IF NOT EXISTS last_30d_usage integer DEFAULT 0
    `);
    console.log('✓ solutionStatsSummary 表增强完成');
    
    // 11. 插入默认评分配置
    console.log('11. 插入默认评分配置...');
    await db.execute(sql`
      INSERT INTO bus_score_config (config_code, config_name, description, dimension_weights, is_default)
      VALUES (
        'DEFAULT',
        '默认评分配置',
        '方案评分的默认权重配置',
        '{"quality": 0.30, "business_value": 0.35, "user_recognition": 0.20, "activity": 0.15}',
        true
      )
      ON CONFLICT (config_code) DO NOTHING
    `);
    console.log('✓ 默认评分配置插入完成');
    
    // 12. 插入评审模板
    console.log('12. 插入评审模板...');
    await db.execute(sql`
      INSERT INTO bus_review_template (template_code, template_name, template_type, description, criteria_config, is_default, pass_score)
      VALUES (
        'SOLUTION_OVERALL',
        '方案整体评审模板',
        'solution',
        '用于评审解决方案整体质量的默认模板',
        '[
          {"code": "completeness", "name": "完整性", "weight": 0.15, "description": "方案内容是否完整全面"},
          {"code": "feasibility", "name": "可行性", "weight": 0.20, "description": "方案是否具备实施条件"},
          {"code": "match", "name": "匹配度", "weight": 0.20, "description": "方案与业务需求的契合程度"},
          {"code": "competitiveness", "name": "竞争力", "weight": 0.15, "description": "方案的市场竞争优势"},
          {"code": "cost_benefit", "name": "成本效益", "weight": 0.15, "description": "投入产出比"},
          {"code": "risk_control", "name": "风险控制", "weight": 0.10, "description": "风险识别与应对措施"},
          {"code": "standardization", "name": "规范性", "weight": 0.05, "description": "文档规范性"}
        ]',
        true,
        60.00
      )
      ON CONFLICT (template_code) DO NOTHING
    `);
    console.log('✓ 评审模板插入完成');
    
    console.log('\n✅ 所有迁移已完成！');
    
  } catch (error) {
    console.error('迁移执行失败:', error);
    throw error;
  }
}

// 执行迁移
runMigration()
  .then(() => {
    console.log('迁移脚本执行完毕');
    process.exit(0);
  })
  .catch((error) => {
    console.error('迁移失败:', error);
    process.exit(1);
  });
