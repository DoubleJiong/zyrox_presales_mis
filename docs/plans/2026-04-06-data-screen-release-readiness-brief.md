# 数据大屏发布前回归结论与建议

日期：2026-04-06

## 1. 范围

本结论覆盖 `/data-screen` Task 6 至 Task 8 第一刀当前状态，重点包括：

1. 角色化首屏预设
2. `personal-focus` 个人推进面板
3. `presales-focus` 售前支持负载面板
4. `management` 与 `business-focus` 专属首屏面板
5. 5004 formal runtime 回归状态

## 2. 当前正式基线

1. BUILD_ID：`h2ldgb7X394AARaJg-WCT`
2. 运行口径：`next start -p 5004`
3. 统一门禁：`verify:acceptance:5004 = 41 passed (1.6m)`
4. focused cockpit spec：通过
5. overview API contract：通过 `1/1`
6. presales-focus API contract：通过 `2/2`
7. repeated switching stability spec：通过

## 3. 当前结论

### 3.1 已通过项

1. 新角色视图切片已进入正式 webpack 产物，不再停留在 current-source 验证。
2. 统一门禁已在 fresh formal runtime 上通过，说明稳定性扫与驾驶舱专项规格已重新对齐。
3. 角色视图行为、默认 tab、专属读模型与当前计划文档一致。
4. 数据大屏此前的高频切换挂页问题已完成前后端根因修复，并纳入正式自动化回归。

### 3.2 未完成项

1. 真实业务样本对账尚未完成。
2. 管理层、销售负责人、售前负责人三类业务签字结论尚未落档。
3. 首轮正式快照暴露出的管理层“区域贡献 TOP3”排序语义已通过代码修正为按金额排序专属榜单；售前负责人视图与经营负责人视图也已分别新增未填工时、未填赢率提示。2026-04-06 四轮 formal 补录后，最新快照已变为 `missingWorklogRecordCount=0`、`missingWinProbabilityCount=336`、`avgWinProbability=68`、`weightedPipeline=213313406`。这说明售前缺口已修复，经营视图也已从完全不可解释进一步推进到可解释状态，且 `TD-01/02` 两条测试稳定性样本已完成口径归一化。
4. `SS-01` 至 `SS-08` 页面截图证据已按第四批后的 live 指标重新落档，当前剩余重点不再是补页面证据，而是业务样本对账与业务签字。

## 4. 发布建议

当前建议结论为：`本轮先收口，不再继续第五批高金额补录，直接进入业务陪跑验收与签字评审`。

理由如下：

1. 技术正式基线已齐备。
2. 自动化回归已齐备。
3. 业务样本对账与签字尚未齐备，但当前页面、接口、数据库与自动化四层证据已足以支撑本轮收口。

## 5. 下一步建议

1. 按 `docs/plans/2026-04-06-data-screen-business-acceptance-scripts.md` 组织三类角色业务陪跑，并以当前 fourth-batch 基线作为最终评审口径。
2. 使用 `docs/plans/2026-04-06-data-screen-remediation-verification-round1-draft.md`、`docs/plans/2026-04-06-data-screen-screenshot-evidence-record.md` 与 `docs/plans/2026-04-06-data-screen-business-signoff-minutes-draft.md` 完成签字材料归档。
3. 将剩余 `336` 条经营缺口转入后续数据治理存量，不作为本轮 Task 8 收口的继续补录前置条件。
4. 业务签字完成后，更新 `docs/plans/2026-04-06-data-screen-issue-ledger.md` 与计划文档，将 Task 8 调整为“本轮完成，遗留转治理跟踪”。