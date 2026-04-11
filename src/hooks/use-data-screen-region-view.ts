'use client';

import { useEffect, useRef, useState } from 'react';
import { dataCache, CacheKeys } from '@/lib/data-cache';
import type { DataScreenHeatmapMode, DataScreenMapType } from '@/lib/data-screen-phase2-filters';
import type { DataScreenRegionViewInitData } from '@/lib/data-screen-region-view';

interface UseDataScreenRegionViewOptions {
  startDate?: string;
  endDate?: string;
  mapType: DataScreenMapType;
  heatmapMode: DataScreenHeatmapMode;
  enabled?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function useDataScreenRegionView(options: UseDataScreenRegionViewOptions) {
  const {
    startDate,
    endDate,
    mapType,
    heatmapMode,
    enabled = true,
    autoRefresh = true,
    refreshInterval = 5 * 60 * 1000,
  } = options;

  const [data, setData] = useState<DataScreenRegionViewInitData | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      setIsRefreshing(false);
      return;
    }

    let cancelled = false;

    const fetchRegionView = async (forceRefresh = false) => {
      const cacheKey = CacheKeys.dataScreenRegionView(mapType, heatmapMode, startDate, endDate);
      const cached = forceRefresh ? null : dataCache.get<DataScreenRegionViewInitData>(cacheKey);

      if (cached) {
        setData(cached);
        hasLoadedRef.current = true;
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      if (!hasLoadedRef.current) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }
      setError(null);

      try {
        const params = new URLSearchParams();
        params.set('map', mapType);
        params.set('heatmap', heatmapMode);
        if (startDate) {
          params.set('startDate', startDate);
        }
        if (endDate) {
          params.set('endDate', endDate);
        }
        if (forceRefresh) {
          params.set('refresh', 'true');
        }

        const payload = await dataCache.getOrSetAsync<DataScreenRegionViewInitData>(
          cacheKey,
          async () => {
            const response = await fetch(`/api/data-screen/region-view?${params.toString()}`, {
              cache: 'no-store',
            });

            if (!response.ok) {
              throw new Error(`HTTP ${response.status}`);
            }

            const result = await response.json();
            if (result?.success && result.data) {
              return result.data as DataScreenRegionViewInitData;
            }

            throw new Error(result?.error?.message || 'Region init request failed');
          },
          3 * 60 * 1000,
          { forceRefresh },
        );

        if (!cancelled) {
          hasLoadedRef.current = true;
          setData(payload);
        }
      } catch (fetchError) {
        console.error('Failed to fetch data-screen region init:', fetchError);
        if (!cancelled) {
          setError(fetchError instanceof Error ? fetchError.message : 'Failed to fetch region init');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    };

    fetchRegionView();

    let interval: ReturnType<typeof setInterval> | null = null;
    if (autoRefresh && refreshInterval > 0) {
      interval = setInterval(() => {
        fetchRegionView(true);
      }, refreshInterval);
    }

    return () => {
      cancelled = true;
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [autoRefresh, enabled, endDate, heatmapMode, mapType, refreshInterval, startDate]);

  return {
    data,
    isLoading,
    isRefreshing,
    error,
  };
}