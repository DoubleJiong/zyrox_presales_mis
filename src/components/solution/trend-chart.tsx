/**
 * 评分趋势图组件
 * 
 * 功能：
 * - 展示评分历史趋势
 * - 支持选择时间范围
 * - 各维度评分变化曲线
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  TrendingUp,
  Calendar,
  LineChart,
  Loader2,
} from 'lucide-react';

interface ScoreHistory {
  id: number;
  solutionId: number;
  snapshotDate: string;
  snapshotType: string;
  qualityScore: string;
  businessValueScore: string;
  userRecognitionScore: string;
  activityScore: string;
  totalScore: string;
}

interface TrendChartProps {
  solutionId: number;
  limit?: number;
}

// 颜色配置
const dimensionColors = {
  totalScore: { color: '#3b82f6', label: '综合评分' },
  qualityScore: { color: '#eab308', label: '质量分' },
  businessValueScore: { color: '#22c55e', label: '商业价值分' },
  userRecognitionScore: { color: '#3b82f6', label: '用户认可分' },
  activityScore: { color: '#a855f7', label: '活跃度分' },
};

export function TrendChart({ solutionId, limit = 30 }: TrendChartProps) {
  const [history, setHistory] = useState<ScoreHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDimension, setSelectedDimension] = useState<keyof typeof dimensionColors>('totalScore');

  useEffect(() => {
    fetchHistory();
  }, [solutionId, limit]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/solutions/${solutionId}/score/history?limit=${limit}`);
      
      if (response.ok) {
        const data = await response.json();
        setHistory(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch score history:', error);
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
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            评分趋势
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            暂无历史评分数据
          </div>
        </CardContent>
      </Card>
    );
  }

  // 反转数组，使最新数据在右侧
  const sortedHistory = [...history].reverse();
  
  // 计算图表参数
  const chartWidth = 600;
  const chartHeight = 200;
  const padding = { top: 20, right: 20, bottom: 40, left: 40 };
  const graphWidth = chartWidth - padding.left - padding.right;
  const graphHeight = chartHeight - padding.top - padding.bottom;

  // 获取分数范围
  const scores = sortedHistory.map(h => parseFloat(h[selectedDimension]));
  const minScore = Math.max(0, Math.min(...scores) - 10);
  const maxScore = Math.min(100, Math.max(...scores) + 10);

  // 计算坐标
  const getX = (index: number) => padding.left + (index / (sortedHistory.length - 1 || 1)) * graphWidth;
  const getY = (score: number) => padding.top + (1 - (score - minScore) / (maxScore - minScore || 1)) * graphHeight;

  // 生成路径
  const generatePath = (dimension: keyof typeof dimensionColors) => {
    const values = sortedHistory.map(h => parseFloat(h[dimension]));
    return values
      .map((score, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(score)}`)
      .join(' ');
  };

  // 生成区域填充路径
  const generateAreaPath = (dimension: keyof typeof dimensionColors) => {
    const values = sortedHistory.map(h => parseFloat(h[dimension]));
    const linePath = values
      .map((score, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(score)}`)
      .join(' ');
    return `${linePath} L ${getX(values.length - 1)} ${chartHeight - padding.bottom} L ${padding.left} ${chartHeight - padding.bottom} Z`;
  };

  // 计算变化趋势
  const latestScore = parseFloat(sortedHistory[sortedHistory.length - 1][selectedDimension]);
  const previousScore = sortedHistory.length > 1 
    ? parseFloat(sortedHistory[sortedHistory.length - 2][selectedDimension]) 
    : latestScore;
  const change = latestScore - previousScore;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              评分趋势
            </CardTitle>
            <CardDescription>
              近 {history.length} 条记录
            </CardDescription>
          </div>
          <div className="flex gap-1">
            {Object.entries(dimensionColors).map(([key, config]) => (
              <Button
                key={key}
                variant={selectedDimension === key ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedDimension(key as keyof typeof dimensionColors)}
                className="text-xs"
              >
                {config.label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* 当前分数和变化 */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-3xl font-bold">{latestScore.toFixed(1)}</div>
            <div className="text-sm text-muted-foreground">
              {dimensionColors[selectedDimension].label}
            </div>
          </div>
          <div className="text-right">
            {change !== 0 && (
              <Badge
                variant="outline"
                className={change > 0 ? 'text-green-600 border-green-600' : 'text-red-600 border-red-600'}
              >
                {change > 0 ? '+' : ''}{change.toFixed(1)}
              </Badge>
            )}
            <div className="text-xs text-muted-foreground mt-1">
              较上次
            </div>
          </div>
        </div>

        {/* SVG 图表 */}
        <div className="overflow-x-auto">
          <svg width="100%" height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="xMidYMid meet">
            {/* 网格线 */}
            {[0, 25, 50, 75, 100].map((tick) => {
              const y = getY(Math.max(minScore, Math.min(maxScore, tick)));
              return (
                <g key={tick}>
                  <line
                    x1={padding.left}
                    y1={y}
                    x2={chartWidth - padding.right}
                    y2={y}
                    stroke="hsl(var(--muted))"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={padding.left - 8}
                    y={y}
                    textAnchor="end"
                    dominantBaseline="middle"
                    className="text-xs fill-muted-foreground"
                  >
                    {tick}
                  </text>
                </g>
              );
            })}

            {/* 区域填充 */}
            <path
              d={generateAreaPath(selectedDimension)}
              fill={dimensionColors[selectedDimension].color}
              fillOpacity="0.1"
            />

            {/* 折线 */}
            <path
              d={generatePath(selectedDimension)}
              fill="none"
              stroke={dimensionColors[selectedDimension].color}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* 数据点 */}
            {sortedHistory.map((h, i) => {
              const score = parseFloat(h[selectedDimension]);
              const x = getX(i);
              const y = getY(score);
              
              return (
                <g key={i}>
                  <circle
                    cx={x}
                    cy={y}
                    r="4"
                    fill={dimensionColors[selectedDimension].color}
                    stroke="hsl(var(--background))"
                    strokeWidth="2"
                  />
                  {/* 只显示首尾日期 */}
                  {(i === 0 || i === sortedHistory.length - 1) && (
                    <text
                      x={x}
                      y={chartHeight - padding.bottom + 20}
                      textAnchor="middle"
                      className="text-xs fill-muted-foreground"
                    >
                      {new Date(h.snapshotDate).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* 图例 */}
        <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t">
          <div className="flex items-center gap-2 text-sm">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: dimensionColors[selectedDimension].color }}
            />
            <span>{dimensionColors[selectedDimension].label}</span>
          </div>
          <div className="text-muted-foreground text-sm">
            {sortedHistory[0] && sortedHistory[sortedHistory.length - 1] && (
              <span>
                {new Date(sortedHistory[0].snapshotDate).toLocaleDateString('zh-CN')} 
                {' → '}
                {new Date(sortedHistory[sortedHistory.length - 1].snapshotDate).toLocaleDateString('zh-CN')}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
