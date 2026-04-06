'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { CockpitAmbientLayer } from '@/components/dashboard/CockpitAmbientLayer';
import { DataScreenCenterStage } from '@/components/dashboard/DataScreenCenterStage';
import {
  DataScreenToolbar,
  DataScreenLeftRail,
  DataScreenRightRail,
  DataScreenLoadingOverlay,
} from '@/components/dashboard/DataScreenChrome';
import { MapDataType, MapRegionData } from '@/lib/map-types';
import { useDataScreen } from '@/hooks/use-data-screen-optimized';
import { usePanelData, SalesPanelData, CustomersPanelData, ProjectsPanelData, SolutionsPanelData } from '@/hooks/use-panel-data';
import { useWorkbenchSummary } from '@/hooks/use-workbench-summary';
import { usePresalesFocusSummary } from '@/hooks/use-presales-focus-summary';
import { useAuth } from '@/contexts/auth-context';

import { getHeatmapConfig } from '@/lib/data-screen-utils';
import {
  convertToMapRegionData,
  getCurrentMapData,
  getDefaultProvinceData,
  getMapDataTypeByHeatmapMode,
} from '@/lib/data-screen-map';

type DashboardPanelData = SalesPanelData | CustomersPanelData | ProjectsPanelData | SolutionsPanelData;
type GlobalStatsTab = 'sales' | 'customers' | 'projects' | 'solutions';
type HeatmapMode = 'customer' | 'project' | 'budget' | 'contract' | 'activity' | 'solution';
type RoleViewPreset = 'management' | 'business-focus' | 'presales-focus' | 'personal-focus';
const DATA_SCREEN_TOOLBAR_HEIGHT = 92;

const ROLE_VIEW_PRESETS: Record<RoleViewPreset, {
  label: string;
  subtitle: string;
  helperText: string;
  accentColor: string;
  defaultTab: GlobalStatsTab;
  defaultHeatmapMode: HeatmapMode;
  defaultMapType: 'province-outside' | 'zhejiang';
}> = {
  management: {
    label: '管理层视图',
    subtitle: '优先看区域贡献、目标覆盖与经营风险。',
    helperText: '仅切换模块编排与默认维度，不改变当前账号的数据权限范围。',
    accentColor: '#00D4FF',
    defaultTab: 'projects',
    defaultHeatmapMode: 'customer',
    defaultMapType: 'province-outside',
  },
  'business-focus': {
    label: '经营负责人视图',
    subtitle: '优先看客户盘子、商机热区和预测缺口。',
    helperText: '适合销售/经营负责人快速判断哪里该补盘子、哪里该推进转化。',
    accentColor: '#00FF88',
    defaultTab: 'customers',
    defaultHeatmapMode: 'customer',
    defaultMapType: 'province-outside',
  },
  'presales-focus': {
    label: '售前负责人视图',
    subtitle: '优先看售前活动、项目支撑密度和方案推进。',
    helperText: '适合售前负责人先盯活动热区和项目推进面，再进入明细动作。',
    accentColor: '#FFB020',
    defaultTab: 'sales',
    defaultHeatmapMode: 'customer',
    defaultMapType: 'province-outside',
  },
  'personal-focus': {
    label: '个人跟进视图',
    subtitle: '优先看项目推进、任务节奏和个人行动窗口。',
    helperText: '当前版本仍沿用账号既有权限口径，这个预设只改变首屏关注顺序。',
    accentColor: '#FF8A65',
    defaultTab: 'projects',
    defaultHeatmapMode: 'customer',
    defaultMapType: 'province-outside',
  },
};

function normalizeRoleCode(roleCode: string | null | undefined) {
  return (roleCode || '').trim().toLowerCase();
}

function getDefaultViewPreset(roleCode: string | null | undefined): RoleViewPreset {
  const normalizedRoleCode = normalizeRoleCode(roleCode);

  if (['admin', 'super_admin', 'system_admin', 'commercial_manager', 'finance_specialist'].includes(normalizedRoleCode)) {
    return 'management';
  }

  if (['sales_manager'].includes(normalizedRoleCode)) {
    return 'business-focus';
  }

  if (['presales_manager', 'presale_manager', 'presales', 'solution_manager'].includes(normalizedRoleCode)) {
    return 'presales-focus';
  }

  return 'personal-focus';
}

