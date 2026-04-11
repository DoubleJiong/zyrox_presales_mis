'use client';

import { useEffect, useState } from 'react';
import type { TeamExecutionFilters } from '@/lib/team-execution-cockpit/filters';

export interface TeamExecutionSummaryData {
  filtersEcho: TeamExecutionFilters;
  window: {
    range: TeamExecutionFilters['range'];
    startDate: string;
    endDate: string;
    label: string;
    activityThresholdDays: number;
  };
  summary: {
    pendingTotal: number;
    dueTodayTasks: number;
    overdueTasks: number;
    highPriorityTasks: number;
    activeProjects: number;
    keyProjectPeople: number;
    overloadedPeople: number;
    lowActivityPeople: number;
  };
}

interface UseTeamExecutionSummaryResult {
  data: TeamExecutionSummaryData;
  isLoading: boolean;
  error: string | null;
}

const EMPTY_SUMMARY: TeamExecutionSummaryData = {
  filtersEcho: {
    view: 'role',
    range: '7d',
    focus: 'all',
    q: '',
  },
  window: {
    range: '7d',
    startDate: '',
    endDate: '',
    label: '近 7 天',
    activityThresholdDays: 7,
  },
  summary: {
    pendingTotal: 0,
    dueTodayTasks: 0,
    overdueTasks: 0,
    highPriorityTasks: 0,
    activeProjects: 0,
    keyProjectPeople: 0,
    overloadedPeople: 0,
    lowActivityPeople: 0,
  },
};

export function useTeamExecutionSummary(filters: TeamExecutionFilters, enabled = true) {
  const [data, setData] = useState<TeamExecutionSummaryData>(EMPTY_SUMMARY);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const fetchSummary = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        params.set('view', filters.view);
        params.set('range', filters.range);
        params.set('focus', filters.focus);
        if (filters.q.trim()) {
          params.set('q', filters.q.trim());
        }

        const response = await fetch(`/api/data-screen/team-execution/summary?${params.toString()}`, {
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();

        if (!cancelled && result?.success && result.data) {
          setData(result.data);
          return;
        }

        throw new Error(result?.error?.message || 'Summary request failed');
      } catch (error) {
        console.error('Failed to fetch team execution summary:', error);
        if (!cancelled) {
          setError(error instanceof Error ? error.message : 'Failed to fetch summary');
          setData({
            ...EMPTY_SUMMARY,
            filtersEcho: filters,
            window: {
              ...EMPTY_SUMMARY.window,
              range: filters.range,
            },
          });
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchSummary();

    return () => {
      cancelled = true;
    };
  }, [enabled, filters.focus, filters.q, filters.range, filters.view]);

  return {
    data,
    isLoading,
    error,
  } satisfies UseTeamExecutionSummaryResult;
}