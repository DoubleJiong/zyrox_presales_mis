'use client';

import { useEffect, useState, useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/auth-context';
import {
  CheckSquare,
  Calendar,
  Clock,
  AlertCircle,
  List,
  LayoutGrid,
  Download,
  Loader2,
} from 'lucide-react';
import { CalendarComponent } from '@/components/calendar/calendar-component';
import { EventDialog } from '@/components/calendar/event-dialog';
import { CalendarEvent, formatRepeatLabel, getEventColor } from '@/components/calendar/calendar-types';

// 统计卡片组件
function StatsCards({ events }: { events: CalendarEvent[] }) {
  const todayStr = typeof window !== 'undefined' ? new Date().toISOString().split('T')[0] : '';
  
  const stats = {
    total: events.length,
    today: events.filter(e => e.startDate === todayStr).length,
    pending: events.filter(e => e.status === 'pending' || e.status === 'scheduled').length,
    urgent: events.filter(e => e.priority === 'urgent' && e.status !== 'completed').length,
  };

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">全部事项</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total}</div>
          <p className="text-xs text-muted-foreground">待办 + 日程</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">今日事项</CardTitle>
          <Clock className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">{stats.today}</div>
          <p className="text-xs text-muted-foreground">需要处理</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">待处理</CardTitle>
          <CheckSquare className="h-4 w-4 text-yellow-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          <p className="text-xs text-muted-foreground">进行中</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">紧急任务</CardTitle>
          <AlertCircle className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">{stats.urgent}</div>
          <p className="text-xs text-muted-foreground">优先处理</p>
        </CardContent>
      </Card>
    </div>
  );
}

