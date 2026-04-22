---
name: presales-alert-module-redesign
description: "Module skill for this workspace's 预警模块重构, 引入 pg-boss 调度, 场景模板化规则, 信号/阈值分离, auto_closed 生命周期, 通知层邮件落地. Use when the user wants the alert module redesigned from scratch: pg-boss scheduling, scene-template-based rules (not raw field expressions), signal vs threshold split, dictionary-governed enums, Resend email notification, or any sustained alert-module engineering stream."
---

# Presales Alert Module Redesign

Use this skill when the active workstream is the alert module (`/alerts`, `src/lib/alert-executor.ts`, `src/lib/alert-scheduler.ts`) and the user is delegating a sustained redesign rather than a one-off alert bug fix.

## Architectural Decisions (Already Confirmed)

These decisions are locked and must not be re-discussed:

1. **全部走 pg-boss** — Both signal alerts and threshold alerts use pg-boss. Signal writes put an immediate one-shot job; threshold checks use registered cron jobs. There is no inline synchronous alert path in business write APIs.
2. **`auto_closed` 是新枚举值** — Not reused from `resolved`. `bus_alert_history.status` has 5 values: `pending / acknowledged / resolved / ignored / auto_closed`. Only threshold-type alerts can be auto-closed (when condition no longer met on next scan). Signal alerts require human closure.
3. **仅通知 `recipientIds`** — Alert notifications are sent only to the IDs specified in the rule's `recipientIds` field. No implicit owner/manager escalation unless explicitly added to `recipientIds`.
4. **所有枚举必须在系统字典中注册** — Every enum-style field added in this module must be registered in `src/lib/config/dictionary-config.ts` under the correct `typeCode`. Prefer reusing existing categories. New categories need `DICT_CATEGORIES` entry + `ALL_DICT_ITEMS` entry + seed SQL migration.

## Alert Module Target Architecture

### Layer 1 — Trigger Layer
- **Signal trigger**: Business write API calls `boss.send('alert-signal', { sceneTemplate, targetId, targetType })` immediately after the state-change write. No wait, no block.
- **Threshold trigger**: pg-boss cron job `alert-rule-{ruleId}` fires on the rule's `cronExpression`. Worker calls `alertExecutor.executeThresholdRule(rule)`.

### Layer 2 — Scene Templates (code-hardwired, user configures parameters only)
| templateCode | type | trigger |
|---|---|---|
| `project_not_updated` | threshold | cron |
| `project_overdue` | threshold | cron |
| `project_near_deadline` | threshold | cron |
| `customer_inactive` | threshold | cron |
| `project_lost_signal` | signal | boss.send on bidResult=lost |

### Layer 3 — Executor (`src/lib/alert-executor.ts`)
- `executeThresholdRule(rule)`: query matching objects → de-duplicate existing `pending` alerts → batch-write `bus_alert_history` → auto-close resolved conditions → call notifier
- `executeSignalAlert(job)`: find rule(s) matching the signal template → write one alert per matching rule → call notifier
- De-duplicate guard: skip creating a new alert if there is already a `pending` or `acknowledged` alert for the same `ruleId + targetId`.
- Auto-close: on each threshold scan, for each existing `pending|acknowledged` history for this rule, if the target no longer meets the condition, set `status = 'auto_closed'`, write `autoClosedAt`, `autoClosedReason`.

### Layer 4 — Notifier (`src/lib/alert-notifier.ts`)
- `sendSystemNotification()`: write to `bus_alert_notification` (channel=in_app) + write to `bus_message` for workbench inbox
- `sendEmailNotification()`: call Resend SDK — `resend.emails.send({ to, subject, html })`
- `sendSmsNotification()`: stub, log only, returns `{ sent: false, reason: 'not_configured' }`
- All channels must write a `bus_alert_notification` row regardless of channel so delivery can be audited.

### Layer 5 — Scheduler (`src/lib/alert-scheduler.ts`)
- Singleton `PgBoss` instance, initialized in `src/instrumentation.ts`
- Exposes `scheduleRule(rule)`, `unscheduleRule(ruleId)`, `rescheduleRule(rule)` for API layer to call when rules are created/updated/toggled
- Signal worker registered once: `boss.work('alert-signal', handler)`
- Threshold workers: one cron schedule per active rule, named `alert-rule-{ruleId}`

## Dictionary Governance

### Existing categories — keep as-is
- `alert_severity`: `low / medium / high / critical`
- `alert_rule_status`: `active / inactive`
- `alert_channel`: `in_app / email / wechat / sms`
- `risk_level`: (data-screen use, unrelated)

### Existing categories — update items
- `alert_status` (used on `bus_alert_history.status`): ADD `auto_closed` { code: 'auto_closed', name: '已自动关闭', sortOrder: 5, color: 'gray' }
- `alert_rule_type`: REPLACE current items (`threshold/deadline/anomaly`) with `signal` (信号型) and `threshold` (阈值型)

