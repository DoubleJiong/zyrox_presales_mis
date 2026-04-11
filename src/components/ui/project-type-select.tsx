'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, FolderKanban, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  getProjectTypeDisplayLabel,
  getProjectTypeOaCategory,
  normalizeProjectTypeCodes,
  OA_PROJECT_TYPE_CATEGORY_LABELS,
} from '@/lib/project-type-codec';

export interface ProjectTypeOption {
  value: string;
  label: string;
}

interface ProjectTypeSelectProps {
  options: ProjectTypeOption[];
  value: string | null;
  values?: string[];
  onChange?: (value: string) => void;
  onValueChange?: (value: string) => void;
  onValuesChange?: (values: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  multiple?: boolean;
}

export function ProjectTypeSelect({
  options,
  value,
  values,
  onChange,
  onValueChange,
  onValuesChange,
  placeholder = '选择项目类型',
  disabled = false,
  className,
  multiple = false,
}: ProjectTypeSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');

  const selectedValues = React.useMemo(
    () => normalizeProjectTypeCodes(multiple ? values || [] : value),
    [multiple, value, values]
  );

  const handleChange = (newValue: string) => {
    onChange?.(newValue);
    onValueChange?.(newValue);
  };

  const handleToggle = (newValue: string) => {
    if (!multiple) {
      handleChange(newValue);
      setOpen(false);
      setSearch('');
      return;
    }

    const nextValues = selectedValues.includes(newValue)
      ? selectedValues.filter((item) => item !== newValue)
      : [...selectedValues, newValue];

    onValuesChange?.(nextValues);
  };

  const selectedOption = options.find((opt) => opt.value === value);
  const selectedOptions = options.filter((opt) => selectedValues.includes(opt.value));

  const filteredOptions = options.filter((opt) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      opt.label?.toLowerCase().includes(searchLower) ||
      opt.value?.toLowerCase().includes(searchLower)
    );
  });

  const groupedOptions = filteredOptions.reduce<Record<string, ProjectTypeOption[]>>((groups, option) => {
    const groupKey = getProjectTypeOaCategory(option.value);
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(option);
    return groups;
  }, {});

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn('w-full justify-between font-normal', className)}
        >
          {multiple ? (
            selectedOptions.length > 0 ? (
              <span className="flex items-center gap-2 truncate">
                <FolderKanban className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="truncate">
                  {selectedOptions.slice(0, 2).map((option) => getProjectTypeDisplayLabel(option.value)).join('、')}
                  {selectedOptions.length > 2 ? ` +${selectedOptions.length - 2}` : ''}
                </span>
              </span>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )
          ) : selectedOption ? (
            <span className="flex items-center gap-2 truncate">
              <FolderKanban className="h-4 w-4 text-muted-foreground" />
              <span>{getProjectTypeDisplayLabel(selectedOption.value)}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <input
              placeholder="搜索项目类型..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <CommandList>
            <CommandEmpty>未找到项目类型</CommandEmpty>
            {Object.entries(groupedOptions).map(([groupKey, groupOptions]) => (
              <CommandGroup key={groupKey} heading={OA_PROJECT_TYPE_CATEGORY_LABELS[groupKey] || OA_PROJECT_TYPE_CATEGORY_LABELS.other} className="max-h-60 overflow-auto">
                {groupOptions.map((opt) => (
                  <CommandItem
                    key={opt.value}
                    value={opt.value}
                    onSelect={() => handleToggle(opt.value)}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        selectedValues.includes(opt.value) ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <div className="flex flex-col">
                      <span>{getProjectTypeDisplayLabel(opt.value)}</span>
                      <span className="text-xs text-muted-foreground">{opt.value}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
