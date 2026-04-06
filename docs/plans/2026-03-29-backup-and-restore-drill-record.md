# 第四阶段备份与恢复演练记录

日期：2026-03-29

## 1. 演练范围

1. 数据库逻辑备份
2. 数据库恢复脚本可执行性
3. 恢复后健康检查验证

## 2. 演练步骤模板

1. 执行 `corepack pnpm run ops:backup:db`
2. 记录生成的 `.dump` 文件和 `.json` 清单文件
3. 在隔离数据库执行 `corepack pnpm run ops:restore:db -- -BackupFile <file>`
4. 检查 `/api/health`
5. 检查 `/api/health/ready`
6. 若后续发布包含 destructive migration，额外执行 `corepack pnpm db:migrate:list`、只读 preflight 与定向数据备份，避免仅凭 migration 文件名直接删表

## 3. 本次结果

1. 演练方式：使用两个临时 PostgreSQL 16 容器完成隔离备份与恢复。
2. 演练数据：在源库创建 `drill_validation` 表并插入 1 条记录。
3. 备份产物：`artifacts/backups/phase4-drill.dump`
4. 恢复验证：目标库执行 `SELECT count(*) FROM drill_validation;` 返回 `1`。
5. 脚本状态：仓库中的 `scripts/ops/backup-database.ps1` 与 `scripts/ops/restore-database.ps1` 已可作为正式环境执行入口。

## 4. 结论

第四阶段已完成一次成功的隔离备份恢复演练。进入第五阶段后，试运行环境仍需再执行一次面向真实环境连接信息的演练，但本阶段“机制可执行”目标已满足。