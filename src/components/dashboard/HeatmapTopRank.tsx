'use client';

import React from 'react';
import { techTheme } from '@/lib/tech-theme';
import { MapDataType, MapRegionData } from '@/lib/map-types';

interface HeatmapTopRankProps {
  data: MapRegionData[];
  dataType: MapDataType;
  label: string;
  unit: string;
  onRegionClick?: (region: MapRegionData) => void;
}

export function HeatmapTopRank({ data, dataType, label, unit, onRegionClick }: HeatmapTopRankProps) {
  // 获取区域数值
  const getValue = (item: MapRegionData): number => {
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
  };

  // 排序并获取 Top10
  const topRegions = [...data]
    .map(item => ({ ...item, value: getValue(item) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  const maxValue = topRegions[0]?.value || 1;

  return (
    <div
      style={{
        background: 'rgba(10, 15, 26, 0.95)',
        border: '1px solid rgba(79, 172, 254, 0.3)',
        borderRadius: '8px',
        padding: '16px',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
      }}
    >
      {/* 标题 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '16px',
          paddingBottom: '12px',
          borderBottom: '2px solid rgba(79, 172, 254, 0.3)',
        }}
      >
        <div
          style={{
            width: '4px',
            height: '20px',
            background: 'linear-gradient(180deg, #4facfe 0%, #00f2fe 100%)',
            borderRadius: '2px',
          }}
        />
        <span
          style={{
            color: techTheme.text.primary,
            fontSize: '16px',
            fontWeight: '700',
            fontFamily: '"JetBrains Mono", monospace',
          }}
        >
          {label} TOP10
        </span>
      </div>

      {/* 排名列表 */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        {topRegions.map((region, index) => {
          const percentage = (region.value / maxValue) * 100;
          const rankColor = index < 3 ? techTheme.colors.warning : techTheme.colors.primary;

          return (
            <div
              key={region.name}
              onClick={() => onRegionClick?.(region)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                background: index === 0
                  ? 'rgba(79, 172, 254, 0.1)'
                  : 'transparent',
                border: index === 0
                  ? '1px solid rgba(79, 172, 254, 0.3)'
                  : '1px solid transparent',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(79, 172, 254, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = index === 0
                  ? 'rgba(79, 172, 254, 0.1)'
                  : 'transparent';
              }}
            >
              {/* 排名 */}
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '4px',
                  background: index < 3
                    ? `linear-gradient(135deg, ${rankColor} 0%, ${rankColor}80 100%)`
                    : 'rgba(255, 255, 255, 0.1)',
                  color: index < 3 ? '#000' : techTheme.text.primary,
                  fontSize: '14px',
                  fontWeight: '700',
                  fontFamily: '"JetBrains Mono", monospace',
                }}
              >
                {index + 1}
              </div>

              {/* 区域名称 */}
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                }}
              >
                <span
                  style={{
                    color: techTheme.text.primary,
                    fontSize: '14px',
                    fontWeight: '500',
                    fontFamily: '"JetBrains Mono", monospace',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    flex: '1 1 auto',
                    minWidth: 0,
                  }}
                >
                  {region.name.replace('市', '')}
                </span>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: '4px',
                    flex: '0 0 auto',
                  }}
                >
                  <span
                    style={{
                      color: index < 3 ? rankColor : techTheme.text.primary,
                      fontSize: '16px',
                      fontWeight: '700',
                      fontFamily: '"JetBrains Mono", monospace',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      maxWidth: '80px',
                    }}
                  >
                    {region.value.toLocaleString()}
                  </span>
                  <span
                    style={{
                      color: techTheme.text.secondary,
                      fontSize: '12px',
                    }}
                  >
                    {unit}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
