'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { dataCache, CacheKeys } from '@/lib/data-cache';

// 数据类型定义
export interface OverviewData {
  success: boolean;
  data: {
    totalCustomers: number;
    totalProjects: number;
    totalSolutions: number;
    totalStaff: number;
    totalRevenue: number;
    wonProjects?: number;
    overview: {
      totalCustomers: number;
      totalProjects: number;
      totalSolutions: number;
      totalStaff: number;
      totalRevenue: number;
      wonProjects?: number;
    };
    mapData: Array<{ name: string; value: number; amount: number }>;
    regionStats: Array<{ name: string; value: number; amount: number }>;
    customerRegionStats: Array<{ name: string; value: number }>;
    funnel: {
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
    riskSummary: {
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
    forecastSummary: {
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
    stageStats: Array<{ stage: string; count: number }>;
    statusStats: Array<{ status: string; count: number }>;
    monthlyData: Array<{ month: string; customers: number; projects: number; revenue: number; actualRevenue?: number; estimatedRevenue?: number }>;
    topRegions: Array<{ name: string; value: number; amount: number }>;
    topRevenueRegions: Array<{ name: string; value: number; amount: number }>;
  };
}

export interface StreamMessage {
  message: string;
  time: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

export interface StreamData {
  success: boolean;
  data: {
    messages: StreamMessage[];
    timestamp: string;
  };
}

export interface HeatmapRegionData {
  name: string;
  customerCount: number;
  projectCount: number;
  projectAmount: number;
  ongoingProjectAmount: number;
  hasCustomerAlert?: boolean;
  hasProjectAlert?: boolean;
  hasUserAlert?: boolean;
  solutionUsage: number;
  preSalesActivity: number;
  budget: number;
  contractAmount: number;
}

export interface HeatmapData {
  success: boolean;
  data: {
    type: string;
    regions: HeatmapRegionData[];
    timestamp: string;
  };
}

export interface RankItem {
  id: string | number;
  name: string;
  department?: string;
  customerName?: string;
  projectName?: string;
  projectCount?: number;
  totalAmount: number;
  rank: number;
  change?: number;
}

export interface RankingsData {
  success: boolean;
  data: {
    type: string;
    rankings: RankItem[];
    timestamp: string;
  };
}

// 全局状态类型
export interface DataScreenState {
  overview: OverviewData | null;
  stream: StreamData | null;
  heatmap: HeatmapData | null;
  rankings: RankingsData | null;
  isLoading: boolean;
  isLazyLoading: boolean; // 新增：懒加载状态
  error: string | null;
  lastRefresh: Date;
}

// Hook 选项
export interface UseDataScreenOptions {
  startDate?: string;
  endDate?: string;
  heatmapType?: string;
  rankType?: string;
  rankLimit?: number;
  enabled?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
  lazyLoadDelay?: number; // 新增：懒加载延迟
}

// 默认数据
const DEFAULT_OVERVIEW: OverviewData = {
  success: true,
  data: {
    totalCustomers: 0,
    totalProjects: 0,
    totalSolutions: 0,
    totalStaff: 0,
    totalRevenue: 0,
    wonProjects: 0,
    overview: { totalCustomers: 0, totalProjects: 0, totalSolutions: 0, totalStaff: 0, totalRevenue: 0 },
    mapData: [],
    regionStats: [],
    customerRegionStats: [],
    funnel: {
      totalOpenCount: 0,
      totalOpenAmount: 0,
      weightedPipeline: 0,
      avgWinProbability: 0,
      missingWinProbabilityCount: 0,
      stages: [],
    },
    riskSummary: {
      total: 0,
      high: 0,
      medium: 0,
      overdueActions: 0,
      overdueBids: 0,
      staleProjects: 0,
      dueThisWeek: 0,
      items: [],
    },
    forecastSummary: {
      targetBasis: 'rolling_90d_run_rate',
      targetLabel: '滚动90天中标 run-rate',
      periodDays: 30,
      targetAmount: 0,
      currentWonAmount: 0,
      forecastAmount: 0,
      weightedOpenAmount: 0,
      gapAmount: 0,
      coverageRate: 0,
      averageWinProbability: 0,
      requiredNewOpportunityAmount: 0,
      confidence: 'gap',
    },
    stageStats: [],
    statusStats: [],
    monthlyData: [],
    topRegions: [],
    topRevenueRegions: [],
  },
};

const DEFAULT_HEATMAP: HeatmapData = {
  success: true,
  data: { type: 'project', regions: [], timestamp: new Date().toISOString() },
};

const DEFAULT_RANKINGS: RankingsData = {
  success: true,
  data: { type: 'staff', rankings: [], timestamp: new Date().toISOString() },
};

const DEFAULT_STREAM: StreamData = {
  success: true,
  data: { messages: [], timestamp: new Date().toISOString() },
};

// 主 Hook - 优化版
export function useDataScreen(options: UseDataScreenOptions = {}) {
  const {
    startDate,
    endDate,
    heatmapType = 'project',
    rankType = 'staff',
    rankLimit = 10,
    enabled = true,
    autoRefresh = true,
    refreshInterval = 5 * 60 * 1000,
    lazyLoadDelay = 500, // 懒加载延迟 500ms
  } = options;

  const [state, setState] = useState<DataScreenState>({
    overview: null,
    stream: null,
    heatmap: null,
    rankings: null,
    isLoading: true,
    isLazyLoading: true,
    error: null,
    lastRefresh: new Date(),
  });

  // 用于取消请求
  const abortControllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const heatmapRequestSeqRef = useRef(0);

  // 清理函数
  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // 获取概览数据 - 带缓存
  const fetchOverview = useCallback(async (useCache = true) => {
    const cacheKey = CacheKeys.dataScreenOverview(startDate, endDate);
    
    // 尝试从缓存获取
    if (useCache) {
      const cached = dataCache.get<OverviewData>(cacheKey);
      if (cached) {
        if (mountedRef.current) {
          setState(prev => ({ ...prev, overview: cached }));
        }
        return cached;
      }
    }

    try {
      const params = new URLSearchParams();
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const response = await fetch(`/api/data-screen/overview?${params.toString()}`);
      const data: OverviewData = await response.json();
      
      // 存入缓存
      dataCache.set(cacheKey, data, 3 * 60 * 1000); // 3 分钟缓存
      
      if (mountedRef.current) {
        setState(prev => ({ ...prev, overview: data }));
      }
      
      return data;
    } catch (error) {
      console.error('Failed to fetch overview:', error);
      return DEFAULT_OVERVIEW;
    }
  }, [startDate, endDate]);

  // 获取实时流数据 - 带缓存
  const fetchStream = useCallback(async (useCache = true) => {
    const cacheKey = CacheKeys.dataScreenStream(startDate, endDate);
    
    if (useCache) {
      const cached = dataCache.get<StreamData>(cacheKey);
      if (cached) {
        if (mountedRef.current) {
          setState(prev => ({ ...prev, stream: cached }));
        }
        return cached;
      }
    }

    try {
      const params = new URLSearchParams();
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const response = await fetch(`/api/data-screen/stream?${params.toString()}`);
      const data: StreamData = await response.json();
      
      dataCache.set(cacheKey, data, 1 * 60 * 1000); // 1 分钟缓存
      
      if (mountedRef.current) {
        setState(prev => ({ ...prev, stream: data }));
      }
      
      return data;
    } catch (error) {
      console.error('Failed to fetch stream:', error);
      return DEFAULT_STREAM;
    }
  }, [startDate, endDate]);

  // 获取热力图数据 - 带缓存
  const fetchHeatmap = useCallback(async (type?: string, useCache = true) => {
    const actualType = type || heatmapType;
    const cacheKey = CacheKeys.dataScreenHeatmap(actualType, startDate, endDate);
    const requestSeq = ++heatmapRequestSeqRef.current;
    
    if (useCache) {
      const cached = dataCache.get<HeatmapData>(cacheKey);
      if (cached) {
        if (mountedRef.current && requestSeq === heatmapRequestSeqRef.current) {
          setState(prev => ({ ...prev, heatmap: cached }));
        }
        return cached;
      }
    }

    try {
      const params = new URLSearchParams();
      params.set('mode', actualType);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const response = await fetch(`/api/data-screen/heatmap?${params.toString()}`);
      const data: HeatmapData = await response.json();
      
      dataCache.set(cacheKey, data, 5 * 60 * 1000); // 5 分钟缓存
      
      if (mountedRef.current && requestSeq === heatmapRequestSeqRef.current) {
        setState(prev => ({ ...prev, heatmap: data }));
      }
      
      return data;
    } catch (error) {
      console.error('Failed to fetch heatmap:', error);
      return DEFAULT_HEATMAP;
    }
  }, [heatmapType, startDate, endDate]);

  // 获取排行榜数据 - 带缓存
  const fetchRankings = useCallback(async (type?: string, limit?: number, useCache = true) => {
    const actualType = type || rankType;
    const actualLimit = limit || rankLimit;
    const cacheKey = CacheKeys.dataScreenRankings(actualType, actualLimit);
    
    if (useCache) {
      const cached = dataCache.get<RankingsData>(cacheKey);
      if (cached) {
        if (mountedRef.current) {
          setState(prev => ({ ...prev, rankings: cached }));
        }
        return cached;
      }
    }

    try {
      const params = new URLSearchParams();
      params.set('type', actualType);
      params.set('limit', String(actualLimit));

      const response = await fetch(`/api/data-screen/rankings?${params.toString()}`);
      const data: RankingsData = await response.json();
      
      dataCache.set(cacheKey, data, 5 * 60 * 1000);
      
      if (mountedRef.current) {
        setState(prev => ({ ...prev, rankings: data }));
      }
      
      return data;
    } catch (error) {
      console.error('Failed to fetch rankings:', error);
      return DEFAULT_RANKINGS;
    }
  }, [rankType, rankLimit]);

  // 初始化加载 - 分批加载
  const initialLoad = useCallback(async () => {
    if (!mountedRef.current) return;
    
    setState(prev => ({ ...prev, isLoading: true, isLazyLoading: true, error: null }));
    
    try {
      // 第一批：优先加载核心数据（概览）
      await fetchOverview(false);
      
      if (!mountedRef.current) return;
      setState(prev => ({ ...prev, isLoading: false, isLazyLoading: true }));
      
      // 第二批：延迟加载次要数据
      await new Promise(resolve => setTimeout(resolve, lazyLoadDelay));
      
      if (!mountedRef.current) return;
      
      // 并行加载剩余数据
      await Promise.all([
        fetchHeatmap(heatmapType, false),
        fetchRankings(rankType, rankLimit, false),
        fetchStream(false),
      ]);
      
      if (mountedRef.current) {
        setState(prev => ({ 
          ...prev, 
          isLazyLoading: false, 
          lastRefresh: new Date() 
        }));
      }
    } catch (error: any) {
      console.error('Initial load error:', error);
      if (mountedRef.current) {
        setState(prev => ({ 
          ...prev, 
          isLoading: false, 
          isLazyLoading: false,
          error: error.message 
        }));
      }
    }
  }, [fetchOverview, fetchHeatmap, fetchRankings, fetchStream, heatmapType, rankType, rankLimit, lazyLoadDelay]);

  // 刷新所有数据 - 带防抖
  const refreshAll = useCallback(async () => {
    if (!mountedRef.current) return;
    
    // 取消之前的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      // 强制刷新，不使用缓存
      await Promise.all([
        fetchOverview(false),
        fetchStream(false),
        fetchHeatmap(heatmapType, false),
        fetchRankings(rankType, rankLimit, false),
      ]);
      
      if (mountedRef.current) {
        setState(prev => ({ 
          ...prev, 
          isLoading: false, 
          lastRefresh: new Date() 
        }));
      }
    } catch (error: any) {
      if (mountedRef.current) {
        setState(prev => ({ 
          ...prev, 
          isLoading: false, 
          error: error.message 
        }));
      }
    }
  }, [fetchOverview, fetchStream, fetchHeatmap, fetchRankings, heatmapType, rankType, rankLimit]);

  // 初始化加载
  useEffect(() => {
    if (!enabled) {
      return;
    }

    initialLoad();
  }, [enabled, initialLoad]);

  // 自动刷新 - 使用更长间隔
  useEffect(() => {
    if (!enabled || !autoRefresh || !mountedRef.current) return;

    const interval = setInterval(() => {
      if (mountedRef.current) {
        refreshAll();
      }
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [enabled, autoRefresh, refreshInterval, refreshAll]);

  return {
    ...state,
    refreshAll,
    fetchOverview,
    fetchStream,
    fetchHeatmap,
    fetchRankings,
  };
}
