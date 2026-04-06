'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { useTasks } from '@/hooks/task/use-tasks';
import { TaskBoard } from '@/components/task/task-board';
import { TaskList } from '@/components/task/task-list';
import { TaskGantt } from '@/components/task/task-gantt';
import { TaskForm } from '@/components/task/task-form';
import { BatchActionsBar } from '@/components/task/batch-actions-bar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Plus, 
  LayoutGrid, 
  List, 
  GanttChart,
  Filter,
} from 'lucide-react';
import type { Task, TaskFormData, TaskStatus } from '@/types/task';

interface TaskPageProps {
  projectId: number;
}

export function TaskPage({ projectId }: TaskPageProps) {
  const {
    tasks,
    stats,
    loading,
    error,
    view,
    filter,
    selectedIds,
    setView,
    setFilter,
    setSelectedIds,
    fetchTasks,
    createTask,
    updateTask,
    deleteTask,
    batchAction,
  } = useTasks({ projectId });

  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // 初始化加载
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // 创建任务
  const handleCreateTask = async (data: TaskFormData) => {
    const task = await createTask(data);
    if (task) {
      setShowTaskDialog(false);
    }
  };

  // 更新任务
  const handleUpdateTask = async (data: TaskFormData) => {
    if (editingTask) {
      const success = await updateTask(editingTask.id, data);
      if (success) {
        setShowTaskDialog(false);
        setEditingTask(null);
      }
    }
  };

  // 删除任务
  const handleDeleteTask = async (taskId: number) => {
    if (confirm('确定要删除这个任务吗？')) {
      await deleteTask(taskId);
    }
  };

  // 任务状态变更（看板拖拽）
  const handleTaskStatusChange = async (taskId: number, status: TaskStatus) => {
    await updateTask(taskId, { status });
  };

  // 批量操作
  const handleBatchAction = async (request: any) => {
    // 补充 taskIds
    request.taskIds = selectedIds;
    await batchAction(request);
  };

  // 打开新建对话框
  const handleOpenCreate = () => {
    setEditingTask(null);
    setShowTaskDialog(true);
  };

  // 打开编辑对话框
  const handleOpenEdit = (task: Task) => {
    setEditingTask(task);
    setShowTaskDialog(true);
  };

  return (
    <div className="space-y-4">
      {/* 头部：统计和操作 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold">任务管理</h2>
          {stats && (
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span>总计: {stats.total}</span>
              <span>|</span>
              <span>待处理: {stats.byStatus.pending || 0}</span>
              <span>进行中: {stats.byStatus.in_progress || 0}</span>
              <span>已完成: {stats.byStatus.completed || 0}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={handleOpenCreate}>
            <Plus className="h-4 w-4 mr-2" />
            新建任务
          </Button>
        </div>
      </div>

      {/* 视图切换 */}
      <Tabs value={view} onValueChange={(v) => setView(v as any)}>
        <TabsList>
          <TabsTrigger value="board">
            <LayoutGrid className="h-4 w-4 mr-2" />
            看板
          </TabsTrigger>
          <TabsTrigger value="list">
            <List className="h-4 w-4 mr-2" />
            列表
          </TabsTrigger>
          <TabsTrigger value="gantt">
            <GanttChart className="h-4 w-4 mr-2" />
            甘特图
          </TabsTrigger>
        </TabsList>

        {/* 看板视图 */}
        <TabsContent value="board" className="mt-4">
          <TaskBoard
            tasks={tasks}
            onTaskClick={setSelectedTask}
            onTaskEdit={handleOpenEdit}
            onTaskDelete={handleDeleteTask}
            onTaskStatusChange={handleTaskStatusChange}
            onAddTask={(status) => {
              setEditingTask(null);
              setShowTaskDialog(true);
            }}
          />
        </TabsContent>

        {/* 列表视图 */}
        <TabsContent value="list" className="mt-4">
          <TaskList
            tasks={tasks}
            selectedIds={selectedIds}
            onTaskClick={setSelectedTask}
            onTaskEdit={handleOpenEdit}
            onTaskDelete={handleDeleteTask}
            onSelectionChange={setSelectedIds}
          />
        </TabsContent>

        {/* 甘特图视图 */}
        <TabsContent value="gantt" className="mt-4">
          <TaskGantt
            tasks={tasks}
            onTaskClick={setSelectedTask}
          />
        </TabsContent>
      </Tabs>

      {/* 任务对话框（新建/编辑） */}
      <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingTask ? '编辑任务' : '新建任务'}
            </DialogTitle>
          </DialogHeader>
          <TaskForm
            task={editingTask}
            projectId={projectId}
            onSubmit={editingTask ? handleUpdateTask : handleCreateTask}
            onCancel={() => {
              setShowTaskDialog(false);
              setEditingTask(null);
            }}
            isLoading={loading}
          />
        </DialogContent>
      </Dialog>

      {/* 批量操作栏 */}
      <BatchActionsBar
        selectedCount={selectedIds.length}
        onClearSelection={() => setSelectedIds([])}
        onBatchAction={handleBatchAction}
        isLoading={loading}
      />
    </div>
  );
}

export default TaskPage;
