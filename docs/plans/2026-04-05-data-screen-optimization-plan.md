# 数据大屏优化改造方案

日期：2026-04-05

状态：第一里程碑首刀已落地，继续实施中

## 当前进展（2026-04-05）

第一里程碑当前已完成第一刀，目标是先收敛 `/data-screen` 的接口边界和页面数据流，再继续补经营能力与驾驶舱视觉。已落地内容如下：

1. `/api/data-screen/stream` 已纳入统一 auth-bound 边界，并按当前登录用户消息范围取数。
2. `/api/data-screen/heatmap` 的项目在途金额与中标金额已改为基于统一生命周期聚合，不再直接依赖旧 `status='ongoing'` 或 `status in ('won', 'completed')`。
3. `src/app/data-screen/page.tsx` 已移除热力图旁路 `fetch`，地图维度切换、下钻返回和自动刷新改为依赖 hook 驱动的数据流。
4. 新增 focused API 回归，覆盖 `stream` 的 auth scope 和 `heatmap` 的生命周期聚合逻辑。

当前验证结果：

1. focused Vitest：`tests/api/data-screen/stream-route.test.ts` 与 `tests/api/data-screen/heatmap-route.test.ts` 已通过 `2/2`。
2. `corepack pnpm typecheck` 已通过。
3. 现有 Playwright 数据屏用例在 external server `5000` 上未能完成，阻塞点是管理员登录接口本身返回非 200，不是当前数据屏改动直接抛错；该项保留为环境验证阻塞项。

第一里程碑第二刀也已落地，当前已把经营判断能力抬到首页右侧监控区，新增内容如下：

1. `/api/data-screen/overview` 已补齐经营漏斗摘要，返回在手商机数、敞口金额、加权合同池、平均赢率和阶段分布。
2. `/api/data-screen/overview` 已补齐风险摘要，基于下一步行动逾期、投标临界、项目久未更新、预计成交临近且赢率偏低、风险评估文本等信号聚合高优先级风险对象。
3. `src/app/data-screen/page.tsx` 已新增“经营漏斗”和“风险摘要”模块，让首屏可以直接回答“盘子够不够、哪些项目要盯”。
4. 新增 focused API 回归 `tests/api/data-screen/overview-route.test.ts`，锁定漏斗和风险摘要口径。

当前验证结果补充：

1. focused Vitest：`stream`、`heatmap`、`overview` 三条数据屏 API 回归已通过 `3/3`。
2. `corepack pnpm typecheck` 已再次通过。

第一里程碑第三刀已继续落地，当前开始把首页判断结果接入 canonical 执行入口，新增内容如下：

1. `src/components/dashboard/DataPanels.tsx` 中的经营漏斗卡已新增“查看在手机会”“查看投标推进”动作入口，分别联动到项目池对应阶段。
2. 风险摘要卡已为每个高风险对象新增“查看项目”与“去任务中心”入口，避免用户看到风险后还要手工二次检索。
3. `src/app/projects/page.tsx` 已补齐基础 query 落位能力，支持通过 `stage/search/priority/type` 参数承接驾驶舱跳转。

当前验证结果补充：

1. `corepack pnpm typecheck` 已在动作联动切片后继续通过。

第一里程碑第四刀已继续落地，当前开始把大屏的装饰层改为受控实现，新增内容如下：

1. `src/app/data-screen/page.tsx` 已移除整页常驻的内联 canvas 粒子脚本，不再让背景氛围层以高频脚本方式长期运行。
2. 新增 `src/components/dashboard/CockpitAmbientLayer.tsx`，把氛围层收敛为独立组件，改用低成本渐变、网格、扫描线和受控数据流列实现。
3. 背景氛围层已改为延后挂载，首屏优先让经营内容进入渲染路径，再加载装饰层；同时兼容 `prefers-reduced-motion`。
4. 页面初始化等待时间已明显缩短，避免为了展示感让整页长时间停在“初始化中”。

当前验证结果补充：

1. `corepack pnpm typecheck` 已在视觉与性能切片后继续通过。

第一里程碑第五刀已继续落地，当前开始把页面主渲染节奏改为按需分层，新增内容如下：

1. `src/app/data-screen/page.tsx` 左侧全局统计区已由“四路并发 panel 取数”改为仅按当前 tab 取数，减少首屏额外接口压力。
2. 地图主模块和热区排行已改为延迟组件加载，并在懒加载阶段展示占位态，不再与核心概览同一时刻争抢首屏资源。
3. 页面已正式消费 `useDataScreen` 的 `isLazyLoading` 状态，让热力图、实时流、快速统计按第二批节奏进入，而不是继续全部同步首屏渲染。

当前验证结果补充：

