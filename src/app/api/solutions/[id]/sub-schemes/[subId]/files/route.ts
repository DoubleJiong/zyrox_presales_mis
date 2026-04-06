import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { solutionFiles, solutionSubSchemes, solutions, users } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { authenticate } from '@/lib/auth';
import { checkSolutionPermission, getUserSolutionPermission } from '@/lib/solution-permissions';
import { uploadFile } from '@/lib/storage';

// GET /api/solutions/[id]/sub-schemes/[subId]/files - 获取文件列表
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; subId: string }> }
) {
  try {
    const user = await authenticate(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: idParam, subId } = await params;
    const solutionId = parseInt(idParam);
    const subSchemeId = parseInt(subId);

    // 检查用户权限
    const userPermission = await getUserSolutionPermission(user.id, solutionId);

    // 获取文件列表
    const files = await db
      .select({
        id: solutionFiles.id,
        subSchemeId: solutionFiles.subSchemeId,
        fileName: solutionFiles.fileName,
        fileType: solutionFiles.fileType,
        fileSize: solutionFiles.fileSize,
        fileUrl: solutionFiles.fileUrl,
        version: solutionFiles.version,
        isCurrent: solutionFiles.isCurrent,
        description: solutionFiles.description,
        createdAt: solutionFiles.createdAt,
        uploadedByName: users.realName,
      })
      .from(solutionFiles)
      .leftJoin(users, eq(solutionFiles.uploadedBy, users.id))
      .where(eq(solutionFiles.subSchemeId, subSchemeId))
      .orderBy(desc(solutionFiles.isCurrent), desc(solutionFiles.createdAt));

    return NextResponse.json({ data: files });
  } catch (error) {
    console.error('Error fetching files:', error);
    return NextResponse.json(
      { error: 'Failed to fetch files' },
      { status: 500 }
    );
  }
}

// POST /api/solutions/[id]/sub-schemes/[subId]/files - 上传文件
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; subId: string }> }
) {
  try {
    const user = await authenticate(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: idParam, subId } = await params;
    const solutionId = parseInt(idParam);
    const subSchemeId = parseInt(subId);

    // 检查上传权限
    const hasPermission = await checkSolutionPermission(user.id, solutionId, 'canUpload');
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'You do not have permission to upload files to this solution' },
        { status: 403 }
      );
    }

    // 获取表单数据
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const description = formData.get('description') as string || null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }

    // 获取当前子方案信息
    const [subScheme] = await db
      .select()
      .from(solutionSubSchemes)
      .where(eq(solutionSubSchemes.id, subSchemeId))
      .limit(1);

    if (!subScheme) {
      return NextResponse.json(
        { error: 'Sub-scheme not found' },
        { status: 404 }
      );
    }

    // 确定文件类型
    const extension = file.name.split('.').pop()?.toLowerCase() || 'unknown';
    const fileType = getFileType(extension);

    // 计算新版本号
    const existingFiles = await db
      .select()
      .from(solutionFiles)
      .where(eq(solutionFiles.subSchemeId, subSchemeId));

    const currentVersion = subScheme.version || '1.0';
    const newVersion = incrementVersion(currentVersion);

    // 将旧文件标记为非当前版本
    if (existingFiles.length > 0) {
      await db
        .update(solutionFiles)
        .set({ isCurrent: false })
        .where(eq(solutionFiles.subSchemeId, subSchemeId));
    }

    // 读取文件内容并上传到对象存储
    const arrayBuffer = await file.arrayBuffer();
    const fileContent = Buffer.from(arrayBuffer);
    
    // 上传到对象存储
    const uploadResult = await uploadFile({
      fileContent,
      fileName: file.name,
      contentType: file.type || 'application/octet-stream',
      prefix: `solutions/${solutionId}/sub-schemes/${subSchemeId}`,
    });
    
    const fileUrl = uploadResult.url;

    // 保存文件记录
    const [newFile] = await db
      .insert(solutionFiles)
      .values({
        subSchemeId,
        fileName: file.name,
        fileType,
        fileSize: file.size,
        fileUrl: fileUrl,
        version: newVersion,
        isCurrent: true,
        uploadedBy: user.id,
        description,
      })
      .returning();

    // 更新子方案版本
    await db
      .update(solutionSubSchemes)
      .set({
        version: newVersion,
        updatedAt: new Date(),
      })
      .where(eq(solutionSubSchemes.id, subSchemeId));

    return NextResponse.json({
      message: 'File uploaded successfully',
      data: newFile,
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    // 返回详细错误信息
    let errorMessage = 'Failed to upload file';
    if (error instanceof Error) {
      errorMessage = error.message;
      if (error.message.includes('storage') || error.message.includes('S3')) {
        errorMessage = '存储服务暂时不可用，请稍后重试';
      } else if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
        errorMessage = '上传超时，请检查网络后重试';
      } else if (error.message.includes('network') || error.message.includes('ECONNREFUSED')) {
        errorMessage = '网络连接失败，请检查网络后重试';
      } else if (error.message.includes('size') || error.message.includes('too large')) {
        errorMessage = '文件大小超出限制';
      }
    }
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// 辅助函数：获取文件类型
function getFileType(extension: string): string {
  const typeMap: Record<string, string> = {
    ppt: 'ppt',
    pptx: 'ppt',
    doc: 'word',
    docx: 'word',
    xls: 'excel',
    xlsx: 'excel',
    pdf: 'pdf',
    jpg: 'image',
    jpeg: 'image',
    png: 'image',
    gif: 'image',
  };
  return typeMap[extension] || 'other';
}

// 辅助函数：版本号递增
function incrementVersion(version: string): string {
  const parts = version.split('.');
  if (parts.length === 2) {
    const minor = parseInt(parts[1]) + 1;
    return `${parts[0]}.${minor}`;
  }
  return version;
}
