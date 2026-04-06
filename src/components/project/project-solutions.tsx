'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { apiClient } from '@/lib/api-client';
import { SolutionSelectorDialog } from '@/components/solution/solution-selector-dialog';
import { useToast } from '@/hooks/use-toast';
import {
  FileText,
  Plus,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Star,
  Building2,
  CheckCircle,
  CheckCircle2,
  Clock,
  Loader2,
  TrendingUp,
} from 'lucide-react';

interface ProjectSolution {
  id: number;
  solutionId: number;
  solutionCode: string;
  solutionName: string;
  solutionVersion?: string;
  version?: string;
  usageType: 'reference' | 'implementation' | 'customization';
  implementationStatus: string | null;
  implementationDate: string | null;
  industry: string | null;
  scenario: string | null;
  author: { id: number; name: string } | null;
  isTemplate: boolean;
  rating: string | null;
  tags: string[] | null;
  associatedAt: string;
  sourceType: string;
  stageBound: string | null;
  customizationDetails: string | null;
  businessValue: string | null;
  subSchemeName?: string | null;
  contributionConfirmed?: boolean;
  contributionRatio?: string | null;
  estimatedValue?: string | null;
  actualValue?: string | null;
  winContributionScore?: string | null;
  feedbackScore?: string | null;
  feedbackContent?: string | null;
  createdAt?: string;
}

interface ProjectSolutionsProps {
  projectId: number;
  projectIndustry?: string;
  onSolutionChange?: () => void;
  editable?: boolean;
}

