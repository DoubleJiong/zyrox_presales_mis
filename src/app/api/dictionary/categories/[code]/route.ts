import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { attributeCategories, attributes } from '@/db/schema';
import { eq, isNull, asc, and } from 'drizzle-orm';

interface RouteParams {
  params: Promise<{ code: string }>;
}

/**
 * GET /api/dictionary/categories/[code]
 * 获取单个字典分类详情，包含其下的所有字典项
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { code } = await params;

    // 获取分类信息
    const categories = await db
      .select()
      .from(attributeCategories)
      .where(and(
        eq(attributeCategories.categoryCode, code),
        isNull(attributeCategories.deletedAt)
      ))
      .limit(1);

    if (categories.length === 0) {
      return NextResponse.json(
        { success: false, error: '字典分类不存在' },
        { status: 404 }
      );
    }

    const category = categories[0];

    // 获取该分类下的所有字典项
    const items = await db
      .select()
      .from(attributes)
      .where(and(
        eq(attributes.category, code),
        isNull(attributes.deletedAt)
      ))
      .orderBy(asc(attributes.sortOrder));

    // 构建树形结构
    const buildTree = (parentId: number | null = null): any[] => {
      return items
        .filter(item => item.parentId === parentId)
        .map(item => ({
          ...item,
          children: buildTree(item.id),
        }));
    };

    const treeItems = buildTree();

    return NextResponse.json({
      success: true,
      data: {
        ...category,
        items: treeItems,
      },
    });
  } catch (error) {
    console.error('Failed to fetch category:', error);
    return NextResponse.json(
      { success: false, error: '获取字典分类失败' },
      { status: 500 }
    );
  }
}
