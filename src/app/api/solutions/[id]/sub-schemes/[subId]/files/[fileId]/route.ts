import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { solutionFiles, solutionSubSchemes } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { authenticate } from '@/lib/auth';
import { checkSolutionPermission } from '@/lib/solution-permissions';

// DELETE /api/solutions/[id]/sub-schemes/[subId]/files/[fileId] - 删除文件
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; subId: string; fileId: string }> }
) {
  try {
    const user = await authenticate(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: idParam, subId, fileId } = await params;
    const solutionId = parseInt(idParam);
    const subSchemeId = parseInt(subId);
    const fileIdNum = parseInt(fileId);

    // 检查删除权限
    const hasPermission = await checkSolutionPermission(user.id, solutionId, 'canDelete');
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'You do not have permission to delete files from this solution' },
        { status: 403 }
      );
    }

    // 获取文件信息
    const [file] = await db
      .select()
      .from(solutionFiles)
      .where(eq(solutionFiles.id, fileIdNum))
      .limit(1);

    if (!file) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    // 验证文件属于该子方案
    if (file.subSchemeId !== subSchemeId) {
      return NextResponse.json(
        { error: 'File does not belong to this sub-scheme' },
        { status: 400 }
      );
    }

    // 删除文件记录
    await db
      .delete(solutionFiles)
      .where(eq(solutionFiles.id, fileIdNum));

    // 如果删除的是当前版本，将最新的历史版本设为当前版本
    if (file.isCurrent) {
      const latestFile = await db
        .select()
        .from(solutionFiles)
        .where(eq(solutionFiles.subSchemeId, subSchemeId))
        .orderBy(solutionFiles.createdAt)
        .limit(1);

      if (latestFile.length > 0) {
        await db
          .update(solutionFiles)
          .set({ isCurrent: true })
          .where(eq(solutionFiles.id, latestFile[0].id));

        // 更新子方案版本
        await db
          .update(solutionSubSchemes)
          .set({ version: latestFile[0].version })
          .where(eq(solutionSubSchemes.id, subSchemeId));
      }
    }

    return NextResponse.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Error deleting file:', error);
    return NextResponse.json(
      { error: 'Failed to delete file' },
      { status: 500 }
    );
  }
}
