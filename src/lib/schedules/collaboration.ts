import { db } from '@/db';
import { messages, users } from '@/db/schema';
import { inArray } from 'drizzle-orm';

export interface ScheduleParticipant {
  userId: number;
  userName: string;
}

interface ScheduleReminder {
  enabled: boolean;
  remindAt?: string;
  remindType?: string;
}

interface ScheduleRepeat {
  type: string;
  interval: number;
  endDate?: string;
  count?: number;
}

function toParticipantId(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = parseInt(value, 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }

  return null;
}

function readParticipantId(participant: unknown): number | null {
  if (participant && typeof participant === 'object') {
    const record = participant as Record<string, unknown>;
    return toParticipantId(record.userId ?? record.id);
  }

  return toParticipantId(participant);
}

export async function normalizeScheduleParticipants(participants: unknown): Promise<ScheduleParticipant[]> {
  if (!Array.isArray(participants) || participants.length === 0) {
    return [];
  }

  const participantIds: number[] = [];

  for (const participant of participants) {
    const participantId = readParticipantId(participant);
    if (participantId && !participantIds.includes(participantId)) {
      participantIds.push(participantId);
    }
  }

  if (participantIds.length === 0) {
    return [];
  }

  const userRows = await db
    .select({
      id: users.id,
      realName: users.realName,
    })
    .from(users)
    .where(inArray(users.id, participantIds));

  const userNameById = new Map(userRows.map((user) => [user.id, user.realName]));

  return participantIds
    .filter((participantId) => userNameById.has(participantId))
    .map((participantId) => ({
      userId: participantId,
      userName: userNameById.get(participantId) || `用户${participantId}`,
    }));
}

export function normalizeScheduleReminder(reminder: unknown): ScheduleReminder | null {
  if (!reminder || typeof reminder !== 'object') {
    return null;
  }

  const record = reminder as Record<string, unknown>;
  if (!record.enabled) {
    return null;
  }

  const normalizedReminder: ScheduleReminder = {
    enabled: true,
  };

  if (typeof record.remindType === 'string' && record.remindType.trim()) {
    normalizedReminder.remindType = record.remindType.trim();
  }

  if (typeof record.remindAt === 'string' && record.remindAt.trim()) {
    normalizedReminder.remindAt = record.remindAt.trim();
  }

  return normalizedReminder;
}

export function normalizeScheduleRepeat(repeat: unknown): ScheduleRepeat | null {
  if (!repeat || typeof repeat !== 'object') {
    return null;
  }

  const record = repeat as Record<string, unknown>;
  const validTypes = ['daily', 'weekly', 'monthly', 'yearly'];
  const repeatType = typeof record.type === 'string' ? record.type.trim() : '';

  if (!validTypes.includes(repeatType)) {
    return null;
  }

  const intervalValue = typeof record.interval === 'number'
    ? record.interval
    : typeof record.interval === 'string'
      ? parseInt(record.interval, 10)
      : 1;

  const normalizedRepeat: ScheduleRepeat = {
    type: repeatType,
    interval: Number.isInteger(intervalValue) && intervalValue > 0 ? intervalValue : 1,
  };

  if (typeof record.endDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(record.endDate)) {
    normalizedRepeat.endDate = record.endDate;
  }

  const countValue = typeof record.count === 'number'
    ? record.count
    : typeof record.count === 'string'
      ? parseInt(record.count, 10)
      : null;

  if (countValue && Number.isInteger(countValue) && countValue > 0) {
    normalizedRepeat.count = countValue;
  }

  return normalizedRepeat;
}

function buildScheduleMessageContent(
  title: string,
  startDate: string,
  startTime?: string | null,
  location?: string | null,
  mode: 'created' | 'updated' = 'created'
) {
  const whenText = startTime ? `${startDate} ${startTime}` : startDate;
  const locationText = location ? `，地点：${location}` : '';

  if (mode === 'updated') {
    return `您参与的协作日程《${title}》已更新，时间：${whenText}${locationText}。`;
  }

  return `您被邀请参与协作日程《${title}》，时间：${whenText}${locationText}。`;
}

export async function sendScheduleParticipantMessages(params: {
  scheduleId: number;
  title: string;
  startDate: string;
  startTime?: string | null;
  location?: string | null;
  participants: ScheduleParticipant[];
  senderId: number;
  mode?: 'created' | 'updated';
}) {
  const { scheduleId, title, startDate, startTime, location, participants, senderId, mode = 'created' } = params;

  if (participants.length === 0) {
    return;
  }

  await db.insert(messages).values(
    participants.map((participant) => ({
      title: mode === 'updated' ? '协作日程已更新' : '协作日程邀请',
      content: buildScheduleMessageContent(title, startDate, startTime, location, mode),
      type: 'reminder',
      category: 'system',
      priority: 'normal',
      senderId,
      receiverId: participant.userId,
      relatedType: 'schedule',
      relatedId: scheduleId,
      relatedName: title,
      actionUrl: '/calendar?view=list',
      actionText: '查看日程',
      isRead: false,
      isDeleted: false,
      metadata: {
        mode,
        startDate,
        startTime: startTime || null,
        location: location || null,
      },
      updatedAt: new Date(),
    }))
  );
}