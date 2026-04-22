import React, { useEffect, useRef, useState } from 'react';
import { DS_COLORS, fmtWan, fmtNum } from './DataScreenShell';
import type { RegionViewData, KpiTrendEntry } from '@/types/data-screen';

interface Props { data: RegionViewData | null; loading?: boolean }

interface KpiCard {
  key:      keyof RegionViewData['kpi'];
  trendKey?: keyof NonNullable<RegionViewData['kpiTrend']>;
  label:    string;
  suffix:   string;
  color:    string;
  fmt:      'wan' | 'num' | 'pct';
  subKey?:  keyof RegionViewData['kpi'];
  subLabel?: string;
  subFmt?:  'wan' | 'num';
}

const CARDS: KpiCard[] = [
  { key: 'totalCustomers',    trendKey: 'totalCustomers',  label: '客户数',    suffix: '家',   color: DS_COLORS.primary,   fmt: 'num' },
  { key: 'totalProjects',     trendKey: 'totalProjects',   label: '项目数',    suffix: '个',   color: DS_COLORS.success,   fmt: 'num', subKey: 'activeProjectCount', subLabel: '个活跃', subFmt: 'num' },
  { key: 'opportunityAmount',                              label: '商机储备',  suffix: '万元', color: DS_COLORS.warning,   fmt: 'wan', subKey: 'opportunityCount', subLabel: '个项目', subFmt: 'num' },
  { key: 'wonAmount',         trendKey: 'wonAmount',       label: '中标金额',  suffix: '万元', color: DS_COLORS.accent,    fmt: 'wan', subKey: 'wonCount',         subLabel: '个中标', subFmt: 'num' },
  { key: 'totalContracts',                                 label: '已签合同',  suffix: '个',   color: DS_COLORS.secondary, fmt: 'num' },
  { key: 'contractAmount',                                 label: '合同金额',  suffix: '万元', color: DS_COLORS.primary,   fmt: 'wan', subKey: 'contractAmountAvg', subLabel: '均', subFmt: 'wan' },
  { key: 'presalesHours',     trendKey: 'presalesHours',   label: '售前工时',  suffix: 'h',    color: DS_COLORS.success,   fmt: 'num', subKey: 'presalesHeadcount', subLabel: '人次', subFmt: 'num' },
  { key: 'winRate',           trendKey: 'winRate',         label: '中标率',    suffix: '%',    color: DS_COLORS.warning,   fmt: 'pct' },
];

function TrendBadge({ trend, fmt }: { trend: KpiTrendEntry; fmt: 'wan' | 'num' | 'pct' }) {
  if (trend.dir === 'flat') return null;
  const up     = trend.dir === 'up';
  const color  = up ? DS_COLORS.success : DS_COLORS.danger;
  const arrow  = up ? '↑' : '↓';
  const abs    = Math.abs(trend.delta);
  let label: string;
  if (fmt === 'wan')      label = abs.toFixed(0) + '万';
  else if (fmt === 'pct') label = abs.toFixed(1) + '%';
  else                    label = String(abs);
  return (
    <div style={{ fontSize: 11, color, display: 'flex', alignItems: 'center', gap: 2, marginTop: 2, fontWeight: 700 }}>
      <span>{arrow}</span>
      <span>{label}</span>
      <span style={{ color: DS_COLORS.muted, fontSize: 9, fontWeight: 400 }}>本月</span>
    </div>
  );
}

