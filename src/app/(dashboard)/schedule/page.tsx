'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/auth-context';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  MapPin,
  Users,
  Bell,
  AlertTriangle,
  CheckCircle2,
  MoreHorizontal,
  Edit,
  Trash2,
  RefreshCw,
  ListTodo,
  CalendarRange,
  Settings,
  X,
  Loader2,
} from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, addDays, startOfWeek, endOfWeek, addWeeks, subWeeks, parseISO, setHours, setMinutes, isAfter, isBefore } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { cn } from '@/lib/utils';

// =====================================================
// 类型定义
// =====================================================

interface ScheduleEvent {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  type: 'meeting' | 'task' | 'reminder' | 'visit' | 'other';
  location?: string;
  participants?: string[];
  color: string;
  reminder?: {
    enabled: boolean;
    minutesBefore: number;
  };
  recurring?: {
    enabled: boolean;
    pattern: 'daily' | 'weekly' | 'monthly' | 'yearly';
    endDate?: Date;
  };
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
}

interface EventConflict {
  event1: ScheduleEvent;
  event2: ScheduleEvent;
  overlapMinutes: number;
}

// =====================================================
// 辅助函数
// =====================================================

// 获取类型颜色
const getTypeColor = (type: ScheduleEvent['type']): string => {
  const colors: Record<string, string> = {
    meeting: '#3b82f6',
    task: '#f59e0b',
    reminder: '#10b981',
    visit: '#8b5cf6',
    other: '#6b7280',
  };
  return colors[type] || colors.other;
};

// =====================================================
// 主组件
// =====================================================

