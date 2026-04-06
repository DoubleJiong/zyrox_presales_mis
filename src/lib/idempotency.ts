/**
 * 幂等性工具
 * 用于防止重复提交和保证关键操作的幂等性
 */

import { db } from '@/db';
import { sql } from 'drizzle-orm';

/**
 * 幂等性键存储表
 * 使用内存缓存 + 数据库双重保障
 */
interface IdempotencyRecord {
  key: string;
  response: string;
  createdAt: Date;
}

// 内存缓存（生产环境应使用 Redis）
const idempotencyCache = new Map<string, { response: string; expiresAt: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24小时
let idempotencyTableReady = false;
let ensureTablePromise: Promise<void> | null = null;

function isMissingIdempotencyTableError(error: unknown): boolean {
  const candidate = error as { code?: string; message?: string; cause?: { code?: string; message?: string } };
  if (candidate?.code === '42P01' || candidate?.cause?.code === '42P01') {
    return true;
  }

  const message = candidate?.message || candidate?.cause?.message || '';
  return message.includes('idempotency_keys') && message.includes('does not exist');
}

async function ensureIdempotencyKeysTable(): Promise<void> {
  if (idempotencyTableReady) {
    return;
  }

  if (!ensureTablePromise) {
    ensureTablePromise = (async () => {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS idempotency_keys (
          key VARCHAR(255) PRIMARY KEY,
          response TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_idempotency_keys_created_at
        ON idempotency_keys (created_at)
      `);
      idempotencyTableReady = true;
    })().finally(() => {
      ensureTablePromise = null;
    });
  }

  await ensureTablePromise;
}

async function fetchIdempotencyRecord(key: string): Promise<IdempotencyRecord | null> {
  const result = await db.execute(sql`
    SELECT response, created_at
    FROM idempotency_keys
    WHERE key = ${key}
    AND created_at > NOW() - INTERVAL '24 hours'
  `) as unknown as { rows: IdempotencyRecord[] };

  if (result.rows && result.rows.length > 0) {
    return result.rows[0];
  }

  return null;
}

async function persistIdempotencyRecord(key: string, response: string): Promise<void> {
  await db.execute(sql`
    INSERT INTO idempotency_keys (key, response, created_at)
    VALUES (${key}, ${response}, NOW())
    ON CONFLICT (key) DO UPDATE SET response = ${response}, created_at = NOW()
  `);
}

async function deleteExpiredIdempotencyRecords(): Promise<void> {
  await db.execute(sql`
    DELETE FROM idempotency_keys
    WHERE created_at < NOW() - INTERVAL '24 hours'
  `);
}

/**
 * 生成幂等性键
 * @param resourceType 资源类型（如 'customer', 'project'）
 * @param userId 用户ID
 * @param operation 操作类型（如 'create', 'update'）
 * @param uniqueKey 业务唯一键（如客户名称、项目编号等）
 */
export function generateIdempotencyKey(
  resourceType: string,
  userId: number,
  operation: string,
  uniqueKey: string
): string {
  const normalizedKey = uniqueKey.toLowerCase().trim();
  return `${resourceType}:${userId}:${operation}:${normalizedKey}`;
}

/**
 * 检查幂等性键是否存在
 * @param key 幂等性键
 * @returns 如果存在，返回之前的响应；否则返回 null
 */
export async function checkIdempotencyKey(key: string): Promise<string | null> {
  // 1. 先检查内存缓存
  const cached = idempotencyCache.get(key);
  if (cached) {
    if (Date.now() < cached.expiresAt) {
      return cached.response;
    }
    // 已过期，删除缓存
    idempotencyCache.delete(key);
  }

  // 2. 检查数据库（如果有持久化需求）
  try {
    const record = await fetchIdempotencyRecord(key);
    return record?.response || null;
  } catch (error) {
    if (isMissingIdempotencyTableError(error)) {
      try {
        await ensureIdempotencyKeysTable();
        const recoveredRecord = await fetchIdempotencyRecord(key);
        return recoveredRecord?.response || null;
      } catch (recoveryError) {
        console.warn('Idempotency key check recovery failed:', recoveryError);
      }
    }

    console.warn('Idempotency key check failed:', error);
  }

  return null;
}

/**
 * 存储幂等性键和响应
 * @param key 幂等性键
 * @param response 响应数据（JSON字符串）
 */
export async function storeIdempotencyKey(key: string, response: string): Promise<void> {
  // 1. 存储到内存缓存
  idempotencyCache.set(key, {
    response,
    expiresAt: Date.now() + CACHE_TTL,
  });

  // 2. 异步存储到数据库（不阻塞主流程）
  setImmediate(async () => {
    try {
      await persistIdempotencyRecord(key, response);
    } catch (error) {
      if (isMissingIdempotencyTableError(error)) {
        try {
          await ensureIdempotencyKeysTable();
          await persistIdempotencyRecord(key, response);
          return;
        } catch (recoveryError) {
          console.warn('Idempotency key storage recovery failed:', recoveryError);
        }
      }

      console.warn('Idempotency key storage failed:', error);
    }
  });
}

/**
 * 清理过期的幂等性键
 */
export async function cleanupExpiredIdempotencyKeys(): Promise<void> {
  // 清理内存缓存
  const now = Date.now();
  for (const [key, value] of idempotencyCache.entries()) {
    if (now >= value.expiresAt) {
      idempotencyCache.delete(key);
    }
  }

  // 清理数据库
  try {
    await deleteExpiredIdempotencyRecords();
  } catch (error) {
    if (isMissingIdempotencyTableError(error)) {
      try {
        await ensureIdempotencyKeysTable();
        await deleteExpiredIdempotencyRecords();
        return;
      } catch (recoveryError) {
        console.warn('Idempotency key cleanup recovery failed:', recoveryError);
      }
    }

    console.warn('Idempotency key cleanup failed:', error);
  }
}

/**
 * 幂等性装饰器
 * 用于包装异步函数，实现自动幂等性检查
 * 
 * @example
 * ```ts
 * const createCustomerWithIdempotency = withIdempotency(
 *   async (data: CustomerData) => {
 *     // 创建客户逻辑
 *     return { id: 1, ...data };
 *   },
 *   (data) => generateIdempotencyKey('customer', data.userId, 'create', data.name)
 * );
 * ```
 */
export function withIdempotency<T, R>(
  fn: (data: T) => Promise<R>,
  keyGenerator: (data: T) => string
): (data: T) => Promise<R> {
  return async (data: T): Promise<R> => {
    const key = keyGenerator(data);
    
    // 检查是否存在
    const existingResponse = await checkIdempotencyKey(key);
    if (existingResponse) {
      return JSON.parse(existingResponse) as R;
    }
    
    // 执行操作
    const result = await fn(data);
    
    // 存储结果
    await storeIdempotencyKey(key, JSON.stringify(result));
    
    return result;
  };
}

/**
 * 乐观锁版本控制
 * 用于防止并发更新冲突
 */
export class OptimisticLock {
  /**
   * 生成版本号
   */
  static generateVersion(): number {
    return Date.now();
  }

  /**
   * 验证版本号
   * @param currentVersion 当前数据的版本号
   * @param clientVersion 客户端提供的版本号
   */
  static validateVersion(currentVersion: number | null, clientVersion: number | null): boolean {
    // 如果没有版本号，允许更新（向后兼容）
    if (currentVersion === null || clientVersion === null) {
      return true;
    }
    
    return currentVersion === clientVersion;
  }

  /**
   * 创建版本冲突错误响应
   */
  static createConflictError(resourceType: string) {
    return {
      error: 'VERSION_CONFLICT',
      message: `${resourceType}已被其他用户修改，请刷新后重试`,
      shouldRefresh: true,
    };
  }
}

/**
 * 防重复提交中间件
 * 用于短时间内防止同一用户重复提交相同请求
 */
export class DuplicateSubmissionGuard {
  private static submissions = new Map<string, { timestamp: number; promise: Promise<any> }>();
  private static WINDOW_MS = 5000; // 5秒防重窗口

  /**
   * 执行防重复提交的操作
   * @param key 唯一标识
   * @param fn 要执行的函数
   * @returns 函数执行结果
   */
  static async execute<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const now = Date.now();
    const existing = this.submissions.get(key);

    // 如果在防重窗口内且之前请求还在执行，返回之前的Promise
    if (existing && now - existing.timestamp < this.WINDOW_MS) {
      return existing.promise as Promise<T>;
    }

    // 执行新请求
    const promise = fn();
    this.submissions.set(key, { timestamp: now, promise });

    try {
      const result = await promise;
      return result;
    } finally {
      // 清理过期的记录
      this.cleanup(now);
    }
  }

  /**
   * 清理过期记录
   */
  private static cleanup(now: number): void {
    for (const [key, value] of this.submissions.entries()) {
      if (now - value.timestamp > this.WINDOW_MS) {
        this.submissions.delete(key);
      }
    }
  }
}
