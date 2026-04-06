/**
 * 数据验证增强工具
 * 使用Zod进行统一的数据验证
 */

import { z } from 'zod';
import { sanitizePlainText } from '@/lib/input-sanitization';

// =====================================================
// 基础验证规则
// =====================================================

// 电话号码验证（支持手机号和座机号）
// 支持格式：手机号(1[3-9]xxxxxxxxx)、座机(区号-号码-分机)、纯号码等
export const phoneSchema = z
  .string()
  .refine(
    (val) => {
      if (!val || val.trim() === '') return true; // 空值有效
      const trimmed = val.trim();
      const mobileRegex = /^1[3-9]\d{9}$/;
      const landlineRegex = /^(\d{3,4}-)?\d{7,8}(-\d{1,6})?$/;
      const landlineWithBracketsRegex = /^\(\d{3,4}\)\d{7,8}$/;
      const withCountryCodeRegex = /^(\+?86-)?(\d{3,4}-)?\d{7,8}(-\d{1,6})?$/;
      return (
        mobileRegex.test(trimmed) ||
        landlineRegex.test(trimmed) ||
        landlineWithBracketsRegex.test(trimmed) ||
        withCountryCodeRegex.test(trimmed)
      );
    },
    { message: '请输入有效的电话号码（支持手机号或座机号）' }
  );

// 邮箱验证
export const emailSchema = z
  .string()
  .email('请输入有效的邮箱地址');

// 密码验证（至少8位，包含大小写字母和数字）
export const passwordSchema = z
  .string()
  .min(8, '密码至少8个字符')
  .max(128, '密码最多128个字符')
  .regex(/[a-z]/, '密码需包含小写字母')
  .regex(/[A-Z]/, '密码需包含大写字母')
  .regex(/[0-9]/, '密码需包含数字');

// 简单密码验证（用于登录）
export const loginPasswordSchema = z
  .string()
  .min(1, '请输入密码')
  .max(128, '密码格式错误');

// 用户名验证
export const usernameSchema = z
  .string()
  .min(2, '用户名至少2个字符')
  .max(50, '用户名最多50个字符')
  .regex(/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/, '用户名只能包含字母、数字、下划线和中文');

// 真实姓名验证
export const realNameSchema = z
  .string()
  .min(2, '姓名至少2个字符')
  .max(50, '姓名最多50个字符');

// 金额验证
export const amountSchema = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/, '请输入有效的金额')
  .refine(val => parseFloat(val) >= 0, '金额不能为负数');

// 正整数验证
export const positiveIntSchema = z
  .number()
  .int('必须是整数')
  .positive('必须是正整数');

// 非负整数验证
export const nonNegativeIntSchema = z
  .number()
  .int('必须是整数')
  .nonnegative('不能为负数');

// ID验证
export const idSchema = z
  .number()
  .int()
  .positive('ID必须是正整数');

// 日期字符串验证
export const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式错误，应为 YYYY-MM-DD')
  .refine(val => !isNaN(Date.parse(val)), '无效的日期');

// 状态枚举
export const statusSchema = z.enum(['active', 'inactive']);

// =====================================================
// 业务验证规则
// =====================================================

// 客户创建验证
export const createCustomerSchema = z.object({
  customerName: z.string().min(1, '客户名称不能为空').max(200, '客户名称最多200个字符'),
  customerTypeId: idSchema.optional(),
  region: z.string().max(50, '区域最多50个字符').optional(),
  contactName: z.string().max(50, '联系人最多50个字符').optional(),
  contactPhone: phoneSchema.optional().or(z.literal('')),
  contactEmail: emailSchema.optional().or(z.literal('')),
  address: z.string().max(500, '地址最多500个字符').optional(),
  description: z.string().max(2000, '描述最多2000个字符').optional(),
});

// 客户更新验证
export const updateCustomerSchema = createCustomerSchema.partial();

