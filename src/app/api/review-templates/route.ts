/**
 * 评审模板 API
 * 
 * 端点：
 * - GET /api/review-templates - 获取评审模板列表
 * - GET /api/review-templates/[id] - 获取评审模板详情
 */

import { NextRequest, NextResponse } from 'next/server';
import { solutionReviewService } from '@/services/solution-review.service';

/**
 * GET /api/review-templates
 * 获取评审模板列表
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const reviewType = searchParams.get('reviewType') || undefined;
    
    const templates = await solutionReviewService.getTemplates(reviewType);
    
    return NextResponse.json({
      success: true,
      data: templates,
    });
    
  } catch (error) {
    console.error('获取评审模板失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '获取评审模板失败' },
      { status: 500 }
    );
  }
}
