'use client';

import dynamic from 'next/dynamic';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useMemo, useRef } from 'react';
import { CockpitAmbientLayer } from '@/components/dashboard/CockpitAmbientLayer';
import { DataScreenCenterStage } from '@/components/dashboard/DataScreenCenterStage';
import type { DataScreenTopicPrototype } from '@/components/dashboard/DataScreenTopicLayout';
import {
  DataScreenRegionLayout,
  type DataScreenRegionBottomPanel,
  type DataScreenRegionSummaryMetric,
} from '@/components/dashboard/DataScreenRegionLayout';
import {
  DataScreenToolbar,
  HeavyModulePlaceholder,
  DataScreenLeftRail,
  DataScreenRightRail,
  DataScreenLoadingOverlay,
  PrimaryScreenView,
} from '@/components/dashboard/DataScreenChrome';
import { MapDataType, MapRegionData } from '@/lib/map-types';
import { useDataScreenRegionDetail } from '@/hooks/use-data-screen-region-detail';
import { useDataScreenPersonnelView } from '@/hooks/use-data-screen-personnel-view';
import { useDataScreenRegionView } from '@/hooks/use-data-screen-region-view';
import type { DataScreenPersonnelAbnormalFilter } from '@/lib/data-screen-personnel-view';
import { usePanelData, SalesPanelData, CustomersPanelData, ProjectsPanelData, SolutionsPanelData } from '@/hooks/use-panel-data';
import { useWorkbenchSummary } from '@/hooks/use-workbench-summary';
import { usePresalesFocusSummary } from '@/hooks/use-presales-focus-summary';
import { useAuth } from '@/contexts/auth-context';
import {
  buildDataScreenPhase2SearchParams,
  DATA_SCREEN_PRIMARY_VIEW_OPTIONS,
  getDefaultDataScreenDateRange,
  parseDataScreenPhase2Filters,
} from '@/lib/data-screen-phase2-filters';

import { getHeatmapConfig } from '@/lib/data-screen-utils';
import {
  getCurrentMapData,
  getMapDataTypeByHeatmapMode,
} from '@/lib/data-screen-map';

const LazyDataScreenPersonnelLayout = dynamic(
  () => import('@/components/dashboard/DataScreenPersonnelLayout').then((module) => ({ default: module.DataScreenPersonnelLayout })),
  {
    ssr: false,
    loading: () => <HeavyModulePlaceholder title="人员视角载入中" subtitle="正在分层加载人员画像与事项穿透" />,
  }
);

const LazyDataScreenTopicLayout = dynamic(
  () => import('@/components/dashboard/DataScreenTopicLayout').then((module) => ({ default: module.DataScreenTopicLayout })),
  {
    ssr: false,
    loading: () => <HeavyModulePlaceholder title="专题视角载入中" subtitle="正在按需挂接专题原型与联动数据" />,
  }
);

const LazyDataScreenRegionDetailDrawer = dynamic(
  () => import('@/components/dashboard/DataScreenRegionDetailDrawer').then((module) => ({ default: module.DataScreenRegionDetailDrawer })),
  { ssr: false }
);

const LazyDataScreenPersonnelItemDetailDrawer = dynamic(
  () => import('@/components/dashboard/DataScreenPersonnelItemDetailDrawer').then((module) => ({ default: module.DataScreenPersonnelItemDetailDrawer })),
  { ssr: false }
);

const LazyDataScreenTopicProjectRiskDrawer = dynamic(
  () => import('@/components/dashboard/DataScreenTopicProjectRiskDrawer').then((module) => ({ default: module.DataScreenTopicProjectRiskDrawer })),
  { ssr: false }
);

