import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { attributes, attributeCategories } from '@/db/schema';
import { eq, isNull, and, inArray } from 'drizzle-orm';
import { DICT_CATEGORIES, ALL_DICT_ITEMS } from '@/lib/config/dictionary-config';
import { shouldSkipDictionaryConfigSync } from '@/lib/config/dictionary-governance';

/**
 * 从配置文件同步字典数据到数据库
 * POST /api/dictionary/sync
 */
export async function POST(request: NextRequest) {
  try {
    const results: string[] = [];
    let categoriesInserted = 0;
    let categoriesUpdated = 0;
    let itemsInserted = 0;
    let itemsUpdated = 0;

    // 1. 同步分类
    for (const category of DICT_CATEGORIES) {
      if (shouldSkipDictionaryConfigSync(category.code)) {
        results.push(`分类 ${category.code}: 保留业务 GUI 维护，跳过配置覆盖`);
        continue;
      }

      try {
        const existing = await db.select()
          .from(attributeCategories)
          .where(eq(attributeCategories.categoryCode, category.code))
          .limit(1);

        if (existing.length === 0) {
          await db.insert(attributeCategories).values({
            categoryCode: category.code,
            categoryName: category.name,
            description: category.description,
            icon: category.icon,
            isSystem: category.isSystem,
            status: 'active',
            sortOrder: 0,
          });
          categoriesInserted++;
        } else {
          await db.update(attributeCategories)
            .set({
              categoryName: category.name,
              description: category.description,
              icon: category.icon,
            })
            .where(eq(attributeCategories.categoryCode, category.code));
          categoriesUpdated++;
        }
      } catch (e) {
        console.error(`Failed to sync category ${category.code}:`, e);
      }
    }

    // 2. 同步字典项
    for (const categoryItems of ALL_DICT_ITEMS) {
      if (shouldSkipDictionaryConfigSync(categoryItems.category)) {
        results.push(`分类 ${categoryItems.category}: 保留业务 GUI 维护，跳过字典项覆盖`);
        continue;
      }

      for (const item of categoryItems.items) {
        try {
          const fullCode = `${categoryItems.category}.${item.code}`;
          
          const existing = await db.select()
            .from(attributes)
            .where(and(
              eq(attributes.category, categoryItems.category),
              eq(attributes.code, fullCode),
              isNull(attributes.deletedAt)
            ))
            .limit(1);

          const extraData = item.color ? { color: item.color } : (item.extraData || null);

          if (existing.length === 0) {
            await db.insert(attributes).values({
              category: categoryItems.category,
              code: fullCode,
              name: item.name,
              value: item.value || item.code,
              description: item.description || null,
              sortOrder: item.sortOrder,
              isSystem: true,
              status: 'active',
              valueType: 'string',
              extraData: extraData,
            });
            itemsInserted++;
          } else {
            await db.update(attributes)
              .set({
                name: item.name,
                value: item.value || item.code,
                description: item.description || null,
                sortOrder: item.sortOrder,
                extraData: extraData,
              })
              .where(eq(attributes.id, existing[0].id));
            itemsUpdated++;
          }
        } catch (e) {
          console.error(`Failed to sync item ${categoryItems.category}.${item.code}:`, e);
        }
      }
    }

    results.push(`分类: 新增 ${categoriesInserted}, 更新 ${categoriesUpdated}`);
    results.push(`字典项: 新增 ${itemsInserted}, 更新 ${itemsUpdated}`);

    return NextResponse.json({
      success: true,
      message: '字典数据同步完成',
      results,
      stats: {
        categories: { inserted: categoriesInserted, updated: categoriesUpdated },
        items: { inserted: itemsInserted, updated: itemsUpdated },
      },
    });
  } catch (error) {
    console.error('Sync dictionary error:', error);
    return NextResponse.json({
      success: false,
      error: (error as Error).message,
    }, { status: 500 });
  }
}
