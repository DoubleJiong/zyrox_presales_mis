'use client';

import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import { useDashboardTheme } from '@/contexts/DashboardThemeContext';

interface TrendChartProps {
  title: string;
  data: Array<{ name: string; value: number }>;
  type?: 'line' | 'bar';
  height?: string;
  smooth?: boolean;
}

export function TrendChart({
  title,
  data,
  type = 'line',
  height = '250px',
  smooth = true,
}: TrendChartProps) {
  const { theme } = useDashboardTheme();

  const cardStyle = {
    backgroundColor: theme.background.card,
    border: `1px solid ${theme.border.card}`,
    borderRadius: theme.card.borderRadius,
    boxShadow: theme.card.shadow,
    padding: theme.card.padding,
    backdropFilter: theme.card.glassEffect ? 'blur(10px)' : 'none',
  };

  const getOption = () => {
    const chartColors = theme.chart.colors;

    return {
      backgroundColor: 'transparent',
      title: {
        text: title,
        textStyle: {
          color: theme.text.primary,
          fontSize: parseInt(theme.font.size.lg),
          fontWeight: theme.font.weight.bold,
        },
        left: 'left',
        top: 10,
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: theme.background.card,
        borderColor: theme.border.color,
        textStyle: {
          color: theme.text.primary,
        },
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: data.map((d) => d.name),
        axisLine: {
          lineStyle: {
            color: theme.border.color,
          },
        },
        axisLabel: {
          color: theme.text.secondary,
          fontSize: parseInt(theme.font.size.xs),
        },
      },
      yAxis: {
        type: 'value',
        axisLine: {
          lineStyle: {
            color: theme.border.color,
          },
        },
        axisLabel: {
          color: theme.text.secondary,
          fontSize: parseInt(theme.font.size.xs),
        },
        splitLine: {
          lineStyle: {
            color: theme.border.color,
            type: 'dashed',
          },
        },
      },
      series: [
        {
          data: data.map((d) => d.value),
          type: type,
          smooth: smooth,
          itemStyle: {
            color: chartColors[0],
          },
          lineStyle: {
            width: 2,
            color: chartColors[0],
            shadowColor: theme.chart.glow ? chartColors[0] : 'transparent',
            shadowBlur: theme.chart.glow ? 10 : 0,
          },
          areaStyle: type === 'line' ? {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: `${chartColors[0]}40` },
              { offset: 1, color: `${chartColors[0]}05` },
            ]),
          } : undefined,
          barWidth: type === 'bar' ? '40%' : undefined,
        },
      ],
    };
  };

  return (
    <div style={cardStyle}>
      <ReactECharts
        option={getOption()}
        style={{ height, width: '100%' }}
        notMerge={true}
        lazyUpdate={true}
      />
    </div>
  );
}
