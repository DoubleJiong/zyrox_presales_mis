import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { attributes } from '@/db/schema';
import { isNull, inArray, asc, and } from 'drizzle-orm';
import { ALL_DICT_ITEMS } from '@/lib/config/dictionary-config';

/**
 * 分类别名映射 - 将前端使用的分类名映射到实际数据库分类
 */
const CATEGORY_ALIAS: Record<string, string> = {
  // 项目相关
  'priority': 'project_priority',
};

function getFallbackOptions(category: string) {
  const config = ALL_DICT_ITEMS.find((item) => item.category === category);

  if (!config) {
    return [];
  }

  return config.items.map((item) => ({
    value: item.code,
    label: item.name,
    sort: item.sortOrder || 0,
    extraData: undefined,
  }));
}

/**
 * GET /api/dictionary/options?categories=customer_type,project_type
 * 批量获取多个字典分类的下拉选项
 * 
 * 返回格式:
 * {
 *   customer_type: [
 *     { value: 'potential', label: '潜在客户', sort: 1 },
 *     { value: 'key', label: '重点客户', sort: 2 },
 *     ...
 *   ],
 *   project_type: [...]
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoriesParam = searchParams.get('categories');
    const includeInactive = searchParams.get('includeInactive') === 'true';

    if (!categoriesParam) {
      return NextResponse.json(
        { success: false, error: '请指定字典分类' },
        { status: 400 }
      );
    }

    const requestedCategories = categoriesParam.split(',').map(c => c.trim()).filter(Boolean);

    if (requestedCategories.length === 0) {
      return NextResponse.json(
        { success: false, error: '请指定有效的字典分类' },
        { status: 400 }
      );
    }

    const result: Record<string, Array<{ value: string; label: string; sort: number; extraData?: any }>> = {};

    // 获取实际的数据库分类名列表
    const dictCategories = requestedCategories.map(c => CATEGORY_ALIAS[c] || c);

    // 从字典表获取数据
    const items = dictCategories.length > 0
      ? await db
          .select()
          .from(attributes)
          .where(and(
            inArray(attributes.category, dictCategories),
            isNull(attributes.deletedAt)
          ))
          .orderBy(asc(attributes.sortOrder))
      : [];

    // 按原始请求的分类名分组返回
    for (const requestedCategory of requestedCategories) {
      // 获取实际的数据库分类名
      const actualCategory = CATEGORY_ALIAS[requestedCategory] || requestedCategory;
      
      const categoryItems = items
        .filter(item => {
          if (item.category !== actualCategory) return false;
          if (!includeInactive && item.status !== 'active') return false;
          return item.parentId === null;
        })
        .map(item => {
          let code = item.value;
            if (!code) {
              // attribute_key 格式可能是 "category.value"（点号分隔）或 "category_value"（下划线分隔）
              if (item.code.includes('.')) {
                // 格式：customer_status.potential → 取点号后面的部分
                code = item.code.substring(item.code.indexOf('.') + 1);
              } else if (item.code.startsWith(actualCategory + '_')) {
                // 格式：customer_status_potential → 去掉分类前缀
                code = item.code.substring(actualCategory.length + 1);
              } else {
                const keyParts = item.code.split('_');
                code = keyParts.length > 2 ? keyParts.slice(2).join('_') : keyParts[keyParts.length - 1];
              }
            }
            return {
              value: code,
              label: item.name || item.value || code,
              sort: item.sortOrder || 0,
              extraData: item.extraData,
            };
          });

        result[requestedCategory] = categoryItems;

        if (result[requestedCategory].length === 0) {
          result[requestedCategory] = getFallbackOptions(requestedCategory);
        }
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Failed to fetch dictionary options:', error);
    return NextResponse.json(
      { success: false, error: '获取字典选项失败' },
      { status: 500 }
    );
  }
}
