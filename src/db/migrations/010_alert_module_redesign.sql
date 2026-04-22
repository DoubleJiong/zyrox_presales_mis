-- ============================================================
-- 010_alert_module_redesign.sql
-- 预警模块重设计 Phase1 — 新增 bus_alert_rule/bus_alert_history 列
-- 新增字典分类 alert_scene_template / alert_check_frequency
-- 重置 alert_rule_type 枚举（threshold/deadline/anomaly → signal/threshold）
-- 补充 alert_status.auto_closed
-- ============================================================

BEGIN;

-- ──────────────────────────────────────────────────────────────
-- 1. bus_alert_rule — 新增四列
-- ──────────────────────────────────────────────────────────────

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'bus_alert_rule' AND column_name = 'scene_template') THEN
    ALTER TABLE bus_alert_rule ADD COLUMN scene_template   varchar(50);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'bus_alert_rule' AND column_name = 'trigger_type') THEN
    ALTER TABLE bus_alert_rule ADD COLUMN trigger_type     varchar(20) DEFAULT 'threshold';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'bus_alert_rule' AND column_name = 'cron_expression') THEN
    ALTER TABLE bus_alert_rule ADD COLUMN cron_expression  varchar(100);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'bus_alert_rule' AND column_name = 'pg_boss_job_name') THEN
    ALTER TABLE bus_alert_rule ADD COLUMN pg_boss_job_name varchar(200);
  END IF;
END $$;

COMMENT ON COLUMN bus_alert_rule.scene_template   IS '场景模板编码（alert_scene_template 字典值）';
COMMENT ON COLUMN bus_alert_rule.trigger_type     IS '触发类型：signal=事件驱动，threshold=定时扫描';
COMMENT ON COLUMN bus_alert_rule.cron_expression  IS '检查频率对应的 cron 表达式（仅 threshold 型有效）';
COMMENT ON COLUMN bus_alert_rule.pg_boss_job_name IS 'pg-boss 注册的定时任务唯一名称（格式：alert:rule:{id}）';

-- ──────────────────────────────────────────────────────────────
-- 2. bus_alert_history — 新增五列
-- ──────────────────────────────────────────────────────────────

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'bus_alert_history' AND column_name = 'ignored_by') THEN
    ALTER TABLE bus_alert_history ADD COLUMN ignored_by         integer REFERENCES sys_user(id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'bus_alert_history' AND column_name = 'ignored_at') THEN
    ALTER TABLE bus_alert_history ADD COLUMN ignored_at         timestamp;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'bus_alert_history' AND column_name = 'ignore_reason') THEN
    ALTER TABLE bus_alert_history ADD COLUMN ignore_reason      text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'bus_alert_history' AND column_name = 'auto_closed_at') THEN
    ALTER TABLE bus_alert_history ADD COLUMN auto_closed_at     timestamp;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'bus_alert_history' AND column_name = 'auto_closed_reason') THEN
    ALTER TABLE bus_alert_history ADD COLUMN auto_closed_reason text;
  END IF;
END $$;

COMMENT ON COLUMN bus_alert_history.ignored_by         IS '忽略操作人ID';
COMMENT ON COLUMN bus_alert_history.ignored_at         IS '忽略时间';
COMMENT ON COLUMN bus_alert_history.ignore_reason      IS '忽略原因（用户填写）';
COMMENT ON COLUMN bus_alert_history.auto_closed_at     IS '系统自动关闭时间（条件已自愈，仅 threshold 型）';
COMMENT ON COLUMN bus_alert_history.auto_closed_reason IS '自动关闭原因描述';

-- ──────────────────────────────────────────────────────────────
-- 3. 字典分类 — 新增 alert_scene_template / alert_check_frequency
-- ──────────────────────────────────────────────────────────────

INSERT INTO sys_attribute_category
  (category_code, category_name, description, icon, is_system, sort_order, status)
VALUES
  ('alert_scene_template',  '预警场景模板', '内置的预警业务场景模板，用户按模板配置参数', 'LayoutTemplate', true, 205, 'active'),
  ('alert_check_frequency', '预警检查频率', '阈值型预警的定时扫描频率（映射到 cron）',    'Clock',          true, 206, 'active')
ON CONFLICT (category_code) WHERE deleted_at IS NULL DO UPDATE SET
  category_name = EXCLUDED.category_name,
  description   = EXCLUDED.description,
  icon          = EXCLUDED.icon,
  sort_order    = EXCLUDED.sort_order,
  status        = EXCLUDED.status;

-- ──────────────────────────────────────────────────────────────
-- 4. 字典项 — alert_status 补充 auto_closed
-- ──────────────────────────────────────────────────────────────

