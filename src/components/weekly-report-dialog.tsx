'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  FileText,
  Sparkles,
  Clock,
  CheckCircle,
  AlertCircle,
  Calendar,
  TrendingUp,
  Briefcase,
  Loader2,
  Copy,
  Download,
  Edit2,
  Save,
  RefreshCw,
} from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

// 周报数据类型
interface WeeklyReportData {
  weekInfo: {
    year: number;
    week: number;
    weekStart: string;
    weekEnd: string;
  };
  statistics: {
    workDays: number;
    totalHours: number;
    tasksCompleted: number;
    tasksInProgress: number;
  };
  workLogs: Array<{
    date: string;
    hours: number | null;
    type: string | null;
    content: string | null;
  }>;
  completedTasks: Array<{
    name: string;
    project: string | null;
    completedDate: string | null;
  }>;
  inProgressTasks: Array<{
    name: string;
    project: string | null;
    progress: number | null;
    dueDate: string | null;
  }>;
  generatedContent: string;
}

interface WeeklyReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportType?: 'weekly' | 'monthly' | 'yearly';
}

// 获取工作类型标签
const getWorkTypeLabel = (type: string | null) => {
  if (!type) return '其他';
  const labels: Record<string, string> = {
    followup: '客户跟进',
    bidding: '投标工作',
    project: '项目执行',
    meeting: '会议',
    other: '其他',
  };
  return labels[type] || type;
};

