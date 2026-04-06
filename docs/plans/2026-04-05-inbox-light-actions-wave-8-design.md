# 工作台、日程、任务、消息中心模块演进计划第八波：收件箱轻操作与重复面压缩

日期：2026-04-05

状态：已完成

## 1. 第八波目标

第八波聚焦“收件箱轻操作与重复面压缩”，目标是在第七波个人事件收件箱的基础上，把工作台从“可查看的统一收件箱”继续推进为“可完成轻量处理的统一收件箱”，同时移除与之重复的独立侧栏面板和重复 API 机制。

本波目标为：

1. 让工作台收件箱支持消息已读、预警确认这类轻量操作。
2. 压缩工作台中与个人事件收件箱重复的“风险雷达”“消息待办”独立面板。
3. 收敛预警处理 API 到既有 canonical `/api/alerts/histories` 路径，删除重复且不安全的子路由实现。

## 2. 变更分类

本波分类如下：

1. `business model or domain redesign`
2. `security or auth hardening`
3. `rule-conflict`

根因不是工作台缺少事件，而是第七波之后仍存在以下残余问题：

1. 收件箱仍然只能跳转，无法完成最基础的消息已读与预警确认。
2. 工作台右侧仍保留“风险雷达”“消息待办”独立面板，与统一收件箱形成重复入口。
3. 预警仍存在 `/api/alerts/histories/[id]/acknowledge` 与 `/api/alerts/histories/[id]/resolve` 两条重复子路由，且旧实现不走统一 auth-bound 口径。

## 3. 第八波定版结论

### 3.1 Canonical 页面与 API

1. `/workbench` 继续作为个人驾驶舱与个人事件收件箱 canonical 页面。
2. `/api/activities` 继续作为工作台收件箱的唯一读模型 API。
3. 轻量消息处理复用 `/api/messages/[id]/read`。
4. 轻量预警处理复用 `/api/alerts/histories` 的 canonical `POST` 处理路径。

### 3.2 第八波范围边界

本波只做以下五件事：

1. 为消息事件补充“标为已读”轻操作。
2. 为预警事件补充“确认预警”轻操作。
3. 删除工作台右侧重复的“风险雷达”“消息待办”独立面板。
4. 保留收件箱头部到消息中心、预警中心的 canonical 跳转入口。
5. 删除重复的预警子路由 `/api/alerts/histories/[id]/acknowledge` 与 `/api/alerts/histories/[id]/resolve`。

本波明确不做：

1. 不在工作台内支持复杂预警解决流或消息删除流。
2. 不把任务、消息、预警的完整处理页内嵌到工作台。
3. 不在本波继续改造活动流 service/read-model 分层。
4. 不在本波处理与收件箱无关的 SSE 或性能告警噪音。

## 4. 实施要求

1. 工作台轻操作只能复用既有 canonical API，不得再引入新的并行处理端点。
2. 所有轻操作必须继续维持 auth-bound 权限边界。
3. 移除重复信息面后，工作台仍需保留进入消息中心与预警中心的明确入口。

## 5. 验证面

本波至少验证：

1. `/api/activities` 返回的消息与预警事件包含轻操作契约。
2. 工作台收件箱可直接完成消息已读和预警确认。
3. 独立“风险雷达”“消息待办”面板不再作为右侧重复信息面存在。
4. 正式 `5004` 运行态下，轻操作完成后对应事件会从收件箱中消失。

## 6. 当前结论

1. `/api/activities` 现在会为消息事件返回“标为已读”轻操作，为预警事件返回“确认预警”轻操作，并继续保留跳转型 quick actions。
2. `/workbench` 右侧重复的“风险雷达”“消息待办”面板已移除，个人事件收件箱成为唯一的统一事件入口。
3. 工作台收件箱现在可以直接调用 `/api/messages/[id]/read` 与 `/api/alerts/histories` 完成轻量处理，处理后自动刷新收件箱与工作台概览。
4. 重复且不安全的 `/api/alerts/histories/[id]/acknowledge` 与 `/api/alerts/histories/[id]/resolve` 已删除，预警处理口径回收至 canonical auth-bound 路径。
5. focused API 回归 `tests/api/activities/route.test.ts` 已通过 `3/3`，活动流契约继续稳定。
6. focused formal 回归 `tests/e2e/playwright/wave8-formal.spec.ts` 已在 `5004` 端口通过 `1/1`，验证了收件箱轻操作与重复面压缩结果。

下一波可以继续评估：

1. 是否需要为任务事件补充更多轻量 inbox 操作，例如完成、延后、转交。
2. 是否需要把工作台收件箱和 workbench summary 进一步收敛为统一 read-model，减少双路数据获取。
3. 是否需要开始把 `/api/activities` 的聚合逻辑下沉到专门的 service/read-model 层。