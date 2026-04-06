# 数据大屏 Task 8 业务确认单

日期：2026-04-06

用途：第一批补录执行前，收集业务必须确认的最小字段集合；在当前测试数据主导的 acceptance 环境下，也可作为默认填充值确认单直接使用。

关联文档：

1. `docs/plans/2026-04-06-data-screen-a1-remediation-runbook.md`
2. `scripts/admin/data-screen/task8-a1-opportunity-backfill-template.sql`
3. `scripts/admin/data-screen/task8-presales-worklog-backfill-template.sql`
4. `docs/plans/2026-04-06-data-screen-remediation-verification-round1-draft.md`

## 1. 当前已确认事实

1. `BS-01` 到 `BS-05` 在 formal 库中均无 `bus_project_opportunity` 记录。
2. 这 5 条样本在 `bus_project` 中也都没有 `opportunityId`，因此不存在可直接继承的 legacy 商机字段。
3. `PS-01/02` 两条售前记录保留了服务描述，但 `serviceDate`、`durationHours`、`totalWorkHours` 当前均为空。

结论：本轮补录无法依赖系统回填。在当前测试数据主导的 acceptance 环境下，已允许使用默认测试值直接执行第一批补录。

## 2. 经营样本待确认字段

| 样本ID | 项目ID | 项目名称 | 已知值 | 需业务确认字段 | 确认结果 |
| --- | ---: | --- | --- | --- | --- |
| BS-01 | 301 | 河南省委-数智后勤 | `opportunityStage=qualified`、`expectedAmount=70000000.00` | `winProbability=70`、`expectedCloseDate=2026-05-31`、`nextAction=测试数据回填：推进 qualified 阶段商机` | 测试默认值 |
| BS-02 | 312 | 新乡学院 | `opportunityStage=qualified`、`expectedAmount=36000000.00` | `winProbability=70`、`expectedCloseDate=2026-06-05`、`nextAction=测试数据回填：推进 qualified 阶段商机` | 测试默认值 |
| BS-03 | 168 | 某军校信息化智能化教学条件整体建设 | `opportunityStage=qualified`、`expectedAmount=21168780.00` | `winProbability=70`、`expectedCloseDate=2026-06-10`、`nextAction=测试数据回填：推进 qualified 阶段商机` | 测试默认值 |
| BS-04 | 169 | 海南省文化艺术学校智慧校园 | `opportunityStage=qualified`、`expectedAmount=20000000.00` | `winProbability=70`、`expectedCloseDate=2026-06-15`、`nextAction=测试数据回填：推进 qualified 阶段商机` | 测试默认值 |
| BS-05 | 185 | 台州学院中行银校合作项目 | `opportunityStage=qualified`、`expectedAmount=20000000.00` | `winProbability=70`、`expectedCloseDate=2026-06-20`、`nextAction=测试数据回填：推进 qualified 阶段商机` | 测试默认值 |

## 3. 售前样本待确认字段

| 样本ID | 记录ID | 项目名称 | 已知值 | 需业务确认字段 | 确认结果 |
| --- | ---: | --- | --- | --- | --- |
| PS-01 | 1 | 智慧校园平台建设 | 责任人=`张伟`；服务类型=`需求调研与分析`；描述=`深入调研客户需求，完成需求文档编写` | `serviceDate=2026-03-29 09:00:00`、`durationHours=8.00`、`totalWorkHours=8.00` | 测试默认值 |
| PS-02 | 2 | 智慧校园平台建设 | 责任人=`李芳`；服务类型=`方案设计与编写`；描述=`根据需求设计技术方案架构` | `serviceDate=2026-03-29 14:00:00`、`durationHours=10.00`、`totalWorkHours=10.00` | 测试默认值 |

## 4. 现场确认规则

1. 当前 acceptance 环境可直接使用本确认单中的测试默认值，不再把业务确认作为执行前阻塞项。
2. 若后续切换到真实业务数据环境，再恢复“业务明确给值优先”的规则。
3. `nextAction`、`status` 如无业务明确要求，可保留模板默认值或维持现状，不作为阻塞字段。
4. 本确认单确认后，可直接执行对应 SQL 模板中的 seed 表。

## 5. 确认完成后的动作

1. 将确认结果同步写入 `scripts/admin/data-screen/task8-a1-opportunity-backfill-template.sql`。
2. 将确认结果同步写入 `scripts/admin/data-screen/task8-presales-worklog-backfill-template.sql`。
3. 执行改库后，将补录结果写入 `docs/plans/2026-04-06-data-screen-remediation-verification-round1-draft.md`。