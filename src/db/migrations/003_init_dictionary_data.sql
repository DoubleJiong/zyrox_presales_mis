-- 数据字典项完整初始化脚本
-- 使用原生 SQL 避免字段映射问题

-- 清空现有字典数据（保留系统配置）
DELETE FROM sys_attribute WHERE category IN (
  'customer_type', 'project_type', 'project_status', 'industry', 'region',
  'priority', 'demand_type', 'intent_level', 'opportunity_stage', 'solution_type',
  'service_type', 'arbitration_type', 'alert_severity', 'alert_category',
  'member_role', 'file_type'
);

-- 客户类型
INSERT INTO sys_attribute (attribute_key, attribute_value, attribute_type, category, description, is_system, sort_order, name, status) VALUES
  ('education', '教育', 'string', 'customer_type', '教育行业', true, 1, '教育', 'active'),
  ('government', '政府', 'string', 'customer_type', '政府机构', true, 2, '政府', 'active'),
  ('enterprise', '企业', 'string', 'customer_type', '企业客户', true, 3, '企业', 'active'),
  ('medical', '医疗', 'string', 'customer_type', '医疗机构', true, 4, '医疗', 'active'),
  ('other', '其他', 'string', 'customer_type', '其他类型', true, 5, '其他', 'active');

-- 项目类型
INSERT INTO sys_attribute (attribute_key, attribute_value, attribute_type, category, description, is_system, sort_order, name, status) VALUES
  ('software', '软件', 'string', 'project_type', '软件项目', true, 1, '软件', 'active'),
  ('integration', '集成', 'string', 'project_type', '集成项目', true, 2, '集成', 'active'),
  ('consulting', '咨询', 'string', 'project_type', '咨询项目', true, 3, '咨询', 'active'),
  ('maintenance', '维护', 'string', 'project_type', '维护项目', true, 4, '维护', 'active'),
  ('other', '其他', 'string', 'project_type', '其他项目', true, 5, '其他', 'active');

-- 项目状态
INSERT INTO sys_attribute (attribute_key, attribute_value, attribute_type, category, description, is_system, sort_order, name, status) VALUES
  ('draft', '草稿', 'string', 'project_status', '草稿阶段', true, 1, '草稿', 'active'),
  ('opportunity', '商机', 'string', 'project_status', '商机阶段', true, 2, '商机', 'active'),
  ('proposal', '方案', 'string', 'project_status', '方案阶段', true, 3, '方案', 'active'),
  ('negotiation', '洽谈', 'string', 'project_status', '商务洽谈', true, 4, '洽谈', 'active'),
  ('contract', '合同', 'string', 'project_status', '合同签订', true, 5, '合同', 'active'),
  ('implementation', '实施', 'string', 'project_status', '实施阶段', true, 6, '实施', 'active'),
  ('completed', '完成', 'string', 'project_status', '项目完成', true, 7, '完成', 'active'),
  ('lost', '失败', 'string', 'project_status', '项目失败', true, 8, '失败', 'active');

-- 行业类型
INSERT INTO sys_attribute (attribute_key, attribute_value, attribute_type, category, description, is_system, sort_order, name, status) VALUES
  ('education', '教育', 'string', 'industry', '教育行业', true, 1, '教育', 'active'),
  ('government', '政府', 'string', 'industry', '政府机构', true, 2, '政府', 'active'),
  ('enterprise', '企业', 'string', 'industry', '企业客户', true, 3, '企业', 'active'),
  ('medical', '医疗', 'string', 'industry', '医疗行业', true, 4, '医疗', 'active'),
  ('finance', '金融', 'string', 'industry', '金融行业', true, 5, '金融', 'active'),
  ('traffic', '交通', 'string', 'industry', '交通行业', true, 6, '交通', 'active'),
  ('energy', '能源', 'string', 'industry', '能源行业', true, 7, '能源', 'active'),
  ('other', '其他', 'string', 'industry', '其他行业', true, 8, '其他', 'active');

-- 区域
INSERT INTO sys_attribute (attribute_key, attribute_value, attribute_type, category, description, is_system, sort_order, name, status) VALUES
  ('north_china', '华北', 'string', 'region', '华北地区', true, 1, '华北', 'active'),
  ('east_china', '华东', 'string', 'region', '华东地区', true, 2, '华东', 'active'),
  ('south_china', '华南', 'string', 'region', '华南地区', true, 3, '华南', 'active'),
  ('central_china', '华中', 'string', 'region', '华中地区', true, 4, '华中', 'active'),
  ('northwest', '西北', 'string', 'region', '西北地区', true, 5, '西北', 'active'),
  ('southwest', '西南', 'string', 'region', '西南地区', true, 6, '西南', 'active'),
  ('northeast', '东北', 'string', 'region', '东北地区', true, 7, '东北', 'active'),
  ('hmt', '港澳台', 'string', 'region', '港澳台地区', true, 8, '港澳台', 'active'),
  ('overseas', '海外', 'string', 'region', '海外地区', true, 9, '海外', 'active');

