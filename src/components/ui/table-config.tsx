'use client';

import { useState, useEffect, useCallback } from 'react';

// =====================================================
// 类型定义
// =====================================================

export interface ColumnConfig {
  key: string;
  label: string;
  visible: boolean;
  width?: number;
  fixed?: 'left' | 'right';
  sortable?: boolean;
  order?: number;
}

export interface TableConfig {
  columns: ColumnConfig[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  pageSize?: number;
}

// =====================================================
// 存储键
// =====================================================

const STORAGE_KEY_PREFIX = 'table_config_';

function getStorageKey(tableId: string): string {
  return `${STORAGE_KEY_PREFIX}${tableId}`;
}

// =====================================================
// 表格配置Hook
// =====================================================

export function useTableConfig(
  tableId: string,
  defaultConfig: TableConfig
): {
  config: TableConfig;
  updateConfig: (updates: Partial<TableConfig>) => void;
  updateColumn: (key: string, updates: Partial<ColumnConfig>) => void;
  toggleColumnVisibility: (key: string) => void;
  resetConfig: () => void;
  setSortBy: (sortBy: string, sortOrder?: 'asc' | 'desc') => void;
  setPageSize: (pageSize: number) => void;
  moveColumn: (fromIndex: number, toIndex: number) => void;
} {
  const [config, setConfig] = useState<TableConfig>(() => {
    if (typeof window === 'undefined') return defaultConfig;

    try {
      const stored = localStorage.getItem(getStorageKey(tableId));
      if (stored) {
        const parsed = JSON.parse(stored);
        // 合并默认配置，处理新增列
        const mergedColumns = defaultConfig.columns.map((col) => {
          const storedCol = parsed.columns?.find((c: ColumnConfig) => c.key === col.key);
          return storedCol ? { ...col, ...storedCol } : col;
        });
        return {
          ...defaultConfig,
          ...parsed,
          columns: mergedColumns,
        };
      }
    } catch (e) {
      console.error('Failed to parse table config:', e);
    }
    return defaultConfig;
  });

  // 保存到localStorage
  useEffect(() => {
    try {
      localStorage.setItem(getStorageKey(tableId), JSON.stringify(config));
    } catch (e) {
      console.error('Failed to save table config:', e);
    }
  }, [tableId, config]);

  // 更新配置
  const updateConfig = useCallback((updates: Partial<TableConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  }, []);

  // 更新单个列
  const updateColumn = useCallback((key: string, updates: Partial<ColumnConfig>) => {
    setConfig((prev) => ({
      ...prev,
      columns: prev.columns.map((col) =>
        col.key === key ? { ...col, ...updates } : col
      ),
    }));
  }, []);

  // 切换列可见性
  const toggleColumnVisibility = useCallback((key: string) => {
    setConfig((prev) => ({
      ...prev,
      columns: prev.columns.map((col) =>
        col.key === key ? { ...col, visible: !col.visible } : col
      ),
    }));
  }, []);

  // 重置配置
  const resetConfig = useCallback(() => {
    setConfig(defaultConfig);
    localStorage.removeItem(getStorageKey(tableId));
  }, [defaultConfig, tableId]);

  // 设置排序
  const setSortBy = useCallback((sortBy: string, sortOrder?: 'asc' | 'desc') => {
    setConfig((prev) => ({
      ...prev,
      sortBy,
      sortOrder: sortOrder || (prev.sortBy === sortBy && prev.sortOrder === 'asc' ? 'desc' : 'asc'),
    }));
  }, []);

  // 设置每页大小
  const setPageSize = useCallback((pageSize: number) => {
    setConfig((prev) => ({ ...prev, pageSize }));
  }, []);

  // 移动列
  const moveColumn = useCallback((fromIndex: number, toIndex: number) => {
    setConfig((prev) => {
      const columns = [...prev.columns];
      const [removed] = columns.splice(fromIndex, 1);
      columns.splice(toIndex, 0, removed);
      return { ...prev, columns };
    });
  }, []);

  return {
    config,
    updateConfig,
    updateColumn,
    toggleColumnVisibility,
    resetConfig,
    setSortBy,
    setPageSize,
    moveColumn,
  };
}

// =====================================================
// 表格配置面板组件
// =====================================================

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { Settings2, RotateCcw, GripVertical } from 'lucide-react';

interface ColumnConfigPanelProps {
  config: TableConfig;
  onToggleColumn: (key: string) => void;
  onReset: () => void;
  onMoveColumn?: (fromIndex: number, toIndex: number) => void;
}

export function ColumnConfigPanel({
  config,
  onToggleColumn,
  onReset,
}: ColumnConfigPanelProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings2 className="h-4 w-4 mr-2" />
          列配置
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel>显示列</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {config.columns.map((col) => (
          <DropdownMenuItem
            key={col.key}
            className="flex items-center justify-between"
            onSelect={(e) => e.preventDefault()}
          >
            <div className="flex items-center gap-2">
              <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
              <span>{col.label}</span>
            </div>
            <Switch
              checked={col.visible}
              onCheckedChange={() => onToggleColumn(col.key)}
            />
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onReset} className="text-muted-foreground">
          <RotateCcw className="h-4 w-4 mr-2" />
          重置为默认
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// =====================================================
// 预设表格配置
// =====================================================

export const CUSTOMER_TABLE_COLUMNS: ColumnConfig[] = [
  { key: 'customerId', label: '客户编号', visible: true, width: 120, sortable: true },
  { key: 'customerName', label: '客户名称', visible: true, width: 200, sortable: true },
  { key: 'region', label: '区域', visible: true, width: 100, sortable: true },
  { key: 'status', label: '状态', visible: true, width: 100, sortable: true },
  { key: 'totalAmount', label: '历史成交金额', visible: true, width: 140, sortable: true },
  { key: 'currentProjectCount', label: '当前项目数', visible: true, width: 120, sortable: true },
  { key: 'contactName', label: '联系人', visible: true, width: 100 },
  { key: 'contactPhone', label: '联系电话', visible: true, width: 130 },
  { key: 'contactEmail', label: '联系邮箱', visible: false, width: 180 },
  { key: 'createdAt', label: '创建时间', visible: true, width: 160, sortable: true },
  { key: 'actions', label: '操作', visible: true, width: 120, fixed: 'right' },
];

export const PROJECT_TABLE_COLUMNS: ColumnConfig[] = [
  { key: 'projectCode', label: '项目编号', visible: true, width: 120, sortable: true },
  { key: 'projectName', label: '项目名称', visible: true, width: 200, sortable: true },
  { key: 'customerName', label: '客户名称', visible: true, width: 150, sortable: true },
  { key: 'projectStage', label: '项目阶段', visible: true, width: 100, sortable: true },
  { key: 'status', label: '状态', visible: true, width: 100, sortable: true },
  { key: 'priority', label: '优先级', visible: true, width: 80, sortable: true },
  { key: 'estimatedAmount', label: '预估金额', visible: true, width: 120, sortable: true },
  { key: 'actualAmount', label: '实际金额', visible: true, width: 120, sortable: true },
  { key: 'progress', label: '进度', visible: true, width: 100, sortable: true },
  { key: 'startDate', label: '开始日期', visible: true, width: 110, sortable: true },
  { key: 'endDate', label: '结束日期', visible: true, width: 110, sortable: true },
  { key: 'createdAt', label: '创建时间', visible: false, width: 160, sortable: true },
  { key: 'actions', label: '操作', visible: true, width: 120, fixed: 'right' },
];

export const USER_TABLE_COLUMNS: ColumnConfig[] = [
  { key: 'id', label: 'ID', visible: true, width: 80, sortable: true },
  { key: 'username', label: '用户名', visible: true, width: 120, sortable: true },
  { key: 'realName', label: '姓名', visible: true, width: 100, sortable: true },
  { key: 'email', label: '邮箱', visible: true, width: 180 },
  { key: 'phone', label: '电话', visible: true, width: 130 },
  { key: 'department', label: '部门', visible: true, width: 120, sortable: true },
  { key: 'status', label: '状态', visible: true, width: 80, sortable: true },
  { key: 'lastLoginTime', label: '最后登录', visible: true, width: 160, sortable: true },
  { key: 'createdAt', label: '创建时间', visible: false, width: 160, sortable: true },
  { key: 'actions', label: '操作', visible: true, width: 120, fixed: 'right' },
];
