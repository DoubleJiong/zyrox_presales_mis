import { NextRequest, NextResponse } from 'next/server';
import { processPerformanceReport } from '@/lib/performance-alert';
import { successResponse, errorResponse } from '@/lib/api-response';

/**
 * 性能数据上报 API
 * 接收前端上报的性能指标数据并处理告警
 */

// 内存存储（生产环境应使用数据库）
const performanceStore: Map<string, {
  metrics: any[];
  lastUpdated: number;
  alertCount: number;
}> = new Map();

/**
 * POST /api/performance/report
 * 上报性能数据
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, userAgent, timestamp, metrics } = body;

    if (!metrics || !Array.isArray(metrics)) {
      return errorResponse('BAD_REQUEST', '无效的性能数据格式');
    }

    // 处理性能报告并检查告警
    const result = await processPerformanceReport({
      url: url || request.url,
      userAgent: userAgent || request.headers.get('user-agent') || 'unknown',
      timestamp: timestamp || Date.now(),
      metrics,
    });

    // 存储性能数据
    const key = new URL(url || 'http://localhost').pathname;
    
    const existing = performanceStore.get(key) || {
      metrics: [],
      lastUpdated: 0,
      alertCount: 0,
    };

    existing.metrics.push(...metrics);
    existing.lastUpdated = timestamp || Date.now();
    existing.alertCount += result.alerts.length;

    // 限制存储大小
    if (existing.metrics.length > 10000) {
      existing.metrics = existing.metrics.slice(-5000);
    }

    performanceStore.set(key, existing);

    return successResponse({
      message: '性能数据已接收',
      processed: result.processed,
      alertCount: result.alerts.length,
      alerts: result.alerts.length > 0 ? result.alerts.map(a => ({
        metricName: a.metricName,
        severity: a.severity,
        message: a.message,
      })) : undefined,
    });
  } catch (error) {
    console.error('Performance report error:', error);
    return errorResponse('INTERNAL_ERROR', '处理性能数据失败');
  }
}

/**
 * GET /api/performance/report
 * 获取性能数据摘要
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = searchParams.get('page');
    
    if (page) {
      // 返回特定页面的性能数据
      const data = performanceStore.get(page);
      return successResponse(data || { metrics: [], lastUpdated: 0, alertCount: 0 });
    }

    // 返回所有页面的性能摘要
    const summary: Record<string, {
      metricCount: number;
      lastUpdated: number;
      alertCount: number;
      avgPageLoad: number;
      avgApiTime: number;
      slowRequestCount: number;
    }> = {};

    performanceStore.forEach((value, key) => {
      const pageLoadMetrics = value.metrics.filter(m => m.name === 'page_load_time');
      const apiMetrics = value.metrics.filter(m => m.name === 'api_request');
      const slowRequests = value.metrics.filter(m => m.name === 'slow_resource' || (m.name === 'api_request' && m.value > 1000));

      summary[key] = {
        metricCount: value.metrics.length,
        lastUpdated: value.lastUpdated,
        alertCount: value.alertCount,
        avgPageLoad: pageLoadMetrics.length > 0
          ? Math.round(pageLoadMetrics.reduce((sum, m) => sum + m.value, 0) / pageLoadMetrics.length)
          : 0,
        avgApiTime: apiMetrics.length > 0
          ? Math.round(apiMetrics.reduce((sum, m) => sum + m.value, 0) / apiMetrics.length)
          : 0,
        slowRequestCount: slowRequests.length,
      };
    });

    // 计算总体统计
    const totalMetrics = Array.from(performanceStore.values())
      .reduce((sum, v) => sum + v.metrics.length, 0);
    const totalAlerts = Array.from(performanceStore.values())
      .reduce((sum, v) => sum + v.alertCount, 0);

    return successResponse({
      pages: summary,
      totalMetrics,
      totalAlerts,
      healthStatus: totalAlerts > 10 ? 'critical' : totalAlerts > 5 ? 'warning' : 'healthy',
    });
  } catch (error) {
    console.error('Performance get error:', error);
    return errorResponse('INTERNAL_ERROR', '获取性能数据失败');
  }
}

/**
 * DELETE /api/performance/report
 * 清除性能数据缓存
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = searchParams.get('page');
    
    if (page) {
      performanceStore.delete(page);
    } else {
      performanceStore.clear();
    }

    return successResponse({
      message: page ? `已清除页面 ${page} 的性能数据` : '已清除所有性能数据',
    });
  } catch (error) {
    console.error('Performance delete error:', error);
    return errorResponse('INTERNAL_ERROR', '清除性能数据失败');
  }
}