INSERT INTO sys_attribute
  (category, attribute_key, name, attribute_value, attribute_type, description, sort_order, is_system, status)
VALUES
  ('alert_status', 'alert_status_auto_closed', '已自动关闭', 'auto_closed', 'string',
   '条件已自愈，由系统自动关闭（仅阈值型预警）', 5, true, 'active')
ON CONFLICT DO NOTHING;

-- ──────────────────────────────────────────────────────────────
-- 5. 字典项 — alert_rule_type 重置（软删旧三项，写入新两项）
-- ──────────────────────────────────────────────────────────────

-- 软删旧枚举项（threshold/deadline/anomaly 三项旧值，如果存在的话）
UPDATE sys_attribute
SET deleted_at = NOW()
WHERE category = 'alert_rule_type'
  AND attribute_value IN ('threshold', 'deadline', 'anomaly')
  AND deleted_at IS NULL;

-- 插入新枚举项：signal + threshold（新含义）
INSERT INTO sys_attribute
  (category, attribute_key, name, attribute_value, attribute_type, description, sort_order, is_system, status)
VALUES
  ('alert_rule_type', 'alert_rule_type_signal',    '信号型', 'signal',    'string',
   '由业务事件触发（如项目丢单），写操作时立即触发', 1, true, 'active'),
  ('alert_rule_type', 'alert_rule_type_threshold', '阈值型', 'threshold', 'string',
   '由定时扫描触发（如项目超期），按 cron 频率周期检查', 2, true, 'active')
ON CONFLICT DO NOTHING;

-- ──────────────────────────────────────────────────────────────
-- 6. 字典项 — alert_scene_template（5 场景模板）
-- ──────────────────────────────────────────────────────────────

INSERT INTO sys_attribute
  (category, attribute_key, name, attribute_value, attribute_type, description, sort_order, is_system, status, extra_data)
VALUES
  ('alert_scene_template', 'alert_scene_template_project_not_updated',
   '项目长期未更新', 'project_not_updated', 'string',
   '项目在 N 天内没有任何跟进记录或状态变更', 1, true, 'active',
   '{"triggerType":"threshold","targetType":"project"}'),
  ('alert_scene_template', 'alert_scene_template_project_overdue',
   '项目已超预期交付日', 'project_overdue', 'string',
   '项目已超过 expectedDeliveryDate 且仍在进行中', 2, true, 'active',
   '{"triggerType":"threshold","targetType":"project"}'),
  ('alert_scene_template', 'alert_scene_template_project_near_deadline',
   '项目临近截止日期', 'project_near_deadline', 'string',
   '项目距离 expectedDeliveryDate 还有 N 天', 3, true, 'active',
   '{"triggerType":"threshold","targetType":"project"}'),
  ('alert_scene_template', 'alert_scene_template_customer_inactive',
   '客户长期未跟进', 'customer_inactive', 'string',
   '客户在 N 天内没有任何跟进活动记录', 4, true, 'active',
   '{"triggerType":"threshold","targetType":"customer"}'),
  ('alert_scene_template', 'alert_scene_template_project_lost_signal',
   '项目发生丢单', 'project_lost_signal', 'string',
   '项目投标结果变为丢标，立即触发', 5, true, 'active',
   '{"triggerType":"signal","targetType":"project"}')
ON CONFLICT DO NOTHING;

-- ──────────────────────────────────────────────────────────────
-- 7. 字典项 — alert_check_frequency（5 频率选项）
-- ──────────────────────────────────────────────────────────────

INSERT INTO sys_attribute
  (category, attribute_key, name, attribute_value, attribute_type, description, sort_order, is_system, status, extra_data)
VALUES
  ('alert_check_frequency', 'alert_check_frequency_every_15min',
   '每15分钟', 'every_15min', 'string', NULL, 1, true, 'active',
   '{"cron":"*/15 * * * *"}'),
  ('alert_check_frequency', 'alert_check_frequency_every_30min',
   '每30分钟', 'every_30min', 'string', NULL, 2, true, 'active',
   '{"cron":"*/30 * * * *"}'),
  ('alert_check_frequency', 'alert_check_frequency_hourly',
   '每小时', 'hourly', 'string', NULL, 3, true, 'active',
   '{"cron":"0 * * * *"}'),
  ('alert_check_frequency', 'alert_check_frequency_daily_morning',
   '每天上午9点', 'daily_morning', 'string', NULL, 4, true, 'active',
   '{"cron":"0 9 * * *"}'),
  ('alert_check_frequency', 'alert_check_frequency_weekly_monday',
   '每周一上午9点', 'weekly_monday', 'string', NULL, 5, true, 'active',
   '{"cron":"0 9 * * 1"}')
ON CONFLICT DO NOTHING;

COMMIT;
