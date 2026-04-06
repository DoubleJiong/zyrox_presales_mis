/**
 * 解决方案评审 API
 * 
 * 端点：
 * - GET  /api/solutions/[id]/reviews - 获取评审列表
 * - POST /api/solutions/[id]/reviews - 创建评审任务
 */

import { NextRequest, NextResponse } from 'next/server';
import { solutionReviewService } from '@/services/solution-review.service';
import { db } from '@/db';
import { solutions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

// 参数验证
const createReviewSchema = z.object({
  subSchemeId: z.number().optional(),
  versionId: z.number().optional(),
  reviewerId: z.number().min(1, '评审人ID不能为空'),
  reviewType: z.string().min(1, '评审类型不能为空'),
  reviewComment: z.string().optional(),
  reviewScore: z.number().min(0).max(100).optional(),
  dueDate: z.string().optional(),
});

/**
 * GET /api/solutions/[id]/reviews
 * 获取评审列表
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
    const reviewStatus = searchParams.get('reviewStatus') || undefined;
    
    const reviews = await solutionReviewService.getReviewList(solutionId, { reviewStatus });
    
    return NextResponse.json({
      success: true,
      data: reviews,
    });
    
  } catch (error) {
    console.error('获取评审列表失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '获取评审列表失败' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/solutions/[id]/reviews
 * 创建评审任务
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
    const validated = createReviewSchema.parse(body);
    
    const review = await solutionReviewService.createReview({
      solutionId,
      subSchemeId: validated.subSchemeId,
      versionId: validated.versionId,
      reviewerId: validated.reviewerId,
      reviewType: validated.reviewType,
      reviewComment: validated.reviewComment,
      reviewScore: validated.reviewScore,
      dueDate: validated.dueDate ? new Date(validated.dueDate) : undefined,
    });
    
    return NextResponse.json({
      success: true,
      data: review,
      message: '评审任务创建成功',
    });
    
  } catch (error) {
    console.error('创建评审任务失败:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '参数验证失败', details: error.issues },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '创建评审任务失败' },
      { status: 500 }
    );
  }
}
