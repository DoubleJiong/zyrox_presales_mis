'use client';

import dynamic from 'next/dynamic';
import type { CSSProperties, ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { DataScreenDrilldownDrawer } from '@/components/dashboard/DataScreenDrilldownDrawer';
import { DataScreenPhase2MicroLabel, phase2PreviewCardStyle } from '@/components/dashboard/DataScreenPhase2Primitives';
import { HeatmapDimensionSwitcher } from '@/components/dashboard/HeatmapDimensionSwitcher';
import { LiveClock } from '@/components/dashboard/LiveClock';
import { MapDataType, MapRegionData } from '@/lib/map-types';
import {
  Globe,
  MapPin,
  RefreshCw,
  Hexagon,
  UserCog,
  Users,
  FolderKanban,
  FileText,
} from 'lucide-react';
import type {
  SalesPanelData,
  CustomersPanelData,
  ProjectsPanelData,
  SolutionsPanelData,
} from '@/hooks/use-panel-data';
import type { WorkbenchSummaryData } from '@/hooks/use-workbench-summary';
import type { PresalesFocusSummaryData } from '@/hooks/use-presales-focus-summary';

export type GlobalStatsTab = 'sales' | 'customers' | 'projects' | 'solutions';
export type RoleViewPreset = 'management' | 'business-focus' | 'presales-focus' | 'personal-focus';
export type PrimaryScreenView = 'region' | 'personnel' | 'topic';
type DashboardPanelData = SalesPanelData | CustomersPanelData | ProjectsPanelData | SolutionsPanelData;

type FunnelSummary = {
  totalOpenCount: number;
  totalOpenAmount: number;
  weightedPipeline: number;
  avgWinProbability: number;
  missingWinProbabilityCount: number;
  stages: Array<{
    key: string;
    label: string;
    count: number;
    amount: number;
    weightedAmount: number;
  }>;
};

type ForecastSummary = {
  targetBasis: string;
  targetLabel: string;
  periodDays: number;
  targetAmount: number;
  currentWonAmount: number;
  forecastAmount: number;
  weightedOpenAmount: number;
  gapAmount: number;
  coverageRate: number;
  averageWinProbability: number;
  requiredNewOpportunityAmount: number;
  confidence: 'on-track' | 'watch' | 'gap';
};

type RiskSummary = {
  total: number;
  high: number;
  medium: number;
  overdueActions: number;
  overdueBids: number;
  staleProjects: number;
  dueThisWeek: number;
  items: Array<{
    projectId: number;
    projectName: string;
    region: string;
    stage: string;
    riskLevel: 'high' | 'medium';
    score: number;
    amount: number;
    winProbability: number;
    reason: string;
  }>;
};

type OverviewMetrics = {
  totalCustomers: number;
  totalProjects: number;
  totalRevenue: number;
  wonProjects: number;
};

const LazySalesPanel = dynamic(
  () => import('@/components/dashboard/DataPanels').then((module) => ({ default: module.SalesPanel })),
  {
    ssr: false,
    loading: () => <CompactModulePlaceholder title="售前统计模块加载中..." />,
  }
);

const LazyCustomersPanel = dynamic(
  () => import('@/components/dashboard/DataPanels').then((module) => ({ default: module.CustomersPanel })),
  {
    ssr: false,
    loading: () => <CompactModulePlaceholder title="客户统计模块加载中..." />,
  }
);

const LazyProjectsPanel = dynamic(
  () => import('@/components/dashboard/DataPanels').then((module) => ({ default: module.ProjectsPanel })),
  {
    ssr: false,
    loading: () => <CompactModulePlaceholder title="项目统计模块加载中..." />,
  }
);

const LazySolutionsPanel = dynamic(
  () => import('@/components/dashboard/DataPanels').then((module) => ({ default: module.SolutionsPanel })),
  {
    ssr: false,
    loading: () => <CompactModulePlaceholder title="方案统计模块加载中..." />,
  }
);

const LazyHeatmapTopRank = dynamic(
  () => import('@/components/dashboard/HeatmapTopRank').then((module) => ({ default: module.HeatmapTopRank })),
  {
    ssr: false,
      loading: () => <CompactModulePlaceholder title="热区主榜载入中..." />,
  }
);

const LazyFunnelSummaryPanel = dynamic(
  () => import('@/components/dashboard/DataPanels').then((module) => ({ default: module.FunnelSummaryPanel })),
  {
    ssr: false,
    loading: () => <CompactModulePlaceholder title="经营漏斗载入中..." />,
  }
);

const LazyRiskSummaryPanel = dynamic(
  () => import('@/components/dashboard/DataPanels').then((module) => ({ default: module.RiskSummaryPanel })),
  {
    ssr: false,
    loading: () => <CompactModulePlaceholder title="风险摘要载入中..." />,
  }
);

const LazyForecastSummaryPanel = dynamic(
  () => import('@/components/dashboard/DataPanels').then((module) => ({ default: module.ForecastSummaryPanel })),
  {
    ssr: false,
    loading: () => <CompactModulePlaceholder title="目标预测载入中..." />,
  }
);

const LazyRealTimeDataPanel = dynamic(
  () => import('@/components/dashboard/DataPanels').then((module) => ({ default: module.RealTimeDataPanel })),
  {
    ssr: false,
    loading: () => <CompactModulePlaceholder title="实时流载入中..." />,
  }
);

const LazyQuickStatsPanel = dynamic(
  () => import('@/components/dashboard/DataPanels').then((module) => ({ default: module.QuickStatsPanel })),
  {
    ssr: false,
    loading: () => <CompactModulePlaceholder title="快速统计载入中..." />,
  }
);

const LazyPersonalFocusPanel = dynamic(
  () => import('@/components/dashboard/DataPanels').then((module) => ({ default: module.PersonalFocusPanel })),
  {
    ssr: false,
    loading: () => <CompactModulePlaceholder title="个人推进视图载入中..." />,
  }
);

const LazyPresalesFocusPanel = dynamic(
  () => import('@/components/dashboard/DataPanels').then((module) => ({ default: module.PresalesFocusPanel })),
  {
    ssr: false,
    loading: () => <CompactModulePlaceholder title="售前支持负载载入中..." />,
  }
);

const LazyManagementFocusPanel = dynamic(
  () => import('@/components/dashboard/DataPanels').then((module) => ({ default: module.ManagementFocusPanel })),
  {
    ssr: false,
    loading: () => <CompactModulePlaceholder title="管理层经营总览载入中..." />,
  }
);

const LazyBusinessFocusPanel = dynamic(
  () => import('@/components/dashboard/DataPanels').then((module) => ({ default: module.BusinessFocusPanel })),
  {
    ssr: false,
    loading: () => <CompactModulePlaceholder title="经营负责人视图载入中..." />,
  }
);

export function DataScreenLoadingOverlay({ show }: { show: boolean }) {
  if (!show) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-9999 flex items-center justify-center" style={{ background: '#0A0F1A' }}>
      <div
        style={{
          width: '60px',
          height: '60px',
          border: '4px solid rgba(0, 212, 255, 0.2)',
          borderTopColor: '#00D4FF',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }}
      />
      <p
        style={{
          color: '#00D4FF',
          fontSize: '16px',
          marginTop: '20px',
          fontFamily: '"JetBrains Mono", monospace',
          fontWeight: '600',
        }}
      >
        正在初始化数据大屏...
      </p>
    </div>
  );
}

