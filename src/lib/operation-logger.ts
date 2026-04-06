import { db } from '@/db';
import { operationLogs } from '@/db/schema';
import { NextRequest, NextResponse } from 'next/server';

// =====================================================
// 操作日志记录工具
// =====================================================

export interface LogOperationInput {
  userId: number;
  module: string;
  action: string;
  resource?: string;
  resourceId?: number;
  method?: string;
  path?: string;
  params?: unknown;
  result?: unknown;
  status: 'success' | 'failed';
  error?: string;
  duration?: number;
  ip?: string;
  userAgent?: string;
}

/**
 * 记录操作日志
 */
export async function logOperation(input: LogOperationInput): Promise<void> {
  try {
    await db.insert(operationLogs).values({
      userId: input.userId,
      module: input.module,
      action: input.action,
      resource: input.resource || null,
      resourceId: input.resourceId || null,
      method: input.method || null,
      path: input.path || null,
      params: input.params || null,
      result: input.result || null,
      status: input.status,
      error: input.error || null,
      duration: input.duration || null,
      ip: input.ip || null,
      userAgent: input.userAgent || null,
    });
  } catch (error) {
    console.error('Log operation error:', error);
    // 不抛出错误，避免影响主流程
  }
}

/**
 * 创建日志中间件
 */
export function withOperationLog(
  module: string,
  action: string,
  getResourceId: (req: NextRequest) => number | undefined = () => undefined
) {
  return function (
    handler: (req: NextRequest, context: { userId: number }) => Promise<NextResponse>
  ) {
    return async (req: NextRequest, context: { userId: number }) => {
      const startTime = performance.now();
      let status: 'success' | 'failed' = 'success';
      let error: string | undefined;
      let result: unknown;

      try {
        const response = await handler(req, context);
        
        // 尝试解析响应
        try {
          result = await response.clone().json();
        } catch {
          // 忽略解析错误
        }

        return response;
      } catch (err) {
        status = 'failed';
        error = err instanceof Error ? err.message : '未知错误';
        throw err;
      } finally {
        const duration = Math.round(performance.now() - startTime);

        await logOperation({
          userId: context.userId,
          module,
          action,
          resourceId: getResourceId(req),
          method: req.method,
          path: req.nextUrl.pathname,
          status,
          error,
          duration,
          ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
          userAgent: req.headers.get('user-agent') || 'unknown',
        });
      }
    };
  };
}

// =====================================================
// 操作统计
// =====================================================

/**
 * 获取操作统计
 */
export async function getOperationStats(
  options: {
    startDate?: Date;
    endDate?: Date;
    userId?: number;
  } = {}
): Promise<{
  total: number;
  success: number;
  failed: number;
  byModule: Record<string, number>;
  byAction: Record<string, number>;
  byUser: Array<{ userId: number; count: number }>;
}> {
  const { startDate, endDate, userId } = options;

  // 构建查询条件
  const conditions = [];
  if (startDate) {
    conditions.push(gte(operationLogs.createdAt, startDate));
  }
  if (endDate) {
    conditions.push(lte(operationLogs.createdAt, endDate));
  }
  if (userId) {
    conditions.push(eq(operationLogs.userId, userId));
  }

  // 简化实现
  const stats = {
    total: 0,
    success: 0,
    failed: 0,
    byModule: {} as Record<string, number>,
    byAction: {} as Record<string, number>,
    byUser: [] as Array<{ userId: number; count: number }>,
  };

  return stats;
}

import { sql, eq, and, gte, lte, like, desc, isNull } from 'drizzle-orm';
