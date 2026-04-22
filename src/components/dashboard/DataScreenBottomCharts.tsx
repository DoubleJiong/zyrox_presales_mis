'use client';

import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { DS_COLORS, DS_TOOLTIP, DsPanel, DsSkeleton } from './DataScreenShell';
import type { RegionViewData } from '@/types/data-screen';

interface Props { data: RegionViewData | null }

/* ─── B1 Monthly Trend ───────────────────────── */
export function DataScreenMonthlyTrend({ data }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current || !data) return;
    const chart = echarts.init(ref.current, 'dark');
    chart.getDom().style.background = 'transparent';

    const raw     = data?.monthlyTrend ?? [];
    const months  = raw.map(d => d.month);
    const newProj = raw.map(d => d.newProjects ?? 0);
    const wonAmt  = raw.map(d => Number(d.wonAmount ?? 0));

    if (months.length < 2) {
      chart.setOption({
        animation: false, backgroundColor: 'transparent',
        graphic: [{ type: 'text', left: 'center', top: 'middle',
          style: { text: '暂无历史数据\n数据累积后自动展示', fill: DS_COLORS.muted, fontSize: 12, textAlign: 'center', lineHeight: 22 } }],
      }, { notMerge: true });
      return;
    }

    chart.setOption({
      animation: false,
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', ...DS_TOOLTIP },
      legend: {
        data: ['新增项目', '中标金额(万)'],
        top: 2,
        textStyle: { color: DS_COLORS.muted, fontSize: 10 },
        icon: 'rect',
        itemWidth: 10,
        itemHeight: 6,
      },
      grid: { left: 40, right: 52, top: 30, bottom: 24 },
      xAxis: {
        type: 'category',
        data: months,
        axisLabel: { color: DS_COLORS.muted, fontSize: 9, rotate: 30 },
        axisLine: { lineStyle: { color: DS_COLORS.border } },
      },
      yAxis: [
        {
          type: 'value',
          name: '项目数',
          nameTextStyle: { color: DS_COLORS.muted, fontSize: 9 },
          splitLine: { lineStyle: { color: DS_COLORS.border } },
          axisLabel: { color: DS_COLORS.muted, fontSize: 9 },
        },
        {
          type: 'value',
          name: '万元',
          nameTextStyle: { color: DS_COLORS.muted, fontSize: 9 },
          splitLine: { show: false },
          axisLabel: { color: DS_COLORS.muted, fontSize: 9 },
        },
      ],
      series: [
        {
          name: '新增项目',
          type: 'bar',
          data: newProj,
          yAxisIndex: 0,
          barMaxWidth: 14,
          itemStyle: {
            borderRadius: [2, 2, 0, 0],
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: DS_COLORS.primary },
              { offset: 1, color: '#0066aa' },
            ]),
          },
        },
        {
          name: '中标金额(万)',
          type: 'line',
          data: wonAmt,
          yAxisIndex: 1,
          smooth: true,
          lineStyle: { color: DS_COLORS.success, width: 2 },
          itemStyle: { color: DS_COLORS.success },
          areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: DS_COLORS.success + '55' }, { offset: 1, color: DS_COLORS.success + '00' }] } },
        },
      ],
    });

    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(ref.current!);
    return () => { ro.disconnect(); chart.dispose(); };
  }, [data]);

  return (
    <DsPanel title="月度项目趋势">
      {!data ? <DsSkeleton /> : <div ref={ref} style={{ width: '100%', height: '100%' }} />}
    </DsPanel>
  );
}

/* ─── B2 Presales Service ────────────────────── */
export function DataScreenPresalesService({ data }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current || !data) return;
    const chart = echarts.init(ref.current, 'dark');
    chart.getDom().style.background = 'transparent';

    // Pivot: Array<{month, serviceTypeName, hours}> -> per-month stacked bars
    const raw = data?.presalesService ?? [];

    // gather unique months and service types
    const monthSet = new Set<string>();
    const typeSet  = new Set<string>();
    for (const r of raw) { monthSet.add(r.month); typeSet.add(r.serviceTypeName); }
    const months = Array.from(monthSet).sort();
    const types  = Array.from(typeSet).sort();

    if (months.length < 2) {
      chart.setOption({
        animation: false, backgroundColor: 'transparent',
        graphic: [{ type: 'text', left: 'center', top: 'middle',
          style: { text: '暂无售前服务数据\n数据累积后自动展示', fill: DS_COLORS.muted, fontSize: 12, textAlign: 'center', lineHeight: 22 } }],
      }, { notMerge: true });
      return;
    }

    // pivot
    const lookup: Record<string, Record<string, number>> = {};
    for (const r of raw) {
      if (!lookup[r.month]) lookup[r.month] = {};
      lookup[r.month][r.serviceTypeName] = r.hours;
    }

    const seriesColors = ['#00d4ff', '#00ff88', '#ffcc00', '#ff006e', '#b24bf3', '#ff0055'];

    chart.setOption({
      animation: false,
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', ...DS_TOOLTIP, axisPointer: { type: 'shadow' } },
      legend: {
        data: types,
        top: 2,
        textStyle: { color: DS_COLORS.muted, fontSize: 10 },
        icon: 'rect',
        itemWidth: 10,
        itemHeight: 6,
      },
      grid: { left: 40, right: 16, top: 30, bottom: 24 },
      xAxis: {
        type: 'category',
        data: months,
        axisLabel: { color: DS_COLORS.muted, fontSize: 9, rotate: 30 },
        axisLine: { lineStyle: { color: DS_COLORS.border } },
      },
      yAxis: {
        type: 'value',
        name: 'h',
        nameTextStyle: { color: DS_COLORS.muted, fontSize: 9 },
        splitLine: { lineStyle: { color: DS_COLORS.border } },
        axisLabel: { color: DS_COLORS.muted, fontSize: 9 },
      },
      series: types.map((t, i) => ({
        name: t,
        type: 'bar' as const,
        stack: 'svc',
        data: months.map(m => lookup[m]?.[t] ?? 0),
        barMaxWidth: 20,
        itemStyle: { color: seriesColors[i % seriesColors.length] },
        emphasis: { focus: 'series' },
      })),
    });

    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(ref.current!);
    return () => { ro.disconnect(); chart.dispose(); };
  }, [data]);

  return (
    <DsPanel title="售前服务工时">
      {!data ? <DsSkeleton /> : <div ref={ref} style={{ width: '100%', height: '100%' }} />}
    </DsPanel>
  );
}

/* ─── Combined Bottom Charts ─────────────────── */
export function DataScreenBottomCharts({ data }: Props) {
  return (
    <div style={{ display: 'flex', height: '100%', gap: 8 }}>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}><DataScreenMonthlyTrend data={data} /></div>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}><DataScreenPresalesService data={data} /></div>
    </div>
  );
}