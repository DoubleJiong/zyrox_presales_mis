import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { notifications, todos, schedules, users } from '@/db/schema';
import { eq, and, lte, gte, sql, not } from 'drizzle-orm';

/**
 * 检查并创建提醒通知 API
 * GET /api/reminders/check?userId=1
 * 
 * 功能：
 * 1. 检查即将到期的待办事项
 * 2. 检查即将开始的日程
 * 3. 自动创建提醒通知
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: '缺少用户ID' },
        { status: 400 }
      );
    }

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;

    const createdNotifications: any[] = [];

    // 1. 检查今日待到期的待办事项
    const dueTodos = await db
      .select()
      .from(todos)
      .where(
        and(
          eq(todos.assigneeId, parseInt(userId)),
          eq(todos.dueDate, today),
          not(eq(todos.todoStatus, 'completed'))
        )
      );

    for (const todo of dueTodos) {
      // 检查是否已存在相同的通知
      const existingNotification = await db
        .select()
        .from(notifications)
        .where(
          and(
            eq(notifications.receiverId, parseInt(userId)),
            eq(notifications.type, 'reminder'),
            sql`content LIKE ${`%待办%${todo.title}%到期%`}`,
            gte(notifications.createdAt, sql`CURRENT_DATE`)
          )
        )
        .limit(1);

      if (existingNotification.length === 0) {
        // 创建待办到期提醒
        const [notification] = await db
          .insert(notifications)
          .values({
            title: '待办到期提醒',
            content: `您的待办「${todo.title}」将于今天到期，请及时处理。`,
            type: 'reminder',
            level: todo.priority === 'urgent' ? 'error' : todo.priority === 'high' ? 'warning' : 'info',
            receiverId: parseInt(userId),
            link: `/calendar?date=${today}&type=todo&id=${todo.id}`,
            isRead: false,
          })
          .returning();

        createdNotifications.push(notification);
      }
    }

    // 2. 检查今日即将开始的日程
    const todaySchedules = await db
      .select()
      .from(schedules)
      .where(
        and(
          eq(schedules.userId, parseInt(userId)),
          eq(schedules.startDate, today),
          not(eq(schedules.scheduleStatus, 'cancelled'))
        )
      );

    for (const schedule of todaySchedules) {
      if (!schedule.startTime) continue;

      // 计算距离开始时间的小时数
      const [scheduleHour, scheduleMinute] = schedule.startTime.split(':').map(Number);
      const scheduleTime = scheduleHour * 60 + scheduleMinute;
      const nowTime = currentHour * 60 + currentMinute;
      const minutesDiff = scheduleTime - nowTime;

      // 如果在30分钟内开始，创建提醒
      if (minutesDiff > 0 && minutesDiff <= 30) {
        // 检查是否已存在相同的通知
        const existingNotification = await db
          .select()
          .from(notifications)
          .where(
            and(
              eq(notifications.receiverId, parseInt(userId)),
              eq(notifications.type, 'reminder'),
              sql`content LIKE ${`%日程%${schedule.title}%即将开始%`}`,
              gte(notifications.createdAt, sql`CURRENT_DATE`)
            )
          )
          .limit(1);

        if (existingNotification.length === 0) {
          const [notification] = await db
            .insert(notifications)
            .values({
              title: '日程即将开始',
              content: `您的日程「${schedule.title}」将在${minutesDiff}分钟后（${schedule.startTime}）开始${schedule.location ? `，地点：${schedule.location}` : ''}。`,
              type: 'reminder',
              level: 'warning',
              receiverId: parseInt(userId),
              link: `/calendar?date=${today}&type=schedule&id=${schedule.id}`,
              isRead: false,
            })
            .returning();

          createdNotifications.push(notification);
        }
      }
    }

    // 3. 检查过期的待办（截止时间已过）
    const overdueTodos = await db
      .select()
      .from(todos)
      .where(
        and(
          eq(todos.assigneeId, parseInt(userId)),
          sql`${todos.dueDate} < ${today}`,
          not(eq(todos.todoStatus, 'completed'))
        )
      );

    for (const todo of overdueTodos) {
      // 检查是否已存在逾期通知
      const existingNotification = await db
        .select()
        .from(notifications)
        .where(
          and(
            eq(notifications.receiverId, parseInt(userId)),
            eq(notifications.type, 'reminder'),
            sql`content LIKE ${`%待办%${todo.title}%已逾期%`}`,
            gte(notifications.createdAt, sql`CURRENT_DATE - INTERVAL '1 day'`)
          )
        )
        .limit(1);

      if (existingNotification.length === 0) {
        const [notification] = await db
          .insert(notifications)
          .values({
            title: '待办逾期提醒',
            content: `您的待办「${todo.title}」已逾期，请尽快处理或调整截止日期。`,
            type: 'reminder',
            level: 'error',
            receiverId: parseInt(userId),
            link: `/calendar?type=todo&id=${todo.id}`,
            isRead: false,
          })
          .returning();

        createdNotifications.push(notification);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        checkedAt: now.toISOString(),
        createdCount: createdNotifications.length,
        notifications: createdNotifications,
      },
    });
  } catch (error) {
    console.error('Check reminders API error:', error);
    return NextResponse.json(
      { success: false, error: '检查提醒失败' },
      { status: 500 }
    );
  }
}
