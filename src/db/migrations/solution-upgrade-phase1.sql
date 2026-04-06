-- ============================================
-- 解决方案模块升级 - Phase 1: 版本控制体系
-- ============================================

-- 1. 增强 solutionVersions 表
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
ADD COLUMN IF NOT EXISTS published_by integer REFERENCES sys_user(id);

COMMENT ON COLUMN bus_solution_version.snapshot_data IS '完整方案快照（JSON）';
COMMENT ON COLUMN bus_solution_version.sub_schemes_snapshot IS '子方案快照列表';
COMMENT ON COLUMN bus_solution_version.files_snapshot IS '文件清单快照';
COMMENT ON COLUMN bus_solution_version.team_snapshot IS '团队成员快照';
COMMENT ON COLUMN bus_solution_version.statistics_snapshot IS '统计快照';
COMMENT ON COLUMN bus_solution_version.change_source IS '变更来源：manual/edit/review/auto';
COMMENT ON COLUMN bus_solution_version.parent_version_id IS '父版本ID（用于版本树）';
COMMENT ON COLUMN bus_solution_version.is_published IS '是否已发布';
COMMENT ON COLUMN bus_solution_version.published_at IS '发布时间';
COMMENT ON COLUMN bus_solution_version.published_by IS '发布人';

-- 新增索引
CREATE INDEX IF NOT EXISTS idx_solution_version_parent ON bus_solution_version(parent_version_id);
CREATE INDEX IF NOT EXISTS idx_solution_version_published ON bus_solution_version(is_published);

-- 2. 新增评审模板表
CREATE TABLE IF NOT EXISTS bus_review_template (
  id serial PRIMARY KEY,
  template_code varchar(50) NOT NULL UNIQUE,
  template_name varchar(200) NOT NULL,
  template_type varchar(50) NOT NULL,  -- solution/sub_scheme
  sub_scheme_type varchar(50),         -- technical/business/implementation/architecture
  description text,
  
  -- 评审维度配置（JSON数组）
  criteria_config jsonb NOT NULL,
  
  -- 适用范围
  applicable_industries jsonb,         -- 适用行业列表
  applicable_scenarios jsonb,          -- 适用场景列表
  
  -- 评审流程配置
  review_levels integer DEFAULT 1,     -- 评审级别数
  pass_score decimal(5,2) DEFAULT 60,  -- 通过分数
  
  -- 状态
  is_active boolean DEFAULT true,
  is_default boolean DEFAULT false,
  
  -- 审计字段
  created_by integer REFERENCES sys_user(id),
  created_at timestamp DEFAULT NOW(),
  updated_at timestamp DEFAULT NOW(),
  deleted_at timestamp
);

CREATE INDEX IF NOT EXISTS idx_review_template_type ON bus_review_template(template_type);
CREATE INDEX IF NOT EXISTS idx_review_template_active ON bus_review_template(is_active);

COMMENT ON TABLE bus_review_template IS '评审模板表';

-- 3. 增强 solutionReviews 表
ALTER TABLE bus_solution_review
ADD COLUMN IF NOT EXISTS template_id integer REFERENCES bus_review_template(id),
ADD COLUMN IF NOT EXISTS version_id integer REFERENCES bus_solution_version(id),
ADD COLUMN IF NOT EXISTS review_round integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS total_score decimal(5,2),
ADD COLUMN IF NOT EXISTS weighted_score decimal(5,2),
ADD COLUMN IF NOT EXISTS review_duration integer,
ADD COLUMN IF NOT EXISTS review_start_at timestamp,
ADD COLUMN IF NOT EXISTS review_end_at timestamp;

COMMENT ON COLUMN bus_solution_review.template_id IS '评审模板ID';
COMMENT ON COLUMN bus_solution_review.version_id IS '评审的方案版本ID';
COMMENT ON COLUMN bus_solution_review.review_round IS '评审轮次';
COMMENT ON COLUMN bus_solution_review.total_score IS '总分（加权前）';
COMMENT ON COLUMN bus_solution_review.weighted_score IS '加权得分';
COMMENT ON COLUMN bus_solution_review.review_duration IS '评审耗时（分钟）';

-- 新增索引
CREATE INDEX IF NOT EXISTS idx_solution_review_template ON bus_solution_review(template_id);
CREATE INDEX IF NOT EXISTS idx_solution_review_version ON bus_solution_review(version_id);
CREATE INDEX IF NOT EXISTS idx_solution_review_round ON bus_solution_review(review_round);

