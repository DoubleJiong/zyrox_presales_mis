-- ============================================
-- 数据字典管理模块升级迁移脚本
-- 版本: 1.0.0
-- 日期: 2025-01-01
-- ============================================

-- 1. 创建字典分类表
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
);

-- 创建分类表索引
CREATE INDEX IF NOT EXISTS idx_attr_cat_code ON sys_attribute_category(category_code);
CREATE INDEX IF NOT EXISTS idx_attr_cat_status ON sys_attribute_category(status);

-- 2. 扩展属性表字段
-- 添加 parent_id 字段（支持层级结构）
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sys_attribute' AND column_name = 'parent_id') THEN
    ALTER TABLE sys_attribute ADD COLUMN parent_id INTEGER REFERENCES sys_attribute(id);
  END IF;
END $$;

-- 添加 sort_order 字段
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sys_attribute' AND column_name = 'sort_order') THEN
    ALTER TABLE sys_attribute ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

-- 添加 is_system 字段
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sys_attribute' AND column_name = 'is_system') THEN
    ALTER TABLE sys_attribute ADD COLUMN is_system BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;
END $$;

-- 添加 extra_data 字段
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sys_attribute' AND column_name = 'extra_data') THEN
    ALTER TABLE sys_attribute ADD COLUMN extra_data JSONB;
  END IF;
END $$;

-- 3. 创建/更新索引
CREATE INDEX IF NOT EXISTS idx_attribute_parent ON sys_attribute(parent_id);
CREATE INDEX IF NOT EXISTS idx_attribute_code ON sys_attribute(code);

-- 4. 创建分类+编码唯一索引（先删除可能存在的旧唯一约束）
DO $$
BEGIN
  -- 删除旧的 code 唯一约束（如果存在）
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sys_attribute_code_unique') THEN
    ALTER TABLE sys_attribute DROP CONSTRAINT sys_attribute_code_unique;
  END IF;
  
  -- 创建新的组合唯一索引
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'unq_attribute_category_code') THEN
    CREATE UNIQUE INDEX unq_attribute_category_code ON sys_attribute(category, code) WHERE deleted_at IS NULL;
  END IF;
END $$;

-- 5. 初始化字典分类数据
INSERT INTO sys_attribute_category (category_code, category_name, description, icon, is_system, sort_order, status) VALUES
('customer_type', '客户类型', '客户分类：教育、政府、企业、医疗等', 'Building2', true, 1, 'active'),
('project_type', '项目类型', '项目分类：软件、集成、咨询、维护等', 'FolderKanban', true, 2, 'active'),
('project_status', '项目状态', '项目生命周期状态', 'CircleDot', true, 3, 'active'),
('industry', '行业类型', '行业分类', 'Building', true, 4, 'active'),
('region', '区域', '地理区域划分', 'MapPin', true, 5, 'active'),
('priority', '优先级', '优先级等级', 'AlertCircle', true, 6, 'active'),
('demand_type', '需求类型', '客户需求分类', 'FileText', true, 7, 'active'),
('intent_level', '意向等级', '客户意向程度', 'TrendingUp', true, 8, 'active'),
('opportunity_stage', '商机阶段', '商机流程阶段', 'Target', true, 9, 'active'),
('solution_type', '解决方案类型', '解决方案分类', 'FileSpreadsheet', true, 10, 'active'),
('service_type', '服务类型', '售前服务类型', 'Settings', true, 11, 'active'),
('arbitration_type', '仲裁类型', '仲裁申请类型', 'Gavel', true, 12, 'active'),
('alert_severity', '预警严重程度', '预警严重级别', 'AlertTriangle', true, 13, 'active'),
('alert_category', '预警分类', '预警规则分类', 'Bell', true, 14, 'active'),
('member_role', '成员角色', '项目团队成员角色', 'Users', true, 15, 'active'),
('file_type', '文件类型', '文档文件类型', 'FileIcon', true, 16, 'active')
ON CONFLICT (category_code) DO NOTHING;

-- 6. 初始化字典项数据

-- 6.1 客户类型
INSERT INTO sys_attribute (category, code, name, value, sort_order, is_system, status) VALUES
('customer_type', 'education', '教育', 'education', 1, true, 'active'),
('customer_type', 'government', '政府', 'government', 2, true, 'active'),
('customer_type', 'enterprise', '企业', 'enterprise', 3, true, 'active'),
('customer_type', 'medical', '医疗', 'medical', 4, true, 'active'),
('customer_type', 'other', '其他', 'other', 5, true, 'active')
ON CONFLICT (category, code) WHERE deleted_at IS NULL DO NOTHING;

-- 6.2 项目类型
INSERT INTO sys_attribute (category, code, name, value, sort_order, is_system, status) VALUES
('project_type', 'software', '软件', 'software', 1, true, 'active'),
('project_type', 'integration', '集成', 'integration', 2, true, 'active'),
('project_type', 'consulting', '咨询', 'consulting', 3, true, 'active'),
('project_type', 'maintenance', '维护', 'maintenance', 4, true, 'active'),
('project_type', 'other', '其他', 'other', 5, true, 'active')
ON CONFLICT (category, code) WHERE deleted_at IS NULL DO NOTHING;

