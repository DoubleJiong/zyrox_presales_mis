'use client';

import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { DataScreenRegionInsightDialog } from '@/components/dashboard/DataScreenRegionInsightDialog';
import {
  DataScreenPhase2Chip,
  DataScreenPhase2MicroLabel,
  DataScreenPhase2MetricCard,
  phase2PreviewCardStyle,
  phase2ZoneCardStyle,
} from '@/components/dashboard/DataScreenPhase2Primitives';

export interface DataScreenRegionSummaryMetric {
  key: string;
  label: string;
  value: string;
  detail: string;
  accentColor: string;
  variant?: 'hero' | 'compact';
  secondaryMetrics?: Array<{
    label: string;
    value: string;
    accentColor?: string;
  }>;
}

export interface DataScreenRegionBottomPanel {
  key: string;
  title: string;
  subtitle: string;
  content: ReactNode;
  accentColor?: string;
  ctaLabel?: string;
  previewChartVariant?: 'bars' | 'columns' | 'gauges';
  previewStats?: Array<{
    label: string;
    value: string;
  }>;
  previewSeries?: Array<{
    label: string;
    value: string;
    ratio: number;
    accentColor?: string;
  }>;
}

interface DataScreenRegionLayoutProps {
  summaryMetrics: DataScreenRegionSummaryMetric[];
  viewPresetLabel: string;
  viewPresetSubtitle: string;
  mapScopeLabel: string;
  heatmapLabel: string;
  isRefreshing: boolean;
  leftZone: ReactNode;
  centerStage: ReactNode;
  rightZone: ReactNode;
  bottomPanels: DataScreenRegionBottomPanel[];
}

