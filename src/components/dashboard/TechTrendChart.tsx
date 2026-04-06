'use client';

import { useState } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import { techTheme } from '@/lib/tech-theme';

interface TechTrendChartProps {
  title: string;
  data: Array<{ name: string; value: number }>;
  type?: 'line' | 'bar';
  height?: string;
  smooth?: boolean;
  showArea?: boolean;
  colorIndex?: number;
  showXAxis?: boolean;
  showYAxis?: boolean;
}

export function TechTrendChart({
  title,
  data,
  type = 'line',
  height = '250px',
  smooth = true,
  showArea = true,
  colorIndex = 0,
  showXAxis = true,
  showYAxis = true,
}: TechTrendChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const mainColor = techTheme.chart.lineColors[colorIndex % techTheme.chart.lineColors.length];
  const areaColor = techTheme.chart.areaColors[colorIndex % techTheme.chart.areaColors.length];

  const cardStyle = {
    backgroundColor: techTheme.background.card,
    border: techTheme.card.border,
    borderRadius: techTheme.card.borderRadius,
    padding: techTheme.card.padding,
    boxShadow: techTheme.card.boxShadow,
    backdropFilter: 'blur(10px)',
  };

  const getOption = () => {
    const gridPadding = {
      left: '5%',
      right: '4%',
      bottom: '8%',
      top: '15%',
      containLabel: true,
    };

    return {
      backgroundColor: 'transparent',
      title: {
        text: title,
        left: 'left',
        top: 10,
        textStyle: {
          color: techTheme.text.primary,
          fontSize: parseInt(techTheme.font.size.lg),
          fontWeight: techTheme.font.weight.bold,
        },
        subtext: hoveredIndex !== null ? data[hoveredIndex]?.value + (title.includes('万') ? ' 万元' : '') : '',
        subtextStyle: {
          color: mainColor,
          fontSize: parseInt(techTheme.font.size.md),
          fontWeight: techTheme.font.weight.bold,
        },
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: `${techTheme.background.card}95`,
        borderColor: mainColor,
        borderWidth: 1,
        padding: [12, 16],
        textStyle: {
          color: techTheme.text.primary,
          fontSize: parseInt(techTheme.font.size.sm),
        },
        formatter: (params: any) => {
          const param = params[0];
          return `
            <div style="padding: 4px;">
              <div style="color: ${techTheme.text.secondary}; margin-bottom: 8px;">${param.name}</div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <div style="width: 8px; height: 8px; border-radius: 50%; background: ${mainColor}; box-shadow: 0 0 10px ${mainColor};"></div>
                <div style="color: ${techTheme.text.primary}; font-weight: 600;">${param.value}</div>
              </div>
            </div>
          `;
        },
      },
      grid: gridPadding,
      xAxis: {
        show: showXAxis,
        type: 'category',
        data: data.map((d) => d.name),
        axisLine: {
          lineStyle: {
            color: techTheme.border.color,
            width: 1,
          },
        },
        axisLabel: {
          color: techTheme.text.muted,
          fontSize: parseInt(techTheme.font.size.xs),
          rotate: 0,
        },
        axisTick: {
          show: false,
        },
      },
      yAxis: {
        show: showYAxis,
        type: 'value',
        axisLine: {
          show: false,
        },
        axisLabel: {
          color: techTheme.text.muted,
          fontSize: parseInt(techTheme.font.size.xs),
        },
        axisTick: {
          show: false,
        },
        splitLine: {
          lineStyle: {
            color: techTheme.border.color,
            width: 1,
            type: 'dashed',
          },
        },
      },
      series: [
        {
          data: data.map((d, index) => ({
            value: d.value,
            itemStyle: {
              color: hoveredIndex === index ? mainColor : mainColor,
              shadowBlur: hoveredIndex === index ? 20 : 10,
              shadowColor: mainColor,
            },
          })),
          type: type,
          smooth: smooth,
          symbol: 'circle',
          symbolSize: (data: any, params: any) => {
            return params.dataIndex === hoveredIndex ? 10 : 6;
          },
          itemStyle: {
            color: mainColor,
            borderColor: techTheme.background.card,
            borderWidth: 2,
            shadowBlur: 10,
            shadowColor: mainColor,
          },
          lineStyle: {
            width: 3,
            color: mainColor,
            shadowBlur: 15,
            shadowColor: mainColor,
          },
          areaStyle: showArea ? {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: areaColor },
              { offset: 0.5, color: `${areaColor.replace('0.3', '0.1')}` },
              { offset: 1, color: `${areaColor.replace('0.3', '0.02')}` },
            ]),
          } : undefined,
          barWidth: type === 'bar' ? '40%' : undefined,
          barBorderRadius: type === 'bar' ? [4, 4, 0, 0] : undefined,
          animationDuration: 1500,
          animationEasing: 'cubicOut',
          animationDurationUpdate: 1000,
          animationDelay: (idx: number) => idx * 50,
        },
      ],
    };
  };

  const onEvents = {
    hover: (params: any) => {
      setHoveredIndex(params.dataIndex);
    },
    mouseout: () => {
      setHoveredIndex(null);
    },
  };

  return (
    <div style={cardStyle}>
      <ReactECharts
        option={getOption()}
        style={{ height, width: '100%' }}
        onEvents={onEvents}
        notMerge={true}
        lazyUpdate={false}
      />
    </div>
  );
}
