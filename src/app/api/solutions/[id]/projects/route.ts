/**
 * 方案-项目关联 API（只读）
 * 
 * 端点：
 * - GET /api/solutions/[id]/projects - 获取方案关联的项目列表
 * 
 * 设计原则：
 * - 数据修改入口唯一：项目关联在项目管理模块操作
 * - 本API仅提供查询功能
 */

import { NextRequest, NextResponse } from 'next/server';
import { solutionProjectService } from '@/services/solution-project.service';

/**
 * GET /api/solutions/[id]/projects
 * 获取方案关联的项目列表
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
    
    const associations = await solutionProjectService.getSolutionProjects(solutionId, { usageType });
    
    return NextResponse.json({
      success: true,
      data: associations,
    });
    
  } catch (error) {
    console.error('获取方案关联项目失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '获取方案关联项目失败' },
      { status: 500 }
    );
  }
}
