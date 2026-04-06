import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { customers, projects } from '@/db/schema';
import { eq, and, isNull, sql } from 'drizzle-orm';
import { withAuth } from '@/lib/auth-middleware';
import { successResponse, errorResponse } from '@/lib/api-response';
import { syncSingleCustomerStats } from '@/lib/customer-stats';
import { isSystemAdmin } from '@/lib/permissions/project';

/**
 * POST /api/customers/sync-stats
 * 同步客户统计数据（重新计算历史中标总额、历史最大中标金额和当前跟进项目数）
 */
export const POST = withAuth(async (
  request: NextRequest,
  context: { userId: number; user?: any }
) => {
  try {
    // 只有管理员可以执行此操作
    const isAdmin = await isSystemAdmin(context.userId);
    if (!isAdmin) {
      return errorResponse('FORBIDDEN', '只有管理员可以执行此操作');
    }

    // 获取所有客户
    const allCustomers = await db
      .select({ id: customers.id })
      .from(customers)
      .where(isNull(customers.deletedAt));

    let updatedCount = 0;
    const errors: string[] = [];

    // 逐个客户更新统计
    for (const customer of allCustomers) {
      try {
        await syncSingleCustomerStats(customer.id);

        updatedCount++;
      } catch (err) {
        errors.push(`客户 ${customer.id} 更新失败: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    return successResponse({
      message: '客户统计数据同步完成',
      updatedCount,
      totalCustomers: allCustomers.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Failed to sync customer stats:', error);
    return errorResponse('INTERNAL_ERROR', '同步客户统计数据失败');
  }
});

