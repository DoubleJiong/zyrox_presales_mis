'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  MoreHorizontal, 
  Eye, 
  Pencil, 
  Trash2,
  FileText,
  Calendar,
  User,
} from 'lucide-react';

// 周报数据接口
interface WeeklyReportItem {
  id: number;
  type: string;
  userId: number | null;
  userName: string | null;
  weekStart: string;
  weekEnd: string;
  content: {
    summary: string;
    statistics: {
      newCustomers: number;
      followUpCount: number;
      projectProgress: number;
      taskCompleted: number;
      opportunityCount: number;
      biddingCount: number;
    };
    highlights: string[];
    nextWeekPlan: string[];
    issues: string[];
    supportNeeds: string[];
  };
  generatedAt: string;
  sentAt: string | null;
  sent: boolean;
}

// 报告类型标签
const REPORT_TYPE_LABELS: Record<string, string> = {
  personal: '个人周报',
  global: '全局周报',
};

// 报告类型颜色
const REPORT_TYPE_COLORS: Record<string, string> = {
  personal: 'bg-primary text-primary-foreground',
  global: 'bg-success text-success-foreground',
};

interface ReportListProps {
  reports: WeeklyReportItem[];
  onView?: (report: WeeklyReportItem) => void;
  onEdit?: (report: WeeklyReportItem) => void;
  onDelete?: (reportId: number) => void;
  className?: string;
}

export function ReportList({
  reports,
  onView,
  onEdit,
  onDelete,
  className,
}: ReportListProps) {
  if (reports.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileText className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">暂无周报</h3>
        <p className="text-sm text-muted-foreground mt-1">
          点击上方按钮生成新的周报
        </p>
      </div>
    );
  }

  return (
    <div className={cn('rounded-md border', className)}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-20">类型</TableHead>
            <TableHead className="w-40">周次</TableHead>
            <TableHead>摘要</TableHead>
            <TableHead className="w-24">状态</TableHead>
            <TableHead className="w-32">生成时间</TableHead>
            <TableHead className="w-20">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reports.map((report) => (
            <TableRow key={report.id} className="cursor-pointer hover:bg-muted/50">
              <TableCell>
                <Badge className={cn('text-xs', REPORT_TYPE_COLORS[report.type] || 'bg-muted')}>
                  {REPORT_TYPE_LABELS[report.type] || report.type}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {formatDateRange(report.weekStart, report.weekEnd)}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <div className="max-w-md">
                  <p className="text-sm truncate">{report.content.summary}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span>任务: {report.content.statistics.taskCompleted}</span>
                    <span>客户: {report.content.statistics.newCustomers}</span>
                    <span>商机: {report.content.statistics.opportunityCount}</span>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                {report.sent ? (
                  <Badge variant="outline" className="text-success border-success">
                    已发送
                  </Badge>
                ) : (
                  <Badge variant="outline">
                    未发送
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {formatDateTime(report.generatedAt)}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onView?.(report)}>
                      <Eye className="h-4 w-4 mr-2" />
                      查看
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEdit?.(report)}>
                      <Pencil className="h-4 w-4 mr-2" />
                      编辑
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="text-destructive"
                      onClick={() => onDelete?.(report.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      删除
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// 辅助函数：格式化日期范围
function formatDateRange(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  
  const formatOptions: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
  };
  
  return `${startDate.toLocaleDateString('zh-CN', formatOptions)} - ${endDate.toLocaleDateString('zh-CN', formatOptions)}`;
}

// 辅助函数：格式化日期时间
function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default ReportList;
