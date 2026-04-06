/**
 * 解决方案项目关联可视化组件
 * 
 * 功能：
 * - 显示方案在哪些项目阶段被使用
 * - 按阶段分组展示关联项目
 * - 显示使用类型和贡献确认状态
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  Briefcase, 
  CheckCircle2,
  Clock,
  ChevronRight,
  Link2,
  Layers,
  FileText,
  AlertCircle,
  TrendingUp,
  Calendar
} from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface ProjectAssociation {
  id: number;
  solutionId: number;
  projectId: number;
  projectName: string | null;
  projectCode: string | null;
  projectStage: string | null;
  bidResult: string | null;
  estimatedAmount: string | null;
  actualAmount: string | null;
  region: string | null;
  usageType: string;
  usageCount: number;
  lastUsedAt: string | null;
  contributionConfirmed: boolean | null;
  contributionRatio: number | null;
  estimatedValue: number | null;
  actualValue: number | null;
  winContributionScore: number | null;
  feedbackScore: number | null;
  createdAt: string;
}

interface SolutionProjectVisualizationProps {
  solutionId: number;
  solutionName?: string;
}

// 阶段映射
const STAGE_LABELS: Record<string, string> = {
  opportunity: '商机阶段',
  bidding: '招投标阶段',
  won: '中标阶段',
  lost: '丢标阶段',
  archived: '归档',
};

// 阶段图标颜色
const STAGE_COLORS: Record<string, string> = {
  opportunity: 'text-blue-500',
  bidding: 'text-orange-500',
  won: 'text-green-500',
  lost: 'text-red-500',
  archived: 'text-gray-500',
};

// 使用类型映射
const USAGE_TYPE_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  reference: { label: '参考', variant: 'secondary' },
  implementation: { label: '实施', variant: 'default' },
  customization: { label: '定制', variant: 'outline' },
};

// 中标结果映射
const BID_RESULT_LABELS: Record<string, { label: string; color: string }> = {
  won: { label: '中标', color: 'text-green-600' },
  lost: { label: '丢标', color: 'text-red-600' },
  pending: { label: '待定', color: 'text-orange-600' },
};

export function SolutionProjectVisualization({ solutionId, solutionName }: SolutionProjectVisualizationProps) {
  const router = useRouter();
  const [associations, setAssociations] = useState<ProjectAssociation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAssociations();
  }, [solutionId]);

  const fetchAssociations = async () => {
    try {
      const response = await fetch(`/api/solutions/${solutionId}/projects`);
      const data = await response.json();
      if (data.success) {
        setAssociations(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch project associations:', error);
    } finally {
      setLoading(false);
    }
  };

  // 按阶段分组
  const groupedByStage = associations.reduce((acc, association) => {
    const stage = association.projectStage || 'unknown';
    if (!acc[stage]) {
      acc[stage] = [];
    }
    acc[stage].push(association);
    return acc;
  }, {} as Record<string, ProjectAssociation[]>);

  // 统计信息
  const stats = {
    totalProjects: associations.length,
    wonCount: associations.filter(a => a.bidResult === 'won').length,
    confirmedCount: associations.filter(a => a.contributionConfirmed).length,
    totalEstimatedValue: associations.reduce((sum, a) => sum + (a.estimatedValue || 0), 0),
    totalActualValue: associations.reduce((sum, a) => sum + (a.actualValue || 0), 0),
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    try {
      return format(new Date(dateStr), 'yyyy-MM-dd', { locale: zhCN });
    } catch {
      return '-';
    }
  };

  const formatCurrency = (value: number | string | null) => {
    if (!value) return '-';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '-';
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      maximumFractionDigits: 0,
    }).format(num);
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

  if (associations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Layers className="h-4 w-4" />
            项目关联
          </CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Link2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-sm">暂无项目关联</p>
          <p className="text-xs mt-1">此方案尚未被任何项目使用</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-3">
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">关联项目</p>
              <p className="text-lg font-semibold">{stats.totalProjects}</p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <div>
              <p className="text-xs text-muted-foreground">中标项目</p>
              <p className="text-lg font-semibold">{stats.wonCount}</p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-blue-500" />
            <div>
              <p className="text-xs text-muted-foreground">贡献确认</p>
              <p className="text-lg font-semibold">{stats.confirmedCount}</p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-orange-500" />
            <div>
              <p className="text-xs text-muted-foreground">预估价值</p>
              <p className="text-sm font-semibold">{formatCurrency(stats.totalEstimatedValue)}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* 按阶段分组的项目列表 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">项目使用分布</CardTitle>
          <CardDescription>按项目阶段查看方案使用情况</CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" defaultValue={Object.keys(groupedByStage)} className="w-full">
            {Object.entries(groupedByStage).map(([stage, projects]) => (
              <AccordionItem key={stage} value={stage}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Briefcase className={`h-4 w-4 ${STAGE_COLORS[stage] || 'text-gray-500'}`} />
                    <span className="font-medium">{STAGE_LABELS[stage] || stage}</span>
                    <Badge variant="secondary" className="ml-2">{projects.length}</Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2 pt-2">
                    {projects.map((project) => (
                      <div
                        key={project.id}
                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => router.push(`/projects/${project.projectId}`)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col">
                            <span className="font-medium text-sm flex items-center gap-2">
                              {project.projectName || '未知项目'}
                              {project.bidResult && (
                                <Badge variant="outline" className={`text-xs ${BID_RESULT_LABELS[project.bidResult]?.color || ''}`}>
                                  {BID_RESULT_LABELS[project.bidResult]?.label || project.bidResult}
                                </Badge>
                              )}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {project.projectCode} · {project.region || '-'}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          {/* 使用类型 */}
                          <Badge variant={USAGE_TYPE_LABELS[project.usageType]?.variant || 'outline'}>
                            {USAGE_TYPE_LABELS[project.usageType]?.label || project.usageType}
                          </Badge>
                          
                          {/* 贡献确认状态 */}
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div>
                                  {project.contributionConfirmed ? (
                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                  ) : (
                                    <AlertCircle className="h-4 w-4 text-orange-500" />
                                  )}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                {project.contributionConfirmed ? '贡献已确认' : '贡献待确认'}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          
                          {/* 使用次数 */}
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <FileText className="h-3 w-3" />
                            <span>{project.usageCount}次</span>
                          </div>
                          
                          {/* 最后使用时间 */}
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>{formatDate(project.lastUsedAt || project.createdAt)}</span>
                          </div>
                          
                          {/* 预估金额 */}
                          {project.estimatedAmount && (
                            <span className="text-xs font-medium">
                              {formatCurrency(project.estimatedAmount)}
                            </span>
                          )}
                          
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