export function HeavyModulePlaceholder({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        background: 'radial-gradient(circle at center, rgba(0, 212, 255, 0.06), transparent 58%)',
        color: 'rgba(255,255,255,0.72)',
        fontFamily: '"JetBrains Mono", monospace',
      }}
    >
      <div
        style={{
          width: '52px',
          height: '52px',
          borderRadius: '50%',
          border: '2px solid rgba(0, 212, 255, 0.18)',
          borderTopColor: '#00D4FF',
          animation: 'spin 1.1s linear infinite',
        }}
      />
      <div style={{ fontSize: '13px', color: '#00D4FF', fontWeight: 600 }}>{title}</div>
      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>{subtitle}</div>
    </div>
  );
}

function ZoneHeaderPlaceholder({ accentColor }: { accentColor: string }) {
  return (
    <div
      aria-hidden="true"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
      }}
    >
      <div
        style={{
          width: '30px',
          height: '30px',
          borderRadius: '999px',
          border: `1px solid ${accentColor}33`,
          background: `${accentColor}14`,
          boxShadow: `0 0 0 1px ${accentColor}12 inset`,
        }}
      />
      <div style={{ display: 'grid', gap: '6px', flex: 1, maxWidth: '140px' }}>
        <div
          style={{
            width: '72px',
            height: '8px',
            borderRadius: '999px',
            background: `${accentColor}38`,
          }}
        />
        <div
          style={{
            width: '116px',
            height: '6px',
            borderRadius: '999px',
            background: 'rgba(255,255,255,0.14)',
          }}
        />
      </div>
    </div>
  );
}

export function CompactModulePlaceholder({ title }: { title: string }) {
  return (
    <div
      style={{
        padding: '18px 12px',
        borderRadius: '8px',
        border: '1px solid rgba(0, 212, 255, 0.16)',
        background: 'rgba(0, 212, 255, 0.05)',
        color: 'rgba(255,255,255,0.62)',
        fontSize: '11px',
        textAlign: 'center',
        fontFamily: '"JetBrains Mono", monospace',
      }}
    >
      {title}
    </div>
  );
}

interface DataScreenToolbarProps {
  activePrimaryView: PrimaryScreenView;
  primaryViewOptions: Array<{ id: PrimaryScreenView; label: string }>;
  onPrimaryViewChange: (view: PrimaryScreenView) => void;
  currentMapType: 'province-outside' | 'zhejiang';
  onSelectNation: () => void;
  onSelectZhejiang: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  startDate: string;
  endDate: string;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  autoRefresh: boolean;
  onToggleAutoRefresh: () => void;
  activeViewPreset: RoleViewPreset;
  activeViewPresetLabel: string;
  activeViewPresetSubtitle: string;
  viewPresetOptions: Array<{ id: RoleViewPreset; label: string; accentColor: string }>;
  onViewPresetChange: (preset: RoleViewPreset) => void;
  isLoaded: boolean;
}

