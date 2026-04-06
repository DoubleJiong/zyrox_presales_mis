# 数据大屏二期改造执行清单

日期：2026-04-05

阶段名称：数据大屏经营驾驶舱优化改造

目标：基于《数据大屏优化改造方案》，把当前展示型数据大屏升级为可用于经营判断、风险预警和动作联动的业务驾驶舱。

## 1. 治理来源

本次执行以以下文档为准：

1. `docs/plans/2026-04-05-data-screen-optimization-plan.md`
2. `docs/plans/2026-04-05-data-screen-leadership-cockpit-visual-guidelines.md`
3. `docs/plans/2026-03-29-dashboard-metric-caliber-design.md`
4. `docs/plans/2026-03-29-project-state-machine-and-approval-system-design.md`
5. `docs/plans/2026-03-29-business-glossary-and-master-data.md`
6. `docs/plans/2026-04-01-phase-5-broader-module-release-closure-plan.md`

## 2. 阶段边界

### 本阶段要做

1. 收敛数据大屏主指标、主维度和主口径。
2. 补齐漏斗、风险、目标、预测、资源负载等经营能力。
3. 重构页面结构和联动路径，让大屏能跳转到客户、项目、任务、消息。
4. 收敛 auth、缓存、时间范围和前端取数逻辑。
5. 建立数据大屏专项 API 测试、E2E 测试和业务验收脚本。
6. 建立符合领导驾驶舱定位的视觉体系、动态效果和性能基线。

## 当前执行进展（2026-04-05）

首个实施切片已经落地，当前进展如下：

1. Task 2 第一刀已落地：`/api/data-screen/stream` 已接入统一 auth-bound，`/api/data-screen/heatmap` 已切到生命周期聚合口径。
2. Task 3 第一刀已落地：`src/app/data-screen/page.tsx` 已去除热力图旁路取数和页面级重复自动刷新，改为 hook 驱动。
3. Task 7 第一刀已落地：已新增 focused API 测试覆盖 `stream` auth scope 和 `heatmap` 生命周期聚合。
4. 当前阻塞不在代码而在环境：external server `5000` 下现有 Playwright 数据屏用例因管理员登录接口失败而未完成页面级回归。

第二个实施切片已继续落地，当前补充进展如下：

1. Task 4 第一刀已落地：`/api/data-screen/overview` 已新增经营漏斗摘要，覆盖阶段分布、敞口金额、加权合同池、平均赢率。
2. Task 5 第一刀已落地：`/api/data-screen/overview` 已新增风险摘要，并在 `src/app/data-screen/page.tsx` 首页落位高风险项目与行动提醒卡片。
3. Task 7 第二刀已落地：新增 `tests/api/data-screen/overview-route.test.ts`，当前 focused API 回归已通过 `3/3`。
4. `corepack pnpm typecheck` 已在第二个实施切片后再次通过。

第三个实施切片已继续落地，当前补充进展如下：

1. Task 5 第二刀已落地：首页经营漏斗与风险摘要模块已新增直达项目池、项目详情、任务中心的动作联动入口。
2. Task 3 第二刀已落地：`src/app/projects/page.tsx` 已支持通过 `stage/search/priority/type` 承接驾驶舱跳转参数。
3. `corepack pnpm typecheck` 已在动作联动切片后继续通过。

第四个实施切片已继续落地，当前补充进展如下：

1. Task 9 第一刀已落地：`src/app/data-screen/page.tsx` 已移除常驻内联粒子脚本，背景装饰不再依赖整页高频 canvas 动画。
2. Task 9 第二刀已落地：新增 `src/components/dashboard/CockpitAmbientLayer.tsx`，把氛围层改为可控组件，并支持延后挂载与 reduced-motion 降级。
3. Task 9 第三刀已落地：首页初始化等待时间已收短，装饰层让位于核心经营内容优先展示。
4. `corepack pnpm typecheck` 已在视觉与性能切片后继续通过。

第五个实施切片已继续落地，当前补充进展如下：

