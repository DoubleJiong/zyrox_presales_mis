/**
 * 文件哈希计算 API
 * 
 * 端点：
 * - POST /api/solutions/files/[id]/hash - 计算并更新文件哈希
 * - GET /api/solutions/files/[id]/hash - 验证文件完整性
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';
import { successResponse, errorResponse } from '@/lib/api-response';
import { fileHashService } from '@/services/file-hash.service';
import { db } from '@/db';
import { solutionFiles } from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * POST /api/solutions/files/[id]/hash
 * 计算并更新文件哈希
 */
export const POST = withAuth(async (req: NextRequest, { userId, params }) => {
  try {
    const fileId = params?.id ? parseInt(params.id, 10) : NaN;
    
    if (isNaN(fileId)) {
      return errorResponse('BAD_REQUEST', '无效的文件ID');
    }
    
    // 获取文件信息
    const [file] = await db
      .select()
      .from(solutionFiles)
      .where(eq(solutionFiles.id, fileId));
    
    if (!file) {
      return errorResponse('NOT_FOUND', '文件不存在');
    }
    
    if (!file.fileUrl) {
      return errorResponse('BAD_REQUEST', '文件URL为空');
    }
    
    // 计算哈希
    const hashResult = await fileHashService.calculateHashFromUrl(file.fileUrl, 'md5');
    
    // 更新数据库
    await fileHashService.updateFileHash(fileId, hashResult.hash);
    
    // 检查是否有重复文件
    const duplicateCheck = await fileHashService.checkHashExists(hashResult.hash, fileId);
    
    return successResponse({
      fileId,
      fileName: file.fileName,
      hash: hashResult.hash,
      algorithm: hashResult.algorithm,
      fileSize: hashResult.fileSize,
      hasDuplicates: duplicateCheck.exists,
      duplicateFiles: duplicateCheck.files,
    });
    
  } catch (error) {
    console.error('计算文件哈希失败:', error);
    return errorResponse('INTERNAL_ERROR', error instanceof Error ? error.message : '计算文件哈希失败');
  }
});

/**
 * GET /api/solutions/files/[id]/hash
 * 验证文件完整性
 */
export const GET = withAuth(async (req: NextRequest, { userId, params }) => {
  try {
    const fileId = params?.id ? parseInt(params.id, 10) : NaN;
    
    if (isNaN(fileId)) {
      return errorResponse('BAD_REQUEST', '无效的文件ID');
    }
    
    // 验证文件完整性
    const result = await fileHashService.verifyFileIntegrity(fileId);
    
    return successResponse(result);
    
  } catch (error) {
    console.error('验证文件完整性失败:', error);
    return errorResponse('INTERNAL_ERROR', error instanceof Error ? error.message : '验证文件完整性失败');
  }
});
