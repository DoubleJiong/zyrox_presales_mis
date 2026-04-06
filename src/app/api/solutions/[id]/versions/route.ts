/**
 * 解决方案版本控制 API
 * 
 * 端点：
 * - GET  /api/solutions/[id]/versions - 获取版本列表
 * - POST /api/solutions/[id]/versions - 创建新版本
 */

import { NextRequest, NextResponse } from 'next/server';
import { solutionVersionService } from '@/services/solution-version.service';
import { db } from '@/db';
import { solutions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

// 参数验证
const createVersionSchema = z.object({
  changeType: z.enum(['major', 'minor', 'patch']),
  changelog: z.string().min(1, '变更日志不能为空'),
  changeSource: z.enum(['manual', 'edit', 'review', 'auto']).optional(),
});

/**
 * GET /api/solutions/[id]/versions
 * 获取版本列表
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
    
    // 获取查询参数
    const searchParams = request.nextUrl.searchParams;
    const includeDraft = searchParams.get('includeDraft') !== 'false';
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    
    const versions = await solutionVersionService.getVersionList(solutionId, {
      includeDraft,
      limit,
    });
    
    return NextResponse.json({
      success: true,
      data: versions,
    });
    
  } catch (error) {
    console.error('获取版本列表失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '获取版本列表失败' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/solutions/[id]/versions
 * 创建新版本
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
    const validated = createVersionSchema.parse(body);
    
    // TODO: 从 session 获取操作者ID
    const operatorId = 1; // 临时硬编码
    
    const version = await solutionVersionService.createVersion({
      solutionId,
      changeType: validated.changeType,
      changelog: validated.changelog,
      operatorId,
      changeSource: validated.changeSource || 'manual',
    });
    
    return NextResponse.json({
      success: true,
      data: version,
      message: '版本创建成功',
    });
    
  } catch (error) {
    console.error('创建版本失败:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '参数验证失败', details: error.issues },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '创建版本失败' },
      { status: 500 }
    );
  }
}
