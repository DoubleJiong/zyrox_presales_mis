'use client';

import * as React from 'react';
import { useState, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Task, TaskStatus, KANBAN_COLUMNS, TASK_STATUS_LABELS } from '@/types/task';
import { TaskCard } from './task-card';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Plus, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface TaskBoardProps {
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
  onTaskEdit?: (task: Task) => void;
  onTaskDelete?: (taskId: number) => void;
  onTaskStatusChange?: (taskId: number, status: TaskStatus) => void;
  onAddTask?: (status: TaskStatus) => void;
}

export function TaskBoard({
  tasks,
  onTaskClick,
  onTaskEdit,
  onTaskDelete,
  onTaskStatusChange,
  onAddTask,
}: TaskBoardProps) {
  // 按状态分组任务
  const getColumnTasks = useCallback((status: TaskStatus) => {
    return tasks.filter(task => task.status === status);
  }, [tasks]);

  // 拖拽结束处理
  const handleDragEnd = useCallback((result: DropResult) => {
    if (!result.destination) return;

    const { draggableId, destination } = result;
    const taskId = parseInt(draggableId);
    const newStatus = destination.droppableId as TaskStatus;

    // 如果状态改变
    if (result.source.droppableId !== newStatus) {
      onTaskStatusChange?.(taskId, newStatus);
    }
  }, [onTaskStatusChange]);

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 h-full overflow-x-auto pb-4">
        {KANBAN_COLUMNS.map((column) => {
          const columnTasks = getColumnTasks(column.id);
          
          return (
            <div
              key={column.id}
              className="flex-shrink-0 w-80 flex flex-col bg-muted/30 rounded-lg"
            >
              {/* 列头部 */}
              <div className="p-3 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: column.color }}
                    />
                    <h3 className="font-medium text-sm">
                      {TASK_STATUS_LABELS[column.id]}
                    </h3>
                    <Badge variant="secondary" className="h-5 px-1.5">
                      {columnTasks.length}
                    </Badge>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onAddTask?.(column.id)}>
                        添加任务
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* 可拖拽区域 */}
              <Droppable droppableId={column.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      'flex-1 p-2 space-y-2 overflow-y-auto min-h-[200px]',
                      snapshot.isDraggingOver && 'bg-muted/50'
                    )}
                  >
                    {columnTasks.map((task, index) => (
                      <Draggable
                        key={task.id}
                        draggableId={String(task.id)}
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                          >
                            <TaskCard
                              task={task}
                              isDragging={snapshot.isDragging}
                              onClick={() => onTaskClick?.(task)}
                              onEdit={() => onTaskEdit?.(task)}
                              onDelete={() => onTaskDelete?.(task.id)}
                              onStatusChange={(status) => 
                                onTaskStatusChange?.(task.id, status as TaskStatus)
                              }
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>

              {/* 添加按钮 */}
              <div className="p-2 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-muted-foreground"
                  onClick={() => onAddTask?.(column.id)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  添加任务
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}

export default TaskBoard;
