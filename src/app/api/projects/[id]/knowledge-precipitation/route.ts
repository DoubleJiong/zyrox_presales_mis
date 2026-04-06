/**
 * 知识沉淀 API
 * 
 * 功能：
 * - 将项目方案沉淀为模板
 * - 提取项目经验教训
 * - 生成知识文档
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { solutions, solutionProjects, projects } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

// 将项目方案沉淀为模板
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { 
      solutionIds, 
      templateCategory = 'best_practice',
      templateScope = 'company',
      knowledgeNotes 
    } = body;

    const projectId = parseInt(id);

    // 获取项目信息
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (!project) {
      return NextResponse.json(
        { success: false, error: '项目不存在' },
        { status: 404 }
      );
    }

    // 验证项目是否处于结算阶段
    if (project.projectStage !== 'settlement') {
      return NextResponse.json(
        { success: false, error: '只有结算阶段的项目才能进行知识沉淀' },
        { status: 400 }
      );
    }

    const createdTemplates = [];

    // 处理每个要沉淀的方案
    for (const solutionId of solutionIds) {
      // 获取方案关联信息（包含快照）
      const [association] = await db
        .select()
        .from(solutionProjects)
        .where(and(
          eq(solutionProjects.projectId, projectId),
          eq(solutionProjects.solutionId, solutionId)
        ))
        .limit(1);

      if (!association) continue;

      // 获取方案详情（优先使用快照）
      let solutionData;
      if (association.solutionSnapshot) {
        try {
          solutionData = typeof association.solutionSnapshot === 'string' 
            ? JSON.parse(association.solutionSnapshot) 
            : association.solutionSnapshot;
        } catch {
          const [solution] = await db
            .select()
            .from(solutions)
            .where(eq(solutions.id, solutionId))
            .limit(1);
          solutionData = solution;
        }
      } else {
        const [solution] = await db
          .select()
          .from(solutions)
          .where(eq(solutions.id, solutionId))
          .limit(1);
        solutionData = solution;
      }

      if (!solutionData) continue;

      // 创建新的模板
      const [newTemplate] = await db
        .insert(solutions)
        .values({
          solutionCode: `TPL-${Date.now()}-${solutionId}`,
          solutionName: `${solutionData.solutionName}（${project.projectName}）`,
          version: '1.0',
          status: 'active',
          isTemplate: true,
          templateCategory,
          templateScope,
          templateUsageCount: 0,
          description: solutionData.description,
          solutionType: solutionData.solutionType,
          industry: solutionData.industry,
          technologies: solutionData.technologies,
          features: solutionData.features,
          architecture: solutionData.architecture,
          implementationGuide: solutionData.implementationGuide,
          estimatedCost: solutionData.estimatedCost,
          estimatedDuration: solutionData.estimatedDuration,
          riskAssessment: solutionData.riskAssessment,
          // 可以添加知识沉淀的额外信息
          knowledgeNotes: knowledgeNotes || null,
          sourceProjectId: projectId,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      createdTemplates.push({
        id: newTemplate.id,
        name: newTemplate.solutionName,
        code: newTemplate.solutionCode,
      });

      // 更新原方案的使用计数
      await db
        .update(solutions)
        .set({
          templateUsageCount: (solutionData.templateUsageCount || 0) + 1,
        })
        .where(eq(solutions.id, solutionId));
    }

    return NextResponse.json({
      success: true,
      data: {
        projectId,
        templates: createdTemplates,
      },
      message: `成功将 ${createdTemplates.length} 个方案沉淀为模板`,
    });
  } catch (error) {
    console.error('知识沉淀失败:', error);
    return NextResponse.json(
      { success: false, error: '知识沉淀失败' },
      { status: 500 }
    );
  }
}

// 获取项目可沉淀的方案列表
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const projectId = parseInt(id);

    // 获取项目关联的方案
    const associatedSolutions = await db
      .select({
        id: solutionProjects.id,
        solutionId: solutionProjects.solutionId,
        usageType: solutionProjects.usageType,
        solutionSnapshot: solutionProjects.solutionSnapshot,
        solution: solutions,
      })
      .from(solutionProjects)
      .leftJoin(solutions, eq(solutionProjects.solutionId, solutions.id))
      .where(eq(solutionProjects.projectId, projectId));

    // 过滤可沉淀的方案
    const canPrecipitate = associatedSolutions
      .filter(s => s.solution && !s.solution.isTemplate)
      .map(s => ({
        id: s.solution!.id,
        solutionName: s.solution!.solutionName,
        solutionCode: s.solution!.solutionCode,
        version: s.solution!.version,
        usageType: s.usageType,
        hasSnapshot: !!s.solutionSnapshot,
      }));

    return NextResponse.json({
      success: true,
      data: canPrecipitate,
    });
  } catch (error) {
    console.error('获取可沉淀方案失败:', error);
    return NextResponse.json(
      { success: false, error: '获取可沉淀方案失败' },
      { status: 500 }
    );
  }
}
