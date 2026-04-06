/**
 * 实时消息推送服务
 * 使用 Server-Sent Events (SSE) 实现单向推送
 */

import { db } from '@/db';
import { notifications, users } from '@/db/schema';
import { eq, desc, isNull } from 'drizzle-orm';

// 消息类型
export type RealtimeEventType = 
  | 'notification'      // 普通通知
  | 'alert'             // 预警提醒
  | 'task_assigned'     // 任务分配
  | 'message'           // 消息
  | 'system'            // 系统公告
  | 'project_update'    // 项目更新
  | 'customer_update';  // 客户更新

// 实时事件接口
export interface RealtimeEvent {
  id: string;
  type: RealtimeEventType;
  title: string;
  content: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  data?: Record<string, any>;
  createdAt: string;
  read?: boolean;
}

// SSE 客户端连接管理
class SSEConnectionManager {
  private connections: Map<number, Set<ReadableStreamDefaultController>> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  private startHeartbeat() {
    if (this.heartbeatInterval) {
      return;
    }

    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, 30000);
    this.heartbeatInterval.unref?.();
  }

  private stopHeartbeat() {
    if (!this.heartbeatInterval) {
      return;
    }

    clearInterval(this.heartbeatInterval);
    this.heartbeatInterval = null;
  }

  /**
   * 添加客户端连接
   */
  addConnection(userId: number, controller: ReadableStreamDefaultController) {
    this.startHeartbeat();
    if (!this.connections.has(userId)) {
      this.connections.set(userId, new Set());
    }
    this.connections.get(userId)!.add(controller);
    console.log(`[SSE] User ${userId} connected. Total connections: ${this.getConnectionCount()}`);
  }

  /**
   * 移除客户端连接
   */
  removeConnection(userId: number, controller: ReadableStreamDefaultController) {
    const userConnections = this.connections.get(userId);
    if (userConnections) {
      userConnections.delete(controller);
      if (userConnections.size === 0) {
        this.connections.delete(userId);
      }
    }
    console.log(`[SSE] User ${userId} disconnected. Total connections: ${this.getConnectionCount()}`);
  }

  /**
   * 获取连接总数
   */
  getConnectionCount(): number {
    let count = 0;
    this.connections.forEach(conns => count += conns.size);
    return count;
  }

  /**
   * 获取用户连接数
   */
  getUserConnectionCount(userId: number): number {
    return this.connections.get(userId)?.size || 0;
  }

  /**
   * 向特定用户发送事件
   */
  sendToUser(userId: number, event: RealtimeEvent): boolean {
    const userConnections = this.connections.get(userId);
    if (!userConnections || userConnections.size === 0) {
      return false;
    }

    const eventData = this.formatEvent(event);
    userConnections.forEach(controller => {
      try {
        controller.enqueue(eventData);
      } catch (error) {
        console.error(`[SSE] Error sending to user ${userId}:`, error);
      }
    });

    return true;
  }

  /**
   * 向所有用户广播事件
   */
  broadcast(event: RealtimeEvent) {
    const eventData = this.formatEvent(event);
    this.connections.forEach((controllers, userId) => {
      controllers.forEach(controller => {
        try {
          controller.enqueue(eventData);
        } catch (error) {
          console.error(`[SSE] Error broadcasting to user ${userId}:`, error);
        }
      });
    });
  }

  /**
   * 向多个用户发送事件
   */
  sendToUsers(userIds: number[], event: RealtimeEvent) {
    userIds.forEach(userId => this.sendToUser(userId, event));
  }

  /**
   * 发送心跳
   */
  private sendHeartbeat() {
    const heartbeat = this.formatEvent({
      id: `heartbeat-${Date.now()}`,
      type: 'system',
      title: 'heartbeat',
      content: '',
      priority: 'low',
      createdAt: new Date().toISOString(),
    });

    this.connections.forEach(controllers => {
      controllers.forEach(controller => {
        try {
          controller.enqueue(heartbeat);
        } catch {
          // 连接可能已关闭，忽略错误
        }
      });
    });
  }

  /**
   * 格式化 SSE 事件
   */
  private formatEvent(event: RealtimeEvent): Uint8Array {
    const eventData = `event: message\ndata: ${JSON.stringify(event)}\n\n`;
    return new TextEncoder().encode(eventData);
  }

  /**
   * 清理资源
   */
  destroy() {
    if (this.heartbeatInterval) {
      this.stopHeartbeat();
    }
  }
}

