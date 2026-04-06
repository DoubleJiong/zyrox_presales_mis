/**
 * 评审表单组件
 * 
 * 功能：
 * - 提供完整的评审表单
 * - 支持通过/拒绝/要求修订三种操作
 * - 多维度评分
 * - 评审意见输入
 */

'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  ThumbsUp,
  ThumbsDown,
  AlertCircle,
  Loader2,
  FileText,
} from 'lucide-react';
import {
  ReviewScoreInput,
  createDefaultCriteria,
  ReviewCriterion,
} from './review-score-input';

interface ReviewFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  solutionId: number;
  solutionName: string;
  reviewId?: number; // 如果是已存在的评审任务
  onSuccess: () => void;
}

type ReviewAction = 'approved' | 'rejected' | 'revision_required';

const actionConfig: Record<ReviewAction, {
  label: string;
  icon: any;
  variant: 'default' | 'destructive' | 'outline';
  color: string;
}> = {
  approved: {
    label: '通过',
    icon: ThumbsUp,
    variant: 'default',
    color: 'text-green-600',
  },
  rejected: {
    label: '拒绝',
    icon: ThumbsDown,
    variant: 'destructive',
    color: 'text-red-600',
  },
  revision_required: {
    label: '要求修订',
    icon: AlertCircle,
    variant: 'outline',
    color: 'text-orange-600',
  },
};

export function ReviewForm({
  open,
  onOpenChange,
  solutionId,
  solutionName,
  reviewId,
  onSuccess,
}: ReviewFormProps) {
  const { toast } = useToast();
  
  const [criteria, setCriteria] = useState<ReviewCriterion[]>(createDefaultCriteria());
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [selectedAction, setSelectedAction] = useState<ReviewAction | null>(null);

  // 重置表单
  useEffect(() => {
    if (open) {
      setCriteria(createDefaultCriteria());
      setComment('');
      setSelectedAction(null);
    }
  }, [open]);

  // 计算总分
  const calculateTotalScore = () => {
    const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);
    const weightedSum = criteria.reduce((sum, c) => sum + c.score * c.weight, 0);
    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  };

  // 提交评审
  const handleSubmit = async (action: ReviewAction) => {
    setSelectedAction(action);
    setSubmitting(true);

    try {
      const totalScore = calculateTotalScore();
      
      const url = reviewId
        ? `/api/solutions/${solutionId}/reviews/${reviewId}/submit`
        : `/api/solutions/${solutionId}/reviews`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewStatus: action,
          reviewScore: Math.round(totalScore),
          reviewComment: comment,
          reviewCriteria: criteria.map(c => ({
            criterion: c.code,
            score: c.score,
            comment: c.comment,
          })),
        }),
      });

      if (response.ok) {
        const config = actionConfig[action];
        toast({
          title: `评审${config.label}成功`,
          description: `方案"${solutionName}"的评审已完成`,
        });
        onOpenChange(false);
        onSuccess();
      } else {
        const error = await response.json();
        toast({
          title: '评审提交失败',
          description: error.error || '请稍后重试',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Failed to submit review:', error);
      toast({
        title: '评审提交失败',
        description: '网络错误，请稍后重试',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
      setSelectedAction(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            方案评审
          </DialogTitle>
          <DialogDescription>
            对方案"{solutionName}"进行评审
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 方案信息 */}
          <div className="p-4 bg-muted rounded-lg">
            <div className="font-medium">{solutionName}</div>
            <div className="text-sm text-muted-foreground">ID: {solutionId}</div>
          </div>

          {/* 多维度评分 */}
          <div className="space-y-2">
            <Label className="text-base font-semibold">维度评分</Label>
            <Separator />
            <ReviewScoreInput
              criteria={criteria}
              onChange={setCriteria}
              showComments={true}
            />
          </div>

          {/* 综合评审意见 */}
          <div className="space-y-2">
            <Label className="text-base font-semibold">综合评审意见</Label>
            <Separator />
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="请输入您的综合评审意见、建议或修改要求..."
              rows={4}
            />
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <div className="flex gap-2 w-full sm:w-auto">
            {Object.entries(actionConfig).map(([key, config]) => {
              const Icon = config.icon;
              const isSelected = selectedAction === key;
              
              return (
                <Button
                  key={key}
                  variant={config.variant}
                  className="flex-1 sm:flex-none"
                  onClick={() => handleSubmit(key as ReviewAction)}
                  disabled={submitting}
                >
                  {submitting && isSelected ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Icon className="h-4 w-4 mr-2" />
                  )}
                  {config.label}
                </Button>
              );
            })}
          </div>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            取消
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// 简化版：快速评审按钮组
interface QuickReviewButtonsProps {
  solutionId: number;
  solutionName: string;
  reviewId?: number;
  onReviewComplete: () => void;
}

export function QuickReviewButtons({
  solutionId,
  solutionName,
  reviewId,
  onReviewComplete,
}: QuickReviewButtonsProps) {
  const [showForm, setShowForm] = useState(false);

  return (
    <>
      <div className="flex gap-2">
        {Object.entries(actionConfig).slice(0, 2).map(([key, config]) => {
          const Icon = config.icon;
          return (
            <Button
              key={key}
              variant={config.variant}
              size="sm"
              onClick={() => setShowForm(true)}
            >
              <Icon className="h-4 w-4 mr-1" />
              {config.label}
            </Button>
          );
        })}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowForm(true)}
        >
          详细评审
        </Button>
      </div>

      <ReviewForm
        open={showForm}
        onOpenChange={setShowForm}
        solutionId={solutionId}
        solutionName={solutionName}
        reviewId={reviewId}
        onSuccess={onReviewComplete}
      />
    </>
  );
}
