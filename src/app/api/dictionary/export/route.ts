import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { attributes, attributeCategories } from '@/db/schema';
import { eq, isNull, asc, inArray, and } from 'drizzle-orm';
import { isDedicatedMasterDataAttributeCategory } from '@/lib/config/dictionary-governance';

/**
 * GET /api/dictionary/export?categories=customer_type,project_type
 * 导出字典数据为 JSON 格式
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoriesParam = searchParams.get('categories');
    const format = searchParams.get('format') || 'json'; // json 或 csv

    // 获取分类
    let categories = await db
      .select()
      .from(attributeCategories)
      .where(isNull(attributeCategories.deletedAt))
      .orderBy(asc(attributeCategories.sortOrder));

    // 过滤分类
    if (categoriesParam) {
      const categoryCodes = categoriesParam.split(',').map(c => c.trim());
      const blockedCategory = categoryCodes.find(isDedicatedMasterDataAttributeCategory);
      if (blockedCategory) {
        return NextResponse.json(
          { success: false, error: `分类 ${blockedCategory} 已迁移到专用主数据管理，不支持从通用字典导出` },
          { status: 400 }
        );
      }

      categories = categories.filter(c => categoryCodes.includes(c.categoryCode));
    }

    categories = categories.filter(c => !isDedicatedMasterDataAttributeCategory(c.categoryCode));

    // 获取字典项
    const categoryCodes = categories.map(c => c.categoryCode);
    const items = await db
      .select()
      .from(attributes)
      .where(and(
        inArray(attributes.category, categoryCodes),
        isNull(attributes.deletedAt)
      ))
      .orderBy(asc(attributes.sortOrder));

    // 按分类组织数据
    const exportData = categories.map(category => ({
      category: {
        code: category.categoryCode,
        name: category.categoryName,
        description: category.description,
        icon: category.icon,
        sortOrder: category.sortOrder,
      },
      items: items
        .filter(item => item.category === category.categoryCode)
        .map(item => ({
          code: item.code.includes('.') ? item.code.split('.').slice(1).join('.') : item.code,
          name: item.name,
          value: item.value,
          description: item.description,
          sortOrder: item.sortOrder,
          status: item.status,
        })),
    }));

    if (format === 'csv') {
      // 生成 CSV 格式
      const csvRows = [
        '分类编码,分类名称,字典项编码,字典项名称,值,描述,排序,状态',
      ];

      for (const cat of exportData) {
        for (const item of cat.items) {
          csvRows.push([
            cat.category.code,
            cat.category.name,
            item.code,
            item.name,
            item.value || '',
            item.description || '',
            item.sortOrder,
            item.status,
          ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
        }
      }

      return new NextResponse(csvRows.join('\n'), {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="dictionary_export_${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    // 默认返回 JSON 格式
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="dictionary_export_${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { success: false, error: '导出失败' },
      { status: 500 }
    );
  }
}
