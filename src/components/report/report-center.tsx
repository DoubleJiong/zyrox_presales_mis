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
import { ReportViewer, type WeeklyReportContent, type WeeklyReportDetail } from './report-viewer';
import { extractErrorMessage } from '@/lib/api-response';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { canViewGlobalDashboard } from '@/shared/policy/dashboard-policy';
import { UserSelect, type UserOption } from '@/components/ui/user-select';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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

interface ReportSummaryStats {
  reportCount: number;
  taskCompleted: number;
  newCustomers: number;
  opportunityCount: number;
}

// 周报接口
type WeeklyReport = WeeklyReportDetail;

interface ReportCenterProps {
  className?: string;
}

export function ReportCenter({ className }: ReportCenterProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [reportUsers, setReportUsers] = useState<UserOption[]>([]);
  const [reportUserSearch, setReportUserSearch] = useState('');
  const [selectedReportUserId, setSelectedReportUserId] = useState<number | null>(null);
  const [selectedReportYear, setSelectedReportYear] = useState<number | null>(null);
  const [selectedReportWeek, setSelectedReportWeek] = useState<number | null>(null);
  const [selectedReport, setSelectedReport] = useState<WeeklyReport | null>(null);
  const [draftContent, setDraftContent] = useState<WeeklyReportContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [savingReport, setSavingReport] = useState(false);
  const [editingReport, setEditingReport] = useState(false);
  const [showViewer, setShowViewer] = useState(false);
  const managementView = canViewGlobalDashboard(user);
  const hasReportFilters = Boolean(selectedReportUserId || selectedReportYear || selectedReportWeek);

  const canMutateReport = React.useCallback((report: WeeklyReport) => {
    return report.type !== 'personal' || report.userId === null || report.userId === user?.id;
  }, [user?.id]);

  const upsertReport = React.useCallback((nextReport: WeeklyReport) => {
    setReports((currentReports) => {
      const nextReports = currentReports.filter((report) => report.id !== nextReport.id);
      return [nextReport, ...nextReports];
    });
  }, []);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const reportsUrl = new URL('/api/reports/weekly', window.location.origin);
      if (selectedReportUserId) {
        reportsUrl.searchParams.set('userId', String(selectedReportUserId));
      }
      if (selectedReportYear) {
        reportsUrl.searchParams.set('year', String(selectedReportYear));
      }
      if (selectedReportWeek) {
        reportsUrl.searchParams.set('reportWeek', String(selectedReportWeek));
      }

      if (!hasReportFilters) {
        const statsRes = await fetch('/api/reports/statistics?type=overview');
        const statsData = await statsRes.json();

        if (statsData.success) {
          setStatistics(statsData.data);
        }
      }

      const reportsRes = await fetch(`${reportsUrl.pathname}${reportsUrl.search}`);
      const reportsData = await reportsRes.json();

      if (reportsData.success) {
        setReports(reportsData.data.reports || []);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }, [hasReportFilters, selectedReportUserId, selectedReportWeek, selectedReportYear]);

  const loadReportUsers = React.useCallback(async (keyword = '') => {
    if (!managementView) {
      return;
    }

    try {
      const usersUrl = new URL('/api/users', window.location.origin);
      if (keyword.trim()) {
        usersUrl.searchParams.set('keyword', keyword.trim());
      }

      const response = await fetch(`${usersUrl.pathname}${usersUrl.search}`);
      const result = await response.json();

      if (result.success) {
        setReportUsers(Array.isArray(result.data) ? result.data : []);
      }
    } catch (error) {
      console.error('Failed to load report users:', error);
    }
  }, [managementView]);

  // 加载数据
  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!managementView) {
      return;
    }

    loadReportUsers(reportUserSearch);
  }, [loadReportUsers, managementView, reportUserSearch]);

  // 生成周报
  const handleGenerateReport = React.useCallback(async () => {
    setGenerating(true);
    try {
      const response = await fetch('/api/reports/weekly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'personal' }),
      });

      const result = await response.json();

      if (result.success) {
        upsertReport(result.data);
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
  }, [upsertReport]);

  const openReport = React.useCallback(async (report: WeeklyReport, startEditing = false) => {
    try {
      const response = await fetch(`/api/reports/weekly/${report.id}`);
      const result = await response.json();

      if (result.success) {
        setSelectedReport(result.data);
        setDraftContent(result.data.content);
        setEditingReport(startEditing);
        setShowViewer(true);
      } else {
        toast({
          title: '获取失败',
          description: extractErrorMessage(result.error, '获取周报详情失败'),
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Failed to fetch report:', error);
      toast({
        title: '获取失败',
        description: '获取周报详情失败',
        variant: 'destructive',
      });
    }
  }, [toast]);

  // 查看周报
  const handleViewReport = async (report: WeeklyReport) => {
    await openReport(report, false);
  };

  const handleEditReport = async (report: WeeklyReport) => {
    if (!canMutateReport(report)) {
      return;
    }

    await openReport(report, true);
  };

  const handleSaveReport = async () => {
    if (!selectedReport || !draftContent) {
      return;
    }

    setSavingReport(true);
    try {
      const response = await fetch(`/api/reports/weekly/${selectedReport.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: draftContent,
        }),
      });
      const result = await response.json();

      if (result.success) {
        setSelectedReport(result.data);
        setDraftContent(result.data.content);
        upsertReport(result.data);
        setEditingReport(false);
        toast({
          title: '保存成功',
          description: '周报正式记录已更新',
        });
      } else {
        toast({
          title: '保存失败',
          description: extractErrorMessage(result.error, '更新周报失败'),
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Failed to update report:', error);
      toast({
        title: '保存失败',
        description: '更新周报失败',
        variant: 'destructive',
      });
    } finally {
      setSavingReport(false);
    }
  };

  const handleExportReport = React.useCallback(() => {
    if (!selectedReport) {
      return;
    }

    const content = editingReport && draftContent ? draftContent : selectedReport.content;
    const filename = `周报_${selectedReport.weekStart}_${selectedReport.userName || '未命名'}.txt`;
    const text = buildWeeklyReportExportText({
      ...selectedReport,
      content,
    });

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: '导出成功',
      description: `周报已导出为 ${filename}`,
    });
  }, [draftContent, editingReport, selectedReport, toast]);

  const handleShareReport = React.useCallback(async () => {
    if (!selectedReport) {
      return;
    }

    const content = editingReport && draftContent ? draftContent : selectedReport.content;

    try {
      await navigator.clipboard.writeText(buildWeeklyReportExportText({
        ...selectedReport,
        content,
      }));
      toast({
        title: '已复制',
        description: '周报内容已复制到剪贴板',
      });
    } catch (error) {
      console.error('Failed to copy report:', error);
      toast({
        title: '复制失败',
        description: '复制周报内容失败',
        variant: 'destructive',
      });
    }
  }, [draftContent, editingReport, selectedReport, toast]);

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

  const reportSummary = buildReportSummaryStats(reports);

  return (
    <div className={cn('space-y-6', className)}>
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">报表中心</h2>
          <div className="mt-1 flex items-center gap-2">
            <Badge variant="outline">
              {managementView ? '管理视角' : '个人视角'}
            </Badge>
            <p className="text-muted-foreground">
              {managementView ? '查看统计数据、按权限查看团队周报并导出正式记录' : '查看统计数据、生成并管理自己的周报'}
            </p>
          </div>
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
      {(statistics || hasReportFilters) && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {hasReportFilters ? (
            <>
              <StatsCard
                title="周报数量"
                value={reportSummary.reportCount}
                subtitle="当前筛选条件下的正式记录"
                icon={<FileText className="h-5 w-5" />}
                color="primary"
              />
              <StatsCard
                title="完成任务"
                value={reportSummary.taskCompleted}
                subtitle="按当前周报记录聚合"
                icon={<CheckCircle className="h-5 w-5" />}
                color="success"
              />
              <StatsCard
                title="新增客户"
                value={reportSummary.newCustomers}
                subtitle="按当前周报记录聚合"
                icon={<Users className="h-5 w-5" />}
                color="primary"
              />
              <StatsCard
                title="商机数量"
                value={reportSummary.opportunityCount}
                subtitle="按当前周报记录聚合"
                icon={<TrendingUp className="h-5 w-5" />}
                color="success"
              />
            </>
          ) : statistics ? (
            <>
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
            </>
          ) : null}
        </div>
      )}

      {/* 周报列表 */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              周报记录
            </CardTitle>
            {managementView ? (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="w-full sm:w-56">
                  <UserSelect
                    users={[
                      { id: 0, realName: '全部人员' },
                      ...reportUsers,
                    ]}
                    value={selectedReportUserId ?? 0}
                    onValueChange={(value) => {
                      const numericValue = typeof value === 'string' ? parseInt(value, 10) : value;
                      setSelectedReportUserId(!numericValue ? null : numericValue);
                    }}
                    onSearchChange={setReportUserSearch}
                    placeholder="筛选汇报人"
                    searchPlaceholder="搜索汇报人..."
                    emptyText="未找到可查看人员"
                    className="w-full"
                  />
                </div>
                <Select
                  value={selectedReportYear ? String(selectedReportYear) : 'all'}
                  onValueChange={(value) => setSelectedReportYear(value === 'all' ? null : parseInt(value, 10))}
                >
                  <SelectTrigger className="w-full sm:w-32">
                    <SelectValue placeholder="全部年份" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部年份</SelectItem>
                    {getYearOptions().map((yearOption) => (
                      <SelectItem key={yearOption} value={String(yearOption)}>
                        {yearOption} 年
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={selectedReportWeek ? String(selectedReportWeek) : 'all'}
                  onValueChange={(value) => setSelectedReportWeek(value === 'all' ? null : parseInt(value, 10))}
                >
                  <SelectTrigger className="w-full sm:w-32">
                    <SelectValue placeholder="全部周次" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部周次</SelectItem>
                    {getWeekOptions().map((weekOption) => (
                      <SelectItem key={weekOption} value={String(weekOption)}>
                        第 {weekOption} 周
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedReportUserId ? (
                  <Button variant="ghost" size="sm" onClick={() => setSelectedReportUserId(null)}>
                    清除筛选
                  </Button>
                ) : null}
                {!selectedReportUserId && !selectedReportYear && !selectedReportWeek ? null : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedReportUserId(null);
                      setSelectedReportYear(null);
                      setSelectedReportWeek(null);
                    }}
                  >
                    重置筛选
                  </Button>
                )}
              </div>
            ) : null}
          </div>
        </CardHeader>
        <CardContent>
          <ReportList
            reports={reports}
            currentUserId={user?.id ?? null}
            managementView={managementView}
            onEdit={handleEditReport}
            onView={handleViewReport}
            onDelete={handleDeleteReport}
          />
        </CardContent>
      </Card>

      {/* 周报查看对话框 */}
      <Dialog
        open={showViewer}
        onOpenChange={(nextOpen) => {
          setShowViewer(nextOpen);
          if (!nextOpen) {
            setEditingReport(false);
            setDraftContent(null);
          }
        }}
      >
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
              editableContent={draftContent ?? selectedReport.content}
              isEditing={editingReport}
              isSaving={savingReport}
              onEdit={canMutateReport(selectedReport) ? () => {
                setDraftContent(selectedReport.content);
                setEditingReport(true);
              } : undefined}
              onSave={handleSaveReport}
              onCancelEdit={() => {
                setDraftContent(selectedReport.content);
                setEditingReport(false);
              }}
              onContentChange={setDraftContent}
              onExport={handleExportReport}
              onShare={handleShareReport}
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

function buildWeeklyReportExportText(report: WeeklyReport) {
  const sections = [
    `${report.type === 'personal' ? '个人' : '全局'}周报`,
    `周次：${report.weekStart} 至 ${report.weekEnd}`,
    `汇报人：${report.userName || '未分配'}`,
    '',
    '本周工作总结',
    report.content.summary || '暂无',
    '',
    '工作亮点',
    formatList(report.content.highlights),
    '',
    '风险与问题',
    formatList(report.content.issues),
    '',
    '下周工作计划',
    formatList(report.content.nextWeekPlan, true),
    '',
    '需要协调的事项',
    formatList(report.content.supportNeeds),
  ];

  return sections.join('\n');
}

function formatList(items: string[], numbered = false) {
  if (items.length === 0) {
    return '暂无';
  }

  return items
    .map((item, index) => numbered ? `${index + 1}. ${item}` : `- ${item}`)
    .join('\n');
}

export default ReportCenter;

function getYearOptions() {
  const currentYear = new Date().getFullYear();
  return [currentYear, currentYear - 1, currentYear - 2, currentYear - 3];
}

function getWeekOptions() {
  return Array.from({ length: 53 }, (_, index) => index + 1);
}

function buildReportSummaryStats(reports: WeeklyReport[]): ReportSummaryStats {
  return reports.reduce<ReportSummaryStats>((summary, report) => ({
    reportCount: summary.reportCount + 1,
    taskCompleted: summary.taskCompleted + (report.content.statistics?.taskCompleted ?? 0),
    newCustomers: summary.newCustomers + (report.content.statistics?.newCustomers ?? 0),
    opportunityCount: summary.opportunityCount + (report.content.statistics?.opportunityCount ?? 0),
  }), {
    reportCount: 0,
    taskCompleted: 0,
    newCustomers: 0,
    opportunityCount: 0,
  });
}
