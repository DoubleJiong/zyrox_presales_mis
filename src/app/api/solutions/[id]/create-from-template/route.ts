import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { solutions, solutionSubSchemes, solutionTeams } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { authenticate } from '@/lib/auth';

// POST /api/solutions/[id]/create-from-template - 基于模板创建新方案
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: idParam } = await params;
    const templateId = parseInt(idParam);
    
    // 安全解析请求体
    let body: { solutionName?: string; solutionCode?: string; industry?: string; scenario?: string; description?: string } = {};
    try {
      const text = await req.text();
      if (text && text.trim()) {
        body = JSON.parse(text);
      }
    } catch (parseError) {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    // 验证必填字段
    if (!body.solutionName) {
      return NextResponse.json(
        { error: 'solutionName is required' },
        { status: 400 }
      );
    }

    // 获取模板方案
    const [template] = await db
      .select()
      .from(solutions)
      .where(
        eq(solutions.id, templateId)
      )
      .limit(1);

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    if (!template.isTemplate) {
      return NextResponse.json(
        { error: 'The specified solution is not a template' },
        { status: 400 }
      );
    }

    // 生成新方案编号
    const solutionCode = body.solutionCode || `SOL-${Date.now()}${Math.floor(Math.random() * 900 + 100)}`;

    // 创建新方案（复制模板属性）
    const [newSolution] = await db
      .insert(solutions)
      .values({
        solutionCode,
        solutionName: body.solutionName,
        solutionTypeId: template.solutionTypeId,
        version: '1.0',
        industry: body.industry || template.industry,
        scenario: body.scenario || template.scenario,
        description: body.description || template.description,
        coreFeatures: template.coreFeatures,
        technicalArchitecture: template.technicalArchitecture,
        components: template.components,
        advantages: template.advantages,
        limitations: template.limitations,
        targetAudience: template.targetAudience,
        complexity: template.complexity,
        estimatedCost: template.estimatedCost,
        estimatedDuration: template.estimatedDuration,
        authorId: user.id,
        ownerId: user.id,
        isTemplate: false,
        templateId: templateId,
        status: 'draft',
        tags: template.tags,
        attachments: template.attachments,
        isPublic: false,
      })
      .returning();

    // 更新模板使用次数
    await db
      .update(solutions)
      .set({
        templateUsageCount: template.templateUsageCount + 1,
        updatedAt: new Date(),
      })
      .where(eq(solutions.id, templateId));

    // 复制模板的子方案
    const templateSubSchemes = await db
      .select()
      .from(solutionSubSchemes)
      .where(eq(solutionSubSchemes.solutionId, templateId));

    if (templateSubSchemes.length > 0) {
      // 创建子方案映射（用于处理父子关系）
      const subSchemeIdMap = new Map<number, number>();

      // 先创建所有子方案（不包含父子关系）
      for (const subScheme of templateSubSchemes) {
        const [newSubScheme] = await db
          .insert(solutionSubSchemes)
          .values({
            solutionId: newSolution.id,
            subSchemeCode: `SUB-${solutionCode}-${Date.now().toString(36).toUpperCase()}`,
            subSchemeName: subScheme.subSchemeName,
            subSchemeType: subScheme.subSchemeType,
            sortOrder: subScheme.sortOrder,
            version: '1.0',
            description: subScheme.description,
            content: subScheme.content,
            technicalSpec: subScheme.technicalSpec,
            estimatedCost: subScheme.estimatedCost,
            estimatedDuration: subScheme.estimatedDuration,
            responsibleUserId: subScheme.responsibleUserId,
            status: 'draft',
            tags: subScheme.tags,
            attachments: subScheme.attachments,
            notes: subScheme.notes,
          })
          .returning();

        subSchemeIdMap.set(subScheme.id, newSubScheme.id);
      }

      // 更新父子关系
      for (const subScheme of templateSubSchemes) {
        if (subScheme.parentSubSchemeId) {
          const newParentId = subSchemeIdMap.get(subScheme.parentSubSchemeId);
          if (newParentId) {
            await db
              .update(solutionSubSchemes)
              .set({ parentSubSchemeId: newParentId })
              .where(eq(solutionSubSchemes.id, subSchemeIdMap.get(subScheme.id)!));
          }
        }
      }
    }

    // 添加创建者为团队成员（负责人）
    await db.insert(solutionTeams).values({
      solutionId: newSolution.id,
      userId: user.id,
      role: 'owner',
      permissions: {
        canEdit: true,
        canDelete: true,
        canApprove: true,
        canInvite: true,
        canUpload: true,
        canDownload: true,
      },
      invitedBy: user.id,
      status: 'active',
    });

    return NextResponse.json({
      message: 'Solution created from template successfully',
      data: newSolution,
      templateId: templateId,
      subSchemesCopied: templateSubSchemes.length,
    });
  } catch (error) {
    console.error('Error creating solution from template:', error);
    return NextResponse.json(
      { error: 'Failed to create solution from template' },
      { status: 500 }
    );
  }
}
