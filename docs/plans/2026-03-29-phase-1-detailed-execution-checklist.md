# 第一阶段止血实施清单（细化版）

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将第一阶段止血目标进一步拆解为可直接执行的实施清单，覆盖安全止血、认证统一、构建修复、权限底线和最小测试基线，确保后续执行不依赖临场发挥。

**Architecture:** 本清单严格受第一阶段止血计划约束，只处理高危安全暴露点、认证链路分裂、构建阻塞、开发态关键不稳定性和最低测试基线问题。所有改动应优先复用现有单体结构，不引入第二套长期机制，不夹带第二阶段业务重构需求。

**Tech Stack:** Next.js 16、TypeScript、Drizzle ORM、PostgreSQL、Playwright、Vitest、Docker、GitHub Actions 或等价 CI

---

## 1. 使用说明

本清单是 [2026-03-29-phase-1-stop-bleeding-implementation-plan.md](2026-03-29-phase-1-stop-bleeding-implementation-plan.md) 的实施级展开版本。

执行要求：

1. 每次只执行一个 Task。
2. 未完成当前 Task 的验证，不进入下一个 Task。
3. 如果发现任务跨入第二阶段业务重构范围，停止并上报。
4. 每个 Task 完成后，必须更新实施状态记录。

## 2. 本阶段实施顺序

建议严格按以下顺序推进：

1. 基线台账与范围冻结
2. 硬编码配置移除
3. 测试后门与演示入口关闭
4. 认证与会话统一
5. 无负责人项目可见性和关键 `403` 语义兜底
6. 生产构建修复
7. 开发态登录页稳定性修复
8. 最小测试基线建立
9. 最小 CI 门槛建立
10. 发布与回滚清单建立

## 3. Task 1：建立第一阶段基线台账

**Files:**
- Modify: `ISSUE_SUMMARY_v1.md`
- Modify: `docs/plans/2026-03-29-production-hardening-and-business-refactor-plan.md`
- Create: `docs/plans/phase-1-baseline-checklist.md`

**Step 1: 整理本阶段风险范围**

把以下问题纳入第一阶段：

1. 硬编码数据库凭据
2. 测试后门接口
3. 双 JWT 实现
4. `TEST_MODE` 鉴权绕过
5. query token
6. 黑名单 fail-open
7. 默认口令和登录页测试账号展示
8. 无负责人项目可见性底线
9. 生产构建失败
10. 开发态登录页不稳定
11. 最小测试基线缺失

**Step 2: 建立台账文件**

在 `docs/plans/phase-1-baseline-checklist.md` 中建立如下字段：

1. 编号
2. 风险项
3. 对应问题编号
4. 当前状态
5. 目标状态
6. 负责模块
7. 验证方法
8. 完成日期

**Step 3: 同步上位文档**

在总方案和问题清单中标记第一阶段的实际执行范围。

**Step 4: 验证**

人工验证文档是否一致，不要求运行代码。

## 4. Task 2：移除数据库硬编码配置

**Files:**
- Modify: `src/db/index.ts`
- Modify: `env.example`
- Modify: `.env.local`
- Create: `src/shared/config/env.ts`
- Test: `tests/unit/config/env.test.ts`

**Step 1: 写配置测试**

新增配置测试，覆盖：

1. 缺少 `DATABASE_URL` 时抛出明确错误
2. `DATABASE_URL` 存在时返回配置对象

**Step 2: 提取统一配置读取层**

把环境变量读取抽到 `src/shared/config/env.ts`，避免各处直接读取和回退。

**Step 3: 改造数据库初始化**

让 `src/db/index.ts` 只通过配置层读取 `DATABASE_URL`，不允许使用硬编码默认值。

**Step 4: 更新配置模板**

在 `env.example` 中明确写出：

1. `DATABASE_URL`
2. `JWT_SECRET`
3. `NEXT_PUBLIC_APP_URL`
4. 其他第一阶段必要配置

**Step 5: 运行验证**

运行：

```bash
corepack pnpm exec tsc -p tsconfig.json --noEmit
```

预期：通过。

运行：

```bash
corepack pnpm build
```

预期：若仍失败，失败原因不再与数据库硬编码有关。

## 5. Task 3：关闭测试后门与演示账号暴露

