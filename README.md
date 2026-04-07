# 售前管理系统 - 系统说明文档

## 📋 目录

1. [系统概述](#系统概述)
2. [技术栈](#技术栈)
3. [快速开始](#快速开始)
4. [项目结构](#项目结构)
5. [环境配置](#环境配置)
6. [数据库设计](#数据库设计)
7. [API 接口](#api-接口)
8. [测试说明](#测试说明)
9. [部署指南](#部署指南)
10. [GitHub 备份](#github-备份)
11. [常见问题](#常见问题)

---

## 系统概述

### 系统简介
售前管理系统是一个基于 Next.js 16 的全栈 Web 应用，用于管理售前项目的全生命周期。系统采用现代技术栈，提供客户管理、项目管理、解决方案管理、成本仲裁等核心功能。

### 核心功能

#### 1. 客户管理
- 客户信息维护（名称、类型、地区、状态等）
- 客户历史成交金额统计
- 客户项目跟进管理
- 客户搜索与筛选
- 客户数据导入导出

#### 2. 项目管理
- 项目创建与编辑
- 项目状态跟踪（线索、商机、投标、洽谈、进行中、完成等）
- 项目优先级管理
- 项目阶段管理
- 项目成员管理
- 项目任务管理
- 项目看板视图

#### 3. 解决方案管理
- 方案创建与版本管理
- 方案板块管理
- 方案快照引用
- 方案模板复用
- 方案统计排行榜

#### 4. 成本仲裁
- 仲裁申请与审批
- 仲裁记录管理
- 成本核算

#### 5. 绩效管理
- 员工绩效考核
- 绩效数据统计
- 绩效报表生成

#### 6. 系统设置
- 数据字典管理
- 权限管理
- 用户管理
- 角色管理
- 部门管理

---

## 技术栈

### 前端技术
- **框架**: Next.js 16 (App Router)
- **语言**: TypeScript 5
- **UI库**: React 19
- **组件库**: shadcn/ui (基于 Radix UI)
- **样式**: Tailwind CSS 4
- **状态管理**: React Hooks + Context API
- **表单管理**: React Hook Form + Zod
- **拖拽**: @hello-pangea/dnd
- **图表**: 自定义图表组件

### 后端技术
- **运行时**: Node.js
- **ORM**: Drizzle ORM
- **数据库**: PostgreSQL
- **API**: Next.js API Routes
- **认证**: JWT + 自定义中间件
- **文件存储**: AWS S3兼容的对象存储
- **权限系统**: 基于角色的访问控制（RBAC）

### 测试框架
- **E2E测试**: Playwright
- **单元测试**: Vitest
- **集成测试**: Vitest

### 开发工具
- **包管理器**: corepack + pnpm
- **代码规范**: ESLint
- **类型检查**: TypeScript
- **开发构建**: Webpack（第一阶段稳定基线）
- **可选实验模式**: Turbopack

---

## 快速开始

### 前置要求
- Node.js 24+
- pnpm 9+
- PostgreSQL 14+
- （可选）Docker

### 安装依赖

```bash
# 启用 corepack
corepack enable

# 安装项目依赖
corepack pnpm install
```

### 环境配置

复制 `.env.example` 为 `.env.local`，并仅填写当前环境真正需要的变量：

```env
# 数据库配置
DATABASE_URL=postgresql://username:password@localhost:5432/database_name

# JWT配置
JWT_SECRET=your-secret-key-here

# 应用配置
NEXT_PUBLIC_APP_URL=http://localhost:5000
NEXT_PUBLIC_API_URL=http://localhost:5000/api

# 仅开发 / 测试使用
DEV_TEST_SETUP_ENABLED=false
TEST_SECRET=replace-with-local-test-secret

# 对象存储配置（可选）
COZE_BUCKET_ENDPOINT_URL=
COZE_BUCKET_NAME=
```

### 数据库初始化

```bash
# 查看 SQL 迁移状态
corepack pnpm db:migrate:list

# 对已有数据库登记历史迁移基线（不执行 SQL）
corepack pnpm db:migrate -- --baseline-through 006_add_idempotency_keys.sql

# 在空库或已确认目标环境后执行全部编号 SQL 迁移
corepack pnpm db:migrate -- --all
```

### 启动开发服务器

```bash
# 开发模式（支持热更新）
corepack pnpm dev

# 监控模式（与默认 dev 一致，使用稳定 webpack dev）
corepack pnpm dev:monitored

# 可选：显式启用 Turbopack 实验模式
corepack pnpm dev:turbopack

# 生产构建
corepack pnpm build

# 生产启动
corepack pnpm start
```

访问地址: http://localhost:5000

### 本地验证命令

```bash
corepack pnpm run typecheck
corepack pnpm run test:unit
corepack pnpm run test:api
corepack pnpm run test:smoke
corepack pnpm run verify:pr
corepack pnpm run verify:release-candidate
corepack pnpm run verify:release
```

健康检查接口：

```bash
curl http://localhost:5000/api/health
curl http://localhost:5000/api/health/ready
```

容器化本地启动：

```bash
docker compose up --build
```

### GitHub 代码备份

项目已经初始化为 Git 仓库，并默认使用 `origin` 指向 GitHub 备份仓库。

首次确认远端状态：

```bash
git remote -v
git branch -vv
```

后续执行一键备份：

```bash
corepack pnpm run ops:backup:repo
```

可选：自定义提交说明。

```bash
powershell -ExecutionPolicy Bypass -File ./scripts/ops/backup-repo.ps1 -Message "backup: before release"
```

脚本行为：
- 自动 `git add -A`
- 有变更时自动提交
- 已存在上游时直接 `git push`
- 首次推送时自动执行 `git push -u origin <current-branch>`
- 无变更时直接退出，不会产生空提交

---

## 项目结构

```
projects/
├── src/
│   ├── app/                    # Next.js App Router
│   ├── proxy.ts                # Next.js 根级请求拦截与鉴权入口
│   │   ├── (dashboard)/       # 仪表盘相关页面
│   │   ├── api/               # API路由
│   │   │   ├── auth/          # 认证相关API
│   │   │   ├── customers/     # 客户管理API
│   │   │   ├── projects/      # 项目管理API
│   │   │   ├── solutions/     # 解决方案管理API
│   │   │   ├── dictionary/    # 字典API
│   │   │   └── ...
│   │   ├── calendar/          # 日程管理
│   │   ├── contracts/         # 合同管理
│   │   ├── customers/         # 客户管理
│   │   ├── projects/          # 项目管理
│   │   ├── solutions/         # 解决方案管理
│   │   ├── settings/          # 系统设置
│   │   ├── staff/             # 人员管理
│   │   ├── arbitrations/      # 成本仲裁
│   │   ├── performance/       # 绩效管理
│   │   └── workbench/         # 工作台
│   ├── components/            # 组件库
│   │   ├── ui/               # shadcn/ui基础组件
│   │   ├── dictionary/       # 字典相关组件
│   │   ├── charts/           # 图表组件
│   │   ├── auth/             # 认证相关组件
│   │   └── ...
│   ├── db/                   # 数据库相关
│   │   ├── schema.ts         # 数据库Schema定义
│   │   ├── queries/          # 数据库查询
│   │   └── ...
│   ├── hooks/                # 自定义Hooks
│   ├── lib/                  # 工具函数
│   │   ├── auth-middleware.ts
│   │   ├── api-response.ts
│   │   ├── permissions/
│   │   └── ...
│   └── types/                # TypeScript类型定义
├── tests/                     # 自动化测试
│   ├── api/                   # API回归测试
│   ├── e2e/                   # Playwright 端到端测试
│   ├── integration/           # 集成测试
│   └── unit/                  # 单元测试
├── public/                    # 静态资源
├── .coze                      # Coze配置文件
├── .babelrc                   # Babel配置
├── package.json               # 项目依赖
├── pnpm-lock.yaml             # 依赖锁定文件
├── tsconfig.json              # TypeScript配置
└── README.md                  # 项目说明
```

---

## 环境配置

### .coze 文件

```toml
[project]
requires = ["nodejs-24"]

[dev]
build = ["pnpm", "install"]
run = ["pnpm", "run", "dev"]

[deploy]
build = ["bash", "-c", "pnpm install && pnpm run build"]
run = ["pnpm", "run", "start"]
```

### 环境变量说明

| 变量名 | 说明 | 示例值 | 必填 |
|--------|------|--------|------|
| DATABASE_URL | 数据库连接字符串 | postgresql://... | 是 |
| JWT_SECRET | JWT密钥 | your-secret-key | 是 |
| S3_ACCESS_KEY_ID | S3访问密钥 | AKI... | 否 |
| S3_SECRET_ACCESS_KEY | S3密钥 | abc... | 否 |
| S3_REGION | S3区域 | us-east-1 | 否 |
| S3_ENDPOINT | S3端点 | https://s3.amazonaws.com | 否 |
| S3_BUCKET | S3桶名 | my-bucket | 否 |
| NEXT_PUBLIC_APP_URL | 应用URL | http://localhost:5000 | 是 |

---

## 数据库设计

### 核心数据表

#### 1. 客户表 (sys_customer)
```sql
- id: 客户ID
- customer_id: 客户编号
- customer_name: 客户名称
- customer_type_id: 客户类型ID
- region: 所属地区
- status: 客户状态
- total_amount: 历史成交金额
- current_project_count: 当前跟进项目数
- last_cooperation_date: 最后合作日期
- contact_name: 联系人
- contact_phone: 联系电话
- contact_email: 联系邮箱
- address: 详细地址
- description: 客户描述
```

#### 2. 项目表 (bus_project)
```sql
- id: 项目ID
- project_code: 项目编号
- project_name: 项目名称
- customer_id: 客户ID
- project_type_id: 项目类型ID
- industry: 所属行业
- region: 所属地区
- status: 项目状态
- priority: 优先级
- manager_id: 项目经理ID
- estimated_amount: 预算金额
- actual_amount: 实际金额
- project_stage: 项目阶段
- progress: 项目进度
- start_date: 开始日期
- end_date: 结束日期
```

#### 3. 解决方案表 (bus_solution)
```sql
- id: 解决方案ID
- solution_code: 解决方案编号
- solution_name: 解决方案名称
- customer_id: 客户ID
- project_id: 项目ID
- solution_type: 方案类型
- version: 版本号
- status: 状态
```

#### 4. 数据字典表 (sys_attribute)
```sql
- id: 属性ID
- attribute_key: 属性编码
- attribute_value: 属性值
- category: 分类
- name: 显示名称
- sort_order: 排序
```

### 权限系统

系统实现了基于角色的访问控制（RBAC）：

- **角色**: 超级管理员、管理员、普通用户
- **权限**: 查看权限、编辑权限、删除权限
- **数据范围**: 全部数据、部门数据、个人数据

---

## API 接口

### 认证接口

#### POST /api/auth/login
用户登录

```json
{
  "username": "admin",
  "password": "password"
}
```

#### POST /api/auth/logout
用户登出

#### GET /api/auth/me
获取当前用户信息

### 客户管理接口

#### GET /api/customers
获取客户列表

**查询参数:**
- page: 页码
- pageSize: 每页数量
- search: 搜索关键词
- status: 客户状态
- type: 客户类型

#### POST /api/customers
创建客户

```json
{
  "customerName": "客户名称",
  "customerType": "education",
  "region": "北京市",
  "status": "active"
}
```

#### GET /api/customers/[id]
获取客户详情

#### PUT /api/customers/[id]
更新客户信息

#### DELETE /api/customers/[id]
删除客户

### 项目管理接口

#### GET /api/projects
获取项目列表

#### POST /api/projects
创建项目

#### PUT /api/projects/[id]
更新项目

#### DELETE /api/projects/[id]
删除项目

### 字典接口

#### GET /api/dictionary/options
获取字典选项

**查询参数:**
- categories: 分类列表（逗号分隔）
- includeInactive: 是否包含非激活项

示例: `/api/dictionary/options?categories=customer_type,project_status`

---

## 测试说明

### E2E测试

```bash
# 运行所有E2E测试
pnpm test:e2e

# 运行指定测试
pnpm test:e2e:core
pnpm test:e2e:management
pnpm test:e2e:settings
pnpm test:e2e:solutions

# UI模式运行
pnpm test:e2e:ui

# 调试模式
pnpm test:e2e:debug
```

### 单元测试

```bash
# 运行单元测试
pnpm test:unit

# 监听模式
pnpm test:unit:watch

# 生成覆盖率报告
pnpm test:unit:coverage
```

### 数据一致性测试

```bash
# 运行数据完整性测试
pnpm test:data

# 运行数据一致性测试
pnpm test:data:consistency
```

### 测试文件结构

```
tests/
├── api/                          # API回归测试
├── e2e/
│   └── playwright/               # Playwright 用例
├── integration/                  # 集成测试
└── unit/                         # 单元测试
```

---

## 部署指南

### 构建应用

```bash
# 安装依赖
pnpm install

# 构建生产版本
pnpm build
```

### 启动生产服务

```bash
# 使用PM2启动（推荐）
pm2 start npm --name "presale-system" -- start

# 或直接启动
pnpm start
```

### Docker部署

创建 `Dockerfile`:

```dockerfile
FROM node:24-alpine

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

COPY . .

RUN pnpm build

EXPOSE 5000

CMD ["pnpm", "start"]
```

构建并运行:

```bash
docker build -t presale-system .
docker run -p 5000:5000 \
  -e DATABASE_URL=... \
  -e JWT_SECRET=... \
  presale-system
```

### 环境变量

确保在生产环境设置以下环境变量:

- `DATABASE_URL`: 生产数据库连接
- `JWT_SECRET`: 强密钥
- `NODE_ENV`: production

---

## 常见问题

### 1. 依赖安装失败

**问题**: `pnpm install` 失败

**解决方案**:
```bash
# 清理缓存
pnpm store prune

# 删除node_modules和lock文件
rm -rf node_modules pnpm-lock.yaml

# 重新安装
pnpm install
```

### 2. 数据库连接失败

**问题**: `Error: Connection refused`

**解决方案**:
- 检查数据库服务是否启动
- 确认 `DATABASE_URL` 配置正确
- 检查防火墙设置

### 3. 端口被占用

**问题**: `Error: Port 5000 is already in use`

**解决方案**:
```bash
# 查找占用端口的进程
lsof -i :5000

# 杀死进程
kill -9 <PID>

# 或修改端口
export PORT=3000
pnpm dev
```

### 4. 权限相关错误

**问题**: `403 Forbidden`

**解决方案**:
- 检查用户角色是否正确
- 确认权限配置
- 检查数据范围设置

### 5. 测试失败

**问题**: E2E测试失败

**解决方案**:
```bash
# 更新浏览器
pnpm exec playwright install

# 清理测试缓存
rm -rf test-results/test-results

# 重新运行
pnpm test:e2e
```

---

## 系统特性

### 1. 响应式设计
- 支持桌面端、平板、手机
- 自适应布局

### 2. 国际化支持
- 预留i18n接口
- 支持多语言扩展

### 3. 主题切换
- 支持亮色/暗色主题
- 可定制主题色

### 4. 数据缓存
- Redis缓存支持（可扩展）
- 本地存储优化

### 5. 文件管理
- 支持多种文件格式
- S3对象存储集成

### 6. 导入导出
- Excel导入导出
- 数据备份功能

---

## 更新日志

### v0.1.0 (2024-03)
- 初始版本发布
- 核心功能实现
  - 客户管理
  - 项目管理
  - 解决方案管理
  - 成本仲裁
  - 绩效管理

### 近期修复
- 修复 CUST-BUG-002: 编辑客户时客户类型下拉框无数据问题
- 添加客户类型与字典的双向映射
- 完善E2E测试验证方法

---

## 技术支持

### 联系方式
- 邮箱: support@example.com
- 文档: https://docs.example.com

### 反馈与建议
- 提交Issue: https://github.com/example/presale-system/issues
- 功能请求: https://github.com/example/presale-system/discussions

---

## 许可证

Copyright © 2024 售前管理系统. All rights reserved.

---

**文档版本**: 1.0.0  
**最后更新**: 2024-03-29
