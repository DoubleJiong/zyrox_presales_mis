'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  List,
  Grid3X3,
  Clock,
  Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSwipe } from '@/hooks/use-gesture';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  CalendarEvent,
  CalendarView,
  DateCell,
  TimeSlot,
  getEventColor,
  formatDate,
  getDaysInMonth,
  getFirstDayOfMonth,
  getWeekStart,
  isSameDay,
  getHourLabel,
} from './calendar-types';

interface CalendarComponentProps {
  events: CalendarEvent[];
  onDateClick: (date: string, time?: string) => void;
  onEventClick: (event: CalendarEvent) => void;
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];
const WEEKDAYS_FULL = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function CalendarComponent({ events, onDateClick, onEventClick }: CalendarComponentProps) {
  const [view, setView] = useState<CalendarView>('month');
  const [currentDate, setCurrentDate] = useState<Date | null>(null);
  const [mounted, setMounted] = useState(false);
  const isMobile = useIsMobile();

  // 客户端初始化，避免 hydration 错误
  useEffect(() => {
    setCurrentDate(new Date());
    setMounted(true);
  }, []);

  // 触摸滑动切换
  const swipeHandlers = useSwipe({
    onSwipeLeft: () => navigate('next'),
    onSwipeRight: () => navigate('prev'),
    threshold: 50,
  });

  // 获取今天日期字符串
  const todayStr = useMemo(() => {
    if (!currentDate) return '';
    return formatDate(currentDate);
  }, [currentDate]);

  // 导航操作
  const navigate = useCallback((direction: 'prev' | 'next' | 'today') => {
    if (!currentDate) return;
    
    const newDate = new Date(currentDate);
    
    if (direction === 'today') {
      setCurrentDate(new Date());
      return;
    }

    switch (view) {
      case 'month':
        newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
        break;
      case 'week':
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
        break;
      case 'day':
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
        break;
    }
    
    setCurrentDate(newDate);
  }, [currentDate, view]);

  // 获取月份标题
  const getMonthTitle = () => {
    if (!currentDate) return '';
    return `${currentDate.getFullYear()}年${currentDate.getMonth() + 1}月`;
  };

  // 获取周标题
  const getWeekTitle = () => {
    if (!currentDate) return '';
    const weekStart = getWeekStart(currentDate);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const startMonth = weekStart.getMonth() + 1;
    const endMonth = weekEnd.getMonth() + 1;
    if (startMonth === endMonth) {
      return `${weekStart.getFullYear()}年${startMonth}月`;
    }
    return `${weekStart.getMonth() + 1}月${weekStart.getDate()}日 - ${weekEnd.getMonth() + 1}月${weekEnd.getDate()}日`;
  };

  // 获取日标题
  const getDayTitle = () => {
    if (!currentDate) return '';
    return `${currentDate.getFullYear()}年${currentDate.getMonth() + 1}月${currentDate.getDate()}日 ${WEEKDAYS_FULL[currentDate.getDay()]}`;
  };

  // 生成月视图数据
  const monthData = useMemo(() => {
    if (!currentDate || view !== 'month') return [];
    
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    
    const cells: DateCell[] = [];
    
    // 上个月的日期
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    const daysInPrevMonth = getDaysInMonth(prevYear, prevMonth);
    
    for (let i = firstDay - 1; i >= 0; i--) {
      const date = new Date(prevYear, prevMonth, daysInPrevMonth - i);
      const dateStr = formatDate(date);
      cells.push({
        date,
        isToday: dateStr === todayStr,
        isCurrentMonth: false,
        events: events.filter(e => e.startDate === dateStr),
      });
    }
    
    // 当月日期
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateStr = formatDate(date);
      cells.push({
        date,
        isToday: dateStr === todayStr,
        isCurrentMonth: true,
        events: events.filter(e => e.startDate === dateStr),
      });
    }
    
    // 下个月的日期（补全6行）
    const remainingCells = 42 - cells.length;
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    
    for (let day = 1; day <= remainingCells; day++) {
      const date = new Date(nextYear, nextMonth, day);
      const dateStr = formatDate(date);
      cells.push({
        date,
        isToday: dateStr === todayStr,
        isCurrentMonth: false,
        events: events.filter(e => e.startDate === dateStr),
      });
    }
    
    return cells;
  }, [currentDate, view, events, todayStr]);

  // 生成周视图数据
  const weekData = useMemo(() => {
    if (!currentDate || view !== 'week') return { days: [], hours: HOURS };
    
    const weekStart = getWeekStart(currentDate);
    const days: { date: Date; isToday: boolean; events: CalendarEvent[] }[] = [];
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + i);
      const dateStr = formatDate(date);
      days.push({
        date,
        isToday: dateStr === todayStr,
        events: events.filter(e => e.startDate === dateStr),
      });
    }
    
    return { days, hours: HOURS };
  }, [currentDate, view, events, todayStr]);

  // 生成日视图数据
  const dayData = useMemo(() => {
    if (!currentDate || view !== 'day') return { date: null, isToday: false, events: [], hours: HOURS };
    
    const dateStr = formatDate(currentDate);
    return {
      date: currentDate,
      isToday: dateStr === todayStr,
      events: events.filter(e => e.startDate === dateStr),
      hours: HOURS,
    };
  }, [currentDate, view, events, todayStr]);

  // 服务端渲染时返回占位符
  if (!mounted || !currentDate) {
    return (
      <div className="bg-card rounded-lg border p-4 min-h-[600px] flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">加载中...</div>
      </div>
    );
  }

  // 渲染事件标签
  const renderEventTag = (event: CalendarEvent, isCompact: boolean = false) => {
    const color = getEventColor(event);
    
    return (
      <div
        key={event.id}
        onClick={(e) => {
          e.stopPropagation();
          onEventClick(event);
        }}
        className={cn(
          'px-1.5 py-0.5 rounded text-xs cursor-pointer hover:opacity-80 transition-opacity truncate',
          isCompact ? 'text-[10px] leading-tight' : ''
        )}
        style={{
          backgroundColor: `${color}20`,
          borderLeft: `3px solid ${color}`,
          color: color,
        }}
        title={event.title}
      >
        {!event.allDay && event.startTime && !isCompact && (
          <span className="opacity-70">{event.startTime} </span>
        )}
        {event.title}
      </div>
    );
  };

  return (
    <div 
      className="bg-card rounded-lg border overflow-hidden"
      {...(isMobile ? swipeHandlers : {})}
    >
      {/* 头部工具栏 */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate('today')}>
            今天
          </Button>
          <div className="flex items-center">
            <Button variant="ghost" size="icon" onClick={() => navigate('prev')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => navigate('next')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <h2 className="text-lg font-semibold ml-2">
            {view === 'month' && getMonthTitle()}
            {view === 'week' && getWeekTitle()}
            {view === 'day' && getDayTitle()}
          </h2>
        </div>
        
        <div className="flex items-center gap-1 border rounded-lg p-1">
          <Button
            variant={view === 'month' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setView('month')}
            className="gap-1"
          >
            <Grid3X3 className="h-4 w-4" />
            月
          </Button>
          <Button
            variant={view === 'week' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setView('week')}
            className="gap-1"
          >
            <Calendar className="h-4 w-4" />
            周
          </Button>
          <Button
            variant={view === 'day' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setView('day')}
            className="gap-1"
          >
            <Clock className="h-4 w-4" />
            日
          </Button>
        </div>
      </div>

      {/* 月视图 */}
      {view === 'month' && (
        <div className="grid grid-cols-7">
          {/* 星期头 */}
          {WEEKDAYS.map((day, i) => (
            <div
              key={day}
              className={cn(
                'p-2 text-center text-sm font-medium border-b',
                (i === 0 || i === 6) ? 'text-red-500' : 'text-muted-foreground'
              )}
            >
              {day}
            </div>
          ))}
          
          {/* 日期格子 */}
          {monthData.map((cell, index) => (
            <div
              key={index}
              onClick={() => onDateClick(formatDate(cell.date))}
              className={cn(
                'min-h-[100px] p-1 border-b border-r cursor-pointer hover:bg-accent/50 transition-colors',
                !cell.isCurrentMonth && 'bg-muted/30',
                cell.isToday && 'bg-primary/5'
              )}
            >
              <div
                className={cn(
                  'w-7 h-7 flex items-center justify-center rounded-full text-sm mb-1',
                  cell.isToday && 'bg-primary text-primary-foreground font-semibold',
                  !cell.isToday && !cell.isCurrentMonth && 'text-muted-foreground'
                )}
              >
                {cell.date.getDate()}
              </div>
              <div className="space-y-0.5 overflow-hidden">
                {cell.events.slice(0, 3).map(event => renderEventTag(event, true))}
                {cell.events.length > 3 && (
                  <div className="text-[10px] text-muted-foreground px-1">
                    +{cell.events.length - 3} 更多
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 周视图 */}
      {view === 'week' && (
        <div className="flex flex-col" style={{ height: 'calc(100vh - 300px)', minHeight: '500px' }}>
          {/* 头部日期 */}
          <div className="grid grid-cols-8 border-b">
            <div className="p-2 text-center text-sm text-muted-foreground border-r">时间</div>
            {weekData.days.map((day, i) => (
              <div
                key={i}
                className={cn(
                  'p-2 text-center border-r last:border-r-0',
                  (i === 0 || i === 6) && 'text-red-500',
                  day.isToday && 'bg-primary/5'
                )}
              >
                <div className="text-xs text-muted-foreground">{WEEKDAYS[i]}</div>
                <div
                  className={cn(
                    'w-7 h-7 mx-auto flex items-center justify-center rounded-full text-sm font-medium',
                    day.isToday && 'bg-primary text-primary-foreground'
                  )}
                >
                  {day.date.getDate()}
                </div>
              </div>
            ))}
          </div>
          
          {/* 时间网格 */}
          <ScrollArea className="flex-1">
            <div className="grid grid-cols-8">
              {/* 时间列 */}
              <div className="border-r">
                {weekData.hours.map(hour => (
                  <div
                    key={hour}
                    className="h-12 px-2 text-xs text-muted-foreground text-right border-b"
                  >
                    {getHourLabel(hour)}
                  </div>
                ))}
              </div>
              
              {/* 日期列 */}
              {weekData.days.map((day, dayIndex) => (
                <div key={dayIndex} className="border-r last:border-r-0 relative">
                  {weekData.hours.map(hour => (
                    <div
                      key={hour}
                      onClick={() => onDateClick(formatDate(day.date), `${String(hour).padStart(2, '0')}:00`)}
                      className="h-12 border-b cursor-pointer hover:bg-accent/30 transition-colors"
                    />
                  ))}
                  {/* 渲染当天事件 */}
                  <div className="absolute inset-0 pointer-events-none">
                    {day.events.filter(e => !e.allDay).map(event => {
                      const startHour = event.startTime ? parseInt(event.startTime.split(':')[0]) : 0;
                      const top = startHour * 48; // 48px per hour
                      return (
                        <div
                          key={event.id}
                          className="absolute left-1 right-1 pointer-events-auto"
                          style={{ top: `${top + 2}px`, height: '44px' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onEventClick(event);
                          }}
                        >
                          {renderEventTag(event)}
                        </div>
                      );
                    })}
                  </div>
                  {/* 全天事件 */}
                  {day.events.filter(e => e.allDay).map(event => (
                    <div key={`allday-${event.id}`} className="hidden">
                      {/* 全天事件在顶部显示 */}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* 日视图 */}
      {view === 'day' && (
        <div className="flex flex-col" style={{ height: 'calc(100vh - 300px)', minHeight: '500px' }}>
          {/* 头部 */}
          <div className="p-4 border-b text-center">
            <div className="text-2xl font-bold">{dayData.date?.getDate()}</div>
            <div className="text-sm text-muted-foreground">
              {WEEKDAYS_FULL[dayData.date?.getDay() || 0]}
            </div>
          </div>
          
          {/* 时间网格 */}
          <ScrollArea className="flex-1">
            <div className="grid grid-cols-[80px_1fr]">
              {/* 时间列 */}
              <div>
                {dayData.hours.map(hour => (
                  <div
                    key={hour}
                    className="h-14 px-3 text-xs text-muted-foreground text-right border-r border-b flex items-start justify-end pt-1"
                  >
                    {getHourLabel(hour)}
                  </div>
                ))}
              </div>
              
              {/* 事件区域 */}
              <div className="relative">
                {dayData.hours.map(hour => (
                  <div
                    key={hour}
                    onClick={() => onDateClick(formatDate(dayData.date!), `${String(hour).padStart(2, '0')}:00`)}
                    className="h-14 border-b cursor-pointer hover:bg-accent/30 transition-colors"
                  />
                ))}
                
                {/* 渲染事件 */}
                <div className="absolute inset-0 pointer-events-none">
                  {dayData.events.filter(e => !e.allDay).map(event => {
                    const startHour = event.startTime ? parseInt(event.startTime.split(':')[0]) : 0;
                    const startMinute = event.startTime ? parseInt(event.startTime.split(':')[1]) : 0;
                    const top = startHour * 56 + (startMinute / 60) * 56; // 56px per hour
                    const duration = event.endTime 
                      ? Math.max(1, (parseInt(event.endTime.split(':')[0]) - startHour) * 56)
                      : 56;
                    return (
                      <div
                        key={event.id}
                        className="absolute left-2 right-2 pointer-events-auto"
                        style={{ top: `${top + 2}px`, minHeight: `${duration - 4}px` }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEventClick(event);
                        }}
                      >
                        <div
                          className="p-2 rounded-md text-sm cursor-pointer hover:opacity-80 transition-opacity"
                          style={{
                            backgroundColor: `${getEventColor(event)}15`,
                            borderLeft: `4px solid ${getEventColor(event)}`,
                            color: getEventColor(event),
                          }}
                        >
                          <div className="font-medium">{event.title}</div>
                          {event.startTime && (
                            <div className="text-xs opacity-70 mt-0.5">
                              {event.startTime}
                              {event.endTime && ` - ${event.endTime}`}
                            </div>
                          )}
                          {event.location && (
                            <div className="text-xs opacity-70 mt-0.5">{event.location}</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* 全天事件 */}
                {dayData.events.filter(e => e.allDay).length > 0 && (
                  <div className="absolute top-0 left-0 right-0 p-2 pointer-events-none">
                    {dayData.events.filter(e => e.allDay).map(event => (
                      <div
                        key={event.id}
                        className="pointer-events-auto mb-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEventClick(event);
                        }}
                      >
                        {renderEventTag(event)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        </div>
      )}

      {/* 快速添加按钮 */}
      <div className="absolute bottom-6 right-6">
        <Button
          size="lg"
          className="rounded-full shadow-lg h-14 w-14"
          onClick={() => onDateClick(formatDate(currentDate))}
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
}
