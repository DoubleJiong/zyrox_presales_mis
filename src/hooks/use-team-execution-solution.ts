'use client';

import { useEffect, useState } from 'react';
import type { TeamExecutionFilters } from '@/lib/team-execution-cockpit/filters';

export interface TeamExecutionSolutionData {
  filtersEcho: TeamExecutionFilters;
  window: {
    range: TeamExecutionFilters['range'];
    startDate: string;
    endDate: string;
    label: string;
    activityThresholdDays: number;
  };
  overview: {
    totalSolutions: number;
    reviewingSolutions: number;
    overdueReviews: number;
    staleSolutions: number;
  };
  statusDistribution: Array<{
    status: string;
    label: string;
    count: number;
    pendingReviewCount: number;
  }>;
  pressureRanking: Array<{
    solutionId: number;
    solutionName: string;
    solutionTypeName: string | null;
    version: string;
    status: string | null;
    approvalStatus: string | null;
    relatedProjectCount: number;
    pendingReviewCount: number;
    overdueReviewCount: number;
    staleDays: number;
    riskScore: number;
    lastUpdatedAt: string | null;
    reasons: string[];
  }>;
  details: Array<{
    solutionId: number;
    solutionName: string;
    solutionTypeName: string | null;
    version: string;
    status: string | null;
    approvalStatus: string | null;
    ownerName: string | null;
    reviewerName: string | null;
    relatedProjectCount: number;
    pendingReviewCount: number;
    overdueReviewCount: number;
    staleDays: number;
    riskScore: number;
    lastUpdatedAt: string | null;
    reasons: string[];
  }>;
}

const EMPTY_SOLUTION: TeamExecutionSolutionData = {
  filtersEcho: {
    view: 'solution',
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
  overview: {
    totalSolutions: 0,
    reviewingSolutions: 0,
    overdueReviews: 0,
    staleSolutions: 0,
  },
  statusDistribution: [],
  pressureRanking: [],
  details: [],
};

export function useTeamExecutionSolution(filters: TeamExecutionFilters, enabled = true) {
  const [data, setData] = useState<TeamExecutionSolutionData>(EMPTY_SOLUTION);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const fetchSolutionView = async () => {
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

        const response = await fetch(`/api/data-screen/team-execution/solution?${params.toString()}`, {
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

        throw new Error(result?.error?.message || 'Solution request failed');
      } catch (error) {
        console.error('Failed to fetch team execution solution view:', error);
        if (!cancelled) {
          setError(error instanceof Error ? error.message : 'Failed to fetch solution view');
          setData({
            ...EMPTY_SOLUTION,
            filtersEcho: filters,
            window: {
              ...EMPTY_SOLUTION.window,
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

    fetchSolutionView();

    return () => {
      cancelled = true;
    };
  }, [enabled, filters.focus, filters.q, filters.range, filters.view]);

  return {
    data,
    isLoading,
    error,
  };
}