1. `corepack pnpm typecheck` 已在分层加载切片后继续通过。

第一里程碑第六刀已继续落地，当前开始把剩余重面板入口继续下沉为按需加载，新增内容如下：

1. `src/app/data-screen/page.tsx` 已把左侧全局统计四类主面板改为动态命名导入，避免页面首包继续静态携带全部 panel 实现。
2. 右侧经营漏斗、风险摘要、实时流、快速统计以及区域详情面板也已改为延迟注入，让 overview-first 的渲染顺序进一步稳定。
3. 页面当前已形成“核心概览先出、重图表第二批、剩余侧栏面板按需挂载”的更清晰入口节奏，为后续继续拆薄 `page.tsx` 留出边界。

当前验证结果补充：

1. `corepack pnpm typecheck` 已在面板入口懒化切片后继续通过。

第一里程碑第七刀已继续落地，当前开始同步收敛页面壳层和专项验证入口，新增内容如下：

1. `src/app/data-screen/page.tsx` 已把顶部工具栏、左右侧驾驶舱壳层从页面主文件中抽离到独立 dashboard chrome 组件，页面主文件继续回到“状态编排 + 中央地图”职责。
2. 已新增 focused Playwright 规格 `tests/e2e/playwright/data-screen-formal.spec.ts`，直接覆盖驾驶舱首屏、分层加载后的快速统计、tab 切换与 canonical drill-through。
3. 在执行该 focused 回归时暴露出 `useDataScreen` 初始 `isLazyLoading=false` 导致第二批模块抢跑的问题；当前已修正为初始即处于 lazy-loading 阶段，避免快速统计在 heatmap 数据未到时先渲染默认 0 值。

当前验证结果补充：

