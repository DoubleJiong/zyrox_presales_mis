'use client';

import * as React from 'react';
import { useMemo, useState } from 'react';
import { Task, TASK_STATUS_LABELS } from '@/types/task';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { 
  format, 
  differenceInDays, 
  addDays, 
  startOfMonth, 
  endOfMonth,
  eachDayOfInterval,
  isWeekend,
  isSameDay,
} from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TaskGanttProps {
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
}

export function TaskGantt({ tasks, onTaskClick }: TaskGanttProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // 计算当前视图范围
  const viewRange = useMemo(() => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    return { start, end };
  }, [currentDate]);

  // 生成日期列表
  const days = useMemo(() => {
    return eachDayOfInterval({
      start: viewRange.start,
      end: viewRange.end,
    });
  }, [viewRange]);

  // 转换任务为甘特图数据
  const ganttTasks = useMemo(() => {
    return tasks
      .filter(task => task.startDate && task.dueDate)
      .map(task => {
        const startDate = new Date(task.startDate!);
        const endDate = new Date(task.dueDate!);
        const totalDays = differenceInDays(viewRange.end, viewRange.start) + 1;
        
        // 计算位置百分比
        const startOffset = differenceInDays(startDate, viewRange.start);
        const duration = differenceInDays(endDate, startDate) + 1;
        
        const left = Math.max(0, (startOffset / totalDays) * 100);
        const width = Math.min(100 - left, (duration / totalDays) * 100);
        
        return {
          ...task,
          left: `${left}%`,
          width: `${width}%`,
          startDateStr: task.startDate!,
          endDateStr: task.dueDate!,
        };
      })
      .sort((a, b) => new Date(a.startDateStr).getTime() - new Date(b.startDateStr).getTime());
  }, [tasks, viewRange]);

  // 月份导航
  const goToPreviousMonth = () => {
    setCurrentDate(prev => addDays(prev, -30));
  };

  const goToNextMonth = () => {
    setCurrentDate(prev => addDays(prev, 30));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // 日期颜色
  const getDayColor = (day: Date) => {
    if (isWeekend(day)) return 'bg-muted/50';
    if (isSameDay(day, new Date())) return 'bg-primary/10';
    return '';
  };

  // 任务条颜色
  const getTaskBarColor = (task: Task) => {
    const colors: Record<string, string> = {
      pending: 'bg-muted',
      in_progress: 'bg-primary',
      completed: 'bg-success',
      cancelled: 'bg-destructive',
    };
    return colors[task.status] || 'bg-muted';
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* 头部：月份导航 */}
      <div className="flex items-center justify-between p-4 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToPreviousMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday}>
            今天
          </Button>
        </div>
        
        <div className="text-lg font-medium">
          {format(currentDate, 'yyyy年MM月', { locale: zhCN })}
        </div>
      </div>

      <div className="flex">
        {/* 左侧：任务列表 */}
        <div className="w-64 flex-shrink-0 border-r">
          {/* 表头 */}
          <div className="h-12 flex items-center px-4 border-b bg-muted/30 font-medium">
            任务名称
          </div>
          
          {/* 任务列表 */}
          <div className="overflow-y-auto" style={{ maxHeight: '600px' }}>
            {ganttTasks.length === 0 ? (
              <div className="h-24 flex items-center justify-center text-muted-foreground">
                暂无任务数据
              </div>
            ) : (
              ganttTasks.map((task) => (
                <div
                  key={task.id}
                  className={cn(
                    'h-12 flex items-center px-4 border-b cursor-pointer hover:bg-muted/50',
                    'transition-colors'
                  )}
                  onClick={() => onTaskClick?.(task)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">
                      {task.taskName}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge 
                        variant="outline" 
                        className="h-4 px-1 text-[10px]"
                      >
                        {TASK_STATUS_LABELS[task.status]}
                      </Badge>
                      <span>{task.progress}%</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 右侧：甘特图 */}
        <div className="flex-1 overflow-x-auto">
          {/* 日期头部 */}
          <div className="h-12 flex border-b bg-muted/30 sticky top-0">
            {days.map((day, index) => (
              <div
                key={index}
                className={cn(
                  'w-10 flex-shrink-0 flex flex-col items-center justify-center border-r text-xs',
                  getDayColor(day)
                )}
              >
                <div className="font-medium">
                  {format(day, 'd')}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {format(day, 'EEE', { locale: zhCN })}
                </div>
              </div>
            ))}
          </div>

          {/* 任务条 */}
          <div className="relative" style={{ minHeight: '600px' }}>
            {/* 网格线 */}
            <div className="absolute inset-0 flex pointer-events-none">
              {days.map((day, index) => (
                <div
                  key={index}
                  className={cn(
                    'w-10 flex-shrink-0 border-r h-full',
                    getDayColor(day)
                  )}
                />
              ))}
            </div>

            {/* 今日线 */}
            {days.findIndex(d => isSameDay(d, new Date())) >= 0 && (
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-destructive z-10"
                style={{
                  left: `${(days.findIndex(d => isSameDay(d, new Date())) + 0.5) * 40}px`,
                }}
              />
            )}

            {/* 任务条 */}
            {ganttTasks.map((task, index) => (
              <div
                key={task.id}
                className="absolute h-10 flex items-center"
                style={{
                  top: `${index * 48 + 4}px`,
                  left: task.left,
                  width: task.width,
                }}
              >
                <div
                  className={cn(
                    'h-8 rounded-md shadow-sm cursor-pointer transition-all hover:shadow-md',
                    getTaskBarColor(task)
                  )}
                  onClick={() => onTaskClick?.(task)}
                >
                  <div className="px-2 py-1 text-xs text-white font-medium truncate">
                    {task.taskName}
                  </div>
                  <div className="px-2 text-[10px] text-white/80">
                    {format(new Date(task.startDateStr), 'M/d')} - {format(new Date(task.endDateStr), 'M/d')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default TaskGantt;
