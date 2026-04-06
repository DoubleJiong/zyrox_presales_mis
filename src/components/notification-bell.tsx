'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Check, Trash2, Clock, AlertCircle, Info, AlertTriangle, ExternalLink, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useAuth } from '@/contexts/auth-context';
import { useSSE, RealtimeEvent } from '@/hooks/use-sse';
import { toast } from 'sonner';

interface Notification {
  id: number;
  title: string;
  content: string;
  type: string;
  level: string;
  senderId: number | null;
  senderName?: string;
  senderAvatar?: string;
  link: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

interface NotificationData {
  list: Notification[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// 获取通知类型图标
const getNotificationIcon = (type: string, level: string) => {
  if (level === 'error') return <AlertCircle className="h-4 w-4 text-destructive" />;
  if (level === 'warning') return <AlertTriangle className="h-4 w-4 text-orange-500" />;
  if (type === 'reminder') return <Clock className="h-4 w-4 text-cyan-500" />;
  return <Info className="h-4 w-4 text-blue-500" />;
};

// 获取通知类型样式
const getNotificationStyle = (level: string) => {
  const styles: Record<string, string> = {
    error: 'border-l-destructive bg-destructive/5',
    warning: 'border-l-orange-500 bg-orange-500/5',
    info: 'border-l-blue-500 bg-blue-500/5',
  };
  return styles[level] || styles.info;
};

// 获取类型标签
const getTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    system: '系统',
    task: '任务',
    approval: '审批',
    reminder: '提醒',
  };
  return labels[type] || '通知';
};

export function NotificationBell() {
  const router = useRouter();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  // 处理实时消息
  const handleRealtimeMessage = useCallback((event: RealtimeEvent) => {
    // 显示 toast 通知
    const toastOptions = {
      description: event.content,
      action: event.data?.taskId || event.data?.projectId ? {
        label: '查看',
        onClick: () => {
          if (event.data?.projectId) {
            router.push(`/projects/${event.data.projectId}`);
          } else if (event.data?.taskId) {
            router.push(`/tasks/${event.data.taskId}`);
          }
        },
      } : undefined,
    };

    switch (event.priority) {
      case 'urgent':
        toast.error(event.title, toastOptions);
        break;
      case 'high':
        toast.warning(event.title, toastOptions);
        break;
      default:
        toast.info(event.title, toastOptions);
    }

    // 增加未读计数
    setUnreadCount(prev => prev + 1);

    // 如果通知面板打开，刷新列表
    if (open) {
      fetchNotifications();
    }
  }, [open, router]);

  // SSE 实时连接 - 暂时禁用，因为代理环境不支持 SSE
  // 改用轮询方式获取通知
  const { status: sseStatus } = useSSE({
    autoConnect: false, // 禁用自动连接
    onMessage: handleRealtimeMessage,
    onStatusChange: (status) => {
      console.log('[NotificationBell] SSE status:', status);
    },
  });

  // 获取未读数量
  const fetchUnreadCount = useCallback(async () => {
    if (!user?.id) return;
    try {
      const response = await fetch('/api/notifications/unread-count');
      const result = await response.json();
      if (result.success) {
        // API 直接返回数字类型的 data
        setUnreadCount(typeof result.data === 'number' ? result.data : 0);
      }
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  }, [user?.id]);

  // 获取通知列表
  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        receiverId: user.id.toString(),
        pageSize: '20',
      });
      if (activeTab !== 'all') {
        params.set('type', activeTab);
      }
      
