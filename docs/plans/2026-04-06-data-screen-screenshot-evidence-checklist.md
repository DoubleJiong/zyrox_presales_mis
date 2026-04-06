# 数据大屏页面截图补证清单

日期：2026-04-06

用途：Task 8 在 formal 数据已补录、API 指标已恢复后，补齐业务签字所需的页面层证据。

关联文档：

1. `docs/plans/2026-04-06-data-screen-remediation-verification-round1-draft.md`
2. `docs/plans/2026-04-06-data-screen-business-signoff-minutes-draft.md`
3. `docs/plans/2026-04-06-data-screen-release-readiness-brief.md`

## 1. 当前页面证据状态

截至 2026-04-06 16:59，formal 数据库、formal API、`verify:acceptance:5004` 与页面截图证据已形成闭环。Task 8 所需 `SS-01` 至 `SS-08` 已全部自动采集完成，当前页面层证据不再缺失。

本清单当前用途已从“待补截图”切换为“截图落档索引”。

## 2. 必补截图

### 2.1 管理层视图

| 编号 | 页面位置 | 截图内容 | 通过标准 |
| --- | --- | --- | --- |
| SS-01 | `/data-screen` 管理层默认首屏 | 管理层经营总览面板 + 目标与预测 + 风险摘要 | 能看清当前 `覆盖率`、`预测完成`、`风险总量` |
| SS-02 | `/data-screen` 管理层面板 | `区域金额贡献 TOP3` | 能证明当前用的是金额榜，而不是热点榜 |

### 2.2 经营负责人视图

| 编号 | 页面位置 | 截图内容 | 通过标准 |
| --- | --- | --- | --- |
| SS-03 | `/data-screen` 经营负责人首屏 | 经营负责人面板整卡 | 能看清 `在手机会`、`敞口金额`、`平均赢率`、`本周到期` |
| SS-04 | `/data-screen` 经营负责人首屏 | 漏斗 / 风险区域，包含当前警示 | 能看清 `missingWinProbabilityCount=336` 已不再是 358，且加权合同池为正值 |
| SS-05 | `/projects?stage=opportunity` | 由驾驶舱 drill-through 后的落点页 | 能证明跳转仍然进入 canonical 项目页 |

### 2.3 售前负责人视图

| 编号 | 页面位置 | 截图内容 | 通过标准 |
| --- | --- | --- | --- |
| SS-06 | `/data-screen` 售前负责人首屏 | 售前负责人面板整卡 | 能看清 `总支撑工时=18h`、`活跃支撑项目=1` |
| SS-07 | `/data-screen` 售前负责人首屏 | 工时提示区域 | 能证明 `missingWorklogRecordCount` 已归零，不再显示缺口警示 |
| SS-08 | `/staff` | 由驾驶舱 drill-through 后的落点页 | 能证明人员管理入口仍进入 canonical `/staff` |

## 3. 截图执行规则

1. 所有截图均基于 formal 环境 `next start -p 5004`。
2. 默认使用 `admin@zhengyuan.com` 登录取证，保持和当前 formal API 验证口径一致。
3. 本轮自动化截图采用页面右下角路径条留痕，替代原生浏览器地址栏，以满足 drill-through 落点留档要求。
4. 若某张截图无法一次同时容纳关键读数和路径，可拆分为两张，但必须在记录中标明关联编号。

## 4. 本轮落档结果

| 编号 | 文件名 | 取证结果 |
| --- | --- | --- |
| SS-01 | `docs/plans/evidence/2026-04-06-task8-data-screen/ss-01-management-overview.png` | 已落档 |
| SS-02 | `docs/plans/evidence/2026-04-06-task8-data-screen/ss-02-management-top3.png` | 已落档 |
| SS-03 | `docs/plans/evidence/2026-04-06-task8-data-screen/ss-03-business-overview.png` | 已落档 |
| SS-04 | `docs/plans/evidence/2026-04-06-task8-data-screen/ss-04-business-funnel-risk.png` | 已落档 |
| SS-05 | `docs/plans/evidence/2026-04-06-task8-data-screen/ss-05-projects-drillthrough.png` | 已落档 |
| SS-06 | `docs/plans/evidence/2026-04-06-task8-data-screen/ss-06-presales-overview.png` | 已落档 |
| SS-07 | `docs/plans/evidence/2026-04-06-task8-data-screen/ss-07-presales-worklog-hint.png` | 已落档 |
| SS-08 | `docs/plans/evidence/2026-04-06-task8-data-screen/ss-08-staff-drillthrough.png` | 已落档 |

## 5. 取证后落档位置

1. 将截图编号和文件名补入 `docs/plans/2026-04-06-data-screen-remediation-verification-round1-draft.md`。
2. 在 `docs/plans/2026-04-06-data-screen-business-signoff-minutes-draft.md` 中引用关键截图编号。
3. 如截图暴露新的显示问题，再回写 `docs/plans/2026-04-06-data-screen-issue-ledger.md`。

## 6. 当前建议

1. `SS-01` 至 `SS-08` 已补齐，当前最优动作是进入业务签字纪要，而不是继续补页面证据。
2. 当前建议已经调整为“本轮先收口”，即直接基于现有截图档案进入签字评审，不再把第五批高金额样本作为本轮前置动作。
3. 若后续因数据治理专项再次截图，应沿用当前 formal 环境、管理员账号与路径条留痕规则，保持证据口径一致。