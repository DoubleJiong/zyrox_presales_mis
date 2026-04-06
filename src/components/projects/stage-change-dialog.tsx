'use client';

import { useState } from 'react';
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
  ProjectStatus, 
  ProjectStage,
  PROJECT_STAGE_CONFIG 
} from '@/lib/utils/status-transitions';
import { validateStageTransition } from '@/lib/utils/stage-transitions';
import { getStageBgColor, getStageLabel } from '@/lib/utils/project-colors';
import { apiClient } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { AlertTriangle } from 'lucide-react';

interface StageChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: number;
  oldStage: ProjectStage;
  newStage: ProjectStage;
  currentStatus: ProjectStatus;
  onSuccess: () => void;
  onClose: () => void;
}

export function StageChangeDialog({
  open,
  onOpenChange,
  projectId,
  oldStage,
  newStage,
  currentStatus,
  onSuccess,
  onClose,
}: StageChangeDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const validation = validateStageTransition(oldStage, newStage, currentStatus);
  const oldStageConfig = PROJECT_STAGE_CONFIG[oldStage];
  const newStageConfig = PROJECT_STAGE_CONFIG[newStage];
  
  const handleSubmit = async () => {
    if (!validation.valid) {
      toast({
        title: '无法变更阶段',
        description: validation.reason,
        variant: 'destructive',
      });
      return;
    }
    
    setLoading(true);
    try {
      await apiClient.post(`/api/projects/${projectId}/stage`, {
        stage: newStage,
        confirmed: Boolean(validation.warning),
      });
      
      toast({
        title: '阶段已更新',
        description: `项目阶段已从「${getStageLabel(oldStage)}」切换为「${getStageLabel(newStage)}」`,
      });
      
      onSuccess();
    } catch (error) {
      console.error('Failed to update stage:', error);
      toast({
        title: '更新失败',
        description: '无法更新项目阶段，请稍后重试',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {validation.warning ? (
              <span className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                确认切换项目阶段
              </span>
            ) : (
              '确认切换项目阶段'
            )}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                您确定要将项目阶段从
                <span className={cn('mx-1 px-2 py-0.5 rounded text-sm font-medium', getStageBgColor(oldStage))}>
                  {oldStageConfig.label}
                </span>
                切换为
                <span className={cn('mx-1 px-2 py-0.5 rounded text-sm font-medium', getStageBgColor(newStage))}>
                  {newStageConfig.label}
                </span>
                吗？
              </p>
              
              {/* 阶段描述 */}
              <p className="text-sm text-muted-foreground">
                {newStageConfig.description}
              </p>
              
              {/* 警告信息 */}
              {validation.warning && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>{validation.warning}</span>
                  </div>
                </div>
              )}
              
              {/* 错误信息 */}
              {validation.reason && !validation.valid && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {validation.reason}
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading} onClick={handleClose}>
            取消
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleSubmit} 
            disabled={loading || !validation.valid}
            className={cn(
              validation.warning && 'bg-amber-600 hover:bg-amber-700'
            )}
          >
            {loading ? '切换中...' : '确认切换'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
