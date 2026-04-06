import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { solutionTypes as solutionTypesTable } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';
import { successResponse, errorResponse } from '@/lib/api-response';

// GET - 获取解决方案类型列表
export async function GET() {
  try {
    const types = await db
      .select()
      .from(solutionTypesTable)
      .orderBy(desc(solutionTypesTable.createdAt));

    return successResponse(types);
  } catch (error) {
    console.error('Failed to fetch solution types:', error);
    return errorResponse('INTERNAL_ERROR', '获取解决方案类型列表失败');
  }
}

// POST - 创建解决方案类型
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const newType = await db
      .insert(solutionTypesTable)
      .values({
        code: body.code,
        name: body.name,
        description: body.description || null,
        status: body.status || 'active',
      })
      .returning();

    return successResponse(newType[0], { status: 201 });
  } catch (error) {
    console.error('Failed to create solution type:', error);
    return errorResponse('INTERNAL_ERROR', '创建解决方案类型失败');
  }
}

// PUT - 更新解决方案类型
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return errorResponse('BAD_REQUEST', '缺少解决方案类型ID');
    }

    const updatedType = await db
      .update(solutionTypesTable)
      .set({
        code: updateData.code,
        name: updateData.name,
        description: updateData.description,
        status: updateData.status,
        updatedAt: new Date(),
      })
      .where(eq(solutionTypesTable.id, id))
      .returning();

    return successResponse(updatedType[0]);
  } catch (error) {
    console.error('Failed to update solution type:', error);
    return errorResponse('INTERNAL_ERROR', '更新解决方案类型失败');
  }
}

// DELETE - 删除解决方案类型
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get('id') || '');

    if (!id) {
      return errorResponse('BAD_REQUEST', '缺少解决方案类型ID');
    }

    await db
      .delete(solutionTypesTable)
      .where(eq(solutionTypesTable.id, id));

    return successResponse({ success: true });
  } catch (error) {
    console.error('Failed to delete solution type:', error);
    return errorResponse('INTERNAL_ERROR', '删除解决方案类型失败');
  }
}
