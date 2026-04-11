'use client';

import { useEffect, useState } from 'react';
import type { TeamExecutionFilters } from '@/lib/team-execution-cockpit/filters';
import type { TeamExecutionDetailEntityType } from '@/lib/team-execution-cockpit/detail-links';
import type { TeamExecutionObjectDetailReadModel } from '@/lib/team-execution-cockpit/detail-read-model';

type Selection = {
  entityType: TeamExecutionDetailEntityType;
  entityId: number;
} | null;

export function useTeamExecutionDetail(selection: Selection, filters: TeamExecutionFilters) {
  const [data, setData] = useState<TeamExecutionObjectDetailReadModel | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selection) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;

    const fetchDetail = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        params.set('entityType', selection.entityType);
        params.set('entityId', String(selection.entityId));
        params.set('view', filters.view);
        params.set('range', filters.range);
        params.set('focus', filters.focus);
        if (filters.q.trim()) {
          params.set('q', filters.q.trim());
        }

        const response = await fetch(`/api/data-screen/team-execution/detail?${params.toString()}`, {
          cache: 'no-store',
        });

        const result = await response.json();

        if (!response.ok || !result?.success || !result.data) {
          throw new Error(result?.error?.message || `HTTP ${response.status}`);
        }

        if (!cancelled) {
          setData(result.data);
        }
      } catch (error) {
        console.error('Failed to fetch team execution detail:', error);
        if (!cancelled) {
          setError(error instanceof Error ? error.message : 'Failed to fetch detail');
          setData(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchDetail();

    return () => {
      cancelled = true;
    };
  }, [filters.focus, filters.q, filters.range, filters.view, selection?.entityId, selection?.entityType]);

  return {
    data,
    isLoading,
    error,
  };
}