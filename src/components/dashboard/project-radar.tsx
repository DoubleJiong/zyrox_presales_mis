'use client';

import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { cn } from '@/lib/utils';

export interface ProjectRadarProps {
  /** 项目数据 */
  data: Array<{
    name: string;
    dimensions: Record<string, number>;
  }>;
  /** 维度配置 */
  dimensions?: Array<{
    name: string;
    max: number;
    label?: string;
  }>;
  /** 颜色列表 */
  colors?: string[];
  /** 大小 */
  size?: number;
  /** 是否显示图例 */
  showLegend?: boolean;
  /** 类名 */
  className?: string;
}

// 默认维度配置
const defaultDimensions = [
  { name: 'progress', max: 100, label: '进度' },
  { name: 'budget', max: 100, label: '预算' },
  { name: 'risk', max: 100, label: '风险' },
  { name: 'quality', max: 100, label: '质量' },
  { name: 'team', max: 100, label: '团队' },
];

// 默认颜色
const defaultColors = [
  '#00d4ff', // 青色
  '#00ff88', // 绿色
  '#ffaa00', // 橙色
  '#ff3366', // 红色
  '#9b59b6', // 紫色
];

/**
 * 项目追踪雷达图组件
 * 多维度展示项目健康度
 */
export function ProjectRadar({
  data,
  dimensions = defaultDimensions,
  colors = defaultColors,
  size = 300,
  showLegend = true,
  className,
}: ProjectRadarProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current || data.length === 0) return;

    chartInstance.current = echarts.init(chartRef.current, 'dark');

    // 构建雷达图数据
    const seriesData = data.map((item, index) => ({
      value: dimensions.map((dim) => item.dimensions[dim.name] || 0),
      name: item.name,
      itemStyle: {
        color: colors[index % colors.length],
      },
      lineStyle: {
        color: colors[index % colors.length],
        width: 2,
      },
      areaStyle: {
        color: `${colors[index % colors.length]}30`,
      },
    }));

    const option: echarts.EChartsOption = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(13, 21, 38, 0.95)',
        borderColor: 'rgba(0, 212, 255, 0.5)',
        borderWidth: 1,
        textStyle: {
          color: '#e8f4ff',
        },
        formatter: (params: any) => {
          const values = params.value;
          let html = `<div style="padding: 8px;">
            <div style="font-weight: bold; color: ${params.color}; margin-bottom: 8px;">
              ${params.name}
            </div>`;
          dimensions.forEach((dim, index) => {
            html += `
              <div style="display: flex; justify-content: space-between; margin: 4px 0;">
                <span style="color: #8ba4c7;">${dim.label || dim.name}</span>
                <span style="color: ${getScoreColor(values[index])}; font-weight: bold;">
                  ${values[index]}
                </span>
              </div>`;
          });
          html += '</div>';
          return html;
        },
      },
      legend: {
        show: showLegend,
        bottom: 10,
        textStyle: {
          color: '#8ba4c7',
        },
        itemWidth: 12,
        itemHeight: 12,
        itemGap: 16,
      },
      radar: {
        center: ['50%', showLegend ? '45%' : '50%'],
        radius: '65%',
        indicator: dimensions.map((dim) => ({
          name: dim.label || dim.name,
          max: dim.max,
        })),
        shape: 'polygon',
        splitNumber: 4,
        axisName: {
          color: '#8ba4c7',
          fontSize: 12,
        },
        splitLine: {
          lineStyle: {
            color: 'rgba(0, 212, 255, 0.2)',
          },
        },
        splitArea: {
          show: true,
          areaStyle: {
            color: ['rgba(0, 212, 255, 0.02)', 'rgba(0, 212, 255, 0.05)'],
          },
        },
        axisLine: {
          lineStyle: {
            color: 'rgba(0, 212, 255, 0.3)',
          },
        },
      },
      series: [
        {
          type: 'radar',
          data: seriesData,
          emphasis: {
            lineStyle: {
              width: 3,
            },
            areaStyle: {
              color: 'rgba(0, 212, 255, 0.3)',
            },
          },
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
  }, [data, dimensions, colors, showLegend]);

  return (
    <div
      ref={chartRef}
      className={cn(className)}
      style={{ width: size, height: showLegend ? size + 40 : size }}
    />
  );
}

/**
 * 根据分数获取颜色
 */
function getScoreColor(score: number): string {
  if (score >= 80) return '#00ff88';
  if (score >= 60) return '#00d4ff';
  if (score >= 40) return '#ffaa00';
  return '#ff3366';
}

/**
 * 单项目健康度雷达图
 */
export interface SingleProjectRadarProps {
  /** 项目名称 */
  name: string;
  /** 维度数据 */
  dimensions: Record<string, number>;
  /** 维度配置 */
  dimensionConfig?: Array<{
    name: string;
    max: number;
    label?: string;
  }>;
  /** 大小 */
  size?: number;
  /** 颜色 */
  color?: string;
  /** 类名 */
  className?: string;
}

