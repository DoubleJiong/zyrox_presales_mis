# 数据大屏业务验收脚本

日期：2026-04-06

适用范围：`/data-screen` 经营驾驶舱 Task 8 第一刀

关联文档：

1. `docs/plans/2026-04-05-data-screen-optimization-plan.md`
2. `docs/plans/2026-04-05-data-screen-phase-2-execution-checklist.md`
3. `docs/plans/2026-04-06-data-screen-metric-reconciliation-record.md`
4. `docs/plans/2026-04-06-data-screen-issue-ledger.md`
5. `docs/plans/2026-04-06-data-screen-release-readiness-brief.md`
6. `docs/plans/2026-04-06-data-screen-data-remediation-backlog.md`
7. `docs/plans/2026-04-06-data-screen-business-remediation-walkthrough-list.md`
8. `docs/plans/2026-04-06-data-screen-remediation-verification-template.md`
9. `docs/plans/2026-04-06-data-screen-business-signoff-minutes-draft.md`
10. `docs/plans/2026-04-06-data-screen-screenshot-evidence-checklist.md`

## 1. 目标

本脚本用于把当前 `/data-screen` 的技术通过，转化为业务侧可签字、可复核、可追责的验收过程。

本轮脚本不再验证“页面能打开”，而是验证：

1. 管理层、销售负责人、售前负责人三类角色的首屏是否真的回答了各自最关心的问题。
2. 首屏卡片、角色面板、钻取入口与接口口径是否一致。
3. 正式运行路径是否以最新 webpack 产物 `.next/BUILD_ID=h2ldgb7X394AARaJg-WCT` 为准，而不是只依赖 current-source 临时验证。

## 2. 验收原则

1. 每个结论至少要有页面表现、接口响应、自动化结果三层证据中的两层支撑。
2. 角色视图验收只验证“默认编排与默认关注对象”是否正确，不把它误判为“数据权限已经改变”。
3. 若发现差异，必须分类为页面编排、接口口径、权限范围、样本数据、业务定义五类之一，不能只写“异常”。
4. 所有正式结论以 `next start -p 5004` 对应的最新 webpack 产物为准。

## 3. 当前正式证据基线

本轮业务验收默认建立在以下技术证据之上：

1. webpack 正式产物：`.next/BUILD_ID=QtQJ7V2Xl8fJVkIswY6tx`
2. 正式运行口径：`next start -p 5004`
3. 统一门禁结果：`verify:acceptance:5004 = 41 passed (1.6m)`
4. focused 浏览器规格：`tests/e2e/playwright/data-screen-formal.spec.ts` 已覆盖角色视图切换、预测、风险、漏斗、drill-through 与 repeated switching 稳定性回归
5. focused API 规格：`tests/api/data-screen/overview-route.test.ts` 与 `tests/api/data-screen/presales-focus-summary-route.test.ts` 已覆盖经营漏斗与售前负责人专属读模型

其中 repeated switching 稳定性回归明确覆盖：

1. 反复切换“浙江省 / 全国”
2. 反复切换热力图维度
3. 页面不应跳入全局错误页

## 4. 管理层验收脚本

### 4.1 验收问题

管理层打开页面后，第一屏必须能快速回答：

1. 目标是否覆盖。
2. 区域贡献是否集中。
3. 是否存在需要经营干预的高风险项目。

### 4.2 操作步骤

1. 使用管理员或管理层账号打开 `/data-screen`。
2. 确认当前视图预设显示为“管理层视图”。
3. 记录管理层经营总览面板中的客户总数、项目总数、中标项目、覆盖率。
4. 记录“目标与预测”卡中的目标基线、预测完成、覆盖率、预测缺口。
5. 记录“风险摘要”卡中的高风险数量、总风险数量。
6. 记录管理层面板中的区域金额贡献 TOP3。
7. 点击“查看在手机会”，确认能进入 `/projects?stage=opportunity`。

### 4.3 通过标准