1. Task 9 第四刀已落地：左侧全局统计区已改为按当前 tab 取数，不再在首屏同时拉取四类 panel 数据。
2. Task 9 第五刀已落地：地图主模块与热区排行已切到延迟组件加载，并在第二批加载阶段展示占位态。
3. Task 3 第三刀已落地：页面已开始真正消费 `isLazyLoading`，让热力图、实时流、快速统计按分层节奏进入。
4. `corepack pnpm typecheck` 已在分层加载切片后继续通过。

第六个实施切片已继续落地，当前补充进展如下：

1. Task 3 第四刀已落地：`src/app/data-screen/page.tsx` 已把左侧四类统计主面板改为动态导入，进一步削减首屏静态依赖面。
2. Task 9 第六刀已落地：右侧经营漏斗、风险摘要、实时流、快速统计和区域详情也已切到按需挂载，页面重模块入口继续后移。
3. `corepack pnpm typecheck` 已在面板入口懒化切片后继续通过。

第七个实施切片已继续落地，当前补充进展如下：

1. Task 3 第五刀已落地：顶部工具栏、左右侧驾驶舱壳层已从 `src/app/data-screen/page.tsx` 抽离到独立 chrome 组件，页面容器职责进一步收敛。
2. Task 7 第三刀已落地：新增 focused Playwright `tests/e2e/playwright/data-screen-formal.spec.ts`，覆盖快速统计、tab 切换与 funnel drill-through。
3. Task 9 第七刀已落地：focused 回归暴露并推动修复 `useDataScreen` 初始 `isLazyLoading=false` 的第二批模块抢跑问题，避免快速统计先显示默认 0 值。
4. Task 3 第六刀已落地：`useDataScreen` 已修复 `mountedRef` 在 dev/Strict Mode 下被提前打成 `false` 的问题，避免第二批 `heatmap/rankings/stream/quick-stats` 请求被整体短路。
5. `corepack pnpm typecheck` 已在结构抽离与 staged-loading 修复后继续通过；focused Playwright `tests/e2e/playwright/data-screen-formal.spec.ts` 已在 fresh source instance `http://localhost:5010` 上通过 `1/1`。
6. Task 7 第四刀已落地：最新 webpack 正式产物 `.next/BUILD_ID=Y7q3t47nZ3CAk9cVJ8r_5` 已在 `next start -p 5004` 上完成 focused Playwright 数据屏回归，当前正式路径也已通过 `1/1`。
7. Task 7 第五刀已落地：`package.json` 中 `verify:acceptance:5004` 已升级为统一验收入口，除 `stability-sweep.spec.ts` 外还会串行执行 `data-screen-formal.spec.ts`；最新 `http://localhost:5004` 上已实跑通过 `40 passed (1.7m)`，让 5004 的正式门禁直接纳入驾驶舱专项验证。
8. Task 3 第七刀已落地：`src/app/data-screen/page.tsx` 已把中央地图舞台与区域详情抽离到 `src/components/dashboard/DataScreenCenterStage.tsx`，并新增 `src/lib/data-screen-map.ts` 收敛热力图区域转换、默认地图数据和热力图维度映射；`corepack pnpm typecheck` 已继续通过，且最新 webpack 正式产物 `.next/BUILD_ID=vW1LZSsdqrE9dY6uejTbb` 在 `next start -p 5004` 上已再次通过 focused Playwright `tests/e2e/playwright/data-screen-formal.spec.ts` `1/1`。
9. Task 4 第二刀已落地：`/api/data-screen/overview` 已新增 `forecastSummary`，首页右侧监控区已新增“目标与预测”卡，当前以“滚动90天中标 run-rate + 所选区间后的同长度前瞻窗口 forecastable pipeline”作为可测试目标预测口径；`tests/api/data-screen/overview-route.test.ts` 已通过 `1/1`，且最新 webpack 正式产物 `.next/BUILD_ID=GPIuixfoh24dkwuPJnjly` 在 `next start -p 5004` 上已再次通过 focused Playwright `tests/e2e/playwright/data-screen-formal.spec.ts`。
10. Task 3 第八刀与 Task 7 第六刀已落地：`/data-screen` 页面已避免在显式日期状态尚未初始化时先发起 fallback overview/heatmap 请求，修复 formal spec 中 forecast coverage 因 30 天 fallback 窗口与 31 天显式窗口交错而产生的口径漂移；focused Playwright `tests/e2e/playwright/data-screen-formal.spec.ts` 已重新通过 `exit 0`，且最新 webpack 正式产物 `.next/BUILD_ID=X4InieoUaS3QIrMgEY-VP` 在 `next start -p 5004` 上已重新跑通统一门禁 `verify:acceptance:5004` 并返回 `exit 0`。
11. Task 6 第一刀与 Task 7 第七刀已落地：`src/app/data-screen/page.tsx` 已按当前账号角色接入四类角色化视图预设（`management`、`business-focus`、`presales-focus`、`personal-focus`），`src/components/dashboard/DataScreenChrome.tsx` 已新增首屏预设切换条与左侧“当前视图预设”说明卡，当前版本明确只切换模块编排与默认维度，不变更数据权限口径；focused Playwright `tests/e2e/playwright/data-screen-formal.spec.ts` 已补入默认管理层视图与售前负责人预设切换断言，最新 webpack 正式产物 `.next/BUILD_ID=gXn-86n213K2IHZtmhsw6` 在 `next start -p 5004` 上已再次跑通统一门禁 `verify:acceptance:5004` 并返回 `exit 0`。
12. Task 6 第二刀已落地：`personal-focus` 当前已接入真实个人工作台读模型，新增个人推进面板，直接呈现我的项目数、待办动作、风险事项、未读消息、个人优先队列与重点项目，不再只是“切换视图文案”；对应 focused Playwright `tests/e2e/playwright/data-screen-formal.spec.ts` 已新增个人视图面板可见性断言，并在 refreshed webpack 正式产物 `.next/BUILD_ID=40cwCdEZCO3XMKRR7_0HL` 对应的 `next start -p 5004` 上再次跑通，统一门禁 `verify:acceptance:5004` 已返回 `40 passed (1.6m)`。
13. Task 6 第三刀已落地：`presales-focus` 当前已新增专属读模型 `/api/data-screen/presales-focus-summary`，按当前账号可见项目范围聚合售前服务工时、活跃支撑项目、过载成员、支撑类型与方案复用覆盖率；`src/hooks/use-presales-focus-summary.ts` 与 `src/components/dashboard/DataPanels.tsx` 已把该读模型接入售前负责人专属面板，focused API 回归 `tests/api/data-screen/presales-focus-summary-route.test.ts` 已通过 `2/2`，且 refreshed webpack 正式产物 `.next/BUILD_ID=40cwCdEZCO3XMKRR7_0HL` 在 `next start -p 5004` 上已重新跑通 focused Playwright 与统一门禁 `verify:acceptance:5004`。
14. Task 6 第四刀与 Task 7 第八刀已落地：`management` 与 `business-focus` 当前已复用首页既有 `overview` 数据，分别落成管理层经营总览面板与经营负责人机会盘子面板，不再只是角色按钮；`tests/e2e/playwright/data-screen-formal.spec.ts` 已新增默认管理层面板和经营负责人视图面板可见性断言，`tests/e2e/playwright/stability-sweep.spec.ts` 的 canonical data-screen 用例也已对齐当前默认管理层首屏行为，refreshed webpack 正式产物 `.next/BUILD_ID=40cwCdEZCO3XMKRR7_0HL` 在 `next start -p 5004` 上已重新跑通统一门禁 `verify:acceptance:5004`，返回 `40 passed (1.6m)`。
15. Task 8 第一刀已落地：当前已新增 `docs/plans/2026-04-06-data-screen-business-acceptance-scripts.md`、`docs/plans/2026-04-06-data-screen-metric-reconciliation-record.md`、`docs/plans/2026-04-06-data-screen-issue-ledger.md`、`docs/plans/2026-04-06-data-screen-release-readiness-brief.md`，把三类角色业务验收脚本、指标对账模板、问题台账和发布建议正式落档。当前技术正式基线已齐备，DS-08 进入“进行中”，下一步是组织真实业务样本陪跑并填写验收记录。
16. Task 8 第二刀已落地：当前已新增 `docs/plans/2026-04-06-data-screen-business-acceptance-round1-record.md`，基于 refreshed formal runtime `BUILD_ID=40cwCdEZCO3XMKRR7_0HL` 的真实接口快照，补齐管理层、经营负责人、售前负责人首轮陪跑基线记录，并把管理层区域排序语义、售前工时完整性、经营赢率字段完整性三类待确认项同步落入对账记录与问题台账。当前下一步不再是整理正式基线，而是安排真实业务账号对账与签字。
17. Task 8 第三刀已落地：围绕首轮暴露的三类误导风险，当前已完成管理层金额榜语义修正、售前未填工时显性提示、经营未填赢率显性提示，并已重新构建 webpack 正式产物 `.next/BUILD_ID=QtQJ7V2Xl8fJVkIswY6tx`，在 `next start -p 5004` 上再次跑通统一门禁 `verify:acceptance:5004 = 40 passed (1.7m)`。同时已新增 `docs/plans/2026-04-06-data-screen-business-acceptance-round2-record.md`，把 `missingWorklogRecordCount=2` 与 `missingWinProbabilityCount=358` 的最新 formal 快照纳入业务陪跑基线。
18. Task 8 第四刀已落地：当前已基于正式库补出可执行的数据修复清单 `docs/plans/2026-04-06-data-screen-data-remediation-backlog.md`。formal 数据库复核已确认售前缺口收敛为 `智慧校园平台建设` 上 2 条未填工时记录，经营缺口收敛为 `358` 条缺失 `bus_project_opportunity` 记录（`356` 条 `qualified`、`2` 条 `negotiation`），后续工作重点从“继续猜问题”转为“按清单补录并复验”。
19. Task 8 第五刀已落地：当前已进一步把经营补录阻塞点从“缺商机子表”细化到“缺责任归属”。formal 数据库复核已确认真实业务缺口样本 `356` 条里有 `349` 条未配置 `managerId`，因此补录执行口径已切换为“区域优先 + 高金额样本优先 + 测试数据隔离”，并已把河南、重庆、山西、温台、海南定义为首批 `A1` 区域。
20. Task 8 第六刀已落地：当前已新增 `docs/plans/2026-04-06-data-screen-business-remediation-walkthrough-list.md`，把售前 2 条工时缺口、经营 10 条高影响样本和 2 条测试稳定性项目拆成可执行复验顺序。后续业务陪跑不必从 356 条全量缺口起步，而是按该样本单推进补录后复验与签字。
21. Task 8 第七刀已落地：当前已补齐 `docs/plans/2026-04-06-data-screen-remediation-verification-template.md` 与 `docs/plans/2026-04-06-data-screen-business-signoff-minutes-draft.md`。后续补录完成后，业务复验与签字留痕已有统一模板，不需要现场再临时组织证据结构。
22. Task 8 第八刀已落地：当前已新增 `docs/plans/2026-04-06-data-screen-remediation-verification-round1-draft.md`，把 `PS-01/02`、`BS-01` 至 `BS-05`、`TD-01/02` 的补录前基线和复验字段预填完成。后续业务补录后可以直接在该初稿上回填“补录后 / 页面 / 接口 / 数据库 / 判定”，不必再从空白模板起草。
23. Task 8 第九刀已落地：当前已新增 `docs/plans/2026-04-06-data-screen-a1-remediation-runbook.md` 与 `scripts/admin/data-screen/task8-a1-opportunity-backfill-template.sql`。这一步把第一批 A1 区域补录从“文档准备”推进到“执行准备”，明确了 BS-01 至 BS-05 的补录顺序、SQL 前后校验、事务边界和测试数据隔离要求。
24. Task 8 第十刀已落地：当前已新增 `scripts/admin/data-screen/task8-presales-worklog-backfill-template.sql`，把 `PS-01/02` 的售前工时补录也纳入同一套事务化执行准备。至此，第一轮经营与售前样本都已具备可填值 SQL 模板，而不再只有操作说明。
25. Task 8 第十一刀已落地：当前已新增 `docs/plans/2026-04-06-data-screen-task8-business-confirmation-sheet.md`，把第一批样本仍需业务确认的字段压缩到最小集合。formal 数据库复核已证明 `BS-01` 至 `BS-05` 不存在可继承的 legacy 商机字段，`PS-01/02` 也不存在可继承工时，因此下一步的真实阻塞点已从“写 SQL”进一步收敛为“收集确认值”。
26. Task 8 第十二刀已落地：在用户确认 acceptance 环境以测试数据为主后，当前已直接按默认测试值完成第一批 formal 补录。数据库层结果为：`BS-01` 至 `BS-05` 共补入 5 条 `bus_project_opportunity`，`PS-01/02` 共补齐 2 条工时记录；formal API 当前返回 `missingWorklogRecordCount=0`、`totalSupportHours=18`、`missingWinProbabilityCount=353`、`avgWinProbability=70`、`weightedPipeline=117018146`；随后 `verify:acceptance:5004` 再次通过 `40 passed`。
27. Task 8 第十三刀已落地：当前已继续完成第二批样本和测试稳定性样本的 formal 补录。`BS-06` 至 `BS-10` 共补入 5 条商机子表，`TD-01/02` 两条稳定性项目已补入 `negotiation` 口径子表；formal API 当前返回 `missingWinProbabilityCount=346`、`avgWinProbability=67`、`weightedPipeline=159818146`，售前口径保持 `missingWorklogRecordCount=0`、`totalSupportHours=18`，统一门禁 `verify:acceptance:5004` 再次通过 `40 passed (1.6m)`。
28. Task 8 第十四刀已落地：当前已继续完成第三批高金额经营样本补录，新增 `335/178/180/313/150` 五条 `bus_project_opportunity`。formal API 当前返回 `missingWinProbabilityCount=341`、`avgWinProbability=68`、`weightedPipeline=190563406`，统一门禁 `verify:acceptance:5004` 再次通过 `40 passed (1.7m)`。至此，经营缺口已较原始 `356` 条 opportunity 样本压降 `15` 条，后续要么继续第四批，要么转签字补证。
29. Task 8 第十五刀已落地：当前已新增 `docs/plans/2026-04-06-data-screen-screenshot-evidence-checklist.md`，把业务签字前还缺的页面证据收敛为 `SS-01` 至 `SS-08` 八张截图。这样后续若选择“不再继续补第四批”，也可以直接进入页面补证和签字，而不需要再临时设计取证范围。
30. Task 8 第十六刀已落地：当前已继续完成第四批高金额经营样本补录，新增 `133/266/330/159/397` 五条 `bus_project_opportunity`，formal 数据库缺口从 `341` 压降到 `336`。formal API 当前返回 `missingWinProbabilityCount=336`、`avgWinProbability=68`、`weightedPipeline=213313406`，统一门禁 `verify:acceptance:5004` 再次通过 `40 passed (1.6m)`，且 `SS-01` 至 `SS-08` 页面证据已按第四批后的 live 指标重采完成。至此，Task 8 的剩余治理选择已变为“继续第五批”或“直接发起签字”。

