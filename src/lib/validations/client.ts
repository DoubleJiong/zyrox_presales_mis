/**
 * 前端验证工具
 * 导入后端验证规则，在客户端进行预验证
 * 
 * 使用方式：
 * import { validateForm, CUSTOMER_VALIDATION_RULES } from '@/lib/validations/client';
 * 
 * const result = validateForm(formData, CUSTOMER_VALIDATION_RULES);
 * if (!result.valid) {
 *   console.log(result.errors);
 * }
 */

// 重新导出所有验证规则和函数
export * from './index';

/**
 * 表单字段验证钩子（用于React组件）
 */
export function useFieldValidation<T>(rules: Record<string, any>) {
  const validateField = (field: string, value: unknown): string | null => {
    const rule = rules[field];
    if (!rule) return null;

    // 必填验证
    if (rule.required) {
      if (value === undefined || value === null || value === '') {
        return `${rule.label}为必填项`;
      }
      if (typeof value === 'string' && value.trim() === '') {
        return `${rule.label}不能为空或仅包含空白字符`;
      }
    }

    // 字符串长度验证
    if (typeof value === 'string' && value) {
      if (rule.minLength && value.length < rule.minLength) {
        return `${rule.label}长度不能少于${rule.minLength}个字符`;
      }
      if (rule.maxLength && value.length > rule.maxLength) {
        return `${rule.label}长度不能超过${rule.maxLength}个字符`;
      }
    }

    // 数字范围验证
    if ((rule.type === 'amount' || rule.type === 'progress' || rule.type === 'winRate') && value !== undefined && value !== null && value !== '') {
      const num = typeof value === 'string' ? parseFloat(value) : (typeof value === 'number' ? value : NaN);
      if (isNaN(num)) {
        return `${rule.label}必须是有效的数字`;
      }
      
      if (rule.type === 'amount') {
        if (num < 0) return `${rule.label}不能为负数`;
        if (num > 10_000_000_000) return `${rule.label}不能超过100亿`;
      }
      
      if (rule.type === 'progress' || rule.type === 'winRate') {
        if (num < 0 || num > 100) return `${rule.label}必须在0-100之间`;
      }
    }

    // 邮箱格式验证
    if (rule.format === 'email' && value) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(String(value))) {
        return '邮箱格式不正确';
      }
    }

    // 手机号格式验证
    if (rule.format === 'phone' && value) {
      const phoneRegex = /^1[3-9]\d{9}$/;
      if (!phoneRegex.test(String(value))) {
        return '手机号格式不正确（需要11位大陆手机号）';
      }
    }

    // 枚举验证
    if (rule.enum && value) {
      if (!rule.enum.includes(value)) {
        return `无效的${rule.label}`;
      }
    }

    return null;
  };

  return { validateField };
}

/**
 * 表单实时验证辅助函数
 * 用于在表单输入时进行即时验证
 */
export function validateFormOnBlur<T extends Record<string, any>>(
  data: T,
  rules: Record<string, any>,
  touched: Set<string>
): Record<string, string> {
  const errors: Record<string, string> = {};
  
  for (const field of touched) {
    const value = data[field];
    const rule = rules[field];
    
    if (rule) {
      const { validateRequired, validateLength, validateEmail, validatePhone, validateEnum } = require('./index');
      
      // 必填验证
      if (rule.required) {
        const error = validateRequired(value, rule.label);
        if (error) {
          errors[field] = error;
          continue;
        }
      }
      
      // 其他验证...
    }
  }
  
  return errors;
}
