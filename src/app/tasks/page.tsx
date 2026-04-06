'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DictSelect } from '@/components/dictionary/dict-select';
import { UserSelect } from '@/components/ui/user-select';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus,
  LayoutGrid,
  List,
  Search,
  Calendar,
  Clock,
  User,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  PlayCircle,
  XCircle,
  Loader2,
  Edit,
  Trash2,
  Target,
  ArrowRight,
  Building2,
  Briefcase,
} from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

// 任务类型
interface Task {
  id: number;
  taskName: string;
  taskType: string;
  description: string | null;
  assigneeId: number | null;
  assigneeName?: string;
  estimatedHours: number | null;
  actualHours: number | null;
  startDate: string | null;
  dueDate: string | null;
  completedDate: string | null;
  status: string;
  priority: string;
  progress: number;
  createdAt: string;
  updatedAt: string;
}

interface PersonalTask {
  id: string;
  type: 'alert' | 'assigned';
  title: string;
  description: string | null;
  status: string;
  priority?: string;
  severity?: string;
  progress?: number;
  startDate?: string | null;
  dueDate?: string | null;
  estimatedHours?: number | null;
  actualHours?: number | null;
  relatedType?: string | null;
  relatedId?: number | null;
  relatedName?: string;
  projectId?: number | null;
  projectName?: string;
  taskType?: string | null;
  ruleName?: string | null;
  createdAt: string;
}

// 任务统计
interface TaskStats {
  total: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
}

interface PersonalTaskStats {
  total: number;
  alertCount: number;
  assignedCount: number;
  pending: number;
  completed: number;
}

// 用户选项
interface UserOption {
  id: number;
  realName: string;
  username: string;
}

// 状态配置
const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: '待处理', color: 'bg-gray-100 text-gray-700', icon: <Clock className="h-4 w-4" /> },
  in_progress: { label: '进行中', color: 'bg-blue-100 text-blue-700', icon: <PlayCircle className="h-4 w-4" /> },
  completed: { label: '已完成', color: 'bg-green-100 text-green-700', icon: <CheckCircle className="h-4 w-4" /> },
  cancelled: { label: '已取消', color: 'bg-red-100 text-red-700', icon: <XCircle className="h-4 w-4" /> },
};

// 优先级配置
const priorityConfig: Record<string, { label: string; color: string }> = {
  low: { label: '低', color: 'bg-gray-100 text-gray-700' },
  medium: { label: '中', color: 'bg-blue-100 text-blue-700' },
  high: { label: '高', color: 'bg-orange-100 text-orange-700' },
  urgent: { label: '紧急', color: 'bg-red-100 text-red-700' },
};