### 本阶段不做

1. 不重新定义整个售前业务主模型。
2. 不绕开现有客户、项目、任务、消息 canonical 页面另建平行业务入口。
3. 不把审批体系、财务结算体系等非数据大屏主链路能力混入本阶段。
4. 不在口径未定之前先做纯视觉翻新。

## 3. 进入条件

开始本阶段前，至少满足：

1. 工作台、日程、任务、消息中心第九波闭环已完成。
2. 数据大屏当前 canonical 页面确定为 `/data-screen`。
3. 当前 `overview`、`heatmap`、`rankings`、`panels`、`stream` 接口已可返回真实数据。
4. 项目主阶段与核心业务术语已有治理来源可依赖。

## 4. 退出标准

阶段结束时，至少满足以下结果：

1. 形成统一的数据大屏指标定义与口径说明。
2. 页面具备总览、诊断、动作三层经营能力。
3. 大屏能够提供角色化视图和核心钻取联动。
4. API、前端状态管理和缓存策略完成收敛。
5. 核心改造项具备 API 测试、E2E 验证和业务验收记录。
6. 页面视觉、动态效果和性能表现达到可展示、可长期运行标准。

## 5. 交付物

| 编号 | 交付物 | 目标状态 | 说明 |
| --- | --- | --- | --- |
| DS-01 | 指标口径与维度定义 | 待完成 | 统一总览、漏斗、风险、预测、负载等指标定义 |
| DS-02 | 接口收敛改造 | 待完成 | 收敛 auth、缓存、时间范围和旧状态语义 |
| DS-03 | 页面结构重构 | 待完成 | 形成总览层、诊断层、动作层 |
| DS-04 | 角色化视图 | 进行中 | 四类视图预设首刀已落地，后续仍需补齐真角色读模型与资源负载指标 |
| DS-05 | 钻取与动作联动 | 待完成 | 打通客户、项目、任务、消息的联动跳转 |
| DS-06 | 风险与预测能力 | 待完成 | 风险规则、目标达成、预测缺口等能力上线 |
| DS-07 | 自动化回归基线 | 待完成 | API 契约测试与 E2E 场景覆盖 |
| DS-08 | 业务验收记录 | 进行中 | 已形成三类角色验收脚本、两轮 formal 基线记录、对账记录模板、问题台账和发布建议，待业务陪跑填充真实样本与签字结论 |
| DS-09 | 驾驶舱视觉与性能优化 | 待完成 | 建立视觉主题、动态效果、降级方案和性能基线 |

