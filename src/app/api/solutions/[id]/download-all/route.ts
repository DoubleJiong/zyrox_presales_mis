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
import { promises as fs } from 'node:fs';
import path from 'node:path';

// 判断是否本地存储 URL（相对路径）
function isLocalUrl(url: string): boolean {
  return url.startsWith('/local-uploads/');
}

// 从本地文件系统读取文件内容
async function readLocalFile(url: string): Promise<Buffer | null> {
  try {
    const relativePath = url.startsWith('/') ? url.slice(1) : url;
    const filePath = path.join(process.cwd(), 'public', ...relativePath.split('/'));
    return await fs.readFile(filePath);
  } catch {
    return null;
  }
}

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

        let fileBuffer: Buffer | null = null;

        if (isLocalUrl(file.fileUrl)) {
          // 本地存储：直接读取文件系统
          fileBuffer = await readLocalFile(file.fileUrl);
          if (!fileBuffer) {
            console.warn(`本地文件 ${file.fileName} 不存在: ${file.fileUrl}`);
            return;
          }
        } else {
          // 远程存储：通过 HTTP 下载
          const response = await fetch(file.fileUrl, {
            headers: {
              'User-Agent': 'Solution-Management-System/1.0',
            },
          });

          if (!response.ok) {
            console.warn(`下载文件 ${file.fileName} 失败: ${response.status}`);
            return;
          }

          const arrayBuffer = await response.arrayBuffer();
          fileBuffer = Buffer.from(arrayBuffer);
        }

        // 按子方案分组存储
        const folder = zip.folder(file.subSchemeName);
        if (folder) {
          folder.file(file.fileName, fileBuffer);
        }
      } catch (error) {
        console.error(`下载文件 ${file.fileName} 出错:`, error);
      }
    });

    await Promise.all(downloadPromises);

    // 生成 ZIP 文件
    const zipBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: {
        level: 6, // 压缩级别 1-9
      },
    });

    // 记录下载统计（异步，不等待）
    recordDownloadStatistics(solutionId, user.id).catch(console.error);

    // 返回 ZIP 文件
    return new NextResponse(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="solution_${solutionId}_files.zip"`,
        'Content-Length': String(zipBuffer.length),
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
