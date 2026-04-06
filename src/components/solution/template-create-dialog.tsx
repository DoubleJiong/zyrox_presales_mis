'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { apiClient } from '@/lib/api-client';
import { 
  FileText, 
  Star, 
  Building2, 
  Loader2,
  Check
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Template {
  id: number;
  solutionCode: string;
  solutionName: string;
  version: string;
  industry: string | null;
  scenario: string | null;
  rating: string | null;
  tags: string[] | null;
  description: string | null;
  coreFeatures: Array<{ featureName: string; description: string }> | null;
  templateUsageCount?: number;
}

interface TemplateCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    templateId: number;
    solutionName: string;
    customizationDetails?: string;
    customizations?: {
      description?: string;
      estimatedCost?: string;
      estimatedDuration?: number;
    };
    stageBound?: string;
  }) => void;
  projectIndustry?: string;
  loading?: boolean;
}

export function TemplateCreateDialog({
  open,
  onOpenChange,
  onSubmit,
  projectIndustry,
  loading,
}: TemplateCreateDialogProps) {
  const { toast } = useToast();
  const [fetching, setFetching] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [solutionName, setSolutionName] = useState('');
  const [customizationDetails, setCustomizationDetails] = useState('');
  const [estimatedCost, setEstimatedCost] = useState('');
  const [estimatedDuration, setEstimatedDuration] = useState('');

  const fetchTemplates = useCallback(async () => {
    setFetching(true);
    try {
      const params = new URLSearchParams();
      params.set('isTemplate', 'true');
      params.set('status', 'published');
      if (projectIndustry) {
        params.set('industry', projectIndustry);
      }
      params.set('pageSize', '20');

      const { data: result } = await apiClient.get<{ 
        data: Template[]; 
      }>(`/api/solutions?${params.toString()}`);
      
      setTemplates(result.data || []);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
      toast({ title: '获取模板列表失败', variant: 'destructive' });
    } finally {
      setFetching(false);
    }
  }, [projectIndustry, toast]);

  useEffect(() => {
    if (open) {
      fetchTemplates();
      // 重置状态
      setSelectedTemplate(null);
      setSolutionName('');
      setCustomizationDetails('');
      setEstimatedCost('');
      setEstimatedDuration('');
    }
  }, [open, fetchTemplates]);

  const handleSelectTemplate = (template: Template) => {
    setSelectedTemplate(template);
    // 自动生成方案名称
    if (!solutionName) {
      setSolutionName(`${template.solutionName}（定制版）`);
    }
  };

  const handleSubmit = () => {
    if (!selectedTemplate) {
      toast({ title: '请选择一个模板', variant: 'destructive' });
      return;
    }
    if (!solutionName.trim()) {
      toast({ title: '请输入方案名称', variant: 'destructive' });
      return;
    }

    onSubmit({
      templateId: selectedTemplate.id,
      solutionName: solutionName.trim(),
      customizationDetails: customizationDetails.trim() || undefined,
      customizations: {
        estimatedCost: estimatedCost || undefined,
        estimatedDuration: estimatedDuration ? parseInt(estimatedDuration) : undefined,
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            基于模板创建方案
          </DialogTitle>
          <DialogDescription>
            选择模板并定制化创建新的解决方案
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* 左侧：模板列表 */}
          <div className="space-y-3">
            <Label>选择模板</Label>
            <ScrollArea className="h-[300px] border rounded-lg">
              {fetching ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : templates.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>暂无可用模板</p>
                </div>
              ) : (
                <div className="p-2 space-y-2">
                  {templates.map((template) => (
                    <Card
                      key={template.id}
                      className={`cursor-pointer transition-all ${
                        selectedTemplate?.id === template.id
                          ? 'border-primary bg-primary/5 ring-1 ring-primary'
                          : 'hover:bg-accent'
                      }`}
                      onClick={() => handleSelectTemplate(template)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start gap-2">
                          <div className="flex-shrink-0 w-8 h-8 rounded bg-primary/10 flex items-center justify-center mt-0.5">
                            <FileText className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm truncate">
                                {template.solutionName}
                              </span>
                              {selectedTemplate?.id === template.id && (
                                <Check className="h-4 w-4 text-primary flex-shrink-0" />
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1 flex-wrap">
                              <span>v{template.version}</span>
                              {template.industry && (
                                <span className="flex items-center gap-0.5">
                                  <Building2 className="h-3 w-3" />
                                  {template.industry}
                                </span>
                              )}
                              {template.rating && (
                                <span className="flex items-center gap-0.5">
                                  <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                                  {template.rating}
                                </span>
                              )}
                            </div>
                            {template.tags && template.tags.length > 0 && (
                              <div className="flex gap-1 mt-1 flex-wrap">
                                {template.tags.slice(0, 2).map((tag, idx) => (
                                  <Badge key={idx} variant="outline" className="text-[10px] px-1">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* 右侧：定制表单 */}
          <div className="space-y-3">
            <div>
              <Label htmlFor="solutionName">新方案名称 *</Label>
              <Input
                id="solutionName"
                value={solutionName}
                onChange={(e) => setSolutionName(e.target.value)}
                placeholder="输入新方案的名称"
                className="mt-1"
              />
            </div>

            {selectedTemplate && (
              <>
                <div>
                  <Label>继承的模板内容</Label>
                  <div className="mt-1 p-3 bg-muted/50 rounded-lg text-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <Checkbox checked disabled />
                      <span>核心功能</span>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <Checkbox checked disabled />
                      <span>技术架构</span>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <Checkbox checked disabled />
                      <span>组件列表</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox checked disabled />
                      <span>优势说明</span>
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="estimatedCost">定制预估成本</Label>
                  <Input
                    id="estimatedCost"
                    value={estimatedCost}
                    onChange={(e) => setEstimatedCost(e.target.value)}
                    placeholder="输入预估成本（元）"
                    className="mt-1"
                    type="number"
                  />
                </div>

                <div>
                  <Label htmlFor="estimatedDuration">定制预估周期</Label>
                  <Input
                    id="estimatedDuration"
                    value={estimatedDuration}
                    onChange={(e) => setEstimatedDuration(e.target.value)}
                    placeholder="输入预估周期（天）"
                    className="mt-1"
                    type="number"
                  />
                </div>

                <div>
                  <Label htmlFor="customizationDetails">定制说明</Label>
                  <Textarea
                    id="customizationDetails"
                    value={customizationDetails}
                    onChange={(e) => setCustomizationDetails(e.target.value)}
                    placeholder="描述本次定制的主要内容..."
                    className="mt-1"
                    rows={3}
                  />
                </div>
              </>
            )}

            {!selectedTemplate && (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground border rounded-lg">
                <div className="text-center">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>请先选择一个模板</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            取消
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!selectedTemplate || !solutionName.trim() || loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            创建并关联
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
