-- ============================================================
-- 009_dictionary_unification.sql
-- 统一字典改造 — 新增/更新分类、枚举项；收归 project_type
-- ============================================================

BEGIN;

-- ── 新增分类 ────────────────────────────────────────────────

INSERT INTO sys_attribute_category (category_code, category_name, description, icon, is_system, sort_order, status)
VALUES
  ('task_status',               '任务状态',       '任务的执行状态',           'CircleDot',      true, 150, 'active'),
  ('contract_status',           '合同状态',       '合同的生命周期状态',       'FileCheck',      true, 260, 'active'),
  ('contract_process_status',   '合同流程状态',   '合同审批流程状态',         'CircleDot',      true, 261, 'active'),
  ('contract_sign_mode',        '合同签署方式',   '合同的签署方式',           'FileText',       true, 262, 'active'),
  ('contract_user_type',        '合同甲方类型',   '合同甲方的机构类型',       'Building',       true, 263, 'active'),
  ('contract_project_category', '合同项目分类',   '合同关联项目的分类',       'FolderKanban',   true, 264, 'active'),
  ('alert_rule_type',           '预警规则类型',   '预警规则的触发类型',       'Bell',           true, 200, 'active'),
  ('alert_rule_status',         '预警规则状态',   '预警规则的启用状态',       'CircleDot',      true, 201, 'active'),
  ('alert_history_status',      '预警历史状态',   '预警历史记录状态',         'CircleDot',      true, 202, 'active'),
  ('alert_channel',             '预警通道',       '预警通知的渠道类型',       'Bell',           true, 203, 'active'),
  ('risk_level',                '风险等级',       '项目/客户风险等级',        'AlertTriangle',  true, 204, 'active'),
  ('arbitration_status',        '仲裁状态',       '仲裁的处理状态',           'Scale',          true, 300, 'active'),
  ('arbitration_type',          '仲裁类型',       '仲裁的类型分类',           'Scale',          true, 301, 'active'),
  ('performance_status',        '绩效状态',       '绩效评估的状态',           'BarChart',       true, 310, 'active'),
  ('schedule_status',           '日程状态',       '日程的完成状态',           'CircleDot',      true, 140, 'active')
ON CONFLICT (category_code) WHERE deleted_at IS NULL DO UPDATE SET
  category_name = EXCLUDED.category_name,
  description   = EXCLUDED.description,
  icon          = EXCLUDED.icon,
  is_system     = EXCLUDED.is_system,
  sort_order    = EXCLUDED.sort_order,
  status        = EXCLUDED.status;

-- ── 更新现有分类描述 ─────────────────────────────────────────

UPDATE sys_attribute_category SET
  description = '项目的业务类型分类（14类，多选）'
WHERE category_code = 'project_type' AND deleted_at IS NULL;

UPDATE sys_attribute_category SET
  description = '项目的业务阶段（11阶段状态机，含暂停）'
WHERE category_code = 'project_stage' AND deleted_at IS NULL;

UPDATE sys_attribute_category SET
  description = '省级行政区 + 浙江地市（42项）'
WHERE category_code = 'region' AND deleted_at IS NULL;

UPDATE sys_attribute_category SET
  description = '项目资金来源类型（6项）'
WHERE category_code = 'fund_source' AND deleted_at IS NULL;

-- ── project_type 新枚举项（14 类） ───────────────────────────
-- 先软删除旧 project_type 枚举项
UPDATE sys_attribute SET deleted_at = NOW()
WHERE category = 'project_type' AND deleted_at IS NULL;

