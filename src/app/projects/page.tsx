'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DictSelect } from '@/components/dictionary/dict-select';
import { CustomerSelect } from '@/components/ui/customer-select';
import { ProjectTypeSelect } from '@/components/ui/project-type-select';
import { 
  AlertCircle, Plus, Upload, Download, Search, Edit, Trash2, 
  Calendar, TrendingUp, Building2, LayoutGrid, List, KanbanSquare, 
  ChevronLeft, ChevronRight, BarChart3, Users, Clock, CheckCircle,
  PlayCircle, User, Star, ExternalLink, Check, Loader2
} from 'lucide-react';
import { validateAmount, validateDateRange, validateLength } from '@/lib/validators';
import { PermissionButton, usePermissions } from '@/components/auth/PermissionProvider';
import { PERMISSIONS } from '@/lib/permissions';
import {
  PROJECT_STAGE_CONFIG,
  type ProjectStage,
} from '@/lib/utils/status-transitions';
import {
  getProjectCustomerTypeOrIndustryLabel,
  PROJECT_IMPORT_TEMPLATE_EXAMPLE,
  PROJECT_IMPORT_TEMPLATE_HEADERS,
} from '@/lib/project-field-mappings';
import { resolveEffectiveProjectStage } from '@/lib/project-display';

interface Project {
  id: number;
  projectCode: string;
  projectName: string;
  customerId: number | null;
  customerName: string;
  projectType: string;
  projectStage?: string | null;
  status: string;
  priority: string;
  progress: number;
  estimatedAmount: string | null;
  actualAmount: string | null;
  startDate: string | null;
  expectedDeliveryDate: string | null;
  endDate: string | null;
  bidResult?: string | null;
  industry: string | null;
  region: string | null;
  description: string | null;
  risks: string | null; // 项目风险说明
  managerId: number | null;
  managerName?: string;
  createdAt: string;
  updatedAt: string;
  // 团队成员数量
  memberCount?: number;
  // 任务统计
  taskStats?: {
    total: number;
    completed: number;
    pending: number;
    inProgress: number;
  };
}

type ViewMode = 'list' | 'grid' | 'kanban';
type KanbanLane = 'opportunity' | 'pursuit' | 'delivery' | 'closed';

const ITEMS_PER_PAGE = 10;
const PROJECT_STAGE_OPTIONS = Object.entries(PROJECT_STAGE_CONFIG).map(([value, config]) => ({
  value: value as ProjectStage,
  label: config.label,
}));

const ACTIVE_PIPELINE_STAGES = new Set([
  'bidding_pending',
  'bidding',
  'solution_review',
  'contract_pending',
  'delivery_preparing',
  'delivering',
  'settlement',
  'execution',
  'acceptance',
]);

function getKanbanLane(stage: ProjectStage): KanbanLane {
  if (stage === 'opportunity') {
    return 'opportunity';
  }

  if (ACTIVE_PIPELINE_STAGES.has(stage)) {
    if (stage === 'delivery_preparing' || stage === 'delivering' || stage === 'settlement' || stage === 'execution' || stage === 'acceptance') {
      return 'delivery';
    }

    return 'pursuit';
  }

  return 'closed';
}

