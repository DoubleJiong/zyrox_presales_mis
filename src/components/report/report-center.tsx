'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Plus, 
  RefreshCw,
  Loader2,
  BarChart3,
  Calendar,
  Users,
  TrendingUp,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { ReportList } from './report-list';
import { ReportViewer } from './report-viewer';
import { extractErrorMessage } from '@/lib/api-response';

// 统计数据接口
interface Statistics {
  projects: {
    total: number;
    active: number;
    completed: number;
  };
  tasks: {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    overdue: number;
  };
  customers: {
    total: number;
    active: number;
    potential: number;
  };
  opportunities: {
    total: number;
    newThisMonth: number;
    totalAmount: string;
  };
}

// 周报接口
interface WeeklyReport {
  id: number;
  type: string;
  userId: number | null;
  userName: string | null;
  weekStart: string;
  weekEnd: string;
  content: any;
  generatedAt: string;
  sentAt: string | null;
  sent: boolean;
}

interface ReportCenterProps {
  className?: string;
}

export function ReportCenter({ className }: ReportCenterProps) {
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<WeeklyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showViewer, setShowViewer] = useState(false);

  // 加载数据
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // 并行加载统计数据和周报列表
      const [statsRes, reportsRes] = await Promise.all([
        fetch('/api/reports/statistics?type=overview'),
        fetch('/api/reports/weekly'),
      ]);

      const statsData = await statsRes.json();
      const reportsData = await reportsRes.json();

      if (statsData.success) {
        setStatistics(statsData.data);
      }

      if (reportsData.success) {
        setReports(reportsData.data.reports || []);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  // 生成周报
  const handleGenerateReport = async () => {
    setGenerating(true);
    try {
      const response = await fetch('/api/reports/weekly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'personal' }),
      });

      const result = await response.json();

      if (result.success) {
        setReports(prev => [result.data, ...prev]);
        setSelectedReport(result.data);
        setShowViewer(true);
      } else {
        alert(extractErrorMessage(result.error, '生成周报失败'));
      }
    } catch (error) {
      console.error('Failed to generate report:', error);
      alert('生成周报失败');
    } finally {
      setGenerating(false);
    }
  };

  // 查看周报
  const handleViewReport = async (report: WeeklyReport) => {
    try {
      const response = await fetch(`/api/reports/weekly/${report.id}`);
      const result = await response.json();

      if (result.success) {
        setSelectedReport(result.data);
        setShowViewer(true);
      }
    } catch (error) {
      console.error('Failed to fetch report:', error);
    }
  };

  // 删除周报
  const handleDeleteReport = async (reportId: number) => {
    if (!confirm('确定要删除此周报吗？')) return;

    try {
      const response = await fetch(`/api/reports/weekly/${reportId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        setReports(prev => prev.filter(r => r.id !== reportId));
      }
    } catch (error) {
      console.error('Failed to delete report:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">报表中心</h2>
          <p className="text-muted-foreground mt-1">
            查看统计数据、生成和管理周报
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={loadData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            刷新
          </Button>
          <Button onClick={handleGenerateReport} disabled={generating}>
            {generating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <Plus className="h-4 w-4 mr-2" />
            生成周报
          </Button>
        </div>
      </div>

      {/* 统计概览 */}
      {statistics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatsCard
            title="项目总数"
            value={statistics.projects.total}
            subtitle={`${statistics.projects.active} 个进行中`}
            icon={<BarChart3 className="h-5 w-5" />}
            color="primary"
          />
          <StatsCard
            title="任务统计"
            value={statistics.tasks.total}
            subtitle={`${statistics.tasks.overdue} 个逾期`}
            icon={<CheckCircle className="h-5 w-5" />}
            color={statistics.tasks.overdue > 0 ? 'warning' : 'success'}
          />
          <StatsCard
            title="客户总数"
            value={statistics.customers.total}
            subtitle={`${statistics.customers.potential} 个潜在客户`}
            icon={<Users className="h-5 w-5" />}
            color="primary"
          />
          <StatsCard
            title="商机数量"
            value={statistics.opportunities.total}
            subtitle={`本月新增 ${statistics.opportunities.newThisMonth}`}
            icon={<TrendingUp className="h-5 w-5" />}
            color="success"
          />
        </div>
      )}

      {/* 周报列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            周报记录
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ReportList
            reports={reports}
            onView={handleViewReport}
            onDelete={handleDeleteReport}
          />
        </CardContent>
      </Card>

      {/* 周报查看对话框 */}
      <Dialog open={showViewer} onOpenChange={setShowViewer}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>周报详情</DialogTitle>
            <DialogDescription>
              查看和编辑周报内容
            </DialogDescription>
          </DialogHeader>
          {selectedReport && (
            <ReportViewer
              report={selectedReport}
              onExport={() => {
                // TODO: 实现导出功能
                alert('导出功能开发中');
              }}
              onPrint={() => {
                window.print();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// 统计卡片组件
function StatsCard({
  title,
  value,
  subtitle,
  icon,
  color = 'primary',
}: {
  title: string;
  value: number;
  subtitle: string;
  icon: React.ReactNode;
  color?: 'primary' | 'success' | 'warning' | 'destructive';
}) {
  const colorClasses = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    destructive: 'bg-destructive/10 text-destructive',
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          </div>
          <div className={cn('p-2 rounded-lg', colorClasses[color])}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default ReportCenter;
