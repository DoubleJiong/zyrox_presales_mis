'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { DictSelect } from '@/components/dictionary/dict-select';
import { extractErrorMessage } from '@/lib/api-response';
import { ArrowLeft, Save, X, Plus, Check } from 'lucide-react';

// 行业选项列表
const INDUSTRY_OPTIONS = [
  { value: '高等教育', label: '高等教育' },
  { value: '职业教育', label: '职业教育' },
  { value: '基础教育', label: '基础教育' },
  { value: '企业', label: '企业' },
  { value: '政府', label: '政府' },
  { value: '医疗', label: '医疗' },
  { value: '金融', label: '金融' },
  { value: '能源', label: '能源' },
  { value: '交通', label: '交通' },
  { value: '其他', label: '其他' },
];

export default function NewSolutionPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  // 表单数据
  const [formData, setFormData] = useState({
    solutionName: '',
    solutionTypeId: '',
    version: '1.0',
    industries: [] as string[], // 改为数组支持多选
    scenario: '',
    description: '',
    technicalArchitecture: '',
    advantages: '',
    limitations: '',
    targetAudience: '',
    complexity: 'medium',
    tags: [] as string[],
    isPublic: false,
  });

  // 标签输入
  const [tagInput, setTagInput] = useState('');

  // 行业选择切换
  const handleIndustryToggle = (industry: string) => {
    setFormData(prev => ({
      ...prev,
      industries: prev.industries.includes(industry)
        ? prev.industries.filter(i => i !== industry)
        : [...prev.industries, industry]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.solutionName.trim()) {
      toast({
        title: '验证失败',
        description: '请输入方案名称',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/solutions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          solutionName: formData.solutionName,
          solutionTypeId: formData.solutionTypeId ? parseInt(formData.solutionTypeId) : null,
          version: formData.version,
          industry: formData.industries.length > 0 ? formData.industries : null, // 传递数组
          scenario: formData.scenario || null,
          description: formData.description || null,
          technicalArchitecture: formData.technicalArchitecture || null,
          advantages: formData.advantages || null,
          limitations: formData.limitations || null,
          targetAudience: formData.targetAudience || null,
          complexity: formData.complexity,
          tags: formData.tags.length > 0 ? formData.tags : null,
          isPublic: formData.isPublic,
          status: 'draft',
        }),
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: '创建成功',
          description: '解决方案已创建成功',
        });
        // 跳转到详情页
        router.push(`/solutions/${result.data?.id || result.id}`);
      } else {
        const error = await response.json();
        toast({
          title: '创建失败',
          description: extractErrorMessage(error.error, '未知错误'),
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Failed to create solution:', error);
      toast({
        title: '创建失败',
        description: '网络错误，请稍后重试',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddTag = () => {
    const tag = tagInput.trim();
    if (tag && !formData.tags.includes(tag)) {
      setFormData({
        ...formData,
        tags: [...formData.tags, tag],
      });
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(t => t !== tag),
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/solutions')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">新建解决方案</h1>
            <p className="text-muted-foreground">创建新的解决方案或方案模板</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* 基本信息 */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>基本信息</CardTitle>
              <CardDescription>解决方案的基本信息，带 * 为必填项</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 方案名称 */}
              <div className="space-y-2">
                <Label htmlFor="solutionName">方案名称 *</Label>
                <Input
                  id="solutionName"
                  placeholder="请输入方案名称"
                  value={formData.solutionName}
                  onChange={(e) => setFormData({ ...formData, solutionName: e.target.value })}
                  required
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {/* 方案类型 */}
                <div className="space-y-2">
                  <Label>方案类型</Label>
                  <DictSelect
                    category="solution_type"
                    value={formData.solutionTypeId}
                    onValueChange={(value) => setFormData({ ...formData, solutionTypeId: value })}
                    placeholder="选择方案类型"
                  />
                </div>

                {/* 版本号 */}
                <div className="space-y-2">
                  <Label htmlFor="version">版本号</Label>
                  <Input
                    id="version"
                    placeholder="如: 1.0"
                    value={formData.version}
                    onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                  />
                </div>
              </div>

              {/* 适用行业 - 多选 */}
              <div className="space-y-2">
                <Label>适用行业（可多选）</Label>
                <div className="border rounded-lg p-4">
                  <div className="grid grid-cols-5 gap-3">
                    {INDUSTRY_OPTIONS.map((option) => (
                      <div
                        key={option.value}
                        className={`
                          flex items-center justify-center px-3 py-2 rounded-md cursor-pointer text-sm
                          transition-colors border
                          ${formData.industries.includes(option.value)
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background hover:bg-accent border-input'
                          }
                        `}
                        onClick={() => handleIndustryToggle(option.value)}
                      >
                        {option.label}
                        {formData.industries.includes(option.value) && (
                          <Check className="h-3 w-3 ml-1" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                {formData.industries.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {formData.industries.map((industry) => (
                      <Badge key={industry} variant="secondary" className="gap-1">
                        {industry}
                        <button
                          type="button"
                          onClick={() => handleIndustryToggle(industry)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                    <span className="text-xs text-muted-foreground ml-2">
                      已选 {formData.industries.length} 个行业
                    </span>
                  </div>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {/* 复杂度 */}
                <div className="space-y-2">
                  <Label>复杂度</Label>
                  <DictSelect
                    category="complexity"
                    value={formData.complexity}
                    onValueChange={(value) => setFormData({ ...formData, complexity: value })}
                    placeholder="选择复杂度"
                  />
                </div>

                {/* 应用场景 */}
                <div className="space-y-2">
                  <Label htmlFor="scenario">应用场景</Label>
                  <Input
                    id="scenario"
                    placeholder="请输入应用场景"
                    value={formData.scenario}
                    onChange={(e) => setFormData({ ...formData, scenario: e.target.value })}
                  />
                </div>
              </div>

              {/* 描述 */}
              <div className="space-y-2">
                <Label htmlFor="description">方案描述</Label>
                <Textarea
                  id="description"
                  placeholder="请输入方案描述"
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              {/* 标签 */}
              <div className="space-y-2">
                <Label>标签</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="输入标签后按回车添加"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                  />
                  <Button type="button" variant="outline" onClick={handleAddTag}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="gap-1">
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 详细信息 */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>详细信息</CardTitle>
                <CardDescription>可选的补充信息</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 目标受众 */}
                <div className="space-y-2">
                  <Label htmlFor="targetAudience">目标受众</Label>
                  <Input
                    id="targetAudience"
                    placeholder="请输入目标受众"
                    value={formData.targetAudience}
                    onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
                  />
                </div>

                {/* 方案优势 */}
                <div className="space-y-2">
                  <Label htmlFor="advantages">方案优势</Label>
                  <Textarea
                    id="advantages"
                    placeholder="请输入方案优势"
                    rows={3}
                    value={formData.advantages}
                    onChange={(e) => setFormData({ ...formData, advantages: e.target.value })}
                  />
                </div>

                {/* 使用限制 */}
                <div className="space-y-2">
                  <Label htmlFor="limitations">使用限制</Label>
                  <Textarea
                    id="limitations"
                    placeholder="请输入使用限制"
                    rows={3}
                    value={formData.limitations}
                    onChange={(e) => setFormData({ ...formData, limitations: e.target.value })}
                  />
                </div>

                {/* 公开设置 */}
                <div className="flex items-center space-x-2 pt-2">
                  <input
                    type="checkbox"
                    id="isPublic"
                    checked={formData.isPublic}
                    onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="isPublic" className="font-normal cursor-pointer">
                    公开此方案（其他用户可查看）
                  </Label>
                </div>
              </CardContent>
            </Card>

            {/* 操作按钮 */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col gap-3">
                  <Button type="submit" className="w-full" disabled={loading}>
                    <Save className="mr-2 h-4 w-4" />
                    {loading ? '保存中...' : '保存方案'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => router.back()}
                    disabled={loading}
                  >
                    取消
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