export function DataScreenToolbar({
  activePrimaryView,
  primaryViewOptions,
  onPrimaryViewChange,
  currentMapType,
  onSelectNation,
  onSelectZhejiang,
  isFullscreen,
  onToggleFullscreen,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  autoRefresh,
  onToggleAutoRefresh,
  activeViewPreset,
  activeViewPresetLabel,
  activeViewPresetSubtitle,
  viewPresetOptions,
  onViewPresetChange,
  isLoaded,
}: DataScreenToolbarProps) {
  return (
    <div
      data-testid="data-screen-toolbar"
      style={{
        height: '100%',
        minHeight: '92px',
        maxHeight: '92px',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        background: 'rgba(10, 15, 26, 0.9)',
        border: '1px solid rgba(0, 212, 255, 0.3)',
        zIndex: 100,
        overflow: 'hidden',
        opacity: isLoaded ? 1 : 0,
        animation: isLoaded ? 'fadeIn 0.5s ease-out forwards' : 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <Hexagon size={28} style={{ color: '#00D4FF' }} />
        <div>
          <h1
            style={{
              fontFamily: '"JetBrains Mono", monospace',
              color: '#FFFFFF',
              fontSize: '18px',
              fontWeight: '700',
              margin: 0,
              letterSpacing: '2px',
            }}
          >
            <span style={{ color: '#00D4FF' }}>DOUBLEJIONG</span> DATA HUB
          </h1>
          <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
            <button
              onClick={onSelectNation}
              data-testid="data-screen-map-nation-button"
              style={getMapToggleStyle(currentMapType === 'province-outside', '#00D4FF')}
            >
              <Globe size={10} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
              全国
            </button>
            <button
              onClick={onSelectZhejiang}
              data-testid="data-screen-map-zhejiang-button"
              style={getMapToggleStyle(currentMapType === 'zhejiang', '#00FF88')}
            >
              <MapPin size={10} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
              浙江省
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <div
            data-testid="data-screen-primary-view-bar"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', justifyContent: 'center' }}
          >
            {primaryViewOptions.map((view) => {
              const active = view.id === activePrimaryView;
              return (
                <button
                  key={view.id}
                  type="button"
                  data-testid={`data-screen-primary-view-${view.id}`}
                  data-active={active ? 'true' : 'false'}
                  onClick={() => onPrimaryViewChange(view.id)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '999px',
                    border: active ? '1px solid rgba(0, 212, 255, 0.72)' : '1px solid rgba(255,255,255,0.14)',
                    background: active ? 'rgba(0, 212, 255, 0.18)' : 'rgba(255,255,255,0.04)',
                    color: active ? '#00D4FF' : 'rgba(255,255,255,0.72)',
                    fontSize: '10px',
                    fontFamily: '"JetBrains Mono", monospace',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  title={view.label}
                >
                  {view.label}
                </button>
              );
            })}
          </div>
          <div
            data-testid="data-screen-view-preset-bar"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', justifyContent: 'center' }}
          >
            {viewPresetOptions.map((preset) => {
              const active = preset.id === activeViewPreset;
              return (
                <button
                  key={preset.id}
                  type="button"
                  data-testid={`data-screen-view-preset-${preset.id}`}
                  data-active={active ? 'true' : 'false'}
                  onClick={() => onViewPresetChange(preset.id)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '999px',
                    border: active ? `1px solid ${preset.accentColor}` : '1px solid rgba(255,255,255,0.14)',
                    background: active ? `${preset.accentColor}22` : 'rgba(255,255,255,0.04)',
                    color: active ? preset.accentColor : 'rgba(255,255,255,0.72)',
                    fontSize: '10px',
                    fontFamily: '"JetBrains Mono", monospace',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  title={preset.label}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
          <div
            data-testid="data-screen-active-view-preset"
            style={{
              color: 'rgba(255,255,255,0.62)',
              fontSize: '10px',
              fontFamily: '"JetBrains Mono", monospace',
              textAlign: 'center',
            }}
          >
            {activePrimaryView === 'region' ? `${activeViewPresetLabel} / ${activeViewPresetSubtitle}` : '当前为二期主视角骨架，统一筛选与 URL 协议已生效'}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          onClick={onToggleFullscreen}
          style={{
            padding: '5px 12px',
            border: isFullscreen ? '1px solid #00D4FF' : '1px solid rgba(0, 212, 255, 0.3)',
            background: isFullscreen ? 'rgba(0, 212, 255, 0.2)' : 'rgba(0, 0, 0, 0.3)',
            color: isFullscreen ? '#00D4FF' : 'rgba(255,255,255,0.7)',
            fontSize: '11px',
            borderRadius: '4px',
            fontFamily: '"JetBrains Mono", monospace',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            transition: 'all 0.2s ease',
          }}
          title={isFullscreen ? '退出全屏' : '全屏显示'}
        >
          {isFullscreen ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
            </svg>
          )}
          {isFullscreen ? '退出全屏' : '全屏'}
        </button>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 12px',
            border: '1px solid rgba(0, 212, 255, 0.3)',
            borderRadius: '4px',
            background: 'rgba(0, 0, 0, 0.3)',
          }}
        >
          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px', fontFamily: '"JetBrains Mono", monospace' }}>统计范围:</span>
          <input
            type="date"
            value={startDate}
            onChange={(event) => onStartDateChange(event.target.value)}
            style={dateInputStyle}
          />
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>至</span>
          <input
            type="date"
            value={endDate}
            onChange={(event) => onEndDateChange(event.target.value)}
            style={dateInputStyle}
          />
        </div>

        <button
          onClick={onToggleAutoRefresh}
          data-testid="data-screen-auto-refresh-toggle"
          style={{
            padding: '5px 12px',
            border: autoRefresh ? '1px solid #00FF88' : '1px solid rgba(0, 255, 136, 0.2)',
            background: autoRefresh ? 'rgba(0, 255, 136, 0.2)' : 'transparent',
            color: autoRefresh ? '#00FF88' : 'rgba(255,255,255,0.7)',
            fontSize: '11px',
            borderRadius: '4px',
            fontFamily: '"JetBrains Mono", monospace',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <RefreshCw size={12} style={{ animation: autoRefresh ? 'spin 1s linear infinite' : 'none' }} />
          自动
        </button>

        <LiveClock />
      </div>
    </div>
  );
}

interface DataScreenLeftRailProps {
  globalStatsTab: GlobalStatsTab;
  onTabChange: (tab: GlobalStatsTab) => void;
  activePanelData: DashboardPanelData | null;
  isPanelLoading: boolean;
  viewPresetLabel: string;
  viewPresetHelperText: string;
  viewPresetAccentColor: string;
  variant?: 'rail' | 'zone';
  title?: string;
  headerAccentColor?: string;
}

export function DataScreenLeftRail({
  globalStatsTab,
  onTabChange,
  activePanelData,
  isPanelLoading,
  viewPresetLabel,
  viewPresetHelperText,
  viewPresetAccentColor,
  variant = 'rail',
  title,
  headerAccentColor,
}: DataScreenLeftRailProps) {
  const isZone = variant === 'zone';
  const resolvedHeaderAccentColor = headerAccentColor || '#00D4FF';
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const zoneSummary = useMemo(() => buildZonePanelSummary(globalStatsTab, activePanelData), [globalStatsTab, activePanelData]);

  return (
    <>
      <div
        data-testid="data-screen-left-rail"
        style={{
          width: isZone ? '100%' : '380px',
          minWidth: isZone ? 0 : '380px',
          background: 'rgba(10, 15, 26, 0.95)',
          border: '1px solid rgba(0, 212, 255, 0.2)',
          borderRight: isZone ? '1px solid rgba(0, 212, 255, 0.2)' : 'none',
          borderRadius: isZone ? '22px' : 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          height: '100%',
        }}
      >
        {!isZone || title ? (
          <div
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid rgba(0, 212, 255, 0.2)',
              background: isZone ? 'linear-gradient(90deg, rgba(0, 212, 255, 0.14), rgba(0, 212, 255, 0.05))' : 'rgba(0, 212, 255, 0.1)',
            }}
          >
            <h2
              style={{
                color: resolvedHeaderAccentColor,
                fontSize: '14px',
                fontWeight: '700',
                fontFamily: '"JetBrains Mono", monospace',
                margin: 0,
                letterSpacing: '1px',
              }}
            >
              {title || '全局数据统计'}
            </h2>
          </div>
        ) : isZone ? (
          <div
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid rgba(0, 212, 255, 0.2)',
              background: 'linear-gradient(90deg, rgba(0, 212, 255, 0.14), rgba(0, 212, 255, 0.05))',
            }}
          >
            <ZoneHeaderPlaceholder accentColor={resolvedHeaderAccentColor} />
          </div>
        ) : null}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isZone ? 'repeat(2, minmax(0, 1fr))' : 'repeat(4, minmax(0, 1fr))',
            gap: isZone ? '6px' : '4px',
            padding: isZone ? '10px 12px' : '8px',
            borderBottom: '1px solid rgba(0, 212, 255, 0.15)',
          }}
        >
          {[
            { key: 'sales', label: '售前数据', icon: UserCog },
            { key: 'customers', label: '客户数据', icon: Users },
            { key: 'projects', label: '项目数据', icon: FolderKanban },
            { key: 'solutions', label: '方案数据', icon: FileText },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => onTabChange(item.key as GlobalStatsTab)}
              data-testid={`data-screen-tab-${item.key}`}
              data-active={globalStatsTab === item.key ? 'true' : 'false'}
              style={{
                width: '100%',
                padding: isZone ? '8px 6px' : '6px 4px',
                border: globalStatsTab === item.key ? '1px solid #00D4FF' : '1px solid rgba(0, 212, 255, 0.2)',
                background: globalStatsTab === item.key ? 'rgba(0, 212, 255, 0.2)' : 'rgba(0, 0, 0, 0.3)',
                color: globalStatsTab === item.key ? '#00D4FF' : 'rgba(255,255,255,0.7)',
                fontSize: isZone ? '11px' : '10px',
                borderRadius: isZone ? '8px' : '4px',
                fontFamily: '"JetBrains Mono", monospace',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: isZone ? '4px' : '2px',
                transition: 'all 0.2s ease',
              }}
            >
              <item.icon size={14} />
              {item.label}
            </button>
          ))}
        </div>

        <div
          data-testid="data-screen-view-preset-card"
          style={{
            margin: isZone ? '12px 12px 0' : '10px 12px 0',
            padding: isZone ? '12px 14px' : '10px 12px',
            borderRadius: isZone ? '12px' : '8px',
            border: `1px solid ${viewPresetAccentColor}33`,
            background: 'rgba(255,255,255,0.03)',
          }}
        >
          <div style={{ color: viewPresetAccentColor, fontSize: '11px', fontWeight: '700', fontFamily: '"JetBrains Mono", monospace' }}>
            当前视图预设
          </div>
          <div style={{ color: '#FFFFFF', fontSize: '13px', fontWeight: '600', marginTop: '6px' }}>{viewPresetLabel}</div>
          <div style={{ color: 'rgba(255,255,255,0.58)', fontSize: '10px', lineHeight: 1.6, marginTop: '6px' }}>
            {viewPresetHelperText}
          </div>
        </div>

        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: isZone ? '14px' : '12px',
            display: 'grid',
            gridTemplateColumns: '1fr',
            gridAutoRows: isZone ? 'minmax(176px, auto)' : 'minmax(200px, auto)',
            gap: '12px',
          }}
        >
          {isZone ? renderZoneSummaryPanel(zoneSummary, isPanelLoading, () => setIsDetailOpen(true)) : renderActivePanel(globalStatsTab, activePanelData, isPanelLoading)}
        </div>
      </div>

      <DataScreenDrilldownDrawer
        open={isZone && isDetailOpen}
        objectType={zoneSummary.objectType}
        title={`${zoneSummary.title}完整面板`}
        description={zoneSummary.drawerDescription}
        badges={[
          { label: viewPresetLabel, accentColor: viewPresetAccentColor, backgroundColor: `${viewPresetAccentColor}22` },
          { label: zoneSummary.title, accentColor: resolvedHeaderAccentColor, backgroundColor: `${resolvedHeaderAccentColor}22` },
        ]}
        onClose={() => setIsDetailOpen(false)}
        testId="data-screen-left-rail-detail-drawer"
        titleTestId="data-screen-left-rail-detail-drawer-title"
      >
        {renderActivePanel(globalStatsTab, activePanelData, isPanelLoading)}
      </DataScreenDrilldownDrawer>
    </>
  );
}

