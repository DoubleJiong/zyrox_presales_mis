'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import {
  MoreHorizontal,
  Trash2,
  Edit,
  UserPlus,
  Download,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useBatchSelection,
  useBatchOperation,
  type BatchAction,
} from '@/hooks/use-batch-selection';

// 批量操作工具栏属性
export interface BatchToolbarProps<T extends Record<string, any>> {
  items: T[];
  idKey?: string;
  actions: BatchAction<T>[];
  onSelectionChange?: (selectedItems: T[]) => void;
  children?: React.ReactNode;
  className?: string;
  selectAllLabel?: string;
  selectedLabel?: string;
  maxSelections?: number;
}

export function BatchToolbar<T extends Record<string, any>>({
  items,
  idKey = 'id',
  actions,
  onSelectionChange,
  children,
  className,
  selectAllLabel = '全选',
  selectedLabel = '已选择',
  maxSelections = Infinity,
}: BatchToolbarProps<T>) {
  const {
    selectedItems,
    selectedCount,
    isAllCurrentPageSelected,
    isPartialSelected,
    toggleAllCurrentPage,
    clearSelection,
    isSelected,
    toggleItem,
  } = useBatchSelection(items, {
    idKey,
    maxSelections,
    onSelectionChange,
  });

  const operation = useBatchOperation();
  const [confirmDialog, setConfirmDialog] = React.useState<{
    open: boolean;
    action: BatchAction<T> | null;
  }>({ open: false, action: null });

  // 执行批量操作
  const executeAction = async (action: BatchAction<T>) => {
    // 检查是否需要确认
    if (action.confirmMessage) {
      setConfirmDialog({ open: true, action });
      return;
    }

    await performAction(action);
  };

  // 执行确认后的操作
  const performAction = async (action: BatchAction<T>) => {
    try {
      operation.startOperation(action.label, selectedItems.length);
      await action.onClick(selectedItems);
      operation.completeOperation();
      clearSelection();
      setConfirmDialog({ open: false, action: null });
    } catch (error) {
      operation.setError(action.errorMessage || '操作失败');
    }
  };

  // 确认对话框的确认处理
  const handleConfirm = async () => {
    if (confirmDialog.action) {
      await performAction(confirmDialog.action);
    }
  };

  // 获取确认消息
  const getConfirmMessage = () => {
    if (!confirmDialog.action) return '';
    const { confirmMessage } = confirmDialog.action;
    if (typeof confirmMessage === 'function') {
      return confirmMessage(selectedItems);
    }
    return confirmMessage || `确定要执行此操作吗？`;
  };

  // 是否有选中项
  const hasSelection = selectedCount > 0;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* 全选复选框 */}
      <div className="flex items-center gap-2">
        <Checkbox
          checked={isAllCurrentPageSelected}
          ref={(ref) => {
            if (ref) {
              (ref as any).indeterminate = isPartialSelected;
            }
          }}
          onCheckedChange={toggleAllCurrentPage}
          aria-label={selectAllLabel}
        />
        <span className="text-sm text-muted-foreground">{selectAllLabel}</span>
      </div>

      {/* 选中数量提示 */}
      {hasSelection && (
        <Badge variant="secondary" className="gap-1">
          <CheckCircle2 className="h-3 w-3" />
          {selectedLabel} {selectedCount} 项
          <X
            className="h-3 w-3 cursor-pointer ml-1"
            onClick={clearSelection}
          />
        </Badge>
      )}

      {/* 自定义内容 */}
      {children}

      {/* 批量操作按钮 */}
      {hasSelection && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              批量操作
              <MoreHorizontal className="ml-1 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {actions.map((action, index) => {
              const isDisabled =
                typeof action.disabled === 'function'
                  ? action.disabled(selectedItems)
                  : action.disabled;

              return (
                <React.Fragment key={action.type}>
                  {index > 0 && <DropdownMenuSeparator />}
                  <DropdownMenuItem
                    disabled={isDisabled}
                    onClick={() => executeAction(action)}
                    className={cn(
                      action.variant === 'destructive' && 'text-destructive focus:text-destructive'
                    )}
                  >
                    {action.icon}
                    <span className="ml-2">{action.label}</span>
                  </DropdownMenuItem>
                </React.Fragment>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* 进度对话框 */}
      <Dialog open={operation.isProcessing}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>正在执行批量操作</DialogTitle>
            <DialogDescription>
              {operation.currentAction} ({operation.progress}/{operation.total})
            </DialogDescription>
          </DialogHeader>
          <Progress
            value={(operation.progress / operation.total) * 100}
            className="w-full"
          />
        </DialogContent>
      </Dialog>

      {/* 错误提示对话框 */}
      <Dialog open={!!operation.error}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              操作失败
            </DialogTitle>
            <DialogDescription>{operation.error}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={operation.resetOperation}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 确认对话框 */}
      <AlertDialog open={confirmDialog.open}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认操作</AlertDialogTitle>
            <AlertDialogDescription>{getConfirmMessage()}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => setConfirmDialog({ open: false, action: null })}
            >
              取消
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              className={cn(
                confirmDialog.action?.variant === 'destructive' &&
                  'bg-destructive text-destructive-foreground hover:bg-destructive/90'
              )}
              disabled={operation.isProcessing}
            >
              {operation.isProcessing && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              确认
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// 单项选择复选框属性
interface SelectionCheckboxProps<T extends Record<string, any>> {
  item: T;
  isSelected: boolean;
  onToggle: (item: T) => void;
  disabled?: boolean;
}

export function SelectionCheckbox<T extends Record<string, any>>({
  item,
  isSelected,
  onToggle,
  disabled,
}: SelectionCheckboxProps<T>) {
  return (
    <Checkbox
      checked={isSelected}
      onCheckedChange={() => onToggle(item)}
      disabled={disabled}
      aria-label={`选择第${item.id}项`}
      onClick={(e) => e.stopPropagation()}
    />
  );
}

// 预设的批量操作工厂函数
export function createDefaultBatchActions<T>(): Record<string, BatchAction<T>> {
  return {
    delete: {
      type: 'delete',
      label: '批量删除',
      icon: <Trash2 className="h-4 w-4" />,
      variant: 'destructive',
      confirmMessage: (items: T[]) =>
        `确定要删除选中的 ${items.length} 项吗？此操作不可恢复。`,
      onClick: async () => {},
    },
    edit: {
      type: 'status',
      label: '批量编辑',
      icon: <Edit className="h-4 w-4" />,
      onClick: async () => {},
    },
    assign: {
      type: 'assign',
      label: '批量分配',
      icon: <UserPlus className="h-4 w-4" />,
      onClick: async () => {},
    },
    export: {
      type: 'export',
      label: '批量导出',
      icon: <Download className="h-4 w-4" />,
      onClick: async () => {},
    },
  };
}
