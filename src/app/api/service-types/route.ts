import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { presalesServiceTypes } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';
import { successResponse, errorResponse } from '@/lib/api-response';

// GET - 获取售前服务类型列表
export async function GET() {
  try {
    const serviceTypes = await db
      .select()
      .from(presalesServiceTypes)
      .orderBy(desc(presalesServiceTypes.createdAt));

    return successResponse(serviceTypes);
  } catch (error) {
    console.error('Failed to fetch service types:', error);
    return errorResponse('INTERNAL_ERROR', '获取售前服务类型列表失败');
  }
}

// POST - 创建售前服务类型
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const newServiceType = await db
      .insert(presalesServiceTypes)
      .values({
        serviceName: body.serviceName,
        serviceCode: body.serviceCode,
        serviceCategory: body.serviceCategory || null,
        description: body.description || null,
        weight: body.weight || null,
        status: body.status || 'active',
      })
      .returning();

    return successResponse(newServiceType[0], { status: 201 });
  } catch (error) {
    console.error('Failed to create service type:', error);
    return errorResponse('INTERNAL_ERROR', '创建售前服务类型失败');
  }
}

// PUT - 更新售前服务类型
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return errorResponse('BAD_REQUEST', '缺少售前服务类型ID');
    }

    const updatedServiceType = await db
      .update(presalesServiceTypes)
      .set({
        serviceName: updateData.serviceName,
        serviceCode: updateData.serviceCode,
        serviceCategory: updateData.serviceCategory,
        description: updateData.description,
        weight: updateData.weight,
        status: updateData.status,
        updatedAt: new Date(),
      })
      .where(eq(presalesServiceTypes.id, id))
      .returning();

    return successResponse(updatedServiceType[0]);
  } catch (error) {
    console.error('Failed to update service type:', error);
    return errorResponse('INTERNAL_ERROR', '更新售前服务类型失败');
  }
}

// DELETE - 删除售前服务类型
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get('id') || '');

    if (!id) {
      return errorResponse('BAD_REQUEST', '缺少售前服务类型ID');
    }

    await db
      .delete(presalesServiceTypes)
      .where(eq(presalesServiceTypes.id, id));

    return successResponse({ success: true });
  } catch (error) {
    console.error('Failed to delete service type:', error);
    return errorResponse('INTERNAL_ERROR', '删除售前服务类型失败');
  }
}
