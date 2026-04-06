/**
 * 解决方案评分历史 API
 * 
 * 端点：
 * - GET /api/solutions/[id]/score/history - 获取评分历史
 */

import { NextRequest, NextResponse } from 'next/server';
import { solutionScoreService } from '@/services/solution-score.service';

/**
 * GET /api/solutions/[id]/score/history
 * 获取评分历史
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
    const limit = parseInt(searchParams.get('limit') || '30', 10);
    
    const history = await solutionScoreService.getScoreHistory(solutionId, limit);
    
    // 处理空状态
    const isEmpty = !history || (Array.isArray(history) && history.length === 0);
    
    return NextResponse.json({
      success: true,
      data: history,
      // 空状态提示
      meta: {
        isEmpty,
        message: isEmpty ? '暂无评分历史记录。发布方案或获得评审后将自动记录评分历史。' : null,
        hint: isEmpty ? '评分历史会在以下情况自动生成：\n1. 方案发布时\n2. 通过评审时\n3. 手动触发评分计算时' : null,
      },
    });
    
  } catch (error) {
    console.error('获取评分历史失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '获取评分历史失败' },
      { status: 500 }
    );
  }
}
