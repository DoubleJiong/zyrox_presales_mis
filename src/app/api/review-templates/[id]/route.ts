/**
 * 评审模板详情 API
 * 
 * 端点：
 * - GET /api/review-templates/[id] - 获取评审模板详情
 */

import { NextRequest, NextResponse } from 'next/server';
import { solutionReviewService } from '@/services/solution-review.service';

/**
 * GET /api/review-templates/[id]
 * 获取评审模板详情
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params;
    const templateId = parseInt(idStr, 10);
    
    if (isNaN(templateId)) {
      return NextResponse.json(
        { error: '无效的模板ID' },
        { status: 400 }
      );
    }
    
    const template = await solutionReviewService.getTemplateDetail(templateId);
    
    if (!template) {
      return NextResponse.json(
        { error: '模板不存在' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: template,
    });
    
  } catch (error) {
    console.error('获取评审模板详情失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '获取评审模板详情失败' },
      { status: 500 }
    );
  }
}
