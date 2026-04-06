import { pgTable, serial, text, timestamp, bigint, boolean, varchar, integer, decimal, jsonb, date, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ============================================
// 用户权限相关表
// ============================================

// 角色表
export const roles = pgTable('sys_role', {
  id: serial('id').primaryKey(),
  roleName: varchar('role_name', { length: 50 }).notNull().unique(),
  roleCode: varchar('role_code', { length: 50 }).notNull().unique(),
  description: text('description'),
  permissions: jsonb('permissions').$type<string[]>(), // 权限列表
  status: varchar('status', { length: 20 }).notNull().default('active'), // active, inactive
  deletedAt: timestamp('deleted_at'), // 软删除时间
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  idxStatus: index('idx_role_status').on(table.status),
}));

// 用户表
export const users = pgTable('sys_user', {
  id: serial('id').primaryKey(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  password: varchar('password', { length: 128 }).notNull(), // bcrypt加密
  realName: varchar('real_name', { length: 50 }).notNull(),
  email: varchar('email', { length: 100 }).notNull().unique(),
  phone: varchar('phone', { length: 20 }),
  department: varchar('department', { length: 50 }),
  position: varchar('position', { length: 50 }), // 职位
  avatar: varchar('avatar', { length: 255 }),
  roleId: integer('role_id').references(() => roles.id),
  baseLocation: varchar('base_location', { length: 100 }), // Base所在地（区域售前工程师专用）
  location: varchar('location', { length: 100 }), // 所在地
  gender: varchar('gender', { length: 10 }), // 性别
  birthday: date('birthday'), // 出生日期
  hireDate: date('hire_date'), // 入职日期
  status: varchar('status', { length: 20 }).notNull().default('active'), // active, inactive
  mustChangePassword: boolean('must_change_password').notNull().default(false),
  passwordChangedAt: timestamp('password_changed_at'),
  passwordResetAt: timestamp('password_reset_at'),
  passwordResetBy: integer('password_reset_by').references(() => users.id),
  lastLoginTime: timestamp('last_login_time'),
  lastLoginIp: varchar('last_login_ip', { length: 50 }),
  deletedAt: timestamp('deleted_at'), // 软删除时间
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  idxRoleId: index('idx_user_role').on(table.roleId),
  idxStatus: index('idx_user_status').on(table.status),
  idxDepartment: index('idx_user_department').on(table.department),
}));

// 用户角色关联表（多对多）
export const userRoles = pgTable('sys_user_role', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  roleId: integer('role_id').references(() => roles.id).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  idxUserRoleUser: index('idx_user_role_user').on(table.userId),
  idxUserRoleRole: index('idx_user_role_role').on(table.roleId),
  userRoleUnique: uniqueIndex('idx_user_role_unique').on(table.userId, table.roleId),
}));

// 登录日志表
export const loginLogs = pgTable('sys_login_log', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  loginTime: timestamp('login_time').notNull().defaultNow(),
  loginIp: varchar('login_ip', { length: 50 }),
  userAgent: text('user_agent'),
  status: varchar('status', { length: 20 }).notNull(), // success, failed
  failureReason: text('failure_reason'),
  deletedAt: timestamp('deleted_at'), // 软删除时间
}, (table) => ({
  idxUserId: index('idx_login_log_user').on(table.userId),
  idxLoginTime: index('idx_login_log_time').on(table.loginTime),
  idxStatus: index('idx_login_log_status').on(table.status),
}));

// 操作日志表
export const operationLogs = pgTable('sys_operation_log', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  module: varchar('module', { length: 50 }).notNull(), // 模块名
  action: varchar('action', { length: 50 }).notNull(), // 操作类型
  resource: varchar('resource', { length: 100 }), // 操作资源
  resourceId: integer('resource_id'), // 资源ID
  method: varchar('method', { length: 10 }), // HTTP方法
  path: varchar('path', { length: 255 }), // 请求路径
  params: jsonb('params'), // 请求参数
  result: jsonb('result'), // 操作结果
  status: varchar('status', { length: 20 }).notNull(), // success, failed
  error: text('error'), // 错误信息
  duration: integer('duration'), // 执行时长(ms)
  ip: varchar('ip', { length: 50 }),
  userAgent: text('user_agent'),
  deletedAt: timestamp('deleted_at'), // 软删除时间
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  idxUserId: index('idx_operation_log_user').on(table.userId),
  idxModule: index('idx_operation_log_module').on(table.module),
  idxAction: index('idx_operation_log_action').on(table.action),
  idxCreatedAt: index('idx_operation_log_created').on(table.createdAt),
  idxStatus: index('idx_operation_log_status').on(table.status),
}));

// ============================================
// 数据字典表
// ============================================

// 字典类型表
export const dictionaryTypes = pgTable('sys_dictionary_type', {
  id: serial('id').primaryKey(),
  typeCode: varchar('type_code', { length: 50 }).notNull().unique(),
  typeName: varchar('type_name', { length: 100 }).notNull(),
  description: text('description'),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  idxDictTypeCode: index('idx_dict_type_code').on(table.typeCode),
  idxDictTypeStatus: index('idx_dict_type_status').on(table.status),
}));

// 字典项表
export const dictionaryItems = pgTable('sys_dictionary_item', {
  id: serial('id').primaryKey(),
  typeId: integer('type_id').references(() => dictionaryTypes.id, { onDelete: 'cascade' }).notNull(),
  itemCode: varchar('item_code', { length: 50 }).notNull(),
  itemName: varchar('item_name', { length: 100 }).notNull(),
  itemValue: varchar('item_value', { length: 255 }),
  description: text('description'),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  sortOrder: integer('sort_order').default(0),
  parentId: integer('parent_id').references(() => dictionaryItems.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  idxDictItemType: index('idx_dict_item_type').on(table.typeId),
  idxDictItemCode: index('idx_dict_item_code').on(table.itemCode),
  idxDictItemStatus: index('idx_dict_item_status').on(table.status),
  idxDictItemParent: index('idx_dict_item_parent').on(table.parentId),
  ukDictItem: uniqueIndex('uk_dict_item').on(table.typeId, table.itemCode),
}));

// 字典类型关系
export const dictionaryTypesRelations = relations(dictionaryTypes, ({ many }) => ({
  items: many(dictionaryItems),
}));

// 字典项关系
export const dictionaryItemsRelations = relations(dictionaryItems, ({ one }) => ({
  type: one(dictionaryTypes, {
    fields: [dictionaryItems.typeId],
    references: [dictionaryTypes.id],
  }),
  parent: one(dictionaryItems, {
    fields: [dictionaryItems.parentId],
    references: [dictionaryItems.id],
  }),
}));

// ============================================
// 客户管理相关表
// ============================================

// 线索表
export const leads = pgTable('bus_lead', {
  id: serial('id').primaryKey(),
  customerName: varchar('customer_name', { length: 200 }).notNull(),
  contactName: varchar('contact_name', { length: 50 }).notNull(),
  contactPhone: varchar('contact_phone', { length: 20 }).notNull(),
  contactEmail: varchar('contact_email', { length: 100 }),
  demandType: varchar('demand_type', { length: 50 }), // 需求类型
  region: varchar('region', { length: 50 }), // 区域
  intentLevel: varchar('intent_level', { length: 20 }), // 意向等级：high, medium, low
  description: text('description'), // 需求描述
  creatorId: integer('creator_id').references(() => users.id).notNull(),
  creatorDept: varchar('creator_dept', { length: 50 }),
  status: varchar('status', { length: 20 }).notNull().default('new'), // new, following, converted, lost
  source: varchar('source', { length: 50 }), // 来源：manual, excel, crm
  estimatedAmount: decimal('estimated_amount', { precision: 15, scale: 2 }), // 预估金额
  estimatedDate: date('estimated_date'), // 预估成交日期
  convertedProjectId: integer('converted_project_id'), // 转化后的项目ID
  deletedAt: timestamp('deleted_at'), // 软删除时间
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  idxCreator: index('idx_lead_creator').on(table.creatorId),
  idxStatus: index('idx_lead_status').on(table.status),
  idxRegion: index('idx_lead_region').on(table.region),
}));

export const leadsRelations = relations(leads, ({ one, many }) => ({
  creator: one(users, {
    fields: [leads.creatorId],
    references: [users.id],
  }),
  followRecords: many(leadFollowRecords),
}));

// 线索跟进记录表
export const leadFollowRecords = pgTable('bus_lead_follow', {
  id: serial('id').primaryKey(),
  leadId: integer('lead_id').references(() => leads.id, { onDelete: 'cascade' }).notNull(),
  followContent: text('follow_content').notNull(),
  followTime: timestamp('follow_time').notNull().defaultNow(),
  nextRemindTime: timestamp('next_remind_time'),
  followerId: integer('follower_id').references(() => users.id).notNull(),
  outcome: varchar('outcome', { length: 20 }), // 跟进结果：interested, rejected, pending
  deletedAt: timestamp('deleted_at'), // 软删除时间
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  idxLeadId: index('idx_lead_follow_lead').on(table.leadId),
  idxFollowerId: index('idx_lead_follow_follower').on(table.followerId),
  idxFollowTime: index('idx_lead_follow_time').on(table.followTime),
}));

export const leadFollowRecordsRelations = relations(leadFollowRecords, ({ one }) => ({
  lead: one(leads, {
    fields: [leadFollowRecords.leadId],
    references: [leads.id],
  }),
  follower: one(users, {
    fields: [leadFollowRecords.followerId],
    references: [users.id],
  }),
}));

// 客户表
export const customers = pgTable('bus_customer', {
  id: serial('id').primaryKey(),
  customerId: varchar('customer_id', { length: 50 }).notNull().unique(), // 客户编号
  customerName: varchar('customer_name', { length: 200 }).notNull(), // 客户名称
  customerTypeId: integer('customer_type_id').references(() => customerTypes.id), // 客户类型ID
  region: varchar('region', { length: 50 }), // 区域
  status: varchar('status', { length: 20 }).notNull().default('active'), // 客户状态：active, inactive, potential, lost
  totalAmount: decimal('total_amount', { precision: 15, scale: 2 }).notNull().default('0'), // 历史中标总额
  currentProjectCount: integer('current_project_count').notNull().default(0), // 当前跟进项目数
  lastCooperationDate: date('last_cooperation_date'), // 上次合作时间
  // V1.3: 最近互动时间（跟进记录最后时间）
  lastInteractionTime: timestamp('last_interaction_time'), // 最近互动时间
  maxProjectAmount: decimal('max_project_amount', { precision: 15, scale: 2 }).notNull().default('0'), // 历史最大中标金额
  contactName: varchar('contact_name', { length: 50 }), // 联系人
  contactPhone: varchar('contact_phone', { length: 20 }), // 联系电话
  contactEmail: varchar('contact_email', { length: 100 }), // 联系邮箱
  address: text('address'), // 地址
  description: text('description'), // 客户描述
  createdBy: integer('created_by').references(() => users.id), // 创建人
  deletedAt: timestamp('deleted_at'), // 软删除时间
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  // 性能索引
  idxCustomerType: index('idx_customer_type').on(table.customerTypeId),
  idxRegion: index('idx_customer_region').on(table.region),
  idxStatus: index('idx_customer_status').on(table.status),
  idxCreated: index('idx_customer_created_by').on(table.createdBy),
}));

export const customersRelations = relations(customers, ({ one, many }) => ({
  creator: one(users, {
    fields: [customers.createdBy],
    references: [users.id],
  }),
  projects: many(projects),
}));

// 商机表
export const opportunities = pgTable('bus_opportunity', {
  id: serial('id').primaryKey(),
  leadId: integer('lead_id').references(() => leads.id),
  customerName: varchar('customer_name', { length: 200 }).notNull(),
  projectName: varchar('project_name', { length: 200 }).notNull(),
  contactName: varchar('contact_name', { length: 50 }).notNull(),
  contactPhone: varchar('contact_phone', { length: 20 }).notNull(),
  demandDescription: text('demand_description'),
  estimatedAmount: decimal('estimated_amount', { precision: 15, scale: 2 }),
  winProbability: integer('win_probability'), // 赢单概率 0-100
  expectedCloseDate: date('expected_close_date'),
  ownerId: integer('owner_id').references(() => users.id).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('prospecting'), // prospecting, qualified, proposal, negotiation, won, lost
  stage: varchar('stage', { length: 50 }), // 商机阶段
  competition: text('competition'), // 竞争对手分析
  deletedAt: timestamp('deleted_at'), // 软删除时间
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  // 性能索引
  idxOwner: index('idx_opportunity_owner').on(table.ownerId),
  idxStatus: index('idx_opportunity_status').on(table.status),
  idxLead: index('idx_opportunity_lead').on(table.leadId),
}));

export const opportunitiesRelations = relations(opportunities, ({ one }) => ({
  owner: one(users, {
    fields: [opportunities.ownerId],
    references: [users.id],
  }),
  lead: one(leads, {
    fields: [opportunities.leadId],
    references: [leads.id],
  }),
}));

// ============================================
// 项目管理相关表
// ============================================

// 项目表
export const projects = pgTable('bus_project', {
  id: serial('id').primaryKey(),
  projectCode: varchar('project_code', { length: 50 }).notNull().unique(),
  projectName: varchar('project_name', { length: 200 }).notNull(),
  opportunityId: integer('opportunity_id').references(() => opportunities.id),
  customerId: integer('customer_id').references(() => customers.id),
  customerName: varchar('customer_name', { length: 200 }), // 冗余字段，用于性能优化
  projectTypeId: integer('project_type_id').references(() => projectTypes.id), // 项目类型ID
  projectType: varchar('project_type', { length: 50 }), // 项目类型代码（用于快速查询）
  // V1.2: 项目阶段（商机→投标→执行→结算→归档）
  projectStage: varchar('project_stage', { length: 50 }).notNull().default('opportunity'), // opportunity, bidding, execution, settlement, archived
  industry: varchar('industry', { length: 50 }), // 行业
  region: varchar('region', { length: 50 }), // 区域
  description: text('description'), // 项目描述
  managerId: integer('manager_id').references(() => users.id), // 项目经理/项目负责人
  estimatedAmount: decimal('estimated_amount', { precision: 15, scale: 2 }), // 预估金额（项目预算）
  actualAmount: decimal('actual_amount', { precision: 15, scale: 2 }), // 实际金额（中标金额）
  // V1.2: 合同相关字段
  contractAmount: decimal('contract_amount', { precision: 15, scale: 2 }), // 合同金额
  contractSignDate: date('contract_sign_date'), // 合同签订日期
  contractStartDate: date('contract_start_date'), // 合同开始日期
  contractEndDate: date('contract_end_date'), // 合同结束日期
  // V1.2: 成本预算相关字段
  costBudget: jsonb('cost_budget').$type<{
    personnel?: number; // 人力成本
    material?: number;   // 物料成本
    travel?: number;     // 差旅成本
    other?: number;      // 其他成本
    total?: number;      // 总预算
  }>(), // 成本预算
  actualCost: jsonb('actual_cost').$type<{
    personnel?: number;
    material?: number;
    travel?: number;
    other?: number;
    total?: number;
  }>(), // 实际成本
  startDate: date('start_date'), // 开始日期
  endDate: date('end_date'), // 结束日期
  expectedDeliveryDate: date('expected_delivery_date'), // 预期交付日期
  status: varchar('status', { length: 20 }).notNull().default('draft'), // draft, ongoing, completed, cancelled, archived
  priority: varchar('priority', { length: 20 }).notNull().default('medium'), // high, medium, low
  progress: integer('progress').notNull().default(0), // 进度 0-100
  risks: text('risks'), // 风险说明
  // V1.2: 中标结果
  bidResult: varchar('bid_result', { length: 20 }), // won, lost, pending
  winCompetitor: varchar('win_competitor', { length: 200 }), // 中标竞争对手（落标时填写）
  loseReason: text('lose_reason'), // 落标原因
  // V2.1: 暂停恢复功能
  previousStatus: varchar('previous_status', { length: 20 }), // 暂停前的状态，用于恢复
  holdReason: text('hold_reason'), // 暂停原因
  cancelReason: text('cancel_reason'), // 取消原因
  // V2.2: 项目策划阶段字段
  expectedBiddingDate: date('expected_bidding_date'), // 预期招标时间
  estimatedDuration: integer('estimated_duration'), // 预计工期（月）
  urgencyLevel: varchar('urgency_level', { length: 20 }), // 紧急程度: urgent/normal/low
  // V2.2: 中标/丢标归档字段
  contractNumber: varchar('contract_number', { length: 50 }), // 合同编号
  lessonsLearned: text('lessons_learned'), // 经验总结
  deliveryManagerId: integer('delivery_manager_id').references(() => users.id), // 项目交付负责人
  // V3.0: 项目导入新增字段
  year: integer('year'), // 项目年份
  fundSource: varchar('fund_source', { length: 50 }), // 资金来源
  deletedAt: timestamp('deleted_at'), // 软删除时间
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  // 性能索引
  idxCustomerId: index('idx_project_customer').on(table.customerId),
  idxProjectType: index('idx_project_type').on(table.projectTypeId),
  idxManager: index('idx_project_manager').on(table.managerId),
  idxStatus: index('idx_project_status').on(table.status),
  idxProjectStage: index('idx_project_project_stage').on(table.projectStage),
  idxRegion: index('idx_project_region').on(table.region),
  idxBidResult: index('idx_project_bid_result').on(table.bidResult),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  manager: one(users, {
    fields: [projects.managerId],
    references: [users.id],
  }),
  deliveryManager: one(users, {
    fields: [projects.deliveryManagerId],
    references: [users.id],
  }),
  opportunity: one(opportunities, {
    fields: [projects.opportunityId],
    references: [opportunities.id],
  }),
  customer: one(customers, {
    fields: [projects.customerId],
    references: [customers.id],
  }),
  // V1.2: 新增关系
  projectOpportunity: one(projectOpportunities, {
    fields: [projects.id],
    references: [projectOpportunities.projectId],
  }),
  projectBidding: one(projectBiddings, {
    fields: [projects.id],
    references: [projectBiddings.projectId],
  }),
  projectSettlement: one(projectSettlements, {
    fields: [projects.id],
    references: [projectSettlements.projectId],
  }),
  quotations: many(quotations),
  tasks: many(tasks),
  arbitrations: many(arbitrations),
  // V1.2: 项目团队成员
  members: many(projectMembers),
  // V2.2: 新增关系
  decisionMakers: many(projectDecisionMakers),
  competitorProfiles: many(projectCompetitorProfiles),
  biddingWorkLogs: many(biddingWorkLogs),
  biddingProposals: many(biddingProposals),
}));

export const projectStageTransitions = pgTable('bus_project_stage_transition', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  fromStage: varchar('from_stage', { length: 50 }).notNull(),
  toStage: varchar('to_stage', { length: 50 }).notNull(),
  triggerType: varchar('trigger_type', { length: 50 }).notNull(),
  triggerId: integer('trigger_id'),
  operatorId: integer('operator_id').references(() => users.id).notNull(),
  reason: text('reason'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  idxProjectStageTransitionProject: index('idx_project_stage_transition_project').on(table.projectId),
  idxProjectStageTransitionCreated: index('idx_project_stage_transition_created').on(table.createdAt),
  idxProjectStageTransitionTrigger: index('idx_project_stage_transition_trigger').on(table.triggerType, table.triggerId),
}));

