/**
 * 字典选项缓存 — 所有字典组件共享此缓存实例
 */

export interface DictOption {
  value: string;
  label: string;
  sort: number;
  extraData?: Record<string, any>;
}

const cache: Record<string, { data: DictOption[]; timestamp: number }> = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 分钟

export function getCachedOptions(category: string): DictOption[] | null {
  const entry = cache[category];
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.data;
  }
  return null;
}

export function setCachedOptions(category: string, data: DictOption[]): void {
  cache[category] = { data, timestamp: Date.now() };
}

export function clearCache(category?: string): void {
  if (category) {
    delete cache[category];
  } else {
    for (const key of Object.keys(cache)) {
      delete cache[key];
    }
  }
}

/**
 * 批量获取多个字典分类的选项
 */
export async function fetchDictionaryOptions(
  categories: string[],
  includeInactive = false,
): Promise<Record<string, DictOption[]>> {
  if (categories.length === 0) return {};

  try {
    const url = `/api/dictionary/options?categories=${categories.join(',')}${includeInactive ? '&includeInactive=true' : ''}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.success) {
      for (const [cat, opts] of Object.entries(data.data)) {
        setCachedOptions(cat, opts as DictOption[]);
      }
      return data.data;
    }
  } catch (error) {
    console.error('Failed to fetch dictionary options:', error);
  }

  return {};
}