## 6. 任务拆分

### Task 1：统一指标口径与经营维度

目标：先让数字可信，再让图表有解释力。

执行要求：

1. 明确总览、漏斗、风险、预测、资源负载五类指标的对象来源和计算规则。
2. 明确时间、区域、行业、团队、人员、客户分层、项目类型、方案线等主维度。
3. 明确 self scope 与 global scope 的对象范围差异。
4. 为高风险、临期、滞留、预测等规则形成可测试定义。

验收：形成正式口径表，并能落成样例测试与业务解释话术。

### Task 2：收敛数据大屏接口边界

目标：结束当前接口口径与 trust boundary 不一致的问题。

执行要求：

1. 让 `stream` 路由纳入统一 auth-bound 边界。
2. 清理 `heatmap`、`panels`、`rankings` 中遗留旧 `status` 语义，统一到主阶段与映射层。
3. 统一 `overview`、`heatmap`、`rankings`、`panels`、`stream` 的时间范围参数和默认值。
4. 统一缓存 TTL 和失效策略，区分实时区与可缓存区。

验收：接口契约一致，可解释，可在测试中验证。

### Task 3：收敛前端数据获取和页面状态

目标：结束页面端与 hook 端并存多套取数路径的问题。

执行要求：

1. 把热力图切换、下钻、排行切换、时间范围切换统一纳入页面级数据 hook。
2. 取消 `page.tsx` 内平行直接 `fetch` 的旁路逻辑。
3. 明确页面状态边界，区分全局筛选、局部诊断、钻取上下文和自动刷新状态。
4. 拆分巨型页面组件，收敛为更清晰的容器层与展示层结构。

