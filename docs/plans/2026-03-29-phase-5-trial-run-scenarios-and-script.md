# 第五阶段试运行脚本与场景清单

日期：2026-03-29

## 1. 试运行目标

按可复验场景验证主链路、异常路径、权限边界和投产前工程门禁，不允许自由发挥式试用。

## 2. 主流程场景

### 场景 A：客户/项目/方案主链路可见

步骤：

1. 使用业务验收账号登录系统
2. 进入客户管理、项目管理、方案管理页面
3. 分别检查页面是否返回业务可解释的数据结果，而不是权限拒绝、空白列表或错误格式提示

预期：业务账号可进入“客户/项目/方案”主链路并获得符合接口契约的数据结构

### 场景 B：候选版本门禁通过

步骤：

1. 执行 `corepack pnpm run verify:release-candidate`
2. 记录 typecheck、build、unit、api、smoke 结果

预期：全部通过

### 场景 C：仪表盘指标接口返回统一口径

步骤：

1. 执行 `tests/api/dashboard/dashboard-route.test.ts`
2. 执行 `tests/api/dashboard/dashboard-stats-route.test.ts`

预期：返回 `totalProjects`、`projectsByStage`、`totalSolutions`、`pendingTasks` 等统一口径字段

### 场景 D：投标审批链路受统一审批服务约束

步骤：

1. 执行 `tests/api/projects/bidding-approvals.test.ts`
2. 复核审批发起与状态变更路径

预期：审批请求走统一审批实体，不再由局部 route 自定义状态

### 场景 E：权限边界不允许普通成员越权

步骤：

1. 执行 `tests/unit/policy/project-policy.test.ts`
2. 执行 `tests/api/projects/visibility.test.ts`

预期：普通成员不可见无负责人项目，不可见全局仪表盘

### 场景 F：身份敏感操作保留审计轨迹

步骤：

1. 执行 `tests/api/identity/staff-password-lifecycle.test.ts`
2. 检查创建账号、重置密码、修改密码路径

预期：敏感操作进入密码生命周期和审计链路

## 3. 异常流程场景

### 场景 G：隔离环境健康检查异常

步骤：

1. 启动隔离影子环境
2. 访问 `/api/health`

预期：应返回 200；若返回 401，则登记为阻断问题

### 场景 H：新环境初始化失败

步骤：

1. 通过 `drizzle-kit push` 初始化隔离数据库
2. 调用 `POST /api/db/seed`

预期：应成功初始化；若失败，则登记为阻断问题并定位根因

## 4. 记录模板

每个场景至少记录：

1. 执行时间
2. 执行入口
3. 实际结果
4. 与预期是否一致
5. 问题编号