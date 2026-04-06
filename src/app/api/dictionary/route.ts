/**
 * 数据字典API
 * 
 * 功能：
 * - GET: 获取字典类型或字典项
 * - POST: 创建字典类型或字典项
 */

import { NextRequest } from 'next/server';
import { db } from '@/db';
import { dictionaryTypes, dictionaryItems } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { successResponse, errorResponse } from '@/lib/api-response';

/**
 * GET /api/dictionary
 * 获取字典数据
 * 
 * Query参数：
 * - type: 字典类型代码，获取该类型下的所有字典项
 * - types: 获取所有字典类型
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const typeCode = searchParams.get('type');
    const getTypes = searchParams.get('types');

    // 获取所有字典类型
    if (getTypes === 'true') {
      const types = await db
        .select()
        .from(dictionaryTypes)
        .where(eq(dictionaryTypes.status, 'active'))
        .orderBy(dictionaryTypes.sortOrder);

      return successResponse(types);
    }

    // 获取指定类型的字典项
    if (typeCode) {
      const type = await db.query.dictionaryTypes.findFirst({
        where: eq(dictionaryTypes.typeCode, typeCode),
      });

      if (!type) {
        return errorResponse('NOT_FOUND', '字典类型不存在');
      }

      const items = await db
        .select()
        .from(dictionaryItems)
        .where(and(
          eq(dictionaryItems.typeId, type.id),
          eq(dictionaryItems.status, 'active')
        ))
        .orderBy(dictionaryItems.sortOrder);

      return successResponse({
        type,
        items,
      });
    }

    // 获取所有字典类型及其字典项
    const types = await db.query.dictionaryTypes.findMany({
      where: eq(dictionaryTypes.status, 'active'),
      with: {
        items: {
          where: eq(dictionaryItems.status, 'active'),
          orderBy: (items, { asc }) => [asc(items.sortOrder)],
        },
      },
      orderBy: (types, { asc }) => [asc(types.sortOrder)],
    });

    return successResponse(types);
  } catch (error) {
    console.error('Failed to fetch dictionary:', error);
    return errorResponse('INTERNAL_ERROR', '获取字典数据失败');
  }
}

/**
 * POST /api/dictionary
 * 创建字典类型或字典项
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, data } = body;

    if (action === 'createType') {
      // 创建字典类型
      const [newType] = await db
        .insert(dictionaryTypes)
        .values({
          typeCode: data.typeCode,
          typeName: data.typeName,
          description: data.description,
          sortOrder: data.sortOrder || 0,
        })
        .returning();

      return successResponse(newType);
    }

    if (action === 'createItem') {
      // 创建字典项
      const [newItem] = await db
        .insert(dictionaryItems)
        .values({
          typeId: data.typeId,
          itemCode: data.itemCode,
          itemName: data.itemName,
          itemValue: data.itemValue,
          description: data.description,
          sortOrder: data.sortOrder || 0,
          parentId: data.parentId,
        })
        .returning();

      return successResponse(newItem);
    }

    return errorResponse('BAD_REQUEST', '无效的操作类型');
  } catch (error) {
    console.error('Failed to create dictionary:', error);
    return errorResponse('INTERNAL_ERROR', '创建字典数据失败');
  }
}

/**
 * PUT /api/dictionary
 * 更新字典类型或字典项
 */
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, id, data } = body;

    if (action === 'updateType') {
      const [updated] = await db
        .update(dictionaryTypes)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(dictionaryTypes.id, id))
        .returning();

      if (!updated) {
        return errorResponse('NOT_FOUND', '字典类型不存在');
      }

      return successResponse(updated);
    }

    if (action === 'updateItem') {
      const [updated] = await db
        .update(dictionaryItems)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(dictionaryItems.id, id))
        .returning();

      if (!updated) {
        return errorResponse('NOT_FOUND', '字典项不存在');
      }

      return successResponse(updated);
    }

    return errorResponse('BAD_REQUEST', '无效的操作类型');
  } catch (error) {
    console.error('Failed to update dictionary:', error);
    return errorResponse('INTERNAL_ERROR', '更新字典数据失败');
  }
}

/**
 * DELETE /api/dictionary
 * 删除字典类型或字典项
 */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');
    const id = parseInt(searchParams.get('id') || '');

    if (!id) {
      return errorResponse('BAD_REQUEST', '缺少ID参数');
    }

    if (action === 'deleteType') {
      await db.delete(dictionaryTypes).where(eq(dictionaryTypes.id, id));
      return successResponse({ success: true });
    }

    if (action === 'deleteItem') {
      await db.delete(dictionaryItems).where(eq(dictionaryItems.id, id));
      return successResponse({ success: true });
    }

    return errorResponse('BAD_REQUEST', '无效的操作类型');
  } catch (error) {
    console.error('Failed to delete dictionary:', error);
    return errorResponse('INTERNAL_ERROR', '删除字典数据失败');
  }
}
