# 2026-04-04 Bug 修复闭环人工审核简报

日期：2026-04-04

用途：作为人工审核入口材料，帮助审核人快速确认“当前哪些问题已关闭、哪些事项仍需人工签字确认”。

## 1. 当前一句话结论

首轮问题清单中的主链问题已完成代码修复、数据库收口与自动化回归，当前可以进入人工审核；剩余事项主要是“真实角色权限复核”和“正式发布后稳定观察关闭”。

## 2. 已完成的闭环事项

1. 安全与会话主问题已关闭：数据库连接改为环境变量、测试后门收口、query token 退出、黑名单链路收口、登录与 SSE 会话规则统一。
2. 项目主链已收敛：`projectStage` 作为生命周期主链，`bidResult` 作为招投标事实源，`status` 仅保留兼容展示责任。
3. 审批与状态机已收敛：投标立项审批不再直接改阶段，方案评审已接入统一审批骨架，并与项目阶段联动。
4. 方案主模型已收敛：运行态统计和权限口径均以 `solution` 为主，legacy `scheme` 已从数据库物理退场。
5. 迁移执行链路已补齐：仓库已具备 `db:migrate:list`、`db:migrate -- --baseline-through`、只读 preflight、定向备份和定向 destructive migration 能力。
6. 文档与交付口径已同步：启动、迁移、发布、回滚、备份恢复文档均已改为真实仓库入口。

## 3. 本轮关键验证结果

1. `verify:pr` 已再次通过：18 个单测文件、46 条单测全部通过；24 个 API 测试文件、57 条 API 测试全部通过。
2. 正式 `next build --webpack` 已恢复，并重新生成 `.next/BUILD_ID`。
3. `5004` 正式实例上 `tests/e2e/playwright/stability-sweep.spec.ts` 已通过 `39/39`。
4. 当前数据库中 `001` 到 `007` 编号 SQL 迁移均已登记为 `applied`。
5. legacy `bus_scheme`、`bus_scheme_file`、`bus_scheme_template` 已完成 preflight、定向 JSON 备份和物理删表。

## 4. 建议人工审核路径

1. 权限复核：以管理员、普通用户、审批相关角色分别登录，确认项目列表、客户、方案、设置页、人员页可见范围符合预期。
2. 主链抽样：抽审客户、项目、解决方案、招投标、归档、人员管理各 1 至 2 条样本，确认页面行为与业务预期一致。
3. 数据与迁移复核：核对 migration list 全为 `applied`，并确认 legacy 备份产物存在。
4. 证据复核：结合 `5004` 正式实例验收记录，确认 `39/39` 稳定性扫雷与当前交付结论一致。

## 5. 当前仍保留为人工项的内容

1. 真实角色环境人工复核尚未执行，因此“零越权风险”仍需人工签字确认。
2. 正式发布时间、值守安排、观察窗口责任人仍需在发布评审中明确。
3. 发布后稳定观察期尚未关闭，因此当前结论是“可进入人工审核”，不是“观察期已完成”。
4. 项目阶段回退能力暂不进入本轮实现。当前待决策项为：是否为系统管理员、售前主管引入“受控阶段回退/特批纠偏”能力。该事项已识别为“误操作纠偏需求 + 状态机权限边界问题”，后续如继续推进，应按“阶段回退能力独立授权、强制填写原因、保留审计记录、禁止已归档/已取消项目直接回开”的口径单独设计与实施。

## 6. 审核入口文档

1. 总问题台账：[ISSUE_SUMMARY_v1.md](ISSUE_SUMMARY_v1.md)
2. 发布与回滚手册：[docs/plans/2026-03-29-release-rollback-and-recovery-runbook.md](docs/plans/2026-03-29-release-rollback-and-recovery-runbook.md)
3. 第三阶段切片收口记录：[docs/plans/2026-03-29-phase-3-refactor-slice-plan.md](docs/plans/2026-03-29-phase-3-refactor-slice-plan.md)
4. 正式投产评审材料：[docs/plans/2026-03-29-phase-5-production-go-live-review-record.md](docs/plans/2026-03-29-phase-5-production-go-live-review-record.md)
5. 权限边界验证记录：[docs/plans/2026-03-29-phase-5-permission-boundary-validation-record.md](docs/plans/2026-03-29-phase-5-permission-boundary-validation-record.md)

## 7. 审核结论建议口径

建议在人工审核记录中使用如下结论口径：

“当前版本已完成首轮问题清单主链问题的代码修复、数据库收口与自动化回归，准许进入人工审核。若真实角色权限复核和发布窗口确认通过，则可进入正式发布与稳定观察阶段。”