INSERT INTO sys_attribute (category, attribute_key, attribute_value, name, sort_order, status)
VALUES
  ('project_type', 'project_type_one_card',             'one_card',             '一卡通',     1,  'active'),
  ('project_type', 'project_type_big_data',             'big_data',             '大数据',     2,  'active'),
  ('project_type', 'project_type_iot',                  'iot',                  '物联网',     3,  'active'),
  ('project_type', 'project_type_smart_restaurant',     'smart_restaurant',     '智慧餐厅',   4,  'active'),
  ('project_type', 'project_type_food_safety',          'food_safety',          '食安',       5,  'active'),
  ('project_type', 'project_type_smart_campus',         'smart_campus',         '智慧校园',   6,  'active'),
  ('project_type', 'project_type_digital_twin',         'digital_twin',         '数字孪生',   7,  'active'),
  ('project_type', 'project_type_system_integration',   'system_integration',   '系统集成',   8,  'active'),
  ('project_type', 'project_type_security',             'security',             '安防项目',   9,  'active'),
  ('project_type', 'project_type_k12_project',          'k12_project',          'K12项目',    10, 'active'),
  ('project_type', 'project_type_smart_logistics',      'smart_logistics',      '数智后勤',   11, 'active'),
  ('project_type', 'project_type_operation_logistics',  'operation_logistics',  '运营后勤',   12, 'active'),
  ('project_type', 'project_type_innovation',           'innovation',           '创新项目',   13, 'active'),
  ('project_type', 'project_type_other',                'other',                '其他类型',   99, 'active')
ON CONFLICT DO NOTHING;

-- ── project_stage — 添加缺失的阶段 ──────────────────────────
-- 先软删除旧阶段
UPDATE sys_attribute SET deleted_at = NOW()
WHERE category = 'project_stage' AND deleted_at IS NULL;

INSERT INTO sys_attribute (category, attribute_key, attribute_value, name, sort_order, status)
VALUES
  ('project_stage', 'project_stage_opportunity',        'opportunity',        '商机阶段',          1,  'active'),
  ('project_stage', 'project_stage_bidding_pending',    'bidding_pending',    '投标立项待审批',     2,  'active'),
  ('project_stage', 'project_stage_bidding',            'bidding',            '招标投标',          3,  'active'),
  ('project_stage', 'project_stage_solution_review',    'solution_review',    '投标评标',          4,  'active'),
  ('project_stage', 'project_stage_contract_pending',   'contract_pending',   '合同/商务确认中',   5,  'active'),
  ('project_stage', 'project_stage_delivery_preparing', 'delivery_preparing', '执行准备中',        6,  'active'),
  ('project_stage', 'project_stage_delivering',         'delivering',         '执行中',            7,  'active'),
  ('project_stage', 'project_stage_settlement',         'settlement',         '结算中',            8,  'active'),
  ('project_stage', 'project_stage_archived',           'archived',           '已归档',            9,  'active'),
  ('project_stage', 'project_stage_cancelled',          'cancelled',          '已取消',            10, 'active'),
  ('project_stage', 'project_stage_suspended',          'suspended',          '已暂停',            11, 'active')
ON CONFLICT DO NOTHING;

-- ── fund_source 新值集（6 项） ───────────────────────────────
UPDATE sys_attribute SET deleted_at = NOW()
WHERE category = 'fund_source' AND deleted_at IS NULL;

INSERT INTO sys_attribute (category, attribute_key, attribute_value, name, sort_order, status)
VALUES
  ('fund_source', 'fund_source_bank_investment',     'bank_investment',     '银行投资',    1, 'active'),
  ('fund_source', 'fund_source_operator_investment',  'operator_investment', '运营商投资',  2, 'active'),
  ('fund_source', 'fund_source_fiscal',               'fiscal',             '财政拨款',    3, 'active'),
  ('fund_source', 'fund_source_fire_self_funded',     'fire_self_funded',   '消防自筹',    4, 'active'),
  ('fund_source', 'fund_source_loan',                 'loan',               '贷款',        5, 'active'),
  ('fund_source', 'fund_source_mixed',                'mixed',              '混合资金',    6, 'active')
ON CONFLICT DO NOTHING;

-- ── region 新值集（42 项） ───────────────────────────────────
UPDATE sys_attribute SET deleted_at = NOW()
WHERE category = 'region' AND deleted_at IS NULL;

