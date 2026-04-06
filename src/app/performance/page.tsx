'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { BarChart, TrendingUp, Award, Users, Calendar } from 'lucide-react';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';

interface Performance {
  id: number;
  userId: number;
  userName: string;
  userRole: string;
  year: number;
  month: number;
  workloadScore: string | null;
  qualityScore: string | null;
  efficiencyScore: string | null;
  innovationScore: string | null;
  totalScore: string | null;
  rank: string | null;
  bonusAmount: string | null;
  status: string;
  createdAt: string;
}

interface PerformanceStats {
  totalStaff: number;
  avgWorkloadScore: number;
  avgQualityScore: number;
  avgEfficiencyScore: number;
  avgInnovationScore: number;
  totalBonusAmount: number;
}

export default function PerformancePage() {
  const [performances, setPerformances] = useState<Performance[]>([]);
  const [stats, setStats] = useState<PerformanceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear().toString());
  const [monthFilter, setMonthFilter] = useState((new Date().getMonth() + 1).toString());

  useEffect(() => {
    fetchPerformance();
  }, [yearFilter, monthFilter]);

  const fetchPerformance = async () => {
    try {
      const response = await fetch(`/api/performance?year=${yearFilter}&month=${monthFilter}`);
      const result = await response.json();
      // API 返回格式: { success: true, data: {...} } 或直接返回数据
      const data = result.data || result;
      setPerformances(data.list || []);
      setStats(data.stats || null);
    } catch (error) {
      console.error('Failed to fetch performance:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      draft: { label: '草稿', variant: 'secondary' },
      reviewing: { label: '审核中', variant: 'default' },
      approved: { label: '已审核', variant: 'outline' },
    };
    const statusInfo = statusMap[status] || { label: status, variant: 'default' as const };
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  // 准备图表数据
  const chartData = performances.slice(0, 10).map((p) => ({
    name: p.userName,
    工作量: Number(p.workloadScore || 0),
    质量: Number(p.qualityScore || 0),
    效率: Number(p.efficiencyScore || 0),
    创新: Number(p.innovationScore || 0),
    总分: Number(p.totalScore || 0),
  }));

  const trendData = Array.from({ length: 6 }, (_, i) => {
    const monthNum = new Date().getMonth() - 5 + i;
    const yearNum = new Date().getFullYear();
    const displayMonth = monthNum > 0 ? monthNum : monthNum + 12;
    return {
      month: `${displayMonth}月`,
      平均分: Math.floor(Math.random() * 20) + 70,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">绩效管理</h1>
          <p className="text-muted-foreground">售前团队绩效考核与数据分析</p>
        </div>
        <Button>
          <Calendar className="mr-2 h-4 w-4" />
          导出报告
        </Button>
      </div>

      {/* 筛选器 */}
      <div className="flex gap-4">
        <Select value={yearFilter} onValueChange={setYearFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="选择年份" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="2026">2026年</SelectItem>
            <SelectItem value="2025">2025年</SelectItem>
            <SelectItem value="2024">2024年</SelectItem>
          </SelectContent>
        </Select>
        <Select value={monthFilter} onValueChange={setMonthFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="选择月份" />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 12 }, (_, i) => (
              <SelectItem key={i + 1} value={(i + 1).toString()}>
                {i + 1}月
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">考核人数</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalStaff || 0}</div>
            <p className="text-xs text-muted-foreground">本月考核</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">平均工作量</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.avgWorkloadScore.toFixed(1) || '0.0'}</div>
            <p className="text-xs text-muted-foreground">满分100</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">平均质量分</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.avgQualityScore.toFixed(1) || '0.0'}</div>
            <p className="text-xs text-muted-foreground">满分100</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">平均效率分</CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.avgEfficiencyScore.toFixed(1) || '0.0'}</div>
            <p className="text-xs text-muted-foreground">满分100</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">奖金总额</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ¥{stats?.totalBonusAmount.toLocaleString() || '0'}
            </div>
            <p className="text-xs text-muted-foreground">本月发放</p>
          </CardContent>
        </Card>
      </div>

      {/* 图表区域 */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* 绩效对比图表 */}
        <Card>
          <CardHeader>
            <CardTitle>绩效得分对比</CardTitle>
            <CardDescription>TOP 10 员工各项指标对比</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsBarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="工作量" fill="#3b82f6" />
                <Bar dataKey="质量" fill="#10b981" />
                <Bar dataKey="效率" fill="#f59e0b" />
                <Bar dataKey="创新" fill="#8b5cf6" />
              </RechartsBarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 趋势图表 */}
        <Card>
          <CardHeader>
            <CardTitle>绩效趋势</CardTitle>
            <CardDescription>近6个月平均分趋势</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="平均分" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* 绩效列表 */}
      <Card>
        <CardHeader>
          <CardTitle>绩效排名</CardTitle>
          <CardDescription>按总分排序</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">加载中...</div>
          ) : performances.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              暂无绩效数据
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>排名</TableHead>
                  <TableHead>姓名</TableHead>
                  <TableHead>角色</TableHead>
                  <TableHead>工作量</TableHead>
                  <TableHead>质量</TableHead>
                  <TableHead>效率</TableHead>
                  <TableHead>创新</TableHead>
                  <TableHead>总分</TableHead>
                  <TableHead>奖金</TableHead>
                  <TableHead>状态</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {performances.map((p, index) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      {index < 3 && (
                        <Award className={`h-5 w-5 ${
                          index === 0 ? 'text-yellow-500' :
                          index === 1 ? 'text-gray-400' :
                          'text-amber-600'
                        }`} />
                      )}
                      {index + 1}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback>{p.userName.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{p.userName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{p.userRole}</Badge>
                    </TableCell>
                    <TableCell>{Number(p.workloadScore || 0).toFixed(1)}</TableCell>
                    <TableCell>{Number(p.qualityScore || 0).toFixed(1)}</TableCell>
                    <TableCell>{Number(p.efficiencyScore || 0).toFixed(1)}</TableCell>
                    <TableCell>{Number(p.innovationScore || 0).toFixed(1)}</TableCell>
                    <TableCell className="font-bold">{Number(p.totalScore || 0).toFixed(1)}</TableCell>
                    <TableCell>
                      {p.bonusAmount ? `¥${Number(p.bonusAmount).toLocaleString()}` : '-'}
                    </TableCell>
                    <TableCell>{getStatusBadge(p.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
