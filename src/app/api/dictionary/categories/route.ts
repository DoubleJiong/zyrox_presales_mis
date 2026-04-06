import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { attributeCategories } from '@/db/schema';
import { eq, isNull, desc, asc, and } from 'drizzle-orm';
import { canManageAttributeCategoryInGui } from '@/lib/config/dictionary-governance';

/**
 * GET /api/dictionary/categories
 * 获取字典分类列表
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let query = db.select().from(attributeCategories);

    // 构建条件
    const conditions = [];
    
    // 排除已删除
    conditions.push(isNull(attributeCategories.deletedAt));
    
    // 状态过滤
    if (status && status !== 'all') {
      conditions.push(eq(attributeCategories.status, status));
    }

    // 执行查询
    const categories = await db
      .select()
      .from(attributeCategories)
      .where(isNull(attributeCategories.deletedAt))
      .orderBy(asc(attributeCategories.sortOrder));

    // 过滤状态（如果需要）
    const filteredCategories = status && status !== 'all'
      ? categories.filter(c => c.status === status)
      : categories;

    return NextResponse.json({
      success: true,
      data: filteredCategories,
    });
  } catch (error) {
    console.error('Failed to fetch categories:', error);
    return NextResponse.json(
      { success: false, error: '获取字典分类失败' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/dictionary/categories
 * 创建字典分类
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { categoryCode, categoryName, description, icon, sortOrder, status } = body;

    // 验证必填字段
    if (!categoryCode || !categoryName) {
      return NextResponse.json(
        { success: false, error: '分类编码和名称为必填项' },
        { status: 400 }
      );
    }

    // 检查编码是否已存在
    const existing = await db
      .select()
      .from(attributeCategories)
      .where(and(
        eq(attributeCategories.categoryCode, categoryCode),
        isNull(attributeCategories.deletedAt)
      ))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { success: false, error: '分类编码已存在' },
        { status: 400 }
      );
    }

    // 创建分类
    const [newCategory] = await db
      .insert(attributeCategories)
      .values({
        categoryCode,
        categoryName,
        description: description || null,
        icon: icon || null,
        sortOrder: sortOrder || 0,
        isSystem: false,
        status: status || 'active',
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: newCategory,
    }, { status: 201 });
  } catch (error) {
    console.error('Failed to create category:', error);
    return NextResponse.json(
      { success: false, error: '创建字典分类失败' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/dictionary/categories
 * 更新字典分类
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, categoryName, description, icon, sortOrder, status } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: '缺少分类ID' },
        { status: 400 }
      );
    }

    // 检查分类是否存在
    const existing = await db
      .select()
      .from(attributeCategories)
      .where(and(
        eq(attributeCategories.id, id),
        isNull(attributeCategories.deletedAt)
      ))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { success: false, error: '分类不存在' },
        { status: 404 }
      );
    }

    // 检查是否为系统分类
    if (!canManageAttributeCategoryInGui(existing[0].categoryCode, existing[0].isSystem)) {
      return NextResponse.json(
        { success: false, error: '系统预置分类不可修改' },
        { status: 403 }
      );
    }

    // 更新分类
    const [updated] = await db
      .update(attributeCategories)
      .set({
        categoryName: categoryName || existing[0].categoryName,
        description: description !== undefined ? description : existing[0].description,
        icon: icon !== undefined ? icon : existing[0].icon,
        sortOrder: sortOrder !== undefined ? sortOrder : existing[0].sortOrder,
        status: status || existing[0].status,
        updatedAt: new Date(),
      })
      .where(eq(attributeCategories.id, id))
      .returning();

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error('Failed to update category:', error);
    return NextResponse.json(
      { success: false, error: '更新字典分类失败' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/dictionary/categories?id=xxx
 * 删除字典分类（软删除）
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get('id') || '');

    if (!id) {
      return NextResponse.json(
        { success: false, error: '缺少分类ID' },
        { status: 400 }
      );
    }

    // 检查分类是否存在
    const existing = await db
      .select()
      .from(attributeCategories)
      .where(and(
        eq(attributeCategories.id, id),
        isNull(attributeCategories.deletedAt)
      ))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { success: false, error: '分类不存在' },
        { status: 404 }
      );
    }

    // 检查是否为系统分类
    if (!canManageAttributeCategoryInGui(existing[0].categoryCode, existing[0].isSystem)) {
      return NextResponse.json(
        { success: false, error: '系统预置分类不可删除' },
        { status: 403 }
      );
    }

    // 软删除
    await db
      .update(attributeCategories)
      .set({ deletedAt: new Date() })
      .where(eq(attributeCategories.id, id));

    return NextResponse.json({
      success: true,
      message: '删除成功',
    });
  } catch (error) {
    console.error('Failed to delete category:', error);
    return NextResponse.json(
      { success: false, error: '删除字典分类失败' },
      { status: 500 }
    );
  }
}
