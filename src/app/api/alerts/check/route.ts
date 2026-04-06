import { NextRequest, NextResponse } from 'next/server';
import { alertExecutor } from '@/lib/alert-executor';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withAuth } from '@/lib/auth-middleware';

/**
 * 预警检查 API
 * 执行所有活跃的预警规则，检查业务数据并生成预警记录
 * 
 * POST /api/alerts/check
 * 执行预警检查
 */
export const POST = withAuth(async (
  request: NextRequest,
  _context: { userId: number }
) => {
  try {
    console.log('🔍 开始预警检查...');

    // 执行所有活跃的预警规则
    const result = await alertExecutor.executeAllRules();

    console.log(
      `✅ 预警检查完成，共检查 ${result.rulesChecked} 条规则，生成 ${result.alertsCreated} 条预警`
    );

    return successResponse({
      message: '预警检查完成',
      rulesChecked: result.rulesChecked,
      alertsCreated: result.alertsCreated,
      results: result.results,
    });
  } catch (error) {
    console.error('❌ 预警检查失败:', error);
    return errorResponse('INTERNAL_ERROR', '预警检查失败', {
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/alerts/check
 * 获取预警检查状态
 */
export const GET = withAuth(async (
  request: NextRequest,
  _context: { userId: number }
) => {
  try {
    // 返回预警检查的统计信息
    return successResponse({
      message: '预警检查服务运行正常',
      lastCheckTime: new Date().toISOString(),
      supportedRuleTypes: ['project', 'customer', 'user', 'opportunity'],
      supportedCategories: {
        project: ['not_updated', 'overdue', 'inactive'],
        customer: ['inactive', 'not_updated'],
        user: ['inactive'],
        opportunity: ['overdue'],
      },
    });
  } catch (error) {
    console.error('获取预警检查状态失败:', error);
    return errorResponse('INTERNAL_ERROR', '获取预警检查状态失败');
  }
});
