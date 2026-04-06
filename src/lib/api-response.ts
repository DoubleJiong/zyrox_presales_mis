import { NextResponse } from 'next/server';
import { getErrorMessage, translateDatabaseError, type ErrorCode } from './error-messages';

/**
 * API响应格式标准化工具
 * 统一所有API的响应格式，便于前端处理
 */

// 标准响应格式
export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T | null;
  error: {
    code: string;
    message: string;
    details?: unknown;
  } | null;
  meta: {
    timestamp: string;
    requestId?: string;
    duration?: number;
    pagination?: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    };
  };
}

// 分页参数
export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

// 默认分页配置
const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;
const MAX_PAGE = 10000; // BUG-031: 防止超大page值导致性能问题

/**
 * 验证并规范化分页参数
 * 防止负数、非数字等非法参数
 */
export function validatePagination(
  page?: string | number | null,
  pageSize?: string | number | null
): { page: number; pageSize: number; offset: number; valid: boolean; error?: string } {
  let parsedPage = DEFAULT_PAGE;
  let parsedPageSize = DEFAULT_PAGE_SIZE;

  if (page !== undefined && page !== null) {
    parsedPage = typeof page === 'string' ? parseInt(page, 10) : page;
    if (isNaN(parsedPage) || parsedPage < 1) {
      return { page: DEFAULT_PAGE, pageSize: DEFAULT_PAGE_SIZE, offset: 0, valid: false, error: '页码必须是大于0的整数' };
    }
    // BUG-031: 限制超大page值
    if (parsedPage > MAX_PAGE) {
      parsedPage = MAX_PAGE;
    }
  }

  if (pageSize !== undefined && pageSize !== null) {
    parsedPageSize = typeof pageSize === 'string' ? parseInt(pageSize, 10) : pageSize;
    if (isNaN(parsedPageSize) || parsedPageSize < 1) {
      return { page: DEFAULT_PAGE, pageSize: DEFAULT_PAGE_SIZE, offset: 0, valid: false, error: '每页数量必须是大于0的整数' };
    }
    if (parsedPageSize > MAX_PAGE_SIZE) {
      parsedPageSize = MAX_PAGE_SIZE;
    }
  }

  return {
    page: parsedPage,
    pageSize: parsedPageSize,
    offset: (parsedPage - 1) * parsedPageSize,
    valid: true,
  };
}

// 生成请求ID
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// 成功响应
export function successResponse<T>(
  data: T,
  options: {
    status?: number;
    pagination?: {
      page: number;
      pageSize: number;
      total: number;
    };
    duration?: number;
    requestId?: string;
  } = {}
): NextResponse<ApiResponse<T>> {
  const { status = 200, pagination, duration, requestId } = options;

  const meta: ApiResponse['meta'] = {
    timestamp: new Date().toISOString(),
    requestId: requestId || generateRequestId(),
    duration,
  };

  if (pagination) {
    meta.pagination = {
      page: pagination.page,
      pageSize: pagination.pageSize,
      total: pagination.total,
      totalPages: Math.ceil(pagination.total / pagination.pageSize),
    };
  }

  return NextResponse.json(
    {
      success: true,
      data,
      error: null,
      meta,
    },
    { status }
  );
}

// 错误响应
export function errorResponse(
  code: string,
  message: string,
  options: {
    status?: number;
    details?: unknown;
    requestId?: string;
  } = {}
): NextResponse<ApiResponse> {
  const { status = 400, details, requestId } = options;

  return NextResponse.json(
    {
      success: false,
      data: null,
      error: {
        code,
        message,
        details,
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: requestId || generateRequestId(),
      },
    },
    { status }
  );
}

// 分页响应
export function paginatedResponse<T>(
  items: T[],
  total: number,
  params: PaginationParams = {}
): NextResponse<ApiResponse<T[]>> {
  const page = params.page || DEFAULT_PAGE;
  const pageSize = Math.min(params.pageSize || DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);

  return successResponse(items, {
    pagination: { page, pageSize, total },
  });
}

// 验证错误响应
export function validationErrorResponse(
  errors: Array<{ field: string; message: string }>
): NextResponse<ApiResponse> {
  return errorResponse('VALIDATION_ERROR', '数据验证失败', {
    status: 422,
    details: errors,
  });
}

// 未授权响应
export function unauthorizedResponse(
  message = '未授权访问'
): NextResponse<ApiResponse> {
  return errorResponse('UNAUTHORIZED', message, { status: 401 });
}

