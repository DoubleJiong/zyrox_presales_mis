# 配置说明文档

## 文件清单

本包包含以下文件和配置：

### 1. 源代码目录
- 当前交付以工作区源码目录为准，不再维护额外的 `source-code.tar.gz` 打包说明。

### 2. 配置文件
- `.coze`: Coze部署配置文件
- `package.json`: 项目依赖和脚本配置
- `pnpm-lock.yaml`: 依赖锁定文件（确保依赖版本一致）
- `tsconfig.json`: TypeScript编译配置
- `.babelrc`: Babel转译配置

### 3. 文档
- `README.md`: 系统说明文档（本文档的父文档）
- `CONFIG.md`: 本配置说明文档

## 配置文件详解

### .coze 文件

Coze是部署平台的核心配置文件，定义了项目的构建和运行方式。

```toml
[project]
requires = ["nodejs-24"]      # 指定需要的运行环境

[dev]                          # 开发环境配置
build = ["pnpm", "install"]    # 构建命令：安装依赖
run = ["pnpm", "run", "dev"]   # 运行命令：启动开发服务器

[deploy]                       # 部署环境配置
build = ["bash", "-c", "pnpm install && pnpm run build"]  # 构建命令
run = ["pnpm", "run", "start"] # 运行命令：启动生产服务
```

**注意**: 
- 服务端口固定为 **5000**
- 开发环境支持热更新（HMR）
- 部署环境会先构建再启动

### package.json 关键脚本

```json
{
  "scripts": {
    "dev": "next dev --webpack -p 5000",      # 开发模式（端口5000）
    "build": "next build --webpack",          # 构建生产版本
    "start": "next start -p 5000",            # 启动生产服务
    "test:e2e": "playwright test",            # 运行E2E测试
    "test:unit": "vitest run",                # 运行单元测试
    "ts-check": "tsc -p tsconfig.json"       # TypeScript类型检查
  }
}
```

### tsconfig.json

TypeScript配置，包含编译选项和路径映射：

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### .babelrc

Babel配置，用于代码转译：

```json
{
  "presets": [
    "next/babel"
  ],
  "plugins": []
}
```

## 环境变量配置

### 必需的环境变量

创建 `.env.local` 文件：

```env
# ===== 数据库配置 =====
# PostgreSQL数据库连接字符串
DATABASE_URL=postgresql://username:password@localhost:5432/presale_system

# ===== 认证配置 =====
# JWT密钥（生产环境请使用强密钥）
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# ===== 应用配置 =====
# 应用访问地址（用于生成回调URL等）
NEXT_PUBLIC_APP_URL=http://localhost:5000
```

### 可选的环境变量

```env
# ===== 对象存储配置（如果需要文件上传功能） =====
# AWS S3兼容的对象存储配置
S3_ACCESS_KEY_ID=your-access-key-id
S3_SECRET_ACCESS_KEY=your-secret-access-key
S3_REGION=us-east-1
S3_ENDPOINT=https://s3.amazonaws.com
S3_BUCKET=your-bucket-name

# ===== 邮件服务配置（如果需要邮件通知） =====
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-email-password
SMTP_FROM=noreply@example.com
```

## 依赖安装

### 使用 pnpm 安装（推荐）

```bash
# 启用 corepack 并安装项目依赖
corepack enable
corepack pnpm install
```

### 使用 npm 或 yarn（不推荐）

**注意**: 项目配置了 preinstall 钩子强制使用 pnpm：

```json
{
  "scripts": {
    "preinstall": "npx only-allow pnpm"
  }
}
```

如果必须使用其他包管理器，请修改或删除此脚本。

## 数据库配置

### PostgreSQL 版本要求

- 最低版本: PostgreSQL 14
- 推荐版本: PostgreSQL 15 或 16

### 数据库创建

```sql
-- 创建数据库
CREATE DATABASE presale_system;

-- 创建用户（可选）
CREATE USER presale_user WITH PASSWORD 'secure_password';

-- 授权
GRANT ALL PRIVILEGES ON DATABASE presale_system TO presale_user;
```

### 连接字符串格式

```
postgresql://[user[:password]@][host][:port][/database-name]
```

示例:
```
postgresql://presale_user:secure_password@localhost:5432/presale_system
```

### 数据库迁移

```bash
# 查看编号 SQL 迁移状态
corepack pnpm db:migrate:list

# 对已有数据库登记历史迁移基线（不执行 SQL）
corepack pnpm db:migrate -- --baseline-through 006_add_idempotency_keys.sql

# 执行全部编号 SQL 迁移
corepack pnpm db:migrate -- --all

# 定向执行单个迁移
corepack pnpm db:migrate -- --file 007_drop_legacy_scheme_tables.sql --allow-destructive
```

