# 第四阶段试运行候选版本验证报告

日期：2026-03-29

## 1. 候选范围

本候选版本覆盖：

1. 第三阶段主链路收敛结果
2. 第四阶段发布门禁升级
3. 第四阶段健康检查与部署标准化
4. 第四阶段监控、告警、运行手册基线

## 2. 候选验证入口

1. `corepack pnpm run verify:pr`
2. `corepack pnpm run verify:release-candidate`
3. `corepack pnpm run test:api -- --run tests/api/system/health-route.test.ts`
4. `docker compose config`
5. 隔离 PostgreSQL 容器备份恢复演练

## 3. 本次验证结果

1. `verify:pr`：通过
2. `verify:release-candidate`：通过
3. `tests/api/system/health-route.test.ts`：已纳入 API 门禁并通过
4. `docker compose config`：通过
5. 备份恢复演练：通过，恢复后 `drill_validation` 记录数为 `1`

## 4. 版本冻结规则

1. 进入第五阶段后，仅允许修复试运行暴露的阻断问题。
2. 不新增业务功能。
3. 不重新发散状态机、审批模型、方案模型。

## 5. 当前结论

1. 候选版本已具备 PR、候选发布、正式发布三级门禁定义。
2. 候选版本已具备存活与就绪检查接口。
3. 候选版本已具备环境模板、容器部署基线和运行手册。
4. 候选版本已完成一次隔离数据库备份恢复演练，具备进入第五阶段试运行的工程条件。

## 6. 风险备注

1. 现有 E2E 仍偏轻量，试运行前应补齐项目主链路与审批链路页面级回归。
2. 真实试运行环境仍应再做一次面向目标数据库连接信息的恢复演练留档。