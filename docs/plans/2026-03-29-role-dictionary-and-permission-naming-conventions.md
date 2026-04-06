# 售前管理系统角色字典与权限命名规范

**目标：** 为售前管理系统统一角色命名、对象关系命名、动作命名、权限 key 命名、策略函数命名和错误响应语义，避免后续实现中出现多套术语、多套权限表达和多套判断方式。

**适用范围：** 认证、授权、审批、项目状态机、接口返回、前端按钮显隐、审计日志、测试用例和后续重构实现。

---

## 1. 设计背景

在当前系统里，权限问题不仅是“谁能做什么”没有完全定清，还存在“怎么命名、怎么表达、怎么复用”没有统一的问题。

如果这一步不先做统一，后续极易出现以下情况：

1. 同一个角色在不同模块有不同命名。
2. 同一个权限动作在前后端采用不同语义。
3. 接口判断、前端显隐、测试断言、审计日志使用不同词汇。
4. 新代码继续长出第二套、第三套权限实现。

因此，这份文档的作用不是替代权限矩阵，而是作为权限体系的“术语底板”和“命名协议”。

## 2. 设计目标

本规范希望达到以下目标：

1. 所有角色有统一中文名、英文代码名和语义边界。
2. 所有对象关系有统一命名。
3. 所有动作权限有统一动词集合。
4. 所有权限 key 可以用统一规则生成。
5. 所有策略函数、接口报错和测试命名可以基于同一套术语扩展。

## 3. 命名总原则

### 3.1 代码命名以英文稳定标识为准

中文用于业务沟通，英文代码名用于：

1. 数据库存储
2. API 返回
3. 权限判断
4. 测试命名
5. 审计日志字段

### 3.2 角色名、关系名、动作名分层命名

不要把“角色”“关系”“动作”混在一起命名。

例如：

1. `project_owner` 是关系，不是平台角色。
2. `approve` 是动作，不是角色。
3. `presales_manager` 是角色，不是对象关系。

### 3.3 权限 key 使用单一语法

建议统一采用：

`<resource>.<action>`

例如：

1. `project.view`
2. `project.edit`
3. `approval.approve`
4. `dashboard.view_global`

### 3.4 条件授权不写进权限名里

权限名只表达“动作”，条件由 policy 计算，不把条件塞进权限 key。

例如：

- 用 `project.view` + policy 判断“是否本人项目”
- 不用 `project.view_own_or_related_or_stage_based`

### 3.5 默认避免同义词并存

一旦定义了标准词，后续实现中应避免出现以下并行写法：

1. `owner` / `manager` 混用
2. `approve` / `pass` 混用
3. `withdraw` / `revoke` 混用
4. `projectStage` / `status` 在同一语义上混用

## 4. 角色字典

以下为建议的第一版标准角色字典。

| 中文名称 | 英文代码名 | 类型 | 说明 |
| --- | --- | --- | --- |
| 系统管理员 | `system_admin` | 平台角色 | 负责系统配置、权限治理、特批与修复，不等于所有业务审批默认参与者 |
| 售前负责人 | `presales_manager` | 业务角色 | 负责售前阶段统筹、重点项目监管、投标与方案相关管理 |
| 项目负责人 | `project_owner` | 业务关系角色 | 指定到具体项目的负责人，对项目推进与资料完整性负责 |
| 交付负责人 | `delivery_owner` | 业务关系角色 | 指定到具体项目的交付负责人，主要作用于交付准备和交付阶段 |
| 审批人 | `approver` | 流程角色 | 指在某个审批步骤中拥有审批权的用户，不是固定平台岗位 |
| 普通成员 | `member` | 基础角色 | 已登录普通成员，参与协作但默认不具备敏感操作权限 |
| 财务 / 商务 | `commercial_manager` | 业务角色 | 负责报价、合同、商务确认等动作 |

## 5. 角色与关系的区分规则

后续实现必须区分以下两类概念：

### 5.1 平台 / 组织角色

例如：

1. `system_admin`
2. `presales_manager`
3. `member`
4. `commercial_manager`

这类角色通常挂在用户或人员档案上。

### 5.2 对象关系角色

例如：

1. `project_owner`
2. `delivery_owner`
3. `approver`
4. `creator`
5. `assignee`

