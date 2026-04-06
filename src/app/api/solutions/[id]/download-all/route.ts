/**
 * 批量下载方案文件 API
 * 
 * 端点：GET /api/solutions/[id]/download-all
 * 功能：打包下载方案的所有文件（ZIP格式）
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { solutionFiles, solutionSubSchemes } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { authenticate } from '@/lib/auth';
import { checkSolutionPermission } from '@/lib/solution-permissions';
import JSZip from 'jszip';

// GET /api/solutions/[id]/download-all - 打包下载所有文件
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: idParam } = await params;
    const solutionId = parseInt(idParam);

    // 检查下载权限
    const hasPermission = await checkSolutionPermission(user.id, solutionId, 'canDownload');
    if (!hasPermission) {
      return NextResponse.json(
        { error: '您没有权限下载此方案的文件' },
        { status: 403 }
      );
    }

    // 获取方案的所有子方案
    const subSchemes = await db
      .select()
      .from(solutionSubSchemes)
      .where(eq(solutionSubSchemes.solutionId, solutionId));

    if (subSchemes.length === 0) {
      return NextResponse.json(
        { error: '该方案没有子方案，无文件可下载' },
        { status: 404 }
      );
    }

    // 获取所有文件
    const allFiles: {
      id: number;
      fileName: string;
      fileUrl: string;
      fileSize: number | null;
      fileType: string;
      subSchemeName: string;
    }[] = [];

    for (const subScheme of subSchemes) {
      const files = await db
        .select({
          id: solutionFiles.id,
          fileName: solutionFiles.fileName,
          fileUrl: solutionFiles.fileUrl,
          fileSize: solutionFiles.fileSize,
          fileType: solutionFiles.fileType,
        })
        .from(solutionFiles)
        .where(eq(solutionFiles.subSchemeId, subScheme.id));

      files.forEach(file => {
        allFiles.push({
          ...file,
          subSchemeName: subScheme.subSchemeName,
        });
      });
    }

    if (allFiles.length === 0) {
      return NextResponse.json(
        { error: '该方案没有文件可下载' },
        { status: 404 }
      );
    }

    // 创建 ZIP 文件
    const zip = new JSZip();

    // 下载并添加文件到 ZIP
    const downloadPromises = allFiles.map(async (file) => {
      try {
        if (!file.fileUrl) {
          console.warn(`文件 ${file.fileName} 没有 URL`);
          return;
        }

        const response = await fetch(file.fileUrl, {
          headers: {
            'User-Agent': 'Solution-Management-System/1.0',
          },
        });

        if (!response.ok) {
          console.warn(`下载文件 ${file.fileName} 失败: ${response.status}`);
          return;
        }

        const blob = await response.blob();
        
        // 按子方案分组存储
        const folder = zip.folder(file.subSchemeName);
        if (folder) {
          folder.file(file.fileName, blob);
        }
      } catch (error) {
        console.error(`下载文件 ${file.fileName} 出错:`, error);
      }
    });

    await Promise.all(downloadPromises);

    // 生成 ZIP 文件
    const zipBlob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: {
        level: 6, // 压缩级别 1-9
      },
    });

    // 记录下载统计（异步，不等待）
    recordDownloadStatistics(solutionId, user.id).catch(console.error);

    // 返回 ZIP 文件
    return new NextResponse(zipBlob, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="solution_${solutionId}_files.zip"`,
        'Content-Length': String(zipBlob.size),
      },
    });
  } catch (error) {
    console.error('批量下载失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '下载失败' },
      { status: 500 }
    );
  }
}

// 记录下载统计
async function recordDownloadStatistics(solutionId: number, userId: number) {
  try {
    // 记录下载操作
    await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/solutions/${solutionId}/statistics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        actionType: 'batch_download',
        userId,
      }),
    });
  } catch (error) {
    console.error('记录下载统计失败:', error);
  }
}
