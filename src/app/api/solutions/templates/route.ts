import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { solutions, solutionSubSchemes, users, solutionTypes } from '@/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { authenticate } from '@/lib/auth';

// GET /api/solutions/templates - 获取模板方案列表
export async function GET(req: NextRequest) {
  try {
    const user = await authenticate(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const templateCategory = searchParams.get('templateCategory');
    const industry = searchParams.get('industry');
    const keyword = searchParams.get('keyword');
    const solutionTypeId = searchParams.get('solutionTypeId');

    const offset = (page - 1) * pageSize;
    const conditions = [eq(solutions.isTemplate, true)];

    if (templateCategory) {
      conditions.push(eq(solutions.templateCategory, templateCategory));
    }

    if (industry) {
      conditions.push(eq(solutions.industry, industry));
    }

    if (solutionTypeId) {
      conditions.push(eq(solutions.solutionTypeId, parseInt(solutionTypeId)));
    }

    if (keyword) {
      conditions.push(
        sql`(${solutions.solutionName} ILIKE ${'%' + keyword + '%'} OR ${solutions.description} ILIKE ${'%' + keyword + '%'})`
      );
    }

    // 获取总数
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(solutions)
      .where(and(...conditions));

    // 获取模板列表
    const templates = await db
      .select({
        id: solutions.id,
        solutionCode: solutions.solutionCode,
        solutionName: solutions.solutionName,
        solutionTypeId: solutions.solutionTypeId,
        version: solutions.version,
        industry: solutions.industry,
        scenario: solutions.scenario,
        description: solutions.description,
        templateCategory: solutions.templateCategory,
        templateScope: solutions.templateScope,
        templateUsageCount: solutions.templateUsageCount,
        tags: solutions.tags,
        thumbnail: solutions.thumbnail,
        viewCount: solutions.viewCount,
        downloadCount: solutions.downloadCount,
        rating: solutions.rating,
        ratingCount: solutions.ratingCount,
        createdAt: solutions.createdAt,
        updatedAt: solutions.updatedAt,
        // 关联信息
        solutionTypeName: solutionTypes.name,
        authorName: users.realName,
      })
      .from(solutions)
      .leftJoin(solutionTypes, eq(solutions.solutionTypeId, solutionTypes.id))
      .leftJoin(users, eq(solutions.authorId, users.id))
      .where(and(...conditions))
      .orderBy(desc(solutions.templateUsageCount), desc(solutions.createdAt))
      .limit(pageSize)
      .offset(offset);

    return NextResponse.json({
      success: true,
      data: templates,
      pagination: {
        page,
        pageSize,
        total: Number(count),
        totalPages: Math.ceil(Number(count) / pageSize),
      },
    });
  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}
