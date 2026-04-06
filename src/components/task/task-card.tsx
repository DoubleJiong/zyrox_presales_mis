'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Task, TASK_STATUS_LABELS, TASK_PRIORITY_LABELS } from '@/types/task';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Calendar, 
  Clock, 
  User, 
  MoreHorizontal,
  CheckCircle,
  AlertCircle,
  Pause,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

const taskCardVariants = cva(
  'group relative rounded-lg border bg-card p-4 shadow-sm transition-all hover:shadow-md cursor-pointer',
  {
    variants: {
      priority: {
        low: 'border-l-4 border-l-muted',
        medium: 'border-l-4 border-l-primary',
        high: 'border-l-4 border-l-destructive',
      },
      isDragging: {
        true: 'opacity-50 shadow-lg rotate-2',
        false: '',
      },
    },
    defaultVariants: {
      priority: 'medium',
      isDragging: false,
    },
  }
);

interface TaskCardProps extends VariantProps<typeof taskCardVariants> {
  task: Task;
  isDragging?: boolean;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onStatusChange?: (status: string) => void;
}

export function TaskCard({
  task,
  isDragging = false,
  onClick,
  onEdit,
  onDelete,
  onStatusChange,
}: TaskCardProps) {
  const isOverdue = task.dueDate && 
    new Date(task.dueDate) < new Date() && 
    task.status !== 'completed' &&
    task.status !== 'cancelled';

  return (
    <div
      className={taskCardVariants({ 
        priority: task.priority, 
        isDragging 
      })}
      onClick={onClick}
    >
      {/* 顶部：优先级和菜单 */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <StatusIcon status={task.status} />
          <Badge variant="outline" className="text-xs">
            {TASK_PRIORITY_LABELS[task.priority]}优先级
          </Badge>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => {
              e.stopPropagation();
              onEdit?.();
            }}>
              编辑
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.();
              }}
            >
              删除
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* 任务名称 */}
      <h4 className="font-medium text-sm mb-2 line-clamp-2">
        {task.taskName}
      </h4>

      {/* 进度条 */}
      {task.status !== 'cancelled' && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>进度</span>
            <span>{task.progress}%</span>
          </div>
          <Progress value={task.progress} className="h-1.5" />
        </div>
      )}

      {/* 底部信息 */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-3">
          {/* 负责人 */}
          {task.assigneeName && (
            <div className="flex items-center gap-1">
              <User className="h-3 w-3" />
              <span className="truncate max-w-[80px]">{task.assigneeName}</span>
            </div>
          )}
          
          {/* 截止日期 */}
          {task.dueDate && (
            <div className={cn(
              'flex items-center gap-1',
              isOverdue && 'text-destructive'
            )}>
              {isOverdue ? (
                <AlertCircle className="h-3 w-3" />
              ) : (
                <Calendar className="h-3 w-3" />
              )}
              <span>{new Date(task.dueDate).toLocaleDateString('zh-CN', {
                month: 'short',
                day: 'numeric',
              })}</span>
            </div>
          )}
        </div>

        {/* 工时 */}
        {(task.estimatedHours || task.actualHours) && (
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>
              {task.actualHours || 0}/{task.estimatedHours || 0}h
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// 状态图标组件
function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'completed':
      return <CheckCircle className="h-4 w-4 text-success" />;
    case 'cancelled':
      return <Pause className="h-4 w-4 text-muted-foreground" />;
    case 'in_progress':
      return <div className="h-4 w-4 rounded-full bg-primary animate-pulse" />;
    default:
      return <div className="h-4 w-4 rounded-full border-2 border-muted-foreground" />;
  }
}

export default TaskCard;
