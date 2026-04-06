import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { templateFile, solutions, users } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { authenticate } from '@/lib/auth';
import { checkSolutionPermission } from '@/lib/solution-permissions';

// GET /api/solutions/[id]/template-files - 获取模板文件列表
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

    // 检查方案是否存在且是模板
    const [solution] = await db
      .select()
      .from(solutions)
      .where(eq(solutions.id, solutionId))
      .limit(1);

    if (!solution) {
      return NextResponse.json({ error: 'Solution not found' }, { status: 404 });
    }

    if (!solution.isTemplate) {
      return NextResponse.json({ 
        error: 'This solution is not a template. Use sub-schemes for file management.' 
      }, { status: 400 });
    }

    // 获取文件列表
    const files = await db
      .select({
        id: templateFile.id,
        fileName: templateFile.fileName,
        fileType: templateFile.fileType,
        fileSize: templateFile.fileSize,
        fileUrl: templateFile.fileUrl,
        version: templateFile.version,
        isCurrent: templateFile.isCurrent,
        description: templateFile.description,
        downloadCount: templateFile.downloadCount,
        createdAt: templateFile.createdAt,
        uploadedByName: users.realName,
      })
      .from(templateFile)
      .leftJoin(users, eq(templateFile.uploadedBy, users.id))
      .where(eq(templateFile.solutionId, solutionId))
      .orderBy(desc(templateFile.isCurrent), desc(templateFile.createdAt));

    return NextResponse.json({ data: files });
  } catch (error) {
    console.error('Error fetching template files:', error);
    return NextResponse.json(
      { error: 'Failed to fetch template files' },
      { status: 500 }
    );
  }
}

// POST /api/solutions/[id]/template-files - 上传模板文件
export async function POST(
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

    // 检查方案是否存在且是模板
    const [solution] = await db
      .select()
      .from(solutions)
      .where(eq(solutions.id, solutionId))
      .limit(1);

    if (!solution) {
      return NextResponse.json({ error: 'Solution not found' }, { status: 404 });
    }

    if (!solution.isTemplate) {
      return NextResponse.json({ 
        error: 'This solution is not a template. Use sub-schemes for file management.' 
      }, { status: 400 });
    }

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
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // 确定文件类型
    const extension = file.name.split('.').pop()?.toLowerCase() || 'unknown';
    const fileType = getFileType(extension);

    // 读取文件内容转为base64（模拟存储，实际应使用对象存储）
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const fileUrl = `data:${file.type};base64,${base64}`;

    // 获取当前版本号
    const existingFiles = await db
      .select()
      .from(templateFile)
      .where(eq(templateFile.solutionId, solutionId));

    const newVersion = existingFiles.length > 0
      ? `${existingFiles.length + 1}.0`
      : '1.0';

    // 将旧文件标记为非当前版本
    if (existingFiles.length > 0) {
      await db
        .update(templateFile)
        .set({ isCurrent: false })
        .where(eq(templateFile.solutionId, solutionId));
    }

    // 保存文件记录
    const [newFile] = await db
      .insert(templateFile)
      .values({
        solutionId,
        fileName: file.name,
        fileType,
        fileSize: file.size,
        fileUrl,
        version: newVersion,
        isCurrent: true,
        uploadedBy: user.id,
        description,
      })
      .returning();

    return NextResponse.json({
      message: 'File uploaded successfully',
      data: newFile,
    });
  } catch (error) {
    console.error('Error uploading template file:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
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
