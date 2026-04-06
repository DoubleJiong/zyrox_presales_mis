/**
 * 解决方案版本回滚 API
 * 
 * 端点：
 * - POST /api/solutions/[id]/versions/[versionId]/rollback - 回滚到指定版本
 */

import { NextRequest, NextResponse } from 'next/server';
import { solutionVersionService } from '@/services/solution-version.service';
import { db } from '@/db';
import { solutionVersions } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * POST /api/solutions/[id]/versions/[versionId]/rollback
 * 回滚到指定版本
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  try {
    const { id: idStr, versionId: versionIdStr } = await params;
    const solutionId = parseInt(idStr, 10);
    const targetVersionId = parseInt(versionIdStr, 10);
    
    if (isNaN(solutionId) || isNaN(targetVersionId)) {
      return NextResponse.json(
        { error: '无效的ID' },
        { status: 400 }
      );
    }
    
    // 验证目标版本存在且属于该方案
    const [targetVersion] = await db.select()
      .from(solutionVersions)
      .where(and(
        eq(solutionVersions.id, targetVersionId),
        eq(solutionVersions.solutionId, solutionId)
      ));
    
    if (!targetVersion) {
      return NextResponse.json(
        { error: '目标版本不存在或不属于该方案' },
        { status: 404 }
      );
    }
    
    // 只有已发布的版本可以回滚
    if (targetVersion.status !== 'released') {
      return NextResponse.json(
        { error: '只有已发布的版本可以回滚' },
        { status: 400 }
      );
    }
    
    // TODO: 从 session 获取操作者ID
    const operatorId = 1; // 临时硬编码
    
    const newVersion = await solutionVersionService.rollbackVersion(
      targetVersionId,
      operatorId
    );
    
    return NextResponse.json({
      success: true,
      data: newVersion,
      message: `已回滚至版本 ${targetVersion.version}`,
    });
    
  } catch (error) {
    console.error('版本回滚失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '版本回滚失败' },
      { status: 500 }
    );
  }
}
