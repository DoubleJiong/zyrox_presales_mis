/**
 * 解决方案下载记录组件
 * 
 * 功能：
 * - 显示下载统计数据
 * - 显示最近下载历史
 * - 支持分页查看
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Download, 
  Users, 
  TrendingUp,
  Calendar,
  Clock,
  FileText,
  ChevronRight,
  BarChart3
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface DownloadRecord {
  id: number;
  solutionId: number;
  solutionName: string;
  fileId: number | null;
  fileName: string | null;
  userId: number | null;
  userName: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  extraData: Record<string, any> | null;
  createdAt: Date | string;
}

interface DownloadStatistics {
  totalDownloads: number;
  uniqueDownloaders: number;
  todayDownloads: number;
  weekDownloads: number;
  monthDownloads: number;
  topDownloaders: Array<{
    userId: number | null;
    userName: string;
    downloadCount: number;
  }>;
  recentDownloads: DownloadRecord[];
}

interface SolutionDownloadHistoryProps {
  solutionId: number;
  solutionName?: string;
}

export function SolutionDownloadHistory({ solutionId, solutionName }: SolutionDownloadHistoryProps) {
  const [statistics, setStatistics] = useState<DownloadStatistics | null>(null);
  const [records, setRecords] = useState<DownloadRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAllDialog, setShowAllDialog] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 0 });

  useEffect(() => {
    fetchStatistics();
  }, [solutionId]);

  useEffect(() => {
    if (showAllDialog) {
      fetchRecords(1);
    }
  }, [showAllDialog, solutionId]);

  const fetchStatistics = async () => {
    try {
      const response = await fetch(`/api/solutions/${solutionId}/downloads?type=statistics`);
      const data = await response.json();
      if (data.success) {
        setStatistics(data.data);
        setRecords(data.data.recentDownloads || []);
      }
    } catch (error) {
      console.error('Failed to fetch download statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecords = async (page: number) => {
    try {
      const response = await fetch(
        `/api/solutions/${solutionId}/downloads?type=records&page=${page}&pageSize=20`
      );
      const data = await response.json();
      if (data.success) {
        setRecords(data.data.records || data.data);
        setPagination(data.data.pagination || pagination);
      }
    } catch (error) {
      console.error('Failed to fetch download records:', error);
    }
  };

  const formatDate = (date: Date | string) => {
    try {
      const d = typeof date === 'string' ? new Date(date) : date;
      return format(d, 'yyyy-MM-dd HH:mm', { locale: zhCN });
    } catch {
      return '-';
    }
  };

  const formatRelativeTime = (date: Date | string) => {
    try {
      const d = typeof date === 'string' ? new Date(date) : date;
      return formatDistanceToNow(d, { addSuffix: true, locale: zhCN });
    } catch {
      return '-';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          加载中...
        </CardContent>
      </Card>
    );
  }

  if (!statistics) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Download className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-sm">暂无下载数据</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* 统计卡片 */}
      <div className="grid grid-cols-5 gap-3">
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <Download className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">总下载</p>
              <p className="text-lg font-semibold">{statistics.totalDownloads}</p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">下载人数</p>
              <p className="text-lg font-semibold">{statistics.uniqueDownloaders}</p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-green-500" />
            <div>
              <p className="text-xs text-muted-foreground">今日</p>
              <p className="text-lg font-semibold">{statistics.todayDownloads}</p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-blue-500" />
            <div>
              <p className="text-xs text-muted-foreground">本周</p>
              <p className="text-lg font-semibold">{statistics.weekDownloads}</p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-orange-500" />
            <div>
              <p className="text-xs text-muted-foreground">本月</p>
              <p className="text-lg font-semibold">{statistics.monthDownloads}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* 最近下载记录 */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">下载记录</CardTitle>
              <CardDescription>最近10条下载记录</CardDescription>
            </div>
            <Dialog open={showAllDialog} onOpenChange={setShowAllDialog}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm">
                  查看全部
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[80vh]">
                <DialogHeader>
                  <DialogTitle>下载记录</DialogTitle>
                </DialogHeader>
                <ScrollArea className="h-[60vh]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>下载时间</TableHead>
                        <TableHead>下载人</TableHead>
                        <TableHead>文件名</TableHead>
                        <TableHead>IP地址</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {records.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell className="text-sm">
                            {formatDate(record.createdAt)}
                          </TableCell>
                          <TableCell>
                            {record.userName || '匿名用户'}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {record.fileName || '-'}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {record.ipAddress || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {pagination.totalPages > 1 && (
                    <div className="flex justify-center gap-2 p-4">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={pagination.page === 1}
                        onClick={() => fetchRecords(pagination.page - 1)}
                      >
                        上一页
                      </Button>
                      <span className="flex items-center text-sm text-muted-foreground">
                        {pagination.page} / {pagination.totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={pagination.page >= pagination.totalPages}
                        onClick={() => fetchRecords(pagination.page + 1)}
                      >
                        下一页
                      </Button>
                    </div>
                  )}
                </ScrollArea>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground text-sm">
              暂无下载记录
            </div>
          ) : (
            <div className="space-y-2">
              {records.slice(0, 5).map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 text-sm"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div className="flex flex-col">
                      <span className="font-medium truncate max-w-[200px]">
                        {record.fileName || '批量下载'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {record.userName || '匿名用户'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{formatRelativeTime(record.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 下载排行 */}
      {statistics.topDownloaders.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">下载排行</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {statistics.topDownloaders.map((downloader, index) => (
                <div
                  key={downloader.userId || index}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      index === 0 ? 'bg-yellow-500 text-white' :
                      index === 1 ? 'bg-gray-400 text-white' :
                      index === 2 ? 'bg-amber-600 text-white' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {index + 1}
                    </span>
                    <span className="text-sm">{downloader.userName}</span>
                  </div>
                  <Badge variant="secondary">
                    {downloader.downloadCount}次
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
