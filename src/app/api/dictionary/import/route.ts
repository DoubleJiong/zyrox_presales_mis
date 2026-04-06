import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { attributes, attributeCategories } from '@/db/schema';
import { eq, isNull, and } from 'drizzle-orm';
import { isDedicatedMasterDataAttributeCategory } from '@/lib/config/dictionary-governance';

interface ImportItem {
  code: string;
  name: string;
  value?: string;
  description?: string;
  sortOrder?: number;
  status?: string;
}

interface ImportCategory {
  category: {
    code: string;
    name: string;
    description?: string;
    icon?: string;
    sortOrder?: number;
  };
  items: ImportItem[];
}

/**
 * POST /api/dictionary/import
 * 导入字典数据
 * 
 * Body: {
 *   data: ImportCategory[],  // 要导入的数据
 *   mode: 'merge' | 'replace', // merge: 合并(跳过已存在), replace: 替换(删除后重建)
 *   categories: string[] // 可选，只导入指定分类
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { data, mode = 'merge', categories: filterCategories } = body;

    if (!data || !Array.isArray(data)) {
      return NextResponse.json(
        { success: false, error: '无效的导入数据' },
        { status: 400 }
      );
    }

    const results = {
      categories: { created: 0, skipped: 0 },
      items: { created: 0, updated: 0, skipped: 0 },
      errors: [] as string[],
    };

    // 过滤分类
    const dataToImport = filterCategories
      ? data.filter((d: ImportCategory) => filterCategories.includes(d.category.code))
      : data;

    // 开始事务处理
    for (const categoryData of dataToImport) {
      const { category, items } = categoryData;

      try {
        if (isDedicatedMasterDataAttributeCategory(category.code)) {
          results.categories.skipped++;
          results.errors.push(`分类 ${category.code}: 已迁移到主数据管理，不支持通过通用字典导入`);
          continue;
        }

        // 1. 处理分类
        let categoryRecord = await db
          .select()
          .from(attributeCategories)
          .where(and(
            eq(attributeCategories.categoryCode, category.code),
            isNull(attributeCategories.deletedAt)
          ))
          .limit(1);

        if (categoryRecord.length === 0) {
          // 创建新分类
          const [newCategory] = await db
            .insert(attributeCategories)
            .values({
              categoryCode: category.code,
              categoryName: category.name,
              description: category.description || null,
              icon: category.icon || null,
              sortOrder: category.sortOrder || 0,
              isSystem: false,
              status: 'active',
            })
            .returning();
          results.categories.created++;
        } else {
          results.categories.skipped++;
        }

        // 2. 处理字典项
        if (mode === 'replace') {
          // 删除现有字典项
          await db
            .update(attributes)
            .set({ deletedAt: new Date() })
            .where(eq(attributes.category, category.code));
        }

        for (const item of items) {
          try {
            const fullCode = `${category.code}.${item.code}`;
            
            // 检查是否存在
            const existing = await db
              .select()
              .from(attributes)
              .where(and(
                eq(attributes.code, fullCode),
                isNull(attributes.deletedAt)
              ))
              .limit(1);

            if (existing.length > 0) {
              if (mode === 'merge') {
                // 合并模式：跳过已存在
                results.items.skipped++;
              } else {
                // 替换模式：更新
                await db
                  .update(attributes)
                  .set({
                    name: item.name,
                    value: item.value || item.code,
                    description: item.description || null,
                    sortOrder: item.sortOrder || 0,
                    status: item.status || 'active',
                    updatedAt: new Date(),
                  })
                  .where(eq(attributes.id, existing[0].id));
                results.items.updated++;
              }
            } else {
              // 创建新字典项
              await db.insert(attributes).values({
                category: category.code,
                code: fullCode,
                name: item.name,
                value: item.value || item.code,
                valueType: 'string',
                description: item.description || null,
                sortOrder: item.sortOrder || 0,
                isSystem: false,
                status: item.status || 'active',
              });
              results.items.created++;
            }
          } catch (itemError) {
            results.errors.push(`字典项 ${item.code}: ${(itemError as Error).message}`);
          }
        }
      } catch (categoryError) {
        results.errors.push(`分类 ${category.code}: ${(categoryError as Error).message}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: '导入完成',
      results,
    });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json(
      { success: false, error: '导入失败' },
      { status: 500 }
    );
  }
}