// 侧边栏列表组件
function EventSidebar({ 
  events, 
  onEventClick,
  onToggleComplete 
}: { 
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onToggleComplete: (event: CalendarEvent) => void;
}) {
  const todayStr = typeof window !== 'undefined' ? new Date().toISOString().split('T')[0] : '';
  const todayEvents = events.filter(e => e.startDate === todayStr);
  const upcomingEvents = events
    .filter(e => e.startDate > todayStr && (e.status === 'pending' || e.status === 'scheduled'))
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .slice(0, 5);

  return (
    <div className="space-y-4">
      {/* 今日事项 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="h-4 w-4" />
            今日事项
            <Badge variant="secondary" className="ml-auto">{todayEvents.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <ScrollArea className="h-[200px]">
            {todayEvents.length > 0 ? (
              <div className="space-y-2">
                {todayEvents.map(event => (
                  <div
                    key={event.id}
                    className="flex items-start gap-2 p-2 rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
                    onClick={() => onEventClick(event)}
                  >
                    {event.type === 'todo' && (
                      <Checkbox
                        checked={event.status === 'completed'}
                        onCheckedChange={(checked) => {
                          if (checked !== 'indeterminate') {
                            onToggleComplete(event);
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-0.5"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className="text-sm font-medium truncate"
                          style={{
                            textDecoration: event.status === 'completed' ? 'line-through' : 'none',
                            opacity: event.status === 'completed' ? 0.6 : 1,
                          }}
                        >
                          {event.title}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1"
                          style={{ 
                            backgroundColor: `${getEventColor(event)}15`,
                            color: getEventColor(event),
                          }}
                        >
                          {event.type === 'todo' ? '待办' : '日程'}
                        </Badge>
                      </div>
                      {!event.allDay && event.startTime && (
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {event.startTime}
                          {event.endTime && ` - ${event.endTime}`}
                        </div>
                      )}
                        {event.participants && event.participants.length > 0 && (
                          <div className="text-xs text-muted-foreground mt-0.5">
                            参与 {event.participants.length} 人
                          </div>
                        )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-sm text-muted-foreground py-4">
                今日暂无事项
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* 即将到来 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            即将到来
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <ScrollArea className="h-[200px]">
            {upcomingEvents.length > 0 ? (
              <div className="space-y-2">
                {upcomingEvents.map(event => (
                  <div
                    key={event.id}
                    className="flex items-start gap-2 p-2 rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
                    onClick={() => onEventClick(event)}
                  >
                    <div
                      className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                      style={{ backgroundColor: getEventColor(event) }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{event.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {event.startDate}
                        {!event.allDay && event.startTime && ` ${event.startTime}`}
                      </div>
                      {event.participants && event.participants.length > 0 && (
                        <div className="text-xs text-muted-foreground mt-0.5">
                          参与 {event.participants.length} 人
                        </div>
                      )}
                      {event.repeat && (
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {formatRepeatLabel(event.repeat)}
                        </div>
                      )}
                      {event.relatedType === 'task' && (
                        <div className="text-xs text-muted-foreground mt-0.5">
                          关联任务日程
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-sm text-muted-foreground py-4">
                暂无即将到来的事项
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

export default function CalendarPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [defaultDate, setDefaultDate] = useState<string>('');
  const [defaultTime, setDefaultTime] = useState<string>('');
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

  const requestedView = searchParams.get('view');
  const requestedComposer = searchParams.get('composer');

  // 获取数据
  const fetchData = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // 并行获取待办和日程
      const [todosRes, schedulesRes] = await Promise.all([
        fetch('/api/todos'),
        fetch('/api/schedules'),
      ]);
      
      const todosData = await todosRes.json();
      const schedulesData = await schedulesRes.json();
      
      // 转换为统一的日历事件格式
      const todoEvents: CalendarEvent[] = (todosData.data || []).map((todo: any) => ({
        id: `todo-${todo.id}`,
        title: todo.title,
        type: 'todo' as const,
        startDate: todo.dueDate || new Date().toISOString().split('T')[0],
        startTime: todo.dueTime,
        allDay: !todo.dueTime,
        status: todo.todoStatus,
        priority: todo.priority,
        description: todo.description,
      }));
      
      const scheduleEvents: CalendarEvent[] = (schedulesData.data || []).map((schedule: any) => ({
        id: `schedule-${schedule.id}`,
        title: schedule.title,
        type: 'schedule' as const,
        startDate: schedule.startDate,
        startTime: schedule.startTime,
        endDate: schedule.endDate,
        endTime: schedule.endTime,
        allDay: schedule.allDay,
        status: schedule.scheduleStatus,
        location: schedule.location,
        description: schedule.description,
        ownerId: schedule.ownerId,
        isOwner: schedule.isOwner,
        accessRole: schedule.accessRole,
        participants: schedule.participants || [],
        reminder: schedule.reminder || null,
        repeat: schedule.repeat || null,
        relatedType: schedule.relatedType || null,
        relatedId: schedule.relatedId || null,
      }));
      
      setEvents([...todoEvents, ...scheduleEvents]);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && isAuthenticated && user) {
      fetchData();
    }
  }, [fetchData, authLoading, isAuthenticated, user]);

  useEffect(() => {
    if (requestedView === 'list' || requestedView === 'calendar') {
      setViewMode(requestedView);
    }
  }, [requestedView]);

  useEffect(() => {
    if (authLoading || !isAuthenticated || !requestedComposer) {
      return;
    }

    setSelectedEvent(null);
    setDefaultDate(new Date().toISOString().split('T')[0]);
    setDefaultTime('');
    setDialogOpen(true);

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete('composer');
    const nextQuery = nextParams.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname);
  }, [authLoading, isAuthenticated, pathname, requestedComposer, router, searchParams]);

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

  // 打开创建对话框
  const handleDateClick = useCallback((date: string, time?: string) => {
    setSelectedEvent(null);
    setDefaultDate(date);
    setDefaultTime(time || '');
    setDialogOpen(true);
  }, []);

  // 打开编辑对话框
  const handleEventClick = useCallback((event: CalendarEvent) => {
    setSelectedEvent(event);
    setDefaultDate('');
    setDefaultTime('');
    setDialogOpen(true);
  }, []);

  // 保存事件
  const handleSaveEvent = useCallback(async (eventData: Partial<CalendarEvent>) => {
    const isEdit = eventData.id;
    const type = eventData.type || 'schedule';
    const [eventType, id] = eventData.id?.split('-') || [type, ''];
    
    const payload = {
      title: eventData.title,
      type: eventData.type,
      startDate: eventData.startDate,
      startTime: eventData.startTime,
      endDate: eventData.endDate,
      endTime: eventData.endTime,
      allDay: eventData.allDay,
      location: eventData.location,
      description: eventData.description,
      priority: eventData.priority,
      status: eventData.status,
      participants: eventData.participants,
      reminder: eventData.reminder,
      repeat: eventData.repeat,
    };

    try {
      if (type === 'todo') {
        const url = isEdit ? `/api/todos/${id}` : '/api/todos';
        const method = isEdit ? 'PUT' : 'POST';
        await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...payload,
            dueDate: payload.startDate,
            dueTime: payload.startTime,
          }),
        });
      } else {
        const url = isEdit ? `/api/schedules/${id}` : '/api/schedules';
        const method = isEdit ? 'PUT' : 'POST';
        await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
      
      await fetchData();
    } catch (error) {
      console.error('Save event error:', error);
      throw error;
    }
  }, [fetchData]);

  // 删除事件
  const handleDeleteEvent = useCallback(async (id: string) => {
    const [type, itemId] = id.split('-');
    
    try {
      if (type === 'todo') {
        await fetch(`/api/todos/${itemId}`, { method: 'DELETE' });
      } else {
        await fetch(`/api/schedules/${itemId}`, { method: 'DELETE' });
      }
      
      await fetchData();
    } catch (error) {
      console.error('Delete event error:', error);
      throw error;
    }
  }, [fetchData]);

  // 切换完成状态
  const handleToggleComplete = useCallback(async (event: CalendarEvent) => {
    const [type, id] = event.id.split('-');
    const newStatus = event.status === 'completed' ? 'pending' : 'completed';
    
    try {
      if (type === 'todo') {
        await fetch(`/api/todos/${id}/complete`, { method: 'POST' });
      } else {
        await fetch(`/api/schedules/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scheduleStatus: newStatus }),
        });
      }
      
      await fetchData();
    } catch (error) {
      console.error('Toggle complete error:', error);
    }
  }, [fetchData]);

  // 获取今天日期
  const todayStr = typeof window !== 'undefined' ? new Date().toISOString().split('T')[0] : '';
  const todayEvents = events.filter(e => e.startDate === todayStr);

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">日程管理</h1>
          <p className="text-muted-foreground">统一管理您的待办事项和日程安排</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => handleDateClick(new Date().toISOString().split('T')[0])}>
            <Calendar className="h-4 w-4 mr-2" />
            新建事项
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.href = '/api/export?type=todos&format=excel'}
          >
            <Download className="h-4 w-4 mr-2" />
            导出待办
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.href = '/api/export?type=schedules&format=excel'}
          >
            <Download className="h-4 w-4 mr-2" />
            导出日程
          </Button>
          <div className="flex items-center gap-2 border rounded-lg p-1">
            <Button
              variant={viewMode === 'calendar' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('calendar')}
            >
              <LayoutGrid className="h-4 w-4 mr-2" />
              日历
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4 mr-2" />
              列表
            </Button>
          </div>
        </div>
      </div>

      {/* 统计卡片 */}
      <StatsCards events={events} />

      {/* 主内容区域 */}
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        {/* 日历视图 */}
        {viewMode === 'calendar' ? (
          <div className="relative">
            <CalendarComponent
              events={events}
              onDateClick={handleDateClick}
              onEventClick={handleEventClick}
            />
          </div>
        ) : (
          /* 列表视图 */
          <Card>
            <CardHeader>
              <CardTitle className="text-base">全部事项</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                {events.length > 0 ? (
                  <div className="space-y-2">
                    {events
                      .sort((a, b) => a.startDate.localeCompare(b.startDate))
                      .map(event => (
                        <div
                          key={event.id}
                          className="flex items-start gap-3 p-3 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors"
                          onClick={() => handleEventClick(event)}
                        >
                          {event.type === 'todo' && (
                            <Checkbox
                              checked={event.status === 'completed'}
                              onCheckedChange={(checked) => {
                                if (checked !== 'indeterminate') {
                                  handleToggleComplete(event);
                                }
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="mt-0.5"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className="font-medium truncate"
                                style={{
                                  textDecoration: event.status === 'completed' ? 'line-through' : 'none',
                                  opacity: event.status === 'completed' ? 0.6 : 1,
                                }}
                              >
                                {event.title}
                              </span>
                              <Badge
                                variant="outline"
                                className="text-[10px] px-1"
                                style={{
                                  backgroundColor: `${getEventColor(event)}15`,
                                  color: getEventColor(event),
                                }}
                              >
                                {event.type === 'todo' ? '待办' : '日程'}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                              <span>{event.startDate}</span>
                              {!event.allDay && event.startTime && (
                                <span>{event.startTime}</span>
                              )}
                              {event.location && <span>{event.location}</span>}
                              {event.participants && event.participants.length > 0 && (
                                <span>{`参与${event.participants.length}人`}</span>
                              )}
                              {event.repeat && <span>{formatRepeatLabel(event.repeat)}</span>}
                              {event.relatedType === 'task' && <span>关联任务</span>}
                              {event.type === 'schedule' && event.isOwner === false && <span>共享给我</span>}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    暂无事项
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* 侧边栏 */}
        <EventSidebar
          events={events}
          onEventClick={handleEventClick}
          onToggleComplete={handleToggleComplete}
        />
      </div>

      {/* 事件弹窗 */}
      <EventDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        event={selectedEvent && selectedEvent.id ? selectedEvent : null}
        defaultDate={defaultDate}
        defaultTime={defaultTime}
        onSave={handleSaveEvent}
        onDelete={handleDeleteEvent}
      />
    </div>
  );
}
