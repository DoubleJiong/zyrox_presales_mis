/**
 * 解决方案统计 API
 * 
 * 端点：
 * - GET /api/solutions/stats - 获取解决方案统计数据
 */

import { NextRequest } from 'next/server';
import { db } from '@/db';
import { solutions, solutionSectionMembers, projectPhaseSolutionReferences, users } from '@/db/schema';
import { eq, sql, and, isNull, desc } from 'drizzle-orm';
import { withAuth } from '@/lib/auth-middleware';
import { successResponse, errorResponse } from '@/lib/api-response';

/**
 * GET /api/solutions/stats
 * 获取解决方案统计数据
 */
export const GET = withAuth(async (
  request: NextRequest,
  context: { userId: number; user?: any; params?: Record<string, string> }
) => {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'overview'; // overview, member_stats, reference_stats

    if (type === 'overview') {
      // 获取总体统计
      const [totalSolutions] = await db
        .select({ count: sql<number>`count(*)` })
        .from(solutions)
        .where(isNull(solutions.deletedAt));

      const [publishedSolutions] = await db
        .select({ count: sql<number>`count(*)` })
        .from(solutions)
        .where(and(
          isNull(solutions.deletedAt),
          eq(solutions.status, 'published')
        ));

      const [templateSolutions] = await db
        .select({ count: sql<number>`count(*)` })
        .from(solutions)
        .where(and(
          isNull(solutions.deletedAt),
          eq(solutions.isTemplate, true)
        ));

      const [totalMembers] = await db
        .select({ count: sql<number>`count(*)` })
        .from(solutionSectionMembers);

      const [totalReferences] = await db
        .select({ count: sql<number>`count(*)` })
        .from(projectPhaseSolutionReferences);

      return successResponse({
        totalSolutions: Number(totalSolutions?.count || 0),
        publishedSolutions: Number(publishedSolutions?.count || 0),
        templateSolutions: Number(templateSolutions?.count || 0),
        totalMembers: Number(totalMembers?.count || 0),
        totalReferences: Number(totalReferences?.count || 0),
      });
    }

    if (type === 'member_stats') {
      // 获取成员统计 - 按用户统计参与的板块数
      const memberStats = await db
        .select({
          userId: solutionSectionMembers.userId,
          userName: users.realName,
          userDepartment: users.department,
          plateCount: sql<number>`count(distinct ${solutionSectionMembers.plateId})`,
          leaderCount: sql<number>`count(case when ${solutionSectionMembers.role} = 'leader' then 1 end)`,
          memberCount: sql<number>`count(case when ${solutionSectionMembers.role} = 'member' then 1 end)`,
        })
        .from(solutionSectionMembers)
        .leftJoin(users, eq(solutionSectionMembers.userId, users.id))
        .groupBy(solutionSectionMembers.userId, users.realName, users.department)
        .orderBy(desc(sql`count(distinct ${solutionSectionMembers.plateId})`))
        .limit(20);

      return successResponse(memberStats);
    }

    if (type === 'reference_stats') {
      // 获取方案引用统计 - 按方案统计被引用次数
      const referenceStats = await db
        .select({
          solutionId: projectPhaseSolutionReferences.referencedSolutionId,
          solutionName: sql<string>`max(${projectPhaseSolutionReferences.snapshotSolutionName})`,
          referenceCount: sql<number>`count(*)`,
          projectCount: sql<number>`count(distinct ${projectPhaseSolutionReferences.projectId})`,
        })
        .from(projectPhaseSolutionReferences)
        .where(sql`${projectPhaseSolutionReferences.referencedSolutionId} IS NOT NULL`)
        .groupBy(projectPhaseSolutionReferences.referencedSolutionId)
        .orderBy(desc(sql`count(*)`))
        .limit(20);

      return successResponse(referenceStats);
    }

    return errorResponse('BAD_REQUEST', '无效的统计类型');
  } catch (error) {
    console.error('获取统计数据失败:', error);
    return errorResponse('INTERNAL_ERROR', '获取统计数据失败', { status: 500 });
  }
});