export const approvalRequests = pgTable('bus_approval_request', {
  id: serial('id').primaryKey(),
  approvalType: varchar('approval_type', { length: 50 }).notNull(),
  businessObjectType: varchar('business_object_type', { length: 50 }).notNull(),
  businessObjectId: integer('business_object_id').notNull(),
  projectId: integer('project_id').references(() => projects.id),
  title: varchar('title', { length: 200 }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('draft'),
  currentStep: integer('current_step').notNull().default(1),
  initiatorId: integer('initiator_id').references(() => users.id).notNull(),
  submittedAt: timestamp('submitted_at'),
  completedAt: timestamp('completed_at'),
  cancelledAt: timestamp('cancelled_at'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  idxApprovalRequestProject: index('idx_approval_request_project').on(table.projectId),
  idxApprovalRequestType: index('idx_approval_request_type').on(table.approvalType),
  idxApprovalRequestStatus: index('idx_approval_request_status').on(table.status),
  idxApprovalRequestBusiness: index('idx_approval_request_business').on(table.businessObjectType, table.businessObjectId),
  idxApprovalRequestInitiator: index('idx_approval_request_initiator').on(table.initiatorId),
}));

export const approvalSteps = pgTable('bus_approval_step', {
  id: serial('id').primaryKey(),
  approvalRequestId: integer('approval_request_id').references(() => approvalRequests.id, { onDelete: 'cascade' }).notNull(),
  stepOrder: integer('step_order').notNull(),
  approverId: integer('approver_id').references(() => users.id),
  approverRole: varchar('approver_role', { length: 50 }),
  decision: varchar('decision', { length: 20 }).notNull().default('pending'),
  decisionAt: timestamp('decision_at'),
  comment: text('comment'),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  idxApprovalStepRequest: index('idx_approval_step_request').on(table.approvalRequestId),
  idxApprovalStepApprover: index('idx_approval_step_approver').on(table.approverId),
  idxApprovalStepStatus: index('idx_approval_step_status').on(table.status),
  ukApprovalStepRequestOrder: uniqueIndex('uk_approval_step_request_order').on(table.approvalRequestId, table.stepOrder),
}));

export const approvalEvents = pgTable('bus_approval_event', {
  id: serial('id').primaryKey(),
  approvalRequestId: integer('approval_request_id').references(() => approvalRequests.id, { onDelete: 'cascade' }).notNull(),
  eventType: varchar('event_type', { length: 50 }).notNull(),
  operatorId: integer('operator_id').references(() => users.id).notNull(),
  payload: jsonb('payload'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  idxApprovalEventRequest: index('idx_approval_event_request').on(table.approvalRequestId),
  idxApprovalEventType: index('idx_approval_event_type').on(table.eventType),
  idxApprovalEventCreated: index('idx_approval_event_created').on(table.createdAt),
}));

export const projectStageTransitionsRelations = relations(projectStageTransitions, ({ one }) => ({
  project: one(projects, {
    fields: [projectStageTransitions.projectId],
    references: [projects.id],
  }),
  operator: one(users, {
    fields: [projectStageTransitions.operatorId],
    references: [users.id],
  }),
}));

export const approvalRequestsRelations = relations(approvalRequests, ({ one, many }) => ({
  project: one(projects, {
    fields: [approvalRequests.projectId],
    references: [projects.id],
  }),
  initiator: one(users, {
    fields: [approvalRequests.initiatorId],
    references: [users.id],
  }),
  steps: many(approvalSteps),
  events: many(approvalEvents),
}));

export const approvalStepsRelations = relations(approvalSteps, ({ one }) => ({
  approvalRequest: one(approvalRequests, {
    fields: [approvalSteps.approvalRequestId],
    references: [approvalRequests.id],
  }),
  approver: one(users, {
    fields: [approvalSteps.approverId],
    references: [users.id],
  }),
}));

export const approvalEventsRelations = relations(approvalEvents, ({ one }) => ({
  approvalRequest: one(approvalRequests, {
    fields: [approvalEvents.approvalRequestId],
    references: [approvalRequests.id],
  }),
  operator: one(users, {
    fields: [approvalEvents.operatorId],
    references: [users.id],
  }),
}));

// ============================================
// V1.2: 项目商机信息表
// ============================================

export const projectOpportunities = pgTable('bus_project_opportunity', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').references(() => projects.id).notNull().unique(),
  opportunitySource: varchar('opportunity_source', { length: 50 }), // 商机来源：lead/referral/marketing/other
  opportunityStage: varchar('opportunity_stage', { length: 50 }).notNull().default('lead'), // lead, qualified, proposal, negotiation
  expectedAmount: decimal('expected_amount', { precision: 15, scale: 2 }), // 预期金额
  winProbability: integer('win_probability').default(10), // 赢单概率 0-100
  expectedCloseDate: date('expected_close_date'), // 预期成交日期
  competitorList: jsonb('competitor_list').$type<Array<{ name: string; strength: string; strategy: string }>>(), // 竞争对手列表
  decisionMaker: text('decision_maker'), // 决策人信息
  requirementSummary: text('requirement_summary'), // 需求摘要
  solutionOutline: text('solution_outline'), // 方案大纲
  keySuccessFactors: text('key_success_factors'), // 关键成功因素
  riskAssessment: text('risk_assessment'), // 风险评估
  nextAction: text('next_action'), // 下一步行动
  nextActionDate: date('next_action_date'), // 下一步行动日期
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  idxProjectId: index('idx_project_opportunity_project').on(table.projectId),
  idxOpportunityStage: index('idx_project_opportunity_stage').on(table.opportunityStage),
}));

export const projectOpportunitiesRelations = relations(projectOpportunities, ({ one }) => ({
  project: one(projects, {
    fields: [projectOpportunities.projectId],
    references: [projects.id],
  }),
}));

// ============================================
// V1.2: 项目投标信息表
// ============================================

export const projectBiddings = pgTable('bus_project_bidding', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').references(() => projects.id).notNull().unique(),
  // V1.3: 基本信息字段
  bidNumber: varchar('bid_number', { length: 100 }), // 项目标编号
  bidProjectName: varchar('bid_project_name', { length: 200 }), // 项目名称（标上名称）
  biddingMethod: varchar('bidding_method', { length: 50 }), // 招标方式：open(公开招标), invite(邀请招标), competitive(竞争性谈判), single(单一来源)
  scoringMethod: varchar('scoring_method', { length: 50 }), // 评分办法：comprehensive(综合评分法), lowest(最低价中标), technical(技术评分法)
  priceLimit: decimal('price_limit', { precision: 15, scale: 2 }), // 价格红线
  fundSource: varchar('fund_source', { length: 50 }), // 资金来源：fiscal(财政资金), self_funded(自筹资金), bank(银行投资), operator(运营商投资), other(其他)
  // 原有字段
  biddingType: varchar('bidding_type', { length: 50 }), // 投标类型：public/private/negotiation
  bidDeadline: timestamp('bid_deadline'), // 投标截止时间
  bidOpenDate: timestamp('bid_open_date'), // 开标日期
  bidPrice: decimal('bid_price', { precision: 15, scale: 2 }), // 投标报价
  bidResult: varchar('bid_result', { length: 50 }).default('pending'), // pending, won, lost
  // 保证金信息
  bidBondAmount: decimal('bid_bond_amount', { precision: 15, scale: 2 }), // 投标保证金金额
  bidBondStatus: varchar('bid_bond_status', { length: 50 }).default('unpaid'), // unpaid, paid, returned, forfeited
  bidBondPayDate: date('bid_bond_pay_date'), // 保证金缴纳日期
  bidBondReturnDate: date('bid_bond_return_date'), // 保证金退还日期
  // 文件信息
  tenderDocuments: jsonb('tender_documents').$type<Array<{ 
    name: string; 
    url: string; 
    uploadDate: string;
    size?: number;
    type?: string;
  }>>(), // 招标文件
  bidDocuments: jsonb('bid_documents').$type<Array<{ 
    name: string; 
    url: string; 
    uploadDate: string;
    size?: number;
    type?: string;
    isMain?: boolean; // 是否为主标文件
  }>>(), // 投标文件
  // 团队信息
  bidTeam: jsonb('bid_team').$type<Array<{ userId: number; userName: string; role: string }>>(), // 投标团队
  // 其他信息
  loseReason: text('lose_reason'), // 落标原因
  winCompetitor: varchar('win_competitor', { length: 200 }), // 中标竞争对手
  reviewComments: text('review_comments'), // 评审意见
  lessonsLearned: text('lessons_learned'), // 经验教训
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  idxProjectId: index('idx_project_bidding_project').on(table.projectId),
  idxBidResult: index('idx_project_bidding_result').on(table.bidResult),
}));

export const projectBiddingsRelations = relations(projectBiddings, ({ one }) => ({
  project: one(projects, {
    fields: [projectBiddings.projectId],
    references: [projects.id],
  }),
}));

// ============================================
// V1.2: 项目结算信息表
// ============================================

export const projectSettlements = pgTable('bus_project_settlement', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').references(() => projects.id).notNull().unique(),
  settlementAmount: decimal('settlement_amount', { precision: 15, scale: 2 }), // 结算金额
  settlementDate: date('settlement_date'), // 结算日期
  totalRevenue: decimal('total_revenue', { precision: 15, scale: 2 }), // 总收入
  totalCost: decimal('total_cost', { precision: 15, scale: 2 }), // 总成本
  grossProfit: decimal('gross_profit', { precision: 15, scale: 2 }), // 毛利润
  grossMargin: decimal('gross_margin', { precision: 5, scale: 2 }), // 毛利率
  teamBonus: decimal('team_bonus', { precision: 15, scale: 2 }), // 团队奖金
  projectReview: text('project_review'), // 项目总结
  lessonsLearned: text('lessons_learned'), // 经验教训
  customerFeedback: text('customer_feedback'), // 客户反馈
  archiveStatus: varchar('archive_status', { length: 50 }).default('unarchived'), // unarchived, archived
  archivedAt: timestamp('archived_at'), // 归档时间
  archivedBy: integer('archived_by').references(() => users.id), // 归档人
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  idxProjectId: index('idx_project_settlement_project').on(table.projectId),
  idxArchiveStatus: index('idx_project_settlement_archive').on(table.archiveStatus),
}));

export const projectSettlementsRelations = relations(projectSettlements, ({ one }) => ({
  project: one(projects, {
    fields: [projectSettlements.projectId],
    references: [projects.id],
  }),
  archiver: one(users, {
    fields: [projectSettlements.archivedBy],
    references: [users.id],
  }),
}));

// ============================================
// V1.2: 报价记录表
// ============================================

export const quotations = pgTable('bus_quotation', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').references(() => projects.id).notNull(),
  quotationCode: varchar('quotation_code', { length: 50 }).notNull().unique(), // 报价编号
  quotationName: varchar('quotation_name', { length: 200 }), // 报价名称
  quotationAmount: decimal('quotation_amount', { precision: 15, scale: 2 }), // 报价金额
  discountRate: decimal('discount_rate', { precision: 5, scale: 2 }), // 折扣率
  finalAmount: decimal('final_amount', { precision: 15, scale: 2 }), // 最终金额
  quotationItems: jsonb('quotation_items').$type<Array<{
    itemName: string;
    description: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    amount: number;
  }>>(), // 报价明细
  quotationStatus: varchar('quotation_status', { length: 50 }).default('draft'), // draft, pending_approval, approved, rejected, sent
  validUntil: date('valid_until'), // 有效期至
  approvedBy: integer('approved_by').references(() => users.id), // 审批人
  approvedAt: timestamp('approved_at'), // 审批时间
  sentAt: timestamp('sent_at'), // 发送时间
  createdBy: integer('created_by').references(() => users.id), // 创建人
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  idxProjectId: index('idx_quotation_project').on(table.projectId),
  idxQuotationStatus: index('idx_quotation_status').on(table.quotationStatus),
}));

export const quotationsRelations = relations(quotations, ({ one, many }) => ({
  project: one(projects, {
    fields: [quotations.projectId],
    references: [projects.id],
  }),
  creator: one(users, {
    fields: [quotations.createdBy],
    references: [users.id],
    relationName: 'creator',
  }),
  approver: one(users, {
    fields: [quotations.approvedBy],
    references: [users.id],
    relationName: 'approver',
  }),
  approvals: many(quotationApprovals),
}));

// ============================================
// V1.2: 报价审批表
// ============================================

export const quotationApprovals = pgTable('bus_quotation_approval', {
  id: serial('id').primaryKey(),
  quotationId: integer('quotation_id').references(() => quotations.id, { onDelete: 'cascade' }).notNull(),
  approverId: integer('approver_id').references(() => users.id).notNull(),
  approvalLevel: integer('approval_level').notNull(), // 审批层级
  approvalStatus: varchar('approval_status', { length: 50 }).default('pending'), // pending, approved, rejected
  approvalComment: text('approval_comment'), // 审批意见
  approvedAt: timestamp('approved_at'), // 审批时间
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  idxQuotationId: index('idx_quotation_approval_quotation').on(table.quotationId),
  idxApproverId: index('idx_quotation_approval_approver').on(table.approverId),
}));

export const quotationApprovalsRelations = relations(quotationApprovals, ({ one }) => ({
  quotation: one(quotations, {
    fields: [quotationApprovals.quotationId],
    references: [quotations.id],
  }),
  approver: one(users, {
    fields: [quotationApprovals.approverId],
    references: [users.id],
  }),
}));

// ============================================
// 项目任务表
// ============================================
export const tasks = pgTable('bus_project_task', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').references(() => projects.id, { onDelete: 'cascade' }), // 可为空，支持非项目任务
  taskName: varchar('task_name', { length: 200 }).notNull(),
  taskType: varchar('task_type', { length: 50 }), // 任务类型，可为空
  description: text('description'),
  assigneeId: integer('assignee_id').references(() => users.id),
  estimatedHours: decimal('estimated_hours', { precision: 10, scale: 2 }),
  actualHours: decimal('actual_hours', { precision: 10, scale: 2 }),
  startDate: date('start_date'),
  dueDate: date('due_date'),
  completedDate: date('completed_date'),
  status: varchar('status', { length: 20 }).notNull().default('pending'), // pending, in_progress, completed, cancelled
  priority: varchar('priority', { length: 20 }).notNull().default('medium'),
  progress: integer('progress').notNull().default(0),
  parentId: integer('parent_id').references(() => tasks.id), // 父任务ID
  sequence: integer('sequence'), // 排序
  deletedAt: timestamp('deleted_at'), // 软删除时间
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  idxProjectId: index('idx_task_project').on(table.projectId),
  idxAssigneeId: index('idx_task_assignee').on(table.assigneeId),
  idxStatus: index('idx_task_status').on(table.status),
  idxParentId: index('idx_task_parent').on(table.parentId),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  project: one(projects, {
    fields: [tasks.projectId],
    references: [projects.id],
  }),
  assignee: one(users, {
    fields: [tasks.assigneeId],
    references: [users.id],
  }),
  parent: one(tasks, {
    fields: [tasks.parentId],
    references: [tasks.id],
  }),
  children: many(tasks),
  deliverables: many(taskDeliverables),
}));

// 任务交付物表
export const taskDeliverables = pgTable('bus_task_deliverable', {
  id: serial('id').primaryKey(),
  taskId: integer('task_id').references(() => tasks.id, { onDelete: 'cascade' }).notNull(),
  fileName: varchar('file_name', { length: 255 }).notNull(),
  fileUrl: varchar('file_url', { length: 500 }).notNull(),
  fileSize: integer('file_size'), // 文件大小(bytes)
  fileType: varchar('file_type', { length: 50 }), // 文件类型
  uploaderId: integer('uploader_id').references(() => users.id),
  version: varchar('version', { length: 20 }).notNull().default('1.0'),
  description: text('description'),
  deletedAt: timestamp('deleted_at'), // 软删除时间
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  idxTaskId: index('idx_task_deliverable_task').on(table.taskId),
  idxUploaderId: index('idx_task_deliverable_uploader').on(table.uploaderId),
}));

export const taskDeliverablesRelations = relations(taskDeliverables, ({ one }) => ({
  task: one(tasks, {
    fields: [taskDeliverables.taskId],
    references: [tasks.id],
  }),
  uploader: one(users, {
    fields: [taskDeliverables.uploaderId],
    references: [users.id],
  }),
}));

// ============================================
// 成本仲裁相关表
// ============================================

// 仲裁表
export const arbitrations = pgTable('bus_arbitration', {
  id: serial('id').primaryKey(),
  arbitrationCode: varchar('arbitration_code', { length: 50 }).notNull().unique(),
  projectId: integer('project_id').references(() => projects.id).notNull(),
  taskId: integer('task_id').references(() => tasks.id),
  initiatorId: integer('initiator_id').references(() => users.id).notNull(), // 发起人
  arbitrationType: varchar('arbitration_type', { length: 50 }).notNull(), // 仲裁类型：workload, cost, dispute
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description').notNull(),
  estimatedCost: decimal('estimated_cost', { precision: 15, scale: 2 }), // 预估成本
  actualCost: decimal('actual_cost', { precision: 15, scale: 2 }), // 实际成本
  disputedAmount: decimal('disputed_amount', { precision: 15, scale: 2 }), // 争议金额
  status: varchar('status', { length: 20 }).notNull().default('pending'), // pending, reviewing, approved, rejected, completed
  approverId: integer('approver_id').references(() => users.id), // 审批人
  approvalComments: text('approval_comments'), // 审批意见
  approvedAt: timestamp('approved_at'),
  priority: varchar('priority', { length: 20 }).notNull().default('medium'),
  deletedAt: timestamp('deleted_at'), // 软删除时间
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  idxProject: index('idx_arbitration_project').on(table.projectId),
  idxInitiator: index('idx_arbitration_initiator').on(table.initiatorId),
  idxStatus: index('idx_arbitration_status').on(table.status),
}));

export const arbitrationsRelations = relations(arbitrations, ({ one, many }) => ({
  project: one(projects, {
    fields: [arbitrations.projectId],
    references: [projects.id],
  }),
  task: one(tasks, {
    fields: [arbitrations.taskId],
    references: [tasks.id],
  }),
  initiator: one(users, {
    fields: [arbitrations.initiatorId],
    references: [users.id],
  }),
  approver: one(users, {
    fields: [arbitrations.approverId],
    references: [users.id],
  }),
  approvals: many(arbitrationApprovals),
}));

// 仲裁审批表
export const arbitrationApprovals = pgTable('bus_arbitration_approval', {
  id: serial('id').primaryKey(),
  arbitrationId: integer('arbitration_id').references(() => arbitrations.id, { onDelete: 'cascade' }).notNull(),
  approverId: integer('approver_id').references(() => users.id).notNull(),
  approvalStep: varchar('approval_step', { length: 50 }).notNull(), // 审批步骤
  decision: varchar('decision', { length: 20 }).notNull(), // approved, rejected, pending
  comments: text('comments'),
  approvedAt: timestamp('approved_at'),
  deletedAt: timestamp('deleted_at'), // 软删除时间
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  idxArbitrationId: index('idx_arbitration_approval_arbitration').on(table.arbitrationId),
  idxApproverId: index('idx_arbitration_approval_approver').on(table.approverId),
  idxDecision: index('idx_arbitration_approval_decision').on(table.decision),
}));

export const arbitrationApprovalsRelations = relations(arbitrationApprovals, ({ one }) => ({
  arbitration: one(arbitrations, {
    fields: [arbitrationApprovals.arbitrationId],
    references: [arbitrations.id],
  }),
  approver: one(users, {
    fields: [arbitrationApprovals.approverId],
    references: [users.id],
  }),
}));

// ============================================
// 绩效管理相关表
// ============================================

// 绩效考核表
export const performances = pgTable('bus_performance', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  year: integer('year').notNull(), // 年度
  month: integer('month').notNull(), // 月度
  quarter: integer('quarter'), // 季度
  workloadScore: decimal('workload_score', { precision: 5, scale: 2 }), // 工作量得分
  qualityScore: decimal('quality_score', { precision: 5, scale: 2 }), // 质量得分
  efficiencyScore: decimal('efficiency_score', { precision: 5, scale: 2 }), // 效率得分
  innovationScore: decimal('innovation_score', { precision: 5, scale: 2 }), // 创新得分
  totalScore: decimal('total_score', { precision: 5, scale: 2 }), // 总分
  rank: varchar('rank', { length: 20 }), // 排名
  bonusAmount: decimal('bonus_amount', { precision: 15, scale: 2 }), // 奖金金额
  status: varchar('status', { length: 20 }).notNull().default('draft'), // draft, reviewing, approved
  reviewerId: integer('reviewer_id').references(() => users.id), // 审核人
  reviewComments: text('review_comments'),
  deletedAt: timestamp('deleted_at'), // 软删除时间
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  idxUser: index('idx_performance_user').on(table.userId),
  idxYearMonth: index('idx_performance_year_month').on(table.year, table.month),
  idxStatus: index('idx_performance_status').on(table.status),
}));

