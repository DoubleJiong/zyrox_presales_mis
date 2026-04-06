# 快速入门指南

## 5分钟快速上手

### 前置准备

确保你已经安装：
- Node.js 24+ ([下载地址](https://nodejs.org/))
- pnpm 9+（通过 `corepack enable` 启用）
- PostgreSQL 14+ ([下载地址](https://www.postgresql.org/download/))

### 步骤1: 解压源代码

```bash
# 解压源代码包
tar -xzf source-code.tar.gz

# 进入项目目录
cd projects
```

### 步骤2: 安装依赖

```bash
# 启用 corepack 并安装项目依赖（约1-2分钟）
corepack enable
corepack pnpm install
```

### 步骤3: 配置环境

创建 `.env.local` 文件：

```bash
# 复制示例配置
cp .env.example .env.local

# 编辑配置文件
nano .env.local
```

修改以下关键配置：

```env
# 数据库连接
DATABASE_URL=postgresql://username:password@localhost:5432/database_name

# JWT密钥（生产环境请使用强密钥）
JWT_SECRET=your-secret-key-here

# 应用URL
NEXT_PUBLIC_APP_URL=http://localhost:5000
```

### 步骤4: 初始化数据库

```bash
# 创建数据库（手动在PostgreSQL中执行）
# CREATE DATABASE presale_system;

# 查看迁移状态
corepack pnpm db:migrate:list

# 对已有数据库登记历史迁移基线（不执行 SQL）
corepack pnpm db:migrate -- --baseline-through 006_add_idempotency_keys.sql

# 初始化数据库
corepack pnpm db:migrate -- --all
```

### 步骤5: 启动应用

```bash
# 启动开发服务器
corepack pnpm dev
```

### 步骤6: 访问应用

打开浏览器访问: http://localhost:5000

## 常见操作

### 创建管理员账号

首次启动后，需要创建管理员账号。可以通过以下方式：

**方式1: 通过数据库直接插入**
```sql
INSERT INTO sys_user (
  username,
  password_hash,
  full_name,
  email,
  role_id,
  status,
  created_at
) VALUES (
  'admin',
  '$2a$10$...',  -- bcrypt加密后的密码
  '系统管理员',
  'admin@example.com',
  1,  -- 管理员角色ID
  'active',
  NOW()
);
```

**方式2: 通过API注册**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123",
    "email": "admin@example.com"
  }'
```

### 添加字典数据

系统依赖数据字典，初始化时需要添加基础字典：

```sql
-- 客户类型
INSERT INTO sys_attribute (category, attribute_key, attribute_value, name, sort_order, status)
VALUES 
  ('customer_type', 'enterprise', '企业客户', '企业客户', 1, 'active'),
  ('customer_type', 'government', '政府客户', '政府客户', 2, 'active'),
  ('customer_type', 'education', '教育机构', '教育机构', 3, 'active');

-- 项目状态
INSERT INTO sys_attribute (category, attribute_key, attribute_value, name, sort_order, status)
VALUES 
  ('project_status', 'lead', '线索', '线索', 1, 'active'),
  ('project_status', 'opportunity', '商机', '商机', 2, 'active'),
  ('project_status', 'bidding', '投标', '投标', 3, 'active'),
  ('project_status', 'negotiation', '洽谈', '洽谈', 4, 'active'),
  ('project_status', 'ongoing', '进行中', '进行中', 5, 'active'),
  ('project_status', 'completed', '完成', '完成', 6, 'active');
```

### 导入测试数据（可选）

系统可能提供测试数据脚本，可以执行：

```bash
# 如果有测试数据脚本
pnpm db:seed
```

## 核心功能快速体验

### 1. 创建客户

```bash
# 登录后访问
http://localhost:5000/customers

# 点击"新建客户"按钮
# 填写表单并提交
```

### 2. 创建项目

```bash
# 访问项目页面
http://localhost:5000/projects

# 点击"新建项目"
# 选择客户，填写项目信息
```

### 3. 创建解决方案

```bash
# 访问解决方案页面
http://localhost:5000/solutions

# 创建新的解决方案
# 添加方案板块
```

### 4. 查看统计报表

```bash
# 访问工作台
http://localhost:5000/workbench

# 查看项目统计、客户统计等图表
```

## 开发模式 vs 生产模式

### 开发模式

```bash
corepack pnpm dev
```

**特点**:
- 支持热更新（HMR）
- 详细的错误提示
- 源码映射
- 开发工具集成
- 第一阶段默认使用 webpack 稳定模式

如需显式试用 Turbopack：

```bash
corepack pnpm dev:turbopack
```

### 生产模式

```bash
# 构建
corepack pnpm build

# 启动
corepack pnpm start
```

## 最小验证命令

```bash
corepack pnpm run typecheck
corepack pnpm run test:unit
corepack pnpm run test:api
corepack pnpm run test:smoke
corepack pnpm run verify:phase1
```

**特点**:
- 优化的代码
- 更快的加载速度
- 生产环境优化
- 静态资源优化

## 故障排除

### 问题1: 端口被占用

```bash
# 查找占用5000端口的进程
lsof -i :5000

# 杀死进程
kill -9 <PID>

# 或修改端口（不推荐）
export PORT=3000
pnpm dev
```

### 问题2: 数据库连接失败

检查以下几点：
1. PostgreSQL服务是否启动
2. `DATABASE_URL` 配置是否正确
3. 数据库用户权限是否足够
4. 防火墙是否阻止连接

### 问题3: 依赖安装失败

```bash
# 清理缓存
pnpm store prune

# 删除node_modules
rm -rf node_modules

# 重新安装
pnpm install
```

### 问题4: 页面404

检查：
1. 路由文件是否正确创建
2. 文件名是否为 `page.tsx`
3. 是否在正确的目录

### 问题5: API调用失败

检查：
1. API路由文件是否为 `route.ts`
2. 是否正确导出处理函数
3. 认证是否通过
4. 权限是否足够

## 下一步

### 学习资源

- [系统说明文档](./README.md)
- [配置说明文档](./CONFIG.md)
- [目录结构说明](./DIRECTORY.md)

### 常用命令

```bash
# 开发
pnpm dev              # 启动开发服务器
pnpm dev:monitored    # 启动监控模式

# 构建
pnpm build            # 构建生产版本

# 测试
pnpm test:e2e         # 运行E2E测试
pnpm test:unit        # 运行单元测试
pnpm ts-check         # TypeScript类型检查

# 数据库
pnpm db:migrate:list  # 查看数据库迁移状态
pnpm db:migrate -- --baseline-through 006_add_idempotency_keys.sql  # 既有库登记历史迁移基线
pnpm db:migrate -- --all  # 执行全部编号 SQL 迁移
pnpm db:seed          # 导入测试数据

# 其他
pnpm lint             # 代码检查
pnpm format           # 代码格式化
```

### 开发建议

1. **使用TypeScript严格模式**
   - 避免使用 `any` 类型
   - 充分利用类型推断

2. **组件开发规范**
   - 使用shadcn/ui组件
   - 保持组件职责单一
   - 使用TypeScript类型

3. **API开发规范**
   - 统一响应格式
   - 错误处理规范
   - 权限验证

4. **数据库操作**
   - 使用Drizzle ORM
   - 事务操作注意
   - 索引优化

## 获取帮助

### 文档查阅

- 查看项目内文档
- 查看代码注释
- 查看类型定义

### 调试技巧

1. **浏览器控制台**
   - 查看网络请求
   - 查看错误信息
   - 查看控制台日志

2. **后端日志**
   ```bash
   # 开发模式
   pnpm dev | tee dev.log
   
   # 生产模式
   pm2 logs presale-system
   ```

3. **断点调试**
   - 使用VS Code调试器
   - 在浏览器中调试前端代码

### 社区支持

- 提交Issue反馈问题
- 查看已有解决方案
- 参与讨论

---

**文档版本**: 1.0.0  
**最后更新**: 2024-03-29
