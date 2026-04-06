import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 格式化日期字段为 ISO 字符串
 * 用于解决 Drizzle ORM timestamp 类型序列化问题
 */
export function formatDateField(date: Date | string | null | undefined): string | null {
  if (!date) return null;
  if (typeof date === 'string') return date;
  return date.toISOString();
}

/**
 * 格式化日期为本地日期字符串 (YYYY-MM-DD)
 */
export function formatDateToLocal(date: Date | string | null | undefined): string | null {
  if (!date) return null;
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('T')[0];
}

/**
 * 批量格式化记录中的日期字段
 */
export function formatRecordsDates<T extends Record<string, unknown>>(
  records: T[],
  dateFields: (keyof T)[]
): T[] {
  return records.map(record => {
    const formatted = { ...record };
    for (const field of dateFields) {
      if (field in formatted) {
        (formatted as Record<string, unknown>)[field as string] = formatDateField(
          formatted[field] as Date | string | null | undefined
        );
      }
    }
    return formatted;
  });
}
