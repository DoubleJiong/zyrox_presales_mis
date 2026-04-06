# 售前管理系统项目状态机与审批体系设计稿

**目标：** 为售前管理系统定义统一、可验证、可落库、可测试的项目主链路状态机与审批体系，结束当前“状态字段并存、审批即流转、流程口径不一致”的问题。

**适用范围：** 项目、商机、投标立项、方案评审、合同与执行前置流程。

---

## 1. 设计背景

当前系统在项目流转与审批方面存在以下典型问题：

1. `status` 与 `projectStage` 并存，职责边界不清。
2. 审批动作直接推动项目阶段变化，缺少独立审批实体。
3. 审批记录没有形成稳定审计链，存在前端拼装 ID 等临时实现。
4. 方案评审、投标审批、项目推进之间没有统一框架。
5. 统计、权限、通知缺乏统一事件来源。

这类问题的根源不是页面交互，而是系统缺少一个统一的“项目主链路状态机 + 通用审批模型”。

## 2. 设计目标

本设计稿希望达到以下目标：

1. 项目主链路状态唯一、可追踪、可校验。
2. 审批与状态推进解耦，但审批可作为状态变化前置条件。
3. 不同审批类型复用同一套审批框架。
4. 统计、权限、通知、审计都以统一状态和审批事件为依据。
5. 为后续数据库迁移、接口改造和自动化测试提供稳定基础。

## 3. 核心设计原则

### 3.1 单一主状态原则

项目只能有一套对外主状态机。现有 `status` 与 `projectStage` 不建议长期并存。

建议：

1. `projectStage` 升级为唯一主阶段字段。
2. 原 `status` 退化为技术兼容字段，短期映射，长期移除。
3. 所有列表、筛选、统计、权限判断均以主阶段字段为准。

### 3.2 审批不直接等于状态

审批是“决策过程”，状态是“业务事实”。

因此：

1. 审批单本身必须独立建模。
2. 审批通过后，才触发状态迁移。
3. 审批被驳回，不代表项目回到任意旧状态，必须按显式规则回退。
4. 任何状态变化都必须有事件记录，而不是只改一个字段。

### 3.3 状态迁移必须显式受控

任何状态改变都必须满足：

1. 有明确触发动作。
2. 有明确操作者权限。
3. 有明确前置条件。
4. 有明确迁移后副作用。
5. 有明确审计记录。

## 4. 核心对象定义

### 4.1 项目 `Project`

项目是售前执行主线的核心对象，承载客户、商机转化、投标、方案、合同和执行前置状态。

建议核心字段：

1. `id`
2. `projectCode`
3. `projectName`
4. `customerId`
5. `opportunityId`
6. `ownerId`
7. `deliveryOwnerId`
8. `stage`
9. `stageChangedAt`
10. `currentApprovalId`
11. `isArchived`
12. `createdAt`
13. `updatedAt`

### 4.2 项目阶段变更记录 `ProjectStageTransition`

用于记录项目阶段迁移事实。

建议字段：

1. `id`
2. `projectId`
3. `fromStage`
4. `toStage`
5. `triggerType`
6. `triggerId`
7. `operatorId`
8. `reason`
9. `createdAt`

### 4.3 审批单 `ApprovalRequest`

通用审批主表，用于承载投标立项、方案评审、合同审批等审批行为。

建议字段：

1. `id`
2. `approvalType`
3. `businessObjectType`
4. `businessObjectId`
5. `projectId`
6. `title`
7. `status`
8. `currentStep`
9. `initiatorId`
10. `submittedAt`
11. `completedAt`
12. `cancelledAt`
13. `metadata`
14. `createdAt`
15. `updatedAt`

### 4.4 审批步骤 `ApprovalStep`

记录审批链条中的每一步。

建议字段：

1. `id`
2. `approvalRequestId`
3. `stepOrder`
4. `approverId`
5. `approverRole`
6. `decision`
7. `decisionAt`
8. `comment`
9. `status`
10. `createdAt`

### 4.5 审批事件 `ApprovalEvent`

用于记录提交、同意、驳回、撤回、转交、重提等事件。

建议字段：

1. `id`
2. `approvalRequestId`
3. `eventType`
4. `operatorId`
5. `payload`
6. `createdAt`

## 5. 项目主链路状态机设计

### 5.1 建议项目主阶段

建议统一为以下阶段：

