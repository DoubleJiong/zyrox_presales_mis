# 工作台、日程、任务、消息中心模块演进计划第九波：工作台读模型收敛与任务轻操作

日期：2026-04-05

状态：已闭环，5004 production 与 5000 external-dev 正式验证通过

## 1. 第九波目标

第九波聚焦“工作台读模型收敛与任务轻操作”，目标是在第八波个人事件收件箱基础上，完成三个剩余收口项：

1. 为任务事件补齐轻量 inbox 操作。
2. 让 `/workbench` 基于单一 summary/read-model 获取收件箱与驾驶舱数据，去掉双路拉取。
3. 把 `/api/activities` 的聚合逻辑正式下沉到共享 service/read-model 层。

## 2. 变更分类

本波分类如下：

1. `business model or domain redesign`
2. `frontend interaction simplification`
3. `read-model convergence`

根因不是工作台缺少信息，而是第八波结束后仍存在以下结构性残余：

1. 工作台页面同时请求 `/api/workbench/summary` 与 `/api/activities`，同一用户工作面存在双路读模型。
2. `/api/activities` 仍承担大量 route 内聚合逻辑，无法与 summary 读模型统一演进。
3. 任务事件已经进入个人事件收件箱，但还不能像消息和预警一样完成轻量处理。

## 3. 第九波定版结论

### 3.1 Canonical 页面与 API

1. `/workbench` 继续作为个人驾驶舱与个人事件收件箱 canonical 页面。
2. `/api/workbench/summary` 现在承载统一 read-model，并直接返回 `inboxFeed`。
3. `/api/activities` 退化为共享 read-model 的薄包装，只负责 limit/types 请求参数与返回壳。
4. 任务轻操作继续复用 canonical `/api/tasks/[id]` 更新路径，不新增平行任务处理端点。

### 3.2 第九波范围边界

本波只做以下五件事：

1. 抽通并接入共享的 `src/lib/workbench/read-model.ts` 作为工作台统一读模型。
2. 让 `/api/workbench/summary` 返回 `inboxFeed`，并由其派生兼容性 `riskAlerts` / `unreadMessages` 面板数据。
3. 让 `/workbench` 改为单次 summary 拉取，并在轻操作后只刷新这一份读模型。
4. 为任务事件补齐“完成任务”“延后一天”轻操作。
5. 让已完成任务从收件箱读模型中退出，避免轻操作后仍停留在待处理面。

本波明确不做：

1. 不在工作台中做任务转交、任务详情编辑等复杂处理流。
2. 不新建独立的任务轻操作 API。
3. 不在本波继续扩展消息中心或预警中心的复杂处理动作。
4. 不在本波继续扩展与工作台读模型/任务轻操作无关的全局能力。

## 4. 实施要求

1. 工作台收件箱和 summary 必须共享同一个 read-model 源，不允许继续双写双算。
2. 任务轻操作必须继续走 auth-bound canonical `/api/tasks/[id]`。
3. `/api/activities` 只能保留薄路由职责，不允许再堆回聚合 SQL。

## 5. 验证面

本波至少验证：

1. `/api/workbench/summary` 直接返回 `inboxFeed`，工作台页面不再单独请求 `/api/activities`。
2. `/api/activities` 继续返回与共享 read-model 一致的任务、消息、预警和业务动态契约。
3. 任务事件在收件箱中可直接完成“完成任务”“延后一天”轻操作。
4. 任务完成后不再继续留在个人事件收件箱。

## 6. 当前结论

1. `src/lib/workbench/read-model.ts` 已成为工作台统一读模型来源，`/api/workbench/summary` 与 `/api/activities` 现在共同复用该 service。
2. `src/app/workbench/page.tsx` 已移除独立 `fetchActivities()` 路径，页面初始化和轻操作刷新都只依赖 `/api/workbench/summary` 返回的 `inboxFeed`。
3. 任务事件现在会暴露“完成任务”“延后一天”“打开任务”三个 quick actions，其中任务完成后会从收件箱中移除。
4. `tests/api/activities/route.test.ts` 已更新为覆盖任务轻操作契约，`tests/api/workbench/summary-route.test.ts` 已更新为覆盖统一 summary + `inboxFeed` + 兼容面板派生逻辑。
5. focused API 回归已通过 `5/5`，`corepack pnpm typecheck` 已通过，且本波最终闭环确认了 Windows 环境下应以真实 `pnpm build`/`next build` 进程退出作为 webpack build 完成条件，而不是以终端工具过早返回作为依据。
6. `/api/tasks/[id]` 的任务完成写路径已修正：`bus_project_task.completed_date` 是 `date` 列，不能写入原始 `Date` 对象，必须写入 `YYYY-MM-DD`。这一修复解决了 production 下 `ERR_INVALID_ARG_TYPE` 导致的任务轻操作假成功问题。
7. `/api/workbench/summary` 已显式改为 `force-dynamic` + `Cache-Control: no-store`，`/workbench` 页面拉取 summary 时也显式使用 `no-store` 并在任务完成轻操作后做本地乐观移除，以避免收件箱和优先队列被旧 summary 覆盖。
8. `tests/e2e/playwright/wave9-formal.spec.ts` 已分别在 `http://localhost:5004` production external server 和 `http://localhost:5000` external dev server 下通过 `1/1`，第九波正式闭环。

下一波可以继续评估：

1. 是否需要把任务延后扩展为可选日期，而不是固定“延后一天”。
2. 是否需要正式移除 summary 兼容字段 `riskAlerts` / `unreadMessages`，只保留 `inboxFeed` 作为统一事件面。
3. 是否需要把当前 `workbench` 的 optimistic removal 进一步推广到消息/预警轻操作，统一 workbench inbox 的即时反馈策略。