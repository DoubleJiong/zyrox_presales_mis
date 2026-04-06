import { containsUnsafeHtml, sanitizePlainText, sanitizeSearchText } from '@/lib/input-sanitization';

/**
 * 清理字符串中的HTML标签，防止XSS攻击
 */
export function sanitizeString(input: string): string {
  return sanitizePlainText(input);
}

/**
 * 清理搜索字符串，限制长度并移除危险字符
 */
export function sanitizeSearchString(input: string): string {
  return sanitizeSearchText(input);
}

/**
 * 验证字符串是否包含潜在危险的HTML内容
 */
export function containsHtml(input: string): boolean {
  return containsUnsafeHtml(input);
}

/**
 * 验证邮箱格式
 */
export function isValidEmail(email: string): boolean {
  if (!email) return false;
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailPattern.test(email);
}

/**
 * 验证手机号格式（中国大陆）
 */
export function isValidPhone(phone: string): boolean {
  if (!phone) return false;
  const phonePattern = /^1[3-9]\d{9}$/;
  return phonePattern.test(phone);
}
