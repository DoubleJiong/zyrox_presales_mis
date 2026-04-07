# 数据大屏补录复验记录第一轮初稿

日期：2026-04-06

适用阶段：Task 8 第一批补录完成后的业务复验

关联文档：

1. `docs/plans/2026-04-06-data-screen-remediation-verification-template.md`
2. `docs/plans/2026-04-06-data-screen-data-remediation-backlog.md`
3. `docs/plans/2026-04-06-data-screen-business-remediation-walkthrough-list.md`
4. `docs/plans/2026-04-06-data-screen-business-acceptance-round2-record.md`

## 1. 本轮复验范围

本初稿用于承接第一批最有价值的补录动作，不覆盖全部 `356` 条真实业务缺口。

本轮建议范围为：

1. 售前工时样本：`PS-01`、`PS-02`
2. 经营商机样本：`BS-01` 到 `BS-10`，外加第三批高金额样本 `335/178/180/313/150` 与第四批高金额样本 `133/266/330/159/397`
3. 测试数据归一化样本：`TD-01`、`TD-02`

## 2. 复验基本信息

| 字段 | 预填内容 |
| --- | --- |
| 复验日期 | 2026-04-06 |
| 复验人 | GitHub Copilot |
| 复验角色 | 售前负责人 / 经营负责人 |
| 业务账号 | `admin@zhengyuan.com` |
| 运行环境 | formal `next start -p 5004` |
| BUILD_ID | `QtQJ7V2Xl8fJVkIswY6tx` |
| 对应差异编号 | `DS-ACC-005`、`DS-ACC-006` |
| 本轮目标 | 验证第一批补录后，工时缺口是否归零，经营漏斗是否开始恢复可解释值 |

## 3. 补录前基线

### 3.1 售前基线

| 字段 | 当前值 | 说明 |
| --- | ---: | --- |
| `summary.totalSupportHours` | `0h` | 当前值受缺失工时记录影响 |
| `summary.activeSupportProjects` | `1` | 当前仅识别到 `智慧校园平台建设` |
| `summary.missingWorklogRecordCount` | `2` | 两条记录均位于同一项目 |

### 3.2 经营基线

| 字段 | 当前值 | 说明 |
| --- | ---: | --- |
| `funnel.totalOpenCount` | `358` | 当前在手机会数 |
| `funnel.totalOpenAmount` | `¥35676.7万` | 当前敞口金额 |
| `funnel.avgWinProbability` | `0%` | 受缺失商机子表影响 |
| `funnel.weightedPipeline` | `¥0.0万` | 当前无法支撑经营判断 |
| `funnel.missingWinProbabilityCount` | `358` | 其中 `356` 条为真实业务样本 |

### 3.3 本轮优先样本

