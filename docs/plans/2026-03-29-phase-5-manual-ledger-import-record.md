# Phase 5 手工台账样本导入记录

## 1. 目标

将用户提供的 `重点项目跟进3.23.xlsx` 中 `项目跟进表` 工作表导入本地试运行环境，供业务专家直接在运行中的系统页面中核验项目列表、阶段、状态与归档结果是否符合业务认知。

## 2. 导入口径

- 来源文件：`重点项目跟进3.23.xlsx`
- 来源工作表：`项目跟进表`
- 业务阶段口径：
  - `交流` / `支持` / `常态化跟进` / `申报` / `控标` / `方案` / 空状态 -> `商机阶段`
  - 招投标类临时状态 -> `招投标阶段`
  - `中标` / `已签单` / `丢标` / `放弃` -> `归档阶段`
- 系统落库兼容映射：
  - `商机阶段` -> `projectStage=opportunity`, `status=lead`
  - `招投标阶段` -> `projectStage=bidding`, `status=in_progress`
  - `归档阶段-中标/签单` -> `projectStage=archived`, `status=won`, `bidResult=won`
  - `归档阶段-丢标` -> `projectStage=archived`, `status=lost`, `bidResult=lost`
  - `归档阶段-放弃` -> `projectStage=archived`, `status=cancelled`

## 3. 执行环境

- 本地 PostgreSQL：Docker Compose `postgres:16-alpine`
- 本地应用地址：`http://localhost:5000`
- 本地开发数据库连接：`.env.local` 已对齐为 `postgresql://presales:presales@localhost:5432/presales_system`
- 基础字典/用户/角色：已执行 `src/db/seed.ts`

## 4. 执行结果

- 原始行数：`521`
- 可标准化项目行：`491`
- 跳过空白/无效行：`30`
- 台账导入新增客户：`359`
- 台账导入新增项目：`491`
- 最终数据库项目总数：`494`
- 最终数据库客户总数：`369`

状态分布：

- `lead`：`349`
- `won`：`68`
- `lost`：`32`
- `cancelled`：`42`

## 5. 运行验证

- 应用开发服务器已启动
- 使用本地验收账号可完成登录：
  - 用户名：`admin`
  - 密码：`password`
- 登录后可通过项目列表页检索台账项目进行业务核验

## 6. 已知说明

- 台账中的大量销售/售前姓名在当前本地种子用户中不存在，因此这部分项目以“未匹配负责人”方式导入，不阻塞页面验收
- 导入脚本已对合同号长度和重复项目名做保护，重复执行只会补导未成功项目，不会重复插入已落库记录
- 当前导入用于 Phase 5 业务可视化验收，不代表真实生产主数据治理已完成