export default function TasksManagementPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { toast } = useToast();

  // 数据状态
  const [tasks, setTasks] = useState<Task[]>([]);
  const [personalTasks, setPersonalTasks] = useState<PersonalTask[]>([]);
  const [stats, setStats] = useState<TaskStats | null>(null);
  const [personalStats, setPersonalStats] = useState<PersonalTaskStats>({
    total: 0,
    alertCount: 0,
    assignedCount: 0,
    pending: 0,
    completed: 0,
  });
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserOption[]>([]);

  // 视图和筛选
  const [viewMode, setViewMode] = useState<'list' | 'board'>('board');
  const [taskScope, setTaskScope] = useState<'all' | 'mine'>('all');
  const [personalTaskType, setPersonalTaskType] = useState<'all' | 'alert' | 'assigned'>('all');
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    assigneeId: '',
    taskType: '',
    search: '',
  });

  // 对话框状态
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // 项目列表
  const [projects, setProjects] = useState<{ id: number; projectName: string }[]>([]);

  // 新任务表单
  const [newTask, setNewTask] = useState({
    taskName: '',
    taskType: '',
    description: '',
    priority: 'medium',
    assigneeId: '',
    projectId: '',
    startDate: '',
    dueDate: '',
    estimatedHours: '',
  });

  // 检查认证
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login?redirect=/tasks');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    const scope = searchParams.get('scope');
    const type = searchParams.get('type');

    if (scope === 'mine') {
      setTaskScope('mine');
    } else {
      setTaskScope('all');
    }

    if (type === 'alert' || type === 'assigned') {
      setPersonalTaskType(type);
    } else {
      setPersonalTaskType('all');
    }
  }, [searchParams]);

  // 获取项目列表
  const fetchProjects = useCallback(async () => {
    try {
      const response = await fetch('/api/projects?pageSize=100');
      const result = await response.json();
      if (result.success || result.data) {
        const projectList = result.data?.projects || result.data || [];
        setProjects(projectList.map((p: any) => ({ id: p.id, projectName: p.projectName })));
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // 获取任务列表
  const fetchTasks = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      if (taskScope === 'mine') {
        const typeParam = personalTaskType === 'all' ? 'all' : personalTaskType;
        const { data: result } = await apiClient.get<{
          success: boolean;
          data: {
            allTasks: PersonalTask[];
            stats: PersonalTaskStats;
          };
        }>(`/api/my-tasks?type=${typeParam}&status=all`);

        if (result.success) {
          setPersonalTasks(result.data.allTasks);
          setPersonalStats(result.data.stats);
        }
      } else {
        const params = new URLSearchParams();
        if (filters.status) params.set('status', filters.status);
        if (filters.priority) params.set('priority', filters.priority);
        if (filters.taskType) params.set('taskType', filters.taskType);
        if (filters.search) params.set('search', filters.search);
        if (filters.assigneeId) {
          params.set('assigneeId', filters.assigneeId);
        }
        params.set('pageSize', '100');

        const response = await fetch(`/api/tasks?${params}`);
        const result = await response.json();

        if (result.success) {
          const taskList = result.data.tasks || [];
          setTasks(taskList);

          const statsData: TaskStats = {
            total: taskList.length,
            byStatus: {},
            byPriority: {},
          };
          taskList.forEach((task: Task) => {
            statsData.byStatus[task.status] = (statsData.byStatus[task.status] || 0) + 1;
            statsData.byPriority[task.priority] = (statsData.byPriority[task.priority] || 0) + 1;
          });
          setStats(statsData);
        }
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
      toast({
        variant: 'destructive',
        title: '获取任务失败',
        description: '请稍后重试',
      });
    } finally {
      setLoading(false);
    }
  }, [user, filters, taskScope, personalTaskType, toast]);

  // 获取用户列表
  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      const result = await response.json();
      if (result.success || Array.isArray(result.data)) {
        setUsers(result.data || result || []);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchTasks();
      fetchUsers();
    }
  }, [isAuthenticated, fetchTasks]);

  const handleTaskScopeChange = (value: 'all' | 'mine') => {
    setTaskScope(value);
    const params = new URLSearchParams(searchParams.toString());
    if (value === 'mine') {
      params.set('scope', 'mine');
    } else {
      params.delete('scope');
    }
    const query = params.toString();
    router.replace(query ? `/tasks?${query}` : '/tasks');
  };

  // 创建任务
  const handleCreateTask = async () => {
    if (!newTask.taskName) {
      toast({
        variant: 'destructive',
        title: '验证失败',
        description: '请填写任务名称',
      });
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskName: newTask.taskName,
          taskType: newTask.taskType || null,
          description: newTask.description || null,
          priority: newTask.priority,
          assigneeId: newTask.assigneeId ? parseInt(newTask.assigneeId) : null,
          projectId: newTask.projectId ? parseInt(newTask.projectId) : null,
          startDate: newTask.startDate || null,
          dueDate: newTask.dueDate || null,
          estimatedHours: newTask.estimatedHours ? parseFloat(newTask.estimatedHours) : null,
        }),
      });

      const result = await response.json();
      if (result.success) {
        toast({ title: '任务创建成功' });
        setShowCreateDialog(false);
        setNewTask({
          taskName: '',
          taskType: '',
          description: '',
          priority: 'medium',
          assigneeId: '',
          projectId: '',
          startDate: '',
          dueDate: '',
          estimatedHours: '',
        });
        fetchTasks();
      } else {
        // API 返回的错误格式: { success: false, error: { code, message } }
        const errorMsg = result.error?.message || result.error || '创建失败';
        throw new Error(typeof errorMsg === 'string' ? errorMsg : '创建失败');
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '创建任务失败',
        description: error instanceof Error ? error.message : '请稍后重试',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // 更新任务状态
  const handleStatusChange = async (taskId: number, newStatus: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      const result = await response.json();
      if (result.success) {
        toast({ title: '任务状态已更新' });
        fetchTasks();
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '更新失败',
        description: '请稍后重试',
      });
    }
  };

  // 编辑任务
  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setShowEditDialog(true);
  };

  // 查看任务详情
  const handleViewTask = (task: Task) => {
    setSelectedTask(task);
    setShowDetailDialog(true);
  };

  // 保存编辑
  const handleSaveEdit = async () => {
    if (!editingTask) return;
    
    setSubmitting(true);
    try {
      const response = await fetch(`/api/tasks/${editingTask.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskName: editingTask.taskName,
          taskType: editingTask.taskType,
          description: editingTask.description,
          priority: editingTask.priority,
          assigneeId: editingTask.assigneeId,
          startDate: editingTask.startDate,
          dueDate: editingTask.dueDate,
          estimatedHours: editingTask.estimatedHours,
          status: editingTask.status,
        }),
      });

      const result = await response.json();
      if (result.success) {
        toast({ title: '任务更新成功' });
        setShowEditDialog(false);
        setEditingTask(null);
        fetchTasks();
      } else {
        // 正确提取错误消息 - result.error 可能是对象 {code, message} 或字符串
        const errorMsg = typeof result.error === 'object' && result.error !== null
          ? (result.error.message || JSON.stringify(result.error))
          : (result.error || '更新失败');
        throw new Error(errorMsg);
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '更新任务失败',
        description: error instanceof Error ? error.message : '请稍后重试',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // 删除任务
  const handleDeleteTask = async (taskId: number) => {
    if (!confirm('确定要删除这个任务吗？')) return;

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      if (result.success) {
        toast({ title: '任务已删除' });
        fetchTasks();
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '删除失败',
        description: '请稍后重试',
      });
    }
  };

  // 按状态分组（看板视图）
  const tasksByStatus = {
    pending: tasks.filter(t => t.status === 'pending'),
    in_progress: tasks.filter(t => t.status === 'in_progress'),
    completed: tasks.filter(t => t.status === 'completed'),
    cancelled: tasks.filter(t => t.status === 'cancelled'),
  };

  const getSeverityStyle = (severity: string) => {
    const styles: Record<string, string> = {
      critical: 'bg-red-500/10 text-red-600 border-red-500/20',
      high: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
      medium: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
      low: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    };
    return styles[severity] || styles.medium;
  };

  const getSeverityLabel = (severity: string) => {
    const labels: Record<string, string> = {
      critical: '紧急',
      high: '高',
      medium: '中',
      low: '低',
    };
    return labels[severity] || '中';
  };

  const renderPersonalTaskCard = (task: PersonalTask) => {
    const isAlert = task.type === 'alert';

    return (
      <Card key={task.id} className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                {isAlert ? (
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                ) : (
                  <Briefcase className="h-4 w-4 text-blue-500" />
                )}
                <span className="font-medium">{task.title}</span>
                <Badge variant="outline" className={isAlert ? 'bg-orange-500/10 text-orange-600' : 'bg-blue-500/10 text-blue-600'}>
                  {isAlert ? '预警任务' : '指派任务'}
                </Badge>
              </div>
              {task.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">{task.description}</p>
              )}
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                {isAlert ? (
                  <>
                    {task.ruleName && (
                      <span className="flex items-center gap-1">
                        <Target className="h-3 w-3" />
                        {task.ruleName}
                      </span>
                    )}
                    {task.relatedName && (
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {task.relatedName}
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    {task.taskType && (
                      <Badge variant="outline" className="text-xs">{task.taskType}</Badge>
                    )}
                    {task.projectName && (
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {task.projectName}
                      </span>
                    )}
                    {task.dueDate && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        截止: {format(new Date(task.dueDate), 'MM-dd', { locale: zhCN })}
                      </span>
                    )}
                    {task.progress !== undefined && task.progress > 0 && (
                      <span className="flex items-center gap-1">进度: {task.progress}%</span>
                    )}
                  </>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              {isAlert && task.severity && (
                <Badge variant="outline" className={getSeverityStyle(task.severity)}>
                  {getSeverityLabel(task.severity)}
                </Badge>
              )}
              {!isAlert && task.priority && (
                <Badge variant="outline" className={priorityConfig[task.priority]?.color || priorityConfig.medium.color}>
                  {priorityConfig[task.priority]?.label || priorityConfig.medium.label}
                </Badge>
              )}
              <Badge variant="outline" className={statusConfig[task.status]?.color || statusConfig.pending.color}>
                {statusConfig[task.status]?.label || statusConfig.pending.label}
              </Badge>
              {task.relatedId && (
                <Button variant="ghost" size="sm" asChild>
                  <a href={isAlert ? '/alerts/histories?status=pending' : '/tasks?scope=mine'}>
                    查看详情
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </a>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (authLoading || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6" data-testid="tasks-page">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">任务中心</h1>
          <p className="text-muted-foreground">
            统一管理项目任务与个人任务视角，当前以项目任务为主，支持任务分配、状态跟踪和优先级管理。
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            💡 <strong>概念说明</strong>：任务中心是唯一 canonical 任务页面；“我的任务”现在作为任务中心中的个人视角呈现。
            <a href="/workbench" className="text-primary hover:underline ml-1">前往工作台查看待办和日程 →</a>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <a href="/tasks?scope=mine">
              <User className="h-4 w-4 mr-2" />
              查看我的任务视角
            </a>
          </Button>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            新建任务
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      {taskScope === 'mine' ? (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">我的全部任务</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{personalStats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">预警任务</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{personalStats.alertCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">指派任务</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-700">{personalStats.assignedCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">待处理</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{personalStats.pending}</div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">全部任务</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold overflow-hidden text-ellipsis">{stats?.total || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">待处理</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-700 overflow-hidden text-ellipsis">{stats?.byStatus.pending || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">进行中</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-700 overflow-hidden text-ellipsis">{stats?.byStatus.in_progress || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">已完成</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-700 overflow-hidden text-ellipsis">{stats?.byStatus.completed || 0}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 筛选栏 */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4">
            {/* 任务范围筛选 */}
            <Tabs value={taskScope} onValueChange={(v) => handleTaskScopeChange(v as 'all' | 'mine')}>
              <TabsList>
                <TabsTrigger value="all">任务中心</TabsTrigger>
                <TabsTrigger value="mine">我的任务视角</TabsTrigger>
              </TabsList>
            </Tabs>
            {taskScope === 'mine' ? (
              <Tabs value={personalTaskType} onValueChange={(v) => setPersonalTaskType(v as 'all' | 'alert' | 'assigned')}>
                <TabsList>
                  <TabsTrigger value="all">全部</TabsTrigger>
                  <TabsTrigger value="alert">预警任务</TabsTrigger>
                  <TabsTrigger value="assigned">指派任务</TabsTrigger>
                </TabsList>
              </Tabs>
            ) : (
              <>
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="搜索任务..."
                      value={filters.search}
                      onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                      className="pl-9"
                    />
                  </div>
                </div>
                <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v })}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="状态" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部状态</SelectItem>
                    <SelectItem value="pending">待处理</SelectItem>
                    <SelectItem value="in_progress">进行中</SelectItem>
                    <SelectItem value="completed">已完成</SelectItem>
                    <SelectItem value="cancelled">已取消</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filters.priority} onValueChange={(v) => setFilters({ ...filters, priority: v })}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="优先级" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部优先级</SelectItem>
                    <SelectItem value="low">低</SelectItem>
                    <SelectItem value="medium">中</SelectItem>
                    <SelectItem value="high">高</SelectItem>
                    <SelectItem value="urgent">紧急</SelectItem>
                  </SelectContent>
                </Select>
                <DictSelect
                  category="task_type"
                  value={filters.taskType === 'all' ? '' : filters.taskType}
                  onValueChange={(v) => setFilters({ ...filters, taskType: v || 'all' })}
                  placeholder="任务类型"
                  className="w-[160px]"
                  allowClear
                />
                <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'list' | 'board')}>
                  <TabsList>
                    <TabsTrigger value="board">
                      <LayoutGrid className="h-4 w-4 mr-1" />
                      看板
                    </TabsTrigger>
                    <TabsTrigger value="list">
                      <List className="h-4 w-4 mr-1" />
                      列表
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 任务内容 */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : taskScope === 'mine' ? (
        personalTasks.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <Target className="h-12 w-12 mb-4" />
              <p className="text-lg font-medium">当前视角暂无任务</p>
              <p className="text-sm">可切换到任务中心查看全部项目任务</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {personalTasks.map(renderPersonalTaskCard)}
          </div>
        )
      ) : tasks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <AlertCircle className="h-12 w-12 mb-4" />
            <p className="text-lg font-medium">暂无任务</p>
            <p className="text-sm">点击"新建任务"开始创建您的第一个任务</p>
          </CardContent>
        </Card>
      ) : viewMode === 'board' ? (
        /* 看板视图 */
        <div className="grid gap-4 md:grid-cols-4">
          {Object.entries(tasksByStatus).map(([status, statusTasks]) => (
            <div key={status} className="space-y-3">
              <div className="flex items-center justify-between">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${statusConfig[status]?.color}`}>
                  {statusConfig[status]?.icon}
                  <span className="font-medium">{statusConfig[status]?.label}</span>
                </div>
                <Badge variant="secondary">{statusTasks.length}</Badge>
              </div>
              <div className="space-y-2">
                {statusTasks.map((task) => (
                  <Card
                    key={task.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => handleViewTask(task)}
                  >
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="font-medium line-clamp-2">{task.taskName}</div>
                          <Badge className={priorityConfig[task.priority]?.color}>
                            {priorityConfig[task.priority]?.label}
                          </Badge>
                        </div>
                        {task.taskType && (
                          <div className="text-sm text-muted-foreground">
                            类型：{task.taskType}
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {task.dueDate && (
                            <>
                              <Calendar className="h-3 w-3" />
                              {format(new Date(task.dueDate), 'MM-dd', { locale: zhCN })}
                            </>
                          )}
                          {task.assigneeName && (
                            <>
                              <User className="h-3 w-3" />
                              {task.assigneeName}
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-2 pt-2 border-t" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2"
                            onClick={() => handleEditTask(task)}
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            编辑
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-destructive"
                            onClick={() => handleDeleteTask(task.id)}
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            删除
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* 列表视图 */
        <Card>
          <CardContent className="p-0">
            <table className="w-full">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="text-left p-4 font-medium">任务名称</th>
                  <th className="text-left p-4 font-medium">任务类型</th>
                  <th className="text-left p-4 font-medium">状态</th>
                  <th className="text-left p-4 font-medium">优先级</th>
                  <th className="text-left p-4 font-medium">负责人</th>
                  <th className="text-left p-4 font-medium">截止日期</th>
                  <th className="text-left p-4 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <tr key={task.id} className="border-b hover:bg-muted/50">
                    <td className="p-4 max-w-[200px]">
                      <span className="font-medium truncate block" title={task.taskName}>{task.taskName}</span>
                    </td>
                    <td className="p-4 max-w-[120px]">
                      <span className="text-muted-foreground truncate block" title={task.taskType || ''}>{task.taskType || '-'}</span>
                    </td>
                    <td className="p-4">
                      <Badge className={statusConfig[task.status]?.color}>
                        {statusConfig[task.status]?.label}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <Badge className={priorityConfig[task.priority]?.color}>
                        {priorityConfig[task.priority]?.label}
                      </Badge>
                    </td>
                    <td className="p-4 text-muted-foreground">{task.assigneeName || '-'}</td>
                    <td className="p-4 text-muted-foreground">
                      {task.dueDate ? format(new Date(task.dueDate), 'yyyy-MM-dd') : '-'}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditTask(task)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => handleDeleteTask(task.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* 新建任务对话框 */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>新建任务</DialogTitle>
            <DialogDescription>
              创建新的任务并分配给相关人员
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>任务名称 *</Label>
              <Input
                value={newTask.taskName}
                onChange={(e) => setNewTask({ ...newTask, taskName: e.target.value })}
                placeholder="请输入任务名称"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>任务类型</Label>
                <DictSelect
                  category="task_type"
                  value={newTask.taskType}
                  onValueChange={(v) => setNewTask({ ...newTask, taskType: v })}
                  placeholder="选择类型"
                />
              </div>
              <div className="space-y-2">
                <Label>优先级</Label>
                <Select
                  value={newTask.priority}
                  onValueChange={(v) => setNewTask({ ...newTask, priority: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">低</SelectItem>
                    <SelectItem value="medium">中</SelectItem>
                    <SelectItem value="high">高</SelectItem>
                    <SelectItem value="urgent">紧急</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>负责人</Label>
              <UserSelect
                users={users}
                value={newTask.assigneeId}
                onValueChange={(v) => setNewTask({ ...newTask, assigneeId: v != null ? String(v) : '' })}
                placeholder="选择负责人"
              />
            </div>
            <div className="space-y-2">
              <Label>所属项目</Label>
              <Select
                value={newTask.projectId}
                onValueChange={(v) => setNewTask({ ...newTask, projectId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择所属项目" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id.toString()}>
                      {project.projectName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>开始日期</Label>
                <Input
                  type="date"
                  value={newTask.startDate}
                  onChange={(e) => setNewTask({ ...newTask, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>截止日期</Label>
                <Input
                  type="date"
                  value={newTask.dueDate}
                  onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>预计工时（小时）</Label>
              <Input
                type="number"
                value={newTask.estimatedHours}
                onChange={(e) => setNewTask({ ...newTask, estimatedHours: e.target.value })}
                placeholder="请输入预计工时"
              />
            </div>
            <div className="space-y-2">
              <Label>任务描述</Label>
              <Textarea
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                placeholder="请输入任务描述"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              取消
            </Button>
            <Button onClick={handleCreateTask} disabled={submitting}>
              {submitting ? '创建中...' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑任务对话框 */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>编辑任务</DialogTitle>
            <DialogDescription>
              修改任务信息
            </DialogDescription>
          </DialogHeader>
          {editingTask && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>任务名称 *</Label>
                <Input
                  value={editingTask.taskName}
                  onChange={(e) => setEditingTask({ ...editingTask, taskName: e.target.value })}
                  placeholder="请输入任务名称"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>任务类型</Label>
                  <DictSelect
                    category="task_type"
                    value={editingTask.taskType || ''}
                    onValueChange={(v) => setEditingTask({ ...editingTask, taskType: v })}
                    placeholder="选择类型"
                  />
                </div>
                <div className="space-y-2">
                  <Label>优先级</Label>
                  <Select
                    value={editingTask.priority}
                    onValueChange={(v) => setEditingTask({ ...editingTask, priority: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">低</SelectItem>
                      <SelectItem value="medium">中</SelectItem>
                      <SelectItem value="high">高</SelectItem>
                      <SelectItem value="urgent">紧急</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>状态</Label>
                  <Select
                    value={editingTask.status}
                    onValueChange={(v) => setEditingTask({ ...editingTask, status: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">待处理</SelectItem>
                      <SelectItem value="in_progress">进行中</SelectItem>
                      <SelectItem value="completed">已完成</SelectItem>
                      <SelectItem value="cancelled">已取消</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>负责人</Label>
                  <UserSelect
                    users={users}
                    value={editingTask.assigneeId ? String(editingTask.assigneeId) : ''}
                    onValueChange={(v) => setEditingTask({ ...editingTask, assigneeId: v != null ? parseInt(String(v)) : null })}
                    placeholder="选择负责人"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>开始日期</Label>
                  <Input
                    type="date"
                    value={editingTask.startDate || ''}
                    onChange={(e) => setEditingTask({ ...editingTask, startDate: e.target.value || null })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>截止日期</Label>
                  <Input
                    type="date"
                    value={editingTask.dueDate || ''}
                    onChange={(e) => setEditingTask({ ...editingTask, dueDate: e.target.value || null })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>预计工时（小时）</Label>
                <Input
                  type="number"
                  value={editingTask.estimatedHours || ''}
                  onChange={(e) => setEditingTask({ ...editingTask, estimatedHours: e.target.value ? parseFloat(e.target.value) : null })}
                  placeholder="请输入预计工时"
                />
              </div>
              <div className="space-y-2">
                <Label>任务描述</Label>
                <Textarea
                  value={editingTask.description || ''}
                  onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
                  placeholder="请输入任务描述"
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              取消
            </Button>
            <Button onClick={handleSaveEdit} disabled={submitting}>
              {submitting ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 任务详情弹窗 */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>任务详情</DialogTitle>
          </DialogHeader>
          {selectedTask && (
            <div className="space-y-4">
              <div className="space-y-1">
                <Label className="text-muted-foreground">任务名称</Label>
                <div className="text-lg font-medium">{selectedTask.taskName}</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-muted-foreground">状态</Label>
                  <div>
                    <Badge className={statusConfig[selectedTask.status]?.color}>
                      {statusConfig[selectedTask.status]?.label}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground">优先级</Label>
                  <div>
                    <Badge className={priorityConfig[selectedTask.priority]?.color}>
                      {priorityConfig[selectedTask.priority]?.label}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-muted-foreground">任务类型</Label>
                  <div>{selectedTask.taskType || '-'}</div>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground">负责人</Label>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    {selectedTask.assigneeName || '未分配'}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-muted-foreground">开始日期</Label>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    {selectedTask.startDate ? format(new Date(selectedTask.startDate), 'yyyy-MM-dd', { locale: zhCN }) : '-'}
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground">截止日期</Label>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    {selectedTask.dueDate ? format(new Date(selectedTask.dueDate), 'yyyy-MM-dd', { locale: zhCN }) : '-'}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-muted-foreground">预计工时</Label>
                  <div>{selectedTask.estimatedHours ? `${selectedTask.estimatedHours} 小时` : '-'}</div>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground">实际工时</Label>
                  <div>{selectedTask.actualHours ? `${selectedTask.actualHours} 小时` : '-'}</div>
                </div>
              </div>
              {selectedTask.description && (
                <div className="space-y-1">
                  <Label className="text-muted-foreground">任务描述</Label>
                  <div className="text-sm bg-muted/50 p-3 rounded-lg whitespace-pre-wrap">
                    {selectedTask.description}
                  </div>
                </div>
              )}
              <div className="text-xs text-muted-foreground pt-2 border-t">
                创建时间：{format(new Date(selectedTask.createdAt), 'yyyy-MM-dd HH:mm', { locale: zhCN })}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
              关闭
            </Button>
            <Button onClick={() => {
              setShowDetailDialog(false);
              if (selectedTask) {
                handleEditTask(selectedTask);
              }
            }}>
              <Edit className="h-4 w-4 mr-2" />
              编辑
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
