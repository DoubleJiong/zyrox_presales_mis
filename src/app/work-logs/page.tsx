'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  FileText,
  Plus,
  Clock,
  MapPin,
  Smile,
  Send,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Calendar,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

// 工作日志类型
interface WorkLog {
  id: number;
  userId: number;
  userName: string;
  logDate: string;
  workHours: string | null;
  workContent: string | null;
  tomorrowPlan: string | null;
  issues: string | null;
  workType: string | null;
  status: string;
  relatedProjects: Array<{ projectId: number; projectName: string; hours: number }> | null;
  relatedCustomers: Array<{ customerId: number; customerName: string }> | null;
  attachments: Array<{ name: string; url: string }> | null;
  location: string | null;
  mood: string | null;
  createdAt: string;
  updatedAt: string;
}

// 获取工作类型标签
const getWorkTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    followup: '客户跟进',
    bidding: '投标工作',
    project: '项目执行',
    meeting: '会议',
    other: '其他',
  };
  return labels[type] || '其他';
};

// 获取状态样式
const getStatusStyle = (status: string) => {
  const styles: Record<string, string> = {
    draft: 'bg-slate-500/10 text-slate-600 border-slate-500/20',
    submitted: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    approved: 'bg-green-500/10 text-green-600 border-green-500/20',
    rejected: 'bg-red-500/10 text-red-600 border-red-500/20',
  };
  return styles[status] || styles.draft;
};

// 获取状态标签
const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    draft: '草稿',
    submitted: '已提交',
    approved: '已审核',
    rejected: '已驳回',
  };
  return labels[status] || '草稿';
};

// 获取心情图标
const getMoodIcon = (mood: string) => {
  const icons: Record<string, string> = {
    great: '😊',
    good: '🙂',
    normal: '😐',
    bad: '😔',
  };
  return icons[mood] || '😐';
};

