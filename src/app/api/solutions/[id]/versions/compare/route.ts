/**
 * 解决方案版本对比 API
 * 
 * 端点：
 * - GET /api/solutions/[id]/versions/compare?version1=xxx&version2=xxx - 对比两个版本
 * - GET /api/solutions/[id]/versions/compare?version1=xxx&version2=xxx&includeContent=true - 包含文件内容对比
 */

import { NextRequest, NextResponse } from 'next/server';
import { solutionVersionService } from '@/services/solution-version.service';

/**
 * GET /api/solutions/[id]/versions/compare
 * 对比两个版本
 * 
 * Query Parameters:
 * - version1: 版本1 ID（必填）
 * - version2: 版本2 ID（必填）
 * - includeContent: 是否包含文件内容对比（可选，默认 false）
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
    const version1Str = searchParams.get('version1');
    const version2Str = searchParams.get('version2');
    const includeContent = searchParams.get('includeContent') === 'true';
    
    if (!version1Str || !version2Str) {
      return NextResponse.json(
        { error: '请提供要对比的版本ID' },
        { status: 400 }
      );
    }
    
    const version1Id = parseInt(version1Str, 10);
    const version2Id = parseInt(version2Str, 10);
    
    if (isNaN(version1Id) || isNaN(version2Id)) {
      return NextResponse.json(
        { error: '无效的版本ID' },
        { status: 400 }
      );
    }
    
    const diff = await solutionVersionService.compareVersions(version1Id, version2Id, {
      includeFileContent: includeContent,
    });
    
    return NextResponse.json({
      success: true,
      data: diff,
    });
    
  } catch (error) {
    console.error('版本对比失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '版本对比失败' },
      { status: 500 }
    );
  }
}
