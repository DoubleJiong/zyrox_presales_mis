/**
 * 分片上传 - 上传单个分片API
 * 
 * 功能：
 * - POST: 上传单个分片
 */

import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';
import { db } from '@/db';
import { uploadTasks } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { S3Storage } from 'coze-coding-dev-sdk';
import { successResponse, errorResponse } from '@/lib/api-response';

// 初始化对象存储
const storage = new S3Storage({
  endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
  accessKey: '',
  secretKey: '',
  bucketName: process.env.COZE_BUCKET_NAME,
  region: 'cn-beijing',
});

/**
 * POST /api/upload/chunk/upload
 * 上传单个分片
 * 
 * FormData:
 * - uploadId: 上传任务ID
 * - chunkIndex: 分片索引（从0开始）
 * - chunk: 分片文件数据
 */
export const POST = withAuth(async (request: NextRequest, { userId }) => {
  try {
    const formData = await request.formData();
    const uploadId = formData.get('uploadId') as string;
    const chunkIndex = parseInt(formData.get('chunkIndex') as string, 10);
    const chunk = formData.get('chunk') as File;

    // 参数校验
    if (!uploadId || isNaN(chunkIndex) || !chunk) {
      return errorResponse('BAD_REQUEST', '缺少必要参数', { status: 400 });
    }

    // 查询上传任务
    const task = await db.query.uploadTasks.findFirst({
      where: and(
        eq(uploadTasks.uploadId, uploadId),
        eq(uploadTasks.createdBy, userId)
      ),
    });

    if (!task) {
      return errorResponse('NOT_FOUND', '上传任务不存在', { status: 404 });
    }

    if (task.status === 'completed') {
      return errorResponse('BAD_REQUEST', '上传任务已完成', { status: 400 });
    }

    if (task.status === 'expired') {
      return errorResponse('BAD_REQUEST', '上传任务已过期', { status: 400 });
    }

    // 检查分片索引是否有效
    if (chunkIndex < 0 || chunkIndex >= task.totalChunks) {
      return errorResponse('BAD_REQUEST', `分片索引无效，有效范围: 0-${task.totalChunks - 1}`, { status: 400 });
    }

    // 检查分片是否已上传
    const uploadedChunks = task.uploadedChunks || [];
    if (uploadedChunks.includes(chunkIndex)) {
      return successResponse({
        message: '分片已上传，跳过',
        uploadId,
        chunkIndex,
        uploadedChunks,
        progress: Math.round((uploadedChunks.length / task.totalChunks) * 100),
      });
    }

    // 更新任务状态为上传中
    if (task.status === 'pending') {
      await db.update(uploadTasks)
        .set({ status: 'uploading', updatedAt: new Date() })
        .where(eq(uploadTasks.uploadId, uploadId));
    }

    // 读取分片数据
    const chunkBuffer = Buffer.from(await chunk.arrayBuffer());

    // 上传分片到对象存储
    const chunkKey = `chunks/${uploadId}/chunk_${chunkIndex.toString().padStart(6, '0')}`;
    await storage.uploadFile({
      fileContent: chunkBuffer,
      fileName: chunkKey,
      contentType: 'application/octet-stream',
    });

    // 更新已上传分片列表
    const newUploadedChunks = [...uploadedChunks, chunkIndex].sort((a, b) => a - b);
    await db.update(uploadTasks)
      .set({
        uploadedChunks: newUploadedChunks,
        updatedAt: new Date(),
      })
      .where(eq(uploadTasks.uploadId, uploadId));

    const progress = Math.round((newUploadedChunks.length / task.totalChunks) * 100);

    return successResponse({
      message: '分片上传成功',
      uploadId,
      chunkIndex,
      uploadedChunks: newUploadedChunks,
      progress,
      isComplete: newUploadedChunks.length === task.totalChunks,
    });
  } catch (error) {
    console.error('分片上传失败:', error);
    return errorResponse('INTERNAL_ERROR', '分片上传失败', { status: 500 });
  }
});
