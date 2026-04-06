# 第一阶段止血实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在不立即全面重写系统的前提下，于第一阶段快速消除最危险的生产风险，建立最小可用的安全边界、构建能力、统一认证链路和测试基线，为后续业务重构创造可控环境。

**Architecture:** 第一阶段不追求全面重构，而是围绕“安全止血、构建止血、认证统一、测试起盘”四条主线，以最小必要改动恢复系统可控性。所有改动应尽量围绕现有单体进行，优先解决高危问题、构建阻塞和认证链路分裂问题。

**Tech Stack:** Next.js 16、TypeScript、Drizzle ORM、PostgreSQL、Playwright、Vitest、Docker、GitHub Actions 或等价 CI

---

## 1. 阶段目标

第一阶段只做四件事：

1. 清除高危安全暴露点
2. 让系统能稳定构建和启动
3. 把认证与会话统一成一条链路
4. 建立最小测试基线和发布门槛

## 2. 阶段边界

### 本阶段要做

1. 处理硬编码配置、测试后门、默认口令、query token 等高危问题
2. 修复生产构建失败和开发态关键稳定性问题
3. 合并认证实现，统一令牌策略
4. 增加最小自动化测试与 CI 门槛
5. 补齐最基本的环境配置文档与运行说明

### 本阶段不做

1. 不做全面 UI 重写
2. 不做完整业务模型重构
3. 不做大规模数据库重构
4. 不做微服务拆分
5. 不做低优先级体验优化

## 3. 阶段验收标准

阶段结束时，至少要满足以下结果：

1. 仓库中不存在硬编码生产敏感凭据
2. 仓库中不存在公开测试后门接口
3. 登录、鉴权、注销、会话失效走统一链路
4. `build` 可通过
5. 最小冒烟测试可通过
6. 关键权限负路径有自动化测试
7. 有基础 CI 门槛

## 4. 任务拆分

### Task 1：建立第一阶段基线台账

**Files:**
- Modify: `ISSUE_SUMMARY_v1.md`
- Modify: `docs/plans/2026-03-29-production-hardening-and-business-refactor-plan.md`
- Create: `docs/plans/phase-1-baseline-checklist.md`

**Step 1: 整理第一阶段问题基线**

整理本阶段要覆盖的问题，并按以下标签分类：

1. 安全高危
2. 构建阻塞
3. 认证分裂
4. 测试缺失

**Step 2: 建立阶段检查清单**

输出一份检查清单，至少包括：

1. 风险项
2. 当前状态
3. 修复负责人
4. 验收方式
5. 截止时间

**Step 3: 评审并冻结第一阶段范围**

要求业务和技术负责人确认：第一阶段不夹带业务扩展需求。

### Task 2：移除硬编码敏感配置

**Files:**
- Modify: `src/db/index.ts`
- Modify: `env.example`
- Modify: `.env.local`
- Test: `tests/**/config*.test.*`

**Step 1: 写失败测试或运行时校验**

新增配置校验，要求在缺少 `DATABASE_URL` 时启动失败。

**Step 2: 实现环境变量读取**

把数据库连接改为强制从环境变量读取，不允许回退到源码硬编码连接串。

**Step 3: 补齐配置模板**

在 `env.example` 中列出必需变量和注释说明。

**Step 4: 运行验证**

运行：

```bash
corepack pnpm exec tsc -p tsconfig.json --noEmit
corepack pnpm build
```

预期：配置合法时可通过；缺失关键变量时明确失败。

### Task 3：关闭测试后门与演示化入口

**Files:**
- Modify: `src/middleware.ts`
- Modify: `src/app/api/test/setup-user/route.ts`
- Modify: `src/app/(auth)/login/page.tsx`
- Test: `tests/**/auth*.test.*`

**Step 1: 写安全负路径测试**

验证未授权情况下无法调用测试用户初始化接口。

**Step 2: 处理测试后门**

可选策略二选一，推荐第一种：

1. 直接删除测试接口并清理引用
2. 仅在显式本地开发环境且带强校验开关时开放

**Step 3: 清理登录页测试账号展示**

删除默认测试账号和默认密码展示。

**Step 4: 验证**

验证：

1. 生产配置下测试接口不可访问
2. 登录页不再展示默认口令

### Task 4：统一认证与会话实现

**Files:**
- Modify: `src/lib/auth.ts`
- Modify: `src/lib/jwt.ts`
- Modify: `src/lib/auth-middleware.ts`
- Modify: `src/middleware.ts`
- Modify: `src/app/api/auth/login/route.ts`
- Modify: `src/app/api/auth/logout/route.ts`
- Modify: `src/app/api/events/route.ts`
- Test: `tests/**/jwt*.test.*`
- Test: `tests/**/session*.test.*`

**Step 1: 统一认证设计**

明确唯一认证模块，定义：

1. token 生成
2. token 校验
3. token 刷新
4. token 注销
5. token 提取来源
6. 黑名单或失效策略

**Step 2: 删除分裂实现**

保留一个认证实现，另一套迁移或删除。

**Step 3: 禁止 query token**

除了明确允许的内部开发场景，默认禁止从 URL query 中读取 token。

**Step 4: 收敛鉴权入口**

