'use client';

import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { DS_COLORS, DS_TOOLTIP, DsPanel, DsSkeleton } from './DataScreenShell';
import type { RegionViewData } from '@/types/data-screen';

interface Props { data: RegionViewData | null }

export function DataScreenSubsidiaryChart({ data }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current || !data) return;
    const chart = echarts.init(ref.current, 'dark');
    chart.getDom().style.background = 'transparent';

    const raw = [...(data?.subsidiaryStats ?? [])].sort((a, b) => b.projectCount - a.projectCount);
    const names  = raw.map(d => d.subsidiaryName ?? '未知');
    const counts = raw.map(d => d.projectCount ?? 0);
    const wans   = raw.map(d => Number(d.wonAmount ?? 0).toFixed(0));

    chart.setOption({
      animation: true,
      animationEasing: 'cubicOut',
      animationDuration: 800,
      animationDelay: (idx: number) => idx * 40,
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        ...DS_TOOLTIP,
        axisPointer: { type: 'shadow' },
        formatter: (params: Array<{ name: string; value: number | string; seriesName: string }>) => {
          const p = params[0];
          const q = params[1];
          return (p?.name ?? '') +
            '<br/>项目数: ' + (p?.value ?? 0) +
            '个<br/>中标金额: ' + (q?.value ?? 0) + '万';
        },
      },
      legend: {
        data: ['项目数', '中标金额(万)'],
        bottom: 2,
        textStyle: { color: DS_COLORS.muted, fontSize: 11 },
        icon: 'rect',
        itemWidth: 10,
        itemHeight: 6,
      },
      grid: { left: 78, right: 52, top: 8, bottom: 28 },
      xAxis: [
        {
          type: 'value',
          name: '项目数',
          nameTextStyle: { color: DS_COLORS.muted, fontSize: 11 },
          splitLine: { lineStyle: { color: DS_COLORS.border } },
          axisLabel: { color: DS_COLORS.muted, fontSize: 10 },
        },
        {
          type: 'value',
          name: '万元',
          nameTextStyle: { color: DS_COLORS.muted, fontSize: 11 },
          splitLine: { show: false },
          axisLabel: { color: DS_COLORS.muted, fontSize: 10 },
        },
      ],
      yAxis: {
        type: 'category',
        data: names,
        axisLabel: { color: DS_COLORS.text, fontSize: 10 },
        inverse: false,
      },
      dataZoom: [
        {
          type: 'inside',
          orient: 'vertical',
          startValue: 0,
          endValue: 12,
        },
      ],
      series: [
        {
          name: '项目数',
          type: 'bar',
          xAxisIndex: 0,
          data: counts,
          barMaxWidth: 14,
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
              { offset: 0, color: '#0055aa' }, { offset: 1, color: DS_COLORS.primary },
            ]),
            borderRadius: [0, 4, 4, 0],
            shadowBlur: 6, shadowColor: DS_COLORS.primary + '44',
          },
          label: { show: true, position: 'right', color: DS_COLORS.muted, fontSize: 11 },
        },
        {
          name: '中标金额(万)',
          type: 'bar',
          xAxisIndex: 1,
          data: wans,
          barMaxWidth: 14,
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
              { offset: 0, color: '#004433' }, { offset: 1, color: DS_COLORS.success },
            ]),
            borderRadius: [0, 4, 4, 0],
          },
          label: { show: true, position: 'right', color: DS_COLORS.muted, fontSize: 10 },
        },
      ],
    });

    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(ref.current!);
    return () => { ro.disconnect(); chart.dispose(); };
  }, [data]);

  return (
    <DsPanel title="销售型分/子公司项目分布">
      {!data ? <DsSkeleton /> : <div ref={ref} style={{ width: '100%', height: '100%' }} />}
    </DsPanel>
  );
}