# 第四阶段测试金字塔与发布回归基线

日期：2026-03-29

## 1. 目标

将测试从“有若干可运行用例”升级为“发布前边界清晰、执行入口固定、失败可阻断”的发布回归体系。

## 2. 测试分层

### 单元测试

覆盖对象：policy、service、adapter、状态流转规则、权限判断、口令生命周期、仪表盘口径聚合。

当前基线：

1. `tests/unit/project/**`
2. `tests/unit/approval/**`
3. `tests/unit/solution/**`
4. `tests/unit/dashboard/**`

准入要求：新增治理规则必须先有单元测试，再允许进入 API 或页面回归。

### API 测试

覆盖对象：核心主流程接口、鉴权负路径、审批提交、仪表盘汇总、身份生命周期接口、健康检查接口。

当前基线：

1. `tests/api/projects/**`
2. `tests/api/solutions/**`
3. `tests/api/dashboard/**`
4. `tests/api/identity/**`
5. `tests/api/system/health-route.test.ts`

准入要求：所有核心主链路接口至少具备 1 条成功路径和 1 条阻断路径。

### E2E 与冒烟

覆盖对象：登录页、基础认证、核心页面首屏、发布后最小可用链路。

当前基线：

1. `tests/e2e/playwright/login-page.spec.ts`
2. `tests/e2e/playwright/smoke.spec.ts`

后续补充重点：项目主链路、审批流、方案评审、仪表盘关键指标展示。

## 3. 发布回归集合

### PR 级校验

执行命令：`corepack pnpm run verify:pr`

阻断项：

1. `typecheck`
2. `test:unit`
3. `test:api`

### 候选发布校验

执行命令：`corepack pnpm run verify:release-candidate`

阻断项：

1. `verify:pr`
2. `build`
3. `test:smoke`

### 正式发布校验

执行命令：`corepack pnpm run verify:release`

阻断项：

1. `verify:release-candidate`
2. `test:e2e`

## 4. 失败处理时限

1. PR 门禁失败：提交人 4 小时内确认与处理。
2. 候选发布门禁失败：发布负责人当日关闭，不允许进入试运行版本冻结。
3. 正式发布门禁失败：默认停止发布窗口，除非技术负责人和业务负责人共同批准降级策略。

## 5. 结论

第四阶段起，不再允许临时决定“本次发版测哪些”。执行入口以 `verify:pr`、`verify:release-candidate`、`verify:release` 为唯一真相源。