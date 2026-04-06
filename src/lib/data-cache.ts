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
    return this.cache.delete(key);
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.cache.clear();
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

  /**
   * 获取缓存统计信息
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// 单例实例
export const dataCache = new DataCache();

// 缓存键生成器
export const CacheKeys = {
  dataScreenOverview: (startDate?: string, endDate?: string) => 
    `data-screen:overview:${startDate || 'all'}:${endDate || 'all'}`,
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