验收：页面主数据流只保留一套可解释路径，后续扩展不再继续膨胀在 `page.tsx`。

### Task 4：补齐经营漏斗与目标预测模块

目标：让大屏具备经营管理价值，而不仅是规模展示。

执行要求：

1. 补齐阶段漏斗、转化率、停留时长、回退率。
2. 补齐目标达成率、预测金额、目标缺口、新增机会需求等指标。
3. 让金额口径和数量口径同时存在，避免只看数量误判。
4. 明确各模块默认时间范围与刷新周期。

验收：页面能回答“盘子够不够、转化顺不顺、目标差多少”。

### Task 5：补齐风险预警与动作联动模块

目标：让数据大屏从汇总页升级为行动入口。

执行要求：

1. 建立项目滞留、临期未推进、高金额未跟进、客户活跃下降等风险规则。
2. 建立风险对象列表与优先级排序。
3. 建立从风险对象到项目、客户、任务、消息中心的跳转链路。
4. 建立区域、漏斗、排行的钻取明细页或联动抽屉。

验收：用户从大屏发现异常后，不需要离开当前路径重新搜索对象。

### Task 6：增加角色化视图和资源负载视角

目标：让不同角色都愿意把数据大屏作为日常入口。

执行要求：

1. 设计管理层、销售负责人、售前负责人、个人四类视图预设。
2. 为售前负责人补齐支持负载、重点项目支持、方案复用率等指标。
3. 为管理层补齐区域、行业、团队贡献和目标完成度。
4. 为个人视图补齐我的重点项目、我的风险事项和我的待办动作。

