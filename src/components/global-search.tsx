'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  FolderKanban,
  FileText,
  Target,
  User,
  Search,
  Loader2,
  CheckSquare,
  Calendar,
  Clock,
  TrendingUp,
  X,
  Filter,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useSearchHistory,
  useSearchSuggestions,
  HOT_SEARCH_KEYWORDS,
} from '@/hooks/use-search-history';
import {
  AdvancedSearchFilter,
  FilterTags,
  SearchFilters,
  DEFAULT_FILTERS,
} from './advanced-search-filter';

interface SearchResult {
  id: number;
  title: string;
  subtitle?: string;
  href: string;
  icon: string;
  type: string;
  status?: string;
  priority?: string;
}

interface SearchResults {
  query: string;
  total: number;
  results: {
    customers: SearchResult[];
    projects: SearchResult[];
    solutions: SearchResult[];
    users: SearchResult[];
    todos: SearchResult[];
    schedules: SearchResult[];
  };
}

const iconMap: Record<string, React.ElementType> = {
  users: Users,
  'folder-kanban': FolderKanban,
  'file-text': FileText,
  target: Target,
  user: User,
  'check-square': CheckSquare,
  calendar: Calendar,
};

const typeNames: Record<string, string> = {
  customer: '客户',
  project: '项目',
  solution: '解决方案',
  opportunity: '商机',
  user: '用户',
  todo: '待办',
  schedule: '日程',
};

// 优先级样式
const priorityStyles: Record<string, string> = {
  urgent: 'text-red-500',
  high: 'text-orange-500',
  medium: 'text-blue-500',
  low: 'text-gray-500',
};

