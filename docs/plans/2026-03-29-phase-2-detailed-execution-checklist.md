# 第二阶段详细执行清单

日期：2026-03-29

阶段名称：第二阶段 业务规则澄清与模型定版

目标：把当前系统从“代码猜业务”推进到“业务规则有统一定义、统一口径、统一命名、统一退出标准”的状态，为第三阶段领域重构与数据迁移提供唯一治理输入。

## 1. 治理来源

第二阶段执行以以下文档为准：

1. `docs/plans/2026-03-29-production-hardening-and-business-refactor-plan.md`
2. `docs/plans/2026-03-29-project-state-machine-and-approval-system-design.md`
3. `docs/plans/2026-03-29-permission-matrix-design.md`
4. `docs/plans/2026-03-29-role-dictionary-and-permission-naming-conventions.md`
5. `docs/plans/2026-03-29-project-state-and-approval-implementation-gap-analysis.md`

第二阶段新增定版文档：

1. `docs/plans/2026-03-29-business-glossary-and-master-data.md`
2. `docs/plans/2026-03-29-solution-model-convergence-strategy.md`
3. `docs/plans/2026-03-29-dashboard-metric-caliber-design.md`

## 2. 阶段边界

### 本阶段要做

1. 固化统一术语表与主数据边界
2. 固化项目状态机与审批模型的唯一设计来源
3. 固化方案主模型收敛策略
4. 固化权限矩阵与命名规范的实施边界
5. 固化仪表盘核心统计口径
6. 明确现有代码与目标模型之间的差距，为第三阶段重构切片

### 本阶段不做

1. 不直接重写项目、审批、方案主模块
2. 不在本阶段执行大规模数据库迁移
3. 不在本阶段大面积改 UI 或扩功能
4. 不把 Phase 3 的 service/repository 重构提前混入

## 3. 退出标准

阶段结束时，至少满足以下结果：

1. 有统一术语表
2. 有统一状态机
3. 有统一权限矩阵
4. 有统一统计口径文档
5. 有方案模型收敛策略
6. 有第三阶段重构切片和落地顺序

## 4. 交付物状态

| 编号 | 交付物 | 当前状态 | 说明 |
| --- | --- | --- | --- |
| P2-01 | 统一术语表与主数据边界 | 已建立 | 见 `2026-03-29-business-glossary-and-master-data.md` |
| P2-02 | 项目状态机设计 | 已建立 | 见 `2026-03-29-project-state-machine-and-approval-system-design.md` |
| P2-03 | 审批模型设计 | 已建立 | 见 `2026-03-29-project-state-machine-and-approval-system-design.md` |
| P2-03A | 状态机/审批实现偏差分析 | 已建立 | 见 `2026-03-29-project-state-and-approval-implementation-gap-analysis.md` |
| P2-04 | 权限矩阵 | 已建立 | 见 `2026-03-29-permission-matrix-design.md` |
| P2-05 | 角色字典与命名规范 | 已建立 | 见 `2026-03-29-role-dictionary-and-permission-naming-conventions.md` |
| P2-06 | 方案模型收敛策略 | 已建立 | 见 `2026-03-29-solution-model-convergence-strategy.md` |
| P2-07 | 仪表盘统计口径文档 | 已建立 | 见 `2026-03-29-dashboard-metric-caliber-design.md` |
| P2-08 | 第三阶段重构切片 | 已建立 | 见 `2026-03-29-phase-3-refactor-slice-plan.md` |

## 5. 任务拆分

### Task 1：统一术语表与主数据边界

目标：结束“同一概念多套名字、多张表、多种语义”状态。

执行要求：

1. 明确 `user_account`、`staff_profile`、`customer`、`lead`、`project`、`approval`、`solution` 的标准术语
2. 明确 `projectStage` 为业务主阶段字段，`status` 为兼容/技术字段的治理方向
3. 明确 `scheme` 为历史遗留模型，不再作为未来主资源名

验收：统一术语表文档完成并被后续文档引用。

### Task 2：固化状态机与审批设计的落地边界

目标：让项目流转和审批实体有唯一设计来源，而不是继续由 route 即时拼装。

执行要求：

1. 以 `2026-03-29-project-state-machine-and-approval-system-design.md` 作为唯一状态机来源
2. 明确当前代码中的主要偏差：
   - `src/app/api/biddings/approvals/route.ts` 仍以项目字段变更替代审批实体
   - `src/db/schema.ts` 中 `projects.status` 与 `projects.projectStage` 仍并存
   - `src/services/solution-review.service.ts` 仍以局部状态回写替代统一审批事件
3. 明确第三阶段应优先替换的接口与表结构边界

验收：状态机设计、审批设计和实现偏差形成统一结论，不再允许新增平行解释。

### Task 3：定版方案模型收敛策略

目标：结束 `scheme` 与 `solution` 双主模型并存。

执行要求：

1. 决定未来唯一主模型为 `solution`
2. 定义 `scheme` 的过渡定位和退出路径
3. 定义现有 dashboard、权限、评审、文件、模板能力如何向 `solution` 体系收敛

验收：方案模型收敛策略文档完成，并可作为 Phase 3 数据迁移前提。

### Task 4：定版仪表盘统计口径