INSERT INTO sys_attribute (category, attribute_key, attribute_value, name, sort_order, status)
VALUES
  ('region', 'region_beijing',      'beijing',      '北京市',              1,  'active'),
  ('region', 'region_tianjin',      'tianjin',      '天津市',              2,  'active'),
  ('region', 'region_shanghai',     'shanghai',     '上海市',              3,  'active'),
  ('region', 'region_chongqing',    'chongqing',    '重庆市',              4,  'active'),
  ('region', 'region_anhui',        'anhui',        '安徽省',              5,  'active'),
  ('region', 'region_fujian',       'fujian',       '福建省',              6,  'active'),
  ('region', 'region_gansu',        'gansu',        '甘肃省',              7,  'active'),
  ('region', 'region_guangdong',    'guangdong',    '广东省',              8,  'active'),
  ('region', 'region_guizhou',      'guizhou',      '贵州省',              9,  'active'),
  ('region', 'region_hainan',       'hainan',       '海南省',              10, 'active'),
  ('region', 'region_hebei',        'hebei',        '河北省',              11, 'active'),
  ('region', 'region_heilongjiang', 'heilongjiang', '黑龙江省',            12, 'active'),
  ('region', 'region_henan',        'henan',        '河南省',              13, 'active'),
  ('region', 'region_hubei',        'hubei',        '湖北省',              14, 'active'),
  ('region', 'region_hunan',        'hunan',        '湖南省',              15, 'active'),
  ('region', 'region_jiangsu',      'jiangsu',      '江苏省',              16, 'active'),
  ('region', 'region_jiangxi',      'jiangxi',      '江西省',              17, 'active'),
  ('region', 'region_jilin',        'jilin',        '吉林省',              18, 'active'),
  ('region', 'region_liaoning',     'liaoning',     '辽宁省',              19, 'active'),
  ('region', 'region_qinghai',      'qinghai',      '青海省',              20, 'active'),
  ('region', 'region_shandong',     'shandong',     '山东省',              21, 'active'),
  ('region', 'region_shanxi',       'shanxi',       '山西省',              22, 'active'),
  ('region', 'region_shaanxi',      'shaanxi',      '陕西省',              23, 'active'),
  ('region', 'region_sichuan',      'sichuan',      '四川省',              24, 'active'),
  ('region', 'region_yunnan',       'yunnan',       '云南省',              25, 'active'),
  ('region', 'region_guangxi',      'guangxi',      '广西壮族自治区',      26, 'active'),
  ('region', 'region_neimenggu',    'neimenggu',    '内蒙古自治区',        27, 'active'),
  ('region', 'region_ningxia',      'ningxia',      '宁夏回族自治区',      28, 'active'),
  ('region', 'region_xinjiang',     'xinjiang',     '新疆维吾尔自治区',    29, 'active'),
  ('region', 'region_xizang',       'xizang',       '西藏自治区',          30, 'active'),
  ('region', 'region_zj_hangzhou',  'zj_hangzhou',  '杭州市(浙江)',         31, 'active'),
  ('region', 'region_zj_ningbo',    'zj_ningbo',    '宁波市(浙江)',         32, 'active'),
  ('region', 'region_zj_wenzhou',   'zj_wenzhou',   '温州市(浙江)',         33, 'active'),
  ('region', 'region_zj_jiaxing',   'zj_jiaxing',   '嘉兴市(浙江)',         34, 'active'),
  ('region', 'region_zj_huzhou',    'zj_huzhou',    '湖州市(浙江)',         35, 'active'),
  ('region', 'region_zj_shaoxing',  'zj_shaoxing',  '绍兴市(浙江)',         36, 'active'),
  ('region', 'region_zj_jinhua',    'zj_jinhua',    '金华市(浙江)',         37, 'active'),
  ('region', 'region_zj_quzhou',    'zj_quzhou',    '衢州市(浙江)',         38, 'active'),
  ('region', 'region_zj_zhoushan', 'zj_zhoushan',  '舟山市(浙江)',         39, 'active'),
  ('region', 'region_zj_taizhou',   'zj_taizhou',   '台州市(浙江)',         40, 'active'),
  ('region', 'region_zj_lishui',    'zj_lishui',    '丽水市(浙江)',         41, 'active'),
  ('region', 'region_hongkong',     'hongkong',     '香港特别行政区',       42, 'active')
ON CONFLICT DO NOTHING;

-- ── 新增分类的枚举项 ────────────────────────────────────────

-- task_status
INSERT INTO sys_attribute (category, attribute_key, attribute_value, name, sort_order, status)
VALUES
  ('task_status', 'task_status_pending', 'pending', '待处理', 1, 'active'),
  ('task_status', 'task_status_in_progress', 'in_progress', '进行中', 2, 'active'),
  ('task_status', 'task_status_completed', 'completed', '已完成', 3, 'active'),
  ('task_status', 'task_status_blocked', 'blocked', '受阻', 4, 'active'),
  ('task_status', 'task_status_cancelled', 'cancelled', '已取消', 5, 'active')
