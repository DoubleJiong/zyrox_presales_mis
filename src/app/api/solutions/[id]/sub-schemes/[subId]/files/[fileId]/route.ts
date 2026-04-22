import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { solutionFiles, solutionSubSchemes } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { authenticate } from '@/lib/auth';
import { checkSolutionPermission } from '@/lib/solution-permissions';
import { getStorage, isLocalStorageKey } from '@/lib/storage';
import { promises as fs } from 'node:fs';
import path from 'node:path';

// GET /api/solutions/[id]/sub-schemes/[subId]/files/[fileId] - 下载文件（生成新的访问URL）
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; subId: string; fileId: string }> }
) {
  try {
    const user = await authenticate(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: idParam, fileId } = await params;
    const solutionId = parseInt(idParam);
    const fileIdNum = parseInt(fileId);

    // 检查下载权限
    const hasPermission = await checkSolutionPermission(user.id, solutionId, 'canDownload');
    if (!hasPermission) {
      return NextResponse.json({ error: '没有下载权限' }, { status: 403 });
    }

    const [file] = await db.select().from(solutionFiles).where(eq(solutionFiles.id, fileIdNum)).limit(1);
    if (!file) {
      return NextResponse.json({ error: '文件不存在' }, { status: 404 });
    }

    if (file.storageKey && !isLocalStorageKey(file.storageKey)) {
      // 远程存储：生成新的预签名URL（有效期1天）
      const freshUrl = await getStorage().generatePresignedUrl({ key: file.storageKey, expireTime: 86400 });
      return NextResponse.redirect(freshUrl, { status: 302 });
    } else if (file.storageKey && isLocalStorageKey(file.storageKey)) {
      // 本地存储：直接读取并返回文件
      const relativePath = file.storageKey.startsWith('/') ? file.storageKey.slice(1) : file.storageKey;
      const filePath = path.join(process.cwd(), 'public', ...relativePath.split('/'));
      try {
        const fileBuffer = await fs.readFile(filePath);
        return new NextResponse(fileBuffer, {
          headers: {
            'Content-Type': 'application/octet-stream',
            'Content-Disposition': `attachment; filename="${encodeURIComponent(file.fileName)}"`,
            'Content-Length': String(fileBuffer.length),
          },
        });
      } catch {
        return NextResponse.json({ error: '文件已被删除或不可访问' }, { status: 404 });
      }
    } else if (file.fileUrl) {
      // 兼容旧数据：直接重定向到存储的URL
      return NextResponse.redirect(file.fileUrl, { status: 302 });
    }

    return NextResponse.json({ error: '文件链接不可用' }, { status: 404 });
  } catch (error) {
    console.error('Error downloading file:', error);
    return NextResponse.json({ error: 'Failed to download file' }, { status: 500 });
  }
}

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
