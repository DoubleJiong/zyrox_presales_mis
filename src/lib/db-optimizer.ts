import { db } from '@/db';
import { sql } from 'drizzle-orm';

/**
 * 数据库查询优化工具
 * 提供查询分析、索引建议等功能
 */

// 查询分析结果
export interface QueryAnalysis {
  query: string;
  duration: number;
  rowsExamined: number;
  rowsSent: number;
  indexUsed: string | null;
  suggestions: string[];
}

// 索引建议
export interface IndexSuggestion {
  table: string;
  columns: string[];
  reason: string;
  priority: 'high' | 'medium' | 'low';
}

// 慢查询日志
export interface SlowQuery {
  query: string;
  duration: number;
  timestamp: Date;
  count: number;
}

// 内存存储慢查询日志
const slowQueryLog: SlowQuery[] = [];
const SLOW_QUERY_THRESHOLD = 500; // 500ms

/**
 * 执行带性能分析的查询
 */
export async function analyzeQuery<T>(
  queryName: string,
  queryFn: () => Promise<T>
): Promise<{ result: T; analysis: QueryAnalysis }> {
  const startTime = performance.now();
  
  try {
    const result = await queryFn();
    const duration = performance.now() - startTime;

    const analysis: QueryAnalysis = {
      query: queryName,
      duration,
      rowsExamined: 0,
      rowsSent: Array.isArray(result) ? result.length : 1,
      indexUsed: null,
      suggestions: [],
    };

    // 检测慢查询
    if (duration > SLOW_QUERY_THRESHOLD) {
      logSlowQuery(queryName, duration);
      analysis.suggestions.push('查询执行时间较长，建议优化');
    }

    return { result, analysis };
  } catch (error) {
    const duration = performance.now() - startTime;
    console.error(`[Query Error] ${queryName} failed after ${duration.toFixed(2)}ms:`, error);
    throw error;
  }
}

/**
 * 记录慢查询
 */
function logSlowQuery(query: string, duration: number): void {
  const existing = slowQueryLog.find(q => q.query === query);
  
  if (existing) {
    existing.duration = (existing.duration + duration) / 2; // 平均时间
    existing.count++;
    existing.timestamp = new Date();
  } else {
    slowQueryLog.push({
      query,
      duration,
      timestamp: new Date(),
      count: 1,
    });
  }

  // 限制日志大小
  if (slowQueryLog.length > 100) {
    slowQueryLog.shift();
  }
}

/**
 * 获取慢查询日志
 */
export function getSlowQueries(): SlowQuery[] {
  return [...slowQueryLog].sort((a, b) => b.duration - a.duration);
}

/**
 * 获取索引使用统计
 */
export async function getIndexUsageStats(): Promise<{
  table: string;
  indexName: string;
  usageCount: number;
}[]> {
  try {
    const result = await db.execute(sql`
      SELECT 
        schemaname || '.' || tablename as table,
        indexname as "indexName",
        idx_scan as "usageCount"
      FROM pg_stat_user_indexes
      ORDER BY idx_scan DESC
      LIMIT 20
    `);

    return result as unknown as {
      table: string;
      indexName: string;
      usageCount: number;
    }[];
  } catch (error) {
    console.error('Failed to get index usage stats:', error);
    return [];
  }
}

/**
 * 获取表统计信息
 */
export async function getTableStats(): Promise<{
  table: string;
  rowCount: number;
  tableSize: string;
  indexSize: string;
}[]> {
  try {
    const result = await db.execute(sql`
      SELECT 
        schemaname || '.' || tablename as table,
        n_live_tup as "rowCount",
        pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)) as "tableSize",
        pg_size_pretty(pg_indexes_size(schemaname || '.' || tablename)) as "indexSize"
      FROM pg_stat_user_tables
      ORDER BY n_live_tup DESC
      LIMIT 20
    `);

    return result as unknown as {
      table: string;
      rowCount: number;
      tableSize: string;
      indexSize: string;
    }[];
  } catch (error) {
    console.error('Failed to get table stats:', error);
    return [];
  }
}

/**
 * 分析并建议索引
 */
