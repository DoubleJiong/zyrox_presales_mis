'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { HeavyModulePlaceholder } from '@/components/dashboard/DataScreenChrome';
import { MapDataType, MapRegionData } from '@/lib/map-types';

const LazyTechMapChart = dynamic(
  () => import('@/components/dashboard/TechMapChart').then((module) => ({ default: module.TechMapChart })),
  {
    ssr: false,
    loading: () => <HeavyModulePlaceholder title="地图载入中" subtitle="正在准备区域热力与下钻视图" />,
  }
);

interface DataScreenCenterStageProps {
  currentMapType: 'province-outside' | 'zhejiang';
  currentMapData: MapRegionData[];
  currentDataType: MapDataType;
  showMapPlaceholder: boolean;
  stageMetrics: Array<{
    label: string;
    value: string;
    accentColor: string;
  }>;
  spotlightRegions: Array<{
    region: MapRegionData;
    value: string;
    detail: string;
    accentColor: string;
  }>;
  alertItems: Array<{
    region: MapRegionData;
    title: string;
    detail: string;
    accentColor: string;
  }>;
  onRegionSelect: (region: MapRegionData) => void;
  onDrillDown: (regionName: string) => void;
}

export function DataScreenCenterStage({
  currentMapType,
  currentMapData,
  currentDataType,
  showMapPlaceholder,
  stageMetrics,
  spotlightRegions,
  alertItems,
  onRegionSelect,
  onDrillDown,
}: DataScreenCenterStageProps) {
  const [isMapDetailOpen, setIsMapDetailOpen] = useState(false);

  const renderMap = (chartHeight: string, canExpand: boolean) => (
    <LazyTechMapChart
      key={`${currentMapType}-${canExpand ? 'stage' : 'detail'}`}
      mapType={currentMapType === 'province-outside' ? 'china' : 'zhejiang'}
      title=""
      data={currentMapData}
      currentDataType={currentDataType}
      onRegionClick={onRegionSelect}
      onDrillDown={onDrillDown}
      height={chartHeight}
      showDetailPanel={false}
      selectedRegion={null}
      onCloseDetail={() => {}}
      highlightMode={null}
      highlightRegions={[]}
      regionBrightness={{}}
      showViewportToolbar
      onRequestExpand={canExpand ? () => setIsMapDetailOpen(true) : undefined}
    />
  );

  return (
    <div
      data-testid="data-screen-center-stage"
      style={{
        flex: 1,
        height: '100%',
        position: 'relative',
        zIndex: 5,
        overflow: 'hidden',
      }}
    >
      {showMapPlaceholder ? (
        <HeavyModulePlaceholder title="地图载入中" subtitle="正在按需初始化热力图与区域联动" />
      ) : (
        renderMap('100%', true)
      )}

      {!showMapPlaceholder ? (
        <div
          data-testid="data-screen-center-stage-overlay"
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
          }}
        >
          {stageMetrics.length ? (
            <div
              data-testid="data-screen-center-stage-metrics"
              style={{
                position: 'absolute',
                top: '14px',
                left: '16px',
                right: '120px',
                display: 'grid',
                gridTemplateColumns: `repeat(${Math.min(stageMetrics.length, 3)}, minmax(0, 1fr))`,
                gap: '10px',
              }}
            >
              {stageMetrics.slice(0, 3).map((metric) => (
                <div
                  key={metric.label}
                  style={{
                    pointerEvents: 'auto',
                    padding: '10px 12px',
                    borderRadius: '14px',
                    border: `1px solid ${metric.accentColor}2a`,
                    background: 'linear-gradient(180deg, rgba(6, 16, 28, 0.82), rgba(7, 14, 24, 0.68))',
                    backdropFilter: 'blur(12px)',
                    boxShadow: '0 14px 28px rgba(0, 0, 0, 0.2)',
                  }}
                >
                  <div style={{ color: 'rgba(230,245,255,0.52)', fontSize: '10px', letterSpacing: '0.08em' }}>{metric.label}</div>
                  <div style={{ marginTop: '7px', color: metric.accentColor, fontSize: '18px', fontWeight: 700 }}>{metric.value}</div>
                </div>
              ))}
            </div>
          ) : null}

          <div
            style={{
              position: 'absolute',
              left: '16px',
              right: '16px',
              bottom: '14px',
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1.08fr) minmax(260px, 0.92fr)',
              gap: '12px',
              alignItems: 'end',
            }}
          >
            <section
              data-testid="data-screen-center-stage-spotlight"
              style={{
                pointerEvents: 'auto',
                padding: '12px 14px',
                borderRadius: '18px',
                border: '1px solid rgba(0, 212, 255, 0.14)',
                background: 'linear-gradient(180deg, rgba(4, 10, 18, 0.84), rgba(6, 14, 28, 0.72))',
                backdropFilter: 'blur(14px)',
                boxShadow: '0 16px 32px rgba(0, 0, 0, 0.22)',
                display: 'grid',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                <div style={{ color: '#E6F5FF', fontSize: '12px', fontWeight: 700 }}>重点关注区域</div>
                <div style={{ color: 'rgba(255,255,255,0.48)', fontSize: '10px' }}>点击可直接联动区域详情</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '8px' }}>
                {spotlightRegions.length ? spotlightRegions.slice(0, 3).map((item) => (
                  <button
                    key={`spotlight-${item.region.name}`}
                    type="button"
                    data-testid={`data-screen-center-stage-spotlight-${item.region.name}`}
                    onClick={() => onRegionSelect(item.region)}
                    style={{
                      display: 'grid',
                      gap: '6px',
                      textAlign: 'left',
                      padding: '10px 12px',
                      borderRadius: '14px',
                      border: `1px solid ${item.accentColor}24`,
                      background: 'rgba(255,255,255,0.03)',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                      <span style={{ color: '#FFFFFF', fontSize: '12px', fontWeight: 600 }}>{item.region.name}</span>
                      <span style={{ color: item.accentColor, fontSize: '12px', fontWeight: 700 }}>{item.value}</span>
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '10px', lineHeight: 1.5 }}>{item.detail}</div>
                  </button>
                )) : (
                  <div style={{ color: 'rgba(255,255,255,0.46)', fontSize: '11px' }}>暂无重点关注区域</div>
                )}
              </div>
            </section>

            <section
              data-testid="data-screen-center-stage-alert-feed"
              style={{
                pointerEvents: 'auto',
                padding: '12px 14px',
                borderRadius: '18px',
                border: '1px solid rgba(255, 138, 101, 0.16)',
                background: 'linear-gradient(180deg, rgba(10, 12, 20, 0.86), rgba(10, 14, 24, 0.74))',
                backdropFilter: 'blur(14px)',
                boxShadow: '0 16px 32px rgba(0, 0, 0, 0.22)',
                display: 'grid',
                gap: '9px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                <div style={{ color: '#E6F5FF', fontSize: '12px', fontWeight: 700 }}>区域告警流</div>
                <div style={{ color: 'rgba(255,255,255,0.48)', fontSize: '10px' }}>保留前三个高优先对象</div>
              </div>
              {alertItems.length ? alertItems.slice(0, 3).map((item) => (
                <button
                  key={`alert-${item.region.name}`}
                  type="button"
                  data-testid={`data-screen-center-stage-alert-${item.region.name}`}
                  onClick={() => onRegionSelect(item.region)}
                  style={{
                    display: 'grid',
                    gap: '4px',
                    textAlign: 'left',
                    padding: '10px 12px',
                    borderRadius: '14px',
                    border: `1px solid ${item.accentColor}24`,
                    background: 'rgba(255,255,255,0.03)',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                    <span style={{ color: item.accentColor, fontSize: '11px', fontWeight: 700 }}>{item.region.name}</span>
                    <span style={{ color: 'rgba(255,255,255,0.36)', fontSize: '10px' }}>查看详情</span>
                  </div>
                  <div style={{ color: '#FFFFFF', fontSize: '11px', fontWeight: 600, lineHeight: 1.45 }}>{item.title}</div>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '10px', lineHeight: 1.55 }}>{item.detail}</div>
                </button>
              )) : (
                <div style={{ color: 'rgba(255,255,255,0.46)', fontSize: '11px', lineHeight: 1.6 }}>当前口径下暂无高优先级区域告警。</div>
              )}
            </section>
          </div>
        </div>
      ) : null}

      {isMapDetailOpen && !showMapPlaceholder ? (
        <div
          role="dialog"
          aria-modal="true"
          data-testid="data-screen-map-detail-dialog"
          style={{
            position: 'fixed',
            inset: '20px',
            zIndex: 260,
            display: 'flex',
            flexDirection: 'column',
            borderRadius: '20px',
            overflow: 'hidden',
            border: '1px solid rgba(0, 212, 255, 0.28)',
            background: 'linear-gradient(180deg, rgba(6, 14, 28, 0.98) 0%, rgba(10, 15, 26, 0.99) 100%)',
            boxShadow: '0 24px 80px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(0, 212, 255, 0.1)',
            backdropFilter: 'blur(16px)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              borderBottom: '1px solid rgba(0, 212, 255, 0.16)',
              background: 'rgba(0, 0, 0, 0.22)',
            }}
          >
            <div style={{ display: 'grid', gap: '4px' }}>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#E8F6FF', letterSpacing: '0.08em' }}>
                地图详细查看
              </div>
              <div style={{ fontSize: '12px', color: 'rgba(232,246,255,0.62)' }}>
                支持滚轮缩放、拖动画布和平移后重置视图
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsMapDetailOpen(false)}
              style={{
                border: '1px solid rgba(255,255,255,0.16)',
                background: 'rgba(255,255,255,0.04)',
                color: '#E8F6FF',
                borderRadius: '999px',
                padding: '8px 14px',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              关闭查看
            </button>
          </div>

          <div style={{ flex: 1, minHeight: 0, padding: '16px' }}>
            <div style={{ height: '100%', borderRadius: '16px', overflow: 'hidden', background: 'rgba(4, 10, 18, 0.8)' }}>
              {renderMap('100%', false)}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}