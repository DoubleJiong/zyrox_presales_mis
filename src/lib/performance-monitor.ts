/**
 * 性能监控工具类
 * 用于监控前端应用性能指标
 */

// 性能指标类型
export interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 's' | 'count' | 'bytes';
  timestamp: number;
  category: 'navigation' | 'resource' | 'render' | 'api' | 'custom';
  metadata?: Record<string, unknown>;
}

// 性能统计数据
export interface PerformanceStats {
  avgValue: number;
  minValue: number;
  maxValue: number;
  count: number;
  p50: number;
  p95: number;
  p99: number;
}

// 性能监控配置
export interface PerformanceConfig {
  enabled: boolean;
  sampleRate: number; // 采样率 0-1
  reportInterval: number; // 上报间隔 ms
  maxMetrics: number; // 最大存储指标数
  logToConsole: boolean;
}

const DEFAULT_CONFIG: PerformanceConfig = {
  enabled: true,
  sampleRate: 1,
  reportInterval: 30000, // 30秒
  maxMetrics: 1000,
  logToConsole: process.env.NODE_ENV === 'development',
};

class PerformanceMonitor {
  private config: PerformanceConfig;
  private metrics: PerformanceMetric[] = [];
  private reportTimer: NodeJS.Timeout | null = null;
  private observers: PerformanceObserver[] = [];

  constructor(config: Partial<PerformanceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    if (typeof window !== 'undefined' && this.config.enabled) {
      this.init();
    }
  }

  private init() {
    // 监听页面加载性能
    this.observeNavigation();
    
    // 监听资源加载性能
    this.observeResources();
    
    // 监听长任务
    this.observeLongTasks();
    
    // 监听布局偏移
    this.observeLayoutShift();
    
    // 开始定时上报
    this.startReportTimer();
    
    // 页面卸载时上报
    window.addEventListener('beforeunload', () => this.report());
    
    // 页面可见性变化时上报
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.report();
      }
    });
  }

  // 监听导航性能
  private observeNavigation() {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            
            // 记录关键指标
            this.recordMetric({
              name: 'page_load_time',
              value: navEntry.loadEventEnd - navEntry.fetchStart,
              unit: 'ms',
              category: 'navigation',
              metadata: {
                dns: navEntry.domainLookupEnd - navEntry.domainLookupStart,
                tcp: navEntry.connectEnd - navEntry.connectStart,
                request: navEntry.responseStart - navEntry.requestStart,
                response: navEntry.responseEnd - navEntry.responseStart,
                dom: navEntry.domComplete - navEntry.domInteractive,
              },
            });

            this.recordMetric({
              name: 'dom_content_loaded',
              value: navEntry.domContentLoadedEventEnd - navEntry.fetchStart,
              unit: 'ms',
              category: 'navigation',
            });

            this.recordMetric({
              name: 'first_paint',
              value: navEntry.responseEnd - navEntry.fetchStart,
              unit: 'ms',
              category: 'navigation',
            });

            // 首次内容绘制 (FCP)
            this.recordMetric({
              name: 'first_contentful_paint',
              value: navEntry.domContentLoadedEventEnd - navEntry.fetchStart,
              unit: 'ms',
              category: 'navigation',
            });
          }
        });
      });

      observer.observe({ type: 'navigation', buffered: true });
      this.observers.push(observer);
    } catch (e) {
      console.warn('Navigation observer not supported:', e);
    }
  }

  // 监听资源加载性能
  private observeResources() {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.entryType === 'resource') {
            const resourceEntry = entry as PerformanceResourceTiming;
            
            // 只记录慢资源 (>500ms)
            if (resourceEntry.duration > 500) {
              this.recordMetric({
                name: 'slow_resource',
                value: resourceEntry.duration,
                unit: 'ms',
                category: 'resource',
                metadata: {
                  name: resourceEntry.name,
                  type: resourceEntry.initiatorType,
                  size: resourceEntry.encodedBodySize,
                },
              });
            }
          }
        });
      });

      observer.observe({ type: 'resource', buffered: true });
      this.observers.push(observer);
    } catch (e) {
      console.warn('Resource observer not supported:', e);
    }
  }

  // 监听长任务 (>50ms)
  private observeLongTasks() {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          this.recordMetric({
            name: 'long_task',
            value: entry.duration,
            unit: 'ms',
            category: 'render',
            metadata: {
              startTime: entry.startTime,
            },
          });
        });
      });

      observer.observe({ type: 'longtask', buffered: true });
      this.observers.push(observer);
    } catch (e) {
      console.warn('LongTask observer not supported:', e);
    }
  }

  // 监听累积布局偏移 (CLS)
  private observeLayoutShift() {
    if (!('PerformanceObserver' in window)) return;

    try {
      let clsValue = 0;
      
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
          }
        });

        this.recordMetric({
          name: 'cumulative_layout_shift',
          value: clsValue,
          unit: 'count',
          category: 'render',
        });
      });

      observer.observe({ type: 'layout-shift', buffered: true });
      this.observers.push(observer);
    } catch (e) {
      console.warn('LayoutShift observer not supported:', e);
    }
  }

  // 记录指标
  recordMetric(metric: Omit<PerformanceMetric, 'timestamp'>) {
    if (!this.config.enabled) return;
    
    // 采样率检查
    if (Math.random() > this.config.sampleRate) return;

    const fullMetric: PerformanceMetric = {
      ...metric,
      timestamp: Date.now(),
    };

    this.metrics.push(fullMetric);

    // 限制存储数量
    if (this.metrics.length > this.config.maxMetrics) {
      this.metrics.shift();
    }

    // 开发环境打印日志
    if (this.config.logToConsole) {
      console.log(`[Performance] ${metric.name}: ${metric.value}${metric.unit}`);
    }
  }

  // 记录自定义指标
  measure(name: string, startMark: string, endMark?: string) {
    if (typeof performance === 'undefined') return;

    try {
      if (endMark) {
        performance.measure(name, startMark, endMark);
      } else {
        performance.measure(name, startMark);
      }

      const measures = performance.getEntriesByName(name, 'measure');
      const measure = measures[measures.length - 1];

      if (measure) {
        this.recordMetric({
          name,
          value: measure.duration,
          unit: 'ms',
          category: 'custom',
        });
      }

      return measure?.duration;
    } catch (e) {
      console.warn('Measure failed:', e);
    }
  }

  // 创建标记
  mark(name: string) {
    if (typeof performance === 'undefined') return;
    performance.mark(name);
  }

  // 记录 API 请求时间
  recordApiRequest(url: string, method: string, duration: number, status: number) {
    this.recordMetric({
      name: 'api_request',
      value: duration,
      unit: 'ms',
      category: 'api',
      metadata: {
        url: url.split('?')[0], // 移除查询参数
        method,
        status,
      },
    });
  }

  // 获取统计数据
  getStats(name: string): PerformanceStats | null {
    const filteredMetrics = this.metrics.filter(m => m.name === name);
    
    if (filteredMetrics.length === 0) return null;

    const values = filteredMetrics.map(m => m.value).sort((a, b) => a - b);
    const count = values.length;
    const sum = values.reduce((a, b) => a + b, 0);

    return {
      avgValue: sum / count,
      minValue: values[0],
      maxValue: values[count - 1],
      count,
      p50: values[Math.floor(count * 0.5)],
      p95: values[Math.floor(count * 0.95)],
      p99: values[Math.floor(count * 0.99)],
    };
  }

  // 获取所有指标
  getAllMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  // 获取慢请求
  getSlowRequests(threshold: number = 1000): PerformanceMetric[] {
    return this.metrics.filter(
      m => m.category === 'api' && m.value > threshold
    );
  }

  // 上报数据
  private report() {
    if (this.metrics.length === 0) return;

    const reportData = {
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: Date.now(),
      metrics: this.metrics.slice(-100), // 只上报最近100条
    };

    // 使用 sendBeacon 上报
    if (navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(reportData)], {
        type: 'application/json',
      });
      navigator.sendBeacon('/api/performance/report', blob);
    }

    // 清空已上报数据
    this.metrics = [];
  }

  // 开始定时上报
  private startReportTimer() {
    if (this.reportTimer) {
      clearInterval(this.reportTimer);
    }

    this.reportTimer = setInterval(() => {
      this.report();
    }, this.config.reportInterval);
  }

  // 销毁
  destroy() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    
    if (this.reportTimer) {
      clearInterval(this.reportTimer);
      this.reportTimer = null;
    }

    this.report();
  }
}

