'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
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

export interface UserOption {
  id: number;
  realName: string;
  username?: string;
  department?: string;
}

interface UserSelectProps {
  users: UserOption[];
  value: number | string | null;
  onChange?: (value: number | string | null) => void;
  onValueChange?: (value: number | string | null) => void;
  onSearchChange?: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  className?: string;
}

export function UserSelect({
  users,
  value,
  onChange,
  onValueChange,
  onSearchChange,
  placeholder = '选择人员',
  searchPlaceholder = '搜索姓名...',
  emptyText = '未找到人员',
  disabled = false,
  className,
}: UserSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');

  // 支持 onChange 和 onValueChange 两种写法
  const handleChange = (userId: number) => {
    // 如果原值是字符串类型，则返回字符串；否则返回数字
    const result = typeof value === 'string' ? String(userId) : userId;
    onChange?.(result);
    onValueChange?.(result);
  };

  // 将 value 转换为 number 进行比较
  const numericValue = value !== null 
    ? (typeof value === 'string' ? parseInt(value, 10) : value) 
    : null;

  const selectedUser = users.find((user) => user.id === numericValue);

  const filteredUsers = users.filter((user) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      user.realName?.toLowerCase().includes(searchLower) ||
      user.username?.toLowerCase().includes(searchLower) ||
      user.department?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn('w-full justify-between', className)}
        >
          {selectedUser ? (
            <span className="truncate">{selectedUser.realName}</span>
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
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => {
                const value = e.target.value;
                setSearch(value);
                onSearchChange?.(value);
              }}
              className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup className="max-h-60 overflow-auto">
              {filteredUsers.map((user) => (
                <CommandItem
                  key={user.id}
                  value={user.id.toString()}
                  onSelect={() => {
                    handleChange(user.id);
                    setOpen(false);
                    setSearch('');
                  }}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      numericValue === user.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <div className="flex-1">
                    <span className="font-medium">{user.realName}</span>
                    {user.department && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        {user.department}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
