/**
 * 数据回退工具
 * 当数据库连接失败时，使用临时数据
 */

export interface FallbackOptions {
  fallbackData?: any[];
  shouldFallback?: (error: any) => boolean;
}

/**
 * 执行数据库查询，失败时返回回退数据
 */
export async function withFallback<T>(
  dbQuery: () => Promise<T>,
  options: FallbackOptions = {}
): Promise<T> {
  const { fallbackData, shouldFallback } = options;

  try {
    return await dbQuery();
  } catch (error) {
    console.warn('数据库查询失败，尝试使用回退数据:', error);

    // 检查是否应该回退
    if (shouldFallback && !shouldFallback(error)) {
      throw error;
    }

    // 如果有回退数据，直接返回
    if (fallbackData !== undefined) {
      console.log('使用回退数据');
      return fallbackData as T;
    }

    // 没有回退数据，抛出错误
    throw error;
  }
}

/**
 * 判断是否是数据库连接错误
 */
export function isDatabaseError(error: any): boolean {
  if (!error) return false;

  const errorMessage = error.message || error.toString() || '';

  // 检查常见的数据库错误特征
  const databaseErrorPatterns = [
    'connection', 'timeout', 'connect', 'network',
    'ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND',
    'database', 'db', 'sql', 'query'
  ];

  return databaseErrorPatterns.some(pattern =>
    errorMessage.toLowerCase().includes(pattern.toLowerCase())
  );
}

/**
 * 检查 API 路径，决定是否使用回退数据
 */
export function shouldUseFallback(pathname: string): boolean {
  // 定义应该使用回退数据的 API 路径
  const fallbackPaths = [
    '/api/customers',
    '/api/projects',
    '/api/staff',
    '/api/performances',
    '/api/solutions',
    '/api/dashboard',
  ];

  return fallbackPaths.some(path => pathname.startsWith(path));
}
