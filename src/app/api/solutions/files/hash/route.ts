/**
 * 文件哈希批量操作 API
 * 
 * 端点：
 * - POST /api/solutions/files/hash/compute-all - 批量计算未计算哈希的文件
 * - GET /api/solutions/files/hash/duplicates - 查找重复文件
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';
import { successResponse, errorResponse } from '@/lib/api-response';
import { fileHashService } from '@/services/file-hash.service';

/**
 * POST /api/solutions/files/hash/compute-all
 * 批量计算未计算哈希的文件
 */
export const POST = withAuth(async (
  request: NextRequest,
  { userId }: { userId: number }
) => {
  try {
    // 批量计算哈希
    const result = await fileHashService.computeMissingHashes();
    
    return successResponse(result);
    
  } catch (error) {
    console.error('批量计算哈希失败:', error);
    return errorResponse('INTERNAL_ERROR', error instanceof Error ? error.message : '批量计算哈希失败');
  }
});

/**
 * GET /api/solutions/files/hash/duplicates
 * 查找重复文件
 */
export const GET = withAuth(async (
  request: NextRequest,
  { userId }: { userId: number }
) => {
  try {
    // 查找重复文件
    const duplicates = await fileHashService.findDuplicateFiles();
    
    return successResponse({
      duplicates,
      summary: {
        totalGroups: duplicates.length,
        totalFiles: duplicates.reduce((sum, g) => sum + g.files.length, 0),
        wastedSpace: duplicates.reduce((sum, g) => {
          // 每组重复文件中，只保留一个，其余都是浪费空间
          const fileSize = g.files[0]?.fileSize || 0;
          return sum + fileSize * (g.files.length - 1);
        }, 0),
      },
    });
    
  } catch (error) {
    console.error('查找重复文件失败:', error);
    return errorResponse('INTERNAL_ERROR', error instanceof Error ? error.message : '查找重复文件失败');
  }
});