// 单例实例
let instance: PerformanceMonitor | null = null;

// 获取实例
export function getPerformanceMonitor(config?: Partial<PerformanceConfig>): PerformanceMonitor {
  if (!instance) {
    instance = new PerformanceMonitor(config);
  }
  return instance;
}

// 便捷方法
export const perf = {
  mark: (name: string) => getPerformanceMonitor().mark(name),
  measure: (name: string, startMark: string, endMark?: string) => 
    getPerformanceMonitor().measure(name, startMark, endMark),
  recordApi: (url: string, method: string, duration: number, status: number) => 
    getPerformanceMonitor().recordApiRequest(url, method, duration, status),
  recordMetric: (metric: Omit<PerformanceMetric, 'timestamp'>) => 
    getPerformanceMonitor().recordMetric(metric),
  getStats: (name: string) => getPerformanceMonitor().getStats(name),
  getSlowRequests: (threshold?: number) => 
    getPerformanceMonitor().getSlowRequests(threshold),
};

// API 请求性能包装器
export function withPerformanceTracking<T>(
  url: string,
  method: string,
  request: () => Promise<T>
): Promise<T> {
  const startTime = performance.now();
  
  return request()
    .then((result) => {
      const duration = performance.now() - startTime;
      perf.recordApi(url, method, duration, 200);
      return result;
    })
    .catch((error) => {
      const duration = performance.now() - startTime;
      perf.recordApi(url, method, duration, error.status || 500);
      throw error;
    });
}

// React 组件性能高阶组件
export function withComponentPerformance<P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
): React.FC<P> {
  return function PerformanceWrappedComponent(props: P) {
    React.useEffect(() => {
      perf.mark(`${componentName}_render_start`);
      return () => {
        perf.mark(`${componentName}_render_end`);
        perf.measure(`${componentName}_render`, `${componentName}_render_start`, `${componentName}_render_end`);
      };
    });

    return React.createElement(Component, props);
  };
}

import React from 'react';
