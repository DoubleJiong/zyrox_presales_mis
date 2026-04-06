# 工作台、日程、任务、消息中心模块演进计划第七波：个人事件收件箱增强

日期：2026-04-05

状态：已完成

## 1. 第七波目标

第七波聚焦“个人事件收件箱增强”，目标是把第六波接入完成的任务、消息、预警事件流，继续从“有更多事件类型的最近动态”推进为更明确的个人事件收件箱。

本波目标为：

1. 让工作台事件流按“最近相关动作”排序，而不再混用创建时间口径。
2. 让预警事件与任务处理路径之间建立更强的联动，支持从工作台直接进入预警任务视角。
3. 进一步压缩工作台、消息中心、预警中心、任务中心的职责边界，让工作台只承担统一收件箱与分流入口角色。

## 2. 变更分类

本波分类如下：

1. `business model or domain redesign`
2. `rule-conflict`
3. `requirement-gap`

根因不是最近动态渲染错误，而是第六波之后仍存在以下残余结构问题：

1. 动态排序口径仍不完全稳定，部分项目/报价/商机活动按创建时间而非最近相关动作排序。
2. 预警事件虽然进入了工作台，但仍缺少直接进入任务处理视角的快速闭环动作。
3. 工作台最近动态虽然已接入多类型事件，但在表达上还偏“动态流”，尚未充分体现个人事件收件箱语义。

## 3. 第七波定版结论

### 3.1 Canonical 页面与 API

1. `/workbench` 继续作为个人驾驶舱与个人事件收件箱 canonical 页面。
2. `/api/activities` 继续作为工作台事件收件箱的唯一读模型 API。
3. `/tasks`、`/messages`、`/alerts/histories` 继续分别作为任务、消息、预警的 canonical 处理页面。

### 3.2 第七波范围边界

本波只做以下五件事：

1. 统一最近动态按最近相关动作时间排序。
2. 为任务、消息、预警事件补充 inbox 风格的 quick actions。
3. 为 task-linked alert 提供直接进入 `/tasks?scope=mine&type=alert` 的处理路径。
4. 将工作台最近动态重命名并重构为“个人事件收件箱”表达。
5. 修正任务中心中预警任务详情的错误跳转口径。

本波明确不做：

1. 不引入新的独立事件中心页面。
2. 不新增预警自动创建任务的后台规则。
3. 不修改任务、消息、预警自身的写模型与状态机。
4. 不在本波重构现有 SSE 或性能告警机制。

## 4. 实施要求

1. 收件箱增强必须继续保持现有 auth-bound 与 current-user 权限边界。
2. quick actions 只能跳转到现有 canonical owner 页面，不得在工作台内新增并行处理机制。
3. 事件时间口径必须与最近相关动作一致，不得继续混用与用户无关的创建时间。

## 5. 验证面

本波至少验证：

1. `/api/activities` 对 task/message/alert 以及原有项目侧事件仍可正常返回，并按最近相关动作排序。
2. task-linked alert 返回任务处理与预警查看两条 quick actions。
3. `/workbench` 正式运行态能展示“个人事件收件箱”与新增 quick actions。
4. 从工作台点击 alert quick action 后可进入任务中心 alert 视角。

## 6. 当前结论

1. `/api/activities` 已统一按最近相关动作时间排序，项目、报价、商机等活动不再停留在旧的创建时间口径。
2. 工作台最近动态已升级为“个人事件收件箱”，支持来源标签和 quick actions，强化了工作台作为统一事件入口的角色。
3. task-linked alert 现在支持直接进入 `/tasks?scope=mine&type=alert` 的处理路径，同时保留进入 `/alerts/histories?status=pending` 的 canonical 预警查看路径。
4. 任务中心中的预警任务详情错误跳转已修正，不再指向不存在的 `/alerts/{id}` 页面。
5. focused API 回归 `tests/api/activities/route.test.ts` 已通过 `3/3`，覆盖 current-user 事件范围、最近相关动作排序和 alert-task quick actions。
6. focused formal 回归 `tests/e2e/playwright/wave7-formal.spec.ts` 已在 `5004` 端口通过 `1/1`，验证了收件箱标题、quick actions、alert-task 跳转以及正式 API 排序行为。

下一波可以继续评估：

1. 是否需要把风险雷达与消息待办卡片进一步并入统一收件箱区块，减少工作台重复信息面。
2. 是否需要为不同事件类型增加“已处理/稍后处理”类轻量 inbox 操作。
3. 是否需要将活动流查询继续收敛为专门的 service/read-model 层，以降低 route 内聚合复杂度。