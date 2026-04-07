# 数据大屏指标对账记录

日期：2026-04-06

关联脚本：`docs/plans/2026-04-06-data-screen-business-acceptance-scripts.md`

## 1. 记录说明

本记录用于承接 Task 8 中“按真实样本校验区域、行业、团队、阶段、金额等关键口径”的落地结果。

当前先建立正式模板和第一批技术基线，不伪造真实业务样本结论。

## 2. 当前技术基线

| 项目 | 当前值 | 说明 |
| --- | --- | --- |
| BUILD_ID | `h2ldgb7X394AARaJg-WCT` | 当前 5004 对应正式产物 |
| formal runtime | `http://localhost:5004` | `next start -p 5004` |
| 统一门禁 | `41 passed (1.6m)` | `verify:acceptance:5004`，已包含数据大屏反复切换稳定性回归 |
| focused cockpit spec | 通过 | `tests/e2e/playwright/data-screen-formal.spec.ts` |
| overview API spec | 通过 `1/1` | `tests/api/data-screen/overview-route.test.ts` |
| presales-focus API spec | 通过 `2/2` | `tests/api/data-screen/presales-focus-summary-route.test.ts` |

## 3. 关键口径对账表

| 编号 | 口径项 | 页面位置 | 接口来源 | 当前技术基线 | 真实业务样本结论 | 判定 | 备注 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| DS-RC-01 | 管理层覆盖率 | 管理层经营总览 + 目标与预测 | `/api/data-screen/overview` -> `forecastSummary.coverageRate` | 已通过 formal E2E 对齐 | 待业务填充 | 待确认 | 需结合月度/季度目标样本复核 |
| DS-RC-02 | 区域金额贡献 TOP3 | 管理层经营总览 | `/api/data-screen/overview` -> `topRevenueRegions` | 已通过 formal E2E 对齐 | 待业务填充 | 待确认 | 建议抽 3 个高金额区域样本 |
| DS-RC-03 | 在手机会/敞口金额 | 经营负责人视图 | `/api/data-screen/overview` -> `funnel` | 已通过 formal E2E 对齐 | 待业务填充 | 待确认 | 当前需同时核对 `missingWinProbabilityCount` |
| DS-RC-04 | 风险总量 | 风险摘要 | `/api/data-screen/overview` -> `riskSummary.total` | 已通过 formal E2E 对齐 | 待业务填充 | 待确认 | 需确认风险样本是否符合业务优先级 |
| DS-RC-05 | 总支撑工时 | 售前负责人视图 | `/api/data-screen/presales-focus-summary` -> `summary.totalSupportHours` | 已通过 API + formal E2E | 待业务填充 | 待确认 | 当前需同时核对 `missingWorklogRecordCount` |
| DS-RC-06 | 活跃支撑项目 | 售前负责人视图 | `/api/data-screen/presales-focus-summary` -> `summary.activeSupportProjects` | 已通过 API + formal E2E | 待业务填充 | 待确认 | 需确认 active 项目范围定义 |
| DS-RC-07 | 方案复用覆盖率 | 售前负责人视图 | `/api/data-screen/presales-focus-summary` -> `summary.solutionReuseCoverageRate` | 已通过 API + formal E2E | 待业务填充 | 待确认 | 需和方案使用记录抽样复核 |
| DS-RC-08 | 未填赢率机会数 | 经营负责人视图告警 | `/api/data-screen/overview` -> `funnel.missingWinProbabilityCount` | 已通过 formal 快照复核 | 待业务填充 | 待确认 | 当前 formal 快照为 `336` |
| DS-RC-09 | 未填工时记录数 | 售前负责人视图告警 | `/api/data-screen/presales-focus-summary` -> `summary.missingWorklogRecordCount` | 已通过 formal 快照复核 | 待业务填充 | 待确认 | 当前 formal 快照为 `0` |

## 4. 真实样本建议

建议业务陪跑时至少补齐以下样本组：

1. 管理层区域贡献样本 3 组
2. 经营负责人高金额机会样本 3 组
3. 经营负责人临期风险样本 3 组
4. 售前负责人高工时支撑样本 3 组
5. 售前负责人高复用率方案样本 3 组

## 5. 当前结论

1. 技术基线已经满足“可以开始业务对账”，不再受 build 或 formal runtime 阻塞。
2. 真实业务样本结论尚未填写，因此本记录当前状态是“模板已建立、待业务陪跑补证”。

## 5.1 2026-04-07 追认基线

在 `BUILD_ID=h2ldgb7X394AARaJg-WCT` 的当前 5004 正式运行时上，已补充完成一轮重新验收：

1. `/api/health` 返回 `200 alive`，formal runtime 当前可直接用于业务陪跑。
2. `verify:acceptance:5004` 最新结果为 `41 passed (1.6m)`。
3. 新增稳定性回归已纳入 `tests/e2e/playwright/data-screen-formal.spec.ts`：
	- 反复切换“浙江省 / 全国”
	- 反复切换热力图维度
4. 当前技术口径可确认：数据大屏此前的切换挂页问题已纳入正式自动化门禁，不再仅依赖人工点测。

## 6. 首轮陪跑基线补充

基于正式运行时 `2026-03-07` 至 `2026-04-06` 的首轮快照，当前已补入以下基线：

1. 管理层覆盖率 = `290%`
2. 管理层目标基线 = `¥6266万`
3. 管理层预测完成 = `¥18190万`
4. 经营负责人在手机会 = `358`
5. 经营负责人敞口金额 = `¥35676.7万`
6. 经营负责人未填赢率机会数 = `336`
7. 售前负责人活跃支撑项目 = `1`
8. 售前负责人总支撑工时 = `18h`
9. 售前负责人未填工时记录数 = `0`

对应的首轮与二轮陪跑记录已分别落在：`docs/plans/2026-04-06-data-screen-business-acceptance-round1-record.md` 与 `docs/plans/2026-04-06-data-screen-business-acceptance-round2-record.md`
