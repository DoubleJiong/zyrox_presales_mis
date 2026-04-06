# 售前管理系统 - 交付文档索引

## 📚 文档清单

欢迎使用售前管理系统！本文档包包含以下文档，请根据您的需求选择阅读：

### 🚀 快速开始
1. **[快速入门指南](./QUICKSTART.md)** - 5分钟快速上手
   - 前置准备
   - 安装步骤
   - 启动应用
   - 常见操作

### 📖 详细文档
2. **[系统说明文档](./README.md)** - 完整系统文档
   - 系统概述
   - 技术栈
   - 核心功能
   - API接口说明
   - 常见问题

3. **[配置说明文档](./CONFIG.md)** - 环境配置详解
   - 配置文件说明
   - 环境变量配置
   - 数据库配置
   - 部署方式

4. **[目录结构说明](./DIRECTORY.md)** - 项目结构详解
   - 源代码目录
   - 文件命名规范
   - 代码组织原则
   - 扩展指南

5. **[部署验证清单](./DEPLOYMENT-CHECKLIST.md)** - 部署验证检查
   - 部署前检查
   - 功能验证
   - 性能验证
   - 安全验证

## 🎯 使用场景指南

### 我是新用户，首次部署系统

**推荐阅读顺序**:
1. [快速入门指南](./QUICKSTART.md) - 了解基本概念
2. [部署验证清单](./DEPLOYMENT-CHECKLIST.md) - 验证部署是否成功
3. [系统说明文档](./README.md) - 深入了解系统功能

### 我是开发者，需要修改代码

**推荐阅读顺序**:
1. [目录结构说明](./DIRECTORY.md) - 了解项目结构
2. [系统说明文档](./README.md) - 了解API和功能
3. [配置说明文档](./CONFIG.md) - 配置开发环境

### 我是运维，需要部署生产环境

**推荐阅读顺序**:
1. [配置说明文档](./CONFIG.md) - 配置生产环境
2. [部署验证清单](./DEPLOYMENT-CHECKLIST.md) - 验证部署
3. [快速入门指南](./QUICKSTART.md) - 启动服务

### 我想了解系统功能

**推荐阅读**:
- [系统说明文档](./README.md) - 完整功能介绍

## 📦 文件清单

本交付包包含以下文件：

### 核心文件
```
code_download/
├── source-code.tar.gz          # 源代码压缩包
├── .coze                       # 部署配置文件
├── package.json                # 项目依赖配置
├── pnpm-lock.yaml              # 依赖锁定文件
├── tsconfig.json               # TypeScript配置
└── .babelrc                    # Babel配置
```

### 文档文件
```
code_download/
├── README.md                   # 系统说明文档（本文档）
├── CONFIG.md                   # 配置说明文档
├── DIRECTORY.md                # 目录结构说明
├── QUICKSTART.md               # 快速入门指南
├── DEPLOYMENT-CHECKLIST.md     # 部署验证清单
└── INDEX.md                    # 文档索引（本文件）
```

## 🛠️ 快速命令参考

### 安装与启动
```bash
# 解压源代码
tar -xzf source-code.tar.gz
cd projects

# 安装依赖
pnpm install

# 配置环境变量（创建.env.local文件）
nano .env.local

# 初始化数据库
pnpm db:migrate:list
pnpm db:migrate -- --baseline-through 006_add_idempotency_keys.sql
pnpm db:migrate -- --all

# 启动开发服务器
pnpm dev

# 访问应用
# http://localhost:5000
```

### 常用命令
```bash
# 开发
pnpm dev              # 启动开发服务器
pnpm build            # 构建生产版本
pnpm start            # 启动生产服务

# 测试
pnpm test:e2e         # 运行E2E测试
pnpm test:unit        # 运行单元测试
pnpm ts-check         # TypeScript类型检查

# 数据库
pnpm db:migrate:list  # 查看数据库迁移状态
pnpm db:migrate -- --baseline-through 006_add_idempotency_keys.sql  # 既有库登记历史迁移基线
pnpm db:migrate -- --all  # 执行全部编号 SQL 迁移
```

## 📋 系统要求

### 必需环境
- **Node.js**: ≥ 24.0.0
- **pnpm**: ≥ 9.0.0
- **PostgreSQL**: ≥ 14.0

### 可选环境
- **Docker**: 用于容器化部署
- **PM2**: 用于进程管理

### 系统资源
- **磁盘空间**: ≥ 5GB 可用
- **内存**: ≥ 2GB RAM
- **端口**: 5000（必须可用）

## 🌐 访问地址

- **开发环境**: http://localhost:5000
- **生产环境**: http://your-domain.com

## 🔑 默认配置

### 默认端口
- 应用端口: **5000**（固定，不可修改）

### 数据库
- 默认数据库名: `presale_system`（可自定义）

### 环境变量
- 应用URL: `http://localhost:5000`

## 📞 获取帮助

### 文档查阅
1. 本索引页面 - 查找所需文档
2. 各文档内部 - 使用搜索功能
3. 代码注释 - 查看代码中的说明

### 问题排查
1. [常见问题](./README.md#常见问题) - 系统文档中的FAQ
2. [故障排除](./QUICKSTART.md#故障排除) - 快速入门指南
3. [部署验证清单](./DEPLOYMENT-CHECKLIST.md#常见问题排查) - 部署相关问题

### 开发支持
- 查看代码注释
- 查看TypeScript类型定义
- 参考现有实现

## 📝 文档更新记录

| 版本 | 日期 | 更新内容 |
|------|------|----------|
| 1.0.0 | 2024-03-29 | 初始版本 |

## 🎓 学习路径

### 初级用户
```
阅读快速入门指南
    ↓
部署验证清单
    ↓
开始使用系统
```

### 中级用户
```
阅读系统说明文档
    ↓
了解配置选项
    ↓
定制系统功能
```

### 高级用户
```
阅读目录结构说明
    ↓
查看源代码
    ↓
二次开发
```

## ⚡ 快速链接

- [快速入门指南](./QUICKSTART.md) ← 从这里开始
- [系统说明文档](./README.md) ← 完整文档
- [配置说明文档](./CONFIG.md) ← 配置详解
- [目录结构说明](./DIRECTORY.md) ← 代码结构
- [部署验证清单](./DEPLOYMENT-CHECKLIST.md) ← 验证检查

## 📌 重要提示

### ⚠️ 安全提示
1. 生产环境必须修改默认JWT_SECRET
2. 不要将.env文件提交到版本控制
3. 定期更新依赖和安全补丁
4. 配置HTTPS和防火墙

### 💡 性能提示
1. 使用生产模式部署
2. 启用数据库连接池
3. 配置静态资源缓存
4. 使用CDN（如需要）

### 🔧 维护提示
1. 定期备份数据库
2. 监控系统资源
3. 查看应用日志
4. 更新系统文档

## 🎉 开始使用

现在您已经了解了文档结构，推荐您：

1. 如果是**首次部署**，请阅读 [快速入门指南](./QUICKSTART.md)
2. 如果需要**配置环境**，请阅读 [配置说明文档](./CONFIG.md)
3. 如果想要**了解功能**，请阅读 [系统说明文档](./README.md)
4. 如果需要**修改代码**，请阅读 [目录结构说明](./DIRECTORY.md)
5. 如果需要**验证部署**，请阅读 [部署验证清单](./DEPLOYMENT-CHECKLIST.md)

---

祝您使用愉快！🚀

如有任何问题，请查阅相关文档或联系技术支持。

---

**文档版本**: 1.0.0  
**最后更新**: 2024-03-29