-- 4. 新增评审详情表
CREATE TABLE IF NOT EXISTS bus_review_detail (
  id serial PRIMARY KEY,
  review_id integer REFERENCES bus_solution_review(id) ON DELETE CASCADE NOT NULL,
  
  -- 维度信息
  criterion_code varchar(50) NOT NULL,
  criterion_name varchar(100) NOT NULL,
  criterion_weight decimal(5,4) NOT NULL,
  parent_code varchar(50),             -- 父维度编码（用于子维度）
  
  -- 评分
  score integer NOT NULL,              -- 原始分数(1-10或1-100)
  weighted_score decimal(5,2),         -- 加权得分
  
  -- 评价
  comment text,                        -- 评价意见
  evidence text,                       -- 评分依据
  
  created_at timestamp DEFAULT NOW(),
  
  UNIQUE(review_id, criterion_code)
);

CREATE INDEX IF NOT EXISTS idx_review_detail_review ON bus_review_detail(review_id);
CREATE INDEX IF NOT EXISTS idx_review_detail_criterion ON bus_review_detail(criterion_code);

COMMENT ON TABLE bus_review_detail IS '评审详情表';

-- 5. 新增方案评分表
CREATE TABLE IF NOT EXISTS bus_solution_score (
  id serial PRIMARY KEY,
  solution_id integer REFERENCES bus_solution(id) NOT NULL UNIQUE,
  
  -- 各维度评分
  quality_score decimal(5,2) DEFAULT 0,           -- 质量分
  business_value_score decimal(5,2) DEFAULT 0,    -- 商业价值分
  user_recognition_score decimal(5,2) DEFAULT 0,  -- 用户认可分
  activity_score decimal(5,2) DEFAULT 0,          -- 活跃度分
  
  -- 综合评分
  total_score decimal(5,2) DEFAULT 0,             -- 综合总分
  ranking integer,                                -- 排名
  
  -- 评分详情（JSON存储各细分指标）
  score_details jsonb,
  
  -- 计算时间
  calculated_at timestamp,
  calculation_duration integer,  -- 计算耗时（毫秒）
  
  created_at timestamp DEFAULT NOW(),
  updated_at timestamp DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_solution_score_total ON bus_solution_score(total_score DESC);
CREATE INDEX IF NOT EXISTS idx_solution_score_quality ON bus_solution_score(quality_score DESC);
CREATE INDEX IF NOT EXISTS idx_solution_score_business ON bus_solution_score(business_value_score DESC);
CREATE INDEX IF NOT EXISTS idx_solution_score_ranking ON bus_solution_score(ranking);

COMMENT ON TABLE bus_solution_score IS '方案综合评分表';

-- 6. 新增评分历史表
CREATE TABLE IF NOT EXISTS bus_solution_score_history (
  id serial PRIMARY KEY,
  solution_id integer REFERENCES bus_solution(id) NOT NULL,
  
  -- 快照时间
  snapshot_date date NOT NULL,
  snapshot_type varchar(20) NOT NULL,  -- daily/weekly/monthly
  
  -- 各维度评分
  quality_score decimal(5,2),
  business_value_score decimal(5,2),
  user_recognition_score decimal(5,2),
  activity_score decimal(5,2),
  total_score decimal(5,2),
  
  -- 排名
  ranking integer,
  
  -- 评分详情快照
  score_details jsonb,
  
  created_at timestamp DEFAULT NOW(),
  
  UNIQUE(solution_id, snapshot_date, snapshot_type)
);

CREATE INDEX IF NOT EXISTS idx_score_history_solution ON bus_solution_score_history(solution_id);
CREATE INDEX IF NOT EXISTS idx_score_history_date ON bus_solution_score_history(snapshot_date);
CREATE INDEX IF NOT EXISTS idx_score_history_type ON bus_solution_score_history(snapshot_type);

COMMENT ON TABLE bus_solution_score_history IS '评分历史表';

-- 7. 新增评分配置表
CREATE TABLE IF NOT EXISTS bus_score_config (
  id serial PRIMARY KEY,
  config_code varchar(50) NOT NULL UNIQUE,
  config_name varchar(100) NOT NULL,
  description text,
  
  -- 维度权重配置
  dimension_weights jsonb NOT NULL,
  
  -- 细分指标权重配置
  indicator_weights jsonb,
  
  -- 归一化参数
  normalization_params jsonb,
  
  -- 状态
  is_active boolean DEFAULT true,
  is_default boolean DEFAULT false,
  
  created_by integer REFERENCES sys_user(id),
  created_at timestamp DEFAULT NOW(),
  updated_at timestamp DEFAULT NOW()
);

COMMENT ON TABLE bus_score_config IS '评分权重配置表';

-- 8. 增强 solutionProjects 表
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
ADD COLUMN IF NOT EXISTS feedback_content text;

COMMENT ON COLUMN bus_solution_project.version_id IS '使用的方案版本ID';
COMMENT ON COLUMN bus_solution_project.contribution_confirmed IS '贡献是否已确认';
COMMENT ON COLUMN bus_solution_project.confirmed_at IS '确认时间';
COMMENT ON COLUMN bus_solution_project.confirmed_by IS '确认人';
COMMENT ON COLUMN bus_solution_project.contribution_ratio IS '贡献比例（0-1）';
COMMENT ON COLUMN bus_solution_project.estimated_value IS '预估价值';
COMMENT ON COLUMN bus_solution_project.actual_value IS '实际价值';
COMMENT ON COLUMN bus_solution_project.win_contribution_score IS '中标贡献分（0-100）';
COMMENT ON COLUMN bus_solution_project.feedback_score IS '用户反馈评分（1-5）';

-- 新增索引
CREATE INDEX IF NOT EXISTS idx_solution_project_version ON bus_solution_project(version_id);
CREATE INDEX IF NOT EXISTS idx_solution_project_confirmed ON bus_solution_project(contribution_confirmed);

-- 9. 增强 solutionUsageRecord 表
ALTER TABLE bus_solution_usage_record
ADD COLUMN IF NOT EXISTS version_id integer REFERENCES bus_solution_version(id),
ADD COLUMN IF NOT EXISTS usage_result varchar(50),
ADD COLUMN IF NOT EXISTS result_project_id integer REFERENCES bus_project(id),
ADD COLUMN IF NOT EXISTS conversion_days integer,
ADD COLUMN IF NOT EXISTS effectiveness_score decimal(3,2),
ADD COLUMN IF NOT EXISTS effectiveness_notes text;

COMMENT ON COLUMN bus_solution_usage_record.version_id IS '使用的方案版本';
COMMENT ON COLUMN bus_solution_usage_record.usage_result IS '使用结果：adopted/modified/abandoned';
COMMENT ON COLUMN bus_solution_usage_record.result_project_id IS '转化后的项目ID';
COMMENT ON COLUMN bus_solution_usage_record.conversion_days IS '从使用到转化的天数';
COMMENT ON COLUMN bus_solution_usage_record.effectiveness_score IS '有效性评分（1-5）';

-- 10. 增强 solutionStatsSummary 表
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
ADD COLUMN IF NOT EXISTS last_30d_usage integer DEFAULT 0;

COMMENT ON COLUMN bus_solution_stats_summary.version_count IS '版本总数';
COMMENT ON COLUMN bus_solution_stats_summary.review_count IS '评审次数';
COMMENT ON COLUMN bus_solution_stats_summary.avg_review_score IS '平均评审分';
COMMENT ON COLUMN bus_solution_stats_summary.quality_score IS '质量评分';
COMMENT ON COLUMN bus_solution_stats_summary.total_score IS '综合评分';

-- ============================================
-- 初始化数据
-- ============================================

-- 插入默认评分配置
INSERT INTO bus_score_config (config_code, config_name, description, dimension_weights, indicator_weights, is_default)
VALUES (
  'DEFAULT',
  '默认评分配置',
  '方案评分的默认权重配置',
  '{"quality": 0.30, "business_value": 0.35, "user_recognition": 0.20, "activity": 0.15}',
  '{
    "quality": {
      "pass_rate": 0.30,
      "avg_review_score": 0.40,
      "first_time_pass_rate": 0.20,
      "dimension_score": 0.10
    },
    "business_value": {
      "won_project_count": 0.25,
      "won_rate": 0.20,
      "total_amount": 0.30,
      "satisfaction": 0.15,
      "conversion_efficiency": 0.10
    },
    "user_recognition": {
      "view_count": 0.20,
      "download_count": 0.20,
      "avg_rating": 0.30,
      "like_count": 0.15,
      "template_usage": 0.15
    },
    "activity": {
      "update_frequency": 0.30,
      "contributor_count": 0.25,
      "recent_usage": 0.25,
      "comment_activity": 0.20
    }
  }',
  true
) ON CONFLICT (config_code) DO NOTHING;

