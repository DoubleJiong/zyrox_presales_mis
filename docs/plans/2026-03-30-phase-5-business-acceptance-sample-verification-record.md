# 第五阶段业务验收逐样本核对记录

日期：2026-03-30

关联样本清单：`docs/plans/2026-03-30-phase-5-business-acceptance-sample-list.md`
关联首轮证据：`docs/plans/2026-03-30-phase-5-business-acceptance-evidence-round1.md`

## 1. 使用说明

每条样本必须同时记录以下证据：

1. 页面证据：客户页、项目页、方案页、统计页的实际现象。
2. 接口证据：相关 API 的关键返回字段。
3. 数据库证据：主表、关联表、聚合结果。
4. 台账证据：原始 Excel 台账状态、客户、项目信息。

判定规则：

1. `一致`：页面、接口、数据库、台账之间没有未解释差异。
2. `不一致`：存在未解释差异，且影响业务判断。
3. `待确认`：存在差异，但尚需业务口径确认。

## 2. 逐样本记录表

| 样本ID | 样本用途 | 台账事实 | 页面现象 | 接口证据 | 数据库证据 | 统计计入口径 | 判定 | 问题编号/备注 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S01 | 商机阶段-交流样本 | 台账状态=交流; 系统阶段=opportunity; 系统状态=lead; 项目类型=SOFTWARE; 行业=education | 第二轮 UI 取证已完成，客户页与项目页可稳定检索命中，刷新稳定。 | customers(200)=1 命中; projects(200)=1 命中; solutions(200)=0 命中 | customerId=115 / customerCode=LEDGER-CUST-0115; projectId=138 / stage=opportunity / status=lead; solutions=0 | 计入 totalCustomers、totalProjects、projectsByStage.opportunity；不计入 totalSolutions | 一致 | 首轮接口与数据库一致；第二轮页面证据完成。 |
| S02 | 商机阶段-支持样本 | 台账状态=支持; 系统阶段=opportunity; 系统状态=lead; 项目类型=INTEGRATION; 行业=education | 第二轮 UI 取证已完成，客户页与项目页可稳定检索命中，刷新稳定。 | customers(200)=1 命中; projects(200)=1 命中; solutions(200)=0 命中 | customerId=54 / customerCode=LEDGER-CUST-0054; projectId=132 / stage=opportunity / status=lead; solutions=0 | 计入 totalCustomers、totalProjects、projectsByStage.opportunity；不计入 totalSolutions | 一致 | 首轮接口与数据库一致；第二轮页面证据完成。 |
| S03 | 商机阶段-常态化跟进样本 | 台账状态=常态化跟进; 系统阶段=opportunity; 系统状态=lead; 项目类型=SOFTWARE; 行业=education | 第二轮 UI 取证已完成，客户页与项目页可稳定检索命中，刷新稳定。 | customers(200)=1 命中; projects(200)=1 命中; solutions(200)=0 命中 | customerId=13 / customerCode=LEDGER-CUST-0013; projectId=71 / stage=opportunity / status=lead; solutions=0 | 计入 totalCustomers、totalProjects、projectsByStage.opportunity；不计入 totalSolutions | 一致 | 首轮接口与数据库一致；第二轮页面证据完成。 |
| S04 | 商机阶段-申报样本 | 台账状态=申报; 系统阶段=opportunity; 系统状态=lead; 项目类型=SOFTWARE; 行业=education | 第二轮 UI 取证已完成，客户页与项目页可稳定检索命中，刷新稳定。 | customers(200)=1 命中; projects(200)=1 命中; solutions(200)=0 命中 | customerId=121 / customerCode=LEDGER-CUST-0121; projectId=149 / stage=opportunity / status=lead; solutions=0 | 计入 totalCustomers、totalProjects、projectsByStage.opportunity；不计入 totalSolutions | 一致 | 首轮接口与数据库一致；第二轮页面证据完成。 |
| S05 | 商机阶段-控标样本 | 台账状态=控标; 系统阶段=opportunity; 系统状态=lead; 项目类型=INTEGRATION; 行业=education | 第二轮 UI 取证已完成，客户页与项目页可稳定检索命中，刷新稳定。 | customers(200)=1 命中; projects(200)=1 命中; solutions(200)=0 命中 | customerId=24 / customerCode=LEDGER-CUST-0024; projectId=181 / stage=opportunity / status=lead; solutions=0 | 计入 totalCustomers、totalProjects、projectsByStage.opportunity；不计入 totalSolutions | 一致 | 首轮接口与数据库一致；第二轮页面证据完成。 |
| S06 | 商机阶段-方案样本且已生成项目方案 | 台账状态=方案; 系统阶段=opportunity; 系统状态=lead; 项目类型=INTEGRATION; 行业=education | 第二轮 UI 取证已完成，客户页、项目页、方案页均稳定命中，刷新稳定。 | customers(200)=1 命中; projects(200)=1 命中; solutions(200)=1 命中 | customerId=115 / customerCode=LEDGER-CUST-0115; projectId=139 / stage=opportunity / status=lead; solutions=1 | 计入 totalCustomers、totalProjects、projectsByStage.opportunity、totalSolutions | 一致 | 首轮接口与数据库一致，是客户/项目/方案主链路关键样本。 |
| S07 | 归档阶段-中标样本 | 台账状态=中标; 系统阶段=archived; 系统状态=won; 项目类型=INTEGRATION; 行业=education | 第二轮 UI 取证已完成，客户页与项目页可稳定检索命中，刷新稳定。 | customers(200)=1 命中; projects(200)=1 命中; solutions(200)=0 命中 | customerId=13 / customerCode=LEDGER-CUST-0013; projectId=4 / stage=archived / status=won; solutions=0 | 计入 totalCustomers、totalProjects、projectsByStage.archived；不计入 totalSolutions | 一致 | 首轮接口与数据库一致；第二轮页面证据完成。 |
| S08 | 归档阶段-签单样本 | 台账状态=已签单; 系统阶段=archived; 系统状态=won; 项目类型=SOFTWARE; 行业=education | 第二轮 UI 取证已完成，客户页与项目页可稳定检索命中，刷新稳定。 | customers(200)=1 命中; projects(200)=1 命中; solutions(200)=0 命中 | customerId=16 / customerCode=LEDGER-CUST-0016; projectId=7 / stage=archived / status=won; solutions=0 | 计入 totalCustomers、totalProjects、projectsByStage.archived；不计入 totalSolutions | 一致 | 首轮接口与数据库一致；第二轮页面证据完成。 |
| S09 | 归档阶段-丢标样本 | 台账状态=丢标; 系统阶段=archived; 系统状态=lost; 项目类型=SOFTWARE; 行业=other | 第二轮 UI 取证已完成，客户页与项目页可稳定检索命中，刷新稳定。 | customers(200)=1 命中; projects(200)=1 命中; solutions(200)=0 命中 | customerId=85 / customerCode=LEDGER-CUST-0085; projectId=100 / stage=archived / status=lost; solutions=0 | 计入 totalCustomers、totalProjects；按当前系统聚合口径计入 projectsByStage.archived，不单列 lost | 待确认 | 对象层一致，页面证据完成；dashboard 不单列 lost，需在统计口径中明确说明。 |
| S10 | 归档阶段-放弃样本 | 台账状态=放弃; 系统阶段=archived; 系统状态=cancelled; 项目类型=SOFTWARE; 行业=education | 第二轮 UI 取证已完成，客户页与项目页可稳定检索命中，刷新稳定。 | customers(200)=1 命中; projects(200)=1 命中; solutions(200)=0 命中 | customerId=44 / customerCode=LEDGER-CUST-0044; projectId=57 / stage=archived / status=cancelled; solutions=0 | 计入 totalCustomers、totalProjects；按当前系统聚合口径计入 projectsByStage.archived，不单列 cancelled 业务结果 | 待确认 | 对象层一致，页面证据完成；业务“放弃”落在 archived 状态树中，需要在统计口径中明确说明。 |
| S11 | 软件类项目样本 | 台账状态=已签单; 系统阶段=archived; 系统状态=won; 项目类型=SOFTWARE; 行业=education | 第二轮 UI 取证已完成，客户页与项目页可稳定检索命中，刷新稳定。 | customers(200)=1 命中; projects(200)=1 命中; solutions(200)=0 命中 | customerId=18 / customerCode=LEDGER-CUST-0018; projectId=9 / stage=archived / status=won; solutions=0 | 计入 totalCustomers、totalProjects、projectsByStage.archived；不计入 totalSolutions | 一致 | 首轮接口与数据库一致；第二轮页面证据完成。 |
| S12 | 集成类项目样本 | 台账状态=中标; 系统阶段=archived; 系统状态=won; 项目类型=INTEGRATION; 行业=education | 第二轮 UI 取证已完成，客户页与项目页可稳定检索命中，刷新稳定。 | customers(200)=2 命中; projects(200)=1 命中; solutions(200)=0 命中 | customerId=14 / customerCode=LEDGER-CUST-0014; projectId=5 / stage=archived / status=won; solutions=0 | 计入 totalCustomers、totalProjects、projectsByStage.archived；不计入 totalSolutions | 一致 | 客户查询返回 2 条命中，当前样本对象与数据库主键一致，不影响样本判定。 |
| S13 | 教育行业样本 | 台账状态=中标; 系统阶段=archived; 系统状态=won; 项目类型=INTEGRATION; 行业=education | 第二轮 UI 取证已完成，客户页与项目页可稳定检索命中，刷新稳定。 | customers(200)=1 命中; projects(200)=1 命中; solutions(200)=0 命中 | customerId=15 / customerCode=LEDGER-CUST-0015; projectId=6 / stage=archived / status=won; solutions=0 | 计入 totalCustomers、totalProjects、projectsByStage.archived；不计入 totalSolutions | 一致 | 首轮接口与数据库一致；第二轮页面证据完成。 |
| S14 | 企业行业样本 | 台账状态=中标; 系统阶段=archived; 系统状态=won; 项目类型=INTEGRATION; 行业=enterprise | 第二轮 UI 取证已完成，客户页与项目页可稳定检索命中，刷新稳定。 | customers(200)=1 命中; projects(200)=1 命中; solutions(200)=0 命中 | customerId=23 / customerCode=LEDGER-CUST-0023; projectId=14 / stage=archived / status=won; solutions=0 | 计入 totalCustomers、totalProjects、projectsByStage.archived；不计入 totalSolutions | 一致 | 首轮接口与数据库一致；第二轮页面证据完成。 |
| S15 | 高金额样本 | 台账状态=已签单; 系统阶段=archived; 系统状态=won; 项目类型=INTEGRATION; 行业=education | 第二轮 UI 取证已完成，客户页与项目页可稳定检索命中，刷新稳定。 | customers(200)=1 命中; projects(200)=1 命中; solutions(200)=0 命中 | customerId=22 / customerCode=LEDGER-CUST-0022; projectId=13 / stage=archived / status=won; solutions=0 | 计入 totalCustomers、totalProjects、projectsByStage.archived；不计入 totalSolutions | 一致 | 首轮接口与数据库一致；第二轮页面证据完成。 |
| S16 | 无方案项目样本 | 台账状态=已签单; 系统阶段=archived; 系统状态=won; 项目类型=INTEGRATION; 行业=other | 第二轮 UI 取证已完成，客户页与项目页可稳定检索命中，刷新稳定。 | customers(200)=1 命中; projects(200)=1 命中; solutions(200)=0 命中 | customerId=17 / customerCode=LEDGER-CUST-0017; projectId=8 / stage=archived / status=won; solutions=0 | 计入 totalCustomers、totalProjects、projectsByStage.archived；不计入 totalSolutions | 一致 | 首轮接口与数据库一致；第二轮页面证据完成。 |