### New categories to register
- `alert_scene_template`: 5 items mapping to the 5 hardwired templates (see table above)
- `alert_check_frequency`: human-readable frequency labels mapping to cron expressions (`every_15min / every_30min / hourly / daily_morning / weekly_monday`)

## Schema Changes (DB Migration Required)

### `bus_alert_rule` additions
```sql
ALTER TABLE bus_alert_rule ADD COLUMN scene_template varchar(50);
ALTER TABLE bus_alert_rule ADD COLUMN trigger_type varchar(20) DEFAULT 'threshold';
ALTER TABLE bus_alert_rule ADD COLUMN cron_expression varchar(100);
ALTER TABLE bus_alert_rule ADD COLUMN pg_boss_job_name varchar(200);
```

### `bus_alert_history` additions
```sql
ALTER TABLE bus_alert_history ADD COLUMN ignored_by integer REFERENCES sys_user(id);
ALTER TABLE bus_alert_history ADD COLUMN ignored_at timestamp;
ALTER TABLE bus_alert_history ADD COLUMN ignore_reason text;
ALTER TABLE bus_alert_history ADD COLUMN auto_closed_at timestamp;
ALTER TABLE bus_alert_history ADD COLUMN auto_closed_reason text;
```
Note: `auto_closed` status value is just a new valid string in the existing `status varchar(20)` column — no DDL needed for the enum, only the dictionary registration.

## File Checklist

| File | Action | Notes |
|------|--------|-------|
| `src/lib/config/dictionary-config.ts` | MODIFY | Update alert_status, alert_rule_type; add alert_scene_template, alert_check_frequency |
| `src/db/schema.ts` | MODIFY | Add new columns to alertRules + alertHistories |
| `src/lib/alert-executor.ts` | REWRITE | Template-based dispatch, auto-close logic, de-duplicate guard |
| `src/lib/alert-scheduler.ts` | CREATE | pg-boss singleton, schedule/unschedule/worker registration |
| `src/lib/alert-notifier.ts` | CREATE | System + email + sms stub notification senders |
| `src/instrumentation.ts` | CREATE/MODIFY | Initialize pg-boss on server start |
| `src/app/api/alerts/rules/route.ts` | MODIFY | Validate sceneTemplate, call scheduler on create/update/delete |
| `src/app/api/alerts/check/route.ts` | DEPRECATE | Become a thin wrapper or remove; pg-boss is canonical scheduler |
| `src/app/api/internal/alerts/scheduler/route.ts` | CREATE | Protected internal endpoint for manual re-registration |
| `src/app/alerts/rules/page.tsx` | MODIFY | Replace conditionField free-text with sceneTemplate selector |
| `src/app/alerts/histories/page.tsx` | MODIFY | Add auto_closed badge, ignoreReason required dialog |
| `migrations/xxx_alert_module_redesign.sql` | CREATE | DDL for new columns + seed for new dict categories |

## Execution Phases

### Phase 1 — Foundation (no behavior change yet)
1. Dictionary update (`alert_status` add `auto_closed`, `alert_rule_type` replace, add `alert_scene_template`, `alert_check_frequency`)
2. DB migration for new columns
3. pg-boss install + `alert-scheduler.ts` singleton init + `instrumentation.ts`

### Phase 2 — Executor Rewrite
1. Template-based dispatch replacing free-form `conditionField`
2. Auto-close logic for threshold rules
3. De-duplicate guard
4. `alert-notifier.ts` (system + Resend email stub)

### Phase 3 — API + Scheduler Wiring
1. `POST/PUT/DELETE /api/alerts/rules` calls `scheduleRule / rescheduleRule / unscheduleRule`
2. Signal jobs for `project_lost_signal` injected into project bidding write path
3. `alert-scheduler.ts` registers workers on boot

### Phase 4 — UI Update
1. Rules page: scene template selector
2. Histories page: `auto_closed` badge + `ignoreReason` required dialog

### Phase 5 — Validation
1. Vitest unit tests for executor (threshold + signal + auto-close + dedup)
2. Playwright formal spec `tests/e2e/playwright/alert-module-formal.spec.ts`
3. Combined gate update in `package.json` `verify:acceptance:5004`

## Always Read First
1. `.github/skills/presales-governance-execution/SKILL.md`
2. `src/lib/config/dictionary-config.ts` — to confirm existing alert dict categories before adding
3. `src/db/schema.ts` — alertRules / alertHistories / alertNotifications table definitions
4. `src/lib/alert-executor.ts` — current implementation to understand what survives vs gets replaced

## Stop Conditions
- Do not start Phase 2 until Phase 1 migration + pg-boss init is verified green (typecheck + no runtime error)
- Do not start Phase 4 until Phase 3 executor tests pass
- Never use `conditionField / conditionOperator` free-form strings in new code; always dispatch through `sceneTemplate`
- Never send alert notifications outside the `recipientIds` list
- Never skip dict registration for a new enum value
