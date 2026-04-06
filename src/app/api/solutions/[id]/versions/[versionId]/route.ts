/**
 * 解决方案版本详情 API
 * 
 * 端点：
 * - GET /api/solutions/[id]/versions/[versionId] - 获取版本详情
 */

import { NextRequest, NextResponse } from 'next/server';
import { solutionVersionService } from '@/services/solution-version.service';

/**
 * GET /api/solutions/[id]/versions/[versionId]
 * 获取版本详情
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  try {
    const { versionId: versionIdStr } = await params;
    const versionId = parseInt(versionIdStr, 10);
    
    if (isNaN(versionId)) {
      return NextResponse.json(
        { error: '无效的版本ID' },
        { status: 400 }
      );
    }
    
    const version = await solutionVersionService.getVersionDetail(versionId);
    
    if (!version) {
      return NextResponse.json(
        { error: '版本不存在' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: version,
    });
    
  } catch (error) {
    console.error('获取版本详情失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '获取版本详情失败' },
      { status: 500 }
    );
  }
}
