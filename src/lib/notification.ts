/**
 * 消息通知系统
 * 支持站内消息和邮件通知
 */

import { db } from '@/db';
import { sql } from 'drizzle-orm';

// =====================================================
// 类型定义
// =====================================================

export type NotificationType = 
  | 'system'      // 系统通知
  | 'task'        // 任务通知
  | 'alert'       // 预警通知
  | 'approval'    // 审批通知
  | 'mention'     // @提及
  | 'message';    // 私信

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface Notification {
  id: number;
  userId: number;
  type: NotificationType;
  title: string;
  content: string;
  priority: NotificationPriority;
  isRead: boolean;
  readAt: Date | null;
  link: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

export interface CreateNotificationInput {
  userId: number | number[];  // 支持批量发送
  type: NotificationType;
  title: string;
  content: string;
  priority?: NotificationPriority;
  link?: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationStats {
  total: number;
  unread: number;
  byType: Record<NotificationType, number>;
  byPriority: Record<NotificationPriority, number>;
}

// =====================================================
// 通知数据库操作
// =====================================================

/**
 * 创建通知表SQL
 */
export const CREATE_NOTIFICATIONS_TABLE = `
CREATE TABLE IF NOT EXISTS sys_notification (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES sys_user(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL DEFAULT 'system',
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  priority VARCHAR(20) NOT NULL DEFAULT 'normal',
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMP,
  link VARCHAR(500),
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_user ON sys_notification(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_unread ON sys_notification(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notification_type ON sys_notification(type);
CREATE INDEX IF NOT EXISTS idx_notification_created ON sys_notification(created_at DESC);
`;

/**
 * 发送通知
 */
export async function sendNotification(
  input: CreateNotificationInput
): Promise<Notification[]> {
  const userIds = Array.isArray(input.userId) ? input.userId : [input.userId];
  const notifications: Notification[] = [];

  for (const userId of userIds) {
    const result = await db.execute(sql`
      INSERT INTO sys_notification (
        user_id, type, title, content, priority, link, metadata
      ) VALUES (
        ${userId}, ${input.type}, ${input.title}, ${input.content}, 
        ${input.priority || 'normal'}, ${input.link || null}, ${JSON.stringify(input.metadata) || null}
      ) RETURNING *
    `);

    // Drizzle ORM execute 返回的是 RowList，直接迭代访问行数据
    const rows = Array.from(result);
    if (rows[0]) {
      const row = rows[0] as Record<string, unknown>;
      notifications.push({
        id: row.id as number,
        userId: row.user_id as number,
        type: row.type as NotificationType,
        title: row.title as string,
        content: row.content as string,
        priority: row.priority as NotificationPriority,
        isRead: row.is_read as boolean,
        readAt: row.read_at as Date | null,
        link: row.link as string | null,
        metadata: row.metadata as Record<string, unknown> | null,
        createdAt: row.created_at as Date,
      });
    }
  }

  return notifications;
}

/**
 * 获取用户通知列表
 */
export async function getUserNotifications(
  userId: number,
  options: {
    type?: NotificationType;
    isRead?: boolean;
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ data: Notification[]; total: number }> {
  const { type, isRead, limit = 20, offset = 0 } = options;

  let whereClause = sql`user_id = ${userId}`;
  if (type) {
    whereClause = sql`${whereClause} AND type = ${type}`;
  }
  if (isRead !== undefined) {
    whereClause = sql`${whereClause} AND is_read = ${isRead}`;
  }

  const dataResult = await db.execute(sql`
    SELECT * FROM sys_notification
    WHERE ${whereClause}
    ORDER BY created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `);

  const countResult = await db.execute(sql`
    SELECT COUNT(*) as total FROM sys_notification
    WHERE ${whereClause}
  `);

  // 转换行数据
  const rows = Array.from(dataResult);
  const data = rows.map((row: Record<string, unknown>) => ({
    id: row.id as number,
    userId: row.user_id as number,
    type: row.type as NotificationType,
    title: row.title as string,
    content: row.content as string,
    priority: row.priority as NotificationPriority,
    isRead: row.is_read as boolean,
    readAt: row.read_at as Date | null,
    link: row.link as string | null,
    metadata: row.metadata as Record<string, unknown> | null,
    createdAt: row.created_at as Date,
  }));

  const countRows = Array.from(countResult);
  const total = Number(countRows[0]?.total) || 0;

  return { data, total };
}

/**
 * 获取用户通知统计
 */
export async function getNotificationStats(
  userId: number
): Promise<NotificationStats> {
  const result = await db.execute(sql`
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE is_read = FALSE) as unread
    FROM sys_notification
    WHERE user_id = ${userId}
  `);

  // 按类型统计
  const typeResult = await db.execute(sql`
    SELECT type, COUNT(*) as count
    FROM sys_notification
    WHERE user_id = ${userId}
    GROUP BY type
  `);

  // 按优先级统计
  const priorityResult = await db.execute(sql`
    SELECT priority, COUNT(*) as count
    FROM sys_notification
    WHERE user_id = ${userId}
    GROUP BY priority
  `);

  const rows = Array.from(result);
  const typeRows = Array.from(typeResult);
  const priorityRows = Array.from(priorityResult);

  const byType: Record<NotificationType, number> = {} as Record<NotificationType, number>;
  typeRows.forEach((row: Record<string, unknown>) => {
    byType[row.type as NotificationType] = Number(row.count);
  });

  const byPriority: Record<NotificationPriority, number> = {} as Record<NotificationPriority, number>;
  priorityRows.forEach((row: Record<string, unknown>) => {
    byPriority[row.priority as NotificationPriority] = Number(row.count);
  });

  return {
    total: Number(rows[0]?.total) || 0,
    unread: Number(rows[0]?.unread) || 0,
    byType,
    byPriority,
  };
}

/**
 * 标记通知为已读
 */
export async function markNotificationRead(
  notificationId: number,
  userId: number
): Promise<boolean> {
  const result = await db.execute(sql`
    UPDATE sys_notification
    SET is_read = TRUE, read_at = NOW()
    WHERE id = ${notificationId} AND user_id = ${userId}
    RETURNING id
  `);

  return Array.from(result).length > 0;
}

/**
 * 标记所有通知为已读
 */
export async function markAllNotificationsRead(
  userId: number
): Promise<number> {
  const result = await db.execute(sql`
    UPDATE sys_notification
    SET is_read = TRUE, read_at = NOW()
    WHERE user_id = ${userId} AND is_read = FALSE
    RETURNING id
  `);

  return Array.from(result).length;
}

/**
 * 删除通知
 */
export async function deleteNotification(
  notificationId: number,
  userId: number
): Promise<boolean> {
  const result = await db.execute(sql`
    DELETE FROM sys_notification
    WHERE id = ${notificationId} AND user_id = ${userId}
    RETURNING id
  `);

  return Array.from(result).length > 0;
}

/**
 * 清理过期通知
 */
export async function cleanExpiredNotifications(
  daysToKeep: number = 30
): Promise<number> {
  const result = await db.execute(sql`
    DELETE FROM sys_notification
    WHERE created_at < NOW() - INTERVAL '1 day' * ${daysToKeep}
    AND is_read = TRUE
    RETURNING id
  `);

  return Array.from(result).length;
}

// =====================================================
// 快捷通知方法
// =====================================================

/**
 * 发送系统通知
 */
export function sendSystemNotification(
  userId: number | number[],
  title: string,
  content: string,
  options?: { priority?: NotificationPriority; link?: string }
) {
  return sendNotification({
    userId,
    type: 'system',
    title,
    content,
    ...options,
  });
}

/**
 * 发送任务通知
 */
export function sendTaskNotification(
  userId: number | number[],
  title: string,
  content: string,
  options?: { priority?: NotificationPriority; link?: string; metadata?: Record<string, unknown> }
) {
  return sendNotification({
    userId,
    type: 'task',
    title,
    content,
    priority: 'normal',
    ...options,
  });
}

/**
 * 发送预警通知
 */
export function sendAlertNotification(
  userId: number | number[],
  title: string,
  content: string,
  options?: { priority?: NotificationPriority; link?: string; metadata?: Record<string, unknown> }
) {
  return sendNotification({
    userId,
    type: 'alert',
    title,
    content,
    priority: 'high',
    ...options,
  });
}

/**
 * 发送审批通知
 */
export function sendApprovalNotification(
  userId: number | number[],
  title: string,
  content: string,
  options?: { priority?: NotificationPriority; link?: string; metadata?: Record<string, unknown> }
) {
  return sendNotification({
    userId,
    type: 'approval',
    title,
    content,
    priority: 'normal',
    ...options,
  });
}

/**
 * 发送提及通知
 */
export function sendMentionNotification(
  userId: number | number[],
  title: string,
  content: string,
  options?: { priority?: NotificationPriority; link?: string; metadata?: Record<string, unknown> }
) {
  return sendNotification({
    userId,
    type: 'mention',
    title,
    content,
    priority: 'normal',
    ...options,
  });
}

// =====================================================
// 通知模板
// =====================================================

export const NotificationTemplates = {
  // 项目相关
  projectAssigned: (projectName: string, assignerName: string) => ({
    title: '新项目分配',
    content: `${assignerName} 将项目「${projectName}」分配给了您`,
    link: '/projects',
  }),

  projectStatusChanged: (projectName: string, oldStatus: string, newStatus: string) => ({
    title: '项目状态变更',
    content: `项目「${projectName}」状态从「${oldStatus}」变更为「${newStatus}」`,
    link: '/projects',
  }),

  projectDeadlineReminder: (projectName: string, daysLeft: number) => ({
    title: '项目截止提醒',
    content: `项目「${projectName}」将在 ${daysLeft} 天后截止`,
    priority: daysLeft <= 3 ? 'urgent' : 'high' as NotificationPriority,
    link: '/projects',
  }),

  // 客户相关
  customerAssigned: (customerName: string, assignerName: string) => ({
    title: '新客户分配',
    content: `${assignerName} 将客户「${customerName}」分配给了您`,
    link: '/customers',
  }),

  // 任务相关
  taskAssigned: (taskTitle: string, assignerName: string) => ({
    title: '新任务分配',
    content: `${assignerName} 给您分配了任务「${taskTitle}」`,
    link: '/workbench',
  }),

  taskDueReminder: (taskTitle: string, dueDate: string) => ({
    title: '任务到期提醒',
    content: `任务「${taskTitle}」将在 ${dueDate} 到期`,
    link: '/workbench',
  }),

  // 审批相关
  approvalRequired: (type: string, applicantName: string) => ({
    title: '待审批',
    content: `${applicantName} 提交的${type}需要您审批`,
    priority: 'high' as NotificationPriority,
    link: '/approvals',
  }),

  approvalResult: (type: string, approved: boolean, approverName: string) => ({
    title: approved ? '审批通过' : '审批拒绝',
    content: `${approverName} ${approved ? '通过了' : '拒绝了'}您的${type}申请`,
    link: '/approvals',
  }),

  // 预警相关
  riskAlert: (type: string, message: string) => ({
    title: `${type}预警`,
    content: message,
    priority: 'urgent' as NotificationPriority,
    link: '/alerts',
  }),
};