**Files:**
- Modify: `src/middleware.ts`
- Modify: `src/app/api/test/setup-user/route.ts`
- Modify: `src/app/(auth)/login/page.tsx`
- Test: `tests/api/auth/test-setup-user.test.ts`
- Test: `tests/e2e/playwright/login-page.spec.ts`

**Step 1: 写后门负路径测试**

测试覆盖：

1. 未授权访问 `/api/test/setup-user` 被拒绝
2. 生产配置下接口不可用

**Step 2: 处理接口**

推荐方案：

1. 删除公开放行
2. 如必须保留，仅允许本地开发环境且需显式 `DEV_TEST_SETUP_ENABLED=true`
3. 同时要求管理员级校验或本地专用校验

**Step 3: 清理登录页演示信息**

删除：

1. 测试账号展示
2. 默认口令展示
3. 任何暗示生产可直接使用测试账号的文案

**Step 4: 运行验证**

运行 API 测试或手工调用验证接口被拒绝。

运行浏览器冒烟验证登录页不再展示默认凭据。

## 6. Task 4：统一认证和会话入口

**Files:**
- Modify: `src/lib/auth.ts`
- Modify: `src/lib/jwt.ts`
- Modify: `src/lib/auth-middleware.ts`
- Modify: `src/middleware.ts`
- Modify: `src/app/api/auth/login/route.ts`
- Modify: `src/app/api/auth/logout/route.ts`
- Modify: `src/app/api/auth/check-blacklist/route.ts`
- Modify: `src/app/api/events/route.ts`
- Create: `tests/unit/auth/jwt.test.ts`
- Create: `tests/api/auth/session-flow.test.ts`

**Step 1: 明确唯一认证模块**

先在文档或代码注释层明确唯一权威模块，例如统一到 `src/lib/jwt.ts` 或新建 `src/shared/auth/`。

**Step 2: 写失败测试**

至少覆盖：

1. 未登录访问受保护资源返回 `401`
2. query token 被拒绝
3. 注销后 token 失效
4. SSE 不再依赖 query token

**Step 3: 删除回退 secret 和分裂实现**

要求：

1. 只能保留一个 JWT secret 来源
2. 不能保留双回退 secret
3. 不能保留旧 helper 的 `TEST_MODE` 绕过逻辑

**Step 4: 收敛 token 提取策略**

只允许受控来源，例如：

1. HttpOnly Cookie
2. 标准 Authorization Header

**Step 5: 修正黑名单校验行为**

黑名单或注销校验失败时，不允许默认为安全通过。

**Step 6: 运行验证**

运行：

```bash
corepack pnpm exec vitest run tests/unit/auth/jwt.test.ts
corepack pnpm exec vitest run tests/api/auth/session-flow.test.ts
```

预期：通过。

## 7. Task 5：补关键权限底线

**Files:**
- Modify: `src/app/api/projects/route.ts`
- Modify: `src/app/api/dashboard/route.ts`
- Modify: `src/app/api/contracts/upload/route.ts`
- Create: `src/shared/policy/project-policy.ts`
- Create: `src/shared/policy/dashboard-policy.ts`
- Create: `src/shared/policy/commercial-policy.ts`
- Test: `tests/unit/policy/project-policy.test.ts`
- Test: `tests/api/projects/visibility.test.ts`

**Step 1: 先实现最小 policy 抽象**

不要求一次性完成全量权限系统，但必须先把最危险的权限判断抽到统一函数。

**Step 2: 兜底无负责人项目可见性**

按已定权限矩阵实现：普通成员默认不能查看无负责人项目。

**Step 3: 兜底合同材料权限**

普通成员默认不能查看或上传合同敏感材料。

**Step 4: 修正仪表盘全局视图权限**

非管理角色默认只能看自己范围。

**Step 5: 统一 `401/403` 语义**

要求：

1. 未登录返回 `401`
2. 已登录但无权限返回 `403`
3. 敏感对象是否返回 `404`，先记录为后续统一议题，不在本 Task 扩大范围

**Step 6: 运行验证**

运行策略测试和 API 测试，验证三类场景：

1. 未登录
2. 已登录但无权限
3. 已登录且有权限

## 8. Task 6：修复生产构建失败

**Files:**
- Modify: `src/app/api/contracts/upload/route.ts`
- Modify: `next.config.mjs`
- Test: `tests/api/contracts/upload-build-safety.test.ts`

**Step 1: 固化构建失败说明**

