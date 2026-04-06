/**
 * 方案统计信息组件
 * 
 * 功能：
 * - 方案评分展示
 * - 评分趋势图
 * - 项目关联统计
 * - 使用情况统计
 * - 区域分布
 * - 用户排行
 */

'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  BarChart3,
  TrendingUp,
  Users,
  MapPin,
  Briefcase,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { ScoreCard } from './score-card';
import { TrendChart } from './trend-chart';
import { RegionDistribution } from './region-distribution';

interface StatsSummary {
  projectStats: {
    totalCount: number;
    wonCount: number;
    lostCount: number;
    pendingCount: number;
    totalEstimatedAmount: number;
    totalContractAmount: number;
    wonRate: number;
  };
  usageStats: {
    uniqueUserCount: number;
    topUsers: Array<{ userId: number; name: string; count: number }>;
    templateUsageCount: number;
  };
  regionStats: {
    topRegions: Array<{ region: string; count: number; wonRate: number }>;
    allRegions: Record<string, number>;
  };
  reviewStats: {
    totalCount: number;
    approvedCount: number;
    rejectedCount: number;
    avgScore: number;
  };
  recentProjects: Array<{
    projectId: number;
    projectName: string;
    status: string;
    bidResult: string | null;
    estimatedAmount: string | null;
  }>;
}

interface SolutionStatsTabProps {
  solutionId: number;
}

export function SolutionStatsTab({ solutionId }: SolutionStatsTabProps) {
  const [stats, setStats] = useState<StatsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [solutionId]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/solutions/${solutionId}/statistics/summary`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">加载统计数据...</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">暂无统计数据</div>
      </div>
    );
  }

  const formatAmount = (amount: number) => {
    if (amount >= 10000) {
      return `${(amount / 10000).toFixed(2)}万`;
    }
    return amount.toFixed(2);
  };

  return (
    <div className="space-y-6">
      {/* 方案评分 */}
      <ScoreCard solutionId={solutionId} />

      {/* 评分趋势图 */}
      <TrendChart solutionId={solutionId} limit={30} />

      {/* 项目统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">关联项目</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.projectStats.totalCount}</div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              <CheckCircle2 className="h-3 w-3 text-green-500 mr-1" />
              中标 {stats.projectStats.wonCount}
              <XCircle className="h-3 w-3 text-red-500 ml-2 mr-1" />
              失标 {stats.projectStats.lostCount}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">中标率</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.projectStats.wonRate.toFixed(1)}%
            </div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              {stats.projectStats.wonRate >= 50 ? (
                <ArrowUpRight className="h-3 w-3 text-green-500 mr-1" />
              ) : (
                <ArrowDownRight className="h-3 w-3 text-red-500 mr-1" />
              )}
              已决项目 {stats.projectStats.wonCount + stats.projectStats.lostCount} 个
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">预估金额</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ¥{formatAmount(stats.projectStats.totalEstimatedAmount)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              合同金额 ¥{formatAmount(stats.projectStats.totalContractAmount)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">使用用户</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.usageStats.uniqueUserCount}</div>
            <div className="text-xs text-muted-foreground mt-1">
              模板引用 {stats.usageStats.templateUsageCount} 次
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 详细统计 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 区域分布 */}
        <RegionDistribution solutionId={solutionId} data={stats.regionStats.topRegions} />

        {/* 用户排行 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              用户排行
            </CardTitle>
            <CardDescription>使用该方案最多的用户</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.usageStats.topUsers.length > 0 ? (
              <div className="space-y-3">
                {stats.usageStats.topUsers.slice(0, 5).map((user, index) => (
                  <div key={user.userId} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="w-6 justify-center">
                        {index + 1}
                      </Badge>
                      <span>{user.name}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {user.count} 次使用
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                暂无用户数据
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 最近关联项目 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            最近关联项目
          </CardTitle>
          <CardDescription>最近使用该方案的项目</CardDescription>
        </CardHeader>
        <CardContent>
          {stats.recentProjects.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>项目名称</TableHead>
                  <TableHead>阶段</TableHead>
                  <TableHead>结果</TableHead>
                  <TableHead className="text-right">预估金额</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.recentProjects.map((project) => (
                  <TableRow key={project.projectId}>
                    <TableCell className="font-medium">
                      <a 
                        href={`/projects/${project.projectId}`}
                        className="hover:text-primary"
                      >
                        {project.projectName}
                      </a>
                    </TableCell>
                    <TableCell>{project.status}</TableCell>
                    <TableCell>
                      {project.bidResult === 'won' && (
                        <Badge className="bg-green-100 text-green-800">中标</Badge>
                      )}
                      {project.bidResult === 'lost' && (
                        <Badge className="bg-red-100 text-red-800">失标</Badge>
                      )}
                      {!project.bidResult && (
                        <Badge variant="secondary">进行中</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {project.estimatedAmount 
                        ? `¥${formatAmount(parseFloat(project.estimatedAmount))}`
                        : '-'
                      }
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              暂无关联项目
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
