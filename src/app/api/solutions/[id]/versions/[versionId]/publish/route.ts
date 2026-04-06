/**
 * 解决方案版本发布 API
 * 
 * 端点：
 * - POST /api/solutions/[id]/versions/[versionId]/publish - 发布版本
 */

import { NextRequest, NextResponse } from 'next/server';
import { solutionVersionService } from '@/services/solution-version.service';

/**
 * POST /api/solutions/[id]/versions/[versionId]/publish
 * 发布版本
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  try {
    const { id: idStr, versionId: versionIdStr } = await params;
    const solutionId = parseInt(idStr, 10);
    const versionId = parseInt(versionIdStr, 10);
    
    if (isNaN(solutionId) || isNaN(versionId)) {
      return NextResponse.json(
        { error: '无效的ID' },
        { status: 400 }
      );
    }
    
    // TODO: 从 session 获取操作者ID
    const operatorId = 1; // 临时硬编码
    
    const version = await solutionVersionService.publishVersion(versionId, operatorId);
    
    return NextResponse.json({
      success: true,
      data: version,
      message: '版本发布成功',
    });
    
  } catch (error) {
    console.error('发布版本失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '发布版本失败' },
      { status: 500 }
    );
  }
}