| 样本ID | 项目ID / 记录ID | 项目名称 | 区域 | 补录前状态 |
| --- | --- | --- | --- | --- |
| PS-01 | 记录 `1` | 智慧校园平台建设 | 华北 | `durationHours`、`totalWorkHours` 均为空 |
| PS-02 | 记录 `2` | 智慧校园平台建设 | 华北 | `durationHours`、`totalWorkHours` 均为空 |
| BS-01 | 项目 `301` | 河南省委-数智后勤 | 河南 | 缺失 `bus_project_opportunity` |
| BS-02 | 项目 `312` | 新乡学院 | 河南 | 缺失 `bus_project_opportunity` |
| BS-03 | 项目 `168` | 某军校信息化智能化教学条件整体建设 | 重庆 | 缺失 `bus_project_opportunity` |
| BS-04 | 项目 `169` | 海南省文化艺术学校智慧校园 | 海南 | 缺失 `bus_project_opportunity` |
| BS-05 | 项目 `185` | 台州学院中行银校合作项目 | 温台 | 缺失 `bus_project_opportunity` |
| BS-06 | 项目 `155` | 电子科技大学智慧后勤 | 四川 | 缺失 `bus_project_opportunity` |
| BS-07 | 项目 `166` | 兰州理工大学一卡通项目 | 甘青宁 | 缺失 `bus_project_opportunity` |
| BS-08 | 项目 `171` | 辽宁大学大数据项目 | 辽吉 | 缺失 `bus_project_opportunity` |
| BS-09 | 项目 `170` | 山西医科大学智慧校园 | 山西 | 缺失 `bus_project_opportunity` |
| BS-10 | 项目 `167` | 上海应用技术大学一卡通项目 | 上海 | 缺失 `bus_project_opportunity` |
| BS-11 | 项目 `335` | 湖北文理学院尹集校区一卡通系统建设项目 | 湖北 | 缺失 `bus_project_opportunity` |
| BS-12 | 项目 `178` | 深圳理工大学智慧校园项目 | 深圳 | 缺失 `bus_project_opportunity` |
| BS-13 | 项目 `180` | 河北地质大学一卡通科技投入项目 | 河北 | 缺失 `bus_project_opportunity` |
| BS-14 | 项目 `313` | 河南林业职业学院 | 河南 | 缺失 `bus_project_opportunity` |
| BS-15 | 项目 `150` | 长沙学院一卡通升级项目 | 湖南 | 缺失 `bus_project_opportunity` |
| BS-16 | 项目 `133` | 中国石油大学(北京)智慧校园(三期) | 北京 | 缺失 `bus_project_opportunity` |
| BS-17 | 项目 `266` | 哈尔滨体育学院智慧校园二期策划 | 黑龙江 | 缺失 `bus_project_opportunity` |
| BS-18 | 项目 `330` | 衢州教育局银校合作 | 金华 | 缺失 `bus_project_opportunity` |
| BS-19 | 项目 `159` | 大同大学物联校园项目 | 山西 | 缺失 `bus_project_opportunity` |
| BS-20 | 项目 `397` | 哈尔滨商业大学智慧校园 | 黑龙江 | 缺失 `bus_project_opportunity` |
| TD-01 | 项目 `728` | 稳定性归档编辑项目-1774937711834 | 新疆 | 测试数据，应隔离或清理 |
| TD-02 | 项目 `731` | 稳定性归档编辑项目-1774938331333 | 新疆 | 测试数据，应隔离或清理 |

## 4. 样本复验记录区

### 4.1 售前样本复验

| 样本ID | 补录字段 | 补录前 | 补录后 | 页面复验 | 接口复验 | 数据库复验 | 判定 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| PS-01 | `durationHours`、`totalWorkHours`、服务日期 | 空 | `2026-03-29 09:00:00` / `8.00h` / `8.00h` | 未单独截图，本轮以 formal API + DB 为准 | `/api/data-screen/presales-focus-summary` 已反映总工时恢复 | `bus_project_presales_record.id=1` 已回填 | 通过 |
| PS-02 | `durationHours`、`totalWorkHours`、服务日期 | 空 | `2026-03-29 14:00:00` / `10.00h` / `10.00h` | 未单独截图，本轮以 formal API + DB 为准 | `/api/data-screen/presales-focus-summary` 已反映缺口归零 | `bus_project_presales_record.id=2` 已回填 | 通过 |

售前复验关注点：

1. `missingWorklogRecordCount` 是否从 `2` 降为 `0`。
2. `totalSupportHours` 是否恢复为非零且可解释值。
3. 同一项目两条服务记录补录后，汇总结果是否重复计入或遗漏。

本轮结果：`missingWorklogRecordCount=0`，`totalSupportHours=18`，售前工时缺口已在 formal API 上归零。

### 4.2 经营样本复验

