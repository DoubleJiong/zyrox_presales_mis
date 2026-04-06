'use client';

import { useState, useCallback, useMemo } from 'react';

/**
 * 批量选择 Hook
 * 支持单选、全选、跨页选择
 */
export interface BatchSelectionOptions<T = any> {
  // 数据项的唯一标识字段名
  idKey?: string;
  // 最大选择数量限制
  maxSelections?: number;
  // 初始选中项
  initialSelected?: T[];
  // 选择变化回调
  onSelectionChange?: (selected: T[]) => void;
}

export function useBatchSelection<T extends Record<string, any>>(
  items: T[] = [],
  options: BatchSelectionOptions<T> = {}
) {
  const {
    idKey = 'id',
    maxSelections = Infinity,
    initialSelected = [],
    onSelectionChange,
  } = options;

  // 选中的ID集合
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(() => {
    const ids = new Set<string | number>();
    initialSelected.forEach((item) => {
      const id = item[idKey];
      if (id !== undefined) {
        ids.add(id);
      }
    });
    return ids;
  });

  // 当前页面的ID列表
  const currentPageIds = useMemo(() => {
    return new Set(items.map((item) => item[idKey]));
  }, [items, idKey]);

  // 当前页面选中的项目
  const currentPageSelected = useMemo(() => {
    return items.filter((item) => selectedIds.has(item[idKey]));
  }, [items, selectedIds, idKey]);

  // 所有选中的项目（基于当前数据集）
  const selectedItems = useMemo(() => {
    return items.filter((item) => selectedIds.has(item[idKey]));
  }, [items, selectedIds, idKey]);

  // 是否全选当前页
  const isAllCurrentPageSelected = useMemo(() => {
    if (items.length === 0) return false;
    return items.every((item) => selectedIds.has(item[idKey]));
  }, [items, selectedIds, idKey]);

  // 是否部分选中当前页
  const isPartialSelected = useMemo(() => {
    if (items.length === 0) return false;
    const selectedCount = items.filter((item) => selectedIds.has(item[idKey])).length;
    return selectedCount > 0 && selectedCount < items.length;
  }, [items, selectedIds, idKey]);

  // 选中的数量
  const selectedCount = selectedIds.size;

  // 是否达到最大选择限制
  const isAtMaxLimit = selectedCount >= maxSelections;

  // 切换单个项的选择状态
  const toggleItem = useCallback(
    (item: T) => {
      const itemId = item[idKey];
      setSelectedIds((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(itemId)) {
          newSet.delete(itemId);
        } else {
          if (newSet.size >= maxSelections) {
            return prev; // 达到最大限制，不添加
          }
          newSet.add(itemId);
        }
        return newSet;
      });
    },
    [idKey, maxSelections]
  );

  // 选择单个项
  const selectItem = useCallback(
    (item: T) => {
      const itemId = item[idKey];
      setSelectedIds((prev) => {
        if (prev.has(itemId) || prev.size >= maxSelections) {
          return prev;
        }
        const newSet = new Set(prev);
        newSet.add(itemId);
        return newSet;
      });
    },
    [idKey, maxSelections]
  );

  // 取消选择单个项
  const deselectItem = useCallback(
    (item: T) => {
      const itemId = item[idKey];
      setSelectedIds((prev) => {
        if (!prev.has(itemId)) return prev;
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
    },
    [idKey]
  );

  // 全选当前页
  const selectAllCurrentPage = useCallback(() => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      items.forEach((item) => {
        const itemId = item[idKey];
        if (newSet.size < maxSelections) {
          newSet.add(itemId);
        }
      });
      return newSet;
    });
  }, [items, idKey, maxSelections]);

  // 取消选择当前页
  const deselectAllCurrentPage = useCallback(() => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      items.forEach((item) => {
        const itemId = item[idKey];
        newSet.delete(itemId);
      });
      return newSet;
    });
  }, [items, idKey]);

  // 切换全选当前页
  const toggleAllCurrentPage = useCallback(() => {
    if (isAllCurrentPageSelected) {
      deselectAllCurrentPage();
    } else {
      selectAllCurrentPage();
    }
  }, [isAllCurrentPageSelected, selectAllCurrentPage, deselectAllCurrentPage]);

  // 全选所有
  const selectAll = useCallback(
    (allItems: T[]) => {
      const newSet = new Set<string | number>();
      allItems.forEach((item) => {
        const itemId = item[idKey];
        if (newSet.size < maxSelections) {
          newSet.add(itemId);
        }
      });
      setSelectedIds(newSet);
    },
    [idKey, maxSelections]
  );

  // 清空选择
  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // 检查是否选中
  const isSelected = useCallback(
    (item: T) => {
      return selectedIds.has(item[idKey]);
    },
    [selectedIds, idKey]
  );

  // 设置选中项（外部控制）
  const setSelection = useCallback(
    (items: T[]) => {
      const newSet = new Set<string | number>();
      items.forEach((item) => {
        const itemId = item[idKey];
        if (itemId !== undefined) {
          newSet.add(itemId);
        }
      });
      setSelectedIds(newSet);
    },
    [idKey]
  );

  // 获取选中的ID列表
  const getSelectedIds = useCallback(() => {
    return Array.from(selectedIds);
  }, [selectedIds]);

  // 触发选择变化回调
  useMemo(() => {
    if (onSelectionChange) {
      onSelectionChange(selectedItems);
    }
  }, [selectedItems, onSelectionChange]);

  return {
    // 状态
    selectedIds,
    selectedItems,
    selectedCount,
    currentPageSelected,
    isAllCurrentPageSelected,
    isPartialSelected,
    isAtMaxLimit,

    // 操作方法
    toggleItem,
    selectItem,
    deselectItem,
    selectAllCurrentPage,
    deselectAllCurrentPage,
    toggleAllCurrentPage,
    selectAll,
    clearSelection,
    isSelected,
    setSelection,
    getSelectedIds,
  };
}

// 批量操作类型
export type BatchActionType = 'delete' | 'status' | 'assign' | 'export' | 'custom';

export interface BatchAction<T = any> {
  type: BatchActionType;
  label: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  disabled?: boolean | ((selectedItems: T[]) => boolean);
  onClick: (selectedItems: T[]) => Promise<void> | void;
  confirmMessage?: string | ((selectedItems: T[]) => string);
  successMessage?: string | ((count: number) => string);
  errorMessage?: string;
}

// 批量操作状态管理
export interface BatchOperationState {
  isProcessing: boolean;
  currentAction: string | null;
  progress: number;
  total: number;
  error: string | null;
}

export function useBatchOperation() {
  const [state, setState] = useState<BatchOperationState>({
    isProcessing: false,
    currentAction: null,
    progress: 0,
    total: 0,
    error: null,
  });

  const startOperation = useCallback((action: string, total: number) => {
    setState({
      isProcessing: true,
      currentAction: action,
      progress: 0,
      total,
      error: null,
    });
  }, []);

  const updateProgress = useCallback((progress: number) => {
    setState((prev) => ({
      ...prev,
      progress,
    }));
  }, []);

  const completeOperation = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isProcessing: false,
      progress: prev.total,
    }));
  }, []);

  const setError = useCallback((error: string) => {
    setState((prev) => ({
      ...prev,
      isProcessing: false,
      error,
    }));
  }, []);

  const resetOperation = useCallback(() => {
    setState({
      isProcessing: false,
      currentAction: null,
      progress: 0,
      total: 0,
      error: null,
    });
  }, []);

  return {
    ...state,
    startOperation,
    updateProgress,
    completeOperation,
    setError,
    resetOperation,
  };
}