export const performancesRelations = relations(performances, ({ one }) => ({
  user: one(users, {
    fields: [performances.userId],
    references: [users.id],
  }),
  reviewer: one(users, {
    fields: [performances.reviewerId],
    references: [users.id],
  }),
}));

// 绩效记录表（详细记录）
export const performanceRecords = pgTable('bus_performance_record', {
  id: serial('id').primaryKey(),
  performanceId: integer('performance_id').references(() => performances.id, { onDelete: 'cascade' }).notNull(),
  recordType: varchar('record_type', { length: 50 }).notNull(), // 记录类型：project, scheme, training, other
  recordId: integer('record_id'), // 关联记录ID
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description'),
  score: decimal('score', { precision: 5, scale: 2 }), // 得分
  weight: decimal('weight', { precision: 5, scale: 2 }), // 权重
  deletedAt: timestamp('deleted_at'), // 软删除时间
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  idxPerformanceId: index('idx_performance_record_performance').on(table.performanceId),
  idxRecordType: index('idx_performance_record_type').on(table.recordType),
}));

export const performanceRecordsRelations = relations(performanceRecords, ({ one }) => ({
  performance: one(performances, {
    fields: [performanceRecords.performanceId],
    references: [performances.id],
  }),
}));

// ============================================
// 通知消息相关表
// ============================================

// 通知表
export const notifications = pgTable('sys_notification', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 200 }).notNull(),
  content: text('content').notNull(),
  type: varchar('type', { length: 50 }).notNull(), // 类型：system, task, approval, reminder
  level: varchar('level', { length: 20 }).notNull().default('info'), // 级别：info, warning, error
  senderId: integer('sender_id').references(() => users.id),
  link: varchar('link', { length: 500 }), // 跳转链接
  isRead: boolean('is_read').notNull().default(false),
  readAt: timestamp('read_at'),
  receiverId: integer('receiver_id').references(() => users.id).notNull(),
  deletedAt: timestamp('deleted_at'), // 软删除时间
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  idxReceiver: index('idx_notification_receiver').on(table.receiverId),
  idxIsRead: index('idx_notification_read').on(table.isRead),
  idxType: index('idx_notification_type').on(table.type),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  sender: one(users, {
    fields: [notifications.senderId],
    references: [users.id],
  }),
  receiver: one(users, {
    fields: [notifications.receiverId],
    references: [users.id],
  }),
}));

// ============================================
// V1.2: 工作台模块相关表
// ============================================

// 待办事项表
export const todos = pgTable('bus_todo', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 200 }).notNull(),
  type: varchar('type', { length: 50 }), // followup, meeting, document, approval, leader_assigned, personal, etc.
  category: varchar('category', { length: 20 }), // system, reminder, business, personal
  source: varchar('source', { length: 20 }), // system, leader, personal
  priority: varchar('priority', { length: 20 }).default('medium'), // urgent, high, medium, low
  dueDate: date('due_date'), // 截止日期
  dueTime: varchar('due_time', { length: 10 }), // 截止时间 HH:mm
  relatedType: varchar('related_type', { length: 50 }), // project, customer, opportunity, solution
  relatedId: integer('related_id'), // 关联ID
  relatedName: varchar('related_name', { length: 200 }), // 关联名称（冗余）
  todoStatus: varchar('todo_status', { length: 50 }).default('pending'), // pending, in_progress, completed, cancelled, deferred
  assigneeId: integer('assignee_id').references(() => users.id).notNull(), // 负责人
  creatorId: integer('creator_id').references(() => users.id), // 创建人
  assignedBy: integer('assigned_by').references(() => users.id), // 指派人（领导指派时使用）
  instruction: text('instruction'), // 指派说明（领导指派时使用）
  reminder: jsonb('reminder').$type<{
    enabled: boolean;
    remindAt?: string; // 提醒时间
    remindType?: string; // minute, hour, day
  }>(), // 提醒配置
  completedAt: timestamp('completed_at'), // 完成时间
  description: text('description'), // 描述
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  idxAssigneeId: index('idx_todo_assignee').on(table.assigneeId),
  idxDueDate: index('idx_todo_due_date').on(table.dueDate),
  idxTodoStatus: index('idx_todo_status').on(table.todoStatus),
  idxRelated: index('idx_todo_related').on(table.relatedType, table.relatedId),
  idxCategory: index('idx_todo_category').on(table.category),
  idxSource: index('idx_todo_source').on(table.source),
}));

export const todosRelations = relations(todos, ({ one }) => ({
  assignee: one(users, {
    fields: [todos.assigneeId],
    references: [users.id],
    relationName: 'todoAssignee',
  }),
  creator: one(users, {
    fields: [todos.creatorId],
    references: [users.id],
    relationName: 'todoCreator',
  }),
  assigner: one(users, {
    fields: [todos.assignedBy],
    references: [users.id],
    relationName: 'todoAssigner',
  }),
}));

// 日程表
export const schedules = pgTable('bus_schedule', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 200 }).notNull(),
  type: varchar('type', { length: 50 }), // meeting, visit, call, presentation, other
  startDate: date('start_date').notNull(), // 开始日期
  startTime: varchar('start_time', { length: 10 }), // 开始时间 HH:mm
  endDate: date('end_date'), // 结束日期
  endTime: varchar('end_time', { length: 10 }), // 结束时间 HH:mm
  allDay: boolean('all_day').default(false), // 是否全天
  location: varchar('location', { length: 200 }), // 地点
  participants: jsonb('participants').$type<Array<{ userId: number; userName: string }>>(), // 参与人员
  relatedType: varchar('related_type', { length: 50 }), // project, customer, opportunity
  relatedId: integer('related_id'), // 关联ID
  reminder: jsonb('reminder').$type<{
    enabled: boolean;
    remindAt?: string;
    remindType?: string;
  }>(), // 提醒配置
  repeat: jsonb('repeat').$type<{
    type: string; // daily, weekly, monthly, yearly
    interval: number; // 间隔
    endDate?: string; // 结束日期
    count?: number; // 重复次数
  }>(), // 重复配置
  description: text('description'), // 描述
  scheduleStatus: varchar('schedule_status', { length: 50 }).default('scheduled'), // scheduled, completed, cancelled
  userId: integer('user_id').references(() => users.id).notNull(), // 所属用户
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  idxUserId: index('idx_schedule_user').on(table.userId),
  idxStartDate: index('idx_schedule_start_date').on(table.startDate),
  idxScheduleStatus: index('idx_schedule_status').on(table.scheduleStatus),
}));

export const schedulesRelations = relations(schedules, ({ one }) => ({
  user: one(users, {
    fields: [schedules.userId],
    references: [users.id],
  }),
}));

// 工作日志表
export const workLogs = pgTable('bus_work_log', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(), // 用户ID
  logDate: date('log_date').notNull(), // 日志日期
  workHours: decimal('work_hours', { precision: 5, scale: 2 }), // 工作时长
  workContent: text('work_content'), // 工作内容
  tomorrowPlan: text('tomorrow_plan'), // 明日计划
  issues: text('issues'), // 问题与困难
  workType: varchar('work_type', { length: 50 }), // followup, bidding, project, meeting, other
  status: varchar('status', { length: 20 }).notNull().default('draft'), // 状态：draft, submitted, approved, rejected
  relatedProjects: jsonb('related_projects').$type<Array<{ projectId: number; projectName: string; hours: number }>>(), // 关联项目
  relatedCustomers: jsonb('related_customers').$type<Array<{ customerId: number; customerName: string }>>(), // 关联客户
  attachments: jsonb('attachments').$type<Array<{ name: string; url: string }>>(), // 附件
  location: varchar('location', { length: 200 }), // 工作地点
  mood: varchar('mood', { length: 20 }), // 心情：great, good, normal, bad
  approvedBy: integer('approved_by').references(() => users.id), // 审批人ID
  approvedAt: timestamp('approved_at'), // 审批时间
  approvalComment: text('approval_comment'), // 审批意见
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  idxUserId: index('idx_work_log_user').on(table.userId),
  idxLogDate: index('idx_work_log_date').on(table.logDate),
  idxWorkType: index('idx_work_log_type').on(table.workType),
}));

export const workLogsRelations = relations(workLogs, ({ one }) => ({
  user: one(users, {
    fields: [workLogs.userId],
    references: [users.id],
  }),
}));

// ============================================
// 售前服务配置相关表
// ============================================

// 员工标签表
export const staffTags = pgTable('staff_tags', {
  id: serial('id').primaryKey(),
  tagName: varchar('tag_name', { length: 50 }).notNull(), // 标签名称
  tagColor: varchar('tag_color', { length: 20 }), // 标签颜色
  description: text('description'), // 标签描述
  sortOrder: integer('sort_order').notNull().default(0), // 排序
  status: varchar('status', { length: 20 }).notNull().default('active'), // active, inactive
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  idxName: index('idx_staff_tags_name').on(table.tagName),
  idxStatus: index('idx_staff_tags_status').on(table.status),
}));

// 售前服务类型配置表
export const presalesServiceTypes = pgTable('sys_presales_service_type', {
  id: serial('id').primaryKey(),
  serviceCode: varchar('service_code', { length: 50 }).notNull().unique(), // 服务编码
  serviceName: varchar('service_name', { length: 100 }).notNull(), // 服务名称
  serviceCategory: varchar('service_category', { length: 50 }).notNull(), // 服务分类：analysis, design, presentation, negotiation
  description: text('description'), // 服务描述
  weight: integer('weight').notNull().default(10), // 权重（用于绩效计算）
  standardDuration: integer('standard_duration'), // 标准时长（小时）
  isRequired: boolean('is_required').notNull().default(false), // 是否必选服务
  sortOrder: integer('sort_order').notNull().default(0), // 排序
  status: varchar('status', { length: 20 }).notNull().default('active'), // active, inactive
  deletedAt: timestamp('deleted_at'), // 软删除时间
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  idxCategory: index('idx_presales_service_category').on(table.serviceCategory),
  idxStatus: index('idx_presales_service_status').on(table.status),
}));

// 项目售前服务记录表
export const projectPresalesRecords = pgTable('bus_project_presales_record', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').references(() => projects.id).notNull(), // 项目ID
  serviceTypeId: integer('service_type_id').references(() => presalesServiceTypes.id).notNull(), // 服务类型ID
  staffId: integer('staff_id').references(() => users.id).notNull(), // 售前人员ID
  serviceDate: timestamp('service_date'), // 服务日期
  durationHours: decimal('duration_hours', { precision: 10, scale: 2 }), // 服务时长（小时）
  description: text('description'), // 服务内容描述
  status: varchar('status', { length: 50 }), // 状态
  // V2.1: 多人协作字段
  totalWorkHours: decimal('total_work_hours', { precision: 10, scale: 2 }), // 总工时（所有参与人工时之和）
  participantCount: integer('participant_count').default(1), // 参与人数
  deletedAt: timestamp('deleted_at'), // 软删除时间
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  idxProject: index('idx_presales_record_project').on(table.projectId),
  idxStaff: index('idx_presales_record_staff').on(table.staffId),
  idxServiceType: index('idx_presales_record_type').on(table.serviceTypeId),
}));

export const projectPresalesRecordsRelations = relations(projectPresalesRecords, ({ one }) => ({
  project: one(projects, {
    fields: [projectPresalesRecords.projectId],
    references: [projects.id],
  }),
  serviceType: one(presalesServiceTypes, {
    fields: [projectPresalesRecords.serviceTypeId],
    references: [presalesServiceTypes.id],
  }),
  staff: one(users, {
    fields: [projectPresalesRecords.staffId],
    references: [users.id],
  }),
}));

// ============================================
// 预警管理相关表
// ============================================

// 预警规则表
export const alertRules = pgTable('bus_alert_rule', {
  id: serial('id').primaryKey(),
  ruleName: varchar('rule_name', { length: 200 }).notNull(), // 规则名称
  ruleCode: varchar('rule_code', { length: 50 }).notNull().unique(), // 规则编码
  ruleType: varchar('rule_type', { length: 50 }).notNull(), // 规则类型：project, customer, user, solution, opportunity, lead
  ruleCategory: varchar('rule_category', { length: 50 }).notNull(), // 规则分类：not_updated, inactive, overdue, not_used, not_referenced
  conditionField: varchar('condition_field', { length: 100 }).notNull(), // 条件字段
  conditionOperator: varchar('condition_operator', { length: 20 }).notNull(), // 条件操作符：gt, lt, eq, gte, lte
  thresholdValue: integer('threshold_value').notNull(), // 阈值
  thresholdUnit: varchar('threshold_unit', { length: 20 }).notNull(), // 阈值单位：day, week, month, hour, count
  severity: varchar('severity', { length: 20 }).notNull().default('medium'), // 严重程度：low, medium, high, critical
  status: varchar('status', { length: 20 }).notNull().default('active'), // 规则状态：active, inactive, draft
  checkFrequency: varchar('check_frequency', { length: 20 }).notNull().default('daily'), // 检查频率：hourly, daily, weekly, monthly
  notificationChannels: jsonb('notification_channels').$type<string[]>(), // 通知渠道：email, sms, system, webhook
  recipientIds: jsonb('recipient_ids').$type<number[]>(), // 通知接收人ID列表
  description: text('description'), // 规则描述
  createdBy: integer('created_by').references(() => users.id), // 创建人
  deletedAt: timestamp('deleted_at'), // 软删除时间
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  lastTriggeredAt: timestamp('last_triggered_at'), // 最后触发时间
  triggerCount: integer('trigger_count').notNull().default(0), // 触发次数
}, (table) => ({
  idxRuleType: index('idx_alert_rule_type').on(table.ruleType),
  idxStatus: index('idx_alert_rule_status').on(table.status),
  idxCreator: index('idx_alert_rule_creator').on(table.createdBy),
}));

export const alertRulesRelations = relations(alertRules, ({ one, many }) => ({
  creator: one(users, {
    fields: [alertRules.createdBy],
    references: [users.id],
  }),
  alertHistories: many(alertHistories),
}));

// 预警历史表
export const alertHistories = pgTable('bus_alert_history', {
  id: serial('id').primaryKey(),
  ruleId: integer('rule_id').references(() => alertRules.id), // 规则ID
  ruleName: varchar('rule_name', { length: 200 }), // 规则名称（冗余字段，便于查询）
  alertType: varchar('alert_type', { length: 50 }), // 预警类型
  targetType: varchar('target_type', { length: 50 }), // 目标类型：project, customer, user, solution
  targetId: integer('target_id'), // 目标ID
  targetName: varchar('target_name', { length: 200 }), // 目标名称（冗余字段）
  severity: varchar('severity', { length: 20 }), // 严重程度：low, medium, high, critical
  status: varchar('status', { length: 20 }).default('pending'), // 预警状态：pending, acknowledged, resolved, ignored
  message: text('message'), // 预警消息
  alertData: jsonb('alert_data').$type<Record<string, any>>(), // 预警数据（包含字段值、触发条件等）
  relatedType: varchar('related_type', { length: 50 }), // 关联类型
  relatedId: integer('related_id'), // 关联ID
  handledAt: timestamp('handled_at'), // 处理时间
  handlerId: integer('handler_id').references(() => users.id), // 处理人
  handlingNotes: text('handling_notes'), // 处理备注
  acknowledgedAt: timestamp('acknowledged_at'), // 确认时间
  acknowledgedBy: integer('acknowledged_by').references(() => users.id), // 确认人
  resolvedAt: timestamp('resolved_at'), // 解决时间
  resolvedBy: integer('resolved_by').references(() => users.id), // 解决人
  resolutionNote: text('resolution_note'), // 解决备注
  deletedAt: timestamp('deleted_at'), // 软删除时间
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  idxRule: index('idx_alert_history_rule').on(table.ruleId),
  idxTarget: index('idx_alert_history_target').on(table.targetType, table.targetId),
  idxStatus: index('idx_alert_history_status').on(table.status),
  idxSeverity: index('idx_alert_history_severity').on(table.severity),
}));

export const alertHistoriesRelations = relations(alertHistories, ({ one, many }) => ({
  rule: one(alertRules, {
    fields: [alertHistories.ruleId],
    references: [alertRules.id],
  }),
  acknowledger: one(users, {
    fields: [alertHistories.acknowledgedBy],
    references: [users.id],
  }),
  resolver: one(users, {
    fields: [alertHistories.resolvedBy],
    references: [users.id],
  }),
}));

// 预警通知表
export const alertNotifications = pgTable('bus_alert_notification', {
  id: serial('id').primaryKey(),
  alertHistoryId: integer('alert_history_id').references(() => alertHistories.id).notNull(), // 预警历史ID
  recipientId: integer('recipient_id').references(() => users.id).notNull(), // 接收人ID
  channel: varchar('channel', { length: 20 }).notNull(), // 通知渠道：email, sms, system, webhook
  status: varchar('status', { length: 20 }).notNull().default('pending'), // 通知状态：pending, sent, failed
  content: text('content'), // 通知内容
  sentAt: timestamp('sent_at'), // 发送时间
  errorMessage: text('error_message'), // 错误信息
  retryCount: integer('retry_count').notNull().default(0), // 重试次数
  deletedAt: timestamp('deleted_at'), // 软删除时间
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  idxAlertHistoryId: index('idx_alert_notification_history').on(table.alertHistoryId),
  idxRecipientId: index('idx_alert_notification_recipient').on(table.recipientId),
  idxStatus: index('idx_alert_notification_status').on(table.status),
  idxChannel: index('idx_alert_notification_channel').on(table.channel),
}));

export const alertNotificationsRelations = relations(alertNotifications, ({ one }) => ({
  alertHistory: one(alertHistories, {
    fields: [alertNotifications.alertHistoryId],
    references: [alertHistories.id],
  }),
  recipient: one(users, {
    fields: [alertNotifications.recipientId],
    references: [users.id],
  }),
}));

// ============================================
// 基础数据字典相关表
// ============================================

// 分子公司表
export const subsidiaries = pgTable('sys_subsidiary', {
  id: serial('id').primaryKey(),
  subsidiaryCode: varchar('subsidiary_code', { length: 50 }).notNull().unique(), // 分子公司编码
  subsidiaryName: varchar('subsidiary_name', { length: 100 }).notNull().unique(), // 分子公司名称
  companyType: varchar('company_type', { length: 20 }), // 公司类型：sales_subsidiary(销售子公司), sales_branch(销售分公司), independent(独立子公司)
  regions: jsonb('regions').$type<string[]>(), // 覆盖区域（多选）
  address: text('address'), // 地址
  contactPerson: varchar('contact_person', { length: 50 }), // 联系人
  contactPhone: varchar('contact_phone', { length: 20 }), // 联系电话
  status: varchar('status', { length: 20 }).notNull().default('active'), // active, inactive
  deletedAt: timestamp('deleted_at'), // 软删除时间
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  idxStatus: index('idx_subsidiary_status').on(table.status),
  idxCompanyType: index('idx_subsidiary_company_type').on(table.companyType),
}));

// 客户类型表
export const customerTypes = pgTable('sys_customer_type', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 20 }).notNull().unique(), // 类型编码
  name: varchar('name', { length: 50 }).notNull().unique(), // 类型名称
  description: text('description'), // 描述
  defaultProjectTypeCode: varchar('default_project_type_code', { length: 20 }), // 默认项目类型编码
  status: varchar('status', { length: 20 }).notNull().default('active'), // active, inactive
  deletedAt: timestamp('deleted_at'), // 软删除时间
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  idxStatus: index('idx_customer_type_status').on(table.status),
}));

// 项目类型表
export const projectTypes = pgTable('sys_project_type', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 20 }).notNull().unique(), // 类型编码
  name: varchar('name', { length: 50 }).notNull().unique(), // 类型名称
  description: text('description'), // 描述
  status: varchar('status', { length: 20 }).notNull().default('active'), // active, inactive
  deletedAt: timestamp('deleted_at'), // 软删除时间
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  idxStatus: index('idx_project_type_status').on(table.status),
}));

