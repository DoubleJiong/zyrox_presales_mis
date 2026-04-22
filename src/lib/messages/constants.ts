/**
 * 消息中心枚举常量 — 系统唯一权威来源
 *
 * 所有涉及 sys_message.type / sys_message.priority 的代码必须从此文件引入，
 * 不得在业务文件中重复定义类型字面量。
 *
 * 字典管理：message_type / message_priority 已纳入 dictionary-config.ts，
 * 可通过字典管理页面调整标签和排序；枚举 code 值保持稳定，不受字典调整影响。
 */

// ============================================================
// 消息类型
// ============================================================

export const MESSAGE_TYPES = [
  { value: 'system',     label: '系统',   icon: 'Settings',    sortOrder: 1 },
  { value: 'task',       label: '任务',   icon: 'CheckSquare', sortOrder: 2 },
  { value: 'alert',      label: '预警',   icon: 'AlertCircle', sortOrder: 3 },
  { value: 'approval',   label: '审批',   icon: 'FileCheck',   sortOrder: 4 },
  { value: 'reminder',   label: '提醒',   icon: 'Clock',       sortOrder: 5 },
  { value: 'mention',    label: '@提及',  icon: 'AtSign',      sortOrder: 6 },
] as const;

export type MessageType = (typeof MESSAGE_TYPES)[number]['value'];

// ============================================================
// 消息优先级
// ============================================================

export const MESSAGE_PRIORITIES = [
  { value: 'low',    label: '低',   sortOrder: 1, color: 'gray'   },
  { value: 'normal', label: '普通', sortOrder: 2, color: 'blue'   },
  { value: 'high',   label: '高',   sortOrder: 3, color: 'orange' },
  { value: 'urgent', label: '紧急', sortOrder: 4, color: 'red'    },
] as const;

export type MessagePriority = (typeof MESSAGE_PRIORITIES)[number]['value'];

// ============================================================
// 标签工具函数（用于 UI 已读渲染，不依赖字典 API）
// ============================================================

export function getMessageTypeLabel(type: string | null | undefined): string {
  const found = MESSAGE_TYPES.find(t => t.value === type);
  return found?.label ?? '消息';
}

export function getMessagePriorityLabel(priority: string | null | undefined): string {
  const found = MESSAGE_PRIORITIES.find(p => p.value === priority);
  return found?.label ?? '普通';
}

// ============================================================
// 兼容映射：存量 sys_message.type 可能含旧值，统一降级处理
// ============================================================

/** 旧 type 值 → canonical type 值 */
const LEGACY_TYPE_MAP: Record<string, MessageType> = {
  notification: 'system',
  message:      'system',
};

export function normalizeMessageType(raw: string | null | undefined): MessageType {
  if (!raw) return 'system';
  if (LEGACY_TYPE_MAP[raw]) return LEGACY_TYPE_MAP[raw];
  const valid = MESSAGE_TYPES.find(t => t.value === raw);
  return valid ? valid.value : 'system';
}
