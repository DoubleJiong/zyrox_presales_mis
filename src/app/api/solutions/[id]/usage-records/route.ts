/**
 * 方案使用记录 API
 * 
 * 端点：
 * - GET  /api/solutions/[id]/usage-records - 获取使用记录列表
 * - POST /api/solutions/[id]/usage-records - 创建使用记录
 */

import { NextRequest, NextResponse } from 'next/server';
import { solutionUsageService } from '@/services/solution-usage.service';
import { db } from '@/db';
import { solutions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

// 参数验证
const createUsageRecordSchema = z.object({
  subSchemeId: z.number().optional(),
  projectId: z.number().optional(),
  usageType: z.enum(['reference', 'implementation', 'customization', 'view', 'download']),
  usageContext: z.enum(['project_follow', 'template_copy', 'direct_view', 'search_result']).optional(),
  region: z.string().optional(),
  notes: z.string().optional(),
  versionId: z.number().optional(),
  usageResult: z.enum(['adopted', 'modified', 'abandoned']).optional(),
  resultProjectId: z.number().optional(),
  effectivenessScore: z.number().min(1).max(5).optional(),
  effectivenessNotes: z.string().optional(),
});

/**
 * GET /api/solutions/[id]/usage-records
 * 获取使用记录列表
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params;
    const solutionId = parseInt(idStr, 10);
    
    if (isNaN(solutionId)) {
      return NextResponse.json(
        { error: '无效的方案ID' },
        { status: 400 }
      );
    }
    
    const searchParams = request.nextUrl.searchParams;
    const usageType = searchParams.get('usageType') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    
    const records = await solutionUsageService.getSolutionUsageRecords(solutionId, { 
      usageType, 
      limit 
    });
    
    return NextResponse.json({
      success: true,
      data: records,
    });
    
  } catch (error) {
    console.error('获取使用记录失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '获取使用记录失败' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/solutions/[id]/usage-records
 * 创建使用记录
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params;
    const solutionId = parseInt(idStr, 10);
    
    if (isNaN(solutionId)) {
      return NextResponse.json(
        { error: '无效的方案ID' },
        { status: 400 }
      );
    }
    
    // 验证方案存在
    const [solution] = await db.select()
      .from(solutions)
      .where(eq(solutions.id, solutionId));
    
    if (!solution) {
      return NextResponse.json(
        { error: '方案不存在' },
        { status: 404 }
      );
    }
    
    // 解析请求体
    const body = await request.json();
    const validated = createUsageRecordSchema.parse(body);
    
    // TODO: 从 session 获取用户ID
    const userId = 1; // 临时硬编码
    
    const record = await solutionUsageService.createRecord({
      solutionId,
      subSchemeId: validated.subSchemeId,
      projectId: validated.projectId,
      userId,
      usageType: validated.usageType,
      usageContext: validated.usageContext,
      region: validated.region,
      notes: validated.notes,
      versionId: validated.versionId,
      usageResult: validated.usageResult,
      resultProjectId: validated.resultProjectId,
      effectivenessScore: validated.effectivenessScore,
      effectivenessNotes: validated.effectivenessNotes,
    });
    
    return NextResponse.json({
      success: true,
      data: record,
      message: '使用记录创建成功',
    });
    
  } catch (error) {
    console.error('创建使用记录失败:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '参数验证失败', details: error.issues },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '创建使用记录失败' },
      { status: 500 }
    );
  }
}