目标：结束“接口能统计，但口径不可信”的状态。

执行要求：

1. 明确核心指标对象来源
2. 明确 self/global scope 的过滤规则
3. 明确项目指标使用 `projectStage` 还是 `status`
4. 明确方案指标使用 `solution` 还是 `scheme`
5. 明确任务、客户、审批指标的统计边界

验收：统计口径文档完成，并可用于 Phase 3 测试样例。

### Task 5：准备第三阶段重构切片

目标：把第二阶段结论转换成第三阶段可执行切片。

执行要求：

1. 给出模块顺序：项目 -> 审批 -> 方案 -> 仪表盘 -> 身份生命周期
2. 给出每个模块的“先替换什么、保留什么兼容层、何时允许迁移数据”
3. 给出最小重构切片和验收方式

验收：第三阶段切片说明完成。

### Task 6：补齐从当前状态到正式投产的剩余治理路线图

目标：明确除第二阶段、第三阶段剩余工作之外，到“已完成试运行并正式投产”为止还需要哪些阶段、门禁和交付物。

执行要求：

1. 明确第四阶段测试、发布、监控、运维硬化范围。
2. 明确第五阶段试运行、对账、正式投产范围。
3. 明确正式投产所需的业务、工程、安全、运维四类门禁。
4. 形成从当前状态到正式投产的全链路路线图。

验收：有完整剩余治理路线图，并有第四阶段、第五阶段与正式投产门禁文档。

## Task 5 执行记录

- 日期：2026-03-29
- 执行人：GitHub Copilot
- 目标：将第二阶段定版结论转换成第三阶段可执行切片和模块顺序
- 实际改动：新增 `docs/plans/2026-03-29-phase-3-refactor-slice-plan.md`；明确第三阶段顺序为“项目状态机服务 -> 统一审批实体 -> 方案评审与方案主模型接入统一审批 -> 仪表盘与统计口径切换 -> 身份生命周期治理”；为每个 slice 定义改动面、兼容层、数据迁移要求和最小验收
- 验证结果：文档与第二阶段术语表、状态机设计、方案模型收敛策略、统计口径设计保持一致；编辑器检查无错误
- 是否与上位计划一致：是
- 残余风险：第三阶段开始后仍需把每个 slice 进一步拆成可执行实现计划，尤其是审批实体表结构与状态机服务接口
- 是否可进入下一 Task：是

## Task 6 执行记录

- 日期：2026-03-29
- 执行人：GitHub Copilot
- 目标：回答“距离整个系统治理完成是否还有 Phase 2/3 之外的工作”，并将剩余工作规划到“已完成试运行并正式投产”为止
- 实际改动：新增 `docs/plans/2026-03-29-remaining-governance-roadmap-to-pilot-and-go-live.md`、`docs/plans/2026-03-29-phase-4-detailed-execution-checklist.md`、`docs/plans/2026-03-29-phase-5-trial-run-and-go-live-checklist.md`、`docs/plans/2026-03-29-production-acceptance-and-go-live-gates.md`；将剩余工作正式拆分为第二阶段收口、第三阶段实现、第四阶段工程硬化、第五阶段试运行与正式投产，以及最终门禁判定
- 验证结果：新增文档之间的阶段边界、依赖关系和退出标准保持一致；与第一阶段清单、第三阶段切片说明、总治理计划保持一致
- 是否与上位计划一致：是
- 残余风险：第四阶段和第五阶段仍是计划层成果，尚未进入实施；试运行前仍需先完成第二阶段退出评审和第三阶段核心重构
- 是否可进入下一 Task：是

## 6. 第二阶段入场结论

2026-03-29 结论：第二阶段已正式启动。

本次入场动作完成以下事项：

1. 确认第一阶段退出标准已满足
2. 确认第二阶段治理来源与边界
3. 建立第二阶段执行清单
4. 启动第二阶段首批交付物：术语表、方案模型收敛策略、统计口径文档
5. 固化状态机与审批设计相对现有代码的实现偏差分析

## 7. 第二阶段退出评审结论

2026-03-29 结论：第二阶段退出标准已满足，可以进入第三阶段 Batch A 实施。

本次退出评审依据：

1. 已建立统一术语表与主数据边界。
2. 已建立统一项目状态机与审批体系设计。
3. 已建立统一权限矩阵与角色命名规范。
4. 已建立统一仪表盘统计口径文档。
5. 已建立方案主模型收敛策略。
6. 已建立第三阶段重构切片与第四、第五阶段剩余治理路线图。

退出判定：

1. 第二阶段继续新增文档型任务的必要性已显著下降。
2. 后续重点应从“文档定版”切换到“第三阶段受控实现”。
3. 第三阶段首批允许进入的范围限定为 Batch A：项目状态机服务骨架与统一审批实体骨架。

残余风险：

1. `solution` 与 `scheme` 的主资源收敛、统计切换与 legacy 数据库退场已完成；当前只保留发布后观察项，不再保留方案双轨并行机制。
2. 审批实体建表、状态机接线与历史兼容验证已在第三阶段后续批次完成并通过回归。
3. 当前剩余事项已不再是第二阶段文档定版问题，而是人工审核确认与正式发布后稳定观察关闭。