interface ZoneSummaryMetric {
  label: string;
  value: string;
  accentColor: string;
}

interface ZoneSummaryListItem {
  title: string;
  detail: string;
}

interface ZoneSummarySeriesItem {
  label: string;
  value: string;
  ratio: number;
  accentColor: string;
}

interface ZonePanelSummary {
  title: string;
  drawerDescription: string;
  objectType: 'personnel-item' | 'customer' | 'project' | 'solution';
  metrics: ZoneSummaryMetric[];
  primaryListTitle: string;
  primaryList: ZoneSummaryListItem[];
  secondaryListTitle: string;
  secondaryList: ZoneSummaryListItem[];
  primarySeriesVariant: 'bars' | 'columns' | 'gauges';
  primarySeries: ZoneSummarySeriesItem[];
  secondarySeriesVariant: 'bars' | 'columns' | 'gauges';
  secondarySeries: ZoneSummarySeriesItem[];
}

function renderZoneSummaryPanel(summary: ZonePanelSummary, isLoading: boolean, onOpenDetail: () => void) {
  if (isLoading) {
    return <CompactModulePlaceholder title="当前统计模块加载中..." />;
  }

  return (
    <section
      data-testid="data-screen-left-rail-zone-summary"
      style={{
        display: 'grid',
        gap: '12px',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: '8px',
        }}
      >
        {summary.metrics.map((metric) => (
          <div
            key={metric.label}
            style={{
              padding: '10px 8px',
              borderRadius: '10px',
              border: `1px solid ${metric.accentColor}2A`,
              background: 'rgba(255,255,255,0.03)',
              textAlign: 'center',
            }}
          >
            <div style={{ color: metric.accentColor, fontSize: '15px', fontWeight: 700, lineHeight: 1.2 }}>{metric.value}</div>
            <div style={{ color: 'rgba(255,255,255,0.54)', fontSize: '10px', marginTop: '5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{metric.label}</div>
          </div>
        ))}
      </div>

      <div style={{ padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}>
        <div style={{ color: '#E6F5FF', fontSize: '12px', fontWeight: 700, marginBottom: '10px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{summary.primaryListTitle}</div>
        {summary.primarySeries.length ? (
          <ZoneSummaryPreviewChart
            testId="data-screen-left-rail-primary-series"
            items={summary.primarySeries}
            variant={summary.primarySeriesVariant}
            label={summary.primarySeriesVariant === 'bars' ? '分析预览 01 / 横向对比' : summary.primarySeriesVariant === 'columns' ? '分析预览 01 / 柱状节奏' : '分析预览 01 / 环形占比'}
            accentColor="#8CE7FF"
          />
        ) : null}
        <div style={{ display: 'grid', gap: '8px' }}>
          {summary.primaryList.length ? summary.primaryList.map((item) => (
            <div key={`${summary.primaryListTitle}-${item.title}`} style={{ padding: '8px 10px', borderRadius: '10px', background: 'rgba(0,0,0,0.18)' }}>
              <div style={{ color: '#FFFFFF', fontSize: '12px', fontWeight: 600, lineHeight: 1.35, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</div>
              <div style={{ color: 'rgba(255,255,255,0.52)', fontSize: '10px', marginTop: '4px', lineHeight: 1.6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.detail}</div>
            </div>
          )) : <div style={{ color: 'rgba(255,255,255,0.46)', fontSize: '11px' }}>暂无摘要数据</div>}
        </div>
      </div>

      <div style={{ padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}>
        <div style={{ color: '#E6F5FF', fontSize: '12px', fontWeight: 700, marginBottom: '10px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{summary.secondaryListTitle}</div>
        {summary.secondarySeries.length ? (
          <ZoneSummaryPreviewChart
            testId="data-screen-left-rail-secondary-series"
            items={summary.secondarySeries}
            variant={summary.secondarySeriesVariant}
            label={summary.secondarySeriesVariant === 'bars' ? '分析预览 02 / 横向对比' : summary.secondarySeriesVariant === 'columns' ? '分析预览 02 / 柱状节奏' : '分析预览 02 / 环形占比'}
            accentColor="#C8FACC"
          />
        ) : null}
        <div style={{ display: 'grid', gap: '8px' }}>
          {summary.secondaryList.length ? summary.secondaryList.map((item) => (
            <div key={`${summary.secondaryListTitle}-${item.title}`} style={{ padding: '8px 10px', borderRadius: '10px', background: 'rgba(0,0,0,0.18)' }}>
              <div style={{ color: '#FFFFFF', fontSize: '12px', fontWeight: 600, lineHeight: 1.35, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</div>
              <div style={{ color: 'rgba(255,255,255,0.52)', fontSize: '10px', marginTop: '4px', lineHeight: 1.6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.detail}</div>
            </div>
          )) : <div style={{ color: 'rgba(255,255,255,0.46)', fontSize: '11px' }}>暂无摘要数据</div>}
        </div>
      </div>

      <button
        type="button"
        onClick={onOpenDetail}
        data-testid="data-screen-left-rail-open-detail"
        style={{
          border: '1px solid rgba(0,212,255,0.26)',
          background: 'rgba(0,212,255,0.12)',
          color: '#E6F5FF',
          borderRadius: '999px',
          padding: '10px 14px',
          fontSize: '12px',
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        打开完整面板
      </button>
    </section>
  );
}

function ZoneSummaryPreviewChart({
  testId,
  items,
  variant,
  label,
  accentColor,
}: {
  testId: string;
  items: ZoneSummarySeriesItem[];
  variant: 'bars' | 'columns' | 'gauges';
  label: string;
  accentColor: string;
}) {
  return (
    <div
      data-testid={testId}
      style={{
        ...phase2PreviewCardStyle,
        marginBottom: '10px',
        padding: '10px',
        display: 'grid',
        gap: '7px',
      }}
    >
      <DataScreenPhase2MicroLabel label={label} accentColor={accentColor} />
      {variant === 'columns' ? (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`, gap: '8px', alignItems: 'end', minHeight: '90px' }}>
          {items.map((item) => (
            <div key={`${testId}-${item.label}`} style={{ display: 'grid', gap: '5px', alignItems: 'end' }}>
              <div style={{ height: '46px', display: 'flex', alignItems: 'end' }}>
                <div style={{ width: '100%', height: `${Math.max(18, Math.min(100, item.ratio * 100))}%`, borderRadius: '8px 8px 3px 3px', background: `linear-gradient(180deg, ${item.accentColor}, ${item.accentColor}77)` }} />
              </div>
              <span style={{ color: 'rgba(255,255,255,0.56)', fontSize: '9px', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>
              <span style={{ color: item.accentColor, fontSize: '9px', fontWeight: 700, textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.value}</span>
            </div>
          ))}
        </div>
      ) : variant === 'gauges' ? (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`, gap: '8px' }}>
          {items.map((item) => (
            <div key={`${testId}-${item.label}`} style={{ display: 'grid', justifyItems: 'center', gap: '4px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '999px', background: `conic-gradient(${item.accentColor} 0deg ${Math.max(18, Math.min(360, item.ratio * 360))}deg, rgba(255,255,255,0.08) ${Math.max(18, Math.min(360, item.ratio * 360))}deg 360deg)`, display: 'grid', placeItems: 'center' }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '999px', background: 'rgba(8,14,24,0.94)', display: 'grid', placeItems: 'center', color: item.accentColor, fontSize: '8px', fontWeight: 700 }}>{Math.round(item.ratio * 100)}%</div>
              </div>
              <span style={{ color: 'rgba(255,255,255,0.56)', fontSize: '9px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>
            </div>
          ))}
        </div>
      ) : (
        items.map((item) => (
          <div key={`${testId}-${item.label}`} style={{ display: 'grid', gap: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
              <span style={{ color: 'rgba(255,255,255,0.56)', fontSize: '10px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>
              <span style={{ color: item.accentColor, fontSize: '10px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.value}</span>
            </div>
            <div style={{ height: '6px', borderRadius: '999px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
              <div style={{ width: `${Math.max(12, Math.min(100, item.ratio * 100))}%`, height: '100%', borderRadius: '999px', background: `linear-gradient(90deg, ${item.accentColor}bb, ${item.accentColor})` }} />
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function buildZonePanelSummary(globalStatsTab: GlobalStatsTab, activePanelData: DashboardPanelData | null): ZonePanelSummary {
  switch (globalStatsTab) {
    case 'sales': {
      const data = activePanelData as SalesPanelData | null;
      return {
        title: '售前数据',
        drawerDescription: '查看售前排行、饱和度、区域分布和阶段走势的完整内容。',
        objectType: 'personnel-item',
        metrics: [
          { label: '活动数', value: `${data?.summary.totalActivities ?? 0}`, accentColor: '#00D4FF' },
          { label: '转化率', value: `${data?.summary.avgConversionRate ?? 0}%`, accentColor: '#00FF88' },
          { label: '金额', value: formatWan(data?.summary.totalAmount ?? 0), accentColor: '#FBBF24' },
        ],
        primaryListTitle: '月度之星',
        primaryList: (data?.topPerformers ?? []).slice(0, 3).map((item) => ({
          title: item.name,
          detail: `${item.region} / ${item.score} / ${item.activities} 个项目`,
        })),
        primarySeriesVariant: 'bars',
        primarySeries: buildRankSeries((data?.topPerformers ?? []).slice(0, 3).map((item) => ({ label: item.name, value: item.score })), ['#00D4FF', '#34D399', '#FBBF24']),
        secondaryListTitle: '重点阶段',
        secondaryList: (data?.opportunityStages ?? []).slice(0, 3).map((item) => ({
          title: item.stage,
          detail: `${item.count} 项 / ${formatWan(item.amount)}`,
        })),
        secondarySeriesVariant: 'columns',
        secondarySeries: buildRankSeries((data?.opportunityStages ?? []).slice(0, 3).map((item) => ({ label: item.stage, value: `${item.count} 项` })), ['#00FF88', '#6EE7FF', '#FFB020']),
      };
    }
    case 'customers': {
      const data = activePanelData as CustomersPanelData | null;
      return {
        title: '客户数据',
        drawerDescription: '查看客户贡献排行、客群结构和近期活跃明细。',
        objectType: 'customer',
        metrics: [
          { label: '客户数', value: `${data?.summary.totalCustomers ?? 0}`, accentColor: '#00D4FF' },
          { label: '项目均值', value: `${data?.summary.avgProjectCount ?? '0'}`, accentColor: '#00FF88' },
          { label: '金额', value: formatWan(data?.summary.totalAmount ?? 0), accentColor: '#FBBF24' },
        ],
        primaryListTitle: '重点客户',
        primaryList: (data?.topCustomers ?? []).slice(0, 3).map((item) => ({
          title: item.name,
          detail: `${item.region} / ${formatWan(item.amount)} / ${item.projectCount} 个项目`,
        })),
        primarySeriesVariant: 'bars',
        primarySeries: buildRankSeries((data?.topCustomers ?? []).slice(0, 3).map((item) => ({ label: item.name, value: formatWan(item.amount) })), ['#00D4FF', '#34D399', '#FBBF24']),
        secondaryListTitle: '近期活跃',
        secondaryList: (data?.recentActive ?? []).slice(0, 3).map((item) => ({
          title: item.name,
          detail: `${item.type} / ${item.amount} / ${item.time}`,
        })),
        secondarySeriesVariant: 'gauges',
        secondarySeries: buildRankSeries((data?.recentActive ?? []).slice(0, 3).map((item) => ({ label: item.name, value: item.time })), ['#6EE7FF', '#A78BFA', '#34D399']),
      };
    }
    case 'projects': {
      const data = activePanelData as ProjectsPanelData | null;
      return {
        title: '项目数据',
        drawerDescription: '查看项目分布、近期项目和阶段趋势的完整内容。',
        objectType: 'project',
        metrics: [
          { label: '项目数', value: `${data?.summary.totalProjects ?? 0}`, accentColor: '#00D4FF' },
          { label: '中标数', value: `${data?.summary.wonCount ?? 0}`, accentColor: '#00FF88' },
          { label: '胜率', value: `${data?.summary.winRate ?? 0}%`, accentColor: '#FBBF24' },
        ],
        primaryListTitle: '最近项目',
        primaryList: (data?.recentProjects ?? []).slice(0, 3).map((item) => ({
          title: item.name,
          detail: `${item.customerName} / ${item.stage} / ${formatWan(item.amount)}`,
        })),
        primarySeriesVariant: 'bars',
        primarySeries: buildRankSeries((data?.recentProjects ?? []).slice(0, 3).map((item) => ({ label: item.name, value: formatWan(item.amount) })), ['#00D4FF', '#34D399', '#FBBF24']),
        secondaryListTitle: '阶段分布',
        secondaryList: (data?.stageDistribution ?? []).slice(0, 3).map((item) => ({
          title: item.stage,
          detail: `${item.count} 项 / ${formatWan(item.amount)}`,
        })),
        secondarySeriesVariant: 'columns',
        secondarySeries: buildRankSeries((data?.stageDistribution ?? []).slice(0, 3).map((item) => ({ label: item.stage, value: `${item.count} 项` })), ['#00FF88', '#6EE7FF', '#FFB020']),
      };
    }
    case 'solutions': {
      const data = activePanelData as SolutionsPanelData | null;
      return {
        title: '方案数据',
        drawerDescription: '查看方案排行、更新动态和发布状态的完整内容。',
        objectType: 'solution',
        metrics: [
          { label: '方案数', value: `${data?.summary.totalSolutions ?? 0}`, accentColor: '#00D4FF' },
          { label: '已发布', value: `${data?.summary.publishedCount ?? 0}`, accentColor: '#00FF88' },
          { label: '总浏览', value: `${data?.summary.totalViews ?? 0}`, accentColor: '#FBBF24' },
        ],
        primaryListTitle: '热门方案',
        primaryList: (data?.topSolutions ?? []).slice(0, 3).map((item) => ({
          title: item.name,
          detail: `${item.type} / ${item.status} / ${item.viewCount} 次浏览`,
        })),
        primarySeriesVariant: 'bars',
        primarySeries: buildRankSeries((data?.topSolutions ?? []).slice(0, 3).map((item) => ({ label: item.name, value: `${item.viewCount} 次` })), ['#00D4FF', '#34D399', '#FBBF24']),
        secondaryListTitle: '近期更新',
        secondaryList: (data?.recentUpdates ?? []).slice(0, 3).map((item) => ({
          title: item.name,
          detail: `${item.type} / ${item.time}`,
        })),
        secondarySeriesVariant: 'gauges',
        secondarySeries: buildRankSeries((data?.recentUpdates ?? []).slice(0, 3).map((item) => ({ label: item.name, value: item.time })), ['#6EE7FF', '#A78BFA', '#34D399']),
      };
    }
    default:
      return {
        title: '数据面板',
        drawerDescription: '查看完整数据面板。',
        objectType: 'project',
        metrics: [],
        primaryListTitle: '重点摘要',
        primaryList: [],
        secondaryListTitle: '更多明细',
        secondaryList: [],
        primarySeriesVariant: 'bars',
        primarySeries: [],
        secondarySeriesVariant: 'bars',
        secondarySeries: [],
      };
  }
}

interface DataScreenRightRailProps {
  activeViewPreset: RoleViewPreset;
  activeViewPresetLabel: string;
  currentDataType: MapDataType;
  onDataTypeChange: (type: MapDataType) => void;
  heatmapLabel: string;
  heatmapUnit: string;
  currentMapData: MapRegionData[];
  isLazyLoading: boolean;
  workbenchSummary: WorkbenchSummaryData;
  isWorkbenchLoading: boolean;
  presalesFocusSummary: PresalesFocusSummaryData;
  isPresalesFocusLoading: boolean;
  overviewMetrics: OverviewMetrics;
  topRegions: Array<{ name: string; value: number; amount: number }>;
  topRevenueRegions: Array<{ name: string; value: number; amount: number }>;
  funnel?: FunnelSummary | null;
  forecastSummary?: ForecastSummary | null;
  riskSummary?: RiskSummary | null;
  isOverviewLoading: boolean;
  variant?: 'rail' | 'zone';
  title?: string;
  headerAccentColor?: string;
}

export function DataScreenRightRail({
  activeViewPreset,
  activeViewPresetLabel,
  currentDataType,
  onDataTypeChange,
  heatmapLabel,
  heatmapUnit,
  currentMapData,
  isLazyLoading,
  workbenchSummary,
  isWorkbenchLoading,
  presalesFocusSummary,
  isPresalesFocusLoading,
  overviewMetrics,
  topRegions,
  topRevenueRegions,
  funnel,
  forecastSummary,
  riskSummary,
  isOverviewLoading,
  variant = 'rail',
  title,
  headerAccentColor,
}: DataScreenRightRailProps) {
  const isZone = variant === 'zone';
  const resolvedHeaderAccentColor = headerAccentColor || '#00FF88';
  const [selectedSecondaryModule, setSelectedSecondaryModule] = useState<SecondaryModuleKey | null>(null);
  const secondaryModules = useMemo<SecondaryModuleConfig[]>(() => {
    return [
      {
        key: 'funnel',
        title: '经营漏斗',
        summary: `${funnel?.totalOpenCount || 0} 个在手机会`,
        detail: `加权合同池 ${formatWan(funnel?.weightedPipeline || 0)}`,
        accentColor: '#00D4FF',
        previewVariant: 'columns',
        objectType: 'project',
        drawerDescription: '查看漏斗阶段拆解、加权合同池和在手机会明细。',
        content: <LazyFunnelSummaryPanel funnel={funnel} isLoading={isOverviewLoading} />,
        previewSeries: [
          { label: '在手', value: `${funnel?.totalOpenCount || 0}`, ratio: Math.min(1, (funnel?.totalOpenCount || 0) / 12 || 0), accentColor: '#00D4FF' },
          { label: '加权池', value: formatWan(funnel?.weightedPipeline || 0), ratio: Math.min(1, (funnel?.avgWinProbability || 0) / 100), accentColor: '#34D399' },
        ],
      },
      {
        key: 'forecast',
        title: '目标预测',
        summary: `${forecastSummary?.coverageRate || 0}% 覆盖率`,
        detail: forecastSummary?.gapAmount ? `缺口 ${formatWan(forecastSummary.gapAmount)}` : '当前目标已覆盖',
        accentColor: '#FBBF24',
        previewVariant: 'gauges',
        objectType: 'project',
        drawerDescription: '查看目标基线、预测完成和新增机会池缺口。',
        content: <LazyForecastSummaryPanel forecastSummary={forecastSummary} isLoading={isOverviewLoading} />,
        previewSeries: [
          { label: '覆盖率', value: `${forecastSummary?.coverageRate || 0}%`, ratio: Math.min(1, (forecastSummary?.coverageRate || 0) / 100), accentColor: '#FBBF24' },
          { label: '缺口', value: formatWan(forecastSummary?.gapAmount || 0), ratio: forecastSummary?.targetAmount ? Math.min(1, Math.abs((forecastSummary?.gapAmount || 0) / forecastSummary.targetAmount)) : 0, accentColor: '#FF8A65' },
        ],
      },
      {
        key: 'risk',
        title: '风险摘要',
        summary: `${riskSummary?.high || 0} 个高风险`,
        detail: `行动逾期 ${riskSummary?.overdueActions || 0} / 本周到期 ${riskSummary?.dueThisWeek || 0}`,
        accentColor: '#FF8A65',
        previewVariant: 'gauges',
        objectType: 'risk',
        drawerDescription: '查看重点风险对象、逾期动作和需要优先处理的项目。',
        content: <LazyRiskSummaryPanel riskSummary={riskSummary} isLoading={isOverviewLoading} />,
        previewSeries: [
          { label: '高风险', value: `${riskSummary?.high || 0}`, ratio: riskSummary?.total ? Math.min(1, (riskSummary.high || 0) / riskSummary.total) : 0, accentColor: '#FF8A65' },
          { label: '逾期', value: `${riskSummary?.overdueActions || 0}`, ratio: riskSummary?.total ? Math.min(1, (riskSummary.overdueActions || 0) / riskSummary.total) : 0, accentColor: '#FBBF24' },
        ],
      },
      {
        key: 'operations',
        title: '实时与快览',
        summary: `${currentMapData.length} 个可视热区`,
        detail: `当前口径 ${heatmapLabel} / ${heatmapUnit}`,
        accentColor: '#34D399',
        previewVariant: 'bars',
        objectType: 'region',
        drawerDescription: '查看实时动态和当前热区范围下的快速统计。',
        content: (
          <div style={{ display: 'grid', gap: '14px' }}>
            {isLazyLoading ? <CompactModulePlaceholder title="实时流稍后载入..." /> : <LazyRealTimeDataPanel />}
            {isLazyLoading ? <CompactModulePlaceholder title="快速统计稍后载入..." /> : <LazyQuickStatsPanel data={currentMapData} />}
          </div>
        ),
        previewSeries: [
          { label: '热区数', value: `${currentMapData.length}`, ratio: Math.min(1, currentMapData.length / 12), accentColor: '#34D399' },
          { label: '当前口径', value: heatmapUnit, ratio: 0.72, accentColor: '#00D4FF' },
        ],
      },
    ];
  }, [currentMapData, forecastSummary, funnel, heatmapLabel, heatmapUnit, isLazyLoading, isOverviewLoading, riskSummary]);
  const selectedSecondaryModuleConfig = secondaryModules.find((module) => module.key === selectedSecondaryModule) ?? null;

  return (
    <>
      <div
        data-testid="data-screen-right-rail"
        style={{
          width: isZone ? '100%' : '350px',
          minWidth: isZone ? 0 : '350px',
          background: 'rgba(10, 15, 26, 0.95)',
          border: '1px solid rgba(0, 212, 255, 0.2)',
          borderLeft: isZone ? '1px solid rgba(0, 212, 255, 0.2)' : 'none',
          borderRadius: isZone ? '22px' : 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          height: '100%',
        }}
      >
        {!isZone || title ? (
          <div
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid rgba(0, 212, 255, 0.2)',
              background: isZone ? 'linear-gradient(90deg, rgba(0, 255, 136, 0.14), rgba(0, 255, 136, 0.05))' : 'rgba(0, 255, 136, 0.1)',
            }}
          >
            <h2
              style={{
                color: resolvedHeaderAccentColor,
                fontSize: '14px',
                fontWeight: '700',
                fontFamily: '"JetBrains Mono", monospace',
                margin: 0,
                letterSpacing: '1px',
              }}
            >
              {title || '实时数据监控'}
            </h2>
          </div>
        ) : isZone ? (
          <div
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid rgba(0, 212, 255, 0.2)',
              background: 'linear-gradient(90deg, rgba(0, 255, 136, 0.14), rgba(0, 255, 136, 0.05))',
            }}
          >
            <ZoneHeaderPlaceholder accentColor={resolvedHeaderAccentColor} />
          </div>
        ) : null}

        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: isZone ? '14px' : '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div
            style={{
              padding: '8px',
              background: 'rgba(0, 212, 255, 0.05)',
              borderRadius: '8px',
              border: '1px solid rgba(0, 212, 255, 0.15)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '8px',
              }}
            >
              <span
                style={{
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontSize: '11px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                热力图维度
              </span>
            </div>
            <HeatmapDimensionSwitcher currentType={currentDataType} onTypeChange={onDataTypeChange} />
          </div>

          {isLazyLoading ? (
            <CompactModulePlaceholder title="热区排行稍后载入..." />
          ) : (
            <LazyHeatmapTopRank data={currentMapData} dataType={currentDataType} label={heatmapLabel} unit={heatmapUnit} />
          )}

          {activeViewPreset === 'personal-focus' ? (
            <LazyPersonalFocusPanel summary={workbenchSummary} isLoading={isWorkbenchLoading} />
          ) : null}

          {activeViewPreset === 'management' ? (
            <LazyManagementFocusPanel
              overviewMetrics={overviewMetrics}
              topRevenueRegions={topRevenueRegions}
              forecastSummary={forecastSummary}
              riskSummary={riskSummary}
              isLoading={isOverviewLoading}
            />
          ) : null}

          {activeViewPreset === 'business-focus' ? (
            <LazyBusinessFocusPanel
              funnel={funnel}
              topRegions={topRegions}
              riskSummary={riskSummary}
              isLoading={isOverviewLoading}
            />
          ) : null}

          {activeViewPreset === 'presales-focus' ? (
            <LazyPresalesFocusPanel summary={presalesFocusSummary} isLoading={isPresalesFocusLoading} />
          ) : null}

          <section
            data-testid="data-screen-right-rail-secondary-modules"
            style={{
              display: 'grid',
              gap: '10px',
              padding: '12px',
              borderRadius: '14px',
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.03)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
              <div>
                <div style={{ color: '#E6F5FF', fontSize: '12px', fontWeight: 700 }}>次级情报</div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '10px', lineHeight: 1.6, marginTop: '4px' }}>
                  漏斗、预测、风险与实时快览按专题展开，避免右栏持续过长。
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px' }}>
              {secondaryModules.map((module) => (
                <button
                  key={module.key}
                  type="button"
                  onClick={() => setSelectedSecondaryModule(module.key)}
                  data-testid={`data-screen-right-rail-secondary-card-${module.key}`}
                  style={{
                    padding: '12px',
                    borderRadius: '12px',
                    border: `1px solid ${module.accentColor}2E`,
                    background: 'rgba(0,0,0,0.18)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'grid',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <span style={{ color: module.accentColor, fontSize: '11px', fontWeight: 700 }}>{module.title}</span>
                    <span style={{ color: 'rgba(255,255,255,0.42)', fontSize: '10px' }}>展开</span>
                  </div>
                  <div style={{ color: '#FFFFFF', fontSize: '13px', fontWeight: 700, lineHeight: 1.35, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{module.summary}</div>
                  <div style={{ color: 'rgba(255,255,255,0.54)', fontSize: '10px', lineHeight: 1.6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{module.detail}</div>
                  {module.previewSeries.length ? (
                    <SecondaryModulePreviewChart
                      testId={`data-screen-right-rail-secondary-card-${module.key}-chart`}
                      items={module.previewSeries.map((item) => ({
                        label: item.label,
                        value: item.value,
                        ratio: item.ratio,
                        accentColor: item.accentColor,
                      }))}
                      variant={module.previewVariant}
                    />
                  ) : null}
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>

      <DataScreenDrilldownDrawer
        open={Boolean(selectedSecondaryModuleConfig)}
        objectType={selectedSecondaryModuleConfig?.objectType ?? 'region'}
        title={selectedSecondaryModuleConfig?.title ?? '次级情报'}
        description={selectedSecondaryModuleConfig?.drawerDescription ?? '查看次级情报的完整内容。'}
        badges={[
          { label: heatmapLabel, accentColor: '#00D4FF', backgroundColor: 'rgba(0, 212, 255, 0.12)' },
          { label: activeViewPresetLabel, accentColor: '#00FF88', backgroundColor: 'rgba(0, 255, 136, 0.12)' },
        ]}
        onClose={() => setSelectedSecondaryModule(null)}
        testId="data-screen-right-rail-secondary-drawer"
        titleTestId="data-screen-right-rail-secondary-drawer-title"
      >
        {selectedSecondaryModuleConfig?.content ?? null}
      </DataScreenDrilldownDrawer>
    </>
  );
}

type SecondaryModuleKey = 'funnel' | 'forecast' | 'risk' | 'operations';

interface SecondaryModuleConfig {
  key: SecondaryModuleKey;
  title: string;
  summary: string;
  detail: string;
  accentColor: string;
  previewVariant: 'bars' | 'columns' | 'gauges';
  objectType: 'region' | 'project' | 'risk';
  drawerDescription: string;
  content: ReactNode;
  previewSeries: ZoneSummarySeriesItem[];
}

function SecondaryModulePreviewChart({
  testId,
  items,
  variant,
}: {
  testId: string;
  items: Array<{ label: string; value: string; ratio: number; accentColor: string }>;
  variant: 'bars' | 'columns' | 'gauges';
}) {
  return (
    <div
      data-testid={testId}
      style={{
        marginTop: '2px',
        padding: '8px 9px',
        borderRadius: '10px',
        border: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(255,255,255,0.03)',
      }}
    >
      {variant === 'columns' ? (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`, gap: '8px', alignItems: 'end', minHeight: '82px' }}>
          {items.map((item) => (
            <div key={`${testId}-${item.label}`} style={{ display: 'grid', gap: '4px', alignItems: 'end' }}>
              <div style={{ height: '44px', display: 'flex', alignItems: 'end' }}>
                <div style={{ width: '100%', height: `${Math.max(18, Math.min(100, item.ratio * 100))}%`, borderRadius: '8px 8px 3px 3px', background: `linear-gradient(180deg, ${item.accentColor}, ${item.accentColor}77)` }} />
              </div>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '9px', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>
              <span style={{ color: item.accentColor, fontSize: '9px', fontWeight: 700, textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.value}</span>
            </div>
          ))}
        </div>
      ) : variant === 'gauges' ? (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`, gap: '8px' }}>
          {items.map((item) => (
            <div key={`${testId}-${item.label}`} style={{ display: 'grid', justifyItems: 'center', gap: '4px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '999px', background: `conic-gradient(${item.accentColor} 0deg ${Math.max(18, Math.min(360, item.ratio * 360))}deg, rgba(255,255,255,0.08) ${Math.max(18, Math.min(360, item.ratio * 360))}deg 360deg)`, display: 'grid', placeItems: 'center' }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '999px', background: 'rgba(8,14,24,0.94)', display: 'grid', placeItems: 'center', color: item.accentColor, fontSize: '8px', fontWeight: 700 }}>{Math.round(item.ratio * 100)}%</div>
              </div>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '9px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '6px' }}>
          {items.map((item) => (
            <div key={`${testId}-${item.label}`} style={{ display: 'grid', gap: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '10px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>
                <span style={{ color: item.accentColor, fontSize: '10px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.value}</span>
              </div>
              <div style={{ height: '6px', borderRadius: '999px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                <div style={{ width: `${Math.max(12, Math.min(100, item.ratio * 100))}%`, height: '100%', borderRadius: '999px', background: `linear-gradient(90deg, ${item.accentColor}bb, ${item.accentColor})` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function renderActivePanel(
  globalStatsTab: GlobalStatsTab,
  activePanelData: DashboardPanelData | null,
  isPanelLoading: boolean
) {
  if (isPanelLoading) {
    return <CompactModulePlaceholder title="正在加载当前统计模块..." />;
  }

  switch (globalStatsTab) {
    case 'sales':
      return <LazySalesPanel data={(activePanelData as SalesPanelData | null) ?? null} />;
    case 'customers':
      return <LazyCustomersPanel data={(activePanelData as CustomersPanelData | null) ?? null} />;
    case 'projects':
      return <LazyProjectsPanel data={(activePanelData as ProjectsPanelData | null) ?? null} />;
    case 'solutions':
      return <LazySolutionsPanel data={(activePanelData as SolutionsPanelData | null) ?? null} />;
    default:
      return null;
  }
}

function getMapToggleStyle(active: boolean, activeColor: string): CSSProperties {
  return {
    padding: '4px 12px',
    border: active ? `1px solid ${activeColor}` : `1px solid ${activeColor === '#00FF88' ? 'rgba(0, 255, 136, 0.2)' : 'rgba(0, 212, 255, 0.2)'}`,
    background: active ? (activeColor === '#00FF88' ? 'rgba(0, 255, 136, 0.2)' : 'rgba(0, 212, 255, 0.2)') : (activeColor === '#00FF88' ? 'rgba(0, 255, 136, 0.05)' : 'rgba(0, 212, 255, 0.05)'),
    color: active ? activeColor : 'rgba(255,255,255,0.6)',
    fontSize: '11px',
    borderRadius: '4px',
    fontFamily: '"JetBrains Mono", monospace',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  };
}

function formatWan(amount: number): string {
  if (!Number.isFinite(amount) || amount === 0) {
    return '0万';
  }

  return `${(amount / 10000).toFixed(amount >= 1000000 ? 0 : 1)}万`;
}

function buildRankSeries(items: Array<{ label: string; value: string }>, accentColors: string[]): ZoneSummarySeriesItem[] {
  const total = items.length;

  return items.map((item, index) => ({
    label: item.label,
    value: item.value,
    ratio: total > 0 ? (total - index) / total : 0,
    accentColor: accentColors[index % accentColors.length],
  }));
}

const dateInputStyle: CSSProperties = {
  padding: '2px 6px',
  border: '1px solid rgba(0, 212, 255, 0.3)',
  background: 'rgba(0, 0, 0, 0.5)',
  color: '#FFFFFF',
  fontSize: '11px',
  borderRadius: '3px',
  fontFamily: '"JetBrains Mono", monospace',
  cursor: 'pointer',
};