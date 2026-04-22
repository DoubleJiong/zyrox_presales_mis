# 预警模块风险与盲区排除计划

日期：2026-04-13  
关联汇报：2026-04-13 预警模块开发测试任务情况汇报  
优先级排序：R1 > R2 > R3 > P1（R1 生产隐患，R2/R3 补测，P1 阶段需求）

---

## 风险清单

| 编号 | 类型 | 描述 | 当前状态 | 优先级 |
|------|------|------|----------|--------|
| R1 | 测试脆弱性 | Test 32 的空数据分支调用已废弃 `POST /api/alerts/check`（返回 410），目前仅因 DB 有存量历史而规避，属幸存者偏差 | 高风险潜伏 | P0 |
| R2 | 测试覆盖缺失 | `/api/alerts/histories` GET 查询（按 ruleId/status/severity/targetType 筛选 + 权限过滤）无 Vitest 单元测试 | 未覆盖 | P1 |
| R3 | 测试覆盖缺失 | `alert-scheduler.ts` 全部公开方法（start/scheduleRule/unscheduleRule/rescheduleRule）及错误日志路径无单元测试 | 未覆盖 | P1 |
| P1 | 规划需求 | Migration 010 已预留 `auto_closed_at/reason` 字段及 `auto_closed` 状态枚举，但"条件自愈自动关闭"业务逻辑未实现 | 待建设 | P2 |

---

## R1 — 修复 Test 32 空数据分支（P0）

### 问题根因

`stability-sweep.spec.ts` Test 32 的 `if (histories.length === 0)` 分支内：

```typescript
const checkResponse = await apiContext.post('/api/alerts/check');
expect(checkResponse.ok(), ...).toBeTruthy(); // ← /api/alerts/check 返回 410，断言失败
```

当测试环境 `bus_alert_history` 表被清空（如 CI 全新环境、数据重置后），该分支必然触发并失败。

### 修复方案

**Step 1 — 新增内部调度触发端点**

创建 `src/app/api/internal/alerts/trigger-check/route.ts`：

- 路由：`POST /api/internal/alerts/trigger-check`
- 仅在非生产环境可用（`NODE_ENV !== 'production'` 门控，生产返回 404）
- 请求体：`{ ruleId: number }`
- 逻辑：`await alertExecutor.executeThresholdRule(ruleId)` 同步执行一次阈值检测
- 返回：`200 { success: true, historiesCreated: number }`
- 认证：`withAuth`（需要登录，防止未认证触发）

**Step 2 — 修改 Test 32 的空数据分支**

将空数据分支中调用废弃端点的代码替换为：

```typescript
// 旧：
const checkResponse = await apiContext.post('/api/alerts/check');
expect(checkResponse.ok(), ...).toBeTruthy();

// 新：
const triggerResponse = await apiContext.post('/api/internal/alerts/trigger-check', {
  data: { ruleId: createdRuleId },
});
const triggerPayload = await triggerResponse.json();
expect(triggerResponse.ok(), JSON.stringify(triggerPayload)).toBeTruthy();
```

**Step 3 — 更新 check-route 单元测试注释**

在 `tests/api/alerts/check-route.test.ts` 的测试用例上方添加注释，说明废弃端点的替代路由为 `/api/internal/alerts/trigger-check`。

### 交付物

| 文件 | 动作 |
|------|------|
| `src/app/api/internal/alerts/trigger-check/route.ts` | 新增 |
| `tests/e2e/playwright/stability-sweep.spec.ts` L1543～1547 | 修改（替换 check 调用） |
| `tests/api/alerts/check-route.test.ts` | 补注释 |

### 验收标准

- 在全新 DB 环境（清空 `bus_alert_history`）下执行 Test 32 仍通过
- `POST /api/internal/alerts/trigger-check` 在 `NODE_ENV=production` 时返回 404
- `NODE_ENV=test/development` 时正常执行并返回 200

---

## R2 — 补充 histories GET 单元测试（P1）

### 覆盖缺口

当前 `tests/api/alerts/histories-route.test.ts` 仅覆盖 POST/PUT/DELETE（确认/解决/忽略）。  
GET `/api/alerts/histories` 包含以下未测试逻辑：

1. 管理员取消权限过滤，可见全部历史
2. 非管理员只能见到：自己相关的 + 可访问项目的历史
3. `status`、`severity`、`targetType`、`ruleId` 四个筛选参数各自作用于查询条件
4. 无参数时返回全量（管理员视角）

### 新增测试用例（6 个）

在 `tests/api/alerts/histories-route.test.ts` 新增 `describe('GET /api/alerts/histories', ...)` 组：

| 编号 | 用例名称 | 核心断言 |
|------|----------|----------|
| G-01 | `admin sees all histories without permission filter` | `isSystemAdmin` 返回 true 时，查询条件不含 `or(...)` 权限分支 |
| G-02 | `non-admin filters by accessible project ids` | `getAccessibleProjectIds` 返回 `[3, 5]` 时，`inArray(targetId, [3,5])` 出现在查询条件中 |
| G-03 | `filters by status param` | 传入 `?status=pending`，`eq(status,'pending')` 出现在 `where` 条件 |
| G-04 | `filters by severity param` | 传入 `?severity=high`，`eq(severity,'high')` 出现 |
| G-05 | `filters by ruleId param` | 传入 `?ruleId=42`，`eq(ruleId,42)` 出现 |
| G-06 | `ignores filter when param is "all"` | 传入 `?status=all`，不追加 status 条件 |

**Mock 策略**（与现有 histories 测试一致）：

