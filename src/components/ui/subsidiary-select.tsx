'use client';

import { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { apiClient } from '@/lib/api-client';

interface SubsidiaryOption {
  id: number;
  code: string;
  name: string;
}

interface SubsidiarySelectProps {
  value?: number;
  onValueChange?: (value: number | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

let cachedOptions: SubsidiaryOption[] | null = null;

export function SubsidiarySelect({
  value,
  onValueChange,
  placeholder = '请选择',
  disabled = false,
  className,
}: SubsidiarySelectProps) {
  const [options, setOptions] = useState<SubsidiaryOption[]>(cachedOptions || []);
  const [loading, setLoading] = useState(!cachedOptions);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (cachedOptions) return;
    let cancelled = false;

    const load = async () => {
      try {
        const { data: result } = await apiClient.get<{ success: boolean; data: SubsidiaryOption[] }>('/api/subsidiaries?simple=true');
        const list = (result as any).data || result;
        if (!cancelled && Array.isArray(list)) {
          cachedOptions = list;
          setOptions(list);
        }
      } catch (error) {
        console.error('Failed to load subsidiaries:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => { cancelled = true; };
  }, []);

  const selectedOption = options.find((opt) => opt.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || loading}
          className={cn('w-full justify-between font-normal', !selectedOption && 'text-muted-foreground', className)}
        >
          <span className="truncate">{loading ? '加载中...' : selectedOption ? selectedOption.name : placeholder}</span>
          <div className="flex items-center gap-1 shrink-0">
            {selectedOption && !disabled && (
              <X
                className="size-3.5 opacity-50 hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  onValueChange?.(undefined);
                }}
              />
            )}
            <ChevronsUpDown className="size-4 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="搜索公司..." />
          <CommandList>
            <CommandEmpty>未找到匹配公司</CommandEmpty>
            <CommandGroup>
              {options.map((opt) => (
                <CommandItem
                  key={opt.id}
                  value={opt.name}
                  onSelect={() => {
                    onValueChange?.(opt.id === value ? undefined : opt.id);
                    setOpen(false);
                  }}
                >
                  <Check className={cn('size-4', value === opt.id ? 'opacity-100' : 'opacity-0')} />
                  {opt.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/** 根据 ID 查找公司名称（用于展示） */
export function getSubsidiaryNameById(id: number | null | undefined): string | null {
  if (!id || !cachedOptions) return null;
  return cachedOptions.find(o => o.id === id)?.name || null;
}