type DashboardPanelData = SalesPanelData | CustomersPanelData | ProjectsPanelData | SolutionsPanelData;
type GlobalStatsTab = 'sales' | 'customers' | 'projects' | 'solutions';
type HeatmapMode = 'customer' | 'project' | 'budget' | 'contract' | 'activity' | 'solution';
type RoleViewPreset = 'management' | 'business-focus' | 'presales-focus' | 'personal-focus';
const DATA_SCREEN_TOOLBAR_HEIGHT = 92;
const DATA_SCREEN_PRIMARY_VIEWS: Array<{ id: PrimaryScreenView; label: string }> = DATA_SCREEN_PRIMARY_VIEW_OPTIONS.map((option) => ({
  id: option.value,
  label: option.label,
}));

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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, loading: isAuthLoading } = useAuth();
  const urlFilters = useMemo(() => parseDataScreenPhase2Filters(searchParams), [searchParams]);

  // ==================== 全局状态 ====================
  const [activePrimaryView, setActivePrimaryView] = useState<PrimaryScreenView>('region');
  const [currentMapType, setCurrentMapType] = useState<'province-outside' | 'zhejiang'>('province-outside');
  const [isLoaded, setIsLoaded] = useState(false);

  // 全局控件状态
  const [heatmapMode, setHeatmapMode] = useState<HeatmapMode>('customer');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showAmbientLayer, setShowAmbientLayer] = useState(false);
  const [filtersHydrated, setFiltersHydrated] = useState(false);
  
  // 时间范围选择 - 使用空字符串作为初始值，避免 hydration 错误
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const datesReady = Boolean(startDate && endDate);
  
  // 全局数据统计模块：当前选中的子模块
  const [globalStatsTab, setGlobalStatsTab] = useState<GlobalStatsTab>('sales');
  const [activeViewPreset, setActiveViewPreset] = useState<RoleViewPreset>('management');
  const [selectedRegion, setSelectedRegion] = useState<{ name: string; source: 'map' | 'ranking' | 'risk' } | null>(null);
  const [selectedPersonnelId, setSelectedPersonnelId] = useState<number | null>(null);
  const [activePersonnelAbnormalFilter, setActivePersonnelAbnormalFilter] = useState<DataScreenPersonnelAbnormalFilter>('all');
  const [selectedPersonnelItemId, setSelectedPersonnelItemId] = useState<string | null>(null);
  const [activeTopic, setActiveTopic] = useState<DataScreenTopicPrototype>('project-risk');
  const [selectedTopicRiskProjectId, setSelectedTopicRiskProjectId] = useState<number | null>(null);
  const presetInitializedRef = useRef(false);
  const fullscreenRootRef = useRef<HTMLDivElement | null>(null);

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
    data: regionViewData,
    isLoading: isRegionViewLoading,
    isRefreshing: isRegionViewRefreshing,
    error: regionViewError,
  } = useDataScreenRegionView({
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    mapType: currentMapType,
    heatmapMode,
    enabled: datesReady && (activePrimaryView === 'region' || activePrimaryView === 'topic'),
    autoRefresh,
    refreshInterval: 5 * 60 * 1000,
  });

  const {
    data: regionDetailData,
    isLoading: isRegionDetailLoading,
    error: regionDetailError,
  } = useDataScreenRegionDetail({
    regionName: selectedRegion?.name,
    mapType: currentMapType,
    heatmapMode,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    enabled: datesReady && activePrimaryView === 'region' && !!selectedRegion?.name,
  });

  const {
    data: personnelViewData,
    isLoading: isPersonnelViewLoading,
    error: personnelViewError,
  } = useDataScreenPersonnelView({
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    preset: activeViewPreset,
    selectedPersonId: activePrimaryView === 'personnel' ? selectedPersonnelId : undefined,
    abnormalFilter: activePersonnelAbnormalFilter,
    selectedItemId: selectedPersonnelItemId,
    enabled: datesReady && (activePrimaryView === 'personnel' || activePrimaryView === 'topic'),
  });

  const selectedTopicRiskProject = useMemo(
    () => regionViewData?.riskSummary.items.find((item) => item.projectId === selectedTopicRiskProjectId) || null,
    [regionViewData, selectedTopicRiskProjectId],
  );

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

  const heatmapRegionData = useMemo<MapRegionData[]>(
    () => (regionViewData?.map.regions as MapRegionData[] | undefined) ?? [],
    [regionViewData]
  );

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

  const heatmapPeakRegion = useMemo(() => {
    return [...currentMapData]
      .map((region) => ({ region, value: getMapMetricValue(region, currentDataType) }))
      .sort((left, right) => right.value - left.value)[0] ?? null;
  }, [currentDataType, currentMapData]);

  const openRegionDetail = (regionName: string, source: 'map' | 'ranking' | 'risk' = 'ranking') => {
    const normalizedRegionName = regionName.trim();
    if (!normalizedRegionName) {
      return;
    }

    setSelectedRegion({ name: normalizedRegionName, source });
  };

  const abnormalRegionCount = useMemo(
    () => heatmapRegionData.filter((region) => region.hasCustomerAlert || region.hasProjectAlert || region.hasUserAlert).length,
    [heatmapRegionData]
  );

  const aggregatedRegionMetrics = useMemo(() => {
    return heatmapRegionData.reduce(
      (accumulator, region) => {
        accumulator.projectAmount += region.projectAmount || 0;
        accumulator.contractAmount += region.contractAmount || 0;
        accumulator.preSalesActivity += region.preSalesActivity || 0;
        accumulator.solutionUsage += region.solutionUsage || 0;
        return accumulator;
      },
      {
        projectAmount: 0,
        contractAmount: 0,
        preSalesActivity: 0,
        solutionUsage: 0,
      }
    );
  }, [heatmapRegionData]);

  const centerStageMetrics = useMemo(
    () => [
      {
        label: '异常热区',
        value: formatCount(abnormalRegionCount),
        accentColor: '#FF8A65',
      },
      {
        label: `${heatmapConfig.label}峰值`,
        value: heatmapPeakRegion
          ? formatMapMetricValue(currentDataType, heatmapPeakRegion.value)
          : '--',
        accentColor: heatmapConfig.color,
      },
      {
        label: '行动逾期',
        value: formatCount(regionViewData?.riskSummary.overdueActions ?? 0),
        accentColor: '#FBBF24',
      },
    ],
    [abnormalRegionCount, currentDataType, heatmapConfig.color, heatmapConfig.label, heatmapPeakRegion, regionViewData]
  );

  const centerStageSpotlightRegions = useMemo(() => {
    return [...currentMapData]
      .map((region) => ({ region, metricValue: getMapMetricValue(region, currentDataType) }))
      .sort((left, right) => right.metricValue - left.metricValue)
      .slice(0, 3)
      .map(({ region }, index) => ({
        region,
        value: formatMapMetricValue(currentDataType, getMapMetricValue(region, currentDataType)),
        detail: `${heatmapConfig.label}领先，客户 ${formatCount(region.customerCount || 0)} / 项目 ${formatCount(region.projectCount || 0)}`,
        accentColor: [heatmapConfig.color, '#34D399', '#6EE7FF'][index % 3],
      }));
  }, [currentDataType, currentMapData, heatmapConfig.color, heatmapConfig.label]);

  const centerStageAlertItems = useMemo(() => {
    return [...heatmapRegionData]
      .filter((region) => region.hasCustomerAlert || region.hasProjectAlert || region.hasUserAlert)
      .sort((left, right) => getAlertPriority(right) - getAlertPriority(left))
      .slice(0, 3)
      .map((region) => ({
        region,
        title: buildRegionAlertTitle(region),
        detail: `${formatCount(region.customerCount || 0)} 家客户 / ${formatCount(region.projectCount || 0)} 个项目 / 售前 ${formatCount(region.preSalesActivity || 0)}`,
        accentColor: getRegionAlertAccent(region),
      }));
  }, [heatmapRegionData]);

  const summaryMetrics = useMemo<DataScreenRegionSummaryMetric[]>(() => {
    if (activeViewPreset === 'management') {
      return [
        {
          key: 'customers',
          label: '客户总览',
          value: formatCount(regionViewData?.summary.totalCustomers ?? 0),
          detail: `覆盖 ${formatCount(regionViewData?.summary.activeRegionCount ?? 0)} 个活跃区域`,
          accentColor: '#00D4FF',
          variant: 'hero',
          secondaryMetrics: [
            { label: '异常区域', value: formatCount(abnormalRegionCount), accentColor: '#A78BFA' },
            { label: '售前活动', value: formatCount(aggregatedRegionMetrics.preSalesActivity), accentColor: '#6EE7FF' },
            { label: '方案支撑', value: formatCount(aggregatedRegionMetrics.solutionUsage), accentColor: '#34D399' },
          ],
        },
        {
          key: 'projects',
          label: '项目总览',
          value: formatCount(regionViewData?.summary.totalProjects ?? 0),
          detail: `中标 ${formatCount(regionViewData?.summary.wonProjects ?? 0)} 个 / 覆盖率 ${regionViewData?.forecastSummary.coverageRate ?? 0}%`,
          accentColor: '#00FF88',
          variant: 'hero',
          secondaryMetrics: [
            { label: '项目金额', value: formatWanAmount(aggregatedRegionMetrics.projectAmount), accentColor: '#6EE7FF' },
            { label: '合同金额', value: formatWanAmount(aggregatedRegionMetrics.contractAmount), accentColor: '#FBBF24' },
            { label: '风险项目', value: formatCount(regionViewData?.summary.riskProjectCount ?? 0), accentColor: '#FF8A65' },
          ],
        },
      ];
    }

    return [
      {
        key: 'customers',
        label: '客户总量',
        value: formatCount(regionViewData?.summary.totalCustomers ?? 0),
        detail: `覆盖 ${formatCount(regionViewData?.summary.activeRegionCount ?? 0)} 个活跃区域`,
        accentColor: '#00D4FF',
      },
      {
        key: 'projects',
        label: '项目总量',
        value: formatCount(regionViewData?.summary.totalProjects ?? 0),
        detail: `中标 ${formatCount(regionViewData?.summary.wonProjects ?? 0)} 个`,
        accentColor: '#00FF88',
      },
      {
        key: 'project-amount',
        label: '项目金额',
        value: formatWanAmount(aggregatedRegionMetrics.projectAmount),
        detail: '按当前区域热区聚合',
        accentColor: '#6EE7FF',
      },
      {
        key: 'contract-amount',
        label: '合同金额',
        value: formatWanAmount(aggregatedRegionMetrics.contractAmount),
        detail: `预测覆盖率 ${regionViewData?.forecastSummary.coverageRate ?? 0}%`,
        accentColor: '#FBBF24',
      },
      {
        key: 'presales-activity',
        label: '售前活动数',
        value: formatCount(aggregatedRegionMetrics.preSalesActivity),
        detail: `加权合同池 ${formatWanAmount(regionViewData?.funnel.weightedPipeline ?? 0)}`,
        accentColor: '#34D399',
      },
      {
        key: 'solution-usage',
        label: '方案支撑数',
        value: formatCount(aggregatedRegionMetrics.solutionUsage),
        detail: `已纳管方案 ${formatCount(regionViewData?.summary.totalSolutions ?? 0)} 个`,
        accentColor: '#FFB020',
      },
      {
        key: 'risk-projects',
        label: '风险项目数',
        value: formatCount(regionViewData?.summary.riskProjectCount ?? 0),
        detail: `高风险 ${formatCount(regionViewData?.riskSummary.high ?? 0)} 个`,
        accentColor: '#FF8A65',
      },
      {
        key: 'abnormal-regions',
        label: '异常区域数',
        value: formatCount(abnormalRegionCount),
        detail: `${currentMapType === 'zhejiang' ? '浙江地市' : '全国省份'}异常热区提示`,
        accentColor: '#A78BFA',
      },
    ];
  }, [abnormalRegionCount, activeViewPreset, aggregatedRegionMetrics, currentMapType, regionViewData]);

  const customerTopRegions = useMemo(
    () => [...heatmapRegionData].sort((left, right) => (right.customerCount || 0) - (left.customerCount || 0)).slice(0, 4),
    [heatmapRegionData]
  );

  const solutionTopRegions = useMemo(
    () => [...heatmapRegionData].sort((left, right) => (right.solutionUsage || 0) - (left.solutionUsage || 0)).slice(0, 4),
    [heatmapRegionData]
  );

  const maxCustomerTopCount = useMemo(
    () => customerTopRegions.reduce((max, region) => Math.max(max, region.customerCount || 0), 0),
    [customerTopRegions]
  );

  const maxSolutionTopUsage = useMemo(
    () => solutionTopRegions.reduce((max, region) => Math.max(max, region.solutionUsage || 0), 0),
    [solutionTopRegions]
  );

  const regionBottomPanels = useMemo<DataScreenRegionBottomPanel[]>(() => {
    const customerAlertRegions = heatmapRegionData
      .filter((region) => region.hasCustomerAlert)
      .sort((left, right) => (right.customerCount || 0) - (left.customerCount || 0))
      .slice(0, 4);
    const projectHotRegions = [...heatmapRegionData]
      .sort((left, right) => (right.projectCount || 0) - (left.projectCount || 0))
      .slice(0, 4);

    return [
      {
        key: 'customers',
        title: '客户盘子',
        subtitle: '看活跃客户覆盖、客户热区和异常区域客户盘子。',
        accentColor: '#00D4FF',
        ctaLabel: '查看客户全景',
        previewChartVariant: 'bars',
        previewStats: [
          { label: '活跃客户', value: formatCount(regionViewData?.summary.totalCustomers ?? 0) },
          { label: '活跃区域', value: formatCount(regionViewData?.summary.activeRegionCount ?? 0) },
        ],
        previewSeries: customerTopRegions.slice(0, 3).map((region, index) => ({
          label: region.name,
          value: `${formatCount(region.customerCount || 0)} 家`,
          ratio: maxCustomerTopCount ? (region.customerCount || 0) / maxCustomerTopCount : 0,
          accentColor: ['#00D4FF', '#34D399', '#6EE7FF'][index % 3],
        })),
        content: (
          <div style={{ display: 'grid', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)', gap: '14px' }}>
              <SeriesChartPanel
                title="客户热区分布"
                items={customerTopRegions.map((region, index) => ({
                  label: region.name,
                  value: `${formatCount(region.customerCount || 0)} 家`,
                  ratio: maxCustomerTopCount ? (region.customerCount || 0) / maxCustomerTopCount : 0,
                  accentColor: ['#00D4FF', '#34D399', '#6EE7FF', '#A78BFA'][index % 4],
                }))}
                variant="bars"
                emptyText="暂无客户热区数据"
              />
              <SeriesChartPanel
                title="客户异动监测"
                items={customerAlertRegions.map((region, index) => ({
                  label: region.name,
                  value: `${formatCount(region.customerCount || 0)} 家`,
                  ratio: customerAlertRegions[0]?.customerCount ? (region.customerCount || 0) / (customerAlertRegions[0].customerCount || 1) : 0,
                  accentColor: ['#A78BFA', '#FF8A65', '#6EE7FF', '#34D399'][index % 4],
                }))}
                variant="columns"
                emptyText="暂无客户异动区域"
              />
            </div>
            <div style={{ ...bottomMetricGridStyle, gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
              <MetricCell label="活跃客户" value={formatCount(regionViewData?.summary.totalCustomers ?? 0)} accentColor="#00D4FF" />
              <MetricCell label="活跃区域" value={formatCount(regionViewData?.summary.activeRegionCount ?? 0)} accentColor="#34D399" />
              <MetricCell label="异常区域" value={formatCount(abnormalRegionCount)} accentColor="#A78BFA" />
              <MetricCell label="售前活动" value={formatCount(aggregatedRegionMetrics.preSalesActivity)} accentColor="#6EE7FF" />
            </div>
            <RankList title="重点客户区域" items={customerTopRegions.map((region) => ({ name: region.name, value: `${formatCount(region.customerCount || 0)} 家`, onClick: () => openRegionDetail(region.name, 'ranking') }))} emptyText="暂无重点客户区域" />
          </div>
        ),
      },
      {
        key: 'projects',
        title: '项目节奏',
        subtitle: '看项目规模、阶段分布和当前成交覆盖节奏。',
        accentColor: '#00FF88',
        ctaLabel: '查看项目全景',
        previewChartVariant: 'columns',
        previewStats: [
          { label: '项目总数', value: formatCount(regionViewData?.summary.totalProjects ?? 0) },
          { label: '中标项目', value: formatCount(regionViewData?.summary.wonProjects ?? 0) },
        ],
        previewSeries: (regionViewData?.funnel.stages ?? []).slice(0, 3).map((stage, index) => ({
          label: stage.label,
          value: `${formatCount(stage.count)} 项`,
          ratio: regionViewData?.funnel.totalOpenCount ? stage.count / regionViewData.funnel.totalOpenCount : 0,
          accentColor: ['#00FF88', '#FBBF24', '#00D4FF'][index % 3],
        })),
        content: (
          <div style={{ display: 'grid', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)', gap: '14px' }}>
              <SeriesChartPanel
                title="阶段分布图"
                items={(regionViewData?.funnel.stages ?? []).slice(0, 4).map((stage, index) => ({
                  label: stage.label,
                  value: `${formatCount(stage.count)} 项`,
                  ratio: regionViewData?.funnel.totalOpenCount ? stage.count / regionViewData.funnel.totalOpenCount : 0,
                  accentColor: ['#00FF88', '#FBBF24', '#00D4FF', '#34D399'][index % 4],
                }))}
                variant="columns"
                emptyText="暂无项目阶段数据"
              />
              <SeriesChartPanel
                title="项目热区图"
                items={projectHotRegions.map((region, index) => ({
                  label: region.name,
                  value: `${formatCount(region.projectCount || 0)} 项`,
                  ratio: projectHotRegions[0]?.projectCount ? (region.projectCount || 0) / (projectHotRegions[0].projectCount || 1) : 0,
                  accentColor: ['#6EE7FF', '#34D399', '#FBBF24', '#A78BFA'][index % 4],
                }))}
                variant="bars"
                emptyText="暂无项目热区数据"
              />
            </div>
            <div style={{ ...bottomMetricGridStyle, gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
              <MetricCell label="项目总数" value={formatCount(regionViewData?.summary.totalProjects ?? 0)} accentColor="#00FF88" />
              <MetricCell label="中标项目" value={formatCount(regionViewData?.summary.wonProjects ?? 0)} accentColor="#FBBF24" />
              <MetricCell label="项目金额" value={formatWanAmount(aggregatedRegionMetrics.projectAmount)} accentColor="#6EE7FF" />
              <MetricCell label="合同金额" value={formatWanAmount(aggregatedRegionMetrics.contractAmount)} accentColor="#34D399" />
            </div>
            <StackList
              title="阶段明细"
              items={(regionViewData?.funnel.stages ?? []).slice(0, 4).map((stage) => ({
                label: stage.label,
                meta: `${stage.count} 项 / ${formatWanAmount(stage.amount)}`,
                ratio: regionViewData?.funnel.totalOpenCount ? stage.count / regionViewData.funnel.totalOpenCount : 0,
              }))}
              emptyText="暂无项目阶段数据"
            />
          </div>
        ),
      },
      {
        key: 'solutions',
        title: '方案支撑',
        subtitle: '看方案支撑、售前活动和方案热区分布。',
        accentColor: '#FFB020',
        ctaLabel: '查看方案全景',
        previewChartVariant: 'bars',
        previewStats: [
          { label: '方案总数', value: formatCount(regionViewData?.summary.totalSolutions ?? 0) },
          { label: '售前活动', value: formatCount(aggregatedRegionMetrics.preSalesActivity) },
        ],
        previewSeries: solutionTopRegions.slice(0, 3).map((region, index) => ({
          label: region.name,
          value: `${formatCount(region.solutionUsage || 0)} 次`,
          ratio: maxSolutionTopUsage ? (region.solutionUsage || 0) / maxSolutionTopUsage : 0,
          accentColor: ['#FFB020', '#6EE7FF', '#34D399'][index % 3],
        })),
        content: (
          <div style={{ display: 'grid', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)', gap: '14px' }}>
              <SeriesChartPanel
                title="方案热区图"
                items={solutionTopRegions.map((region, index) => ({
                  label: region.name,
                  value: `${formatCount(region.solutionUsage || 0)} 次`,
                  ratio: maxSolutionTopUsage ? (region.solutionUsage || 0) / maxSolutionTopUsage : 0,
                  accentColor: ['#FFB020', '#6EE7FF', '#34D399', '#A78BFA'][index % 4],
                }))}
                variant="bars"
                emptyText="暂无方案热区数据"
              />
              <SeriesChartPanel
                title="推进节奏图"
                items={(regionViewData?.funnel.stages ?? []).slice(0, 4).map((stage, index) => ({
                  label: stage.label,
                  value: `${stage.count} 项`,
                  ratio: regionViewData?.funnel.totalOpenCount ? stage.count / regionViewData.funnel.totalOpenCount : 0,
                  accentColor: ['#34D399', '#00D4FF', '#FBBF24', '#FFB020'][index % 4],
                }))}
                variant="columns"
                emptyText="暂无推进节奏数据"
              />
            </div>
            <div style={{ ...bottomMetricGridStyle, gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
              <MetricCell label="方案总数" value={formatCount(regionViewData?.summary.totalSolutions ?? 0)} accentColor="#FFB020" />
              <MetricCell label="售前活动" value={formatCount(aggregatedRegionMetrics.preSalesActivity)} accentColor="#6EE7FF" />
              <MetricCell label="方案支撑" value={formatCount(aggregatedRegionMetrics.solutionUsage)} accentColor="#34D399" />
              <MetricCell label="加权合同池" value={formatWanAmount(regionViewData?.funnel.weightedPipeline ?? 0)} accentColor="#A78BFA" />
            </div>
            <RankList title="重点方案区域" items={solutionTopRegions.map((region) => ({ name: region.name, value: `${formatCount(region.solutionUsage || 0)} 次`, onClick: () => openRegionDetail(region.name, 'ranking') }))} emptyText="暂无重点方案区域" />
          </div>
        ),
      },
      {
        key: 'risks',
        title: '风险价值',
        subtitle: '看高风险项目、逾期动作和需要继续盯防的对象。',
        accentColor: '#FF8A65',
        ctaLabel: '查看风险全景',
        previewChartVariant: 'gauges',
        previewStats: [
          { label: '风险总量', value: formatCount(regionViewData?.riskSummary.total ?? 0) },
          { label: '行动逾期', value: formatCount(regionViewData?.riskSummary.overdueActions ?? 0) },
        ],
        previewSeries: [
          {
            label: '高风险',
            value: formatCount(regionViewData?.riskSummary.high ?? 0),
            ratio: regionViewData?.riskSummary.total ? (regionViewData.riskSummary.high ?? 0) / regionViewData.riskSummary.total : 0,
            accentColor: '#FF8A65',
          },
          {
            label: '中风险',
            value: formatCount(regionViewData?.riskSummary.medium ?? 0),
            ratio: regionViewData?.riskSummary.total ? (regionViewData.riskSummary.medium ?? 0) / regionViewData.riskSummary.total : 0,
            accentColor: '#FBBF24',
          },
          {
            label: '行动逾期',
            value: formatCount(regionViewData?.riskSummary.overdueActions ?? 0),
            ratio: regionViewData?.riskSummary.total ? (regionViewData.riskSummary.overdueActions ?? 0) / regionViewData.riskSummary.total : 0,
            accentColor: '#A78BFA',
          },
        ],
        content: (
          <div style={{ display: 'grid', gap: '16px' }}>
            <SeriesChartPanel
              title="风险结构图"
              items={[
                {
                  label: '高风险',
                  value: `${formatCount(regionViewData?.riskSummary.high ?? 0)} 个`,
                  ratio: regionViewData?.riskSummary.total ? (regionViewData.riskSummary.high ?? 0) / regionViewData.riskSummary.total : 0,
                  accentColor: '#FF8A65',
                },
                {
                  label: '中风险',
                  value: `${formatCount(regionViewData?.riskSummary.medium ?? 0)} 个`,
                  ratio: regionViewData?.riskSummary.total ? (regionViewData.riskSummary.medium ?? 0) / regionViewData.riskSummary.total : 0,
                  accentColor: '#FBBF24',
                },
                {
                  label: '逾期动作',
                  value: `${formatCount(regionViewData?.riskSummary.overdueActions ?? 0)} 项`,
                  ratio: regionViewData?.riskSummary.total ? (regionViewData.riskSummary.overdueActions ?? 0) / regionViewData.riskSummary.total : 0,
                  accentColor: '#A78BFA',
                },
              ]}
              variant="gauges"
              emptyText="暂无风险结构数据"
            />
            <div style={{ ...bottomMetricGridStyle, gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
              <MetricCell label="风险总量" value={formatCount(regionViewData?.riskSummary.total ?? 0)} accentColor="#FF8A65" />
              <MetricCell label="行动逾期" value={formatCount(regionViewData?.riskSummary.overdueActions ?? 0)} accentColor="#FBBF24" />
              <MetricCell label="高风险" value={formatCount(regionViewData?.riskSummary.high ?? 0)} accentColor="#FF8A65" />
              <MetricCell label="本周到期" value={formatCount(regionViewData?.riskSummary.dueThisWeek ?? 0)} accentColor="#A78BFA" />
            </div>
            <RiskList items={(regionViewData?.riskSummary.items ?? []).slice(0, 4).map((item) => ({
              key: String(item.projectId),
              name: item.projectName,
              value: `${item.region} / ${item.reason}`,
              accentColor: item.riskLevel === 'high' ? '#FF8A65' : '#FBBF24',
              onClick: () => openRegionDetail(item.region, 'risk'),
            }))} emptyText="暂无重点阻塞对象" />
          </div>
        ),
      },
    ];
  }, [abnormalRegionCount, aggregatedRegionMetrics.contractAmount, aggregatedRegionMetrics.preSalesActivity, aggregatedRegionMetrics.projectAmount, aggregatedRegionMetrics.solutionUsage, customerTopRegions, heatmapRegionData, maxCustomerTopCount, maxSolutionTopUsage, openRegionDetail, regionViewData, solutionTopRegions]);

  useEffect(() => {
    if (!isMounted || isAuthLoading) {
      return;
    }

    const fallbackDateRange = getDefaultDataScreenDateRange();
    setActivePrimaryView(urlFilters.view);
    setCurrentMapType(urlFilters.map);
    setHeatmapMode(urlFilters.heatmap);
    setAutoRefresh(urlFilters.autoRefresh);
    setGlobalStatsTab(urlFilters.panel);
    setActiveViewPreset(urlFilters.preset || defaultViewPreset);
    setStartDate(urlFilters.startDate || fallbackDateRange.startDate);
    setEndDate(urlFilters.endDate || fallbackDateRange.endDate);
    presetInitializedRef.current = true;
    setFiltersHydrated(true);
  }, [defaultViewPreset, isAuthLoading, isMounted, urlFilters]);

  useEffect(() => {
    if (!filtersHydrated) {
      return;
    }

    const preset = ROLE_VIEW_PRESETS[activeViewPreset];
    if (searchParams.get('panel') === null) {
      setGlobalStatsTab(preset.defaultTab);
    }
    if (searchParams.get('heatmap') === null) {
      setHeatmapMode(preset.defaultHeatmapMode);
    }
    if (searchParams.get('map') === null && activePrimaryView === 'region') {
      setCurrentMapType(preset.defaultMapType);
    }
  }, [activePrimaryView, activeViewPreset, filtersHydrated, searchParams]);

  useEffect(() => {
    if (activePrimaryView !== 'region') {
      setSelectedRegion(null);
    }
  }, [activePrimaryView]);

  useEffect(() => {
    if (activePrimaryView !== 'personnel') {
      setSelectedPersonnelId(null);
      setSelectedPersonnelItemId(null);
    }
  }, [activePrimaryView]);

  useEffect(() => {
    if (activePrimaryView !== 'topic') {
      setSelectedTopicRiskProjectId(null);
    }
  }, [activePrimaryView]);

  useEffect(() => {
    setSelectedPersonnelItemId(null);
  }, [activePersonnelAbnormalFilter, selectedPersonnelId]);

  useEffect(() => {
    if (!isMounted || !filtersHydrated) {
      return;
    }

    const nextParams = buildDataScreenPhase2SearchParams({
      view: activePrimaryView,
      preset: activeViewPreset,
      panel: globalStatsTab,
      map: currentMapType,
      heatmap: heatmapMode,
      startDate,
      endDate,
      autoRefresh,
    });
    const nextQuery = nextParams.toString();
    const currentQuery = searchParams.toString();

    if (nextQuery === currentQuery) {
      return;
    }

    const target = nextQuery ? `${pathname}?${nextQuery}` : pathname;
    router.replace(target, { scroll: false });
  }, [
    activePrimaryView,
    activeViewPreset,
    autoRefresh,
    currentMapType,
    endDate,
    filtersHydrated,
    globalStatsTab,
    heatmapMode,
    isMounted,
    pathname,
    router,
    searchParams,
    startDate,
  ]);

  // 全屏切换
  const toggleFullscreen = () => {
    const fullscreenRoot = fullscreenRootRef.current;

    if (!document.fullscreenElement) {
      (fullscreenRoot ?? document.documentElement).requestFullscreen().then(() => {
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
      setIsFullscreen(document.fullscreenElement === fullscreenRootRef.current);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // 确保客户端渲染后才加载数据，避免 hydration 错误
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleDrillDown = (regionName: string) => {
    if (regionName === '浙江' && currentMapType !== 'zhejiang') {
      setCurrentMapType('zhejiang');
    }
  };

  const renderPrimaryViewSkeleton = () => {
    if (activePrimaryView === 'personnel') {
      return (
        <LazyDataScreenPersonnelLayout
          data={personnelViewData}
          isLoading={isPersonnelViewLoading}
          error={personnelViewError}
          activeViewPreset={activeViewPreset}
          viewPresetLabel={activePresetMeta.label}
          viewPresetSubtitle={activePresetMeta.subtitle}
          startDate={startDate || '--'}
          endDate={endDate || '--'}
          selectedPersonId={selectedPersonnelId}
          activeAbnormalFilter={activePersonnelAbnormalFilter}
          onSelectPerson={setSelectedPersonnelId}
          onSelectAbnormalFilter={setActivePersonnelAbnormalFilter}
          onSelectItem={setSelectedPersonnelItemId}
        />
      );
    }

    return (
      <LazyDataScreenTopicLayout
        activeTopic={activeTopic}
        onTopicChange={setActiveTopic}
        regionViewData={regionViewData}
        personnelViewData={personnelViewData}
        isRegionLoading={isRegionViewLoading}
        isPersonnelLoading={isPersonnelViewLoading}
        regionError={regionViewError}
        personnelError={personnelViewError}
        startDate={startDate || '--'}
        endDate={endDate || '--'}
        onSelectRiskProject={setSelectedTopicRiskProjectId}
      />
    );
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
          @media (max-width: 1600px) {
            .data-screen-region-summary-belt {
              grid-template-columns: repeat(4, minmax(0, 1fr));
            }
            .data-screen-region-bottom-band {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }
          }
          @media (max-width: 1180px) {
            .data-screen-region-main-grid {
              grid-template-columns: 1fr;
            }
            .data-screen-region-bottom-band {
              grid-template-columns: 1fr;
            }
          }
          @media (max-width: 900px) {
            .data-screen-region-summary-belt {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }
            .data-screen-personnel-summary-belt {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }
            .data-screen-topic-switch-bar,
            .data-screen-topic-summary-belt {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }
          }
          @media (max-width: 1600px) {
            .data-screen-personnel-summary-belt {
              grid-template-columns: repeat(4, minmax(0, 1fr));
            }
          }
          @media (max-width: 1280px) {
            .data-screen-personnel-middle-grid,
            .data-screen-personnel-bottom-grid {
              grid-template-columns: 1fr;
            }
          }
          @media (max-width: 960px) {
            .data-screen-personnel-middle-grid {
              grid-template-columns: 1fr;
            }
            .data-screen-topic-main-grid {
              grid-template-columns: 1fr;
            }
          }
        `}
      </style>

      {showAmbientLayer && <CockpitAmbientLayer active={isLoaded} fullscreen={isFullscreen} />}

      {/* 主容器 */}
      <div ref={fullscreenRootRef} data-testid="data-screen-page" className="relative z-10 flex h-full w-full flex-col" style={{ height: '100vh' }}>
        <DataScreenLoadingOverlay show={!isLoaded} />

        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div style={{ flex: `0 0 ${DATA_SCREEN_TOOLBAR_HEIGHT}px`, minHeight: `${DATA_SCREEN_TOOLBAR_HEIGHT}px`, maxHeight: `${DATA_SCREEN_TOOLBAR_HEIGHT}px` }}>
            <DataScreenToolbar
              activePrimaryView={activePrimaryView}
              primaryViewOptions={DATA_SCREEN_PRIMARY_VIEWS}
              onPrimaryViewChange={setActivePrimaryView}
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
          </div>

          <div style={{
            flex: 1,
            minHeight: 0,
            display: 'flex',
            zIndex: 10,
            opacity: isLoaded ? 1 : 0,
            animation: isLoaded ? 'fadeIn 0.5s ease-out 0.1s forwards' : 'none',
            overflow: 'hidden',
          }}>
            {activePrimaryView === 'region' ? (
              <DataScreenRegionLayout
                summaryMetrics={summaryMetrics}
                viewPresetLabel={activePresetMeta.label}
                viewPresetSubtitle={activePresetMeta.subtitle}
                mapScopeLabel={activeViewPreset === 'management' ? '区域热力' : currentMapType === 'zhejiang' ? '浙江热力' : '全国热力'}
                heatmapLabel={heatmapConfig.label}
                isRefreshing={isRegionViewRefreshing}
                leftZone={(
                  <DataScreenLeftRail
                    globalStatsTab={globalStatsTab}
                    onTabChange={setGlobalStatsTab}
                    activePanelData={(activePanelData.data as DashboardPanelData | null) ?? null}
                    isPanelLoading={activePanelData.isLoading}
                    viewPresetLabel={activePresetMeta.label}
                    viewPresetHelperText={activePresetMeta.helperText}
                    viewPresetAccentColor={activePresetMeta.accentColor}
                    variant="zone"
                    title={activeViewPreset === 'management' ? '经营结构' : undefined}
                    headerAccentColor="#00D4FF"
                  />
                )}
                centerStage={(
                  <DataScreenCenterStage
                    currentMapType={currentMapType}
                    currentMapData={currentMapData}
                    currentDataType={currentDataType}
                    showMapPlaceholder={(isRegionViewLoading || isRegionViewRefreshing) && !heatmapRegionData.length}
                    stageMetrics={centerStageMetrics}
                    spotlightRegions={centerStageSpotlightRegions}
                    alertItems={centerStageAlertItems}
                    onRegionSelect={(region) => openRegionDetail(region.name, 'map')}
                    onDrillDown={handleDrillDown}
                  />
                )}
                rightZone={(
                  <DataScreenRightRail
                    activeViewPreset={activeViewPreset}
                    activeViewPresetLabel={activePresetMeta.label}
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
                    isLazyLoading={isRegionViewRefreshing}
                    workbenchSummary={personalWorkbenchSummary.data}
                    overviewMetrics={{
                      totalCustomers: regionViewData?.summary.totalCustomers ?? 0,
                      totalProjects: regionViewData?.summary.totalProjects ?? 0,
                      totalRevenue: regionViewData?.summary.totalRevenue ?? 0,
                      wonProjects: regionViewData?.summary.wonProjects ?? 0,
                    }}
                    topRegions={regionViewData?.rankings.topRegions ?? []}
                    topRevenueRegions={regionViewData?.rankings.topRevenueRegions ?? []}
                    isWorkbenchLoading={personalWorkbenchSummary.isLoading}
                    presalesFocusSummary={presalesFocusSummary.data}
                    isPresalesFocusLoading={presalesFocusSummary.isLoading}
                    funnel={regionViewData?.funnel}
                    forecastSummary={regionViewData?.forecastSummary}
                    riskSummary={regionViewData?.riskSummary}
                    isOverviewLoading={isRegionViewLoading && !regionViewData}
                    variant="zone"
                    title={activeViewPreset === 'management' ? '风险价值' : undefined}
                    headerAccentColor="#00FF88"
                  />
                )}
                bottomPanels={regionBottomPanels}
              />
            ) : renderPrimaryViewSkeleton()}
          </div>
        </div>
      </div>

      <LazyDataScreenRegionDetailDrawer
        selection={selectedRegion}
        data={regionDetailData}
        isLoading={isRegionDetailLoading}
        error={regionDetailError}
        onClose={() => setSelectedRegion(null)}
      />

      <LazyDataScreenPersonnelItemDetailDrawer
        open={!!selectedPersonnelItemId}
        item={selectedPersonnelItemId ? personnelViewData?.selectedItem || null : null}
        activeAbnormalFilter={activePersonnelAbnormalFilter}
        selectedPersonName={personnelViewData?.selectedPerson?.name || null}
        onClose={() => setSelectedPersonnelItemId(null)}
      />

      <LazyDataScreenTopicProjectRiskDrawer
        project={selectedTopicRiskProject}
        onClose={() => setSelectedTopicRiskProjectId(null)}
      />

    </div>
  );
}

function formatCount(value: number) {
  return new Intl.NumberFormat('zh-CN').format(value);
}

function formatWanAmount(value: number) {
  const wanValue = value / 10000;
  const digits = Math.abs(wanValue) >= 100 ? 0 : 1;
  return `¥${wanValue.toFixed(digits)}万`;
}

function getMapMetricValue(region: MapRegionData, dataType: MapDataType) {
  switch (dataType) {
    case MapDataType.CUSTOMER_COUNT_HEATMAP:
      return region.customerCount || 0;
    case MapDataType.PROJECT_COUNT_HEATMAP:
      return region.projectCount || 0;
    case MapDataType.BUDGET:
      return region.budget || 0;
    case MapDataType.CONTRACT_AMOUNT:
      return region.contractAmount || 0;
    case MapDataType.PRE_SALES_ACTIVITY:
      return region.preSalesActivity || 0;
    case MapDataType.SOLUTION_USAGE:
      return region.solutionUsage || 0;
    default:
      return region.projectAmount || 0;
  }
}

function formatMapMetricValue(dataType: MapDataType, value: number) {
  switch (dataType) {
    case MapDataType.BUDGET:
    case MapDataType.CONTRACT_AMOUNT:
      return formatWanAmount(value);
    default:
      return formatCount(value);
  }
}

function getAlertPriority(region: MapRegionData) {
  return (region.hasProjectAlert ? 4 : 0) + (region.hasUserAlert ? 3 : 0) + (region.hasCustomerAlert ? 2 : 0) + (region.projectCount || 0) / 100;
}

function getRegionAlertAccent(region: MapRegionData) {
  if (region.hasProjectAlert) {
    return '#FF8A65';
  }

  if (region.hasUserAlert) {
    return '#A78BFA';
  }

  return '#FBBF24';
}

function buildRegionAlertTitle(region: MapRegionData) {
  const parts = [
    region.hasProjectAlert ? '项目预警' : null,
    region.hasUserAlert ? '人员负载' : null,
    region.hasCustomerAlert ? '客户异动' : null,
  ].filter(Boolean);

  return parts.length ? `${parts.join(' / ')} 需要优先处理` : '关注区域动态';
}

function MetricCell({ label, value, accentColor }: { label: string; value: string; accentColor: string }) {
  return (
    <div style={{ padding: '10px 12px', borderRadius: '12px', border: `1px solid ${accentColor}26`, background: 'rgba(255,255,255,0.03)' }}>
      <div style={{ color: 'rgba(255,255,255,0.52)', fontSize: '10px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</div>
      <div style={{ marginTop: '8px', color: accentColor, fontSize: '18px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</div>
    </div>
  );
}

function SeriesChartPanel({
  title,
  items,
  variant = 'bars',
  emptyText,
}: {
  title: string;
  items: Array<{ label: string; value: string; ratio: number; accentColor: string }>;
  variant?: 'bars' | 'columns' | 'gauges';
  emptyText: string;
}) {
  return (
    <div
      style={{
        display: 'grid',
        gap: '10px',
        padding: '14px 16px',
        borderRadius: '16px',
        border: '1px solid rgba(255,255,255,0.08)',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.025))',
      }}
    >
      <div style={{ color: '#E6F5FF', fontSize: '12px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
      {items.length ? (
        variant === 'columns' ? (
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`, alignItems: 'end', gap: '10px', minHeight: '132px' }}>
            {items.map((item) => (
              <div key={`${title}-${item.label}`} style={{ display: 'grid', gap: '6px', alignItems: 'end' }}>
                <div style={{ height: '84px', display: 'flex', alignItems: 'end' }}>
                  <div style={{ width: '100%', height: `${Math.max(14, Math.min(100, item.ratio * 100))}%`, borderRadius: '10px 10px 4px 4px', background: `linear-gradient(180deg, ${item.accentColor}, ${item.accentColor}77)` }} />
                </div>
                <span style={{ color: 'rgba(255,255,255,0.62)', fontSize: '9px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'center' }}>{item.label}</span>
                <span style={{ color: item.accentColor, fontSize: '10px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'center' }}>{item.value}</span>
              </div>
            ))}
          </div>
        ) : variant === 'gauges' ? (
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`, gap: '10px' }}>
            {items.map((item) => (
              <div key={`${title}-${item.label}`} style={{ display: 'grid', justifyItems: 'center', gap: '6px' }}>
                <div
                  style={{
                    width: '72px',
                    height: '72px',
                    borderRadius: '999px',
                    background: `conic-gradient(${item.accentColor} 0deg ${Math.max(18, Math.min(360, item.ratio * 360))}deg, rgba(255,255,255,0.08) ${Math.max(18, Math.min(360, item.ratio * 360))}deg 360deg)`,
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  <div style={{ width: '48px', height: '48px', borderRadius: '999px', background: 'rgba(8, 14, 24, 0.94)', display: 'grid', placeItems: 'center', color: item.accentColor, fontSize: '11px', fontWeight: 700 }}>
                    {Math.round(item.ratio * 100)}%
                  </div>
                </div>
                <span style={{ color: 'rgba(255,255,255,0.62)', fontSize: '9px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>
                <span style={{ color: item.accentColor, fontSize: '10px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.value}</span>
              </div>
            ))}
          </div>
        ) : (
          items.map((item) => (
            <div key={`${title}-${item.label}`} style={{ display: 'grid', gap: '5px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                <span style={{ color: 'rgba(255,255,255,0.62)', fontSize: '10px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>
                <span style={{ color: item.accentColor, fontSize: '11px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.value}</span>
              </div>
              <div style={{ height: '9px', borderRadius: '999px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                <div style={{ width: `${Math.max(8, Math.min(100, item.ratio * 100))}%`, height: '100%', borderRadius: '999px', background: `linear-gradient(90deg, ${item.accentColor}aa, ${item.accentColor})` }} />
              </div>
            </div>
          ))
        )
      ) : <div style={{ color: 'rgba(255,255,255,0.46)', fontSize: '11px' }}>{emptyText}</div>}
    </div>
  );
}

function RankList({ title, items, emptyText }: { title: string; items: Array<{ name: string; value: string; onClick?: () => void }>; emptyText: string }) {
  return (
    <div style={{ display: 'grid', gap: '8px' }}>
      <div style={{ color: '#E6F5FF', fontSize: '11px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
      {items.length ? items.map((item, index) => (
        <button
          key={`${item.name}-${index}`}
          type="button"
          onClick={item.onClick}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', padding: '10px 12px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)', cursor: item.onClick ? 'pointer' : 'default', textAlign: 'left' }}
        >
          <span style={{ color: 'rgba(255,255,255,0.82)', fontSize: '11px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</span>
          <span style={{ color: '#00D4FF', fontSize: '11px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.value}</span>
        </button>
      )) : (
        <div style={{ color: 'rgba(255,255,255,0.46)', fontSize: '11px' }}>{emptyText}</div>
      )}
    </div>
  );
}

function StackList({ title, items, emptyText }: { title: string; items: Array<{ label: string; meta: string; ratio: number }>; emptyText: string }) {
  return (
    <div style={{ display: 'grid', gap: '8px' }}>
      <div style={{ color: '#E6F5FF', fontSize: '11px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
      {items.length ? items.map((item, index) => (
        <div key={`${item.label}-${index}`} style={{ display: 'grid', gap: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', color: 'rgba(255,255,255,0.72)', fontSize: '10px' }}>
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.meta}</span>
          </div>
          <div style={{ height: '6px', borderRadius: '999px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
            <div style={{ width: `${Math.max(8, Math.min(100, item.ratio * 100))}%`, height: '100%', borderRadius: '999px', background: 'linear-gradient(90deg, rgba(0,212,255,0.6), rgba(0,255,136,0.88))' }} />
          </div>
        </div>
      )) : (
        <div style={{ color: 'rgba(255,255,255,0.46)', fontSize: '11px' }}>{emptyText}</div>
      )}
    </div>
  );
}

function RiskList({ items, emptyText }: { items: Array<{ key: string; name: string; value: string; accentColor: string; onClick?: () => void }>; emptyText: string }) {
  return (
    <div style={{ display: 'grid', gap: '8px' }}>
      {items.length ? items.map((item) => (
        <button key={item.key} type="button" onClick={item.onClick} style={{ padding: '10px 12px', borderRadius: '12px', border: `1px solid ${item.accentColor}26`, background: 'rgba(255,255,255,0.03)', cursor: item.onClick ? 'pointer' : 'default', textAlign: 'left' }}>
          <div style={{ color: item.accentColor, fontSize: '11px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
          <div style={{ marginTop: '6px', color: 'rgba(255,255,255,0.58)', fontSize: '10px', lineHeight: 1.6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.value}</div>
        </button>
      )) : (
        <div style={{ color: 'rgba(255,255,255,0.46)', fontSize: '11px' }}>{emptyText}</div>
      )}
    </div>
  );
}

const bottomMetricGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: '8px',
} as const;

