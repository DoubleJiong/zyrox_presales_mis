'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { 
  Calendar,
  User,
  FileText,
  CheckCircle,
  AlertCircle,
  Clock,
  ArrowRight,
  Download,
  Share2,
  Printer,
  Loader2,
  Pencil,
  Save,
  X,
} from 'lucide-react';

// 周报详情接口
export interface WeeklyReportContent {
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
}

export interface WeeklyReportDetail {
  id: number;
  type: string;
  userId: number | null;
  userName: string | null;
  weekStart: string;
  weekEnd: string;
  content: WeeklyReportContent;
  generatedAt: string;
  sentAt: string | null;
  sent: boolean;
  user?: {
    id: number;
    realName: string;
    email: string;
  } | null;
}

interface ReportViewerProps {
  report: WeeklyReportDetail;
  editableContent?: WeeklyReportContent;
  isEditing?: boolean;
  isSaving?: boolean;
  onEdit?: () => void;
  onSave?: () => void;
  onCancelEdit?: () => void;
  onContentChange?: (content: WeeklyReportContent) => void;
  onExport?: () => void;
  onShare?: () => void;
  onPrint?: () => void;
  className?: string;
}

export function ReportViewer({
  report,
  editableContent,
  isEditing = false,
  isSaving = false,
  onEdit,
  onSave,
  onCancelEdit,
  onContentChange,
  onExport,
  onShare,
  onPrint,
  className,
}: ReportViewerProps) {
  const weekNumber = getWeekNumber(new Date(report.weekStart));
  const content = editableContent ?? report.content;

  const updateContent = (patch: Partial<WeeklyReportContent>) => {
    if (!onContentChange) {
      return;
    }

    onContentChange({
      ...content,
      ...patch,
    });
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* 头部信息 */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold">
              第 {weekNumber} 周工作周报
            </h2>
            <Badge variant="outline">
              {report.type === 'personal' ? '个人周报' : '全局周报'}
            </Badge>
          </div>
          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>
                {formatDate(report.weekStart)} - {formatDate(report.weekEnd)}
              </span>
            </div>
            {report.userName && (
              <div className="flex items-center gap-1">
                <User className="h-4 w-4" />
                <span>{report.userName}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>生成于 {formatDateTime(report.generatedAt)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" size="sm" onClick={onCancelEdit} disabled={isSaving}>
                <X className="h-4 w-4 mr-1" />
                取消
              </Button>
              <Button size="sm" onClick={onSave} disabled={isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                保存
              </Button>
            </>
          ) : onEdit ? (
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Pencil className="h-4 w-4 mr-1" />
              编辑
            </Button>
          ) : null}
          <Button variant="outline" size="sm" onClick={onPrint}>
            <Printer className="h-4 w-4 mr-1" />
            打印
          </Button>
          <Button variant="outline" size="sm" onClick={onExport}>
            <Download className="h-4 w-4 mr-1" />
            导出
          </Button>
          <Button variant="outline" size="sm" onClick={onShare}>
            <Share2 className="h-4 w-4 mr-1" />
            分享
          </Button>
        </div>
      </div>

      {/* 统计概览 */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <StatCard
          label="完成任务"
          value={report.content.statistics.taskCompleted}
          icon={<CheckCircle className="h-4 w-4" />}
        />
        <StatCard
          label="新增客户"
          value={report.content.statistics.newCustomers}
          icon={<User className="h-4 w-4" />}
        />
        <StatCard
          label="跟进次数"
          value={report.content.statistics.followUpCount}
          icon={<ArrowRight className="h-4 w-4" />}
        />
        <StatCard
          label="项目进度"
          value={`${report.content.statistics.projectProgress}%`}
          icon={<FileText className="h-4 w-4" />}
        />
        <StatCard
          label="商机数量"
          value={report.content.statistics.opportunityCount}
          icon={<ArrowRight className="h-4 w-4" />}
        />
        <StatCard
          label="投标数量"
          value={report.content.statistics.biddingCount}
          icon={<FileText className="h-4 w-4" />}
        />
      </div>

      {/* 工作总结 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">本周工作总结</CardTitle>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <Textarea
              value={content.summary}
              onChange={(event) => updateContent({ summary: event.target.value })}
              className="min-h-32 text-sm"
              placeholder="请输入本周工作总结"
            />
          ) : (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {content.summary}
            </p>
          )}
        </CardContent>
      </Card>

      {/* 工作亮点 */}
      {(isEditing || content.highlights.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-success" />
              工作亮点
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <Textarea
                value={toTextareaValue(content.highlights)}
                onChange={(event) => updateContent({ highlights: parseLines(event.target.value) })}
                className="min-h-28 text-sm"
                placeholder="每行一条工作亮点"
              />
            ) : (
              <ul className="space-y-2">
                {content.highlights.map((highlight, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <span className="text-success mt-0.5">•</span>
                    <span>{highlight}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {/* 风险与问题 */}
      {(isEditing || content.issues.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-warning" />
              风险与问题
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <Textarea
                value={toTextareaValue(content.issues)}
                onChange={(event) => updateContent({ issues: parseLines(event.target.value) })}
                className="min-h-28 text-sm"
                placeholder="每行一条风险或问题"
              />
            ) : (
              <ul className="space-y-2">
                {content.issues.map((issue, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <span className="text-warning mt-0.5">•</span>
                    <span>{issue}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {/* 下周计划 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ArrowRight className="h-5 w-5 text-primary" />
            下周工作计划
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <Textarea
              value={toTextareaValue(content.nextWeekPlan)}
              onChange={(event) => updateContent({ nextWeekPlan: parseLines(event.target.value) })}
              className="min-h-28 text-sm"
              placeholder="每行一条下周计划"
            />
          ) : content.nextWeekPlan.length > 0 ? (
            <ul className="space-y-2">
              {content.nextWeekPlan.map((plan, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <span className="text-primary mt-0.5">{index + 1}.</span>
                  <span>{plan}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">暂无下周计划</p>
          )}
        </CardContent>
      </Card>

      {/* 需要协调的事项 */}
      {(isEditing || content.supportNeeds.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">需要协调的事项</CardTitle>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <Textarea
                value={toTextareaValue(content.supportNeeds)}
                onChange={(event) => updateContent({ supportNeeds: parseLines(event.target.value) })}
                className="min-h-28 text-sm"
                placeholder="每行一条需要协调的事项"
              />
            ) : (
              <ul className="space-y-2">
                {content.supportNeeds.map((need, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <span className="text-muted-foreground mt-0.5">•</span>
                    <span>{need}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// 统计卡片组件
function StatCard({ 
  label, 
  value, 
  icon 
}: { 
  label: string; 
  value: string | number; 
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
      <div className="p-2 rounded-md bg-primary/10 text-primary">
        {icon}
      </div>
      <div>
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

// 辅助函数：获取周数
function getWeekNumber(date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

// 辅助函数：格式化日期
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
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

function parseLines(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function toTextareaValue(items: string[]): string {
  return items.join('\n');
}

export default ReportViewer;
