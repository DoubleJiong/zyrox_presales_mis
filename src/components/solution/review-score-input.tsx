/**
 * 评审维度评分组件
 * 
 * 功能：
 * - 展示和输入各维度评分
 * - 支持滑块和星级两种模式
 * - 自动计算加权总分
 */

'use client';

import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Star,
  CheckCircle2,
  AlertTriangle,
  Info,
} from 'lucide-react';

// 评审维度定义
export interface ReviewCriterion {
  code: string;
  name: string;
  description: string;
  weight: number;
  score: number;
  comment?: string;
}

// 方案整体评审维度（默认）
export const DEFAULT_SOLUTION_CRITERIA: Omit<ReviewCriterion, 'score' | 'comment'>[] = [
  {
    code: 'completeness',
    name: '完整性',
    description: '方案内容是否完整全面，包含所有必要信息',
    weight: 15,
  },
  {
    code: 'feasibility',
    name: '可行性',
    description: '技术方案是否可行，实施计划是否合理',
    weight: 20,
  },
  {
    code: 'matching',
    name: '匹配度',
    description: '方案与客户需求的匹配程度',
    weight: 15,
  },
  {
    code: 'competitiveness',
    name: '竞争力',
    description: '方案相比竞争对手的优势和差异化',
    weight: 15,
  },
  {
    code: 'cost_benefit',
    name: '成本效益',
    description: '投入产出比是否合理，性价比如何',
    weight: 15,
  },
  {
    code: 'risk_control',
    name: '风险控制',
    description: '风险识别和应对措施是否充分',
    weight: 10,
  },
  {
    code: 'standardization',
    name: '规范性',
    description: '文档格式、表述是否规范专业',
    weight: 10,
  },
];

interface ReviewScoreInputProps {
  criteria: ReviewCriterion[];
  onChange: (criteria: ReviewCriterion[]) => void;
  readOnly?: boolean;
  showComments?: boolean;
}

// 获取评分等级样式
const getScoreStyle = (score: number) => {
  if (score >= 80) return { color: 'text-green-600', bg: 'bg-green-50', label: '优秀' };
  if (score >= 60) return { color: 'text-yellow-600', bg: 'bg-yellow-50', label: '合格' };
  if (score >= 40) return { color: 'text-orange-600', bg: 'bg-orange-50', label: '待改进' };
  return { color: 'text-red-600', bg: 'bg-red-50', label: '不合格' };
};

// 星级显示组件
function StarRating({ score, onChange, readOnly }: { 
  score: number; 
  onChange?: (score: number) => void;
  readOnly?: boolean;
}) {
  const stars = [1, 2, 3, 4, 5];
  
  return (
    <div className="flex items-center gap-1">
      {stars.map((star) => {
        const filled = star <= Math.round(score / 20);
        return (
          <button
            key={star}
            type="button"
            disabled={readOnly}
            onClick={() => onChange?.(star * 20)}
            className={`focus:outline-none ${readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-110'} transition-transform`}
          >
            <Star
              className={`h-5 w-5 ${
                filled 
                  ? 'fill-yellow-400 text-yellow-400' 
                  : 'text-gray-300'
              }`}
            />
          </button>
        );
      })}
    </div>
  );
}

export function ReviewScoreInput({
  criteria,
  onChange,
  readOnly = false,
  showComments = true,
}: ReviewScoreInputProps) {
  const [localCriteria, setLocalCriteria] = useState<ReviewCriterion[]>(criteria);

  useEffect(() => {
    setLocalCriteria(criteria);
  }, [criteria]);

  // 更新单个维度评分
  const handleScoreChange = (index: number, score: number) => {
    const updated = [...localCriteria];
    updated[index] = { ...updated[index], score };
    setLocalCriteria(updated);
    onChange(updated);
  };

  // 更新单个维度评语
  const handleCommentChange = (index: number, comment: string) => {
    const updated = [...localCriteria];
    updated[index] = { ...updated[index], comment };
    setLocalCriteria(updated);
    onChange(updated);
  };

  // 计算加权总分
  const calculateTotalScore = () => {
    const totalWeight = localCriteria.reduce((sum, c) => sum + c.weight, 0);
    const weightedSum = localCriteria.reduce(
      (sum, c) => sum + c.score * c.weight,
      0
    );
    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  };

  const totalScore = calculateTotalScore();
  const totalStyle = getScoreStyle(totalScore);

  return (
    <div className="space-y-6">
      {/* 各维度评分 */}
      {localCriteria.map((criterion, index) => {
        const style = getScoreStyle(criterion.score);
        
        return (
          <div key={criterion.code} className="space-y-2">
            {/* 维度标题 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Label className="font-medium">{criterion.name}</Label>
                <Badge variant="outline" className="text-xs">
                  权重 {criterion.weight}%
                </Badge>
                <div className="group relative">
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  <div className="absolute left-0 top-6 w-64 p-2 bg-popover border rounded-md shadow-lg text-xs text-muted-foreground hidden group-hover:block z-10">
                    {criterion.description}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <StarRating
                  score={criterion.score}
                  onChange={(score) => handleScoreChange(index, score)}
                  readOnly={readOnly}
                />
                <span className={`font-bold ${style.color} w-12 text-right`}>
                  {criterion.score}
                </span>
              </div>
            </div>

            {/* 滑块 */}
            {!readOnly && (
              <div className="flex items-center gap-4">
                <Slider
                  value={[criterion.score]}
                  onValueChange={([value]) => handleScoreChange(index, value)}
                  max={100}
                  step={5}
                  className="flex-1"
                />
              </div>
            )}

            {/* 评分进度条 */}
            <div className={`h-2 rounded-full ${style.bg} overflow-hidden`}>
              <div
                className={`h-full transition-all duration-300 ${getScoreStyle(criterion.score).color.replace('text-', 'bg-')}`}
                style={{ width: `${criterion.score}%` }}
              />
            </div>

            {/* 评语输入 */}
            {showComments && !readOnly && (
              <Textarea
                value={criterion.comment || ''}
                onChange={(e) => handleCommentChange(index, e.target.value)}
                placeholder={`对${criterion.name}的评审意见...`}
                rows={2}
                className="text-sm"
              />
            )}
            
            {/* 只读模式下显示评语 */}
            {showComments && readOnly && criterion.comment && (
              <div className="p-2 bg-muted rounded text-sm">
                {criterion.comment}
              </div>
            )}
          </div>
        );
      })}

      {/* 总分展示 */}
      <div className={`p-4 rounded-lg ${totalStyle.bg} border`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className={`h-5 w-5 ${totalStyle.color}`} />
            <span className="font-medium">综合评分</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-2xl font-bold ${totalStyle.color}`}>
              {totalScore.toFixed(1)}
            </span>
            <Badge className={`${totalStyle.color} bg-transparent border-current`}>
              {totalStyle.label}
            </Badge>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          加权计算：{localCriteria.map(c => `${c.name}(${c.score}×${c.weight}%)`).join(' + ')}
        </p>
      </div>
    </div>
  );
}

// 导出工厂函数：创建默认评审维度
export function createDefaultCriteria(): ReviewCriterion[] {
  return DEFAULT_SOLUTION_CRITERIA.map(c => ({
    ...c,
    score: 60,
    comment: '',
  }));
}
