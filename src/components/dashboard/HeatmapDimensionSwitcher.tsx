'use client';

import React from 'react';
import { MapDataType } from '@/lib/map-types';

interface HeatmapDimensionSwitcherProps {
  currentType: MapDataType;
  onTypeChange: (type: MapDataType) => void;
}

interface Dimension {
  type: MapDataType;
  label: string;
  icon: string;
  color: string;
}

// 按新顺序排列：客户总数、项目总数、资金预算、中标金额、售前活动、方案引用
const dimensions: Dimension[] = [
  {
    type: MapDataType.CUSTOMER_COUNT_HEATMAP,
    label: '客户总数',
    icon: '👥',
    color: '#4facfe',
  },
  {
    type: MapDataType.PROJECT_COUNT_HEATMAP,
    label: '项目总数',
    icon: '📊',
    color: '#fee140',
  },
  {
    type: MapDataType.BUDGET,
    label: '资金预算',
    icon: '💰',
    color: '#fa709a',
  },
  {
    type: MapDataType.CONTRACT_AMOUNT,
    label: '中标金额',
    icon: '🏆',
    color: '#ff6b9d',
  },
  {
    type: MapDataType.PRE_SALES_ACTIVITY,
    label: '售前活动',
    icon: '🎯',
    color: '#00f2fe',
  },
  {
    type: MapDataType.SOLUTION_USAGE,
    label: '方案引用',
    icon: '📋',
    color: '#4facfe',
  },
];

export function HeatmapDimensionSwitcher({ currentType, onTypeChange }: HeatmapDimensionSwitcherProps) {
  const currentDimension = dimensions.find(d => d.type === currentType) || dimensions[0];
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div style={{ position: 'relative' }}>
      {/* 下拉框触发器 */}
      <button
        data-testid="data-screen-heatmap-dimension-trigger"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          padding: '10px 16px',
          background: 'rgba(10, 15, 26, 0.95)',
          border: `1px solid ${currentDimension.color}50`,
          borderRadius: '8px',
          cursor: 'pointer',
          minWidth: '160px',
          transition: 'all 0.3s',
          boxShadow: `0 0 15px ${currentDimension.color}20`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '16px' }}>{currentDimension.icon}</span>
          <span
            style={{
              color: currentDimension.color,
              fontSize: '13px',
              fontWeight: '600',
              fontFamily: '"JetBrains Mono", monospace',
            }}
          >
            {currentDimension.label}
          </span>
        </div>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke={currentDimension.color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.3s',
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* 下拉菜单 */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '4px',
            background: 'rgba(10, 15, 26, 0.98)',
            border: '1px solid rgba(79, 172, 254, 0.3)',
            borderRadius: '8px',
            overflow: 'hidden',
            zIndex: 1000,
            backdropFilter: 'blur(10px)',
          }}
        >
          {dimensions.map((dimension) => {
            const isActive = currentType === dimension.type;

            return (
              <button
                key={dimension.type}
                data-testid={`data-screen-heatmap-option-${dimension.type}`}
                onClick={() => {
                  onTypeChange(dimension.type);
                  setIsOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '10px 16px',
                  background: isActive
                    ? `${dimension.color}20`
                    : 'transparent',
                  border: 'none',
                  borderBottom: '1px solid rgba(79, 172, 254, 0.1)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                <span style={{ fontSize: '16px' }}>{dimension.icon}</span>
                <span
                  style={{
                    color: isActive ? dimension.color : 'rgba(255, 255, 255, 0.8)',
                    fontSize: '13px',
                    fontWeight: isActive ? '600' : '400',
                    fontFamily: '"JetBrains Mono", monospace',
                  }}
                >
                  {dimension.label}
                </span>
                {isActive && (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={dimension.color}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ marginLeft: 'auto' }}
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// 导出 dimensions 供其他组件使用
export { dimensions };
