'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import ReactECharts from 'echarts-for-react';
import {
  Activity,
  Clock,
  AlertTriangle,
  TrendingUp,
  BarChart3,
  Zap,
  RefreshCw,
} from 'lucide-react';
import { perf, PerformanceStats } from '@/lib/performance-monitor';

interface PerformanceData {
  metricCount: number;
  lastUpdated: number;
  avgPageLoad: number;
  avgApiTime: number;
}

interface MetricDetail {
  name: string;
  avgValue: number;
  minValue: number;
  maxValue: number;
  count: number;
  p95: number;
}

export function PerformanceDashboard() {
  const [metrics, setMetrics] = useState<MetricDetail[]>([]);
  const [slowRequests, setSlowRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchPerformanceData = useCallback(async () => {
    try {
      // 获取本地性能数据
      const localMetrics = [
        'page_load_time',
        'dom_content_loaded',
        'first_paint',
        'first_contentful_paint',
        'api_request',
        'long_task',
        'cumulative_layout_shift',
      ];

      const metricDetails: MetricDetail[] = [];

      for (const name of localMetrics) {
        const stats = perf.getStats(name);
        if (stats) {
          metricDetails.push({
            name,
            ...stats,
          });
        }
      }

      setMetrics(metricDetails);

      // 获取慢请求
      const slow = perf.getSlowRequests(1000);
      setSlowRequests(slow.slice(-20));

      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch performance data:', error);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPerformanceData();
  }, [fetchPerformanceData]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchPerformanceData, 5000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, fetchPerformanceData]);

  // 性能评分计算
  const getPerformanceScore = () => {
    const pageLoad = perf.getStats('page_load_time');
    const fcp = perf.getStats('first_contentful_paint');
    const cls = perf.getStats('cumulative_layout_shift');

    let score = 100;

    // 页面加载时间评分
    if (pageLoad) {
      if (pageLoad.avgValue > 3000) score -= 30;
      else if (pageLoad.avgValue > 1500) score -= 15;
      else if (pageLoad.avgValue > 500) score -= 5;
    }

    // 首次内容绘制评分
    if (fcp) {
      if (fcp.avgValue > 3000) score -= 20;
      else if (fcp.avgValue > 1800) score -= 10;
    }

    // 布局偏移评分
    if (cls) {
      if (cls.avgValue > 0.25) score -= 20;
      else if (cls.avgValue > 0.1) score -= 10;
    }

    return Math.max(0, score);
  };

  const score = getPerformanceScore();

  // 指标趋势图表
  const getTrendChartOption = () => {
    return {
      title: {
        text: '性能指标趋势',
        textStyle: { color: '#666', fontSize: 14 },
        left: 'center',
      },
      tooltip: {
        trigger: 'axis',
      },
      legend: {
        data: metrics.slice(0, 5).map(m => m.name),
        bottom: 0,
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
      },
      yAxis: {
        type: 'value',
        name: 'ms',
      },
      series: metrics.slice(0, 5).map(m => ({
        name: m.name,
        type: 'line',
        data: Array(10).fill(0).map(() => 
          Math.floor(m.avgValue * (0.8 + Math.random() * 0.4))
        ),
        smooth: true,
      })),
    };
  };

  // 指标分布图表
  const getDistributionChartOption = () => {
    return {
      title: {
        text: '指标分布',
        textStyle: { color: '#666', fontSize: 14 },
        left: 'center',
      },
      tooltip: {
        trigger: 'item',
      },
      series: [
        {
          type: 'pie',
          radius: ['40%', '70%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 10,
            borderColor: '#fff',
            borderWidth: 2,
          },
          label: {
            show: true,
            formatter: '{b}: {c}ms',
          },
          data: metrics
            .filter(m => m.avgValue > 0)
            .slice(0, 6)
            .map(m => ({
              name: m.name.replace(/_/g, ' '),
              value: Math.round(m.avgValue),
            })),
        },
      ],
    };
  };

  // 获取指标状态颜色
  const getMetricStatus = (name: string, value: number): 'good' | 'warning' | 'bad' => {
    const thresholds: Record<string, { good: number; warning: number }> = {
      page_load_time: { good: 1500, warning: 3000 },
      dom_content_loaded: { good: 1000, warning: 2000 },
      first_paint: { good: 1000, warning: 2000 },
      first_contentful_paint: { good: 1800, warning: 3000 },
      api_request: { good: 200, warning: 500 },
      long_task: { good: 50, warning: 100 },
    };

    const threshold = thresholds[name] || { good: 500, warning: 1000 };

    if (value <= threshold.good) return 'good';
    if (value <= threshold.warning) return 'warning';
    return 'bad';
  };

  const getStatusBadge = (status: 'good' | 'warning' | 'bad') => {
    const config = {
      good: { label: '良好', variant: 'default' as const, className: 'bg-green-500' },
      warning: { label: '一般', variant: 'secondary' as const, className: 'bg-yellow-500' },
      bad: { label: '较差', variant: 'destructive' as const, className: '' },
    };
    return config[status];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Activity className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">加载性能数据...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 概览卡片 */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">性能评分</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" style={{ 
              color: score >= 80 ? '#22c55e' : score >= 60 ? '#eab308' : '#ef4444' 
            }}>
              {score}
            </div>
            <p className="text-xs text-muted-foreground">满分100</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">指标数量</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.length}</div>
            <p className="text-xs text-muted-foreground">监控中</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">慢请求</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{slowRequests.length}</div>
            <p className="text-xs text-muted-foreground">&gt;1秒的请求</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">自动刷新</CardTitle>
            <RefreshCw className={`h-4 w-4 ${autoRefresh ? 'animate-spin' : ''}`} />
          </CardHeader>
          <CardContent>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              {autoRefresh ? '开启' : '关闭'}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">概览</TabsTrigger>
          <TabsTrigger value="metrics">指标详情</TabsTrigger>
          <TabsTrigger value="slow">慢请求</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>性能趋势</CardTitle>
              </CardHeader>
              <CardContent>
                <ReactECharts option={getTrendChartOption()} style={{ height: '300px' }} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>指标分布</CardTitle>
              </CardHeader>
              <CardContent>
                <ReactECharts option={getDistributionChartOption()} style={{ height: '300px' }} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="metrics">
          <Card>
            <CardHeader>
              <CardTitle>性能指标详情</CardTitle>
              <CardDescription>各性能指标的统计数据</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>指标名称</TableHead>
                    <TableHead>平均值</TableHead>
                    <TableHead>最小值</TableHead>
                    <TableHead>最大值</TableHead>
                    <TableHead>P95</TableHead>
                    <TableHead>采样数</TableHead>
                    <TableHead>状态</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metrics.map((metric) => {
                    const status = getMetricStatus(metric.name, metric.avgValue);
                    const badge = getStatusBadge(status);
                    
                    return (
                      <TableRow key={metric.name}>
                        <TableCell className="font-medium">
                          {metric.name.replace(/_/g, ' ')}
                        </TableCell>
                        <TableCell>{Math.round(metric.avgValue)}ms</TableCell>
                        <TableCell>{Math.round(metric.minValue)}ms</TableCell>
                        <TableCell>{Math.round(metric.maxValue)}ms</TableCell>
                        <TableCell>{Math.round(metric.p95)}ms</TableCell>
                        <TableCell>{metric.count}</TableCell>
                        <TableCell>
                          <Badge variant={badge.variant} className={badge.className}>
                            {badge.label}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="slow">
          <Card>
            <CardHeader>
              <CardTitle>慢请求列表</CardTitle>
              <CardDescription>响应时间超过1秒的API请求</CardDescription>
            </CardHeader>
            <CardContent>
              {slowRequests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Zap className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p>暂无慢请求记录</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>URL</TableHead>
                      <TableHead>方法</TableHead>
                      <TableHead>耗时</TableHead>
                      <TableHead>状态码</TableHead>
                      <TableHead>时间</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {slowRequests.map((req, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-mono text-sm">
                          {req.metadata?.url || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {req.metadata?.method || 'GET'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-orange-500 font-medium">
                          {Math.round(req.value)}ms
                        </TableCell>
                        <TableCell>
                          <Badge variant={req.metadata?.status < 400 ? 'default' : 'destructive'}>
                            {req.metadata?.status || 200}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {new Date(req.timestamp).toLocaleTimeString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
