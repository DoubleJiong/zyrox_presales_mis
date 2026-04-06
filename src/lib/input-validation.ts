/**
 * 输入验证和XSS过滤工具
 * 
 * 功能：
 * - 字段长度校验
 * - XSS风险字符过滤
 * - 输入内容清洗
 */

import { containsUnsafeHtml, sanitizePlainText } from '@/lib/input-sanitization';

/**
 * 字段长度限制配置
 */
export const FIELD_LENGTH_LIMITS = {
  // 解决方案
  solutionName: 200,
  solutionCode: 50,
  solutionDescription: 10000,
  solutionTags: 10, // 标签数量
  singleTag: 50, // 单个标签长度
  
  // 子方案
  subSchemeName: 200,
  subSchemeCode: 50,
  subSchemeDescription: 5000,
  
  // 版本
  versionChangelog: 2000,
  versionName: 200,
  
  // 评审
  reviewComment: 2000,
  
  // 通用
  userName: 100,
  userRealName: 100,
  email: 100,
  phone: 20,
  
  // 项目
  projectName: 200,
  projectCode: 50,
  projectDescription: 5000,
} as const;

/**
 * 危险字符模式（XSS检测）
 */
const DANGEROUS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi, // onclick=, onload=, etc.
  /data:\s*text\/html/gi,
  /vbscript:/gi,
  /<iframe\b/gi,
  /<object\b/gi,
  /<embed\b/gi,
  /<form\b/gi,
  /expression\s*\(/gi,
];

/**
 * HTML实体转义映射
 */
const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;',
};

/**
 * 验证结果
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  sanitized?: any;
}

/**
 * 字段长度校验
 */
export function validateFieldLength(
  fieldName: keyof typeof FIELD_LENGTH_LIMITS,
  value: string | undefined | null
): ValidationResult {
  const errors: string[] = [];
  
  if (value === undefined || value === null) {
    return { valid: true, errors: [] };
  }
  
  const limit = FIELD_LENGTH_LIMITS[fieldName];
  const strValue = String(value);
  
  if (strValue.length > limit) {
    errors.push(`${fieldName} 长度超过限制 (最大 ${limit} 字符，当前 ${strValue.length} 字符)`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * 批量字段长度校验
 */
export function validateFieldLengths(
  fields: Array<{ name: keyof typeof FIELD_LENGTH_LIMITS; value: string | undefined | null }>
): ValidationResult {
  const errors: string[] = [];
  
  for (const { name, value } of fields) {
    const result = validateFieldLength(name, value);
    errors.push(...result.errors);
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * XSS风险检测
 */
export function detectXss(value: string): boolean {
  if (!value || typeof value !== 'string') {
    return false;
  }

  return containsUnsafeHtml(value) || DANGEROUS_PATTERNS.some((pattern) => pattern.test(value));
}

/**
 * HTML转义（用于存储前的净化）
 */
export function escapeHtml(value: string): string {
  if (!value || typeof value !== 'string') {
    return value;
  }
  
  return value.replace(/[&<>"'`=/]/g, (char) => HTML_ENTITIES[char] || char);
}

/**
 * 清理输入内容（移除危险字符）
 */
export function sanitizeInput(value: string): string {
  return sanitizePlainText(value);
}

/**
 * 综合输入验证
 */
export function validateInput(
  data: Record<string, any>,
  rules: Array<{
    field: keyof typeof FIELD_LENGTH_LIMITS;
    required?: boolean;
    sanitize?: boolean;
  }>
): ValidationResult {
  const errors: string[] = [];
  const sanitized: Record<string, any> = {};
  
  for (const { field, required, sanitize } of rules) {
    const value = data[field];
    
    // 必填检查
    if (required && (value === undefined || value === null || value === '')) {
      errors.push(`${field} 不能为空`);
      continue;
    }
    
    // 跳过空值
    if (value === undefined || value === null) {
      continue;
    }
    
    const strValue = String(value);
    
    // 长度校验
    const lengthResult = validateFieldLength(field, strValue);
    errors.push(...lengthResult.errors);
    
    // XSS检测
    if (detectXss(strValue)) {
      errors.push(`${field} 包含不安全的内容`);
    }
    
    // 清理内容
    if (sanitize) {
      sanitized[field] = sanitizeInput(strValue);
    } else {
      sanitized[field] = value;
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    sanitized,
  };
}

/**
 * 解决方案输入验证
 */
export function validateSolutionInput(body: Record<string, any>): ValidationResult {
  const errors: string[] = [];
  
  // 必填字段
  if (!body.solutionName || body.solutionName.trim() === '') {
    errors.push('解决方案名称不能为空');
  }
  
  // 长度校验
  const lengthChecks = validateFieldLengths([
    { name: 'solutionName', value: body.solutionName },
    { name: 'solutionCode', value: body.solutionCode },
    { name: 'solutionDescription', value: body.description },
  ]);
  errors.push(...lengthChecks.errors);
  
  // XSS检测
  const fieldsToCheck = ['solutionName', 'description', 'technicalArchitecture', 'advantages', 'limitations'];
  for (const field of fieldsToCheck) {
    if (body[field] && detectXss(String(body[field]))) {
      errors.push(`${field} 包含不安全的内容`);
    }
  }
  
  // 标签数量校验
  if (body.tags && Array.isArray(body.tags)) {
    if (body.tags.length > FIELD_LENGTH_LIMITS.solutionTags) {
      errors.push(`标签数量超过限制 (最大 ${FIELD_LENGTH_LIMITS.solutionTags} 个)`);
    }
    for (const tag of body.tags) {
      if (tag.length > FIELD_LENGTH_LIMITS.singleTag) {
        errors.push(`单个标签长度超过限制 (最大 ${FIELD_LENGTH_LIMITS.singleTag} 字符)`);
        break;
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * 项目输入验证
 */
export function validateProjectInput(body: Record<string, any>): ValidationResult {
  const errors: string[] = [];
  
  // 必填字段
  if (!body.projectName || body.projectName.trim() === '') {
    errors.push('项目名称不能为空');
  }
  
  // 长度校验
  const lengthChecks = validateFieldLengths([
    { name: 'projectName', value: body.projectName },
    { name: 'projectCode', value: body.projectCode },
    { name: 'projectDescription', value: body.description },
  ]);
  errors.push(...lengthChecks.errors);
  
  // XSS检测
  const fieldsToCheck = ['projectName', 'description', 'notes'];
  for (const field of fieldsToCheck) {
    if (body[field] && detectXss(String(body[field]))) {
      errors.push(`${field} 包含不安全的内容`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * 子方案输入验证
 */
export function validateSubSchemeInput(body: Record<string, any>): ValidationResult {
  const errors: string[] = [];
  
  // 必填字段
  if (!body.subSchemeName || body.subSchemeName.trim() === '') {
    errors.push('子方案名称不能为空');
  }
  
  // 长度校验
  const lengthChecks = validateFieldLengths([
    { name: 'subSchemeName', value: body.subSchemeName },
    { name: 'subSchemeCode', value: body.subSchemeCode },
    { name: 'subSchemeDescription', value: body.description },
  ]);
  errors.push(...lengthChecks.errors);
  
  // XSS检测
  const fieldsToCheck = ['subSchemeName', 'description', 'content', 'technicalSpec'];
  for (const field of fieldsToCheck) {
    if (body[field] && detectXss(String(body[field]))) {
      errors.push(`${field} 包含不安全的内容`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}
