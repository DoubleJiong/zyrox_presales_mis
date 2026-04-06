import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { attributes } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { successResponse, errorResponse } from '@/lib/api-response';

// GET - 获取属性列表（支持分类过滤）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const status = searchParams.get('status') || 'active';

    // 构建查询条件
    const conditions = [eq(attributes.status, status)];
    
    if (category) {
      conditions.push(eq(attributes.category, category));
    }

    const attributeList = await db
      .select({
        id: attributes.id,
        category: attributes.category,
        code: attributes.code,
        name: attributes.name,
        value: attributes.value,
        type: attributes.valueType, // 重命名为前端期望的 type
        valueType: attributes.valueType, // 保留原字段名兼容
        options: attributes.extraData, // extraData 可能包含 options
        description: attributes.description,
        status: attributes.status,
      })
      .from(attributes)
      .where(and(...conditions));

    return NextResponse.json({
      success: true,
      data: attributeList,
    });
  } catch (error) {
    console.error('Failed to fetch attributes:', error);
    return errorResponse('INTERNAL_ERROR', '获取属性列表失败');
  }
}

// POST - 创建属性
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { category, code, name, value, valueType, description, status } = body;

    // 验证必填字段
    if (!category || !code || !name) {
      return errorResponse('BAD_REQUEST', '分类、编码和名称为必填项');
    }

    // 创建新属性
    const newAttribute = await db
      .insert(attributes)
      .values({
        category,
        code,
        name,
        value: value || code,
        valueType: valueType || 'string',
        description: description || null,
        status: status || 'active',
      })
      .returning();

    return NextResponse.json(
      {
        success: true,
        data: newAttribute[0],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Failed to create attribute:', error);
    return errorResponse('INTERNAL_ERROR', '创建属性失败');
  }
}
