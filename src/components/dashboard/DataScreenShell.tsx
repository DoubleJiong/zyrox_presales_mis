'use client';

import { useEffect, useState, useCallback } from 'react';
import type { RegionViewData, PersonnelViewData } from '@/types/data-screen';

export const DS_COLORS = {
  primary:   '#00d4ff',
  secondary: '#b24bf3',
  success:   '#00ff88',
  warning:   '#ffcc00',
  danger:    '#ff0055',
  accent:    '#ff006e',
  bg:        '#0A0F1A',
  panel:     'rgba(10,15,26,0.85)',
  text:      '#e0e8f0',
  muted:     '#6b8099',
  border:    'rgba(0,212,255,0.2)',
  chartColors: ['#00d4ff','#00ff88','#ffcc00','#ff006e','#b24bf3','#ff0055','#00ccaa','#ff9900'],
} as const;

/** Shared ECharts tooltip style — dark panel matching DS design */
export const DS_TOOLTIP = {
  backgroundColor: 'rgba(10,20,40,0.92)',
  borderColor: DS_COLORS.border,
  textStyle: { color: DS_COLORS.text, fontSize: 12 },
};

export const STAGE_LABEL: Record<string, string> = {
  opportunity:          '商机储备',
  bidding_pending:      '投标立项',
  bidding:              '招标投标',
  solution_review:      '方案评审',
  contract_pending:     '合同待签',
  delivery_preparing:   '交付准备',
  delivering:           '交付中',
  settlement:           '结算',
  archived:             '已归档',
  cancelled:            '已取消',
  suspended:            '已暂停',
};

export const STAGE_GROUPS: Record<string, string> = {
  opportunity:          '商机',
  bidding_pending:      '投标',
  bidding:              '投标',
  solution_review:      '投标',
  contract_pending:     '执行',
  delivery_preparing:   '执行',
  delivering:           '执行',
  settlement:           '执行',
  archived:             '已结束',
  cancelled:            '异常',
  suspended:            '异常',
};

export const STAGE_GROUP_COLORS: Record<string, string> = {
  '商机':   '#00d4ff',
  '投标':   '#b24bf3',
  '执行':   '#00ff88',
  '已结束': '#6b8099',
  '异常':   '#ff0055',
};

export const INDUSTRY_LABEL: Record<string, string> = {
  education:      '教育',
  healthcare:     '医疗卫生',
  government:     '政务',
  finance:        '金融',
  transportation: '交通运输',
  energy:         '能源',
  manufacturing:  '制造业',
  retail:         '零售',
  other:          '其他',
};

export function useRegionViewData(region: string | null) {
  const [data, setData] = useState<RegionViewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = region ? '?region=' + encodeURIComponent(region) : '';
      const res = await fetch('/api/data-screen/region-view' + params);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const json = await res.json();
      setData(json.data ?? json);
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [region]);

  useEffect(() => { load(); }, [load]);

  return { data, loading, error, reload: load };
}

export function usePersonnelViewData(userId: number | null) {
  const [data, setData] = useState<PersonnelViewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = userId != null ? '?userId=' + userId : '';
      const res = await fetch('/api/data-screen/personnel-view' + params);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const json = await res.json();
      setData(json.data ?? json);
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  return { data, loading, error, reload: load };
}

/** Fetch only PersonDetail for a selected user — used by the profile panel so
 *  clicking a node does NOT trigger a full re-fetch that clears the graph/KPI. */
export function usePersonnelDetailData(userId: number | null) {
  const [detail, setDetail] = useState<import('@/types/data-screen').PersonDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userId === null) { setDetail(null); return; }
    let cancelled = false;
    setLoading(true);
    fetch('/api/data-screen/personnel-view?userId=' + userId)
      .then(r => r.json())
      .then(j => { if (!cancelled) setDetail((j.data ?? j)?.personDetail ?? null); })
      .catch(() => { if (!cancelled) setDetail(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [userId]);

  return { detail, loading };
}

interface DsPanelProps {
  title?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
  titleRight?: React.ReactNode;
}

export function DsPanel({ title, children, style, className, titleRight }: DsPanelProps) {
  return (
    <div
      className={className}
      style={{
        flex: 1,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'rgba(10,20,40,0.82)',
        border: '1px solid ' + DS_COLORS.border,
        borderRadius: 6,
        overflow: 'hidden',
        boxShadow: '0 0 28px rgba(0,212,255,0.09), inset 0 1px 0 rgba(0,212,255,0.12)',
        position: 'relative',
        ...style,
      }}
    >
      {title && (
        <div
          style={{
            padding: '6px 12px',
            borderBottom: '1px solid ' + DS_COLORS.border,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(0,212,255,0.04)',
          }}
        >
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: DS_COLORS.primary,
              letterSpacing: '0.05em',
              borderLeft: '3px solid ' + DS_COLORS.primary,
              paddingLeft: 8,
              textShadow: '0 0 8px rgba(0,212,255,0.45)',
            }}
          >
            {title}
          </span>
          {titleRight}
        </div>
      )}
      <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>{children}</div>
    </div>
  );
}

export function fmtWan(val: number | null | undefined): string {
  if (!val) return '0';
  if (val >= 10000) return (val / 10000).toFixed(1) + '亿';
  return val.toFixed(0) + '万';
}

export function fmtNum(val: number | null | undefined): string {
  if (!val) return '0';
  if (val >= 10000) return (val / 10000).toFixed(1) + '万';
  return String(val);
}

export function fmtPct(val: number | null | undefined): string {
  if (val == null) return '0%';
  return (val * 100).toFixed(1) + '%';
}

/** Pulsing skeleton placeholder for chart areas while data loads */
export function DsSkeleton() {
  return (
    <>
      <style>{`@keyframes ds-skeleton-shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
      <div style={{
        width: '100%',
        height: '100%',
        background: 'linear-gradient(90deg, rgba(10,22,40,0.5) 25%, rgba(26,58,92,0.55) 50%, rgba(10,22,40,0.5) 75%)',
        backgroundSize: '200% 100%',
        animation: 'ds-skeleton-shimmer 1.6s ease-in-out infinite',
        borderRadius: 4,
      }} />
    </>
  );
}