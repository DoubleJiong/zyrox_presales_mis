/**
 * 解决方案评分 API
 * 
 * 端点：
 * - GET  /api/solutions/[id]/score - 获取评分详情
 * - POST /api/solutions/[id]/score - 重新计算评分
 */

import { NextRequest, NextResponse } from 'next/server';
import { solutionScoreService } from '@/services/solution-score.service';
import { db } from '@/db';
import { solutions } from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * GET /api/solutions/[id]/score
 * 获取评分详情
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
    
    const score = await solutionScoreService.getScoreDetail(solutionId);
    
    return NextResponse.json({
      success: true,
      data: score,
    });
    
  } catch (error) {
    console.error('获取评分详情失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '获取评分详情失败' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/solutions/[id]/score
 * 重新计算评分
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
    
    const score = await solutionScoreService.updateScore(solutionId);
    
    return NextResponse.json({
      success: true,
      data: score,
      message: '评分计算成功',
    });
    
  } catch (error) {
    console.error('计算评分失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '计算评分失败' },
      { status: 500 }
    );
  }
}
