import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';
import {
  uploadFile,
  getFileUrl,
  deleteFile,
  fileExists,
  validateFileType,
  validateFileSize,
  MAX_FILE_SIZES,
} from '@/lib/storage';
import { successResponse, errorResponse } from '@/lib/api-response';

// =====================================================
// 文件上传API
// =====================================================

/**
 * POST /api/upload
 * 上传单个文件
 */
export const POST = withAuth(async (request: NextRequest, { userId }) => {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const prefix = formData.get('prefix') as string || 'uploads';
    const allowedTypes = formData.get('allowedTypes') as string;

    if (!file) {
      return errorResponse('BAD_REQUEST', '请选择要上传的文件', { status: 400 });
    }

    // 获取文件信息
    const fileName = file.name;
    const contentType = file.type || 'application/octet-stream';
    const fileSize = file.size;

    // 验证文件类型
    const allowedCategories = allowedTypes ? allowedTypes.split(',') : undefined;
    if (!validateFileType(contentType, allowedCategories)) {
      return errorResponse('BAD_REQUEST', `不支持的文件类型: ${contentType}`, { status: 400 });
    }

    // 验证文件大小
    if (!validateFileSize(fileSize, contentType)) {
      const maxSizeMB = Math.floor(MAX_FILE_SIZES[allowedCategories?.[0] || 'default'] / (1024 * 1024));
      return errorResponse('BAD_REQUEST', `文件大小超出限制（最大 ${maxSizeMB}MB）`, { status: 400 });
    }

    // 读取文件内容
    const arrayBuffer = await file.arrayBuffer();
    const fileContent = Buffer.from(arrayBuffer);

    // 上传文件
    const result = await uploadFile({
      fileContent,
      fileName,
      contentType,
      prefix,
    });

    return successResponse({
      key: result.key,
      url: result.url,
      fileName: result.fileName,
      fileSize: result.fileSize,
      contentType: result.contentType,
      uploadedBy: userId,
      uploadedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('File upload error:', error);
    return errorResponse('INTERNAL_ERROR', '文件上传失败', { status: 500 });
  }
});

// =====================================================
// 文件访问API
// =====================================================

/**
 * GET /api/upload?key=xxx
 * 获取文件访问URL
 */
export const GET = withAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    const expireTime = parseInt(searchParams.get('expireTime') || '86400', 10);

    if (!key) {
      return errorResponse('BAD_REQUEST', '缺少文件key参数', { status: 400 });
    }

    // 检查文件是否存在
    const exists = await fileExists(key);
    if (!exists) {
      return errorResponse('NOT_FOUND', '文件不存在', { status: 404 });
    }

    // 获取访问URL
    const url = await getFileUrl(key, expireTime);

    return successResponse({
      key,
      url,
      expireTime,
      expiresAt: new Date(Date.now() + expireTime * 1000).toISOString(),
    });
  } catch (error) {
    console.error('Get file URL error:', error);
    return errorResponse('INTERNAL_ERROR', '获取文件URL失败', { status: 500 });
  }
});

// =====================================================
// 文件删除API
// =====================================================

/**
 * DELETE /api/upload?key=xxx
 * 删除文件
 */
export const DELETE = withAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (!key) {
      return errorResponse('BAD_REQUEST', '缺少文件key参数', { status: 400 });
    }

    // 检查文件是否存在
    const exists = await fileExists(key);
    if (!exists) {
      return errorResponse('NOT_FOUND', '文件不存在', { status: 404 });
    }

    // 删除文件
    const deleted = await deleteFile(key);

    if (deleted) {
      return successResponse({
        message: '文件删除成功',
        key,
      });
    } else {
      return errorResponse('INTERNAL_ERROR', '文件删除失败', { status: 500 });
    }
  } catch (error) {
    console.error('Delete file error:', error);
    return errorResponse('INTERNAL_ERROR', '文件删除失败', { status: 500 });
  }
});
