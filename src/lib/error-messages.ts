/**
 * 统一错误提示信息系统
 * 提供用户友好的错误消息，包含：
 * 1. 错误码到用户友好消息的映射
 * 2. 错误上下文信息
 * 3. 解决方案建议
 */

// 错误类型定义
export type ErrorCode =
  // 通用错误
  | 'UNKNOWN_ERROR'
  | 'INTERNAL_ERROR'
  | 'SERVICE_UNAVAILABLE'
  // 认证授权错误
  | 'UNAUTHORIZED'
  | 'TOKEN_EXPIRED'
  | 'TOKEN_INVALID'
  | 'FORBIDDEN'
  | 'PERMISSION_DENIED'
  // 资源错误
  | 'NOT_FOUND'
  | 'RESOURCE_NOT_FOUND'
  | 'RESOURCE_DELETED'
  // 请求错误
  | 'BAD_REQUEST'
  | 'INVALID_PARAMS'
  | 'MISSING_REQUIRED_FIELD'
  | 'INVALID_FORMAT'
  | 'VALUE_OUT_OF_RANGE'
  // 业务逻辑错误
  | 'CONFLICT'
  | 'DUPLICATE_ENTRY'
  | 'VERSION_CONFLICT'
  | 'STATE_CONFLICT'
  | 'BUSINESS_RULE_VIOLATION'
  // 数据验证错误
  | 'VALIDATION_ERROR'
  | 'INVALID_EMAIL'
  | 'INVALID_PHONE'
  | 'INVALID_DATE'
  | 'INVALID_AMOUNT'
  | 'INVALID_ENUM_VALUE'
  // 操作限制
  | 'RATE_LIMIT_EXCEEDED'
  | 'OPERATION_TOO_FREQUENT'
  | 'CONCURRENT_MODIFICATION'
  // 关联数据错误
  | 'FOREIGN_KEY_VIOLATION'
  | 'HAS_DEPENDENT_RESOURCES'
  | 'CIRCULAR_REFERENCE'
  // 文件错误
  | 'FILE_TOO_LARGE'
  | 'INVALID_FILE_TYPE'
  | 'UPLOAD_FAILED';

