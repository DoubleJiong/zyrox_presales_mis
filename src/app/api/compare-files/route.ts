/**
 * 文件内容对比 API
 * 
 * 端点：
 * - POST /api/compare-files - 对比两个文件的内容
 */

import { NextRequest, NextResponse } from 'next/server';
import { fileCompareService } from '@/services/file-compare.service';

/**
 * POST /api/compare-files
 * 对比两个文件的内容
 * 
 * Request Body:
 * {
 *   oldFileUrl: string,    // 旧文件 URL
 *   newFileUrl: string,    // 新文件 URL
 *   fileName: string       // 文件名（用于判断文件类型）
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { oldFileUrl, newFileUrl, fileName } = body;
    
    if (!oldFileUrl || !newFileUrl || !fileName) {
      return NextResponse.json(
        { error: '缺少必要参数：oldFileUrl, newFileUrl, fileName' },
        { status: 400 }
      );
    }
    
    const result = await fileCompareService.compareFiles(oldFileUrl, newFileUrl, fileName);
    
    return NextResponse.json({
      success: true,
      data: result,
    });
    
  } catch (error) {
    console.error('文件对比失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '文件对比失败' },
      { status: 500 }
    );
  }
}
