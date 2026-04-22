'use client';

import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { DS_COLORS, DS_TOOLTIP, DsPanel, DsSkeleton, STAGE_LABEL, STAGE_GROUP_COLORS, STAGE_GROUPS, INDUSTRY_LABEL } from './DataScreenShell';
import type { RegionViewData } from '@/types/data-screen';

interface Props { data: RegionViewData | null }

/* ─── L1 Stage Donut ─────────────────────────── */
export function DataScreenStageDonut({ data }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current || !data) return;
    const chart = echarts.init(ref.current, 'dark');
    chart.getDom().style.background = 'transparent';

    const raw = data?.stageDistribution ?? [];
    const pieData = raw.map(d => ({
      name: STAGE_LABEL[d.stage] ?? d.stage,
      value: d.count,
      itemStyle: { color: STAGE_GROUP_COLORS[STAGE_GROUPS[d.stage] ?? ''] ?? DS_COLORS.muted },
    }));
    const total = pieData.reduce((s, d) => s + Number(d.value), 0);

    chart.setOption({
      animation: true,
      animationType: 'scale',
      animationEasing: 'elasticOut',
      animationDuration: 900,
      backgroundColor: 'transparent',
      tooltip: { trigger: 'item', ...DS_TOOLTIP, formatter: '{b}: {c} ({d}%)' },
      graphic: [
        {
          type: 'text',
          left: 'center',
          top: 'middle',
          style: { text: String(total), fill: DS_COLORS.text, fontSize: 24, fontWeight: 800, textShadow: '0 0 12px rgba(0,212,255,0.6)' },
        },
        {
          type: 'text',
          left: 'center',
          top: '60%',
          style: { text: '项目总数', fill: DS_COLORS.muted, fontSize: 11 },
        },
      ],
      series: [{
        type: 'pie',
        radius: ['48%', '74%'],
        center: ['50%', '50%'],
        data: pieData,
        label: { show: true, formatter: '{b}\n{d}%', color: DS_COLORS.muted, fontSize: 10 },
        labelLine: { lineStyle: { color: DS_COLORS.border } },
        emphasis: {
          label: { show: true, fontSize: 14, fontWeight: 700 },
          itemStyle: { shadowBlur: 16, shadowColor: 'rgba(0,212,255,0.5)' },
        },
      }],
    });
    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(ref.current!);
    return () => { ro.disconnect(); chart.dispose(); };
  }, [data]);
  return <DsPanel title="项目阶段分布">{!data ? <DsSkeleton /> : <div ref={ref} style={{ width: '100%', height: '100%' }} />}</DsPanel>;
}

/* ─── L2 Industry Bar ────────────────────────── */
export function DataScreenIndustryBar({ data }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current || !data) return;
    const chart = echarts.init(ref.current, 'dark');
    chart.getDom().style.background = 'transparent';

    const raw = (data?.customerTypeDistribution ?? []).slice(0, 8);
    const labels = raw.map(d => d.customerType);
    const counts = raw.map(d => d.count);
    const maxCount = Math.max(...counts, 1);

    chart.setOption({
      animation: true,
      animationEasing: 'cubicOut',
      animationDuration: 800,
      animationDelay: (idx: number) => idx * 60,
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', ...DS_TOOLTIP },
      grid: { left: 64, right: 36, top: 8, bottom: 24 },
      xAxis: { type: 'value', splitLine: { lineStyle: { color: DS_COLORS.border } }, axisLabel: { color: DS_COLORS.muted, fontSize: 11 } },
      yAxis: { type: 'category', data: labels, axisLabel: { color: DS_COLORS.text, fontSize: 11 }, inverse: true },
      series: [{
        type: 'bar',
        data: counts.map((v, i) => ({
          value: v,
          itemStyle: {
            borderRadius: [0, 6, 6, 0],
            color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
              { offset: 0, color: '#0d3b66' },
              { offset: 1, color: DS_COLORS.primary },
            ]),
            // brighter color for top item
            ...(i === 0 ? { shadowBlur: 8, shadowColor: DS_COLORS.primary } : {}),
          },
        })),
        barMaxWidth: 14,
        label: {
          show: true, position: 'right',
          color: DS_COLORS.muted, fontSize: 11,
          formatter: (p: { value: number }) =>
            `${p.value} (${Math.round((p.value / maxCount) * 100)}%)`,
        },
      }],
    });
    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(ref.current!);
    return () => { ro.disconnect(); chart.dispose(); };
  }, [data]);
  return <DsPanel title="客户类型分布">{!data ? <DsSkeleton /> : <div ref={ref} style={{ width: '100%', height: '100%' }} />}</DsPanel>;
}

/* ─── L3 Project Type Scatter ────────────────── */
const SCATTER_PALETTE = ['#00d4ff', '#00ff88', '#ffcc00', '#ff006e', '#b24bf3', '#ff0055'];

export function DataScreenProjectTypeScatter({ data }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current || !data) return;
    const chart = echarts.init(ref.current, 'dark');
    chart.getDom().style.background = 'transparent';

    const raw = data?.projectTypeScatter ?? [];
    // value: [项目数, 商机金额(万), 均合同(万)]
    const scatter = raw.map((d, i) => ({
      name: d.projectTypeName ?? d.projectType,
      value: [d.count, d.totalAmount, d.avgContractAmount],
      itemStyle: {
        color: SCATTER_PALETTE[i % SCATTER_PALETTE.length],
        shadowBlur: 12,
        shadowColor: SCATTER_PALETTE[i % SCATTER_PALETTE.length] + '88',
      },
    }));

    chart.setOption({
      animation: true,
      animationEasing: 'elasticOut',
      animationDuration: 1000,
      animationDelay: (idx: number) => idx * 80,
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        ...DS_TOOLTIP,
        formatter: (p: { value: number[]; name?: string }) =>
          (p.name ?? '') +
          '<br/>项目数: ' + p.value[0] + '个  商机: ' + p.value[1] + '万  均合同: ' + p.value[2] + '万',
      },
      grid: { left: 52, right: 12, top: 16, bottom: 28 },
      xAxis: {
        type: 'value', name: '项目数',
        nameTextStyle: { color: DS_COLORS.muted, fontSize: 11 },
        splitLine: { lineStyle: { color: DS_COLORS.border } },
        axisLabel: { color: DS_COLORS.muted, fontSize: 10 },
        minInterval: 1,
      },
      yAxis: {
        type: 'value', name: '商机(万)',
        nameTextStyle: { color: DS_COLORS.muted, fontSize: 11 },
        splitLine: { lineStyle: { color: DS_COLORS.border } },
        axisLabel: { color: DS_COLORS.muted, fontSize: 10 },
      },
      series: [{
        type: 'scatter',
        data: scatter,
        symbolSize: (val: number[]) => Math.min(36, 10 + Math.sqrt(Number(val[0])) * 5),
        label: {
          show: true,
          formatter: (p: { name?: string }) => p.name ?? '',
          position: 'top', color: DS_COLORS.muted, fontSize: 10,
        },
      }],
    });
    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(ref.current!);
    return () => { ro.disconnect(); chart.dispose(); };
  }, [data]);
  return <DsPanel title="项目类型分布">{!data ? <DsSkeleton /> : <div ref={ref} style={{ width: '100%', height: '100%' }} />}</DsPanel>;
}

/* ─── Combined Left Panel ────────────────────── */
export function DataScreenLeftCharts({ data }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 8 }}>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}><DataScreenStageDonut data={data} /></div>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}><DataScreenIndustryBar data={data} /></div>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}><DataScreenProjectTypeScatter data={data} /></div>
    </div>
  );
}