// 禁止访问响应
export function forbiddenResponse(
  message = '禁止访问'
): NextResponse<ApiResponse> {
  return errorResponse('FORBIDDEN', message, { status: 403 });
}

// 未找到响应
export function notFoundResponse(
  message = '资源不存在'
): NextResponse<ApiResponse> {
  return errorResponse('NOT_FOUND', message, { status: 404 });
}

// 服务器错误响应
export function serverErrorResponse(
  message = '服务器内部错误',
  details?: unknown
): NextResponse<ApiResponse> {
  return errorResponse('INTERNAL_ERROR', message, {
    status: 500,
    details: process.env.NODE_ENV === 'development' ? details : undefined,
  });
}

// 带计时的响应包装器
export async function withTiming<T>(
  operation: string,
  fn: () => Promise<T>
): Promise<{ data: T; duration: number }> {
  const startTime = performance.now();
  
  try {
    const data = await fn();
    const duration = performance.now() - startTime;
    
    // 记录慢操作
    if (duration > 1000) {
      console.warn(`[Slow API] ${operation} took ${duration.toFixed(2)}ms`);
    }
    
    return { data, duration };
  } catch (error) {
    const duration = performance.now() - startTime;
    console.error(`[API Error] ${operation} failed after ${duration.toFixed(2)}ms:`, error);
    throw error;
  }
}

/**
 * 安全提取错误消息
 * 用于处理 API 返回的错误对象，避免在 React 组件中直接渲染对象
 * 
 * @param error - API 返回的错误，可能是字符串、对象或 null
 * @param fallback - 默认错误消息
 * @returns 字符串格式的错误消息
 */
export function extractErrorMessage(
  error: unknown,
  fallback = '操作失败'
): string {
  if (!error) return fallback;
  
  // 如果是字符串，直接返回
  if (typeof error === 'string') return error;
  
  // 如果是对象，尝试提取 message 字段
  if (typeof error === 'object') {
    const errorObj = error as Record<string, unknown>;
    
    // 优先使用 message 字段
    if (typeof errorObj.message === 'string') {
      return errorObj.message;
    }
    
    // 如果有 error 字段，递归处理
    if (errorObj.error) {
      return extractErrorMessage(errorObj.error, fallback);
    }
    
    // 尝试序列化对象（最后的兜底）
    try {
      return JSON.stringify(error);
    } catch {
      return fallback;
    }
  }
  
  return fallback;
}

// 解析分页参数
export function parsePagination(searchParams: URLSearchParams): {
  page: number;
  pageSize: number;
  offset: number;
} {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, parseInt(searchParams.get('pageSize') || '10', 10))
  );
  const offset = (page - 1) * pageSize;

  return { page, pageSize, offset };
}

// 解析排序参数
export function parseSort(
  searchParams: URLSearchParams,
  allowedFields: string[] = []
): {
  sortBy: string;
  sortOrder: 'asc' | 'desc';
} {
  const sortBy = searchParams.get('sortBy') || 'createdAt';
  const sortOrder = (searchParams.get('sortOrder') || 'desc').toLowerCase() as 'asc' | 'desc';

  // 验证排序字段
  if (allowedFields.length > 0 && !allowedFields.includes(sortBy)) {
    return { sortBy: 'createdAt', sortOrder: 'desc' };
  }

  return { sortBy, sortOrder };
}

// ============ 增强的错误响应函数 ============

/**
 * 创建带有用户友好消息的错误响应
 */
export function friendlyErrorResponse(
  code: ErrorCode | string,
  context?: {
    field?: string;
    value?: string;
    resource?: string;
    constraint?: string;
    [key: string]: any;
  },
  options: {
    status?: number;
  } = {}
): NextResponse<ApiResponse> {
  const errorMsg = getErrorMessage(code, context);
  
  // 根据错误码确定HTTP状态码
  let status = options.status;
  if (!status) {
    status = getHttpStatusFromErrorCode(code as ErrorCode);
  }

  return NextResponse.json(
    {
      success: false,
      data: null,
      error: {
        code: errorMsg.code,
        message: errorMsg.message,
        suggestion: errorMsg.suggestion,
        severity: errorMsg.severity,
        details: errorMsg.details,
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: generateRequestId(),
      },
    },
    { status }
  );
}

/**
 * 数据库错误响应
 */
export function databaseErrorResponse(
  error: any,
  fallbackMessage = '数据库操作失败'
): NextResponse<ApiResponse> {
  const dbError = translateDatabaseError(error);
  
  return NextResponse.json(
    {
      success: false,
      data: null,
      error: {
        code: dbError.code,
        message: dbError.message,
        suggestion: dbError.suggestion,
        severity: 'error',
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: generateRequestId(),
      },
    },
    { status: getHttpStatusFromErrorCode(dbError.code) }
  );
}

