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
 * 验证手机/电话号码格式（中国大陆）
 * 支持：手机号（11位移动号）、座机（区号-号码）、带国家代码
 */
export function isValidPhone(phone: string): boolean {
  if (!phone) return false;
  const trimmed = phone.trim();
  // 手机号：1[3-9]开头11位
  if (/^1[3-9]\d{9}$/.test(trimmed)) return true;
  // 座机：(区号-)? 7-8位号码 (-分机)?
  if (/^(\d{3,4}-)?\d{7,8}(-\d{1,6})?$/.test(trimmed)) return true;
  // 括号区号：(区号)号码
  if (/^\(\d{3,4}\)\d{7,8}$/.test(trimmed)) return true;
  // 带国家代码：+86- 或 86-
  if (/^(\+?86-)?(\d{3,4}-)?\d{7,8}(-\d{1,6})?$/.test(trimmed)) return true;
  return false;
}