-- 插入方案整体评审模板
INSERT INTO bus_review_template (template_code, template_name, template_type, description, criteria_config, is_default, pass_score)
VALUES (
  'SOLUTION_OVERALL',
  '方案整体评审模板',
  'solution',
  '用于评审解决方案整体质量的默认模板',
  '[
    {"code": "completeness", "name": "完整性", "weight": 0.15, "description": "方案内容是否完整全面", "subCriteria": [
      {"code": "basic_info", "name": "基本信息完整", "weight": 0.05},
      {"code": "sub_schemes", "name": "子方案完整", "weight": 0.05},
      {"code": "attachments", "name": "附件完整", "weight": 0.05}
    ]},
    {"code": "feasibility", "name": "可行性", "weight": 0.20, "description": "方案是否具备实施条件", "subCriteria": [
      {"code": "tech_feasibility", "name": "技术可行性", "weight": 0.10},
      {"code": "resource_feasibility", "name": "资源可行性", "weight": 0.05},
      {"code": "time_feasibility", "name": "时间可行性", "weight": 0.05}
    ]},
    {"code": "match", "name": "匹配度", "weight": 0.20, "description": "方案与业务需求的契合程度", "subCriteria": [
      {"code": "need_match", "name": "需求匹配", "weight": 0.10},
      {"code": "scene_match", "name": "场景匹配", "weight": 0.05},
      {"code": "customer_match", "name": "客户匹配", "weight": 0.05}
    ]},
    {"code": "competitiveness", "name": "竞争力", "weight": 0.15, "description": "方案的市场竞争优势", "subCriteria": [
      {"code": "tech_advantage", "name": "技术优势", "weight": 0.05},
      {"code": "cost_advantage", "name": "成本优势", "weight": 0.05},
      {"code": "service_advantage", "name": "服务优势", "weight": 0.05}
    ]},
    {"code": "cost_benefit", "name": "成本效益", "weight": 0.15, "description": "投入产出比", "subCriteria": [
      {"code": "cost_reasonable", "name": "预估成本合理", "weight": 0.08},
      {"code": "benefit_clear", "name": "预期收益明确", "weight": 0.07}
    ]},
    {"code": "risk_control", "name": "风险控制", "weight": 0.10, "description": "风险识别与应对措施", "subCriteria": [
      {"code": "risk_identify", "name": "风险识别", "weight": 0.05},
      {"code": "risk_response", "name": "应对措施", "weight": 0.05}
    ]},
    {"code": "standardization", "name": "规范性", "weight": 0.05, "description": "文档规范性", "subCriteria": [
      {"code": "format_standard", "name": "格式规范", "weight": 0.03},
      {"code": "expression_clear", "name": "表述清晰", "weight": 0.02}
    ]}
  ]',
  true,
  60.00
) ON CONFLICT (template_code) DO NOTHING;