// 获取当前周数
function getWeekNumber(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

// 获取周一日期
function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

export function WeeklyReportDialog({ open, onOpenChange, reportType = 'weekly' }: WeeklyReportDialogProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reportData, setReportData] = useState<WeeklyReportData | null>(null);
  const [editedContent, setEditedContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();

  // 根据报告类型获取标题和描述
  const getReportConfig = (type: 'weekly' | 'monthly' | 'yearly') => {
    const configs = {
      weekly: {
        title: '一键生成周报',
        description: '基于您本周的工作日志和任务完成情况，自动生成周报',
        loadingText: '正在生成周报...',
        tabLabel: '周报预览',
      },
      monthly: {
        title: '一键生成月报',
        description: '基于您本月的工作日志和任务完成情况，自动生成月报',
        loadingText: '正在生成月报...',
        tabLabel: '月报预览',
      },
      yearly: {
        title: '一键生成年报',
        description: '基于您本年度的工作日志和任务完成情况，自动生成年报',
        loadingText: '正在生成年报...',
        tabLabel: '年报预览',
      },
    };
    return configs[type];
  };

  const reportConfig = getReportConfig(reportType);

  // 当对话框打开时，自动生成周报
  useEffect(() => {
    if (open) {
      generateReport();
    }
  }, [open]);

  // 生成周报
  const generateReport = async () => {
    setLoading(true);
    try {
      const today = new Date();
      const week = getWeekNumber(today);
      const year = today.getFullYear();

      const response = await fetch(`/api/reports/weekly?year=${year}&week=${week}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      const result = await response.json();
      
      if (result.success) {
        setReportData(result.data);
        setEditedContent(result.data.generatedContent);
      } else {
        // error 可能是字符串或 { code, message } 对象
        const errorMsg = typeof result.error === 'string'
          ? result.error
          : (result.error?.message || '生成周报失败，请稍后重试');
        toast({
          title: '生成失败',
          description: errorMsg,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Failed to generate report:', error);
      toast({
        title: '生成失败',
        description: '网络错误，请稍后重试',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // 保存周报
  const saveReport = async () => {
    if (!reportData) return;
    
    setSaving(true);
    try {
      const response = await fetch('/api/reports/weekly', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          year: reportData.weekInfo.year,
          week: reportData.weekInfo.week,
          content: editedContent,
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        toast({
          title: '保存成功',
          description: '周报已保存',
        });
        setIsEditing(false);
      } else {
        // error 可能是字符串或 { code, message } 对象
        const errorMsg = typeof result.error === 'string'
          ? result.error
          : (result.error?.message || '保存周报失败');
        toast({
          title: '保存失败',
          description: errorMsg,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Failed to save report:', error);
      toast({
        title: '保存失败',
        description: '网络错误，请稍后重试',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // 复制周报
  const copyReport = () => {
    if (!editedContent) return;
    
    navigator.clipboard.writeText(editedContent);
    toast({
      title: '已复制',
      description: '周报内容已复制到剪贴板',
    });
  };

  // 下载周报
  const downloadReport = () => {
    if (!reportData || !editedContent) return;
    
    const filename = `周报_${reportData.weekInfo.year}年第${reportData.weekInfo.week}周.txt`;
    const blob = new Blob([editedContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: '已下载',
      description: `周报已保存为 ${filename}`,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {reportConfig.title}
          </DialogTitle>
          <DialogDescription>
            {reportConfig.description}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">{reportConfig.loadingText}</p>
          </div>
        ) : reportData ? (
          <div className="space-y-4">
            {/* 周信息 */}
            <div className="flex items-center justify-between px-4 py-2 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">
                  {reportData.weekInfo.year}年第{reportData.weekInfo.week}周
                </span>
              </div>
              <span className="text-sm text-muted-foreground">
                {reportData.weekInfo.weekStart} 至 {reportData.weekInfo.weekEnd}
              </span>
            </div>

            <Tabs defaultValue="preview" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="preview">{reportConfig.tabLabel}</TabsTrigger>
                <TabsTrigger value="details">数据详情</TabsTrigger>
              </TabsList>

              {/* 报告预览 */}
              <TabsContent value="preview" className="space-y-4">
                {/* 统计摘要 */}
                <div className="grid grid-cols-4 gap-3">
                  <Card className="p-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-blue-500" />
                      <span className="text-sm text-muted-foreground">工作天数</span>
                    </div>
                    <p className="text-2xl font-bold mt-1">{reportData.statistics.workDays}</p>
                  </Card>
                  <Card className="p-3">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-muted-foreground">累计工时</span>
                    </div>
                    <p className="text-2xl font-bold mt-1">{reportData.statistics.totalHours}h</p>
                  </Card>
                  <Card className="p-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-emerald-500" />
                      <span className="text-sm text-muted-foreground">完成任务</span>
                    </div>
                    <p className="text-2xl font-bold mt-1">{reportData.statistics.tasksCompleted}</p>
                  </Card>
                  <Card className="p-3">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-orange-500" />
                      <span className="text-sm text-muted-foreground">进行中</span>
                    </div>
                    <p className="text-2xl font-bold mt-1">{reportData.statistics.tasksInProgress}</p>
                  </Card>
                </div>

                {/* 周报内容 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">周报内容</h4>
                    <div className="flex items-center gap-2">
                      {isEditing ? (
                        <Button size="sm" variant="default" onClick={saveReport} disabled={saving}>
                          {saving ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-1" />
                          ) : (
                            <Save className="h-4 w-4 mr-1" />
                          )}
                          保存
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                          <Edit2 className="h-4 w-4 mr-1" />
                          编辑
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={copyReport}>
                        <Copy className="h-4 w-4 mr-1" />
                        复制
                      </Button>
                      <Button size="sm" variant="ghost" onClick={downloadReport}>
                        <Download className="h-4 w-4 mr-1" />
                        下载
                      </Button>
                    </div>
                  </div>
                  
                  {isEditing ? (
                    <Textarea
                      value={editedContent}
                      onChange={(e) => setEditedContent(e.target.value)}
                      className="min-h-[300px] font-mono text-sm"
                      placeholder="输入周报内容..."
                    />
                  ) : (
                    <ScrollArea className="h-[300px] border rounded-lg p-4">
                      <pre className="text-sm whitespace-pre-wrap font-sans">{editedContent}</pre>
                    </ScrollArea>
                  )}
                </div>
              </TabsContent>

              {/* 数据详情 */}
              <TabsContent value="details" className="space-y-4">
                {/* 工作日志 */}
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      本周工作日志 ({reportData.workLogs.length}条)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-2">
                    {reportData.workLogs.length > 0 ? (
                      <div className="space-y-2">
                        {reportData.workLogs.map((log, index) => (
                          <div key={index} className="flex items-start gap-3 p-2 rounded bg-muted/30">
                            <div className="text-xs text-muted-foreground w-20 flex-shrink-0">
                              {log.date}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className="text-xs">
                                  {getWorkTypeLabel(log.type)}
                                </Badge>
                                {log.hours && (
                                  <span className="text-xs text-muted-foreground">{log.hours}h</span>
                                )}
                              </div>
                              <p className="text-sm">{log.content || '无内容'}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-muted-foreground">
                        本周暂无工作日志
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* 完成的任务 */}
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      已完成任务 ({reportData.completedTasks.length}项)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-2">
                    {reportData.completedTasks.length > 0 ? (
                      <div className="space-y-2">
                        {reportData.completedTasks.map((task, index) => (
                          <div key={index} className="flex items-center justify-between p-2 rounded bg-muted/30">
                            <div>
                              <span className="font-medium">{task.name}</span>
                              {task.project && (
                                <span className="text-muted-foreground text-sm ml-2">
                                  ({task.project})
                                </span>
                              )}
                            </div>
                            {task.completedDate && (
                              <span className="text-xs text-muted-foreground">{task.completedDate}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-muted-foreground">
                        本周暂无完成任务
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* 进行中的任务 */}
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-orange-500" />
                      进行中任务 ({reportData.inProgressTasks.length}项)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-2">
                    {reportData.inProgressTasks.length > 0 ? (
                      <div className="space-y-2">
                        {reportData.inProgressTasks.map((task, index) => (
                          <div key={index} className="p-2 rounded bg-muted/30">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium">{task.name}</span>
                              {task.dueDate && (
                                <span className="text-xs text-muted-foreground">
                                  截止: {task.dueDate}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {task.project && (
                                <span className="text-xs text-muted-foreground">{task.project}</span>
                              )}
                              {task.progress !== null && (
                                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-primary rounded-full"
                                    style={{ width: `${task.progress}%` }}
                                  />
                                </div>
                              )}
                              {task.progress !== null && (
                                <span className="text-xs text-muted-foreground w-8">{task.progress}%</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-muted-foreground">
                        暂无进行中任务
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">生成周报失败，请重试</p>
            <Button variant="outline" onClick={generateReport} className="mt-4">
              <RefreshCw className="h-4 w-4 mr-2" />
              重新生成
            </Button>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            关闭
          </Button>
          {!loading && reportData && (
            <Button onClick={generateReport}>
              <RefreshCw className="h-4 w-4 mr-2" />
              重新生成
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