      const response = await fetch(`/api/notifications?${params}`);
      const result = await response.json();
      if (result.success) {
        setNotifications(result.data.list);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id, activeTab]);

  // 初始加载和定时刷新
  useEffect(() => {
    fetchUnreadCount();
    // 每30秒刷新一次未读数量（替代 SSE 的实时推送）
    const interval = setInterval(fetchUnreadCount, 30 * 1000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  // 打开时加载通知列表
  useEffect(() => {
    if (open) {
      fetchNotifications();
    }
  }, [open, activeTab, fetchNotifications]);

  // 标记为已读
  const handleMarkAsRead = async (notificationId: number) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRead: true }),
      });
      if (response.ok) {
        setNotifications(prev =>
          prev.map(n => (n.id === notificationId ? { ...n, isRead: true } : n))
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  // 全部标记已读
  const handleMarkAllAsRead = async () => {
    if (!user?.id) return;
    try {
      const response = await fetch('/api/notifications/read-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiverId: user.id }),
      });
      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  // 删除通知
  const handleDelete = async (notificationId: number) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
        // 如果删除的是未读通知，减少未读计数
        const notification = notifications.find(n => n.id === notificationId);
        if (notification && !notification.isRead) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
      }
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  // 点击通知跳转
  const handleClick = (notification: Notification) => {
    if (!notification.isRead) {
      handleMarkAsRead(notification.id);
    }
    if (notification.link) {
      setOpen(false);
      router.push(notification.link);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -right-1 -top-1 h-5 min-w-5 rounded-full px-1 text-[10px] font-bold"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 md:w-96">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold">通知中心</h4>
            {sseStatus === 'connected' && (
              <span title="实时连接正常">
                <Wifi className="h-3.5 w-3.5 text-green-500" />
              </span>
            )}
            {sseStatus === 'connecting' && (
              <span title="正在连接...">
                <div className="h-3.5 w-3.5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              </span>
            )}
            {sseStatus === 'error' && (
              <span title="实时连接断开">
                <WifiOff className="h-3.5 w-3.5 text-orange-500" />
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto py-1 px-2 text-xs"
              onClick={handleMarkAllAsRead}
            >
              全部已读
            </Button>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full justify-start rounded-none border-b bg-transparent px-2">
            <TabsTrigger value="all" className="text-xs">
              全部
            </TabsTrigger>
            <TabsTrigger value="reminder" className="text-xs">
              提醒
            </TabsTrigger>
            <TabsTrigger value="task" className="text-xs">
              任务
            </TabsTrigger>
            <TabsTrigger value="system" className="text-xs">
              系统
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="m-0">
            <ScrollArea className="h-80">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Bell className="h-10 w-10 mb-2 opacity-50" />
                  <p className="text-sm">暂无通知</p>
                </div>
              ) : (
                <div className="divide-y">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={cn(
                        'group relative p-3 cursor-pointer border-l-2 transition-colors hover:bg-muted/50',
                        getNotificationStyle(notification.level),
                        !notification.isRead && 'bg-accent/30'
                      )}
                      onClick={() => handleClick(notification)}
                    >
                      <div className="flex gap-3">
                        <div className="mt-0.5 shrink-0">
                          {getNotificationIcon(notification.type, notification.level)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className={cn(
                              'text-sm font-medium leading-tight',
                              !notification.isRead && 'text-foreground'
                            )}>
                              {notification.title}
                            </p>
                            <Badge variant="outline" className="shrink-0 text-[10px] px-1.5 py-0">
                              {getTypeLabel(notification.type)}
                            </Badge>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                            {notification.content}
                          </p>
                          <div className="mt-1.5 flex items-center justify-between">
                            <span className="text-[10px] text-muted-foreground">
                              {formatDistanceToNow(new Date(notification.createdAt), {
                                addSuffix: true,
                                locale: zhCN,
                              })}
                            </span>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {notification.link && (
                                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* 操作按钮 - 悬停显示 */}
                      <div className="absolute right-2 top-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!notification.isRead && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkAsRead(notification.id);
                            }}
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(notification.id);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <div className="border-t p-2">
          <Button
            variant="ghost"
            className="w-full text-sm"
            onClick={() => {
              setOpen(false);
              router.push('/messages');
            }}
          >
            查看全部消息
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