// 项目创建验证
export const createProjectSchema = z.object({
  projectName: z.string().min(1, '项目名称不能为空').max(200, '项目名称最多200个字符'),
  projectCode: z.string().max(50, '项目编号最多50个字符').optional(),
  customerId: idSchema.optional(),
  customerName: z.string().max(200, '客户名称最多200个字符').optional(),
  projectTypeId: idSchema.optional(),
  projectStage: z.enum(['opportunity', 'bidding', 'execution', 'settlement', 'archived']).optional(),
  industry: z.string().max(50, '行业最多50个字符').optional(),
  region: z.string().max(50, '区域最多50个字符').optional(),
  description: z.string().max(2000, '描述最多2000个字符').optional(),
  managerId: idSchema.optional(),
  estimatedAmount: amountSchema.optional(),
  startDate: dateStringSchema.optional(),
  endDate: dateStringSchema.optional(),
  priority: z.enum(['high', 'medium', 'low']).optional(),
});

// 项目更新验证
export const updateProjectSchema = createProjectSchema.partial();

// 线索创建验证
export const createLeadSchema = z.object({
  customerName: z.string().min(1, '客户名称不能为空').max(200),
  contactName: z.string().min(1, '联系人不能为空').max(50),
  contactPhone: phoneSchema,
  contactEmail: emailSchema.optional().or(z.literal('')),
  demandType: z.string().max(50).optional(),
  region: z.string().max(50).optional(),
  intentLevel: z.enum(['high', 'medium', 'low']).optional(),
  description: z.string().max(2000).optional(),
  estimatedAmount: amountSchema.optional(),
  estimatedDate: dateStringSchema.optional(),
});

// 线索更新验证
export const updateLeadSchema = createLeadSchema.partial();

// 用户创建验证
export const createUserSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
  realName: realNameSchema,
  email: emailSchema,
  phone: phoneSchema.optional().or(z.literal('')),
  department: z.string().max(50).optional(),
  roleId: idSchema.optional(),
  status: statusSchema.optional(),
});

// 用户更新验证
export const updateUserSchema = z.object({
  realName: realNameSchema.optional(),
  email: emailSchema.optional(),
  phone: phoneSchema.optional().or(z.literal('')),
  department: z.string().max(50).optional(),
  roleId: idSchema.optional(),
  status: statusSchema.optional(),
  avatar: z.string().max(255).optional(),
});

// 密码修改验证
export const changePasswordSchema = z.object({
  oldPassword: loginPasswordSchema,
  newPassword: passwordSchema,
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: '两次输入的密码不一致',
  path: ['confirmPassword'],
});

// 登录验证
export const loginSchema = z.object({
  username: z.string().min(1, '请输入用户名'),
  password: loginPasswordSchema,
});

// 角色创建验证
export const createRoleSchema = z.object({
  roleName: z.string().min(1, '角色名称不能为空').max(50),
  roleCode: z.string()
    .min(1, '角色编码不能为空')
    .max(50)
    .regex(/^[a-z_]+$/, '角色编码只能包含小写字母和下划线'),
  description: z.string().max(500).optional(),
  permissions: z.array(z.string()).optional(),
  status: statusSchema.optional(),
});

// 角色更新验证
export const updateRoleSchema = createRoleSchema.partial().omit({ roleCode: true });

// 解决方案创建验证
export const createSolutionSchema = z.object({
  title: z.string().min(1, '标题不能为空').max(200),
  category: z.string().max(50).optional(),
  tags: z.array(z.string()).optional(),
  summary: z.string().max(500).optional(),
  content: z.string().min(1, '内容不能为空'),
  attachments: z.array(z.string()).optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
});

// 跟进记录验证
export const createFollowRecordSchema = z.object({
  projectId: idSchema,
  followContent: z.string().min(1, '跟进内容不能为空').max(2000),
  followTime: z.string().refine(val => !isNaN(Date.parse(val)), '无效的日期时间'),
  nextRemindTime: z.string().optional(),
  outcome: z.string().max(50).optional(),
});

// =====================================================
// 分页查询验证
// =====================================================

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().max(100).optional(),
  sortBy: z.string().max(50).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