/** Per-card component so each card maintains its own animation state */
function KpiCardItem({ card, data, loading }: { card: KpiCard; data: RegionViewData | null; loading?: boolean }) {
  const raw      = data?.kpi?.[card.key];
  const targetN  = raw !== undefined && raw !== null ? Number(raw) : NaN;
  const [displayN, setDisplayN] = useState(0);
  const startRef = useRef(0);
  const rafRef   = useRef(0);

  useEffect(() => {
    if (loading || isNaN(targetN)) return;
    cancelAnimationFrame(rafRef.current);
    const startVal = startRef.current;
    const endVal   = targetN;
    const t0       = Date.now();
    const DURATION = 600;
    const tick = () => {
      const p      = Math.min((Date.now() - t0) / DURATION, 1);
      const eased  = 1 - Math.pow(1 - p, 4); // easeOutQuart
      const cur    = startVal + (endVal - startVal) * eased;
      setDisplayN(cur);
      if (p < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        startRef.current = endVal;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafRef.current);
      startRef.current = endVal;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetN, loading]);

  let display = '--';
  if (!loading && !isNaN(targetN)) {
    if (card.fmt === 'wan')      display = fmtWan(displayN);
    else if (card.fmt === 'pct') display = displayN.toFixed(1);
    else                         display = fmtNum(Math.round(displayN));
  }

  return (
    <div
      data-testid={`data-screen-kpi-${card.key}`}
      style={{
        flex: 1,
        background: 'rgba(10,20,40,0.90)',
        border: '1px solid ' + card.color + '44',
        borderTop: '2px solid ' + card.color,
        borderRadius: 6,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '5px 4px',
        minWidth: 0,
        position: 'relative',
        overflow: 'hidden',
        boxShadow: `0 0 18px ${card.color}22, inset 0 1px 0 ${card.color}22`,
        animation: 'ds-kpi-border-pulse 3s ease-in-out infinite',
      }}
    >
      {/* animated corner accent */}
      <span style={{
        position: 'absolute', top: 0, left: 0, width: 12, height: 12,
        borderTop: '2px solid ' + card.color,
        borderLeft: '2px solid ' + card.color,
        borderRadius: '6px 0 0 0',
      }} />
      <span style={{
        position: 'absolute', bottom: 0, right: 0, width: 12, height: 12,
        borderBottom: '2px solid ' + card.color + '88',
        borderRight: '2px solid ' + card.color + '88',
        borderRadius: '0 0 6px 0',
      }} />
      {/* scan line */}
      <span style={{
        position: 'absolute', left: 0, right: 0, height: 1,
        background: `linear-gradient(90deg, transparent, ${card.color}66, transparent)`,
        animation: 'ds-kpi-scan 2.4s ease-in-out infinite',
        top: 0,
      }} />

      <div style={{ fontSize: 11, color: DS_COLORS.muted, fontWeight: 600, marginBottom: 3, whiteSpace: 'nowrap', letterSpacing: '0.04em' }}>
        {card.label}
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, color: card.color, lineHeight: 1, letterSpacing: '0.03em', fontVariantNumeric: 'tabular-nums', textShadow: `0 0 14px ${card.color}99, 0 0 28px ${card.color}33` }}>
        {loading ? (
          <span style={{ fontSize: 16, animation: 'ds-kpi-blink 1s linear infinite', opacity: 0.6 }}>···</span>
        ) : display}
      </div>
      <div style={{ fontSize: 10, color: card.color + 'aa', marginTop: 2, fontWeight: 500 }}>
        {card.suffix}
      </div>
      {!loading && card.trendKey && data?.kpiTrend?.[card.trendKey] && (
        <TrendBadge trend={data.kpiTrend[card.trendKey]!} fmt={card.fmt} />
      )}
      {!loading && card.subKey && data?.kpi?.[card.subKey] !== undefined && (
        <div style={{ fontSize: 9, color: DS_COLORS.muted, marginTop: 1 }}>
          {card.subFmt === 'wan'
            ? fmtWan(Number(data.kpi[card.subKey]))
            : fmtNum(Number(data.kpi[card.subKey]))
          } {card.subLabel}
        </div>
      )}
    </div>
  );
}

export function DataScreenKPIBar({ data, loading }: Props) {
  return (
    <>
      <style>{`
        @keyframes ds-kpi-scan {
          0%   { top: 0%;   opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        @keyframes ds-kpi-blink {
          0%, 100% { opacity: 0.3; }
          50%       { opacity: 1; }
        }
        @keyframes ds-kpi-border-pulse {
          0%, 100% { box-shadow: 0 0 12px rgba(0,212,255,0.12), inset 0 1px 0 rgba(0,212,255,0.1); }
          50%       { box-shadow: 0 0 24px rgba(0,212,255,0.28), inset 0 1px 0 rgba(0,212,255,0.18); }
        }
      `}</style>
      <div
        style={{
          display: 'flex',
          gap: 6,
          padding: '4px 0',
          height: '100%',
          alignItems: 'stretch',
        }}
      >
        {CARDS.map(card => (
          <KpiCardItem key={card.key} card={card} data={data} loading={loading} />
        ))}
      </div>
    </>
  );
}