ON CONFLICT DO NOTHING;

-- schedule_status
INSERT INTO sys_attribute (category, attribute_key, attribute_value, name, sort_order, status)
VALUES
  ('schedule_status', 'schedule_status_pending', 'pending', '待开始', 1, 'active'),
  ('schedule_status', 'schedule_status_in_progress', 'in_progress', '进行中', 2, 'active'),
  ('schedule_status', 'schedule_status_completed', 'completed', '已完成', 3, 'active'),
  ('schedule_status', 'schedule_status_cancelled', 'cancelled', '已取消', 4, 'active')
ON CONFLICT DO NOTHING;

-- contract_status
INSERT INTO sys_attribute (category, attribute_key, attribute_value, name, sort_order, status)
VALUES
  ('contract_status', 'contract_status_drafting', 'drafting', '起草中', 1, 'active'),
  ('contract_status', 'contract_status_reviewing', 'reviewing', '审核中', 2, 'active'),
  ('contract_status', 'contract_status_signed', 'signed', '已签署', 3, 'active'),
  ('contract_status', 'contract_status_executing', 'executing', '执行中', 4, 'active'),
  ('contract_status', 'contract_status_completed', 'completed', '已完结', 5, 'active'),
  ('contract_status', 'contract_status_terminated', 'terminated', '已终止', 6, 'active')
ON CONFLICT DO NOTHING;

-- contract_process_status
INSERT INTO sys_attribute (category, attribute_key, attribute_value, name, sort_order, status)
VALUES
  ('contract_process_status', 'contract_process_status_pending', 'pending', '待提交', 1, 'active'),
  ('contract_process_status', 'contract_process_status_submitted', 'submitted', '已提交', 2, 'active'),
  ('contract_process_status', 'contract_process_status_approved', 'approved', '已通过', 3, 'active'),
  ('contract_process_status', 'contract_process_status_rejected', 'rejected', '已驳回', 4, 'active')
ON CONFLICT DO NOTHING;

-- contract_sign_mode
INSERT INTO sys_attribute (category, attribute_key, attribute_value, name, sort_order, status)
VALUES
  ('contract_sign_mode', 'contract_sign_mode_offline', 'offline', '线下签署', 1, 'active'),
  ('contract_sign_mode', 'contract_sign_mode_online', 'online', '线上签署', 2, 'active')
ON CONFLICT DO NOTHING;

-- contract_user_type
INSERT INTO sys_attribute (category, attribute_key, attribute_value, name, sort_order, status)
VALUES
  ('contract_user_type', 'contract_user_type_government', 'government', '政府机构', 1, 'active'),
  ('contract_user_type', 'contract_user_type_enterprise', 'enterprise', '企业单位', 2, 'active'),
  ('contract_user_type', 'contract_user_type_institution', 'institution', '事业单位', 3, 'active')
ON CONFLICT DO NOTHING;

-- contract_project_category
INSERT INTO sys_attribute (category, attribute_key, attribute_value, name, sort_order, status)
VALUES
  ('contract_project_category', 'contract_project_category_new_build', 'new_build', '新建项目', 1, 'active'),
  ('contract_project_category', 'contract_project_category_upgrade', 'upgrade', '升级改造', 2, 'active'),
  ('contract_project_category', 'contract_project_category_maintenance', 'maintenance', '运维服务', 3, 'active')
ON CONFLICT DO NOTHING;

-- alert_rule_type
INSERT INTO sys_attribute (category, attribute_key, attribute_value, name, sort_order, status)
VALUES
  ('alert_rule_type', 'alert_rule_type_threshold', 'threshold', '阈值告警', 1, 'active'),
  ('alert_rule_type', 'alert_rule_type_deadline', 'deadline', '截止时间', 2, 'active'),
  ('alert_rule_type', 'alert_rule_type_anomaly', 'anomaly', '异常检测', 3, 'active')
ON CONFLICT DO NOTHING;