在测试或注释中记录：`/api/contracts/upload` 在构建阶段触发 `path` 类型错误。

**Step 2: 隔离构建时副作用**

重点检查：

1. 顶层初始化
2. PDF 处理库导入时副作用
3. 不适合构建时执行的对象创建

**Step 3: 最小修复**

优先采用：

1. 延迟初始化
2. 条件动态导入
3. 显式运行时声明

**Step 4: 运行验证**

运行：

```bash
corepack pnpm build
```

预期：构建通过。

## 9. Task 7：修复开发态登录页稳定性

**Files:**
- Modify: `src/app/(auth)/login/page.tsx`
- Modify: `src/app/globals.css`
- Modify: `next.config.mjs`
- Modify: `playwright.config.ts`
- Modify: `tests/e2e/playwright/smoke.spec.ts`
- Modify: `tests/e2e/playwright/manual-smoke.mjs`

**Step 1: 固化失败基线**

保留稳定复现方式和失败日志样例。

**Step 2: 排查 Turbopack 与页面渲染链**

重点关注：

1. 流式输出内容
2. hydration 时机
3. CSS/依赖解析稳定性
4. 是否需要短期回退非 Turbopack 开发模式

**Step 3: 建立临时稳定方案**

如果最终结论是 Turbopack 暂不稳定，可在第一阶段明确采用稳定 dev 模式，并在文档中标注为临时策略。

**Step 4: 运行验证**

运行：

```bash
corepack pnpm exec playwright test tests/e2e/playwright/smoke.spec.ts
node tests/e2e/playwright/manual-smoke.mjs
```

预期：登录页可稳定渲染，基础负路径 E2E 可运行。

## 10. Task 8：建立最小测试基线

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `tests/unit/config/env.test.ts`
- Create: `tests/unit/auth/jwt.test.ts`
- Create: `tests/unit/policy/project-policy.test.ts`
- Create: `tests/api/auth/session-flow.test.ts`
- Create: `tests/api/projects/visibility.test.ts`
- Modify: `playwright.config.ts`

**Step 1: 定义标准命令**

在 `package.json` 中至少补齐：

1. `typecheck`
2. `test:unit`
3. `test:api`
4. `test:e2e`
5. `test:smoke`
6. `verify:phase1`

**Step 2: 固化测试目录约定**

建议：

1. `tests/unit/`
2. `tests/api/`
3. `tests/e2e/`

**Step 3: 增加测试数据隔离说明**

禁止第一阶段测试依赖生产数据库或真实共享账号。

**Step 4: 运行验证**

运行：

```bash
corepack pnpm run test:unit
corepack pnpm run test:api
corepack pnpm run test:smoke
```

## 11. Task 9：建立最小 CI 门槛

**Files:**
- Create: `.github/workflows/ci.yml`
- Modify: `README.md`
- Modify: `QUICKSTART.md`

**Step 1: 建立流水线**

至少执行：

1. 安装依赖
2. `typecheck`
3. `build`
4. `test:unit`
5. `test:api`
6. `test:smoke`

**Step 2: 定义失败即阻断**

主分支默认以 CI 通过为合并前提。

**Step 3: 文档同步**

README 和 QUICKSTART 的命令必须与 `package.json` 保持一致。

## 12. Task 10：建立第一阶段发布与回滚清单

**Files:**
- Create: `docs/plans/phase-1-release-checklist.md`
- Create: `docs/plans/phase-1-rollback-checklist.md`

**Step 1: 发布清单至少包含**

1. 配置检查
2. 数据备份检查
3. 构建产物检查
4. 权限冒烟检查
5. 登录与注销检查
6. 核心接口冒烟检查

**Step 2: 回滚清单至少包含**

1. 回滚前提
2. 版本回退步骤
3. 配置回退步骤
4. 数据回滚注意事项
5. 责任人通知链

## 13. 第一阶段完成判定

只有以下条件全部满足，第一阶段才算完成：

1. 仓库中不再存在硬编码数据库连接串
2. 公开测试后门被删除或严格受控
3. 登录、鉴权、注销、黑名单策略统一
4. query token 不再作为默认认证入口
5. 普通成员不能查看无负责人项目
6. 合同敏感材料权限有最小兜底
7. `build` 成功
8. 登录页浏览器自动化冒烟稳定
9. 最小测试集可运行
10. CI 可运行

## 14. 执行记录模板