export default function DataScreenPage() {
  const { user, loading: isAuthLoading } = useAuth();

  // ==================== 全局状态 ====================
  const [currentMapType, setCurrentMapType] = useState<'province-outside' | 'zhejiang'>('province-outside');
  const [isLoaded, setIsLoaded] = useState(false);

  // 全局控件状态
  const [heatmapMode, setHeatmapMode] = useState<HeatmapMode>('customer');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showAmbientLayer, setShowAmbientLayer] = useState(false);
  
  // 时间范围选择 - 使用空字符串作为初始值，避免 hydration 错误
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const datesReady = Boolean(startDate && endDate);
  
  // 全局数据统计模块：当前选中的子模块
  const [globalStatsTab, setGlobalStatsTab] = useState<GlobalStatsTab>('sales');
  const [activeViewPreset, setActiveViewPreset] = useState<RoleViewPreset>('management');
  const presetInitializedRef = useRef(false);

  const defaultViewPreset = useMemo(() => getDefaultViewPreset(user?.roleCode), [user?.roleCode]);
  const activePresetMeta = ROLE_VIEW_PRESETS[activeViewPreset];
  const availableViewPresets = useMemo(
    () => (Object.entries(ROLE_VIEW_PRESETS) as Array<[RoleViewPreset, (typeof ROLE_VIEW_PRESETS)[RoleViewPreset]]>).map(([id, meta]) => ({
      id,
      label: meta.label,
      accentColor: meta.accentColor,
    })),
    []
  );

  // ==================== 数据获取 ====================
  const {
    overview,
    heatmap,
    isLoading: isDataLoading,
    isLazyLoading,
  } = useDataScreen({
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    heatmapType: currentMapType === 'zhejiang' ? 'zhejiang' : heatmapMode,
    enabled: datesReady,
    autoRefresh,
    refreshInterval: 5 * 60 * 1000,
  });

  // 面板数据获取
  const activePanelData = usePanelData<DashboardPanelData>({ panelType: globalStatsTab, startDate, endDate });
  const personalWorkbenchSummary = useWorkbenchSummary({
    enabled: datesReady && activeViewPreset === 'personal-focus',
  });
  const presalesFocusSummary = usePresalesFocusSummary({
    startDate,
    endDate,
    enabled: datesReady && activeViewPreset === 'presales-focus',
  });

  // 热力图数据
  const [heatmapRegionData, setHeatmapRegionData] = useState<MapRegionData[]>([]);

  // 更新热力图数据
  useEffect(() => {
    if (heatmap?.success && heatmap.data.regions) {
      setHeatmapRegionData(convertToMapRegionData(heatmap.data.regions));
    } else {
      setHeatmapRegionData(getDefaultProvinceData());
    }
  }, [heatmap]);

  const currentMapData = useMemo(
    () => getCurrentMapData(currentMapType, heatmapRegionData),
    [currentMapType, heatmapRegionData]
  );

  const currentDataType = useMemo(
    () => getMapDataTypeByHeatmapMode(heatmapMode),
    [heatmapMode]
  );

  const heatmapConfig = useMemo(
    () => getHeatmapConfig(heatmapMode),
    [heatmapMode]
  );

  useEffect(() => {
    if (isAuthLoading || presetInitializedRef.current) {
      return;
    }

    setActiveViewPreset(defaultViewPreset);
    presetInitializedRef.current = true;
  }, [defaultViewPreset, isAuthLoading]);

  useEffect(() => {
    const preset = ROLE_VIEW_PRESETS[activeViewPreset];
    setGlobalStatsTab(preset.defaultTab);
    setHeatmapMode(preset.defaultHeatmapMode);
    setCurrentMapType(preset.defaultMapType);
  }, [activeViewPreset]);

  // 全屏切换
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch((err) => {
        console.error(`Error attempting to exit fullscreen: ${err.message}`);
      });
    }
  };

  // 监听全屏变化
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // 确保客户端渲染后才加载数据，避免 hydration 错误
  useEffect(() => {
    setIsMounted(true);
    // 初始化日期值
    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    setStartDate(thirtyDaysAgo.toISOString().split('T')[0]);
    setEndDate(now.toISOString().split('T')[0]);
  }, []);

  const handleDrillDown = (regionName: string) => {
    if (regionName === '浙江') {
      setCurrentMapType('zhejiang');
    }
  };

  // ==================== 入场动画 ====================
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 420);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isMounted) {
      return;
    }

    const timer = setTimeout(() => {
      setShowAmbientLayer(true);
    }, 700);

    return () => clearTimeout(timer);
  }, [isMounted]);

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0A0F1A',
      padding: 0,
      position: 'relative',
      fontFamily: '"JetBrains Mono", monospace',
      overflow: 'hidden',
      color: '#FFFFFF',
    }}>
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap');
          * { box-sizing: border-box; }
          .fade-in {
            animation: fadeIn 0.5s ease-out forwards;
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          .slide-in-right {
            animation: slideInRight 0.3s ease-out forwards;
          }
          @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }
          ::-webkit-scrollbar {
            width: 4px;
          }
          ::-webkit-scrollbar-track {
            background: rgba(0, 0, 0, 0.3);
          }
          ::-webkit-scrollbar-thumb {
            background: rgba(0, 212, 255, 0.5);
            border-radius: 2px;
          }
        `}
      </style>

      {showAmbientLayer && <CockpitAmbientLayer active={isLoaded} fullscreen={isFullscreen} />}

      {/* 主容器 */}
      <div data-testid="data-screen-page" className="relative z-10 flex h-full w-full flex-col" style={{ height: '100vh' }}>
        <DataScreenLoadingOverlay show={!isLoaded} />

        <DataScreenToolbar
          currentMapType={currentMapType}
          onSelectNation={() => {
            setCurrentMapType('province-outside');
          }}
          onSelectZhejiang={() => {
            setCurrentMapType('zhejiang');
          }}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          autoRefresh={autoRefresh}
          onToggleAutoRefresh={() => setAutoRefresh((current) => !current)}
          activeViewPreset={activeViewPreset}
          activeViewPresetLabel={activePresetMeta.label}
          activeViewPresetSubtitle={activePresetMeta.subtitle}
          viewPresetOptions={availableViewPresets}
          onViewPresetChange={setActiveViewPreset}
          isLoaded={isLoaded}
        />

        {/* 主内容区域 - 两列布局 */}
        <div style={{
          flex: 1,
          display: 'flex',
          zIndex: 10,
          opacity: isLoaded ? 1 : 0,
          animation: isLoaded ? 'fadeIn 0.5s ease-out 0.1s forwards' : 'none',
          height: `calc(100vh - ${DATA_SCREEN_TOOLBAR_HEIGHT}px)`,
          overflow: 'hidden',
        }}>
          <DataScreenLeftRail
            globalStatsTab={globalStatsTab}
            onTabChange={setGlobalStatsTab}
            activePanelData={(activePanelData.data as DashboardPanelData | null) ?? null}
            isPanelLoading={activePanelData.isLoading}
            viewPresetLabel={activePresetMeta.label}
            viewPresetHelperText={activePresetMeta.helperText}
            viewPresetAccentColor={activePresetMeta.accentColor}
          />

          <DataScreenCenterStage
            currentMapType={currentMapType}
            currentMapData={currentMapData}
            currentDataType={currentDataType}
            showMapPlaceholder={isLazyLoading && !heatmap?.data.regions?.length}
            onDrillDown={handleDrillDown}
          />

          <DataScreenRightRail
            activeViewPreset={activeViewPreset}
            currentDataType={currentDataType}
            onDataTypeChange={(type) => {
              switch (type) {
                case MapDataType.CUSTOMER_COUNT_HEATMAP:
                  setHeatmapMode('customer');
                  break;
                case MapDataType.PROJECT_COUNT_HEATMAP:
                  setHeatmapMode('project');
                  break;
                case MapDataType.BUDGET:
                  setHeatmapMode('budget');
                  break;
                case MapDataType.CONTRACT_AMOUNT:
                  setHeatmapMode('contract');
                  break;
                case MapDataType.PRE_SALES_ACTIVITY:
                  setHeatmapMode('activity');
                  break;
                case MapDataType.SOLUTION_USAGE:
                  setHeatmapMode('solution');
                  break;
              }
            }}
            heatmapLabel={heatmapConfig.label}
            heatmapUnit={heatmapConfig.unit}
            currentMapData={currentMapData}
            isLazyLoading={isLazyLoading}
            workbenchSummary={personalWorkbenchSummary.data}
            overviewMetrics={{
              totalCustomers: overview?.data.totalCustomers ?? 0,
              totalProjects: overview?.data.totalProjects ?? 0,
              totalRevenue: overview?.data.totalRevenue ?? 0,
              wonProjects: overview?.data.wonProjects ?? 0,
            }}
            topRegions={overview?.data.topRegions ?? []}
            topRevenueRegions={overview?.data.topRevenueRegions ?? []}
            isWorkbenchLoading={personalWorkbenchSummary.isLoading}
            presalesFocusSummary={presalesFocusSummary.data}
            isPresalesFocusLoading={presalesFocusSummary.isLoading}
            funnel={overview?.data.funnel}
            forecastSummary={overview?.data.forecastSummary}
            riskSummary={overview?.data.riskSummary}
            isOverviewLoading={isDataLoading && !overview}
          />
        </div>
      </div>

    </div>
  );
}

