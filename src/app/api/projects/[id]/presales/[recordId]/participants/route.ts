import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { presalesRecordParticipants } from '@/db/schema-extensions';
import { projectPresalesRecords, users } from '@/db/schema';
import { desc, eq, and, sql } from 'drizzle-orm';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withAuth } from '@/lib/auth-middleware';
import { canReadProject, canWriteProject } from '@/lib/permissions/project';

// 参与人角色类型
type ParticipantRole = 'primary_contributor' | 'assistant' | 'reviewer';

// GET - 获取服务记录的参与人列表
export const GET = withAuth(async (
  request: NextRequest,
  context: { userId: number; params?: Record<string, string> }
) => {
  try {
    const projectId = parseInt(context.params?.id || '0');
    const recordId = parseInt(context.params?.recordId || '0');

    // 权限检查
    const canRead = await canReadProject(projectId, context.userId);
    if (!canRead) {
      return errorResponse('FORBIDDEN', '您没有权限查看此项目');
    }

    // 验证服务记录属于该项目
    const [record] = await db
      .select()
      .from(projectPresalesRecords)
      .where(and(
        eq(projectPresalesRecords.id, recordId),
        eq(projectPresalesRecords.projectId, projectId)
      ))
      .limit(1);

    if (!record) {
      return errorResponse('NOT_FOUND', '服务记录不存在');
    }

    // 获取参与人列表
    const participants = await db
      .select({
        id: presalesRecordParticipants.id,
        presalesRecordId: presalesRecordParticipants.presalesRecordId,
        userId: presalesRecordParticipants.userId,
        contributionPct: presalesRecordParticipants.contributionPct,
        workHours: presalesRecordParticipants.workHours,
        role: presalesRecordParticipants.role,
        remarks: presalesRecordParticipants.remarks,
        createdAt: presalesRecordParticipants.createdAt,
        // 用户信息
        userName: users.realName,
        userEmail: users.email,
        userDepartment: users.department,
      })
      .from(presalesRecordParticipants)
      .leftJoin(users, eq(presalesRecordParticipants.userId, users.id))
      .where(eq(presalesRecordParticipants.presalesRecordId, recordId))
      .orderBy(desc(presalesRecordParticipants.contributionPct));

    // 计算总贡献百分比
    const totalContribution = participants.reduce(
      (sum, p) => sum + Number(p.contributionPct || 0), 
      0
    );

    return NextResponse.json({
      participants,
      totalContribution,
      isValid: Math.abs(totalContribution - 100) < 0.01, // 贡献百分比总和应为100%
    });
  } catch (error) {
    console.error('Failed to fetch participants:', error);
    return errorResponse('INTERNAL_ERROR', '获取参与人列表失败');
  }
});

