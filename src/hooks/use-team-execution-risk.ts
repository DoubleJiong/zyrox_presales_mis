'use client';

import { useEffect, useState } from 'react';
import type { TeamExecutionFilters } from '@/lib/team-execution-cockpit/filters';

export interface TeamExecutionRiskData {
  filtersEcho: TeamExecutionFilters;
  window: {
    range: TeamExecutionFilters['range'];
    startDate: string;
    endDate: string;
    label: string;
    activityThresholdDays: number;
  };
  overview: {
    highRiskPeople: number;
    highRiskProjects: number;
    overdueItems: number;
    blockedItems: number;
  };
  people: Array<{
    userId: number;
    name: string;
    department: string | null;
    position: string | null;
    pendingCount: number;
    overdueCount: number;
    highPriorityCount: number;
    keyProjectCount: number;
    riskScore: number;
    lastActivityAt: string | null;
    reasons: string[];
  }>;
  projects: Array<{
    projectId: number;
    projectName: string;
    customerName: string | null;
    stage: string | null;
    status: string | null;
    priority: string | null;
    openTaskCount: number;
    overdueTaskCount: number;
    blockedTodoCount: number;
    staleDays: number;
    riskScore: number;
    reasons: string[];
  }>;
  blockedList: Array<{
    type: 'task' | 'todo';
    id: number;
    title: string;
    ownerName: string | null;
    projectName: string | null;
    dueDate: string | null;
    priority: string | null;
    status: string | null;
    overdueDays: number;
  }>;
}

const EMPTY_RISK: TeamExecutionRiskData = {
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
  overview: {
    highRiskPeople: 0,
    highRiskProjects: 0,
    overdueItems: 0,
    blockedItems: 0,
  },
  people: [],
  projects: [],
  blockedList: [],
};

export function useTeamExecutionRisk(filters: TeamExecutionFilters, enabled = true) {
  const [data, setData] = useState<TeamExecutionRiskData>(EMPTY_RISK);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const fetchRisk = async () => {
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

        const response = await fetch(`/api/data-screen/team-execution/risk?${params.toString()}`, {
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

        throw new Error(result?.error?.message || 'Risk request failed');
      } catch (error) {
        console.error('Failed to fetch team execution risk:', error);
        if (!cancelled) {
          setError(error instanceof Error ? error.message : 'Failed to fetch risk');
          setData({
            ...EMPTY_RISK,
            filtersEcho: filters,
            window: {
              ...EMPTY_RISK.window,
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

    fetchRisk();

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