// 解决方案类型表
export const solutionTypes = pgTable('sys_solution_type', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 20 }).notNull().unique(), // 类型编码
  name: varchar('name', { length: 50 }).notNull().unique(), // 类型名称
  description: text('description'), // 描述
  status: varchar('status', { length: 20 }).notNull().default('active'), // active, inactive
  deletedAt: timestamp('deleted_at'), // 软删除时间
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  idxStatus: index('idx_solution_type_status').on(table.status),
}));

// ============================================
// 数据字典相关表
// ============================================

// 字典分类表
export const attributeCategories = pgTable('sys_attribute_category', {
  id: serial('id').primaryKey(),
  categoryCode: varchar('category_code', { length: 50 }).notNull().unique(), // 分类编码
  categoryName: varchar('category_name', { length: 100 }).notNull(), // 分类名称
  description: text('description'), // 描述
  icon: varchar('icon', { length: 50 }), // 图标
  isSystem: boolean('is_system').notNull().default(false), // 是否系统预置
  sortOrder: integer('sort_order').notNull().default(0), // 排序
  status: varchar('status', { length: 20 }).notNull().default('active'), // active, inactive
  deletedAt: timestamp('deleted_at'), // 软删除时间
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  idxCategoryCode: index('idx_attr_cat_code').on(table.categoryCode),
  idxStatus: index('idx_attr_cat_status').on(table.status),
}));

// 系统属性配置表（数据字典项）
export const attributes = pgTable('sys_attribute', {
  id: serial('id').primaryKey(),
  category: varchar('category', { length: 50 }).notNull(), // 属性分类（关联 attributeCategories.categoryCode）
  code: varchar('attribute_key', { length: 50 }).notNull(), // 属性编码（数据库字段名：attribute_key）
  name: varchar('name', { length: 100 }), // 属性名称（数据库无此字段，使用 attribute_value 作为名称）
  value: text('attribute_value'), // 属性值（数据库字段名：attribute_value）
  valueType: varchar('attribute_type', { length: 50 }), // 值类型（数据库字段名：attribute_type）
  description: text('description'), // 描述
  parentId: integer('parent_id').references(() => attributes.id), // 父级ID（支持层级结构）
  sortOrder: integer('sort_order').notNull().default(0), // 排序
  isSystem: boolean('is_system').notNull().default(false), // 是否系统预置
  extraData: jsonb('extra_data').$type<Record<string, any>>(), // 额外数据（扩展字段）
  status: varchar('status', { length: 20 }), // active, inactive
  deletedAt: timestamp('deleted_at'), // 软删除时间
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  idxCategory: index('idx_attribute_category').on(table.category),
  idxCode: index('idx_attribute_key').on(table.code),
  idxStatus: index('idx_attribute_status').on(table.status),
  idxParentId: index('idx_attribute_parent').on(table.parentId),
}));

// 数据字典表关系
export const attributeCategoriesRelations = relations(attributeCategories, ({ many }) => ({
  attributes: many(attributes),
}));

export const attributesRelations = relations(attributes, ({ one, many }) => ({
  category: one(attributeCategories, {
    fields: [attributes.category],
    references: [attributeCategories.categoryCode],
  }),
  parent: one(attributes, {
    fields: [attributes.parentId],
    references: [attributes.id],
    relationName: 'attribute_hierarchy',
  }),
  children: many(attributes, {
    relationName: 'attribute_hierarchy',
  }),
}));

// 基础数据字典表关系
export const subsidiariesRelations = relations(subsidiaries, ({ one, many }) => ({
  customers: many(customers),
}));

export const staffProfiles = pgTable('bus_staff_profile', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull().unique(),
  employeeId: varchar('employee_id', { length: 50 }).notNull().unique(),
  jobTitle: varchar('job_title', { length: 50 }),
  jobLevel: varchar('job_level', { length: 20 }),
  joinDate: date('join_date'),
  probationDate: date('probation_date'),
  regularDate: date('regular_date'),
  skills: jsonb('skills').$type<string[] | Record<string, unknown> | null>(),
  expertise: jsonb('expertise').$type<string[] | Record<string, unknown> | null>(),
  education: jsonb('education').$type<Record<string, unknown> | null>(),
  workExperience: jsonb('work_experience').$type<Array<Record<string, unknown>> | null>(),
  certifications: jsonb('certifications').$type<Array<Record<string, unknown>> | null>(),
  avatar: varchar('avatar', { length: 255 }),
  bio: text('bio'),
  strengths: text('strengths'),
  weaknesses: text('weaknesses'),
  careerGoals: text('career_goals'),
  mentorId: integer('mentor_id').references(() => users.id),
  subsidiaryId: integer('subsidiary_id').references(() => subsidiaries.id),
  teamId: integer('team_id'),
  baseLocation: varchar('base_location', { length: 50 }),
  travelCapacity: varchar('travel_capacity', { length: 20 }),
  contractType: varchar('contract_type', { length: 20 }),
  contractStartDate: date('contract_start_date'),
  contractEndDate: date('contract_end_date'),
  hourlyRate: decimal('hourly_rate', { precision: 10, scale: 2 }),
  annualSalary: decimal('annual_salary', { precision: 15, scale: 2 }),
  performanceRating: varchar('performance_rating', { length: 20 }),
  lastEvaluationDate: date('last_evaluation_date'),
  promotionDate: date('promotion_date'),
  leaveDate: date('leave_date'),
  leaveReason: text('leave_reason'),
  notes: text('notes'),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  idxSubsidiary: index('idx_staff_profile_subsidiary').on(table.subsidiaryId),
  idxStatus: index('idx_staff_profile_status').on(table.status),
  idxBaseLocation: index('idx_staff_profile_location').on(table.baseLocation),
}));

export const staffProfilesRelations = relations(staffProfiles, ({ one }) => ({
  user: one(users, {
    fields: [staffProfiles.userId],
    references: [users.id],
  }),
  mentor: one(users, {
    fields: [staffProfiles.mentorId],
    references: [users.id],
  }),
  subsidiary: one(subsidiaries, {
    fields: [staffProfiles.subsidiaryId],
    references: [subsidiaries.id],
  }),
}));

export const staffProjectRelations = pgTable('bus_staff_project_relation', {
  id: serial('id').primaryKey(),
  staffId: integer('staff_id').references(() => users.id).notNull(),
  projectId: integer('project_id').references(() => projects.id).notNull(),
  roleType: varchar('role_type', { length: 50 }).notNull(),
  startDate: date('start_date'),
  endDate: date('end_date'),
  contributionPercentage: decimal('contribution_percentage', { precision: 5, scale: 2 }),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  ukStaffProject: uniqueIndex('uk_staff_project').on(table.staffId, table.projectId),
  idxStaffId: index('idx_staff_project_staff').on(table.staffId),
  idxProjectId: index('idx_staff_project_project').on(table.projectId),
}));

// 更新usersRelations，添加预警相关关系
export const usersRelations = relations(users, ({ one, many }) => ({
  role: one(roles, {
    fields: [users.roleId],
    references: [roles.id],
  }),
  leads: many(leads),
  opportunities: many(opportunities),
  projects: many(projects),
  tasks: many(tasks),
  arbitrations: many(arbitrations),
  loginLogs: many(loginLogs),
  operationLogs: many(operationLogs),
  performances: many(performances),
  alertRules: many(alertRules),
  staffProfile: one(staffProfiles, {
    fields: [users.id],
    references: [staffProfiles.userId],
  }),
  staffProjectRelations: many(staffProjectRelations),
}));

export const staffProjectRelationsRelations = relations(staffProjectRelations, ({ one }) => ({
  staff: one(users, {
    fields: [staffProjectRelations.staffId],
    references: [users.id],
  }),
  project: one(projects, {
    fields: [staffProjectRelations.projectId],
    references: [projects.id],
  }),
}));

// 人员客户关联表
// 注意：数据库实际字段名与之前Schema定义有差异，已同步为数据库实际结构
export const staffCustomerRelations = pgTable('bus_staff_customer_relation', {
  id: serial('id').primaryKey(),
  staffId: integer('staff_id').references(() => users.id).notNull(),
  customerId: integer('customer_id').references(() => customers.id).notNull(),
  relationshipType: varchar('relationship_type', { length: 50 }).notNull(), // 客户关系类型：account_manager, consultant, support
  isPrimary: boolean('is_primary').notNull().default(false), // 是否主要负责人
  startDate: date('start_date'), // 关系开始日期
  endDate: date('end_date'), // 关系结束日期
  deletedAt: timestamp('deleted_at'), // 软删除时间
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  ukStaffCustomer: uniqueIndex('uk_staff_customer').on(table.staffId, table.customerId),
  idxStaffId: index('idx_staff_customer_staff').on(table.staffId),
  idxCustomerId: index('idx_staff_customer_customer').on(table.customerId),
}));

export const staffCustomerRelationsRelations = relations(staffCustomerRelations, ({ one }) => ({
  staff: one(users, {
    fields: [staffCustomerRelations.staffId],
    references: [users.id],
  }),
  customer: one(customers, {
    fields: [staffCustomerRelations.customerId],
    references: [customers.id],
  }),
}));

// 人员解决方案关联表
export const staffSolutionRelations = pgTable('bus_staff_solution_relation', {
  id: serial('id').primaryKey(),
  staffId: integer('staff_id').references(() => users.id).notNull(),
  solutionId: integer('solution_id').references(() => solutions.id).notNull(),
  role: varchar('role', { length: 50 }).notNull(), // 解决方案角色：creator, contributor, reviewer, maintainer
  contribution: text('contribution'), // 贡献描述
  contributionDate: timestamp('contribution_date').notNull(), // 贡献日期
  contributionHours: decimal('contribution_hours', { precision: 10, scale: 2 }), // 贡献时长
  expertiseArea: varchar('expertise_area', { length: 100 }), // 专业领域
  approvalStatus: varchar('approval_status', { length: 20 }).notNull().default('approved'), // approved, pending, rejected
  notes: text('notes'), // 备注
  deletedAt: timestamp('deleted_at'), // 软删除时间
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  ukStaffSolution: uniqueIndex('uk_staff_solution').on(table.staffId, table.solutionId),
  idxStaffId: index('idx_staff_solution_staff').on(table.staffId),
  idxSolutionId: index('idx_staff_solution_solution').on(table.solutionId),
}));

export const staffSolutionRelationsRelations = relations(staffSolutionRelations, ({ one }) => ({
  staff: one(users, {
    fields: [staffSolutionRelations.staffId],
    references: [users.id],
  }),
  solution: one(solutions, {
    fields: [staffSolutionRelations.solutionId],
    references: [solutions.id],
  }),
}));

// 人员区域关联表
export const staffRegionRelations = pgTable('bus_staff_region_relation', {
  id: serial('id').primaryKey(),
  staffId: integer('staff_id').references(() => users.id).notNull(),
  region: varchar('region', { length: 50 }).notNull(), // 区域名称
  regionLevel: varchar('region_level', { length: 20 }).notNull(), // 区域级别：country, province, city
  isPrimary: boolean('is_primary').notNull().default(false), // 是否主要负责区域
  expertiseLevel: varchar('expertise_level', { length: 20 }), // 专业程度：expert, senior, junior
  startDate: date('start_date').notNull(), // 负责开始日期
  endDate: date('end_date'), // 负责结束日期
  notes: text('notes'), // 备注
  deletedAt: timestamp('deleted_at'), // 软删除时间
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  // 唯一约束：同一人员不能重复关联同一区域
  ukStaffRegion: uniqueIndex('uk_staff_region').on(table.staffId, table.region),
  idxStaffId: index('idx_staff_region_staff').on(table.staffId),
  idxRegion: index('idx_staff_region_region').on(table.region),
}));

export const staffRegionRelationsRelations = relations(staffRegionRelations, ({ one }) => ({
  staff: one(users, {
    fields: [staffRegionRelations.staffId],
    references: [users.id],
  }),
}));

// 人员动态表
// 注意：数据库实际字段名与之前Schema定义有差异，已同步为数据库实际结构
export const staffActivities = pgTable('bus_staff_activity', {
  id: serial('id').primaryKey(),
  staffId: integer('staff_id').references(() => users.id).notNull(),
  activityType: varchar('activity_type', { length: 50 }).notNull(), // 活动类型：project_visit, customer_meeting, training, presentation, document_creation, other
  activityName: varchar('activity_name', { length: 200 }).notNull(), // 活动名称（数据库实际字段名）
  description: text('description'), // 活动描述
  projectId: integer('project_id').references(() => projects.id), // 关联项目ID
  customerId: integer('customer_id').references(() => customers.id), // 关联客户ID
  solutionId: integer('solution_id').references(() => solutions.id), // 关联解决方案ID
  activityDate: date('activity_date').notNull(), // 活动日期（数据库为date类型）
  durationHours: decimal('duration_hours', { precision: 10, scale: 2 }), // 活动时长（小时）
  attachmentUrl: varchar('attachment_url', { length: 500 }), // 附件URL（兼容旧数据）
  attachmentKey: varchar('attachment_key', { length: 500 }), // 对象存储中的文件key
  attachmentName: varchar('attachment_name', { length: 255 }), // 原始文件名
  attachmentSize: bigint('attachment_size', { mode: 'number' }), // 文件大小（字节）
  attachments: text('attachments'), // 附件列表（JSON格式，用于存储多个佐证文件信息）
  isBusinessTrip: boolean('is_business_trip').default(false), // 是否出差
  tripStartDate: date('trip_start_date'), // 出差起始时间
  tripEndDate: date('trip_end_date'), // 出差结束时间
  tripCost: decimal('trip_cost', { precision: 10, scale: 2 }), // 差旅成本
  deletedAt: timestamp('deleted_at'), // 软删除时间
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  idxStaffId: index('idx_staff_activity_staff').on(table.staffId),
  idxActivityType: index('idx_staff_activity_type').on(table.activityType),
  idxActivityDate: index('idx_staff_activity_date').on(table.activityDate),
  idxProjectId: index('idx_staff_activity_project').on(table.projectId),
  idxCustomerId: index('idx_staff_activity_customer').on(table.customerId),
}));

export const staffActivitiesRelations = relations(staffActivities, ({ one }) => ({
  staff: one(users, {
    fields: [staffActivities.staffId],
    references: [users.id],
  }),
  project: one(projects, {
    fields: [staffActivities.projectId],
    references: [projects.id],
  }),
  customer: one(customers, {
    fields: [staffActivities.customerId],
    references: [customers.id],
  }),
  solution: one(solutions, {
    fields: [staffActivities.solutionId],
    references: [solutions.id],
  }),
}));

// ============================================
// 解决方案管理相关表
// ============================================

export const solutions = pgTable('bus_solution', {
  id: serial('id').primaryKey(),
  solutionCode: varchar('solution_code', { length: 50 }).notNull().unique(),
  solutionName: varchar('solution_name', { length: 200 }).notNull(),
  solutionTypeId: integer('solution_type_id').references(() => solutionTypes.id),
  version: varchar('version', { length: 20 }).notNull().default('1.0'),
  industry: jsonb('industry').$type<string[] | Record<string, unknown> | null>(),
  scenario: varchar('scenario', { length: 100 }),
  description: text('description'),
  coreFeatures: jsonb('core_features').$type<Array<{ name?: string; description?: string }> | string[] | null>(),
  technicalArchitecture: text('technical_architecture'),
  components: jsonb('components').$type<Array<{ name?: string; type?: string; description?: string }> | string[] | null>(),
  advantages: text('advantages'),
  limitations: text('limitations'),
  targetAudience: text('target_audience'),
  complexity: varchar('complexity', { length: 20 }),
  estimatedCost: decimal('estimated_cost', { precision: 15, scale: 2 }),
  estimatedDuration: integer('estimated_duration'),
  authorId: integer('author_id').references(() => users.id).notNull(),
  ownerId: integer('owner_id').references(() => users.id),
  reviewerId: integer('reviewer_id').references(() => users.id),
  isTemplate: boolean('is_template').notNull().default(false),
  templateId: integer('template_id').references(() => solutions.id),
  status: varchar('status', { length: 20 }).notNull().default('draft'),
  approvalStatus: varchar('approval_status', { length: 20 }),
  approvalDate: timestamp('approval_date'),
  approvalComments: text('approval_comments'),
  publishDate: timestamp('publish_date'),
  tags: jsonb('tags').$type<string[] | Record<string, unknown>[] | null>(),
  attachments: jsonb('attachments').$type<Array<{ name?: string; url?: string }> | null>(),
  thumbnail: varchar('thumbnail', { length: 255 }),
  viewCount: integer('view_count').notNull().default(0),
  downloadCount: integer('download_count').notNull().default(0),
  likeCount: integer('like_count').notNull().default(0),
  shareCount: integer('share_count').notNull().default(0),
  rating: decimal('rating', { precision: 3, scale: 2 }),
  ratingCount: integer('rating_count').notNull().default(0),
  comments: jsonb('comments').$type<Array<Record<string, unknown>> | null>(),
  isPublic: boolean('is_public').notNull().default(false),
  publishScope: varchar('publish_scope', { length: 50 }),
  externalReferences: jsonb('external_references').$type<Array<Record<string, unknown>> | null>(),
  dependencies: jsonb('dependencies').$type<Array<Record<string, unknown>> | null>(),
  notes: text('notes'),
  templateCategory: varchar('template_category', { length: 20 }),
  templateScope: varchar('template_scope', { length: 20 }).default('company'),
  templateUsageCount: integer('template_usage_count').notNull().default(0),
  solutionCategory: varchar('solution_category', { length: 20 }).default('base'),
  plateId: integer('plate_id').references(() => dictionaryItems.id),
  projectId: integer('project_id').references(() => projects.id),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  idxSolutionType: index('idx_solution_type').on(table.solutionTypeId),
  idxAuthor: index('idx_solution_author').on(table.authorId),
  idxStatus: index('idx_solution_status').on(table.status),
  idxIndustry: index('idx_solution_industry').on(table.industry),
  idxTemplateUsage: index('idx_solution_template_usage').on(table.templateUsageCount),
}));

export const solutionsRelations = relations(solutions, ({ one, many }) => ({
  solutionType: one(solutionTypes, {
    fields: [solutions.solutionTypeId],
    references: [solutionTypes.id],
  }),
  author: one(users, {
    fields: [solutions.authorId],
    references: [users.id],
  }),
  owner: one(users, {
    fields: [solutions.ownerId],
    references: [users.id],
  }),
  reviewer: one(users, {
    fields: [solutions.reviewerId],
    references: [users.id],
  }),
  template: one(solutions, {
    fields: [solutions.templateId],
    references: [solutions.id],
  }),
  versions: many(solutionVersions),
  solutionTags: many(solutionTags),
  solutionProjects: many(solutionProjects),
  templateChildren: many(solutions, {
    relationName: 'templateChildren',
  }),
  staffRelations: many(staffSolutionRelations),
  subSchemes: many(solutionSubSchemes),
  teamMembers: many(solutionTeams),
  reviews: many(solutionReviews),
  statistics: many(solutionStatistics),
  plate: one(dictionaryItems, {
    fields: [solutions.plateId],
    references: [dictionaryItems.id],
  }),
  project: one(projects, {
    fields: [solutions.projectId],
    references: [projects.id],
  }),
  projectReferences: many(solutionSubReferences, {
    relationName: 'projectSolutionReferences',
  }),
  baseReferences: many(solutionSubReferences, {
    relationName: 'baseSolutionReferences',
  }),
}));

