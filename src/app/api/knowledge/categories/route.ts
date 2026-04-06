import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { solutionTypes, solutions } from '@/db/schema';
import { eq, count, desc } from 'drizzle-orm';

// 获取知识库分类列表（带文档数量统计）
export async function GET(request: NextRequest) {
  try {
    // 获取所有分类
    const types = await db
      .select()
      .from(solutionTypes)
      .orderBy(solutionTypes.name);

    // 获取每个分类下的文档数量
    const typesWithCount = await Promise.all(
      types.map(async (type) => {
        const [countResult] = await db
          .select({ count: count() })
          .from(solutions)
          .where(eq(solutions.solutionTypeId, type.id));

        return {
          id: type.id,
          name: type.name,
          description: type.description,
          documentCount: countResult.count,
        };
      })
    );

    // 获取热门标签
    const allSolutions = await db
      .select({ tags: solutions.tags })
      .from(solutions)
      .where(eq(solutions.status, 'published'));

    // 统计标签出现次数
    const tagCount: Record<string, number> = {};
    allSolutions.forEach(solution => {
      if (solution.tags && Array.isArray(solution.tags)) {
        solution.tags.forEach(tag => {
          tagCount[tag] = (tagCount[tag] || 0) + 1;
        });
      }
    });

    // 排序获取热门标签
    const hotTags = Object.entries(tagCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([name, count]) => ({ name, count }));

    // 获取行业列表
    const industries = await db
      .selectDistinct({ industry: solutions.industry })
      .from(solutions)
      .where(eq(solutions.status, 'published'));

    return NextResponse.json({
      success: true,
      data: {
        categories: typesWithCount,
        hotTags,
        industries: industries.map(i => i.industry).filter(Boolean),
      },
    });
  } catch (error) {
    console.error('Knowledge categories API error:', error);
    return NextResponse.json({
      success: false,
      error: '获取分类失败',
      data: {
        categories: [],
        hotTags: [],
        industries: [],
      },
    });
  }
}