1. `corepack pnpm typecheck` 已在结构抽离与 staged-loading 修复后继续通过。
2. focused Playwright `tests/e2e/playwright/data-screen-formal.spec.ts` 已在 fresh source instance `http://localhost:5010` 上稳定通过 `1/1`，当前已覆盖首屏驾驶舱、快速统计、漏斗/风险摘要、左侧 tab 激活切换与 funnel drill-through。
3. 本轮同时确认：若要在 current-source `next dev` 实例上执行 Playwright，应先完成 `typecheck` 再重启 dev server，因为仓库的 `pretypecheck` 会删除 `.next/dev`，否则会把验证实例本身打坏。
4. 最新 webpack 正式构建产物已刷新，`.next/BUILD_ID=Y7q3t47nZ3CAk9cVJ8r_5` 对应的 `next start -p 5004` 实例上，focused Playwright `tests/e2e/playwright/data-screen-formal.spec.ts` 已通过 `1/1`，说明当前数据屏驾驶舱改动已进入正式运行路径而不只停留在 current-source dev 验证。
5. `package.json` 中的正式验收入口 `verify:acceptance:5004` 已并入 `tests/e2e/playwright/data-screen-formal.spec.ts`，`http://localhost:5004` 上最新统一门禁已实跑通过 `40 passed (1.7m)`；后续 `5004` 发布门禁将不再只覆盖高频写路径稳定性扫雷，而会连同数据屏驾驶舱首屏、快速统计、漏斗/风险与 drill-through 一起执行。
6. `src/app/data-screen/page.tsx` 已继续把中央地图舞台从页面主文件中抽离到 `src/components/dashboard/DataScreenCenterStage.tsx`，并把热力图区域转换、默认地图数据和维度映射下沉到 `src/lib/data-screen-map.ts`；最新 webpack 正式产物 `.next/BUILD_ID=vW1LZSsdqrE9dY6uejTbb` 对应的 `next start -p 5004` 实例上，focused Playwright `tests/e2e/playwright/data-screen-formal.spec.ts` 已再次通过 `1/1`，说明这一轮结构收敛没有打破正式路径的驾驶舱行为。
7. `/api/data-screen/overview` 已补齐 `forecastSummary` 读模型，并修正 overview 按 `startDate/endDate` 分缓存的正式行为；当前“目标与预测”模块采用 `滚动90天中标 run-rate` 作为可测试的目标基线，再叠加所选区间后的同长度前瞻窗口内 `proposal / negotiation` 阶段加权商机形成预测完成额、缺口和所需新增商机量。focused Vitest `tests/api/data-screen/overview-route.test.ts` 已通过 `1/1`，最新 webpack 正式产物 `.next/BUILD_ID=GPIuixfoh24dkwuPJnjly` 对应的 `next start -p 5004` 实例上，focused Playwright `tests/e2e/playwright/data-screen-formal.spec.ts` 已再次通过，说明新的 forecast 卡已进入正式运行路径。
8. 最新一轮 formal 回归又补齐了 `/data-screen` 初始空日期请求导致的时间窗竞态：在页面显式日期完成初始化前，`useDataScreen` 不再先打一轮 fallback overview/heatmap 请求，避免 formal spec 手工取数窗口与页面首屏落位窗口不一致。修复后 focused Playwright `tests/e2e/playwright/data-screen-formal.spec.ts` 已再次通过 `exit 0`，最新 webpack 正式产物 `.next/BUILD_ID=X4InieoUaS3QIrMgEY-VP` 对应的 `next start -p 5004` 上，统一门禁 `verify:acceptance:5004` 已重新回到 `exit 0`，说明稳定扫和驾驶舱专项验证已经重新对齐到同一正式产物。
9. Task 6 第一刀已落地：`src/app/data-screen/page.tsx` 已基于当前登录角色接入四类角色化首屏预设（管理层、经营负责人、售前负责人、个人跟进），`src/components/dashboard/DataScreenChrome.tsx` 已新增预设切换条与“当前视图预设”说明卡，明确该能力当前只切换模块编排与默认关注维度，不改变账号数据权限范围。对应 focused Playwright `tests/e2e/playwright/data-screen-formal.spec.ts` 已补入角色预设断言，最新 webpack 正式产物 `.next/BUILD_ID=gXn-86n213K2IHZtmhsw6` 在 `next start -p 5004` 上已再次跑通统一门禁 `verify:acceptance:5004`，并返回 `exit 0`。
10. Task 6 第二刀已继续落地：`personal-focus` 不再只是预设按钮，当前已复用 `/api/workbench/summary` 的既有读模型，把“我的项目 / 待办动作 / 风险事项 / 未读消息”以及个人优先队列、重点项目直接带入 `src/components/dashboard/DataPanels.tsx` 的新个人推进面板；focused Playwright `tests/e2e/playwright/data-screen-formal.spec.ts` 已补入个人视图面板可见性断言，并在 refreshed webpack 正式产物 `.next/BUILD_ID=40cwCdEZCO3XMKRR7_0HL` 对应的 `next start -p 5004` 实例上再次通过，统一门禁 `verify:acceptance:5004` 也已回到 `40 passed (1.6m)`。
11. Task 6 第三刀已继续落地：`presales-focus` 当前已不再复用粗粒度 `sales` 面板估算负载，而是新增 auth-bound `/api/data-screen/presales-focus-summary` 读模型，按当前账号可见项目范围聚合售前服务工时、活跃支撑项目、过载成员、支撑类型分布与方案复用覆盖率；`src/components/dashboard/DataPanels.tsx` 已新增售前负责人专属负载面板，focused Vitest `tests/api/data-screen/presales-focus-summary-route.test.ts` 已通过 `2/2`，且 refreshed webpack 正式产物 `.next/BUILD_ID=40cwCdEZCO3XMKRR7_0HL` 在 `next start -p 5004` 上已重新跑通 focused Playwright 与统一门禁 `verify:acceptance:5004`。
12. Task 6 第四刀已继续落地：`management` 与 `business-focus` 已不再只停留在按钮切换，当前直接复用首页 `overview` 主指标、`topRegions`、`funnel`、`forecastSummary` 与 `riskSummary`，在 `src/components/dashboard/DataPanels.tsx` 中新增管理层经营总览面板和经营负责人视图面板，并由 `src/components/dashboard/DataScreenChrome.tsx` 按预设切入不同首屏卡片；对应 focused Playwright `tests/e2e/playwright/data-screen-formal.spec.ts` 与稳定性扫中的 canonical data-screen 用例均已对齐当前预设行为，refreshed webpack 正式产物 `.next/BUILD_ID=40cwCdEZCO3XMKRR7_0HL` 在 `next start -p 5004` 上已重新跑通统一门禁 `verify:acceptance:5004`，返回 `40 passed (1.6m)`。
13. Task 8 第一刀已继续落地：当前已把业务验收与发布收口从“计划项”推进到“可执行留档件”，新增 `docs/plans/2026-04-06-data-screen-business-acceptance-scripts.md` 形成管理层、销售负责人、售前负责人三套业务验收脚本；新增 `docs/plans/2026-04-06-data-screen-metric-reconciliation-record.md`、`docs/plans/2026-04-06-data-screen-issue-ledger.md` 和 `docs/plans/2026-04-06-data-screen-release-readiness-brief.md`，分别承接指标对账、问题登记和发布建议。当前 formal 技术基线已经齐备，下一阶段不再是补技术回归，而是用真实业务样本和业务账号完成陪跑填证。
14. Task 8 第二刀已继续落地：当前已新增 `docs/plans/2026-04-06-data-screen-business-acceptance-round1-record.md`，把正式运行时 `BUILD_ID=40cwCdEZCO3XMKRR7_0HL` 下 `2026-03-07` 至 `2026-04-06` 的 `/api/data-screen/overview` 与 `/api/data-screen/presales-focus-summary` 真实快照整理成管理层、经营负责人、售前负责人三段首轮陪跑基线记录。该记录同时暴露出三类需业务确认的后续项：管理层“区域贡献 TOP3”的排序语义、售前服务工时为 0 的数据完整性、以及经营负责人视图中的赢率字段缺失。
15. Task 8 第三刀已继续落地：针对首轮暴露的三类误导性展示风险，当前已完成管理层金额榜专属口径、售前未填工时提示、经营未填赢率提示三项 source 修正，并重新构建 webpack 正式产物 `.next/BUILD_ID=QtQJ7V2Xl8fJVkIswY6tx` 切回 `next start -p 5004`。最新统一 formal 门禁已再次通过 `40 passed (1.7m)`，且新的 `/api/data-screen/overview` / `/api/data-screen/presales-focus-summary` 快照已确认 `topRevenueRegions`、`missingWinProbabilityCount=358` 与 `missingWorklogRecordCount=2` 进入正式运行路径。当前下一步不再是继续改代码，而是组织业务账号按新提示完成对账与签字。
16. Task 8 第四刀已继续落地：当前已直接在 formal 数据库上完成缺口根因定位，并形成 `docs/plans/2026-04-06-data-screen-data-remediation-backlog.md`。结论已从“字段可能缺失”收敛到可执行层面：售前侧是 `智慧校园平台建设` 的两条服务记录未填工时，经营侧是 `358` 条在手机会缺失 `bus_project_opportunity` 子表记录而非仅缺 `winProbability` 字段。后续动作应按补录清单执行，再回到 formal 快照复验，而不是继续做展示层修补。
17. Task 8 第五刀已继续落地：当前已把经营补录清单进一步升级为可跟办分派视图。formal 数据库显示真实业务缺口 `356` 条中有 `349` 条没有 `managerId`，说明后续补录不应按负责人分派，而应先按区域业务线推进，再在区域内优先处理高金额样本；测试稳定性项目 `728/731` 则应单独清理，不纳入业务签字样本。
18. Task 8 第六刀已继续落地：当前已把补录执行与业务签字连接起来，形成 `docs/plans/2026-04-06-data-screen-business-remediation-walkthrough-list.md`。该样本单明确了售前 2 条工时样本、经营 10 条高影响样本以及 2 条测试数据隔离样本的复验顺序，后续业务陪跑应按此样本单推进，而不是从 356 条全量缺口中随机抽查。
19. Task 8 第七刀已继续落地：当前已把“怎么复验、怎么签字”落成治理模板。`docs/plans/2026-04-06-data-screen-remediation-verification-template.md` 负责补录前后证据留档，`docs/plans/2026-04-06-data-screen-business-signoff-minutes-draft.md` 负责业务签字纪要固化。至此，Task 8 剩余动作已不再缺流程文档，而只剩真实补录、复验和签字执行。
20. Task 8 第八刀已继续落地：当前已把第一轮补录复验初稿直接预填出来，形成 `docs/plans/2026-04-06-data-screen-remediation-verification-round1-draft.md`。该初稿覆盖售前 `PS-01/02`、经营 `BS-01` 至 `BS-05` 以及测试数据 `TD-01/02`，后续现场执行时可直接回填结果并进入签字判断。
21. Task 8 第九刀已继续落地：当前已补齐第一批执行准备件。`docs/plans/2026-04-06-data-screen-a1-remediation-runbook.md` 定义了 BS-01 至 BS-05、PS-01/02、TD-01/02 的实际执行顺序与风控边界，`scripts/admin/data-screen/task8-a1-opportunity-backfill-template.sql` 则提供了事务化补录模板与补录前后校验查询。后续若进入真实改库执行，可直接在该模板上填写业务确认值，而不必从零组织 SQL。
22. Task 8 第十刀已继续落地：当前售前工时补录也已进入执行准备态。`scripts/admin/data-screen/task8-presales-worklog-backfill-template.sql` 为 `PS-01/02` 提供了补录前核查、显式事务、必填字段门禁与补录后验证查询，后续第一轮现场执行不再需要手工拼接 update 语句。
23. Task 8 第十一刀已继续落地：当前已把第一批执行真正剩余的人工确认项单独抽离成 `docs/plans/2026-04-06-data-screen-task8-business-confirmation-sheet.md`。这一刀的核心结论是：`BS-01` 至 `BS-05` 在 formal 库中既没有 `bus_project_opportunity`，也没有可继承的 `bus_opportunity` 关联；`PS-01/02` 只有描述文本，没有服务日期和工时。因此下一步不是继续设计执行脚本，而是由业务明确补录值。
24. Task 8 第十二刀已继续落地：在确认当前 acceptance 环境仍以测试数据为主后，第一批执行已从“准备态”进入“已执行态”。formal 数据库已实际补入 `BS-01` 至 `BS-05` 五条商机子表记录，并回填 `PS-01/02` 两条售前工时记录；formal API 当前返回 `missingWorklogRecordCount=0`、`totalSupportHours=18`、`missingWinProbabilityCount=353`、`avgWinProbability=70`、`weightedPipeline=117018146`，统一门禁 `verify:acceptance:5004` 也已再次通过 `40 passed`。Task 8 剩余动作已进一步收敛为：清理 `TD-01/02` 或继续推进第二批经营样本。
25. Task 8 第十三刀已继续落地：当前已把第二批经营样本与 `TD-01/02` 一并推进完毕。formal 数据库已再补入 `BS-06` 至 `BS-10` 五条商机子表，并为两条稳定性项目补齐 `negotiation` 口径子表；formal API 当前返回 `missingWinProbabilityCount=346`、`avgWinProbability=67`、`weightedPipeline=159818146`，同时售前口径继续保持 `missingWorklogRecordCount=0`、`totalSupportHours=18`。统一门禁 `verify:acceptance:5004` 也已再次通过 `40 passed (1.6m)`。Task 8 剩余动作现已收敛为：继续压低经营缺口，或直接补齐页面截图与签字证据。
26. Task 8 第十四刀已继续落地：当前已完成第三批高金额经营样本补录，新增 `335/178/180/313/150` 五条 `bus_project_opportunity`。formal API 当前返回 `missingWinProbabilityCount=341`、`avgWinProbability=68`、`weightedPipeline=190563406`，统一门禁 `verify:acceptance:5004` 再次通过 `40 passed (1.7m)`。Task 8 现阶段已不再是“是否可解释”的问题，而是“是否继续压降缺口，还是直接补齐签字证据”的治理选择。
27. Task 8 第十五刀已继续落地：当前已把签字前的页面证据工作结构化，形成 `docs/plans/2026-04-06-data-screen-screenshot-evidence-checklist.md`。该清单把剩余页面证据压缩为 `SS-01` 至 `SS-08` 八个补证动作，意味着后续即使不再继续补第四批数据，也可以直接进入正式页面取证和签字阶段。
28. Task 8 第十六刀已继续落地：当前已完成第四批高金额经营样本补录，新增 `133/266/330/159/397` 五条 `bus_project_opportunity`。formal API 当前返回 `missingWinProbabilityCount=336`、`avgWinProbability=68`、`weightedPipeline=213313406`，统一门禁 `verify:acceptance:5004` 再次通过 `40 passed (1.6m)`。同时，`SS-01` 至 `SS-08` 页面证据已按第四批后的 live 指标重采完成，Task 8 已不再受页面补证阻塞。