export default function SchedulePage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day' | 'agenda'>('month');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent | null>(null);
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [conflictsDialogOpen, setConflictsDialogOpen] = useState(false);
  const [conflicts, setConflicts] = useState<EventConflict[]>([]);

  // 新建/编辑事件表单
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    type: 'meeting' as ScheduleEvent['type'],
    location: '',
    participants: '',
    reminderEnabled: true,
    reminderMinutes: 15,
  });

  // 从API加载日程数据
  useEffect(() => {
    if (!authLoading && isAuthenticated && user) {
      fetchSchedules();
    }
  }, [authLoading, isAuthenticated, user, currentDate, viewMode]);

  const fetchSchedules = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // 计算当前视图的日期范围
      let startDate: string;
      let endDate: string;
      
      if (viewMode === 'month') {
        const start = startOfMonth(currentDate);
        const calendarStart = startOfWeek(start, { weekStartsOn: 1 });
        const end = endOfMonth(currentDate);
        const calendarEnd = endOfWeek(end, { weekStartsOn: 1 });
        startDate = format(calendarStart, 'yyyy-MM-dd');
        endDate = format(calendarEnd, 'yyyy-MM-dd');
      } else if (viewMode === 'week') {
        const start = startOfWeek(currentDate, { weekStartsOn: 1 });
        const end = endOfWeek(currentDate, { weekStartsOn: 1 });
        startDate = format(start, 'yyyy-MM-dd');
        endDate = format(end, 'yyyy-MM-dd');
      } else {
        startDate = format(currentDate, 'yyyy-MM-dd');
        endDate = format(addDays(currentDate, 1), 'yyyy-MM-dd');
      }

      const response = await fetch(
        `/api/schedules?startDate=${startDate}&endDate=${endDate}&status=scheduled`
      );
      const result = await response.json();

      if (result.success && result.data) {
        const scheduleEvents: ScheduleEvent[] = result.data.map((schedule: any) => ({
          id: String(schedule.id),
          title: schedule.title,
          description: schedule.description || '',
          startTime: new Date(`${schedule.startDate}T${schedule.startTime || '00:00'}`),
          endTime: new Date(`${schedule.endDate || schedule.startDate}T${schedule.endTime || '23:59'}`),
          type: (schedule.type || 'other') as ScheduleEvent['type'],
          location: schedule.location || undefined,
          participants: schedule.participants || undefined,
          color: getTypeColor((schedule.type || 'other') as ScheduleEvent['type']),
          status: (schedule.scheduleStatus || 'scheduled') as ScheduleEvent['status'],
        }));
        setEvents(scheduleEvents);
      }
    } catch (error) {
      console.error('Failed to fetch schedules:', error);
    } finally {
      setLoading(false);
    }
  };

  // 创建新日程
  const handleCreateEvent = async () => {
    if (!user || !eventForm.title || !eventForm.startTime) return;
    
    try {
      const startDate = eventForm.startTime.split('T')[0];
      const startTime = eventForm.startTime.split('T')[1]?.slice(0, 5) || '09:00';
      const endDate = eventForm.endTime.split('T')[0] || startDate;
      const endTime = eventForm.endTime.split('T')[1]?.slice(0, 5) || '18:00';

      const response = await fetch('/api/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: eventForm.title,
          description: eventForm.description,
          startDate,
          startTime,
          endDate,
          endTime,
          type: eventForm.type,
          location: eventForm.location,
          participants: eventForm.participants ? eventForm.participants.split(',').map(p => p.trim()) : null,
        }),
      });

      if (response.ok) {
        setEventDialogOpen(false);
        resetEventForm();
        fetchSchedules();
      }
    } catch (error) {
      console.error('Failed to create schedule:', error);
    }
  };

  // 获取视图日期范围
  const getViewRange = useMemo(() => {
    if (viewMode === 'month') {
      const start = startOfMonth(currentDate);
      const end = endOfMonth(currentDate);
      const calendarStart = startOfWeek(start, { weekStartsOn: 1 });
      const calendarEnd = endOfWeek(end, { weekStartsOn: 1 });
      return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    } else if (viewMode === 'week') {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      const end = endOfWeek(currentDate, { weekStartsOn: 1 });
      return eachDayOfInterval({ start, end });
    }
    return [currentDate];
  }, [currentDate, viewMode]);

  // 获取某天的事件
  const getEventsForDay = useCallback(
    (date: Date) => {
      return events.filter((event) => isSameDay(event.startTime, date));
    },
    [events]
  );

  // 检测时间冲突
  const detectConflicts = useCallback((): EventConflict[] => {
    const conflictList: EventConflict[] = [];

    for (let i = 0; i < events.length; i++) {
      for (let j = i + 1; j < events.length; j++) {
        const event1 = events[i];
        const event2 = events[j];

        // 检查时间是否重叠
        if (
          isBefore(event1.startTime, event2.endTime) &&
          isAfter(event1.endTime, event2.startTime)
        ) {
          const overlapMs = Math.min(
            event1.endTime.getTime(),
            event2.endTime.getTime()
          ) - Math.max(
            event1.startTime.getTime(),
            event2.startTime.getTime()
          );

          conflictList.push({
            event1,
            event2,
            overlapMinutes: Math.round(overlapMs / (1000 * 60)),
          });
        }
      }
    }

    return conflictList;
  }, [events]);

  // 检测冲突按钮
  const handleCheckConflicts = () => {
    const detectedConflicts = detectConflicts();
    setConflicts(detectedConflicts);
    setConflictsDialogOpen(true);
  };

  // 导航：上一个月/周
  const handlePrev = () => {
    if (viewMode === 'month') {
      setCurrentDate(subMonths(currentDate, 1));
    } else if (viewMode === 'week') {
      setCurrentDate(subWeeks(currentDate, 1));
    } else {
      setCurrentDate(addDays(currentDate, -1));
    }
  };

  // 导航：下一个/周
  const handleNext = () => {
    if (viewMode === 'month') {
      setCurrentDate(addMonths(currentDate, 1));
    } else if (viewMode === 'week') {
      setCurrentDate(addWeeks(currentDate, 1));
    } else {
      setCurrentDate(addDays(currentDate, 1));
    }
  };

  // 返回今天
  const handleToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  // 重置表单
  const resetEventForm = () => {
    setEventForm({
      title: '',
      description: '',
      startTime: '',
      endTime: '',
      type: 'meeting',
      location: '',
      participants: '',
      reminderEnabled: true,
      reminderMinutes: 15,
    });
  };

  // 获取类型标签
  const getTypeLabel = (type: ScheduleEvent['type']): string => {
    const labels: Record<string, string> = {
      meeting: '会议',
      task: '任务',
      reminder: '提醒',
      visit: '拜访',
      other: '其他',
    };
    return labels[type] || '未知';
  };

  // 获取类型图标
  const getTypeIcon = (type: ScheduleEvent['type']) => {
    const icons: Record<string, React.ReactNode> = {
      meeting: <Users className="w-3 h-3" />,
      task: <ListTodo className="w-3 h-3" />,
      reminder: <Bell className="w-3 h-3" />,
      visit: <MapPin className="w-3 h-3" />,
      other: <Clock className="w-3 h-3" />,
    };
    return icons[type] || icons.other;
  };

  // 删除事件
  const handleDeleteEvent = async (eventId: string) => {
    try {
      const response = await fetch(`/api/schedules/${eventId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setEvents(events.filter((e) => e.id !== eventId));
        setSelectedEvent(null);
        setEventDialogOpen(false);
      }
    } catch (error) {
      console.error('Failed to delete event:', error);
    }
  };

  // 认证加载中
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // 未认证
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <CalendarDays className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">日程管理</h1>
              <p className="text-muted-foreground text-sm">
                日历视图、冲突检测与提醒通知
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleCheckConflicts}>
              <AlertTriangle className="w-4 h-4 mr-2" />
              检测冲突
            </Button>
            <Button onClick={() => setEventDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              新建日程
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* 左侧边栏 */}
          <div className="lg:col-span-1 space-y-4">
            {/* 迷你日历 */}
            <Card className="bg-card/50 backdrop-blur border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">快速跳转</CardTitle>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    setSelectedDate(date);
                    if (date) setCurrentDate(date);
                  }}
                  className="rounded-md border-0"
                />
              </CardContent>
            </Card>

            {/* 类型筛选 */}
            <Card className="bg-card/50 backdrop-blur border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">日程类型</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(['meeting', 'task', 'visit', 'reminder', 'other'] as const).map(
                  (type) => (
                    <div
                      key={type}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/30 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: getTypeColor(type) }}
                        />
                        <span className="text-sm">{getTypeLabel(type)}</span>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {events.filter((e) => e.type === type).length}
                      </Badge>
                    </div>
                  )
                )}
              </CardContent>
            </Card>

            {/* 今日日程 */}
            <Card className="bg-card/50 backdrop-blur border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  今日日程
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {getEventsForDay(new Date()).map((event) => (
                  <div
                    key={event.id}
                    className="p-2 rounded-lg border border-border/30 hover:border-primary/50 cursor-pointer transition-colors"
                    onClick={() => {
                      setSelectedEvent(event);
                      setEventDialogOpen(true);
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: event.color }}
                      />
                      <span className="text-sm font-medium truncate">
                        {event.title}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {format(event.startTime, 'HH:mm')} -{' '}
                      {format(event.endTime, 'HH:mm')}
                    </p>
                  </div>
                ))}
                {getEventsForDay(new Date()).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    今日暂无日程
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 主日历区域 */}
          <div className="lg:col-span-3">
            <Card className="bg-card/50 backdrop-blur border-border/50">
              {/* 日历头部 */}
              <div className="flex items-center justify-between p-4 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={handlePrev}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={handleNext}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleToday}>
                    今天
                  </Button>
                  <h2 className="text-lg font-semibold ml-4">
                    {format(currentDate, viewMode === 'week' ? 'yyyy年 MMM 第w周' : 'yyyy年 MMM', {
                      locale: zhCN,
                    })}
                  </h2>
                </div>

                <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as typeof viewMode)}>
                  <TabsList className="bg-muted/50">
                    <TabsTrigger value="month">月</TabsTrigger>
                    <TabsTrigger value="week">周</TabsTrigger>
                    <TabsTrigger value="day">日</TabsTrigger>
                    <TabsTrigger value="agenda">列表</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* 日历内容 */}
              <CardContent className="p-0">
                {viewMode === 'month' && (
                  <div className="grid grid-cols-7">
                    {/* 星期头 */}
                    {['一', '二', '三', '四', '五', '六', '日'].map((day) => (
                      <div
                        key={day}
                        className="p-3 text-center text-sm font-medium text-muted-foreground border-b border-border/50"
                      >
                        {day}
                      </div>
                    ))}

                    {/* 日期格子 */}
                    {getViewRange.map((date, index) => {
                      const dayEvents = getEventsForDay(date);
                      const isCurrentMonth = isSameMonth(date, currentDate);

                      return (
                        <div
                          key={index}
                          className={cn(
                            'min-h-[100px] p-2 border-b border-r border-border/30 transition-colors',
                            !isCurrentMonth && 'bg-muted/20',
                            isToday(date) && 'bg-primary/5',
                            selectedDate && isSameDay(date, selectedDate) && 'bg-primary/10'
                          )}
                          onClick={() => setSelectedDate(date)}
                        >
                          <div
                            className={cn(
                              'text-sm mb-1',
                              isToday(date)
                                ? 'text-primary font-bold'
                                : !isCurrentMonth
                                ? 'text-muted-foreground/50'
                                : 'text-muted-foreground'
                            )}
                          >
                            {format(date, 'd')}
                          </div>

                          <div className="space-y-1">
                            {dayEvents.slice(0, 3).map((event) => (
                              <div
                                key={event.id}
                                className="text-xs p-1 rounded truncate cursor-pointer hover:opacity-80 transition-opacity"
                                style={{
                                  backgroundColor: `${event.color}20`,
                                  color: event.color,
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedEvent(event);
                                  setEventDialogOpen(true);
                                }}
                              >
                                {format(event.startTime, 'HH:mm')} {event.title}
                              </div>
                            ))}
                            {dayEvents.length > 3 && (
                              <div className="text-xs text-muted-foreground text-center">
                                +{dayEvents.length - 3} 更多
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 周视图 */}
                {viewMode === 'week' && (
                  <div className="grid grid-cols-7">
                    {getViewRange.map((date, index) => {
                      const dayEvents = getEventsForDay(date);
                      return (
                        <div key={index} className="min-h-[400px] border-r border-border/30 last:border-r-0">
                          <div
                            className={cn(
                              'p-3 text-center border-b border-border/30 sticky top-0 bg-card/80 backdrop-blur',
                              isToday(date) && 'text-primary font-bold'
                            )}
                          >
                            <div className="text-xs text-muted-foreground">
                              {format(date, 'EEE', { locale: zhCN })}
                            </div>
                            <div className="text-lg">{format(date, 'd')}</div>
                          </div>

                          <div className="p-2 space-y-1">
                            {dayEvents.map((event) => (
                              <div
                                key={event.id}
                                className="p-2 rounded-lg border border-border/30 cursor-pointer hover:border-primary/50 transition-colors"
                                onClick={() => {
                                  setSelectedEvent(event);
                                  setEventDialogOpen(true);
                                }}
                              >
                                <div
                                  className="w-full h-1 rounded mb-2"
                                  style={{ backgroundColor: event.color }}
                                />
                                <p className="text-sm font-medium truncate">
                                  {event.title}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {format(event.startTime, 'HH:mm')} -{' '}
                                  {format(event.endTime, 'HH:mm')}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 日视图 */}
                {viewMode === 'day' && (
                  <div className="p-4">
                    <div className="text-center mb-4">
                      <h3 className="text-lg font-semibold">
                        {format(currentDate, 'yyyy年M月d日 EEEE', { locale: zhCN })}
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                      {Array.from({ length: 24 }, (_, i) => (
                        <div
                          key={i}
                          className="flex border-b border-border/30 py-2"
                        >
                          <div className="w-16 text-sm text-muted-foreground">
                            {i.toString().padStart(2, '0')}:00
                          </div>
                          <div className="flex-1 relative">
                            {getEventsForDay(currentDate)
                              .filter(
                                (e) =>
                                  e.startTime.getHours() === i ||
                                  (e.startTime.getHours() < i &&
                                    e.endTime.getHours() > i)
                              )
                              .map((event) => (
                                <div
                                  key={event.id}
                                  className="absolute inset-x-0 p-2 rounded-lg border border-border/30 cursor-pointer hover:border-primary/50"
                                  style={{
                                    backgroundColor: `${event.color}20`,
                                    borderColor: event.color,
                                    top: '0',
                                  }}
                                  onClick={() => {
                                    setSelectedEvent(event);
                                    setEventDialogOpen(true);
                                  }}
                                >
                                  <p className="text-sm font-medium">
                                    {event.title}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {format(event.startTime, 'HH:mm')} -{' '}
                                    {format(event.endTime, 'HH:mm')}
                                  </p>
                                </div>
                              ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 列表视图 */}
                {viewMode === 'agenda' && (
                  <div className="p-4 space-y-4">
                    {events
                      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
                      .map((event) => (
                        <div
                          key={event.id}
                          className="flex items-start gap-4 p-4 rounded-lg border border-border/30 hover:border-primary/50 cursor-pointer transition-colors"
                          onClick={() => {
                            setSelectedEvent(event);
                            setEventDialogOpen(true);
                          }}
                        >
                          <div
                            className="w-1 h-full min-h-[60px] rounded-full"
                            style={{ backgroundColor: event.color }}
                          />

                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium">{event.title}</h4>
                              <Badge variant="outline" className="text-xs">
                                {getTypeLabel(event.type)}
                              </Badge>
                            </div>

                            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {format(event.startTime, 'MM-dd HH:mm')} -{' '}
                                {format(event.endTime, 'HH:mm')}
                              </span>
                              {event.location && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {event.location}
                                </span>
                              )}
                              {event.participants && (
                                <span className="flex items-center gap-1">
                                  <Users className="w-3 h-3" />
                                  {event.participants.length}人
                                </span>
                              )}
                            </div>

                            {event.description && (
                              <p className="text-sm text-muted-foreground mt-2">
                                {event.description}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {event.reminder?.enabled && (
                              <Bell className="w-4 h-4 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 新建/编辑事件对话框 */}
        <Dialog
          open={eventDialogOpen}
          onOpenChange={(open) => {
            setEventDialogOpen(open);
            if (!open) {
              setSelectedEvent(null);
              resetEventForm();
            }
          }}
        >
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {selectedEvent ? '编辑日程' : '新建日程'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>标题</Label>
                <Input
                  placeholder="输入日程标题"
                  value={selectedEvent ? selectedEvent.title : eventForm.title}
                  onChange={(e) =>
                    setEventForm({ ...eventForm, title: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>描述</Label>
                <Textarea
                  placeholder="输入日程描述（可选）"
                  value={
                    selectedEvent ? selectedEvent.description : eventForm.description
                  }
                  onChange={(e) =>
                    setEventForm({ ...eventForm, description: e.target.value })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>开始时间</Label>
                  <Input
                    type="datetime-local"
                    value={eventForm.startTime}
                    onChange={(e) =>
                      setEventForm({ ...eventForm, startTime: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>结束时间</Label>
                  <Input
                    type="datetime-local"
                    value={eventForm.endTime}
                    onChange={(e) =>
                      setEventForm({ ...eventForm, endTime: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>类型</Label>
                  <Select
                    value={eventForm.type}
                    onValueChange={(v) =>
                      setEventForm({
                        ...eventForm,
                        type: v as ScheduleEvent['type'],
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="meeting">会议</SelectItem>
                      <SelectItem value="task">任务</SelectItem>
                      <SelectItem value="visit">拜访</SelectItem>
                      <SelectItem value="reminder">提醒</SelectItem>
                      <SelectItem value="other">其他</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>地点</Label>
                  <Input
                    placeholder="输入地点（可选）"
                    value={eventForm.location}
                    onChange={(e) =>
                      setEventForm({ ...eventForm, location: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>参与人</Label>
                <Input
                  placeholder="多人用逗号分隔"
                  value={eventForm.participants}
                  onChange={(e) =>
                    setEventForm({ ...eventForm, participants: e.target.value })
                  }
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4" />
                  <span className="text-sm">提前提醒</span>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={eventForm.reminderMinutes.toString()}
                    onValueChange={(v) =>
                      setEventForm({
                        ...eventForm,
                        reminderMinutes: parseInt(v),
                      })
                    }
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5分钟</SelectItem>
                      <SelectItem value="15">15分钟</SelectItem>
                      <SelectItem value="30">30分钟</SelectItem>
                      <SelectItem value="60">1小时</SelectItem>
                      <SelectItem value="1440">1天</SelectItem>
                    </SelectContent>
                  </Select>
                  <Switch
                    checked={eventForm.reminderEnabled}
                    onCheckedChange={(checked) =>
                      setEventForm({ ...eventForm, reminderEnabled: checked })
                    }
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="flex justify-between">
              {selectedEvent && (
                <Button
                  variant="destructive"
                  onClick={() => handleDeleteEvent(selectedEvent.id)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  删除
                </Button>
              )}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setEventDialogOpen(false)}>
                  取消
                </Button>
                <Button onClick={handleCreateEvent}>保存</Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 冲突检测对话框 */}
        <Dialog open={conflictsDialogOpen} onOpenChange={setConflictsDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                时间冲突检测
              </DialogTitle>
              <DialogDescription>
                检测到以下日程存在时间冲突
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {conflicts.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
                  <p className="text-lg font-medium">未检测到时间冲突</p>
                  <p className="text-sm text-muted-foreground">
                    所有日程安排正常
                  </p>
                </div>
              ) : (
                conflicts.map((conflict, index) => (
                  <div
                    key={index}
                    className="p-4 rounded-lg border border-yellow-500/30 bg-yellow-500/10"
                  >
                    <div className="flex items-center gap-2 mb-2 text-yellow-600">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="text-sm font-medium">
                        重叠 {conflict.overlapMinutes} 分钟
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <div
                          className="w-2 h-2 rounded-full mt-2"
                          style={{ backgroundColor: conflict.event1.color }}
                        />
                        <div>
                          <p className="font-medium">{conflict.event1.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(conflict.event1.startTime, 'HH:mm')} -{' '}
                            {format(conflict.event1.endTime, 'HH:mm')}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <div
                          className="w-2 h-2 rounded-full mt-2"
                          style={{ backgroundColor: conflict.event2.color }}
                        />
                        <div>
                          <p className="font-medium">{conflict.event2.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(conflict.event2.startTime, 'HH:mm')} -{' '}
                            {format(conflict.event2.endTime, 'HH:mm')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <DialogFooter>
              <Button onClick={() => setConflictsDialogOpen(false)}>
                关闭
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
