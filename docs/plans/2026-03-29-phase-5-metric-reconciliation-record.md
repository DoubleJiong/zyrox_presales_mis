# 第五阶段指标对账记录

日期：2026-03-29

## 1. 对账范围

本轮对账已扩展为“自动化契约 + Excel 人工台账样本 + 页面/API/数据库证据”组合方式，目标是同时验证指标口径一致性、业务对象一致性和页面展示可复验性。

## 2. 已验证指标

### `totalProjects`

验证入口：`tests/api/dashboard/dashboard-route.test.ts`

结论：接口返回字段存在，且沿用统一仪表盘口径服务。

### `projectsByStage`

验证入口：

1. `tests/api/dashboard/dashboard-route.test.ts`
2. `tests/api/dashboard/dashboard-stats-route.test.ts`

结论：接口契约已统一为 `projectStage` 维度返回。

### `totalSolutions`

验证入口：`tests/api/dashboard/dashboard-route.test.ts`

结论：统计字段存在，沿用方案主模型口径。

### `pendingTasks`

验证入口：

1. `tests/api/dashboard/dashboard-route.test.ts`
2. `tests/api/dashboard/dashboard-stats-route.test.ts`

结论：待办字段存在，契约稳定。

## 3. 补充完成项

1. 已基于导入的 Excel 人工台账完成 16 个代表性样本的客户/项目/方案闭环对账。
2. 已完成 `/dashboard-screen` 页面卡片 `totalCustomers=369`、`totalProjects=494`、`totalSolutions=45` 与接口、数据库复算的一致性核对。
3. `projectsByStage` 分项仍以接口与数据库复算为准，因为统计页未直接展示阶段分项。

## 4. 当前判定

1. 技术口径一致性：通过
2. 真实业务样本对账：通过
3. 页面统计读数核对：通过
4. 对正式投产影响：不再构成阻断