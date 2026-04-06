/**
 * 组件懒加载配置
 * 使用 Next.js dynamic import 实现组件按需加载
 */

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

// 加载占位组件
export function LoadingSpinner({ className = 'h-96' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

// 骨架屏组件
export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-muted rounded ${className}`} />
  );
}

// 表格骨架屏
export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-3">
      {/* 表头 */}
      <div className="flex gap-3">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-10 flex-1" />
        ))}
      </div>
      {/* 行 */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-3">
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} className="h-12 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

// 卡片骨架屏
export function CardSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  );
}

// 图表骨架屏
export function ChartSkeleton({ height = 'h-64' }: { height?: string }) {
  return (
    <div className={`flex flex-col items-center justify-center ${height} bg-muted/50 rounded-lg`}>
      <Skeleton className="h-full w-full rounded-lg" />
    </div>
  );
}

// 列表骨架屏
export function ListSkeleton({ items = 5 }: { items?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ============ 懒加载组件配置 ============

// 图表组件 - 使用存在的组件
export const LazyKpiGauge = dynamic(
  () => import('@/components/dashboard/kpi-gauge').then((mod) => mod.KpiGauge),
  {
    loading: () => <ChartSkeleton />,
    ssr: false,
  }
);

export const LazyProjectRadar = dynamic(
  () => import('@/components/dashboard/project-radar').then((mod) => mod.ProjectRadar),
  {
    loading: () => <ChartSkeleton />,
    ssr: false,
  }
);

// 数据面板组件
export const LazyDataPanels = dynamic(
  () => import('@/components/dashboard/DataPanels').then((mod) => ({
    default: mod.SalesPanel,
  })),
  {
    loading: () => <CardSkeleton />,
    ssr: false,
  }
);

// 趋势图组件
export const LazyTrendChart = dynamic(
  () => import('@/components/dashboard/TrendChart').then((mod) => mod.TrendChart),
  {
    loading: () => <ChartSkeleton />,
    ssr: false,
  }
);

// 科技风格统计卡片
export const LazyTechStatCard = dynamic(
  () => import('@/components/dashboard/TechStatCard').then((mod) => mod.TechStatCard),
  {
    loading: () => <CardSkeleton />,
  }
);

// 地图组件
export const LazyTechMapChart = dynamic(
  () => import('@/components/dashboard/TechMapChart').then((mod) => mod.TechMapChart),
  {
    loading: () => <ChartSkeleton height="h-96" />,
    ssr: false,
  }
);

// 日历组件
export const LazyCalendar = dynamic(
  () => import('@/components/calendar/calendar-component').then((mod) => mod.CalendarComponent),
  {
    loading: () => <LoadingSpinner className="h-96" />,
  }
);

// ============ 懒加载工具函数 ============

/**
 * 创建懒加载组件
 */
export function createLazyComponent<T extends React.ComponentType<unknown>>(
  importFn: () => Promise<{ default: T }>,
  LoadingComponent: React.ReactNode = <LoadingSpinner />
) {
  return dynamic(importFn, {
    loading: () => <>{LoadingComponent}</>,
    ssr: false,
  });
}

/**
 * 预加载组件
 */
export function preloadComponent(importFn: () => Promise<unknown>) {
  return importFn();
}

// ============ 懒加载配置映射 ============

export const lazyComponents = {
  kpiGauge: LazyKpiGauge,
  projectRadar: LazyProjectRadar,
  trendChart: LazyTrendChart,
  techStatCard: LazyTechStatCard,
  techMapChart: LazyTechMapChart,
  calendar: LazyCalendar,
};

// 组件预加载映射
export const preloadMap: Record<string, () => Promise<unknown>> = {
  kpiGauge: () => import('@/components/dashboard/kpi-gauge'),
  projectRadar: () => import('@/components/dashboard/project-radar'),
  trendChart: () => import('@/components/dashboard/TrendChart'),
  techStatCard: () => import('@/components/dashboard/TechStatCard'),
  techMapChart: () => import('@/components/dashboard/TechMapChart'),
};

// ============ 懒加载面板包装器 ============

interface LazyPanelProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function LazyPanel({ children, fallback = <CardSkeleton /> }: LazyPanelProps) {
  return (
    <div className="relative">
      <React.Suspense fallback={fallback}>
        {children}
      </React.Suspense>
    </div>
  );
}

// 需要导入 React
import React from 'react';