每完成一个 Task，建议追加一条执行记录，格式如下：

```markdown
## Task X 执行记录

- 日期：2026-03-29
- 执行人：
- 目标：
- 实际改动：
- 验证结果：
- 是否与上位计划一致：是 / 否
- 残余风险：
- 是否可进入下一 Task：是 / 否
```

## 15. 结论

本清单的目的不是让第一阶段变得更大，而是让第一阶段变得更可执行。

它应当被视为后续实际整改的操作面，而不是新的策略面。

后续如果进入执行，建议直接以本清单为顺序逐 Task 推进，而不是回到按问题随机修补的方式。

## Task 2 执行记录

- 日期：2026-03-29
- 执行人：GitHub Copilot
- 目标：移除源码中的数据库硬编码配置，建立统一环境变量读取入口
- 实际改动：新增 `src/shared/config/env.ts` 作为最小配置读取层；将 `src/db/index.ts` 改为强制读取 `DATABASE_URL`；更新 `env.example` 与 `.env.local`；新增 `tests/unit/config/env.test.ts`
- 验证结果：新增配置测试通过；`tsc -p tsconfig.json --noEmit` 通过；`pnpm build` 仍失败，但失败点仍为既有 `/api/contracts/upload` 构建问题，不再与数据库硬编码或缺失 `DATABASE_URL` 相关
- 是否与上位计划一致：是
- 残余风险：当前 `.env.local` 使用的是占位数据库连接串，后续本地运行仍需替换为真实可用环境配置
- 是否可进入下一 Task：是

## Task 3 执行记录

- 日期：2026-03-29
- 执行人：GitHub Copilot
- 目标：关闭测试后门公开入口，并清理登录页演示账号与默认口令暴露
- 实际改动：移除 `src/middleware.ts` 与 `src/lib/auth-middleware.ts` 中对 `/api/test/setup-user` 的公开放行；将 `src/app/api/test/setup-user/route.ts` 改为默认关闭，仅允许显式本地开发开关 + `TEST_SECRET`；将 `src/app/(auth)/login/page.tsx` 的预填账号密码改为空，并移除演示账号文案；新增 `tests/api/auth/test-setup-user.test.ts`、`tests/e2e/playwright/login-page.spec.ts`，并补充最小 `vitest.config.ts` 以支持测试别名解析
- 验证结果：`corepack pnpm exec vitest run tests/api/auth/test-setup-user.test.ts` 通过；`corepack pnpm exec playwright test tests/e2e/playwright/login-page.spec.ts` 通过
- 是否与上位计划一致：是
- 残余风险：人员创建与人员管理链路中的默认口令 `123456` 仍然存在，属于同一风险项的剩余部分，需在后续 Task 中继续处理
- 是否可进入下一 Task：是

## Task 4 执行记录

- 日期：2026-03-29
- 执行人：GitHub Copilot
- 目标：统一认证与会话实现，移除默认 query token 入口，关闭 `TEST_MODE` 绕过，并修正黑名单 fail-open
- 实际改动：将 `src/lib/jwt.ts` 收敛为唯一认证与会话权威实现；将 `src/lib/auth.ts` 改为兼容门面并删除 `TEST_MODE` 旁路；`src/lib/auth-middleware.ts` 改为统一走已验证会话上下文；`src/middleware.ts` 的黑名单检查失败不再默认放行；`src/app/api/auth/logout/route.ts`、`src/app/api/auth/check-blacklist/route.ts`、`src/app/api/auth/refresh/route.ts` 统一复用会话 helper；`src/app/api/events/route.ts` 与 `src/hooks/use-sse.ts` 改为同源 Cookie 会话，不再使用 query token；新增 `tests/unit/auth/jwt.test.ts`、`tests/api/auth/session-flow.test.ts`
- 验证结果：`corepack pnpm exec vitest run tests/unit/auth/jwt.test.ts tests/api/auth/session-flow.test.ts` 通过；`corepack pnpm exec tsc -p tsconfig.json --noEmit` 通过
- 是否与上位计划一致：是
- 残余风险：前端认证上下文仍保留本地 `localStorage token` 镜像，虽然已不再作为 SSE 的默认认证入口，但后续仍建议继续向纯 HttpOnly Cookie 会话收敛
- 是否可进入下一 Task：是

## Task 5 执行记录

