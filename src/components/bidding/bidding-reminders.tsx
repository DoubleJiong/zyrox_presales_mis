'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertCircle,
  Clock,
  FileText,
  Wallet,
  Bell,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import Link from 'next/link';
import { format, differenceInDays } from 'date-fns';

// 提醒类型
type ReminderType = 'bid_deadline' | 'bond_expire' | 'document_update' | 'bid_open';

// 提醒数据类型
interface Reminder {
  id: string;
  type: ReminderType;
  projectId: number;
  projectName: string;
  message: string;
  deadline: Date;
  daysRemaining: number;
  priority: 'high' | 'medium' | 'low';
  details: Record<string, any>;
}

// 提醒摘要
interface ReminderSummary {
  total: number;
  high: number;
  medium: number;
  low: number;
  byType: Record<string, number>;
}

// 类型图标映射
const typeIcons: Record<ReminderType, React.ReactNode> = {
  bid_deadline: <Clock className="h-4 w-4" />,
  bid_open: <Bell className="h-4 w-4" />,
  bond_expire: <Wallet className="h-4 w-4" />,
  document_update: <FileText className="h-4 w-4" />,
};

// 类型名称映射
const typeNames: Record<ReminderType, string> = {
  bid_deadline: '投标截止',
  bid_open: '开标提醒',
  bond_expire: '保证金到期',
  document_update: '文档更新',
};

// 优先级样式
const priorityStyles = {
  high: {
    bg: 'bg-red-50 dark:bg-red-950/30',
    border: 'border-red-200 dark:border-red-900',
    badge: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
    icon: <AlertTriangle className="h-4 w-4 text-red-500" />,
  },
  medium: {
    bg: 'bg-yellow-50 dark:bg-yellow-950/30',
    border: 'border-yellow-200 dark:border-yellow-900',
    badge: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
    icon: <AlertCircle className="h-4 w-4 text-yellow-500" />,
  },
  low: {
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    border: 'border-blue-200 dark:border-blue-900',
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    icon: <CheckCircle className="h-4 w-4 text-blue-500" />,
  },
};

interface BiddingRemindersProps {
  compact?: boolean;
  limit?: number;
}

export function BiddingReminders({ compact = false, limit }: BiddingRemindersProps) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [summary, setSummary] = useState<ReminderSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    fetchReminders();
  }, []);

  const fetchReminders = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/biddings/reminders?days=30');
      const result = await response.json();
      if (result.success) {
        setReminders(result.data.reminders);
        setSummary(result.data.summary);
      }
    } catch (error) {
      console.error('Failed to fetch reminders:', error);
    } finally {
      setLoading(false);
    }
  };

  // 筛选提醒
  const filteredReminders = filterType === 'all'
    ? reminders
    : reminders.filter(r => r.type === filterType);

  // 限制显示数量
  const displayReminders = limit ? filteredReminders.slice(0, limit) : filteredReminders;

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          加载中...
        </CardContent>
      </Card>
    );
  }

  // 紧凑模式
  if (compact) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="h-4 w-4" />
              投标提醒
              {summary && summary.high > 0 && (
                <Badge variant="destructive" className="ml-1">{summary.high}</Badge>
              )}
            </CardTitle>
            <Link href="/bidding/reminders">
              <Button variant="ghost" size="sm">
                查看全部
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {displayReminders.length === 0 ? (
            <div className="text-center text-muted-foreground py-4">
              暂无待处理提醒
            </div>
          ) : (
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {displayReminders.map((reminder) => {
                  const styles = priorityStyles[reminder.priority];
                  return (
                    <Link
                      key={reminder.id}
                      href={`/bidding/${reminder.projectId}`}
                      className="block"
                    >
                      <div className={`p-2 rounded-lg border ${styles.bg} ${styles.border}`}>
                        <div className="flex items-start gap-2">
                          {styles.icon}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">
                              {reminder.projectName}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {reminder.message}
                            </div>
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {reminder.daysRemaining}天
                          </Badge>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    );
  }

  // 完整模式
  return (
    <div className="space-y-4">
      {/* 统计卡片 */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{summary.total}</div>
              <div className="text-sm text-muted-foreground">总提醒数</div>
            </CardContent>
          </Card>
          <Card className="border-red-200 dark:border-red-900">
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-red-600">{summary.high}</div>
              <div className="text-sm text-muted-foreground">紧急</div>
            </CardContent>
          </Card>
          <Card className="border-yellow-200 dark:border-yellow-900">
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-yellow-600">{summary.medium}</div>
              <div className="text-sm text-muted-foreground">一般</div>
            </CardContent>
          </Card>
          <Card className="border-blue-200 dark:border-blue-900">
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-blue-600">{summary.low}</div>
              <div className="text-sm text-muted-foreground">低优先级</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 提醒列表 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>投标提醒列表</CardTitle>
              <CardDescription>
                未来30天内需要关注的投标事项
              </CardDescription>
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部类型</SelectItem>
                <SelectItem value="bid_deadline">投标截止</SelectItem>
                <SelectItem value="bid_open">开标提醒</SelectItem>
                <SelectItem value="bond_expire">保证金到期</SelectItem>
                <SelectItem value="document_update">文档更新</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {displayReminders.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>暂无待处理提醒</p>
            </div>
          ) : (
            <div className="space-y-3">
              {displayReminders.map((reminder) => {
                const styles = priorityStyles[reminder.priority];
                return (
                  <Link
                    key={reminder.id}
                    href={`/bidding/${reminder.projectId}`}
                    className="block"
                  >
                    <div className={`p-4 rounded-lg border transition-colors hover:shadow-md ${styles.bg} ${styles.border}`}>
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0">
                          {typeIcons[reminder.type]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{reminder.projectName}</span>
                            <Badge className={styles.badge}>
                              {reminder.priority === 'high' ? '紧急' : 
                               reminder.priority === 'medium' ? '一般' : '低'}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {reminder.message}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              {typeIcons[reminder.type]}
                              {typeNames[reminder.type]}
                            </span>
                            <span>
                              截止日期: {format(new Date(reminder.deadline), 'yyyy-MM-dd')}
                            </span>
                            <span>
                              剩余 {reminder.daysRemaining} 天
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