所有 API 鉴权统一走同一中间件或 helper。

**Step 5: 补测试**

至少覆盖：

1. 登录签发 token
2. 未登录访问受保护资源返回 401
3. 注销后 token 失效
4. query token 被拒绝
5. SSE 鉴权使用统一策略

### Task 5：修复构建失败

**Files:**
- Modify: `src/app/api/contracts/upload/route.ts`
- Modify: `next.config.mjs`
- Test: `tests/**/contracts*.test.*`

**Step 1: 写复现说明**

记录 `build` 在 `/api/contracts/upload` 失败的现象和最小复现条件。

**Step 2: 隔离问题源**

排查 `path` 类型错误来自：

1. PDF 处理库
2. 动态导入
3. Node/Edge 运行时不匹配
4. 构建期执行副作用

**Step 3: 修复实现**

优先采用以下策略：

1. 将只应运行于请求时的逻辑延后到 handler 内部
2. 显式声明运行时
3. 避免构建期触发文件处理逻辑

**Step 4: 重新构建验证**

运行：

```bash
corepack pnpm build
```

预期：生产构建通过。

### Task 6：修复开发态登录页稳定性

**Files:**
- Modify: `src/app/(auth)/login/page.tsx`
- Modify: `src/app/globals.css`
- Modify: `next.config.mjs`
- Test: `tests/e2e/playwright/smoke.spec.ts`
- Test: `tests/e2e/playwright/manual-smoke.mjs`

**Step 1: 固化复现方式**

记录以下现象：

1. `/login` 返回 200
2. 浏览器自动化无法稳定等待到 `#email`
3. 页面体可能出现 Next Flight 流文本
4. 开发日志出现 Turbopack panic

**Step 2: 排查渲染链问题**

重点检查：

1. 登录页是否依赖不稳定客户端逻辑
2. CSS 或第三方包是否影响渲染完成
3. Turbopack 与当前依赖解析是否兼容
4. 页面是否存在流式输出但未稳定 hydrate 的问题

**Step 3: 确立稳定运行方式**

如果 Turbopack 短期不可控，可接受短期回退到稳定 dev 模式，但必须记录为临时方案。

**Step 4: 验证**

验证以下脚本可稳定通过：

```bash
corepack pnpm exec playwright test tests/e2e/playwright/smoke.spec.ts
node tests/e2e/playwright/manual-smoke.mjs
```

### Task 7：建立最小测试基线

**Files:**
- Modify: `playwright.config.ts`
- Create: `vitest.config.ts`
- Create: `tests/unit/auth/*.test.ts`
- Create: `tests/api/*.test.ts`
- Modify: `package.json`

**Step 1: 定义最小测试集**

本阶段必须至少有：

1. 配置校验测试
2. 登录/鉴权测试
3. 关键权限负路径测试
4. 登录页或核心页面冒烟测试

**Step 2: 新增命令脚本**

建议在 `package.json` 中补齐：

1. `lint`
2. `typecheck`
3. `test:unit`
4. `test:api`
5. `test:e2e`
6. `test:smoke`

**Step 3: 固化测试数据策略**

避免测试依赖生产库和不可控共享数据。

**Step 4: 验证**

所有测试命令可在本地稳定执行。

### Task 8：建立最小 CI 门槛

**Files:**
- Create: `.github/workflows/ci.yml` 或等价 CI 文件
- Modify: `README.md`
- Modify: `QUICKSTART.md`

**Step 1: 定义流水线**

至少包括：

1. 安装依赖
2. 类型检查
3. 生产构建
4. 单元/API 测试
5. Playwright 冒烟测试

**Step 2: 设定合并门槛**

未经 CI 通过，不允许合并到主分支。

**Step 3: 更新运行文档**

确保 README 和 QUICKSTART 与实际命令一致。

### Task 9：建立第一阶段发布清单

**Files:**
- Create: `docs/plans/phase-1-release-checklist.md`
- Create: `docs/plans/phase-1-rollback-checklist.md`

**Step 1: 发布前检查**

列出：

1. 配置检查
2. 数据备份检查
3. 构建产物检查
4. 冒烟测试检查
5. 权限验证检查

**Step 2: 回滚清单**

至少包括：

1. 版本回退步骤
2. 数据回滚注意事项
3. 配置回退步骤
4. 故障通知责任人

## 5. 建议执行顺序

建议按以下顺序推进：

1. Task 1：建立台账和阶段边界
2. Task 2：移除硬编码配置
3. Task 3：关闭测试后门
4. Task 4：统一认证与会话
5. Task 5：修复构建失败
6. Task 6：修复开发态稳定性
7. Task 7：建立最小测试基线
8. Task 8：建立最小 CI
9. Task 9：建立发布与回滚清单

## 6. 第一阶段完成判定

当以下条件同时满足时，第一阶段可以视为完成：

1. 构建通过
2. 高危安全后门消除
3. 认证统一
4. 最小测试集通过
5. CI 可运行
6. 文档与运行方式一致

## 7. 结论

第一阶段的意义不是“把系统彻底改好”，而是把它从“不适合碰生产”的状态，拉回到“可以安全地继续改造”的状态。

只有先完成这一步，后续业务模型重构和架构收敛才有稳定地面。