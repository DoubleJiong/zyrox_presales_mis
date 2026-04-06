import { NextRequest } from 'next/server';
import { db } from '@/db';
import { projectPhaseSolutionReferences, solutions, solutionSubSchemes, users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { withAuth } from '@/lib/auth-middleware';
import { successResponse, errorResponse } from '@/lib/api-response';

// GET /api/project-phases/[id]/solution-refs - 获取项目阶段引用的方案列表
// 注意：这里的 id 是项目ID，需要配合 projectPhase 参数
export const GET = withAuth(async (
  request: NextRequest,
  context: { userId: number; user?: any; params?: Record<string, string> }
) => {
  try {
    const projectId = parseInt(context.params?.id || '0');
    const { searchParams } = new URL(request.url);
    const projectPhase = searchParams.get('projectPhase');
    
    if (isNaN(projectId)) {
      return errorResponse('BAD_REQUEST', '无效的项目ID');
    }

    // 构建查询条件
    const conditions = [eq(projectPhaseSolutionReferences.projectId, projectId)];
    if (projectPhase) {
      conditions.push(eq(projectPhaseSolutionReferences.projectPhase, projectPhase));
    }

    // 查询阶段引用的方案
    const refs = await db
      .select({
        id: projectPhaseSolutionReferences.id,
        projectId: projectPhaseSolutionReferences.projectId,
        projectPhase: projectPhaseSolutionReferences.projectPhase,
        referenceMode: projectPhaseSolutionReferences.referenceMode,
        referencedSolutionId: projectPhaseSolutionReferences.referencedSolutionId,
        referencedSubSchemeId: projectPhaseSolutionReferences.referencedSubSchemeId,
        snapshotSolutionCode: projectPhaseSolutionReferences.snapshotSolutionCode,
        snapshotSolutionName: projectPhaseSolutionReferences.snapshotSolutionName,
        snapshotVersionNo: projectPhaseSolutionReferences.snapshotVersionNo,
        snapshotSubSchemeType: projectPhaseSolutionReferences.snapshotSubSchemeType,
        snapshotSubSchemeName: projectPhaseSolutionReferences.snapshotSubSchemeName,
        snapshotFileUrl: projectPhaseSolutionReferences.snapshotFileUrl,
        snapshotData: projectPhaseSolutionReferences.snapshotData,
        sourceSolutionType: projectPhaseSolutionReferences.sourceSolutionType,
        referencedAt: projectPhaseSolutionReferences.referencedAt,
        referencedBy: projectPhaseSolutionReferences.referencedBy,
        remark: projectPhaseSolutionReferences.remark,
        solution: {
          id: solutions.id,
          name: solutions.name,
          description: solutions.description,
          version: solutions.version,
          status: solutions.status,
        },
        subScheme: {
          id: solutionSubSchemes.id,
          name: solutionSubSchemes.name,
          type: solutionSubSchemes.type,
          status: solutionSubSchemes.status,
        },
        refUser: {
          id: users.id,
          realName: users.realName,
        },
      })
      .from(projectPhaseSolutionReferences)
      .leftJoin(solutions, eq(projectPhaseSolutionReferences.referencedSolutionId, solutions.id))
      .leftJoin(solutionSubSchemes, eq(projectPhaseSolutionReferences.referencedSubSchemeId, solutionSubSchemes.id))
      .leftJoin(users, eq(projectPhaseSolutionReferences.referencedBy, users.id))
      .where(and(...conditions));

    return successResponse(refs);
  } catch (error) {
    console.error('获取项目阶段方案引用失败:', error);
    return errorResponse('INTERNAL_ERROR', '获取项目阶段方案引用失败', { status: 500 });
  }
});

// POST /api/project-phases/[id]/solution-refs - 添加方案引用
export const POST = withAuth(async (
  request: NextRequest,
  context: { userId: number; user?: any; params?: Record<string, string> }
) => {
  try {
    const projectId = parseInt(context.params?.id || '0');
    
    if (isNaN(projectId)) {
      return errorResponse('BAD_REQUEST', '无效的项目ID');
    }

    const body = await request.json();
    const { 
      projectPhase, 
      referenceMode,
      referencedSolutionId,
      referencedSubSchemeId,
      snapshotData,
      sourceSolutionType,
      remark 
    } = body;

    if (!projectPhase || !referenceMode) {
      return errorResponse('BAD_REQUEST', '项目阶段和引用模式不能为空');
    }

    if (!referencedSolutionId) {
      return errorResponse('BAD_REQUEST', '方案ID不能为空');
    }

    // 获取方案快照数据（如果未提供）
    let snapshot = snapshotData;
    if (!snapshot) {
      const [solution] = await db
        .select()
        .from(solutions)
        .where(eq(solutions.id, referencedSolutionId));
      
      if (solution) {
        snapshot = {
          name: solution.name,
          description: solution.description,
          version: solution.version,
          status: solution.status,
        };
      }
    }

    // 创建引用
    const [ref] = await db
      .insert(projectPhaseSolutionReferences)
      .values({
        projectId,
        projectPhase,
        referenceMode,
        referencedSolutionId,
        referencedSubSchemeId,
        snapshotData: snapshot,
        sourceSolutionType: sourceSolutionType || 'base',
        referencedBy: context.userId,
        remark,
      })
      .returning();

    return successResponse(ref);
  } catch (error) {
    console.error('添加方案引用失败:', error);
    return errorResponse('INTERNAL_ERROR', '添加方案引用失败', { status: 500 });
  }
});
