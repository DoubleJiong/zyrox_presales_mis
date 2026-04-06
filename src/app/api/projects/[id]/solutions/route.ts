/**
 * 项目方案引用 API
 * 
 * 端点：
 * - GET  /api/projects/[id]/solutions - 获取项目的关联方案列表
 * - POST /api/projects/[id]/solutions - 项目引用方案
 */

import { NextRequest, NextResponse } from 'next/server';
import { solutionProjectService } from '@/services/solution-project.service';
import { db } from '@/db';
import { projects } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

// 参数验证
const createProjectSolutionSchema = z.object({
  solutionId: z.number().min(1, '方案ID不能为空'),
  subSchemeId: z.number().optional(),
  versionId: z.number().optional(),
  usageType: z.enum(['reference', 'implementation', 'customization']),
  stageBound: z.enum(['opportunity', 'bidding', 'execution']).optional(),
  notes: z.string().optional(),
});

/**
 * GET /api/projects/[id]/solutions
 * 获取项目的关联方案列表
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params;
    const projectId = parseInt(idStr, 10);
    
    if (isNaN(projectId)) {
      return NextResponse.json(
        { error: '无效的项目ID' },
        { status: 400 }
      );
    }
    
    const associations = await solutionProjectService.getProjectSolutions(projectId);
    
    return NextResponse.json({
      success: true,
      data: associations,
    });
    
  } catch (error) {
    console.error('获取项目关联方案失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '获取项目关联方案失败' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects/[id]/solutions
 * 项目引用方案
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params;
    const projectId = parseInt(idStr, 10);
    
    if (isNaN(projectId)) {
      return NextResponse.json(
        { error: '无效的项目ID' },
        { status: 400 }
      );
    }
    
    // 验证项目存在
    const [project] = await db.select()
      .from(projects)
      .where(eq(projects.id, projectId));
    
    if (!project) {
      return NextResponse.json(
        { error: '项目不存在' },
        { status: 404 }
      );
    }
    
    // 解析请求体
    const body = await request.json();
    const validated = createProjectSolutionSchema.parse(body);
    
    // TODO: 从 session 获取用户ID
    const userId = 1; // 临时硬编码
    
    const association = await solutionProjectService.createAssociation({
      solutionId: validated.solutionId,
      projectId,
      subSchemeId: validated.subSchemeId,
      versionId: validated.versionId,
      usageType: validated.usageType,
      stageBound: validated.stageBound,
      notes: validated.notes,
      userId,
    });
    
    return NextResponse.json({
      success: true,
      data: association,
      message: '方案引用成功',
    });
    
  } catch (error) {
    console.error('项目引用方案失败:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '参数验证失败', details: error.issues },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '项目引用方案失败' },
      { status: 500 }
    );
  }
}
