/**
 * @提及 解析与通知工具
 *
 * 从文本内容中提取 @姓名 片段，查询匹配用户，
 * 并为每位被@用户写入 sys_message（type='mention'）。
 *
 * 规则：
 * - 匹配 @姓名，姓名仅含汉字、字母、数字（不含空格）
 * - 自动排除作者本身
 * - 每次写入前不去重（同一段内容可多次@同一人，业务可接受）
 * - 写入失败不影响主流程（非阻塞）
 */

import { db } from '@/db';
import { users } from '@/db/schema';
import { inArray } from 'drizzle-orm';
import { sendMessage } from '@/lib/messages/send';

/** 从文本中提取所有 @realName 片段（去重） */
export function extractMentionedNames(text: string): string[] {
  const pattern = /@([\u4e00-\u9fa5a-zA-Z0-9·]+)/g;
  const names = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    const name = match[1].trim();
    if (name) names.add(name);
  }
  return [...names];
}

export interface MentionContext {
  /** 文本内容（含 @姓名） */
  text: string;
  /** 发送消息的用户 ID，从提及列表中排除 */
  authorId: number;
  /** 消息标题 */
  title: string;
  /** 完整正文（一般直接用 text 即可） */
  content?: string;
  /** 跳转链接 */
  actionUrl?: string;
  /** 按钮文字 */
  actionText?: string;
  /** 关联对象类型（project / lead / customer 等） */
  relatedType?: string;
  /** 关联对象 ID */
  relatedId?: number;
  /** 关联对象名称 */
  relatedName?: string;
}

/**
 * 解析文本中的 @提及，查找匹配用户，写入 sys_message。
 * 失败静默：不抛出异常，只记录日志。
 */
export async function notifyMentions(ctx: MentionContext): Promise<void> {
  try {
    const mentionedNames = extractMentionedNames(ctx.text);
    if (mentionedNames.length === 0) return;

    // 查找匹配的活跃用户
    const mentionedUsers = await db
      .select({ id: users.id, realName: users.realName })
      .from(users)
      .where(
        inArray(users.realName, mentionedNames)
      )
      .then((rows) =>
        rows.filter(
          (u) => u.id !== ctx.authorId // 排除作者自身
        )
      );

    if (mentionedUsers.length === 0) return;

    const msgContent = ctx.content ?? ctx.text;

    // 逐个发送（含 SSE 实时推送）
    await Promise.all(
      mentionedUsers.map((u) =>
        sendMessage({
          title: ctx.title,
          content: msgContent,
          type: 'mention',
          category: 'system',
          priority: 'normal',
          receiverId: u.id,
          senderId: ctx.authorId,
          relatedType: ctx.relatedType,
          relatedId: ctx.relatedId,
          relatedName: ctx.relatedName,
          actionUrl: ctx.actionUrl,
          actionText: ctx.actionText,
        }).catch((err) => {
          console.error(`[mention-notifier] failed to send to user ${u.id}:`, err);
        })
      )
    );
  } catch (err) {
    console.error('[mention-notifier] Failed to write mention messages:', err);
  }
}