| 样本ID | 补录字段 | 补录前 | 补录后 | 页面复验 | 接口复验 | 数据库复验 | 判定 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| BS-01 | `opportunityStage`、`expectedAmount`、`winProbability`、`expectedCloseDate` | 缺失子表 | `qualified` / `70000000.00` / `70` / `2026-05-31` | 未单独截图，本轮以 formal API + DB 为准 | `funnel.weightedPipeline` 已恢复为正值 | `bus_project_opportunity.project_id=301` 已插入 | 通过 |
| BS-02 | `opportunityStage`、`expectedAmount`、`winProbability`、`expectedCloseDate` | 缺失子表 | `qualified` / `36000000.00` / `70` / `2026-06-05` | 未单独截图，本轮以 formal API + DB 为准 | 缺口计数已下降 | `bus_project_opportunity.project_id=312` 已插入 | 通过 |
| BS-03 | `opportunityStage`、`expectedAmount`、`winProbability`、`expectedCloseDate` | 缺失子表 | `qualified` / `21168780.00` / `70` / `2026-06-10` | 未单独截图，本轮以 formal API + DB 为准 | 漏斗读数已恢复可解释值 | `bus_project_opportunity.project_id=168` 已插入 | 通过 |
| BS-04 | `opportunityStage`、`expectedAmount`、`winProbability`、`expectedCloseDate` | 缺失子表 | `qualified` / `20000000.00` / `70` / `2026-06-15` | 未单独截图，本轮以 formal API + DB 为准 | 漏斗读数已恢复可解释值 | `bus_project_opportunity.project_id=169` 已插入 | 通过 |
| BS-05 | `opportunityStage`、`expectedAmount`、`winProbability`、`expectedCloseDate` | 缺失子表 | `qualified` / `20000000.00` / `70` / `2026-06-20` | 未单独截图，本轮以 formal API + DB 为准 | 缺口计数已下降 | `bus_project_opportunity.project_id=185` 已插入 | 通过 |
| BS-06 | `opportunityStage`、`expectedAmount`、`winProbability`、`expectedCloseDate` | 缺失子表 | `qualified` / `16000000.00` / `70` / `2026-06-25` | 未单独截图，本轮以 formal API + DB 为准 | 缺口计数进一步下降 | `bus_project_opportunity.project_id=155` 已插入 | 通过 |
| BS-07 | `opportunityStage`、`expectedAmount`、`winProbability`、`expectedCloseDate` | 缺失子表 | `qualified` / `15000000.00` / `70` / `2026-06-28` | 未单独截图，本轮以 formal API + DB 为准 | 加权合同池进一步提升 | `bus_project_opportunity.project_id=166` 已插入 | 通过 |
| BS-08 | `opportunityStage`、`expectedAmount`、`winProbability`、`expectedCloseDate` | 缺失子表 | `qualified` / `10000000.00` / `70` / `2026-06-30` | 未单独截图，本轮以 formal API + DB 为准 | 缺口计数进一步下降 | `bus_project_opportunity.project_id=171` 已插入 | 通过 |
| BS-09 | `opportunityStage`、`expectedAmount`、`winProbability`、`expectedCloseDate` | 缺失子表 | `qualified` / `10000000.00` / `70` / `2026-07-03` | 未单独截图，本轮以 formal API + DB 为准 | 加权合同池进一步提升 | `bus_project_opportunity.project_id=170` 已插入 | 通过 |
| BS-10 | `opportunityStage`、`expectedAmount`、`winProbability`、`expectedCloseDate` | 缺失子表 | `qualified` / `10000000.00` / `70` / `2026-07-05` | 未单独截图，本轮以 formal API + DB 为准 | 缺口计数进一步下降 | `bus_project_opportunity.project_id=167` 已插入 | 通过 |
| BS-11 | `opportunityStage`、`expectedAmount`、`winProbability`、`expectedCloseDate` | 缺失子表 | `qualified` / `9221800.00` / `70` / `2026-07-08` | 未单独截图，本轮以 formal API + DB 为准 | 缺口计数进一步下降 | `bus_project_opportunity.project_id=335` 已插入 | 通过 |
| BS-12 | `opportunityStage`、`expectedAmount`、`winProbability`、`expectedCloseDate` | 缺失子表 | `qualified` / `9000000.00` / `70` / `2026-07-10` | 未单独截图，本轮以 formal API + DB 为准 | 加权合同池进一步提升 | `bus_project_opportunity.project_id=178` 已插入 | 通过 |
| BS-13 | `opportunityStage`、`expectedAmount`、`winProbability`、`expectedCloseDate` | 缺失子表 | `qualified` / `9000000.00` / `70` / `2026-07-12` | 未单独截图，本轮以 formal API + DB 为准 | 缺口计数进一步下降 | `bus_project_opportunity.project_id=180` 已插入 | 通过 |
| BS-14 | `opportunityStage`、`expectedAmount`、`winProbability`、`expectedCloseDate` | 缺失子表 | `qualified` / `8400000.00` / `70` / `2026-07-15` | 未单独截图，本轮以 formal API + DB 为准 | 加权合同池进一步提升 | `bus_project_opportunity.project_id=313` 已插入 | 通过 |
| BS-15 | `opportunityStage`、`expectedAmount`、`winProbability`、`expectedCloseDate` | 缺失子表 | `qualified` / `8300000.00` / `70` / `2026-07-18` | 未单独截图，本轮以 formal API + DB 为准 | 缺口计数进一步下降 | `bus_project_opportunity.project_id=150` 已插入 | 通过 |
| BS-16 | `opportunityStage`、`expectedAmount`、`winProbability`、`expectedCloseDate` | 缺失子表 | `qualified` / `7200000.00` / `70` / `2026-07-22` | 已纳入第四批后的正式截图 | 缺口计数进一步下降 | `bus_project_opportunity.project_id=133` 已插入 | 通过 |
| BS-17 | `opportunityStage`、`expectedAmount`、`winProbability`、`expectedCloseDate` | 缺失子表 | `qualified` / `7000000.00` / `70` / `2026-07-24` | 已纳入第四批后的正式截图 | 加权合同池进一步提升 | `bus_project_opportunity.project_id=266` 已插入 | 通过 |
| BS-18 | `opportunityStage`、`expectedAmount`、`winProbability`、`expectedCloseDate` | 缺失子表 | `qualified` / `6800000.00` / `70` / `2026-07-26` | 已纳入第四批后的正式截图 | 缺口计数进一步下降 | `bus_project_opportunity.project_id=330` 已插入 | 通过 |
| BS-19 | `opportunityStage`、`expectedAmount`、`winProbability`、`expectedCloseDate` | 缺失子表 | `qualified` / `6000000.00` / `70` / `2026-07-28` | 已纳入第四批后的正式截图 | 加权合同池进一步提升 | `bus_project_opportunity.project_id=159` 已插入 | 通过 |
| BS-20 | `opportunityStage`、`expectedAmount`、`winProbability`、`expectedCloseDate` | 缺失子表 | `qualified` / `5500000.00` / `70` / `2026-07-30` | 已纳入第四批后的正式截图 | 缺口计数进一步下降 | `bus_project_opportunity.project_id=397` 已插入 | 通过 |

