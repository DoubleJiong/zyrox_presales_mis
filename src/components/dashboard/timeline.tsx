'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Circle,
  ChevronRight,
  Calendar,
  User,
  Building2,
} from 'lucide-react';

export interface TimelineEvent {
  id: string;
  title: string;
  description?: string;
  date: string;
  status: 'completed' | 'in_progress' | 'pending' | 'delayed';
  type?: 'milestone' | 'task' | 'alert' | 'meeting';
  assignee?: string;
  projectName?: string;
  progress?: number;
}

export interface TimelineProps {
  /** 事件列表 */
  events: TimelineEvent[];
  /** 布局方向 */
  direction?: 'vertical' | 'horizontal';
  /** 是否显示连接线动画 */
  animated?: boolean;
  /** 当前高亮事件ID */
  activeId?: string;
  /** 事件点击回调 */
  onEventClick?: (event: TimelineEvent) => void;
  /** 类名 */
  className?: string;
}

/**
 * 动态时间轴组件
 */
export function Timeline({
  events,
  direction = 'vertical',
  animated = true,
  activeId,
  onEventClick,
  className,
}: TimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visibleEvents, setVisibleEvents] = useState<Set<string>>(new Set());

  // 滚动到当前时间
  useEffect(() => {
    if (!containerRef.current) return;

    const currentEvent = events.find(
      (e) => e.status === 'in_progress' || e.status === 'delayed'
    );

    if (currentEvent) {
      const element = document.getElementById(`timeline-${currentEvent.id}`);
      element?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [events]);

  // 入场动画
  useEffect(() => {
    const timer = setInterval(() => {
      setVisibleEvents((prev) => {
        const next = new Set(prev);
        events.forEach((event, index) => {
          if (!next.has(event.id) && index <= prev.size) {
            next.add(event.id);
          }
        });
        return next;
      });
    }, 100);

    return () => clearInterval(timer);
  }, [events]);

  const getStatusColor = (status: TimelineEvent['status']) => {
    switch (status) {
      case 'completed':
        return '#00ff88';
      case 'in_progress':
        return '#00d4ff';
      case 'delayed':
        return '#ff3366';
      default:
        return '#4a6a94';
    }
  };

  const getStatusIcon = (status: TimelineEvent['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'in_progress':
        return <Clock className="w-4 h-4" />;
      case 'delayed':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Circle className="w-4 h-4" />;
    }
  };

  const getTypeIcon = (type?: TimelineEvent['type']) => {
    switch (type) {
      case 'milestone':
        return <Calendar className="w-3 h-3" />;
      case 'meeting':
        return <User className="w-3 h-3" />;
      case 'alert':
        return <AlertTriangle className="w-3 h-3" />;
      default:
        return null;
    }
  };

  if (direction === 'horizontal') {
    return (
      <div
        ref={containerRef}
        className={cn(
          'flex gap-4 overflow-x-auto pb-4 scrollbar-hide',
          className
        )}
      >
        {events.map((event, index) => (
          <div
            key={event.id}
            id={`timeline-${event.id}`}
            className={cn(
              'flex-shrink-0 w-48 transition-all duration-500',
              visibleEvents.has(event.id)
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-4'
            )}
          >
            {/* 连接线 */}
            {index > 0 && (
              <div
                className={cn(
                  'absolute top-4 h-0.5 w-8 -translate-x-full',
                  animated && 'sci-data-flow'
                )}
                style={{
                  background: `linear-gradient(90deg, ${getStatusColor(
                    events[index - 1].status
                  )}40, ${getStatusColor(event.status)}40)`,
                }}
              />
            )}

            {/* 事件卡片 */}
            <div
              className={cn(
                'relative p-3 rounded border cursor-pointer transition-all',
                activeId === event.id
                  ? 'border-[var(--sci-primary)] bg-[rgba(0,212,255,0.1)]'
                  : 'border-[var(--sci-border)] bg-[var(--sci-bg-card)] hover:border-[var(--sci-border-bright)]'
              )}
              onClick={() => onEventClick?.(event)}
            >
              {/* 时间点 */}
              <div
                className="absolute -top-2 left-4 w-8 h-8 rounded-full flex items-center justify-center border-2"
                style={{
                  backgroundColor: 'var(--sci-bg-deep)',
                  borderColor: getStatusColor(event.status),
                  color: getStatusColor(event.status),
                }}
              >
                {getStatusIcon(event.status)}
              </div>

              <div className="pt-4">
                <div className="text-xs text-[var(--sci-text-dim)] mb-1">
                  {event.date}
                </div>
                <h4 className="text-sm font-medium text-[var(--sci-text-primary)] truncate">
                  {event.title}
                </h4>
                {event.progress !== undefined && (
                  <div className="mt-2 h-1 bg-[var(--sci-bg-deep)] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${event.progress}%`,
                        backgroundColor: getStatusColor(event.status),
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // 垂直布局
  return (
    <div
      ref={containerRef}
      className={cn('relative space-y-4', className)}
    >
      {/* 主时间线 */}
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-[var(--sci-border)]" />

      {events.map((event, index) => (
        <div
          key={event.id}
          id={`timeline-${event.id}`}
          className={cn(
            'relative pl-12 transition-all duration-500',
            visibleEvents.has(event.id)
              ? 'opacity-100 translate-x-0'
              : 'opacity-0 -translate-x-4'
          )}
          style={{ transitionDelay: `${index * 100}ms` }}
        >
          {/* 时间点 */}
          <div
            className={cn(
              'absolute left-0 w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all z-10',
              activeId === event.id && 'scale-125'
            )}
            style={{
              backgroundColor: 'var(--sci-bg-deep)',
              borderColor: getStatusColor(event.status),
              color: getStatusColor(event.status),
              boxShadow:
                event.status === 'in_progress' || event.status === 'delayed'
                  ? `0 0 20px ${getStatusColor(event.status)}50`
                  : undefined,
            }}
          >
            {getStatusIcon(event.status)}
          </div>

          {/* 连接线动画 */}
          {animated && event.status === 'in_progress' && (
            <div
              className="absolute left-[15px] top-8 w-0.5 h-full"
              style={{
                background: `linear-gradient(180deg, ${getStatusColor(event.status)}50, transparent)`,
              }}
            />
          )}

          {/* 事件卡片 */}
          <div
            className={cn(
              'p-4 rounded border cursor-pointer transition-all',
              activeId === event.id
                ? 'border-[var(--sci-primary)] bg-[rgba(0,212,255,0.1)] sci-border-glow'
                : 'border-[var(--sci-border)] bg-[var(--sci-bg-card)] hover:border-[var(--sci-border-bright)]'
            )}
            onClick={() => onEventClick?.(event)}
          >
            {/* 头部 */}
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                {event.type && (
                  <span
                    className="w-5 h-5 rounded flex items-center justify-center"
                    style={{
                      backgroundColor: `${getStatusColor(event.status)}20`,
                      color: getStatusColor(event.status),
                    }}
                  >
                    {getTypeIcon(event.type)}
                  </span>
                )}
                <h4 className="text-sm font-medium text-[var(--sci-text-primary)]">
                  {event.title}
                </h4>
              </div>
              <span
                className="text-xs px-2 py-0.5 rounded"
                style={{
                  backgroundColor: `${getStatusColor(event.status)}20`,
                  color: getStatusColor(event.status),
                }}
              >
                {event.date}
              </span>
            </div>

            {/* 描述 */}
            {event.description && (
              <p className="text-xs text-[var(--sci-text-secondary)] mb-3 line-clamp-2">
                {event.description}
              </p>
            )}

            {/* 元信息 */}
            <div className="flex items-center gap-4 text-xs text-[var(--sci-text-dim)]">
              {event.projectName && (
                <span className="flex items-center gap-1">
                  <Building2 className="w-3 h-3" />
                  {event.projectName}
                </span>
              )}
              {event.assignee && (
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {event.assignee}
                </span>
              )}
            </div>

            {/* 进度条 */}
            {event.progress !== undefined && event.status === 'in_progress' && (
              <div className="mt-3">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[var(--sci-text-dim)]">进度</span>
                  <span style={{ color: getStatusColor(event.status) }}>
                    {event.progress}%
                  </span>
                </div>
                <div className="h-1.5 bg-[var(--sci-bg-deep)] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${event.progress}%`,
                      backgroundColor: getStatusColor(event.status),
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * 紧凑时间轴组件
 */
export interface CompactTimelineProps {
  events: TimelineEvent[];
  maxVisible?: number;
  className?: string;
}

export function CompactTimeline({
  events,
  maxVisible = 5,
  className,
}: CompactTimelineProps) {
  const [expanded, setExpanded] = useState(false);
  const visibleEvents = expanded ? events : events.slice(0, maxVisible);

  return (
    <div className={cn('space-y-2', className)}>
      {visibleEvents.map((event) => (
        <div
          key={event.id}
          className="flex items-center gap-3 p-2 rounded hover:bg-[var(--sci-bg-hover)] transition-colors cursor-pointer"
        >
          <div
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{
              backgroundColor:
                event.status === 'completed'
                  ? '#00ff88'
                  : event.status === 'in_progress'
                  ? '#00d4ff'
                  : event.status === 'delayed'
                  ? '#ff3366'
                  : '#4a6a94',
            }}
          />
          <span className="flex-1 text-sm text-[var(--sci-text-primary)] truncate">
            {event.title}
          </span>
          <span className="text-xs text-[var(--sci-text-dim)] flex-shrink-0">
            {event.date}
          </span>
          <ChevronRight className="w-4 h-4 text-[var(--sci-text-dim)]" />
        </div>
      ))}
      {events.length > maxVisible && (
        <button
          className="w-full text-center text-xs text-[var(--sci-primary)] hover:text-[var(--sci-primary-dim)] py-1"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? '收起' : `查看更多 (${events.length - maxVisible})`}
        </button>
      )}
    </div>
  );
}

/**
 * 里程碑时间轴
 */
export interface MilestoneTimelineProps {
  milestones: Array<{
    id: string;
    title: string;
    date: string;
    completed: boolean;
    current?: boolean;
  }>;
  className?: string;
}

export function MilestoneTimeline({
  milestones,
  className,
}: MilestoneTimelineProps) {
  return (
    <div className={cn('relative', className)}>
      {/* 主线 */}
      <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-[var(--sci-border)] transform -translate-x-1/2" />

      {milestones.map((milestone, index) => (
        <div
          key={milestone.id}
          className={cn(
            'relative flex items-center py-4',
            index % 2 === 0 ? 'flex-row' : 'flex-row-reverse'
          )}
        >
          {/* 节点 */}
          <div
            className={cn(
              'absolute left-1/2 transform -translate-x-1/2 w-6 h-6 rounded-full flex items-center justify-center z-10',
              milestone.completed
                ? 'bg-[#00ff88] border-2 border-[#00ff88]'
                : milestone.current
                ? 'bg-[var(--sci-bg-deep)] border-2 border-[#00d4ff] sci-pulse'
                : 'bg-[var(--sci-bg-deep)] border-2 border-[var(--sci-border)]'
            )}
          >
            {milestone.completed && (
              <CheckCircle className="w-4 h-4 text-[var(--sci-bg-deep)]" />
            )}
          </div>

          {/* 内容 */}
          <div
            className={cn(
              'w-[calc(50%-2rem)] p-3 rounded border',
              milestone.completed
                ? 'border-[#00ff8850] bg-[rgba(0,255,136,0.05)]'
                : milestone.current
                ? 'border-[#00d4ff50] bg-[rgba(0,212,255,0.05)]'
                : 'border-[var(--sci-border)] bg-[var(--sci-bg-card)]'
            )}
          >
            <div className="text-xs text-[var(--sci-text-dim)] mb-1">
              {milestone.date}
            </div>
            <div
              className={cn(
                'text-sm font-medium',
                milestone.completed
                  ? 'text-[#00ff88]'
                  : milestone.current
                  ? 'text-[#00d4ff]'
                  : 'text-[var(--sci-text-primary)]'
              )}
            >
              {milestone.title}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
