/**
 * 分片上传 - 合并分片API
 * 
 * 功能：
 * - POST: 合并所有分片为完整文件
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
 * POST /api/upload/chunk/complete
 * 合并所有分片
 * 
 * 请求体：
 * - uploadId: 上传任务ID
 */
export const POST = withAuth(async (request: NextRequest, { userId }) => {
  try {
    const body = await request.json();
    const { uploadId } = body;

    if (!uploadId) {
      return errorResponse('BAD_REQUEST', '缺少uploadId参数', { status: 400 });
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
      // 已完成，返回文件信息
      const fileUrl = task.finalKey 
        ? await storage.generatePresignedUrl({ key: task.finalKey, expireTime: 86400 })
        : null;
      
      return successResponse({
        message: '文件已上传完成',
        uploadId,
        fileName: task.fileName,
        fileSize: Number(task.fileSize),
        key: task.finalKey,
        url: fileUrl,
        status: 'completed',
      });
    }

    // 检查所有分片是否已上传
    const uploadedChunks = task.uploadedChunks || [];
    if (uploadedChunks.length !== task.totalChunks) {
      return errorResponse('BAD_REQUEST', 
        `分片未上传完成，已完成: ${uploadedChunks.length}/${task.totalChunks}`, 
        { status: 400 }
      );
    }

    // 更新状态为合并中（这里用uploading状态临时表示）
    await db.update(uploadTasks)
      .set({ status: 'uploading', updatedAt: new Date() })
      .where(eq(uploadTasks.uploadId, uploadId));

    try {
      // 读取所有分片并合并
      const chunks: Buffer[] = [];
      for (let i = 0; i < task.totalChunks; i++) {
        const chunkKey = `chunks/${uploadId}/chunk_${i.toString().padStart(6, '0')}`;
        const chunkData = await storage.readFile({ fileKey: chunkKey });
        chunks.push(chunkData);
      }

      // 合并分片
      const finalBuffer = Buffer.concat(chunks);

      // 生成最终文件路径
      const timestamp = Date.now();
      const ext = task.fileName.split('.').pop() || 'bin';
      const safeName = task.fileName.replace(/[^a-zA-Z0-9\u4e00-\u9fa5._-]/g, '_');
      const finalKey = task.targetPath 
        ? `${task.targetPath}/${timestamp}_${safeName}`
        : `uploads/${timestamp}_${safeName}`;

      // 上传合并后的文件
      await storage.uploadFile({
        fileContent: finalBuffer,
        fileName: finalKey,
        contentType: task.contentType || 'application/octet-stream',
      });

      // 生成访问URL
      const fileUrl = await storage.generatePresignedUrl({ 
        key: finalKey, 
        expireTime: 86400 
      });

      // 更新任务状态为已完成
      await db.update(uploadTasks)
        .set({
          status: 'completed',
          finalKey,
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(uploadTasks.uploadId, uploadId));

      // 清理分片文件（异步执行，不阻塞响应）
      cleanupChunks(uploadId, task.totalChunks).catch(err => {
        console.error('清理分片失败:', err);
      });

      return successResponse({
        message: '文件上传完成',
        uploadId,
        fileName: task.fileName,
        fileSize: Number(task.fileSize),
        key: finalKey,
        url: fileUrl,
        contentType: task.contentType,
        status: 'completed',
      });
    } catch (mergeError) {
      console.error('合并分片失败:', mergeError);
      
      // 更新任务状态为失败
      await db.update(uploadTasks)
        .set({ status: 'failed', updatedAt: new Date() })
        .where(eq(uploadTasks.uploadId, uploadId));

      return errorResponse('INTERNAL_ERROR', 
        `合并分片失败: ${mergeError instanceof Error ? mergeError.message : '未知错误'}`, 
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('完成上传失败:', error);
    return errorResponse('INTERNAL_ERROR', '完成上传失败', { status: 500 });
  }
});

/**
 * 清理分片文件
 */
async function cleanupChunks(uploadId: string, totalChunks: number): Promise<void> {
  try {
    for (let i = 0; i < totalChunks; i++) {
      const chunkKey = `chunks/${uploadId}/chunk_${i.toString().padStart(6, '0')}`;
      await storage.deleteFile({ fileKey: chunkKey });
    }
    console.log(`已清理上传任务 ${uploadId} 的所有分片`);
  } catch (error) {
    console.error('清理分片时出错:', error);
  }
}
