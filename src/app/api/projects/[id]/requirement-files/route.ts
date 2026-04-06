import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { projectRequirementFiles, users } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { withAuth } from '@/lib/auth-middleware';

// 获取需求方案文件列表
export const GET = withAuth(async (
  request: NextRequest,
  context: { userId: number; params?: Record<string, string> }
) => {
  try {
    const projectId = parseInt(context.params?.id || '0');

    if (isNaN(projectId)) {
      return NextResponse.json({ success: false, error: '无效的项目ID' }, { status: 400 });
    }

    const files = await db
      .select()
      .from(projectRequirementFiles)
      .where(eq(projectRequirementFiles.projectId, projectId))
      .orderBy(desc(projectRequirementFiles.createdAt));

    return NextResponse.json({
      success: true,
      data: files,
    });
  } catch (error) {
    console.error('Failed to fetch requirement files:', error);
    return NextResponse.json({ success: false, error: '获取需求文件失败' }, { status: 500 });
  }
});

// 上传需求方案文件
export const POST = withAuth(async (
  request: NextRequest,
  context: { userId: number; params?: Record<string, string> }
) => {
  try {
    const projectId = parseInt(context.params?.id || '0');

    if (isNaN(projectId)) {
      return NextResponse.json({ success: false, error: '无效的项目ID' }, { status: 400 });
    }

    const body = await request.json();
    const { fileName, fileUrl, fileSize, fileType } = body;

    if (!fileName || !fileUrl) {
      return NextResponse.json({ success: false, error: '请上传文件' }, { status: 400 });
    }

    // 获取当前用户信息
    const [user] = await db
      .select({ realName: users.realName })
      .from(users)
      .where(eq(users.id, context.userId))
      .limit(1);

    const [newFile] = await db
      .insert(projectRequirementFiles)
      .values({
        projectId,
        fileName,
        fileUrl,
        fileSize: fileSize || null,
        fileType: fileType || null,
        uploadedBy: context.userId,
        uploadedByName: user?.realName || null,
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: newFile,
      message: '文件已上传',
    });
  } catch (error) {
    console.error('Failed to upload requirement file:', error);
    return NextResponse.json({ success: false, error: '上传文件失败' }, { status: 500 });
  }
});

// 更新需求方案文件（主要是AI分析结果）
export const PUT = withAuth(async (
  request: NextRequest,
  context: { userId: number; params?: Record<string, string> }
) => {
  try {
    const projectId = parseInt(context.params?.id || '0');

    if (isNaN(projectId)) {
      return NextResponse.json({ success: false, error: '无效的项目ID' }, { status: 400 });
    }

    const body = await request.json();
    const { fileId, aiAnalysisResult } = body;

    if (!fileId) {
      return NextResponse.json({ success: false, error: '缺少文件ID' }, { status: 400 });
    }

    const [updatedFile] = await db
      .update(projectRequirementFiles)
      .set({
        aiAnalysisResult,
        aiAnalysisAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(projectRequirementFiles.id, fileId))
      .returning();

    return NextResponse.json({
      success: true,
      data: updatedFile,
      message: '文件已更新',
    });
  } catch (error) {
    console.error('Failed to update requirement file:', error);
    return NextResponse.json({ success: false, error: '更新文件失败' }, { status: 500 });
  }
});

// 删除需求方案文件
export const DELETE = withAuth(async (
  request: NextRequest,
  context: { userId: number; params?: Record<string, string> }
) => {
  try {
    const projectId = parseInt(context.params?.id || '0');

    if (isNaN(projectId)) {
      return NextResponse.json({ success: false, error: '无效的项目ID' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('fileId');

    if (!fileId) {
      return NextResponse.json({ success: false, error: '缺少文件ID' }, { status: 400 });
    }

    await db.delete(projectRequirementFiles).where(eq(projectRequirementFiles.id, parseInt(fileId)));

    return NextResponse.json({
      success: true,
      message: '文件已删除',
    });
  } catch (error) {
    console.error('Failed to delete requirement file:', error);
    return NextResponse.json({ success: false, error: '删除文件失败' }, { status: 500 });
  }
});
