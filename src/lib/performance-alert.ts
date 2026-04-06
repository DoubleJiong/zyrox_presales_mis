/**
 * 性能告警服务
 * 当性能指标超过阈值时触发告警
 */

import { db } from '@/db';
import { alertRules, alertHistories } from '@/db/schema';
import { eq, and, isNull, gt, sql } from 'drizzle-orm';

// =====================================================
// 类型定义
// =====================================================

export interface PerformanceThreshold {
  metricName: string;
  warningThreshold: number; // 警告阈值
  criticalThreshold: number; // 严重阈值
  unit: 'ms' | 's' | 'count' | 'bytes' | 'percent';
  description: string;
}

export interface PerformanceAlert {
  metricName: string;
  currentValue: number;
  threshold: number;
  severity: 'warning' | 'critical';
  message: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

// =====================================================
// 性能阈值配置
// =====================================================

const DEFAULT_THRESHOLDS: PerformanceThreshold[] = [
  {
    metricName: 'page_load_time',
    warningThreshold: 3000,
    criticalThreshold: 5000,
    unit: 'ms',
    description: '页面加载时间',
  },
  {
    metricName: 'first_contentful_paint',
    warningThreshold: 2000,
    criticalThreshold: 4000,
    unit: 'ms',
    description: '首次内容绘制时间',
  },
  {
    metricName: 'api_request',
    warningThreshold: 1000,
    criticalThreshold: 3000,
    unit: 'ms',
    description: 'API请求响应时间',
  },
  {
    metricName: 'long_task',
    warningThreshold: 50,
    criticalThreshold: 100,
    unit: 'ms',
    description: '长任务执行时间',
  },
  {
    metricName: 'cumulative_layout_shift',
    warningThreshold: 0.1,
    criticalThreshold: 0.25,
    unit: 'count',
    description: '累积布局偏移',
  },
  {
    metricName: 'slow_resource',
    warningThreshold: 500,
    criticalThreshold: 1000,
    unit: 'ms',
    description: '慢资源加载时间',
  },
];

// =====================================================
// 性能告警服务
// =====================================================

export class PerformanceAlertService {
  private thresholds: Map<string, PerformanceThreshold>;
  private recentAlerts: Map<string, number>; // 防抖：记录最近告警时间
  private alertCooldown: number = 300000; // 5分钟冷却时间

  constructor(customThresholds?: PerformanceThreshold[]) {
    this.thresholds = new Map();
    this.recentAlerts = new Map();

    // 加载默认阈值
    DEFAULT_THRESHOLDS.forEach(t => {
      this.thresholds.set(t.metricName, t);
    });

    // 覆盖自定义阈值
    customThresholds?.forEach(t => {
      this.thresholds.set(t.metricName, t);
    });
  }

  /**
   * 检查性能指标是否触发告警
   */
  checkMetric(
    metricName: string,
    value: number,
    metadata?: Record<string, unknown>
  ): PerformanceAlert | null {
    const threshold = this.thresholds.get(metricName);
    if (!threshold) return null;

    // 检查冷却期
    const lastAlertTime = this.recentAlerts.get(metricName) || 0;
    if (Date.now() - lastAlertTime < this.alertCooldown) {
      return null;
    }

    let severity: 'warning' | 'critical' | null = null;

    if (value >= threshold.criticalThreshold) {
      severity = 'critical';
    } else if (value >= threshold.warningThreshold) {
      severity = 'warning';
    }

    if (!severity) return null;

    // 记录告警时间
    this.recentAlerts.set(metricName, Date.now());

    const alert: PerformanceAlert = {
      metricName,
      currentValue: value,
      threshold: severity === 'critical' 
        ? threshold.criticalThreshold 
        : threshold.warningThreshold,
      severity,
      message: `${threshold.description} 超过${severity === 'critical' ? '严重' : '警告'}阈值: ${value}${threshold.unit} (阈值: ${severity === 'critical' ? threshold.criticalThreshold : threshold.warningThreshold}${threshold.unit})`,
      timestamp: new Date(),
      metadata,
    };

    return alert;
  }

