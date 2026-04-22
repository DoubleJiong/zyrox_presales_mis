import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import {
  messages,
  todos,
  schedules,
  projectBiddings,
  projectOpportunities,
  leadFollowRecords,
  projects,
  leads,
} from '@/db/schema';
import { eq, and, lte, gte, sql, not, isNotNull, isNull } from 'drizzle-orm';

/**
 * 检查并创建提醒消息 API
 * GET /api/reminders/check?userId=1
 *
 * 功能：
 * 1. 检查今日到期的待办事项
 * 2. 检查即将开始的日程（30分钟内）
 * 3. 检查逾期未完成的待办事项
 * 4. 检查3天内截止的投标项目
 * 5. 检查商机下一步行动超期
 * 6. 检查线索跟进提醒时间已到
 *
 * 所有消息写入 sys_message（messages 表），不再写入 sys_notification。
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

    const uid = parseInt(userId, 10);
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    const created: any[] = [];

    // ----------------------------------------------------------------
    // 场景 1: 今日到期待办
    // ----------------------------------------------------------------
    const dueTodos = await db
      .select()
      .from(todos)
      .where(
        and(
          eq(todos.assigneeId, uid),
          eq(todos.dueDate, today),
          not(eq(todos.todoStatus, 'completed'))
        )
      );

    for (const todo of dueTodos) {
      const existing = await db
        .select({ id: messages.id })
        .from(messages)
        .where(
          and(
            eq(messages.receiverId, uid),
            eq(messages.type, 'reminder'),
            eq(messages.relatedType, 'todo'),
            eq(messages.relatedId, todo.id),
            sql`${messages.createdAt} >= CURRENT_DATE`
          )
        )
        .limit(1);

      if (existing.length === 0) {
        const priority = todo.priority === 'urgent' ? 'urgent'
          : todo.priority === 'high' ? 'high' : 'normal';

        const [msg] = await db
          .insert(messages)
          .values({
            title: '待办到期提醒',
            content: `您的待办「${todo.title}」将于今天到期，请及时处理。`,
            type: 'reminder',
            category: 'task',
            priority,
            receiverId: uid,
            relatedType: 'todo',
            relatedId: todo.id,
            relatedName: todo.title,
            actionUrl: `/calendar?date=${today}&type=todo&id=${todo.id}`,
            actionText: '查看待办',
            isRead: false,
            isDeleted: false,
            updatedAt: new Date(),
          })
          .returning();

        created.push(msg);
      }
    }

    // ----------------------------------------------------------------
    // 场景 2: 今日即将开始的日程（30分钟内）
    // ----------------------------------------------------------------
    const todaySchedules = await db
      .select()
      .from(schedules)
      .where(
        and(
          eq(schedules.userId, uid),
          eq(schedules.startDate, today),
          not(eq(schedules.scheduleStatus, 'cancelled'))
        )
      );

    for (const schedule of todaySchedules) {
      if (!schedule.startTime) continue;

      const [scheduleHour, scheduleMinute] = schedule.startTime.split(':').map(Number);
      const scheduleMinutes = scheduleHour * 60 + scheduleMinute;
      const nowMinutes = currentHour * 60 + currentMinute;
      const minutesDiff = scheduleMinutes - nowMinutes;

      if (minutesDiff <= 0 || minutesDiff > 30) continue;

      const existing = await db
        .select({ id: messages.id })
        .from(messages)
        .where(
          and(
            eq(messages.receiverId, uid),
            eq(messages.type, 'reminder'),
            eq(messages.relatedType, 'schedule'),
            eq(messages.relatedId, schedule.id),
            sql`${messages.createdAt} >= CURRENT_DATE`
          )
        )
        .limit(1);

      if (existing.length === 0) {
        const [msg] = await db
          .insert(messages)
          .values({
            title: '日程即将开始',
            content: `您的日程「${schedule.title}」将在${minutesDiff}分钟后（${schedule.startTime}）开始${schedule.location ? `，地点：${schedule.location}` : ''}。`,
            type: 'reminder',
            category: 'system',
            priority: 'high',
            receiverId: uid,
            relatedType: 'schedule',
            relatedId: schedule.id,
            relatedName: schedule.title,
            actionUrl: `/calendar?date=${today}&type=schedule&id=${schedule.id}`,
            actionText: '查看日程',
            isRead: false,
            isDeleted: false,
            updatedAt: new Date(),
          })
          .returning();

        created.push(msg);
      }
    }

    // ----------------------------------------------------------------
    // 场景 3: 逾期未完成待办
    // ----------------------------------------------------------------
    const overdueTodos = await db
      .select()
      .from(todos)
      .where(
        and(
          eq(todos.assigneeId, uid),
          sql`${todos.dueDate} < ${today}`,
          not(eq(todos.todoStatus, 'completed'))
        )
      );

    for (const todo of overdueTodos) {
      const existing = await db
        .select({ id: messages.id })
        .from(messages)
        .where(
          and(
            eq(messages.receiverId, uid),
            eq(messages.type, 'reminder'),
            eq(messages.relatedType, 'todo'),
            eq(messages.relatedId, todo.id),
            sql`${messages.createdAt} >= CURRENT_DATE - INTERVAL '1 day'`
          )
        )
        .limit(1);

      if (existing.length === 0) {
        const [msg] = await db
          .insert(messages)
          .values({
            title: '待办逾期提醒',
            content: `您的待办「${todo.title}」已逾期，请尽快处理或调整截止日期。`,
            type: 'reminder',
            category: 'task',
            priority: 'urgent',
            receiverId: uid,
            relatedType: 'todo',
            relatedId: todo.id,
            relatedName: todo.title,
            actionUrl: `/calendar?type=todo&id=${todo.id}`,
            actionText: '处理待办',
            isRead: false,
            isDeleted: false,
            updatedAt: new Date(),
          })
          .returning();

        created.push(msg);
      }
    }

    // ----------------------------------------------------------------
    // 场景 4: 投标截止日期 3 天内预警
    // ----------------------------------------------------------------
    const threeDaysLater = new Date(now);
    threeDaysLater.setDate(threeDaysLater.getDate() + 3);

    const upcomingBiddings = await db
      .select({
        biddingId: projectBiddings.id,
        projectId: projectBiddings.projectId,
        projectName: projects.projectName,
        bidDeadline: projectBiddings.bidDeadline,
      })
      .from(projectBiddings)
      .innerJoin(projects, eq(projectBiddings.projectId, projects.id))
      .where(
        and(
          eq(projects.managerId, uid),
          isNotNull(projectBiddings.bidDeadline),
          sql`${projectBiddings.bidDeadline} > NOW()`,
          sql`${projectBiddings.bidDeadline} <= ${threeDaysLater.toISOString()}`,
          sql`${projectBiddings.bidResult} = 'pending' OR ${projectBiddings.bidResult} IS NULL`
        )
      );

    for (const bidding of upcomingBiddings) {
      const existing = await db
        .select({ id: messages.id })
        .from(messages)
        .where(
          and(
            eq(messages.receiverId, uid),
            eq(messages.type, 'reminder'),
            eq(messages.relatedType, 'bidding'),
            eq(messages.relatedId, bidding.biddingId),
            sql`${messages.createdAt} >= CURRENT_DATE`
          )
        )
        .limit(1);

      if (existing.length === 0) {
        const deadline = bidding.bidDeadline as Date;
        const hoursLeft = Math.round((deadline.getTime() - now.getTime()) / (1000 * 60 * 60));
        const daysLeft = Math.ceil(hoursLeft / 24);

        const [msg] = await db
          .insert(messages)
          .values({
            title: '投标截止临近提醒',
            content: `项目「${bidding.projectName}」的投标截止时间还有 ${daysLeft} 天（${deadline.toLocaleDateString('zh-CN')} ${deadline.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}），请及时准备投标文件。`,
            type: 'reminder',
            category: 'project',
            priority: daysLeft <= 1 ? 'urgent' : 'high',
            receiverId: uid,
            relatedType: 'bidding',
            relatedId: bidding.biddingId,
            relatedName: bidding.projectName,
            actionUrl: `/projects/${bidding.projectId}?tab=bidding`,
            actionText: '查看投标',
            isRead: false,
            isDeleted: false,
            updatedAt: new Date(),
          })
          .returning();

        created.push(msg);
      }
    }

    // ----------------------------------------------------------------
    // 场景 5: 商机下一步行动超期
    // ----------------------------------------------------------------
    const overdueOpportunities = await db
      .select({
        opportunityId: projectOpportunities.id,
        projectId: projectOpportunities.projectId,
        projectName: projects.projectName,
        nextActionDate: projectOpportunities.nextActionDate,
        nextAction: projectOpportunities.nextAction,
      })
      .from(projectOpportunities)
      .innerJoin(projects, eq(projectOpportunities.projectId, projects.id))
      .where(
        and(
          eq(projects.managerId, uid),
          isNotNull(projectOpportunities.nextActionDate),
          sql`${projectOpportunities.nextActionDate} < ${today}`,
          sql`${projects.projectStage} NOT IN ('archived', 'cancelled')`
        )
      );

    for (const opp of overdueOpportunities) {
      const existing = await db
        .select({ id: messages.id })
        .from(messages)
        .where(
          and(
            eq(messages.receiverId, uid),
            eq(messages.type, 'reminder'),
            eq(messages.relatedType, 'project'),
            eq(messages.relatedId, opp.projectId),
            sql`${messages.createdAt} >= CURRENT_DATE`
          )
        )
        .limit(1);

      if (existing.length === 0) {
        const action = opp.nextAction ? `：${opp.nextAction}` : '';
        const [msg] = await db
          .insert(messages)
          .values({
            title: '商机跟进超期提醒',
            content: `项目「${opp.projectName}」的下一步行动已超过计划日期（${opp.nextActionDate}）${action}，请及时跟进并更新商机状态。`,
            type: 'reminder',
            category: 'project',
            priority: 'high',
            receiverId: uid,
            relatedType: 'project',
            relatedId: opp.projectId,
            relatedName: opp.projectName,
            actionUrl: `/projects/${opp.projectId}?tab=opportunity`,
            actionText: '更新商机',
            isRead: false,
            isDeleted: false,
            updatedAt: new Date(),
          })
          .returning();

        created.push(msg);
      }
    }

    // ----------------------------------------------------------------
    // 场景 6: 线索跟进提醒时间已到
    // ----------------------------------------------------------------
    const dueFollowRecords = await db
      .select({
        followId: leadFollowRecords.id,
        leadId: leadFollowRecords.leadId,
        nextRemindTime: leadFollowRecords.nextRemindTime,
        leadCustomerName: leads.customerName,
      })
      .from(leadFollowRecords)
      .innerJoin(leads, eq(leadFollowRecords.leadId, leads.id))
      .where(
        and(
          eq(leadFollowRecords.followerId, uid),
          isNotNull(leadFollowRecords.nextRemindTime),
          sql`${leadFollowRecords.nextRemindTime} <= NOW()`,
          isNull(leadFollowRecords.deletedAt),
          isNull(leads.deletedAt)
        )
      );

    for (const record of dueFollowRecords) {
      const existing = await db
        .select({ id: messages.id })
        .from(messages)
        .where(
          and(
            eq(messages.receiverId, uid),
            eq(messages.type, 'reminder'),
            eq(messages.relatedType, 'lead'),
            eq(messages.relatedId, record.leadId),
            sql`${messages.createdAt} >= CURRENT_DATE`
          )
        )
        .limit(1);

      if (existing.length === 0) {
        const [msg] = await db
          .insert(messages)
          .values({
            title: '线索跟进提醒',
            content: `线索「${record.leadCustomerName}」的跟进提醒时间已到，请及时联系并记录跟进情况。`,
            type: 'reminder',
            category: 'project',
            priority: 'normal',
            receiverId: uid,
            relatedType: 'lead',
            relatedId: record.leadId,
            relatedName: record.leadCustomerName,
            actionUrl: `/leads/${record.leadId}`,
            actionText: '查看线索',
            isRead: false,
            isDeleted: false,
            updatedAt: new Date(),
          })
          .returning();

        created.push(msg);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        checkedAt: now.toISOString(),
        createdCount: created.length,
        messages: created,
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