-- 6.3 项目状态
INSERT INTO sys_attribute (category, code, name, value, sort_order, is_system, status) VALUES
('project_status', 'draft', '草稿', 'draft', 1, true, 'active'),
('project_status', 'opportunity', '商机', 'opportunity', 2, true, 'active'),
('project_status', 'proposal', '方案', 'proposal', 3, true, 'active'),
('project_status', 'negotiation', '洽谈', 'negotiation', 4, true, 'active'),
('project_status', 'contract', '合同', 'contract', 5, true, 'active'),
('project_status', 'implementation', '实施', 'implementation', 6, true, 'active'),
('project_status', 'completed', '完成', 'completed', 7, true, 'active'),
('project_status', 'lost', '失败', 'lost', 8, true, 'active')
ON CONFLICT (category, code) WHERE deleted_at IS NULL DO NOTHING;

-- 6.4 行业类型
INSERT INTO sys_attribute (category, code, name, value, sort_order, is_system, status) VALUES
('industry', 'education', '教育', 'education', 1, true, 'active'),
('industry', 'government', '政府', 'government', 2, true, 'active'),
('industry', 'enterprise', '企业', 'enterprise', 3, true, 'active'),
('industry', 'medical', '医疗', 'medical', 4, true, 'active'),
('industry', 'finance', '金融', 'finance', 5, true, 'active'),
('industry', 'traffic', '交通', 'traffic', 6, true, 'active'),
('industry', 'energy', '能源', 'energy', 7, true, 'active'),
('industry', 'other', '其他', 'other', 8, true, 'active')
ON CONFLICT (category, code) WHERE deleted_at IS NULL DO NOTHING;

-- 6.5 区域
INSERT INTO sys_attribute (category, code, name, value, sort_order, is_system, status) VALUES
('region', 'north_china', '华北', '华北', 1, true, 'active'),
('region', 'east_china', '华东', '华东', 2, true, 'active'),
('region', 'south_china', '华南', '华南', 3, true, 'active'),
('region', 'central_china', '华中', '华中', 4, true, 'active'),
('region', 'northwest', '西北', '西北', 5, true, 'active'),
('region', 'southwest', '西南', '西南', 6, true, 'active'),
('region', 'northeast', '东北', '东北', 7, true, 'active'),
('region', 'hmt', '港澳台', '港澳台', 8, true, 'active'),
('region', 'overseas', '海外', '海外', 9, true, 'active')
ON CONFLICT (category, code) WHERE deleted_at IS NULL DO NOTHING;

-- 6.6 优先级
INSERT INTO sys_attribute (category, code, name, value, sort_order, is_system, status) VALUES
('priority', 'high', '高', 'high', 1, true, 'active'),
('priority', 'medium', '中', 'medium', 2, true, 'active'),
('priority', 'low', '低', 'low', 3, true, 'active')
ON CONFLICT (category, code) WHERE deleted_at IS NULL DO NOTHING;

-- 6.7 需求类型
INSERT INTO sys_attribute (category, code, name, value, sort_order, is_system, status) VALUES
('demand_type', 'software', '软件系统', 'software', 1, true, 'active'),
('demand_type', 'hardware', '硬件设备', 'hardware', 2, true, 'active'),
('demand_type', 'consulting', '咨询服务', 'consulting', 3, true, 'active'),
('demand_type', 'integration', '集成项目', 'integration', 4, true, 'active'),
('demand_type', 'other', '其他', 'other', 5, true, 'active')
ON CONFLICT (category, code) WHERE deleted_at IS NULL DO NOTHING;

-- 6.8 意向等级
INSERT INTO sys_attribute (category, code, name, value, sort_order, is_system, status) VALUES
('intent_level', 'high', '高意向', 'high', 1, true, 'active'),
('intent_level', 'medium', '中意向', 'medium', 2, true, 'active'),
('intent_level', 'low', '低意向', 'low', 3, true, 'active')
ON CONFLICT (category, code) WHERE deleted_at IS NULL DO NOTHING;

-- 6.9 商机阶段
INSERT INTO sys_attribute (category, code, name, value, sort_order, is_system, status) VALUES
('opportunity_stage', 'lead', '线索', 'lead', 1, true, 'active'),
('opportunity_stage', 'qualified', '合格线索', 'qualified', 2, true, 'active'),
('opportunity_stage', 'proposal', '方案报价', 'proposal', 3, true, 'active'),
('opportunity_stage', 'negotiation', '商务谈判', 'negotiation', 4, true, 'active'),
('opportunity_stage', 'closed_won', '赢单', 'closed_won', 5, true, 'active'),
('opportunity_stage', 'closed_lost', '输单', 'closed_lost', 6, true, 'active')
ON CONFLICT (category, code) WHERE deleted_at IS NULL DO NOTHING;