export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null);
  const [filters, setFilters] = useState<SearchFilters>(DEFAULT_FILTERS);

  // 搜索历史
  const { history, addSearch, removeSearch, clearHistory, getRecentSearches } = useSearchHistory();
  
  // 搜索建议
  const { suggestions, fetchSuggestions } = useSearchSuggestions();

  // 使用 Ctrl+K 或 Cmd+K 打开搜索
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  // 防抖搜索
  const performSearch = useCallback(async (searchQuery: string, searchFilters?: SearchFilters) => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        q: searchQuery,
        limit: '5',
      });
      
      const currentFilters = searchFilters || filters;
      
      // 类型过滤
      if (currentFilters.type !== 'all') {
        params.set('type', currentFilters.type);
      }
      
      // 状态过滤
      if (currentFilters.status !== 'all') {
        params.set('status', currentFilters.status);
      }
      
      // 优先级过滤
      if (currentFilters.priority !== 'all') {
        params.set('priority', currentFilters.priority);
      }
      
      // 时间范围过滤
      if (currentFilters.timeRange !== 'all') {
        if (currentFilters.timeRange === 'custom') {
          if (currentFilters.startDate) {
            params.set('startDate', currentFilters.startDate.toISOString());
          }
          if (currentFilters.endDate) {
            params.set('endDate', currentFilters.endDate.toISOString());
          }
        } else {
          params.set('timeRange', currentFilters.timeRange);
        }
      }

      const response = await fetch(`/api/search?${params}`);
      const data = await response.json();
      if (data.success) {
        setSearchResults(data.data);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // 监听查询和过滤器变化
  useEffect(() => {
    if (!open) return;
    
    const timer = setTimeout(() => {
      if (query.trim()) {
        performSearch(query, filters);
        fetchSuggestions(query);
      } else {
        setSearchResults(null);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, filters, open, performSearch, fetchSuggestions]);

  // 选择结果并跳转
  const handleSelect = (result: SearchResult) => {
    addSearch(query, result.type);
    setOpen(false);
    router.push(result.href);
  };

  // 从历史记录选择
  const handleHistorySelect = (historyQuery: string) => {
    setQuery(historyQuery);
  };

  // 清除历史记录
  const handleClearHistory = () => {
    clearHistory();
  };

  // 删除单条历史
  const handleRemoveHistory = (e: React.MouseEvent, historyQuery: string) => {
    e.stopPropagation();
    removeSearch(historyQuery);
  };

  // 获取图标组件
  const getIcon = (iconName: string) => {
    const IconComponent = iconMap[iconName] || Search;
    return <IconComponent className="mr-2 h-4 w-4 shrink-0 opacity-50" />;
  };

  // 渲染搜索结果组
  const renderGroup = (title: string, results: SearchResult[]) => {
    if (!results.length) return null;

    return (
      <CommandGroup heading={title}>
        {results.map((result) => (
          <CommandItem
            key={`${result.type}-${result.id}`}
            value={`${result.type}-${result.title}`}
            onSelect={() => handleSelect(result)}
            className="cursor-pointer"
          >
            {getIcon(result.icon)}
            <div className="flex flex-col flex-1 min-w-0">
              <span className="truncate">{result.title}</span>
              {result.subtitle && (
                <span className="text-xs text-muted-foreground truncate">
                  {result.subtitle}
                </span>
              )}
            </div>
            {result.priority && (
              <span className={cn('text-xs ml-2', priorityStyles[result.priority] || '')}>
                {result.priority === 'urgent' ? '紧急' : result.priority === 'high' ? '高' : ''}
              </span>
            )}
            {result.status && !result.priority && (
              <span className="text-xs text-muted-foreground ml-2">
                {result.status}
              </span>
            )}
          </CommandItem>
        ))}
      </CommandGroup>
    );
  };

  // 渲染搜索历史
  const renderHistory = () => {
    const recentSearches = getRecentSearches(5);
    if (recentSearches.length === 0 || query.trim()) return null;

    return (
      <CommandGroup heading="最近搜索">
        <div className="flex flex-wrap gap-2 px-2 py-2">
          {recentSearches.map((item) => (
            <Badge
              key={item.query}
              variant="secondary"
              className="cursor-pointer hover:bg-secondary/80 group"
              onClick={() => handleHistorySelect(item.query)}
            >
              <Clock className="h-3 w-3 mr-1" />
              {item.query}
              <X
                className="h-3 w-3 ml-1 opacity-0 group-hover:opacity-100"
                onClick={(e) => handleRemoveHistory(e, item.query)}
              />
            </Badge>
          ))}
          {recentSearches.length > 0 && (
            <Badge
              variant="outline"
              className="cursor-pointer text-muted-foreground hover:text-foreground"
              onClick={handleClearHistory}
            >
              清除
            </Badge>
          )}
        </div>
      </CommandGroup>
    );
  };

  // 渲染热门搜索
  const renderHotSearches = () => {
    if (query.trim()) return null;

    return (
      <CommandGroup heading="热门搜索">
        <div className="flex flex-wrap gap-2 px-2 py-2">
          {HOT_SEARCH_KEYWORDS.map((item) => (
            <Badge
              key={item.keyword}
              variant="outline"
              className="cursor-pointer hover:bg-accent"
              onClick={() => setQuery(item.keyword)}
            >
              <TrendingUp className="h-3 w-3 mr-1" />
              {item.keyword}
            </Badge>
          ))}
        </div>
      </CommandGroup>
    );
  };

  // 渲染搜索建议
  const renderSuggestions = () => {
    if (!suggestions.length || !query.trim() || loading || searchResults) return null;

    return (
      <CommandGroup heading="搜索建议">
        {suggestions.slice(0, 5).map((suggestion, index) => (
          <CommandItem
            key={index}
            value={suggestion}
            onSelect={() => setQuery(suggestion)}
            className="cursor-pointer"
          >
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <span>{suggestion}</span>
          </CommandItem>
        ))}
      </CommandGroup>
    );
  };

  // 重置单个过滤器
  const handleRemoveFilter = (key: keyof SearchFilters) => {
    setFilters((prev) => ({
      ...prev,
      [key]: DEFAULT_FILTERS[key],
    }));
  };

  // 重置所有过滤器
  const handleResetFilters = () => {
    setFilters(DEFAULT_FILTERS);
  };

  // 计算活跃过滤器数量
  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.type !== 'all') count++;
    if (filters.timeRange !== 'all') count++;
    if (filters.status !== 'all') count++;
    if (filters.priority !== 'all') count++;
    return count;
  };

  // 渲染过滤器
  const renderFilters = () => {
    return (
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <AdvancedSearchFilter
          filters={filters}
          onFiltersChange={setFilters}
          onReset={handleResetFilters}
          activeCount={getActiveFilterCount()}
        />
      </div>
    );
  };

  // 渲染过滤器标签
  const renderFilterTags = () => {
    const count = getActiveFilterCount();
    if (count === 0 || !query.trim()) return null;
    
    return (
      <FilterTags
        filters={filters}
        onRemoveFilter={handleRemoveFilter}
        onClearAll={handleResetFilters}
      />
    );
  };

  return (
    <>
      {/* 桌面端搜索按钮 */}
      <Button
        variant="outline"
        className={cn(
          'relative w-full max-w-md justify-start text-muted-foreground',
          'hidden md:flex'
        )}
        onClick={() => setOpen(true)}
      >
        <Search className="mr-2 h-4 w-4" />
        <span className="truncate">搜索客户、项目、待办、日程...</span>
        <kbd className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      {/* 移动端搜索按钮 */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={() => setOpen(true)}
      >
        <Search className="h-5 w-5" />
        <span className="sr-only">搜索</span>
      </Button>

      {/* 搜索对话框 */}
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="搜索客户、项目、待办、日程..."
          value={query}
          onValueChange={setQuery}
        />
        
        {/* 过滤器 */}
        {renderFilters()}
        
        {/* 过滤器标签 */}
        {renderFilterTags()}
        
        <CommandList>
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : searchResults ? (
            <>
              {/* 待办和日程优先显示 */}
              {renderGroup('待办事项', searchResults.results.todos)}
              {renderGroup('日程安排', searchResults.results.schedules)}
              
              {(searchResults.results.todos.length > 0 || searchResults.results.schedules.length > 0) && 
               (searchResults.results.customers.length > 0 || searchResults.results.projects.length > 0) && (
                <CommandSeparator />
              )}
              
              {renderGroup('客户', searchResults.results.customers)}
              {renderGroup('项目', searchResults.results.projects)}
              {renderGroup('解决方案', searchResults.results.solutions)}
              {renderGroup('人员', searchResults.results.users)}
            </>
          ) : (
            <>
              {/* 搜索建议 */}
              {renderSuggestions()}
              
              {/* 搜索历史 */}
              {renderHistory()}
              
              {/* 热门搜索 */}
              {renderHotSearches()}
              
              {/* 空状态 */}
              {!suggestions.length && history.length === 0 && (
                <CommandEmpty>
                  <div className="flex flex-col items-center py-6 text-muted-foreground">
                    <Search className="h-10 w-10 mb-2 opacity-50" />
                    <p className="text-sm">输入关键词开始搜索</p>
                    <p className="text-xs mt-1">支持搜索客户、项目、待办、日程等</p>
                  </div>
                </CommandEmpty>
              )}
            </>
          )}
        </CommandList>
        
        {/* 底部提示 */}
        {searchResults && searchResults.total > 0 && (
          <div className="border-t px-4 py-2">
            <p className="text-xs text-muted-foreground">
              找到 {searchResults.total} 个结果
            </p>
          </div>
        )}
      </CommandDialog>
    </>
  );
}
