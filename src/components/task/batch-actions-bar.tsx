'use client';

import * as React from 'react';
import { useState } from 'react';
import { Task, TASK_STATUS_OPTIONS, BatchRequest, BatchAction } from '@/types/task';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { 
  X, 
  Trash2, 
  ArrowRight,
  CheckCircle,
  User,
} from 'lucide-react';

interface BatchActionsBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onBatchAction: (request: BatchRequest) => void;
  isLoading?: boolean;
}

export function BatchActionsBar({
  selectedCount,
  onClearSelection,
  onBatchAction,
  isLoading = false,
}: BatchActionsBarProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [assigneeId, setAssigneeId] = useState<string>('');

  if (selectedCount === 0) return null;

  const handleStatusChange = () => {
    if (selectedStatus) {
      onBatchAction({
        action: 'updateStatus' as BatchAction,
        taskIds: [],
        data: { status: selectedStatus as any },
      });
      setSelectedStatus('');
    }
  };

  const handleAssign = () => {
    if (assigneeId) {
      onBatchAction({
        action: 'updateAssignee' as BatchAction,
        taskIds: [],
        data: { assigneeId: Number(assigneeId) },
      });
      setAssigneeId('');
      setShowAssignDialog(false);
    }
  };

  const handleDelete = () => {
    onBatchAction({
      action: 'delete',
      taskIds: [],
    });
    setShowDeleteConfirm(false);
  };

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t shadow-lg z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* 左侧：已选数量 */}
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="text-sm">
                已选择 {selectedCount} 项
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearSelection}
              >
                <X className="h-4 w-4 mr-1" />
                取消选择
              </Button>
            </div>

            {/* 右侧：批量操作按钮 */}
            <div className="flex items-center gap-2">
              {/* 批量修改状态 */}
              <div className="flex items-center gap-2">
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="修改状态" />
                  </SelectTrigger>
                  <SelectContent>
                    {TASK_STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleStatusChange}
                  disabled={!selectedStatus || isLoading}
                >
                  <ArrowRight className="h-4 w-4 mr-1" />
                  应用
                </Button>
              </div>

              {/* 批量分配 */}
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowAssignDialog(true)}
                disabled={isLoading}
              >
                <User className="h-4 w-4 mr-1" />
                批量分配
              </Button>

              {/* 批量删除 */}
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isLoading}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                批量删除
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 删除确认对话框 */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除选中的 {selectedCount} 个任务吗？此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 分配对话框 */}
      <AlertDialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>批量分配任务</AlertDialogTitle>
            <AlertDialogDescription>
              将选中的 {selectedCount} 个任务分配给指定用户。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <input
                type="number"
                placeholder="输入用户ID"
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAssign}
              disabled={!assigneeId}
            >
              确认分配
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default BatchActionsBar;