// 解决方案版本表
export const solutionVersions = pgTable('bus_solution_version', {
  id: serial('id').primaryKey(),
  solutionId: integer('solution_id').references(() => solutions.id, { onDelete: 'cascade' }).notNull(),
  version: varchar('version', { length: 20 }).notNull(), // 版本号
  versionName: varchar('version_name', { length: 200 }), // 版本名称
  description: text('description'), // 版本描述
  changeType: varchar('change_type', { length: 20 }).notNull(), // 变更类型：major, minor, patch
  changelog: text('changelog'), // 变更日志
  features: jsonb('features').$type<Array<{ name: string; description: string; type: string }>>(), // 新增功能
  bugfixes: jsonb('bugfixes').$type<Array<{ id: string; description: string }>>(), // 修复的Bug
  improvements: jsonb('improvements').$type<Array<{ name: string; description: string }>>(), // 改进项
  breakingChanges: jsonb('breaking_changes').$type<Array<{ description: string; impact: string }>>(), // 破坏性变更
  migrationGuide: text('migration_guide'), // 迁移指南
  compatibility: jsonb('compatibility').$type<Array<{ version: string; compatible: boolean; notes: string }>>(), // 兼容性说明
  authorId: integer('author_id').references(() => users.id).notNull(), // 版本作者
  releaseDate: timestamp('release_date'), // 发布日期
  status: varchar('status', { length: 20 }).notNull().default('draft'), // draft, released, deprecated
  isStable: boolean('is_stable').notNull().default(false), // 是否稳定版
  isLatest: boolean('is_latest').notNull().default(false), // 是否最新版本
  attachments: jsonb('attachments').$type<Array<{ name: string; url: string }>>(), // 附件
  downloadUrl: varchar('download_url', { length: 500 }), // 下载链接
  fileHash: varchar('file_hash', { length: 64 }), // 文件哈希（MD5/SHA256）
  fileSize: bigint('file_size', { mode: 'number' }), // 文件大小
  notes: text('notes'), // 备注
  // ========== V2.2 新增字段 ==========
  snapshotData: jsonb('snapshot_data'), // 完整方案快照（JSON）
  subSchemesSnapshot: jsonb('sub_schemes_snapshot'), // 子方案快照列表
  filesSnapshot: jsonb('files_snapshot'), // 文件清单快照
  teamSnapshot: jsonb('team_snapshot'), // 团队成员快照
  statisticsSnapshot: jsonb('statistics_snapshot'), // 统计快照
  changeSource: varchar('change_source', { length: 20 }).default('manual'), // 变更来源：manual/edit/review/auto
  parentVersionId: integer('parent_version_id').references(() => solutionVersions.id), // 父版本ID
  isPublished: boolean('is_published').default(false), // 是否已发布
  publishedAt: timestamp('published_at'), // 发布时间
  publishedBy: integer('published_by').references(() => users.id), // 发布人
  // ==============================
  deletedAt: timestamp('deleted_at'), // 软删除时间
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  idxSolutionId: index('idx_solution_version_solution').on(table.solutionId),
  idxAuthorId: index('idx_solution_version_author').on(table.authorId),
  idxStatus: index('idx_solution_version_status').on(table.status),
  idxIsLatest: index('idx_solution_version_latest').on(table.isLatest),
  idxSolutionVersionParent: index('idx_solution_version_parent').on(table.parentVersionId),
  idxSolutionVersionPublished: index('idx_solution_version_published').on(table.isPublished),
}));

export const solutionVersionsRelations = relations(solutionVersions, ({ one, many }) => ({
  solution: one(solutions, {
    fields: [solutionVersions.solutionId],
    references: [solutions.id],
  }),
  author: one(users, {
    fields: [solutionVersions.authorId],
    references: [users.id],
  }),
}));

// 解决方案标签表
export const solutionTags = pgTable('bus_solution_tag', {
  id: serial('id').primaryKey(),
  solutionId: integer('solution_id').references(() => solutions.id, { onDelete: 'cascade' }).notNull(),
  tagName: varchar('tag_name', { length: 50 }).notNull(), // 标签名称
  tagCategory: varchar('tag_category', { length: 50 }), // 标签分类
  tagColor: varchar('tag_color', { length: 20 }), // 标签颜色
  description: text('description'), // 标签描述
  createdBy: integer('created_by').references(() => users.id), // 创建人
  deletedAt: timestamp('deleted_at'), // 软删除时间
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  idxSolutionId: index('idx_solution_tag_solution').on(table.solutionId),
  idxTagName: index('idx_solution_tag_name').on(table.tagName),
  idxTagCategory: index('idx_solution_tag_category').on(table.tagCategory),
}));

export const solutionTagsRelations = relations(solutionTags, ({ one }) => ({
  solution: one(solutions, {
    fields: [solutionTags.solutionId],
    references: [solutions.id],
  }),
}));

// 解决方案项目关联表
export const solutionProjects = pgTable('bus_solution_project', {
  id: serial('id').primaryKey(),
  solutionId: integer('solution_id').references(() => solutions.id).notNull(),
  projectId: integer('project_id').references(() => projects.id).notNull(),
  associationType: varchar('association_type', { length: 50 }).notNull().default('default'), // 关联类型：default, custom
  solutionVersion: varchar('solution_version', { length: 20 }), // 使用的解决方案版本
  usageType: varchar('usage_type', { length: 50 }).notNull(), // 使用类型：reference, implementation, customization
  customizationDetails: text('customization_details'), // 定制化详情
  implementationDate: timestamp('implementation_date'), // 实施日期
  implementationStatus: varchar('implementation_status', { length: 20 }), // planned, in_progress, completed
  implementationNotes: text('implementation_notes'), // 实施备注
  businessValue: text('business_value'), // 业务价值
  userFeedback: text('user_feedback'), // 用户反馈
  successMetrics: jsonb('success_metrics').$type<Array<{ metric: string; targetValue: string; actualValue: string }>>(), // 成功指标
  // ========== V2.1 新增字段 ==========
  subSchemeId: integer('sub_scheme_id').references(() => solutionSubSchemes.id), // 子方案ID（可选）
  usageCount: integer('usage_count').default(1), // 使用次数
  lastUsedAt: timestamp('last_used_at'), // 最后使用时间
  usedByUserId: integer('used_by_user_id').references(() => users.id), // 使用人ID
  notes: text('notes'), // 备注
  // ========== 原有字段 ==========
  solutionSnapshot: jsonb('solution_snapshot').$type<{
    solutionCode: string;
    solutionName: string;
    version: string;
    description: string | null;
    coreFeatures: Array<{ featureName: string; description: string }> | null;
    technicalArchitecture: string | null;
    components: Array<{ name: string; description: string; version: string }> | null;
    industry: string | null;
    scenario: string | null;
    estimatedCost: string | null;
    estimatedDuration: number | null;
    tags: string[] | null;
    attachments: Array<{ name: string; url: string; fileType: string }> | null;
  }>(), // 方案快照：记录关联时的方案完整内容
  sourceType: varchar('source_type', { length: 20 }).default('library'), // 来源类型：library(从库选择)、upload(上传)、create(新建)
  stageBound: varchar('stage_bound', { length: 20 }), // 绑定阶段：opportunity、bidding、execution
  // ========== V2.2 新增字段 ==========
  versionId: integer('version_id').references(() => solutionVersions.id), // 使用的方案版本ID
  contributionConfirmed: boolean('contribution_confirmed').default(false), // 贡献是否已确认
  confirmedAt: timestamp('confirmed_at'), // 确认时间
  confirmedBy: integer('confirmed_by').references(() => users.id), // 确认人
  contributionRatio: decimal('contribution_ratio', { precision: 4, scale: 3 }).default('1.0'), // 贡献比例（0-1）
  estimatedValue: decimal('estimated_value', { precision: 15, scale: 2 }), // 预估价值
  actualValue: decimal('actual_value', { precision: 15, scale: 2 }), // 实际价值
  valueCurrency: varchar('value_currency', { length: 10 }).default('CNY'), // 价值币种
  winContributionScore: decimal('win_contribution_score', { precision: 5, scale: 2 }), // 中标贡献分（0-100）
  feedbackScore: decimal('feedback_score', { precision: 3, scale: 2 }), // 用户反馈评分（1-5）
  feedbackContent: text('feedback_content'), // 用户反馈内容
  // ==============================
  createdBy: integer('created_by').references(() => users.id), // 创建人
  deletedAt: timestamp('deleted_at'), // 软删除时间
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  // 唯一约束：同一解决方案不能重复关联同一项目
  ukSolutionProject: uniqueIndex('uk_solution_project').on(table.solutionId, table.projectId),
  // 性能索引
  idxSolutionId: index('idx_solution_project_solution').on(table.solutionId),
  idxProjectId: index('idx_solution_project_project').on(table.projectId),
  idxImplementationStatus: index('idx_solution_project_status').on(table.implementationStatus),
  idxSolutionProjectStage: index('idx_solution_project_stage').on(table.stageBound),
  idxSolutionProjectVersion: index('idx_solution_project_version').on(table.versionId),
  idxSolutionProjectConfirmed: index('idx_solution_project_confirmed').on(table.contributionConfirmed),
  idxSubSchemeId: index('idx_solution_project_subscheme').on(table.subSchemeId),
}));

export const solutionProjectsRelations = relations(solutionProjects, ({ one }) => ({
  solution: one(solutions, {
    fields: [solutionProjects.solutionId],
    references: [solutions.id],
  }),
  project: one(projects, {
    fields: [solutionProjects.projectId],
    references: [projects.id],
  }),
  subScheme: one(solutionSubSchemes, {
    fields: [solutionProjects.subSchemeId],
    references: [solutionSubSchemes.id],
  }),
  usedByUser: one(users, {
    fields: [solutionProjects.usedByUserId],
    references: [users.id],
  }),
}));

// ============================================
// 解决方案子方案表
// ============================================

// 子方案表 - 一个解决方案可以包含多个子方案
export const solutionSubSchemes = pgTable('bus_solution_sub', {
  id: serial('id').primaryKey(),
  solutionId: integer('solution_id').references(() => solutions.id, { onDelete: 'cascade' }).notNull(), // 父方案ID
  subSchemeCode: varchar('sub_scheme_code', { length: 50 }).notNull(), // 子方案编号
  subSchemeName: varchar('sub_scheme_name', { length: 200 }).notNull(), // 子方案名称
  subSchemeType: varchar('sub_scheme_type', { length: 50 }), // 子方案类型：technical, business, architecture, implementation, other
  parentSubSchemeId: integer('parent_sub_scheme_id').references(() => solutionSubSchemes.id), // 父子方案ID（支持多层嵌套）
  sortOrder: integer('sort_order').notNull().default(0), // 排序
  version: varchar('version', { length: 20 }).default('1.0'), // 版本号
  description: text('description'), // 描述
  content: text('content'), // 方案内容（支持Markdown）
  technicalSpec: text('technical_spec'), // 技术规格
  estimatedCost: decimal('estimated_cost', { precision: 15, scale: 2 }), // 预估成本
  estimatedDuration: integer('estimated_duration'), // 预估工期（天）
  responsibleUserId: integer('responsible_user_id').references(() => users.id), // 负责人ID
  status: varchar('status', { length: 20 }).notNull().default('draft'), // draft, reviewing, approved, deprecated
  tags: jsonb('tags').$type<string[]>(), // 标签
  attachments: jsonb('attachments').$type<Array<{
    id: string;
    name: string;
    url: string;
    fileType: string;
    fileSize: number;
    uploadedAt: string;
    uploadedBy: number;
  }>>(), // 附件列表
  viewCount: integer('view_count').notNull().default(0), // 浏览次数
  downloadCount: integer('download_count').notNull().default(0), // 下载次数
  notes: text('notes'), // 备注
  deletedAt: timestamp('deleted_at'), // 软删除时间
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  idxSolutionId: index('idx_solution_sub_solution').on(table.solutionId),
  idxSubSchemeCode: index('idx_solution_sub_code').on(table.subSchemeCode),
  idxParentSubSchemeId: index('idx_solution_sub_parent').on(table.parentSubSchemeId),
  idxStatus: index('idx_solution_sub_status').on(table.status),
  idxResponsibleUser: index('idx_solution_sub_responsible').on(table.responsibleUserId),
}));

export const solutionSubSchemesRelations = relations(solutionSubSchemes, ({ one, many }) => ({
  solution: one(solutions, {
    fields: [solutionSubSchemes.solutionId],
    references: [solutions.id],
  }),
  parentSubScheme: one(solutionSubSchemes, {
    fields: [solutionSubSchemes.parentSubSchemeId],
    references: [solutionSubSchemes.id],
    relationName: 'subSchemeHierarchy',
  }),
  responsibleUser: one(users, {
    fields: [solutionSubSchemes.responsibleUserId],
    references: [users.id],
  }),
  children: many(solutionSubSchemes, {
    relationName: 'subSchemeHierarchy',
  }),
  files: many(solutionFiles),
}));

// ============================================
// 子方案文件表
// ============================================

// 子方案文件表 - 存储子方案的文件和版本
export const solutionFiles = pgTable('bus_solution_file', {
  id: serial('id').primaryKey(),
  subSchemeId: integer('sub_scheme_id').references(() => solutionSubSchemes.id, { onDelete: 'cascade' }).notNull(), // 子方案ID
  fileName: varchar('file_name', { length: 255 }).notNull(), // 文件名
  fileType: varchar('file_type', { length: 50 }).notNull(), // 文件类型：ppt, word, excel, pdf, image, etc.
  fileSize: bigint('file_size', { mode: 'number' }), // 文件大小（字节）
  fileUrl: varchar('file_url', { length: 500 }), // 文件访问URL
  storageKey: varchar('storage_key', { length: 500 }), // 对象存储key
  fileHash: varchar('file_hash', { length: 64 }), // 文件哈希值（MD5/SHA256）
  version: varchar('version', { length: 20 }).notNull().default('1.0'), // 版本号
  isCurrent: boolean('is_current').notNull().default(true), // 是否当前版本
  uploadedBy: integer('uploaded_by').references(() => users.id), // 上传人ID
  description: text('description'), // 描述
  deletedAt: timestamp('deleted_at'), // 软删除时间
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  idxSubSchemeId: index('idx_solution_file_sub').on(table.subSchemeId),
  idxVersion: index('idx_solution_file_version').on(table.version),
  idxIsCurrent: index('idx_solution_file_current').on(table.isCurrent),
  idxFileHash: index('idx_solution_file_hash').on(table.fileHash),
}));

export const solutionFilesRelations = relations(solutionFiles, ({ one }) => ({
  subScheme: one(solutionSubSchemes, {
    fields: [solutionFiles.subSchemeId],
    references: [solutionSubSchemes.id],
  }),
  uploader: one(users, {
    fields: [solutionFiles.uploadedBy],
    references: [users.id],
  }),
}));

// ============================================
// 子方案引用关系表（项目方案引用基础方案的子方案）
// ============================================

// 子方案引用关系表 - 追踪项目子方案引用基础子方案的关系
export const solutionSubReferences = pgTable('bus_solution_sub_reference', {
  id: serial('id').primaryKey(),
  
  // 项目方信息
  projectSolutionId: integer('project_solution_id').references(() => solutions.id, { onDelete: 'cascade' }).notNull(), // 项目方案ID
  projectSubSchemeId: integer('project_sub_scheme_id').references(() => solutionSubSchemes.id, { onDelete: 'cascade' }).notNull(), // 项目子方案ID
  
  // 基础方信息
  baseSolutionId: integer('base_solution_id').references(() => solutions.id, { onDelete: 'set null' }), // 基础方案ID
  baseSubSchemeId: integer('base_sub_scheme_id').references(() => solutionSubSchemes.id, { onDelete: 'set null' }), // 基础子方案ID
  
  // 引用详情
  referenceType: varchar('reference_type', { length: 20 }).notNull().default('full'), // 引用类型：full(完全引用), partial(部分引用), modified(修改引用)
  contributionWeight: decimal('contribution_weight', { precision: 5, scale: 2 }).notNull().default('1.00'), // 贡献权重（用于计算基础方案的复用贡献）
  referenceNotes: text('reference_notes'), // 引用说明
  
  // 创建人
  createdBy: integer('created_by').references(() => users.id), // 创建人ID
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  idxProjectSolution: index('idx_sub_ref_project_solution').on(table.projectSolutionId),
  idxProjectSubScheme: index('idx_sub_ref_project_sub').on(table.projectSubSchemeId),
  idxBaseSolution: index('idx_sub_ref_base_solution').on(table.baseSolutionId),
  idxBaseSubScheme: index('idx_sub_ref_base_sub').on(table.baseSubSchemeId),
  ukProjectSubRef: uniqueIndex('uk_project_sub_ref').on(table.projectSubSchemeId, table.baseSubSchemeId), // 同一项目子方案引用同一基础子方案只能有一条记录
}));

export const solutionSubReferencesRelations = relations(solutionSubReferences, ({ one }) => ({
  projectSolution: one(solutions, {
    fields: [solutionSubReferences.projectSolutionId],
    references: [solutions.id],
    relationName: 'projectSolutionReferences',
  }),
  projectSubScheme: one(solutionSubSchemes, {
    fields: [solutionSubReferences.projectSubSchemeId],
    references: [solutionSubSchemes.id],
    relationName: 'projectSubSchemeReferences',
  }),
  baseSolution: one(solutions, {
    fields: [solutionSubReferences.baseSolutionId],
    references: [solutions.id],
    relationName: 'baseSolutionReferences',
  }),
  baseSubScheme: one(solutionSubSchemes, {
    fields: [solutionSubReferences.baseSubSchemeId],
    references: [solutionSubSchemes.id],
    relationName: 'baseSubSchemeReferences',
  }),
  creator: one(users, {
    fields: [solutionSubReferences.createdBy],
    references: [users.id],
  }),
}));

// ============================================
// 解决方案团队表
// ============================================

// 方案团队成员表
export const solutionTeams = pgTable('bus_solution_team', {
  id: serial('id').primaryKey(),
  solutionId: integer('solution_id').references(() => solutions.id, { onDelete: 'cascade' }).notNull(), // 方案ID
  userId: integer('user_id').references(() => users.id).notNull(), // 成员ID
  role: varchar('role', { length: 50 }).notNull(), // 团队角色：owner, maintainer, contributor, reviewer, viewer
  permissions: jsonb('permissions').$type<{
    canEdit: boolean;      // 编辑权限
    canDelete: boolean;    // 删除权限
    canApprove: boolean;   // 审批权限
    canInvite: boolean;    // 邀请成员权限
    canUpload: boolean;    // 上传附件权限
    canDownload: boolean;  // 下载权限
  }>(), // 权限配置
  joinedAt: timestamp('joined_at').notNull().defaultNow(), // 加入时间
  invitedBy: integer('invited_by').references(() => users.id), // 邀请人ID
  status: varchar('status', { length: 20 }).notNull().default('active'), // active, inactive, pending
  notes: text('notes'), // 备注
  deletedAt: timestamp('deleted_at'), // 软删除时间
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  // 唯一约束：同一用户不能重复加入同一方案
  ukSolutionTeam: uniqueIndex('uk_solution_team').on(table.solutionId, table.userId),
  idxSolutionId: index('idx_solution_team_solution').on(table.solutionId),
  idxUserId: index('idx_solution_team_user').on(table.userId),
  idxRole: index('idx_solution_team_role').on(table.role),
}));

export const solutionTeamsRelations = relations(solutionTeams, ({ one }) => ({
  solution: one(solutions, {
    fields: [solutionTeams.solutionId],
    references: [solutions.id],
  }),
  user: one(users, {
    fields: [solutionTeams.userId],
    references: [users.id],
  }),
  inviter: one(users, {
    fields: [solutionTeams.invitedBy],
    references: [users.id],
  }),
}));

// ============================================
// 解决方案评审记录表
// ============================================

