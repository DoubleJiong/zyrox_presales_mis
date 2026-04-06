# 数据大屏补录复验记录模板

日期：2026-04-06

适用阶段：Task 8 数据补录完成后的业务复验留档

关联文档：

1. `docs/plans/2026-04-06-data-screen-data-remediation-backlog.md`
2. `docs/plans/2026-04-06-data-screen-business-remediation-walkthrough-list.md`
3. `docs/plans/2026-04-06-data-screen-metric-reconciliation-record.md`
4. `docs/plans/2026-04-06-data-screen-issue-ledger.md`

## 1. 复验基本信息

| 字段 | 填写内容 |
| --- | --- |
| 复验日期 |  |
| 复验人 |  |
| 复验角色 | 管理层 / 经营负责人 / 售前负责人 |
| 业务账号 |  |
| 运行环境 | formal `next start -p 5004` |
| BUILD_ID | `QtQJ7V2Xl8fJVkIswY6tx` |
| 关联样本ID |  |
| 关联项目 ID / 记录 ID |  |
| 对应差异编号 | `DS-ACC-005` / `DS-ACC-006` / 其他 |

## 2. 补录动作记录

| 字段 | 填写内容 |
| --- | --- |
| 补录模块 | 售前服务记录 / 商机子表 / 测试数据清理 |
| 补录对象 |  |
| 补录字段 |  |
| 补录前值 |  |
| 补录后值 |  |
| 补录执行人 |  |
| 补录完成时间 |  |
| 备注 |  |

## 3. 五联证据记录

### 3.1 页面表现

| 证据项 | 补录前 | 补录后 | 判定 |
| --- | --- | --- | --- |
| `/data-screen` 预警提示 |  |  |  |
| 角色专属面板关键读数 |  |  |  |
| drill-through 跳转结果 |  |  |  |

### 3.2 接口响应

| 接口字段 | 补录前 | 补录后 | 判定 |
| --- | --- | --- | --- |
| `missingWorklogRecordCount` / `missingWinProbabilityCount` |  |  |  |
| 相关汇总字段 |  |  |  |
| 其他关键字段 |  |  |  |

### 3.3 数据库事实

| 数据库核对项 | 补录前 | 补录后 | 判定 |
| --- | --- | --- | --- |
| 源记录是否存在 |  |  |  |
| 字段是否已回填 |  |  |  |
| 测试数据是否已隔离 |  |  |  |

### 3.4 自动化与环境背景

| 项目 | 结果 |
| --- | --- |
| `verify:acceptance:5004` 基线 | `40 passed (1.6m)` |
| 本次是否重新跑自动化 |  |
| 若未跑自动化，原因 |  |

## 4. 复验结论

| 结论项 | 填写内容 |
| --- | --- |
| 页面是否恢复可解释值 |  |
| 接口是否与页面一致 |  |
| 是否仍需继续补录 |  |
| 是否允许进入签字 |  |

## 5. 遗留问题

1.  
2.  
3.  

## 6. 后续动作

1. 如复验通过：将结果同步到 `docs/plans/2026-04-06-data-screen-metric-reconciliation-record.md`，并准备签字纪要。
2. 如复验未通过：将问题补录到 `docs/plans/2026-04-06-data-screen-issue-ledger.md`，并重新安排下一轮补录。
