/**
 * 方案项目关联组件（只读展示）
 * 
 * 功能：
 * - 显示关联的项目列表（数据来源：项目管理模块绑定）
 * - 查看贡献确认状态
 * - 价值追踪
 * - 项目关联可视化
 * - 下载记录统计
 * 
 * 设计原则：
 * - 数据修改入口唯一：项目关联在项目管理模块操作
 * - 本组件仅展示和确认贡献
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Briefcase,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  ExternalLink,
  Info,
  Download,
  Users,
  BarChart3,
} from 'lucide-react';
import { SolutionProjectVisualization } from './solution-project-visualization';
import { SolutionDownloadHistory } from './solution-download-history';

interface ProjectAssociation {
  id: number;
  solutionId: number;
  projectId: number;
  subSchemeId: number | null;
  versionId: number | null;
  usageType: 'reference' | 'implementation' | 'customization';
  usageCount: number;
  lastUsedAt: string | null;
  contributionConfirmed: boolean;
  contributionRatio: string | null;
  estimatedValue: string | null;
  actualValue: string | null;
  winContributionScore: string | null;
  feedbackScore: string | null;
  createdAt: string;
  // 项目信息
  projectName: string | null;
  projectCode: string | null;
  projectStage: string | null;
  bidResult: string | null;
  estimatedAmount: string | null;
  actualAmount: string | null;
  region: string | null;
}

interface SolutionProjectsTabProps {
  solutionId: number;
  solutionName?: string;
  permissions: {
    permissions?: {
      canEdit: boolean;
    };
  } | null;
}

const usageTypeConfig: Record<string, { label: string; color: string }> = {
  reference: { label: '参考引用', color: 'bg-blue-100 text-blue-800' },
  implementation: { label: '直接实施', color: 'bg-green-100 text-green-800' },
  customization: { label: '定制改造', color: 'bg-purple-100 text-purple-800' },
};

const bidResultConfig: Record<string, { label: string; icon: any; color: string }> = {
  won: { label: '中标', icon: CheckCircle2, color: 'text-green-600' },
  lost: { label: '失标', icon: XCircle, color: 'text-red-600' },
  pending: { label: '进行中', icon: Clock, color: 'text-yellow-600' },
};

export function SolutionProjectsTab({ solutionId, solutionName, permissions }: SolutionProjectsTabProps) {
  const router = useRouter();
  
  const [associations, setAssociations] = useState<ProjectAssociation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState('list');

  useEffect(() => {
    fetchAssociations();
  }, [solutionId]);

  const fetchAssociations = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/solutions/${solutionId}/projects`);
      if (response.ok) {
        const data = await response.json();
        setAssociations(data.data || data.associations || []);
      }
    } catch (error) {
      console.error('Failed to fetch associations:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('zh-CN');
  };

  const formatAmount = (amount: string | null) => {
    if (!amount) return '-';
    const num = parseFloat(amount);
    if (num >= 10000) {
      return `${(num / 10000).toFixed(2)}万`;
    }
    return num.toFixed(2);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">加载关联项目...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 子Tab切换 */}
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
        <TabsList>
          <TabsTrigger value="list">
            <Briefcase className="h-4 w-4 mr-1" />
            项目列表
          </TabsTrigger>
          <TabsTrigger value="visualization">
            <BarChart3 className="h-4 w-4 mr-1" />
            可视化
          </TabsTrigger>
          <TabsTrigger value="downloads">
            <Download className="h-4 w-4 mr-1" />
            下载记录
          </TabsTrigger>
        </TabsList>

        {/* 项目列表 */}
        <TabsContent value="list" className="mt-4">
          {/* 提示信息 */}
          <div className="flex items-start gap-2 p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground mb-4">
            <Info className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              项目关联与贡献确认都应在<strong>项目管理模块</strong>中完成。本页面只展示已关联项目及其当前确认状态。
            </div>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5" />
                    关联项目
                  </CardTitle>
                  <CardDescription>共 {associations.length} 个项目使用此方案</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {associations.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>项目名称</TableHead>
                      <TableHead>使用类型</TableHead>
                      <TableHead>项目阶段</TableHead>
                      <TableHead>结果</TableHead>
                      <TableHead>预估金额</TableHead>
                      <TableHead>贡献确认</TableHead>
                      <TableHead>使用次数</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {associations.map((assoc) => {
                      const bidResult = bidResultConfig[assoc.bidResult || 'pending'];
                      const ResultIcon = bidResult.icon;
                      
                      return (
                        <TableRow key={assoc.id}>
                          <TableCell>
                            <button
                              onClick={() => router.push(`/projects/${assoc.projectId}`)}
                              className="font-medium hover:text-primary flex items-center gap-1 text-left"
                            >
                              {assoc.projectName}
                              <ExternalLink className="h-3 w-3" />
                            </button>
                            <div className="text-xs text-muted-foreground">{assoc.projectCode}</div>
                          </TableCell>
                          <TableCell>
                            <Badge className={usageTypeConfig[assoc.usageType]?.color || ''}>
                              {usageTypeConfig[assoc.usageType]?.label || assoc.usageType}
                            </Badge>
                          </TableCell>
                          <TableCell>{assoc.projectStage || '-'}</TableCell>
                          <TableCell>
                            <div className={`flex items-center gap-1 ${bidResult.color}`}>
                              <ResultIcon className="h-4 w-4" />
                              <span>{bidResult.label}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {assoc.estimatedAmount ? `¥${formatAmount(assoc.estimatedAmount)}` : '-'}
                          </TableCell>
                          <TableCell>
                            {assoc.contributionConfirmed ? (
                              <Badge variant="outline" className="text-green-600 border-green-600">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                已确认
                              </Badge>
                            ) : (
                              <Badge variant="secondary">待确认</Badge>
                            )}
                          </TableCell>
                          <TableCell>{assoc.usageCount}</TableCell>
                          <TableCell className="text-right">
                            {assoc.bidResult === 'won' ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                title="前往项目处理"
                                onClick={() => router.push(`/projects/${assoc.projectId}`)}
                              >
                                <TrendingUp className="h-4 w-4 mr-1" />
                                前往项目处理
                              </Button>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>暂无关联项目</p>
                  <p className="text-sm mt-2">请在项目管理模块中将此方案与项目关联</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 可视化视图 */}
        <TabsContent value="visualization" className="mt-4">
          <SolutionProjectVisualization solutionId={solutionId} solutionName={solutionName} />
        </TabsContent>

        {/* 下载记录 */}
        <TabsContent value="downloads" className="mt-4">
          <SolutionDownloadHistory solutionId={solutionId} solutionName={solutionName} />
        </TabsContent>
      </Tabs>

    </div>
  );
}
