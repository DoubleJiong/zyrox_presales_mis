'use client';

import { MapDataType, MapDataConfig } from '@/lib/map-types';
import { techTheme } from '@/lib/tech-theme';

interface MapDataTypeToggleProps {
  currentType: MapDataType;
  onChange: (type: MapDataType) => void;
}

const dataConfigs: MapDataConfig[] = [
  {
    type: MapDataType.CUSTOMER_COUNT,
    label: '客户数量',
    unit: '个',
    color: techTheme.colors.primary,
  },
  {
    type: MapDataType.PROJECT_COUNT,
    label: '项目数量',
    unit: '个',
    color: techTheme.colors.secondary,
  },
  {
    type: MapDataType.PROJECT_AMOUNT,
    label: '项目金额',
    unit: '万',
    color: techTheme.colors.success,
  },
];

export function MapDataTypeToggle({ currentType, onChange }: MapDataTypeToggleProps) {
  const buttonStyle = (isActive: boolean, color: string) => ({
    padding: '8px 16px',
    borderRadius: '8px',
    border: `1px solid ${isActive ? color : techTheme.border.color}`,
    backgroundColor: isActive ? `${color}30` : 'transparent',
    color: isActive ? color : techTheme.text.secondary,
    fontSize: techTheme.font.size.sm,
    fontWeight: techTheme.font.weight.medium,
    cursor: 'pointer',
    transition: `all ${techTheme.animation.duration.fast}`,
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  });

  const indicatorStyle = (color: string) => ({
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: color,
    boxShadow: `0 0 10px ${color}`,
  });

  return (
    <div
      style={{
        display: 'flex',
        gap: '8px',
        padding: '4px',
        backgroundColor: `${techTheme.background.card}60`,
        border: `1px solid ${techTheme.border.color}`,
        borderRadius: '12px',
      }}
    >
      {dataConfigs.map((config) => {
        const isActive = currentType === config.type;
        return (
          <button
            key={config.type}
            onClick={() => onChange(config.type)}
            style={buttonStyle(isActive, config.color)}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.backgroundColor = `${techTheme.border.color}40`;
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            <div style={indicatorStyle(config.color)} />
            {config.label}
          </button>
        );
      })}
    </div>
  );
}
