import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { messages, schedules, tasks } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { withAuth } from '@/lib/auth-middleware';
import {
  normalizeScheduleParticipants,
  normalizeScheduleReminder,
  normalizeScheduleRepeat,
  sendScheduleParticipantMessages,
} from '@/lib/schedules/collaboration';

function parseScheduleId(idParam: string | undefined) {
  const scheduleId = Number.parseInt(idParam || '', 10);
  return Number.isInteger(scheduleId) && scheduleId > 0 ? scheduleId : null;
}

function buildScheduleAccessCondition(userId: number) {
  return sql`(
    ${schedules.userId} = ${userId}
    OR EXISTS (
      SELECT 1
      FROM jsonb_array_elements(COALESCE(${schedules.participants}, '[]'::jsonb)) AS participant
      WHERE (participant->>'userId')::int = ${userId}
    )
  )`;
}

// 获取单个日程详情
export const GET = withAuth(async (
  request: NextRequest,
  { userId, params }: { userId: number; params?: Record<string, string> }
) => {
  try {
    const scheduleId = parseScheduleId(params?.id);
    if (!scheduleId) {
      return NextResponse.json({
        success: false,
        error: '日程ID无效',
      }, { status: 400 });
    }

    const [schedule] = await db
      .select()
      .from(schedules)
      .where(and(
        eq(schedules.id, scheduleId),
        buildScheduleAccessCondition(userId)
      ));

    if (!schedule) {
      return NextResponse.json({
        success: false,
        error: '日程不存在或无权访问',
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        ...schedule,
        isOwner: schedule.userId === userId,
        accessRole: schedule.userId === userId ? 'owner' : 'participant',
      },
    });
  } catch (error) {
    console.error('Get schedule API error:', error);
    return NextResponse.json({
      success: false,
      error: '获取日程详情失败',
    }, { status: 500 });
  }
});

// 更新日程
export const PUT = withAuth(async (
  request: NextRequest,
  { userId, params }: { userId: number; params?: Record<string, string> }
) => {
  try {
    const scheduleId = parseScheduleId(params?.id);
    if (!scheduleId) {
      return NextResponse.json({
        success: false,
        error: '日程ID无效',
      }, { status: 400 });
    }

    const body = await request.json();

    // 先验证日程是否属于当前用户
    const [existingSchedule] = await db
      .select()
      .from(schedules)
      .where(and(
        eq(schedules.id, scheduleId),
        eq(schedules.userId, userId)
      ));

    if (!existingSchedule) {
      return NextResponse.json({
        success: false,
        error: '日程不存在或无权修改',
      }, { status: 404 });
    }

    const normalizedParticipants = Object.prototype.hasOwnProperty.call(body, 'participants')
      ? await normalizeScheduleParticipants(body.participants)
      : (existingSchedule.participants || []);
    const normalizedReminder = Object.prototype.hasOwnProperty.call(body, 'reminder')
      ? normalizeScheduleReminder(body.reminder)
      : existingSchedule.reminder;
    const normalizedRepeat = Object.prototype.hasOwnProperty.call(body, 'repeat')
      ? normalizeScheduleRepeat(body.repeat)
      : existingSchedule.repeat;

    const collaborationChanged = [
      'participants',
      'title',
      'startDate',
      'startTime',
      'endDate',
      'endTime',
      'location',
      'description',
      'reminder',
      'repeat',
    ].some((field) => Object.prototype.hasOwnProperty.call(body, field));

    const [updatedSchedule] = await db
      .update(schedules)
      .set({
        ...body,
        participants: normalizedParticipants.length > 0 ? normalizedParticipants : null,
        reminder: normalizedReminder,
        repeat: normalizedRepeat,
        updatedAt: new Date(),
      })
      .where(and(
        eq(schedules.id, scheduleId),
        eq(schedules.userId, userId)
      ))
      .returning();

    if (collaborationChanged) {
      await sendScheduleParticipantMessages({
        scheduleId: updatedSchedule.id,
        title: updatedSchedule.title,
        startDate: updatedSchedule.startDate,
        startTime: updatedSchedule.startTime,
        location: updatedSchedule.location,
        participants: normalizedParticipants,
        senderId: userId,
        mode: 'updated',
      });
    }

    // D4: 日程取消时，若关联任务则通知任务负责人
    if (
      body.scheduleStatus === 'cancelled' &&
      existingSchedule.scheduleStatus !== 'cancelled' &&
      updatedSchedule.relatedType === 'task' &&
      updatedSchedule.relatedId
    ) {
      try {
        const [relatedTask] = await db
          .select({ assigneeId: tasks.assigneeId, taskName: tasks.taskName })
          .from(tasks)
          .where(eq(tasks.id, updatedSchedule.relatedId));

        if (relatedTask?.assigneeId && relatedTask.assigneeId !== userId) {
          await db.insert(messages).values({
            receiverId: relatedTask.assigneeId,
            senderId: userId,
            title: '关联日程已取消，请确认任务状态',
            content: `任务《${relatedTask.taskName}》的关联日程《${updatedSchedule.title}》已取消，请确认是否需要调整任务计划。`,
            type: 'reminder',
            priority: 'normal',
            relatedType: 'task',
            relatedId: updatedSchedule.relatedId,
            actionUrl: `/tasks/${updatedSchedule.relatedId}`,
            actionText: '查看任务',
            isRead: false,
            isDeleted: false,
          });
        }
      } catch (notifyErr) {
        console.error('[Schedules] Failed to notify task assignee on schedule cancel:', notifyErr);
      }
    }

    return NextResponse.json({
      success: true,
      data: updatedSchedule,
      message: '日程更新成功',
    });
  } catch (error) {
    console.error('Update schedule API error:', error);
    return NextResponse.json({
      success: false,
      error: '更新日程失败',
    }, { status: 500 });
  }
});

// 删除日程
export const DELETE = withAuth(async (
  request: NextRequest,
  { userId, params }: { userId: number; params?: Record<string, string> }
) => {
  try {
    const scheduleId = parseScheduleId(params?.id);
    if (!scheduleId) {
      return NextResponse.json({
        success: false,
        error: '日程ID无效',
      }, { status: 400 });
    }

    // 先验证日程是否属于当前用户
    const [existingSchedule] = await db
      .select()
      .from(schedules)
      .where(and(
        eq(schedules.id, scheduleId),
        eq(schedules.userId, userId)
      ));

    if (!existingSchedule) {
      return NextResponse.json({
        success: false,
        error: '日程不存在或无权删除',
      }, { status: 404 });
    }

    await db
      .delete(schedules)
      .where(and(
        eq(schedules.id, scheduleId),
        eq(schedules.userId, userId)
      ));

    return NextResponse.json({
      success: true,
      message: '日程删除成功',
    });
  } catch (error) {
    console.error('Delete schedule API error:', error);
    return NextResponse.json({
      success: false,
      error: '删除日程失败',
    }, { status: 500 });
  }
});
