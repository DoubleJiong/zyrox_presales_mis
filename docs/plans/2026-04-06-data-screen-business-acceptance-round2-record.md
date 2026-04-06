# 数据大屏第二轮业务陪跑记录

日期：2026-04-06

关联脚本：`docs/plans/2026-04-06-data-screen-business-acceptance-scripts.md`

关联首轮记录：`docs/plans/2026-04-06-data-screen-business-acceptance-round1-record.md`

## 1. 记录边界

本记录用于承接 Task 8 第三刀后的 refreshed formal 基线。

本轮目标不是替代真实业务签字，而是确认三类误导性展示风险已经进入正式产物，并在 formal runtime 上具备最新可复验基线。

本记录依据以下正式基线生成：

1. BUILD_ID：`QtQJ7V2Xl8fJVkIswY6tx`
2. 运行口径：`next start -p 5004`
3. 统计区间：`2026-03-07` 至 `2026-04-06`
4. 数据来源：`/api/data-screen/overview` 与 `/api/data-screen/presales-focus-summary`
5. 技术门禁：`verify:acceptance:5004 = 40 passed (1.7m)`

## 2. 管理层第二轮记录

### 2.1 首屏读数

| 指标 | 当前值 | 对应来源 |
| --- | ---: | --- |
| 客户总数 | 372 | `overview.data.totalCustomers` |
| 项目总数 | 504 | `overview.data.totalProjects` |
| 中标项目 | 69 | `overview.data.wonProjects` |
| 覆盖率 | 290% | `forecastSummary.coverageRate` |
| 目标基线 | ¥6266万 | `forecastSummary.targetAmount` |
| 预测完成 | ¥18190万 | `forecastSummary.forecastAmount` |
| 预测缺口 | ¥0.0万 | `forecastSummary.gapAmount` |
| 风险总量 | 0 | `riskSummary.total` |

### 2.2 区域金额贡献观察

当前 `topRevenueRegions` 返回前 3 位如下：

| 排名 | 区域 | 热点值 | 金额 |
| --- | --- | ---: | ---: |
| 1 | 河南 | 21 | ¥17457.6万 |
| 2 | 杭州市 | 3 | ¥11281.1万 |
| 3 | 黑龙江 | 22 | ¥6700.0万 |

### 2.3 第二轮判定

1. 管理层“区域贡献”已不再复用热点榜，而是使用按金额排序的专属榜单。
2. 当前 formal 结果证明该语义修正已进入正式产物，不再只是 current-source 修正。
3. 后续业务陪跑应重点确认这组金额贡献区域是否符合经营认知，而不是再确认排序实现本身。

## 3. 经营负责人第二轮记录

### 3.1 首屏读数

| 指标 | 当前值 | 对应来源 |
| --- | ---: | --- |
| 在手机会 | 358 | `funnel.totalOpenCount` |
| 敞口金额 | ¥35676.7万 | `funnel.totalOpenAmount` |
| 平均赢率 | 0% | `funnel.avgWinProbability` |
| 加权合同池 | ¥0.0万 | `funnel.weightedPipeline` |
| 未填赢率机会数 | 358 | `funnel.missingWinProbabilityCount` |
| 本周到期 | 0 | `riskSummary.dueThisWeek` |
| 最大盘子阶段 | 需求确认 | `funnel.stages` 最大 amount |

### 3.2 第二轮判定

1. 当前 `0%` 平均赢率与 `0` 加权合同池已被解释为“358 条在手机会未填赢率，按 0 计入”，不再是静默误导。
2. 数据库复核进一步确认，这 `358` 条缺口并不是已有商机记录上的 `winProbability=null`，而是整体缺失 `bus_project_opportunity` 行；其中 `356` 条按当前项目阶段落入 `qualified`，`2` 条落入 `negotiation`。
3. 下一步业务对账应优先补录商机子表，再补赢率字段；当前高金额缺口项目集中在河南、重庆、温台、海南、四川等区域。

## 4. 售前负责人第二轮记录

### 4.1 首屏读数

| 指标 | 当前值 | 对应来源 |
| --- | ---: | --- |
| 总支撑工时 | 0h | `summary.totalSupportHours` |
| 活跃支撑项目 | 1 | `summary.activeSupportProjects` |
| 过载成员 | 0 | `summary.overloadedStaffCount` |
| 活跃支撑类型 | 2 | `summary.activeServiceTypes` |
| 方案复用覆盖率 | 0% | `summary.solutionReuseCoverageRate` |
| 未填工时记录数 | 2 | `summary.missingWorklogRecordCount` |

### 4.2 第二轮判定

1. 当前 `0h` 已被解释为“存在 2 条未填工时记录”，不再被误读为无支撑负载。
2. 数据库复核进一步确认，这 `2` 条缺口都集中在 `智慧校园平台建设`，对应售前服务分别为“需求调研与分析”“方案设计与编写”，责任人分别为张伟、李芳。
3. 业务陪跑时应优先核对该项目的两条售前服务记录是否漏填了工时与服务日期。

## 5. 第二轮结论

1. 三类误导性展示风险均已进入 refreshed formal 产物 `QtQJ7V2Xl8fJVkIswY6tx`。
2. 最新 unified formal gate 已再次通过 `40 passed (1.7m)`，说明这些修正没有破坏 release-path 稳定性。
3. Task 8 后续剩余事项已收敛为真实业务账号陪跑、按补录清单修复源数据和签字留档，而不是继续做大屏代码修补。