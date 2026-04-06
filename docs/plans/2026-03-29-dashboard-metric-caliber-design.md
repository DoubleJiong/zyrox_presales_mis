# 售前管理系统仪表盘统计口径设计稿

**目标：** 为第二阶段提供统一、可解释、可测试的仪表盘统计口径，结束当前“接口可返回数字，但数字不代表统一业务事实”的状态。

---

## 1. 设计原则

1. 仪表盘只消费业务口径，不自行发明业务口径。
2. 统计对象、过滤范围、状态字段、去重规则必须明确。
3. self scope 与 global scope 必须使用同一指标定义，只允许范围不同。
4. 任何指标都必须能落成样例测试。

## 2. 当前主要偏差

当前代码至少存在以下偏差：

1. `src/app/api/dashboard/route.ts` 仍统计 `schemes`，不是 `solution` 主模型。
2. `src/services/query-service.ts` 的项目统计仍以 `status = '进行中'` 之类旧口径聚合，而不是基于 `projectStage`。
3. 项目、方案、任务的权限过滤虽然已在第一阶段加了底线，但指标定义仍未形成统一文档。

## 3. 统计范围定义

### 3.1 self scope

self scope 指当前用户可直接负责、创建、被分配或被授权查看的业务对象集合。

第二阶段要求：

1. 项目范围与项目查看权限一致。
2. 方案范围跟随项目范围，不得比项目更宽。
3. 任务范围为“本人负责”加“本人可查看项目下的任务”。
4. 客户范围为“本人创建”或“本人被授权管理”的客户。

### 3.2 global scope

global scope 仅对被权限矩阵允许的用户开放，指标定义与 self scope 相同，只是对象集合扩展为全局可见集合。

## 4. 核心指标定义

### 4.1 客户总数 `totalCustomers`

对象来源：`customer`

统计规则：

1. 统计未软删除客户。
2. self scope 只统计当前用户可见客户。
3. global scope 统计全部可见客户。

### 4.2 项目总数 `totalProjects`

对象来源：`project`

统计规则：

1. 统计未软删除项目。
2. 主业务维度优先使用 `projectStage`。
3. `status` 不作为主阶段统计依据，只允许用于兼容辅助显示。

### 4.3 按阶段项目数 `projectsByStage`

对象来源：`project`

统计规则：

1. 以 `projectStage` 为唯一阶段口径。
2. 至少覆盖：`opportunity`、`bidding_pending`、`bidding`、`solution_review`、`contract_pending`、`delivery_preparing`、`delivering`、`settlement`、`archived`、`cancelled`。
3. 若当前库中尚未完全落库这些阶段，第三阶段应以映射层过渡，不允许继续直接按旧 `status` 自由聚合。

### 4.4 方案总数 `totalSolutions`

对象来源：`solution`

统计规则：

1. 第二阶段确定以 `solution` 为主模型。
2. 旧 `scheme` 可用于迁移期对账，但不再作为未来主指标来源。
3. 若需要兼容显示旧数据，必须在指标说明中标出“历史兼容补充”。

### 4.5 待办任务数 `pendingTasks`

对象来源：`task`

统计规则：

1. 统计 `pending` 与 `in_progress` 且未软删除任务。
2. self scope 以本人任务加本人可查看项目内任务为准。
3. global scope 统计全局可见任务。

### 4.6 待审批数 `pendingApprovals`

对象来源：`approval_request`

第二阶段结论：

1. 当前系统尚无统一审批主表，因此该指标只能视为待建设指标。
2. 第三阶段统一审批实体落库后，仪表盘审批指标才允许正式上线。
3. 在此之前，不允许把项目阶段、报价状态或局部评审状态拼接成“统一审批待办”。

## 5. 指标与权限关系

1. 指标定义独立于权限；权限只决定对象集合。
2. 不同角色看到的数值差异，必须来自对象范围差异，而不是来自不同计算公式。
3. global scope 入口必须走 `dashboard.view_global` 或等效 policy，而不是前端自行放开。

## 6. 样例校验要求

第三阶段开始，以下指标必须补样例测试：

1. `totalProjects`
2. `projectsByStage`
3. `totalSolutions`
4. `pendingTasks`
5. self/global scope 对比样例

## 7. 第二阶段结论

第二阶段将仪表盘定义为“展示层”，不再允许反向定义业务规则。后续若代码实现与本文档冲突，以本文档和状态机/权限矩阵设计为准。
