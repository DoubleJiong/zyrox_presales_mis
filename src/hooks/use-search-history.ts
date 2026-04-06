'use client';

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'global_search_history';
const MAX_HISTORY_ITEMS = 10;

/**
 * 搜索历史项
 */
export interface SearchHistoryItem {
  query: string;
  type?: string;
  timestamp: number;
  count: number; // 搜索次数
}

/**
 * 搜索历史 Hook
 * 管理搜索历史的本地存储
 */
export function useSearchHistory() {
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);

  // 初始化：从本地存储加载历史
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load search history:', error);
    }
  }, []);

  // 保存到本地存储
  const saveToStorage = useCallback((items: SearchHistoryItem[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (error) {
      console.error('Failed to save search history:', error);
    }
  }, []);

  /**
   * 添加搜索记录
   */
  const addSearch = useCallback((query: string, type?: string) => {
    if (!query.trim()) return;

    setHistory(prev => {
      // 查找是否已存在
      const existingIndex = prev.findIndex(
        item => item.query.toLowerCase() === query.toLowerCase()
      );

      let newHistory: SearchHistoryItem[];

      if (existingIndex >= 0) {
        // 更新已存在的记录
        const existing = prev[existingIndex];
        newHistory = [
          { ...existing, timestamp: Date.now(), count: existing.count + 1 },
          ...prev.filter((_, i) => i !== existingIndex),
        ];
      } else {
        // 添加新记录
        newHistory = [
          { query, type, timestamp: Date.now(), count: 1 },
          ...prev,
        ].slice(0, MAX_HISTORY_ITEMS);
      }

      saveToStorage(newHistory);
      return newHistory;
    });
  }, [saveToStorage]);

  /**
   * 删除单条历史记录
   */
  const removeSearch = useCallback((query: string) => {
    setHistory(prev => {
      const newHistory = prev.filter(
        item => item.query.toLowerCase() !== query.toLowerCase()
      );
      saveToStorage(newHistory);
      return newHistory;
    });
  }, [saveToStorage]);

  /**
   * 清空所有历史
   */
  const clearHistory = useCallback(() => {
    setHistory([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  /**
   * 获取热门搜索（按搜索次数排序）
   */
  const getPopularSearches = useCallback((limit: number = 5) => {
    return [...history]
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }, [history]);

  /**
   * 获取最近搜索（按时间排序）
   */
  const getRecentSearches = useCallback((limit: number = 5) => {
    return [...history]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }, [history]);

  return {
    history,
    addSearch,
    removeSearch,
    clearHistory,
    getPopularSearches,
    getRecentSearches,
  };
}

/**
 * 搜索建议 Hook
 * 根据输入提供搜索建议
 */
export function useSearchSuggestions() {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  /**
   * 获取搜索建议
   */
  const fetchSuggestions = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSuggestions([]);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `/api/search/suggestions?q=${encodeURIComponent(query)}`
      );
      const result = await response.json();

      if (result.success) {
        setSuggestions(result.data.suggestions || []);
      }
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    suggestions,
    loading,
    fetchSuggestions,
  };
}

/**
 * 搜索快捷键配置
 */
export const SEARCH_SHORTCUTS = {
  // 快捷键映射
  'g c': { label: '客户', href: '/customers', icon: 'users' },
  'g p': { label: '项目', href: '/projects', icon: 'folder' },
  'g s': { label: '解决方案', href: '/solutions', icon: 'file-text' },
  'g t': { label: '待办', href: '/calendar', icon: 'check-square' },
  'g h': { label: '首页', href: '/workbench', icon: 'home' },
  'g a': { label: '人员', href: '/staff', icon: 'user' },
};

/**
 * 热门搜索关键词（预设）
 */
export const HOT_SEARCH_KEYWORDS = [
  { keyword: '客户', type: 'customers', icon: 'users' },
  { keyword: '项目', type: 'projects', icon: 'folder' },
  { keyword: '商机', type: 'opportunities', icon: 'target' },
  { keyword: '待办', type: 'todos', icon: 'check-square' },
  { keyword: '合同', type: 'projects', icon: 'file-text' },
  { keyword: '报价', type: 'quotations', icon: 'dollar-sign' },
];

/**
 * 搜索过滤器配置
 */
export const SEARCH_FILTERS = {
  // 类型过滤器
  types: [
    { value: 'all', label: '全部' },
    { value: 'customers', label: '客户' },
    { value: 'projects', label: '项目' },
    { value: 'opportunities', label: '商机' },
    { value: 'solutions', label: '解决方案' },
    { value: 'users', label: '人员' },
    { value: 'todos', label: '待办' },
    { value: 'schedules', label: '日程' },
  ],
  // 时间过滤器
  timeRange: [
    { value: 'all', label: '全部时间' },
    { value: 'today', label: '今天' },
    { value: 'week', label: '最近一周' },
    { value: 'month', label: '最近一月' },
    { value: 'quarter', label: '最近三月' },
    { value: 'year', label: '最近一年' },
  ],
  // 状态过滤器
  status: {
    customers: [
      { value: 'all', label: '全部状态' },
      { value: 'active', label: '活跃' },
      { value: 'potential', label: '潜在' },
      { value: 'inactive', label: '不活跃' },
      { value: 'lost', label: '流失' },
    ],
    projects: [
      { value: 'all', label: '全部状态' },
      { value: 'ongoing', label: '进行中' },
      { value: 'completed', label: '已完成' },
      { value: 'paused', label: '已暂停' },
      { value: 'cancelled', label: '已取消' },
    ],
    opportunities: [
      { value: 'all', label: '全部阶段' },
      { value: 'initial', label: '初步接触' },
      { value: 'requirement', label: '需求确认' },
      { value: 'proposal', label: '方案报价' },
      { value: 'negotiation', label: '招标投标' },
      { value: 'closing', label: '即将成交' },
    ],
  },
};
