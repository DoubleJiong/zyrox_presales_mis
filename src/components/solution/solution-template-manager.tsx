'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import {
  FileText,
  Search,
  Plus,
  Copy,
  Edit,
  Trash2,
  Eye,
  Tag,
  Building2,
  Globe,
  Users,
  TrendingUp,
} from 'lucide-react';

// 模板分类配置
const TEMPLATE_CATEGORIES: Record<string, { label: string; description: string; color: string }> = {
  standard: { label: '标准方案', description: '通用标准化解决方案', color: 'bg-blue-100 text-blue-700' },
  industry: { label: '行业方案', description: '针对特定行业的解决方案', color: 'bg-green-100 text-green-700' },
  customized: { label: '定制方案', description: '高度定制化的解决方案', color: 'bg-purple-100 text-purple-700' },
  best_practice: { label: '最佳实践', description: '经过验证的最佳实践方案', color: 'bg-orange-100 text-orange-700' },
};

// 模板范围配置
const TEMPLATE_SCOPES: Record<string, { label: string; icon: any; description: string }> = {
  company: { label: '公司级', icon: Building2, description: '全公司可见和使用' },
  department: { label: '部门级', icon: Users, description: '特定部门可见和使用' },
  personal: { label: '个人级', icon: Globe, description: '仅创建者可见和使用' },
};

interface SolutionTemplate {
  id: number;
  solutionCode: string;
  solutionName: string;
  version: string;
  templateCategory: string;
  templateScope: string;
  templateUsageCount: number;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

interface TemplateCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceSolutionId?: number;
  onSuccess: () => void;
}

