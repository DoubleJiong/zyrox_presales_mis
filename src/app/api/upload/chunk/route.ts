/**
 * 大文件分片上传API
 * 
 * 功能：
 * - POST: 初始化分片上传任务
 * - GET: 查询上传进度/断点续传
 * - DELETE: 取消/清理上传任务
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';
import { db } from '@/db';
import { uploadTasks } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { successResponse, errorResponse } from '@/lib/api-response';

// 分片大小配置：5MB（可根据网络情况调整）
const DEFAULT_CHUNK_SIZE = 5 * 1024 * 1024;

// 上传任务过期时间：24小时
const UPLOAD_EXPIRE_HOURS = 24;

/**
 * POST /api/upload/chunk
 * 初始化分片上传任务
 * 
 * 请求体：
 * - fileName: 文件名
 * - fileSize: 文件大小（字节）
 * - contentType: 文件类型
 * - fileHash: 文件hash（用于断点续传）
 * - totalChunks: 总分片数
 * - targetPath: 目标存储路径
 * - solutionId: 解决方案ID（可选）
 * - subSchemeId: 子方案ID（可选）
 * - metadata: 其他元数据（可选）
 */
export const POST = withAuth(async (request: NextRequest, { userId }) => {
  try {
    const body = await request.json();
    const {
      fileName,
      fileSize,
      contentType,
      fileHash,
      totalChunks,
      targetPath,
      solutionId,
      subSchemeId,
      metadata,
      chunkSize = DEFAULT_CHUNK_SIZE,
    } = body;

    // 参数校验
    if (!fileName || !fileSize || !fileHash || !totalChunks) {
      return errorResponse('BAD_REQUEST', '缺少必要参数', { status: 400 });
    }

    // 检查是否有未完成的上传任务（断点续传）
    const existingTask = await db.query.uploadTasks.findFirst({
      where: and(
        eq(uploadTasks.fileHash, fileHash),
        eq(uploadTasks.createdBy, userId),
        // 匹配 pending 或 uploading 状态的任务
        sql`${uploadTasks.status} IN ('pending', 'uploading')`
      ),
    });

    if (existingTask) {
      // 返回已有任务信息，支持断点续传
      return successResponse({
        uploadId: existingTask.uploadId,
        fileName: existingTask.fileName,
        fileSize: Number(existingTask.fileSize),
        totalChunks: existingTask.totalChunks,
        uploadedChunks: existingTask.uploadedChunks || [],
        status: existingTask.status,
        message: '发现未完成的上传任务，可继续上传',
      });
    }

    // 创建新的上传任务
    const uploadId = uuidv4();
    const expiresAt = new Date(Date.now() + UPLOAD_EXPIRE_HOURS * 60 * 60 * 1000);

    await db.insert(uploadTasks).values({
      uploadId,
      fileHash,
      fileName,
      fileSize,
      contentType: contentType || 'application/octet-stream',
      totalChunks,
      chunkSize,
      status: 'pending',
      uploadedChunks: [],
      targetPath,
      solutionId,
      subSchemeId,
      metadata,
      createdBy: userId,
      expiresAt,
    });

    return successResponse({
      uploadId,
      fileName,
      fileSize,
      totalChunks,
      chunkSize,
      uploadedChunks: [],
      status: 'pending',
      message: '上传任务创建成功',
    });
  } catch (error) {
    console.error('初始化分片上传失败:', error);
    return errorResponse('INTERNAL_ERROR', '初始化上传任务失败', { status: 500 });
  }
});

/**
 * GET /api/upload/chunk?uploadId=xxx
 * 查询上传进度
 */
export const GET = withAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const uploadId = searchParams.get('uploadId');

    if (!uploadId) {
      return errorResponse('BAD_REQUEST', '缺少uploadId参数', { status: 400 });
    }

    const task = await db.query.uploadTasks.findFirst({
      where: eq(uploadTasks.uploadId, uploadId),
    });

    if (!task) {
      return errorResponse('NOT_FOUND', '上传任务不存在', { status: 404 });
    }

    return successResponse({
      uploadId: task.uploadId,
      fileName: task.fileName,
      fileSize: Number(task.fileSize),
      totalChunks: task.totalChunks,
      uploadedChunks: task.uploadedChunks || [],
      status: task.status,
      progress: Math.round(((task.uploadedChunks?.length || 0) / task.totalChunks) * 100),
      finalKey: task.finalKey,
    });
  } catch (error) {
    console.error('查询上传进度失败:', error);
    return errorResponse('INTERNAL_ERROR', '查询上传进度失败', { status: 500 });
  }
});

/**
 * DELETE /api/upload/chunk?uploadId=xxx
 * 取消/清理上传任务
 */
export const DELETE = withAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const uploadId = searchParams.get('uploadId');

    if (!uploadId) {
      return errorResponse('BAD_REQUEST', '缺少uploadId参数', { status: 400 });
    }

    // 查询任务
    const task = await db.query.uploadTasks.findFirst({
      where: eq(uploadTasks.uploadId, uploadId),
    });

    if (!task) {
      return errorResponse('NOT_FOUND', '上传任务不存在', { status: 404 });
    }

    // 更新任务状态为已过期
    await db.update(uploadTasks)
      .set({ status: 'expired', updatedAt: new Date() })
      .where(eq(uploadTasks.uploadId, uploadId));

    return successResponse({
      message: '上传任务已取消',
      uploadId,
    });
  } catch (error) {
    console.error('取消上传任务失败:', error);
    return errorResponse('INTERNAL_ERROR', '取消上传任务失败', { status: 500 });
  }
});
