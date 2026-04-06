'use client';

import { useEffect, useState } from 'react';

export interface PresalesFocusSummaryData {
  summary: {
    totalSupportHours: number;
    activeSupportProjects: number;
    overloadedStaffCount: number;
    activeServiceTypes: number;
    solutionReuseCoverageRate: number;
    solutionUsageProjects: number;
    missingWorklogRecordCount: number;
  };
  topStaffLoad: Array<{
    staffId: number;
    name: string;
    totalHours: number;
    projectCount: number;
    serviceCount: number;
  }>;
  keyProjects: Array<{
    projectId: number;
    projectName: string;
    region: string;
    stage: string;
    supportHours: number;
    participantCount: number;
    serviceCount: number;
  }>;
  serviceMix: Array<{
    category: string;
    totalHours: number;
    serviceCount: number;
  }>;
}

const EMPTY_DATA: PresalesFocusSummaryData = {
  summary: {
    totalSupportHours: 0,
    activeSupportProjects: 0,
    overloadedStaffCount: 0,
    activeServiceTypes: 0,
    solutionReuseCoverageRate: 0,
    solutionUsageProjects: 0,
    missingWorklogRecordCount: 0,
  },
  topStaffLoad: [],
  keyProjects: [],
  serviceMix: [],
};

export function usePresalesFocusSummary({
  startDate,
  endDate,
  enabled = true,
}: {
  startDate?: string;
  endDate?: string;
  enabled?: boolean;
}) {
  const [data, setData] = useState<PresalesFocusSummaryData>(EMPTY_DATA);
  const [isLoading, setIsLoading] = useState(enabled);

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const fetchData = async () => {
      setIsLoading(true);

      try {
        const params = new URLSearchParams();
        if (startDate) params.set('startDate', startDate);
        if (endDate) params.set('endDate', endDate);

        const response = await fetch(`/api/data-screen/presales-focus-summary?${params.toString()}`, {
          cache: 'no-store',
        });
        const result = await response.json();

        if (!cancelled && result?.success) {
          setData(result.data || EMPTY_DATA);
        }
      } catch (error) {
        console.error('Failed to fetch presales focus summary:', error);
        if (!cancelled) {
          setData(EMPTY_DATA);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [enabled, startDate, endDate]);

  return {
    data,
    isLoading,
  };
}