## 1. 改造背景

当前 `src/app/data-screen/page.tsx` 已经不是纯静态展示页，页面已经接入 `overview`、`heatmap`、`rankings`、`panels`、`stream` 等真实接口，能够提供客户、项目、金额、区域热力和动态消息等基础经营视图。

但从业务可用性和实际管理场景看，当前模块仍主要停留在“展示型总览页”，还没有真正成为售前管理系统的经营驾驶舱，主要表现为：

1. 指标饱和度不足，更多是总量与排行，缺少经营漏斗、预测、风险、资源负载等决策型指标。
2. 统计口径覆盖不足，部分接口仍沿用旧 `status` 语义，尚未完全收敛到统一项目阶段与业务事实。
3. 角色适配不足，同一套页面同时服务管理层、销售负责人、售前负责人和一线成员，信息密度高但针对性不够。
4. 图表到动作的链路不足，用户看到异常后还需要跳转和二次查找，无法直接进入客户、项目、任务、消息等执行对象。
5. 模块内部仍有治理债，包含 auth 边界不一致、缓存策略分散、页面端与 hook 端并存多套取数方式等问题。

本次改造目标不是简单“再多加几个图”，而是把数据大屏升级为“可看全局、可做诊断、可落动作”的业务驾驶舱。

## 2. 改造目标