-- 优先级
INSERT INTO sys_attribute (attribute_key, attribute_value, attribute_type, category, description, is_system, sort_order, name, status) VALUES
  ('high', '高', 'string', 'priority', '高优先级', true, 1, '高', 'active'),
  ('medium', '中', 'string', 'priority', '中优先级', true, 2, '中', 'active'),
  ('low', '低', 'string', 'priority', '低优先级', true, 3, '低', 'active');

-- 需求类型
INSERT INTO sys_attribute (attribute_key, attribute_value, attribute_type, category, description, is_system, sort_order, name, status) VALUES
  ('software', '软件系统', 'string', 'demand_type', '软件系统需求', true, 1, '软件系统', 'active'),
  ('hardware', '硬件设备', 'string', 'demand_type', '硬件设备需求', true, 2, '硬件设备', 'active'),
  ('consulting', '咨询服务', 'string', 'demand_type', '咨询服务需求', true, 3, '咨询服务', 'active'),
  ('integration', '集成项目', 'string', 'demand_type', '集成项目需求', true, 4, '集成项目', 'active'),
  ('other', '其他', 'string', 'demand_type', '其他需求', true, 5, '其他', 'active');

-- 意向等级
INSERT INTO sys_attribute (attribute_key, attribute_value, attribute_type, category, description, is_system, sort_order, name, status) VALUES
  ('high', '高意向', 'string', 'intent_level', '高意向客户', true, 1, '高意向', 'active'),
  ('medium', '中意向', 'string', 'intent_level', '中意向客户', true, 2, '中意向', 'active'),
  ('low', '低意向', 'string', 'intent_level', '低意向客户', true, 3, '低意向', 'active');

-- 商机阶段
INSERT INTO sys_attribute (attribute_key, attribute_value, attribute_type, category, description, is_system, sort_order, name, status) VALUES
  ('lead', '线索', 'string', 'opportunity_stage', '线索阶段', true, 1, '线索', 'active'),
  ('qualified', '合格线索', 'string', 'opportunity_stage', '合格线索阶段', true, 2, '合格线索', 'active'),
  ('proposal', '方案报价', 'string', 'opportunity_stage', '方案报价阶段', true, 3, '方案报价', 'active'),
  ('negotiation', '商务谈判', 'string', 'opportunity_stage', '商务谈判阶段', true, 4, '商务谈判', 'active'),
  ('closed_won', '赢单', 'string', 'opportunity_stage', '赢单', true, 5, '赢单', 'active'),
  ('closed_lost', '输单', 'string', 'opportunity_stage', '输单', true, 6, '输单', 'active');

-- 解决方案类型
INSERT INTO sys_attribute (attribute_key, attribute_value, attribute_type, category, description, is_system, sort_order, name, status) VALUES
  ('technical', '技术方案', 'string', 'solution_type', '技术方案', true, 1, '技术方案', 'active'),
  ('commercial', '商务方案', 'string', 'solution_type', '商务方案', true, 2, '商务方案', 'active'),
  ('integrated', '综合方案', 'string', 'solution_type', '综合方案', true, 3, '综合方案', 'active'),
  ('product', '产品方案', 'string', 'solution_type', '产品方案', true, 4, '产品方案', 'active'),
  ('implementation', '实施方案', 'string', 'solution_type', '实施方案', true, 5, '实施方案', 'active'),
  ('maintenance', '运维方案', 'string', 'solution_type', '运维方案', true, 6, '运维方案', 'active');

-- 服务类型
INSERT INTO sys_attribute (attribute_key, attribute_value, attribute_type, category, description, is_system, sort_order, name, status) VALUES
  ('analysis', '分析类', 'string', 'service_type', '分析类服务', true, 1, '分析类', 'active'),
  ('design', '设计类', 'string', 'service_type', '设计类服务', true, 2, '设计类', 'active'),
  ('presentation', '演示类', 'string', 'service_type', '演示类服务', true, 3, '演示类', 'active'),
  ('negotiation', '谈判类', 'string', 'service_type', '谈判类服务', true, 4, '谈判类', 'active'),
  ('site_visit', '现场拜访', 'string', 'service_type', '现场拜访', true, 5, '现场拜访', 'active'),
  ('phone', '电话沟通', 'string', 'service_type', '电话沟通', true, 6, '电话沟通', 'active'),
  ('wechat', '微信沟通', 'string', 'service_type', '微信沟通', true, 7, '微信沟通', 'active'),
  ('email', '邮件沟通', 'string', 'service_type', '邮件沟通', true, 8, '邮件沟通', 'active'),
  ('video_meeting', '视频会议', 'string', 'service_type', '视频会议', true, 9, '视频会议', 'active');