1. 管理层面板默认可见，无需手动切预设。
2. 覆盖率、预测缺口与 `forecastSummary` API 返回一致。
3. 区域金额贡献 TOP3 与 `overview.topRevenueRegions` 一致。
4. 风险总量与 `riskSummary.total` 一致。
5. drill-through 跳转进入 canonical 项目页，而不是临时详情页。

## 5. 销售负责人验收脚本

### 5.1 验收问题

销售负责人打开页面后，第一屏必须能快速回答：

1. 当前机会盘是否够大。
2. 商机热区集中在哪些区域。
3. 下一步更应该补盘子还是压风险。

### 5.2 操作步骤

1. 打开 `/data-screen` 后切换到“经营负责人视图”。
2. 确认经营负责人视图面板出现。
3. 确认左侧默认激活 tab 为“客户数据”，而不是旧的“售前数据”。
4. 记录经营负责人视图中的在手机会、敞口金额、平均赢率、本周到期数量。
5. 记录是否出现“未填赢率机会数”提示，以及对应数量。
6. 记录“当前最大盘子阶段”和商机热区 TOP3。
7. 对照 `overview.funnel`、`riskSummary`、`topRegions` 返回值确认一致。
8. 点击“查看在手机会”与“查看投标推进”，确认跳转路径正确。

### 5.3 通过标准

1. 切换到经营负责人预设后，专属面板可见。
2. 默认 tab 为 `customers`，与当前预设配置一致。
3. 在手机会、敞口金额、平均赢率与 `overview.funnel` 一致。
4. 如存在未填赢率机会，应显示显性提示，且数量与 `overview.funnel.missingWinProbabilityCount` 一致。
5. 商机热区 TOP3 与 `overview.topRegions` 一致。
6. 风险提醒数量与 `riskSummary` 一致。

## 6. 售前负责人验收脚本

### 6.1 验收问题

售前负责人打开页面后，第一屏必须能快速回答：

1. 当前支撑是否过载。
2. 活跃支撑项目和支撑类型分布是否清晰。
3. 方案复用覆盖率是否达到预期。

### 6.2 操作步骤

1. 打开 `/data-screen` 后切换到“售前负责人视图”。
2. 确认售前负责人面板出现。
3. 确认默认激活 tab 为“售前数据”。
4. 记录总支撑工时、活跃支撑项目数、过载成员数、方案复用覆盖率。
5. 记录是否出现“未填工时记录数”提示，以及对应数量。
6. 记录成员负载 TOP 和支撑类型分布。
7. 点击“查看人员管理”，确认跳转到 `/staff`。
8. 对照 `/api/data-screen/presales-focus-summary` 返回值确认一致。

### 6.3 通过标准

1. 切换售前负责人预设后，专属面板可见。
2. 总支撑工时、活跃支撑项目、过载成员与专属读模型一致。
3. 如存在未填工时记录，应显示显性提示，且数量与 `summary.missingWorklogRecordCount` 一致。
4. 支撑类型分布和方案复用覆盖率与专属读模型一致。
5. 人员管理入口进入 canonical `/staff` 页面。

## 7. 统一记录要求

每次业务验收都至少记录以下字段：

1. 验收日期
2. 验收角色
3. 验收账号
4. 运行环境
5. BUILD_ID
6. 关键页面现象
7. 对照接口字段
8. 判定结果
9. 差异编号

建议优先使用 `docs/plans/2026-04-06-data-screen-remediation-verification-template.md` 留存“补录前 / 补录后 / 页面 / 接口 / 数据库”五联证据，再结合 `docs/plans/2026-04-06-data-screen-screenshot-evidence-checklist.md` 补齐页面截图证据，最后进入签字环节。

## 8. 当前结论

1. 三类角色的验收脚本已具备可执行版本，可以直接用于业务陪跑。
2. 当前脚本依赖的技术基线已在正式产物 `.next/BUILD_ID=h2ldgb7X394AARaJg-WCT` 上通过。
3. 下一步不再是补脚本，而是基于真实业务账号和真实样本填写补录复验记录、问题台账和签字纪要。