'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import { 
  Trophy, 
  Target, 
  TrendingUp, 
  DollarSign,
  Calendar,
  Users,
  AlertCircle,
} from 'lucide-react';

// 统计数据类型
interface BiddingStatistics {
  summary: {
    totalBids: number;
    wonBids: number;
    lostBids: number;
    pendingBids: number;
    winRate: number;
    totalBidAmount: number;
    wonAmount: number;
    averageBidAmount: number;
  };
  biddingTypeStats: Record<string, { total: number; won: number; lost: number }>;
  competitorStats: Record<string, { wins: number; losses: number }>;
  loseReasonStats: Record<string, number>;
  monthlyTrend: Array<{ month: string; total: number; won: number; lost: number }>;
  managerStats: Record<string, { total: number; won: number; lost: number; amount: number }>;
  timeRange: {
    start: string;
    end: string;
    range: string;
  };
}

// 颜色配置
const COLORS = ['#22c55e', '#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899'];
const WIN_COLOR = '#22c55e';
const LOST_COLOR = '#ef4444';
const PENDING_COLOR = '#f59e0b';

export function BiddingAnalysis() {
  const [statistics, setStatistics] = useState<BiddingStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('year');

  useEffect(() => {
    fetchStatistics();
  }, [timeRange]);

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/biddings/statistics?range=${timeRange}`);
      const result = await response.json();
      if (result.success) {
        setStatistics(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  // 格式化金额
  const formatAmount = (amount: number) => {
    if (amount >= 10000) {
      return `${(amount / 10000).toFixed(1)}万`;
    }
    return amount.toFixed(0);
  };

  // 准备图表数据
  const prepareBiddingTypeData = () => {
    if (!statistics?.biddingTypeStats) return [];
    return Object.entries(statistics.biddingTypeStats).map(([type, stats]) => ({
      name: type === 'public' ? '公开招标' : type === 'private' ? '邀请招标' : type,
      中标: stats.won,
      落标: stats.lost,
      总计: stats.total,
    }));
  };

  const prepareCompetitorData = () => {
    if (!statistics?.competitorStats) return [];
    return Object.entries(statistics.competitorStats)
      .filter(([, stats]) => stats.wins > 0)
      .map(([name, stats]) => ({
        name,
        中标次数: stats.wins,
      }))
      .sort((a, b) => b.中标次数 - a.中标次数)
      .slice(0, 10);
  };

  const prepareLoseReasonData = () => {
    if (!statistics?.loseReasonStats) return [];
    return Object.entries(statistics.loseReasonStats)
      .map(([reason, count]) => ({
        name: reason.length > 10 ? reason.substring(0, 10) + '...' : reason,
        value: count,
      }))
      .sort((a, b) => b.value - a.value);
  };

  const prepareMonthlyTrendData = () => {
    if (!statistics?.monthlyTrend) return [];
    return statistics.monthlyTrend.map(item => ({
      ...item,
      month: item.month.substring(5), // 只显示月份
    }));
  };

  const prepareManagerData = () => {
    if (!statistics?.managerStats) return [];
    return Object.entries(statistics.managerStats)
      .map(([name, stats]) => ({
        name,
        中标: stats.won,
        落标: stats.lost,
        中标金额: stats.amount / 10000,
      }))
      .sort((a, b) => b.中标金额 - a.中标金额)
      .slice(0, 10);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!statistics) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          暂无投标数据
        </CardContent>
      </Card>
    );
  }

  const { summary } = statistics;

  return (
    <div className="space-y-6">
      {/* 时间范围选择 */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">投标分析</h2>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">本周</SelectItem>
            <SelectItem value="month">本月</SelectItem>
            <SelectItem value="quarter">本季度</SelectItem>
            <SelectItem value="year">本年度</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 概览卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">投标总数</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalBids}</div>
            <div className="flex gap-2 mt-2">
              <Badge variant="secondary">待定: {summary.pendingBids}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">中标率</CardTitle>
            <Trophy className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{summary.winRate}%</div>
            <Progress value={summary.winRate} className="mt-2" />
            <div className="text-xs text-muted-foreground mt-1">
              中标 {summary.wonBids} / 落标 {summary.lostBids}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">投标总额</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ¥{formatAmount(summary.totalBidAmount)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              平均 {formatAmount(summary.averageBidAmount)}/项
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">中标金额</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ¥{formatAmount(summary.wonAmount)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {summary.totalBidAmount > 0 
                ? `${((summary.wonAmount / summary.totalBidAmount) * 100).toFixed(1)}% 转化率`
                : '暂无数据'
              }
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 详细分析标签页 */}
      <Tabs defaultValue="trend" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trend">投标趋势</TabsTrigger>
          <TabsTrigger value="type">投标类型</TabsTrigger>
          <TabsTrigger value="competitor">竞争对手</TabsTrigger>
          <TabsTrigger value="manager">人员统计</TabsTrigger>
          <TabsTrigger value="reason">落标原因</TabsTrigger>
        </TabsList>

        {/* 投标趋势 */}
        <TabsContent value="trend">
          <Card>
            <CardHeader>
              <CardTitle>月度投标趋势</CardTitle>
              <CardDescription>按月份统计的投标数量和结果</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={prepareMonthlyTrendData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="total" 
                      name="投标总数" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="won" 
                      name="中标" 
                      stroke={WIN_COLOR} 
                      strokeWidth={2}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="lost" 
                      name="落标" 
                      stroke={LOST_COLOR} 
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 投标类型分析 */}
        <TabsContent value="type">
          <Card>
            <CardHeader>
              <CardTitle>投标类型分布</CardTitle>
              <CardDescription>按投标类型统计中标率</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={prepareBiddingTypeData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="中标" fill={WIN_COLOR} />
                    <Bar dataKey="落标" fill={LOST_COLOR} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 竞争对手分析 */}
        <TabsContent value="competitor">
          <Card>
            <CardHeader>
              <CardTitle>竞争对手中标统计</CardTitle>
              <CardDescription>竞争对手中标次数排名</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={prepareCompetitorData()} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={100} />
                    <Tooltip />
                    <Bar dataKey="中标次数" fill="#8b5cf6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 人员统计 */}
        <TabsContent value="manager">
          <Card>
            <CardHeader>
              <CardTitle>项目经理投标统计</CardTitle>
              <CardDescription>各项目经理的中标业绩</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={prepareManagerData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Bar yAxisId="left" dataKey="中标" name="中标数量" fill={WIN_COLOR} />
                    <Bar yAxisId="left" dataKey="落标" name="落标数量" fill={LOST_COLOR} />
                    <Bar yAxisId="right" dataKey="中标金额" name="中标金额(万)" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 落标原因分析 */}
        <TabsContent value="reason">
          <Card>
            <CardHeader>
              <CardTitle>落标原因分析</CardTitle>
              <CardDescription>统计落标的主要原因</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={prepareLoseReasonData()}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {prepareLoseReasonData().map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
