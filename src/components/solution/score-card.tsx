/**
 * 方案评分卡片组件
 * 
 * 功能：
 * - 展示四维评分（质量分、商业价值分、用户认可分、活跃度分）
 * - 综合评分展示
 * - 评分趋势指示
 */

'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Trophy,
  Star,
  TrendingUp,
  TrendingDown,
  Minus,
  Zap,
  Users,
  Target,
  Activity,
} from 'lucide-react';
import { ScoreRadar } from './score-radar';

interface ScoreData {
  solutionId: number;
  totalScore: string;
  qualityScore: string;
  businessValueScore: string;
  userRecognitionScore: string;
  activityScore: string;
  calculatedAt: string;
}

interface ScoreCardProps {
  solutionId: number;
  showRadar?: boolean;
}

// 评分维度配置
const scoreDimensions = [
  {
    key: 'qualityScore',
    label: '质量分',
    icon: Star,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-50',
    description: '基于评审结果',
    weight: 30,
  },
  {
    key: 'businessValueScore',
    label: '商业价值分',
    icon: Target,
    color: 'text-green-500',
    bgColor: 'bg-green-50',
    description: '基于项目中标',
    weight: 35,
  },
  {
    key: 'userRecognitionScore',
    label: '用户认可分',
    icon: Users,
    color: 'text-blue-500',
    bgColor: 'bg-blue-50',
    description: '基于浏览下载',
    weight: 20,
  },
  {
    key: 'activityScore',
    label: '活跃度分',
    icon: Activity,
    color: 'text-purple-500',
    bgColor: 'bg-purple-50',
    description: '基于更新频率',
    weight: 15,
  },
];

// 获取评分等级
const getScoreLevel = (score: number): { label: string; color: string; icon: any } => {
  if (score >= 90) return { label: '优秀', color: 'text-green-600', icon: Trophy };
  if (score >= 75) return { label: '良好', color: 'text-blue-600', icon: Star };
  if (score >= 60) return { label: '合格', color: 'text-yellow-600', icon: Zap };
  return { label: '待提升', color: 'text-gray-500', icon: Minus };
};

// 获取分数颜色
const getScoreColor = (score: number): string => {
  if (score >= 80) return 'bg-green-500';
  if (score >= 60) return 'bg-yellow-500';
  return 'bg-gray-400';
};

export function ScoreCard({ solutionId, showRadar = true }: ScoreCardProps) {
  const [score, setScore] = useState<ScoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchScore();
  }, [solutionId]);

  const fetchScore = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/solutions/${solutionId}/score`);
      
      if (response.ok) {
        const data = await response.json();
        setScore(data.data || data);
      } else {
        const err = await response.json();
        setError(err.error || '获取评分失败');
      }
    } catch (err) {
      console.error('Failed to fetch score:', err);
      setError('获取评分失败');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !score) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            方案评分
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <p>{error || '暂无评分数据'}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalScoreNum = parseFloat(score.totalScore);
  const scoreLevel = getScoreLevel(totalScoreNum);
  const LevelIcon = scoreLevel.icon;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              方案评分
            </CardTitle>
            <CardDescription>
              计算时间: {new Date(score.calculatedAt).toLocaleString('zh-CN')}
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{totalScoreNum.toFixed(1)}</div>
            <Badge variant="outline" className={`${scoreLevel.color} border-current`}>
              <LevelIcon className="h-3 w-3 mr-1" />
              {scoreLevel.label}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 雷达图 */}
          {showRadar && (
            <div className="flex items-center justify-center">
              <ScoreRadar
                qualityScore={parseFloat(score.qualityScore)}
                businessValueScore={parseFloat(score.businessValueScore)}
                userRecognitionScore={parseFloat(score.userRecognitionScore)}
                activityScore={parseFloat(score.activityScore)}
                size={200}
              />
            </div>
          )}

          {/* 维度详情 */}
          <div className="space-y-4">
            {scoreDimensions.map((dim) => {
              const Icon = dim.icon;
              const dimScore = parseFloat(score[dim.key as keyof ScoreData] as string);
              const dimPercent = (dimScore / 100) * 100;

              return (
                <div key={dim.key} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className={`p-1 rounded ${dim.bgColor}`}>
                        <Icon className={`h-3.5 w-3.5 ${dim.color}`} />
                      </div>
                      <span className="font-medium">{dim.label}</span>
                      <span className="text-xs text-muted-foreground">
                        ({dim.weight}%)
                      </span>
                    </div>
                    <span className={`font-bold ${dim.color}`}>
                      {dimScore.toFixed(1)}
                    </span>
                  </div>
                  <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`absolute inset-y-0 left-0 ${getScoreColor(dimScore)} rounded-full transition-all duration-500`}
                      style={{ width: `${dimPercent}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">{dim.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* 评分说明 */}
        <div className="mt-6 pt-4 border-t text-sm text-muted-foreground">
          <p>
            综合评分 = 质量分×30% + 商业价值分×35% + 用户认可分×20% + 活跃度分×15%
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
