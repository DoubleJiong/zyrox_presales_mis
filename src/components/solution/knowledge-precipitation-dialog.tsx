'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { FileText, BookOpen, CheckCircle2, AlertCircle } from 'lucide-react';

interface PrecipitableSolution {
  id: number;
  solutionName: string;
  solutionCode: string;
  version: string;
  usageType: string;
  hasSnapshot: boolean;
}

interface KnowledgePrecipitationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: number;
  projectName: string;
  onSuccess: () => void;
}

export function KnowledgePrecipitationDialog({
  open,
  onOpenChange,
  projectId,
  projectName,
  onSuccess,
}: KnowledgePrecipitationDialogProps) {
  const [solutions, setSolutions] = useState<PrecipitableSolution[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [templateCategory, setTemplateCategory] = useState('best_practice');
  const [templateScope, setTemplateScope] = useState('company');
  const [knowledgeNotes, setKnowledgeNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 获取可沉淀的方案列表
  useEffect(() => {
    if (open && projectId) {
      fetchPrecipitableSolutions();
    }
  }, [open, projectId]);

  const fetchPrecipitableSolutions = async () => {
    setLoading(true);
    try {
      const { data: result } = await apiClient.get<{ success: boolean; data?: PrecipitableSolution[] }>(
        `/api/projects/${projectId}/knowledge-precipitation`
      );
      const data = (result as any).data || [];
      setSolutions(Array.isArray(data) ? data : []);
      // 默认全选
      setSelectedIds(Array.isArray(data) ? data.map((s: PrecipitableSolution) => s.id) : []);
    } catch (error) {
      console.error('获取可沉淀方案失败:', error);
      setSolutions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSolution = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === solutions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(solutions.map(s => s.id));
    }
  };

  const handleSubmit = async () => {
    if (selectedIds.length === 0) {
      toast({
        title: '请选择要沉淀的方案',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const { data: result } = await apiClient.post<{ success: boolean; message?: string }>(
        `/api/projects/${projectId}/knowledge-precipitation`,
        {
          solutionIds: selectedIds,
          templateCategory,
          templateScope,
          knowledgeNotes,
        }
      );

      if ((result as any).success) {
        toast({
          title: '沉淀成功',
          description: (result as any).message || '方案已沉淀为模板',
        });
        onOpenChange(false);
        onSuccess();
      }
    } catch (error: any) {
      toast({
        title: '沉淀失败',
        description: error.response?.data?.error || '请稍后重试',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getUsageTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      reference: '参考方案',
      implementation: '实施方案',
      customization: '定制方案',
    };
    return labels[type] || type;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            知识沉淀
          </DialogTitle>
          <DialogDescription>
            将项目「{projectName}」中的方案沉淀为模板，形成组织知识资产
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-muted-foreground">
            加载中...
          </div>
        ) : solutions.length === 0 ? (
          <div className="py-8 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">无可沉淀的方案</p>
            <p className="text-sm text-muted-foreground mt-1">
              项目中暂无关联的非模板方案可供沉淀
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* 方案选择 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>选择要沉淀的方案</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSelectAll}
                  className="text-xs"
                >
                  {selectedIds.length === solutions.length ? '取消全选' : '全选'}
                </Button>
              </div>
              <div className="border rounded-lg divide-y">
                {solutions.map((solution) => (
                  <label
                    key={solution.id}
                    className="flex items-center gap-3 p-3 hover:bg-accent cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedIds.includes(solution.id)}
                      onCheckedChange={() => handleToggleSolution(solution.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="font-medium truncate">{solution.solutionName}</span>
                        {solution.hasSnapshot && (
                          <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <span>{solution.solutionCode}</span>
                        <span>•</span>
                        <span>v{solution.version}</span>
                        <span>•</span>
                        <span>{getUsageTypeLabel(solution.usageType)}</span>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                已选择 {selectedIds.length} / {solutions.length} 个方案
              </p>
            </div>

            {/* 模板配置 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>模板分类</Label>
                <Select value={templateCategory} onValueChange={setTemplateCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">标准方案</SelectItem>
                    <SelectItem value="industry">行业方案</SelectItem>
                    <SelectItem value="customized">定制方案</SelectItem>
                    <SelectItem value="best_practice">最佳实践</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>可见范围</Label>
                <Select value={templateScope} onValueChange={setTemplateScope}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="company">公司级</SelectItem>
                    <SelectItem value="department">部门级</SelectItem>
                    <SelectItem value="personal">个人级</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 知识备注 */}
            <div className="space-y-2">
              <Label>沉淀说明</Label>
              <textarea
                className="w-full min-h-[100px] px-3 py-2 text-sm border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="记录项目实施过程中的经验教训、最佳实践、注意事项等..."
                value={knowledgeNotes}
                onChange={(e) => setKnowledgeNotes(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                沉淀说明将保存在模板中，帮助后续项目参考
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || solutions.length === 0 || selectedIds.length === 0}
          >
            {submitting ? '沉淀中...' : `沉淀 ${selectedIds.length} 个方案`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
