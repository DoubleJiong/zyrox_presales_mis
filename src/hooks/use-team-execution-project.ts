'use client';

import { useEffect, useState } from 'react';
import type { TeamExecutionFilters } from '@/lib/team-execution-cockpit/filters';

export interface TeamExecutionProjectData {
  filtersEcho: TeamExecutionFilters;
  window: {
    range: TeamExecutionFilters['range'];
    startDate: string;
    endDate: string;
    label: string;
    activityThresholdDays: number;
  };
  overview: {
    totalProjects: number;
    highRiskProjects: number;
    stalledProjects: number;
    staffingTightProjects: number;
  };
  stageDistribution: Array<{
    stage: string;
    label: string;
    count: number;
    highRiskCount: number;
    overdueTaskTotal: number;
  }>;
  staffingOverview: Array<{
    projectId: number;
    projectName: string;
    customerName: string | null;
    memberCount: number;
    activePeopleCount: number;
    overloadedPeopleCount: number;
    openTaskCount: number;
    blockedTodoCount: number;
  }>;
  riskHeat: Array<{
    projectId: number;
    projectName: string;
    customerName: string | null;
    stage: string | null;
    status: string | null;
    priority: string | null;
    openTaskCount: number;
    overdueTaskCount: number;
    blockedTodoCount: number;
    highPriorityTaskCount: number;
    activePeopleCount: number;
    overloadedPeopleCount: number;
    staleDays: number;
    riskScore: number;
    lastProgressAt: string | null;
    reasons: string[];
  }>;
  details: Array<{
    projectId: number;
    projectName: string;
    customerName: string | null;
    stage: string | null;
    status: string | null;
    priority: string | null;
    memberCount: number;
    activePeopleCount: number;
    overloadedPeopleCount: number;
    openTaskCount: number;
    overdueTaskCount: number;
    blockedTodoCount: number;
    highPriorityTaskCount: number;
    staleDays: number;
    riskScore: number;
    keyProject: boolean;
    lastProgressAt: string | null;
    reasons: string[];
  }>;
}

const EMPTY_PROJECT: TeamExecutionProjectData = {
  filtersEcho: {
    view: 'project',
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
    totalProjects: 0,
    highRiskProjects: 0,
    stalledProjects: 0,
    staffingTightProjects: 0,
  },
  stageDistribution: [],
  staffingOverview: [],
  riskHeat: [],
  details: [],
};

export function useTeamExecutionProject(filters: TeamExecutionFilters, enabled = true) {
  const [data, setData] = useState<TeamExecutionProjectData>(EMPTY_PROJECT);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const fetchProjectView = async () => {
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

        const response = await fetch(`/api/data-screen/team-execution/project?${params.toString()}`, {
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

        throw new Error(result?.error?.message || 'Project request failed');
      } catch (error) {
        console.error('Failed to fetch team execution project view:', error);
        if (!cancelled) {
          setError(error instanceof Error ? error.message : 'Failed to fetch project view');
          setData({
            ...EMPTY_PROJECT,
            filtersEcho: filters,
            window: {
              ...EMPTY_PROJECT.window,
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

    fetchProjectView();

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