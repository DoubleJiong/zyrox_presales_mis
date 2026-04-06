/**
 * 幂等性键存储表迁移脚本
 * 
 * 使用方法：
 * 1. 确保数据库连接正常
 * 2. 运行此脚本创建表
 * 
 * 注意：此表是可选的，如果表不存在，系统会自动降级到内存缓存模式
 */

import { db } from '../index';
import { sql } from 'drizzle-orm';

export async function createIdempotencyKeysTable() {
  try {
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
    
    console.log('✅ idempotency_keys table created successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to create idempotency_keys table:', error);
    return false;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  createIdempotencyKeysTable()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

export default createIdempotencyKeysTable;
