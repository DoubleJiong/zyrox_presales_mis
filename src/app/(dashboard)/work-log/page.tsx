'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Progress } from '@/components/ui/progress';
import {
  FileText,
  Plus,
  Calendar,
  Clock,
  TrendingUp,
  BarChart3,
  PieChart,
  Download,
  Filter,
  Search,
  Edit,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Timer,
  Target,
  Award,
  Briefcase,
  Users,
} from 'lucide-react';
import { format, subDays, startOfWeek, endOfWeek, eachDayOfInterval, parseISO, isAfter, isBefore, isSameDay } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import ReactECharts from 'echarts-for-react';

// =====================================================
// 类型定义
// =====================================================

interface WorkLog {
  id: string;
  date: Date;
  projectId?: string;
  projectName?: string;
  customerId?: string;
  customerName?: string;
  type: 'development' | 'meeting' | 'visit' | 'documentation' | 'communication' | 'other';
  content: string;
  duration: number; // 分钟
  progress?: number;
  issues?: string;
  nextPlan?: string;
  mood: 'great' | 'good' | 'normal' | 'bad';
  createdAt: Date;
  updatedAt: Date;
}

interface WorkStatistics {
  totalHours: number;
  avgHoursPerDay: number;
  projectDistribution: { name: string; value: number }[];
  typeDistribution: { name: string; value: number }[];
  weeklyTrend: { date: string; hours: number }[];
  moodDistribution: { name: string; value: number }[];
  topProjects: { name: string; value: number }[];
}

// =====================================================
// 模拟数据
// =====================================================

const generateMockLogs = (): WorkLog[] => {
  const logs: WorkLog[] = [];
  const today = new Date();

  // 最近两周的日志
  for (let i = 0; i < 14; i++) {
    const date = subDays(today, i);

    // 每天1-3条日志
    const count = Math.floor(Math.random() * 3) + 1;
    for (let j = 0; j < count; j++) {
      const types: WorkLog['type'][] = ['development', 'meeting', 'visit', 'documentation', 'communication', 'other'];
      const moods: WorkLog['mood'][] = ['great', 'good', 'normal', 'bad'];
      const projects = ['智慧校园项目', '医院信息化项目', '政务服务平台', '企业OA系统'];
      const customers = ['市教育局', '市人民医院', '区政府', '科技公司'];

      const type = types[Math.floor(Math.random() * types.length)];
      const hasProject = Math.random() > 0.3;
      const hasCustomer = Math.random() > 0.5;

      logs.push({
        id: `log-${date.getTime()}-${j}`,
        date,
        projectId: hasProject ? `proj-${Math.floor(Math.random() * 4)}` : undefined,
        projectName: hasProject ? projects[Math.floor(Math.random() * projects.length)] : undefined,
        customerId: hasCustomer ? `cust-${Math.floor(Math.random() * 4)}` : undefined,
        customerName: hasCustomer ? customers[Math.floor(Math.random() * customers.length)] : undefined,
        type,
        content: getMockContent(type),
        duration: Math.floor(Math.random() * 240) + 30,
        progress: type === 'development' ? Math.floor(Math.random() * 100) : undefined,
        issues: Math.random() > 0.7 ? '遇到技术难点，需要技术支持' : undefined,
        nextPlan: Math.random() > 0.5 ? '继续推进模块开发' : undefined,
        mood: moods[Math.floor(Math.random() * moods.length)],
        createdAt: date,
        updatedAt: date,
      });
    }
  }

  return logs.sort((a, b) => b.date.getTime() - a.date.getTime());
};

const getMockContent = (type: WorkLog['type']): string => {
  const contents: Record<WorkLog['type'], string[]> = {
    development: [
      '完成用户管理模块开发',
      '优化系统性能，提升响应速度',
      '修复若干已知问题',
      '编写单元测试代码',
      '实现数据导出功能',
    ],
    meeting: [
      '参加项目进度评审会',
      '组织技术方案讨论会',
      '与客户沟通需求变更',
      '团队周例会',
      '产品演示会',
    ],
    visit: [
      '客户现场调研需求',
      '项目实施现场支持',
      '客户回访与需求收集',
      '项目验收现场支持',
    ],
    documentation: [
      '编写技术方案文档',
      '整理项目周报',
      '编写用户操作手册',
      '更新系统设计文档',
    ],
    communication: [
      '与客户电话沟通需求',
      '协调跨部门资源',
      '解答客户技术问题',
      '跟进项目进度',
    ],
    other: [
      '处理日常事务',
      '参加培训学习',
      '整理工作资料',
    ],
  };

  const list = contents[type];
  return list[Math.floor(Math.random() * list.length)];
};

