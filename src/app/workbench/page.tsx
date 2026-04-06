'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { WeeklyReportDialog } from '@/components/weekly-report-dialog';
import { useAuth } from '@/contexts/auth-context';
import {
  Calendar,
  CheckSquare,
  TrendingUp,
  Users,
  FileText,
  Briefcase,
  MessageSquare,
  Bell,
  Plus,
  ArrowRight,
  Clock,
  AlertCircle,
  Target,
  Lightbulb,
  Building2,
  Settings,
  Sparkles,
  FileSpreadsheet,
  Star,
  AlertTriangle,
  Mail,
} from 'lucide-react';
import Link from 'next/link';

// 类型定义
interface Todo {
  id: number;
  title: string;
  type: string;
  priority: string;
  dueDate: string;
  dueTime: string;
  todoStatus: string;
  relatedName: string;
}

interface Schedule {
  id: number;
  title: string;
  type: string;
  startDate: string;
  startTime: string;
  location: string;
  isOwner?: boolean;
}

interface StarredProject {
  id: number;
  projectCode: string;
  projectName: string;
  customerName: string;
  status: string;
  statusLabel?: string;
  progress: number;
}

interface Stats {
  pendingTodos: number;
  myTasks: number;
  pendingAlerts: number;
  unreadMessages: number;
  myProjects: number;
}

interface FocusItem {
  id: string;
  source: 'todo' | 'task' | 'schedule';
  title: string;
  href: string;
  priority: string;
  meta: string;
  description: string;
}

// 动态项接口
interface Activity {
  id: string;
  type: string;
  action: string;
  title: string;
  description: string;
  actorId: number;
  actorName: string;
  actorAvatar?: string;
  relatedType?: string;
  relatedId?: number;
  relatedName?: string;
  sourceLabel?: string;
  href?: string;
  quickActions?: Array<{
    label: string;
    href: string;
    intent?: 'message-read' | 'alert-acknowledge' | 'task-complete' | 'task-defer';
    targetId?: number;
    payload?: Record<string, unknown>;
  }>;
  createdAt: string;
  style?: {
    icon: string;
    color: string;
    bgColor: string;
  };
  timeAgo?: string;
}

// 获取动态类型图标
const getActivityIcon = (type: string) => {
  const iconMap: Record<string, React.ReactNode> = {
    opportunity: <TrendingUp className="h-4 w-4" />,
    project: <Briefcase className="h-4 w-4" />,
    followup: <Users className="h-4 w-4" />,
    quotation: <FileText className="h-4 w-4" />,
    task: <CheckSquare className="h-4 w-4" />,
    alert: <AlertTriangle className="h-4 w-4" />,
    message: <Mail className="h-4 w-4" />,
    approval: <CheckSquare className="h-4 w-4" />,
    system: <AlertCircle className="h-4 w-4" />,
    solution: <Lightbulb className="h-4 w-4" />,
    customer: <Building2 className="h-4 w-4" />,
  };
  return iconMap[type] || <AlertCircle className="h-4 w-4" />;
};

// 获取任务类型图标
const getTodoIcon = (type: string) => {
  const icons: Record<string, React.ReactNode> = {
    followup: <Users className="h-4 w-4" />,
    document: <FileText className="h-4 w-4" />,
    bidding: <Briefcase className="h-4 w-4" />,
    meeting: <Calendar className="h-4 w-4" />,
    approval: <CheckSquare className="h-4 w-4" />,
    other: <Target className="h-4 w-4" />,
  };
  return icons[type] || icons.other;
};

// 获取优先级样式
const getPriorityStyle = (priority: string) => {
  const styles: Record<string, string> = {
    urgent: 'bg-destructive/10 text-destructive border-destructive/20',
    high: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
    medium: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    low: 'bg-muted text-muted-foreground border-muted',
  };
  return styles[priority] || styles.medium;
};

// 获取日程类型图标
const getScheduleIcon = (type: string) => {
  const icons: Record<string, React.ReactNode> = {
    meeting: <Calendar className="h-4 w-4" />,
    visit: <Building2 className="h-4 w-4" />,
    call: <MessageSquare className="h-4 w-4" />,
    presentation: <Lightbulb className="h-4 w-4" />,
    other: <Clock className="h-4 w-4" />,
  };
  return icons[type] || icons.other;
};

