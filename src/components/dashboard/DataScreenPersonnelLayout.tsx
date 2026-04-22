'use client';

import React, { useEffect, useState } from 'react';
import { DS_COLORS, DsPanel, DsSkeleton, usePersonnelViewData, usePersonnelDetailData, fmtWan } from './DataScreenShell';
import { DataScreenPersonnelGraph } from './DataScreenPersonnelGraph';
import { DataScreenPersonnelProfile } from './DataScreenPersonnelProfile';
import { DataScreenPersonnelLeft } from './DataScreenPersonnelLeft';
import type { PersonnelViewData } from '@/types/data-screen';

function useScreenW() {
  const [width, setWidth] = useState(1920);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setWidth(window.innerWidth);
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return width;
}

function useLiveTick() {
  const [now, setNow] = useState(() => new Date());
  const [pulse, setPulse] = useState(true);

  useEffect(() => {
    const id = window.setInterval(() => {
      setNow(new Date());
      setPulse(prev => !prev);
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  return { now, pulse };
}

// ── KPI card ──────────────────────────────────────────────────────────────
interface KpiCardProps {
  label: string;
  value: string | number;
  unit?: string;
  color?: string;
  loading?: boolean;
}

function toNumberValue(value: string | number) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function KpiCard({ label, value, unit, color, loading }: KpiCardProps) {
  const [displayValue, setDisplayValue] = useState(() => toNumberValue(value));

  useEffect(() => {
    if (loading) return;
    const target = toNumberValue(value);
    const start = displayValue;
    if (Math.abs(target - start) < 0.01) return;

    const duration = 500;
    const t0 = Date.now();
    const id = window.setInterval(() => {
      const p = Math.min((Date.now() - t0) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplayValue(start + (target - start) * eased);
      if (p >= 1) window.clearInterval(id);
    }, 16);

    return () => window.clearInterval(id);
  }, [value, loading]);

  const stableTarget = toNumberValue(value);
  const isInteger = Number.isInteger(stableTarget);
  const shownValue = isInteger ? Math.round(displayValue) : displayValue.toFixed(1);

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '6px 8px',
      background: 'rgba(10,20,40,0.82)',
      border: '1px solid ' + DS_COLORS.border,
      borderRadius: 6,
      boxShadow: '0 0 16px rgba(0,212,255,0.07)',
      minWidth: 0,
      gap: 2,
    }}>
      {loading ? <DsSkeleton /> : (
        <>
          <span style={{ fontSize: 10, color: DS_COLORS.muted, letterSpacing: '0.03em', textAlign: 'center' }}>{label}</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
            <span style={{
              fontSize: 20,
              fontWeight: 800,
              color: color ?? DS_COLORS.primary,
              fontVariantNumeric: 'tabular-nums',
              lineHeight: 1.1,
              textShadow: '0 0 12px ' + (color ?? DS_COLORS.primary) + '99',
            }}>
              {shownValue}
            </span>
            {unit && <span style={{ fontSize: 10, color: DS_COLORS.muted }}>{unit}</span>}
          </div>
        </>
      )}
    </div>
  );
}

function PersonnelKpiBar({ data, loading }: { data: PersonnelViewData | null; loading: boolean }) {
  const kpi = data?.kpi;
  const { now, pulse } = useLiveTick();

  const timeText = now.toLocaleTimeString('zh-CN', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  });

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, minHeight: 16 }}>
        <span style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: DS_COLORS.success,
          boxShadow: '0 0 10px ' + DS_COLORS.success,
          opacity: pulse ? 1 : 0.35,
          transition: 'opacity 220ms ease',
        }} />
        <span style={{ fontSize: 10, color: DS_COLORS.muted }}>实时更新</span>
        <span style={{ fontSize: 11, color: DS_COLORS.primary, fontVariantNumeric: 'tabular-nums' }}>{timeText}</span>
      </div>
      <div style={{
        display: 'flex',
        gap: 8,
        height: '100%',
        alignItems: 'stretch',
      }}>
        <KpiCard label="解决方案工程师" value={kpi?.solutionEngineerCount ?? 0} unit="人" color={DS_COLORS.secondary} loading={loading} />
        <KpiCard label="总部售前工程师" value={kpi?.hqPresalesCount ?? 0} unit="人" color={DS_COLORS.primary} loading={loading} />
        <KpiCard label="区域售前工程师" value={kpi?.regionalPresalesCount ?? 0} unit="人" color={DS_COLORS.success} loading={loading} />
        <KpiCard label="商务支撑" value={kpi?.businessSupportCount ?? 0} unit="人" color={DS_COLORS.muted} loading={loading} />
        <div style={{ width: 1, background: DS_COLORS.border, alignSelf: 'stretch' }} />
        <KpiCard label="总部人均产值" value={kpi ? fmtWan(kpi.hqPerCapitaOutput) : 0} unit="万" color={DS_COLORS.primary} loading={loading} />
        <KpiCard label="区域人均产值" value={kpi ? fmtWan(kpi.regionalPerCapitaOutput) : 0} unit="万" color={DS_COLORS.success} loading={loading} />
        <KpiCard label="总部人均项目数" value={kpi?.hqPerCapitaProjects ?? 0} unit="个" color={DS_COLORS.warning} loading={loading} />
        <KpiCard label="区域人均项目数" value={kpi?.regionalPerCapitaProjects ?? 0} unit="个" color={DS_COLORS.warning} loading={loading} />
      </div>
    </div>
  );
}

