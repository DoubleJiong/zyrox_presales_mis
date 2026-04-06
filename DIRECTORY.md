# 项目目录结构说明

## 源代码包解压后目录结构

当前工作区源码目录结构如下：

```
projects/
│
├── src/                                    # 源代码目录
│   ├── app/                                # Next.js App Router 页面
│   │   ├── (dashboard)/                    # 仪表盘布局（共享布局）
│   │   │   └── layout.tsx                 # 仪表盘布局组件
│   │   │
│   │   ├── api/                            # API路由
│   │   │   ├── auth/                       # 认证相关
│   │   │   │   ├── login/route.ts         # 登录接口
│   │   │   │   ├── logout/route.ts        # 登出接口
│   │   │   │   └── me/route.ts            # 获取当前用户
│   │   │   │
│   │   │   ├── customers/                  # 客户管理API
│   │   │   │   ├── route.ts               # 客户列表
│   │   │   │   └── [id]/route.ts          # 客户详情/编辑/删除
│   │   │   │
│   │   │   ├── projects/                   # 项目管理API
│   │   │   │   ├── route.ts               # 项目列表
│   │   │   │   └── [id]/route.ts          # 项目详情/编辑/删除
│   │   │   │
│   │   │   ├── solutions/                  # 解决方案API
│   │   │   │   ├── route.ts               # 解决方案列表
│   │   │   │   └── [id]/route.ts          # 解决方案详情
│   │   │   │
│   │   │   ├── dictionary/                 # 字典API
│   │   │   │   └── options/route.ts       # 字典选项
│   │   │   │
│   │   │   ├── arbitrations/               # 成本仲裁API
│   │   │   ├── contracts/                  # 合同管理API
│   │   │   ├── performance/                # 绩效管理API
│   │   │   ├── staff/                      # 人员管理API
│   │   │   └── ...
│   │   │
│   │   ├── calendar/                      # 日程管理页面
│   │   │   └── page.tsx
│   │   │
│   │   ├── customers/                      # 客户管理页面
│   │   │   ├── page.tsx                    # 客户列表
│   │   │   └── [id]/                       # 客户详情
│   │   │       └── page.tsx
│   │   │
│   │   ├── projects/                       # 项目管理页面
│   │   │   ├── page.tsx                    # 项目列表
│   │   │   ├── [id]/                       # 项目详情
│   │   │   │   └── page.tsx
│   │   │   └── [id]/tasks/                 # 项目任务
│   │   │
│   │   ├── solutions/                      # 解决方案页面
│   │   │   ├── page.tsx                    # 解决方案列表
│   │   │   └── [id]/                       # 解决方案详情
│   │   │
│   │   ├── arbitrations/                   # 成本仲裁页面
│   │   ├── contracts/                      # 合同管理页面
│   │   ├── performance/                    # 绩效管理页面
│   │   ├── settings/                       # 系统设置页面
│   │   │   ├── dictionary/                 # 字典管理
│   │   │   ├── users/                      # 用户管理
│   │   │   └── roles/                      # 角色管理
│   │   ├── staff/                          # 人员管理页面
│   │   └── workbench/                      # 工作台页面
│   │
│   ├── components/                         # 组件库
│   │   ├── ui/                            # shadcn/ui基础组件
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── input.tsx
│   │   │   ├── label.tsx
│   │   │   ├── select.tsx
│   │   │   ├── table.tsx
│   │   │   ├── textarea.tsx
│   │   │   ├── toast.tsx
│   │   │   └── ...（更多UI组件）
│   │   │
│   │   ├── dictionary/                    # 字典相关组件
│   │   │   └── dict-select.tsx            # 字典下拉选择
│   │   │
│   │   ├── charts/                        # 图表组件
│   │   │   ├── bar-chart.tsx
│   │   │   ├── line-chart.tsx
│   │   │   ├── pie-chart.tsx
│   │   │   └── ...
│   │   │
│   │   ├── auth/                          # 认证相关组件
│   │   │   ├── PermissionProvider.tsx
│   │   │   ├── PermissionButton.tsx
│   │   │   └── ...
│   │   │
│   │   ├── forms/                         # 表单组件
│   │   │   └── ...
│   │   │
│   │   └── ...（更多业务组件）
│   │
│   ├── db/                                # 数据库相关
│   │   ├── schema.ts                      # 数据库Schema定义
│   │   │   - 用户表
│   │   │   - 角色表
│   │   │   - 权限表
│   │   │   - 客户表
│   │   │   - 项目表
│   │   │   - 解决方案表
│   │   │   - 任务表
│   │   │   - 仲裁表
│   │   │   - 绩效表
│   │   │   - 字典表
│   │   │   - ...（更多表定义）
│   │   │
│   │   ├── index.ts                       # 数据库导出
│   │   ├── queries/                       # 数据库查询
│   │   └── ...
│   │
│   ├── proxy.ts                           # Next.js 根级请求代理与鉴权入口
│   │
│   ├── hooks/                             # 自定义React Hooks
│   │   ├── use-toast.ts                   # Toast提示
│   │   ├── use-debounce.ts                # 防抖
│   │   └── ...
│   │
│   ├── lib/                               # 工具函数库
│   │   ├── auth-middleware.ts            # 认证中间件
│   │   ├── api-response.ts                # API响应格式化
│   │   ├── jwt.ts                         # JWT工具
│   │   ├── validators.ts                  # 数据验证器
│   │   ├── permissions/                   # 权限系统
│   │   │   ├── middleware.ts              # 权限中间件
│   │   │   ├── types.ts                   # 权限类型
│   │   │   └── data-scope.ts              # 数据范围
│   │   └── ...
│   │
│   └── types/                             # TypeScript类型定义
│       ├── auth.ts                        # 认证类型
│       ├── customer.ts                    # 客户类型
│       ├── project.ts                     # 项目类型
│       └── ...（更多类型定义）
│
├── public/                               # 静态资源目录
│   ├── fonts/                            # 字体文件
│   ├── images/                           # 图片资源
│   └── ...（其他静态文件）
│
├── scripts/                              # 业务和运维脚本目录
│   ├── import/                           # 导入脚本
│   ├── ops/                              # 运维脚本
│   └── phase5/                           # 验收样本与证据收集脚本
│
├── tests/                                # 自动化测试目录
│   ├── api/                              # API回归测试
│   ├── e2e/                              # Playwright 测试
│   ├── integration/                      # 集成测试
│   └── unit/                             # 单元测试
│
├── .coze                                 # Coze部署配置
├── .babelrc                              # Babel配置
├── package.json                          # 项目依赖配置
├── pnpm-lock.yaml                        # 依赖锁定文件
├── tsconfig.json                         # TypeScript配置
├── README.md                             # 项目说明
└── AGENTS.md                             # Agent开发规范（可选）
```

