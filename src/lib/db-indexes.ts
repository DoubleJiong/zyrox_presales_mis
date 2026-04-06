/**
 * 数据库性能优化 - 索引和查询优化
 * 
 * 本文件包含数据库索引创建脚本和查询优化工具
 * 可以通过 drizzle-kit 或直接执行 SQL 来创建索引
 */

import { sql } from 'drizzle-orm';

// 注意：这些函数需要在有数据库连接的环境中调用
// 这里使用动态导入来避免构建时的依赖问题

// ============ 索引创建脚本 ============

/**
 * 创建数据库索引的 SQL 语句
 * 这些索引可以提高常用查询的性能
 */
export const createIndexSQL = {
  /**
   * 用户表索引
   */
  users: `
    -- 用户邮箱唯一索引
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);
    
    -- 用户状态索引（常用于筛选活跃用户）
    CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
    
    -- 用户部门索引（常用于部门查询）
    CREATE INDEX IF NOT EXISTS idx_users_department_id ON users(department_id);
    
    -- 用户创建时间索引（用于排序和筛选）
    CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);
  `,

  /**
   * 项目表索引
   */
  projects: `
    -- 项目状态索引（常用于筛选）
    CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
    
    -- 项目负责人索引（用于查询负责人的项目）
    CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON projects(owner_id);
    
    -- 项目客户索引（用于查询客户的项目）
    CREATE INDEX IF NOT EXISTS idx_projects_customer_id ON projects(customer_id);
    
    -- 项目创建时间索引
    CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);
    
    -- 项目更新时间索引
    CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON projects(updated_at DESC);
    
    -- 项目预计成交日期索引（用于提醒和报表）
    CREATE INDEX IF NOT EXISTS idx_projects_expected_close_date ON projects(expected_close_date);
    
    -- 项目金额索引（用于排序和筛选）
    CREATE INDEX IF NOT EXISTS idx_projects_amount ON projects(amount DESC);
    
    -- 复合索引：状态+创建时间（用于按状态分组的时间排序）
    CREATE INDEX IF NOT EXISTS idx_projects_status_created ON projects(status, created_at DESC);
  `,

  /**
   * 客户表索引
   */
  customers: `
    -- 客户类型索引
    CREATE INDEX IF NOT EXISTS idx_customers_type ON customers(type);
    
    -- 客户状态索引
    CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
    
    -- 客户所属人索引（用于查询我的客户）
    CREATE INDEX IF NOT EXISTS idx_customers_owner_id ON customers(owner_id);
    
    -- 客户行业索引
    CREATE INDEX IF NOT EXISTS idx_customers_industry ON customers(industry);
    
    -- 客户地区索引
    CREATE INDEX IF NOT EXISTS idx_customers_region ON customers(region);
    
    -- 客户创建时间索引
    CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers(created_at DESC);
    
    -- 全文搜索索引（用于客户名称搜索）
    CREATE INDEX IF NOT EXISTS idx_customers_name_gin ON customers USING gin(to_tsvector('simple', name));
  `,

  /**
   * 待办事项表索引
   */
  todos: `
    -- 待办状态索引
    CREATE INDEX IF NOT EXISTS idx_todos_status ON todos(status);
    
    -- 待办优先级索引
    CREATE INDEX IF NOT EXISTS idx_todos_priority ON todos(priority);
    
    -- 待办分配人索引（用于查询分配给我的待办）
    CREATE INDEX IF NOT EXISTS idx_todos_assignee_id ON todos(assignee_id);
    
    -- 待办创建人索引
    CREATE INDEX IF NOT EXISTS idx_todos_creator_id ON todos(creator_id);
    
    -- 待办截止日期索引（用于提醒和排序）
    CREATE INDEX IF NOT EXISTS idx_todos_due_date ON todos(due_date);
    
    -- 待办关联项目索引
    CREATE INDEX IF NOT EXISTS idx_todos_project_id ON todos(project_id);
    
    -- 复合索引：分配人+状态（用于我的待办列表）
    CREATE INDEX IF NOT EXISTS idx_todos_assignee_status ON todos(assignee_id, status);
    
    -- 复合索引：截止日期+状态（用于即将到期的待办）
    CREATE INDEX IF NOT EXISTS idx_todos_due_status ON todos(due_date, status);
  `,
};

// ============ 索引创建函数 ============

/**
 * 创建数据库索引
 * 这些索引可以提高常用查询的性能
 */