// =====================================================
// 批量操作验证
// =====================================================

export const batchDeleteSchema = z.object({
  ids: z.array(idSchema).min(1, '请选择要删除的记录').max(100, '一次最多删除100条记录'),
});

export const batchUpdateSchema = z.object({
  ids: z.array(idSchema).min(1, '请选择要更新的记录').max(100, '一次最多更新100条记录'),
  data: z.record(z.string(), z.unknown()),
});

// =====================================================
// 验证工具函数
// =====================================================

export type ValidationResult<T> = 
  | { success: true; data: T }
  | { success: false; errors: Array<{ field: string; message: string }> };

/**
 * 验证数据
 */
export function validate<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): ValidationResult<T> {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors = result.error.issues.map(err => ({
    field: err.path.join('.'),
    message: err.message,
  }));

  return { success: false, errors };
}

/**
 * 验证单个字段
 */
export function validateField(
  schema: z.ZodSchema,
  value: unknown
): string | null {
  const result = schema.safeParse(value);
  return result.success ? null : result.error.issues[0]?.message || '验证失败';
}

/**
 * 创建安全的解析器
 */
export function createSafeParser<T>(schema: z.ZodSchema<T>) {
  return (data: unknown): ValidationResult<T> => validate(schema, data);
}

// =====================================================
// XSS防护
// =====================================================

/**
 * 转义HTML特殊字符
 */
export function escapeHtml(str: string): string {
  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };

  return str.replace(/[&<>"'/]/g, char => htmlEntities[char] || char);
}

/**
 * 清理HTML标签
 */
export function stripHtml(str: string): string {
  return str.replace(/<[^>]*>/g, '');
}

/**
 * 清理用户输入
 */
export function sanitizeInput(str: string): string {
  return sanitizePlainText(str);
}

/**
 * 清理对象中的字符串字段
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      result[key] = sanitizeInput(value);
    } else if (typeof value === 'object' && value !== null) {
      result[key] = sanitizeObject(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }

  return result as T;
}

// =====================================================
// 表单验证工具函数（返回 { valid, message } 格式）
// =====================================================

export interface FieldValidationResult {
  valid: boolean;
  message: string;
}

/**
 * 验证字符串长度
 * @param value 要验证的字符串
 * @param minLength 最小长度
 * @param maxLength 最大长度
 * @param fieldName 字段名称（用于错误消息）
 */
export function validateLength(
  value: string,
  minLength: number,
  maxLength: number,
  fieldName: string = '字段'
): FieldValidationResult {
  if (typeof value !== 'string') {
    return { valid: false, message: `${fieldName}格式错误` };
  }
  const len = value.trim().length;
  if (len === 0) {
    return { valid: false, message: `${fieldName}不能为空` };
  }
  if (len < minLength) {
    return { valid: false, message: `${fieldName}长度不能少于${minLength}个字符` };
  }
  if (len > maxLength) {
    return { valid: false, message: `${fieldName}长度不能超过${maxLength}个字符` };
  }
  return { valid: true, message: '' };
}

/**
 * 验证电话号码（支持手机号和座机号）
 * 支持格式：
 * - 手机号：1[3-9]xxxxxxxxx（11位）
 * - 座机号：010-12345678、0755-87654321
 * - 带分机：010-12345678-123、0755-87654321-5678
 * - 无区号：12345678（7-8位）
 * - 区号带括号：(010)12345678
 */
export function validatePhone(value: string): FieldValidationResult {
  if (!value || value.trim() === '') {
    return { valid: true, message: '' }; // 空值视为有效（可选字段）
  }
  
  const trimmedValue = value.trim();
  
  // 手机号：1[3-9]开头的11位数字
  const mobileRegex = /^1[3-9]\d{9}$/;
  
  // 座机号：
  // - 区号(3-4位)-号码(7-8位)[-分机号(1-6位)]
  // - (区号)号码
  // - 纯数字7-8位
  const landlineRegex = /^(\d{3,4}-)?\d{7,8}(-\d{1,6})?$/;
  const landlineWithBracketsRegex = /^\(\d{3,4}\)\d{7,8}$/;
  
  // 支持带国家代码：+86-xxx 或 86-xxx
  const withCountryCodeRegex = /^(\+?86-)?(\d{3,4}-)?\d{7,8}(-\d{1,6})?$/;
  
  if (
    mobileRegex.test(trimmedValue) ||
    landlineRegex.test(trimmedValue) ||
    landlineWithBracketsRegex.test(trimmedValue) ||
    withCountryCodeRegex.test(trimmedValue)
  ) {
    return { valid: true, message: '' };
  }
  
  return { valid: false, message: '请输入有效的电话号码（支持手机号或座机号）' };
}

/**
 * 验证邮箱
 */
export function validateEmail(value: string): FieldValidationResult {
  if (!value || value.trim() === '') {
    return { valid: true, message: '' }; // 空值视为有效（可选字段）
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(value.trim())) {
    return { valid: false, message: '请输入有效的邮箱地址' };
  }
  return { valid: true, message: '' };
}

/**
 * 验证金额
 */
export function validateAmount(value: string | number | null | undefined): FieldValidationResult {
  if (value === null || value === undefined || value === '') {
    return { valid: true, message: '' }; // 空值视为有效（可选字段）
  }
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(numValue)) {
    return { valid: false, message: '请输入有效的金额' };
  }
  if (numValue < 0) {
    return { valid: false, message: '金额不能为负数' };
  }
  if (numValue > 999999999999.99) {
    return { valid: false, message: '金额超出范围' };
  }
  return { valid: true, message: '' };
}