验收：不同角色打开页面后，第一屏内容对自己有明确价值。

### Task 7：建立专项自动化验证

目标：让数据大屏改造具备正式回归能力。

执行要求：

1. 为指标口径和映射规则补齐单元或 service 测试。
2. 为 `overview`、`heatmap`、`rankings`、`panels`、`stream` 补齐 API 契约测试。
3. 为热力图切换、区域下钻、漏斗钻取、角色切换、风险跳转补齐 Playwright 场景。
4. 为时间范围切换和缓存刷新补齐验证样例。

验收：数据大屏不再只依赖人工看页面判断是否可用。

### Task 8：形成业务验收与发布收口

目标：让改造结果能被业务侧真正确认，而不是只通过技术自测。

执行要求：

1. 形成管理层、销售负责人、售前负责人三套验收脚本。
2. 按真实样本校验区域、行业、团队、阶段、金额等关键口径。
3. 形成问题台账和口径对账记录。
4. 形成上线前回归结论与发布建议。

验收：具备可留档的业务验收记录，而不是口头确认。

### Task 9：领导驾驶舱视觉与性能协同优化

目标：让数据大屏在视觉上足够有展示感，同时保持首屏快、切换顺、长时间运行稳。

执行要求：

1. 建立统一的驾驶舱视觉主题，包括布局层次、色彩体系、卡片风格、全屏模式和背景氛围层。
2. 为关键指标卡、排行、热力图、漏斗、风险提醒增加有节制的动态元素，如数字滚动、模块入场、图表转场、异常高亮。
3. 明确哪些动效属于核心信息反馈，哪些属于装饰层，并对装饰层采用延迟挂载、按需渲染或可关闭策略。
4. 为地图、图表和实时流建立懒加载、分块刷新和低性能降级机制，避免整页重绘。
5. 建立性能预算和验收项，至少覆盖首屏渲染、模块切换、全屏运行和长时间展示稳定性。

