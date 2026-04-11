'use client';

import { techTheme } from '@/lib/tech-theme';
import { MapDataType, type MapRegionData } from '@/lib/map-types';

interface HeatmapTopRankProps {
  data: MapRegionData[];
  dataType: MapDataType;
  label: string;
  unit: string;
  onRegionClick?: (region: MapRegionData) => void;
}

type PreviewVariant = 'bars' | 'columns' | 'gauges';

const singleLineTextStyle = {
  whiteSpace: 'nowrap' as const,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  minWidth: 0,
};

const numberFormatter = new Intl.NumberFormat('zh-CN');

function getPreviewVariant(dataType: MapDataType): PreviewVariant {
  switch (dataType) {
    case MapDataType.BUDGET:
    case MapDataType.CONTRACT_AMOUNT:
      return 'columns';
    case MapDataType.PRE_SALES_ACTIVITY:
    case MapDataType.SOLUTION_USAGE:
      return 'gauges';
    case MapDataType.CUSTOMER_COUNT_HEATMAP:
    case MapDataType.PROJECT_COUNT_HEATMAP:
    default:
      return 'bars';
  }
}

function getPreviewLabel(variant: PreviewVariant) {
  switch (variant) {
    case 'columns':
      return '分析图 / 柱状节奏';
    case 'gauges':
      return '分析图 / 热度占比';
    case 'bars':
    default:
      return '分析图 / 横向对比';
  }
}

function getValue(item: MapRegionData, dataType: MapDataType): number {
  switch (dataType) {
    case MapDataType.CUSTOMER_COUNT_HEATMAP:
      return item.customerCount;
    case MapDataType.PROJECT_COUNT_HEATMAP:
      return item.projectCount;
    case MapDataType.BUDGET:
      return item.budget || 0;
    case MapDataType.CONTRACT_AMOUNT:
      return item.contractAmount || 0;
    case MapDataType.PRE_SALES_ACTIVITY:
      return item.preSalesActivity || 0;
    case MapDataType.SOLUTION_USAGE:
      return item.solutionUsage || 0;
    default:
      return 0;
  }
}

function getRegionAccent(index: number) {
  return ['#00D4FF', '#34D399', '#FBBF24', '#FF8A65', '#A78BFA', '#22C55E'][index] || techTheme.colors.primary;
}

