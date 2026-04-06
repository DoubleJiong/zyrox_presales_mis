import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { attributes } from '@/db/schema';
import { eq, inArray, isNull, and } from 'drizzle-orm';

/**
 * POST /api/dictionary/items/batch
 * 批量操作字典项
 * 
 * 支持的操作:
 * - reorder: 批量更新排序
 * - toggleStatus: 批量切换状态
 * - delete: 批量删除
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, items } = body;

    if (!action || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: '参数无效' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'reorder': {
        // 批量更新排序
        // items 格式: [{ id: 1, sortOrder: 1 }, { id: 2, sortOrder: 2 }, ...]
        for (const item of items) {
          await db
            .update(attributes)
            .set({ sortOrder: item.sortOrder, updatedAt: new Date() })
            .where(eq(attributes.id, item.id));
        }
        return NextResponse.json({
          success: true,
          message: `已更新 ${items.length} 项的排序`,
        });
      }

      case 'toggleStatus': {
        // 批量切换状态
        // items 格式: [{ id: 1, status: 'active' }, { id: 2, status: 'inactive' }, ...]
        const ids = items.map(item => item.id);
        
        // 检查是否有系统预置项
        const existingItems = await db
          .select()
          .from(attributes)
          .where(and(
            inArray(attributes.id, ids),
            isNull(attributes.deletedAt)
          ));

        const systemItems = existingItems.filter(item => item.isSystem);
        if (systemItems.length > 0) {
          return NextResponse.json(
            { success: false, error: '系统预置字典项不可修改状态' },
            { status: 403 }
          );
        }

        for (const item of items) {
          await db
            .update(attributes)
            .set({ status: item.status, updatedAt: new Date() })
            .where(eq(attributes.id, item.id));
        }
        return NextResponse.json({
          success: true,
          message: `已更新 ${items.length} 项的状态`,
        });
      }

      case 'delete': {
        // 批量删除（软删除）
        // items 格式: [1, 2, 3, ...]
        const ids = items;
        
        // 检查是否有系统预置项
        const existingItems = await db
          .select()
          .from(attributes)
          .where(and(
            inArray(attributes.id, ids),
            isNull(attributes.deletedAt)
          ));

        const systemItems = existingItems.filter(item => item.isSystem);
        if (systemItems.length > 0) {
          return NextResponse.json(
            { success: false, error: '系统预置字典项不可删除' },
            { status: 403 }
          );
        }

        await db
          .update(attributes)
          .set({ deletedAt: new Date() })
          .where(inArray(attributes.id, ids));

        return NextResponse.json({
          success: true,
          message: `已删除 ${ids.length} 项`,
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: '不支持的操作类型' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Failed to batch update items:', error);
    return NextResponse.json(
      { success: false, error: '批量操作失败' },
      { status: 500 }
    );
  }
}