// POST - 添加参与人
export const POST = withAuth(async (
  request: NextRequest,
  context: { userId: number; params?: Record<string, string> }
) => {
  try {
    const projectId = parseInt(context.params?.id || '0');
    const recordId = parseInt(context.params?.recordId || '0');
    const body = await request.json();

    // 权限检查
    const canWrite = await canWriteProject(projectId, context.userId);
    if (!canWrite) {
      return errorResponse('FORBIDDEN', '您没有权限编辑此项目');
    }

    // 验证服务记录属于该项目
    const [record] = await db
      .select()
      .from(projectPresalesRecords)
      .where(and(
        eq(projectPresalesRecords.id, recordId),
        eq(projectPresalesRecords.projectId, projectId)
      ))
      .limit(1);

    if (!record) {
      return errorResponse('NOT_FOUND', '服务记录不存在');
    }

    // 检查是否已存在该参与人
    const [existing] = await db
      .select()
      .from(presalesRecordParticipants)
      .where(and(
        eq(presalesRecordParticipants.presalesRecordId, recordId),
        eq(presalesRecordParticipants.userId, body.userId)
      ))
      .limit(1);

    if (existing) {
      return errorResponse('BAD_REQUEST', '该人员已在此服务记录中');
    }

    // 检查参与人数量上限（最多10人）
    const currentParticipants = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(presalesRecordParticipants)
      .where(eq(presalesRecordParticipants.presalesRecordId, recordId));

    const participantCount = Number(currentParticipants[0]?.count || 0);
    if (participantCount >= 10) {
      return errorResponse('BAD_REQUEST', '参与人数量已达上限（最多支持10人）');
    }

    // 验证贡献百分比
    const currentTotal = await db
      .select({ total: sql<string>`COALESCE(SUM(contribution_pct), 0)` })
      .from(presalesRecordParticipants)
      .where(eq(presalesRecordParticipants.presalesRecordId, recordId));

    const newTotal = Number(currentTotal[0]?.total || 0) + Number(body.contributionPct || 0);
    if (newTotal > 100) {
      return errorResponse('BAD_REQUEST', `贡献百分比总和将超过100%（当前：${currentTotal[0]?.total}%，新增：${body.contributionPct}%）`);
    }

    // 创建参与人
    const [newParticipant] = await db
      .insert(presalesRecordParticipants)
      .values({
        presalesRecordId: recordId,
        userId: body.userId,
        contributionPct: body.contributionPct || '100.00',
        workHours: body.workHours || null,
        role: body.role || 'assistant',
        remarks: body.remarks || null,
        createdBy: context.userId,
      })
      .returning();

    // 更新服务记录的总工时和参与人数
    await updatePresalesRecordStats(recordId);

    return NextResponse.json(newParticipant, { status: 201 });
  } catch (error) {
    console.error('Failed to add participant:', error);
    return errorResponse('INTERNAL_ERROR', '添加参与人失败');
  }
});

// PUT - 批量更新参与人
export const PUT = withAuth(async (
  request: NextRequest,
  context: { userId: number; params?: Record<string, string> }
) => {
  try {
    const projectId = parseInt(context.params?.id || '0');
    const recordId = parseInt(context.params?.recordId || '0');
    const body = await request.json();

    // 权限检查
    const canWrite = await canWriteProject(projectId, context.userId);
    if (!canWrite) {
      return errorResponse('FORBIDDEN', '您没有权限编辑此项目');
    }

    // 验证服务记录属于该项目
    const [record] = await db
      .select()
      .from(projectPresalesRecords)
      .where(and(
        eq(projectPresalesRecords.id, recordId),
        eq(projectPresalesRecords.projectId, projectId)
      ))
      .limit(1);

    if (!record) {
      return errorResponse('NOT_FOUND', '服务记录不存在');
    }

    const participants = body.participants as Array<{
      id?: number;
      userId: number;
      contributionPct: string;
      workHours?: string;
      role?: ParticipantRole;
      remarks?: string;
    }>;

    if (!participants || !Array.isArray(participants)) {
      return errorResponse('BAD_REQUEST', '无效的参与人数据');
    }

    // 验证贡献百分比总和
    const totalContribution = participants.reduce(
      (sum, p) => sum + Number(p.contributionPct || 0), 
      0
    );
    if (Math.abs(totalContribution - 100) > 0.01) {
      return errorResponse('BAD_REQUEST', `贡献百分比总和必须为100%（当前：${totalContribution.toFixed(2)}%）`);
    }

    // 删除现有参与人
    await db
      .delete(presalesRecordParticipants)
      .where(eq(presalesRecordParticipants.presalesRecordId, recordId));

    // 批量插入新的参与人
    const newParticipants = await db
      .insert(presalesRecordParticipants)
      .values(
        participants.map(p => ({
          presalesRecordId: recordId,
          userId: p.userId,
          contributionPct: p.contributionPct,
          workHours: p.workHours || null,
          role: p.role || 'assistant',
          remarks: p.remarks || null,
          createdBy: context.userId,
        }))
      )
      .returning();

    // 更新服务记录的总工时和参与人数
    await updatePresalesRecordStats(recordId);

    return NextResponse.json({ 
      success: true, 
      participants: newParticipants 
    });
  } catch (error) {
    console.error('Failed to update participants:', error);
    return errorResponse('INTERNAL_ERROR', '更新参与人失败');
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