export function HeatmapTopRank({ data, dataType, label, unit, onRegionClick }: HeatmapTopRankProps) {
  const rankedRegions = [...data]
    .map((item) => ({ ...item, value: getValue(item, dataType) }))
    .filter((item) => item.value > 0)
    .sort((left, right) => right.value - left.value)
    .slice(0, 6);

  const variant = getPreviewVariant(dataType);
  const maxValue = rankedRegions[0]?.value || 1;
  const totalValue = rankedRegions.reduce((sum, item) => sum + item.value, 0);
  const leadShare = totalValue > 0 ? Math.round(((rankedRegions[0]?.value || 0) / totalValue) * 100) : 0;
  const previewRegions = rankedRegions.slice(0, 4).map((region, index) => ({
    ...region,
    ratio: maxValue > 0 ? region.value / maxValue : 0,
    accentColor: getRegionAccent(index),
  }));

  return (
    <div
      data-testid="data-screen-heatmap-top-rank"
      style={{
        background: 'linear-gradient(180deg, rgba(9, 16, 28, 0.96) 0%, rgba(6, 12, 22, 0.94) 100%)',
        border: '1px solid rgba(79, 172, 254, 0.22)',
        borderRadius: '12px',
        padding: '14px',
        boxShadow: '0 10px 24px rgba(0, 0, 0, 0.24)',
        display: 'grid',
        gap: '12px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
        <div style={{ minWidth: 0, display: 'grid', gap: '6px' }}>
          <div style={{ color: techTheme.text.primary, fontSize: '14px', fontWeight: 700, ...singleLineTextStyle }}>{label}热区主榜</div>
          <div style={{ color: techTheme.text.secondary, fontSize: '10px', ...singleLineTextStyle }}>按当前热力维度自动切换排行形态，优先展示最值得放大的区域。</div>
        </div>
        <div
          style={{
            borderRadius: '999px',
            border: '1px solid rgba(0, 212, 255, 0.18)',
            background: 'rgba(0, 212, 255, 0.08)',
            color: techTheme.colors.primary,
            fontSize: '10px',
            fontWeight: 700,
            padding: '4px 10px',
            flexShrink: 0,
          }}
        >
          {getPreviewLabel(variant)}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '8px' }}>
        <MetricCard label="入榜区域" value={`${rankedRegions.length}`} accentColor="#00D4FF" />
        <MetricCard label="头部占比" value={`${leadShare}%`} accentColor="#34D399" />
        <MetricCard label="峰值" value={rankedRegions[0] ? `${numberFormatter.format(rankedRegions[0].value)}${unit}` : '-'} accentColor="#FBBF24" />
      </div>

      <div
        data-testid="data-screen-heatmap-top-rank-chart"
        style={{
          padding: '10px',
          borderRadius: '10px',
          border: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(255,255,255,0.03)',
          minHeight: '118px',
        }}
      >
        {previewRegions.length ? renderPreviewChart(previewRegions, variant, unit) : (
          <div style={{ color: techTheme.text.secondary, fontSize: '11px', textAlign: 'center', paddingTop: '34px' }}>当前维度暂无热区数据</div>
        )}
      </div>

      <div style={{ display: 'grid', gap: '8px' }}>
        {rankedRegions.length ? rankedRegions.map((region, index) => {
          const accentColor = getRegionAccent(index);
          const width = `${Math.max(16, Math.min(100, (region.value / maxValue) * 100))}%`;

          return (
            <button
              key={region.name}
              type="button"
              data-testid={`data-screen-heatmap-top-rank-item-${region.name}`}
              onClick={() => onRegionClick?.(region)}
              style={{
                display: 'grid',
                gap: '6px',
                padding: '10px 10px 9px',
                borderRadius: '10px',
                border: index === 0 ? '1px solid rgba(0, 212, 255, 0.24)' : '1px solid rgba(255,255,255,0.08)',
                background: index === 0 ? 'rgba(0, 212, 255, 0.08)' : 'rgba(255,255,255,0.02)',
                textAlign: 'left',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                <div
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '7px',
                    display: 'grid',
                    placeItems: 'center',
                    background: `linear-gradient(135deg, ${accentColor}, ${accentColor}80)`,
                    color: '#04111f',
                    fontSize: '11px',
                    fontWeight: 800,
                    flexShrink: 0,
                  }}
                >
                  {index + 1}
                </div>
                <div style={{ minWidth: 0, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                  <span style={{ color: techTheme.text.primary, fontSize: '12px', fontWeight: 600, ...singleLineTextStyle }}>{region.name}</span>
                  <span style={{ color: accentColor, fontSize: '12px', fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}>{numberFormatter.format(region.value)} {unit}</span>
                </div>
              </div>
              <div style={{ height: '6px', borderRadius: '999px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                <div style={{ width, height: '100%', borderRadius: '999px', background: `linear-gradient(90deg, ${accentColor}99, ${accentColor})` }} />
              </div>
            </button>
          );
        }) : null}
      </div>
    </div>
  );
}

function MetricCard({ label, value, accentColor }: { label: string; value: string; accentColor: string }) {
  return (
    <div
      style={{
        padding: '8px 9px',
        borderRadius: '10px',
        border: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(255,255,255,0.03)',
        minWidth: 0,
      }}
    >
      <div style={{ color: accentColor, fontSize: '14px', fontWeight: 700, ...singleLineTextStyle }}>{value}</div>
      <div style={{ color: techTheme.text.secondary, fontSize: '10px', marginTop: '4px', ...singleLineTextStyle }}>{label}</div>
    </div>
  );
}

function renderPreviewChart(
  items: Array<MapRegionData & { value: number; ratio: number; accentColor: string }>,
  variant: PreviewVariant,
  unit: string,
) {
  if (variant === 'columns') {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`, gap: '8px', alignItems: 'end', height: '98px' }}>
        {items.map((item) => (
          <div key={item.name} style={{ display: 'grid', gap: '5px', alignItems: 'end' }}>
            <div style={{ height: '52px', display: 'flex', alignItems: 'end' }}>
              <div style={{ width: '100%', height: `${Math.max(20, Math.min(100, item.ratio * 100))}%`, borderRadius: '8px 8px 3px 3px', background: `linear-gradient(180deg, ${item.accentColor}, ${item.accentColor}70)` }} />
            </div>
            <span style={{ color: techTheme.text.secondary, fontSize: '9px', textAlign: 'center', ...singleLineTextStyle }}>{item.name.replace('市', '')}</span>
            <span style={{ color: item.accentColor, fontSize: '9px', fontWeight: 700, textAlign: 'center', ...singleLineTextStyle }}>{numberFormatter.format(item.value)}{unit}</span>
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'gauges') {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`, gap: '8px' }}>
        {items.map((item) => {
          const percent = Math.max(18, Math.min(360, item.ratio * 360));
          return (
            <div key={item.name} style={{ display: 'grid', justifyItems: 'center', gap: '5px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '999px', background: `conic-gradient(${item.accentColor} 0deg ${percent}deg, rgba(255,255,255,0.08) ${percent}deg 360deg)`, display: 'grid', placeItems: 'center' }}>
                <div style={{ width: '26px', height: '26px', borderRadius: '999px', background: 'rgba(8,14,24,0.96)', display: 'grid', placeItems: 'center', color: item.accentColor, fontSize: '8px', fontWeight: 700 }}>{Math.round(item.ratio * 100)}%</div>
              </div>
              <span style={{ color: techTheme.text.secondary, fontSize: '9px', ...singleLineTextStyle }}>{item.name.replace('市', '')}</span>
              <span style={{ color: item.accentColor, fontSize: '9px', fontWeight: 700, ...singleLineTextStyle }}>{numberFormatter.format(item.value)}{unit}</span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: '8px' }}>
      {items.map((item) => (
        <div key={item.name} style={{ display: 'grid', gap: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <span style={{ color: techTheme.text.secondary, fontSize: '10px', ...singleLineTextStyle }}>{item.name}</span>
            <span style={{ color: item.accentColor, fontSize: '10px', fontWeight: 700, whiteSpace: 'nowrap' }}>{numberFormatter.format(item.value)} {unit}</span>
          </div>
          <div style={{ height: '6px', borderRadius: '999px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
            <div style={{ width: `${Math.max(12, Math.min(100, item.ratio * 100))}%`, height: '100%', borderRadius: '999px', background: `linear-gradient(90deg, ${item.accentColor}bb, ${item.accentColor})` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