```typescript
vi.mock('@/lib/auth-middleware', ...)         // withAuth 注入 userId:7
vi.mock('@/lib/permissions/project', () => ({
  isSystemAdmin: vi.fn(),
  getAccessibleProjectIds: vi.fn(),
}))
vi.mock('@/db', ...)                          // db select chain mock
```

### 验收标准

- `pnpm vitest run tests/api/alerts/histories-route.test.ts` 全部通过
- 行覆盖率：GET handler 的条件分支覆盖率 ≥ 90%

---

## R3 — 补充 alert-scheduler 单元测试（P1）

### 覆盖缺口

`src/lib/alert-scheduler.ts` 全部公开方法无单元测试。关键逻辑依赖 pg-boss 副作用，纯启动日志无法验证条件分支。

### 新增测试文件

`tests/lib/alert-scheduler.test.ts`

**Mock 策略**：

```typescript
// pg-boss 全 mock
vi.mock('pg-boss', () => ({
  default: vi.fn().mockImplementation(() => ({
    start: vi.fn().mockResolvedValue(undefined),
    createQueue: vi.fn().mockResolvedValue(undefined),
    work: vi.fn().mockResolvedValue(undefined),
    schedule: vi.fn().mockResolvedValue(undefined),
    unschedule: vi.fn().mockResolvedValue(undefined),
  })),
}))
// DB mock
vi.mock('@/db', () => ({ db: { select: vi.fn(), update: vi.fn() } }))
// operation logger mock
vi.mock('@/lib/operation-logger', () => ({ logOperation: vi.fn() }))
```

### 新增测试用例（8 个）

| 编号 | 方法 | 用例名称 | 核心断言 |
|------|------|----------|----------|
| S-01 | `start()` | `calls boss.start on initialization` | `boss.start` 被调用一次 |
| S-02 | `start()` | `registers alert-signal worker on start` | `boss.createQueue('alert-signal')` + `boss.work('alert-signal', ...)` 被调用 |
| S-03 | `start()` | `startup scan registers all active threshold rules` | DB 返回两条规则，`boss.schedule` 被调用两次 |
| S-04 | `start()` | `startup scan skips rules missing sceneTemplate or cron` | DB 返回无 sceneTemplate 的规则，`boss.schedule` 不被调用 |
| S-05 | `scheduleRule()` | `registers threshold rule and persists job name` | `boss.schedule(alert-rule-42, ...)` + `db.update` 写入 `pgBossJobName` |
| S-06 | `unscheduleRule()` | `unschedules and clears job name from db` | `boss.unschedule('alert-rule-42')` + `db.update` 清空 `pgBossJobName` |
| S-07 | `rescheduleRule()` | `calls unschedule then scheduleRule` | `boss.unschedule` 先于 `boss.schedule` 调用 |
| S-08 | 错误路径 | `logs to operation log when boss.start throws` | `boss.start` 抛出时，`logOperation` 被调用，action='start' |

### 验收标准

- `pnpm vitest run tests/lib/alert-scheduler.test.ts` 全部通过
- 覆盖 `start`、`scheduleRule`、`unscheduleRule`、`rescheduleRule` 及 `logSchedulerError` 代码路径

---

## P1 — 条件自愈自动关闭（Phase 3 占坑）

> 本项为规划需求，不在当前排除计划强制范围内，但须在 R1-R3 完成后开工前完成需求确认。

### 背景

Migration 010 已预留：
- `bus_alert_history.auto_closed_at` — 系统自动关闭时间
- `bus_alert_history.auto_closed_reason` — 自动关闭原因
- `alert_status` 枚举值 `auto_closed`

### 待实现能力

1. **alertExecutor.executeThresholdRule()** 在扫描时，对已存在的 `pending/acknowledged` 历史进行二次判断：若当前条件已不再满足（即"阈值消失"），则将历史状态从 `pending/acknowledged` 更新为 `auto_closed`，写入 `auto_closed_at` + `auto_closed_reason`
2. **UI**：`/alerts/histories` 页面展示 `已自动关闭` 状态标签，颜色建议 `gray`
3. **单元测试**：`alertExecutor.executeThresholdRule()` 的自愈分支单元测试（mock DB）

### P1 前置确认项

在开工前须确认以下两点：

| 确认项 | 问题描述 |
|--------|----------|
| 自愈粒度 | 自愈是逐条历史判断还是按目标聚合判断？（如：同一项目的多条未处理预警，是全部自愈还是逐条） |
| 自愈触发 | 自愈仅在 threshold cron 触发时检查，还是在任何业务操作（如项目更新）时也应检查？ |

---

## 执行顺序

```
Week 1（当前迭代）
  Day 1   R1-Step1  新增 /api/internal/alerts/trigger-check 路由
  Day 1   R1-Step2  修改 stability-sweep.spec.ts Test 32
  Day 1   R1-Step3  验证：全新 DB 环境下 Test 32 通过
  Day 2   R2        新增 histories GET 单元测试（6 用例）
  Day 3   R3        新增 alert-scheduler 单元测试（8 用例）
  Day 3   全量回归   pnpm vitest run + playwright Test 32/Test 33

Week 2（下一迭代，视排期）
  P1 需求确认 → 若确认，开始自愈逻辑实现
```

---

## 完成门控

| Gate | 标准 |
|------|------|
| G1 | 在 DB 清空 bus_alert_history 后手动执行 Test 32，结果通过 |
| G2 | `pnpm vitest run tests/api/alerts/histories-route.test.ts` 通过，含 6 个新 GET 用例 |
| G3 | `pnpm vitest run tests/lib/alert-scheduler.test.ts` 通过，含 8 个新用例 |
| G4 | 全量 stability-sweep 41/41 仍通过（回归门控） |
| G5（P1） | P1 前置确认事项已达成一致 |
