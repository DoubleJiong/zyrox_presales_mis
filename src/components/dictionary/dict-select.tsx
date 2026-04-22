'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle } from 'lucide-react';
import {
  type DictOption,
  getCachedOptions,
  setCachedOptions,
  fetchDictionaryOptions,
} from './dict-cache';

interface DictSelectProps {
  /** 字典分类编码 */
  category: string;
  /** 当前选中的值 */
  value?: string;
  /** 值变化回调 */
  onValueChange?: (value: string) => void;
  /** 占位文本 */
  placeholder?: string;
  /** 是否禁用 */
  disabled?: boolean;
  /** 是否包含禁用项 */
  includeInactive?: boolean;
  /** 额外的 className */
  className?: string;
  /** 空值时的占位文本 */
  emptyText?: string;
  /** 是否允许清空 */
  allowClear?: boolean;
}

export function DictSelect({
  category,
  value,
  onValueChange,
  placeholder = '请选择',
  disabled = false,
  includeInactive = false,
  className,
  emptyText = '暂无选项',
  allowClear = false,
}: DictSelectProps) {
  const [options, setOptions] = useState<DictOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOptions = useCallback(async () => {
    // 检查共享缓存
    const cached = getCachedOptions(category);
    if (cached) {
      setOptions(cached);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const result = await fetchDictionaryOptions([category], includeInactive);
      if (result[category]) {
        setOptions(result[category]);
      } else {
        setError('加载失败');
        setOptions([]);
      }
    } catch (err) {
      console.error('Failed to load dictionary options:', err);
      setError('加载字典数据失败');
      setOptions([]);
    } finally {
      setLoading(false);
    }
  }, [category, includeInactive]);

  useEffect(() => {
    loadOptions();
  }, [loadOptions]);

  // 处理值变化
  const handleValueChange = (newValue: string) => {
    if (allowClear && newValue === '__CLEAR__') {
      onValueChange?.('');
    } else {
      onValueChange?.(newValue);
    }
  };

  // 加载中状态
  if (loading) {
    return (
      <Skeleton className={`h-10 w-full ${className || ''}`} />
    );
  }

  // 错误状态
  if (error) {
    return (
      <div className={`flex items-center gap-2 px-3 py-2 border border-destructive/50 rounded-md bg-destructive/10 text-destructive text-sm ${className || ''}`}>
        <AlertCircle className="h-4 w-4" />
        <span>{error}</span>
      </div>
    );
  }

  // 空状态
  if (options.length === 0) {
    return (
      <div className={`px-3 py-2 border rounded-md bg-muted text-muted-foreground text-sm ${className || ''}`}>
        {emptyText}
      </div>
    );
  }

  return (
    <Select
      value={value || ''}
      onValueChange={handleValueChange}
      disabled={disabled}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {allowClear && value && (
          <SelectItem value="__CLEAR__">
            <span className="text-muted-foreground">清空选择</span>
          </SelectItem>
        )}
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/**
 * 批量获取多个字典分类的选项（用于表单预加载）
 */
export async function loadDictionaryOptions(categories: string[]): Promise<Record<string, DictOption[]>> {
  return fetchDictionaryOptions(categories);
}

/**
 * 获取单个字典分类的选项（同步，从缓存读取）
 */
export function getDictOptions(category: string): DictOption[] {
  return getCachedOptions(category) || [];
}