/**
 * 业务规则错误响应
 */
export function businessRuleErrorResponse(
  ruleName: string,
  message: string,
  suggestion?: string
): NextResponse<ApiResponse> {
  return friendlyErrorResponse(
    'BUSINESS_RULE_VIOLATION',
    {
      constraint: ruleName,
    },
    { status: 422 }
  );
}

/**
 * 版本冲突错误响应
 */
export function versionConflictResponse(
  resourceType: string,
  currentVersion?: number
): NextResponse<ApiResponse> {
  return friendlyErrorResponse(
    'VERSION_CONFLICT',
    {
      resource: resourceType,
    },
    { status: 409 }
  );
}

/**
 * 关联数据错误响应
 */
export function dependentResourcesResponse(
  resourceType: string,
  dependentResources: Array<{ type: string; id: number; name: string }>
): NextResponse<ApiResponse> {
  const resourceNames = dependentResources
    .map(r => `${r.type}: ${r.name}`)
    .join('、');
  
  return friendlyErrorResponse(
    'HAS_DEPENDENT_RESOURCES',
    {
      resource: resourceType,
      constraint: `存在关联数据：${resourceNames}`,
    },
    { status: 409 }
  );
}

/**
 * 根据错误码获取HTTP状态码
 */
function getHttpStatusFromErrorCode(code: ErrorCode): number {
  const statusMap: Record<string, number> = {
    // 400 Bad Request
    BAD_REQUEST: 400,
    INVALID_PARAMS: 400,
    MISSING_REQUIRED_FIELD: 400,
    INVALID_FORMAT: 400,
    VALUE_OUT_OF_RANGE: 400,
    VALIDATION_ERROR: 400,
    INVALID_EMAIL: 400,
    INVALID_PHONE: 400,
    INVALID_DATE: 400,
    INVALID_AMOUNT: 400,
    INVALID_ENUM_VALUE: 400,
    
    // 401 Unauthorized
    UNAUTHORIZED: 401,
    TOKEN_EXPIRED: 401,
    TOKEN_INVALID: 401,
    
    // 403 Forbidden
    FORBIDDEN: 403,
    PERMISSION_DENIED: 403,
    
    // 404 Not Found
    NOT_FOUND: 404,
    RESOURCE_NOT_FOUND: 404,
    RESOURCE_DELETED: 404,
    
    // 409 Conflict
    CONFLICT: 409,
    DUPLICATE_ENTRY: 409,
    VERSION_CONFLICT: 409,
    STATE_CONFLICT: 409,
    CONCURRENT_MODIFICATION: 409,
    HAS_DEPENDENT_RESOURCES: 409,
    
    // 422 Unprocessable Entity
    BUSINESS_RULE_VIOLATION: 422,
    FOREIGN_KEY_VIOLATION: 422,
    
    // 429 Too Many Requests
    RATE_LIMIT_EXCEEDED: 429,
    OPERATION_TOO_FREQUENT: 429,
    
    // 500 Internal Server Error
    UNKNOWN_ERROR: 500,
    INTERNAL_ERROR: 500,
    SERVICE_UNAVAILABLE: 503,
    
    // 400 (文件相关)
    FILE_TOO_LARGE: 400,
    INVALID_FILE_TYPE: 400,
    UPLOAD_FAILED: 400,
  };
  
  return statusMap[code] || 400;
}

/**
 * 批量操作结果响应
 */
export function batchOperationResponse<T>(
  results: Array<{
    id: number;
    success: boolean;
    data?: T;
    error?: { code: string; message: string };
  }>
): NextResponse<ApiResponse<{
  successful: T[];
  failed: Array<{ id: number; error: { code: string; message: string } }>;
  summary: { total: number; successful: number; failed: number };
}>> {
  const successful = results.filter(r => r.success).map(r => r.data as T);
  const failed = results.filter(r => !r.success).map(r => ({
    id: r.id,
    error: r.error!,
  }));
  
  return successResponse({
    successful,
    failed,
    summary: {
      total: results.length,
      successful: successful.length,
      failed: failed.length,
    },
  });
}

// 解析搜索参数
export function parseSearch(searchParams: URLSearchParams): {
  search: string;
  searchFields: string[];
} {
  const search = searchParams.get('search') || '';
  const searchFields = (searchParams.get('searchFields') || '')
    .split(',')
    .filter(Boolean);

  return { search, searchFields };
}
