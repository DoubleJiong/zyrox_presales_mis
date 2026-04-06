/**
 * 解决方案下载记录 API
 * 
 * 端点：
 * - GET /api/solutions/[id]/downloads - 获取下载记录和统计
 * - POST /api/solutions/[id]/downloads - 记录下载操作
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';
import { successResponse, errorResponse } from '@/lib/api-response';
import { solutionDownloadService } from '@/services/solution-download.service';

/**
 * GET /api/solutions/[id]/downloads
 * 获取解决方案的下载记录和统计
 */
export const GET = withAuth(async (req: NextRequest, { userId, params }) => {
  try {
    const solutionId = params?.id ? parseInt(params.id, 10) : NaN;
    
    if (isNaN(solutionId)) {
      return errorResponse('BAD_REQUEST', '无效的方案ID');
    }
    
    const searchParams = req.nextUrl.searchParams;
    const type = searchParams.get('type') || 'statistics'; // statistics | records
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
    
    if (type === 'statistics') {
      // 返回统计数据
      const statistics = await solutionDownloadService.getDownloadStatistics(solutionId);
      return successResponse(statistics);
    } else {
      // 返回下载记录列表
      const result = await solutionDownloadService.getDownloadRecords({
        solutionId,
        page,
        pageSize,
      });
      return successResponse({
        records: result.records,
        pagination: {
          page: result.page,
          pageSize: result.pageSize,
          total: result.total,
          totalPages: Math.ceil(result.total / result.pageSize),
        },
      });
    }
    
  } catch (error) {
    console.error('获取下载记录失败:', error);
    return errorResponse('INTERNAL_ERROR', error instanceof Error ? error.message : '获取下载记录失败');
  }
});

/**
 * POST /api/solutions/[id]/downloads
 * 记录下载操作
 */
export const POST = withAuth(async (req: NextRequest, { userId, params }) => {
  try {
    const solutionId = params?.id ? parseInt(params.id, 10) : NaN;
    
    if (isNaN(solutionId)) {
      return errorResponse('BAD_REQUEST', '无效的方案ID');
    }
    
    const body = await req.json();
    const { fileId, fileName, subSchemeId, batchFiles, extraData } = body;
    
    // 获取客户端信息
    const ipAddress = req.headers.get('x-forwarded-for') || 
                     req.headers.get('x-real-ip') || 
                     null;
    const userAgent = req.headers.get('user-agent') || null;
    
    let recordId: number | undefined;
    
    if (batchFiles && Array.isArray(batchFiles)) {
      // 批量下载
      await solutionDownloadService.recordBatchDownload({
        solutionId,
        files: batchFiles,
        userId,
        ipAddress: ipAddress || undefined,
        userAgent: userAgent || undefined,
      });
    } else {
      // 单文件下载
      recordId = await solutionDownloadService.recordDownload({
        solutionId,
        subSchemeId,
        fileId,
        fileName,
        userId,
        ipAddress: ipAddress || undefined,
        userAgent: userAgent || undefined,
        extraData,
      });
    }
    
    return successResponse({ recordId, message: '下载记录已保存' });
    
  } catch (error) {
    console.error('记录下载失败:', error);
    return errorResponse('INTERNAL_ERROR', error instanceof Error ? error.message : '记录下载失败');
  }
});
