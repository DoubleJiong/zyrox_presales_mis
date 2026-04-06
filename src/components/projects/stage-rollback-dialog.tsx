'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  ProjectStage,
} from '@/lib/utils/status-transitions';
import { 
  getRollbackReasonOptions, 
  STAGE_ROLLBACK_RULES,
} from '@/lib/utils/stage-transitions';
import { getStageBgColor, getStageLabel } from '@/lib/utils/project-colors';
import { apiClient } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { AlertTriangle, RotateCcw, Info } from 'lucide-react';

interface StageRollbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: number;
  currentStage: ProjectStage;
  currentStatus: string;
  preselectedTargetStage?: ProjectStage | null; // 预选的目标阶段（通过下拉框选择时）
  onSuccess: () => void;
  onClose: () => void;
}

export function StageRollbackDialog({
  open,
  onOpenChange,
  projectId,
  currentStage,
  currentStatus,
  preselectedTargetStage,
  onSuccess,
  onClose,
}: StageRollbackDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fetchingOptions, setFetchingOptions] = useState(true);
  const [targetStage, setTargetStage] = useState<ProjectStage | null>(null);
  const [reason, setReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [rollbackInfo, setRollbackInfo] = useState<{
    canRollback: boolean;
    requiresReason: boolean;
    requiresApproval: boolean;
    preserveData: boolean;
    rollbackOptions: Array<{
      stage: ProjectStage;
      label: string;
      disabled: boolean;
      reason?: string;
      warning?: string;
    }>;
  } | null>(null);

  // 获取回退选项
  useEffect(() => {
    if (open) {
      fetchRollbackOptions();
    }
  }, [open, projectId]);

  const fetchRollbackOptions = async () => {
    setFetchingOptions(true);
    try {
      const { data: result } = await apiClient.get(`/api/projects/${projectId}/stage/rollback`);
      const data = (result as any).data || result;
      setRollbackInfo(data);
      
      // 如果有预选的目标阶段，优先使用
      if (preselectedTargetStage) {
        setTargetStage(preselectedTargetStage);
      } else {
        // 否则默认选择第一个可用的回退目标
        const firstAvailable = data.rollbackOptions?.find((opt: any) => !opt.disabled);
        if (firstAvailable) {
          setTargetStage(firstAvailable.stage);
        }
      }
    } catch (error) {
      console.error('Failed to fetch rollback options:', error);
      toast({
        title: '获取回退选项失败',
        description: '请稍后重试',
        variant: 'destructive',
      });
    } finally {
      setFetchingOptions(false);
    }
  };

  // 获取回退原因选项
  const reasonOptions = targetStage 
    ? getRollbackReasonOptions(currentStage, targetStage) 
    : [];

  const handleSubmit = async () => {
    // 验证
    if (!targetStage) {
      toast({
        title: '请选择目标阶段',
        description: '请选择要回退到的阶段',
        variant: 'destructive',
      });
      return;
    }

    const finalReason = reason === '其他原因' ? customReason : reason;
    if (rollbackInfo?.requiresReason && !finalReason) {
      toast({
        title: '请填写回退原因',
        description: '回退操作需要说明原因',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { data: result } = await apiClient.post(`/api/projects/${projectId}/stage/rollback`, {
        targetStage,
        reason: finalReason,
      });

      const data = (result as any).data || result;

      toast({
        title: '阶段回退成功',
        description: data.message || `项目已回退到「${getStageLabel(targetStage)}」`,
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Failed to rollback stage:', error);
      toast({
        title: '回退失败',
        description: error.message || '请稍后重试',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setReason('');
    setCustomReason('');
    setTargetStage(null);
    onClose();
    onOpenChange(false);
  };

  // 获取当前阶段的回退规则
  const rule = STAGE_ROLLBACK_RULES[currentStage];

  if (fetchingOptions) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // 没有可回退选项
  if (rollbackInfo && !rollbackInfo.canRollback) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              无法执行回退
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground">
              当前阶段「{getStageLabel(currentStage)}」不支持回退操作。
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              如需调整项目状态，请联系管理员处理。
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  const selectedOption = rollbackInfo?.rollbackOptions.find(opt => opt.stage === targetStage);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-primary" />
            阶段回退
          </DialogTitle>
          <DialogDescription>
            将项目从当前阶段回退到之前的阶段
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 当前阶段显示 */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">当前阶段：</span>
            <span className={cn('px-2 py-0.5 rounded font-medium', getStageBgColor(currentStage))}>
              {getStageLabel(currentStage)}
            </span>
            <span className="text-muted-foreground mx-2">→</span>
          </div>

          {/* 目标阶段选择 */}
          <div className="space-y-2">
            <Label>回退到阶段 <span className="text-red-500">*</span></Label>
            <Select 
              value={targetStage || ''} 
              onValueChange={(value) => setTargetStage(value as ProjectStage)}
            >
              <SelectTrigger>
                <SelectValue placeholder="选择目标阶段" />
              </SelectTrigger>
              <SelectContent>
                {rollbackInfo?.rollbackOptions.map((option) => (
                  <SelectItem 
                    key={option.stage} 
                    value={option.stage}
                    disabled={option.disabled}
                  >
                    <span className={cn(
                      'px-2 py-0.5 rounded mr-2',
                      getStageBgColor(option.stage)
                    )}>
                      {option.label}
                    </span>
                    {option.disabled && option.reason && (
                      <span className="text-muted-foreground text-xs">
                        ({option.reason})
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 回退原因 */}
          <div className="space-y-2">
            <Label>
              回退原因 
              {rollbackInfo?.requiresReason && <span className="text-red-500">*</span>}
            </Label>
            <Select 
              value={reason} 
              onValueChange={setReason}
              disabled={!targetStage}
            >
              <SelectTrigger>
                <SelectValue placeholder="选择回退原因" />
              </SelectTrigger>
              <SelectContent>
                {reasonOptions.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* 自定义原因输入 */}
            {reason === '其他原因' && (
              <Textarea
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="请详细说明回退原因..."
                rows={3}
                className="mt-2"
              />
            )}
          </div>

          {/* 警告信息 */}
          {selectedOption?.warning && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{selectedOption.warning}</span>
              </div>
            </div>
          )}

          {/* 数据保留提示 */}
          {rollbackInfo?.preserveData && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>回退后，当前阶段的数据将被保留，再次进入时可复用。</span>
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            回退后系统会按目标阶段自动同步兼容状态，不再需要人工选择。
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            取消
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={loading || !targetStage}
            variant="secondary"
          >
            {loading ? '处理中...' : '确认回退'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