export const createIndexes = {
  /**
   * 用户表索引
   */
  async users(db: { execute: (query: unknown) => Promise<void> }) {
    await db.execute(sql.raw(createIndexSQL.users));
    console.log('[DB] Users indexes created');
  },

  /**
   * 项目表索引
   */
  async projects(db: { execute: (query: unknown) => Promise<void> }) {
    await db.execute(sql.raw(createIndexSQL.projects));
    console.log('[DB] Projects indexes created');
  },

  /**
   * 客户表索引
   */
  async customers(db: { execute: (query: unknown) => Promise<void> }) {
    await db.execute(sql.raw(createIndexSQL.customers));
    console.log('[DB] Customers indexes created');
  },

  /**
   * 待办事项表索引
   */
  async todos(db: { execute: (query: unknown) => Promise<void> }) {
    await db.execute(sql.raw(createIndexSQL.todos));
    console.log('[DB] Todos indexes created');
  },

  /**
   * 创建所有索引
   */
  async all(db: { execute: (query: unknown) => Promise<void> }) {
    console.log('[DB] Creating all indexes...');
    
    try {
      await this.users(db);
      await this.projects(db);
      await this.customers(db);
      await this.todos(db);
      
      console.log('[DB] All indexes created successfully');
    } catch (error) {
      console.error('[DB] Error creating indexes:', error);
      throw error;
    }
  },
};

// ============ 查询优化工具 ============

/**
 * 查询性能分析器
 */
export class QueryAnalyzer {
  /**
   * 分析查询执行计划
   */
  static async explain(db: { execute: (query: unknown) => Promise<{ rows: unknown[] }> }, query: string): Promise<unknown[]> {
    const result = await db.execute(sql.raw(`EXPLAIN ANALYZE ${query}`));
    return result.rows;
  }

  /**
   * 检查慢查询
   */
  static async findSlowQueries(db: { execute: (query: unknown) => Promise<{ rows: unknown[] }> }): Promise<unknown[]> {
    const result = await db.execute(sql`
      SELECT 
        query,
        calls,
        total_time,
        mean_time,
        max_time
      FROM pg_stat_statements
      WHERE mean_time > 100 -- 平均执行时间超过 100ms
      ORDER BY mean_time DESC
      LIMIT 20;
    `);
    return result.rows;
  }

  /**
   * 获取表统计信息
   */
  static async getTableStats(db: { execute: (query: unknown) => Promise<{ rows: unknown[] }> }, tableName: string): Promise<unknown> {
    const result = await db.execute(sql`
      SELECT 
        relname as table_name,
        n_live_tup as row_count,
        n_dead_tup as dead_rows,
        last_vacuum,
        last_autovacuum,
        last_analyze,
        last_autoanalyze
      FROM pg_stat_user_tables
      WHERE relname = ${tableName};
    `);
    return result.rows[0];
  }

  /**
   * 获取索引使用情况
   */
  static async getIndexUsage(db: { execute: (query: unknown) => Promise<{ rows: unknown[] }> }): Promise<unknown[]> {
    const result = await db.execute(sql`
      SELECT 
        schemaname,
        relname as table_name,
        indexrelname as index_name,
        idx_scan as index_scans,
        idx_tup_read as tuples_read,
        idx_tup_fetch as tuples_fetched
      FROM pg_stat_user_indexes
      ORDER BY idx_scan DESC;
    `);
    return result.rows;
  }

  /**
   * 获取未使用的索引
   */
  static async findUnusedIndexes(db: { execute: (query: unknown) => Promise<{ rows: unknown[] }> }): Promise<unknown[]> {
    const result = await db.execute(sql`
      SELECT 
        schemaname,
        relname as table_name,
        indexrelname as index_name,
        pg_size_pretty(pg_relation_size(indexrelid)) as index_size
      FROM pg_stat_user_indexes
      WHERE idx_scan = 0
        AND indexrelname NOT LIKE '%_pkey'
      ORDER BY pg_relation_size(indexrelid) DESC;
    `);
    return result.rows;
  }
}

// ============ 数据清理工具 ============

/**
 * 清理过期数据
 */
export async function cleanupExpiredData(db: { execute: (query: unknown) => Promise<void> }) {
  // 清理过期的 token
  await db.execute(sql`
    DELETE FROM token_blacklist
    WHERE expires_at < NOW();
  `);

  console.log('[DB] Expired data cleaned up');
}

/**
 * 执行 VACUUM
 */
export async function vacuumTable(db: { execute: (query: unknown) => Promise<void> }, tableName: string) {
  await db.execute(sql.raw(`VACUUM ANALYZE ${tableName}`));
  console.log(`[DB] VACUUM ANALYZE completed for ${tableName}`);
}

// ============ 导出工具 ============

export { sql };
