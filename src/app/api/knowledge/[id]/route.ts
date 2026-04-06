import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { solutions, users, solutionTypes } from '@/db/schema';
import { eq, and, sql, isNull } from 'drizzle-orm';
import { errorResponse, notFoundResponse, successResponse } from '@/lib/api-response';

// 获取知识库文档详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const solutionId = parseInt(id);

    if (isNaN(solutionId) || solutionId <= 0) {
      return errorResponse('BAD_REQUEST', '无效的文档ID');
    }

    // 获取详情（不先增加浏览次数，避免对不存在的文档进行更新）
    const solutionList = await db
      .select({
        id: solutions.id,
        solutionCode: solutions.solutionCode,
        solutionName: solutions.solutionName,
        solutionTypeId: solutions.solutionTypeId,
        version: solutions.version,
        industry: solutions.industry,
        scenario: solutions.scenario,
        description: solutions.description,
        content: solutions.content,
        authorId: solutions.authorId,
        authorName: sql<string>`COALESCE(${users.realName}, ${users.username})`,
        isTemplate: solutions.isTemplate,
        status: solutions.status,
        tags: solutions.tags,
        viewCount: solutions.viewCount,
        downloadCount: solutions.downloadCount,
        publishDate: solutions.publishDate,
        createdAt: solutions.createdAt,
        updatedAt: solutions.updatedAt,
        typeName: solutionTypes.name,
        attachments: solutions.attachments,
      })
      .from(solutions)
      .leftJoin(users, eq(solutions.authorId, users.id))
      .leftJoin(solutionTypes, eq(solutions.solutionTypeId, solutionTypes.id))
      .where(and(
        eq(solutions.id, solutionId),
        isNull(solutions.deletedAt)
      ))
      .limit(1);

    if (!solutionList || solutionList.length === 0) {
      return notFoundResponse('文档不存在');
    }

    const solution = solutionList[0];

    // 增加浏览次数
    try {
      await db
        .update(solutions)
        .set({
          viewCount: sql`${solutions.viewCount} + 1`,
        })
        .where(eq(solutions.id, solutionId));
    } catch {
      // 忽略浏览次数更新错误
    }

    return successResponse({
      ...solution,
      relatedDocuments: [], // TODO: 实现相关文档查询
    });
  } catch (error) {
    console.error('Knowledge detail API error:', error);
    return errorResponse('INTERNAL_ERROR', '获取文档详情失败');
  }
}

function desc(column: unknown) {
  return sql`${column} DESC`;
}