-- 6.10 解决方案类型
INSERT INTO sys_attribute (category, code, name, value, sort_order, is_system, status) VALUES
('solution_type', 'technical', '技术方案', 'technical', 1, true, 'active'),
('solution_type', 'commercial', '商务方案', 'commercial', 2, true, 'active'),
('solution_type', 'integrated', '综合方案', 'integrated', 3, true, 'active'),
('solution_type', 'product', '产品方案', 'product', 4, true, 'active'),
('solution_type', 'implementation', '实施方案', 'implementation', 5, true, 'active'),
('solution_type', 'maintenance', '运维方案', 'maintenance', 6, true, 'active')
ON CONFLICT (category, code) WHERE deleted_at IS NULL DO NOTHING;

-- 6.11 服务类型（售前服务）
INSERT INTO sys_attribute (category, code, name, value, sort_order, is_system, status) VALUES
('service_type', 'analysis', '分析类', 'analysis', 1, true, 'active'),
('service_type', 'design', '设计类', 'design', 2, true, 'active'),
('service_type', 'presentation', '演示类', 'presentation', 3, true, 'active'),
('service_type', 'negotiation', '谈判类', 'negotiation', 4, true, 'active'),
('service_type', 'site_visit', '现场拜访', 'site_visit', 5, true, 'active'),
('service_type', 'phone', '电话沟通', 'phone', 6, true, 'active'),
('service_type', 'wechat', '微信沟通', 'wechat', 7, true, 'active'),
('service_type', 'email', '邮件沟通', 'email', 8, true, 'active'),
('service_type', 'video_meeting', '视频会议', 'video_meeting', 9, true, 'active')
ON CONFLICT (category, code) WHERE deleted_at IS NULL DO NOTHING;

-- 6.12 仲裁类型
INSERT INTO sys_attribute (category, code, name, value, sort_order, is_system, status) VALUES
('arbitration_type', 'cost', '成本仲裁', 'cost', 1, true, 'active'),
('arbitration_type', 'workload', '工作量仲裁', 'workload', 2, true, 'active'),
('arbitration_type', 'dispute', '争议仲裁', 'dispute', 3, true, 'active')
ON CONFLICT (category, code) WHERE deleted_at IS NULL DO NOTHING;

-- 6.13 预警严重程度
INSERT INTO sys_attribute (category, code, name, value, sort_order, is_system, status) VALUES
('alert_severity', 'low', '低', 'low', 1, true, 'active'),
('alert_severity', 'medium', '中', 'medium', 2, true, 'active'),
('alert_severity', 'high', '高', 'high', 3, true, 'active'),
('alert_severity', 'critical', '严重', 'critical', 4, true, 'active')
ON CONFLICT (category, code) WHERE deleted_at IS NULL DO NOTHING;

-- 6.14 预警分类
INSERT INTO sys_attribute (category, code, name, value, sort_order, is_system, status) VALUES
('alert_category', 'not_updated', '未更新', 'not_updated', 1, true, 'active'),
('alert_category', 'inactive', '不活跃', 'inactive', 2, true, 'active'),
('alert_category', 'overdue', '超期', 'overdue', 3, true, 'active'),
('alert_category', 'not_used', '未使用', 'not_used', 4, true, 'active'),
('alert_category', 'not_referenced', '未引用', 'not_referenced', 5, true, 'active')
ON CONFLICT (category, code) WHERE deleted_at IS NULL DO NOTHING;

-- 6.15 成员角色
INSERT INTO sys_attribute (category, code, name, value, sort_order, is_system, status) VALUES
('member_role', 'project_manager', '项目经理', '项目经理', 1, true, 'active'),
('member_role', 'tech_lead', '技术负责人', '技术负责人', 2, true, 'active'),
('member_role', 'presale_engineer', '售前工程师', '售前工程师', 3, true, 'active'),
('member_role', 'dev_engineer', '开发工程师', '开发工程师', 4, true, 'active'),
('member_role', 'test_engineer', '测试工程师', '测试工程师', 5, true, 'active'),
('member_role', 'product_manager', '产品经理', '产品经理', 6, true, 'active'),
('member_role', 'ui_designer', 'UI设计师', 'UI设计师', 7, true, 'active'),
('member_role', 'consultant', '顾问', '顾问', 8, true, 'active')
ON CONFLICT (category, code) WHERE deleted_at IS NULL DO NOTHING;

-- 6.16 文件类型
INSERT INTO sys_attribute (category, code, name, value, sort_order, is_system, status) VALUES
('file_type', 'ppt', 'PowerPoint (PPT)', 'ppt', 1, true, 'active'),
('file_type', 'word', 'Word文档', 'word', 2, true, 'active'),
('file_type', 'excel', 'Excel表格', 'excel', 3, true, 'active'),
('file_type', 'pdf', 'PDF文档', 'pdf', 4, true, 'active'),
('file_type', 'video', '视频文件', 'video', 5, true, 'active')
ON CONFLICT (category, code) WHERE deleted_at IS NULL DO NOTHING;

-- 7. 更新已存在数据的 sort_order（如果字段之前不存在）
UPDATE sys_attribute SET sort_order = id WHERE sort_order = 0 AND deleted_at IS NULL;

-- 迁移完成
SELECT 'Dictionary migration completed successfully!' as status;
