'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { MapRegionData } from '@/lib/map-types';

// 时间范围类型
export type TimeRange = '7d' | '30d' | '90d';

// 热力图模式类型（按新顺序：客户总数、项目总数、资金预算、中标金额、售前活动、方案引用）
export type HeatmapMode = 'customer' | 'project' | 'budget' | 'contract' | 'activity' | 'solution';

// 地图层级类型
export type MapLevel = 'nation' | 'province' | 'city';

// 仪表板上下文接口
interface DashboardContextType {
  // 选中的区域
  selectedRegion: MapRegionData | null;
  setSelectedRegion: (region: MapRegionData | null) => void;
  
  // 时间范围
  timeRange: TimeRange;
  setTimeRange: (range: TimeRange) => void;
  
  // 热力图模式
  heatmapMode: HeatmapMode;
  setHeatmapMode: (mode: HeatmapMode) => void;
  
  // 自动刷新
  autoRefresh: boolean;
  setAutoRefresh: (enabled: boolean) => void;
  
  // 地图层级（用于下钻）
  mapLevel: MapLevel;
  setMapLevel: (level: MapLevel) => void;
  
  // 当前选中的省份/城市
  currentProvince: string | null;
  setCurrentProvince: (province: string | null) => void;
  
  currentCity: string | null;
  setCurrentCity: (city: string | null) => void;
  
  // 面包屑导航（用于显示下钻路径）
  breadcrumbs: string[];
  setBreadcrumbs: (breadcrumbs: string[]) => void;
  
  // 下钻到省份
  drillDownToProvince: (province: string) => void;
  
  // 返回上一级
  goBack: () => void;
  
  // 最后刷新时间
  lastRefreshTime: Date | null;
  setLastRefreshTime: (time: Date | null) => void;
}

// 创建上下文
const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

// Provider组件
export function DashboardProvider({ children }: { children: ReactNode }) {
  const [selectedRegion, setSelectedRegion] = useState<MapRegionData | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [heatmapMode, setHeatmapMode] = useState<HeatmapMode>('customer');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [mapLevel, setMapLevel] = useState<MapLevel>('nation');
  const [currentProvince, setCurrentProvince] = useState<string | null>(null);
  const [currentCity, setCurrentCity] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<string[]>(['全国']);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(new Date());

  // 下钻到省份
  const drillDownToProvince = (province: string) => {
    setMapLevel('province');
    setCurrentProvince(province);
    setBreadcrumbs(['全国', province]);
  };

  // 返回上一级
  const goBack = () => {
    if (mapLevel === 'city') {
      // 从城市返回省份
      setMapLevel('province');
      setCurrentCity(null);
      setBreadcrumbs(['全国', currentProvince || '']);
    } else if (mapLevel === 'province') {
      // 从省份返回全国
      setMapLevel('nation');
      setCurrentProvince(null);
      setBreadcrumbs(['全国']);
    }
  };

  return (
    <DashboardContext.Provider
      value={{
        selectedRegion,
        setSelectedRegion,
        timeRange,
        setTimeRange,
        heatmapMode,
        setHeatmapMode,
        autoRefresh,
        setAutoRefresh,
        mapLevel,
        setMapLevel,
        currentProvince,
        setCurrentProvince,
        currentCity,
        setCurrentCity,
        breadcrumbs,
        setBreadcrumbs,
        drillDownToProvince,
        goBack,
        lastRefreshTime,
        setLastRefreshTime,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

// 自定义Hook：使用仪表板上下文
export function useDashboard() {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
}

// 热力图配置（按新顺序）
export const HEATMAP_CONFIGS: Record<HeatmapMode, {
  label: string;
  dataKey: string;
  colorScale: string[];
  description: string;
}> = {
  customer: {
    label: '客户总数',
    dataKey: 'customerCount',
    colorScale: ['#4facfe', '#00f2fe', '#fa709a', '#fee140'],
    description: '各区域的客户数量',
  },
  project: {
    label: '项目总数',
    dataKey: 'projectCount',
    colorScale: ['#4facfe', '#00f2fe', '#fa709a', '#fee140'],
    description: '当前在管+历史累计项目数量',
  },
  budget: {
    label: '资金预算',
    dataKey: 'budget',
    colorScale: ['#4facfe', '#00f2fe', '#fa709a', '#fee140'],
    description: '该区域客户提交的年度IT预算总额（万元）',
  },
  contract: {
    label: '中标金额',
    dataKey: 'contractAmount',
    colorScale: ['#4facfe', '#00f2fe', '#fa709a', '#fee140'],
    description: '近12个月中标项目合同金额总和（万元）',
  },
  activity: {
    label: '售前活动',
    dataKey: 'preSalesActivity',
    colorScale: ['#4facfe', '#00f2fe', '#fa709a', '#fee140'],
    description: '售前人员在该区域开展活动的总人次',
  },
  solution: {
    label: '方案引用',
    dataKey: 'solutionUsage',
    colorScale: ['#4facfe', '#00f2fe', '#fa709a', '#fee140'],
    description: '各区域被引用的方案总次数',
  },
};