本次改造聚焦六个目标：

1. 建立统一、可解释、可追溯的数据大屏指标体系。
2. 让数据大屏覆盖售前经营管理中的核心使用场景，而不只是展示总览。
3. 让不同角色进入页面后都能快速看到对自己真正有用的内容。
4. 让图表、排行、热力图与客户、项目、任务、消息等执行对象打通。
5. 收敛数据接口和前端实现，形成可持续扩展的数据大屏架构。
6. 形成符合“领导驾驶舱”定位的视觉呈现、动态效果和首屏性能平衡方案。

## 3. 业务定位

数据大屏改造后，业务定位明确为售前管理系统的经营驾驶舱，承担三层职责：

1. 总览层：回答“现在整体经营状态怎么样”。
2. 诊断层：回答“问题集中在哪里、原因大致是什么”。
3. 动作层：回答“接下来应该盯哪些项目、客户、人员和事项”。

它不再只是独立展示页，而是整个系统中连接工作台、项目、客户、任务、消息中心的经营入口。

本次视觉与动效实现还应同时遵循：

1. `docs/plans/2026-04-05-data-screen-leadership-cockpit-visual-guidelines.md`

## 4. 核心使用场景

### 4.1 管理层场景

管理层需要快速判断：

1. 本月、本季度机会盘子是否健康。
2. 目标达成是否存在缺口。
3. 区域、行业、团队对结果的贡献差异在哪里。
4. 哪些高风险机会需要跨团队干预。

