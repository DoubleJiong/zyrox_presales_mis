// 日历事件类型
export interface CalendarEvent {
  id: string;
  title: string;
  type: 'todo' | 'schedule';
  startDate: string; // YYYY-MM-DD
  startTime?: string; // HH:mm
  endDate?: string;
  endTime?: string;
  allDay: boolean;
  status: string;
  priority?: string; // for todo
  location?: string;
  description?: string;
  ownerId?: number;
  isOwner?: boolean;
  accessRole?: 'owner' | 'participant';
  participants?: Array<{ userId: number; userName: string }>;
  reminder?: {
    enabled: boolean;
    remindAt?: string;
    remindType?: string;
  } | null;
  repeat?: {
    type: string;
    interval: number;
    endDate?: string;
    count?: number;
  } | null;
  relatedType?: string | null;
  relatedId?: number | null;
  color?: string;
}

export function formatRepeatLabel(repeat?: CalendarEvent['repeat']): string | null {
  if (!repeat) {
    return null;
  }

  const typeLabels: Record<string, string> = {
    daily: '每天重复',
    weekly: '每周重复',
    monthly: '每月重复',
    yearly: '每年重复',
  };

  const baseLabel = typeLabels[repeat.type] || '重复日程';
  return repeat.interval > 1 ? `${baseLabel}（每 ${repeat.interval} 次）` : baseLabel;
}

// 视图类型
export type CalendarView = 'month' | 'week' | 'day';

// 日期格子信息
export interface DateCell {
  date: Date;
  isToday: boolean;
  isCurrentMonth: boolean;
  events: CalendarEvent[];
}

// 时间槽信息（周视图/日视图用）
export interface TimeSlot {
  hour: number;
  events: CalendarEvent[];
}

// 获取事件颜色
export function getEventColor(event: CalendarEvent): string {
  if (event.type === 'todo') {
    switch (event.priority) {
      case 'urgent': return '#ef4444'; // red
      case 'high': return '#f97316'; // orange
      case 'medium': return '#3b82f6'; // blue
      case 'low': return '#6b7280'; // gray
      default: return '#3b82f6';
    }
  }
  
  // schedule colors
  switch (event.status) {
    case 'meeting': return '#8b5cf6'; // purple
    case 'visit': return '#10b981'; // green
    case 'call': return '#f59e0b'; // yellow
    case 'presentation': return '#ec4899'; // pink
    case 'online': return '#06b6d4'; // cyan
    default: return '#6366f1'; // indigo
  }
}

// 格式化日期
export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

// 获取月份的天数
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

// 获取月份第一天是星期几
export function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

// 获取周的开始日期（周日为第一天）
export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  return d;
}

// 判断是否同一天
export function isSameDay(date1: Date, date2: Date): boolean {
  return formatDate(date1) === formatDate(date2);
}

// 获取小时范围显示文本
export function getHourLabel(hour: number): string {
  if (hour === 0) return '00:00';
  if (hour < 12) return `${String(hour).padStart(2, '0')}:00`;
  if (hour === 12) return '12:00';
  return `${String(hour).padStart(2, '0')}:00`;
}
