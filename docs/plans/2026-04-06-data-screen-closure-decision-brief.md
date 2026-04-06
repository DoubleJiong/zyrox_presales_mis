# 数据大屏 Task 8 收口决策简报

日期：2026-04-06

## 1. 决策结论

Task 8 当前决定采用“先收口”路径：本轮不再继续第五批高金额经营补录，直接基于 fourth-batch 后的 formal 证据进入业务陪跑验收与签字评审。

## 2. 当前正式基线

1. BUILD_ID：`QtQJ7V2Xl8fJVkIswY6tx`
2. 运行口径：formal `next start -p 5004`
3. 统一门禁：`verify:acceptance:5004 = 40 passed (1.6m)`
4. 页面证据：`SS-01` 至 `SS-08` 已按 fourth-batch 后 live 指标重采完成

## 3. 当前业务读数

1. 经营口径：`missingWinProbabilityCount=336`、`avgWinProbability=68`、`weightedPipeline=213313406`
2. 售前口径：`missingWorklogRecordCount=0`、`totalSupportHours=18`、`activeSupportProjects=1`
3. 经营缺口已从原始 `356` 条真实 opportunity 样本压降到 `336` 条。

## 4. 收口理由

1. 当前页面、接口、数据库、自动化四层证据已经闭环，不再存在技术阻断。
2. 售前缺口已清零，经营视图已从“完全不可解释”推进到“可解释且边界清晰”。
3. 若继续补第五批，只会继续优化数据完整性，不改变当前大屏“可陪跑、可签字评审”的结论。
4. 因此当前最有效动作是完成签字，而不是继续扩张本轮补录范围。

## 5. 遗留转治理项

1. 剩余 `336` 条经营缺口继续纳入后续数据治理专项。
2. 后续若继续补录，应复用当前 Task 8 的补录脚本、截图取证和复验模板。
3. 本轮签字纪要应明确：遗留问题属于“数据治理存量”，不是“当前页面不可用”。

## 6. 立即动作

1. 使用 `docs/plans/2026-04-06-data-screen-business-signoff-minutes-draft.md` 发起签字评审。
2. 使用 `docs/plans/2026-04-06-data-screen-remediation-verification-round1-draft.md` 作为复验附件。
3. 使用 `docs/plans/2026-04-06-data-screen-screenshot-evidence-record.md` 作为页面证据附件。