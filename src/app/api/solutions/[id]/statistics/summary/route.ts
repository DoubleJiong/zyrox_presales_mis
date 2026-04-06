/**
 * 方案统计汇总 API
 * 
 * 端点：
 * - GET /api/solutions/[id]/statistics/summary - 获取统计汇总
 * - POST /api/solutions/[id]/statistics/summary - 重新计算统计
 */

import { NextRequest, NextResponse } from 'next/server';
import { solutionStatisticsService } from '@/services/solution-statistics.service';
import { solutionProjectService } from '@/services/solution-project.service';
import { db } from '@/db';
import { solutions } from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * GET /api/solutions/[id]/statistics/summary
 * 获取统计汇总
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
    
    const summary = await solutionStatisticsService.getStatsSummary(solutionId);
    
    return NextResponse.json({
      success: true,
      data: summary,
    });
    
  } catch (error) {
    console.error('获取统计汇总失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '获取统计汇总失败' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/solutions/[id]/statistics/summary
 * 重新计算统计
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
    
    const stats = await solutionStatisticsService.getStatsSummary(solutionId);
    
    return NextResponse.json({
      success: true,
      data: stats,
      message: '统计计算完成',
    });
    
  } catch (error) {
    console.error('计算统计失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '计算统计失败' },
      { status: 500 }
    );
  }
}