## 关键目录说明

### 1. src/app/ - 页面和API路由

**特点**:
- 使用 Next.js 16 App Router
- 文件系统路由
- 支持动态路由 `[id]`
- API Routes在`api/`子目录

**路由示例**:
- `/customers` → `src/app/customers/page.tsx`
- `/customers/[id]` → `src/app/customers/[id]/page.tsx`
- `/api/customers` → `src/app/api/customers/route.ts`

### 2. src/components/ - 组件库

**shadcn/ui组件**: `src/components/ui/`
- 基于 Radix UI
- 完全可定制
- 使用 Tailwind CSS

**业务组件**:
- `dictionary/` - 字典选择组件
- `charts/` - 图表组件
- `auth/` - 认证组件

### 3. src/db/ - 数据库层

**schema.ts**: 数据库表定义
- 使用 Drizzle ORM
- 类型安全的SQL
- 支持迁移

**主要表**:
- 用户、角色、权限
- 客户、项目、解决方案
- 任务、仲裁、绩效
- 字典、配置

### 4. src/lib/ - 工具库

**认证相关**:
- `auth-middleware.ts` - 认证中间件
- `jwt.ts` - JWT工具

**API相关**:
- `api-response.ts` - 统一响应格式

**权限相关**:
- `permissions/` - 权限系统

### 5. src/hooks/ - 自定义Hooks

常用Hooks:
- `use-toast` - Toast提示
- `use-debounce` - 防抖
- 更多自定义业务Hooks

## 文件命名规范

### 页面文件
- 页面组件: `page.tsx`
- 布局组件: `layout.tsx`
- 加载组件: `loading.tsx`
- 错误组件: `error.tsx`
- 头部组件: `head.tsx`

### API文件
- 路由处理器: `route.ts`
- 支持方法: GET, POST, PUT, DELETE等

### 组件文件
- React组件: `*.tsx`
- 类型文件: `*.ts`
- 样式文件: `*.module.css`（如需要）

### 工具文件
- 工具函数: `*.ts`
- 配置文件: `*.config.ts`或`*.config.js`

## 代码组织原则

1. **按功能模块组织**
   - 每个业务模块独立的目录
   - 相关的API和页面放在一起

2. **组件复用**
   - 通用组件放在 `components/ui/`
   - 业务组件放在对应模块目录

3. **类型安全**
   - 使用TypeScript严格模式
   - 类型定义集中管理

4. **关注点分离**
   - API逻辑在 `api/` 目录
   - 页面逻辑在对应页面文件
   - 共享逻辑在 `lib/` 目录

## 新增模块建议

添加新功能模块时，建议结构：

```
src/app/new-module/
├── page.tsx                    # 列表页
├── [id]/
│   └── page.tsx                # 详情页
├── components/                 # 模块专用组件
│   ├── ItemCard.tsx
│   └── ItemForm.tsx
└── lib/                        # 模块专用工具
    └── utils.ts

src/app/api/new-module/
├── route.ts                    # 列表API
└── [id]/
    └── route.ts                # 详情API

src/db/schema.ts                # 添加表定义

src/components/new-module/      # 通用组件（如果需要）
```

---

**文档版本**: 1.0.0  
**最后更新**: 2024-03-29