// 方案评审记录表
export const solutionReviews = pgTable('bus_solution_review', {
  id: serial('id').primaryKey(),
  solutionId: integer('solution_id').references(() => solutions.id, { onDelete: 'cascade' }).notNull(), // 方案ID
  subSchemeId: integer('sub_scheme_id').references(() => solutionSubSchemes.id), // 子方案ID（可选，评审整个方案或某个子方案）
  reviewerId: integer('reviewer_id').references(() => users.id).notNull(), // 评审人ID
  reviewType: varchar('review_type', { length: 50 }).notNull(), // 评审类型：submit, approve, reject, comment, revision
  reviewStatus: varchar('review_status', { length: 20 }).notNull(), // pending, approved, rejected, revision_required
  reviewComment: text('review_comment'), // 评审意见
  reviewScore: integer('review_score'), // 评审分数（1-100）
  reviewCriteria: jsonb('review_criteria').$type<Array<{
    criterion: string;
    score: number;
    comment: string;
  }>>(), // 评审维度评分
  reviewedAt: timestamp('reviewed_at'), // 评审时间
  nextReviewerId: integer('next_reviewer_id').references(() => users.id), // 下一评审人ID
  dueDate: timestamp('due_date'), // 评审截止日期
  isFinal: boolean('is_final').notNull().default(false), // 是否最终评审
  // ========== V2.2 新增字段 ==========
  templateId: integer('template_id').references(() => reviewTemplates.id), // 评审模板ID
  versionId: integer('version_id').references(() => solutionVersions.id), // 评审的方案版本ID
  reviewRound: integer('review_round').default(1), // 评审轮次
  totalScore: decimal('total_score', { precision: 5, scale: 2 }), // 总分（加权前）
  weightedScore: decimal('weighted_score', { precision: 5, scale: 2 }), // 加权得分
  reviewDuration: integer('review_duration'), // 评审耗时（分钟）
  reviewStartAt: timestamp('review_start_at'), // 评审开始时间
  reviewEndAt: timestamp('review_end_at'), // 评审结束时间
  // ==============================
  deletedAt: timestamp('deleted_at'), // 软删除时间
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  idxSolutionId: index('idx_solution_review_solution').on(table.solutionId),
  idxSubSchemeId: index('idx_solution_review_sub').on(table.subSchemeId),
  idxReviewerId: index('idx_solution_review_reviewer').on(table.reviewerId),
  idxReviewStatus: index('idx_solution_review_status').on(table.reviewStatus),
  idxReviewedAt: index('idx_solution_review_date').on(table.reviewedAt),
  idxSolutionReviewTemplate: index('idx_solution_review_template').on(table.templateId),
  idxSolutionReviewVersion: index('idx_solution_review_version').on(table.versionId),
  idxSolutionReviewRound: index('idx_solution_review_round').on(table.reviewRound),
}));

export const solutionReviewsRelations = relations(solutionReviews, ({ one }) => ({
  solution: one(solutions, {
    fields: [solutionReviews.solutionId],
    references: [solutions.id],
  }),
  subScheme: one(solutionSubSchemes, {
    fields: [solutionReviews.subSchemeId],
    references: [solutionSubSchemes.id],
  }),
  reviewer: one(users, {
    fields: [solutionReviews.reviewerId],
    references: [users.id],
  }),
  nextReviewer: one(users, {
    fields: [solutionReviews.nextReviewerId],
    references: [users.id],
  }),
}));

// ============================================
// 解决方案统计记录表
// ============================================

// 方案浏览/下载统计记录表
export const solutionStatistics = pgTable('bus_solution_statistics', {
  id: serial('id').primaryKey(),
  solutionId: integer('solution_id').references(() => solutions.id, { onDelete: 'cascade' }).notNull(), // 方案ID
  subSchemeId: integer('sub_scheme_id').references(() => solutionSubSchemes.id), // 子方案ID（可选）
  userId: integer('user_id').references(() => users.id), // 用户ID
  actionType: varchar('action_type', { length: 20 }).notNull(), // 操作类型：view, download, like, share, rating
  resourceId: integer('resource_id'), // 资源ID（如下载的附件ID）
  resourceName: varchar('resource_name', { length: 255 }), // 资源名称
  ipAddress: varchar('ip_address', { length: 50 }), // IP地址
  userAgent: text('user_agent'), // 用户代理
  extraData: jsonb('extra_data').$type<Record<string, any>>(), // 额外数据
  deletedAt: timestamp('deleted_at'), // 软删除时间
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  idxSolutionId: index('idx_solution_stats_solution').on(table.solutionId),
  idxSubSchemeId: index('idx_solution_stats_sub').on(table.subSchemeId),
  idxUserId: index('idx_solution_stats_user').on(table.userId),
  idxActionType: index('idx_solution_stats_action').on(table.actionType),
  idxCreatedAt: index('idx_solution_stats_created').on(table.createdAt),
}));

export const solutionStatisticsRelations = relations(solutionStatistics, ({ one }) => ({
  solution: one(solutions, {
    fields: [solutionStatistics.solutionId],
    references: [solutions.id],
  }),
  subScheme: one(solutionSubSchemes, {
    fields: [solutionStatistics.subSchemeId],
    references: [solutionSubSchemes.id],
  }),
  user: one(users, {
    fields: [solutionStatistics.userId],
    references: [users.id],
  }),
}));

// ============================================
// 消息中心相关表
// ============================================

// 消息表
export const messages = pgTable('sys_message', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 200 }).notNull(), // 消息标题
  content: text('content').notNull(), // 消息内容
  type: varchar('type', { length: 50 }).notNull().default('notification'), // 消息类型：system, notification, alert, reminder, message
  category: varchar('category', { length: 50 }), // 消息分类：task, project, customer, system
  priority: varchar('priority', { length: 20 }).notNull().default('normal'), // 优先级：low, normal, high, urgent
  senderId: integer('sender_id').references(() => users.id), // 发送人ID
  receiverId: integer('receiver_id').references(() => users.id).notNull(), // 接收人ID
  relatedType: varchar('related_type', { length: 50 }), // 关联类型：project, customer, task, schedule, todo
  relatedId: integer('related_id'), // 关联ID
  relatedName: varchar('related_name', { length: 200 }), // 关联名称
  actionUrl: varchar('action_url', { length: 500 }), // 跳转链接
  actionText: varchar('action_text', { length: 100 }), // 操作按钮文字
  isRead: boolean('is_read').notNull().default(false), // 是否已读
  readAt: timestamp('read_at'), // 阅读时间
  isDeleted: boolean('is_deleted').notNull().default(false), // 是否删除（软删除标记）
  deletedAt: timestamp('deleted_at'), // 删除时间
  metadata: jsonb('metadata').$type<Record<string, any>>(), // 元数据
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  idxReceiver: index('idx_message_receiver').on(table.receiverId),
  idxSender: index('idx_message_sender').on(table.senderId),
  idxType: index('idx_message_type').on(table.type),
  idxCategory: index('idx_message_category').on(table.category),
  idxIsRead: index('idx_message_is_read').on(table.isRead),
  idxCreatedAt: index('idx_message_created_at').on(table.createdAt),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
  }),
  receiver: one(users, {
    fields: [messages.receiverId],
    references: [users.id],
  }),
}));

// ============================================
// 关注记录相关表
// ============================================

// 关注记录表
export const follows = pgTable('sys_follow', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(), // 关注人ID
  targetType: varchar('target_type', { length: 50 }).notNull(), // 关注目标类型：project, customer, opportunity, lead, solution
  targetId: integer('target_id').notNull(), // 关注目标ID
  targetName: varchar('target_name', { length: 200 }), // 关注目标名称（冗余字段）
  followType: varchar('follow_type', { length: 20 }).notNull().default('normal'), // 关注类型：normal, important, starred
  notificationEnabled: boolean('notification_enabled').notNull().default(true), // 是否开启通知
  lastViewAt: timestamp('last_view_at'), // 最后查看时间
  viewCount: integer('view_count').notNull().default(0), // 查看次数
  notes: text('notes'), // 备注
  deletedAt: timestamp('deleted_at'), // 软删除时间
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  // 唯一约束：同一用户不能重复关注同一目标
  ukUserTarget: uniqueIndex('uk_follow_user_target').on(table.userId, table.targetType, table.targetId),
  idxUserId: index('idx_follow_user').on(table.userId),
  idxTargetType: index('idx_follow_target_type').on(table.targetType),
  idxTargetId: index('idx_follow_target_id').on(table.targetId),
}));

export const followsRelations = relations(follows, ({ one }) => ({
  user: one(users, {
    fields: [follows.userId],
    references: [users.id],
  }),
}));

// ============================================
// Token 黑名单表（用于登出时使 Token 失效）
// ============================================

export const tokenBlacklist = pgTable('sys_token_blacklist', {
  id: serial('id').primaryKey(),
  tokenHash: varchar('token_hash', { length: 64 }).notNull().unique(), // Token 的 SHA256 哈希值
  userId: integer('user_id'), // 用户 ID
  expiresAt: timestamp('expires_at').notNull(), // Token 原始过期时间
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  idxTokenHash: index('idx_token_blacklist_hash').on(table.tokenHash),
  idxExpires: index('idx_token_blacklist_expires').on(table.expiresAt),
}));

// ============================================
// V1.3: 项目团队成员表
// ============================================

export const projectMembers = pgTable('bus_project_member', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(), // 项目ID
  userId: integer('user_id').references(() => users.id).notNull(), // 用户ID
  role: varchar('role', { length: 50 }).notNull().default('member'), // 角色：manager(负责人), supervisor(主管), member(成员)
  stage: varchar('stage', { length: 20 }), // V2.2: 所属阶段 planning/bidding/all（项目策划团队/招投标团队/全程）
  joinedAt: timestamp('joined_at').notNull().defaultNow(), // 加入时间
  invitedBy: integer('invited_by').references(() => users.id), // 邀请人
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  idxProjectMemberProject: index('idx_project_member_project').on(table.projectId),
  idxProjectMemberUser: index('idx_project_member_user').on(table.userId),
  ukProjectMember: uniqueIndex('uk_project_member').on(table.projectId, table.userId),
}));

// ============================================
// V2.2: 项目决策人表
// ============================================

export const projectDecisionMakers = pgTable('bus_project_decision_maker', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 50 }).notNull(), // 姓名
  position: varchar('position', { length: 100 }), // 职务
  department: varchar('department', { length: 100 }), // 部门
  attitude: varchar('attitude', { length: 20 }), // 态度: supportive(支持)/neutral(中立)/opposed(反对)/unknown(未知)
  influenceLevel: integer('influence_level'), // 影响力: 1-5
  contactInfo: varchar('contact_info', { length: 100 }), // 联系方式
  notes: text('notes'), // 备注
  deletedAt: timestamp('deleted_at'), // 软删除时间
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  idxDecisionMakerProject: index('idx_decision_maker_project').on(table.projectId),
}));

// ============================================
// V2.2: 项目竞争对手信息表（基本信息）
// ============================================

export const projectCompetitorProfiles = pgTable('bus_project_competitor_profile', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 100 }).notNull(), // 竞争对手名称
  strengths: text('strengths'), // 优势
  weaknesses: text('weaknesses'), // 劣势
  strategy: text('strategy'), // 应对策略
  threatLevel: varchar('threat_level', { length: 20 }), // 威胁等级: high/medium/low
  notes: text('notes'), // 备注
  deletedAt: timestamp('deleted_at'), // 软删除时间
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  idxCompetitorProfileProject: index('idx_competitor_profile_project').on(table.projectId),
}));

// ============================================
// V2.2: 投标工作日志表
// ============================================

export const biddingWorkLogs = pgTable('bus_bidding_work_log', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  logDate: date('log_date').notNull(), // 工作日期
  authorId: integer('author_id').references(() => users.id).notNull(), // 作者
  workType: varchar('work_type', { length: 50 }), // 工作类型: 标书编制/招标分析/现场踏勘/答疑澄清等
  content: text('content').notNull(), // 工作内容
  workHours: decimal('work_hours', { precision: 5, scale: 1 }), // 工时
  attachments: jsonb('attachments').$type<Array<{ name: string; url: string; fileType: string }>>(), // 附件列表
  deletedAt: timestamp('deleted_at'), // 软删除时间
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  idxBiddingLogProject: index('idx_bidding_log_project').on(table.projectId),
  idxBiddingLogDate: index('idx_bidding_log_date').on(table.logDate),
  idxBiddingLogAuthor: index('idx_bidding_log_author').on(table.authorId),
}));

// ============================================
// V2.2: 投标方案表
// ============================================

export const biddingProposals = pgTable('bus_bidding_proposal', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 200 }).notNull(), // 方案名称
  type: varchar('type', { length: 50 }), // 类型: technical(技术标)/commercial(商务标)/qualification(资格标)
  status: varchar('status', { length: 20 }).notNull().default('draft'), // 状态: draft/in_progress/completed/submitted
  progress: integer('progress').default(0), // 完成进度 0-100
  ownerId: integer('owner_id').references(() => users.id), // 负责人
  deadline: date('deadline'), // 截止日期
  content: text('content'), // 内容或链接
  attachments: jsonb('attachments').$type<Array<{ name: string; url: string; fileType: string }>>(), // 附件列表
  notes: text('notes'), // 备注
  deletedAt: timestamp('deleted_at'), // 软删除时间
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  idxBiddingProposalProject: index('idx_bidding_proposal_project').on(table.projectId),
  idxBiddingProposalType: index('idx_bidding_proposal_type').on(table.type),
  idxBiddingProposalStatus: index('idx_bidding_proposal_status').on(table.status),
}));

// ============================================
// V2.0: 数据权限相关表
// ============================================

// 角色数据权限表
export const roleDataPermissions = pgTable('sys_role_data_permission', {
  id: serial('id').primaryKey(),
  roleId: integer('role_id').references(() => roles.id, { onDelete: 'cascade' }).notNull(),
  resource: varchar('resource', { length: 50 }).notNull(), // 资源类型: customer/project/solution/task/opportunity/bidding
  scope: varchar('scope', { length: 20 }).notNull().default('self'), // all/self/role/manage
  allowedFields: jsonb('allowed_fields').$type<string[]>(), // 允许访问的字段
  conditions: jsonb('conditions').$type<Record<string, any>>(), // 额外筛选条件
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  idxRoleDataPermRole: index('idx_role_data_perm_role').on(table.roleId),
  idxRoleDataPermResource: index('idx_role_data_perm_resource').on(table.resource),
  ukRoleDataPerm: uniqueIndex('uk_role_data_perm').on(table.roleId, table.resource),
}));

// 角色数据权限关系
export const roleDataPermissionsRelations = relations(roleDataPermissions, ({ one }) => ({
  role: one(roles, {
    fields: [roleDataPermissions.roleId],
    references: [roles.id],
  }),
}));

// ============================================
// V2.0: 报表中心相关表
// ============================================

// 自定义报表表
export const customReports = pgTable('bus_custom_report', {
  id: serial('id').primaryKey(),
  reportName: varchar('report_name', { length: 100 }).notNull(),
  reportCode: varchar('report_code', { length: 50 }).notNull().unique(),
  description: text('description'),
  dataSource: varchar('data_source', { length: 50 }).notNull(), // customers/projects/solutions/tasks/opportunities/biddings
  config: jsonb('config').$type<{
    fields: string[];
    filters: Array<{ field: string; operator: string; value: any }>;
    groupBy: string[];
    sortBy: Array<{ field: string; order: 'asc' | 'desc' }>;
    chartType: 'table' | 'bar' | 'line' | 'pie' | 'funnel' | 'composite';
    chartConfig?: Record<string, any>;
  }>().notNull(),
  createdBy: integer('created_by').references(() => users.id),
  isPublic: boolean('is_public').default(false),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  idxCustomReportCreator: index('idx_custom_report_creator').on(table.createdBy),
  idxCustomReportStatus: index('idx_custom_report_status').on(table.status),
}));

// 自定义报表关系
export const customReportsRelations = relations(customReports, ({ one }) => ({
  creator: one(users, {
    fields: [customReports.createdBy],
    references: [users.id],
  }),
}));

// 周报记录表
export const weeklyReports = pgTable('bus_weekly_report', {
  id: serial('id').primaryKey(),
  type: varchar('type', { length: 20 }).notNull(), // personal/global
  userId: integer('user_id').references(() => users.id), // 个人周报有值
  weekStart: date('week_start').notNull(),
  weekEnd: date('week_end').notNull(),
  content: jsonb('content').$type<{
    summary: string;
    statistics: {
      newCustomers: number;
      followUpCount: number;
      projectProgress: number;
      taskCompleted: number;
      opportunityCount: number;
      biddingCount: number;
    };
    highlights: string[];
    nextWeekPlan: string[];
    issues: string[];
    supportNeeds: string[];
  }>().notNull(),
  generatedAt: timestamp('generated_at').notNull().defaultNow(),
  sentAt: timestamp('sent_at'),
  sent: boolean('sent').default(false),
}, (table) => ({
  idxWeeklyReportType: index('idx_weekly_report_type').on(table.type),
  idxWeeklyReportUser: index('idx_weekly_report_user').on(table.userId),
  idxWeeklyReportWeek: index('idx_weekly_report_week').on(table.weekStart),
  ukWeeklyReport: uniqueIndex('uk_weekly_report').on(table.type, table.userId, table.weekStart),
}));

// 周报关系
export const weeklyReportsRelations = relations(weeklyReports, ({ one }) => ({
  user: one(users, {
    fields: [weeklyReports.userId],
    references: [users.id],
  }),
}));

// 报表订阅表
export const reportSubscriptions = pgTable('bus_report_subscription', {
  id: serial('id').primaryKey(),
  reportId: integer('report_id').notNull(), // 可以是预定义报表ID或自定义报表ID
  reportType: varchar('report_type', { length: 20 }).notNull(), // predefined/custom/weekly
  userId: integer('user_id').references(() => users.id).notNull(),
  frequency: varchar('frequency', { length: 20 }).notNull(), // daily/weekly/monthly
  dayOfWeek: integer('day_of_week'), // 周几发送 (0-6, 0=周日)
  time: varchar('time', { length: 5 }).notNull(), // HH:mm
  channels: jsonb('channels').$type<string[]>().notNull(), // ['email', 'dingtalk']
  enabled: boolean('enabled').default(true),
  lastSentAt: timestamp('last_sent_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  idxReportSubUser: index('idx_report_sub_user').on(table.userId),
  idxReportSubEnabled: index('idx_report_sub_enabled').on(table.enabled),
}));

// 报表订阅关系
export const reportSubscriptionsRelations = relations(reportSubscriptions, ({ one }) => ({
  user: one(users, {
    fields: [reportSubscriptions.userId],
    references: [users.id],
  }),
}));

// ============================================
// V2.0: 任务管理相关表（已存在于 tasks 表）
// 补充任务类型字典
// ============================================

// 任务关注表（用于任务提醒和通知）
export const taskWatchers = pgTable('bus_task_watcher', {
  id: serial('id').primaryKey(),
  taskId: integer('task_id').references(() => tasks.id, { onDelete: 'cascade' }).notNull(),
  userId: integer('user_id').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  idxTaskWatcherTask: index('idx_task_watcher_task').on(table.taskId),
  idxTaskWatcherUser: index('idx_task_watcher_user').on(table.userId),
  ukTaskWatcher: uniqueIndex('uk_task_watcher').on(table.taskId, table.userId),
}));

// 任务关注关系
export const taskWatchersRelations = relations(taskWatchers, ({ one }) => ({
  task: one(tasks, {
    fields: [taskWatchers.taskId],
    references: [tasks.id],
  }),
  user: one(users, {
    fields: [taskWatchers.userId],
    references: [users.id],
  }),
}));

export const projectMembersRelations = relations(projectMembers, ({ one }) => ({
  project: one(projects, {
    fields: [projectMembers.projectId],
    references: [projects.id],
  }),
  user: one(users, {
    fields: [projectMembers.userId],
    references: [users.id],
  }),
  inviter: one(users, {
    fields: [projectMembers.invitedBy],
    references: [users.id],
  }),
}));

// V2.2: 决策人关系
export const projectDecisionMakersRelations = relations(projectDecisionMakers, ({ one }) => ({
  project: one(projects, {
    fields: [projectDecisionMakers.projectId],
    references: [projects.id],
  }),
}));

// V2.2: 竞争对手信息关系
export const projectCompetitorProfilesRelations = relations(projectCompetitorProfiles, ({ one }) => ({
  project: one(projects, {
    fields: [projectCompetitorProfiles.projectId],
    references: [projects.id],
  }),
}));

// V2.2: 投标工作日志关系
export const biddingWorkLogsRelations = relations(biddingWorkLogs, ({ one }) => ({
  project: one(projects, {
    fields: [biddingWorkLogs.projectId],
    references: [projects.id],
  }),
  author: one(users, {
    fields: [biddingWorkLogs.authorId],
    references: [users.id],
  }),
}));

// V2.2: 投标方案关系
export const biddingProposalsRelations = relations(biddingProposals, ({ one }) => ({
  project: one(projects, {
    fields: [biddingProposals.projectId],
    references: [projects.id],
  }),
  owner: one(users, {
    fields: [biddingProposals.ownerId],
    references: [users.id],
  }),
}));

