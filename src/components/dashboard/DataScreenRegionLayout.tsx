'use client';

import React, { useState, useEffect } from 'react';
import { DS_COLORS, useRegionViewData } from './DataScreenShell';

function LiveClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const dateStr = now.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' });
  const timeStr = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.2 }}>
      <span style={{ fontSize: 10, color: DS_COLORS.muted, letterSpacing: '0.04em' }}>{dateStr}</span>
      <span style={{ fontSize: 16, fontWeight: 700, color: DS_COLORS.primary, fontVariantNumeric: 'tabular-nums', letterSpacing: '0.06em' }}>{timeStr}</span>
    </div>
  );
}
import { DataScreenKPIBar } from './DataScreenKPIBar';
import { DataScreenLeftCharts } from './DataScreenLeftCharts';
import { DataScreenFunnelChart } from './DataScreenFunnelChart';
import { DataScreenProjectCarousel } from './DataScreenProjectCarousel';
import { DataScreenSubsidiaryChart } from './DataScreenSubsidiaryChart';
import { DataScreenRegionMap } from './DataScreenRegionMap';
import { DataScreenPersonnelLayout } from './DataScreenPersonnelLayout';

function useScreenW() {
  const [w, setW] = useState(1920);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    setW(window.innerWidth);
    const h = () => setW(window.innerWidth);
    window.addEventListener('resize', h, { passive: true });
    return () => window.removeEventListener('resize', h);
  }, []);
  return w;
}

type TabId = 'region' | 'person' | 'solution';

export function DataScreenRegionLayout() {
  const [activeTab, setActiveTab] = useState<TabId>('region');
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const { data, loading, error } = useRegionViewData(activeTab === 'region' ? selectedRegion : null);
  const sw = useScreenW();
  const compact = sw < 1280;

  return (
    <div
      data-testid="data-screen-region-layout"
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        padding: '14px 18px 18px',
        gap: 8,
        overflow: compact ? 'auto' : 'hidden',
        boxSizing: 'border-box',
      }}
    >
      {/* Top bar: LiveClock + Tabs + Status (single row) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'stretch',
          height: 44,
          flexShrink: 0,
          borderBottom: '1px solid ' + DS_COLORS.border,
        }}
      >
        {/* Left: clock */}
        <div style={{ display: 'flex', alignItems: 'center', paddingRight: 20, flexShrink: 0 }}>
          <LiveClock />
        </div>

        {/* Center: tabs */}
        <div style={{ display: 'flex', flex: 1, alignItems: 'stretch' }}>
          {[
            { id: 'region'   as TabId, label: '区域大屏',    enabled: true },
            { id: 'person'   as TabId, label: '人员大屏',    enabled: true },
            { id: 'solution' as TabId, label: '解决方案大屏', enabled: false },
          ].map(tab => (
            <div
              key={tab.id}
              title={tab.enabled ? undefined : '即将上线'}
              onClick={() => tab.enabled && setActiveTab(tab.id)}
              style={{
                padding: '0 20px',
                display: 'flex',
                alignItems: 'center',
                fontSize: 13,
                fontWeight: activeTab === tab.id ? 600 : 400,
                color: activeTab === tab.id ? DS_COLORS.primary : (tab.enabled ? DS_COLORS.text : DS_COLORS.muted),
                borderBottom: activeTab === tab.id
                  ? '2px solid ' + DS_COLORS.primary
                  : '2px solid transparent',
                marginBottom: -1,
                cursor: tab.enabled ? 'pointer' : 'not-allowed',
                opacity: tab.enabled ? 1 : 0.45,
                userSelect: 'none',
                letterSpacing: '0.04em',
                transition: 'color 0.15s',
              }}
            >
              {tab.label}
            </div>
          ))}
        </div>

        {/* Right: status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          {activeTab === 'region' && selectedRegion && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, color: DS_COLORS.muted }}>当前区域:</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: DS_COLORS.warning }}>{selectedRegion}</span>
              <button
                onClick={() => setSelectedRegion(null)}
                style={{
                  fontSize: 9,
                  padding: '1px 6px',
                  border: '1px solid ' + DS_COLORS.border,
                  borderRadius: 3,
                  background: 'transparent',
                  color: DS_COLORS.muted,
                  cursor: 'pointer',
                }}
              >
                清除
              </button>
            </div>
          )}
          {activeTab === 'region' && loading && (
            <span style={{ fontSize: 10, color: DS_COLORS.muted }}>加载中...</span>
          )}
          {activeTab === 'region' && error && (
            <span style={{ fontSize: 10, color: DS_COLORS.danger }}>{error}</span>
          )}
        </div>
      </div>

      {/* KPI Bar — taller now that bottom row is gone */}
      <div data-testid="data-screen-kpi-bar" style={{ height: 104, flexShrink: 0, display: activeTab === 'region' ? undefined : 'none' }}>
        <DataScreenKPIBar data={data} loading={loading} />
      </div>

      {/* Personnel layout (tab = person) */}
      {activeTab === 'person' && (
        <DataScreenPersonnelLayout />
      )}

      {/* Main 3-column — fills all remaining space (region tab only) */}
      <div style={{ flex: compact ? 'none' : 1, display: activeTab === 'region' ? (compact ? 'flex' : 'flex') : 'none', flexDirection: compact ? 'column' : 'row', gap: 8, minHeight: compact ? undefined : 0 }}>
        {/* Left column */}
        <div style={{ width: compact ? '100%' : '22%', flexShrink: 0, height: compact ? 200 : undefined, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <DataScreenLeftCharts data={data} />
        </div>

        {/* Center map */}
        <div data-testid="data-screen-region-map-stage" style={{ flex: compact ? 'none' : 1, height: compact ? 320 : undefined, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <DataScreenRegionMap
            data={data}
            selectedRegion={selectedRegion}
            onRegionChange={setSelectedRegion}
          />
        </div>

        {/* Right column */}
        <div
          style={{
            width: compact ? '100%' : '26%',
            height: compact ? 280 : undefined,
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            minHeight: 0,
          }}
        >
          <div style={{ flex: 2.2, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <DataScreenFunnelChart data={data} />
          </div>
          <div style={{ flex: 1.8, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <DataScreenProjectCarousel data={data} />
          </div>
          <div style={{ flex: 3, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <DataScreenSubsidiaryChart data={data} />
          </div>
        </div>
      </div>
    </div>
  );
}