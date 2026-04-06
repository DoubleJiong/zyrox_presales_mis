/**
 * 子方案引用关系管理 API
 * 
 * 用于管理项目方案引用基础方案子方案的关系
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { solutionSubReferences, solutions, solutionSubSchemes, users } from '@/db/schema';
import { eq, and, desc, sql, isNull } from 'drizzle-orm';
import { withAuth } from '@/lib/auth-middleware';
import { successResponse, errorResponse } from '@/lib/api-response';

// GET /api/solutions/[id]/references - 获取方案的引用关系
export const GET = withAuth(async (
  req: NextRequest,
  context: { userId: number; params?: Record<string, string> }
) => {
  try {
    const solutionId = parseInt(context.params?.id || '0');
    
    if (!solutionId || isNaN(solutionId)) {
      return errorResponse('BAD_REQUEST', '无效的方案ID');
    }

    const { searchParams } = new URL(req.url);
    const referenceType = searchParams.get('referenceType'); // 'project' 或 'base'

    // 获取该方案作为项目方案的引用关系（引用了哪些基础方案）
    if (referenceType === 'project' || !referenceType) {
      const projectReferences = await db
        .select({
          id: solutionSubReferences.id,
          projectSolutionId: solutionSubReferences.projectSolutionId,
          projectSubSchemeId: solutionSubReferences.projectSubSchemeId,
          projectSubSchemeName: solutionSubSchemes.subSchemeName,
          projectSubSchemeType: solutionSubSchemes.subSchemeType,
          baseSolutionId: solutionSubReferences.baseSolutionId,
          baseSubSchemeId: solutionSubReferences.baseSubSchemeId,
          referenceType: solutionSubReferences.referenceType,
          contributionWeight: solutionSubReferences.contributionWeight,
          referenceNotes: solutionSubReferences.referenceNotes,
          createdAt: solutionSubReferences.createdAt,
          // 基础方案信息
          baseSolutionName: sql<string>`base_sol.solution_name`,
          baseSolutionCode: sql<string>`base_sol.solution_code`,
          // 基础子方案信息
          baseSubSchemeName: sql<string>`base_sub.sub_scheme_name`,
          baseSubSchemeType: sql<string>`base_sub.sub_scheme_type`,
        })
        .from(solutionSubReferences)
        .innerJoin(solutionSubSchemes, eq(solutionSubReferences.projectSubSchemeId, solutionSubSchemes.id))
        .leftJoin(sql`bus_solution base_sol`, eq(solutionSubReferences.baseSolutionId, sql`base_sol.id`))
        .leftJoin(sql`bus_solution_sub base_sub`, eq(solutionSubReferences.baseSubSchemeId, sql`base_sub.id`))
        .where(eq(solutionSubReferences.projectSolutionId, solutionId))
        .orderBy(desc(solutionSubReferences.createdAt));

      return successResponse({
        type: 'project',
        references: projectReferences,
      });
    }

    // 获取该方案作为基础方案被引用的关系（被哪些项目方案引用）
    if (referenceType === 'base') {
      const baseReferences = await db
        .select({
          id: solutionSubReferences.id,
          projectSolutionId: solutionSubReferences.projectSolutionId,
          projectSubSchemeId: solutionSubReferences.projectSubSchemeId,
          baseSolutionId: solutionSubReferences.baseSolutionId,
          baseSubSchemeId: solutionSubReferences.baseSubSchemeId,
          referenceType: solutionSubReferences.referenceType,
          contributionWeight: solutionSubReferences.contributionWeight,
          referenceNotes: solutionSubReferences.referenceNotes,
          createdAt: solutionSubReferences.createdAt,
          // 项目方案信息
          projectSolutionName: sql<string>`proj_sol.solution_name`,
          projectSolutionCode: sql<string>`proj_sol.solution_code`,
          // 项目子方案信息
          projectSubSchemeName: sql<string>`proj_sub.sub_scheme_name`,
          projectSubSchemeType: sql<string>`proj_sub.sub_scheme_type`,
        })
        .from(solutionSubReferences)
        .leftJoin(sql`bus_solution proj_sol`, eq(solutionSubReferences.projectSolutionId, sql`proj_sol.id`))
        .leftJoin(sql`bus_solution_sub proj_sub`, eq(solutionSubReferences.projectSubSchemeId, sql`proj_sub.id`))
        .where(eq(solutionSubReferences.baseSolutionId, solutionId))
        .orderBy(desc(solutionSubReferences.createdAt));

      return successResponse({
        type: 'base',
        references: baseReferences,
      });
    }
  } catch (error) {
    console.error('Error fetching references:', error);
    return errorResponse('INTERNAL_ERROR', '获取引用关系失败');
  }
});

// POST /api/solutions/[id]/references - 创建引用关系
export const POST = withAuth(async (
  req: NextRequest,
  context: { userId: number; params?: Record<string, string> }
) => {
  try {
    const solutionId = parseInt(context.params?.id || '0');
    
    if (!solutionId || isNaN(solutionId)) {
      return errorResponse('BAD_REQUEST', '无效的方案ID');
    }

    const body = await req.json();
    
    // 验证必填字段
    if (!body.projectSubSchemeId) {
      return errorResponse('BAD_REQUEST', '项目子方案ID不能为空');
    }

    // 验证项目方案存在
    const [projectSolution] = await db
      .select()
      .from(solutions)
      .where(and(eq(solutions.id, solutionId), isNull(solutions.deletedAt)))
      .limit(1);

    if (!projectSolution) {
      return errorResponse('NOT_FOUND', '项目方案不存在');
    }

    // 验证项目子方案存在且属于该项目方案
    const [projectSubScheme] = await db
      .select()
      .from(solutionSubSchemes)
      .where(eq(solutionSubSchemes.id, body.projectSubSchemeId))
      .limit(1);

    if (!projectSubScheme || projectSubScheme.solutionId !== solutionId) {
      return errorResponse('BAD_REQUEST', '项目子方案不存在或不属于该方案');
    }

    // 如果指定了基础子方案，验证其存在
    if (body.baseSubSchemeId) {
      const [baseSubScheme] = await db
        .select()
        .from(solutionSubSchemes)
        .where(eq(solutionSubSchemes.id, body.baseSubSchemeId))
        .limit(1);

      if (!baseSubScheme) {
        return errorResponse('NOT_FOUND', '基础子方案不存在');
      }

      // 获取基础方案ID
      body.baseSolutionId = baseSubScheme.solutionId;
    }

    // 检查是否已存在相同的引用关系
    const [existingRef] = await db
      .select()
      .from(solutionSubReferences)
      .where(and(
        eq(solutionSubReferences.projectSubSchemeId, body.projectSubSchemeId),
        body.baseSubSchemeId ? eq(solutionSubReferences.baseSubSchemeId, body.baseSubSchemeId) : sql`base_sub_scheme_id IS NULL`
      ))
      .limit(1);

    if (existingRef) {
      return errorResponse('CONFLICT', '该引用关系已存在');
    }

    // 创建引用关系
    const [newReference] = await db
      .insert(solutionSubReferences)
      .values({
        projectSolutionId: solutionId,
        projectSubSchemeId: body.projectSubSchemeId,
        baseSolutionId: body.baseSolutionId || null,
        baseSubSchemeId: body.baseSubSchemeId || null,
        referenceType: body.referenceType || 'full',
        contributionWeight: body.contributionWeight || '1.00',
        referenceNotes: body.referenceNotes || null,
        createdBy: context.userId,
      })
      .returning();

    return successResponse(newReference);
  } catch (error) {
    console.error('Error creating reference:', error);
    return errorResponse('INTERNAL_ERROR', '创建引用关系失败');
  }
});

// DELETE /api/solutions/[id]/references - 删除引用关系
export const DELETE = withAuth(async (
  req: NextRequest,
  context: { userId: number; params?: Record<string, string> }
) => {
  try {
    const solutionId = parseInt(context.params?.id || '0');
    const { searchParams } = new URL(req.url);
    const referenceId = searchParams.get('referenceId');
    
    if (!solutionId || isNaN(solutionId)) {
      return errorResponse('BAD_REQUEST', '无效的方案ID');
    }

    if (!referenceId) {
      return errorResponse('BAD_REQUEST', '引用关系ID不能为空');
    }

    // 验证引用关系存在且属于该方案
    const [existingRef] = await db
      .select()
      .from(solutionSubReferences)
      .where(and(
        eq(solutionSubReferences.id, parseInt(referenceId)),
        eq(solutionSubReferences.projectSolutionId, solutionId)
      ))
      .limit(1);

    if (!existingRef) {
      return errorResponse('NOT_FOUND', '引用关系不存在');
    }

    // 删除引用关系
    await db
      .delete(solutionSubReferences)
      .where(eq(solutionSubReferences.id, parseInt(referenceId)));

    return successResponse({ message: '删除成功' });
  } catch (error) {
    console.error('Error deleting reference:', error);
    return errorResponse('INTERNAL_ERROR', '删除引用关系失败');
  }
});