export async function analyzeIndexNeeds(
  tableName: string
): Promise<IndexSuggestion[]> {
  const suggestions: IndexSuggestion[] = [];

  try {
    // 获取表上的查询模式
    const queryPatterns = await db.execute(sql`
      SELECT 
        query,
        calls,
        total_time,
        mean_time
      FROM pg_stat_statements
      WHERE query ILIKE ${'%' + tableName + '%'}
      ORDER BY total_time DESC
      LIMIT 10
    `);

    // 分析WHERE子句中的列
    // 注意：这需要pg_stat_statements扩展
    // 简化实现：基于常见模式提供建议

    const commonColumns = ['created_at', 'updated_at', 'status', 'user_id', 'customer_id', 'project_id'];
    
    for (const col of commonColumns) {
      // 检查是否已有索引
      const indexCheck = await db.execute(sql`
        SELECT 1
        FROM pg_indexes
        WHERE tablename = ${tableName}
        AND indexdef ILIKE ${'%' + col + '%'}
      `);

      if ((indexCheck as unknown as { length: number }).length === 0) {
        suggestions.push({
          table: tableName,
          columns: [col],
          reason: `常见查询条件列 ${col} 缺少索引`,
          priority: col.includes('id') ? 'high' : 'medium',
        });
      }
    }
  } catch (error) {
    console.error('Index analysis failed:', error);
  }

  return suggestions;
}

/**
 * 优化查询建议
 */
export function getQueryOptimizationTips(query: string): string[] {
  const tips: string[] = [];

  // 检查 SELECT *
  if (query.includes('SELECT *')) {
    tips.push('避免使用 SELECT *，只查询需要的列');
  }

  // 检查是否使用 LIMIT
  if (!query.toLowerCase().includes('limit') && 
      query.toLowerCase().includes('select')) {
    tips.push('考虑添加 LIMIT 限制返回结果数量');
  }

  // 检查 LIKE '%xxx%' 模式
  if (query.toLowerCase().match(/like\s+'%.*%'/)) {
    tips.push('LIKE 以通配符开头无法使用索引，考虑使用全文搜索');
  }

  // 检查是否在 WHERE 中使用函数
  if (query.toLowerCase().match(/where\s+\w+\s*\(/)) {
    tips.push('WHERE 子句中的函数会阻止索引使用');
  }

  // 检查是否使用 OR
  if (query.toLowerCase().match(/\s+or\s+/)) {
    tips.push('考虑使用 UNION ALL 替代 OR 条件以提高性能');
  }

  // 检查 JOIN 数量
  const joinCount = (query.toLowerCase().match(/join/g) || []).length;
  if (joinCount > 3) {
    tips.push(`查询包含 ${joinCount} 个 JOIN，考虑拆分查询`);
  }

  return tips;
}

/**
 * 批量查询优化器
 */
export class BatchQueryOptimizer {
  private queries: Array<() => Promise<any>> = [];
  private batchSize: number;

  constructor(batchSize = 10) {
    this.batchSize = batchSize;
  }

  add<T>(queryFn: () => Promise<T>): void {
    this.queries.push(queryFn);
  }

  async executeAll<T>(): Promise<T[]> {
    const results: T[] = [];
    const batches = Math.ceil(this.queries.length / this.batchSize);

    for (let i = 0; i < batches; i++) {
      const start = i * this.batchSize;
      const batch = this.queries.slice(start, start + this.batchSize);
      
      const batchResults = await Promise.all(batch.map(fn => fn()));
      results.push(...batchResults);
    }

    return results;
  }
}

/**
 * 查询结果缓存装饰器
 */
export function withQueryCache<T>(
  cacheKey: string,
  ttl: number,
  queryFn: () => Promise<T>
): Promise<T> {
  const cache = new Map<string, { data: T; expiry: number }>();
  
  return new Promise(async (resolve, reject) => {
    const cached = cache.get(cacheKey);
    
    if (cached && cached.expiry > Date.now()) {
      resolve(cached.data);
      return;
    }

    try {
      const data = await queryFn();
      cache.set(cacheKey, {
        data,
        expiry: Date.now() + ttl,
      });
      resolve(data);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * 使用示例:
 * 
 * // 带分析的查询
 * const { result, analysis } = await analyzeQuery('getUsers', async () => {
 *   return await db.select().from(users);
 * });
 * 
 * // 获取慢查询
 * const slowQueries = getSlowQueries();
 * 
 * // 获取索引建议
 * const suggestions = await analyzeIndexNeeds('users');
 * 
 * // 批量查询优化
 * const optimizer = new BatchQueryOptimizer(5);
 * optimizer.add(() => db.select().from(users));
 * optimizer.add(() => db.select().from(customers));
 * const results = await optimizer.executeAll();
 */