## 3. 统计复算记录区

说明：统计页页面值已由第二轮 UI 取证完成补证；`projectsByStage` 分项仍以接口与数据库复算为准，因为 `/dashboard-screen` 不直接展示阶段分项。

| 统计项 | 页面值 | 接口值 | 数据库复算值 | 是否一致 | 备注 |
| --- | ---: | ---: | ---: | --- | --- |
| totalCustomers | 369 | 369 | 369 | 一致 | 第二轮页面卡片读数与接口、数据库一致。 |
| totalProjects | 494 | 494 | 494 | 一致 | 第二轮页面卡片读数与接口、数据库一致。 |
| projectsByStage.opportunity | 页面未直显 | 352 | 352 | 一致 | 按当前 `projectStage` 治理口径复算一致。 |
| projectsByStage.archived | 页面未直显 | 142 | 142 | 一致 | 归档阶段包含中标、签单、丢标、放弃等已归档业务结果。 |
| projectsByStage.cancelled | 页面未直显 | 0 | 0 | 一致 | 当前 dashboard 仅对治理阶段 `cancelled` 单列；本轮样本中的“放弃”仍落在 `archived`。 |
| projectsByStage.lost | 页面未直显 | 未返回 | 0 | 待确认 | dashboard 阶段键来源于 `GOVERNED_PROJECT_STAGES`，不包含 `lost`；“丢标”当前以 `status=lost + projectStage=archived` 表达。 |
| totalSolutions | 45 | 45 | 45 | 一致 | 第二轮页面卡片读数与接口、数据库一致。 |

## 4. 综合结论

1. 客户/项目/方案主链路的 16 个代表性样本，在页面、接口、数据库三层均已完成闭环核对，未发现未解释差异。
2. 第二轮 UI 取证已完成，客户页、项目页、方案页检索与刷新稳定性均已留档，详见 `docs/plans/2026-03-30-phase-5-business-acceptance-ui-evidence-round2.md`。
3. dashboard 页面卡片读数中，`totalCustomers`、`totalProjects`、`totalSolutions` 与接口、数据库复算一致。
4. 当前唯一需要继续单独标注的不是对象数据错误，而是统计展示口径：`lost` 不是 dashboard 独立阶段键，而是以 `status=lost` 挂在 `projectStage=archived` 下表达。

## 5. 问题分类规则

1. `UI`：页面展示、刷新、缓存、排序、筛选异常。
2. `API`：接口契约、权限返回、字段含义或分页异常。
3. `DB`：落库错误、关联错误、主外键不一致。
4. `IMPORT`：台账导入映射错误。
5. `METRIC`：聚合口径、统计公式或范围定义错误。
6. `BIZ`：需要业务方确认口径，不属于纯技术故障。