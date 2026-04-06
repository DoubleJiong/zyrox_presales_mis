# 第三阶段重构切片说明

日期：2026-03-29

阶段名称：第三阶段 领域重构与数据迁移

目标：将第二阶段已经定版的状态机、审批模型、方案主模型和统计口径，按最小可控切片逐步落入代码与数据结构，避免再次回到 route 直改、口径分裂和局部补丁累积模式。

---

## 1. 治理前提

第三阶段必须以前置治理结论为准：

1. `projectStage` 是项目业务主阶段字段
2. `status` 是兼容字段，不再扩展主业务语义
3. 审批必须独立为一等实体，不再由业务 route 临时拼装
4. `solution` 是未来唯一主方案模型
5. 仪表盘必须消费统一业务口径，不得反向定义业务规则

## 2. 重构总顺序

第三阶段按以下顺序推进，不建议跳序：

1. 项目状态机服务
2. 统一审批实体
3. 方案评审与方案主模型接入统一审批
4. 仪表盘与统计口径切换
5. 身份生命周期治理

排序原因：

1. 状态机是项目主链路真相源
2. 审批依赖状态机边界
3. 方案评审依赖统一审批骨架
4. 仪表盘依赖状态与审批真相源
5. 身份生命周期虽然重要，但不应阻塞项目/审批/方案主链路重构

## 3. Slice 1：项目状态机服务

### 3.1 目标

让项目阶段迁移从“route 直接写字段”收敛为“统一状态机服务执行迁移 + 写历史 + 做前置校验”。

### 3.2 主要改动面

优先改造入口：

1. `src/app/api/projects/**`
2. `src/app/api/biddings/approvals/route.ts`
3. `src/app/api/projects/[id]/stage*`
4. `src/app/api/projects/[id]/status`

新增核心边界建议：

1. `src/modules/project/project-stage-service.ts`
2. `src/modules/project/project-stage-policy.ts`
3. `src/modules/project/project-stage-transition-repository.ts`

### 3.3 兼容层策略

1. 保留 `projects.status` 字段，但只做映射或兼容展示
2. 旧 route 暂不全部删除，先改为调用状态机服务
3. 旧页面继续读当前接口返回，但阶段语义以 `projectStage` 为准

### 3.4 数据迁移要求

1. 先补映射，不立刻做大规模历史数据回写
2. 先保证新迁移事件都写入阶段历史
3. 再针对历史项目补一次状态映射脚本

### 3.5 最小验收

1. 任一项目阶段迁移都统一经过状态机服务
2. `projectStageHistory` 能记录来源、操作者、原因
3. 新代码不再直接用 `projects.status` 判断主阶段
4. 有至少一组状态机单元测试和一组 API 负路径测试

## 4. Slice 2：统一审批实体

### 4.1 目标

建立投标立项、方案评审、合同审批共享的审批主骨架。

### 4.2 主要改动面

新增建议：

1. `src/modules/approval/approval-service.ts`
2. `src/modules/approval/approval-policy.ts`
3. `src/modules/approval/approval-repository.ts`
4. `src/modules/approval/approval-types.ts`

涉及数据结构：

1. `approval_request`
2. `approval_step`
3. `approval_event`

优先接入入口：

1. `src/app/api/biddings/approvals/route.ts`
2. 报价/合同审批入口
3. 后续方案评审入口

### 4.3 兼容层策略

1. 旧审批接口 URL 可保留
2. 旧接口内部改为转发到统一审批服务
3. 不再允许在旧接口中直接推进项目主阶段

### 4.4 数据迁移要求

1. 先新建审批主表，不强行迁历史伪审批记录
2. 历史审批显示可以标记为“旧记录/不可追溯”
3. 自新版本起，所有审批必须生成正式审批单

### 4.5 最小验收

1. 投标立项审批不再使用 `index + 1` 伪记录
2. 审批提交、审批通过、审批驳回、撤回都有事件记录
3. 发起审批不直接等于阶段变更
4. 有审批服务测试、审批 API 测试、权限负路径测试

## 5. Slice 3：方案评审与方案主模型接入统一审批

### 5.1 目标

让 `solution_review` 从局部服务升级为统一审批类型，同时推进 `scheme -> solution` 主模型收敛。

### 5.2 主要改动面

优先改造入口：

