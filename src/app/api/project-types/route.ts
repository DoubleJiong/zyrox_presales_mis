import { NextRequest } from 'next/server';
import { db } from '@/db';
import { attributes } from '@/db/schema';
import { eq, and, isNull, asc } from 'drizzle-orm';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withAuth } from '@/lib/auth-middleware';

export const GET = withAuth(async () => {
  try {
    const items = await db
      .select()
      .from(attributes)
      .where(and(eq(attributes.category, 'project_type'), isNull(attributes.deletedAt)))
      .orderBy(asc(attributes.sortOrder), asc(attributes.id));
    return successResponse(items.map(item => ({
      id: item.id,
      code: item.value,
      name: item.name,
      description: item.description,
    })));
  } catch {
    return errorResponse('INTERNAL_SERVER_ERROR', '获取项目类型失败');
  }
});

export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { code, name, description } = body;
    if (!code || !name) {
      return errorResponse('BAD_REQUEST', '编码和名称为必填项');
    }
    const [item] = await db
      .insert(attributes)
      .values({
        category: 'project_type',
        code: `project_type_${code}`,
        value: code,
        name,
        description: description || null,
        status: 'active',
        isSystem: false,
      })
      .returning();
    return successResponse({ id: item.id, code: item.value, name: item.name, description: item.description });
  } catch {
    return errorResponse('INTERNAL_SERVER_ERROR', '创建项目类型失败');
  }
});

export const DELETE = withAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return errorResponse('BAD_REQUEST', '缺少ID参数');
    await db
      .update(attributes)
      .set({ deletedAt: new Date() })
      .where(and(eq(attributes.id, parseInt(id, 10)), eq(attributes.category, 'project_type')));
    return successResponse({ id: parseInt(id, 10) });
  } catch {
    return errorResponse('INTERNAL_SERVER_ERROR', '删除项目类型失败');
  }
});
