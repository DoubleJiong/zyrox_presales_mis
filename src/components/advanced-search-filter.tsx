'use client';

import * as React from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Filter,
  X,
  CalendarIcon,
  RotateCcw,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

// 搜索类型
export const SEARCH_TYPES = [
  { value: 'all', label: '全部', icon: '🔍' },
  { value: 'customers', label: '客户', icon: '👥' },
  { value: 'projects', label: '项目', icon: '📁' },
  { value: 'solutions', label: '解决方案', icon: '📄' },
  { value: 'users', label: '人员', icon: '👤' },
  { value: 'todos', label: '待办', icon: '✅' },
  { value: 'schedules', label: '日程', icon: '📅' },
] as const;

// 时间范围
export const TIME_RANGES: { value: string; label: string }[] = [
  { value: 'all', label: '全部时间' },
  { value: 'today', label: '今天' },
  { value: 'week', label: '最近一周' },
  { value: 'month', label: '最近一个月' },
  { value: 'quarter', label: '最近三个月' },
  { value: 'year', label: '最近一年' },
  { value: 'custom', label: '自定义' },
];

// 状态选项（根据类型不同）
export const STATUS_OPTIONS: Record<string, { value: string; label: string; color: string }[]> = {
  customers: [
    { value: 'all', label: '全部状态', color: 'default' },
    { value: 'potential', label: '潜在客户', color: 'secondary' },
    { value: 'active', label: '意向客户', color: 'default' },
    { value: 'converted', label: '成交客户', color: 'success' },
    { value: 'lost', label: '流失客户', color: 'destructive' },
  ],
  projects: [
    { value: 'all', label: '全部状态', color: 'default' },
    { value: 'opportunity', label: '商机阶段', color: 'secondary' },
    { value: 'bidding_pending', label: '投标立项待审批', color: 'warning' },
    { value: 'bidding', label: '招标投标', color: 'default' },
    { value: 'solution_review', label: '方案评审中', color: 'secondary' },
    { value: 'contract_pending', label: '合同/商务确认中', color: 'secondary' },
    { value: 'delivery_preparing', label: '执行准备中', color: 'default' },
    { value: 'delivering', label: '执行中', color: 'default' },
    { value: 'settlement', label: '结算中', color: 'warning' },
    { value: 'archived', label: '已归档', color: 'success' },
    { value: 'cancelled', label: '已取消', color: 'destructive' },
  ],
  todos: [
    { value: 'all', label: '全部状态', color: 'default' },
    { value: 'pending', label: '待处理', color: 'secondary' },
    { value: 'in_progress', label: '进行中', color: 'default' },
    { value: 'completed', label: '已完成', color: 'success' },
    { value: 'cancelled', label: '已取消', color: 'destructive' },
  ],
  all: [{ value: 'all', label: '全部状态', color: 'default' }],
};

// 优先级选项
export const PRIORITY_OPTIONS: { value: string; label: string; color?: string }[] = [
  { value: 'all', label: '全部优先级' },
  { value: 'urgent', label: '紧急', color: 'destructive' },
  { value: 'high', label: '高', color: 'warning' },
  { value: 'medium', label: '中', color: 'default' },
  { value: 'low', label: '低', color: 'secondary' },
] as const;

export interface SearchFilters {
  type: string;
  timeRange: string;
  startDate?: Date;
  endDate?: Date;
  status: string;
  priority: string;
}

interface AdvancedSearchFilterProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  onReset: () => void;
  activeCount?: number;
}