-- 插入技术方案评审模板
INSERT INTO bus_review_template (template_code, template_name, template_type, sub_scheme_type, description, criteria_config, is_default, pass_score)
VALUES (
  'SUB_SCHEME_TECHNICAL',
  '技术方案评审模板',
  'sub_scheme',
  'technical',
  '用于评审技术子方案的模板',
  '[
    {"code": "tech_feasibility", "name": "技术可行性", "weight": 0.30, "description": "技术方案是否可实施"},
    {"code": "tech_advanced", "name": "技术先进性", "weight": 0.20, "description": "技术选型是否先进"},
    {"code": "security", "name": "安全可靠性", "weight": 0.20, "description": "安全措施是否完善"},
    {"code": "scalability", "name": "可扩展性", "weight": 0.15, "description": "是否具备扩展能力"},
    {"code": "documentation", "name": "技术文档", "weight": 0.15, "description": "技术文档是否完整"}
  ]',
  true,
  60.00
) ON CONFLICT (template_code) DO NOTHING;

-- 插入商务方案评审模板
INSERT INTO bus_review_template (template_code, template_name, template_type, sub_scheme_type, description, criteria_config, is_default, pass_score)
VALUES (
  'SUB_SCHEME_BUSINESS',
  '商务方案评审模板',
  'sub_scheme',
  'business',
  '用于评审商务子方案的模板',
  '[
    {"code": "price_reasonable", "name": "报价合理性", "weight": 0.30, "description": "价格是否合理有竞争力"},
    {"code": "terms", "name": "商务条款", "weight": 0.25, "description": "商务条款是否完善"},
    {"code": "payment", "name": "付款条件", "weight": 0.20, "description": "付款条件是否合理"},
    {"code": "risk_terms", "name": "风险条款", "weight": 0.15, "description": "风险条款是否完善"},
    {"code": "documentation", "name": "商务文档", "weight": 0.10, "description": "商务文档是否规范"}
  ]',
  true,
  60.00
) ON CONFLICT (template_code) DO NOTHING;

-- 插入实施方案评审模板
INSERT INTO bus_review_template (template_code, template_name, template_type, sub_scheme_type, description, criteria_config, is_default, pass_score)
VALUES (
  'SUB_SCHEME_IMPLEMENTATION',
  '实施方案评审模板',
  'sub_scheme',
  'implementation',
  '用于评审实施子方案的模板',
  '[
    {"code": "plan", "name": "实施计划", "weight": 0.25, "description": "实施计划是否合理"},
    {"code": "staffing", "name": "人员配置", "weight": 0.20, "description": "人员配置是否充足"},
    {"code": "schedule", "name": "进度安排", "weight": 0.20, "description": "进度安排是否合理"},
    {"code": "quality", "name": "质量保障", "weight": 0.20, "description": "质量保障措施是否完善"},
    {"code": "emergency", "name": "应急预案", "weight": 0.15, "description": "应急预案是否完备"}
  ]',
  true,
  60.00
) ON CONFLICT (template_code) DO NOTHING;
