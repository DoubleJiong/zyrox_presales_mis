'use client';

import { useState, useEffect, useCallback } from 'react';

interface DictOption {
  value: string;
  label: string;
  sort: number;
  extraData?: Record<string, any>;
}

interface UseDictionaryOptionsResult {
  options: DictOption[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  getLabelByValue: (value: string) => string;
}

// 简单的内存缓存
const cache: Record<string, { data: DictOption[]; timestamp: number }> = {};
const CACHE_TTL = 5 * 60 * 1000; // 5分钟

/**
 * 获取字典选项的 Hook
 * @param category 字典分类编码
 * @param includeInactive 是否包含禁用项
 */
export function useDictionaryOptions(
  category: string,
  includeInactive = false
): UseDictionaryOptionsResult {
  const [options, setOptions] = useState<DictOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOptions = useCallback(async () => {
    // 检查缓存
    const cacheKey = `${category}:${includeInactive}`;
    const cached = cache[cacheKey];
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setOptions(cached.data);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const url = `/api/dictionary/options?categories=${category}${includeInactive ? '&includeInactive=true' : ''}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.success && data.data[category]) {
        const optionsData = data.data[category];
        // 更新缓存
        cache[cacheKey] = {
          data: optionsData,
          timestamp: Date.now(),
        };
        setOptions(optionsData);
      } else {
        setError(data.error || '加载失败');
      }
    } catch (err) {
      console.error('Failed to load dictionary options:', err);
      setError('加载字典数据失败');
    } finally {
      setLoading(false);
    }
  }, [category, includeInactive]);

  useEffect(() => {
    loadOptions();
  }, [loadOptions]);

  // 根据 value 获取 label
  const getLabelByValue = useCallback(
    (value: string): string => {
      const option = options.find((opt) => opt.value === value);
      return option?.label || value;
    },
    [options]
  );

  return {
    options,
    loading,
    error,
    reload: loadOptions,
    getLabelByValue,
  };
}

/**
 * 批量获取多个字典分类的 Hook
 * @param categories 字典分类编码数组
 */
export function useDictionaryCategories(
  categories: string[]
): Record<string, DictOption[]> {
  const [result, setResult] = useState<Record<string, DictOption[]>>({});

  useEffect(() => {
    const loadAll = async () => {
      if (categories.length === 0) return;

      try {
        const url = `/api/dictionary/options?categories=${categories.join(',')}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.success) {
          setResult(data.data);
        }
      } catch (error) {
        console.error('Failed to load dictionary categories:', error);
      }
    };

    loadAll();
  }, [categories.join(',')]);

  return result;
}
