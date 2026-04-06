/**
 * 解决方案评审详情 API
 * 
 * 端点：
 * - GET /api/solutions/[id]/reviews/[reviewId] - 获取评审详情
 */

import { NextRequest, NextResponse } from 'next/server';
import { solutionReviewService } from '@/services/solution-review.service';

/**
 * GET /api/solutions/[id]/reviews/[reviewId]
 * 获取评审详情
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; reviewId: string }> }
) {
  try {
    const { reviewId: reviewIdStr } = await params;
    const reviewId = parseInt(reviewIdStr, 10);
    
    if (isNaN(reviewId)) {
      return NextResponse.json(
        { error: '无效的评审ID' },
        { status: 400 }
      );
    }
    
    const review = await solutionReviewService.getReviewDetail(reviewId);
    
    if (!review) {
      return NextResponse.json(
        { error: '评审不存在' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: review,
    });
    
  } catch (error) {
    console.error('获取评审详情失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '获取评审详情失败' },
      { status: 500 }
    );
  }
}
