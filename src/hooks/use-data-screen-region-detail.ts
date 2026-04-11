'use client';

import { useEffect, useState } from 'react';
import { CacheKeys, dataCache } from '@/lib/data-cache';
import type { DataScreenHeatmapMode, DataScreenMapType } from '@/lib/data-screen-phase2-filters';
import type { DataScreenRegionDetailData } from '@/lib/data-screen-region-detail';

interface UseDataScreenRegionDetailOptions {
  regionName?: string;
  mapType: DataScreenMapType;
  heatmapMode: DataScreenHeatmapMode;
  startDate?: string;
  endDate?: string;
  enabled?: boolean;
}

export function useDataScreenRegionDetail(options: UseDataScreenRegionDetailOptions) {
  const {
    regionName,
    mapType,
    heatmapMode,
    startDate,
    endDate,
    enabled = true,
  } = options;

  const [data, setData] = useState<DataScreenRegionDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !regionName) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    const cacheKey = CacheKeys.dataScreenRegionDetail(regionName, mapType, heatmapMode, startDate, endDate);
    const cached = dataCache.get<DataScreenRegionDetailData>(cacheKey);

    if (cached) {
      setData(cached);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    const fetchRegionDetail = async () => {
      try {
        const params = new URLSearchParams();
        params.set('region', regionName);
        params.set('map', mapType);
        params.set('heatmap', heatmapMode);
        if (startDate) {
          params.set('startDate', startDate);
        }
        if (endDate) {
          params.set('endDate', endDate);
        }

        const payload = await dataCache.getOrSetAsync<DataScreenRegionDetailData>(
          cacheKey,
          async () => {
            const response = await fetch(`/api/data-screen/region-detail?${params.toString()}`, {
              cache: 'no-store',
            });

            if (!response.ok) {
              throw new Error(`HTTP ${response.status}`);
            }

            const result = await response.json();
            if (result?.success && result.data) {
              return result.data as DataScreenRegionDetailData;
            }

            throw new Error(result?.error?.message || 'Region detail request failed');
          },
          2 * 60 * 1000,
        );

        if (!cancelled) {
          setData(payload);
        }
      } catch (fetchError) {
        console.error('Failed to fetch region detail:', fetchError);
        if (!cancelled) {
          setError(fetchError instanceof Error ? fetchError.message : 'Failed to fetch region detail');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchRegionDetail();

    return () => {
      cancelled = true;
    };
  }, [enabled, endDate, heatmapMode, mapType, regionName, startDate]);

  return {
    data,
    isLoading,
    error,
  };
}