'use client';

import { useEffect, useState } from 'react';
import type { TeamExecutionFilters } from '@/lib/team-execution-cockpit/filters';

export interface TeamExecutionCustomerData {
  filtersEcho: TeamExecutionFilters;
  window: {
    range: TeamExecutionFilters['range'];
    startDate: string;
    endDate: string;
    label: string;
    activityThresholdDays: number;
  };
  overview: {
    totalCustomers: number;
    lowInteractionCustomers: number;
    highBacklogCustomers: number;
    highRiskCustomers: number;
  };
  activityDistribution: Array<{
    bucket: 'active' | 'watch' | 'cooling' | 'silent';
    label: string;
    count: number;
    description: string;
  }>;
  scaleRanking: Array<{
    customerId: number;
    customerName: string;
    customerTypeName: string | null;
    region: string | null;
    currentProjectCount: number;
    activeProjectCount: number;
    openItemCount: number;
    overdueItemCount: number;
    keyProjectCount: number;
    riskScore: number;
    interactionStatus: 'active' | 'watch' | 'cooling' | 'silent';
    lastInteractionTime: string | null;
    reasons: string[];
  }>;
  details: Array<{
    customerId: number;
    customerName: string;
    customerTypeName: string | null;
    region: string | null;
    contactName: string | null;
    currentProjectCount: number;
    activeProjectCount: number;
    openItemCount: number;
    overdueItemCount: number;
    keyProjectCount: number;
    riskScore: number;
    interactionStatus: 'active' | 'watch' | 'cooling' | 'silent';
    lastInteractionTime: string | null;
    reasons: string[];
  }>;
}

const EMPTY_CUSTOMER: TeamExecutionCustomerData = {
  filtersEcho: {
    view: 'customer',
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
    totalCustomers: 0,
    lowInteractionCustomers: 0,
    highBacklogCustomers: 0,
    highRiskCustomers: 0,
  },
  activityDistribution: [],
  scaleRanking: [],
  details: [],
};

export function useTeamExecutionCustomer(filters: TeamExecutionFilters, enabled = true) {
  const [data, setData] = useState<TeamExecutionCustomerData>(EMPTY_CUSTOMER);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const fetchCustomerView = async () => {
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

        const response = await fetch(`/api/data-screen/team-execution/customer?${params.toString()}`, {
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

        throw new Error(result?.error?.message || 'Customer request failed');
      } catch (error) {
        console.error('Failed to fetch team execution customer view:', error);
        if (!cancelled) {
          setError(error instanceof Error ? error.message : 'Failed to fetch customer view');
          setData({
            ...EMPTY_CUSTOMER,
            filtersEcho: filters,
            window: {
              ...EMPTY_CUSTOMER.window,
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

    fetchCustomerView();

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