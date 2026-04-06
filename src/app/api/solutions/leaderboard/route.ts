/**
 * 解决方案排行榜 API
 * 
 * 端点：
 * - GET /api/solutions/leaderboard - 获取排行榜
 */

import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { solutionScoreService } from '@/services/solution-score.service';

/**
 * GET /api/solutions/leaderboard
 * 获取排行榜
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const dimension = (searchParams.get('dimension') || 'total') as 
      'total' | 'quality' | 'business_value' | 'user_recognition' | 'activity';
    const categoryId = searchParams.get('categoryId') 
      ? parseInt(searchParams.get('categoryId')!, 10) 
      : undefined;
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    
    const leaderboard = await solutionScoreService.getLeaderboard(limit);
    
    return successResponse(leaderboard);
    
  } catch (error) {
    console.error('获取排行榜失败:', error);
    return errorResponse('INTERNAL_ERROR', error instanceof Error ? error.message : '获取排行榜失败');
  }
}