// ============================================
// V1.3: 项目阶段历史记录表（状态迁移）
// ============================================

export const projectStageHistory = pgTable('bus_project_stage_history', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(), // 项目ID
  fromStage: varchar('from_stage', { length: 50 }), // 原阶段
  toStage: varchar('to_stage', { length: 50 }).notNull(), // 新阶段
  changedBy: integer('changed_by').references(() => users.id).notNull(), // 操作人
  reason: text('reason'), // 变更原因
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  idxStageHistoryProject: index('idx_stage_history_project').on(table.projectId),
  idxStageHistoryChangedBy: index('idx_stage_history_changed_by').on(table.changedBy),
}));

export const projectStageHistoryRelations = relations(projectStageHistory, ({ one }) => ({
  project: one(projects, {
    fields: [projectStageHistory.projectId],
    references: [projects.id],
  }),
  changer: one(users, {
    fields: [projectStageHistory.changedBy],
    references: [users.id],
  }),
}));

// ============================================
// V2.1: 方案模块升级 - 新增表
// ============================================

// 方案使用记录表
export const solutionUsageRecord = pgTable('bus_solution_usage_record', {
  id: serial('id').primaryKey(),
  solutionId: integer('solution_id').references(() => solutions.id, { onDelete: 'cascade' }).notNull(),
  subSchemeId: integer('sub_scheme_id').references(() => solutionSubSchemes.id, { onDelete: 'set null' }),
  projectId: integer('project_id').references(() => projects.id, { onDelete: 'set null' }),
  userId: integer('user_id').references(() => users.id).notNull(),
  usageType: varchar('usage_type', { length: 50 }).notNull(), // reference, implementation, customization, view, download
  usageContext: varchar('usage_context', { length: 100 }), // project_follow, template_copy, direct_view
  region: varchar('region', { length: 100 }),
  notes: text('notes'),
  // ========== V2.2 新增字段 ==========
  versionId: integer('version_id').references(() => solutionVersions.id), // 使用的方案版本
  usageResult: varchar('usage_result', { length: 50 }), // 使用结果：adopted/modified/abandoned
  resultProjectId: integer('result_project_id').references(() => projects.id), // 转化后的项目ID
  conversionDays: integer('conversion_days'), // 从使用到转化的天数
  effectivenessScore: decimal('effectiveness_score', { precision: 3, scale: 2 }), // 有效性评分（1-5）
  effectivenessNotes: text('effectiveness_notes'), // 有效性评价说明
  // ==============================
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  idxUsageSolution: index('idx_solution_usage_solution').on(table.solutionId),
  idxUsageUser: index('idx_solution_usage_user').on(table.userId),
  idxUsageProject: index('idx_solution_usage_project').on(table.projectId),
  idxUsageType: index('idx_solution_usage_type').on(table.usageType),
}));

export const solutionUsageRecordRelations = relations(solutionUsageRecord, ({ one }) => ({
  solution: one(solutions, {
    fields: [solutionUsageRecord.solutionId],
    references: [solutions.id],
  }),
  subScheme: one(solutionSubSchemes, {
    fields: [solutionUsageRecord.subSchemeId],
    references: [solutionSubSchemes.id],
  }),
  project: one(projects, {
    fields: [solutionUsageRecord.projectId],
    references: [projects.id],
  }),
  user: one(users, {
    fields: [solutionUsageRecord.userId],
    references: [users.id],
  }),
}));

// 方案统计汇总表
export const solutionStatsSummary = pgTable('bus_solution_stats_summary', {
  id: serial('id').primaryKey(),
  solutionId: integer('solution_id').references(() => solutions.id, { onDelete: 'cascade' }).notNull().unique(),
  
  // 项目关联统计
  projectCount: integer('project_count').default(0),
  wonProjectCount: integer('won_project_count').default(0),
  lostProjectCount: integer('lost_project_count').default(0),
  
  // 金额统计
  totalEstimatedAmount: decimal('total_estimated_amount', { precision: 15, scale: 2 }).default('0'),
  totalContractAmount: decimal('total_contract_amount', { precision: 15, scale: 2 }).default('0'),
  avgWonRate: decimal('avg_won_rate', { precision: 5, scale: 2 }).default('0'),
  
  // 使用统计
  uniqueUserCount: integer('unique_user_count').default(0),
  templateUsageCount: integer('template_usage_count').default(0),
  
  // 区域统计
  regionStats: jsonb('region_stats').$type<Record<string, number>>().default({}),
  topRegions: jsonb('top_regions').$type<Array<{ region: string; count: number; wonRate?: number }>>().default([]),
  
  // 热门用户
  topUsers: jsonb('top_users').$type<Array<{ userId: number; name: string; count: number }>>().default([]),
  
  // ========== V2.2 新增字段 ==========
  // 版本统计
  versionCount: integer('version_count').default(0),
  latestVersion: varchar('latest_version', { length: 20 }),
  latestVersionAt: timestamp('latest_version_at'),
  
  // 评审统计
  reviewCount: integer('review_count').default(0),
  reviewPassCount: integer('review_pass_count').default(0),
  avgReviewScore: decimal('avg_review_score', { precision: 5, scale: 2 }),
  firstTimePassRate: decimal('first_time_pass_rate', { precision: 5, scale: 2 }),
  
  // 评分统计
  qualityScore: decimal('quality_score', { precision: 5, scale: 2 }),
  businessValueScore: decimal('business_value_score', { precision: 5, scale: 2 }),
  userRecognitionScore: decimal('user_recognition_score', { precision: 5, scale: 2 }),
  activityScore: decimal('activity_score', { precision: 5, scale: 2 }),
  totalScore: decimal('total_score', { precision: 5, scale: 2 }),
  ranking: integer('ranking'),
  
  // 趋势数据
  monthlyTrend: jsonb('monthly_trend'),
  last30dViews: integer('last_30d_views').default(0),
  last30dDownloads: integer('last_30d_downloads').default(0),
  last30dUsage: integer('last_30d_usage').default(0),
  // ==============================
  
  // 时间戳
  lastCalculatedAt: timestamp('last_calculated_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  idxStatsSummarySolution: index('idx_solution_stats_summary_solution').on(table.solutionId),
}));

export const solutionStatsSummaryRelations = relations(solutionStatsSummary, ({ one }) => ({
  solution: one(solutions, {
    fields: [solutionStatsSummary.solutionId],
    references: [solutions.id],
  }),
}));

// 模板方案文件表
export const templateFile = pgTable('bus_template_file', {
  id: serial('id').primaryKey(),
  solutionId: integer('solution_id').references(() => solutions.id, { onDelete: 'cascade' }).notNull(),
  fileName: varchar('file_name', { length: 500 }).notNull(),
  fileType: varchar('file_type', { length: 50 }),
  fileSize: bigint('file_size', { mode: 'number' }),
  fileUrl: text('file_url'),
  version: varchar('version', { length: 20 }).default('1.0'),
  isCurrent: boolean('is_current').default(true),
  description: text('description'),
  uploadedBy: integer('uploaded_by').references(() => users.id),
  downloadCount: integer('download_count').default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  idxTemplateFileSolution: index('idx_template_file_solution').on(table.solutionId),
  idxTemplateFileType: index('idx_template_file_type').on(table.fileType),
}));

export const templateFileRelations = relations(templateFile, ({ one }) => ({
  solution: one(solutions, {
    fields: [templateFile.solutionId],
    references: [solutions.id],
  }),
  uploader: one(users, {
    fields: [templateFile.uploadedBy],
    references: [users.id],
  }),
}));

// ============================================
// 解决方案板块成员表
// ============================================

// 板块成员表 - 管理每个板块的解决方案工程师
export const solutionSectionMembers = pgTable('bus_solution_section_member', {
  id: serial('id').primaryKey(),
  plateId: integer('plate_id').references(() => dictionaryItems.id, { onDelete: 'cascade' }).notNull(), // 板块ID（字典项）
  userId: integer('user_id').references(() => users.id).notNull(), // 工程师ID
  role: varchar('role', { length: 50 }).notNull().default('engineer'), // 角色：leader(负责人), engineer(工程师)
  permissions: jsonb('permissions').$type<{
    canCreate: boolean;      // 创建方案权限
    canEdit: boolean;        // 编辑方案权限
    canDelete: boolean;      // 删除方案权限
    canUpload: boolean;      // 上传文件权限
    canDownload: boolean;    // 下载文件权限
  }>().default({ canCreate: true, canEdit: true, canDelete: false, canUpload: true, canDownload: true }),
  joinedAt: timestamp('joined_at').notNull().defaultNow(), // 加入时间
  status: varchar('status', { length: 20 }).notNull().default('active'), // active, inactive
  createdBy: integer('created_by').references(() => users.id), // 创建人
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  idxSectionMemberPlate: index('idx_section_member_plate').on(table.plateId),
  idxSectionMemberUser: index('idx_section_member_user').on(table.userId),
  ukSectionMember: uniqueIndex('uk_section_member').on(table.plateId, table.userId), // 同一板块同一用户唯一
}));

export const solutionSectionMembersRelations = relations(solutionSectionMembers, ({ one }) => ({
  plate: one(dictionaryItems, {
    fields: [solutionSectionMembers.plateId],
    references: [dictionaryItems.id],
  }),
  user: one(users, {
    fields: [solutionSectionMembers.userId],
    references: [users.id],
  }),
  creator: one(users, {
    fields: [solutionSectionMembers.createdBy],
    references: [users.id],
  }),
}));

// ============================================
// 项目阶段方案引用快照表
// ============================================

// 项目阶段方案引用快照 - 记录项目在某个阶段引用的方案版本快照
export const projectPhaseSolutionReferences = pgTable('bus_project_phase_solution_ref', {
  id: serial('id').primaryKey(),
  
  // 项目信息
  projectId: integer('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  projectPhase: varchar('project_phase', { length: 50 }).notNull(), // 项目阶段：opportunity, planning, bidding, execution, acceptance
  
  // 引用模式
  referenceMode: varchar('reference_mode', { length: 20 }).notNull(), // direct(直接引用基础方案), project_solution(引用项目方案)
  
  // 被引用方案信息（快照）
  referencedSolutionId: integer('referenced_solution_id').references(() => solutions.id, { onDelete: 'set null' }),
  referencedSolutionVersionId: integer('referenced_solution_version_id').references(() => solutionVersions.id, { onDelete: 'set null' }),
  referencedSubSchemeId: integer('referenced_sub_scheme_id').references(() => solutionSubSchemes.id, { onDelete: 'set null' }),
  referencedSubSchemeVersion: varchar('referenced_sub_scheme_version', { length: 20 }), // 子方案版本号
  
  // 快照数据（防止源数据变化）
  snapshotSolutionCode: varchar('snapshot_solution_code', { length: 50 }), // 快照方案编号
  snapshotSolutionName: varchar('snapshot_solution_name', { length: 200 }), // 快照方案名称
  snapshotVersionNo: varchar('snapshot_version_no', { length: 20 }), // 快照版本号
  snapshotSubSchemeType: varchar('snapshot_sub_scheme_type', { length: 50 }), // 快照子方案类型
  snapshotSubSchemeName: varchar('snapshot_sub_scheme_name', { length: 200 }), // 快照子方案名称
  snapshotFileUrl: text('snapshot_file_url'), // 快照文件URL
  snapshotFileKey: varchar('snapshot_file_key', { length: 500 }), // 快照文件存储key
  snapshotData: jsonb('snapshot_data'), // 完整快照数据
  
  // 来源类型
  sourceSolutionType: varchar('source_solution_type', { length: 20 }), // base(基础方案), project(项目方案)
  
  // 引用时间
  referencedAt: timestamp('referenced_at').notNull().defaultNow(),
  referencedBy: integer('referenced_by').references(() => users.id), // 引用人
  
  // 备注
  remark: text('remark'),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  idxPhaseRefProject: index('idx_phase_ref_project').on(table.projectId),
  idxPhaseRefPhase: index('idx_phase_ref_phase').on(table.projectPhase),
  idxPhaseRefSolution: index('idx_phase_ref_solution').on(table.referencedSolutionId),
  idxPhaseRefSubScheme: index('idx_phase_ref_sub_scheme').on(table.referencedSubSchemeId),
}));

export const projectPhaseSolutionReferencesRelations = relations(projectPhaseSolutionReferences, ({ one }) => ({
  project: one(projects, {
    fields: [projectPhaseSolutionReferences.projectId],
    references: [projects.id],
  }),
  referencedSolution: one(solutions, {
    fields: [projectPhaseSolutionReferences.referencedSolutionId],
    references: [solutions.id],
  }),
  referencedSolutionVersion: one(solutionVersions, {
    fields: [projectPhaseSolutionReferences.referencedSolutionVersionId],
    references: [solutionVersions.id],
  }),
  referencedSubScheme: one(solutionSubSchemes, {
    fields: [projectPhaseSolutionReferences.referencedSubSchemeId],
    references: [solutionSubSchemes.id],
  }),
  referencer: one(users, {
    fields: [projectPhaseSolutionReferences.referencedBy],
    references: [users.id],
  }),
}));

// ============================================
// 合同管理相关表
// ============================================

// 合同主表
export const contracts = pgTable('bus_contract', {
  id: serial('id').primaryKey(),
  
  // 合同基本信息
  contractCode: varchar('contract_code', { length: 50 }).notNull().unique(),
  contractName: varchar('contract_name', { length: 200 }).notNull(),
  contractScanName: varchar('contract_scan_name', { length: 200 }),
  contractStatus: varchar('contract_status', { length: 20 }).notNull().default('draft'),
  processStatus: varchar('process_status', { length: 20 }).default('pending'),
  
  // 签约方信息
  signMode: varchar('sign_mode', { length: 10 }).notNull(),
  signerUnit: varchar('signer_unit', { length: 200 }),
  userUnit: varchar('user_unit', { length: 200 }),
  userUnitId: integer('user_unit_id').references(() => customers.id),
  
  // 关联信息
  projectId: integer('project_id').references(() => projects.id),
  projectCode: varchar('project_code', { length: 50 }),
  customerId: integer('customer_id').references(() => customers.id),
  department: varchar('department', { length: 100 }),
  
  // 金额信息
  contractAmount: decimal('contract_amount', { precision: 15, scale: 2 }).notNull(),
  warrantyAmount: decimal('warranty_amount', { precision: 15, scale: 2 }),
  
  // 时间信息
  signDate: date('sign_date'),
  warrantyYears: integer('warranty_years'),
  requireCompleteDate: date('require_complete_date'),
  acceptanceDate: date('acceptance_date'),
  entryDate: date('entry_date'),
  
  // 签订人
  signerId: integer('signer_id').references(() => users.id),
  signerName: varchar('signer_name', { length: 50 }),
  
  // 分类信息
  userType: varchar('user_type', { length: 50 }),
  projectCategory: varchar('project_category', { length: 50 }),
  fundSource: varchar('fund_source', { length: 50 }),
  bank: varchar('bank', { length: 100 }),
  
  // 标记
  isNewCustomer: boolean('is_new_customer').default(false),
  
  // 地址备注
  projectAddress: text('project_address'),
  remark: text('remark'),
  
  // 附件
  attachments: jsonb('attachments').$type<Array<{
    name: string;
    url: string;
    uploadDate: string;
    size?: number;
    type?: string;
  }>>(),
  bidNoticeFile: jsonb('bid_notice_file').$type<{
    name: string;
    url: string;
    uploadDate: string;
  }>(),
  acceptanceFile: jsonb('acceptance_file').$type<{
    name: string;
    url: string;
    uploadDate: string;
  }>(),
  
  // 系统字段
  createdBy: integer('created_by').references(() => users.id),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  idxContractCode: index('idx_contract_code').on(table.contractCode),
  idxContractProject: index('idx_contract_project').on(table.projectId),
  idxContractCustomer: index('idx_contract_customer').on(table.customerId),
  idxContractStatus: index('idx_contract_status').on(table.contractStatus),
  idxContractProcessStatus: index('idx_contract_process_status').on(table.processStatus),
  idxContractSignDate: index('idx_contract_sign_date').on(table.signDate),
}));

export const contractsRelations = relations(contracts, ({ one, many }) => ({
  project: one(projects, {
    fields: [contracts.projectId],
    references: [projects.id],
  }),
  customer: one(customers, {
    fields: [contracts.customerId],
    references: [customers.id],
  }),
  userUnit: one(customers, {
    fields: [contracts.userUnitId],
    references: [customers.id],
  }),
  signer: one(users, {
    fields: [contracts.signerId],
    references: [users.id],
  }),
  creator: one(users, {
    fields: [contracts.createdBy],
    references: [users.id],
  }),
  bids: many(contractBids),
  acceptances: many(contractAcceptances),
  items: many(contractItems),
}));

// 中标信息表
export const contractBids = pgTable('bus_contract_bid', {
  id: serial('id').primaryKey(),
  contractId: integer('contract_id').references(() => contracts.id, { onDelete: 'cascade' }),
  contractCode: varchar('contract_code', { length: 50 }),
  bidCode: varchar('bid_code', { length: 50 }),
  projectName: varchar('project_name', { length: 200 }),
  bidAmount: decimal('bid_amount', { precision: 15, scale: 2 }),
  bidDate: date('bid_date'),
  department: varchar('department', { length: 100 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  idxContractBidContract: index('idx_contract_bid_contract').on(table.contractId),
  idxContractBidCode: index('idx_contract_bid_code').on(table.bidCode),
}));

export const contractBidsRelations = relations(contractBids, ({ one }) => ({
  contract: one(contracts, {
    fields: [contractBids.contractId],
    references: [contracts.id],
  }),
}));

// 验收报告表
export const contractAcceptances = pgTable('bus_contract_acceptance', {
  id: serial('id').primaryKey(),
  contractId: integer('contract_id').references(() => contracts.id, { onDelete: 'cascade' }),
  contractCode: varchar('contract_code', { length: 50 }),
  contractName: varchar('contract_name', { length: 200 }),
  contractAmount: decimal('contract_amount', { precision: 15, scale: 2 }),
  acceptanceCode: varchar('acceptance_code', { length: 50 }),
  department: varchar('department', { length: 100 }),
  acceptanceDate: date('acceptance_date'),
  archiveDate: date('archive_date'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  idxContractAcceptanceContract: index('idx_contract_acceptance_contract').on(table.contractId),
  idxContractAcceptanceCode: index('idx_contract_acceptance_code').on(table.acceptanceCode),
}));

export const contractAcceptancesRelations = relations(contractAcceptances, ({ one }) => ({
  contract: one(contracts, {
    fields: [contractAcceptances.contractId],
    references: [contracts.id],
  }),
}));

// 合同清单表
export const contractItems = pgTable('bus_contract_item', {
  id: serial('id').primaryKey(),
  contractId: integer('contract_id').references(() => contracts.id, { onDelete: 'cascade' }),
  contractCode: varchar('contract_code', { length: 50 }),
  projectCode: varchar('project_code', { length: 50 }),
  signerUnit: varchar('signer_unit', { length: 200 }),
  userUnit: varchar('user_unit', { length: 200 }),
  projectName: varchar('project_name', { length: 200 }),
  contractAmount: decimal('contract_amount', { precision: 15, scale: 2 }),
  productName: varchar('product_name', { length: 200 }).notNull(),
  productModel: varchar('product_model', { length: 100 }),
  unit: varchar('unit', { length: 20 }),
  quantity: decimal('quantity', { precision: 10, scale: 2 }).notNull(),
  unitPrice: decimal('unit_price', { precision: 15, scale: 2 }),
  amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
  totalAmount: decimal('total_amount', { precision: 15, scale: 2 }),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  idxContractItemContract: index('idx_contract_item_contract').on(table.contractId),
  idxContractItemProduct: index('idx_contract_item_product').on(table.productName),
}));

export const contractItemsRelations = relations(contractItems, ({ one }) => ({
  contract: one(contracts, {
    fields: [contractItems.contractId],
    references: [contracts.id],
  }),
}));

