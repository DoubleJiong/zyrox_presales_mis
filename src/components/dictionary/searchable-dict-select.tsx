'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle } from 'lucide-react';

interface DictOption {
  value: string;
  label: string;
  sort: number;
  extraData?: Record<string, any>;
}

interface SearchableDictSelectProps {
  /** 字典分类编码 */
  category: string;
  /** 当前选中的值 */
  value?: string;
  /** 值变化回调 */
  onValueChange?: (value: string) => void;
  /** 占位文本 */
  placeholder?: string;
  /** 搜索占位文本 */
  searchPlaceholder?: string;
  /** 是否禁用 */
  disabled?: boolean;
  /** 是否包含禁用项 */
  includeInactive?: boolean;
  /** 额外的 className */
  className?: string;
  /** 空值时的占位文本 */
  emptyText?: string;
  /** 未找到匹配项时的文本 */
  notFoundText?: string;
}

// 缓存字典数据
const dictCache: Record<string, { data: DictOption[]; timestamp: number }> = {};
const CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存

export function SearchableDictSelect({
  category,
  value,
  onValueChange,
  placeholder = '请选择',
  searchPlaceholder = '搜索...',
  disabled = false,
  includeInactive = false,
  className,
  emptyText = '暂无选项',
  notFoundText = '未找到匹配项',
}: SearchableDictSelectProps) {
  const [options, setOptions] = useState<DictOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const loadOptions = useCallback(async () => {
    // 检查缓存
    const cached = dictCache[category];
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
        dictCache[category] = {
          data: optionsData,
          timestamp: Date.now(),
        };
        setOptions(optionsData);
      } else {
        setError(data.error || '加载失败');
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

  // 过滤选项
  const filteredOptions = useMemo(() => {
    if (!search) return options;
    return options.filter((option) =>
      option.label.toLowerCase().includes(search.toLowerCase())
    );
  }, [options, search]);

  // 获取选中项
  const selectedOption = options.find((option) => option.value === value);

  // 加载中状态
  if (loading) {
    return <Skeleton className={`h-10 w-full ${className || ''}`} />;
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
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
          disabled={disabled}
        >
          {selectedOption ? selectedOption.label : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>{notFoundText}</CommandEmpty>
            <CommandGroup>
              {filteredOptions.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={() => {
                    onValueChange?.(option.value);
                    setOpen(false);
                    setSearch('');
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
