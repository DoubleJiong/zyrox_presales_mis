/**
 * 统一消息发送工具
 *
 * 封装 sys_message 写入 + SSE 实时推送。
 * 所有业务写路径应使用 sendMessage() 替代裸 db.insert(messages)。
 */

import { db } from '@/db';
import { messages } from '@/db/schema';
import { sseManager } from '@/lib/realtime-service';
import type { MessageType, MessagePriority } from '@/lib/messages/constants';

export interface SendMessageParams {
  title: string;
  content: string;
  type?: MessageType;
  category?: string;
  priority?: MessagePriority;
  senderId?: number;
  receiverId: number;
  relatedType?: string;
  relatedId?: number;
  relatedName?: string;
  actionUrl?: string;
  actionText?: string;
  metadata?: Record<string, unknown>;
}

/**
 * 写入 sys_message 并通过 SSE 实时推送给接收人。
 * 返回插入的消息记录。
 */
export async function sendMessage(params: SendMessageParams) {
  const [inserted] = await db
    .insert(messages)
    .values({
      title: params.title,
      content: params.content,
      type: params.type ?? 'system',
      category: params.category,
      priority: params.priority ?? 'normal',
      senderId: params.senderId,
      receiverId: params.receiverId,
      relatedType: params.relatedType,
      relatedId: params.relatedId,
      relatedName: params.relatedName,
      actionUrl: params.actionUrl,
      actionText: params.actionText,
      metadata: params.metadata,
      isRead: false,
      isDeleted: false,
    })
    .returning();

  // 实时推送：如果接收人当前在线则立即收到
  sseManager.sendToUser(params.receiverId, {
    id: inserted.id.toString(),
    type: mapToRealtimeType(params.type),
    title: params.title,
    content: params.content,
    priority: mapPriority(params.priority),
    data: {
      messageId: inserted.id,
      relatedType: params.relatedType,
      relatedId: params.relatedId,
      actionUrl: params.actionUrl,
    },
    createdAt: (inserted.createdAt ?? new Date()).toISOString(),
    read: false,
  });

  return inserted;
}

function mapToRealtimeType(type?: string) {
  switch (type) {
    case 'task':       return 'task_assigned' as const;
    case 'alert':      return 'alert' as const;
    case 'approval':   return 'notification' as const;
    case 'reminder':   return 'notification' as const;
    case 'mention':    return 'notification' as const;
    default:           return 'system' as const;
  }
}

function mapPriority(priority?: string): 'low' | 'medium' | 'high' | 'urgent' {
  switch (priority) {
    case 'urgent': return 'urgent';
    case 'high':   return 'high';
    case 'low':    return 'low';
    default:       return 'medium';
  }
}