### 4.2 销售负责人场景

销售负责人需要快速判断：

1. 哪个阶段掉单最多。
2. 哪些区域或行业的转化率明显偏低。
3. 哪些项目长期停滞、临近签约却没有推进。
4. 哪些人员或团队需要辅导和资源支持。

### 4.3 售前负责人场景

售前负责人需要快速判断：

1. 当前重点项目支持负载是否失衡。
2. 高复杂度方案、投标项目是否存在资源挤压。
3. 哪些方案线的引用率、赢单率、客单价更高。
4. 哪些售前成员被过度占用，哪些项目存在支持空档。

### 4.4 一线成员场景

一线成员需要快速看到：

1. 我的重点客户和重点项目。
2. 即将到期、临近签约、长期未推进的事项。
3. 我当前的跟进负荷和个人漏斗表现。
4. 需要立即处理的任务、消息和预警。

## 5. 现状诊断

结合现有代码和接口实现，当前数据大屏至少存在以下问题：

1. `src/app/api/data-screen/stream/route.ts` 仍未统一接入 auth wrapper，模块内部 trust boundary 不一致。
2. `src/app/api/data-screen/heatmap/route.ts` 仍存在 `status = 'ongoing'`、`status IN ('won', 'completed')` 等旧语义，统计口径与统一项目阶段体系存在偏差。
3. `src/app/data-screen/page.tsx` 已引入 `useDataScreen(...)`，但热力图仍在页面层直接 `fetch('/api/data-screen/heatmap?...')`，形成双路径取数。
4. `overview`、`rankings`、`heatmap`、`panels` 的时间范围、缓存 TTL、维度定义尚未形成统一约束。
5. 当前 E2E 主要验证页面可见和顶部几个总量指标，对热力图切换、下钻、排行切换、时间范围变更、风险联动等真实场景覆盖不足。

## 6. 目标指标体系

### 6.1 总览指标

总览区保留基础经营规模，但必须补齐趋势和目标关系。建议至少包括：

1. 客户总数。
2. 活跃客户数。
3. 项目总数。
4. 在途项目数。
5. 商机总金额。
6. 加权预测金额。
7. 已签约金额。
8. 本月、本季度目标达成率。
9. 环比与同比变化。

### 6.2 经营漏斗指标

数据大屏必须从“总量”升级到“转化”。建议建立从线索到成交的经营漏斗：

1. 线索数。
2. 商机数。
3. 方案中项目数。
4. 报价中项目数。
5. 决策中项目数。
6. 赢单数。
7. 输单数。
8. 各阶段转化率。
9. 各阶段平均停留时长。
10. 回退率与滞留率。

### 6.3 风险预警指标

风险区必须体现“该盯什么”，而不是只放异常数字。建议建立以下风险对象：

1. 高金额但最近无跟进记录的项目。
2. 临近预计签约日但阶段未推进的项目。
3. 连续多次方案迭代仍未进入下一阶段的项目。
4. 超过阈值天数未推进的项目。
5. 客户活跃度明显下降的重点客户。
6. 赢率显著低于同类均值的区域、行业、团队或人员。

### 6.4 资源与负载指标

为了让售前负责人真正使用大屏，必须增加支持资源视角：

1. 人均在途项目数。
2. 人均重点项目数。
3. 投标项目支持负载。
4. 高复杂度方案支持负载。
5. 方案产出数、复用率、引用率。
6. 售前成员忙闲分布和支撑饱和度。

### 6.5 目标与预测指标

为了让管理层具备经营判断能力，建议增加：

1. 月度、季度目标。
2. 当前已完成金额。
3. 预测完成金额。
4. 目标缺口。
5. 达成目标所需新增商机量。
6. 预测偏差跟踪。

## 7. 分析维度要求