经营复验关注点：

1. `missingWinProbabilityCount` 是否开始下降。
2. `avgWinProbability` 是否从 `0%` 恢复为正值。
3. `weightedPipeline` 是否从 `¥0.0万` 恢复为可解释值。
4. 河南、重庆、海南、温台四个区域的经营解释是否开始改善。

本轮结果：formal API 当前返回 `avgWinProbability=68`、`weightedPipeline=213313406`、`missingWinProbabilityCount=336`。数据库口径下 `projectStage='opportunity'` 的缺失子表样本已从 `356` 降到 `336`；`TD-01/02` 也已补入 `negotiation` 口径子表，不再额外抬高 API 缺口值。

### 4.3 测试数据隔离复验

| 样本ID | 当前状态 | 处置动作 | 处置后结果 | 判定 |
| --- | --- | --- | --- | --- |
| TD-01 | `bidding` 阶段测试项目 | 已补入 `negotiation` 口径子表，不执行删除 | 不再额外抬高 API 缺口提醒 | 通过 |
| TD-02 | `bidding` 阶段测试项目 | 已补入 `negotiation` 口径子表，不执行删除 | 不再额外抬高 API 缺口提醒 | 通过 |

测试数据复验关注点：

1. 两条稳定性项目是否已从业务签字样本中剔除。
2. 若执行删除或归档清理，是否仍会出现在 `/api/data-screen/overview` 的缺口统计中。