// =====================================================
// 主组件
// =====================================================

export default function WorkLogPage() {
  const [logs, setLogs] = useState<WorkLog[]>(generateMockLogs);
  const [activeTab, setActiveTab] = useState('list');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<WorkLog | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<{ start?: Date; end?: Date }>({});

  // 日志表单
  const [logForm, setLogForm] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    type: 'development' as WorkLog['type'],
    projectName: '',
    customerName: '',
    content: '',
    duration: 120,
    progress: 0,
    issues: '',
    nextPlan: '',
    mood: 'good' as WorkLog['mood'],
  });

  // 过滤日志
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // 关键词过滤
      if (searchKeyword) {
        const keyword = searchKeyword.toLowerCase();
        if (
          !(log.content?.toLowerCase() || '').includes(keyword) &&
          !(log.projectName?.toLowerCase() || '').includes(keyword) &&
          !(log.customerName?.toLowerCase() || '').includes(keyword)
        ) {
          return false;
        }
      }

      // 类型过滤
      if (filterType !== 'all' && log.type !== filterType) {
        return false;
      }

      // 日期过滤
      if (filterDate.start && isBefore(log.date, filterDate.start)) {
        return false;
      }
      if (filterDate.end && isAfter(log.date, filterDate.end)) {
        return false;
      }

      return true;
    });
  }, [logs, searchKeyword, filterType, filterDate]);

  // 统计数据
  const statistics: WorkStatistics = useMemo(() => {
    const totalMinutes = logs.reduce((sum, log) => sum + log.duration, 0);
    const totalHours = Math.round(totalMinutes / 60 * 10) / 10;
    const uniqueDays = new Set(logs.map((log) => format(log.date, 'yyyy-MM-dd'))).size;

    // 项目分布
    const projectMap = new Map<string, number>();
    logs.forEach((log) => {
      if (log.projectName) {
        projectMap.set(log.projectName, (projectMap.get(log.projectName) || 0) + log.duration);
      }
    });
    const projectDistribution = Array.from(projectMap.entries())
      .map(([name, value]) => ({ name, value: Math.round(value / 60 * 10) / 10 }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    // 类型分布
    const typeMap = new Map<string, number>();
    logs.forEach((log) => {
      typeMap.set(log.type, (typeMap.get(log.type) || 0) + log.duration);
    });
    const typeDistribution = Array.from(typeMap.entries())
      .map(([name, value]) => ({
        name: getTypeLabel(name as WorkLog['type']),
        value: Math.round(value / 60 * 10) / 10,
      }));

    // 周趋势
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
    const weeklyTrend = weekDays.map((day) => {
      const dayLogs = logs.filter((log) => isSameDay(log.date, day));
      const hours = dayLogs.reduce((sum, log) => sum + log.duration, 0) / 60;
      return {
        date: format(day, 'MM-dd'),
        hours: Math.round(hours * 10) / 10,
      };
    });

    // 心情分布
    const moodMap = new Map<string, number>();
    logs.forEach((log) => {
      moodMap.set(log.mood, (moodMap.get(log.mood) || 0) + 1);
    });
    const moodDistribution = Array.from(moodMap.entries())
      .map(([name, value]) => ({
        name: getMoodLabel(name as WorkLog['mood']),
        value,
      }));

    return {
      totalHours,
      avgHoursPerDay: uniqueDays > 0 ? Math.round(totalHours / uniqueDays * 10) / 10 : 0,
      projectDistribution,
      typeDistribution,
      weeklyTrend,
      moodDistribution,
      topProjects: projectDistribution,
    };
  }, [logs]);

  // 保存日志
  const handleSaveLog = () => {
    const newLog: WorkLog = {
      id: `log-${crypto.randomUUID()}`,
      date: parseISO(logForm.date),
      type: logForm.type,
      projectName: logForm.projectName || undefined,
      customerName: logForm.customerName || undefined,
      content: logForm.content,
      duration: logForm.duration,
      progress: logForm.type === 'development' ? logForm.progress : undefined,
      issues: logForm.issues || undefined,
      nextPlan: logForm.nextPlan || undefined,
      mood: logForm.mood,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    setLogs([newLog, ...logs]);
    setDialogOpen(false);
    resetForm();
  };

  // 重置表单
  const resetForm = () => {
    setLogForm({
      date: format(new Date(), 'yyyy-MM-dd'),
      type: 'development',
      projectName: '',
      customerName: '',
      content: '',
      duration: 120,
      progress: 0,
      issues: '',
      nextPlan: '',
      mood: 'good',
    });
    setSelectedLog(null);
  };

  // 删除日志
  const handleDeleteLog = (id: string) => {
    setLogs(logs.filter((log) => log.id !== id));
  };

  // 导出报告
  const handleExportReport = () => {
    // 生成CSV数据
    const headers = ['日期', '类型', '项目', '客户', '内容', '时长(小时)', '进度', '问题', '计划', '心情'];
    const rows = logs.map((log) => [
      format(log.date, 'yyyy-MM-dd'),
      getTypeLabel(log.type),
      log.projectName || '',
      log.customerName || '',
      log.content,
      (log.duration / 60).toFixed(1),
      log.progress || '',
      log.issues || '',
      log.nextPlan || '',
      getMoodLabel(log.mood),
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `工作日志_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // 获取类型标签
  const getTypeLabel = (type: WorkLog['type']): string => {
    const labels: Record<WorkLog['type'], string> = {
      development: '开发工作',
      meeting: '会议',
      visit: '外出拜访',
      documentation: '文档编写',
      communication: '沟通协调',
      other: '其他',
    };
    return labels[type];
  };

  // 获取类型颜色
  const getTypeColor = (type: WorkLog['type']): string => {
    const colors: Record<WorkLog['type'], string> = {
      development: '#3b82f6',
      meeting: '#8b5cf6',
      visit: '#10b981',
      documentation: '#f59e0b',
      communication: '#06b6d4',
      other: '#6b7280',
    };
    return colors[type];
  };

  // 获取心情标签
  const getMoodLabel = (mood: WorkLog['mood']): string => {
    const labels: Record<WorkLog['mood'], string> = {
      great: '非常棒',
      good: '还不错',
      normal: '一般',
      bad: '不太好',
    };
    return labels[mood];
  };

  // 获取心情图标
  const getMoodIcon = (mood: WorkLog['mood']) => {
    const colors: Record<WorkLog['mood'], string> = {
      great: 'text-green-500',
      good: 'text-blue-500',
      normal: 'text-yellow-500',
      bad: 'text-red-500',
    };
    return <Award className={`w-4 h-4 ${colors[mood]}`} />;
  };

  // 类型分布饼图配置
  const typeChartOption = {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c}小时 ({d}%)',
    },
    legend: {
      orient: 'vertical',
      right: 10,
      top: 'center',
      textStyle: { color: '#94a3b8' },
    },
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['40%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 8,
          borderColor: '#0f172a',
          borderWidth: 2,
        },
        label: { show: false },
        emphasis: {
          label: { show: true, fontSize: 14, fontWeight: 'bold' },
        },
        data: statistics.typeDistribution,
      },
    ],
  };

  // 周趋势图配置
  const weeklyTrendOption = {
    tooltip: {
      trigger: 'axis',
      formatter: '{b}<br />{a}: {c}小时',
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: statistics.weeklyTrend.map((d) => d.date),
      axisLine: { lineStyle: { color: '#334155' } },
      axisLabel: { color: '#94a3b8' },
    },
    yAxis: {
      type: 'value',
      name: '小时',
      axisLine: { lineStyle: { color: '#334155' } },
      axisLabel: { color: '#94a3b8' },
      splitLine: { lineStyle: { color: '#1e293b' } },
    },
    series: [
      {
        name: '工作时长',
        type: 'bar',
        data: statistics.weeklyTrend.map((d) => d.hours),
        itemStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: '#3b82f6' },
              { offset: 1, color: '#1e40af' },
            ],
          },
          borderRadius: [4, 4, 0, 0],
        },
      },
    ],
  };

  // 项目分布图配置
  const projectChartOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: '{b}: {c}小时',
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true,
    },
    xAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: '#334155' } },
      axisLabel: { color: '#94a3b8' },
      splitLine: { lineStyle: { color: '#1e293b' } },
    },
    yAxis: {
      type: 'category',
      data: statistics.topProjects.map((p) => p.name).reverse(),
      axisLine: { lineStyle: { color: '#334155' } },
      axisLabel: { color: '#94a3b8', width: 100, overflow: 'truncate' },
    },
    series: [
      {
        type: 'bar',
        data: statistics.topProjects.map((p) => p.value).reverse(),
        itemStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 1, y2: 0,
            colorStops: [
              { offset: 0, color: '#10b981' },
              { offset: 1, color: '#059669' },
            ],
          },
          borderRadius: [0, 4, 4, 0],
        },
        barWidth: 16,
      },
    ],
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <FileText className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">工作日志</h1>
              <p className="text-muted-foreground text-sm">
                日志记录、统计分析与导出报告
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleExportReport}>
              <Download className="w-4 h-4 mr-2" />
              导出报告
            </Button>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              记录日志
            </Button>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-card/50 backdrop-blur border-border/50">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <Timer className="w-8 h-8 text-blue-400" />
                <div>
                  <p className="text-sm text-muted-foreground">累计工时</p>
                  <p className="text-2xl font-bold">{statistics.totalHours}h</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur border-border/50">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-8 h-8 text-green-400" />
                <div>
                  <p className="text-sm text-muted-foreground">日均工时</p>
                  <p className="text-2xl font-bold">{statistics.avgHoursPerDay}h</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur border-border/50">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <Target className="w-8 h-8 text-yellow-400" />
                <div>
                  <p className="text-sm text-muted-foreground">参与项目</p>
                  <p className="text-2xl font-bold">{statistics.topProjects.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur border-border/50">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <FileText className="w-8 h-8 text-purple-400" />
                <div>
                  <p className="text-sm text-muted-foreground">日志总数</p>
                  <p className="text-2xl font-bold">{logs.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 主内容区 */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-card/50">
            <TabsTrigger value="list" className="gap-2">
              <FileText className="w-4 h-4" />
              日志列表
            </TabsTrigger>
            <TabsTrigger value="statistics" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              统计分析
            </TabsTrigger>
          </TabsList>

          {/* 日志列表 Tab */}
          <TabsContent value="list" className="space-y-4 mt-4">
            {/* 过滤器 */}
            <Card className="bg-card/50 backdrop-blur border-border/50">
              <CardContent className="py-3">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                    <Search className="w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="搜索日志内容..."
                      value={searchKeyword}
                      onChange={(e) => setSearchKeyword(e.target.value)}
                      className="border-0 bg-transparent focus-visible:ring-0"
                    />
                  </div>

                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="类型" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部类型</SelectItem>
                      <SelectItem value="development">开发工作</SelectItem>
                      <SelectItem value="meeting">会议</SelectItem>
                      <SelectItem value="visit">外出拜访</SelectItem>
                      <SelectItem value="documentation">文档编写</SelectItem>
                      <SelectItem value="communication">沟通协调</SelectItem>
                      <SelectItem value="other">其他</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* 日志列表 */}
            <div className="space-y-3">
              {filteredLogs.map((log) => (
                <Card
                  key={log.id}
                  className="bg-card/50 backdrop-blur border-border/50 hover:border-primary/30 transition-colors"
                >
                  <CardContent className="py-4">
                    <div className="flex items-start gap-4">
                      {/* 类型指示器 */}
                      <div
                        className="w-1 h-full min-h-[80px] rounded-full"
                        style={{ backgroundColor: getTypeColor(log.type) }}
                      />

                      <div className="flex-1">
                        {/* 头部 */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <Badge
                              variant="outline"
                              style={{
                                borderColor: getTypeColor(log.type),
                                color: getTypeColor(log.type),
                              }}
                            >
                              {getTypeLabel(log.type)}
                            </Badge>
                            <span className="text-sm text-muted-foreground flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {format(log.date, 'yyyy-MM-dd', { locale: zhCN })}
                            </span>
                            <span className="text-sm text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {(log.duration / 60).toFixed(1)}小时
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {getMoodIcon(log.mood)}
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => handleDeleteLog(log.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        {/* 内容 */}
                        <p className="font-medium mb-2">{log.content}</p>

                        {/* 元数据 */}
                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                          {log.projectName && (
                            <span className="flex items-center gap-1">
                              <Briefcase className="w-3 h-3" />
                              {log.projectName}
                            </span>
                          )}
                          {log.customerName && (
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {log.customerName}
                            </span>
                          )}
                          {log.progress !== undefined && (
                            <span className="flex items-center gap-2">
                              <span>进度:</span>
                              <Progress value={log.progress} className="w-20 h-2" />
                              <span>{log.progress}%</span>
                            </span>
                          )}
                        </div>

                        {/* 问题和计划 */}
                        <div className="mt-3 flex flex-wrap gap-4">
                          {log.issues && (
                            <div className="flex items-start gap-2 text-sm text-yellow-500">
                              <AlertCircle className="w-4 h-4 mt-0.5" />
                              <span>问题: {log.issues}</span>
                            </div>
                          )}
                          {log.nextPlan && (
                            <div className="flex items-start gap-2 text-sm text-muted-foreground">
                              <Target className="w-4 h-4 mt-0.5" />
                              <span>计划: {log.nextPlan}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* 统计分析 Tab */}
          <TabsContent value="statistics" className="space-y-6 mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 工作类型分布 */}
              <Card className="bg-card/50 backdrop-blur border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <PieChart className="w-5 h-5" />
                    工作类型分布
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ReactECharts
                    option={typeChartOption}
                    style={{ height: '300px' }}
                    opts={{ renderer: 'canvas' }}
                  />
                </CardContent>
              </Card>

              {/* 本周工作趋势 */}
              <Card className="bg-card/50 backdrop-blur border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    本周工作趋势
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ReactECharts
                    option={weeklyTrendOption}
                    style={{ height: '300px' }}
                    opts={{ renderer: 'canvas' }}
                  />
                </CardContent>
              </Card>

              {/* 项目工时分布 */}
              <Card className="bg-card/50 backdrop-blur border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    项目工时分布
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ReactECharts
                    option={projectChartOption}
                    style={{ height: '300px' }}
                    opts={{ renderer: 'canvas' }}
                  />
                </CardContent>
              </Card>

              {/* 心情分布 */}
              <Card className="bg-card/50 backdrop-blur border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Award className="w-5 h-5" />
                    工作心情统计
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    {statistics.moodDistribution.map((item) => (
                      <div
                        key={item.name}
                        className="flex items-center justify-between p-4 rounded-lg bg-muted/30"
                      >
                        <div className="flex items-center gap-2">
                          {getMoodIcon(
                            item.name === '非常棒'
                              ? 'great'
                              : item.name === '还不错'
                              ? 'good'
                              : item.name === '一般'
                              ? 'normal'
                              : 'bad'
                          )}
                          <span className="text-sm">{item.name}</span>
                        </div>
                        <span className="text-lg font-bold">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* 新建日志对话框 */}
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>记录工作日志</DialogTitle>
              <DialogDescription>
                记录今日工作内容与心得
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>日期</Label>
                  <Input
                    type="date"
                    value={logForm.date}
                    onChange={(e) =>
                      setLogForm({ ...logForm, date: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>工作类型</Label>
                  <Select
                    value={logForm.type}
                    onValueChange={(v) =>
                      setLogForm({ ...logForm, type: v as WorkLog['type'] })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="development">开发工作</SelectItem>
                      <SelectItem value="meeting">会议</SelectItem>
                      <SelectItem value="visit">外出拜访</SelectItem>
                      <SelectItem value="documentation">文档编写</SelectItem>
                      <SelectItem value="communication">沟通协调</SelectItem>
                      <SelectItem value="other">其他</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>关联项目</Label>
                  <Input
                    placeholder="项目名称"
                    value={logForm.projectName}
                    onChange={(e) =>
                      setLogForm({ ...logForm, projectName: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>关联客户</Label>
                  <Input
                    placeholder="客户名称"
                    value={logForm.customerName}
                    onChange={(e) =>
                      setLogForm({ ...logForm, customerName: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>工作内容 *</Label>
                <Textarea
                  placeholder="描述今日工作内容..."
                  value={logForm.content}
                  onChange={(e) =>
                    setLogForm({ ...logForm, content: e.target.value })
                  }
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>工作时长: {logForm.duration} 分钟</Label>
                  <Input
                    type="range"
                    min={30}
                    max={600}
                    step={30}
                    value={logForm.duration}
                    onChange={(e) =>
                      setLogForm({
                        ...logForm,
                        duration: parseInt(e.target.value),
                      })
                    }
                  />
                </div>
                {logForm.type === 'development' && (
                  <div className="space-y-2">
                    <Label>完成进度: {logForm.progress}%</Label>
                    <Input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={logForm.progress}
                      onChange={(e) =>
                        setLogForm({
                          ...logForm,
                          progress: parseInt(e.target.value),
                        })
                      }
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>遇到的问题</Label>
                <Textarea
                  placeholder="记录遇到的问题或困难（可选）"
                  value={logForm.issues}
                  onChange={(e) =>
                    setLogForm({ ...logForm, issues: e.target.value })
                  }
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>明日计划</Label>
                <Textarea
                  placeholder="记录明日工作计划（可选）"
                  value={logForm.nextPlan}
                  onChange={(e) =>
                    setLogForm({ ...logForm, nextPlan: e.target.value })
                  }
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>今日心情</Label>
                <div className="flex gap-2">
                  {(['great', 'good', 'normal', 'bad'] as const).map((mood) => (
                    <Button
                      key={mood}
                      type="button"
                      variant={logForm.mood === mood ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setLogForm({ ...logForm, mood })}
                    >
                      {getMoodLabel(mood)}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                取消
              </Button>
              <Button
                onClick={handleSaveLog}
                disabled={!logForm.content.trim()}
              >
                保存日志
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
