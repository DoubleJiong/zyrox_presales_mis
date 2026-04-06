'use client';

import * as React from 'react';
import { useState } from 'react';
import { Task, TASK_STATUS_LABELS, TASK_PRIORITY_LABELS, TASK_TYPE_LABELS } from '@/types/task';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  MoreHorizontal, 
  Calendar, 
  Clock, 
  User,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';

type SortField = 'taskName' | 'status' | 'priority' | 'progress' | 'dueDate' | 'createdAt';
type SortOrder = 'asc' | 'desc';

interface TaskListProps {
  tasks: Task[];
  selectedIds?: number[];
  onTaskClick?: (task: Task) => void;
  onTaskEdit?: (task: Task) => void;
  onTaskDelete?: (taskId: number) => void;
  onSelectionChange?: (ids: number[]) => void;
  onSortChange?: (field: SortField, order: SortOrder) => void;
}

export function TaskList({
  tasks,
  selectedIds = [],
  onTaskClick,
  onTaskEdit,
  onTaskDelete,
  onSelectionChange,
  onSortChange,
}: TaskListProps) {
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const handleSort = (field: SortField) => {
    const newOrder = field === sortField && sortOrder === 'asc' ? 'desc' : 'asc';
    setSortField(field);
    setSortOrder(newOrder);
    onSortChange?.(field, newOrder);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange?.(tasks.map(t => t.id));
    } else {
      onSelectionChange?.([]);
    }
  };

  const handleSelectTask = (taskId: number, checked: boolean) => {
    if (checked) {
      onSelectionChange?.([...selectedIds, taskId]);
    } else {
      onSelectionChange?.(selectedIds.filter(id => id !== taskId));
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (field !== sortField) {
      return <ArrowUpDown className="h-4 w-4" />;
    }
    return sortOrder === 'asc' 
      ? <ArrowUp className="h-4 w-4" />
      : <ArrowDown className="h-4 w-4" />;
  };

  const isOverdue = (task: Task) => {
    return task.dueDate && 
      new Date(task.dueDate) < new Date() && 
      task.status !== 'completed' &&
      task.status !== 'cancelled';
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox
                checked={selectedIds.length === tasks.length && tasks.length > 0}
                onCheckedChange={handleSelectAll}
                aria-label="全选"
              />
            </TableHead>
            <TableHead className="w-12">#</TableHead>
            <TableHead>
              <Button
                variant="ghost"
                size="sm"
                className="-ml-3 h-8"
                onClick={() => handleSort('taskName')}
              >
                任务名称
                <SortIcon field="taskName" />
              </Button>
            </TableHead>
            <TableHead>
              <Button
                variant="ghost"
                size="sm"
                className="-ml-3 h-8"
                onClick={() => handleSort('status')}
              >
                状态
                <SortIcon field="status" />
              </Button>
            </TableHead>
            <TableHead>
              <Button
                variant="ghost"
                size="sm"
                className="-ml-3 h-8"
                onClick={() => handleSort('priority')}
              >
                优先级
                <SortIcon field="priority" />
              </Button>
            </TableHead>
            <TableHead>负责人</TableHead>
            <TableHead>
              <Button
                variant="ghost"
                size="sm"
                className="-ml-3 h-8"
                onClick={() => handleSort('progress')}
              >
                进度
                <SortIcon field="progress" />
              </Button>
            </TableHead>
            <TableHead>类型</TableHead>
            <TableHead>
              <Button
                variant="ghost"
                size="sm"
                className="-ml-3 h-8"
                onClick={() => handleSort('dueDate')}
              >
                截止日期
                <SortIcon field="dueDate" />
              </Button>
            </TableHead>
            <TableHead>工时</TableHead>
            <TableHead className="w-12">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.length === 0 ? (
            <TableRow>
              <TableCell colSpan={11} className="h-24 text-center">
                暂无任务数据
              </TableCell>
            </TableRow>
          ) : (
            tasks.map((task) => (
              <TableRow
                key={task.id}
                className={cn(
                  'cursor-pointer',
                  selectedIds.includes(task.id) && 'bg-muted/50'
                )}
                onClick={() => onTaskClick?.(task)}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedIds.includes(task.id)}
                    onCheckedChange={(checked) => 
                      handleSelectTask(task.id, checked as boolean)
                    }
                    aria-label={`选择任务 ${task.taskName}`}
                  />
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  #{task.id}
                </TableCell>
                <TableCell>
                  <div className="max-w-[200px]">
                    <div className="font-medium text-sm truncate">
                      {task.taskName}
                    </div>
                    {task.parentTaskName && (
                      <div className="text-xs text-muted-foreground truncate">
                        父任务: {task.parentTaskName}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <StatusBadge status={task.status} />
                </TableCell>
                <TableCell>
                  <PriorityBadge priority={task.priority} />
                </TableCell>
                <TableCell>
                  {task.assigneeName ? (
                    <div className="flex items-center gap-2">
                      <User className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm truncate max-w-[100px]">
                        {task.assigneeName}
                      </span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">未分配</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="w-20">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted-foreground">进度</span>
                      <span>{task.progress}%</span>
                    </div>
                    <Progress value={task.progress} className="h-1.5" />
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {TASK_TYPE_LABELS[task.taskType]}
                  </Badge>
                </TableCell>
                <TableCell>
                  {task.dueDate ? (
                    <div className={cn(
                      'flex items-center gap-1 text-sm',
                      isOverdue(task) && 'text-destructive'
                    )}>
                      <Calendar className="h-3 w-3" />
                      {new Date(task.dueDate).toLocaleDateString('zh-CN', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {(task.estimatedHours || task.actualHours) ? (
                    <div className="flex items-center gap-1 text-sm">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span>
                        {task.actualHours || 0}/{task.estimatedHours || 0}h
                      </span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">-</span>
                  )}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onTaskEdit?.(task)}>
                        编辑
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-destructive"
                        onClick={() => onTaskDelete?.(task.id)}
                      >
                        删除
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

// 状态徽章组件
function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    pending: 'secondary',
    in_progress: 'default',
    completed: 'outline',
    cancelled: 'destructive',
  };

  return (
    <Badge variant={variants[status] || 'secondary'}>
      {TASK_STATUS_LABELS[status] || status}
    </Badge>
  );
}

// 优先级徽章组件
function PriorityBadge({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    low: 'text-muted-foreground',
    medium: 'text-primary',
    high: 'text-destructive',
  };

  return (
    <span className={cn('text-sm font-medium', colors[priority])}>
      {TASK_PRIORITY_LABELS[priority]}
    </span>
  );
}

export default TaskList;