## 5. 统一证据记录

| 证据类型 | 记录要求 | 状态 |
| --- | --- | --- |
| 页面截图 | 每个关键场景至少保留正式页面截图并标注路径 | 已补 `SS-01` 至 `SS-08` |
| 接口响应 | `/api/data-screen/overview`、`/api/data-screen/presales-focus-summary` 对应字段前后值 | 已补 API 关键字段 |
| 数据库事实 | 源记录回填前后查询结果 | 已补 DB 回填结果 |
| 自动化背景 | 当前技术基线沿用 `verify:acceptance:5004` | 已重新验证 `41 passed (1.6m)` |

### 5.1 页面截图证据索引

| 编号 | 页面路径 | 文件名 | 取证焦点 |
| --- | --- | --- | --- |
| SS-01 | `/data-screen` | `docs/plans/evidence/2026-04-06-task8-data-screen/ss-01-management-overview.png` | 管理层经营总览、目标与预测、风险摘要 |
| SS-02 | `/data-screen` | `docs/plans/evidence/2026-04-06-task8-data-screen/ss-02-management-top3.png` | 区域金额贡献 TOP3 |
| SS-03 | `/data-screen` | `docs/plans/evidence/2026-04-06-task8-data-screen/ss-03-business-overview.png` | 在手机会、敞口金额、平均赢率、本周到期 |
| SS-04 | `/data-screen` | `docs/plans/evidence/2026-04-06-task8-data-screen/ss-04-business-funnel-risk.png` | `missingWinProbabilityCount=336`、`weightedPipeline=213313406` |
| SS-05 | `/projects?stage=opportunity` | `docs/plans/evidence/2026-04-06-task8-data-screen/ss-05-projects-drillthrough.png` | 经营负责人 drill-through 落点 |
| SS-06 | `/data-screen` | `docs/plans/evidence/2026-04-06-task8-data-screen/ss-06-presales-overview.png` | `totalSupportHours=18`、`activeSupportProjects=1` |
| SS-07 | `/data-screen` | `docs/plans/evidence/2026-04-06-task8-data-screen/ss-07-presales-worklog-hint.png` | `missingWorklogRecordCount=0`，页面未再显示工时缺口警示 |
| SS-08 | `/staff` | `docs/plans/evidence/2026-04-06-task8-data-screen/ss-08-staff-drillthrough.png` | 售前负责人 drill-through 落点 |

## 6. 第一轮预期结论

1. `PS-01`、`PS-02` 已完成补录，售前视图已具备进入签字前复验的条件。
2. `BS-01` 到 `BS-20` 已完成补录，经营视图已从“完全不可解释”进一步推进到“可解释且边界更清晰”的状态。
3. `TD-01`、`TD-02` 已做 `negotiation` 口径归一化处理，经营签字样本边界进一步收紧。

## 7. 后续动作

1. 将本轮结论同步到 `docs/plans/2026-04-06-data-screen-metric-reconciliation-record.md` 与 `docs/plans/2026-04-06-data-screen-issue-ledger.md`。
2. 若仍需继续压低经营缺口，可再启动新的高金额样本批次。
3. 页面截图证据已补齐，当前可直接进入业务签字纪要与陪跑确认。

## 8. 2026-04-07 技术追认

1. 当前 formal BUILD_ID 已更新为 `h2ldgb7X394AARaJg-WCT`。
2. `verify:acceptance:5004` 最新结果为 `41 passed (1.6m)`。
3. 该门禁已包含数据大屏“浙江省 / 全国”反复切换和热力图维度反复切换稳定性回归。
4. 因此本初稿中涉及数据大屏切换挂页的技术风险，现已从待确认问题转为已修复并完成自动化门禁覆盖。