数据大屏不能只按总量展示，至少要统一支持以下分析维度：

1. 时间维度：近 7 天、近 30 天、近 90 天、本月、本季度、滚动 12 个月。
2. 组织维度：部门、团队、个人。
3. 地域维度：大区、省份、城市。
4. 行业维度：制造、政府、教育、医疗等标准行业分类。
5. 客户维度：新客户、老客户、重点客户、战略客户。
6. 项目维度：项目阶段、项目类型、项目级别、赢单状态。
7. 方案维度：方案线、解决方案类型、引用次数、赢单贡献。
8. 来源维度：老客扩展、转介绍、活动线索、主动开拓等。

## 8. 页面结构改造建议

### 8.1 页面重构原则

页面结构建议从“多图块平铺”改为“三层结构”：

1. 第一层是经营总览，呈现规模、趋势、目标和风险摘要。
2. 第二层是专题诊断，按漏斗、区域、行业、团队、方案线展开分析。
3. 第三层是动作联动，展示需要立即处理的项目、客户、任务和消息。

### 8.2 建议的页面区块

建议重构为以下区块：

1. 顶部经营摘要：总量、趋势、目标、预测。
2. 中部经营漏斗：阶段数量、金额、转化率、停留时长。
3. 区域与行业诊断：热力图、区域排行、行业排行。
4. 团队与个人表现：团队达成、个人排行、赢率对比。
5. 售前资源负载：重点项目支持负载、方案产出、成员饱和度。
6. 风险与待行动作：风险项目、重点客户、待办任务、关键消息。

### 8.3 角色化视图

页面应支持至少 4 类视图预设：

1. 管理层视图。
2. 销售负责人视图。
3. 售前负责人视图。
4. 个人视图。

角色差异主要体现在默认模块组合、默认筛选范围和默认排序对象，而不是复制 4 套完全独立页面。

### 8.4 视觉与动效改造原则

数据大屏在售前场景中经常被作为“领导驾驶舱”对外展示，因此视觉完成度本身就是产品价值的一部分。本次改造建议明确以下视觉原则：

1. 视觉风格要有明确辨识度，不能停留在通用后台报表风格。
2. 页面应具备动态感，但动效要服务信息层级和状态变化，而不是无意义装饰。
3. 首屏必须优先保证关键信息可读性，避免因过多动画削弱数据传达。
4. 视觉增强必须与性能预算绑定，不能以明显牺牲首屏加载和交互流畅度为代价。

建议重点增强以下视觉要素：

1. 顶部经营摘要和关键指标卡的入场动效、数字滚动和状态高亮。
2. 热力图、排行和漏斗在切换维度时的平滑过渡。
3. 风险对象、临期事项、异常趋势的脉冲提示或节奏性高亮。
4. 大屏背景氛围、网格、光效、数据流动线等弱装饰层，但应保持低成本渲染。
5. 全屏模式、角色切换、钻取弹层的转场一致性。

## 9. 交互与联动要求

本次改造必须保证“看图即能落动作”，建议明确以下联动：

1. 点击区域热力图后，可钻取到区域项目清单和客户清单。
2. 点击漏斗阶段后，可钻取到该阶段滞留项目列表。
3. 点击风险卡片后，可直接进入待处理项目、任务或客户明细。
4. 点击个人或团队排行后，可进入对应项目与跟进明细。
5. 点击动态消息后，可打开对应项目、客户或任务对象。
6. 大屏中的高风险对象应能一键跳转到工作台、任务中心、消息中心继续处理。

## 10. 视觉性能协同要求

领导驾驶舱可以做得更动态、更有展示感，这一目标是可实现的，但必须建立明确边界：

1. 动效分层加载，首屏先展示关键指标和骨架，次级装饰与非关键动画延后挂载。
2. 图表动画、数字动画、背景粒子或流光效果必须可按模块开关，不做全局无差别持续播放。
3. 重渲染敏感区域应减少不必要状态联动，避免一处筛选触发全页重绘。
4. 地图、图表、实时流和排行等重型模块应采用懒加载与按需刷新策略。
5. 对低性能环境和长时间大屏展示场景，应提供降级策略，避免浏览器持续高负载。

建议把性能基线写成正式约束：

1. 首屏先返回页面框架与关键摘要，不等待全部图表完成后再整体出现。
2. 关键摘要区与导航控件优先可交互。
3. 非关键装饰性动画不得阻塞数据请求和核心图表渲染。
4. 自动刷新时应避免整页闪烁，只刷新受影响模块。
5. 需要建立页面性能观测基线，包括首屏时长、图表初始化时长、切换响应时长和长时间运行稳定性。

## 11. 数据口径与治理要求

### 10.1 统一业务口径

