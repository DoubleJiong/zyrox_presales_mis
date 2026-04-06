'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Bell,
  MessageSquare,
  AlertCircle,
  CheckCircle,
  Trash2,
  ChevronRight,
  Clock,
  User,
  Briefcase,
  FileText,
  Settings
} from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useAuth } from '@/contexts/auth-context';

// 消息类型
interface Message {
  id: number;
  title: string;
  content: string;
  type: string;
  category: string;
  priority: string;
  senderId: number | null;
  senderName: string;
  senderAvatar: string | null;
  relatedType: string | null;
  relatedId: number | null;
  relatedName: string | null;
  actionUrl: string | null;
  actionText: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  metadata: Record<string, unknown> | null;
}

// 获取消息类型图标
const getMessageIcon = (type: string) => {
  const icons: Record<string, React.ReactNode> = {
    system: <Settings className="h-5 w-5" />,
    notification: <Bell className="h-5 w-5" />,
    alert: <AlertCircle className="h-5 w-5" />,
    reminder: <Clock className="h-5 w-5" />,
    message: <MessageSquare className="h-5 w-5" />,
  };
  return icons[type] || icons.notification;
};

// 获取消息类型样式
const getMessageStyle = (type: string) => {
  const styles: Record<string, string> = {
    system: 'bg-purple-500/10 text-purple-600',
    notification: 'bg-blue-500/10 text-blue-600',
    alert: 'bg-orange-500/10 text-orange-600',
    reminder: 'bg-cyan-500/10 text-cyan-600',
    message: 'bg-green-500/10 text-green-600',
  };
  return styles[type] || styles.notification;
};

// 获取优先级样式
const getPriorityStyle = (priority: string) => {
  const styles: Record<string, string> = {
    urgent: 'bg-destructive/10 text-destructive border-destructive/20',
    high: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
    normal: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    low: 'bg-muted text-muted-foreground border-muted',
  };
  return styles[priority] || styles.normal;
};

// 获取优先级标签
const getPriorityLabel = (priority: string) => {
  const labels: Record<string, string> = {
    urgent: '紧急',
    high: '高',
    normal: '普通',
    low: '低',
  };
  return labels[priority] || '普通';
};

export default function MessagesPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  // 等待认证加载完成
  useEffect(() => {
    // 等待认证加载完成
    if (authLoading) return;
    
    if (!isAuthenticated) {
      // 未登录，跳转到登录页
      window.location.href = '/login?redirect=/messages';
      return;
    }
    
    if (user) {
      fetchMessages();
      fetchUnreadCount();
    }
  }, [activeTab, isAuthenticated, authLoading, user]);

  const fetchMessages = async () => {
    if (!user) return;
    try {
      const params = new URLSearchParams();
      if (activeTab !== 'all') {
        params.set('type', activeTab);
      }
      
      const response = await fetch(`/api/messages?${params}`);
      const result = await response.json();
      
      if (result.success) {
        setMessages(result.data.list);
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    if (!user) return;
    try {
      const response = await fetch('/api/messages/unread-count');
      const result = await response.json();
      
      if (result.success) {
        setUnreadCount(result.data.total);
      }
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  };

  const handleMarkAsRead = async (messageId: number) => {
    try {
      await fetch(`/api/messages/${messageId}/read`, {
        method: 'POST',
      });
      fetchMessages();
      fetchUnreadCount();
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user) return;
    try {
      await fetch('/api/messages/read-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      fetchMessages();
      fetchUnreadCount();
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const handleDelete = async (messageId: number) => {
    try {
      await fetch(`/api/messages/${messageId}`, {
        method: 'DELETE',
      });
      fetchMessages();
      fetchUnreadCount();
    } catch (error) {
      console.error('Failed to delete message:', error);
    }
  };

  const filteredMessages = messages;

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">消息中心</h1>
          <p className="text-muted-foreground">
            管理您的系统通知、提醒消息和工作消息
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" onClick={handleMarkAllAsRead}>
              <CheckCircle className="h-4 w-4 mr-2" />
              全部已读
            </Button>
          )}
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">未读消息</p>
                <p className="text-2xl font-bold">{unreadCount}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Bell className="h-5 w-5 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">系统通知</p>
                <p className="text-2xl font-bold">{messages.filter(m => m.type === 'system').length}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                <Settings className="h-5 w-5 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">工作提醒</p>
                <p className="text-2xl font-bold">{messages.filter(m => m.type === 'reminder').length}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-cyan-500/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-cyan-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">工作消息</p>
                <p className="text-2xl font-bold">{messages.filter(m => m.type === 'message').length}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 消息列表 */}
      <Card>
        <CardHeader className="pb-3">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="all">
                全部消息
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="ml-2">{unreadCount}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="system">系统通知</TabsTrigger>
              <TabsTrigger value="notification">业务通知</TabsTrigger>
              <TabsTrigger value="reminder">提醒</TabsTrigger>
              <TabsTrigger value="message">消息</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredMessages.length > 0 ? (
              <div className="space-y-2">
                {filteredMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex items-start gap-4 p-4 rounded-lg border transition-colors cursor-pointer hover:bg-accent/50 ${
                      !message.isRead ? 'bg-blue-500/5 border-blue-500/20' : ''
                    }`}
                    onClick={() => !message.isRead && handleMarkAsRead(message.id)}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${getMessageStyle(message.type)}`}>
                      {getMessageIcon(message.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`font-medium ${!message.isRead ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {message.title}
                        </span>
                        {!message.isRead && (
                          <Badge className="bg-blue-500 text-white text-xs">未读</Badge>
                        )}
                        <Badge variant="outline" className={`text-xs ${getPriorityStyle(message.priority)}`}>
                          {getPriorityLabel(message.priority)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {message.content}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {message.senderName}
                        </span>
                        <span>
                          {formatDistanceToNow(new Date(message.createdAt), {
                            addSuffix: true,
                            locale: zhCN,
                          })}
                        </span>
                        {message.relatedName && (
                          <span className="flex items-center gap-1">
                            <Briefcase className="h-3 w-3" />
                            {message.relatedName}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {message.actionUrl && (
                        <Button variant="outline" size="sm" asChild>
                          <Link href={message.actionUrl}>
                            {message.actionText || '查看详情'}
                            <ChevronRight className="h-4 w-4 ml-1" />
                          </Link>
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(message.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-12">
                <Bell className="h-16 w-16 text-muted-foreground/20 mb-4" />
                <p className="text-muted-foreground">暂无消息</p>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
