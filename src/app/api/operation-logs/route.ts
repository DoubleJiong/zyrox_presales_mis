import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { operationLogs } from '@/db/schema';
import { and, isNull, lte } from 'drizzle-orm';
import { successResponse, errorResponse, paginatedResponse, parsePagination } from '@/lib/api-response';
import { withAuth } from '@/lib/auth-middleware';
import { OperationLogService } from '@/lib/operation-log-service';

// =====================================================
// 操作日志API
// =====================================================

/**
 * GET /api/operation-logs
 * 获取操作日志列表
 */
export const GET = withAuth(async (req: NextRequest) => {
  try {
    const { searchParams } = req.nextUrl;
    const { page, pageSize, offset } = parsePagination(searchParams);

    // 过滤参数
    const userId = searchParams.get('userId');
    const module = searchParams.get('module');
    const action = searchParams.get('action');
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const search = searchParams.get('search');

    const result = await OperationLogService.query({
      userId: userId ? parseInt(userId, 10) : undefined,
      module: module || undefined,
      action: action || undefined,
      status: status === 'success' || status === 'failed' ? status : undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      search: search || undefined,
      page,
      pageSize,
    });

    return paginatedResponse(result.list, result.pagination.total, { page, pageSize });
  } catch (error) {
    console.error('Get operation logs error:', error);
    return errorResponse('INTERNAL_ERROR', '获取操作日志失败', { status: 500 });
  }
});

/**
 * DELETE /api/operation-logs
 * 清理过期日志
 */
export const DELETE = withAuth(async (req: NextRequest) => {
  try {
    const { searchParams } = req.nextUrl;
    const daysToKeep = parseInt(searchParams.get('daysToKeep') || '30', 10);

    if (!Number.isInteger(daysToKeep) || daysToKeep < 1) {
      return errorResponse('BAD_REQUEST', 'daysToKeep 必须是大于 0 的整数', { status: 400 });
    }
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    // 软删除过期日志
    const result = await db
      .update(operationLogs)
      .set({ deletedAt: new Date() })
      .where(and(
        isNull(operationLogs.deletedAt),
        lte(operationLogs.createdAt, cutoffDate)
      ))
      .returning({ id: operationLogs.id });

    return successResponse({
      message: `已清理 ${result.length} 条过期日志`,
      count: result.length,
    });
  } catch (error) {
    console.error('Clean operation logs error:', error);
    return errorResponse('INTERNAL_ERROR', '清理操作日志失败', { status: 500 });
  }
});
