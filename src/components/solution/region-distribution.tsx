/**
 * 区域分布组件
 * 
 * 功能：
 * - 可视化展示方案在各区域的使用情况
 * - 柱状图展示各区域项目数量和中标率
 * - 支持排序和筛选
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  MapPin,
  TrendingUp,
  TrendingDown,
  BarChart3,
  ArrowUpDown,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

interface RegionData {
  region: string;
  count: number;
  wonRate: number;
  wonCount?: number;
  totalAmount?: number;
}

interface RegionDistributionProps {
  solutionId: number;
  data?: RegionData[];
}

// 排序选项
type SortOption = 'count' | 'wonRate' | 'amount';
const sortOptions: { value: SortOption; label: string }[] = [
  { value: 'count', label: '项目数量' },
  { value: 'wonRate', label: '中标率' },
  { value: 'amount', label: '合同金额' },
];

// 颜色配置
const getWonRateColor = (rate: number) => {
  if (rate >= 70) return { bg: 'bg-green-500', text: 'text-green-600' };
  if (rate >= 50) return { bg: 'bg-blue-500', text: 'text-blue-600' };
  if (rate >= 30) return { bg: 'bg-yellow-500', text: 'text-yellow-600' };
  return { bg: 'bg-red-500', text: 'text-red-600' };
};

export function RegionDistribution({ solutionId, data: propData }: RegionDistributionProps) {
  const [data, setData] = useState<RegionData[]>(propData || []);
  const [loading, setLoading] = useState(!propData);
  const [sortBy, setSortBy] = useState<SortOption>('count');
  const [maxCount, setMaxCount] = useState(1);

  useEffect(() => {
    if (!propData) {
      fetchData();
    }
  }, [solutionId]);

  useEffect(() => {
    if (data.length > 0) {
      const max = Math.max(...data.map(d => d.count));
      setMaxCount(max || 1);
    }
  }, [data]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/solutions/${solutionId}/statistics/summary`);
      
      if (response.ok) {
        const result = await response.json();
        const regionStats = result?.regionStats || result?.data?.regionStats;
        if (regionStats?.topRegions) {
          setData(regionStats.topRegions);
        }
      }
    } catch (error) {
      console.error('Failed to fetch region data:', error);
    } finally {
      setLoading(false);
    }
  };

  // 排序数据
  const sortedData = [...data].sort((a, b) => {
    switch (sortBy) {
      case 'wonRate':
        return b.wonRate - a.wonRate;
      case 'amount':
        return (b.totalAmount || 0) - (a.totalAmount || 0);
      default:
        return b.count - a.count;
    }
  });

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            区域分布
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">加载中...</div>
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            区域分布
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            暂无区域数据
          </div>
        </CardContent>
      </Card>
    );
  }

  // 计算汇总
  const totalProjects = data.reduce((sum, d) => sum + d.count, 0);
  const avgWonRate = data.reduce((sum, d) => sum + d.wonRate, 0) / data.length;
  const topRegion = sortedData[0];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              区域分布
            </CardTitle>
            <CardDescription>
              共 {data.length} 个区域，{totalProjects} 个项目
            </CardDescription>
          </div>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {/* 汇总统计 */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center p-3 bg-muted rounded-lg">
            <div className="text-2xl font-bold">{totalProjects}</div>
            <div className="text-xs text-muted-foreground">总项目数</div>
          </div>
          <div className="text-center p-3 bg-muted rounded-lg">
            <div className="text-2xl font-bold">{avgWonRate.toFixed(1)}%</div>
            <div className="text-xs text-muted-foreground">平均中标率</div>
          </div>
          <div className="text-center p-3 bg-muted rounded-lg">
            <div className="text-lg font-bold truncate">{topRegion?.region}</div>
            <div className="text-xs text-muted-foreground">最佳区域</div>
          </div>
        </div>

        {/* 区域柱状图 */}
        <div className="space-y-3">
          {sortedData.map((region, index) => {
            const colorStyle = getWonRateColor(region.wonRate);
            const barWidth = (region.count / maxCount) * 100;

            return (
              <div key={region.region} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="w-6 justify-center">
                      {index + 1}
                    </Badge>
                    <span className="font-medium">{region.region}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground">{region.count} 个</span>
                    <span className={`font-bold ${colorStyle.text}`}>
                      {region.wonRate.toFixed(0)}%
                    </span>
                  </div>
                </div>
                
                {/* 双重进度条：项目数量 + 中标率 */}
                <div className="flex items-center gap-2 h-6">
                  {/* 项目数量条 */}
                  <div className="flex-1 h-full bg-muted rounded overflow-hidden">
                    <div
                      className="h-full bg-primary/60 transition-all duration-500"
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                  
                  {/* 中标率指示器 */}
                  <div className={`w-2 h-full ${colorStyle.bg} rounded`} />
                </div>
              </div>
            );
          })}
        </div>

        {/* 图例 */}
        <div className="flex items-center justify-center gap-6 mt-6 pt-4 border-t text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-primary/60 rounded" />
            <span className="text-muted-foreground">项目数量</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span className="text-muted-foreground">中标率 {'>'}70%</span>
          </div>
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-red-500" />
            <span className="text-muted-foreground">中标率 {'<'}30%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