验收：在真实数据量下，页面具备明显的领导驾驶舱展示感，但不会因动效增加而出现明显卡顿、加载过慢或长时间运行不稳定。

## 7. 建议实施顺序

建议按以下顺序推进：

1. 先完成 Task 1 和 Task 2，先把数字和接口边界收干净。
2. 再完成 Task 3、Task 4、Task 5，形成经营驾驶舱主体验。
3. 然后完成 Task 9，把视觉体验和性能基线一起建立起来。
4. 最后完成 Task 6、Task 7、Task 8，完成角色化和正式发布收口。

## 8. 风险提醒

1. 如果口径没先收敛，越往页面上堆能力，误导业务的风险越大。
2. 如果没有角色化视图，大屏很容易再次退化成“所有人都能看，但没有人真的依赖”。
3. 如果没有动作联动，大屏会继续停留在展示层，难以成为系统入口。
4. 如果没有专项自动化回归，后续每次改图表都可能再次破坏统计口径或交互链路。
5. 如果没有性能预算约束，视觉增强很容易把领导驾驶舱做成“看起来炫，但现场不敢开”的页面。

## 9. 完成判定

本清单完成，意味着数据大屏已经从“基础展示页”升级为“经营驾驶舱候选版本”，但正式闭环仍须经过：

1. 真实业务样本对账。
2. 业务负责人与管理层验收。
3. 发布前专项回归通过。
4. 驾驶舱视觉与性能验收通过。