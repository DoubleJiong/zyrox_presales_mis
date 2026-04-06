// 数据库配置
// 使用真实 PostgreSQL 数据库

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { getEnv } from '@/shared/config/env';

const { DATABASE_URL } = getEnv();

// 优化的连接池配置
const client = postgres(DATABASE_URL, {
  // 连接池大小配置
  max: 20,                    // 最大连接数（增加以处理更多并发）
  
  // 超时配置
  connect_timeout: 15,        // 连接超时（秒）- 适当增加
  idle_timeout: 30,           // 空闲连接超时（秒）- 增加以减少重连
  max_lifetime: 60 * 60,      // 连接最大生命周期（1小时）
  
  // 性能优化
  prepare: false,             // 禁用预处理语句（解决某些环境兼容性问题）
  fetch_types: false,         // 禁用类型获取（减少启动时间）
  
  // 错误处理
  onnotice: () => {},         // 忽略 NOTICE 消息
  onclose: () => {},          // 连接关闭回调
  
  // 调试（生产环境关闭）
  debug: false,
});

export const db = drizzle(client, { schema });

// 检测数据库是否可用
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    const result = await Promise.race([
      client`SELECT 1`,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Connection timeout')), 8000)
      ),
    ]);
    return true;
  } catch (error) {
    console.error('Database connection check failed:', error);
    return false;
  }
}

// 获取连接池状态
export function getPoolStatus() {
  // 使用类型断言访问 postgres.js 内部属性
  const p = client as unknown as {
    totalCount?: number;
    idleCount?: number;
    waitingCount?: number;
  };
  return {
    total: p.totalCount ?? 0,
    idle: p.idleCount ?? 0,
    waiting: p.waitingCount ?? 0,
  };
}

// 环境变量：是否使用Mock数据模式（默认为 false，使用真实数据库）
export const USE_MOCK_DATA = false;

export * from './schema';
