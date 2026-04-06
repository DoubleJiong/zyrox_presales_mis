# 第四阶段环境与部署标准

日期：2026-03-29

## 1. 实际必需环境变量

必填：

1. `DATABASE_URL`
2. `JWT_SECRET`
3. `NEXT_PUBLIC_APP_URL`

推荐显式配置：

1. `NEXT_PUBLIC_API_URL`

仅开发 / 测试允许：

1. `DEV_TEST_SETUP_ENABLED`
2. `TEST_SECRET`

按需启用：

1. `COZE_BUCKET_ENDPOINT_URL`
2. `COZE_BUCKET_NAME`

仓库标准模板：`.env.example`

## 2. 环境差异项

### 开发环境

1. 可使用本地 PostgreSQL 或 `docker compose`。
2. `DEV_TEST_SETUP_ENABLED=false` 为默认值，仅本地临时打开。

### 测试 / 候选发布环境

1. 使用独立数据库。
2. 禁止测试初始化开关对外暴露。
3. 必须可执行 `verify:release-candidate`。

### 正式生产环境

1. 使用专用密钥和专用数据库。
2. 禁止 `DEV_TEST_SETUP_ENABLED=true`。
3. 发布前必须执行 `verify:release`。

## 3. 标准部署模型

### 容器化基线

仓库已提供：

1. `Dockerfile`
2. `compose.yaml`
3. `.dockerignore`

执行入口：`docker compose up --build`

### 非容器部署基线

1. 安装 Node.js 24+
2. 安装 pnpm 9+
3. 配置 `.env.local`
4. 执行 `corepack pnpm install`
5. 执行 `corepack pnpm build`
6. 执行 `corepack pnpm start`

## 4. 最小冒烟标准

部署完成后必须验证：

1. `GET /login` 可访问
2. `GET /api/health` 返回 200
3. `GET /api/health/ready` 在数据库正常时返回 200
4. `GET /api/dashboard` 未登录返回 401

## 5. 结论

第四阶段起，部署方式不再依赖“当前机器经验”。容器和非容器两种基线均已明确，可作为第五阶段试运行环境标准输入。