-- 仲裁类型
INSERT INTO sys_attribute (attribute_key, attribute_value, attribute_type, category, description, is_system, sort_order, name, status) VALUES
  ('cost', '成本仲裁', 'string', 'arbitration_type', '成本仲裁', true, 1, '成本仲裁', 'active'),
  ('workload', '工作量仲裁', 'string', 'arbitration_type', '工作量仲裁', true, 2, '工作量仲裁', 'active'),
  ('dispute', '争议仲裁', 'string', 'arbitration_type', '争议仲裁', true, 3, '争议仲裁', 'active');

-- 预警严重程度
INSERT INTO sys_attribute (attribute_key, attribute_value, attribute_type, category, description, is_system, sort_order, name, status) VALUES
  ('low', '低', 'string', 'alert_severity', '低严重程度', true, 1, '低', 'active'),
  ('medium', '中', 'string', 'alert_severity', '中严重程度', true, 2, '中', 'active'),
  ('high', '高', 'string', 'alert_severity', '高严重程度', true, 3, '高', 'active'),
  ('critical', '严重', 'string', 'alert_severity', '严重程度', true, 4, '严重', 'active');

-- 预警分类
INSERT INTO sys_attribute (attribute_key, attribute_value, attribute_type, category, description, is_system, sort_order, name, status) VALUES
  ('not_updated', '未更新', 'string', 'alert_category', '未更新预警', true, 1, '未更新', 'active'),
  ('inactive', '不活跃', 'string', 'alert_category', '不活跃预警', true, 2, '不活跃', 'active'),
  ('overdue', '超期', 'string', 'alert_category', '超期预警', true, 3, '超期', 'active'),
  ('not_used', '未使用', 'string', 'alert_category', '未使用预警', true, 4, '未使用', 'active'),
  ('not_referenced', '未引用', 'string', 'alert_category', '未引用预警', true, 5, '未引用', 'active');

-- 成员角色
INSERT INTO sys_attribute (attribute_key, attribute_value, attribute_type, category, description, is_system, sort_order, name, status) VALUES
  ('project_manager', '项目经理', 'string', 'member_role', '项目经理', true, 1, '项目经理', 'active'),
  ('tech_lead', '技术负责人', 'string', 'member_role', '技术负责人', true, 2, '技术负责人', 'active'),
  ('presale_engineer', '售前工程师', 'string', 'member_role', '售前工程师', true, 3, '售前工程师', 'active'),
  ('dev_engineer', '开发工程师', 'string', 'member_role', '开发工程师', true, 4, '开发工程师', 'active'),
  ('test_engineer', '测试工程师', 'string', 'member_role', '测试工程师', true, 5, '测试工程师', 'active'),
  ('product_manager', '产品经理', 'string', 'member_role', '产品经理', true, 6, '产品经理', 'active'),
  ('ui_designer', 'UI设计师', 'string', 'member_role', 'UI设计师', true, 7, 'UI设计师', 'active'),
  ('consultant', '顾问', 'string', 'member_role', '顾问', true, 8, '顾问', 'active');

-- 文件类型
INSERT INTO sys_attribute (attribute_key, attribute_value, attribute_type, category, description, is_system, sort_order, name, status) VALUES
  ('ppt', 'PowerPoint (PPT)', 'string', 'file_type', 'PowerPoint文件', true, 1, 'PowerPoint (PPT)', 'active'),
  ('word', 'Word文档', 'string', 'file_type', 'Word文档', true, 2, 'Word文档', 'active'),
  ('excel', 'Excel表格', 'string', 'file_type', 'Excel表格', true, 3, 'Excel表格', 'active'),
  ('pdf', 'PDF文档', 'string', 'file_type', 'PDF文档', true, 4, 'PDF文档', 'active'),
  ('video', '视频文件', 'string', 'file_type', '视频文件', true, 5, '视频文件', 'active');

-- 输出结果
SELECT category, COUNT(*) as item_count 
FROM sys_attribute 
WHERE category IN (
  'customer_type', 'project_type', 'project_status', 'industry', 'region',
  'priority', 'demand_type', 'intent_level', 'opportunity_stage', 'solution_type',
  'service_type', 'arbitration_type', 'alert_severity', 'alert_category',
  'member_role', 'file_type'
)
GROUP BY category
ORDER BY category;