// 签约模式配置表
export const signModes = pgTable('sys_sign_mode', {
  id: serial('id').primaryKey(),
  modeCode: varchar('mode_code', { length: 10 }).notNull().unique(),
  modeName: varchar('mode_name', { length: 100 }).notNull(),
  description: text('description'),
  partyARole: varchar('party_a_role', { length: 50 }),
  partyBRole: varchar('party_b_role', { length: 50 }),
  partyCRole: varchar('party_c_role', { length: 50 }),
  partyBuyerRole: varchar('party_buyer_role', { length: 50 }),
  partySellerRole: varchar('party_seller_role', { length: 50 }),
  status: varchar('status', { length: 20 }).default('active'),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ============================================
// V2.0: 项目预算历史表
// ============================================
export const projectBudgetHistory = pgTable('bus_project_budget_history', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').references(() => projects.id).notNull(),
  oldAmount: decimal('old_amount', { precision: 15, scale: 2 }), // 原金额（首次为null）
  newAmount: decimal('new_amount', { precision: 15, scale: 2 }).notNull(), // 新金额
  changeReason: text('change_reason'), // 变动理由（首次可为空）
  isFirstEntry: boolean('is_first_entry').default(false), // 是否首次填写
  changedBy: integer('changed_by').references(() => users.id), // 变动人
  changedByName: varchar('changed_by_name', { length: 50 }), // 变动人姓名
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  idxProjectId: index('idx_budget_history_project').on(table.projectId),
  idxCreatedAt: index('idx_budget_history_created').on(table.createdAt),
}));

export const projectBudgetHistoryRelations = relations(projectBudgetHistory, ({ one }) => ({
  project: one(projects, {
    fields: [projectBudgetHistory.projectId],
    references: [projects.id],
  }),
  changedByUser: one(users, {
    fields: [projectBudgetHistory.changedBy],
    references: [users.id],
  }),
}));

// ============================================
// V2.0: 项目日期变更历史表
// ============================================
export const projectDateChangeHistory = pgTable('bus_project_date_change_history', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').references(() => projects.id).notNull(),
  dateType: varchar('date_type', { length: 50 }).notNull(), // 日期类型：expected_bidding_date, expected_close_date 等
  dateTypeName: varchar('date_type_name', { length: 100 }), // 日期类型名称
  oldDate: date('old_date'), // 原日期
  newDate: date('new_date').notNull(), // 新日期
  changeReason: text('change_reason').notNull(), // 变更理由
  changedBy: integer('changed_by').references(() => users.id), // 变更人
  changedByName: varchar('changed_by_name', { length: 50 }), // 变更人姓名
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  idxProjectId: index('idx_date_change_project').on(table.projectId),
  idxDateType: index('idx_date_change_type').on(table.dateType),
  idxCreatedAt: index('idx_date_change_created').on(table.createdAt),
}));

export const projectDateChangeHistoryRelations = relations(projectDateChangeHistory, ({ one }) => ({
  project: one(projects, {
    fields: [projectDateChangeHistory.projectId],
    references: [projects.id],
  }),
  changedByUser: one(users, {
    fields: [projectDateChangeHistory.changedBy],
    references: [users.id],
  }),
}));

// ============================================
// V2.0: 项目竞争对手分析表
// ============================================
export const projectCompetitors = pgTable('bus_project_competitor', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').references(() => projects.id).notNull(),
  competitorName: varchar('competitor_name', { length: 200 }).notNull(), // 竞争对手名称
  analysisType: varchar('analysis_type', { length: 20 }).notNull(), // 分析类型：advantage(我方优势), disadvantage(我方劣势), competitor_advantage(对手优势), competitor_disadvantage(对手劣势)
  content: text('content').notNull(), // 分析内容
  sortOrder: integer('sort_order').default(0), // 排序
  createdBy: integer('created_by').references(() => users.id),
  createdByName: varchar('created_by_name', { length: 50 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  idxProjectId: index('idx_competitor_project').on(table.projectId),
  idxAnalysisType: index('idx_competitor_type').on(table.analysisType),
}));

export const projectCompetitorsRelations = relations(projectCompetitors, ({ one }) => ({
  project: one(projects, {
    fields: [projectCompetitors.projectId],
    references: [projects.id],
  }),
  createdByUser: one(users, {
    fields: [projectCompetitors.createdBy],
    references: [users.id],
  }),
}));

// ============================================
// V2.0: 项目风险评估表
// ============================================
export const projectRisks = pgTable('bus_project_risk', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').references(() => projects.id).notNull(),
  riskDescription: text('risk_description').notNull(), // 风险描述
  riskLevel: varchar('risk_level', { length: 20 }).notNull(), // 风险等级：low, medium, high, critical
  riskSource: varchar('risk_source', { length: 50 }), // 风险来源：manual(手动添加), alert(预警自动生成)
  alertId: integer('alert_id'), // 关联预警ID（如果是预警自动生成）
  status: varchar('status', { length: 20 }).default('active'), // active, resolved, closed
  resolution: text('resolution'), // 解决方案
  resolvedBy: integer('resolved_by').references(() => users.id), // 解决人
  resolvedAt: timestamp('resolved_at'), // 解决时间
  createdBy: integer('created_by').references(() => users.id),
  createdByName: varchar('created_by_name', { length: 50 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  idxProjectId: index('idx_risk_project').on(table.projectId),
  idxRiskLevel: index('idx_risk_level').on(table.riskLevel),
  idxStatus: index('idx_risk_status').on(table.status),
  idxRiskSource: index('idx_risk_source').on(table.riskSource),
}));

export const projectRisksRelations = relations(projectRisks, ({ one }) => ({
  project: one(projects, {
    fields: [projectRisks.projectId],
    references: [projects.id],
  }),
  createdByUser: one(users, {
    fields: [projectRisks.createdBy],
    references: [users.id],
  }),
  resolvedByUser: one(users, {
    fields: [projectRisks.resolvedBy],
    references: [users.id],
  }),
}));

// ============================================
// V2.0: 项目行动日志表
// ============================================
export const projectActionLogs = pgTable('bus_project_action_log', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').references(() => projects.id).notNull(),
  actionContent: text('action_content').notNull(), // 行动内容
  actionDate: date('action_date'), // 计划行动日期
  status: varchar('status', { length: 20 }).default('pending'), // pending, completed, cancelled
  completedAt: timestamp('completed_at'), // 完成时间
  completedBy: integer('completed_by').references(() => users.id), // 完成人
  completedByName: varchar('completed_by_name', { length: 50 }),
  reminderSet: boolean('reminder_set').default(false), // 是否设置提醒
  reminderTime: timestamp('reminder_time'), // 提醒时间
  createdBy: integer('created_by').references(() => users.id),
  createdByName: varchar('created_by_name', { length: 50 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  idxProjectId: index('idx_action_log_project').on(table.projectId),
  idxStatus: index('idx_action_log_status').on(table.status),
  idxActionDate: index('idx_action_log_date').on(table.actionDate),
}));

export const projectActionLogsRelations = relations(projectActionLogs, ({ one }) => ({
  project: one(projects, {
    fields: [projectActionLogs.projectId],
    references: [projects.id],
  }),
  createdByUser: one(users, {
    fields: [projectActionLogs.createdBy],
    references: [users.id],
  }),
  completedByUser: one(users, {
    fields: [projectActionLogs.completedBy],
    references: [users.id],
  }),
}));

// ============================================
// V2.0: 项目需求方案文件表
// ============================================
export const projectRequirementFiles = pgTable('bus_project_requirement_file', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').references(() => projects.id).notNull(),
  fileName: varchar('file_name', { length: 255 }).notNull(), // 文件名
  fileUrl: varchar('file_url', { length: 500 }).notNull(), // 文件URL
  fileSize: integer('file_size'), // 文件大小（字节）
  fileType: varchar('file_type', { length: 50 }), // 文件类型
  aiAnalysisResult: jsonb('ai_analysis_result').$type<Array<{ 
    title: string; 
    content: string;
  }>>(), // AI分析结果
  aiAnalysisAt: timestamp('ai_analysis_at'), // AI分析时间
  uploadedBy: integer('uploaded_by').references(() => users.id),
  uploadedByName: varchar('uploaded_by_name', { length: 50 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  idxProjectId: index('idx_requirement_file_project').on(table.projectId),
  idxCreatedAt: index('idx_requirement_file_created').on(table.createdAt),
}));

export const projectRequirementFilesRelations = relations(projectRequirementFiles, ({ one }) => ({
  project: one(projects, {
    fields: [projectRequirementFiles.projectId],
    references: [projects.id],
  }),
  uploadedByUser: one(users, {
    fields: [projectRequirementFiles.uploadedBy],
    references: [users.id],
  }),
}));

// ============================================
// V2.2: 解决方案升级 - 评审模板表
// ============================================
export const reviewTemplates = pgTable('bus_review_template', {
  id: serial('id').primaryKey(),
  templateCode: varchar('template_code', { length: 50 }).notNull().unique(),
  templateName: varchar('template_name', { length: 200 }).notNull(),
  templateType: varchar('template_type', { length: 50 }).notNull(), // solution/sub_scheme
  subSchemeType: varchar('sub_scheme_type', { length: 50 }), // technical/business/implementation/architecture
  description: text('description'),
  
  // 评审维度配置（JSON数组）
  criteriaConfig: jsonb('criteria_config').notNull(),
  
  // 适用范围
  applicableIndustries: jsonb('applicable_industries').$type<string[]>(),
  applicableScenarios: jsonb('applicable_scenarios').$type<string[]>(),
  
  // 评审流程配置
  reviewLevels: integer('review_levels').default(1),
  passScore: decimal('pass_score', { precision: 5, scale: 2 }).default('60'),
  
  // 状态
  isActive: boolean('is_active').default(true),
  isDefault: boolean('is_default').default(false),
  
  // 审计字段
  createdBy: integer('created_by').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
}, (table) => ({
  idxReviewTemplateType: index('idx_review_template_type').on(table.templateType),
  idxReviewTemplateActive: index('idx_review_template_active').on(table.isActive),
}));

export const reviewTemplatesRelations = relations(reviewTemplates, ({ one }) => ({
  creator: one(users, {
    fields: [reviewTemplates.createdBy],
    references: [users.id],
  }),
}));

// ============================================
// V2.2: 解决方案升级 - 评审详情表
// ============================================
export const reviewDetails = pgTable('bus_review_detail', {
  id: serial('id').primaryKey(),
  reviewId: integer('review_id').references(() => solutionReviews.id, { onDelete: 'cascade' }).notNull(),
  
  // 维度信息
  criterionCode: varchar('criterion_code', { length: 50 }).notNull(),
  criterionName: varchar('criterion_name', { length: 100 }).notNull(),
  criterionWeight: decimal('criterion_weight', { precision: 5, scale: 4 }).notNull(),
  parentCode: varchar('parent_code', { length: 50 }),
  
  // 评分
  score: integer('score').notNull(), // 原始分数(1-10或1-100)
  weightedScore: decimal('weighted_score', { precision: 5, scale: 2 }),
  
  // 评价
  comment: text('comment'),
  evidence: text('evidence'),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  idxReviewDetailReview: index('idx_review_detail_review').on(table.reviewId),
  idxReviewDetailCriterion: index('idx_review_detail_criterion').on(table.criterionCode),
  ukReviewDetailCriterion: uniqueIndex('uk_review_detail_criterion').on(table.reviewId, table.criterionCode),
}));

export const reviewDetailsRelations = relations(reviewDetails, ({ one }) => ({
  review: one(solutionReviews, {
    fields: [reviewDetails.reviewId],
    references: [solutionReviews.id],
  }),
}));

// ============================================
// V2.2: 解决方案升级 - 方案评分表
// ============================================
export const solutionScores = pgTable('bus_solution_score', {
  id: serial('id').primaryKey(),
  solutionId: integer('solution_id').references(() => solutions.id).notNull().unique(),
  
  // 各维度评分
  qualityScore: decimal('quality_score', { precision: 5, scale: 2 }).default('0'),
  businessValueScore: decimal('business_value_score', { precision: 5, scale: 2 }).default('0'),
  userRecognitionScore: decimal('user_recognition_score', { precision: 5, scale: 2 }).default('0'),
  activityScore: decimal('activity_score', { precision: 5, scale: 2 }).default('0'),
  
  // 综合评分
  totalScore: decimal('total_score', { precision: 5, scale: 2 }).default('0'),
  ranking: integer('ranking'),
  
  // 评分详情
  scoreDetails: jsonb('score_details'),
  
  // 计算时间
  calculatedAt: timestamp('calculated_at'),
  calculationDuration: integer('calculation_duration'),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  idxSolutionScoreTotal: index('idx_solution_score_total').on(table.totalScore),
  idxSolutionScoreQuality: index('idx_solution_score_quality').on(table.qualityScore),
  idxSolutionScoreBusiness: index('idx_solution_score_business').on(table.businessValueScore),
  idxSolutionScoreRanking: index('idx_solution_score_ranking').on(table.ranking),
}));

export const solutionScoresRelations = relations(solutionScores, ({ one }) => ({
  solution: one(solutions, {
    fields: [solutionScores.solutionId],
    references: [solutions.id],
  }),
}));

// ============================================
// V2.2: 解决方案升级 - 评分历史表
// ============================================
export const solutionScoreHistory = pgTable('bus_solution_score_history', {
  id: serial('id').primaryKey(),
  solutionId: integer('solution_id').references(() => solutions.id).notNull(),
  
  // 快照时间
  snapshotDate: date('snapshot_date').notNull(),
  snapshotType: varchar('snapshot_type', { length: 20 }).notNull(), // daily/weekly/monthly
  
  // 各维度评分
  qualityScore: decimal('quality_score', { precision: 5, scale: 2 }),
  businessValueScore: decimal('business_value_score', { precision: 5, scale: 2 }),
  userRecognitionScore: decimal('user_recognition_score', { precision: 5, scale: 2 }),
  activityScore: decimal('activity_score', { precision: 5, scale: 2 }),
  totalScore: decimal('total_score', { precision: 5, scale: 2 }),
  
  // 排名
  ranking: integer('ranking'),
  
  // 评分详情快照
  scoreDetails: jsonb('score_details'),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  idxScoreHistorySolution: index('idx_score_history_solution').on(table.solutionId),
  idxScoreHistoryDate: index('idx_score_history_date').on(table.snapshotDate),
  idxScoreHistoryType: index('idx_score_history_type').on(table.snapshotType),
  ukScoreHistory: uniqueIndex('uk_score_history').on(table.solutionId, table.snapshotDate, table.snapshotType),
}));

export const solutionScoreHistoryRelations = relations(solutionScoreHistory, ({ one }) => ({
  solution: one(solutions, {
    fields: [solutionScoreHistory.solutionId],
    references: [solutions.id],
  }),
}));

// ============================================
// V2.2: 解决方案升级 - 评分配置表
// ============================================
export const scoreConfigs = pgTable('bus_score_config', {
  id: serial('id').primaryKey(),
  configCode: varchar('config_code', { length: 50 }).notNull().unique(),
  configName: varchar('config_name', { length: 100 }).notNull(),
  description: text('description'),
  
  // 维度权重配置
  dimensionWeights: jsonb('dimension_weights').notNull(),
  
  // 细分指标权重配置
  indicatorWeights: jsonb('indicator_weights'),
  
  // 归一化参数
  normalizationParams: jsonb('normalization_params'),
  
  // 状态
  isActive: boolean('is_active').default(true),
  isDefault: boolean('is_default').default(false),
  
  createdBy: integer('created_by').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  idxScoreConfigActive: index('idx_score_config_active').on(table.isActive),
}));

export const scoreConfigsRelations = relations(scoreConfigs, ({ one }) => ({
  creator: one(users, {
    fields: [scoreConfigs.createdBy],
    references: [users.id],
  }),
}));

// ============================================
// V2.3: 大文件分片上传 - 上传任务表
// ============================================
export const uploadTasks = pgTable('bus_upload_task', {
  id: serial('id').primaryKey(),
  
  // 上传标识
  uploadId: varchar('upload_id', { length: 64 }).notNull().unique(), // 唯一上传ID
  fileHash: varchar('file_hash', { length: 64 }).notNull(), // 文件hash，用于断点续传
  
  // 文件信息
  fileName: varchar('file_name', { length: 500 }).notNull(),
  fileSize: bigint('file_size', { mode: 'number' }).notNull(),
  contentType: varchar('content_type', { length: 100 }),
  totalChunks: integer('total_chunks').notNull(),
  chunkSize: integer('chunk_size').notNull(), // 每个分片大小(bytes)
  
  // 上传状态
  status: varchar('status', { length: 20 }).notNull().default('pending'), // pending, uploading, completed, failed, expired
  uploadedChunks: jsonb('uploaded_chunks').$type<number[]>().default([]), // 已上传的分片索引列表
  
  // 存储信息
  targetPath: varchar('target_path', { length: 500 }), // 目标存储路径
  finalKey: varchar('final_key', { length: 500 }), // 合并后的文件key
  
  // 业务关联
  solutionId: integer('solution_id'), // 关联的解决方案ID
  subSchemeId: integer('sub_scheme_id'), // 关联的子方案ID
  
  // 元数据
  metadata: jsonb('metadata'), // 其他元数据
  
  // 用户信息
  createdBy: integer('created_by').references(() => users.id).notNull(),
  
  // 时间戳
  expiresAt: timestamp('expires_at'), // 过期时间（用于清理未完成的任务）
  completedAt: timestamp('completed_at'), // 完成时间
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  idxUploadId: index('idx_upload_task_upload_id').on(table.uploadId),
  idxFileHash: index('idx_upload_task_file_hash').on(table.fileHash),
  idxStatus: index('idx_upload_task_status').on(table.status),
  idxCreatedBy: index('idx_upload_task_created_by').on(table.createdBy),
  idxExpiresAt: index('idx_upload_task_expires_at').on(table.expiresAt),
}));

export const uploadTasksRelations = relations(uploadTasks, ({ one }) => ({
  creator: one(users, {
    fields: [uploadTasks.createdBy],
    references: [users.id],
  }),
}));

// ============================================
// 类型导出
// ============================================
export type UploadTask = typeof uploadTasks.$inferSelect;
export type NewUploadTask = typeof uploadTasks.$inferInsert;


// ============================================
// V3.0: 项目标签表（用于二级/三级项目类型）
// ============================================

// 项目标签表
export const projectTags = pgTable('bus_project_tag', {
  id: serial('id').primaryKey(),
  tagName: varchar('tag_name', { length: 100 }).notNull(),
  tagType: varchar('tag_type', { length: 20 }).notNull(), // secondary/tertiary
  parentId: integer('parent_id').references((): any => projectTags.id),
  sortOrder: integer('sort_order').default(0),
  status: varchar('status', { length: 20 }).default('active'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  idxTagName: index('idx_project_tag_name').on(table.tagName),
  idxTagType: index('idx_project_tag_type').on(table.tagType),
}));

// 项目-标签关联表
export const projectTagRelations = pgTable('bus_project_tag_relation', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  tagId: integer('tag_id').references(() => projectTags.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  idxRelationProject: index('idx_project_tag_relation_project').on(table.projectId),
  idxRelationTag: index('idx_project_tag_relation_tag').on(table.tagId),
  ukProjectTag: uniqueIndex('uk_project_tag').on(table.projectId, table.tagId),
}));

// 项目标签关系
export const projectTagsRelations = relations(projectTags, ({ one, many }) => ({
  parent: one(projectTags, {
    fields: [projectTags.parentId],
    references: [projectTags.id],
  }),
  children: many(projectTags),
  projects: many(projectTagRelations),
}));

export const projectTagRelationsRelations = relations(projectTagRelations, ({ one }) => ({
  project: one(projects, {
    fields: [projectTagRelations.projectId],
    references: [projects.id],
  }),
  tag: one(projectTags, {
    fields: [projectTagRelations.tagId],
    references: [projectTags.id],
  }),
}));

// 类型导出
export type ProjectTag = typeof projectTags.$inferSelect;
export type NewProjectTag = typeof projectTags.$inferInsert;
export type ProjectTagRelation = typeof projectTagRelations.$inferSelect;
export type NewProjectTagRelation = typeof projectTagRelations.$inferInsert;