1. `src/services/solution-review.service.ts`
2. `src/app/api/solutions/**/reviews/**`
3. `src/app/api/dashboard/route.ts` 中方案统计来源

新增建议：

1. `src/modules/solution/solution-review-approval-adapter.ts`
2. `src/modules/solution/solution-policy.ts`
3. `src/modules/solution/solution-statistics-service.ts`

### 5.3 兼容层策略

1. `scheme` 保留为历史读取源
2. 新增评审、成员、统计、下载审计全部围绕 `solution`
3. `scheme` 不再新增主能力

### 5.4 数据迁移要求

1. 先让新流程只写 `solution`
2. 对旧 `scheme` 只做历史兼容读取
3. 第三阶段后半段再做旧数据迁移脚本

### 5.5 最小验收

1. 方案评审接入统一审批类型
2. 方案状态变化有审批事件来源
3. 仪表盘新口径不再把 `scheme` 作为主方案统计来源
4. 有方案评审 API 测试与模型口径测试

## 6. Slice 4：仪表盘与统计口径切换

### 6.1 目标

让 dashboard 统计基于第二阶段定版口径，而不是继续混用旧字段与旧模型。

### 6.2 主要改动面

优先改造入口：

1. `src/app/api/dashboard/route.ts`
2. `src/services/query-service.ts`
3. 各统计接口与排行榜接口

新增建议：

1. `src/modules/dashboard/dashboard-metric-service.ts`
2. `src/modules/dashboard/dashboard-scope-service.ts`
3. `tests/unit/dashboard/**`

### 6.3 兼容层策略

1. 现有前端字段名尽量保持稳定
2. 后端内部计算逻辑切换到新口径
3. 对暂未落库的新审批待办指标，明确返回“未启用/待建设”，不再拼凑

### 6.4 数据迁移要求

1. 不先做全量历史重算
2. 先对核心指标建立映射层和样例测试
3. 再评估是否需要物化汇总表或统计缓存

### 6.5 最小验收

1. `totalProjects`、`projectsByStage`、`totalSolutions`、`pendingTasks` 使用统一口径
2. self/global scope 使用同一公式，仅对象集合不同
3. 统计结果有样例回归测试

## 7. Slice 5：身份生命周期治理

### 7.1 目标

在不回退第一阶段安全边界的前提下，建立账号创建、首次改密、重置密码、审计链路。

### 7.2 主要改动面

优先改造入口：

1. `src/app/api/staff/route.ts`
2. `src/app/settings/users/**`
3. 登录、改密、重置密码相关接口

新增建议：

1. `src/modules/identity/password-lifecycle-service.ts`
2. `src/modules/identity/identity-policy.ts`
3. `tests/api/identity/**`

### 7.3 兼容层策略

1. 保留当前登录入口
2. 不再回退默认口令
3. 渐进加入首次登录改密和重置密码审计

### 7.4 数据迁移要求

1. 对存量用户先标识是否需要首次改密
2. 不强制一次性重建人员与账号物理拆分
3. 先完成生命周期治理，再考虑结构拆分

### 7.5 最小验收

1. 创建账号、首次改密、管理员重置密码都有审计记录
2. 无默认口令回退
3. 有身份负路径测试

## 8. 切片间依赖关系

1. Slice 1 是 Slice 2 的前提
2. Slice 2 是 Slice 3 的前提
3. Slice 1、Slice 2、Slice 3 是 Slice 4 的前提
4. Slice 5 可并行规划，但不应早于 Slice 1 到 Slice 4 抢占主链路资源

## 9. 推荐实施批次

### Batch A

1. Slice 1：项目状态机服务骨架
2. Slice 2：统一审批实体骨架

### Batch B

1. Slice 2：投标立项审批接入统一审批
2. Slice 3：方案评审接入统一审批

### Batch C

1. Slice 4：仪表盘与统计口径切换

### Batch D

1. Slice 5：身份生命周期治理

## 10. 第三阶段完成判断

当以下条件满足时，可判定第三阶段完成：

1. 项目主链路通过统一状态机服务推进
2. 投标立项与方案评审已接入统一审批实体
3. `solution` 成为方案主流程唯一主模型
4. 仪表盘主要指标已切换到统一口径
5. 身份生命周期完成最小可用治理
6. 所有兼容层都有明确退场说明或保留理由

