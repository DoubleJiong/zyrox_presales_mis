'use client';

import { useEffect, useState } from 'react';

export interface WorkbenchSummaryData {
  stats: {
    pendingTodos: number;
    myTasks: number;
    pendingAlerts: number;
    unreadMessages: number;
    myProjects: number;
  };
  focusQueue: Array<{
    id: string;
    source: 'todo' | 'task' | 'schedule';
    title: string;
    href: string;
    priority: string;
    meta: string;
    description: string;
  }>;
  starredProjects: Array<{
    id: number;
    projectCode: string | null;
    projectName: string;
    customerName: string | null;
    status: string;
    statusLabel: string;
    progress: number;
  }>;
}

const EMPTY_WORKBENCH_SUMMARY: WorkbenchSummaryData = {
  stats: {
    pendingTodos: 0,
    myTasks: 0,
    pendingAlerts: 0,
    unreadMessages: 0,
    myProjects: 0,
  },
  focusQueue: [],
  starredProjects: [],
};

interface UseWorkbenchSummaryOptions {
  enabled?: boolean;
}

export function useWorkbenchSummary(options: UseWorkbenchSummaryOptions = {}) {
  const { enabled = true } = options;
  const [data, setData] = useState<WorkbenchSummaryData>(EMPTY_WORKBENCH_SUMMARY);
  const [isLoading, setIsLoading] = useState(enabled);

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const fetchSummary = async () => {
      setIsLoading(true);

      try {
        const response = await fetch('/api/workbench/summary', {
          cache: 'no-store',
        });
        const result = await response.json();

        if (!cancelled && result?.success && result.data) {
          setData({
            stats: result.data.stats || EMPTY_WORKBENCH_SUMMARY.stats,
            focusQueue: Array.isArray(result.data.focusQueue) ? result.data.focusQueue : [],
            starredProjects: Array.isArray(result.data.starredProjects) ? result.data.starredProjects : [],
          });
        }
      } catch (error) {
        console.error('Failed to fetch workbench summary:', error);
        if (!cancelled) {
          setData(EMPTY_WORKBENCH_SUMMARY);
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
  }, [enabled]);

  return {
    data,
    isLoading,
  };
}