# Docker 离线交付包运行说明

适用对象：内网服务器管理员

适用包：`presales-app` 当前 `5004` 口径离线 Docker 交付包，包含：

1. 应用镜像离线包
2. PostgreSQL 基础镜像离线包
3. 当前数据库初始化 SQL
4. 当前应用 `public/` 静态资源与本地上传附件

## 1. 服务器前置条件

1. 已安装 Docker Engine 及 Docker Compose Plugin
2. 服务器 `5004` 端口允许访问
3. 服务器磁盘建议预留至少 10 GB

## 2. 包目录结构

离线包目录包含以下核心文件：

1. `compose.yaml`
2. `.env.example`
3. `images/presales-app-offline-5004.tar`
4. `images/postgres-16-alpine.tar`
5. `postgres/init/01-current-data.sql`
6. `manifest.json`

## 3. 首次部署步骤

1. 将整个离线包目录上传到服务器，例如：`/opt/presales-offline-5004`
2. 进入该目录
3. 复制环境模板

```bash
cp .env.example .env
```

4. 编辑 `.env`

必改项：

1. `POSTGRES_PASSWORD`
2. `JWT_SECRET`
3. `NEXT_PUBLIC_APP_URL`
4. `NEXT_PUBLIC_API_URL`

建议将 `NEXT_PUBLIC_APP_URL` 和 `NEXT_PUBLIC_API_URL` 中的 `SERVER_HOST` 替换为服务器实际 IP 或域名。

5. 导入离线镜像

```bash
docker load -i images/presales-app-offline-5004.tar
docker load -i images/postgres-16-alpine.tar
```

6. 启动服务

```bash
docker compose up -d
```

7. 检查状态

```bash
docker compose ps
docker compose logs -f postgres
docker compose logs -f app
```

## 4. 初始化说明

1. PostgreSQL 容器首次启动且数据卷为空时，会自动执行 `postgres/init/01-current-data.sql`
2. 该 SQL 包含当前导出时点的业务数据
3. 因此首次启动完成后，系统数据应与打包时基本一致

注意：

1. 如果 `postgres-data` 卷已经存在，PostgreSQL 不会再次执行初始化 SQL
2. 如需重新按离线包内数据初始化，必须先删除旧容器和旧数据卷

```bash
docker compose down -v
docker compose up -d
```

## 5. 访问与验收

应用默认访问地址：

```text
http://服务器IP:5004
```

健康检查：

```bash
curl http://服务器IP:5004/api/health
curl http://服务器IP:5004/api/health/ready
```

预期结果：

1. `/api/health` 返回 `200`
2. `/api/health/ready` 返回 `200`

## 6. 日常运维命令

启动：

```bash
docker compose up -d
```

停止：

```bash
docker compose down
```

查看日志：

```bash
docker compose logs -f app
docker compose logs -f postgres
```

重启应用：

```bash
docker compose restart app
```

## 7. 风险与边界

1. 该离线包包含打包时点数据库内容，后续线上新增数据不会自动回写到本地包
2. 若服务器需要长期保留业务数据，请定期备份 PostgreSQL 数据卷
3. 当前包内应用端口固定映射为 `5004`
4. 当前包按现状口径交付，系统设置中的“基础数据维护”不等同于完整备份恢复系统