// 获取动态跳转链接
const getActivityLink = (activity: Activity): string => {
  if (activity.href) {
    return activity.href;
  }

  switch (activity.relatedType) {
    case 'project':
      return `/projects/${activity.relatedId}`;
    case 'customer':
      return `/customers/${activity.relatedId}`;
    case 'solution':
      return `/solutions/${activity.relatedId}`;
    case 'opportunity':
      return `/opportunities/${activity.relatedId}`;
    case 'task':
      return '/tasks?scope=mine';
    case 'message':
      return '/messages';
    case 'alert':
      return '/alerts/histories?status=pending';
    default:
      return '#';
  }
};

const getFocusIcon = (source: FocusItem['source']) => {
  switch (source) {
    case 'task':
      return <Target className="h-4 w-4" />;
    case 'schedule':
      return <Calendar className="h-4 w-4" />;
    default:
      return <CheckSquare className="h-4 w-4" />;
  }
};

const getFocusLabel = (source: FocusItem['source']) => {
  switch (source) {
    case 'task':
      return '任务';
    case 'schedule':
      return '日程';
    default:
      return '待办';
  }
};

const getSeverityStyle = (severity: string) => {
  const styles: Record<string, string> = {
    critical: 'bg-destructive/10 text-destructive border-destructive/20',
    high: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
    medium: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
    low: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  };

  return styles[severity] || styles.medium;
};

const getSeverityLabel = (severity: string) => {
  const labels: Record<string, string> = {
    critical: '严重',
    high: '高',
    medium: '中',
    low: '低',
  };

  return labels[severity] || '中';
};

const getMessageTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    system: '系统',
    notification: '通知',
    alert: '预警',
    reminder: '提醒',
    message: '消息',
  };

  return labels[type] || '消息';
};

const formatWorkbenchTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

