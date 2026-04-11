// 数据库配置
// 使用真实 PostgreSQL 数据库

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { getEnv } from '@/shared/config/env';

const { DATABASE_URL } = getEnv();

type PostgresClient = ReturnType<typeof postgres>;

declare global {
  var __presalesPostgresClient__: PostgresClient | undefined;
  var __presalesDrizzleDb__:
    | ReturnType<typeof drizzle<typeof schema>>
    | undefined;
}

function createClient(): PostgresClient {
  return postgres(DATABASE_URL, {
    // 在 next dev 热重载下复用全局连接池，避免不断创建新客户端把数据库打满。
    max: 5,
    connect_timeout: 15,
    idle_timeout: 30,
    max_lifetime: 60 * 60,
    prepare: false,
    fetch_types: false,
    onnotice: () => {},
    onclose: () => {},
    debug: false,
  });
}

export const client = globalThis.__presalesPostgresClient__ ?? createClient();
globalThis.__presalesPostgresClient__ = client;

export const db = globalThis.__presalesDrizzleDb__ ?? drizzle(client, { schema });
globalThis.__presalesDrizzleDb__ = db;

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
