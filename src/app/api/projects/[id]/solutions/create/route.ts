import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { solutions, solutionProjects } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { withAuth } from '@/lib/auth-middleware';
import { successResponse, errorResponse } from '@/lib/api-response';
import { canWriteProject } from '@/lib/permissions/project';

// POST - 基于模板创建新方案并关联到项目
export const POST = withAuth(async (
  request: NextRequest,
  context: { userId: number; params?: Record<string, string> }
) => {
  try {
    const projectId = parseInt(context.params?.id || '0');
    const body = await request.json();

    // 权限检查
    const canWrite = await canWriteProject(projectId, context.userId);
    if (!canWrite) {
      return errorResponse('FORBIDDEN', '您没有权限编辑此项目');
    }

    // 验证必填字段
    if (!body.templateId) {
      return errorResponse('BAD_REQUEST', '缺少模板ID');
    }
    if (!body.solutionName) {
      return errorResponse('BAD_REQUEST', '缺少方案名称');
    }

    // 获取模板
    const [template] = await db
      .select()
      .from(solutions)
      .where(
        and(
          eq(solutions.id, body.templateId),
          eq(solutions.isTemplate, true)
        )
      )
      .limit(1);

    if (!template) {
      return errorResponse('NOT_FOUND', '模板不存在或不是模板');
    }

    // 生成方案编号
    const solutionCode = `SOL${Date.now()}${Math.floor(Math.random() * 900 + 100)}`;

    // 合并定制内容
    const newSolutionData: any = {
      solutionCode,
      solutionName: body.solutionName,
      solutionTypeId: template.solutionTypeId,
      version: '1.0',
      industry: template.industry,
      scenario: template.scenario,
      description: body.customizations?.description || template.description,
      coreFeatures: body.customizations?.coreFeatures || template.coreFeatures,
      technicalArchitecture: body.customizations?.technicalArchitecture || template.technicalArchitecture,
      components: body.customizations?.components || template.components,
      advantages: template.advantages,
      limitations: template.limitations,
      targetAudience: template.targetAudience,
      complexity: template.complexity,
      estimatedCost: body.customizations?.estimatedCost || null,
      estimatedDuration: body.customizations?.estimatedDuration || null,
      authorId: context.userId,
      ownerId: context.userId,
      isTemplate: false,
      templateId: template.id,
      status: 'draft',
      tags: template.tags,
      isPublic: false,
      templateCategory: template.templateCategory,
      templateScope: 'personal',
      templateUsageCount: 0,
    };

    // 创建新方案
    const [newSolution] = await db
      .insert(solutions)
      .values(newSolutionData)
      .returning();

    // 创建快照
    const snapshot = {
      solutionCode: newSolution.solutionCode,
      solutionName: newSolution.solutionName,
      version: newSolution.version,
      description: newSolution.description,
      coreFeatures: newSolution.coreFeatures,
      technicalArchitecture: newSolution.technicalArchitecture,
      components: newSolution.components,
      industry: newSolution.industry,
      scenario: newSolution.scenario,
      estimatedCost: newSolution.estimatedCost,
      estimatedDuration: newSolution.estimatedDuration,
      tags: newSolution.tags,
      attachments: newSolution.attachments,
    };

    // 创建关联
    const [association] = await db
      .insert(solutionProjects)
      .values({
        projectId,
        solutionId: newSolution.id,
        associationType: 'default',
        solutionVersion: newSolution.version,
        usageType: 'customization',
        customizationDetails: body.customizationDetails || null,
        sourceType: 'create',
        stageBound: body.stageBound || null,
        solutionSnapshot: snapshot,
        createdBy: context.userId,
      })
      .returning();

    // 更新模板使用次数
    await db
      .update(solutions)
      .set({
        templateUsageCount: sql`${solutions.templateUsageCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(solutions.id, template.id));

    return NextResponse.json({
      success: true,
      data: {
        solution: {
          id: newSolution.id,
          solutionCode: newSolution.solutionCode,
          solutionName: newSolution.solutionName,
          templateId: newSolution.templateId,
          isTemplate: newSolution.isTemplate,
          version: newSolution.version,
        },
        association: {
          id: association.id,
          solutionId: association.solutionId,
          projectId: association.projectId,
          usageType: association.usageType,
        },
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Failed to create solution from template:', error);
    return errorResponse('INTERNAL_ERROR', '基于模板创建方案失败');
  }
});
