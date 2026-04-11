import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { weeklyReports, users, tasks, projects, opportunities, customers } from '@/db/schema';
import { eq, and, sql, between, gte, lte } from 'drizzle-orm';
import { withAuth } from '@/lib/auth-middleware';
import { successResponse, errorResponse } from '@/lib/api-response';
import { canViewGlobalDashboard } from '@/shared/policy/dashboard-policy';

type WeeklyReportDetailUser = {
  id: number;
  realName: string | null;
  email: string | null;
};

function normalizeWeeklyReportUser(value: unknown): WeeklyReportDetailUser | null {
  if (!value) {
    return null;
  }

  if (Array.isArray(value)) {
    const firstUser = value[0];
    return firstUser && typeof firstUser === 'object' ? firstUser as WeeklyReportDetailUser : null;
  }

  return typeof value === 'object' ? value as WeeklyReportDetailUser : null;
}

function toIsoDateString(value: string | Date) {
  if (typeof value === 'string') {
    return value;
  }

  return value.toISOString().split('T')[0] ?? value.toISOString();
}

function toIsoDateTimeString(value: string | Date | null) {
  if (value === null) {
    return null;
  }

  if (typeof value === 'string') {
    return value;
  }

  return value.toISOString();
}

function mapWeeklyReportDetail(record: {
  id: number;
  type: string;
  userId: number | null;
  weekStart: string | Date;
  weekEnd: string | Date;
  content: unknown;
  generatedAt: string | Date;
  sentAt: string | Date | null;
  sent: boolean | null;
  user?: unknown;
}) {
  const user = normalizeWeeklyReportUser(record.user);

  return {
    id: record.id,
    type: record.type,
    userId: record.userId,
    userName: user?.realName ?? null,
    weekStart: toIsoDateString(record.weekStart),
    weekEnd: toIsoDateString(record.weekEnd),
    content: record.content,
    generatedAt: toIsoDateTimeString(record.generatedAt),
    sentAt: toIsoDateTimeString(record.sentAt),
    sent: Boolean(record.sent),
    user,
  };
}

// GET - 获取周报详情
export const GET = withAuth(async (
  request: NextRequest,
  context: { userId: number; user?: any; params?: Record<string, string> }
) => {
  try {
    const reportIdStr = context.params?.id || '0';
    
    // BUG-WEEKLY001: 验证ID格式
    if (!reportIdStr || reportIdStr === '0') {
      return errorResponse('BAD_REQUEST', '无效的周报ID');
    }
    
    // 验证是否为有效数字
    const reportId = parseInt(reportIdStr);
    if (isNaN(reportId) || reportId <= 0) {
      return errorResponse('BAD_REQUEST', '周报ID必须是正整数');
    }
    
    const userId = context.userId;
    const hasGlobalScope = canViewGlobalDashboard(context.user);

    // 查询周报详情
    const report = await db.query.weeklyReports.findFirst({
      where: eq(weeklyReports.id, reportId),
      with: {
        user: {
          columns: {
            id: true,
            realName: true,
            email: true,
          },
        },
      },
    });

    if (!report) {
      return errorResponse('NOT_FOUND', '周报不存在');
    }

    // 检查访问权限
    if (report.type === 'personal' && report.userId !== userId && !hasGlobalScope) {
      return errorResponse('FORBIDDEN', '无权查看他人周报', { status: 403 });
    }

    return successResponse(mapWeeklyReportDetail(report));
  } catch (error) {
    console.error('Failed to fetch weekly report:', error);
    return errorResponse('INTERNAL_ERROR', '获取周报详情失败');
  }
});

// PUT - 更新周报
export const PUT = withAuth(async (
  request: NextRequest,
  context: { userId: number; user?: any; params?: Record<string, string> }
) => {
  try {
    const reportIdStr = context.params?.id || '0';
    
    // BUG-WEEKLY002: 验证ID格式
    if (!reportIdStr || reportIdStr === '0') {
      return errorResponse('BAD_REQUEST', '无效的周报ID');
    }
    
    const reportId = parseInt(reportIdStr);
    if (isNaN(reportId) || reportId <= 0) {
      return errorResponse('BAD_REQUEST', '周报ID必须是正整数');
    }
    
    const userId = context.userId;
    const body = await request.json();

    // 查询周报
    const report = await db.query.weeklyReports.findFirst({
      where: eq(weeklyReports.id, reportId),
      with: {
        user: {
          columns: {
            id: true,
            realName: true,
            email: true,
          },
        },
      },
    });

    if (!report) {
      return errorResponse('NOT_FOUND', '周报不存在');
    }

    // 检查编辑权限
    if (report.type === 'personal' && report.userId !== userId) {
      return errorResponse('FORBIDDEN', '无权编辑此周报');
    }

    // 更新周报内容
    const [updatedReport] = await db
      .update(weeklyReports)
      .set({
        content: {
          ...report.content as any,
          ...body.content,
        },
      })
      .where(eq(weeklyReports.id, reportId))
      .returning();

    return successResponse(mapWeeklyReportDetail({
      ...updatedReport,
      user: report.user ?? null,
    }));
  } catch (error) {
    console.error('Failed to update weekly report:', error);
    return errorResponse('INTERNAL_ERROR', '更新周报失败');
  }
});

// DELETE - 删除周报
export const DELETE = withAuth(async (
  request: NextRequest,
  context: { userId: number; user?: any; params?: Record<string, string> }
) => {
  try {
    const reportIdStr = context.params?.id || '0';
    
    // BUG-WEEKLY003: 验证ID格式
    if (!reportIdStr || reportIdStr === '0') {
      return errorResponse('BAD_REQUEST', '无效的周报ID');
    }
    
    const reportId = parseInt(reportIdStr);
    if (isNaN(reportId) || reportId <= 0) {
      return errorResponse('BAD_REQUEST', '周报ID必须是正整数');
    }
    
    const userId = context.userId;

    // 查询周报
    const report = await db.query.weeklyReports.findFirst({
      where: eq(weeklyReports.id, reportId),
    });

    if (!report) {
      return errorResponse('NOT_FOUND', '周报不存在');
    }

    // 检查删除权限
    if (report.type === 'personal' && report.userId !== userId) {
      return errorResponse('FORBIDDEN', '无权删除此周报');
    }

    // 删除周报
    await db.delete(weeklyReports).where(eq(weeklyReports.id, reportId));

    return successResponse({ message: '周报已删除' });
  } catch (error) {
    console.error('Failed to delete weekly report:', error);
    return errorResponse('INTERNAL_ERROR', '删除周报失败');
  }
});
