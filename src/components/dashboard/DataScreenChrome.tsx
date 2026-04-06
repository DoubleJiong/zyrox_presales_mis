'use client';

import dynamic from 'next/dynamic';
import type { CSSProperties } from 'react';
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
    loading: () => <CompactModulePlaceholder title="排行榜加载中" />,
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
        minHeight: '92px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        background: 'rgba(10, 15, 26, 0.9)',
        border: '1px solid rgba(0, 212, 255, 0.3)',
        zIndex: 100,
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
          <h1
            style={{
              fontFamily: '"JetBrains Mono", monospace',
              color: '#00D4FF',
              fontSize: '16px',
              fontWeight: '700',
              margin: 0,
              letterSpacing: '2px',
              textTransform: 'uppercase',
            }}
          >
            双江数据大屏
          </h1>
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
            {activeViewPresetLabel} / {activeViewPresetSubtitle}
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
}

export function DataScreenLeftRail({
  globalStatsTab,
  onTabChange,
  activePanelData,
  isPanelLoading,
  viewPresetLabel,
  viewPresetHelperText,
  viewPresetAccentColor,
}: DataScreenLeftRailProps) {
  return (
    <div
      data-testid="data-screen-left-rail"
      style={{
        width: '380px',
        minWidth: '380px',
        background: 'rgba(10, 15, 26, 0.95)',
        border: '1px solid rgba(0, 212, 255, 0.2)',
        borderRight: 'none',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid rgba(0, 212, 255, 0.2)',
          background: 'rgba(0, 212, 255, 0.1)',
        }}
      >
        <h2
          style={{
            color: '#00D4FF',
            fontSize: '14px',
            fontWeight: '700',
            fontFamily: '"JetBrains Mono", monospace',
            margin: 0,
            letterSpacing: '1px',
          }}
        >
          全局数据统计
        </h2>
      </div>

      <div
        style={{
          display: 'flex',
          gap: '4px',
          padding: '8px',
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
              flex: 1,
              padding: '6px 4px',
              border: globalStatsTab === item.key ? '1px solid #00D4FF' : '1px solid rgba(0, 212, 255, 0.2)',
              background: globalStatsTab === item.key ? 'rgba(0, 212, 255, 0.2)' : 'rgba(0, 0, 0, 0.3)',
              color: globalStatsTab === item.key ? '#00D4FF' : 'rgba(255,255,255,0.7)',
              fontSize: '10px',
              borderRadius: '4px',
              fontFamily: '"JetBrains Mono", monospace',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '2px',
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
          margin: '10px 12px 0',
          padding: '10px 12px',
          borderRadius: '8px',
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
          padding: '12px',
          display: 'grid',
          gridTemplateColumns: '1fr',
          gridAutoRows: 'minmax(200px, auto)',
          gap: '12px',
        }}
      >
        {renderActivePanel(globalStatsTab, activePanelData, isPanelLoading)}
      </div>
    </div>
  );
}

interface DataScreenRightRailProps {
  activeViewPreset: RoleViewPreset;
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
}

export function DataScreenRightRail({
  activeViewPreset,
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
}: DataScreenRightRailProps) {
  return (
    <div
      data-testid="data-screen-right-rail"
      style={{
        width: '350px',
        minWidth: '350px',
        background: 'rgba(10, 15, 26, 0.95)',
        border: '1px solid rgba(0, 212, 255, 0.2)',
        borderLeft: 'none',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid rgba(0, 212, 255, 0.2)',
          background: 'rgba(0, 255, 136, 0.1)',
        }}
      >
        <h2
          style={{
            color: '#00FF88',
            fontSize: '14px',
            fontWeight: '700',
            fontFamily: '"JetBrains Mono", monospace',
            margin: 0,
            letterSpacing: '1px',
          }}
        >
          实时数据监控
        </h2>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px',
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
                fontFamily: '"JetBrains Mono", monospace',
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

        <LazyFunnelSummaryPanel funnel={funnel} isLoading={isOverviewLoading} />

        <LazyForecastSummaryPanel forecastSummary={forecastSummary} isLoading={isOverviewLoading} />

        <LazyRiskSummaryPanel riskSummary={riskSummary} isLoading={isOverviewLoading} />

        {isLazyLoading ? <CompactModulePlaceholder title="实时流稍后载入..." /> : <LazyRealTimeDataPanel />}

        {isLazyLoading ? <CompactModulePlaceholder title="快速统计稍后载入..." /> : <LazyQuickStatsPanel data={currentMapData} />}
      </div>
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