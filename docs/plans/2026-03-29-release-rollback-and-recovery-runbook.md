# 第四阶段发布、回滚与恢复运行手册

日期：2026-03-29

## 1. 适用范围

适用于试运行前候选版本发布、试运行环境回滚、数据库备份与恢复演练。

## 2. 发布窗口要求

1. 发布负责人：1 人
2. 技术负责人：1 人
3. 数据库责任人：1 人
4. 业务观察人：1 人
5. 观察窗口：发布后 30 分钟

## 3. 发布前步骤

1. 记录待发布提交版本。
2. 执行 `corepack pnpm run verify:release-candidate`。
3. 运行数据库备份：`corepack pnpm run ops:backup:db`。
4. 执行 `corepack pnpm db:migrate:list`，确认目标环境 migration history 状态。
5. 若目标环境是历史库且缺少 migration history，先执行 `corepack pnpm db:migrate -- --baseline-through 006_add_idempotency_keys.sql` 完成基线登记。
6. 若本次包含 destructive migration，先执行只读 preflight，并完成定向数据备份。
7. 记录备份文件路径、执行时间、责任人。
8. 确认回滚版本和触发阈值。

## 4. 发布步骤

1. 部署候选构建产物。
2. 如存在待执行编号 SQL 迁移，按场景执行：
	- 空库：`corepack pnpm db:migrate -- --all`
	- 定向变更：`corepack pnpm db:migrate -- --file <name> [--allow-destructive]`
2. 检查 `/api/health` 返回 200。
3. 检查 `/api/health/ready` 返回 200。
4. 执行最小冒烟：登录页、未登录访问受保护接口、仪表盘受保护验证。

## 5. 回滚触发阈值

满足任一条件即触发回滚：

1. readiness 连续失败 3 次。
2. 登录主路径阻断超过 10 分钟。
3. 关键审批或阶段迁移接口出现持续性 5xx。
4. 观察窗口内无法通过小范围热修恢复。

## 6. 回滚步骤

1. 停止继续放量。
2. 回退到上一稳定构建。
3. 恢复上一稳定版本配置。
4. 必要时执行数据库恢复：`corepack pnpm run ops:restore:db -- -BackupFile <file>`。
5. 重启服务并重新验证健康检查与最小冒烟。

## 7. 恢复演练步骤

1. 执行备份脚本生成数据库转储。
2. 在隔离环境执行恢复脚本。
3. 验证健康检查、登录页和核心只读接口。
4. 记录演练结果和残余风险。

## 8. 责任人与时限

1. 发布门禁失败：提交人或发布负责人 4 小时内关闭。
2. 试运行候选失败：当日内回退并形成故障记录。
3. 恢复演练失败：禁止进入第五阶段。