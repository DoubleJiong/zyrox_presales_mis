'use client';

import { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';
import { cn } from '@/lib/utils';

export interface KpiGaugeProps {
  /** 当前值 */
  value: number;
  /** 最大值 */
  max?: number;
  /** 标题 */
  title?: string;
  /** 单位 */
  unit?: string;
  /** 颜色主题 */
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'auto';
  /** 大小 */
  size?: number;
  /** 是否显示详细刻度 */
  showDetail?: boolean;
  /** 类名 */
  className?: string;
}

/**
 * 科幻风格仪表盘组件
 */
export function KpiGauge({
  value,
  max = 100,
  title,
  unit = '%',
  color = 'auto',
  size = 200,
  showDetail = false,
  className,
}: KpiGaugeProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  // 根据值自动选择颜色
  const getAutoColor = (val: number) => {
    if (val >= 80) return '#00ff88';
    if (val >= 50) return '#00d4ff';
    if (val >= 30) return '#ffaa00';
    return '#ff3366';
  };

  const mainColor =
    color === 'auto'
      ? getAutoColor((value / max) * 100)
      : {
          primary: '#00d4ff',
          success: '#00ff88',
          warning: '#ffaa00',
          danger: '#ff3366',
        }[color];

  useEffect(() => {
    if (!chartRef.current) return;

    chartInstance.current = echarts.init(chartRef.current, 'dark');

    const option: echarts.EChartsOption = {
      backgroundColor: 'transparent',
      series: [
        {
          type: 'gauge',
          center: ['50%', '60%'],
          radius: '90%',
          startAngle: 200,
          endAngle: -20,
          min: 0,
          max: max,
          splitNumber: showDetail ? 10 : 5,
          itemStyle: {
            color: mainColor,
          },
          progress: {
            show: true,
            width: size * 0.08,
            itemStyle: {
              color: {
                type: 'linear',
                x: 0,
                y: 0,
                x2: 1,
                y2: 0,
                colorStops: [
                  { offset: 0, color: `${mainColor}80` },
                  { offset: 1, color: mainColor },
                ],
              },
              shadowColor: mainColor,
              shadowBlur: 10,
            },
          },
          pointer: {
            show: true,
            length: '60%',
            width: 4,
            itemStyle: {
              color: mainColor,
              shadowColor: mainColor,
              shadowBlur: 10,
            },
          },
          axisLine: {
            lineStyle: {
              width: size * 0.08,
              color: [[1, 'rgba(0, 212, 255, 0.15)']],
            },
          },
          axisTick: {
            show: showDetail,
            distance: -10,
            length: 4,
            lineStyle: {
              color: 'rgba(0, 212, 255, 0.3)',
              width: 1,
            },
          },
          splitLine: {
            show: true,
            distance: -15,
            length: 8,
            lineStyle: {
              color: 'rgba(0, 212, 255, 0.5)',
              width: 2,
            },
          },
          axisLabel: {
            show: showDetail,
            distance: 20,
            color: 'rgba(139, 164, 199, 0.8)',
            fontSize: 10,
            formatter: (val: number) => {
              if (val === 0 || val === max) return val.toString();
              return '';
            },
          },
          anchor: {
            show: true,
            showAbove: true,
            size: 12,
            itemStyle: {
              borderWidth: 3,
              borderColor: mainColor,
              color: '#0d1526',
              shadowColor: mainColor,
              shadowBlur: 10,
            },
          },
          title: {
            show: !!title,
            offsetCenter: [0, '30%'],
            color: 'rgba(139, 164, 199, 0.8)',
            fontSize: 12,
          },
          detail: {
            valueAnimation: true,
            width: '60%',
            borderRadius: 4,
            offsetCenter: [0, '-5%'],
            fontSize: size * 0.15,
            fontWeight: 'bold',
            formatter: `{value}${unit}`,
            color: mainColor,
          },
          data: [
            {
              value: value,
              name: title,
            },
          ],
        },
      ],
    };

    chartInstance.current.setOption(option);

    const handleResize = () => {
      chartInstance.current?.resize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chartInstance.current?.dispose();
    };
  }, [value, max, title, unit, mainColor, size, showDetail]);

  return (
    <div
      ref={chartRef}
      className={cn(className)}
      style={{ width: size, height: size }}
    />
  );
}

/**
 * 半圆仪表盘组件
 */
export interface SemiGaugeProps {
  value: number;
  max?: number;
  title?: string;
  subtitle?: string;
  unit?: string;
  color?: string;
  size?: number;
  className?: string;
}

export function SemiGauge({
  value,
  max = 100,
  title,
  subtitle,
  unit = '%',
  color = '#00d4ff',
  size = 180,
  className,
}: SemiGaugeProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    chartInstance.current = echarts.init(chartRef.current, 'dark');

    const option: echarts.EChartsOption = {
      backgroundColor: 'transparent',
      series: [
        {
          type: 'gauge',
          startAngle: 180,
          endAngle: 0,
          min: 0,
          max: max,
          radius: '100%',
          center: ['50%', '70%'],
          splitNumber: 4,
          axisLine: {
            lineStyle: {
              width: size * 0.1,
              color: [
                [0.25, '#ff3366'],
                [0.5, '#ffaa00'],
                [0.75, '#00d4ff'],
                [1, '#00ff88'],
              ],
            },
          },
          pointer: {
            icon: 'path://M12.8,0.7l12,40.1H0.7L12.8,0.7z',
            length: '60%',
            width: 8,
            offsetCenter: [0, '-30%'],
            itemStyle: {
              color: 'auto',
              shadowColor: 'rgba(0, 212, 255, 0.5)',
              shadowBlur: 10,
            },
          },
          axisTick: {
            length: 8,
            lineStyle: {
              color: 'auto',
              width: 1,
            },
          },
          splitLine: {
            length: 12,
            lineStyle: {
              color: 'auto',
              width: 2,
            },
          },
          axisLabel: {
            color: 'rgba(139, 164, 199, 0.8)',
            fontSize: 10,
            distance: -35,
            formatter: (val: number) => {
              if (val === 0) return '0';
              if (val === max / 4) return '差';
              if (val === max / 2) return '中';
              if (val === (max * 3) / 4) return '良';
              if (val === max) return '优';
              return '';
            },
          },
          title: {
            show: false,
          },
          detail: {
            valueAnimation: true,
            formatter: `{value}${unit}`,
            color: color,
            fontSize: size * 0.12,
            offsetCenter: [0, '10%'],
            fontWeight: 'bold',
          },
          data: [{ value, name: title }],
        },
      ],
    };

    chartInstance.current.setOption(option);

    return () => {
      chartInstance.current?.dispose();
    };
  }, [value, max, title, unit, color, size]);

  return (
    <div className={cn('relative', className)} style={{ width: size, height: size * 0.7 }}>
      <div ref={chartRef} className="w-full h-full" />
      {(title || subtitle) && (
        <div className="absolute bottom-0 left-0 right-0 text-center">
          {title && (
            <div className="text-sm font-medium text-[var(--sci-text-primary)]">
              {title}
            </div>
          )}
          {subtitle && (
            <div className="text-xs text-[var(--sci-text-secondary)]">
              {subtitle}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * 多指针仪表盘
 */
export interface MultiNeedleGaugeProps {
  values: Array<{
    value: number;
    label: string;
    color: string;
  }>;
  max?: number;
  title?: string;
  size?: number;
  className?: string;
}

export function MultiNeedleGauge({
  values,
  max = 100,
  title,
  size = 200,
  className,
}: MultiNeedleGaugeProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    chartInstance.current = echarts.init(chartRef.current, 'dark');

    const series = values.map((item, index) => ({
      type: 'gauge' as const,
      center: ['50%', '60%'],
      radius: `${90 - index * 15}%`,
      startAngle: 200,
      endAngle: -20,
      min: 0,
      max: max,
      itemStyle: {
        color: item.color,
      },
      progress: {
        show: true,
        width: 10,
      },
      pointer: {
        show: true,
        length: '70%',
        width: 3,
        itemStyle: {
          color: item.color,
        },
      },
      axisLine: {
        lineStyle: {
          width: 10,
          color: [[1, 'rgba(0, 212, 255, 0.1)']] as any,
        },
      },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: { show: index === 0 },
      detail: { show: false },
      data: [{ value: item.value }],
    }));

    const option: echarts.EChartsOption = {
      backgroundColor: 'transparent',
      series: series as any,
    };

    chartInstance.current.setOption(option);

    return () => {
      chartInstance.current?.dispose();
    };
  }, [values, max, size]);

  return (
    <div className={cn('relative', className)} style={{ width: size, height: size }}>
      <div ref={chartRef} className="w-full h-full" />
      {title && (
        <div className="absolute top-4 left-0 right-0 text-center text-sm text-[var(--sci-text-primary)]">
          {title}
        </div>
      )}
      {/* 图例 */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-4">
        {values.map((item) => (
          <div key={item.label} className="flex items-center gap-1">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-xs text-[var(--sci-text-secondary)]">
              {item.label}: {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * 环形进度指示器
 */
export interface RingProgressProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  bgColor?: string;
  showValue?: boolean;
  animated?: boolean;
  className?: string;
}

export function RingProgress({
  value,
  max = 100,
  size = 100,
  strokeWidth = 8,
  color = '#00d4ff',
  bgColor = 'rgba(0, 212, 255, 0.15)',
  showValue = true,
  animated = true,
  className,
}: RingProgressProps) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (!animated) {
      setDisplayValue(value);
      return;
    }

    const duration = 1000;
    const startTime = Date.now();
    const startValue = displayValue;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);

      setDisplayValue(startValue + (value - startValue) * easeProgress);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [value, animated]);

  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = (displayValue / max) * 100;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div
      className={cn('relative inline-flex items-center justify-center', className)}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* 背景环 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={bgColor}
          strokeWidth={strokeWidth}
        />
        {/* 进度环 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: animated ? 'stroke-dashoffset 0.3s ease-out' : 'none',
            filter: `drop-shadow(0 0 6px ${color})`,
          }}
        />
      </svg>
      {showValue && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className="font-mono font-bold"
            style={{
              fontSize: size / 4,
              color,
              textShadow: `0 0 10px ${color}`,
            }}
          >
            {Math.round(progress)}%
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * 数据趋势图组件
 */
export interface TrendChartProps {
  data: Array<{ time: string; value: number }>;
  color?: string;
  height?: number;
  showArea?: boolean;
  className?: string;
}

export function TrendChart({
  data,
  color = '#00d4ff',
  height = 60,
  showArea = true,
  className,
}: TrendChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current || data.length === 0) return;

    chartInstance.current = echarts.init(chartRef.current, 'dark');

    const option: echarts.EChartsOption = {
      backgroundColor: 'transparent',
      grid: {
        left: 0,
        right: 0,
        top: 5,
        bottom: 5,
      },
      xAxis: {
        type: 'category',
        show: false,
        data: data.map((d) => d.time),
      },
      yAxis: {
        type: 'value',
        show: false,
      },
      series: [
        {
          type: 'line',
          data: data.map((d) => d.value),
          smooth: true,
          symbol: 'none',
          lineStyle: {
            color,
            width: 2,
          },
          areaStyle: showArea
            ? {
                color: {
                  type: 'linear',
                  x: 0,
                  y: 0,
                  x2: 0,
                  y2: 1,
                  colorStops: [
                    { offset: 0, color: `${color}40` },
                    { offset: 1, color: 'transparent' },
                  ],
                },
              }
            : undefined,
        },
      ],
    };

    chartInstance.current.setOption(option);

    return () => {
      chartInstance.current?.dispose();
    };
  }, [data, color, height, showArea]);

  return (
    <div
      ref={chartRef}
      className={cn(className)}
      style={{ width: '100%', height }}
    />
  );
}

/**
 * 对比指标组件
 */
export interface ComparisonIndicatorProps {
  current: number;
  previous: number;
  label?: string;
  unit?: string;
  showPercentage?: boolean;
  className?: string;
}

export function ComparisonIndicator({
  current,
  previous,
  label,
  unit = '',
  showPercentage = true,
  className,
}: ComparisonIndicatorProps) {
  const diff = current - previous;
  const percentage = previous > 0 ? ((diff / previous) * 100).toFixed(1) : '0';
  const isPositive = diff >= 0;

  return (
    <div className={cn('flex flex-col', className)}>
      {label && (
        <span className="text-xs text-[var(--sci-text-dim)] mb-1">{label}</span>
      )}
      <div className="flex items-baseline gap-2">
        <span className="text-xl font-bold text-[var(--sci-primary)] sci-text-glow">
          {current.toLocaleString()}
          {unit}
        </span>
        {showPercentage && (
          <span
            className={cn(
              'text-sm font-mono',
              isPositive ? 'text-[var(--sci-success)]' : 'text-[var(--sci-danger)]'
            )}
          >
            {isPositive ? '+' : ''}
            {percentage}%
          </span>
        )}
      </div>
    </div>
  );
}
