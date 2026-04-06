import { pgTable, serial, text, timestamp, varchar, integer, decimal, jsonb, date, index, boolean, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { projects, users, projectPresalesRecords } from './schema';

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
// V2.1: 售前服务参与人表（多人协作）
// ============================================
export const presalesRecordParticipants = pgTable('bus_presales_record_participant', {
  id: serial('id').primaryKey(),
  presalesRecordId: integer('presales_record_id').references(() => projectPresalesRecords.id, { onDelete: 'cascade' }).notNull(), // 服务记录ID
  userId: integer('user_id').references(() => users.id).notNull(), // 参与人员ID
  contributionPct: decimal('contribution_pct', { precision: 5, scale: 2 }).notNull().default('100.00'), // 贡献百分比：0.00 - 100.00
  workHours: decimal('work_hours', { precision: 10, scale: 2 }), // 个人投入工时
  role: varchar('role', { length: 50 }), // 参与角色：primary_contributor(主要贡献者), assistant(协助者), reviewer(审核者)
  remarks: text('remarks'), // 备注
  createdBy: integer('created_by').references(() => users.id), // 创建人
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  idxParticipantRecord: index('idx_participant_record').on(table.presalesRecordId),
  idxParticipantUser: index('idx_participant_user').on(table.userId),
  ukPresalesParticipant: uniqueIndex('uk_presales_participant').on(table.presalesRecordId, table.userId), // 一条服务记录中，一个人员只能有一条参与记录
}));

export const presalesRecordParticipantsRelations = relations(presalesRecordParticipants, ({ one }) => ({
  presalesRecord: one(projectPresalesRecords, {
    fields: [presalesRecordParticipants.presalesRecordId],
    references: [projectPresalesRecords.id],
  }),
  user: one(users, {
    fields: [presalesRecordParticipants.userId],
    references: [users.id],
  }),
  createdByUser: one(users, {
    fields: [presalesRecordParticipants.createdBy],
    references: [users.id],
  }),
}));