这类关系必须绑定到具体对象，不能直接作为全局角色理解。

## 6. 对象资源字典

建议后续权限 key 统一基于以下资源名。

| 中文对象 | 标准资源名 | 说明 |
| --- | --- | --- |
| 用户账号 | `user_account` | 登录账号、认证主体 |
| 人员档案 | `staff_profile` | 员工资料、岗位、组织关系 |
| 客户 | `customer` | 客户主数据 |
| 商机 | `opportunity` | 商机对象 |
| 项目 | `project` | 项目主对象 |
| 审批单 | `approval` | 通用审批对象 |
| 审批步骤 | `approval_step` | 审批步骤对象 |
| 方案 | `solution` | 方案主对象；后续若迁移完成，不再保留 `scheme` 作为主资源名 |
| 合同材料 | `contract_material` | 合同及商务相关材料 |
| 仪表盘 | `dashboard` | 统计与看板能力 |
| 审计日志 | `audit_log` | 系统审计能力 |
| 系统配置 | `system_config` | 配置、权限、策略管理 |

## 7. 对象关系字典

建议统一采用以下关系名。

| 中文关系 | 标准关系名 | 说明 |
| --- | --- | --- |
| 创建人 | `creator` | 创建该对象的用户 |
| 项目负责人 | `project_owner` | 对项目业务推进负责的用户 |
| 交付负责人 | `delivery_owner` | 对项目交付准备与交付负责的用户 |
| 指派成员 | `assignee` | 被指派参与某对象或任务的成员 |
| 当前审批人 | `current_approver` | 当前审批步骤指定审批人 |
| 审批发起人 | `approval_initiator` | 发起审批单的用户 |
| 关注人 / 观察者 | `watcher` | 有查看权但不必有编辑权的用户 |

## 8. 动作字典

建议动作名统一为以下集合。

| 中文动作 | 标准动作名 | 说明 |
| --- | --- | --- |
| 查看详情 | `view` | 查看单个对象详情 |
| 查看列表 | `list` | 查看对象列表 |
| 创建 | `create` | 创建对象 |
| 编辑 | `edit` | 编辑对象内容 |
| 删除 | `delete` | 删除对象 |
| 指派 | `assign` | 指派负责人、成员或关系 |
| 提交 | `submit` | 提交审批或提交评审 |
| 审批通过 | `approve` | 审批通过 |
| 审批驳回 | `reject` | 审批驳回 |
| 撤回 | `withdraw` | 撤回已提交对象或审批 |
| 流转 | `transition` | 推动状态机迁移 |
| 导出 | `export` | 导出数据或文档 |
| 管理 | `manage` | 平台级配置或治理能力 |
| 上传 | `upload` | 上传材料 |
| 下载 | `download` | 下载材料 |
| 重置密码 | `reset_password` | 重置账号密码 |
| 禁用 | `disable` | 禁用账号或对象 |

## 9. 权限 key 命名规范

### 9.1 基础格式

统一采用：

`<resource>.<action>`

示例：

1. `project.view`
2. `project.edit`
3. `approval.submit`
4. `approval.approve`
5. `dashboard.view_global`

### 9.2 扩展格式

当同一资源存在明确子范围时，允许使用：

`<resource>.<action>_<scope>`

示例：

1. `dashboard.view_self`
2. `dashboard.view_global`
3. `project.list_all`
4. `project.list_related`

但这类扩展应谨慎使用，只在 scope 是稳定业务概念时使用。

### 9.3 禁止写法

避免以下命名方式：

1. `canManageProjectAndApproveBid`
2. `projectOwnerCanViewOwnProject`
3. `solutionReviewPass`
4. `biddingApprovalDoReject`

原因：

1. 语义混杂
2. 不利于复用
3. 不利于测试和审计统一

## 10. 策略函数命名规范

建议所有权限策略函数统一使用 `can + 动作 + 资源` 的格式。

### 10.1 推荐写法

1. `canViewProject(user, project)`
2. `canEditProject(user, project)`
3. `canTransitionProject(user, project, targetStage)`
4. `canSubmitApproval(user, approvalRequest)`
5. `canApproveApproval(user, approvalRequest, step)`
6. `canViewDashboard(user, scope)`
7. `canUploadContractMaterial(user, project)`

