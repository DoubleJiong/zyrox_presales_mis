'use client';

import { useEffect } from 'react';
import { PerformanceDashboard } from '@/components/performance/PerformanceDashboard';
import { getPerformanceMonitor } from '@/lib/performance-monitor';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Settings, Bell, Shield } from 'lucide-react';

export default function PerformancePage() {
  // 初始化性能监控
  useEffect(() => {
    getPerformanceMonitor({
      enabled: true,
      sampleRate: 1,
      logToConsole: process.env.NODE_ENV === 'development',
    });
  }, []);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Activity className="h-8 w-8" />
            性能监控
          </h1>
          <p className="text-muted-foreground mt-1">
            实时监控应用性能指标，优化用户体验
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <Bell className="h-3 w-3" />
            自动监控
          </Badge>
          <Badge variant="secondary" className="flex items-center gap-1">
            <Shield className="h-3 w-3" />
            已启用
          </Badge>
        </div>
      </div>

      {/* 监控说明卡片 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">监控指标说明</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3 text-sm">
            <div className="space-y-1">
              <p className="font-medium">页面加载时间</p>
              <p className="text-muted-foreground">
                从开始加载到页面完全渲染的时间，包括DNS查询、TCP连接、资源下载和DOM解析。
              </p>
            </div>
            <div className="space-y-1">
              <p className="font-medium">首次内容绘制 (FCP)</p>
              <p className="text-muted-foreground">
                页面首次渲染任何文本、图像或非空白内容的时间，是用户体验的关键指标。
              </p>
            </div>
            <div className="space-y-1">
              <p className="font-medium">API请求时间</p>
              <p className="text-muted-foreground">
                记录所有API请求的响应时间，自动识别慢请求（&gt;1秒）并发出警告。
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 性能仪表板 */}
      <PerformanceDashboard />

      {/* 配置信息 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Settings className="h-5 w-5" />
            监控配置
          </CardTitle>
          <CardDescription>当前性能监控的配置参数</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-4 text-sm">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-muted-foreground">采样率</p>
              <p className="font-medium">100%</p>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-muted-foreground">上报间隔</p>
              <p className="font-medium">30秒</p>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-muted-foreground">慢请求阈值</p>
              <p className="font-medium">1000ms</p>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-muted-foreground">最大存储</p>
              <p className="font-medium">1000条</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
