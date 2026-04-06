import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { presalesRecordParticipants } from '@/db/schema-extensions';
import { projectPresalesRecords } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withAuth } from '@/lib/auth-middleware';
import { canReadProject, canWriteProject } from '@/lib/permissions/project';

// DELETE - 删除参与人
export const DELETE = withAuth(async (
  request: NextRequest,
  context: { userId: number; params?: Record<string, string> }
) => {
  try {
    const projectId = parseInt(context.params?.id || '0');
    const recordId = parseInt(context.params?.recordId || '0');
    const participantId = parseInt(context.params?.participantId || '0');

    // 权限检查
    const canWrite = await canWriteProject(projectId, context.userId);
    if (!canWrite) {
      return errorResponse('FORBIDDEN', '您没有权限编辑此项目');
    }

    // 验证参与人存在且属于该服务记录
    const [participant] = await db
      .select()
      .from(presalesRecordParticipants)
      .where(and(
        eq(presalesRecordParticipants.id, participantId),
        eq(presalesRecordParticipants.presalesRecordId, recordId)
      ))
      .limit(1);

    if (!participant) {
      return errorResponse('NOT_FOUND', '参与人不存在');
    }

    // 删除参与人
    await db
      .delete(presalesRecordParticipants)
      .where(eq(presalesRecordParticipants.id, participantId));

    // 更新服务记录的统计信息
    await updatePresalesRecordStats(recordId);

    return successResponse({ success: true, message: '参与人已删除' });
  } catch (error) {
    console.error('Failed to delete participant:', error);
    return errorResponse('INTERNAL_ERROR', '删除参与人失败');
  }
});

// 辅助函数：更新服务记录的统计信息
async function updatePresalesRecordStats(recordId: number) {
  const stats = await db
    .select({
      totalWorkHours: sql<string>`COALESCE(SUM(work_hours), 0)`,
      participantCount: sql<string>`COUNT(*)`,
    })
    .from(presalesRecordParticipants)
    .where(eq(presalesRecordParticipants.presalesRecordId, recordId));

  if (stats[0]) {
    await db
      .update(projectPresalesRecords)
      .set({
        totalWorkHours: stats[0].totalWorkHours,
        participantCount: Number(stats[0].participantCount),
      })
      .where(eq(projectPresalesRecords.id, recordId));
  }
}