export default function ProjectsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [totalCount, setTotalCount] = useState(0); // 数据库总数量
  const [starredProjectIds, setStarredProjectIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [estimatedAmountFilter, setEstimatedAmountFilter] = useState('all');
  const [actualAmountFilter, setActualAmountFilter] = useState('all');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [currentPage, setCurrentPage] = useState(1);
  
  // 新建/编辑项目相关
  const [addProjectDialogOpen, setAddProjectDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [submittingProject, setSubmittingProject] = useState(false);
  const [projectNameCheckStatus, setProjectNameCheckStatus] = useState<'checking' | 'exists' | 'available' | 'idle'>('idle');
  const [projectDuplicateError, setProjectDuplicateError] = useState('');
  const projectNameCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [newProject, setNewProject] = useState({
    projectName: '',
    customerId: undefined as number | undefined,
    customerName: '',
    projectType: '',  // 默认为空，让用户选择
    industry: '',
    region: '',
    priority: 'medium',
    estimatedAmount: '',
    startDate: '',
    expectedDeliveryDate: '',
    description: '',
  });

  // 导入相关
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importPreview, setImportPreview] = useState<{
    total: number;
    valid: number;
    invalid: number;
    projects: Array<{ row: number; projectName: string; customerName: string; statusName: string; valid: boolean; error?: string }>;
    errors?: string[];
  } | null>(null);
  const [importResult, setImportResult] = useState<{
    success: number;
    failed: number;
    errors?: string[];
  } | null>(null);
  const [importStep, setImportStep] = useState<'upload' | 'preview' | 'result'>('upload');

  // 客户搜索相关
  const [customers, setCustomers] = useState<{id: number; customerName: string; customerType: string | null; customerTypeCode: string | null; defaultProjectTypeCode: string | null; region: string | null}[]>([]);

  // 项目类型选项
  const [projectTypeOptions, setProjectTypeOptions] = useState<{value: string; label: string}[]>([]);

  // 加载项目类型选项
  const loadProjectTypeOptions = async () => {
    try {
      const response = await fetch('/api/dictionary/options?categories=project_type');
      const data = await response.json();
      if (data.success && data.data?.project_type) {
        setProjectTypeOptions(data.data.project_type);
      }
    } catch (error) {
      console.error('Failed to load project type options:', error);
    }
  };

  const fetchProjects = async () => {
    try {
      const pageSize = 100;
      let page = 1;
      let total = 0;
      const allProjects: Project[] = [];

      while (true) {
        const { data: result, status } = await apiClient.get<{ success: boolean; data: { projects: Project[]; pagination: any } } | Project[]>(`/api/projects?page=${page}&pageSize=${pageSize}`);

        if (status !== 200) {
          break;
        }

        const projectData = Array.isArray(result) ? result : ((result as any)?.data?.projects || []);
        const pagination = Array.isArray(result) ? null : (result as any)?.data?.pagination;

        allProjects.push(...projectData);
        total = pagination?.total || total || projectData.length || 0;

        if (projectData.length === 0 || allProjects.length >= total) {
          break;
        }

        page += 1;
      }

      if (allProjects.length > 0 || total === 0) {
        setProjects(allProjects);
        setTotalCount(total || allProjects.length);
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    } finally {
      setLoading(false);
    }
  };

  // 获取已标记的重点项目
  const fetchStarredProjects = async () => {
    try {
      const { data: result, status } = await apiClient.get<{ success: boolean; data: { id: number }[] }>('/api/starred-projects');
      if (status === 200 && result.success) {
        const ids = new Set<number>(result.data.map((p) => p.id));
        setStarredProjectIds(ids);
      }
    } catch (error) {
      console.error('Failed to fetch starred projects:', error);
    }
  };

  // 初始化：获取项目列表和重点标记
  useEffect(() => {
    fetchProjects();
    fetchStarredProjects();
    loadProjectTypeOptions();
  }, []);

  useEffect(() => {
    const stage = searchParams.get('stage');
    const search = searchParams.get('search');
    const priority = searchParams.get('priority');
    const type = searchParams.get('type');

    setStatusFilter(stage || 'all');
    setSearchTerm(search || '');
    setPriorityFilter(priority || 'all');
    setTypeFilter(type || 'all');
  }, [searchParams]);

  // 切换项目重点标记
  const toggleStarred = async (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { data: result, status } = await apiClient.post<{ success: boolean; data: { starred: boolean } }>(
        '/api/starred-projects',
        {
          projectId: project.id,
          projectName: project.projectName,
        }
      );
      if (status === 200 && result.success) {
        setStarredProjectIds(prev => {
          const newSet = new Set(prev);
          if (result.data.starred) {
            newSet.add(project.id);
          } else {
            newSet.delete(project.id);
          }
          return newSet;
        });
        toast({
          title: result.data.starred ? '已标记为重点项目' : '已取消重点标记',
        });
      }
    } catch (error) {
      console.error('Failed to toggle starred:', error);
      toast({
        variant: 'destructive',
        title: '操作失败',
      });
    }
  };

  // 搜索客户
  const searchCustomers = async (term: string) => {
    // 如果搜索词为空，加载前20个客户供选择
    const searchQuery = term || '';
    try {
      const { data: result } = await apiClient.get<{ success: boolean; data: { customers: any[]; total: number } }>(`/api/customers?search=${encodeURIComponent(searchQuery)}&limit=20`);
      if (result.success && result.data) {
        // API 返回格式: { success: true, data: { customers: [...], total: ... } }
        const customerList = result.data.customers || [];
        setCustomers(customerList.map((c: any) => ({
          id: c.id,
          customerName: c.customerName,
          customerType: c.customerType || c.customerTypeName || null,
          customerTypeCode: c.customerTypeCode || null,
          defaultProjectTypeCode: c.defaultProjectTypeCode || null,
          region: c.region || null,
        })));
      }
    } catch (error) {
      console.error('Failed to search customers:', error);
    }
  };

  // 过滤项目
  const filteredProjects = projects.filter((project) => {
    const effectiveStage = resolveEffectiveProjectStage(project);
    const matchesSearch =
      (project.projectName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (project.customerName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (project.projectCode?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || effectiveStage === statusFilter;
    const matchesType = typeFilter === 'all' || project.projectType === typeFilter;
    const matchesPriority = priorityFilter === 'all' || project.priority === priorityFilter;
    
    // 预算金额筛选
    let matchesEstimatedAmount = true;
    if (estimatedAmountFilter !== 'all') {
      const amount = Number(project.estimatedAmount) || 0;
      switch (estimatedAmountFilter) {
        case '0': matchesEstimatedAmount = amount === 0; break;
        case '1-50': matchesEstimatedAmount = amount > 0 && amount <= 500000; break;
        case '50-100': matchesEstimatedAmount = amount > 500000 && amount <= 1000000; break;
        case '100-500': matchesEstimatedAmount = amount > 1000000 && amount <= 5000000; break;
        case '500+': matchesEstimatedAmount = amount > 5000000; break;
      }
    }
    
    // 中标金额筛选
    let matchesActualAmount = true;
    if (actualAmountFilter !== 'all') {
      const amount = Number(project.actualAmount) || 0;
      switch (actualAmountFilter) {
        case '0': matchesActualAmount = amount === 0; break;
        case '1-50': matchesActualAmount = amount > 0 && amount <= 500000; break;
        case '50-100': matchesActualAmount = amount > 500000 && amount <= 1000000; break;
        case '100-500': matchesActualAmount = amount > 1000000 && amount <= 5000000; break;
        case '500+': matchesActualAmount = amount > 5000000; break;
      }
    }
    
    return matchesSearch && matchesStatus && matchesType && matchesPriority && matchesEstimatedAmount && matchesActualAmount;
  });

  // 分页逻辑 - 基于过滤后的项目数量计算总页数
  const totalPages = Math.ceil(filteredProjects.length / ITEMS_PER_PAGE);
  const paginatedProjects = filteredProjects.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, typeFilter, priorityFilter, estimatedAmountFilter, actualAmountFilter]);

  const getStageBadge = (project: Project) => {
    const stage = resolveEffectiveProjectStage(project);
    const stageConfig = PROJECT_STAGE_CONFIG[stage];
    const stageColorMap: Record<string, string> = {
      blue: 'border-blue-200 bg-blue-50 text-blue-700',
      amber: 'border-amber-200 bg-amber-50 text-amber-700',
      orange: 'border-orange-200 bg-orange-50 text-orange-700',
      violet: 'border-violet-200 bg-violet-50 text-violet-700',
      cyan: 'border-cyan-200 bg-cyan-50 text-cyan-700',
      emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      green: 'border-green-200 bg-green-50 text-green-700',
      yellow: 'border-yellow-200 bg-yellow-50 text-yellow-700',
      gray: 'border-slate-200 bg-slate-50 text-slate-700',
      purple: 'border-purple-200 bg-purple-50 text-purple-700',
    };

    return (
      <Badge variant="outline" className={stageColorMap[stageConfig.color] || 'border-slate-200 bg-slate-50 text-slate-700'}>
        {stageConfig.shortLabel}
      </Badge>
    );
  };

  const totalEstimatedAmount = projects.reduce((sum, project) => sum + (Number(project.estimatedAmount) || 0), 0);
  const opportunityProjects = projects.filter((project) => resolveEffectiveProjectStage(project) === 'opportunity');
  const activeProjects = projects.filter((project) => ACTIVE_PIPELINE_STAGES.has(resolveEffectiveProjectStage(project)));
  const archivedProjects = projects.filter((project) => resolveEffectiveProjectStage(project) === 'archived');
  const wonProjects = projects.filter((project) => project.bidResult === 'won');

  const getPriorityBadge = (priority: string) => {
    const priorityMap: Record<string, { label: string; color: string }> = {
      high: { label: '高', color: 'bg-red-100 text-red-600' },
      medium: { label: '中', color: 'bg-yellow-100 text-yellow-600' },
      low: { label: '低', color: 'bg-gray-100 text-gray-600' },
    };
    const priorityInfo = priorityMap[priority] || { label: priority, color: 'bg-gray-100 text-gray-600' };
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityInfo.color}`}>{priorityInfo.label}</span>;
  };

  const getProjectTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      software: '软件',
      integration: '集成',
      consulting: '咨询',
      maintenance: '维护',
      other: '其他',
    };
    return typeMap[type] || type;
  };

  // 检查项目名称是否重复
  const checkProjectNameDuplicate = (projectName: string): boolean => {
    if (!Array.isArray(projects)) return false;
    // 如果是编辑模式，排除当前编辑的项目
    if (editingProject) {
      return projects.some(p => p.projectName === projectName && p.id !== editingProject.id);
    }
    return projects.some(p => p.projectName === projectName);
  };

  // 处理项目名称变化并实时检查重名
  const handleProjectNameChange = (name: string) => {
    setNewProject({ ...newProject, projectName: name });
    setProjectDuplicateError('');
    
    // 清除之前的定时器
    if (projectNameCheckTimeoutRef.current) {
      clearTimeout(projectNameCheckTimeoutRef.current);
    }
    
    if (!name.trim()) {
      setProjectNameCheckStatus('idle');
      return;
    }
    
    setProjectNameCheckStatus('checking');
    
    // 防抖检查
    projectNameCheckTimeoutRef.current = setTimeout(() => {
      const exists = checkProjectNameDuplicate(name.trim());
      setProjectNameCheckStatus(exists ? 'exists' : 'available');
    }, 300);
  };

  const handleAddProject = async () => {
    // 验证必填字段
    if (!newProject.projectName || !newProject.customerName || !newProject.projectType) {
      toast({
        variant: 'destructive',
        title: '验证失败',
        description: '请填写必填字段（项目名称、客户名称、项目类型）',
      });
      return;
    }

    // 检查项目名称重复
    if (projectNameCheckStatus === 'exists' || checkProjectNameDuplicate(newProject.projectName.trim())) {
      setProjectDuplicateError('项目名称已存在，请确认是否重复');
      setProjectNameCheckStatus('exists');
      return;
    }

    // 验证项目名称长度
    const nameLengthResult = validateLength(newProject.projectName.trim(), 2, 100, '项目名称');
    if (!nameLengthResult.valid) {
      toast({
        variant: 'destructive',
        title: '验证失败',
        description: nameLengthResult.message,
      });
      return;
    }

    // 验证预算金额格式
    if (newProject.estimatedAmount) {
      const amountResult = validateAmount(newProject.estimatedAmount);
      if (!amountResult.valid) {
        toast({
          variant: 'destructive',
          title: '验证失败',
          description: amountResult.message,
        });
        return;
      }
    }

    setSubmittingProject(true);
    try {
      const requestPayload = editingProject
        ? { id: editingProject.id, ...newProject }
        : newProject;
      const response = editingProject
        ? await apiClient.put<{ success: boolean; error?: string }>('/api/projects', requestPayload)
        : await apiClient.post<{ success: boolean; error?: string }>('/api/projects', requestPayload);
      const { status, data: result } = response;
      if (status === 200 || status === 201) {
        setAddProjectDialogOpen(false);
        setEditingProject(null);
        const today = new Date().toISOString().split('T')[0];
        setNewProject({
          projectName: '',
          customerId: undefined,
          customerName: '',
          projectType: '',  // 默认为空
          industry: '',
          region: '',
          priority: 'medium',
          estimatedAmount: '',
          startDate: today,
          expectedDeliveryDate: '',
          description: '',
        });
        await fetchProjects();
        toast({
          title: '操作成功',
          description: editingProject ? '项目更新成功' : '项目创建成功',
        });
      } else {
        // API 返回的错误格式: { success: false, error: { code, message } }
        const errorObj = (result as any)?.error;
        const errorMsg = errorObj?.message || (typeof errorObj === 'string' ? errorObj : '操作失败，请稍后重试');
        toast({
          variant: 'destructive',
          title: '操作失败',
          description: errorMsg,
        });
      }
    } catch (error) {
      console.error('Failed to create project:', error);
      toast({
        variant: 'destructive',
        title: '操作失败',
        description: '操作失败，请稍后重试',
      });
    } finally {
      setSubmittingProject(false);
    }
  };

  const handleDeleteProject = async (id: number) => {
    if (!confirm('确定要删除这个项目吗？')) return;
    
    try {
      const response = await apiClient.delete<{ success: boolean; error?: { message: string } }>(`/api/projects?id=${id}`);
      if (response.data?.success === false) {
        toast({
          variant: 'destructive',
          title: '删除失败',
          description: response.data?.error?.message || '删除项目失败，请稍后重试',
        });
        return;
      }
      toast({
        title: '删除成功',
        description: '项目已成功删除',
      });
      await fetchProjects();
    } catch (error) {
      console.error('Failed to delete project:', error);
      toast({
        variant: 'destructive',
        title: '删除失败',
        description: '删除项目失败，请稍后重试',
      });
    }
  };

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setNewProject({
      projectName: project.projectName,
      customerId: project.customerId,
      customerName: project.customerName,
      projectType: project.projectType,
      industry: project.industry || '',
      region: project.region || '',
      priority: project.priority,
      estimatedAmount: project.estimatedAmount || '',
      startDate: project.startDate || new Date().toISOString().split('T')[0],
      expectedDeliveryDate: project.expectedDeliveryDate || '',
      description: project.description || '',
    });
    // 重置名称检查状态，避免编辑时显示重名错误
    setProjectNameCheckStatus('idle');
    setProjectDuplicateError('');
    setAddProjectDialogOpen(true);
  };

  // 导入功能
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImportFile(file);
      setImportPreview(null);
      setImportResult(null);
      setImportStep('upload');
    }
  };

  // 预览导入数据
  const handlePreviewImport = async () => {
    if (!importFile) return;

    setImporting(true);
    const formData = new FormData();
    formData.append('file', importFile);
    formData.append('mode', 'preview');

    try {
      const { data } = await apiClient.post<{
        success: boolean;
        data: {
          total: number;
          valid: number;
          invalid: number;
          projects: Array<{ row: number; projectName: string; customerName: string; statusName: string; valid: boolean; error?: string }>;
          errors?: string[];
        };
      }>('/api/projects/import', formData);
      
      if (data.success) {
        setImportPreview(data.data);
        setImportStep('preview');
      }
    } catch (error) {
      console.error('Failed to preview import:', error);
    } finally {
      setImporting(false);
    }
  };

  // 执行实际导入
  const handleConfirmImport = async () => {
    if (!importFile) return;

    setImporting(true);
    const formData = new FormData();
    formData.append('file', importFile);
    formData.append('mode', 'import');

    try {
      const { data } = await apiClient.post<{
        success: boolean;
        data: {
          total: number;
          success: number;
          failed: number;
          errors?: string[];
        };
      }>('/api/projects/import', formData);
      
      if (data.success) {
        setImportResult(data.data);
        setImportStep('result');
        if (data.data.success > 0) {
          await fetchProjects();
        }
      }
    } catch (error) {
      console.error('Failed to import projects:', error);
    } finally {
      setImporting(false);
    }
  };

  // 旧的导入函数（兼容）
  const handleImport = handlePreviewImport;

  const downloadTemplate = () => {
    const headers = [PROJECT_IMPORT_TEMPLATE_HEADERS.join(',')];
    const example = [PROJECT_IMPORT_TEMPLATE_EXAMPLE.join(',')];
    const bom = '\uFEFF';
    const content = headers.join('\n') + '\n' + example.join('\n');
    const blob = new Blob([bom + content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = '项目导入模板.csv';
    link.click();
  };

  // 看板视图列
  const kanbanColumns: Array<{ id: KanbanLane; label: string; description: string; color: string }> = [
    { id: 'opportunity', label: '商机阶段', description: '线索与商机准备', color: 'bg-slate-50 border-slate-200' },
    { id: 'pursuit', label: '商务推进', description: '审批、投标与商务确认', color: 'bg-blue-50 border-blue-200' },
    { id: 'delivery', label: '交付结算', description: '执行准备、交付与结算', color: 'bg-emerald-50 border-emerald-200' },
    { id: 'closed', label: '已闭环', description: '归档或取消项目', color: 'bg-slate-100 border-slate-300' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">加载中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="projects-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">项目管理</h1>
          <p className="text-muted-foreground">管理售前项目的全生命周期</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={importDialogOpen} onOpenChange={(open) => {
            setImportDialogOpen(open);
            if (!open) {
              setImportFile(null);
              setImportPreview(null);
              setImportResult(null);
              setImportStep('upload');
            }
          }}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Upload className="mr-2 h-4 w-4" />
                导入项目
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>批量导入项目</DialogTitle>
                <DialogDescription>
                  上传 CSV 或 Excel 文件批量导入项目数据，请确保数据格式符合要求
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                {/* 步骤指示器 */}
                <div className="flex items-center gap-2 mb-4">
                  <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${importStep === 'upload' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                    1. 上传文件
                  </div>
                  <div className="h-px flex-1 bg-border" />
                  <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${importStep === 'preview' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                    2. 预览验证
                  </div>
                  <div className="h-px flex-1 bg-border" />
                  <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${importStep === 'result' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                    3. 导入结果
                  </div>
                </div>

                {/* 步骤1：上传文件 */}
                {importStep === 'upload' && (
                  <>
                    <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                      <div>
                        <h4 className="font-medium">下载导入模板</h4>
                        <p className="text-sm text-muted-foreground">使用标准模板填写项目信息，确保格式正确</p>
                      </div>
                      <Button onClick={downloadTemplate} variant="outline" size="sm">
                        <Download className="mr-2 h-4 w-4" />
                        下载模板
                      </Button>
                    </div>

                    <div className="border rounded-lg">
                      <div className="p-4 bg-muted/50 border-b">
                        <h4 className="font-medium">字段格式说明</h4>
                      </div>
                      <div className="p-4 text-sm">
                        <div className="grid grid-cols-2 gap-3">
                          <div><strong className="text-red-500">*</strong>项目名称：必填</div>
                          <div>客户名称：系统自动匹配已有客户</div>
                          <div>项目类型：软件开发/系统集成/咨询服务/运维服务/其他</div>
                          <div>项目阶段：商机/招标投标/实施交付/已归档/已取消</div>
                          <div>客户类型/行业：默认与客户保持一致，兼容历史行业值</div>
                          <div>区域：华北/华东/华南/华中/西北/西南/东北等</div>
                          <div>预计金额：数字</div>
                          <div>优先级：高/中/低</div>
                          <div>开始日期：YYYY-MM-DD</div>
                          <div>负责人：系统自动匹配已有人员</div>
                          <div>年份：如 2025</div>
                          <div>标签：多个标签用逗号分隔</div>
                        </div>
                      </div>
                    </div>

                    <div className="border-2 border-dashed rounded-lg p-8 text-center">
                      <input
                        type="file"
                        id="importFile"
                        accept=".csv,.xlsx,.xls"
                        onChange={handleFileSelect}
                        className="hidden"
                        disabled={importing}
                      />
                      <label htmlFor="importFile" className="cursor-pointer">
                        <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-sm font-medium mb-2">
                          {importFile ? importFile.name : '点击或拖拽文件到此处上传'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          支持 CSV、Excel (.xlsx, .xls) 格式
                        </p>
                      </label>
                    </div>
                  </>
                )}

                {/* 步骤2：预览验证 */}
                {importStep === 'preview' && importPreview && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-4 bg-muted rounded-lg text-center">
                        <div className="text-2xl font-bold">{importPreview.total}</div>
                        <div className="text-sm text-muted-foreground">总记录数</div>
                      </div>
                      <div className="p-4 bg-green-50 rounded-lg text-center">
                        <div className="text-2xl font-bold text-green-600">{importPreview.valid}</div>
                        <div className="text-sm text-muted-foreground">有效记录</div>
                      </div>
                      <div className="p-4 bg-red-50 rounded-lg text-center">
                        <div className="text-2xl font-bold text-red-600">{importPreview.invalid}</div>
                        <div className="text-sm text-muted-foreground">无效记录</div>
                      </div>
                    </div>

                    <div className="border rounded-lg max-h-[300px] overflow-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted sticky top-0">
                          <tr>
                            <th className="p-2 text-left">行号</th>
                            <th className="p-2 text-left">项目名称</th>
                            <th className="p-2 text-left">客户</th>
                            <th className="p-2 text-left">状态</th>
                            <th className="p-2 text-left">结果</th>
                          </tr>
                        </thead>
                        <tbody>
                          {importPreview.projects.map((p, idx) => (
                            <tr key={idx} className={p.valid ? 'bg-green-50' : 'bg-red-50'}>
                              <td className="p-2">{p.row}</td>
                              <td className="p-2">{p.projectName}</td>
                              <td className="p-2">{p.customerName || '-'}</td>
                              <td className="p-2">{p.statusName || '-'}</td>
                              <td className="p-2">
                                {p.valid ? (
                                  <span className="text-green-600">✓ 有效</span>
                                ) : (
                                  <span className="text-red-600 text-xs" title={p.error}>{p.error}</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {importPreview.invalid > 0 && (
                      <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded">
                        提示：仅导入有效记录，无效记录将被跳过
                      </div>
                    )}
                  </div>
                )}

                {/* 步骤3：导入结果 */}
                {importStep === 'result' && importResult && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-4 bg-muted rounded-lg text-center">
                        <div className="text-2xl font-bold">{importResult.success + importResult.failed}</div>
                        <div className="text-sm text-muted-foreground">处理总数</div>
                      </div>
                      <div className="p-4 bg-green-50 rounded-lg text-center">
                        <div className="text-2xl font-bold text-green-600">{importResult.success}</div>
                        <div className="text-sm text-muted-foreground">导入成功</div>
                      </div>
                      <div className="p-4 bg-red-50 rounded-lg text-center">
                        <div className="text-2xl font-bold text-red-600">{importResult.failed}</div>
                        <div className="text-sm text-muted-foreground">导入失败</div>
                      </div>
                    </div>

                    {importResult.errors && importResult.errors.length > 0 && (
                      <div className="border rounded-lg p-4">
                        <h4 className="font-medium mb-2">错误详情</h4>
                        <div className="text-sm space-y-1 text-red-600 max-h-[150px] overflow-auto">
                          {importResult.errors.map((e, idx) => (
                            <div key={idx}>• {e}</div>
                          ))}
                        </div>
                      </div>
                    )}

                    {importResult.success > 0 && (
                      <div className="text-sm text-green-600 bg-green-50 p-3 rounded flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        成功导入 {importResult.success} 条项目数据
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setImportDialogOpen(false);
                    setImportFile(null);
                    setImportPreview(null);
                    setImportResult(null);
                    setImportStep('upload');
                  }}
                  disabled={importing}
                >
                  {importStep === 'result' ? '关闭' : '取消'}
                </Button>
                
                {importStep === 'upload' && (
                  <Button onClick={handlePreviewImport} disabled={!importFile || importing}>
                    {importing ? '解析中...' : '下一步：预览'}
                  </Button>
                )}
                
                {importStep === 'preview' && (
                  <Button 
                    onClick={handleConfirmImport} 
                    disabled={importing || (importPreview?.valid || 0) === 0}
                  >
                    {importing ? '导入中...' : `确认导入 (${importPreview?.valid || 0} 条)`}
                  </Button>
                )}
                
                {importStep === 'result' && importResult && importResult.success > 0 && (
                  <Button onClick={() => {
                    setImportDialogOpen(false);
                    setImportFile(null);
                    setImportPreview(null);
                    setImportResult(null);
                    setImportStep('upload');
                  }}>
                    完成
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          <Button size="sm" variant="outline" onClick={() => window.location.href = '/api/export?type=projects&format=excel'}>
            <Download className="mr-2 h-4 w-4" />
            导出数据
          </Button>
          
          <Dialog open={addProjectDialogOpen} onOpenChange={(open) => {
            setAddProjectDialogOpen(open);
            if (!open) {
              // 弹窗关闭时重置所有相关状态
              setEditingProject(null);
              setProjectNameCheckStatus('idle');
              setProjectDuplicateError('');
            }
          }}>
            <DialogTrigger asChild>
              <PermissionButton
                permission={PERMISSIONS.PROJECT_CREATE}
                hideWhenNoPermission
                size="sm"
                onClick={() => { 
                  setEditingProject(null); 
                  setProjectNameCheckStatus('idle');
                  setProjectDuplicateError('');
                  const today = new Date().toISOString().split('T')[0];
                  setNewProject({ 
                    projectName: '', 
                    customerId: undefined,
                    customerName: '', 
                    projectType: '',  // 默认为空
                    industry: '', 
                    region: '', 
                    priority: 'medium', 
                    estimatedAmount: '', 
                    startDate: today, 
                    expectedDeliveryDate: '', 
                    description: '' 
                  }); 
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                新建项目
              </PermissionButton>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingProject ? '编辑项目' : '新建项目'}</DialogTitle>
                <DialogDescription>填写项目基本信息，带 * 的为必填项</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="projectName">项目名称 <span className="text-red-500">*</span></Label>
                  <div className="relative">
                    <Input 
                      id="projectName" 
                      value={newProject.projectName} 
                      onChange={(e) => handleProjectNameChange(e.target.value)} 
                      placeholder="请输入项目名称"
                      className={projectNameCheckStatus === 'exists' ? 'border-red-500 focus-visible:ring-red-500' : 
                                 projectNameCheckStatus === 'available' ? 'border-green-500 focus-visible:ring-green-500' : ''}
                    />
                    {projectNameCheckStatus === 'checking' && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                  </div>
                  {projectNameCheckStatus === 'exists' && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      项目名称已存在，请使用其他名称
                    </p>
                  )}
                  {projectNameCheckStatus === 'available' && (
                    <p className="text-xs text-green-500 flex items-center gap-1">
                      <Check className="h-3 w-3" />
                      项目名称可用
                    </p>
                  )}
                  {projectNameCheckStatus === 'idle' && (
                    <p className="text-xs text-muted-foreground">项目编号将由系统自动生成</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>客户名称 <span className="text-red-500">*</span></Label>
                  <CustomerSelect
                    customers={customers}
                    value={newProject.customerName}
                    onValueChange={(value, customer) => {
                      if (customer) {
                        // 自动带入客户的区域和客户类型，以及默认项目类型
                        setNewProject({ 
                          ...newProject, 
                          customerName: value,
                          region: customer.region || newProject.region,
                          industry: customer.customerType || newProject.industry,
                          projectType: customer.defaultProjectTypeCode || newProject.projectType,
                          customerId: customer.id,
                        });
                      } else {
                        setNewProject({ ...newProject, customerName: value });
                      }
                    }}
                    onSearch={searchCustomers}
                    placeholder="输入客户名称搜索..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>项目类型 <span className="text-red-500">*</span></Label>
                    <ProjectTypeSelect
                      options={projectTypeOptions}
                      value={newProject.projectType}
                      onValueChange={(value) => setNewProject({ ...newProject, projectType: value })}
                      placeholder="搜索并选择项目类型"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>兼容状态</Label>
                    <Input value="商机线索" readOnly className="bg-muted" />
                    <p className="text-xs text-muted-foreground">新建项目默认进入商机阶段；中标、丢标和归档结果请在项目详情页维护。</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>客户类型/行业</Label>
                    <Input 
                      value={getProjectCustomerTypeOrIndustryLabel(newProject.industry) || ''} 
                      readOnly 
                      placeholder="选择客户后自动带入" 
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground">默认由客户类型自动带入，兼容历史行业值</p>
                  </div>
                  <div className="space-y-2">
                    <Label>区域</Label>
                    <Input 
                      value={newProject.region || ''} 
                      readOnly 
                      placeholder="选择客户后自动带入" 
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground">由客户区域自动带入</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>优先级</Label>
                    <DictSelect
                      category="priority"
                      value={newProject.priority}
                      onValueChange={(value) => setNewProject({ ...newProject, priority: value })}
                      placeholder="请选择优先级"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="estimatedAmount">项目预算</Label>
                    <Input id="estimatedAmount" type="number" value={newProject.estimatedAmount} onChange={(e) => setNewProject({ ...newProject, estimatedAmount: e.target.value })} placeholder="请输入项目预算" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">开始日期</Label>
                    <Input id="startDate" type="date" value={newProject.startDate} onChange={(e) => setNewProject({ ...newProject, startDate: e.target.value })} />
                    <p className="text-xs text-muted-foreground">默认为项目创建日期</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expectedDeliveryDate">预计交付日期</Label>
                    <Input 
                      id="expectedDeliveryDate" 
                      type="date" 
                      value={newProject.expectedDeliveryDate} 
                      onChange={(e) => setNewProject({ ...newProject, expectedDeliveryDate: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">用于项目交付计划预估，不代表中标结果。</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">项目描述</Label>
                  <Textarea id="description" value={newProject.description} onChange={(e) => setNewProject({ ...newProject, description: e.target.value })} rows={3} placeholder="请输入项目描述信息..." />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddProjectDialogOpen(false)} disabled={submittingProject}>取消</Button>
                <Button onClick={handleAddProject} disabled={submittingProject}>{submittingProject ? '保存中...' : '保存'}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">项目总数</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projects.length}</div>
            <p className="text-xs text-muted-foreground">
              总预算 ¥{totalEstimatedAmount.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">商机阶段</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{opportunityProjects.length}</div>
            <p className="text-xs text-muted-foreground">线索跟进与立项准备</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">推进中</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeProjects.length}</div>
            <p className="text-xs text-muted-foreground">
              预算 ¥{activeProjects.reduce((sum, project) => sum + (Number(project.estimatedAmount) || 0), 0).toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">已归档</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{archivedProjects.length}</div>
            <p className="text-xs text-muted-foreground">
              中标金额 ¥{wonProjects.reduce((sum, project) => sum + (Number(project.actualAmount) || 0), 0).toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">跟进次数</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projects.reduce((sum, p) => sum + (p.memberCount || 0), 0)}</div>
            <p className="text-xs text-muted-foreground">总跟进记录数</p>
          </CardContent>
        </Card>
      </div>

      {/* 搜索和筛选 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索项目名称、客户名称或编号..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="项目阶段" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部阶段</SelectItem>
                {PROJECT_STAGE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ProjectTypeSelect
              options={projectTypeOptions}
              value={typeFilter === 'all' ? '' : typeFilter}
              onValueChange={(value) => setTypeFilter(value || 'all')}
              placeholder="项目类型"
              className="w-[150px]"
            />
            <DictSelect
              category="priority"
              value={priorityFilter === 'all' ? '' : priorityFilter}
              onValueChange={(value) => setPriorityFilter(value || 'all')}
              placeholder="优先级"
              className="w-[120px]"
              allowClear
            />
            <Select value={estimatedAmountFilter} onValueChange={setEstimatedAmountFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="预算金额" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部预算</SelectItem>
                <SelectItem value="0">未设置</SelectItem>
                <SelectItem value="1-50">50万以下</SelectItem>
                <SelectItem value="50-100">50-100万</SelectItem>
                <SelectItem value="100-500">100-500万</SelectItem>
                <SelectItem value="500+">500万以上</SelectItem>
              </SelectContent>
            </Select>
            <Select value={actualAmountFilter} onValueChange={setActualAmountFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="中标金额" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部中标</SelectItem>
                <SelectItem value="0">未设置</SelectItem>
                <SelectItem value="1-50">50万以下</SelectItem>
                <SelectItem value="50-100">50-100万</SelectItem>
                <SelectItem value="100-500">100-500万</SelectItem>
                <SelectItem value="500+">500万以上</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1 border-l pl-4 ml-2">
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'kanban' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('kanban')}
              >
                <KanbanSquare className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 项目列表 - 列表视图 */}
      {viewMode === 'list' && (
        <Card>
          <CardHeader>
            <CardTitle>项目列表 (共 {totalCount} 条)</CardTitle>
          </CardHeader>
          <CardContent>
            {paginatedProjects.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">暂无项目数据</div>
            ) : (
              <>
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[260px]">项目名称</TableHead>
                        <TableHead className="w-[180px]">客户</TableHead>
                        <TableHead className="w-[120px]">客户类型/行业</TableHead>
                        <TableHead className="w-[100px]">区域</TableHead>
                        <TableHead className="w-[140px]">项目阶段</TableHead>
                        <TableHead className="w-[100px]">优先级</TableHead>
                        <TableHead className="w-[140px] text-right">预计预算</TableHead>
                        <TableHead className="w-[120px]">负责人</TableHead>
                        <TableHead className="w-[120px]">更新时间</TableHead>
                        <TableHead className="w-[160px] text-right">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedProjects.map((project) => (
                        <TableRow
                          data-testid="project-list-item"
                          data-project-name={project.projectName}
                          key={project.id}
                          className="cursor-pointer"
                          onClick={() => router.push(`/projects/${project.id}`)}
                        >
                          <TableCell>
                            <div className="min-w-0 space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium truncate">{project.projectName}</span>
                                {starredProjectIds.has(project.id) && (
                                  <Star className="h-4 w-4 fill-yellow-500 text-yellow-500 shrink-0" />
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground font-mono">{project.projectCode}</div>
                              {project.risks && (
                                <div className="flex items-center gap-1 text-xs text-red-500">
                                  <AlertCircle className="h-3 w-3" />
                                  <span className="truncate">风险：{project.risks}</span>
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm">
                              <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <span className="truncate">{project.customerName || '-'}</span>
                            </div>
                          </TableCell>
                          <TableCell>{project.industry ? getProjectCustomerTypeOrIndustryLabel(project.industry) : '-'}</TableCell>
                          <TableCell>{project.region || '-'}</TableCell>
                          <TableCell>
                            {getStageBadge(project)}
                          </TableCell>
                          <TableCell>{getPriorityBadge(project.priority)}</TableCell>
                          <TableCell className="text-right">{project.estimatedAmount ? `¥${Number(project.estimatedAmount).toLocaleString()}` : '-'}</TableCell>
                          <TableCell>
                            {project.managerName ? (
                              <div className="flex items-center gap-1 text-sm">
                                <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                <span className="truncate">{project.managerName}</span>
                              </div>
                            ) : '-'}
                          </TableCell>
                          <TableCell>{project.updatedAt ? new Date(project.updatedAt).toLocaleDateString() : '-'}</TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1 shrink-0">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => { e.stopPropagation(); toggleStarred(project, e); }}
                                title={starredProjectIds.has(project.id) ? '取消重点标记' : '标记为重点'}
                              >
                                <Star className={`h-4 w-4 ${starredProjectIds.has(project.id) ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => { e.stopPropagation(); router.push(`/projects/${project.id}`); }}
                                title="查看详情"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                              <PermissionButton
                                variant="ghost"
                                size="sm"
                                data-testid="project-edit-button"
                                permission={PERMISSIONS.PROJECT_UPDATE}
                                hideWhenNoPermission
                                onClick={(e) => { e.stopPropagation(); handleEdit(project); }}
                                title="编辑"
                              >
                                <Edit className="h-4 w-4" />
                              </PermissionButton>
                              <PermissionButton
                                variant="ghost"
                                size="sm"
                                data-testid="project-delete-button"
                                permission={PERMISSIONS.PROJECT_DELETE}
                                hideWhenNoPermission
                                onClick={(e) => { e.stopPropagation(); handleDeleteProject(project.id); }}
                                title="删除"
                              >
                                <Trash2 className="h-4 w-4" />
                              </PermissionButton>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {totalPages > 1 && (
                  <nav aria-label="pagination" data-testid="pagination" className="flex items-center justify-between mt-4 pt-4 border-t">
                    <div className="text-sm text-muted-foreground">
                      显示 {(currentPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredProjects.length)} 条，共 {filteredProjects.length} 条
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        上一页
                      </Button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }
                          return (
                            <Button
                              key={pageNum}
                              variant={currentPage === pageNum ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => setCurrentPage(pageNum)}
                            >
                              {pageNum}
                            </Button>
                          );
                        })}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                      >
                        下一页
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </nav>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* 项目列表 - 卡片视图 */}
      {viewMode === 'grid' && (
        <Card>
          <CardHeader>
            <CardTitle>项目列表 (共 {totalCount} 条)</CardTitle>
          </CardHeader>
          <CardContent>
            {paginatedProjects.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">暂无项目数据</div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {paginatedProjects.map((project) => (
                    <Card key={project.id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-2 pt-3 px-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-sm line-clamp-1">{project.projectName}</CardTitle>
                            <CardDescription className="text-[10px] mt-0.5 font-mono">{project.projectCode}</CardDescription>
                          </div>
                          <div className="flex gap-0.5 shrink-0">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={(e) => toggleStarred(project, e)}
                            >
                              <Star className={`h-3 w-3 ${starredProjectIds.has(project.id) ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => router.push(`/projects/${project.id}`)}
                            >
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                            <PermissionButton
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              permission={PERMISSIONS.PROJECT_UPDATE}
                              hideWhenNoPermission
                              onClick={() => handleEdit(project)}
                            >
                              <Edit className="h-3 w-3" />
                            </PermissionButton>
                            <PermissionButton
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              permission={PERMISSIONS.PROJECT_DELETE}
                              hideWhenNoPermission
                              onClick={() => handleDeleteProject(project.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </PermissionButton>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2 pb-3 px-3">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Building2 className="h-3 w-3" />
                          <span className="truncate">{project.customerName}</span>
                        </div>
                        <div className="flex items-center justify-between flex-wrap gap-1">
                          <div className="flex gap-1">
                            {getStageBadge(project)}
                            {getPriorityBadge(project.priority)}
                          </div>
                          <Badge variant="outline" className="text-[10px] px-1 py-0">{getProjectTypeLabel(project.projectType)}</Badge>
                        </div>
                        {project.estimatedAmount && (
                          <div className="text-xs">
                            <span className="text-muted-foreground">预算: </span>
                            <span className="font-medium">¥{Number(project.estimatedAmount).toLocaleString()}</span>
                          </div>
                        )}
                        {project.bidResult === 'won' && project.actualAmount && (
                          <div className="text-xs">
                            <span className="text-muted-foreground">中标: </span>
                            <span className="font-medium text-green-600">¥{Number(project.actualAmount).toLocaleString()}</span>
                          </div>
                        )}
                        {project.managerName && (
                          <div className="text-xs text-muted-foreground">
                            负责人: {project.managerName}
                          </div>
                        )}
                        {project.risks && (
                          <div className="flex items-center gap-1 text-xs text-red-500 pt-1 border-t border-dashed">
                            <AlertCircle className="h-3 w-3 shrink-0" />
                            <span className="line-clamp-2">风险：{project.risks}</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
                {totalPages > 1 && (
                  <nav aria-label="pagination" data-testid="pagination" className="flex items-center justify-between mt-4 pt-4 border-t">
                    <div className="text-sm text-muted-foreground">
                      显示 {(currentPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredProjects.length)} 条，共 {filteredProjects.length} 条
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        上一页
                      </Button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }
                          return (
                            <Button
                              key={pageNum}
                              variant={currentPage === pageNum ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => setCurrentPage(pageNum)}
                            >
                              {pageNum}
                            </Button>
                          );
                        })}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                      >
                        下一页
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </nav>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* 项目列表 - 看板视图 */}
      {viewMode === 'kanban' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">项目看板 ({filteredProjects.length})</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {kanbanColumns.map((column) => {
              const columnProjects = paginatedProjects.filter((project) => getKanbanLane(resolveEffectiveProjectStage(project)) === column.id);
              return (
                <div key={column.id} className={`border rounded-lg p-3 space-y-2 ${column.color}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-sm">{column.label}</h4>
                      <p className="text-[10px] text-muted-foreground">{column.description}</p>
                    </div>
                    <Badge variant="secondary" className="text-xs">{columnProjects.length}</Badge>
                  </div>
                  <div className="space-y-2 max-h-[500px] overflow-y-auto">
                    {columnProjects.map((project) => (
                      <Card key={project.id} className="hover:shadow-md transition-shadow">
                        <CardHeader className="pb-1 pt-2 px-2">
                          <div className="flex items-start justify-between gap-1">
                            <CardTitle className="text-xs font-medium line-clamp-2 flex-1">{project.projectName}</CardTitle>
                            <div className="flex gap-0.5 shrink-0">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 w-5 p-0"
                                onClick={(e) => toggleStarred(project, e)}
                              >
                                <Star className={`h-3 w-3 ${starredProjectIds.has(project.id) ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 w-5 p-0"
                                onClick={() => router.push(`/projects/${project.id}`)}
                              >
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                              <PermissionButton
                                variant="ghost"
                                size="sm"
                                className="h-5 w-5 p-0"
                                permission={PERMISSIONS.PROJECT_UPDATE}
                                hideWhenNoPermission
                                onClick={() => handleEdit(project)}
                              >
                                <Edit className="h-3 w-3" />
                              </PermissionButton>
                              <PermissionButton
                                variant="ghost"
                                size="sm"
                                className="h-5 w-5 p-0"
                                permission={PERMISSIONS.PROJECT_DELETE}
                                hideWhenNoPermission
                                onClick={() => handleDeleteProject(project.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </PermissionButton>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-1.5 pb-2 px-2">
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Building2 className="h-2.5 w-2.5" />
                            <span className="truncate">{project.customerName}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            {getPriorityBadge(project.priority)}
                            <div className="flex items-center gap-1">
                              {getStageBadge(project)}
                              <Badge variant="outline" className="text-[10px] px-1 py-0">{getProjectTypeLabel(project.projectType)}</Badge>
                            </div>
                          </div>
                          {project.estimatedAmount && (
                            <div className="text-[10px]">
                              <span className="text-muted-foreground">预算: </span>
                              <span className="font-medium">¥{Number(project.estimatedAmount).toLocaleString()}</span>
                            </div>
                          )}
                          {project.bidResult === 'won' && project.actualAmount && (
                            <div className="text-[10px]">
                              <span className="text-muted-foreground">中标: </span>
                              <span className="font-medium text-green-600">¥{Number(project.actualAmount).toLocaleString()}</span>
                            </div>
                          )}
                          {project.risks && (
                            <div className="flex items-center gap-1 text-[10px] text-red-500 pt-1 border-t border-dashed">
                              <AlertCircle className="h-2.5 w-2.5 shrink-0" />
                              <span className="line-clamp-2">风险：{project.risks}</span>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                    {columnProjects.length === 0 && (
                      <div className="text-center py-6 text-xs text-muted-foreground">
                        暂无项目
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* 看板视图分页 */}
          {totalPages > 1 && (
            <nav aria-label="pagination" data-testid="pagination" className="flex items-center justify-between pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                显示 {(currentPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredProjects.length)} 条，共 {filteredProjects.length} 条
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  上一页
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  下一页
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </nav>
          )}
        </div>
      )}
    </div>
  );
}