/**
 * 验证日期范围
 */
export function validateDateRange(
  startDate: string | Date | null | undefined,
  endDate: string | Date | null | undefined,
  fieldNames?: { start: string; end: string } | string,
  endFieldName?: string
): FieldValidationResult {
  // 解析字段名称
  let startFieldName = '开始日期';
  let endFieldNameResolved = '结束日期';
  
  if (typeof fieldNames === 'object') {
    startFieldName = fieldNames.start;
    endFieldNameResolved = fieldNames.end;
  } else if (typeof fieldNames === 'string') {
    startFieldName = fieldNames;
    endFieldNameResolved = endFieldName || '结束日期';
  }
  
  // 如果任一为空，则跳过验证
  if (!startDate && !endDate) {
    return { valid: true, message: '' };
  }
  
  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;
  
  // 验证日期有效性
  if (startDate && isNaN(start!.getTime())) {
    return { valid: false, message: `${startFieldName}格式无效` };
  }
  if (endDate && isNaN(end!.getTime())) {
    return { valid: false, message: `${endFieldNameResolved}格式无效` };
  }
  
  // 如果两者都有值，验证范围
  if (start && end && start > end) {
    return { valid: false, message: `${startFieldName}不能晚于${endFieldNameResolved}` };
  }
  
  return { valid: true, message: '' };
}

/**
 * 验证必填字段
 */
export function validateRequired(
  value: unknown,
  fieldName: string = '字段'
): FieldValidationResult {
  if (value === null || value === undefined) {
    return { valid: false, message: `${fieldName}不能为空` };
  }
  if (typeof value === 'string' && value.trim() === '') {
    return { valid: false, message: `${fieldName}不能为空` };
  }
  if (Array.isArray(value) && value.length === 0) {
    return { valid: false, message: `${fieldName}不能为空` };
  }
  return { valid: true, message: '' };
}

/**
 * 验证正整数
 */
export function validatePositiveInt(
  value: number | string | null | undefined,
  fieldName: string = '字段'
): FieldValidationResult {
  if (value === null || value === undefined || value === '') {
    return { valid: true, message: '' }; // 空值视为有效（可选字段）
  }
  const num = typeof value === 'string' ? parseInt(value, 10) : value;
  if (isNaN(num) || !Number.isInteger(num) || num <= 0) {
    return { valid: false, message: `${fieldName}必须是正整数` };
  }
  return { valid: true, message: '' };
}