数据大屏必须遵循以下规则：

1. 统计口径由业务模型定义，页面不得自行发明口径。
2. `projectStage` 应作为主阶段口径，旧 `status` 只允许用于迁移兼容与展示映射。
3. 任何风险规则、预测规则、转化规则都必须形成可测试定义。
4. self scope 与 global scope 必须使用同一指标公式，只允许对象范围不同。

### 10.2 接口治理

本次改造后，数据大屏接口必须满足：

1. 全部 API 走统一 auth-bound 边界。
2. 页面层不再直接平行发明额外 `fetch` 路径，数据获取收敛到 hook 和 service 层。
3. `overview`、`heatmap`、`rankings`、`panels`、`stream` 的时间范围和缓存策略必须形成统一约束。
4. 统计型接口必须明确缓存策略、失效条件和实时性要求。

### 10.3 前端结构治理

前端实现建议按以下方向收敛：

1. 把热力图切换、排行切换、面板切换统一纳入 `useDataScreen(...)` 或新的页面级 read-model hook。
2. 将角色视图、时间范围、钻取状态、自动刷新策略形成清晰的状态边界。
3. 将展示组件与数据容器进一步分离，避免 `page.tsx` 持续膨胀为巨型组件。

## 12. 分阶段实施建议

### 第一阶段：口径与接口收敛

目标：先解决“数字能不能信”的问题。

本阶段重点：

1. 统一 `projectStage`、赢单、签约、在途、风险的主口径。
2. 修正 `heatmap`、`rankings`、`panels` 中遗留旧语义。
3. 收敛全部数据大屏 API 的 auth、缓存、时间范围规则。
4. 形成正式指标口径文档和样例测试清单。

### 第二阶段：页面结构与交互联动重构

目标：让页面从展示型看板升级为经营驾驶舱。

本阶段重点：

1. 重构页面结构为总览层、诊断层、动作层。
2. 增加漏斗、风险、目标、资源负载等关键模块。
3. 增加角色化视图与钻取联动。
4. 收敛页面端直接取数逻辑。
5. 建立领导驾驶舱视觉样式系统，统一布局、层次、动效和全屏表现。

### 第二阶段补充：视觉与性能协同优化

目标：让页面既具备领导驾驶舱展示感，又不牺牲加载速度和长时间运行稳定性。

本阶段重点：

1. 建立驾驶舱视觉主题、关键卡片动效和图表转场规范。
2. 对数字滚动、模块入场、异常高亮、全屏切换等交互增加动态元素。
3. 将背景氛围层、装饰层和核心数据层解耦，避免装饰层拖慢核心内容。
4. 建立懒加载、按需动画、降级开关和性能监测基线。

### 第三阶段：验证与发布收口

目标：让数据大屏具备可持续演进基础。

本阶段重点：

1. 补齐 API 测试与 E2E 验证。
2. 建立样例数据对账。
3. 形成业务验收脚本和发布前回归基线。
4. 补齐驾驶舱视觉与性能验收基线。

## 13. 验证要求

本次改造至少应覆盖以下验证面：

1. 核心指标口径样例测试。
2. `overview`、`heatmap`、`panels`、`rankings`、`stream` API 契约测试。
3. 热力图维度切换、区域下钻、返回上层的 E2E 验证。
4. 角色视图切换、时间范围切换、自动刷新策略验证。
5. 从大屏跳转到项目、客户、任务、消息的联动验证。
6. 管理层、销售负责人、售前负责人三个业务验收脚本。
7. 首屏加载、模块切换、全屏展示和长时间运行的性能与稳定性验证。
8. 关键动效、数字动画、图表转场和降级模式验证。

## 14. 完成判定

数据大屏完成本轮改造，至少要满足：

1. 指标口径可解释、可追溯、可测试。
2. 页面可以回答“规模、趋势、转化、预测、风险、负载、动作”七类核心问题。
3. 页面能按角色提供差异化视图，而不是一套内容硬塞给所有人。
4. 图表可以钻取到真实执行对象。
5. 核心 API 和前端取数路径已完成收敛，并通过正式回归验证。
6. 页面视觉效果达到领导驾驶舱展示标准，且首屏速度、切换流畅度和长时间运行稳定性可接受。

## 15. 本次定版建议

本次数据大屏改造建议按以下优先级推进：

1. 第一优先级：统一口径、补风险、补漏斗、打通钻取动作。
2. 第二优先级：角色视图、目标与预测、资源负载。
3. 第三优先级：领导驾驶舱视觉体系、动效增强和性能协同优化。
4. 第四优先级：专题分析扩展和更多行业与方案维度。

在此顺序下，数据大屏能先从“能展示”提升到“能管理”，再从“能管理”提升到“能经营”。