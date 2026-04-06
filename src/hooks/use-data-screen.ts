'use client';

import { useState, useEffect, useCallback } from 'react';

// 数据类型定义
export interface OverviewData {
  success: boolean;
  data: {
    // 基础统计
    customersCount: number;
    projectsCount: number;
    opportunitiesCount: number;
    staffCount: number;
    solutionsCount: number;
    totalRevenue: number;
    
    // 转化率
    conversionRate: number;
    winRate: number;
    
    // 区域数据
    regionData: Array<{
      name: string;
      value: number;
      amount: number;
    }>;
    
    // 区域统计
    regionStats: Array<{
      name: string;
      value: number;
      amount: number;
      provinces: number;
    }>;
    
    // 商机阶段分布
    opportunityStages: Array<{
      stage: string;
      count: number;
    }>;
    
    // 时间戳
    timestamp: string;
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
  autoRefresh?: boolean;
  refreshInterval?: number; // milliseconds
}

// 主 Hook
export function useDataScreen(options: UseDataScreenOptions = {}) {
  const {
    startDate,
    endDate,
    heatmapType = 'project',
    rankType = 'staff',
    rankLimit = 10,
    autoRefresh = true,
    refreshInterval = 5 * 60 * 1000, // 5 minutes
  } = options;

  const [state, setState] = useState<DataScreenState>({
    overview: null,
    stream: null,
    heatmap: null,
    rankings: null,
    isLoading: true,
    error: null,
    lastRefresh: new Date(),
  });

  // 获取概览数据
  const fetchOverview = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const response = await fetch(`/api/data-screen/overview?${params.toString()}`);
      const data: OverviewData = await response.json();
      
      setState(prev => ({
        ...prev,
        overview: data,
        lastRefresh: new Date(),
      }));
      
      return data;
    } catch (error) {
      console.error('Failed to fetch overview:', error);
      return null;
    }
  }, [startDate, endDate]);

  // 获取实时流数据
  const fetchStream = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const response = await fetch(`/api/data-screen/stream?${params.toString()}`);
      const data: StreamData = await response.json();
      
      setState(prev => ({
        ...prev,
        stream: data,
      }));
      
      return data;
    } catch (error) {
      console.error('Failed to fetch stream:', error);
      return null;
    }
  }, [startDate, endDate]);

  // 获取热力图数据
  const fetchHeatmap = useCallback(async (type?: string) => {
    try {
      const params = new URLSearchParams();
      params.set('mode', type || heatmapType);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const response = await fetch(`/api/data-screen/heatmap?${params.toString()}`);
      const data: HeatmapData = await response.json();
      
      setState(prev => ({
        ...prev,
        heatmap: data,
      }));
      
      return data;
    } catch (error) {
      console.error('Failed to fetch heatmap:', error);
      return null;
    }
  }, [heatmapType, startDate, endDate]);

  // 获取排行榜数据
  const fetchRankings = useCallback(async (type?: string, limit?: number) => {
    try {
      const params = new URLSearchParams();
      params.set('type', type || rankType);
      params.set('limit', String(limit || rankLimit));

      const response = await fetch(`/api/data-screen/rankings?${params.toString()}`);
      const data: RankingsData = await response.json();
      
      setState(prev => ({
        ...prev,
        rankings: data,
      }));
      
      return data;
    } catch (error) {
      console.error('Failed to fetch rankings:', error);
      return null;
    }
  }, [rankType, rankLimit]);

  // 刷新所有数据
  const refreshAll = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      await Promise.all([
        fetchOverview(),
        fetchStream(),
        fetchHeatmap(),
        fetchRankings(),
      ]);
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        lastRefresh: new Date(),
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: '刷新数据失败',
      }));
    }
  }, [fetchOverview, fetchStream, fetchHeatmap, fetchRankings]);

  // 初始化加载
  useEffect(() => {
    refreshAll();
  }, [startDate, endDate]);

  // 自动刷新
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      refreshAll();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, refreshAll]);

  return {
    ...state,
    refreshAll,
    fetchOverview,
    fetchStream,
    fetchHeatmap,
    fetchRankings,
  };
}

// 单独获取概览数据的 Hook
export function useDataScreenOverview(startDate?: string, endDate?: string) {
  const [data, setData] = useState<OverviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const params = new URLSearchParams();
        if (startDate) params.set('startDate', startDate);
        if (endDate) params.set('endDate', endDate);

        const response = await fetch(`/api/data-screen/overview?${params.toString()}`);
        const result: OverviewData = await response.json();
        setData(result);
      } catch (err) {
        setError('获取概览数据失败');
        console.error('Failed to fetch overview:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [startDate, endDate]);

  return { data, isLoading, error, refetch: () => setIsLoading(true) };
}

// 单独获取实时流数据的 Hook
export function useDataScreenStream(startDate?: string, endDate?: string) {
  const [data, setData] = useState<StreamData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const params = new URLSearchParams();
        if (startDate) params.set('startDate', startDate);
        if (endDate) params.set('endDate', endDate);

        const response = await fetch(`/api/data-screen/stream?${params.toString()}`);
        const result: StreamData = await response.json();
        setData(result);
      } catch (err) {
        console.error('Failed to fetch stream:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
    
    // 每30秒刷新一次实时流数据
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [startDate, endDate]);

  return { data, isLoading };
}

// 单独获取热力图数据的 Hook
export function useDataScreenHeatmap(type: string = 'project', startDate?: string, endDate?: string) {
  const [data, setData] = useState<HeatmapData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const params = new URLSearchParams();
        params.set('mode', type);
        if (startDate) params.set('startDate', startDate);
        if (endDate) params.set('endDate', endDate);

        const response = await fetch(`/api/data-screen/heatmap?${params.toString()}`);
        const result: HeatmapData = await response.json();
        setData(result);
      } catch (err) {
        console.error('Failed to fetch heatmap:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [type, startDate, endDate]);

  return { data, isLoading };
}

// 单独获取排行榜数据的 Hook
export function useDataScreenRankings(type: string = 'staff', limit: number = 10) {
  const [data, setData] = useState<RankingsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const params = new URLSearchParams();
        params.set('type', type);
        params.set('limit', String(limit));

        const response = await fetch(`/api/data-screen/rankings?${params.toString()}`);
        const result: RankingsData = await response.json();
        setData(result);
      } catch (err) {
        console.error('Failed to fetch rankings:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [type, limit]);

  return { data, isLoading };
}

export default useDataScreen;
