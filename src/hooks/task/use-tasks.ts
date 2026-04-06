'use client';

import { useState, useCallback } from 'react';
import type { 
  Task, 
  TaskListResponse, 
  TaskFormData, 
  TaskFilter,
  BatchRequest,
  TaskStats,
} from '@/types/task';

interface UseTasksOptions {
  projectId: number;
  initialView?: 'list' | 'board' | 'gantt';
}

interface UseTasksReturn {
  tasks: Task[];
  stats: TaskStats | null;
  loading: boolean;
  error: string | null;
  view: 'list' | 'board' | 'gantt';
  filter: TaskFilter;
  selectedIds: number[];
  // Actions
  setView: (view: 'list' | 'board' | 'gantt') => void;
  setFilter: (filter: TaskFilter) => void;
  setSelectedIds: (ids: number[]) => void;
  fetchTasks: () => Promise<void>;
  createTask: (data: TaskFormData) => Promise<Task | null>;
  updateTask: (id: number, data: Partial<TaskFormData>) => Promise<boolean>;
  deleteTask: (id: number) => Promise<boolean>;
  batchAction: (request: BatchRequest) => Promise<boolean>;
}

export function useTasks(options: UseTasksOptions): UseTasksReturn {
  const { projectId, initialView = 'list' } = options;

  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<TaskStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'board' | 'gantt'>(initialView);
  const [filter, setFilter] = useState<TaskFilter>({});
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // 获取任务列表
  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set('view', view);
      if (filter.status) params.set('status', filter.status);
      if (filter.priority) params.set('priority', filter.priority);
      if (filter.assigneeId) params.set('assigneeId', String(filter.assigneeId));
      if (filter.taskType) params.set('taskType', filter.taskType);

      const response = await fetch(`/api/projects/${projectId}/tasks?${params}`);
      const result = await response.json();

      if (result.success) {
        setTasks(result.data.tasks);
        setStats(result.data.stats);
      } else {
        setError(result.error?.message || '获取任务列表失败');
      }
    } catch (err) {
      setError('网络请求失败');
    } finally {
      setLoading(false);
    }
  }, [projectId, view, filter]);

  // 创建任务
  const createTask = useCallback(async (data: TaskFormData): Promise<Task | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        await fetchTasks();
        return result.data;
      } else {
        setError(result.error?.message || '创建任务失败');
        return null;
      }
    } catch (err) {
      setError('网络请求失败');
      return null;
    } finally {
      setLoading(false);
    }
  }, [projectId, fetchTasks]);

  // 更新任务
  const updateTask = useCallback(async (
    id: number, 
    data: Partial<TaskFormData>
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        await fetchTasks();
        return true;
      } else {
        setError(result.error?.message || '更新任务失败');
        return false;
      }
    } catch (err) {
      setError('网络请求失败');
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchTasks]);

  // 删除任务
  const deleteTask = useCallback(async (id: number): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        await fetchTasks();
        return true;
      } else {
        setError(result.error?.message || '删除任务失败');
        return false;
      }
    } catch (err) {
      setError('网络请求失败');
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchTasks]);

  // 批量操作
  const batchAction = useCallback(async (request: BatchRequest): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/tasks/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      const result = await response.json();

      if (result.success) {
        await fetchTasks();
        setSelectedIds([]);
        return true;
      } else {
        setError(result.error?.message || '批量操作失败');
        return false;
      }
    } catch (err) {
      setError('网络请求失败');
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchTasks]);

  return {
    tasks,
    stats,
    loading,
    error,
    view,
    filter,
    selectedIds,
    setView,
    setFilter,
    setSelectedIds,
    fetchTasks,
    createTask,
    updateTask,
    deleteTask,
    batchAction,
  };
}