const USAGE_TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  reference: { label: '参考方案', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  implementation: { label: '实施方案', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  customization: { label: '定制方案', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
};

const STATUS_CONFIG: Record<string, { label: string; icon: any }> = {
  planned: { label: '计划中', icon: Clock },
  in_progress: { label: '进行中', icon: Clock },
  completed: { label: '已完成', icon: CheckCircle },
};

export function ProjectSolutions({
  projectId,
  projectIndustry,
  onSolutionChange,
  editable = true,
}: ProjectSolutionsProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [solutions, setSolutions] = useState<ProjectSolution[]>([]);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [solutionToDelete, setSolutionToDelete] = useState<ProjectSolution | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [solutionToConfirm, setSolutionToConfirm] = useState<ProjectSolution | null>(null);
  const [contributionForm, setContributionForm] = useState({
    contributionRatio: '',
    estimatedValue: '',
    actualValue: '',
    winContributionScore: '',
    feedbackScore: '',
    feedbackContent: '',
  });

  const fetchSolutions = useCallback(async () => {
    setLoading(true);
    try {
      const { data: result } = await apiClient.get<{ success: boolean; data: ProjectSolution[] }>(
        `/api/projects/${projectId}/solutions`
      );
      if (result.success) {
        setSolutions(result.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch solutions:', error);
      toast({ title: '获取方案列表失败', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [projectId, toast]);

  useEffect(() => {
    if (projectId) {
      fetchSolutions();
    }
  }, [projectId, fetchSolutions]);

  const handleSelectSolution = async (solution: any, usageType: string) => {
    setActionLoading(true);
    try {
      const response = await apiClient.post<{ success: boolean; data?: any; error?: { code?: string; message?: string } | string }>(
        `/api/projects/${projectId}/solutions`,
        {
          solutionId: solution.id,
          subSchemeId: solution.selectedSubScheme?.id,
          usageType,
        }
      );
      const result = response.data;
      const status = response.status;
      
      if ((status === 200 || status === 201) && result?.success) {
        // 如果是定制方案，显示特殊提示
        if (usageType === 'customization' && result.data?.customSolution) {
          toast({ 
            title: '定制方案创建成功', 
            description: `已创建定制方案副本，可点击查看详情上传文件`
          });
        } else {
          toast({ title: '关联成功', description: `已关联方案: ${solution.solutionName}` });
        }
        fetchSolutions();
        onSolutionChange?.();
        setSelectorOpen(false);
      } else {
        // 提取错误信息 - 处理多种错误格式
        let errorMsg = '关联解决方案失败';
        if (result?.error) {
          if (typeof result.error === 'string') {
            errorMsg = result.error;
          } else if (typeof result.error === 'object' && result.error.message) {
            errorMsg = result.error.message;
          } else {
            try {
              errorMsg = JSON.stringify(result.error);
            } catch {
              errorMsg = '发生未知错误';
            }
          }
        }
        console.error('关联方案失败:', { status, result, errorMsg });
        toast({ 
          title: '关联失败', 
          description: errorMsg,
          variant: 'destructive' 
        });
      }
    } catch (error: unknown) {
      console.error('Failed to associate solution:', error);
      const errorMsg = error instanceof Error ? error.message : '网络请求失败，请稍后重试';
      toast({ 
        title: '关联失败', 
        description: errorMsg,
        variant: 'destructive' 
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveSolution = async () => {
    if (!solutionToDelete) return;
    
    setActionLoading(true);
    try {
      const { data: result } = await apiClient.delete<{ success: boolean }>(
        `/api/projects/${projectId}/solutions/${solutionToDelete.id}`
      );
      if (result.success) {
        toast({ title: '已取消关联' });
        fetchSolutions();
        onSolutionChange?.();
      }
    } catch (error) {
      console.error('Failed to remove solution:', error);
      toast({ title: '取消关联失败', variant: 'destructive' });
    } finally {
      setActionLoading(false);
      setDeleteDialogOpen(false);
      setSolutionToDelete(null);
    }
  };

  const confirmDelete = (solution: ProjectSolution) => {
    setSolutionToDelete(solution);
    setDeleteDialogOpen(true);
  };

  const openConfirmDialog = (solution: ProjectSolution) => {
    setSolutionToConfirm(solution);
    setContributionForm({
      contributionRatio: solution.contributionRatio ? String(Number(solution.contributionRatio) * 100) : '',
      estimatedValue: solution.estimatedValue || '',
      actualValue: solution.actualValue || '',
      winContributionScore: solution.winContributionScore || '',
      feedbackScore: solution.feedbackScore || '',
      feedbackContent: solution.feedbackContent || '',
    });
    setConfirmDialogOpen(true);
  };

  const handleConfirmContribution = async () => {
    if (!solutionToConfirm) return;

    setActionLoading(true);
    try {
      const { data: result } = await apiClient.put<{ success: boolean }>(
        `/api/projects/${projectId}/solutions/${solutionToConfirm.id}`,
        {
          contributionConfirmed: true,
          ...contributionForm,
        }
      );

      if (result.success) {
        toast({ title: '贡献确认成功' });
        fetchSolutions();
        onSolutionChange?.();
        setConfirmDialogOpen(false);
        setSolutionToConfirm(null);
      }
    } catch (error) {
      console.error('Failed to confirm contribution:', error);
      toast({ title: '贡献确认失败', variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              解决方案
            </CardTitle>
            <CardDescription>
              关联的解决方案（可选挂接其子方案）({solutions.length})
            </CardDescription>
          </div>
          {editable && (
            <Button size="sm" onClick={() => setSelectorOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              关联方案
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : solutions.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>暂无关联的解决方案</p>
            <p className="text-sm mt-1">点击"关联方案"从方案库选择</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-3 pr-4">
              {solutions.map((solution) => (
                <div
                  key={solution.id}
                  data-testid="project-associated-solution-card"
                  data-solution-name={solution.solutionName}
                  className="flex items-start justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors group"
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mt-0.5">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <div className="font-medium truncate" title={solution.solutionName}>{solution.solutionName}</div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge className={`${USAGE_TYPE_CONFIG[solution.usageType]?.color} truncate`}>
                          {USAGE_TYPE_CONFIG[solution.usageType]?.label}
                        </Badge>
                        {solution.contributionConfirmed ? (
                          <Badge variant="outline" className="text-green-600 border-green-600">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            贡献已确认
                          </Badge>
                        ) : (
                          <Badge variant="secondary">贡献待确认</Badge>
                        )}
                        {solution.implementationStatus && (
                          <Badge variant="outline" className="text-xs truncate">
                            {STATUS_CONFIG[solution.implementationStatus]?.label || solution.implementationStatus}
                          </Badge>
                        )}
                        {solution.rating && (
                          <span className="flex items-center gap-1 text-sm text-muted-foreground flex-shrink-0">
                            <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                            {solution.rating}
                          </span>
                        )}
                        {solution.industry && (
                          <span className="flex items-center gap-1 text-sm text-muted-foreground truncate max-w-[120px]" title={solution.industry}>
                            <Building2 className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{solution.industry}</span>
                          </span>
                        )}
                      </div>
                      {/* 引用信息 */}
                      <div className="text-sm text-muted-foreground mt-2 space-y-1">
                        <div className="flex items-center gap-4 flex-wrap">
                          <span className="truncate">引用人: <span className="font-medium text-foreground">{solution.author?.name || '系统管理员'}</span></span>
                          <span className="truncate">引用时间: <span className="font-medium text-foreground">{new Date(solution.associatedAt).toLocaleDateString()}</span></span>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="truncate">引用方案: <span className="font-medium text-foreground">{solution.solutionCode}</span></span>
                          <span className="truncate">版本: <span className="font-medium text-foreground">v{solution.solutionVersion || solution.version || '-'}</span></span>
                          {solution.subSchemeName && (
                            <span className="truncate">子方案: <span className="font-medium text-foreground">{solution.subSchemeName}</span></span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  {editable && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <Button variant="ghost" size="sm" title="查看详情">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" data-testid="project-solution-actions-button">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openConfirmDialog(solution)}>
                            <TrendingUp className="mr-2 h-4 w-4" />
                            确认方案贡献
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="mr-2 h-4 w-4" />
                            编辑关联信息
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-red-600 focus:text-red-600"
                            onClick={() => confirmDelete(solution)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            取消关联
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {/* 底部提示 */}
        <div className="mt-4 pt-4 border-t">
          <p className="text-sm text-muted-foreground text-center">
            如需项目专用内容，请先在解决方案详情内维护定制方案或子方案，再回到这里关联解决方案
          </p>
        </div>
      </CardContent>

      {/* 方案选择对话框 */}
      <SolutionSelectorDialog
        open={selectorOpen}
        onOpenChange={setSelectorOpen}
        onSelect={handleSelectSolution}
        projectId={projectId}
        projectIndustry={projectIndustry}
        loading={actionLoading}
        existingSolutionIds={solutions.map(s => s.solutionId)}
      />

      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认方案贡献</DialogTitle>
            <DialogDescription>在项目模块内确认该方案对当前项目的贡献与价值。</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {solutionToConfirm && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="font-medium">{solutionToConfirm.solutionName}</div>
                <div className="text-sm text-muted-foreground">{solutionToConfirm.solutionCode}</div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>贡献占比 (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={contributionForm.contributionRatio}
                  onChange={(e) => setContributionForm({ ...contributionForm, contributionRatio: e.target.value })}
                  placeholder="0-100"
                />
              </div>
              <div>
                <Label>预估价值 (元)</Label>
                <Input
                  type="number"
                  value={contributionForm.estimatedValue}
                  onChange={(e) => setContributionForm({ ...contributionForm, estimatedValue: e.target.value })}
                  placeholder="金额"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>实际价值 (元)</Label>
                <Input
                  type="number"
                  value={contributionForm.actualValue}
                  onChange={(e) => setContributionForm({ ...contributionForm, actualValue: e.target.value })}
                  placeholder="金额"
                />
              </div>
              <div>
                <Label>中标贡献分 (1-10)</Label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={contributionForm.winContributionScore}
                  onChange={(e) => setContributionForm({ ...contributionForm, winContributionScore: e.target.value })}
                  placeholder="1-10"
                />
              </div>
            </div>
            <div>
              <Label>反馈评分 (1-5)</Label>
              <Input
                type="number"
                min="1"
                max="5"
                step="0.1"
                value={contributionForm.feedbackScore}
                onChange={(e) => setContributionForm({ ...contributionForm, feedbackScore: e.target.value })}
                placeholder="1-5"
              />
            </div>
            <div>
              <Label>反馈评价</Label>
              <Textarea
                value={contributionForm.feedbackContent}
                onChange={(e) => setContributionForm({ ...contributionForm, feedbackContent: e.target.value })}
                placeholder="方案在项目中的应用效果、改进建议等..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)} disabled={actionLoading}>
              取消
            </Button>
            <Button onClick={handleConfirmContribution} disabled={actionLoading}>
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              确认提交
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认取消关联</AlertDialogTitle>
            <AlertDialogDescription>
              确定要取消关联 "{solutionToDelete?.solutionName}" 吗？此操作不会删除原方案，只是取消与当前项目的关联。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>取消</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleRemoveSolution}
              disabled={actionLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              确认取消
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
