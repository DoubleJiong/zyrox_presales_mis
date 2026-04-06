# 数据大屏 Task 8 页面截图证据记录

日期：2026-04-06

生成时间：2026-04-06 17:29:28

取证环境：formal http://localhost:5004

BUILD_ID：QtQJ7V2Xl8fJVkIswY6tx

取证账号：admin@zhengyuan.com（JWT 签发会话）

说明：浏览器自动化截图无法包含原生地址栏，因此本次取证在页面右下角注入了路径条，作为 drill-through 落点留痕。

## 1. 关键指标快照

1. 经营漏斗：在手机会 358，敞口金额 356766580，平均赢率 68%，加权合同池 213313406，缺失赢率计数 336。
2. 售前汇总：总支撑工时 18，活跃支撑项目 1，缺失工时记录 0。

## 2. 截图清单

| 编号 | 内容 | 页面路径 | 文件 | 取证焦点 |
| --- | --- | --- | --- | --- |
| SS-01 | 管理层默认首屏总览 | /data-screen | docs/plans/evidence/2026-04-06-task8-data-screen/ss-01-management-overview.png | 经营总览、目标与预测、风险摘要 |
| SS-02 | 管理层区域金额贡献 TOP3 | /data-screen | docs/plans/evidence/2026-04-06-task8-data-screen/ss-02-management-top3.png | 证明当前展示为金额榜而非热点榜 |
| SS-03 | 经营负责人首屏整卡 | /data-screen | docs/plans/evidence/2026-04-06-task8-data-screen/ss-03-business-overview.png | 在手机会、敞口金额、平均赢率、本周到期 |
| SS-04 | 经营负责人漏斗与风险区域 | /data-screen | docs/plans/evidence/2026-04-06-task8-data-screen/ss-04-business-funnel-risk.png | missingWinProbabilityCount=336 与 weightedPipeline=213313406 |
| SS-05 | 经营负责人钻取项目页 | /projects?stage=opportunity | docs/plans/evidence/2026-04-06-task8-data-screen/ss-05-projects-drillthrough.png | 证明 drill-through 进入 canonical 项目页 |
| SS-06 | 售前负责人首屏整卡 | /data-screen | docs/plans/evidence/2026-04-06-task8-data-screen/ss-06-presales-overview.png | 总支撑工时=18，活跃支撑项目=1 |
| SS-07 | 售前负责人工时提示区域 | /data-screen | docs/plans/evidence/2026-04-06-task8-data-screen/ss-07-presales-worklog-hint.png | missingWorklogRecordCount=0 |
| SS-08 | 售前负责人钻取人员页 | /staff | docs/plans/evidence/2026-04-06-task8-data-screen/ss-08-staff-drillthrough.png | 证明人员管理入口进入 canonical /staff |
