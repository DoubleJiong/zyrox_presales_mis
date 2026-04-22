'use client';

import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { DS_COLORS, DS_TOOLTIP, DsPanel, DsSkeleton } from './DataScreenShell';
import type { RegionViewData } from '@/types/data-screen';

interface Props { data: RegionViewData | null }

const STAGE_COLORS_5 = ['#00d4ff', '#00aadd', '#0088bb', '#006699', '#004477'];

export function DataScreenFunnelChart({ data }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current || !data) return;
    const chart = echarts.init(ref.current, 'dark');
    chart.getDom().style.background = 'transparent';

    const fd = data?.funnelData;
    const labels  = fd?.stages  ?? [];
    const counts  = fd?.counts  ?? [];
    const amounts = fd?.amounts ?? [];
    const rates   = fd?.rates   ?? [];

    const maxCount  = Math.max(...counts,  1);
    const maxAmount = Math.max(...amounts, 1);
    const maxRate   = 100;

    function makeSeries(
      name: string,
      vals: number[],
      maxVal: number,
      suffix: string,
      align: 'left' | 'center' | 'right',
      left: string,
      width: string,
    ) {
      return {
        type: 'funnel',
        name,
        left,
        width,
        top: 30,
        bottom: 10,
        funnelAlign: align,
        max: maxVal,
        sort: 'none',
        gap: 3,
        label: {
          show: true,
          position: 'inside',
          fontSize: 12,
          fontWeight: 700,
          color: '#fff',
          formatter: (p: { value: number }) => p.value + suffix,
        },
        itemStyle: { borderWidth: 0 },
        emphasis: { label: { fontSize: 12 } },
        data: vals.map((v, i) => ({
          name: labels[i] ?? String(i),
          value: v,
          itemStyle: { color: STAGE_COLORS_5[i % STAGE_COLORS_5.length] },
        })),
      };
    }

    // Stage label column: graphic text elements aligned vertically to each funnel layer
    const stageCount = labels.length;
    const stageLabelGraphics = labels.map((lbl, i) => {
      // series top:30, bottom:10 — approximate each layer's vertical midpoint as a % of chart height
      const topPct = 30;
      const step   = (100 - topPct - 8) / Math.max(stageCount, 1);
      const midPct = topPct + step * i + step / 2;
      return {
        type: 'text',
        left: '0.5%',
        top: midPct + '%',
        style: {
          text: lbl,
          fill: DS_COLORS.muted,
          fontSize: 10,
          fontWeight: 500,
        },
      };
    });

    chart.setOption({
      animation: true,
      animationEasing: 'cubicOut',
      animationDuration: 900,
      animationDelay: (idx: number) => idx * 120,
      backgroundColor: 'transparent',
      legend: {
        data: ['数量', '金额(万)', '转化率(%)'],
        top: 4,
        textStyle: { color: DS_COLORS.muted, fontSize: 11 },
        icon: 'rect',
        itemWidth: 10,
        itemHeight: 6,
      },
      tooltip: {
        trigger: 'item',
        ...DS_TOOLTIP,
        formatter: (p: { seriesName: string; name: string; value: number }) =>
          p.name + '<br/>' + p.seriesName + ': ' + p.value,
      },
      graphic: stageLabelGraphics,
      series: [
        makeSeries('数量',      counts,  maxCount,  '个', 'left',   '20%', '24%'),
        makeSeries('金额(万)',  amounts, maxAmount, '万', 'center', '48%', '24%'),
        makeSeries('转化率(%)', rates,   maxRate,   '%',  'right',  '76%', '22%'),
      ],
    });

    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(ref.current!);
    return () => { ro.disconnect(); chart.dispose(); };
  }, [data]);

  return (
    <DsPanel title="阶段漏斗分析">
      {!data ? <DsSkeleton /> : <div ref={ref} style={{ width: '100%', height: '100%' }} />}
    </DsPanel>
  );
}