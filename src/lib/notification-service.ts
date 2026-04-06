/**
 * 通知服务
 * 
 * 提供系统通知的发送功能，支持多种通知类型
 */

import { db } from '@/db';
import { notifications, users } from '@/db/schema';
import { eq } from 'drizzle-orm';

// 通知类型
export type NotificationType = 'system' | 'task' | 'approval' | 'reminder' | 'message';

// 通知级别
export type NotificationLevel = 'info' | 'warning' | 'error' | 'success';

// 创建通知参数
export interface CreateNotificationParams {
  title: string;
  content: string;
  type: NotificationType;
  level?: NotificationLevel;
  receiverId: number;
  senderId?: number;
  link?: string;
}

// 通知服务类
export class NotificationService {
  /**
   * 发送通知
   */
  static async send(params: CreateNotificationParams): Promise<number> {
    const [notification] = await db
      .insert(notifications)
      .values({
        title: params.title,
        content: params.content,
        type: params.type,
        level: params.level || 'info',
        receiverId: params.receiverId,
        senderId: params.senderId,
        link: params.link,
        isRead: false,
      })
      .returning();

    return notification.id;
  }

  /**
   * 批量发送通知
   */
  static async sendBatch(
    params: Omit<CreateNotificationParams, 'receiverId'>,
    receiverIds: number[]
  ): Promise<void> {
    const values = receiverIds.map(receiverId => ({
      title: params.title,
      content: params.content,
      type: params.type,
      level: params.level || 'info',
      receiverId,
      senderId: params.senderId,
      link: params.link,
      isRead: false,
    }));

    await db.insert(notifications).values(values);
  }

  /**
   * 发送系统通知
   */
  static async sendSystemNotification(
    title: string,
    content: string,
    receiverId: number,
    link?: string
  ): Promise<number> {
    return this.send({
      title,
      content,
      type: 'system',
      level: 'info',
      receiverId,
      link,
    });
  }

  /**
   * 发送任务通知
   */
  static async sendTaskNotification(
    title: string,
    content: string,
    receiverId: number,
    senderId?: number,
    link?: string
  ): Promise<number> {
    return this.send({
      title,
      content,
      type: 'task',
      level: 'info',
      receiverId,
      senderId,
      link,
    });
  }

  /**
   * 发送审批通知
   */
  static async sendApprovalNotification(
    title: string,
    content: string,
    receiverId: number,
    senderId?: number,
    link?: string,
    level: NotificationLevel = 'info'
  ): Promise<number> {
    return this.send({
      title,
      content,
      type: 'approval',
      level,
      receiverId,
      senderId,
      link,
    });
  }

  /**
   * 发送提醒通知
   */
  static async sendReminderNotification(
    title: string,
    content: string,
    receiverId: number,
    link?: string
  ): Promise<number> {
    return this.send({
      title,
      content,
      type: 'reminder',
      level: 'warning',
      receiverId,
      link,
    });
  }

  /**
   * 发送消息通知
   */
  static async sendMessageNotification(
    title: string,
    content: string,
    receiverId: number,
    senderId: number,
    link?: string
  ): Promise<number> {
    return this.send({
      title,
      content,
      type: 'message',
      level: 'info',
      receiverId,
      senderId,
      link,
    });
  }

  /**
   * 标记通知为已读
   */
  static async markAsRead(notificationId: number): Promise<void> {
    await db
      .update(notifications)
      .set({
        isRead: true,
        readAt: new Date(),
      })
      .where(eq(notifications.id, notificationId));
  }

  /**
   * 标记所有通知为已读
   */
  static async markAllAsRead(receiverId: number): Promise<void> {
    await db
      .update(notifications)
      .set({
        isRead: true,
        readAt: new Date(),
      })
      .where(eq(notifications.receiverId, receiverId));
  }

  /**
   * 获取未读通知数量
   */
  static async getUnreadCount(receiverId: number): Promise<number> {
    const [result] = await db
      .select({ count: notifications.id })
      .from(notifications)
      .where(eq(notifications.receiverId, receiverId));

    return result?.count || 0;
  }

  /**
   * 删除通知
   */
  static async delete(notificationId: number): Promise<void> {
    await db
      .update(notifications)
      .set({ deletedAt: new Date() })
      .where(eq(notifications.id, notificationId));
  }
}

// 导出便捷方法
export const sendNotification = NotificationService.send;
export const sendSystemNotification = NotificationService.sendSystemNotification;
export const sendTaskNotification = NotificationService.sendTaskNotification;
export const sendApprovalNotification = NotificationService.sendApprovalNotification;
export const sendReminderNotification = NotificationService.sendReminderNotification;
