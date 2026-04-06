/**
 * 数据库优化管理 API
 * 用于执行数据库索引创建、统计查询等操作
 * 
 * 注意：这是内部管理功能，仅供管理员使用
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db } from '@/db';

// GET - 获取数据库统计信息
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'index-usage':
        // 获取索引使用情况
        const indexUsage = await db.execute(sql`
          SELECT 
            schemaname,
            relname as table_name,
            indexrelname as index_name,
            idx_scan as index_scans,
            idx_tup_read as tuples_read,
            idx_tup_fetch as tuples_fetched
          FROM pg_stat_user_indexes
          ORDER BY idx_scan DESC
          LIMIT 50;
        `);
        return NextResponse.json({
          success: true,
          data: indexUsage,
        });

      case 'unused-indexes':
        // 获取未使用的索引
        const unusedIndexes = await db.execute(sql`
          SELECT 
            schemaname,
            relname as table_name,
            indexrelname as index_name,
            pg_size_pretty(pg_relation_size(indexrelid)) as index_size
          FROM pg_stat_user_indexes
          WHERE idx_scan = 0
            AND indexrelname NOT LIKE '%_pkey'
          ORDER BY pg_relation_size(indexrelid) DESC
          LIMIT 50;
        `);
        return NextResponse.json({
          success: true,
          data: unusedIndexes,
        });

      case 'table-stats':
        const tableName = searchParams.get('table');
        if (!tableName) {
          return NextResponse.json(
            { success: false, error: 'Table name is required' },
            { status: 400 }
          );
        }
        // 获取表统计信息
        const stats = await db.execute(sql`
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
        return NextResponse.json({
          success: true,
          data: stats[0] || null,
        });

      case 'slow-queries':
        // 获取慢查询（如果 pg_stat_statements 可用）
        try {
          const slowQueries = await db.execute(sql`
            SELECT 
              query,
              calls,
              total_time,
              mean_time,
              max_time
            FROM pg_stat_statements
            WHERE mean_time > 100
            ORDER BY mean_time DESC
            LIMIT 20;
          `);
          return NextResponse.json({
            success: true,
            data: slowQueries,
          });
        } catch {
          return NextResponse.json({
            success: false,
            error: 'pg_stat_statements extension not available',
          }, { status: 400 });
        }

      default:
        return NextResponse.json({
          success: false,
          error: 'Unknown action. Supported: index-usage, unused-indexes, table-stats, slow-queries',
        }, { status: 400 });
    }
  } catch (error) {
    console.error('[DB API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get database statistics' },
      { status: 500 }
    );
  }
}

// POST - 执行数据库优化操作
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, tableName, indexSQL } = body;

    switch (action) {
      case 'create-index':
        // 执行自定义索引创建 SQL
        if (!indexSQL) {
          return NextResponse.json(
            { success: false, error: 'indexSQL is required' },
            { status: 400 }
          );
        }
        await db.execute(sql.raw(indexSQL));
        return NextResponse.json({
          success: true,
          message: 'Index created successfully',
        });

      case 'cleanup-tokens':
        // 清理过期的 token
        await db.execute(sql`
          DELETE FROM token_blacklist
          WHERE expires_at < NOW();
        `);
        return NextResponse.json({
          success: true,
          message: 'Expired tokens cleaned up',
        });

      case 'vacuum':
        if (!tableName) {
          return NextResponse.json(
            { success: false, error: 'Table name is required for vacuum' },
            { status: 400 }
          );
        }
        // 执行 VACUUM ANALYZE
        await db.execute(sql.raw(`VACUUM ANALYZE ${tableName}`));
        return NextResponse.json({
          success: true,
          message: `VACUUM completed for ${tableName}`,
        });

      case 'analyze':
        if (!tableName) {
          return NextResponse.json(
            { success: false, error: 'Table name is required for analyze' },
            { status: 400 }
          );
        }
        await db.execute(sql.raw(`ANALYZE ${tableName}`));
        return NextResponse.json({
          success: true,
          message: `ANALYZE completed for ${tableName}`,
        });

      default:
        return NextResponse.json({
          success: false,
          error: 'Unknown action. Supported: create-index, cleanup-tokens, vacuum, analyze',
        }, { status: 400 });
    }
  } catch (error) {
    console.error('[DB API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to execute database optimization' },
      { status: 500 }
    );
  }
}
