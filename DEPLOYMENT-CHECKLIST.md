# 部署验证清单

## 部署前检查

### 环境检查

- [ ] Node.js 版本 ≥ 24.0.0
  ```bash
  node --version
  ```

- [ ] pnpm 版本 ≥ 9.0.0
  ```bash
  pnpm --version
  ```

- [ ] PostgreSQL 版本 ≥ 14.0
  ```bash
  psql --version
  ```

- [ ] 系统端口 5000 未被占用
  ```bash
  lsof -i :5000
  ```

- [ ] 磁盘空间 ≥ 5GB 可用
  ```bash
  df -h
  ```

### 文件检查

- [ ] `source-code.tar.gz` 文件完整
  ```bash
  tar -tzf source-code.tar.gz | head -20
  ```

- [ ] 配置文件完整
  - [ ] `.coze`
  - [ ] `package.json`
  - [ ] `pnpm-lock.yaml`
  - [ ] `tsconfig.json`
  - [ ] `.babelrc`

## 部署步骤验证

### 1. 解压源代码

```bash
# 执行解压
tar -xzf source-code.tar.gz

# 验证解压结果
ls -la projects/src/app
```

**预期结果**: 应该看到 `customers`, `projects`, `api` 等目录

---

### 2. 安装依赖

```bash
cd projects
pnpm install
```

**验证步骤**:
- [ ] 安装过程无错误
- [ ] `node_modules` 目录已创建
- [ ] 无依赖冲突警告
- [ ] 安装时间合理（<5分钟）

**验证命令**:
```bash
# 检查依赖数量
ls node_modules | wc -l

# 验证关键依赖
ls node_modules/next
ls node_modules/react
ls node_modules/@shadcn
```

---

### 3. 配置环境变量

```bash
# 创建环境变量文件
cp .env.example .env.local

# 编辑配置
nano .env.local
```

**必填配置检查**:
- [ ] `DATABASE_URL` 已配置且有效
- [ ] `JWT_SECRET` 已配置（生产环境使用强密钥）
- [ ] `NEXT_PUBLIC_APP_URL` 已配置

**测试数据库连接**:
```bash
# 使用psql测试
psql $DATABASE_URL -c "SELECT version();"
```

**预期结果**: 显示PostgreSQL版本信息

---

### 4. 初始化数据库

```bash
# 查看迁移状态
corepack pnpm db:migrate:list

# 既有环境先登记历史迁移基线（仅登记，不执行 SQL）
corepack pnpm db:migrate -- --baseline-through 006_add_idempotency_keys.sql

# 空库执行全部编号 SQL 迁移
corepack pnpm db:migrate -- --all
```

**验证步骤**:
- [ ] 迁移成功执行
- [ ] 既有环境的历史迁移已完成基线登记，避免 001~006 长期显示 pending
- [ ] 数据库表已创建
- [ ] 无表结构错误

**验证数据库表**:
```bash
# 连接数据库
psql $DATABASE_URL

# 查看所有表
\dt

# 预期应该看到以下表:
# - sys_user
# - sys_role
# - sys_permission
# - sys_customer
# - bus_project
# - bus_solution
# - sys_attribute
# - ...（更多表）
```

---

### 5. 启动应用

#### 开发模式

```bash
pnpm dev
```

**验证步骤**:
- [ ] 启动无错误
- [ ] 显示服务地址 `http://localhost:5000`
- [ ] 无编译警告（可忽略HMR警告）

**验证服务响应**:
```bash
# 等待5秒让服务完全启动
sleep 5

# 测试首页
curl -I http://localhost:5000

# 预期结果: HTTP/1.1 200 OK
```

#### 生产模式（可选）

```bash
# 构建
pnpm build

# 验证构建结果
ls -la .next

# 启动
pnpm start
```

**验证步骤**:
- [ ] 构建无错误
- [ ] `.next` 目录已生成
- [ ] 生产服务启动成功

---

## 功能验证

### 1. 访问首页

```bash
# 在浏览器中访问
http://localhost:5000
```

**预期结果**:
- [ ] 页面正常加载
- [ ] 无JavaScript错误（查看浏览器控制台）
- [ ] 样式正常显示
- [ ] 无404错误

---

### 2. 登录功能

**步骤**:
1. 访问登录页面 `http://localhost:5000/login`
2. 输入用户名和密码
3. 点击登录

**预期结果**:
- [ ] 登录成功
- [ ] 跳转到仪表盘
- [ ] 显示用户信息
- [ ] 保存登录状态

**测试命令**（如已创建管理员账号）:
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

**预期响应**:
```json
{
  "success": true,
  "data": {
    "token": "...",
    "user": {...}
  }
}
```

---

### 3. 字典接口测试

```bash
# 测试字典API
curl "http://localhost:5000/api/dictionary/options?categories=customer_type,project_status"
```

**预期结果**:
```json
{
  "success": true,
  "data": {
    "customer_type": [
      {"value": "enterprise", "label": "企业客户"},
      ...
    ],
    "project_status": [
      {"value": "lead", "label": "线索"},
      ...
    ]
  }
}
```