export function DataScreenRegionLayout({
  summaryMetrics,
  viewPresetLabel,
  viewPresetSubtitle,
  mapScopeLabel,
  heatmapLabel,
  isRefreshing,
  leftZone,
  centerStage,
  rightZone,
  bottomPanels,
}: DataScreenRegionLayoutProps) {
  const [selectedBottomPanelKey, setSelectedBottomPanelKey] = useState<string | null>(null);
  const isCondensedSummary = summaryMetrics.length <= 2;

  const selectedBottomPanel = useMemo(
    () => bottomPanels.find((panel) => panel.key === selectedBottomPanelKey) ?? null,
    [bottomPanels, selectedBottomPanelKey]
  );

  return (
    <>
      <div
        data-testid="data-screen-region-layout"
        style={{
          flex: 1,
          minHeight: 0,
          display: 'grid',
          gridTemplateRows: 'auto minmax(360px, 1fr) minmax(220px, auto)',
          gap: '16px',
          padding: '14px 18px 18px',
          overflow: 'hidden',
        }}
      >
        <section
          data-testid="data-screen-region-summary-belt"
          className="data-screen-region-summary-belt"
          style={{
            display: 'grid',
            gridTemplateColumns: isCondensedSummary ? 'repeat(2, minmax(0, 1fr))' : 'repeat(6, minmax(0, 1fr))',
            gridAutoRows: isCondensedSummary ? 'minmax(114px, auto)' : 'minmax(96px, auto)',
            gap: '12px',
          }}
        >
          {summaryMetrics.map((metric, index) => {
            const isHeroMetric = metric.variant ? metric.variant === 'hero' : index < 2;

            return (
              <div
                key={metric.key}
                style={{
                  gridColumn: isCondensedSummary ? 'span 1' : isHeroMetric ? 'span 2' : 'span 1',
                }}
              >
                {metric.secondaryMetrics?.length ? (
                  <article
                    data-testid={`data-screen-region-summary-card-${metric.key}`}
                    style={{
                      minHeight: '114px',
                      padding: '13px 16px',
                      borderRadius: '20px',
                      border: `1px solid ${metric.accentColor}33`,
                      background: `linear-gradient(145deg, ${metric.accentColor}16, rgba(10, 25, 42, 0.94) 28%, rgba(8, 16, 30, 0.88))`,
                      boxShadow: `inset 0 0 0 1px ${metric.accentColor}18, 0 12px 30px -18px ${metric.accentColor}66`,
                      display: 'grid',
                      gap: '7px',
                    }}
                  >
                    <div style={{ display: 'grid', gap: '6px' }}>
                        <div style={{ color: 'rgba(255,255,255,0.58)', fontSize: '11px', letterSpacing: '0.04em' }}>{metric.label}</div>
                        <div style={{ color: metric.accentColor, fontSize: '27px', fontWeight: 700, lineHeight: 1.02 }}>{metric.value}</div>
                        <div
                          style={{
                            color: 'rgba(255,255,255,0.48)',
                            fontSize: '10px',
                            lineHeight: 1.45,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {metric.detail}
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(metric.secondaryMetrics.length, 3)}, minmax(0, 1fr))`, gap: '6px 10px' }}>
                      {metric.secondaryMetrics.slice(0, 3).map((item) => (
                        <div
                          key={`${metric.key}-${item.label}`}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'auto 1fr',
                            alignItems: 'center',
                            gap: '6px 10px',
                            minWidth: 0,
                          }}
                        >
                          <span
                            aria-hidden="true"
                            style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '999px',
                              background: item.accentColor || metric.accentColor,
                              boxShadow: `0 0 10px ${(item.accentColor || metric.accentColor)}88`,
                            }}
                          />
                          <div style={{ display: 'grid', gap: '2px', minWidth: 0 }}>
                            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '9px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>
                            <span style={{ color: item.accentColor || metric.accentColor, fontSize: '12px', fontWeight: 700, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {item.value}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </article>
                ) : (
                  <DataScreenPhase2MetricCard
                    testId={`data-screen-region-summary-card-${metric.key}`}
                    label={metric.label}
                    value={metric.value}
                    detail={metric.detail}
                    accentColor={metric.accentColor}
                    variant={isHeroMetric ? 'hero' : 'compact'}
                  />
                )}
              </div>
            );
          })}
        </section>

        <div
          data-testid="data-screen-region-main-grid"
          className="data-screen-region-main-grid"
          style={{
            position: 'relative',
            zIndex: 2,
            minHeight: 0,
            height: '100%',
            display: 'grid',
            gridTemplateColumns: 'minmax(340px, 0.96fr) minmax(0, 1.95fr) minmax(340px, 1fr)',
            gap: '16px',
            overflow: 'hidden',
          }}
        >
          <div
            data-testid="data-screen-region-left-zone"
            style={{ minWidth: 0, minHeight: 0, overflow: 'hidden', position: 'relative', zIndex: 1 }}
          >
            {leftZone}
          </div>

          <section
            data-testid="data-screen-region-map-stage"
            style={{
              ...phase2ZoneCardStyle,
              position: 'relative',
              zIndex: 4,
              minWidth: 0,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              borderRadius: '24px',
              border: '1px solid rgba(0, 212, 255, 0.18)',
              background: 'linear-gradient(180deg, rgba(6, 14, 28, 0.94), rgba(10, 18, 34, 0.86))',
              overflow: 'hidden',
              padding: 0,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                padding: '10px 18px',
                borderBottom: '1px solid rgba(0, 212, 255, 0.14)',
                background: 'linear-gradient(90deg, rgba(0, 212, 255, 0.08), rgba(0, 255, 136, 0.03))',
              }}
            >
              <div
                style={{
                  display: 'grid',
                  gap: '5px',
                  minWidth: '210px',
                }}
              >
                <DataScreenPhase2MicroLabel label={viewPresetLabel} accentColor="#8CE7FF" />
                <div style={{ color: '#E6F5FF', fontSize: '18px', fontWeight: 700, lineHeight: 1.15 }}>{mapScopeLabel}</div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <DataScreenPhase2Chip label={`热力口径: ${heatmapLabel}`} accentColor="#00D4FF" background="#00D4FF22" />
                <span
                  data-testid="data-screen-region-refresh-badge"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    height: '28px',
                    padding: '0 12px',
                    borderRadius: '999px',
                    border: `1px solid ${(isRefreshing ? '#00FF88' : 'rgba(255,255,255,0.62)')}33`,
                    background: isRefreshing ? '#00FF8820' : 'rgba(255,255,255,0.08)',
                    color: isRefreshing ? '#00FF88' : 'rgba(255,255,255,0.62)',
                    fontSize: '11px',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {isRefreshing ? '数据刷新中' : '数据已同步'}
                </span>
              </div>
            </div>

            <div style={{ flex: 1, minHeight: 0 }}>{centerStage}</div>
          </section>

          <div
            data-testid="data-screen-region-right-zone"
            style={{ minWidth: 0, minHeight: 0, overflow: 'hidden', position: 'relative', zIndex: 1 }}
          >
            {rightZone}
          </div>
        </div>

        <section
          data-testid="data-screen-region-bottom-band"
          className="data-screen-region-bottom-band"
          style={{
            position: 'relative',
            zIndex: 1,
            minHeight: 0,
            display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
            gridAutoRows: 'minmax(0, 1fr)',
            gap: '12px',
            alignItems: 'stretch',
            overflow: 'hidden',
          }}
        >
          {bottomPanels.map((panel) => (
            <article
              key={panel.key}
              data-testid={`data-screen-region-bottom-panel-${panel.key}`}
              style={{
                ...phase2ZoneCardStyle,
                minHeight: 0,
                height: '100%',
                padding: '16px 18px 18px',
                display: 'grid',
                gap: '12px',
                alignContent: 'space-between',
                border: `1px solid ${(panel.accentColor || '#00D4FF')}26`,
                background: `linear-gradient(180deg, ${(panel.accentColor || '#00D4FF')}16, rgba(7, 18, 34, 0.92) 28%, rgba(8, 14, 24, 0.9))`,
                overflow: 'hidden',
              }}
            >
              <div style={{ display: 'grid', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                  <div style={{ display: 'grid', gap: '4px' }}>
                    <div style={{ color: '#E6F5FF', fontSize: '14px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{panel.title}</div>
                    <div style={{ color: panel.accentColor || '#00D4FF', fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em' }}>
                      快速摘要
                    </div>
                  </div>
                  <DataScreenPhase2Chip label={panel.ctaLabel || '展开专题'} accentColor={panel.accentColor || '#00D4FF'} background={`${panel.accentColor || '#00D4FF'}18`} />
                </div>
                <div
                  style={{
                    color: 'rgba(255,255,255,0.6)',
                    fontSize: '11px',
                    lineHeight: 1.7,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {panel.subtitle}
                </div>
              </div>

              {panel.previewSeries?.length ? (
                <RegionPreviewChart
                  testId={`data-screen-region-bottom-panel-${panel.key}-chart`}
                  accentColor={panel.accentColor || '#00D4FF'}
                  items={panel.previewSeries.slice(0, 3).map((entry) => ({
                    label: entry.label,
                    value: entry.value,
                    ratio: entry.ratio,
                    accentColor: entry.accentColor || panel.accentColor || '#00D4FF',
                  }))}
                  variant={panel.previewChartVariant || 'bars'}
                />
              ) : null}

              {panel.previewStats?.length ? (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${Math.min(panel.previewStats.length, 2)}, minmax(0, 1fr))`,
                    gap: '10px',
                  }}
                >
                  {panel.previewStats.slice(0, 2).map((stat) => (
                    <div
                      key={`${panel.key}-${stat.label}`}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '14px',
                        border: '1px solid rgba(255,255,255,0.08)',
                        background: 'rgba(255,255,255,0.04)',
                      }}
                    >
                      <div style={{ color: 'rgba(255,255,255,0.48)', fontSize: '10px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{stat.label}</div>
                      <div style={{ marginTop: '7px', color: panel.accentColor || '#E6F5FF', fontSize: '18px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {stat.value}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                <div style={{ color: 'rgba(255,255,255,0.46)', fontSize: '10px', lineHeight: 1.6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  首屏以图表表达结构，弹窗查看完整图表与对象数据
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedBottomPanelKey(panel.key)}
                  style={{
                    border: `1px solid ${(panel.accentColor || '#00D4FF')}33`,
                    background: `${panel.accentColor || '#00D4FF'}18`,
                    color: '#E6F5FF',
                    borderRadius: '999px',
                    padding: '8px 14px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {panel.ctaLabel || '展开专题'}
                </button>
              </div>
            </article>
          ))}
        </section>
      </div>

      <DataScreenRegionInsightDialog
        open={Boolean(selectedBottomPanel)}
        title={selectedBottomPanel?.title ?? '区域专题详情'}
        description={selectedBottomPanel?.subtitle ?? '查看当前区域专题的完整内容。'}
        badges={[
          { label: viewPresetLabel, accentColor: '#00D4FF', backgroundColor: 'rgba(0, 212, 255, 0.12)' },
          { label: `热力口径: ${heatmapLabel}`, accentColor: '#00FF88', backgroundColor: 'rgba(0, 255, 136, 0.12)' },
        ]}
        onClose={() => setSelectedBottomPanelKey(null)}
        testId="data-screen-region-bottom-drawer"
        titleTestId="data-screen-region-bottom-drawer-title"
      >
        {selectedBottomPanel?.content ?? null}
      </DataScreenRegionInsightDialog>
    </>
  );
}

function RegionPreviewChart({
  testId,
  accentColor,
  items,
  variant,
}: {
  testId: string;
  accentColor: string;
  items: Array<{ label: string; value: string; ratio: number; accentColor: string }>;
  variant: 'bars' | 'columns' | 'gauges';
}) {
  return (
    <div
      data-testid={testId}
      style={{
        ...phase2PreviewCardStyle,
        padding: '12px 13px 13px',
        display: 'grid',
        gap: '8px',
        minHeight: '122px',
      }}
    >
      <DataScreenPhase2MicroLabel label={variant === 'bars' ? '主图表 / 横向对比' : variant === 'columns' ? '主图表 / 柱状节奏' : '主图表 / 环形占比'} accentColor={accentColor} />
      {variant === 'columns' ? (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`, alignItems: 'end', gap: '10px', minHeight: '84px' }}>
          {items.map((entry) => (
            <div key={`${testId}-${entry.label}`} style={{ display: 'grid', gap: '6px', alignItems: 'end' }}>
              <div style={{ height: '72px', display: 'flex', alignItems: 'end' }}>
                <div style={{ width: '100%', height: `${Math.max(14, Math.min(100, entry.ratio * 100))}%`, borderRadius: '10px 10px 4px 4px', background: `linear-gradient(180deg, ${entry.accentColor}, ${entry.accentColor}77)` }} />
              </div>
              <div style={{ color: 'rgba(255,255,255,0.58)', fontSize: '9px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'center' }}>{entry.label}</div>
              <div style={{ color: entry.accentColor, fontSize: '10px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'center' }}>{entry.value}</div>
            </div>
          ))}
        </div>
      ) : variant === 'gauges' ? (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`, gap: '10px' }}>
          {items.map((entry) => (
            <div key={`${testId}-${entry.label}`} style={{ display: 'grid', justifyItems: 'center', gap: '6px' }}>
              <div
                style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '999px',
                  background: `conic-gradient(${entry.accentColor} 0deg ${Math.max(18, Math.min(360, entry.ratio * 360))}deg, rgba(255,255,255,0.08) ${Math.max(18, Math.min(360, entry.ratio * 360))}deg 360deg)`,
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <div style={{ width: '34px', height: '34px', borderRadius: '999px', background: 'rgba(9, 16, 28, 0.92)', display: 'grid', placeItems: 'center', color: entry.accentColor, fontSize: '10px', fontWeight: 700 }}>
                  {Math.round(entry.ratio * 100)}%
                </div>
              </div>
              <div style={{ color: 'rgba(255,255,255,0.58)', fontSize: '9px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{entry.label}</div>
              <div style={{ color: entry.accentColor, fontSize: '10px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{entry.value}</div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '5px' }}>
          {items.map((entry) => (
            <div key={`${testId}-${entry.label}`} style={{ display: 'grid', gap: '5px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                <span style={{ color: 'rgba(255,255,255,0.56)', fontSize: '10px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{entry.label}</span>
                <span style={{ color: entry.accentColor, fontSize: '11px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{entry.value}</span>
              </div>
              <div style={{ height: '8px', borderRadius: '999px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                <div style={{ width: `${Math.max(10, Math.min(100, entry.ratio * 100))}%`, height: '100%', borderRadius: '999px', background: `linear-gradient(90deg, ${entry.accentColor}cc, ${entry.accentColor})` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
