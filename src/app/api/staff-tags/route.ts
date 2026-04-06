import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { staffTags } from '@/db/schema';
import { desc, eq, ilike, and } from 'drizzle-orm';
import { successResponse, errorResponse } from '@/lib/api-response';

// GET - 获取员工标签列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const status = searchParams.get('status');

    let conditions = [];
    
    if (search) {
      conditions.push(ilike(staffTags.tagName, `%${search}%`));
    }
    
    if (status && status !== 'all') {
      conditions.push(eq(staffTags.status, status));
    }

    const query = db
      .select()
      .from(staffTags)
      .orderBy(desc(staffTags.sortOrder), desc(staffTags.createdAt));

    let result;
    if (conditions.length > 0) {
      result = await query.where(and(...conditions));
    } else {
      result = await query;
    }

    return successResponse(result);
  } catch (error) {
    console.error('Failed to fetch staff tags:', error);
    return errorResponse('INTERNAL_ERROR', '获取员工标签列表失败');
  }
}

// POST - 创建员工标签
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tagName, tagColor, description, sortOrder, status } = body;

    if (!tagName) {
      return errorResponse('BAD_REQUEST', '标签名称为必填项');
    }

    const newTag = await db
      .insert(staffTags)
      .values({
        tagName,
        tagColor: tagColor || null,
        description: description || null,
        sortOrder: sortOrder || 0,
        status: status || 'active',
      })
      .returning();

    return successResponse(newTag[0], { status: 201 });
  } catch (error) {
    console.error('Failed to create staff tag:', error);
    return errorResponse('INTERNAL_ERROR', '创建员工标签失败');
  }
}

// PUT - 更新员工标签
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, tagName, tagColor, description, sortOrder, status } = body;

    if (!id) {
      return errorResponse('BAD_REQUEST', '标签ID为必填项');
    }

    const updateData: Record<string, any> = {
      updatedAt: new Date(),
    };
    
    if (tagName !== undefined) updateData.tagName = tagName;
    if (tagColor !== undefined) updateData.tagColor = tagColor;
    if (description !== undefined) updateData.description = description;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;
    if (status !== undefined) updateData.status = status;

    const updatedTag = await db
      .update(staffTags)
      .set(updateData)
      .where(eq(staffTags.id, id))
      .returning();

    if (!updatedTag.length) {
      return errorResponse('NOT_FOUND', '标签不存在');
    }

    return successResponse(updatedTag[0]);
  } catch (error) {
    console.error('Failed to update staff tag:', error);
    return errorResponse('INTERNAL_ERROR', '更新员工标签失败');
  }
}

// DELETE - 删除员工标签
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get('id') || '');

    if (!id) {
      return errorResponse('BAD_REQUEST', '标签ID为必填项');
    }

    await db.delete(staffTags).where(eq(staffTags.id, id));

    return successResponse({ success: true });
  } catch (error) {
    console.error('Failed to delete staff tag:', error);
    return errorResponse('INTERNAL_ERROR', '删除员工标签失败');
  }
}