### 10.2 禁止写法

避免：

1. `checkProject`
2. `validateManager`
3. `hasProjectPermission2`
4. `doAuthForApproval`

原因是：

1. 看不出动作语义
2. 看不出资源对象
3. 看不出输入边界

## 11. 策略文件命名规范

建议权限实现目录采用：

```text
src/shared/policy/
  roles.ts
  project-policy.ts
  approval-policy.ts
  solution-policy.ts
  dashboard-policy.ts
  commercial-policy.ts
```

命名规则：

1. 文件名使用 `<resource>-policy.ts`
2. 角色常量放到 `roles.ts`
3. 公共授权组合器可放到 `policy-core.ts` 或 `policy-utils.ts`

## 12. 接口错误语义规范

### 12.1 未登录

返回：`401 Unauthorized`

语义：用户尚未建立合法会话。

### 12.2 已登录但无权限

返回：`403 Forbidden`

语义：用户身份有效，但当前动作不被允许。

### 12.3 对象不存在或不可见

需要明确系统策略：

1. 对敏感对象可返回 `404`，避免暴露对象存在性。
2. 对普通对象可返回 `403`，明确权限不足。

建议后续在接口规范里进一步定版，但必须统一，不允许同类接口混用。

## 13. 前端显隐命名规范

前端按钮或入口显隐建议统一使用与策略函数一致的语义。

例如：

1. `canViewProject`
2. `canEditProject`
3. `canSubmitApproval`
4. `canApproveApproval`
5. `canViewGlobalDashboard`

不要在前端单独发明另一套词，例如：

1. `showProjectButton`
2. `isManagerLike`
3. `canDoFlow`

## 14. 审计日志字段命名建议

建议审计日志统一使用以下字段：

1. `actorId`
2. `actorRole`
3. `resourceType`
4. `resourceId`
5. `action`
6. `decision`
7. `reason`
8. `createdAt`

其中：

1. `action` 使用标准动作名
2. `resourceType` 使用标准资源名
3. `actorRole` 使用标准角色代码名
4. `decision` 可取 `allow` / `deny`

## 15. 测试命名规范

### 15.1 单元测试命名

建议采用：

`should_<result>_<when_condition>`

例如：

1. `should_deny_project_view_for_member_when_project_has_no_owner`
2. `should_allow_project_edit_for_project_owner_when_project_is_owned_by_user`
3. `should_deny_approval_for_initiator_when_self_approval_is_not_allowed`

### 15.2 测试数据命名

建议统一使用角色语义前缀：

1. `systemAdminUser`
2. `presalesManagerUser`
3. `projectOwnerUser`
4. `deliveryOwnerUser`
5. `memberUser`
6. `commercialManagerUser`

## 16. 与现有系统的兼容建议

### 16.1 关于 `status` 与 `projectStage`

在代码命名上，后续应逐步统一到 `stage` 语义。

短期兼容可以保留：

1. 存量字段 `status`
2. 映射函数 `mapLegacyStatusToStage()`
3. 映射函数 `mapStageToLegacyStatus()`

但新实现中不应继续用 `status` 表达主业务语义。

### 16.2 关于 `scheme` 与 `solution`

在命名规范中，默认后续统一使用 `solution` 作为主资源名。

如需兼容旧对象：

1. 允许出现 `legacySchemeId`
2. 不建议继续新增 `scheme-policy.ts` 作为长期主实现

## 17. 待确认事项

以下命名相关问题需要后续补定：

1. 财务 / 商务角色最终代码名是 `commercial_manager` 还是拆分为 `finance_manager` 与 `commercial_manager`
2. 售前负责人是否还需要区分更细粒度角色，例如区域负责人、部门负责人
3. 审批人是否需要区分 `primary_approver` 与 `delegate_approver`
4. 仪表盘 scope 是否最终采用 `self/team/global` 三层

## 18. 结论

角色字典与权限命名规范的价值，在于把后续实现中的“语言”先统一。

这会直接降低以下风险：

1. 多套权限实现并存
2. 接口和前端显隐语义不一致
3. 审计日志无法统一分析
4. 测试命名混乱导致回归成本上升

因此，建议把本规范作为后续权限实现、认证统一、接口整改和测试补齐的基础引用文档使用。