// ── Main layout ───────────────────────────────────────────────────────────
export function DataScreenPersonnelLayout() {
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  // Main data (graph, KPI, lists) — always fetched without a userId so clicking a
  // person node does NOT trigger a full re-fetch that clears the graph/KPI.
  const { data, loading, error } = usePersonnelViewData(null);
  // Person detail — only re-fetches when a node is clicked; isolated loading state.
  const { detail: personDetail, loading: detailLoading } = usePersonnelDetailData(selectedUserId);
  const screenWidth = useScreenW();
  const compact = screenWidth < 1280;

  const graphNodes = data?.graphData?.nodes ?? [];
  const graphEdges = data?.graphData?.edges ?? [];

  return (
    <div
      data-testid="data-screen-personnel-layout"
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        padding: '8px 18px 18px',
        gap: 8,
        overflow: compact ? 'auto' : 'hidden',
        boxSizing: 'border-box',
      }}
    >
      {error && (
        <div style={{ fontSize: 10, color: DS_COLORS.danger, textAlign: 'center', padding: '4px 0' }}>
          {error}
        </div>
      )}

      {/* KPI bar */}
      <div style={{ height: 104, flexShrink: 0 }}>
        <PersonnelKpiBar data={data} loading={loading} />
      </div>

      {/* Main 3-column */}
      <div style={{ flex: compact ? 'none' : 1, display: 'flex', flexDirection: compact ? 'column' : 'row', gap: 8, minHeight: compact ? undefined : 0 }}>
        {/* Left: 3 charts */}
        <div style={{ width: compact ? '100%' : '22%', height: compact ? 420 : undefined, flexShrink: 0, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <DataScreenPersonnelLeft
            data={data}
            loading={loading}
            detail={personDetail}
            detailLoading={detailLoading}
            selectedUserId={selectedUserId}
          />
        </div>

        {/* Center: relationship graph */}
        <div style={{ flex: compact ? 'none' : 1, height: compact ? 420 : undefined, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <DataScreenPersonnelGraph
            nodes={graphNodes}
            edges={graphEdges}
            loading={loading}
            selectedUserId={selectedUserId}
            onPersonSelect={setSelectedUserId}
          />
        </div>

        {/* Right: person profile */}
        <div style={{ width: compact ? '100%' : '24%', height: compact ? 520 : undefined, flexShrink: 0, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <DataScreenPersonnelProfile
            detail={personDetail}
            overview={data}
            loading={detailLoading}
          />
        </div>
      </div>
    </div>
  );
}
