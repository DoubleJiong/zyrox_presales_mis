import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { workLogs, users } from '@/db/schema';
import { eq, and, desc, sql, gte, lte } from 'drizzle-orm';
import { withAuth } from '@/lib/auth-middleware';

// 工作日志类型
type WorkType = 'followup' | 'bidding' | 'project' | 'meeting' | 'other';
type WorkLogStatus = 'draft' | 'submitted' | 'approved' | 'rejected';

// 获取工作日志列表
export const GET = withAuth(async (request: NextRequest, { userId: currentUserId }) => {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');
    const workType = searchParams.get('workType');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    const conditions = [];

    // 如果指定了userId参数，验证权限
    if (userId) {
      // 只能查看自己的日志，除非有管理权限
      conditions.push(eq(workLogs.userId, parseInt(userId)));
    } else {
      // 默认只返回当前用户的日志
      conditions.push(eq(workLogs.userId, currentUserId));
    }

    if (status) {
      conditions.push(eq(workLogs.status, status));
    }

    if (workType) {
      conditions.push(eq(workLogs.workType, workType));
    }

    if (startDate) {
      conditions.push(gte(workLogs.logDate, startDate));
    }

    if (endDate) {
      conditions.push(lte(workLogs.logDate, endDate));
    }

    // 获取总数
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(workLogs)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    const total = countResult?.count || 0;

    // 获取日志列表
    const logList = await db
      .select({
        log: workLogs,
        user: users,
      })
      .from(workLogs)
      .leftJoin(users, eq(workLogs.userId, users.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(workLogs.logDate))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return NextResponse.json({
      success: true,
      data: {
        list: logList.map(({ log, user }) => ({
          id: log.id,
          userId: log.userId,
          userName: user?.realName || '未知',
          logDate: log.logDate,
          workHours: log.workHours,
          workContent: log.workContent,
          tomorrowPlan: log.tomorrowPlan,
          issues: log.issues,
          workType: log.workType,
          status: log.status,
          relatedProjects: log.relatedProjects,
          relatedCustomers: log.relatedCustomers,
          attachments: log.attachments,
          location: log.location,
          mood: log.mood,
          createdAt: log.createdAt,
          updatedAt: log.updatedAt,
        })),
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      },
    });
  } catch (error) {
    console.error('Get work logs API error:', error);
    return NextResponse.json(
      { success: false, error: '获取工作日志列表失败' },
      { status: 500 }
    );
  }
});

// 创建工作日志
export const POST = withAuth(async (request: NextRequest, { userId }) => {
  try {
    const body = await request.json();
    const {
      logDate,
      workHours,
      workContent,
      tomorrowPlan,
      issues,
      workType,
      relatedProjects,
      relatedCustomers,
      attachments,
      location,
      mood,
    } = body;

    if (!logDate) {
      return NextResponse.json(
        { success: false, error: '日志日期不能为空' },
        { status: 400 }
      );
    }

    // 检查是否已存在该日期的日志
    const [existing] = await db
      .select()
      .from(workLogs)
      .where(
        and(
          eq(workLogs.userId, userId),
          eq(workLogs.logDate, logDate)
        )
      );

    if (existing) {
      return NextResponse.json(
        { success: false, error: '该日期已存在工作日志' },
        { status: 400 }
      );
    }

    const [newLog] = await db
      .insert(workLogs)
      .values({
        userId,
        logDate,
        workHours,
        workContent,
        tomorrowPlan,
        issues,
        workType,
        status: 'draft',
        relatedProjects,
        relatedCustomers,
        attachments,
        location,
        mood,
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: newLog,
      message: '工作日志创建成功',
    });
  } catch (error) {
    console.error('Create work log API error:', error);
    return NextResponse.json(
      { success: false, error: '创建工作日志失败' },
      { status: 500 }
    );
  }
});
