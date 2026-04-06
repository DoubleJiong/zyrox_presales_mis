'use client';

import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { techTheme } from '@/lib/tech-theme';

interface PieChartData {
  label: string;
  value: number;
  color: string;
}

interface TechPieChartProps {
  data: PieChartData[];
  total?: number;
  showLegend?: boolean;
  showTooltip?: boolean;
  innerRadius?: number;
  outerRadius?: number;
  height?: string;
}

export function TechPieChart({
  data,
  total,
  showLegend = true,
  showTooltip = true,
  innerRadius = 50,
  outerRadius = 70,
  height = '100%',
}: TechPieChartProps) {
  const totalValue = total ?? data.reduce((sum, item) => sum + item.value, 0);

  const option = useMemo(() => {
    return {
      backgroundColor: 'transparent',
      tooltip: showTooltip
        ? {
            trigger: 'item',
            backgroundColor: `${techTheme.background.card}98`,
            borderColor: techTheme.colors.primary,
            borderWidth: 2,
            padding: [12, 16],
            textStyle: {
              color: techTheme.text.primary,
              fontSize: parseInt(techTheme.font.size.sm),
            },
            formatter: (params: any) => {
              const percent = ((params.value / totalValue) * 100).toFixed(1);
              return `
                <div style="padding: 4px;">
                  <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                    <div style="width: 10px; height: 10px; border-radius: 50%; background: ${params.color}; box-shadow: 0 0 10px ${params.color}80;"></div>
                    <span style="color: ${techTheme.text.primary}; font-weight: 600; font-size: 14px;">${params.name}</span>
                  </div>
                  <div style="color: ${techTheme.text.secondary}; font-size: 12px;">
                    数量: <span style="color: ${params.color}; font-weight: 600;">${params.value}</span>
                  </div>
                  <div style="color: ${techTheme.text.secondary}; font-size: 12px;">
                    占比: <span style="color: ${params.color}; font-weight: 600;">${percent}%</span>
                  </div>
                </div>
              `;
            },
          }
        : undefined,
      legend: showLegend
        ? {
            show: true,
            orient: 'vertical',
            right: '5%',
            top: 'center',
            textStyle: {
              color: techTheme.text.primary,
              fontSize: parseInt(techTheme.font.size.xs),
            },
            itemWidth: 12,
            itemHeight: 12,
            itemGap: 8,
            data: data.map((item) => item.label),
          }
        : { show: false },
      series: [
        {
          name: '',
          type: 'pie',
          radius: [`${innerRadius}%`, `${outerRadius}%`],
          center: showLegend ? ['35%', '50%'] : ['50%', '50%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 8,
            borderColor: techTheme.background.card,
            borderWidth: 2,
          },
          label: {
            show: !showLegend,
            position: 'outside',
            formatter: '{b}\n{d}%',
            color: techTheme.text.primary,
            fontSize: 12,
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 14,
              fontWeight: 'bold',
              color: techTheme.text.primary,
            },
            itemStyle: {
              shadowBlur: 20,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)',
              scale: true,
              scaleSize: 10,
            },
          },
          labelLine: {
            show: !showLegend,
            smooth: true,
            length: 15,
            length2: 10,
          },
          data: data.map((item) => ({
            name: item.label,
            value: item.value,
            itemStyle: {
              color: item.color,
              shadowBlur: 10,
              shadowColor: item.color,
            },
          })),
          animationType: 'expansion',
          animationEasing: 'cubicOut',
          animationDuration: 1500,
        },
      ],
    };
  }, [data, totalValue, showLegend, showTooltip, innerRadius, outerRadius]);

  return (
    <div style={{ width: '100%', height }}>
      <ReactECharts
        option={option}
        style={{ width: '100%', height: '100%' }}
        notMerge={true}
        lazyUpdate={false}
      />
    </div>
  );
}
