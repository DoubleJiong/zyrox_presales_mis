'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Download, RefreshCw, AlertCircle, Info, CheckCircle, XCircle } from 'lucide-react';

interface SystemLog {
  id: number;
  userId: number;
  userName: string;
  action: string;
  module: string;
  details: string;
  ip?: string | null;
  status: 'success' | 'failed';
  createdAt: string;
}

export default function SystemLogsSettings() {
  const { toast } = useToast();
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [moduleFilter, setModuleFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    void loadLogs();
  }, []);

  useEffect(() => {
    filterLogs();
  }, [logs, searchTerm, statusFilter, moduleFilter]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/operation-logs?page=1&pageSize=200');
      if (!response.ok) {
        throw new Error('获取系统日志失败');
      }

      const result = await response.json();
      const items = Array.isArray(result?.data) ? result.data : [];
      setLogs(items);
    } catch (error) {
      console.error('Failed to fetch system logs:', error);
      toast({
        title: '加载失败',
        description: '获取系统日志失败，请稍后重试',
        variant: 'destructive',
      });
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const filterLogs = () => {
    let filtered = logs;

    if (searchTerm) {
      filtered = filtered.filter(
        (log) =>
          (log.userName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
          (log.action?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
          (log.module?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
          (log.details?.toLowerCase() || '').includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((log) => log.status === statusFilter);
    }

    if (moduleFilter !== 'all') {
      filtered = filtered.filter((log) => log.module === moduleFilter);
    }

    setFilteredLogs(filtered);
  };

  const handleExport = () => {
    // 模拟导出
    toast({
      title: '开始导出',
      description: '导出系统日志数据...',
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge variant="default" className="bg-green-500">成功</Badge>;
      case 'failed':
        return <Badge variant="destructive">失败</Badge>;
      default:
        return <Badge variant="secondary">未知</Badge>;
    }
  };

  const modules = Array.from(new Set(logs.map((log) => log.module)));

  const paginatedLogs = filteredLogs.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(filteredLogs.length / pageSize);

  return (
    <Card data-testid="system-logs-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>系统日志</CardTitle>
            <CardDescription>查看系统操作日志和审计记录</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => void loadLogs()} disabled={loading} data-testid="system-logs-refresh-button">
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              刷新
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport} data-testid="system-logs-export-button">
              <Download className="h-4 w-4 mr-2" />
              导出
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex gap-4 mb-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                data-testid="system-logs-search-input"
                placeholder="搜索日志..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[120px]" data-testid="system-logs-status-filter">
              <SelectValue placeholder="状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="success">成功</SelectItem>
              <SelectItem value="failed">失败</SelectItem>
            </SelectContent>
          </Select>
          <Select value={moduleFilter} onValueChange={setModuleFilter}>
            <SelectTrigger className="w-[150px]" data-testid="system-logs-module-filter">
              <SelectValue placeholder="模块" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部模块</SelectItem>
              {modules.map((module) => (
                <SelectItem key={module} value={module}>
                  {module}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Logs Table */}
        <ScrollArea className="h-[500px] rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">状态</TableHead>
                <TableHead className="w-[100px]">时间</TableHead>
                <TableHead className="w-[100px]">用户</TableHead>
                <TableHead className="w-[100px]">模块</TableHead>
                <TableHead>操作</TableHead>
                <TableHead>详情</TableHead>
                <TableHead className="w-[130px]">IP地址</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8" data-testid="system-logs-loading-state">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>加载中...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : paginatedLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8" data-testid="system-logs-empty-state">
                    暂无日志记录
                  </TableCell>
                </TableRow>
              ) : (
                paginatedLogs.map((log) => (
                  <TableRow key={log.id} data-testid={`system-logs-row-${log.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(log.status)}
                        {getStatusBadge(log.status)}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{log.createdAt}</TableCell>
                    <TableCell className="text-sm">{log.userName}</TableCell>
                    <TableCell className="text-sm">{log.module}</TableCell>
                    <TableCell className="font-medium">{log.action}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{log.details}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{log.ip || '-'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              共 {filteredLogs.length} 条记录，第 {page} / {totalPages} 页
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                上一页
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                下一页
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