1. `opportunity`：商机阶段
2. `bidding_pending`：已发起投标立项审批，待审批
3. `bidding`：已批准进入投标
4. `solution_review`：方案评审中
5. `contract_pending`：合同或商务确认中
6. `delivery_preparing`：执行准备中
7. `delivering`：执行中
8. `settlement`：结算中
9. `archived`：已归档
10. `cancelled`：已取消

### 5.2 阶段说明

#### `opportunity`

表示项目仍处于商机跟进阶段，尚未正式进入投标立项。

允许动作：

1. 编辑基础信息
2. 指派负责人
3. 发起投标立项审批
4. 取消项目

#### `bidding_pending`

表示已提交投标立项审批，但尚未批准进入投标。

允许动作：

1. 查看审批进度
2. 撤回审批
3. 审批通过
4. 审批驳回

#### `bidding`

表示项目已批准进入投标，允许开展投标准备、报价、方案编制。

允许动作：

1. 创建投标任务
2. 创建报价
3. 提交方案评审
4. 放弃投标
5. 进入合同前确认

#### `solution_review`

表示方案已进入正式评审流程。

允许动作：

1. 查看评审进度
2. 审批通过
3. 审批驳回
4. 撤回重提

#### `contract_pending`

表示方案或商务条件已通过，等待合同与商务确认。

允许动作：

1. 上传合同材料
2. 发起合同审批
3. 驳回回到投标或方案修订
4. 确认进入执行准备

#### `delivery_preparing`

表示已具备执行前提，正在做资源、计划、交接准备。

允许动作：

1. 分配交付负责人
2. 建立交付计划
3. 确认启动交付

#### `delivering`

表示项目进入交付执行。

#### `settlement`

表示项目进入结算与收尾。

#### `archived`

表示项目业务闭环完成，仅允许归档类补录与查询。

#### `cancelled`

表示项目终止，不再进入后续链路。

### 5.3 允许迁移关系

```text
opportunity -> bidding_pending
opportunity -> cancelled

bidding_pending -> bidding
bidding_pending -> opportunity
bidding_pending -> cancelled

bidding -> solution_review
bidding -> contract_pending
bidding -> cancelled

solution_review -> bidding
solution_review -> contract_pending
solution_review -> cancelled

contract_pending -> delivery_preparing
contract_pending -> bidding
contract_pending -> cancelled

delivery_preparing -> delivering
delivery_preparing -> cancelled

delivering -> settlement
settlement -> archived
```

### 5.4 禁止迁移规则

以下迁移默认禁止，除非后台管理员执行特批修复：

1. `opportunity -> delivering`
2. `bidding_pending -> archived`
3. `solution_review -> opportunity`
4. `archived -> 任何活动状态`
5. `cancelled -> 任何活动状态`

所有特批迁移都必须：

1. 记录审批或工单依据
2. 记录操作者
3. 记录原因
4. 形成审计日志

## 6. 审批体系设计

### 6.1 通用审批类型

建议先收敛为以下审批类型：

1. `bidding_initiation`：投标立项审批
2. `solution_review`：方案评审审批
3. `contract_review`：合同/商务审批
4. `special_stage_override`：特殊阶段变更审批

### 6.2 审批状态机

建议统一审批状态：

1. `draft`：草稿
2. `submitted`：已提交待审批
3. `in_progress`：审批处理中
4. `approved`：已通过
5. `rejected`：已驳回
6. `withdrawn`：已撤回
7. `cancelled`：已取消
8. `expired`：已超时失效

### 6.3 审批动作

每个审批单建议支持以下动作：

1. 创建草稿
2. 提交审批
3. 审批同意
4. 审批驳回
5. 撤回
6. 转交
7. 加签
8. 重提
9. 取消
10. 超时失效

### 6.4 审批与项目状态联动规则

#### 投标立项审批

1. 在 `opportunity` 阶段发起。
2. 提交后，项目进入 `bidding_pending`。
3. 审批通过后，项目进入 `bidding`。
4. 审批驳回后，项目回到 `opportunity`。
5. 审批撤回后，项目回到 `opportunity`。

#### 方案评审审批

1. 在 `bidding` 阶段发起。
2. 提交后，项目进入 `solution_review`。
3. 审批通过后，项目进入 `contract_pending` 或维持 `bidding` 并标记方案已通过，具体由业务再定。
4. 审批驳回后，项目回到 `bidding`。
5. 审批撤回后，项目回到 `bidding`。