export function SingleProjectRadar({
  name,
  dimensions,
  dimensionConfig = defaultDimensions,
  size = 200,
  color = '#00d4ff',
  className,
}: SingleProjectRadarProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    chartInstance.current = echarts.init(chartRef.current, 'dark');

    const values = dimensionConfig.map((dim) => dimensions[dim.name] || 0);

    const option: echarts.EChartsOption = {
      backgroundColor: 'transparent',
      radar: {
        center: ['50%', '50%'],
        radius: '70%',
        indicator: dimensionConfig.map((dim) => ({
          name: dim.label || dim.name,
          max: dim.max,
        })),
        shape: 'polygon',
        splitNumber: 4,
        axisName: {
          color: '#8ba4c7',
          fontSize: 10,
        },
        splitLine: {
          lineStyle: {
            color: 'rgba(0, 212, 255, 0.2)',
          },
        },
        splitArea: {
          show: true,
          areaStyle: {
            color: ['rgba(0, 212, 255, 0.02)', 'rgba(0, 212, 255, 0.05)'],
          },
        },
        axisLine: {
          lineStyle: {
            color: 'rgba(0, 212, 255, 0.3)',
          },
        },
      },
      series: [
        {
          type: 'radar',
          data: [
            {
              value: values,
              name,
              lineStyle: {
                color,
                width: 2,
              },
              areaStyle: {
                color: `${color}30`,
              },
              itemStyle: {
                color,
              },
            },
          ],
        },
      ],
    };

    chartInstance.current.setOption(option);

    return () => {
      chartInstance.current?.dispose();
    };
  }, [name, dimensions, dimensionConfig, color]);

  return (
    <div
      ref={chartRef}
      className={cn(className)}
      style={{ width: size, height: size }}
    />
  );
}

/**
 * 项目健康度评分卡
 */
export interface HealthScoreCardProps {
  /** 项目名称 */
  name: string;
  /** 总分 */
  score: number;
  /** 维度分数 */
  dimensions: Record<string, number>;
  /** 状态 */
  status?: 'healthy' | 'warning' | 'critical';
  /** 点击事件 */
  onClick?: () => void;
  /** 类名 */
  className?: string;
}

export function HealthScoreCard({
  name,
  score,
  dimensions,
  status,
  onClick,
  className,
}: HealthScoreCardProps) {
  // 自动判断状态
  const autoStatus = status || (score >= 70 ? 'healthy' : score >= 40 ? 'warning' : 'critical');

  const statusColors = {
    healthy: '#00ff88',
    warning: '#ffaa00',
    critical: '#ff3366',
  };

  const statusLabels = {
    healthy: '健康',
    warning: '注意',
    critical: '危险',
  };

  return (
    <div
      className={cn(
        'p-4 bg-[var(--sci-bg-card)] border border-[var(--sci-border)] rounded cursor-pointer',
        'hover:border-[var(--sci-primary)] hover:bg-[var(--sci-bg-hover)] transition-all',
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-[var(--sci-text-primary)] truncate">
            {name}
          </h4>
          <span
            className="text-xs px-2 py-0.5 rounded mt-1 inline-block"
            style={{
              backgroundColor: `${statusColors[autoStatus]}20`,
              color: statusColors[autoStatus],
              border: `1px solid ${statusColors[autoStatus]}40`,
            }}
          >
            {statusLabels[autoStatus]}
          </span>
        </div>
        <div className="text-right">
          <div
            className="text-2xl font-bold font-mono"
            style={{
              color: statusColors[autoStatus],
              textShadow: `0 0 10px ${statusColors[autoStatus]}50`,
            }}
          >
            {score}
          </div>
          <div className="text-xs text-[var(--sci-text-dim)]">健康度</div>
        </div>
      </div>

      {/* 维度条 */}
      <div className="space-y-2">
        {Object.entries(dimensions).slice(0, 4).map(([key, value]) => (
          <div key={key} className="flex items-center gap-2">
            <span className="text-xs text-[var(--sci-text-secondary)] w-12 truncate">
              {key}
            </span>
            <div className="flex-1 h-1.5 bg-[var(--sci-bg-deep)] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${value}%`,
                  backgroundColor: getScoreColor(value),
                }}
              />
            </div>
            <span
              className="text-xs font-mono w-6 text-right"
              style={{ color: getScoreColor(value) }}
            >
              {value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * 项目健康度计算工具
 */
export function calculateProjectHealth(
  metrics: {
    progress: number;      // 完成进度 0-100
    budgetUsage: number;   // 预算使用率 0-100 (越低越好)
    riskLevel: number;     // 风险等级 0-100 (越低越好)
    qualityScore: number;  // 质量评分 0-100
    teamScore: number;     // 团队评分 0-100
  }
): {
  score: number;
  dimensions: Record<string, number>;
  status: 'healthy' | 'warning' | 'critical';
} {
  // 计算各维度得分（部分指标需要反转）
  const progressScore = metrics.progress;
  const budgetScore = 100 - Math.min(metrics.budgetUsage, 100); // 使用率越低越好
  const riskScore = 100 - Math.min(metrics.riskLevel, 100);     // 风险越低越好
  const qualityScore = metrics.qualityScore;
  const teamScore = metrics.teamScore;

  // 加权计算总分
  const weights = {
    progress: 0.25,
    budget: 0.2,
    risk: 0.25,
    quality: 0.15,
    team: 0.15,
  };

  const score = Math.round(
    progressScore * weights.progress +
    budgetScore * weights.budget +
    riskScore * weights.risk +
    qualityScore * weights.quality +
    teamScore * weights.team
  );

  return {
    score,
    dimensions: {
      进度: progressScore,
      预算: budgetScore,
      风险: riskScore,
      质量: qualityScore,
      团队: teamScore,
    },
    status: score >= 70 ? 'healthy' : score >= 40 ? 'warning' : 'critical',
  };
}