  /**
   * 批量检查性能指标
   */
  checkMetrics(metrics: Array<{
    name: string;
    value: number;
    metadata?: Record<string, unknown>;
  }>): PerformanceAlert[] {
    const alerts: PerformanceAlert[] = [];

    for (const metric of metrics) {
      const alert = this.checkMetric(metric.name, metric.value, metric.metadata);
      if (alert) {
        alerts.push(alert);
      }
    }

    return alerts;
  }

  /**
   * 处理性能告警
   */
  async handleAlert(alert: PerformanceAlert): Promise<void> {
    console.warn(`[Performance Alert] ${alert.message}`);

    // 检查是否存在对应的预警规则
    const ruleCode = `PERFORMANCE_${alert.metricName.toUpperCase()}`;
    
    try {
      const [rule] = await db
        .select()
        .from(alertRules)
        .where(
          and(
            eq(alertRules.ruleCode, ruleCode),
            eq(alertRules.status, 'active'),
            isNull(alertRules.deletedAt)
          )
        )
        .limit(1);

      if (rule) {
        // 创建预警历史记录
        await db.insert(alertHistories).values({
          ruleId: rule.id,
          ruleName: rule.ruleName,
          targetType: 'system',
          targetId: 0,
          targetName: '性能监控',
          severity: alert.severity === 'critical' ? 'critical' : 'high',
          status: 'pending',
          alertData: {
            metricName: alert.metricName,
            currentValue: alert.currentValue,
            threshold: alert.threshold,
            message: alert.message,
            metadata: alert.metadata,
          },
        });
      }
    } catch (error) {
      console.error('Failed to create performance alert:', error);
    }
  }

  /**
   * 获取性能阈值配置
   */
  getThresholds(): PerformanceThreshold[] {
    return Array.from(this.thresholds.values());
  }

  /**
   * 更新性能阈值
   */
  updateThreshold(metricName: string, threshold: Partial<PerformanceThreshold>): void {
    const existing = this.thresholds.get(metricName);
    if (existing) {
      this.thresholds.set(metricName, { ...existing, ...threshold });
    }
  }

  /**
   * 获取性能统计摘要
   */
  getSummary(metrics: Array<{ name: string; value: number }>): {
    totalMetrics: number;
    alertCount: number;
    criticalCount: number;
    warningCount: number;
    topIssues: string[];
  } {
    const alerts = this.checkMetrics(metrics);
    const criticalCount = alerts.filter(a => a.severity === 'critical').length;
    const warningCount = alerts.filter(a => a.severity === 'warning').length;

    return {
      totalMetrics: metrics.length,
      alertCount: alerts.length,
      criticalCount,
      warningCount,
      topIssues: alerts.slice(0, 5).map(a => a.message),
    };
  }
}

// =====================================================
// 单例导出
// =====================================================

let instance: PerformanceAlertService | null = null;

export function getPerformanceAlertService(): PerformanceAlertService {
  if (!instance) {
    instance = new PerformanceAlertService();
  }
  return instance;
}

// =====================================================
// 性能报告处理API
// =====================================================

export async function processPerformanceReport(report: {
  url: string;
  userAgent: string;
  timestamp: number;
  metrics: Array<{
    name: string;
    value: number;
    unit: string;
    category: string;
    metadata?: Record<string, unknown>;
  }>;
}): Promise<{
  processed: number;
  alerts: PerformanceAlert[];
}> {
  const service = getPerformanceAlertService();
  const alerts: PerformanceAlert[] = [];

  for (const metric of report.metrics) {
    const alert = service.checkMetric(metric.name, metric.value, metric.metadata);
    if (alert) {
      alerts.push(alert);
      await service.handleAlert(alert);
    }
  }

  return {
    processed: report.metrics.length,
    alerts,
  };
}
