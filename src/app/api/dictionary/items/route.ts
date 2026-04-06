import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { attributeCategories, attributes } from '@/db/schema';
import { eq, isNull, and, asc } from 'drizzle-orm';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withAuth } from '@/lib/auth-middleware';
import { canManageAttributeCategoryInGui } from '@/lib/config/dictionary-governance';

/**
 * GET /api/dictionary/items
 * 获取字典项列表
 * 已修复：添加认证中间件保护
 * Query params:
 * - category: 分类编码（必填）
 * - status: 状态过滤
 * - includeChildren: 是否包含子项
 */
export const GET = withAuth(async (request: NextRequest, { userId }) => {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const status = searchParams.get('status');
    const includeChildren = searchParams.get('includeChildren') === 'true';

    if (!category) {
      return errorResponse('BAD_REQUEST', '请指定字典分类');
    }

    // 构建查询条件
    const conditions = [eq(attributes.category, category)];
    
    // 执行查询（不使用 isNull 条件，直接获取后在 JS 中过滤）
    const allItems = await db
      .select()
      .from(attributes)
      .where(eq(attributes.category, category))
      .orderBy(asc(attributes.sortOrder));

    // 过滤已删除的项
    let items = allItems.filter(item => item.deletedAt === null);

    // 状态过滤
    if (status && status !== 'all') {
      items = items.filter(item => item.status === status);
    }

    // 如果需要子项，构建树形结构
    if (includeChildren) {
      const buildTree = (parentId: number | null = null): any[] => {
        return items
          .filter(item => item.parentId === parentId)
          .map(item => ({
            ...item,
            children: buildTree(item.id),
          }));
      };
      items = buildTree();
    }

    return successResponse(items);
  } catch (error) {
    console.error('Failed to fetch dictionary items:', error);
    return errorResponse('INTERNAL_ERROR', '获取字典项失败');
  }
});

/**
 * POST /api/dictionary/items
 * 创建字典项
 * 已修复：添加认证中间件保护
 */
export const POST = withAuth(async (request: NextRequest, { userId }) => {
  try {
    const body = await request.json();
    const { 
      category, 
      code, 
      name, 
      value, 
      valueType, 
      description, 
      parentId, 
      sortOrder, 
      extraData,
      status 
    } = body;

    // 验证必填字段
    if (!category || !code || !name) {
      return errorResponse('BAD_REQUEST', '分类、编码和名称为必填项');
    }

    const [categoryInfo] = await db
      .select({ isSystem: attributeCategories.isSystem })
      .from(attributeCategories)
      .where(and(
        eq(attributeCategories.categoryCode, category),
        isNull(attributeCategories.deletedAt)
      ))
      .limit(1);

    if (!categoryInfo) {
      return errorResponse('NOT_FOUND', '字典分类不存在');
    }

    if (!canManageAttributeCategoryInGui(category, categoryInfo.isSystem)) {
      return errorResponse('FORBIDDEN', '该系统字典分类仅允许代码状态机和策略层维护', { status: 403 });
    }

    // 检查编码是否已存在（同一分类下）
    const existing = await db
      .select()
      .from(attributes)
      .where(and(
        eq(attributes.category, category),
        eq(attributes.code, code),
        isNull(attributes.deletedAt)
      ))
      .limit(1);

    if (existing.length > 0) {
      return errorResponse('BAD_REQUEST', '该分类下编码已存在');
    }

    // 创建字典项
    const [newItem] = await db
      .insert(attributes)
      .values({
        category,
        code,
        name,
        value: value || code,
        valueType: valueType || 'string',
        description: description || null,
        parentId: parentId || null,
        sortOrder: sortOrder || 0,
        isSystem: false,
        extraData: extraData || null,
        status: status || 'active',
      })
      .returning();

    return successResponse(newItem);
  } catch (error) {
    console.error('Failed to create dictionary item:', error);
    return errorResponse('INTERNAL_ERROR', '创建字典项失败');
  }
});

/**
 * PUT /api/dictionary/items
 * 更新字典项
 * 已修复：添加认证中间件保护
 */
export const PUT = withAuth(async (request: NextRequest, { userId }) => {
  try {
    const body = await request.json();
    const { 
      id, 
      name, 
      value, 
      description, 
      parentId, 
      sortOrder, 
      extraData,
      status 
    } = body;

    if (!id) {
      return errorResponse('BAD_REQUEST', '缺少字典项ID');
    }

    // 检查字典项是否存在
    const existing = await db
      .select()
      .from(attributes)
      .where(and(
        eq(attributes.id, id),
        isNull(attributes.deletedAt)
      ))
      .limit(1);

    if (existing.length === 0) {
      return errorResponse('NOT_FOUND', '字典项不存在');
    }

    // 检查是否为系统预置
    if (!canManageAttributeCategoryInGui(existing[0].category, existing[0].isSystem)) {
      return errorResponse('FORBIDDEN', '系统预置字典项不可修改', { status: 403 });
    }

    // 更新字典项
    const [updated] = await db
      .update(attributes)
      .set({
        name: name || existing[0].name,
        value: value !== undefined ? value : existing[0].value,
        description: description !== undefined ? description : existing[0].description,
        parentId: parentId !== undefined ? parentId : existing[0].parentId,
        sortOrder: sortOrder !== undefined ? sortOrder : existing[0].sortOrder,
        extraData: extraData !== undefined ? extraData : existing[0].extraData,
        status: status || existing[0].status,
        updatedAt: new Date(),
      })
      .where(eq(attributes.id, id))
      .returning();

    return successResponse(updated);
  } catch (error) {
    console.error('Failed to update dictionary item:', error);
    return errorResponse('INTERNAL_ERROR', '更新字典项失败');
  }
});

/**
 * DELETE /api/dictionary/items?id=xxx
 * 删除字典项（软删除）
 * 已修复：添加认证中间件保护
 */
export const DELETE = withAuth(async (request: NextRequest, { userId }) => {
  try {
    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get('id') || '');

    if (!id) {
      return errorResponse('BAD_REQUEST', '缺少字典项ID');
    }

    // 检查字典项是否存在
    const existing = await db
      .select()
      .from(attributes)
      .where(and(
        eq(attributes.id, id),
        isNull(attributes.deletedAt)
      ))
      .limit(1);

    if (existing.length === 0) {
      return errorResponse('NOT_FOUND', '字典项不存在');
    }

    // 检查是否为系统预置
    if (!canManageAttributeCategoryInGui(existing[0].category, existing[0].isSystem)) {
      return errorResponse('FORBIDDEN', '系统预置字典项不可删除', { status: 403 });
    }

    // 软删除
    await db
      .update(attributes)
      .set({ deletedAt: new Date() })
      .where(eq(attributes.id, id));

    return successResponse({ message: '删除成功' });
  } catch (error) {
    console.error('Failed to delete dictionary item:', error);
    return errorResponse('INTERNAL_ERROR', '删除字典项失败');
  }
});
