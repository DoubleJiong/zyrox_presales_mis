/**
 * API 操作 Toast 工具函数
 *
 * 统一处理 API 响应中的权限错误 vs 业务错误，
 * 避免将"无权限"显示为"操作失败"造成误解。
 */

export interface ApiError {
  code?: string;
  message?: string;
}

export interface ApiErrorToastConfig {
  title: string;
  description: string;
}

/**
 * 根据 API 返回的 error 对象，生成合适的 Toast 配置。
 *
 * @param error  API 响应中的 error 字段（可能是对象或字符串）
 * @param defaultTitle  非权限类错误时使用的标题（如"创建失败"）
 */
export function resolveApiErrorToast(
  error: ApiError | string | null | undefined,
  defaultTitle: string
): ApiErrorToastConfig {
  const code = typeof error === 'object' && error !== null ? error.code : undefined;
  const message =
    typeof error === 'object' && error !== null
      ? error.message
      : typeof error === 'string'
      ? error
      : undefined;

  if (code === 'FORBIDDEN' || code === 'UNAUTHORIZED') {
    return {
      title: '没有访问权限',
      description: message || '您没有权限执行此操作，如需申请权限请联系管理员。',
    };
  }

  return {
    title: defaultTitle,
    description: message || '请稍后重试',
  };
}