说明：
- `--baseline-through` 仅用于“数据库里已经有这些结构，但 migration history 还没建”的既有环境。
- `--file ... --allow-destructive` 只用于完成备份并完成 preflight 的定向删表场景。

## 部署配置

### 开发环境

```bash
# 安装依赖
pnpm install

# 启动开发服务器（端口5000，支持热更新）
pnpm dev
```

访问: http://localhost:5000

### 生产环境

```bash
# 安装依赖
pnpm install

# 构建生产版本
pnpm build

# 启动生产服务（端口5000）
pnpm start
```

### 使用 PM2 部署（推荐）

```bash
# 安装PM2
npm install -g pm2

# 启动服务
pm2 start npm --name "presale-system" -- start

# 查看状态
pm2 status

# 查看日志
pm2 logs presale-system

# 重启服务
pm2 restart presale-system

# 停止服务
pm2 stop presale-system

# 删除服务
pm2 delete presale-system
```

PM2配置文件 `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'presale-system',
    script: 'npm',
    args: 'start',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    }
  }]
};
```

使用配置文件启动:

```bash
pm2 start ecosystem.config.js
```

### Docker 部署

创建 `Dockerfile`:

```dockerfile
# 基础镜像
FROM node:24-alpine

# 设置工作目录
WORKDIR /app

# 复制依赖文件
COPY package.json pnpm-lock.yaml ./

# 安装pnpm和依赖
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# 复制源代码
COPY . .

# 构建应用
RUN pnpm build

# 暴露端口
EXPOSE 5000

# 启动命令
CMD ["pnpm", "start"]
```

构建和运行:

```bash
# 构建镜像
docker build -t presale-system:latest .

# 运行容器
docker run -d \
  --name presale-system \
  -p 5000:5000 \
  -e DATABASE_URL=postgresql://... \
  -e JWT_SECRET=your-secret \
  presale-system:latest

# 查看日志
docker logs -f presale-system
```

Docker Compose 配置 `docker-compose.yml`:

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "5000:5000"
    environment:
      - DATABASE_URL=postgresql://presale:password@postgres:5432/presale_system
      - JWT_SECRET=your-secret-key
    depends_on:
      - postgres
    restart: unless-stopped

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=presale_system
      - POSTGRES_USER=presale
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    restart: unless-stopped

volumes:
  postgres_data:
```

使用 Docker Compose:

```bash
# 启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down

# 停止并删除数据
docker-compose down -v
```

## 端口配置

### 默认端口

- **应用端口**: 5000（固定，不可修改）
- **数据库端口**: 5432（PostgreSQL默认）

### 端口占用处理

如果端口5000被占用：

```bash
# 查找占用进程
lsof -i :5000

# Linux/Mac
kill -9 <PID>

# 或修改应用端口（不推荐，因为部署平台期望5000）
export PORT=3000
pnpm dev
```

## 性能优化

### 开发环境优化

```bash
# 使用monitored模式监控性能
pnpm dev:monitored
```

### 生产环境优化

1. **启用gzip压缩**
   - Next.js默认启用

2. **静态资源缓存**
   - 公共资源自动缓存

3. **代码分割**
   - 路由级别自动分割
   - 组件级别按需加载

4. **数据库连接池**
   - 默认配置合理

5. **启用CDN**（可选）
   - 配置静态资源CDN

## 监控和日志

### 应用日志

```bash
# 开发环境日志
pnpm dev | tee dev.log

# PM2日志
pm2 logs presale-system
```

### 错误监控

集成错误监控服务（可选）:
- Sentry
- Rollbar
- LogRocket

### 性能监控

```bash
# 使用Lighthouse测试
npx lighthouse http://localhost:5000 --view
```

## 故障排查

### 常见问题

#### 1. 依赖安装失败

```bash
# 清理pnpm缓存
pnpm store prune

# 重新安装
rm -rf node_modules
pnpm install
```

#### 2. 构建失败

```bash
# 清理构建缓存
rm -rf .next

# 重新构建
pnpm build
```

#### 3. 数据库连接失败

- 检查DATABASE_URL配置
- 确认数据库服务运行
- 检查防火墙设置

#### 4. 端口被占用

```bash
# 查找并杀死占用5000端口的进程
lsof -ti:5000 | xargs kill -9
```

## 安全建议

### 生产环境安全清单

- [ ] 修改默认JWT_SECRET为强密钥
- [ ] 使用HTTPS（配置SSL证书）
- [ ] 限制数据库访问IP
- [ ] 启用应用防火墙
- [ ] 定期更新依赖
- [ ] 配置备份策略
- [ ] 监控异常访问
- [ ] 限制API速率
- [ ] 使用环境变量存储敏感信息
- [ ] 定期进行安全审计

---

**文档版本**: 1.0.0  
**最后更新**: 2024-03-29
