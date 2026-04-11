/**
 * API 数据缓存工具
 * 用于缓存 API 响应，减少数据库查询和响应时间
 */

interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number; // 生存时间（毫秒）
}

class DataCache {
  private cache: Map<string, CacheItem<any>> = new Map();
  private inflight: Map<string, Promise<unknown>> = new Map();
  private defaultTTL: number = 5 * 60 * 1000; // 默认 5 分钟

  /**
   * 获取缓存数据
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }
    
    // 检查是否过期
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data as T;
  }

  /**
   * 设置缓存数据
   */
  set<T>(key: string, data: T, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
    });
  }

  /**
   * 删除缓存
   */
  delete(key: string): boolean {
    this.inflight.delete(key);
    return this.cache.delete(key);
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.cache.clear();
    this.inflight.clear();
  }

  /**
   * 获取或设置缓存（如果不存在则调用 fetcher）
   */
  async getOrSet<T>(key: string, fetcher: () => Promise<T>, ttl?: number): Promise<T> {
    const cached = this.get<T>(key);
    
    if (cached !== null) {
      return cached;
    }
    
    const data = await fetcher();
    this.set(key, data, ttl);
    return data;
  }

  async getOrSetAsync<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl?: number,
    options?: { forceRefresh?: boolean }
  ): Promise<T> {
    const forceRefresh = options?.forceRefresh ?? false;

    if (!forceRefresh) {
      const cached = this.get<T>(key);
      if (cached !== null) {
        return cached;
      }

      const inflightRequest = this.inflight.get(key);
      if (inflightRequest) {
        return inflightRequest as Promise<T>;
      }
    }

    const pendingRequest = fetcher()
      .then((data) => {
        this.set(key, data, ttl);
        return data;
      })
      .finally(() => {
        this.inflight.delete(key);
      });

    this.inflight.set(key, pendingRequest as Promise<unknown>);
    return pendingRequest;
  }

  invalidateByPrefix(prefix: string): number {
    let deletedCount = 0;

    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
        deletedCount += 1;
      }
    }

    for (const key of this.inflight.keys()) {
      if (key.startsWith(prefix)) {
        this.inflight.delete(key);
      }
    }

    return deletedCount;
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): { size: number; keys: string[]; inflight: number; inflightKeys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      inflight: this.inflight.size,
      inflightKeys: Array.from(this.inflight.keys()),
    };
  }
}

// 单例实例
export const dataCache = new DataCache();

// 缓存键生成器
export const CacheKeys = {
  dataScreenOverview: (startDate?: string, endDate?: string) => 
    `data-screen:overview:${startDate || 'all'}:${endDate || 'all'}`,
  dataScreenRegionView: (mapType: string, heatmapMode: string, startDate?: string, endDate?: string) =>
    `data-screen:region-view:${mapType}:${heatmapMode}:${startDate || 'all'}:${endDate || 'all'}`,
  dataScreenRegionDetail: (region: string, mapType: string, heatmapMode: string, startDate?: string, endDate?: string) =>
    `data-screen:region-detail:${region}:${mapType}:${heatmapMode}:${startDate || 'all'}:${endDate || 'all'}`,
  dataScreenPersonnelView: (preset: string, startDate?: string, endDate?: string, personId?: number, abnormalFilter?: string, selectedItemId?: string) =>
    `data-screen:personnel-view:${preset}:${startDate || 'all'}:${endDate || 'all'}:${personId || 'default'}:${abnormalFilter || 'all'}:${selectedItemId || 'default'}`,
  dataScreenHeatmap: (mode: string, startDate?: string, endDate?: string) => 
    `data-screen:heatmap:${mode}:${startDate || 'all'}:${endDate || 'all'}`,
  dataScreenRankings: (type: string, limit: number) => 
    `data-screen:rankings:${type}:${limit}`,
  dataScreenStream: (startDate?: string, endDate?: string) => 
    `data-screen:stream:${startDate || 'all'}:${endDate || 'all'}`,
  // 通用缓存键
  customers: (page: number, pageSize: number, filters?: string) => 
    `customers:${page}:${pageSize}:${filters || 'none'}`,
  projects: (page: number, pageSize: number, filters?: string) => 
    `projects:${page}:${pageSize}:${filters || 'none'}`,
  solutions: (page: number, pageSize: number, filters?: string) => 
    `solutions:${page}:${pageSize}:${filters || 'none'}`,
  users: () => 'users:all',
  roles: () => 'roles:all',
  customerTypes: () => 'customer-types:all',
  projectTypes: () => 'project-types:all',
  solutionTypes: () => 'solution-types:all',
};
