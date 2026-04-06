# 数据大屏 A1 区域第一批补录操作手册

日期：2026-04-06

适用范围：Task 8 第一批真实数据补录执行准备

关联文档：

1. `docs/plans/2026-04-06-data-screen-data-remediation-backlog.md`
2. `docs/plans/2026-04-06-data-screen-business-remediation-walkthrough-list.md`
3. `docs/plans/2026-04-06-data-screen-remediation-verification-round1-draft.md`
4. `scripts/admin/data-screen/task8-a1-opportunity-backfill-template.sql`
5. `scripts/admin/data-screen/task8-presales-worklog-backfill-template.sql`
6. `docs/plans/2026-04-06-data-screen-task8-business-confirmation-sheet.md`

## 1. 本轮目标

本轮不是处理全部 `356` 条真实业务缺口，而是先处理最能改变经营视图判断的第一批高影响样本。

本轮范围限定为：

1. 经营补录：`BS-01` 到 `BS-05`
2. 售前补录：`PS-01`、`PS-02`
3. 测试数据隔离确认：`TD-01`、`TD-02`

## 2. 本轮样本清单

| 样本ID | 项目ID / 记录ID | 项目名称 | 区域 | 当前问题 |
| --- | --- | --- | --- | --- |
| PS-01 | 记录 `1` | 智慧校园平台建设 | 华北 | 售前工时未填 |
| PS-02 | 记录 `2` | 智慧校园平台建设 | 华北 | 售前工时未填 |
| BS-01 | 项目 `301` | 河南省委-数智后勤 | 河南 | 缺失 `bus_project_opportunity` |
| BS-02 | 项目 `312` | 新乡学院 | 河南 | 缺失 `bus_project_opportunity` |
| BS-03 | 项目 `168` | 某军校信息化智能化教学条件整体建设 | 重庆 | 缺失 `bus_project_opportunity` |
| BS-04 | 项目 `169` | 海南省文化艺术学校智慧校园 | 海南 | 缺失 `bus_project_opportunity` |
| BS-05 | 项目 `185` | 台州学院中行银校合作项目 | 温台 | 缺失 `bus_project_opportunity` |
| TD-01 | 项目 `728` | 稳定性归档编辑项目-1774937711834 | 新疆 | 测试数据，需隔离确认 |
| TD-02 | 项目 `731` | 稳定性归档编辑项目-1774938331333 | 新疆 | 测试数据，需隔离确认 |

## 3. 执行前准备

1. 确认 formal 环境仍为 `next start -p 5004`，且 BUILD_ID 为 `QtQJ7V2Xl8fJVkIswY6tx`。
2. 保留当前 `/api/data-screen/overview` 与 `/api/data-screen/presales-focus-summary` 的补录前快照。
3. 使用 `scripts/admin/data-screen/task8-a1-opportunity-backfill-template.sql` 先执行补录前校验查询。
4. 当前 acceptance 环境以测试数据为主，本轮允许直接使用默认测试值执行 `BS-01` 至 `BS-05` 与 `PS-01/02`。
5. 售前工时补录应使用 `scripts/admin/data-screen/task8-presales-worklog-backfill-template.sql` 做补录前后校验。
6. 若需要追溯默认值来源，统一以 `docs/plans/2026-04-06-data-screen-task8-business-confirmation-sheet.md` 为准，不要在 SQL 文件里临时改口径。

## 4. 经营补录执行顺序

### 4.1 第一优先批次

1. `BS-01`：河南省委-数智后勤
2. `BS-02`：新乡学院
3. `BS-03`：某军校信息化智能化教学条件整体建设

执行目标：

1. 让经营漏斗先从 `0%` / `¥0.0万` 的极端误导态退出。
2. 用河南、重庆两个高影响区域先验证补录链路是否正确。

### 4.2 第二优先批次

1. `BS-04`：海南省文化艺术学校智慧校园
2. `BS-05`：台州学院中行银校合作项目

执行目标：

1. 验证海南、温台区域在高金额但低数量情况下的补录效果。
2. 观察区域贡献解释是否开始恢复一致性。

## 5. 售前补录执行顺序

1. 先补 `PS-01`，再补 `PS-02`。
2. 每补完一条后，确认项目工时合计是否按预期累加。
3. 两条都完成后，再统一检查 `missingWorklogRecordCount` 是否归零。

## 6. 测试数据隔离原则

1. `TD-01`、`TD-02` 不进入业务签字样本。
2. 本轮只要求确认其处置策略，不默认执行删除。
3. 如业务与测试共同确认可清理，再单独形成测试数据治理动作，不与真实业务补录混跑。

## 7. SQL 执行要求

1. 所有 `bus_project_opportunity` 写入必须放在显式事务里执行。
2. SQL 模板中的 `win_probability`、`expected_close_date` 为待填字段，禁止直接使用占位值上线。
3. `expected_amount` 可优先沿用项目主表 `estimated_amount`，但应由业务确认是否需要修正。
4. 插入语句必须保证“目标项目当前确实缺失子表记录”，避免重复写入触发唯一约束。

## 8. 执行后核对

1. 复查 `BS-01` 到 `BS-05` 的 `bus_project_opportunity` 是否都已存在。
2. 复查 `/api/data-screen/overview` 中 `missingWinProbabilityCount` 是否下降。
3. 复查 `avgWinProbability` 与 `weightedPipeline` 是否开始恢复为正值。
4. 复查 `PS-01`、`PS-02` 对应记录的工时字段是否已回填。
5. 将结果写入 `docs/plans/2026-04-06-data-screen-remediation-verification-round1-draft.md`。

## 9. 风险边界

1. 本手册只准备执行，不授权直接改库。
2. 当前 `BS-01` 至 `BS-05` 没有可继承的 legacy 商机字段，`PS-01/02` 也没有可继承的工时或服务日期字段；待填值必须来自业务确认，而不是来自系统推断。
3. 如业务无法给出 `winProbability` 或 `expectedCloseDate`，该项目应暂缓补录，不用研发默认值替代签字数据。
4. 如补录完成后大屏缺口计数未变化，再回头排查聚合逻辑或缓存问题，而不是继续盲目补数据。