// 错误消息映射
export const ERROR_MESSAGES: Record<ErrorCode, {
  message: string;
  suggestion?: string;
  severity: 'error' | 'warning' | 'info';
}> = {
  // 通用错误
  UNKNOWN_ERROR: {
    message: '发生了未知错误',
    suggestion: '请稍后重试，如果问题持续存在，请联系技术支持',
    severity: 'error',
  },
  INTERNAL_ERROR: {
    message: '服务器内部错误',
    suggestion: '请稍后重试，如果问题持续存在，请联系技术支持',
    severity: 'error',
  },
  SERVICE_UNAVAILABLE: {
    message: '服务暂时不可用',
    suggestion: '系统正在维护中，请稍后再试',
    severity: 'warning',
  },

  // 认证授权错误
  UNAUTHORIZED: {
    message: '请先登录',
    suggestion: '您的登录已过期，请重新登录',
    severity: 'warning',
  },
  TOKEN_EXPIRED: {
    message: '登录已过期',
    suggestion: '请重新登录以继续操作',
    severity: 'warning',
  },
  TOKEN_INVALID: {
    message: '登录状态无效',
    suggestion: '请清除浏览器缓存后重新登录',
    severity: 'warning',
  },
  FORBIDDEN: {
    message: '没有权限执行此操作',
    suggestion: '如果您认为这是错误，请联系管理员申请相应权限',
    severity: 'error',
  },
  PERMISSION_DENIED: {
    message: '权限不足',
    suggestion: '您需要更高的权限才能执行此操作，请联系管理员',
    severity: 'error',
  },

  // 资源错误
  NOT_FOUND: {
    message: '请求的资源不存在',
    suggestion: '请检查资源ID是否正确，或资源可能已被删除',
    severity: 'error',
  },
  RESOURCE_NOT_FOUND: {
    message: '未找到指定资源',
    suggestion: '该资源可能已被删除或您没有访问权限',
    severity: 'error',
  },
  RESOURCE_DELETED: {
    message: '该资源已被删除',
    suggestion: '该资源已被删除，请刷新页面查看最新数据',
    severity: 'warning',
  },

  // 请求错误
  BAD_REQUEST: {
    message: '请求参数有误',
    suggestion: '请检查输入内容是否符合要求',
    severity: 'error',
  },
  INVALID_PARAMS: {
    message: '参数验证失败',
    suggestion: '请检查输入内容是否正确',
    severity: 'error',
  },
  MISSING_REQUIRED_FIELD: {
    message: '缺少必填字段',
    suggestion: '请填写所有必填项后重试',
    severity: 'error',
  },
  INVALID_FORMAT: {
    message: '格式不正确',
    suggestion: '请按照正确的格式输入',
    severity: 'error',
  },
  VALUE_OUT_OF_RANGE: {
    message: '数值超出允许范围',
    suggestion: '请输入在允许范围内的数值',
    severity: 'error',
  },

  // 业务逻辑错误
  CONFLICT: {
    message: '操作冲突',
    suggestion: '数据已被修改，请刷新后重试',
    severity: 'error',
  },
  DUPLICATE_ENTRY: {
    message: '数据已存在',
    suggestion: '该名称或编号已被使用，请使用不同的值',
    severity: 'error',
  },
  VERSION_CONFLICT: {
    message: '数据版本冲突',
    suggestion: '数据已被其他用户修改，请刷新页面查看最新数据后重试',
    severity: 'warning',
  },
  STATE_CONFLICT: {
    message: '状态不允许此操作',
    suggestion: '当前状态不允许执行此操作，请检查数据状态',
    severity: 'error',
  },
  BUSINESS_RULE_VIOLATION: {
    message: '违反业务规则',
    suggestion: '请检查操作是否符合业务规则要求',
    severity: 'error',
  },

  // 数据验证错误
  VALIDATION_ERROR: {
    message: '数据验证失败',
    suggestion: '请检查输入内容是否符合要求',
    severity: 'error',
  },
  INVALID_EMAIL: {
    message: '邮箱格式不正确',
    suggestion: '请输入有效的邮箱地址，如：example@email.com',
    severity: 'error',
  },
  INVALID_PHONE: {
    message: '手机号格式不正确',
    suggestion: '请输入11位大陆手机号',
    severity: 'error',
  },
  INVALID_DATE: {
    message: '日期格式不正确',
    suggestion: '请选择有效的日期',
    severity: 'error',
  },
  INVALID_AMOUNT: {
    message: '金额格式不正确',
    suggestion: '请输入有效的金额，且不能为负数',
    severity: 'error',
  },
  INVALID_ENUM_VALUE: {
    message: '选项值无效',
    suggestion: '请从下拉列表中选择有效的选项',
    severity: 'error',
  },

  // 操作限制
  RATE_LIMIT_EXCEEDED: {
    message: '操作过于频繁',
    suggestion: '请稍后再试',
    severity: 'warning',
  },
  OPERATION_TOO_FREQUENT: {
    message: '请勿重复操作',
    suggestion: '您的操作已提交，请等待处理完成',
    severity: 'warning',
  },
  CONCURRENT_MODIFICATION: {
    message: '并发修改冲突',
    suggestion: '数据正在被其他用户修改，请稍后重试',
    severity: 'warning',
  },

  // 关联数据错误
  FOREIGN_KEY_VIOLATION: {
    message: '关联数据不存在',
    suggestion: '请确保关联的数据存在后再试',
    severity: 'error',
  },
  HAS_DEPENDENT_RESOURCES: {
    message: '存在关联数据',
    suggestion: '请先处理关联的数据后再执行此操作',
    severity: 'error',
  },
  CIRCULAR_REFERENCE: {
    message: '存在循环引用',
    suggestion: '不允许创建循环引用关系',
    severity: 'error',
  },

  // 文件错误
  FILE_TOO_LARGE: {
    message: '文件大小超出限制',
    suggestion: '请压缩文件或选择较小的文件',
    severity: 'error',
  },
  INVALID_FILE_TYPE: {
    message: '文件类型不支持',
    suggestion: '请上传支持的文件格式',
    severity: 'error',
  },
  UPLOAD_FAILED: {
    message: '文件上传失败',
    suggestion: '请检查网络连接后重试',
    severity: 'error',
  },
};

/**
 * 获取用户友好的错误消息
 */