export function AdvancedSearchFilter({
  filters,
  onFiltersChange,
  onReset,
  activeCount = 0,
}: AdvancedSearchFilterProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  // 更新单个过滤器
  const updateFilter = (key: keyof SearchFilters, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  // 获取当前类型的状态选项
  const getStatusOptions = () => {
    return STATUS_OPTIONS[filters.type] || STATUS_OPTIONS.all;
  };

  // 重置所有过滤器
  const handleReset = () => {
    onReset();
    setIsOpen(false);
  };

  // 应用过滤器
  const handleApply = () => {
    setIsOpen(false);
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

  const filterCount = activeCount || getActiveFilterCount();

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'relative',
            filterCount > 0 && 'border-primary text-primary'
          )}
        >
          <Filter className="h-4 w-4 mr-1" />
          高级筛选
          {filterCount > 0 && (
            <Badge
              variant="default"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {filterCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:max-w-[400px]">
        <SheetHeader>
          <SheetTitle>高级筛选</SheetTitle>
          <SheetDescription>
            通过多种条件缩小搜索范围
          </SheetDescription>
        </SheetHeader>
        
        <div className="py-4 space-y-6">
          {/* 类型筛选 */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">搜索类型</Label>
            <RadioGroup
              value={filters.type}
              onValueChange={(value) => updateFilter('type', value)}
              className="grid grid-cols-2 gap-2"
            >
              {SEARCH_TYPES.map((type) => (
                <div key={type.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={type.value} id={`type-${type.value}`} />
                  <Label
                    htmlFor={`type-${type.value}`}
                    className="cursor-pointer text-sm flex items-center gap-1"
                  >
                    <span>{type.icon}</span>
                    <span>{type.label}</span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* 时间筛选 */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">时间范围</Label>
            <Select
              value={filters.timeRange}
              onValueChange={(value) => updateFilter('timeRange', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="选择时间范围" />
              </SelectTrigger>
              <SelectContent>
                {TIME_RANGES.map((range) => (
                  <SelectItem key={range.value} value={range.value}>
                    {range.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* 自定义日期范围 */}
            {filters.timeRange === 'custom' && (
              <div className="grid grid-cols-2 gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'justify-start text-left font-normal',
                        !filters.startDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.startDate
                        ? format(filters.startDate, 'PP', { locale: zhCN })
                        : '开始日期'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.startDate}
                      onSelect={(date) => updateFilter('startDate', date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'justify-start text-left font-normal',
                        !filters.endDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.endDate
                        ? format(filters.endDate, 'PP', { locale: zhCN })
                        : '结束日期'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.endDate}
                      onSelect={(date) => updateFilter('endDate', date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>

          {/* 状态筛选 */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">状态</Label>
            <Select
              value={filters.status}
              onValueChange={(value) => updateFilter('status', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="选择状态" />
              </SelectTrigger>
              <SelectContent>
                {getStatusOptions().map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    <div className="flex items-center gap-2">
                      <span>{status.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 优先级筛选 */}
          {(filters.type === 'todos' || filters.type === 'projects' || filters.type === 'all') && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">优先级</Label>
              <Select
                value={filters.priority}
                onValueChange={(value) => updateFilter('priority', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择优先级" />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((priority) => (
                    <SelectItem key={priority.value} value={priority.value}>
                      <div className="flex items-center gap-2">
                        {priority.color && (
                          <span
                            className={cn(
                              'w-2 h-2 rounded-full',
                              priority.color === 'destructive' && 'bg-red-500',
                              priority.color === 'warning' && 'bg-orange-500',
                              priority.color === 'default' && 'bg-blue-500',
                              priority.color === 'secondary' && 'bg-gray-400'
                            )}
                          />
                        )}
                        <span>{priority.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-2 pt-4 border-t">
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleReset}
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            重置
          </Button>
          <Button
            className="flex-1"
            onClick={handleApply}
          >
            <Check className="h-4 w-4 mr-1" />
            应用
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// 筛选标签显示组件
interface FilterTagsProps {
  filters: SearchFilters;
  onRemoveFilter: (key: keyof SearchFilters) => void;
  onClearAll: () => void;
}

export interface FilterTag {
  key: keyof SearchFilters;
  label: string;
  value: string;
}

export function FilterTags({ filters, onRemoveFilter, onClearAll }: FilterTagsProps) {
  const tags: FilterTag[] = [];

  // 添加类型标签
  if (filters.type !== 'all') {
    const type = SEARCH_TYPES.find((t) => t.value === filters.type);
    if (type) {
      tags.push({
        key: 'type',
        label: '类型',
        value: `${type.icon} ${type.label}`,
      });
    }
  }

  // 添加时间标签
  if (filters.timeRange !== 'all') {
    const range = TIME_RANGES.find((r) => r.value === filters.timeRange);
    if (range) {
      let displayValue = range.label;
      if (range.value === 'custom' && filters.startDate && filters.endDate) {
        displayValue = `${format(filters.startDate, 'MM/dd')} - ${format(filters.endDate, 'MM/dd')}`;
      }
      tags.push({
        key: 'timeRange',
        label: '时间',
        value: displayValue,
      });
    }
  }

  // 添加状态标签
  if (filters.status !== 'all') {
    const statusOptions = STATUS_OPTIONS[filters.type] || STATUS_OPTIONS.all;
    const status = statusOptions.find((s) => s.value === filters.status);
    if (status) {
      tags.push({
        key: 'status',
        label: '状态',
        value: status.label,
      });
    }
  }

  // 添加优先级标签
  if (filters.priority !== 'all') {
    const priority = PRIORITY_OPTIONS.find((p) => p.value === filters.priority);
    if (priority) {
      tags.push({
        key: 'priority',
        label: '优先级',
        value: priority.label,
      });
    }
  }

  if (tags.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 px-3 py-2 bg-muted/30">
      {tags.map((tag) => (
        <Badge
          key={tag.key}
          variant="secondary"
          className="flex items-center gap-1"
        >
          <span className="text-xs text-muted-foreground">{tag.label}:</span>
          <span className="text-xs">{tag.value}</span>
          <X
            className="h-3 w-3 cursor-pointer"
            onClick={() => onRemoveFilter(tag.key)}
          />
        </Badge>
      ))}
      <Badge
        variant="outline"
        className="cursor-pointer text-xs text-muted-foreground"
        onClick={onClearAll}
      >
        清除全部
      </Badge>
    </div>
  );
}

// 默认过滤器值
export const DEFAULT_FILTERS: SearchFilters = {
  type: 'all',
  timeRange: 'all',
  status: 'all',
  priority: 'all',
};