- 日期：2026-03-29
- 执行人：GitHub Copilot
- 目标：补齐第一阶段最危险的权限底线，至少兜住无负责人项目可见性、仪表盘全局视图和合同材料上传权限
- 实际改动：新增 `src/shared/policy/project-policy.ts`、`src/shared/policy/dashboard-policy.ts`、`src/shared/policy/commercial-policy.ts` 三个最小 policy 文件；`src/app/api/projects/route.ts` 改为仅管理角色可见无负责人项目；`src/app/api/dashboard/route.ts` 改为非管理角色默认使用 self scope，并同步收敛方案/任务统计口径；`src/app/api/contracts/upload/route.ts` 增加合同敏感材料上传权限兜底；新增 `tests/unit/policy/project-policy.test.ts` 和 `tests/api/projects/visibility.test.ts`
- 验证结果：`corepack pnpm exec vitest run tests/unit/policy/project-policy.test.ts tests/api/projects/visibility.test.ts` 通过；`corepack pnpm exec tsc -p tsconfig.json --noEmit` 通过
- 是否与上位计划一致：是
- 残余风险：合同材料上传接口当前缺少项目上下文，因此第一阶段只能先实现“普通成员默认拒绝”的底线策略，后续阶段仍需基于项目关系和商务流程做更细粒度授权
- 是否可进入下一 Task：是

## Task 6 执行记录

- 日期：2026-03-29
- 执行人：GitHub Copilot
- 目标：修复 `/api/contracts/upload` 造成的生产构建失败
- 实际改动：移除 `src/lib/pdfjs-setup.ts` 的模块加载即自动配置；将 `src/app/api/contracts/upload/route.ts` 中的对象存储初始化、PDF.js 配置、`pdf-to-img` 和 `pdf-parse` 全部延迟到请求处理阶段；显式声明 `runtime = 'nodejs'`；新增 `tests/api/contracts/upload-build-safety.test.ts` 防止导入期副作用回归
- 验证结果：`corepack pnpm exec vitest run tests/api/contracts/upload-build-safety.test.ts` 通过；`corepack pnpm exec tsc -p tsconfig.json --noEmit` 通过；`corepack pnpm build` 通过
- 是否与上位计划一致：是
- 残余风险：当前仓库仍保留 Next.js 16 对 `middleware` 文件约定的弃用告警，虽然不阻塞构建，但后续阶段应评估迁移到 `proxy` 约定
- 是否可进入下一 Task：是

## Task 7 执行记录

- 日期：2026-03-29
- 执行人：GitHub Copilot
- 目标：修复开发态登录页稳定性，建立第一阶段可接受的稳定 dev 运行方式
- 实际改动：将 `package.json` 中默认 `dev`/`dev:monitored` 脚本从 Turbopack 强制切换为 `next dev --webpack -p 5000`，并保留 `dev:turbopack` 作为显式可选项；`playwright.config.ts` 增加稳定 dev server 启动配置；调整 `tests/e2e/playwright/smoke.spec.ts` 与 `tests/e2e/playwright/manual-smoke.mjs`，使其聚焦登录页稳定渲染与前端交互，不再依赖本地真实数据库返回登录失败
- 验证结果：在 `--webpack` dev 模式下，`corepack pnpm exec playwright test tests/e2e/playwright/smoke.spec.ts` 通过；`node tests/e2e/playwright/manual-smoke.mjs` 输出登录页标题、表单可见性和客户端校验通过
- 是否与上位计划一致：是
- 残余风险：当前 `.env.local` 仍是占位数据库连接串，因此本地 dev 环境下真实登录 API 仍不能作为稳定 smoke 基线的一部分
- 是否可进入下一 Task：是

## Task 8 执行记录

- 日期：2026-03-29
- 执行人：GitHub Copilot
- 目标：建立第一阶段最小测试基线和统一脚本入口
- 实际改动：在 `package.json` 中新增 `typecheck`、`test:api`、`test:smoke`、`verify:phase1`；保留并复用现有 `tests/unit/`、`tests/api/`、`tests/e2e/` 目录；新增 `tests/README.md` 说明第一阶段测试数据隔离要求
- 验证结果：`corepack pnpm run test:unit` 通过；`corepack pnpm run test:api` 通过；`corepack pnpm run test:smoke` 通过
- 是否与上位计划一致：是
- 残余风险：CI 门槛尚未建立，当前测试基线只在本地得到验证
- 是否可进入下一 Task：是