## 11. Batch A 执行记录

- 日期：2026-03-29
- 执行人：GitHub Copilot
- 范围：Slice 1 项目状态机服务骨架 + Slice 2 统一审批实体骨架
- 实际改动：
	1. 在 `src/db/schema.ts` 中新增 `bus_project_stage_transition`、`bus_approval_request`、`bus_approval_step`、`bus_approval_event` 及对应索引与关系。
	2. 新增 `src/modules/project/*`，建立统一阶段类型、迁移策略、repository、service 骨架。
	3. 新增 `src/modules/approval/*`，建立统一审批类型、repository、service 骨架。
	4. 将 `src/app/api/biddings/approvals/route.ts` 中的 `bid_initiation` 从“直接改项目字段”切换为“正式审批单 + 项目状态机服务”。
	5. 新增 `src/db/migrations/add-project-stage-and-approval-tables.ts` 作为 Batch A 建表迁移脚本。
	6. 新增状态机服务单元测试、审批服务单元测试、投标审批 API 测试。
- 验证结果：
	1. `corepack pnpm exec tsc -p tsconfig.json --noEmit` 通过。
	2. `corepack pnpm exec vitest run tests/unit/project/project-stage-service.test.ts tests/unit/approval/approval-service.test.ts tests/api/projects/bidding-approvals.test.ts` 通过，3 个测试文件、6 条用例全部通过。
- 与计划一致性：
	1. 与 Slice 1 最小验收一致：新迁移通过统一状态机服务并写入阶段迁移历史。
	2. 与 Slice 2 最小验收一致：投标立项审批不再使用 route 内临时 `index + 1` 伪记录，不再直接以提交审批等同阶段变更。
- 残余风险：
	1. Batch A 对应的历史 SQL 已完成 migration history 基线登记；legacy `scheme` 退场 SQL `007_drop_legacy_scheme_tables.sql` 已在真实数据库执行并登记为 `applied`。
	2. `bid_price`、`bid_document` 仍是兼容处理，未纳入统一审批骨架。
	3. 当时待后续实施的方案评审、仪表盘与身份生命周期治理已在后续批次完成；当前第三阶段代码侧主收敛任务已关闭。
- 后续建议：
	1. 当前后续重点已从第三阶段代码收敛切换到人工审核、发布窗口确认与稳定观察项关闭。

	## Batch B 执行记录

	### 本批次实际完成项

	1. `solution review` 创建与提交链路已接入统一审批实体，新增 `src/modules/solution/solution-review-approval-adapter.ts` 负责桥接 `bus_solution_review` 与 `approval_request/approval_step/approval_event`。
	2. `src/services/solution-review.service.ts` 不再直接承担方案评审审批事实写入，而是改为委托统一审批桥接层执行。
	3. 新建方案评审时，若方案关联项目且项目处于 `bidding`，提交评审将把项目推进到 `solution_review`。
	4. 最终评审通过时，若项目处于 `solution_review`，项目推进到 `contract_pending`；最终评审驳回或要求修订时，项目回退到 `bidding`。
	5. 对历史未接入统一审批的待评审记录，提交时补建正式审批单并写入提交事件，避免旧待办直接失效。

	### 本批次验证要求

	1. 增加方案评审统一审批桥接单元测试。
	2. 增加方案评审 API 路由回归测试，确认 URL 不变且内部继续通过服务边界转发。
	3. 执行 TypeScript typecheck 与 Batch A/B 相关聚焦测试。

	### 本批次验证结果

	1. `corepack pnpm exec tsc -p tsconfig.json --noEmit` 已通过。
	2. `corepack pnpm exec vitest run tests/unit/approval/approval-service.test.ts tests/unit/project/project-stage-service.test.ts tests/unit/solution/solution-review-approval-adapter.test.ts tests/api/projects/bidding-approvals.test.ts tests/api/solutions/solution-reviews.test.ts` 已通过。
	3. 当前 Batch A + Batch B 聚焦验证共 5 个测试文件、10 个测试全部通过。

	### 本批次后剩余事项

	1. 仪表盘和统计仍未切到 `solution` 主口径，属于 Batch C 之后继续处理的范围。
	2. 方案列表/详情接口尚未显式暴露审批单视图模型，当前仍以兼容字段返回为主。

## Batch C 执行记录

### 本批次实际完成项