#### 合同审批

1. 在 `contract_pending` 阶段发起。
2. 审批通过后，项目进入 `delivery_preparing`。
3. 审批驳回后，项目回到 `bidding` 或保留 `contract_pending` 待修正，需由业务定版。

### 6.5 审批链路建议

建议审批体系支持两种模式：

1. 固定审批流：按角色顺序审批
2. 配置化审批流：按项目类型、金额、区域、角色自动组装审批链

当前阶段建议先落固定审批流，待业务稳定后再配置化。

## 7. 权限与职责边界

### 7.1 建议角色

建议至少明确以下角色：

1. 系统管理员
2. 售前负责人
3. 项目负责人
4. 交付负责人
5. 审批人
6. 普通成员
7. 财务/商务角色

### 7.2 权限原则

1. 发起审批的人不等于审批人。
2. 项目负责人不必天然拥有所有审批权限。
3. 无负责人项目默认不向普通成员开放。
4. 所有阶段变更权限必须显式定义。
5. 所有审批动作必须带操作者身份。

## 8. 统计与通知的事件来源

所有统计、看板、通知应统一基于以下事件，而不是基于页面动作推断：

1. 项目创建事件
2. 项目阶段变化事件
3. 审批提交事件
4. 审批完成事件
5. 审批驳回事件
6. 方案通过事件
7. 合同确认事件
8. 项目归档事件

这样才能避免：

1. 看板与列表数据不一致
2. 通知漏发或重复发
3. 审计链缺失

## 9. 数据迁移建议

### 9.1 字段收敛策略

建议分两步处理：

1. 第一步：保留 `status`，但改为由 `stage` 单向映射生成，不允许业务直接写入。
2. 第二步：完成前后端切换后，逐步删除或废弃 `status`。

### 9.2 审批记录迁移策略

1. 将现有投标审批相关记录映射为 `ApprovalRequest`
2. 用真实主键取代前端 `index + 1` 临时 ID
3. 无法补全的历史审批记为“历史导入数据”
4. 历史迁移必须保留原始来源字段

## 10. API 改造建议

建议新增或重构以下接口：

1. `POST /api/projects/:id/approvals`：发起审批
2. `GET /api/projects/:id/approvals`：查看审批历史
3. `POST /api/approvals/:id/submit`：提交审批
4. `POST /api/approvals/:id/approve`：审批通过
5. `POST /api/approvals/:id/reject`：审批驳回
6. `POST /api/approvals/:id/withdraw`：撤回审批
7. `GET /api/projects/:id/transitions`：查看阶段流转历史

接口约束：

1. route 不直接改项目阶段，必须调用状态机服务。
2. route 不直接写审批表，必须调用审批服务。
3. 所有接口统一错误格式和权限校验。

## 11. 最低测试要求

### 11.1 状态机测试

必须覆盖：

1. 合法迁移通过
2. 非法迁移拒绝
3. 缺前置条件时拒绝迁移
4. 迁移时生成事件和审计记录

### 11.2 审批测试

必须覆盖：

1. 发起审批
2. 提交审批
3. 审批通过
4. 审批驳回
5. 撤回审批
6. 重提审批
7. 审批与项目状态联动

### 11.3 权限测试

必须覆盖：

1. 非审批人不能审批
2. 非项目负责人不能越权发起关键审批
3. 普通用户不能查看无负责人敏感项目
4. 管理员特批迁移有审计记录

## 12. 待业务确认事项

以下问题必须在业务澄清会上定版，否则不能进入开发实施：

1. `solution_review` 通过后，是直接进入 `contract_pending`，还是仍停留在 `bidding` 并仅更新方案状态。
2. 合同审批驳回后，是回到 `bidding`，还是留在 `contract_pending` 待补资料。
3. 特殊项目是否允许跳过某些审批节点。
4. 无负责人项目是否允许“待认领池”模式。
5. `cancelled` 是否允许管理员恢复，以及恢复路径是什么。

## 13. 结论

建议将“项目状态机”与“审批体系”作为整个系统治理的第一批定版资产。

原因很简单：

1. 它决定了项目怎么走。
2. 它决定了审批怎么留痕。
3. 它决定了权限怎么判定。
4. 它决定了统计怎么可信。
5. 它决定了后续代码重构是否有稳定依据。

如果这部分不先定下来，后续任何代码层修复都很容易再次漂移。