'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getPriorityBgColor, getPriorityLabel, Priority } from '@/lib/utils/project-colors';
import { cn } from '@/lib/utils';

interface PrioritySelectorProps {
  currentPriority: Priority;
  disabled?: boolean;
  onPriorityChange: (newPriority: Priority) => void;
}

const PRIORITY_OPTIONS: Priority[] = ['urgent', 'high', 'medium', 'low'];

export function PrioritySelector({
  currentPriority,
  disabled = false,
  onPriorityChange,
}: PrioritySelectorProps) {
  const handleChange = (value: string) => {
    const priority = value as Priority;
    if (priority === currentPriority) return;
    onPriorityChange(priority);
  };

  return (
    <Select
      value={currentPriority}
      onValueChange={handleChange}
      disabled={disabled}
    >
      <SelectTrigger
        className={cn(
          'h-8 w-auto min-w-[70px] px-3 border-0 font-medium cursor-pointer',
          getPriorityBgColor(currentPriority)
        )}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {PRIORITY_OPTIONS.map((priority) => (
          <SelectItem
            key={priority}
            value={priority}
          >
            <span className={cn(
              'inline-flex items-center gap-1.5',
              priority === 'urgent' && 'text-red-600 font-semibold'
            )}>
              {priority === 'urgent' && (
                <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
              )}
              {getPriorityLabel(priority)}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