export function getErrorMessage(
  code: ErrorCode | string,
  context?: {
    field?: string;
    value?: string;
    resource?: string;
    constraint?: string;
    [key: string]: any;
  }
): {
  code: string;
  message: string;
  suggestion?: string;
  severity: 'error' | 'warning' | 'info';
  details?: Record<string, any>;
} {
  const errorConfig = ERROR_MESSAGES[code as ErrorCode];
  
  if (!errorConfig) {
    return {
      code: 'UNKNOWN_ERROR',
      message: code || '发生了未知错误',
      suggestion: '请稍后重试，如果问题持续存在，请联系技术支持',
      severity: 'error',
    };
  }

  // 根据上下文定制消息
  let message = errorConfig.message;
  let suggestion = errorConfig.suggestion;

  if (context) {
    // 添加字段名称
    if (context.field) {
      message = `${context.field}：${message}`;
    }

    // 添加资源类型
    if (context.resource) {
      message = `${context.resource}${message}`;
    }

    // 添加约束信息
    if (context.constraint) {
      suggestion = `${suggestion}（${context.constraint}）`;
    }
  }

  return {
    code,
    message,
    suggestion,
    severity: errorConfig.severity,
    details: context,
  };
}

/**
 * 将数据库错误转换为用户友好消息
 */
export function translateDatabaseError(error: any): {
  code: ErrorCode;
  message: string;
  suggestion?: string;
} {
  // PostgreSQL 错误码映射
  const pgErrorMap: Record<string, { code: ErrorCode; message: string }> = {
    '23505': { code: 'DUPLICATE_ENTRY', message: '数据已存在，请使用不同的值' },
    '23503': { code: 'FOREIGN_KEY_VIOLATION', message: '关联数据不存在' },
    '23514': { code: 'VALIDATION_ERROR', message: '数据验证失败' },
    '22001': { code: 'VALUE_OUT_OF_RANGE', message: '输入内容过长' },
    '22003': { code: 'VALUE_OUT_OF_RANGE', message: '数值超出范围' },
    '22004': { code: 'INVALID_PARAMS', message: '参数不能为空' },
    '22007': { code: 'INVALID_DATE', message: '日期格式不正确' },
    '22008': { code: 'INVALID_DATE', message: '日期字段溢出' },
    '22P02': { code: 'INVALID_FORMAT', message: '数据格式不正确' },
    'P0001': { code: 'BUSINESS_RULE_VIOLATION', message: '违反业务规则' },
  };

  const pgCode = error.code || error.sqlState;
  if (pgCode && pgErrorMap[pgCode]) {
    return pgErrorMap[pgCode];
  }

  // 默认错误
  return {
    code: 'INTERNAL_ERROR',
    message: '数据库操作失败',
    suggestion: '请稍后重试，如果问题持续存在，请联系技术支持',
  };
}

/**
 * 创建带有字段详情的验证错误
 */
export function createValidationError(
  field: string,
  reason: string,
  value?: any
): {
  code: ErrorCode;
  message: string;
  field: string;
  value?: any;
} {
  return {
    code: 'VALIDATION_ERROR',
    message: `${field}${reason}`,
    field,
    value: value !== undefined ? String(value) : undefined,
  };
}

/**
 * 创建业务规则错误
 */
export function createBusinessError(
  ruleName: string,
  message: string,
  suggestion?: string
): {
  code: ErrorCode;
  message: string;
  suggestion?: string;
  rule: string;
} {
  return {
    code: 'BUSINESS_RULE_VIOLATION',
    message,
    suggestion: suggestion || `请遵守「${ruleName}」业务规则`,
    rule: ruleName,
  };
}

/**
 * 格式化错误响应
 */
export function formatErrorResponse(
  error: any,
  defaultMessage = '操作失败'
): {
  success: false;
  error: {
    code: string;
    message: string;
    suggestion?: string;
    severity: 'error' | 'warning' | 'info';
    details?: any;
  };
} {
  // 如果已经是格式化的错误
  if (error.code && error.message) {
    const errorMsg = getErrorMessage(error.code, error.context);
    return {
      success: false,
      error: errorMsg,
    };
  }

  // 数据库错误
  if (error.code && typeof error.code === 'string' && error.code.length === 5) {
    const dbError = translateDatabaseError(error);
    return {
      success: false,
      error: {
        ...dbError,
        severity: 'error',
      },
    };
  }

  // 通用错误
  return {
    success: false,
    error: {
      code: 'UNKNOWN_ERROR',
      message: error.message || defaultMessage,
      severity: 'error',
    },
  };
}