---

### 4. 创建客户

**步骤**:
1. 访问客户列表 `http://localhost:5000/customers`
2. 点击"新建客户"
3. 填写表单：
   - 客户名称: 测试客户
   - 客户类型: 企业客户
   - 所属地区: 北京市
   - 状态: 启用
4. 保存

**预期结果**:
- [ ] 客户创建成功
- [ ] 显示在列表中
- [ ] 数据保存到数据库

**验证数据库**:
```sql
SELECT * FROM sys_customer WHERE customer_name = '测试客户';
```

---

### 5. 创建项目

**步骤**:
1. 访问项目列表 `http://localhost:5000/projects`
2. 点击"新建项目"
3. 填写表单：
   - 项目名称: 测试项目
   - 选择客户: 测试客户
   - 项目类型: 软件开发
   - 项目状态: 线索
4. 保存

**预期结果**:
- [ ] 项目创建成功
- [ ] 显示在列表中
- [ ] 关联客户正确

---

## 性能验证

### 1. 页面加载时间

使用浏览器开发者工具:
- [ ] 首屏加载时间 < 3秒
- [ ] 交互时间（TTI）< 5秒
- [ ] 无长时间任务（>50ms）

### 2. API响应时间

```bash
# 测试API响应时间
time curl http://localhost:5000/api/dictionary/options?categories=customer_type
```

**预期结果**: 响应时间 < 500ms

### 3. 内存使用

```bash
# 查看进程内存使用
ps aux | grep node
```

**预期结果**: 内存使用 < 500MB（开发模式）

---

## 安全验证

### 1. 环境变量安全

- [ ] `.env.local` 不在版本控制中
- [ ] 生产环境使用强JWT密钥
- [ ] 数据库密码已加密

### 2. API权限

```bash
# 测试未授权访问（应返回401）
curl http://localhost:5000/api/customers

# 测试受保护资源
curl -H "Authorization: Bearer invalid_token" http://localhost:5000/api/customers
```

**预期结果**: 返回401 Unauthorized

### 3. SQL注入防护

（需要编写专门的测试用例）

---

## 日志验证

### 1. 应用日志

```bash
# 查看应用日志
tail -f logs/app.log
```

**检查项**:
- [ ] 无ERROR级别日志
- [ ] 日志格式正确
- [ ] 关键操作有日志记录

### 2. 访问日志

```bash
# 查看访问日志
tail -f logs/access.log
```

**检查项**:
- [ ] 所有请求都有记录
- [ ] 响应时间合理
- [ ] 状态码正常

---

## E2E测试验证（可选）

```bash
# 运行E2E测试
pnpm test:e2e
```

**预期结果**:
- [ ] 所有测试通过
- [ ] 无测试失败
- [ ] 测试覆盖率合理

---

## 部署成功标准

部署被视为成功需要满足：

### 必须满足
- [✓] 所有核心功能正常工作
- [✓] 无致命错误
- [✓] API响应正常
- [✓] 数据库连接稳定
- [✓] 用户可以登录和使用系统

### 建议满足
- [ ] 性能指标达标
- [ ] 安全配置正确
- [ ] 日志记录完整
- [ ] 测试全部通过
- [ ] 备份策略就绪

---

## 常见问题排查

### 问题1: 无法启动

**检查清单**:
- [ ] 端口5000是否被占用
- [ ] 依赖是否安装完整
- [ ] 环境变量是否配置
- [ ] 数据库是否可连接

### 问题2: 数据库连接失败

**检查清单**:
- [ ] PostgreSQL服务是否启动
- [ ] DATABASE_URL是否正确
- [ ] 数据库是否存在
- [ ] 用户权限是否足够

### 问题3: 页面样式异常

**检查清单**:
- [ ] 静态资源是否加载
- [ ] Tailwind配置是否正确
- [ ] 浏览器控制台是否有错误
- [ ] 网络请求是否成功

### 问题4: API调用失败

**检查清单**:
- [ ] API路由文件是否存在
- [ ] 认证信息是否正确
- [ ] 请求格式是否正确
- [ ] 服务器是否有错误日志

---

## 部署后维护

### 定期检查任务

**每日**:
- [ ] 检查应用日志
- [ ] 检查服务器资源使用
- [ ] 验证关键功能

**每周**:
- [ ] 数据库备份
- [ ] 性能分析
- [ ] 安全扫描

**每月**:
- [ ] 依赖更新
- [ ] 系统优化
- [ ] 文档更新

### 监控指标

- [ ] 应用可用性
- [ ] 响应时间
- [ ] 错误率
- [ ] 资源使用
- [ ] 数据库性能

---

**部署验证通过后，可以开始使用系统了！**

如有问题，请查阅:
- [系统说明文档](./README.md)
- [配置说明文档](./CONFIG.md)
- [快速入门指南](./QUICKSTART.md)

---

**文档版本**: 1.0.0  
**最后更新**: 2024-03-29