1. 新增 `src/modules/dashboard/dashboard-metric-service.ts`，统一 `totalCustomers`、`totalProjects`、`totalSolutions`、`pendingTasks` 与 `projectsByStage` 的统计口径。
2. `src/app/api/dashboard/route.ts` 已切换到统一指标服务，不再以 `scheme` 作为主方案统计来源，并新增 `projectsByStage` 与 `totalSolutions` 返回字段。
3. `src/app/api/dashboard/stats/route.ts` 已切换到统一指标服务，保留 `totalSchemes` 兼容别名，同时返回 `totalSolutions`、`projectsByStage` 与 `pendingTasks`。
4. `src/services/query-service.ts` 中旧的项目进行中统计已改为基于 `projectStage` 的统一口径，并补充 `solutions` 统计出口。

### 本批次验证结果

1. `corepack pnpm exec tsc -p tsconfig.json --noEmit` 已通过。
2. `corepack pnpm exec vitest run tests/unit/project/project-stage-service.test.ts tests/unit/approval/approval-service.test.ts tests/unit/solution/solution-review-approval-adapter.test.ts tests/unit/dashboard/dashboard-metric-service.test.ts tests/api/projects/bidding-approvals.test.ts tests/api/solutions/solution-reviews.test.ts tests/api/dashboard/dashboard-route.test.ts tests/api/dashboard/dashboard-stats-route.test.ts` 已通过。
3. 当前 Batch A + Batch B + Batch C 聚焦验证共 8 个测试文件、13 个测试全部通过。

### 本批次后剩余事项

1. 第三阶段仅剩 Slice 5 身份生命周期治理待落地。
2. 数据大屏与历史统计链路已收敛为 `totalSolutions` 主口径；仅保留 `totalSchemes` 兼容别名以承接历史调用，后续重点转为文档和证据口径清理。

## Batch D 执行记录

### 本批次实际完成项

1. `sys_user` 已补充 `must_change_password`、`password_changed_at`、`password_reset_at`、`password_reset_by` 生命周期字段，并新增对应迁移脚本。
2. 新增 `src/modules/identity/password-lifecycle-service.ts`，统一处理首次改密、管理员重置密码、本人修改密码与审计写入。
3. `src/app/api/staff/route.ts` 已切换到账号生命周期规则：新建账号默认要求首次改密，管理员设置新密码时自动标记为强制改密。
4. 新增 `src/app/api/auth/change-password/route.ts`，用于当前登录用户完成首次改密或日常改密。
5. `src/app/api/auth/login/route.ts` 与 `src/app/api/auth/me/route.ts` 已返回 `mustChangePassword` 等生命周期字段，供前端后续引导改密使用。
6. `src/app/settings/users/page.tsx` 已补充密码生命周期提示文案，避免管理员误以为重置密码等于直接生效完成。

### 本批次验证结果

1. `corepack pnpm exec tsc -p tsconfig.json --noEmit` 已通过。
2. `corepack pnpm exec vitest run tests/unit/project/project-stage-service.test.ts tests/unit/approval/approval-service.test.ts tests/unit/solution/solution-review-approval-adapter.test.ts tests/unit/dashboard/dashboard-metric-service.test.ts tests/api/projects/bidding-approvals.test.ts tests/api/solutions/solution-reviews.test.ts tests/api/dashboard/dashboard-route.test.ts tests/api/dashboard/dashboard-stats-route.test.ts tests/api/identity/password-change.test.ts tests/api/identity/staff-password-lifecycle.test.ts` 已通过。
3. 当前 Phase 3 聚焦验证共 10 个测试文件、16 个测试全部通过。

## 第三阶段完成结论

截至本轮执行，第三阶段 Slice 1 到 Slice 5 已全部落地并完成对应聚焦验证：

1. 项目主链路已通过统一状态机服务推进。
2. 投标立项与方案评审已接入统一审批实体。
3. `solution` 已成为方案主流程的主统计来源，旧 `scheme` 仅保留兼容别名或历史读取责任。
4. 仪表盘主要指标已切换到统一口径，并补充了样例回归测试。
5. 身份生命周期已具备最小可用治理边界：创建账号、管理员重置密码、本人改密、生命周期标记与审计链路。

第三阶段可以视为完成，后续应进入第四阶段的测试体系、发布体系与运维硬化。
