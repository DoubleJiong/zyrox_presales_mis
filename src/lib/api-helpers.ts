import { checkDatabaseConnection, USE_MOCK_DATA } from '@/db';

// 快速API响应辅助函数
// 如果数据库不可用或配置为Mock模式，立即返回Mock数据
export async function withFastFallback<T>(
  dbQuery: () => Promise<T>,
  mockData: T,
  logContext: string
): Promise<T> {
  // 如果配置为强制使用Mock数据，直接返回
  if (USE_MOCK_DATA) {
    return mockData;
  }

  // 快速检查数据库连接（500ms超时）
  const isDbAvailable = await checkDatabaseConnection();

  if (!isDbAvailable) {
    return mockData;
  }

  try {
    // 尝试执行数据库查询（设置3秒超时）
    const result = await Promise.race([
      dbQuery(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Query timeout')), 3000)
      ),
    ]);
    return result;
  } catch (error) {
    // 静默失败，返回Mock数据
    return mockData;
  }
}