-- alert_rule_status
INSERT INTO sys_attribute (category, attribute_key, attribute_value, name, sort_order, status)
VALUES
  ('alert_rule_status', 'alert_rule_status_active', 'active', '启用', 1, 'active'),
  ('alert_rule_status', 'alert_rule_status_inactive', 'inactive', '停用', 2, 'active')
ON CONFLICT DO NOTHING;

-- alert_history_status
INSERT INTO sys_attribute (category, attribute_key, attribute_value, name, sort_order, status)
VALUES
  ('alert_history_status', 'alert_history_status_triggered', 'triggered', '已触发', 1, 'active'),
  ('alert_history_status', 'alert_history_status_acknowledged', 'acknowledged', '已确认', 2, 'active'),
  ('alert_history_status', 'alert_history_status_resolved', 'resolved', '已解决', 3, 'active'),
  ('alert_history_status', 'alert_history_status_expired', 'expired', '已过期', 4, 'active')
ON CONFLICT DO NOTHING;

-- alert_channel
INSERT INTO sys_attribute (category, attribute_key, attribute_value, name, sort_order, status)
VALUES
  ('alert_channel', 'alert_channel_in_app', 'in_app', '站内消息', 1, 'active'),
  ('alert_channel', 'alert_channel_email', 'email', '邮件', 2, 'active'),
  ('alert_channel', 'alert_channel_wechat', 'wechat', '微信', 3, 'active'),
  ('alert_channel', 'alert_channel_sms', 'sms', '短信', 4, 'active')
ON CONFLICT DO NOTHING;

-- risk_level
INSERT INTO sys_attribute (category, attribute_key, attribute_value, name, sort_order, status)
VALUES
  ('risk_level', 'risk_level_none', 'none', '正常', 1, 'active'),
  ('risk_level', 'risk_level_low', 'low', '低风险', 2, 'active'),
  ('risk_level', 'risk_level_medium', 'medium', '需关注', 3, 'active'),
  ('risk_level', 'risk_level_high', 'high', '高风险', 4, 'active')
ON CONFLICT DO NOTHING;

-- arbitration_status
INSERT INTO sys_attribute (category, attribute_key, attribute_value, name, sort_order, status)
VALUES
  ('arbitration_status', 'arbitration_status_pending', 'pending', '待受理', 1, 'active'),
  ('arbitration_status', 'arbitration_status_processing', 'processing', '处理中', 2, 'active'),
  ('arbitration_status', 'arbitration_status_resolved', 'resolved', '已裁决', 3, 'active'),
  ('arbitration_status', 'arbitration_status_closed', 'closed', '已关闭', 4, 'active')
ON CONFLICT DO NOTHING;

-- arbitration_type
INSERT INTO sys_attribute (category, attribute_key, attribute_value, name, sort_order, status)
VALUES
  ('arbitration_type', 'arbitration_type_project_dispute', 'project_dispute', '项目争议', 1, 'active'),
  ('arbitration_type', 'arbitration_type_contract_dispute', 'contract_dispute', '合同争议', 2, 'active'),
  ('arbitration_type', 'arbitration_type_performance_appeal', 'performance_appeal', '绩效申诉', 3, 'active')
ON CONFLICT DO NOTHING;

-- performance_status
INSERT INTO sys_attribute (category, attribute_key, attribute_value, name, sort_order, status)
VALUES
  ('performance_status', 'performance_status_pending', 'pending', '待评估', 1, 'active'),
  ('performance_status', 'performance_status_evaluating', 'evaluating', '评估中', 2, 'active'),
  ('performance_status', 'performance_status_completed', 'completed', '已完成', 3, 'active'),
  ('performance_status', 'performance_status_appealed', 'appealed', '已申诉', 4, 'active')
ON CONFLICT DO NOTHING;

-- ── 软删除废弃分类（保留数据，不影响已有记录） ──────────────

UPDATE sys_attribute_category SET deleted_at = NOW()
WHERE category_code IN (
  'demand_type', 'intent_level', 'project_status', 'opportunity_stage',
  'service_type', 'todo_type', 'worklog_type', 'alert_category',
  'alert_target_type', 'member_role', 'bid_type', 'bond_status',
  'archive_status', 'sub_scheme_type', 'complexity', 'solution_type'
) AND deleted_at IS NULL;

COMMIT;
