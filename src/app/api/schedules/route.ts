import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { schedules } from '@/db/schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { withAuth } from '@/lib/auth-middleware';
import {
  normalizeScheduleParticipants,
  normalizeScheduleReminder,
  normalizeScheduleRepeat,
  sendScheduleParticipantMessages,
} from '@/lib/schedules/collaboration';

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

// 获取日程列表
export const GET = withAuth(async (request: NextRequest, { userId }) => {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const status = searchParams.get('status');

    const conditions = [buildScheduleAccessCondition(userId)];

    if (startDate) {
      conditions.push(gte(schedules.startDate, startDate));
    }
    if (endDate) {
      conditions.push(lte(schedules.endDate || schedules.startDate, endDate));
    }
    if (status) {
      conditions.push(eq(schedules.scheduleStatus, status));
    }

    const scheduleList = await db
      .select()
      .from(schedules)
      .where(and(...conditions))
      .orderBy(schedules.startDate, schedules.startTime)
      .limit(100);

    return NextResponse.json({
      success: true,
      data: scheduleList.map(schedule => ({
        id: schedule.id,
        title: schedule.title,
        type: schedule.type || 'other',
        startDate: schedule.startDate,
        startTime: schedule.startTime,
        endDate: schedule.endDate,
        endTime: schedule.endTime,
        allDay: schedule.allDay,
        location: schedule.location,
        ownerId: schedule.userId,
        isOwner: schedule.userId === userId,
        accessRole: schedule.userId === userId ? 'owner' : 'participant',
        participants: schedule.participants,
        reminder: schedule.reminder,
        repeat: schedule.repeat,
        relatedType: schedule.relatedType,
        relatedId: schedule.relatedId,
        description: schedule.description,
        scheduleStatus: schedule.scheduleStatus,
        createdAt: schedule.createdAt,
      })),
    });
  } catch (error) {
    console.error('Get schedules API error:', error);
    return NextResponse.json({
      success: false,
      error: '获取日程列表失败',
      data: [],
    });
  }
});

// 创建日程
export const POST = withAuth(async (request: NextRequest, { userId }) => {
  try {
    const body = await request.json();
    const {
      title,
      type = 'other',
      startDate,
      startTime,
      endDate,
      endTime,
      allDay = false,
      location,
      participants,
      relatedType,
      relatedId,
      reminder,
      repeat,
      description,
    } = body;

    if (!title || !startDate) {
      return NextResponse.json({
        success: false,
        error: '请输入日程标题和开始日期',
      }, { status: 400 });
    }

    const normalizedParticipants = await normalizeScheduleParticipants(participants);
    const normalizedReminder = normalizeScheduleReminder(reminder);
    const normalizedRepeat = normalizeScheduleRepeat(repeat);

    const [newSchedule] = await db
      .insert(schedules)
      .values({
        title,
        type,
        startDate,
        startTime,
        endDate: endDate || startDate,
        endTime,
        allDay,
        location,
        participants: normalizedParticipants.length > 0 ? normalizedParticipants : null,
        relatedType,
        relatedId,
        reminder: normalizedReminder,
        repeat: normalizedRepeat,
        description,
        userId,
        scheduleStatus: 'scheduled',
      })
      .returning();

    await sendScheduleParticipantMessages({
      scheduleId: newSchedule.id,
      title: newSchedule.title,
      startDate: newSchedule.startDate,
      startTime: newSchedule.startTime,
      location: newSchedule.location,
      participants: normalizedParticipants,
      senderId: userId,
      mode: 'created',
    });

    return NextResponse.json({
      success: true,
      data: newSchedule,
      message: '日程创建成功',
    }, { status: 201 });
  } catch (error) {
    console.error('Create schedule API error:', error);
    return NextResponse.json({
      success: false,
      error: '创建日程失败',
    }, { status: 500 });
  }
});
