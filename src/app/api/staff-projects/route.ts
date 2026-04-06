import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { projectPresalesRecords, projects, users, presalesServiceTypes } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';
import { successResponse, errorResponse } from '@/lib/api-response';
import { formatDateField } from '@/lib/utils';

// 辅助函数：格式化记录中的日期字段
function formatRecordDates(record: Record<string, unknown>) {
  return {
    ...record,
    serviceDate: formatDateField(record.serviceDate as Date | string | null | undefined),
    createdAt: formatDateField(record.createdAt as Date | string | null | undefined),
  };
}

// GET - 获取员工项目关联列表（售前服务记录）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const staffId = searchParams.get('staffId');
    const projectId = searchParams.get('projectId');

    let baseQuery = db
      .select({
        id: projectPresalesRecords.id,
        staffId: projectPresalesRecords.staffId,
        projectId: projectPresalesRecords.projectId,
        serviceTypeId: projectPresalesRecords.serviceTypeId,
        serviceDate: projectPresalesRecords.serviceDate,
        durationHours: projectPresalesRecords.durationHours,
        description: projectPresalesRecords.description,
        status: projectPresalesRecords.status,
        createdAt: projectPresalesRecords.createdAt,
        // 关联查询
        staffName: users.realName,
        projectName: projects.projectName,
        serviceName: presalesServiceTypes.serviceName,
      })
      .from(projectPresalesRecords)
      .leftJoin(users, eq(projectPresalesRecords.staffId, users.id))
      .leftJoin(projects, eq(projectPresalesRecords.projectId, projects.id))
      .leftJoin(presalesServiceTypes, eq(projectPresalesRecords.serviceTypeId, presalesServiceTypes.id));

    if (staffId) {
      const result = await baseQuery.where(
        eq(projectPresalesRecords.staffId, parseInt(staffId))
      ).orderBy(desc(projectPresalesRecords.createdAt));
      return successResponse(result.map(formatRecordDates));
    }

    if (projectId) {
      const result = await baseQuery.where(
        eq(projectPresalesRecords.projectId, parseInt(projectId))
      ).orderBy(desc(projectPresalesRecords.createdAt));
      return successResponse(result.map(formatRecordDates));
    }

    const result = await baseQuery.orderBy(desc(projectPresalesRecords.createdAt));
    return successResponse(result.map(formatRecordDates));
  } catch (error) {
    console.error('Failed to fetch staff projects:', error);
    return errorResponse('INTERNAL_ERROR', '获取员工项目关联列表失败');
  }
}

// POST - 创建员工项目关联（售前服务记录）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { staffId, projectId, serviceTypeId, serviceDate, durationHours, description, status } = body;

    if (!staffId || !projectId || !serviceTypeId) {
      return errorResponse('BAD_REQUEST', '员工ID、项目ID、服务类型ID为必填项');
    }

    const newRecord = await db
      .insert(projectPresalesRecords)
      .values({
        staffId,
        projectId,
        serviceTypeId,
        serviceDate: serviceDate ? new Date(serviceDate) : null,
        durationHours: durationHours || null,
        description: description || null,
        status: status || null,
      })
      .returning();

    return successResponse(formatRecordDates(newRecord[0] as Record<string, unknown>), { status: 201 });
  } catch (error) {
    console.error('Failed to create staff project record:', error);
    return errorResponse('INTERNAL_ERROR', '创建员工项目关联失败');
  }
}

// PUT - 更新员工项目关联（售前服务记录）
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, serviceDate, durationHours, description, status } = body;

    if (!id) {
      return errorResponse('BAD_REQUEST', '记录ID为必填项');
    }

    const updateData: Record<string, any> = {};
    
    if (serviceDate !== undefined) updateData.serviceDate = serviceDate ? new Date(serviceDate) : null;
    if (durationHours !== undefined) updateData.durationHours = durationHours;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;

    const updatedRecord = await db
      .update(projectPresalesRecords)
      .set(updateData)
      .where(eq(projectPresalesRecords.id, id))
      .returning();

    if (!updatedRecord.length) {
      return errorResponse('NOT_FOUND', '记录不存在');
    }

    return successResponse(formatRecordDates(updatedRecord[0] as Record<string, unknown>));
  } catch (error) {
    console.error('Failed to update staff project record:', error);
    return errorResponse('INTERNAL_ERROR', '更新员工项目关联失败');
  }
}

// DELETE - 删除员工项目关联（售前服务记录）
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get('id') || '');

    if (!id) {
      return errorResponse('BAD_REQUEST', '记录ID为必填项');
    }

    await db.delete(projectPresalesRecords).where(eq(projectPresalesRecords.id, id));

    return successResponse({ success: true });
  } catch (error) {
    console.error('Failed to delete staff project record:', error);
    return errorResponse('INTERNAL_ERROR', '删除员工项目关联失败');
  }
}