export default function WorkLogsPage() {
  const [logs, setLogs] = useState<WorkLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<WorkLog | null>(null);
  const [formData, setFormData] = useState({
    logDate: format(new Date(), 'yyyy-MM-dd'),
    workHours: '',
    workContent: '',
    tomorrowPlan: '',
    issues: '',
    workType: 'other',
    location: '',
    mood: 'normal',
  });

  useEffect(() => {
    fetchLogs();
  }, [currentMonth]);

  const fetchLogs = async () => {
    try {
      const startDate = format(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1), 'yyyy-MM-dd');
      const endDate = format(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0), 'yyyy-MM-dd');
      
      const response = await fetch(`/api/work-logs?userId=1&startDate=${startDate}&endDate=${endDate}`);
      const result = await response.json();
      
      if (result.success) {
        setLogs(result.data.list);
      }
    } catch (error) {
      console.error('Failed to fetch work logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const url = editingLog ? `/api/work-logs/${editingLog.id}` : '/api/work-logs';
      const method = editingLog ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 1,
          ...formData,
          workHours: formData.workHours ? parseFloat(formData.workHours) : null,
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setDialogOpen(false);
        setEditingLog(null);
        resetForm();
        fetchLogs();
      }
    } catch (error) {
      console.error('Failed to save work log:', error);
    }
  };

  const handleSubmitForApproval = async (logId: number) => {
    try {
      const response = await fetch(`/api/work-logs/${logId}/submit`, {
        method: 'POST',
      });
      
      const result = await response.json();
      
      if (result.success) {
        fetchLogs();
      }
    } catch (error) {
      console.error('Failed to submit work log:', error);
    }
  };

  const handleDelete = async (logId: number) => {
    if (!confirm('确定要删除这条工作日志吗？')) return;
    
    try {
      await fetch(`/api/work-logs/${logId}`, { method: 'DELETE' });
      fetchLogs();
    } catch (error) {
      console.error('Failed to delete work log:', error);
    }
  };

  const openEditDialog = (log: WorkLog) => {
    setEditingLog(log);
    setFormData({
      logDate: log.logDate,
      workHours: log.workHours || '',
      workContent: log.workContent || '',
      tomorrowPlan: log.tomorrowPlan || '',
      issues: log.issues || '',
      workType: log.workType || 'other',
      location: log.location || '',
      mood: log.mood || 'normal',
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      logDate: format(new Date(), 'yyyy-MM-dd'),
      workHours: '',
      workContent: '',
      tomorrowPlan: '',
      issues: '',
      workType: 'other',
      location: '',
      mood: 'normal',
    });
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  // 按日期分组日志
  const logsByDate = logs.reduce((acc, log) => {
    const date = log.logDate;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(log);
    return acc;
  }, {} as Record<string, WorkLog[]>);

  // 获取当月所有日期
  const monthDates = [];
  const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
  
  for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
    const dateStr = format(d, 'yyyy-MM-dd');
    monthDates.push({
      date: dateStr,
      day: d.getDate(),
      weekday: format(d, 'EEE', { locale: zhCN }),
      isToday: dateStr === format(new Date(), 'yyyy-MM-dd'),
      logs: logsByDate[dateStr] || [],
    });
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">工作日志</h1>
          <p className="text-muted-foreground">记录和管理工作日志</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingLog(null); resetForm(); }}>
              <Plus className="h-4 w-4 mr-2" />
              新建日志
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingLog ? '编辑日志' : '新建工作日志'}</DialogTitle>
              <DialogDescription>
                填写今日工作内容、明日计划和遇到的问题
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="logDate">日期</Label>
                  <Input
                    id="logDate"
                    type="date"
                    value={formData.logDate}
                    onChange={(e) => setFormData({ ...formData, logDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="workHours">工作时长(小时)</Label>
                  <Input
                    id="workHours"
                    type="number"
                    step="0.5"
                    value={formData.workHours}
                    onChange={(e) => setFormData({ ...formData, workHours: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="workType">工作类型</Label>
                  <Select value={formData.workType} onValueChange={(value) => setFormData({ ...formData, workType: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="followup">客户跟进</SelectItem>
                      <SelectItem value="bidding">投标工作</SelectItem>
                      <SelectItem value="project">项目执行</SelectItem>
                      <SelectItem value="meeting">会议</SelectItem>
                      <SelectItem value="other">其他</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="workContent">今日工作内容</Label>
                <Textarea
                  id="workContent"
                  placeholder="请描述今日完成的工作..."
                  value={formData.workContent}
                  onChange={(e) => setFormData({ ...formData, workContent: e.target.value })}
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tomorrowPlan">明日计划</Label>
                <Textarea
                  id="tomorrowPlan"
                  placeholder="请描述明日工作计划..."
                  value={formData.tomorrowPlan}
                  onChange={(e) => setFormData({ ...formData, tomorrowPlan: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="issues">问题与困难</Label>
                <Textarea
                  id="issues"
                  placeholder="遇到的困难或需要协调的问题..."
                  value={formData.issues}
                  onChange={(e) => setFormData({ ...formData, issues: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="location">工作地点</Label>
                  <Input
                    id="location"
                    placeholder="如：公司、客户现场..."
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>心情状态</Label>
                  <Select value={formData.mood} onValueChange={(value) => setFormData({ ...formData, mood: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="great">😊 很棒</SelectItem>
                      <SelectItem value="good">🙂 不错</SelectItem>
                      <SelectItem value="normal">😐 一般</SelectItem>
                      <SelectItem value="bad">😔 不太好</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleSubmit}>
                {editingLog ? '保存' : '创建'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* 月份导航 */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="icon" onClick={prevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <CardTitle className="text-lg">
                {format(currentMonth, 'yyyy年MM月', { locale: zhCN })}
              </CardTitle>
              <Button variant="outline" size="icon" onClick={nextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="outline" onClick={() => setCurrentMonth(new Date())}>
              <Calendar className="h-4 w-4 mr-2" />
              今天
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="space-y-3">
                {monthDates.map((day) => (
                  <div
                    key={day.date}
                    className={`flex items-start gap-4 p-4 rounded-lg border ${
                      day.isToday ? 'bg-primary/5 border-primary/20' : 'bg-card'
                    }`}
                  >
                    <div className="flex-shrink-0 w-16 text-center">
                      <div className={`text-2xl font-bold ${day.isToday ? 'text-primary' : ''}`}>
                        {day.day}
                      </div>
                      <div className="text-xs text-muted-foreground">{day.weekday}</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      {day.logs.length > 0 ? (
                        day.logs.map((log) => (
                          <div key={log.id} className="mb-3 last:mb-0">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className={getStatusStyle(log.status)}>
                                  {getStatusLabel(log.status)}
                                </Badge>
                                {log.workType && (
                                  <Badge variant="secondary">
                                    {getWorkTypeLabel(log.workType)}
                                  </Badge>
                                )}
                                {log.workHours && (
                                  <span className="text-sm text-muted-foreground">
                                    <Clock className="h-3 w-3 inline mr-1" />
                                    {log.workHours}h
                                  </span>
                                )}
                                {log.mood && (
                                  <span className="text-lg">{getMoodIcon(log.mood)}</span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                {log.status === 'draft' && (
                                  <>
                                    <Button variant="outline" size="sm" onClick={() => handleSubmitForApproval(log.id)}>
                                      <Send className="h-3 w-3 mr-1" />
                                      提交
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => openEditDialog(log)}>
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => handleDelete(log.id)}>
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>
                            {log.workContent && (
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {log.workContent}
                              </p>
                            )}
                            {log.location && (
                              <p className="text-xs text-muted-foreground mt-1">
                                <MapPin className="h-3 w-3 inline mr-1" />
                                {log.location}
                              </p>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="text-sm text-muted-foreground">
                          暂无日志记录
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
