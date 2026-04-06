import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { projectPresalesRecords, users, presalesServiceTypes } from '@/db/schema';
import { presalesRecordParticipants } from '@/db/schema-extensions';
import { desc, eq } from 'drizzle-orm';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withAuth } from '@/lib/auth-middleware';
import { canReadProject, canWriteProject } from '@/lib/permissions/project';
import { formatDateField } from '@/lib/utils';

// GET - 获取项目的售前服务记录
export const GET = withAuth(async (
  request: NextRequest,
  context: { userId: number; params?: Record<string, string> }
) => {
  try {
    const projectId = parseInt(context.params?.id || '0');

    // 权限检查
    const canRead = await canReadProject(projectId, context.userId);
    if (!canRead) {
      return errorResponse('FORBIDDEN', '您没有权限查看此项目');
    }

    const records = await db
      .select({
        id: projectPresalesRecords.id,
        projectId: projectPresalesRecords.projectId,
        serviceTypeId: projectPresalesRecords.serviceTypeId,
        staffId: projectPresalesRecords.staffId,
        serviceDate: projectPresalesRecords.serviceDate,
        durationHours: projectPresalesRecords.durationHours,
        description: projectPresalesRecords.description,
        status: projectPresalesRecords.status,
        totalWorkHours: projectPresalesRecords.totalWorkHours,
        participantCount: projectPresalesRecords.participantCount,
        createdAt: projectPresalesRecords.createdAt,
        serviceName: presalesServiceTypes.serviceName,
        serviceCode: presalesServiceTypes.serviceCode,
        staffName: users.realName,
        serviceCategory: presalesServiceTypes.serviceCategory,
        serviceWeight: presalesServiceTypes.weight,
      })
      .from(projectPresalesRecords)
      .leftJoin(presalesServiceTypes, eq(projectPresalesRecords.serviceTypeId, presalesServiceTypes.id))
      .leftJoin(users, eq(projectPresalesRecords.staffId, users.id))
      .where(eq(projectPresalesRecords.projectId, projectId))
      .orderBy(desc(projectPresalesRecords.serviceDate));

    // 获取每条记录的参与人信息
    const recordsWithParticipants = await Promise.all(
      records.map(async (record) => {
        const participants = await db
          .select({
            id: presalesRecordParticipants.id,
            userId: presalesRecordParticipants.userId,
            contributionPct: presalesRecordParticipants.contributionPct,
            workHours: presalesRecordParticipants.workHours,
            role: presalesRecordParticipants.role,
            userName: users.realName,
          })
          .from(presalesRecordParticipants)
          .leftJoin(users, eq(presalesRecordParticipants.userId, users.id))
          .where(eq(presalesRecordParticipants.presalesRecordId, record.id));

        return {
          ...record,
          // 格式化日期字段，解决 Drizzle ORM timestamp 序列化问题
          serviceDate: formatDateField(record.serviceDate),
          createdAt: formatDateField(record.createdAt),
          participants,
        };
      })
    );

    return NextResponse.json(recordsWithParticipants);
  } catch (error) {
    console.error('Failed to fetch presales records:', error);
    return errorResponse('INTERNAL_ERROR', '获取售前服务记录失败');
  }
});

// POST - 创建售前服务记录
export const POST = withAuth(async (
  request: NextRequest,
  context: { userId: number; params?: Record<string, string> }
) => {
  try {
    const projectId = parseInt(context.params?.id || '0');
    const body = await request.json();

    // 权限检查
    const canWrite = await canWriteProject(projectId, context.userId);
    if (!canWrite) {
      return errorResponse('FORBIDDEN', '您没有权限编辑此项目');
    }

    const newRecord = await db
      .insert(projectPresalesRecords)
      .values({
        projectId,
        serviceTypeId: body.serviceTypeId,
        staffId: body.staffId,
        serviceDate: body.serviceDate ? new Date(body.serviceDate) : null,
        durationHours: body.durationHours || null,
        description: body.description || null,
        status: body.status || 'draft', // 默认状态为草稿
      })
      .returning();

    // 格式化日期字段
    const formattedRecord = {
      ...newRecord[0],
      serviceDate: formatDateField(newRecord[0].serviceDate),
      createdAt: formatDateField(newRecord[0].createdAt),
    };

    return NextResponse.json(formattedRecord, { status: 201 });
  } catch (error) {
    console.error('Failed to create presales record:', error);
    return errorResponse('INTERNAL_ERROR', '创建售前服务记录失败');
  }
});
