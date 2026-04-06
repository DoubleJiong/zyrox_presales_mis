import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { solutions, solutionTypes, users } from '@/db/schema';
import { eq, and, or, like, desc, sql, count } from 'drizzle-orm';

// 搜索知识库
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword') || '';
    const typeId = searchParams.get('typeId');
    const industry = searchParams.get('industry');
    const tag = searchParams.get('tag');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    // 构建查询条件
    const conditions = [
      eq(solutions.status, 'published'),
      eq(solutions.isPublic, true),
      sql`${solutions.deletedAt} IS NULL`
    ];

    if (keyword) {
      conditions.push(or(
        like(solutions.solutionName, `%${keyword}%`),
        like(solutions.description, `%${keyword}%`)
      ) as any);
    }

    if (typeId) {
      conditions.push(eq(solutions.solutionTypeId, parseInt(typeId)));
    }

    if (industry) {
      conditions.push(eq(solutions.industry, industry));
    }

    // 获取总数
    const [totalCount] = await db
      .select({ count: count() })
      .from(solutions)
      .where(and(...conditions));

    // 获取列表
    const knowledgeList = await db
      .select({
        id: solutions.id,
        solutionCode: solutions.solutionCode,
        solutionName: solutions.solutionName,
        solutionTypeId: solutions.solutionTypeId,
        version: solutions.version,
        industry: solutions.industry,
        scenario: solutions.scenario,
        description: solutions.description,
        authorId: solutions.authorId,
        authorName: sql<string>`COALESCE(${users.realName}, ${users.username})`,
        isTemplate: solutions.isTemplate,
        tags: solutions.tags,
        viewCount: solutions.viewCount,
        downloadCount: solutions.downloadCount,
        publishDate: solutions.publishDate,
        createdAt: solutions.createdAt,
        updatedAt: solutions.updatedAt,
        typeName: solutionTypes.name,
      })
      .from(solutions)
      .leftJoin(users, eq(solutions.authorId, users.id))
      .leftJoin(solutionTypes, eq(solutions.solutionTypeId, solutionTypes.id))
      .where(and(...conditions))
      .orderBy(desc(solutions.viewCount), desc(solutions.updatedAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return NextResponse.json({
      success: true,
      data: {
        list: knowledgeList,
        pagination: {
          page,
          pageSize,
          total: totalCount.count,
          totalPages: Math.ceil(totalCount.count / pageSize),
        },
      },
    });
  } catch (error) {
    console.error('Knowledge search API error:', error);
    return NextResponse.json({
      success: false,
      error: '搜索知识库失败',
      data: {
        list: [],
        pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
      },
    });
  }
}