// 导出单例实例
export const sseManager = new SSEConnectionManager();

/**
 * 消息推送服务
 */
export class NotificationPushService {
  /**
   * 推送通知给特定用户
   */
  static async pushToUser(
    userId: number,
    type: RealtimeEventType,
    title: string,
    content: string,
    priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium',
    data?: Record<string, any>
  ): Promise<RealtimeEvent> {
    // 创建通知记录
    const [notification] = await db.insert(notifications).values({
      receiverId: userId,
      type: this.mapNotificationType(type),
      title,
      content,
      level: this.mapPriorityToLevel(priority),
      link: data?.link || null,
      isRead: false,
    }).returning();

    // 构建事件
    const event: RealtimeEvent = {
      id: notification.id.toString(),
      type,
      title,
      content,
      priority,
      data,
      createdAt: notification.createdAt?.toISOString() || new Date().toISOString(),
      read: false,
    };

    // 推送事件
    sseManager.sendToUser(userId, event);

    return event;
  }

  /**
   * 将优先级映射到通知级别
   */
  private static mapPriorityToLevel(priority: string): string {
    switch (priority) {
      case 'urgent':
        return 'error';
      case 'high':
        return 'warning';
      case 'medium':
        return 'info';
      case 'low':
        return 'info';
      default:
        return 'info';
    }
  }

  /**
   * 推送通知给多个用户
   */
  static async pushToUsers(
    userIds: number[],
    type: RealtimeEventType,
    title: string,
    content: string,
    priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium',
    data?: Record<string, any>
  ): Promise<void> {
    // 批量创建通知记录
    const notificationValues = userIds.map(userId => ({
      receiverId: userId,
      type: this.mapNotificationType(type),
      title,
      content,
      level: this.mapPriorityToLevel(priority),
      link: data?.link || null,
      isRead: false,
    }));

    await db.insert(notifications).values(notificationValues);

    // 构建事件
    const event: RealtimeEvent = {
      id: `batch-${Date.now()}`,
      type,
      title,
      content,
      priority,
      data,
      createdAt: new Date().toISOString(),
      read: false,
    };

    // 推送给所有目标用户
    sseManager.sendToUsers(userIds, event);
  }

  /**
   * 广播系统公告
   */
  static async broadcast(
    title: string,
    content: string,
    priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium'
  ): Promise<void> {
    // 获取所有活跃用户
    const activeUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.status, 'active'));

    const userIds = activeUsers.map(u => u.id);

    // 批量创建通知
    await this.pushToUsers(userIds, 'system', title, content, priority);
  }

  /**
   * 推送任务分配通知
   */
  static async pushTaskAssigned(
    userId: number,
    taskTitle: string,
    taskId: number,
    assignedBy: string
  ): Promise<RealtimeEvent> {
    return this.pushToUser(
      userId,
      'task_assigned',
      '新任务分配',
      `${assignedBy} 给您分配了任务：${taskTitle}`,
      'high',
      { taskId, assignedBy }
    );
  }

  /**
   * 推送项目更新通知
   */
  static async pushProjectUpdate(
    userIds: number[],
    projectName: string,
    updateType: string,
    projectId: number
  ): Promise<void> {
    return this.pushToUsers(
      userIds,
      'project_update',
      '项目更新',
      `项目"${projectName}"${updateType}`,
      'medium',
      { projectId, updateType }
    );
  }

  /**
   * 推送预警提醒
   */
  static async pushAlert(
    userIds: number[],
    alertTitle: string,
    alertContent: string,
    priority: 'medium' | 'high' | 'urgent' = 'high'
  ): Promise<void> {
    return this.pushToUsers(
      userIds,
      'alert',
      alertTitle,
      alertContent,
      priority
    );
  }

  /**
   * 映射通知类型
   */
  private static mapNotificationType(type: RealtimeEventType): string {
    const typeMap: Record<RealtimeEventType, string> = {
      notification: 'system',
      alert: 'alert',
      task_assigned: 'task',
      message: 'message',
      system: 'system',
      project_update: 'project',
      customer_update: 'customer',
    };
    return typeMap[type] || 'system';
  }
}
