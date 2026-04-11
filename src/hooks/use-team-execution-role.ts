'use client';

import { useEffect, useState } from 'react';
import type { TeamExecutionFilters } from '@/lib/team-execution-cockpit/filters';

export interface TeamExecutionRoleData {
  filtersEcho: TeamExecutionFilters;
  window: {
    range: TeamExecutionFilters['range'];
    startDate: string;
    endDate: string;
    label: string;
    activityThresholdDays: number;
  };
  overview: {
    totalPeople: number;
    overloadedPeople: number;
    lowActivityPeople: number;
    overduePeople: number;
  };
  loadDistribution: Array<{
    bucket: 'reserve' | 'balanced' | 'busy' | 'overloaded';
    label: string;
    count: number;
    description: string;
  }>;
  roleGroups: Array<{
    roleName: string;
    memberCount: number;
    pendingTotal: number;
    overdueTotal: number;
    avgRiskScore: number;
    overloadedCount: number;
    lowActivityCount: number;
  }>;
  riskRanking: Array<{
    userId: number;
    name: string;
    roleName: string;
    department: string | null;
    region: string | null;
    pendingCount: number;
    overdueCount: number;
    highPriorityCount: number;
    keyProjectCount: number;
    activeProjectCount: number;
    riskScore: number;
    loadBucket: 'reserve' | 'balanced' | 'busy' | 'overloaded';
    lastActivityAt: string | null;
    reasons: string[];
  }>;
  details: Array<{
    userId: number;
    name: string;
    roleName: string;
    department: string | null;
    position: string | null;
    region: string | null;
    pendingCount: number;
    overdueCount: number;
    highPriorityCount: number;
    keyProjectCount: number;
    activeProjectCount: number;
    riskScore: number;
    loadBucket: 'reserve' | 'balanced' | 'busy' | 'overloaded';
    lastActivityAt: string | null;
    lowActivity: boolean;
    reasons: string[];
  }>;
}

const EMPTY_ROLE: TeamExecutionRoleData = {
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
    totalPeople: 0,
    overloadedPeople: 0,
    lowActivityPeople: 0,
    overduePeople: 0,
  },
  loadDistribution: [],
  roleGroups: [],
  riskRanking: [],
  details: [],
};

export function useTeamExecutionRole(filters: TeamExecutionFilters, enabled = true) {
  const [data, setData] = useState<TeamExecutionRoleData>(EMPTY_ROLE);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const fetchRoleView = async () => {
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

        const response = await fetch(`/api/data-screen/team-execution/role?${params.toString()}`, {
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

        throw new Error(result?.error?.message || 'Role request failed');
      } catch (error) {
        console.error('Failed to fetch team execution role view:', error);
        if (!cancelled) {
          setError(error instanceof Error ? error.message : 'Failed to fetch role view');
          setData({
            ...EMPTY_ROLE,
            filtersEcho: filters,
            window: {
              ...EMPTY_ROLE.window,
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

    fetchRoleView();

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