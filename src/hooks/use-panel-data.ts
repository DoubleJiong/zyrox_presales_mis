'use client';

import { useState, useEffect, useCallback } from 'react';

export interface PanelData {
  [key: string]: any;
}

export interface UsePanelDataOptions {
  panelType: 'sales' | 'customers' | 'projects' | 'solutions';
  startDate?: string;
  endDate?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export interface UsePanelDataReturn<T = PanelData> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function usePanelData<T = PanelData>(options: UsePanelDataOptions): UsePanelDataReturn<T> {
  const { panelType, startDate, endDate, autoRefresh = false, refreshInterval = 5 * 60 * 1000 } = options;

  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.set('type', panelType);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const response = await fetch(`/api/data-screen/panels?${params.toString()}`);
      const result = await response.json();

      if (result.success) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setData(result.data as any);
      } else {
        setError(result.error || '获取数据失败');
      }
    } catch (err) {
      console.error('Failed to fetch panel data:', err);
      setError('网络请求失败');
    } finally {
      setIsLoading(false);
    }
  }, [panelType, startDate, endDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(fetchData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, fetchData]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchData,
  };
}

// 售前面板数据类型
export interface SalesPanelData {
  topPerformers: Array<{
    rank: number;
    id: number;
    name: string;
    region: string;
    score: string;
    amount: number;
    activities: number;
  }>;
  workSaturation: Array<{
    name: string;
    value: number;
    projectCount: number;
  }>;
  regionDistribution: Array<{
    name: string;
    value: number;
    amount: number;
  }>;
  stageDistribution: Array<{
    stage: string;
    count: number;
  }>;
  opportunityStages: Array<{
    stage: string;
    count: number;
    amount: number;
  }>;
  conversionRate: number;
  monthlyTrends: Array<{
    month: string;
    projectCount: number;
    revenue: number;
  }>;
  summary: {
    totalActivities: number;
    avgConversionRate: number;
    totalAmount: number;
  };
}

// 客户面板数据类型
export interface CustomersPanelData {
  topCustomers: Array<{
    rank: number;
    id: number;
    name: string;
    type: string;
    region: string;
    amount: number;
    projectCount: number;
    cooperationYears: number;
  }>;
  typeDistribution: Array<{
    name: string;
    value: number;
  }>;
  regionDistribution: Array<{
    name: string;
    value: number;
    amount: number;
  }>;
  recentActive: Array<{
    id: number;
    name: string;
    type: string;
    amount: string;
    time: string;
  }>;
  lifecycleDistribution: Array<{
    status: string;
    count: number;
  }>;
  growthTrends: Array<{
    month: string;
    newCustomers: number;
  }>;
  summary: {
    totalCustomers: number;
    totalAmount: number;
    avgProjectCount: string;
  };
}

// 项目面板数据类型
export interface ProjectsPanelData {
  statusDistribution: Array<{
    status: string;
    count: number;
    amount: number;
  }>;
  stageDistribution: Array<{
    stage: string;
    count: number;
    amount: number;
  }>;
  typeDistribution: Array<{
    name: string;
    value: number;
  }>;
  regionDistribution: Array<{
    name: string;
    value: number;
    amount: number;
  }>;
  bidResultDistribution: Array<{
    result: string;
    count: number;
  }>;
  recentProjects: Array<{
    id: number;
    name: string;
    customerName: string;
    status: string;
    stage: string;
    amount: number;
    time: string;
  }>;
  funnelData: Array<{
    stage: string;
    count: number;
  }>;
  projectTrends: Array<{
    month: string;
    newProjects: number;
    wonProjects: number; // 已中标项目
  }>;
  summary: {
    totalProjects: number;
    totalAmount: number;
    wonCount: number;
    winRate: number;
  };
}

// 解决方案面板数据类型
export interface SolutionsPanelData {
  typeDistribution: Array<{
    name: string;
    value: number;
  }>;
  statusDistribution: Array<{
    status: string;
    count: number;
  }>;
  topSolutions: Array<{
    rank: number;
    id: number;
    name: string;
    type: string;
    status: string;
    viewCount: number;
  }>;
  recentUpdates: Array<{
    id: number;
    name: string;
    type: string;
    time: string;
  }>;
  summary: {
    totalSolutions: number;
    publishedCount: number;
    totalViews: number;
  };
}
