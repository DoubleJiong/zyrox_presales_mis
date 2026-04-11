/**
 * 解决方案列表页 - 增强版
 * 
 * 新增功能：
 * - 卡片/表格视图切换
 * - 快捷筛选标签（我创建的、模板、最近更新）
 */

'use client';

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { extractErrorMessage } from '@/lib/api-response';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DictSelect } from '@/components/dictionary/dict-select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Search, Plus, Eye, Loader2, Check, AlertCircle, 
  FileText, Download, Clock, User, Filter, FolderOpen, BookOpen,
  LayoutGrid, List, Sparkles, Clock4, FileStack, ChevronLeft, ChevronRight
} from 'lucide-react';

const ITEMS_PER_PAGE = 10;

interface Solution {
  id: number;
  solutionCode: string;
  solutionName: string;
  solutionTypeId: number | null;
  solutionTypeName: string | null;
  version: string;
  industry: string[] | string | null;
  scenario: string | null;
  description: string | null;
  authorId: number | null;
  authorName: string | null;
  ownerId: number | null;
  ownerName: string | null;
  isTemplate: boolean;
  templateCategory: string | null;
  status: string;
  publishDate: string | null;
  tags: string[] | null;
  viewCount: number;
  downloadCount: number;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  // V3.0: 新增字段
  solutionCategory: string | null;
  plateId: number | null;
  plateName: string | null;
  projectId: number | null;
  projectName: string | null;
}

interface KnowledgeItem {
  id: number;
  solutionCode: string;
  solutionName: string;
  solutionTypeId: number | null;
  typeName?: string;
  version: string;
  industry?: string;
  description?: string;
  authorId: number | null;
  authorName?: string;
  isTemplate: boolean;
  tags?: string[];
  viewCount: number;
  downloadCount: number;
  publishDate?: string;
  createdAt: string;
}

// 安全地将 industry 转换为数组
const parseIndustry = (industry: string[] | string | null): string[] => {
  if (!industry) return [];
  if (Array.isArray(industry)) return industry;
  if (typeof industry === 'string') {
    try {
      const parsed = JSON.parse(industry);
      return Array.isArray(parsed) ? parsed : [industry];
    } catch {
      return industry ? [industry] : [];
    }
  }
  return [];
};

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

// 快捷筛选类型
type QuickFilter = 'all' | 'mine' | 'templates' | 'recent';

// V3.0: 方案分类类型
type CategoryFilter = 'all' | 'base' | 'project';

function SolutionsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  // 从URL参数获取初始标签
  const initialTab = searchParams.get('tab') === 'knowledge' ? 'knowledge' : 'solutions';
  const [activeTab, setActiveTab] = useState(initialTab);
  
  // 解决方案列表状态
  const [solutions, setSolutions] = useState<Solution[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  
  // 新增：视图模式和快捷筛选
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
  const [currentPage, setCurrentPage] = useState(1);
  
  // V3.0: 方案分类筛选
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  
  // 知识库状态
  const [knowledgeList, setKnowledgeList] = useState<KnowledgeItem[]>([]);
  const [knowledgeLoading, setKnowledgeLoading] = useState(false);
  const [knowledgeSearch, setKnowledgeSearch] = useState('');
  const [knowledgeTypeFilter, setKnowledgeTypeFilter] = useState('all');
  const [knowledgeIndustryFilter, setKnowledgeIndustryFilter] = useState('all');
  const [knowledgeCategories, setKnowledgeCategories] = useState<Array<{ id: number; name: string }>>([]);
  const [knowledgePagination, setKnowledgePagination] = useState({ page: 1, total: 0, totalPages: 0 });
  
  // 新建方案弹窗
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [solutionNameCheckStatus, setSolutionNameCheckStatus] = useState<'idle' | 'checking' | 'available' | 'duplicate'>('idle');
  const [solutionDuplicateError, setSolutionDuplicateError] = useState<string | null>(null);
  const [newSolution, setNewSolution] = useState({
    solutionName: '',
    solutionTypeId: '',
    isTemplate: false,
    templateCategory: '',
    description: '',
    version: '1.0',
    industries: [] as string[],
  });

  // 当前用户ID（用于筛选"我创建的"）
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  useEffect(() => {
    fetchSolutions();
    fetchKnowledgeCategories();
    fetchCurrentUser();
  }, []);

  // 获取当前用户
  const fetchCurrentUser = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        setCurrentUserId(data.user?.id || null);
      }
    } catch (error) {
      console.error('Failed to fetch current user:', error);
    }
  };

  // 当切换到知识库标签时加载数据
  useEffect(() => {
    if (activeTab === 'knowledge') {
      fetchKnowledge();
    }
  }, [activeTab, knowledgeSearch, knowledgeTypeFilter, knowledgeIndustryFilter]);

  const fetchSolutions = async () => {
    try {
      // 请求所有数据（设置大的pageSize），前端进行客户端分页和过滤
      const response = await fetch('/api/solutions?pageSize=1000');
      const result = await response.json();
      // API返回格式: { success: true, data: [...], pagination: {...} }
      const solutionsData = result.data || [];
      setSolutions(Array.isArray(solutionsData) ? solutionsData : []);
    } catch (error) {
      console.error('Failed to fetch solutions:', error);
      setSolutions([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchKnowledgeCategories = async () => {
    try {
      const response = await fetch('/api/knowledge/categories');
      const data = await response.json();
      if (data.success) {
        setKnowledgeCategories(data.data?.categories || []);
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const fetchKnowledge = useCallback(async (page = 1) => {
    setKnowledgeLoading(true);
    try {
      const params = new URLSearchParams();
      if (knowledgeSearch) params.set('keyword', knowledgeSearch);
      if (knowledgeTypeFilter && knowledgeTypeFilter !== 'all') params.set('typeId', knowledgeTypeFilter);
      if (knowledgeIndustryFilter && knowledgeIndustryFilter !== 'all') params.set('industry', knowledgeIndustryFilter);
      params.set('page', page.toString());

      const response = await fetch(`/api/knowledge/search?${params.toString()}`);
      const data = await response.json();
      
      if (data.success) {
        setKnowledgeList(data.data.list || []);
        setKnowledgePagination(data.data.pagination || { page: 1, total: 0, totalPages: 0 });
      }
    } catch (error) {
      console.error('Failed to fetch knowledge:', error);
    } finally {
      setKnowledgeLoading(false);
    }
  }, [knowledgeSearch, knowledgeTypeFilter, knowledgeIndustryFilter]);

  // 筛选解决方案（包含快捷筛选）
  const filteredSolutions = useMemo(() => {
    let result = solutions.filter((solution) => {
      const matchesSearch =
        (solution.solutionName?.toLowerCase() || '').includes(search.toLowerCase()) ||
        (solution.solutionCode?.toLowerCase() || '').includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || solution.status === statusFilter;
      const matchesType = typeFilter === 'all' || solution.solutionTypeName === typeFilter;
      
      // V3.0: 方案分类筛选
      const matchesCategory = categoryFilter === 'all' || solution.solutionCategory === categoryFilter;
      
      return matchesSearch && matchesStatus && matchesType && matchesCategory;
    });

    // 应用快捷筛选
    switch (quickFilter) {
      case 'mine':
        result = result.filter(s => s.authorId === currentUserId || s.ownerId === currentUserId);
        break;
      case 'templates':
        result = result.filter(s => s.isTemplate);
        break;
      case 'recent':
        // 最近7天更新的
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        result = result.filter(s => new Date(s.updatedAt) >= sevenDaysAgo);
        break;
    }

    return result;
  }, [solutions, search, statusFilter, typeFilter, quickFilter, currentUserId, categoryFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredSolutions.length / ITEMS_PER_PAGE));

  const paginatedSolutions = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredSolutions.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [currentPage, filteredSolutions]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, typeFilter, quickFilter, categoryFilter]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  // 状态徽章
  const getStatusBadge = useCallback((status: string) => {
    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      draft: { label: '草稿', variant: 'secondary' },
      reviewing: { label: '审核中', variant: 'default' },
      approved: { label: '已审核', variant: 'outline' },
      rejected: { label: '已拒绝', variant: 'destructive' },
      published: { label: '已发布', variant: 'default' },
    };
    const statusInfo = statusMap[status] || { label: status, variant: 'default' as const };
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  }, []);

  // 行业选择切换
  const handleIndustryToggle = (industry: string) => {
    setNewSolution(prev => ({
      ...prev,
      industries: prev.industries.includes(industry)
        ? prev.industries.filter(i => i !== industry)
        : [...prev.industries, industry]
    }));
  };

  // 检查解决方案名称是否重复
  const checkSolutionNameDuplicate = async (name: string): Promise<boolean> => {
    if (!name.trim()) {
      setSolutionNameCheckStatus('idle');
      setSolutionDuplicateError(null);
      return false;
    }
    
    setSolutionNameCheckStatus('checking');
    setSolutionDuplicateError(null);
    
    try {
      const response = await fetch(`/api/solutions?keyword=${encodeURIComponent(name)}`);
      const result = await response.json();
      const solutions = result.data || [];
      
      const isDuplicate = solutions.some(
        (s: Solution) => s.solutionName.toLowerCase() === name.toLowerCase()
      );
      
      if (isDuplicate) {
        setSolutionNameCheckStatus('duplicate');
        setSolutionDuplicateError('已存在同名解决方案，请使用其他名称');
        return true;
      } else {
        setSolutionNameCheckStatus('available');
        setSolutionDuplicateError(null);
        return false;
      }
    } catch (error) {
      console.error('Failed to check solution name:', error);
      setSolutionNameCheckStatus('idle');
      return false;
    }
  };

  // 处理解决方案名称输入变化
  const handleSolutionNameChange = (name: string) => {
    setNewSolution(prev => ({ ...prev, solutionName: name }));
    if (solutionDuplicateError) {
      setSolutionDuplicateError(null);
      setSolutionNameCheckStatus('idle');
    }
    if (name.trim()) {
      setTimeout(() => checkSolutionNameDuplicate(name), 500);
    }
  };

  // 创建新方案
  const handleCreateSolution = async () => {
    if (!newSolution.solutionName.trim()) {
      toast({ title: '请输入方案名称', variant: 'destructive' });
      return;
    }

    const isDuplicate = await checkSolutionNameDuplicate(newSolution.solutionName);
    if (isDuplicate) return;

    setCreating(true);
    try {
      const response = await fetch('/api/solutions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          solutionName: newSolution.solutionName,
          solutionTypeId: newSolution.solutionTypeId ? parseInt(newSolution.solutionTypeId) : null,
          description: newSolution.description || null,
          version: newSolution.version,
          isTemplate: newSolution.isTemplate,
          templateCategory: newSolution.isTemplate ? newSolution.templateCategory : null,
          industry: newSolution.industries.length > 0 ? newSolution.industries : null,
          status: 'draft',
        }),
      });

      if (response.ok) {
        const result = await response.json();
        toast({ title: '创建成功', description: '解决方案已创建' });
        setShowCreateDialog(false);
        setNewSolution({
          solutionName: '',
          solutionTypeId: '',
          isTemplate: false,
          templateCategory: '',
          description: '',
          version: '1.0',
          industries: [],
        });
        setSolutionNameCheckStatus('idle');
        setSolutionDuplicateError(null);
        fetchSolutions();
        router.push(`/solutions/${result.data?.id || result.id}`);
      } else {
        const error = await response.json();
        toast({ title: '创建失败', description: extractErrorMessage(error.error, '创建失败'), variant: 'destructive' });
      }
    } catch (error) {
      console.error('Failed to create solution:', error);
      toast({ title: '创建失败', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  // 双击行打开详情
  const handleRowDoubleClick = (solutionId: number) => {
    router.push(`/solutions/${solutionId}`);
  };

  // 处理标签切换
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    // 更新URL但不刷新页面
    const url = new URL(window.location.href);
    if (value === 'knowledge') {
      url.searchParams.set('tab', 'knowledge');
    } else {
      url.searchParams.delete('tab');
    }
    router.replace(url.pathname + url.search, { scroll: false });
  };

  // 格式化日期
  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('zh-CN');
    } catch {
      return '-';
    }
  };

  // 渲染卡片视图
  const renderCardView = () => (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {paginatedSolutions.map((solution) => (
        <Card 
          key={solution.id}
          data-testid={`solution-card-${solution.id}`}
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => router.push(`/solutions/${solution.id}`)}
        >
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <CardTitle className="text-base line-clamp-2 flex-1">
                {solution.solutionName || '未命名方案'}
              </CardTitle>
              <div className="flex items-center gap-1 ml-2 shrink-0">
                {solution.isTemplate && (
                  <Badge variant="outline" className="text-xs">模板</Badge>
                )}
                {getStatusBadge(solution.status)}
              </div>
            </div>
            <CardDescription className="line-clamp-2">
              {solution.description || '暂无描述'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{solution.solutionCode}</span>
                <Badge variant="outline">v{solution.version || '1.0'}</Badge>
              </div>

              <div className="flex flex-wrap gap-1">
                {(() => {
                  const industries = parseIndustry(solution.industry);
                  return industries.slice(0, 2).map((ind) => (
                    <Badge key={ind} variant="secondary" className="text-xs">{ind}</Badge>
                  ));
                })()}
                {parseIndustry(solution.industry).length > 2 && (
                  <Badge variant="secondary" className="text-xs">
                    +{parseIndustry(solution.industry).length - 2}
                  </Badge>
                )}
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    {solution.viewCount || 0}
                  </span>
                  <span className="flex items-center gap-1">
                    <Download className="h-3 w-3" />
                    {solution.downloadCount || 0}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {solution.ownerName || solution.authorName || '-'}
                </div>
              </div>

              <div className="flex items-center text-xs text-muted-foreground">
                <Clock className="h-3 w-3 mr-1" />
                {formatDate(solution.updatedAt || solution.createdAt)}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  // 渲染表格视图
  const renderTableView = () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>方案名称</TableHead>
          <TableHead>编号</TableHead>
          <TableHead>类型</TableHead>
          <TableHead>行业</TableHead>
          <TableHead>版本</TableHead>
          <TableHead>负责人</TableHead>
          <TableHead>状态</TableHead>
          <TableHead>浏览/下载</TableHead>
          <TableHead>创建时间</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {paginatedSolutions.map((solution) => (
          <TableRow 
            key={solution.id}
            data-testid={`solution-row-${solution.id}`}
            className="cursor-pointer hover:bg-muted/50"
            onDoubleClick={() => handleRowDoubleClick(solution.id)}
          >
            <TableCell className="font-medium">
              <div className="flex items-center gap-2">
                <span className="hover:text-primary transition-colors">
                  {solution.solutionName || '未命名方案'}
                </span>
                {solution.isTemplate && (
                  <Badge variant="outline" className="text-xs">模板</Badge>
                )}
                {solution.isPublic && (
                  <Eye className="h-3 w-3 text-muted-foreground" />
                )}
              </div>
            </TableCell>
            <TableCell className="font-mono text-xs">{solution.solutionCode}</TableCell>
            <TableCell>
              <Badge variant="outline">{solution.solutionTypeName || '未分类'}</Badge>
            </TableCell>
            <TableCell>
              {(() => {
                const industries = parseIndustry(solution.industry);
                return industries.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {industries.slice(0, 2).map((ind) => (
                      <Badge key={ind} variant="secondary" className="text-xs">{ind}</Badge>
                    ))}
                    {industries.length > 2 && (
                      <Badge variant="secondary" className="text-xs">+{industries.length - 2}</Badge>
                    )}
                  </div>
                ) : '-';
              })()}
            </TableCell>
            <TableCell>{solution.version || '-'}</TableCell>
            <TableCell>{solution.ownerName || solution.authorName || '-'}</TableCell>
            <TableCell>{getStatusBadge(solution.status)}</TableCell>
            <TableCell>
              <div className="flex items-center gap-3 text-sm">
                <span>{solution.viewCount || 0}</span>
                <span>{solution.downloadCount || 0}</span>
              </div>
            </TableCell>
            <TableCell>{formatDate(solution.createdAt)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <div className="space-y-6" data-testid="solutions-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">解决方案中心</h1>
          <p className="text-muted-foreground">管理售前方案、浏览方案库资产</p>
        </div>
        
        {/* 新建方案弹窗 */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button data-testid="solution-create-button">
              <Plus className="mr-2 h-4 w-4" />
              新建方案
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg" data-testid="solution-create-dialog">
            <DialogHeader>
              <DialogTitle>新建解决方案</DialogTitle>
              <DialogDescription>创建新的解决方案或模板方案</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div data-testid="solution-create-name-field">
                <Label>方案名称 *</Label>
                <div className="relative">
                  <Input
                    data-testid="solution-create-name-input"
                    value={newSolution.solutionName}
                    onChange={(e) => handleSolutionNameChange(e.target.value)}
                    placeholder="请输入方案名称"
                    className={solutionDuplicateError ? 'border-destructive pr-10' : ''}
                  />
                  {solutionNameCheckStatus === 'checking' && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                  {solutionNameCheckStatus === 'available' && (
                    <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                  )}
                  {solutionNameCheckStatus === 'duplicate' && (
                    <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-destructive" />
                  )}
                </div>
                {solutionDuplicateError && (
                  <p className="text-sm text-destructive mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {solutionDuplicateError}
                  </p>
                )}
                {solutionNameCheckStatus === 'available' && !solutionDuplicateError && (
                  <p className="text-sm text-green-600 mt-1 flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    名称可用
                  </p>
                )}
              </div>
              <div data-testid="solution-create-type-field">
                <Label>方案类型</Label>
                <DictSelect
                  category="solution_type"
                  value={newSolution.solutionTypeId}
                  onValueChange={(value) => setNewSolution({ ...newSolution, solutionTypeId: value })}
                  placeholder="选择方案类型"
                />
              </div>
              <div data-testid="solution-create-version-field">
                <Label>版本号</Label>
                <Input
                  data-testid="solution-create-version-input"
                  value={newSolution.version}
                  onChange={(e) => setNewSolution({ ...newSolution, version: e.target.value })}
                  placeholder="如: 1.0"
                />
              </div>
              <div data-testid="solution-create-industry-field">
                <Label>适用行业（可多选）</Label>
                <div className="border rounded-lg p-3 max-h-40 overflow-y-auto">
                  <div className="grid grid-cols-3 gap-2">
                    {INDUSTRY_OPTIONS.map((option) => (
                      <div
                        key={option.value}
                        data-testid={`solution-create-industry-option-${option.value}`}
                        className={`flex items-center justify-center px-2 py-1.5 rounded cursor-pointer text-xs transition-colors border ${
                          newSolution.industries.includes(option.value)
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background hover:bg-accent border-input'
                        }`}
                        onClick={() => handleIndustryToggle(option.value)}
                      >
                        {option.label}
                        {newSolution.industries.includes(option.value) && (
                          <Check className="h-3 w-3 ml-1" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div data-testid="solution-create-description-field">
                <Label>描述</Label>
                <Textarea
                  data-testid="solution-create-description-input"
                  value={newSolution.description}
                  onChange={(e) => setNewSolution({ ...newSolution, description: e.target.value })}
                  placeholder="方案描述..."
                  rows={3}
                />
              </div>
              <div className="flex items-center space-x-2" data-testid="solution-create-template-field">
                <input
                  type="checkbox"
                  id="isTemplate"
                  checked={newSolution.isTemplate}
                  onChange={(e) => setNewSolution({ ...newSolution, isTemplate: e.target.checked })}
                  className="h-4 w-4"
                />
                <Label htmlFor="isTemplate">设为模板方案</Label>
              </div>
              {newSolution.isTemplate && (
                <div data-testid="solution-create-template-category-field">
                  <Label>模板分类</Label>
                  <Select
                    value={newSolution.templateCategory}
                    onValueChange={(value) => setNewSolution({ ...newSolution, templateCategory: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择模板分类" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">标准模板</SelectItem>
                      <SelectItem value="industry">行业模板</SelectItem>
                      <SelectItem value="scenario">场景模板</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                取消
              </Button>
              <Button onClick={handleCreateSolution} disabled={creating} data-testid="solution-create-submit-button">
                {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                创建
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* 标签页切换 */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="solutions" className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4" />
            我的方案
          </TabsTrigger>
          <TabsTrigger value="knowledge" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            方案库
          </TabsTrigger>
        </TabsList>

        {/* 我的方案标签页 */}
        <TabsContent value="solutions" className="space-y-4">
          {/* V3.0: 方案分类切换 */}
          <div className="flex items-center gap-2 border-b pb-4">
            <span className="text-sm text-muted-foreground mr-2">方案类型：</span>
            <Button
              variant={categoryFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCategoryFilter('all')}
            >
              全部方案
            </Button>
            <Button
              variant={categoryFilter === 'base' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCategoryFilter('base')}
            >
              <FolderOpen className="h-4 w-4 mr-2" />
              基础方案
            </Button>
            <Button
              variant={categoryFilter === 'project' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCategoryFilter('project')}
            >
              <FileText className="h-4 w-4 mr-2" />
              项目方案
            </Button>
          </div>

          {/* 快捷筛选标签 */}
          <div className="flex items-center gap-2">
            <Button
              variant={quickFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setQuickFilter('all')}
            >
              <FileStack className="h-4 w-4 mr-2" />
              全部
            </Button>
            <Button
              variant={quickFilter === 'mine' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setQuickFilter('mine')}
            >
              <User className="h-4 w-4 mr-2" />
              我创建的
            </Button>
            <Button
              variant={quickFilter === 'templates' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setQuickFilter('templates')}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              模板
            </Button>
            <Button
              variant={quickFilter === 'recent' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setQuickFilter('recent')}
            >
              <Clock4 className="h-4 w-4 mr-2" />
              最近更新
            </Button>
          </div>

          {/* 筛选和搜索 */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-4 items-center">
                <div className="flex-1 relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="搜索方案名称、编号..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <DictSelect
                  category="solution_status"
                  value={statusFilter === 'all' ? '' : statusFilter}
                  onValueChange={(value) => setStatusFilter(value || 'all')}
                  placeholder="状态筛选"
                  className="w-[180px]"
                  allowClear
                />
                <DictSelect
                  category="solution_type"
                  value={typeFilter === 'all' ? '' : typeFilter}
                  onValueChange={(value) => setTypeFilter(value || 'all')}
                  placeholder="类型筛选"
                  className="w-[180px]"
                  allowClear
                />
                {/* 视图切换 */}
                <ToggleGroup type="single" value={viewMode} onValueChange={(value) => value && setViewMode(value as 'table' | 'card')}>
                  <ToggleGroupItem value="table" aria-label="表格视图">
                    <List className="h-4 w-4" />
                  </ToggleGroupItem>
                  <ToggleGroupItem value="card" aria-label="卡片视图">
                    <LayoutGrid className="h-4 w-4" />
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
            </CardContent>
          </Card>

          {/* 方案列表 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>方案列表 ({filteredSolutions.length})</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {viewMode === 'table' ? '双击行可查看详情' : '点击卡片查看详情'}
                </p>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">加载中...</div>
              ) : filteredSolutions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>暂无方案数据</p>
                </div>
              ) : (
                viewMode === 'card' ? renderCardView() : renderTableView()
              )}

              {totalPages > 1 && (
                <nav aria-label="pagination" data-testid="solutions-pagination" className="flex items-center justify-between border-t pt-4 mt-4">
                  <div className="text-sm text-muted-foreground">
                    显示 {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredSolutions.length)} 条，共 {filteredSolutions.length} 条
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-3"
                      onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                      disabled={currentPage === 1}
                      data-testid="solutions-pagination-prev-button"
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      上一页
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                        if (
                          page === 1 ||
                          page === totalPages ||
                          (page >= currentPage - 1 && page <= currentPage + 1)
                        ) {
                          return (
                            <Button
                              key={page}
                              variant={currentPage === page ? 'default' : 'outline'}
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => setCurrentPage(page)}
                            >
                              {page}
                            </Button>
                          );
                        } else if (page === currentPage - 2 || page === currentPage + 2) {
                          return <span key={page} className="text-muted-foreground">...</span>;
                        }
                        return null;
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-3"
                      onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                      disabled={currentPage === totalPages}
                      data-testid="solutions-pagination-next-button"
                    >
                      下一页
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </nav>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 知识库标签页 */}
        <TabsContent value="knowledge" className="space-y-4">
          {/* 搜索区域 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Filter className="h-5 w-5" />
                搜索筛选
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <Input
                    placeholder="搜索文档名称、描述..."
                    value={knowledgeSearch}
                    onChange={(e) => setKnowledgeSearch(e.target.value)}
                    className="w-full"
                  />
                </div>
                <Select value={knowledgeTypeFilter} onValueChange={setKnowledgeTypeFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="文档类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部类型</SelectItem>
                    {knowledgeCategories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id.toString()}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={knowledgeIndustryFilter} onValueChange={setKnowledgeIndustryFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="适用行业" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部行业</SelectItem>
                    {INDUSTRY_OPTIONS.map((ind) => (
                      <SelectItem key={ind.value} value={ind.value}>
                        {ind.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* 知识库列表 */}
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              共找到 <span className="font-medium text-foreground">{knowledgePagination.total}</span> 条方案库记录
            </p>

            {knowledgeLoading ? (
              <div className="text-center py-12">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                <p className="mt-4 text-muted-foreground">加载中...</p>
              </div>
            ) : knowledgeList.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">暂无相关方案</p>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {knowledgeList.map((item) => (
                    <Card 
                      key={item.id} 
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => router.push(`/solutions/${item.id}`)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-base line-clamp-2 flex-1">
                            {item.solutionName}
                          </CardTitle>
                          {item.isTemplate && (
                            <Badge variant="secondary" className="ml-2 shrink-0">模板</Badge>
                          )}
                        </div>
                        <CardDescription className="line-clamp-2">
                          {item.description || '暂无描述'}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                            {item.typeName && (
                              <Badge variant="outline" className="text-xs">{item.typeName}</Badge>
                            )}
                            {item.industry && (
                              <Badge variant="outline" className="text-xs">{item.industry}</Badge>
                            )}
                          </div>

                          {item.tags && item.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {item.tags.slice(0, 3).map((tag, index) => (
                                <Badge key={index} variant="secondary" className="text-xs">{tag}</Badge>
                              ))}
                              {item.tags.length > 3 && (
                                <Badge variant="secondary" className="text-xs">+{item.tags.length - 3}</Badge>
                              )}
                            </div>
                          )}

                          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                            <div className="flex items-center gap-3">
                              <span className="flex items-center gap-1">
                                <Eye className="h-3 w-3" />
                                {item.viewCount}
                              </span>
                              <span className="flex items-center gap-1">
                                <Download className="h-3 w-3" />
                                {item.downloadCount}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {item.authorName || '未知'}
                            </div>
                          </div>

                          <div className="flex items-center text-xs text-muted-foreground">
                            <Clock className="h-3 w-3 mr-1" />
                            {formatDate(item.publishDate || item.createdAt)}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {knowledgePagination.totalPages > 1 && (
                  <div className="flex items-center justify-between border-t pt-4 mt-4">
                    <p className="text-sm text-muted-foreground">
                      显示 {((knowledgePagination.page - 1) * 10) + 1} - {Math.min(knowledgePagination.page * 10, knowledgePagination.total)} 条，共 {knowledgePagination.total} 条
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchKnowledge(Math.max(1, knowledgePagination.page - 1))}
                        disabled={knowledgePagination.page === 1}
                        data-testid="knowledge-pagination-prev-button"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm text-muted-foreground min-w-[88px] text-center">
                        第 {knowledgePagination.page} / {knowledgePagination.totalPages} 页
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchKnowledge(Math.min(knowledgePagination.totalPages, knowledgePagination.page + 1))}
                        disabled={knowledgePagination.page === knowledgePagination.totalPages}
                        data-testid="knowledge-pagination-next-button"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function SolutionsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen">加载中...</div>}>
      <SolutionsPageContent />
    </Suspense>
  );
}
