'use client';

import { useEffect, useState } from 'react';
import { CacheKeys, dataCache } from '@/lib/data-cache';
import type { DataScreenRoleViewPreset } from '@/lib/data-screen-phase2-filters';
import type {
  DataScreenPersonnelAbnormalFilter,
  DataScreenPersonnelViewInitData,
} from '@/lib/data-screen-personnel-view';

interface UseDataScreenPersonnelViewOptions {
  startDate?: string;
  endDate?: string;
  preset: DataScreenRoleViewPreset;
  selectedPersonId?: number | null;
  abnormalFilter?: DataScreenPersonnelAbnormalFilter;
  selectedItemId?: string | null;
  enabled?: boolean;
}

export function useDataScreenPersonnelView(options: UseDataScreenPersonnelViewOptions) {
  const {
    startDate,
    endDate,
    preset,
    selectedPersonId,
    abnormalFilter = 'all',
    selectedItemId,
    enabled = true,
  } = options;

  const [data, setData] = useState<DataScreenPersonnelViewInitData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    const cacheKey = CacheKeys.dataScreenPersonnelView(
      preset,
      startDate,
      endDate,
      selectedPersonId || undefined,
      abnormalFilter,
      selectedItemId || undefined,
    );
    const cached = dataCache.get<DataScreenPersonnelViewInitData>(cacheKey);

    if (cached) {
      setData(cached);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    const fetchPersonnelView = async () => {
      try {
        const params = new URLSearchParams();
        params.set('preset', preset);
        if (startDate) {
          params.set('startDate', startDate);
        }
        if (endDate) {
          params.set('endDate', endDate);
        }
        if (selectedPersonId) {
          params.set('personId', String(selectedPersonId));
        }
        if (abnormalFilter !== 'all') {
          params.set('abnormalFilter', abnormalFilter);
        }
        if (selectedItemId) {
          params.set('selectedItemId', selectedItemId);
        }

        const payload = await dataCache.getOrSetAsync<DataScreenPersonnelViewInitData>(
          cacheKey,
          async () => {
            const response = await fetch(`/api/data-screen/personnel-view?${params.toString()}`, {
              cache: 'no-store',
            });

            if (!response.ok) {
              throw new Error(`HTTP ${response.status}`);
            }

            const result = await response.json();
            if (result?.success && result.data) {
              return result.data as DataScreenPersonnelViewInitData;
            }

            throw new Error(result?.error?.message || 'Personnel init request failed');
          },
          2 * 60 * 1000,
        );

        if (!cancelled) {
          setData(payload);
        }
      } catch (fetchError) {
        console.error('Failed to fetch data-screen personnel init:', fetchError);
        if (!cancelled) {
          setError(fetchError instanceof Error ? fetchError.message : 'Failed to fetch personnel init');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchPersonnelView();

    return () => {
      cancelled = true;
    };
  }, [abnormalFilter, enabled, endDate, preset, selectedItemId, selectedPersonId, startDate]);

  return {
    data,
    isLoading,
    error,
  };
}