// 模板创建对话框
function TemplateCreateDialog({ open, onOpenChange, sourceSolutionId, onSuccess }: TemplateCreateDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    solutionName: '',
    templateCategory: 'standard',
    templateScope: 'company',
    description: '',
  });

  const handleSubmit = async () => {
    if (!formData.solutionName.trim()) {
      toast({
        title: '请输入模板名称',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        solutionName: formData.solutionName,
        templateCategory: formData.templateCategory,
        templateScope: formData.templateScope,
        description: formData.description,
      };

      if (sourceSolutionId) {
        payload.sourceSolutionId = sourceSolutionId;
      }

      const { data: result } = await apiClient.post<{ success: boolean; data?: SolutionTemplate }>(
        '/api/solution-templates',
        payload
      );

      if ((result as any).success) {
        toast({
          title: '创建成功',
          description: '模板已创建',
        });
        onOpenChange(false);
        onSuccess();
        // 重置表单
        setFormData({
          solutionName: '',
          templateCategory: 'standard',
          templateScope: 'company',
          description: '',
        });
      }
    } catch (error) {
      toast({
        title: '创建失败',
        description: '请稍后重试',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>创建方案模板</DialogTitle>
          <DialogDescription>
            {sourceSolutionId ? '将当前方案保存为模板，供后续项目复用' : '创建新的方案模板'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>模板名称 *</Label>
            <Input
              placeholder="请输入模板名称"
              value={formData.solutionName}
              onChange={(e) => setFormData({ ...formData, solutionName: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>模板分类</Label>
              <Select
                value={formData.templateCategory}
                onValueChange={(value) => setFormData({ ...formData, templateCategory: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TEMPLATE_CATEGORIES).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>可见范围</Label>
              <Select
                value={formData.templateScope}
                onValueChange={(value) => setFormData({ ...formData, templateScope: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TEMPLATE_SCOPES).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>描述</Label>
            <textarea
              className="w-full min-h-[80px] px-3 py-2 text-sm border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="请输入模板描述"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? '创建中...' : '创建模板'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// 主组件
export function SolutionTemplateManager() {
  const router = useRouter();
  const [templates, setTemplates] = useState<SolutionTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [scopeFilter, setScopeFilter] = useState<string>('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<SolutionTemplate | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (keyword) params.append('keyword', keyword);
      if (categoryFilter !== 'all') params.append('category', categoryFilter);
      if (scopeFilter !== 'all') params.append('scope', scopeFilter);

      const { data: result } = await apiClient.get<{ success: boolean; data?: SolutionTemplate[] } | SolutionTemplate[]>(
        `/api/solution-templates?${params.toString()}`
      );
      setTemplates(Array.isArray(result) ? result : (result as any)?.data || []);
    } catch (error) {
      console.error('获取模板列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, [categoryFilter, scopeFilter]);

  const handleSearch = () => {
    fetchTemplates();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除该模板吗？此操作不可恢复。')) {
      return;
    }

    try {
      const { data: result } = await apiClient.delete<{ success: boolean }>(
        `/api/solution-templates/${id}`
      );

      if ((result as any).success) {
        toast({
          title: '删除成功',
          description: '模板已删除',
        });
        fetchTemplates();
      }
    } catch (error: any) {
      toast({
        title: '删除失败',
        description: error.response?.data?.error || '请稍后重试',
        variant: 'destructive',
      });
    }
  };

  const handleViewDetail = (template: SolutionTemplate) => {
    setSelectedTemplate(template);
    setDetailDialogOpen(true);
  };

  const getCategoryBadge = (category: string) => {
    const config = TEMPLATE_CATEGORIES[category];
    if (!config) return <Badge variant="outline">{category}</Badge>;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const getScopeBadge = (scope: string) => {
    const config = TEMPLATE_SCOPES[scope];
    if (!config) return <Badge variant="outline">{scope}</Badge>;
    const Icon = config.icon;
    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <Icon className="h-3 w-3" />
        {config.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* 头部工具栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索模板名称或编码"
              className="pl-9 w-64"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="分类" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部分类</SelectItem>
              {Object.entries(TEMPLATE_CATEGORIES).map(([key, config]) => (
                <SelectItem key={key} value={key}>
                  {config.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={scopeFilter} onValueChange={setScopeFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="范围" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部范围</SelectItem>
              {Object.entries(TEMPLATE_SCOPES).map(([key, config]) => (
                <SelectItem key={key} value={key}>
                  {config.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          创建模板
        </Button>
      </div>

      {/* 模板列表 */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">加载中...</p>
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">暂无模板</p>
          <p className="text-sm text-muted-foreground mt-1">点击"创建模板"按钮添加新模板</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <Card key={template.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base">{template.solutionName}</CardTitle>
                    <CardDescription className="text-xs">{template.solutionCode}</CardDescription>
                  </div>
                  {getCategoryBadge(template.templateCategory)}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {template.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{template.description}</p>
                )}
                <div className="flex items-center justify-between text-xs">
                  {getScopeBadge(template.templateScope)}
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <TrendingUp className="h-3 w-3" />
                    使用 {template.templateUsageCount} 次
                  </span>
                </div>
                <div className="flex items-center gap-2 pt-2 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleViewDetail(template)}
                  >
                    <Eye className="mr-1 h-3 w-3" />
                    查看
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setSelectedTemplate(template);
                      // 复制创建逻辑
                    }}
                  >
                    <Copy className="mr-1 h-3 w-3" />
                    复制
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDelete(template.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 创建模板对话框 */}
      <TemplateCreateDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={fetchTemplates}
      />

      {/* 模板详情对话框 */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>模板详情</DialogTitle>
          </DialogHeader>
          {selectedTemplate && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">模板名称</Label>
                  <p className="font-medium">{selectedTemplate.solutionName}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">模板编码</Label>
                  <p className="font-medium">{selectedTemplate.solutionCode}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">版本</Label>
                  <p className="font-medium">{selectedTemplate.version}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">分类</Label>
                  <p>{getCategoryBadge(selectedTemplate.templateCategory)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">可见范围</Label>
                  <p>{getScopeBadge(selectedTemplate.templateScope)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">使用次数</Label>
                  <p className="font-medium">{selectedTemplate.templateUsageCount} 次</p>
                </div>
              </div>
              {selectedTemplate.description && (
                <div>
                  <Label className="text-muted-foreground">描述</Label>
                  <p className="text-sm mt-1">{selectedTemplate.description}</p>
                </div>
              )}
              <div className="text-xs text-muted-foreground">
                创建于 {new Date(selectedTemplate.createdAt).toLocaleString('zh-CN')}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
