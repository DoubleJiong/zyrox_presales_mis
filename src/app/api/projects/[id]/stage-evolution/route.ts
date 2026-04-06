/**
 * 项目阶段变更触发方案版本演进 API
 * 
 * 功能：
 * - 项目阶段变更时自动更新关联方案的状态
 * - 创建方案快照
 * - 记录版本演进历史
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { solutions, solutionProjects, projects } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

// 项目阶段变更触发器
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { fromStage, toStage } = body;

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

    // 获取项目关联的所有方案
    const associatedSolutions = await db
      .select({
        id: solutionProjects.id,
        solutionId: solutionProjects.solutionId,
        usageType: solutionProjects.usageType,
        stageBound: solutionProjects.stageBound,
      })
      .from(solutionProjects)
      .where(eq(solutionProjects.projectId, projectId));

    if (associatedSolutions.length === 0) {
      return NextResponse.json({
        success: true,
        message: '项目无关联方案，无需处理',
      });
    }

    // 阶段演进映射
    const stageEvolutionMap: Record<string, { 
      versionPrefix: string; 
      statusChange?: string;
      createSnapshot: boolean;
    }> = {
      'opportunity->bidding': {
        versionPrefix: '投标版',
        createSnapshot: true,
      },
      'bidding->execution': {
        versionPrefix: '实施版',
        createSnapshot: true,
      },
      'execution->acceptance': {
        versionPrefix: '验收版',
        createSnapshot: true,
      },
      'acceptance->settlement': {
        versionPrefix: '结算版',
        createSnapshot: true,
      },
    };

    const stageTransition = `${fromStage}->${toStage}`;
    const evolutionConfig = stageEvolutionMap[stageTransition];

    if (!evolutionConfig) {
      return NextResponse.json({
        success: true,
        message: '该阶段转换不需要特殊的方案版本处理',
      });
    }

    // 处理每个关联方案
    const results = [];
    for (const association of associatedSolutions) {
      // 获取方案详情
      const [solution] = await db
        .select()
        .from(solutions)
        .where(eq(solutions.id, association.solutionId))
        .limit(1);

      if (!solution) continue;

      // 创建快照
      if (evolutionConfig.createSnapshot) {
        await db
          .update(solutionProjects)
          .set({
            solutionSnapshot: solution as any,
            stageBound: toStage,
          })
          .where(eq(solutionProjects.id, association.id));
      }

      // 更新方案版本（可选：根据业务需求决定是否更新主方案）
      // 这里只更新关联记录的快照，不修改主方案

      results.push({
        solutionId: association.solutionId,
        solutionName: solution.solutionName,
        action: 'snapshot_created',
        stage: toStage,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        projectId,
        stageTransition,
        processedSolutions: results,
      },
      message: `项目阶段从 ${fromStage} 变更为 ${toStage}，已处理 ${results.length} 个关联方案`,
    });
  } catch (error) {
    console.error('处理阶段变更失败:', error);
    return NextResponse.json(
      { success: false, error: '处理阶段变更失败' },
      { status: 500 }
    );
  }
}