export default function WorkbenchPage() {
  const { user, isAuthenticated } = useAuth();
  const [stats, setStats] = useState<Stats>({
    pendingTodos: 0,
    myTasks: 0,
    pendingAlerts: 0,
    unreadMessages: 0,
    myProjects: 0,
  });
  const [focusQueue, setFocusQueue] = useState<FocusItem[]>([]);
  const [todayTodos, setTodayTodos] = useState<Todo[]>([]);
  const [weekSchedules, setWeekSchedules] = useState<Schedule[]>([]);
  const [starredProjects, setStarredProjects] = useState<StarredProject[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [weeklyReportOpen, setWeeklyReportOpen] = useState(false);
  const [reportType, setReportType] = useState<'weekly' | 'monthly' | 'yearly'>('weekly');
  const [quickActionPendingKey, setQuickActionPendingKey] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchWorkbenchData();
    }
  }, [isAuthenticated, user]);

  const fetchWorkbenchData = async () => {
    try {
      const response = await fetch(`/api/workbench/summary?ts=${Date.now()}`, {
        cache: 'no-store',
      });
      const result = await response.json();

      if (result.success) {
        setStats(result.data.stats);
        setFocusQueue(result.data.focusQueue || []);
        setTodayTodos(result.data.todayTodos);
        setWeekSchedules(result.data.weekSchedules);
        setStarredProjects(result.data.starredProjects || []);
        setActivities(result.data.inboxFeed || []);
      }
    } catch (error) {
      console.error('Failed to fetch workbench data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTodoComplete = async (todoId: number) => {
    try {
      await fetch(`/api/todos/${todoId}/complete`, {
        method: 'POST',
      });
      fetchWorkbenchData();
    } catch (error) {
      console.error('Failed to complete todo:', error);
    }
  };

  const handleActivityQuickAction = async (activityId: string, quickAction: NonNullable<Activity['quickActions']>[number]) => {
    const actionKey = `${activityId}-${quickAction.intent || quickAction.href}-${quickAction.targetId || 'link'}`;

    if (!quickAction.intent || !quickAction.targetId) {
      return;
    }

    setQuickActionPendingKey(actionKey);

    try {
      if (quickAction.intent === 'message-read') {
        await fetch(`/api/messages/${quickAction.targetId}/read`, {
          method: 'POST',
        });
      }

      if (quickAction.intent === 'alert-acknowledge') {
        await fetch('/api/alerts/histories', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ id: quickAction.targetId }),
        });
      }

      if (quickAction.intent === 'task-complete' || quickAction.intent === 'task-defer') {
        await fetch(`/api/tasks/${quickAction.targetId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(quickAction.payload || {}),
        });
      }

      if (quickAction.intent === 'task-complete') {
        setActivities((current) => current.filter((activity) => activity.id !== activityId));
        setFocusQueue((current) => current.filter((item) => item.id !== `task-${quickAction.targetId}`));
        setStats((current) => ({
          ...current,
          myTasks: Math.max(0, current.myTasks - 1),
        }));
      }

      await fetchWorkbenchData();
    } catch (error) {
      console.error('Failed to run inbox quick action:', error);
    } finally {
      setQuickActionPendingKey(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-80px)]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">工作台</h1>
          <p className="text-muted-foreground">先处理高优先事项，再进入任务、日程、消息和项目</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/alerts/histories?status=pending">
              <AlertTriangle className="h-4 w-4 mr-2" />
              风险雷达
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/messages">
              <Bell className="h-4 w-4 mr-2" />
              消息中心
            </Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/work-logs">
              <FileText className="h-4 w-4 mr-2" />
              工作日志
            </Link>
          </Button>
        </div>
      </div>

      {/* 驾驶舱指标 */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-5 md:gap-4">
        <Link href="/calendar" className="block">
          <Card className="md:col-span-1 cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 md:px-6">
              <CardTitle className="text-xs md:text-sm font-medium">待处理事项</CardTitle>
              <CheckSquare className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-3 md:px-6">
              <div className="text-lg md:text-2xl font-bold">{stats.pendingTodos}</div>
              <p className="text-[10px] md:text-xs text-muted-foreground">待办 + 今日日程</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/tasks?scope=mine" className="block">
          <Card className="md:col-span-1 cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 md:px-6">
              <CardTitle className="text-xs md:text-sm font-medium">我的任务</CardTitle>
              <Target className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-3 md:px-6">
              <div className="text-lg md:text-2xl font-bold">{stats.myTasks}</div>
              <p className="text-[10px] md:text-xs text-muted-foreground">任务中心中的个人视角</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/alerts/histories?status=pending" className="block">
          <Card className="md:col-span-1 cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 md:px-6">
              <CardTitle className="text-xs md:text-sm font-medium">待处理预警</CardTitle>
              <AlertTriangle className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-3 md:px-6">
              <div className="text-lg md:text-2xl font-bold text-orange-600">{stats.pendingAlerts}</div>
              <p className="text-[10px] md:text-xs text-muted-foreground">风险雷达入口</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/messages" className="block">
          <Card className="md:col-span-1 cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 md:px-6">
              <CardTitle className="text-xs md:text-sm font-medium">未读消息</CardTitle>
              <Mail className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-3 md:px-6">
              <div className="text-lg md:text-2xl font-bold">{stats.unreadMessages}</div>
              <p className="text-[10px] md:text-xs text-muted-foreground">消息中心收件箱</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/projects" className="block">
          <Card className="md:col-span-1 cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 md:px-6">
              <CardTitle className="text-xs md:text-sm font-medium">我的项目</CardTitle>
              <Briefcase className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-3 md:px-6">
              <div className="text-lg md:text-2xl font-bold">{stats.myProjects}</div>
              <p className="text-[10px] md:text-xs text-muted-foreground">我负责或参与的项目</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* 一键生成报告入口 */}
      <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">一键生成报告</h3>
                <p className="text-sm text-muted-foreground">
                  基于工作日志和任务完成情况，自动生成报告
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <Button
                className="flex-1 md:flex-none"
                onClick={() => {
                  setReportType('weekly');
                  setWeeklyReportOpen(true);
                }}
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                周报
              </Button>
              <Button
                variant="outline"
                className="flex-1 md:flex-none"
                onClick={() => {
                  setReportType('monthly');
                  setWeeklyReportOpen(true);
                }}
              >
                月报
              </Button>
              <Button
                variant="outline"
                className="flex-1 md:flex-none"
                onClick={() => {
                  setReportType('yearly');
                  setWeeklyReportOpen(true);
                }}
              >
                年报
              </Button>
              <Button variant="outline" size="icon" asChild>
                <Link href="/work-logs">
                  <FileText className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 主要内容区域 */}
      <div className="grid gap-4 md:gap-6 lg:grid-cols-3">
        {/* 左侧：优先队列 */}
        <div className="lg:col-span-1 space-y-4 md:space-y-6">
          {/* 今日优先队列 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">今日优先队列</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/tasks?scope=mine">
                  打开任务中心
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                {focusQueue.length > 0 ? (
                  <div className="space-y-3">
                    {focusQueue.map((item) => (
                      <Link
                        key={item.id}
                        href={item.href}
                        className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                      >
                        <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                          {getFocusIcon(item.source)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate">{item.title}</span>
                            <Badge variant="outline" className="text-xs">
                              {getFocusLabel(item.source)}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className={`text-xs ${getPriorityStyle(item.priority)}`}>
                              {item.priority === 'urgent' ? '紧急' : item.priority === 'high' ? '高' : item.priority === 'medium' ? '中' : '低'}
                            </Badge>
                            {item.meta && (
                              <span className="text-xs text-muted-foreground">
                                {item.meta}
                              </span>
                            )}
                          </div>
                          {item.description && (
                            <p className="text-xs text-muted-foreground mt-1 truncate">
                              {item.description}
                            </p>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center py-8">
                    <Target className="h-12 w-12 text-muted-foreground/30 mb-3" />
                    <p className="text-muted-foreground">当前没有需要优先推进的事项</p>
                    <Button variant="link" size="sm" className="mt-2" asChild>
                      <Link href="/tasks?scope=mine">
                        查看我的任务视角
                      </Link>
                    </Button>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* 今日待办 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-primary" />
                今日待办
              </CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/calendar?view=list">
                  查看全部
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[200px]">
                {todayTodos.length > 0 ? (
                  <div className="space-y-3">
                    {todayTodos.map((todo) => (
                      <div
                        key={todo.id}
                        className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                      >
                        <Checkbox
                          id={`todo-${todo.id}`}
                          onCheckedChange={() => handleTodoComplete(todo.id)}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {getTodoIcon(todo.type)}
                            <span className="font-medium truncate">{todo.title}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className={`text-xs ${getPriorityStyle(todo.priority)}`}>
                              {todo.priority === 'urgent' ? '紧急' : todo.priority === 'high' ? '高' : todo.priority === 'medium' ? '中' : '低'}
                            </Badge>
                            {todo.dueTime && (
                              <span className="text-xs text-muted-foreground">
                                {todo.dueTime}
                              </span>
                            )}
                          </div>
                          {todo.relatedName && (
                            <p className="text-xs text-muted-foreground mt-1 truncate">
                              {todo.relatedName}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center py-8">
                    <CheckSquare className="h-12 w-12 text-muted-foreground/30 mb-3" />
                    <p className="text-muted-foreground">今日暂无待办</p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* 中间：日程与项目 */}
        <div className="lg:col-span-1 space-y-6">
          {/* 本周日程 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">本周日程</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/calendar">
                  查看全部
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[200px]">
                {weekSchedules.length > 0 ? (
                  <div className="space-y-3">
                    {weekSchedules.map((schedule) => (
                      <div
                        key={schedule.id}
                        className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          {getScheduleIcon(schedule.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium truncate">{schedule.title}</p>
                            {schedule.isOwner === false && (
                              <Badge variant="outline" className="text-xs">共享</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>
                              {schedule.startDate}
                              {schedule.startTime && ` ${schedule.startTime}`}
                            </span>
                          </div>
                          {schedule.location && (
                            <p className="text-xs text-muted-foreground mt-1">
                              📍 {schedule.location}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center py-8">
                    <Calendar className="h-12 w-12 text-muted-foreground/30 mb-3" />
                    <p className="text-muted-foreground">本周暂无日程</p>
                    <Button variant="link" size="sm" className="mt-2" asChild>
                      <Link href="/calendar">
                        <Plus className="h-4 w-4 mr-1" />
                        创建日程
                      </Link>
                    </Button>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* 重点项目 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Star className="h-4 w-4 text-yellow-500" />
                重点项目
              </CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/projects">
                  查看全部
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[220px]">
                {starredProjects.length > 0 ? (
                  <div className="space-y-3">
                    {starredProjects.map((project) => (
                      <Link
                        key={project.id}
                        href={`/projects/${project.id}`}
                        className="block p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium truncate">{project.projectName}</span>
                          <Badge variant="outline" className="text-xs">
                            {project.statusLabel || project.status}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between mt-2 text-sm">
                          <span className="text-muted-foreground truncate">{project.customerName}</span>
                          <span className="font-medium">{project.progress}%</span>
                        </div>
                        <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${project.progress}%` }}
                          />
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center py-8">
                    <Star className="h-12 w-12 text-muted-foreground/30 mb-3" />
                    <p className="text-muted-foreground">暂无重点项目</p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* 右侧：个人事件收件箱 */}
        <div className="lg:col-span-1 space-y-6">
          {/* 个人事件收件箱 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base">个人事件收件箱</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">按最近相关动作汇总任务、消息、预警和业务动态，并直接完成轻量处理</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/alerts/histories?status=pending">
                    预警中心
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/messages">
                    消息中心
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[720px]">
                {activities.length > 0 ? (
                  <div className="space-y-4">
                    {activities.map((activity) => {
                      const link = getActivityLink(activity);
                      const isClickable = link !== '#';
                      
                      return (
                        <div key={activity.id} className="rounded-lg border bg-card p-3">
                          <Link
                            href={isClickable ? link : '#'}
                            className={`flex gap-3 ${isClickable ? 'cursor-pointer hover:bg-accent/50 -m-1 p-1 rounded-lg transition-colors' : 'cursor-default'}`}
                          >
                            <div className={`w-8 h-8 rounded-full ${activity.style?.bgColor || 'bg-muted'} flex items-center justify-center flex-shrink-0`}>
                              {getActivityIcon(activity.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                {activity.sourceLabel && (
                                  <Badge variant="outline" className="text-xs">{activity.sourceLabel}</Badge>
                                )}
                                <p className="text-sm text-muted-foreground">
                                  <span className="font-medium text-foreground">{activity.actorName}</span> {activity.action}
                                </p>
                              </div>
                              <p className="text-sm font-medium mt-1">{activity.title}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {activity.relatedName || activity.description} · {activity.timeAgo}
                              </p>
                            </div>
                          </Link>
                          {activity.quickActions && activity.quickActions.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-3 ml-11">
                              {activity.quickActions.map((quickAction) => (
                                quickAction.intent ? (
                                  <Button
                                    key={`${activity.id}-${quickAction.intent}-${quickAction.targetId || 'na'}`}
                                    variant="outline"
                                    size="sm"
                                    disabled={quickActionPendingKey === `${activity.id}-${quickAction.intent}-${quickAction.targetId || 'link'}`}
                                    onClick={() => handleActivityQuickAction(activity.id, quickAction)}
                                  >
                                    {quickActionPendingKey === `${activity.id}-${quickAction.intent}-${quickAction.targetId || 'link'}` ? '处理中...' : quickAction.label}
                                  </Button>
                                ) : (
                                  <Button key={`${activity.id}-${quickAction.href}-${quickAction.label}`} variant="outline" size="sm" asChild>
                                    <Link href={quickAction.href}>{quickAction.label}</Link>
                                  </Button>
                                )
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center py-8">
                    <Bell className="h-12 w-12 text-muted-foreground/30 mb-3" />
                    <p className="text-muted-foreground">暂无动态</p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 报告生成对话框 */}
      <WeeklyReportDialog 
        open={weeklyReportOpen} 
        onOpenChange={setWeeklyReportOpen} 
        reportType={reportType}
      />
    </div>
  );
}