## Task 9 执行记录

- 日期：2026-03-29
- 执行人：GitHub Copilot
- 目标：建立第一阶段最小 CI 门槛，并让 README/QUICKSTART 与实际脚本保持一致
- 实际改动：新增 `.github/workflows/ci.yml`，在 CI 中串联 `typecheck`、`build`、`test:unit`、`test:api`、`test:smoke`；同步更新 `README.md` 和 `QUICKSTART.md` 的安装、dev 模式、验证命令说明；修正 `verify:phase1` 以显式使用 `corepack pnpm`
- 验证结果：`corepack pnpm run verify:phase1` 已顺序通过 `typecheck`、`test:unit`、`test:api`、`test:smoke`，并进入最终 `build`；该构建链路已在前序 Task 6 中单独验证通过
- 是否与上位计划一致：是
- 残余风险：当前 CI 使用占位 `DATABASE_URL` 和 `JWT_SECRET` 作为第一阶段静态校验环境，后续若引入真实数据库集成测试，需要单独补隔离数据库或服务容器
- 是否可进入下一 Task：是

## B07 收尾记录

- 日期：2026-03-29
- 执行人：GitHub Copilot
- 目标：收尾第一阶段风险项 B07，移除人员管理中的默认口令策略
- 实际改动：`src/app/api/staff/route.ts` 不再对空密码回退到 `123456`，改为对人员创建请求执行 `createUserSchema` 服务端校验；`src/app/staff/page.tsx` 将新增人员表单改为“密码必填”，移除“默认: 123456”提示并明确初始密码规则；新增 `tests/api/staff/create-staff.test.ts`，覆盖“缺少密码返回校验失败”和“显式密码才允许入库”的回归场景
- 验证结果：`corepack pnpm exec vitest run tests/api/staff/create-staff.test.ts` 通过；`corepack pnpm exec tsc -p tsconfig.json --noEmit` 通过；`corepack pnpm run test:api` 通过；`corepack pnpm exec playwright test tests/e2e/playwright/smoke.spec.ts` 通过；`corepack pnpm build` 通过
- 是否与上位计划一致：是
- 残余风险：第一阶段已经移除默认口令策略，但尚未建立“首次登录强制改密 / 邀请激活 / 密码重置审计”完整账号生命周期，这属于第二阶段身份治理范围
- 是否可进入下一 Task：是

## Phase 1 完成性复核

- 日期：2026-03-29
- 复核人：GitHub Copilot
- 复核范围：`docs/plans/2026-03-29-phase-1-stop-bleeding-implementation-plan.md` 第 1 节至第 3 节、`docs/plans/phase-1-baseline-checklist.md`
- 复核结论：第一阶段可以判定完成，可以进入下一阶段治理

### 对照验收标准

1. 仓库中不存在硬编码生产敏感凭据：满足。数据库连接已强制改为 `DATABASE_URL`。
2. 仓库中不存在公开测试后门接口：满足。测试初始化接口已默认关闭，仅允许显式本地受控开启。
3. 登录、鉴权、注销、会话失效走统一链路：满足。JWT、注销、黑名单和 SSE 鉴权已统一到同一条会话链路。
4. `build` 可通过：满足。`corepack pnpm build` 通过。
5. 最小冒烟测试可通过：满足。`corepack pnpm exec playwright test tests/e2e/playwright/smoke.spec.ts` 3 项通过。
6. 关键权限负路径有自动化测试：满足。已覆盖测试后门拒绝、未登录访问受保护资源、query token 拒绝、无负责人项目可见性限制、人员创建缺少密码拒绝等负路径。
7. 有基础 CI 门槛：满足。`.github/workflows/ci.yml` 已串联 `typecheck`、`build`、`test:unit`、`test:api`、`test:smoke`。

### 进入下一阶段前的已知前提

1. 下一阶段应继续停留在已批准的治理路线内，不应回到随机修补模式。
2. 下一阶段的重点应转入业务状态机、审批实体、方案模型收敛和身份生命周期治理，而不是重复第一阶段的安全止血。
3. 当前仍存在非阻塞遗留项：Next.js `middleware` 约定弃用告警、本地 `.env.local` 仍是占位数据库连接串、完整账号生命周期尚未建立。这些不阻塞第一阶段完成判断，但需要在后续治理中纳入明确任务。