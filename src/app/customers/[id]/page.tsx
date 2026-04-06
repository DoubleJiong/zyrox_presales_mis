'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Phone, 
  Mail, 
  MapPin, 
  FileText,
  Briefcase,
  Users,
  Sparkles,
  Calendar,
  Building2,
  DollarSign,
  FileIcon,
  ChevronDown,
  ChevronRight,
  Clock
} from 'lucide-react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface Customer {
  id: number;
  customerId: string;
  customerName: string;
  customerType: string;
  customerTypeId?: number;
  region: string;
  status: string;
  totalAmount: string;
  currentProjectCount: number;
  lastCooperationDate: string | null;
  maxProjectAmount: string;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  address: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Project {
  id: number;
  projectCode: string;
  projectName: string;
  projectType: string;
  status: string;
  statusLabel?: string;
  priority: string;
  progress: number;
  estimatedAmount: string;
  startDate: string;
  endDate: string;
  createdAt: string;
}

interface SupportStaff {
  id: number;
  name: string;
  role: string;
}

interface FollowRecord {
  id: number;
  followContent: string;
  followTime: string;
  followType: string;
  followerName: string;
  projectId?: number;
  projectName?: string;
  attachmentUrl?: string;
  attachmentName?: string;
}

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);

  // 区域选项：除浙江省以外的所有省份 + 浙江省所有地市
  const regionOptions = [
    // 直辖市
    { value: '北京市', label: '北京市' },
    { value: '天津市', label: '天津市' },
    { value: '上海市', label: '上海市' },
    { value: '重庆市', label: '重庆市' },
    // 省份（不含浙江）
    { value: '河北省', label: '河北省' },
    { value: '山西省', label: '山西省' },
    { value: '辽宁省', label: '辽宁省' },
    { value: '吉林省', label: '吉林省' },
    { value: '黑龙江省', label: '黑龙江省' },
    { value: '江苏省', label: '江苏省' },
    { value: '安徽省', label: '安徽省' },
    { value: '福建省', label: '福建省' },
    { value: '江西省', label: '江西省' },
    { value: '山东省', label: '山东省' },
    { value: '河南省', label: '河南省' },
    { value: '湖北省', label: '湖北省' },
    { value: '湖南省', label: '湖南省' },
    { value: '广东省', label: '广东省' },
    { value: '海南省', label: '海南省' },
    { value: '四川省', label: '四川省' },
    { value: '贵州省', label: '贵州省' },
    { value: '云南省', label: '云南省' },
    { value: '陕西省', label: '陕西省' },
    { value: '甘肃省', label: '甘肃省' },
    { value: '青海省', label: '青海省' },
    { value: '台湾省', label: '台湾省' },
    // 自治区
    { value: '内蒙古自治区', label: '内蒙古自治区' },
    { value: '广西壮族自治区', label: '广西壮族自治区' },
    { value: '西藏自治区', label: '西藏自治区' },
    { value: '宁夏回族自治区', label: '宁夏回族自治区' },
    { value: '新疆维吾尔自治区', label: '新疆维吾尔自治区' },
    // 特别行政区
    { value: '香港特别行政区', label: '香港特别行政区' },
    { value: '澳门特别行政区', label: '澳门特别行政区' },
    // 浙江省地市
    { value: '杭州市', label: '杭州市（浙江）' },
    { value: '宁波市', label: '宁波市（浙江）' },
    { value: '温州市', label: '温州市（浙江）' },
    { value: '嘉兴市', label: '嘉兴市（浙江）' },
    { value: '湖州市', label: '湖州市（浙江）' },
    { value: '绍兴市', label: '绍兴市（浙江）' },
    { value: '金华市', label: '金华市（浙江）' },
    { value: '衢州市', label: '衢州市（浙江）' },
    { value: '舟山市', label: '舟山市（浙江）' },
    { value: '台州市', label: '台州市（浙江）' },
    { value: '丽水市', label: '丽水市（浙江）' },
  ];

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsTotal, setProjectsTotal] = useState(0);
  const [projectsPage, setProjectsPage] = useState(1);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const PROJECTS_PAGE_SIZE = 5;
  const [followRecords, setFollowRecords] = useState<FollowRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // 时间轴展开状态
  const [expandedRecords, setExpandedRecords] = useState<Set<number>>(new Set());
  
  // 跟进记录分页状态
  const [displayCount, setDisplayCount] = useState(10);
  const RECORDS_PER_PAGE = 10;

  // 客户类型（从字典获取）
  const [customerTypes, setCustomerTypes] = useState<Array<{ id: number; code: string; name: string }>>([]);

  // 状态评价
  const [statusEvaluation, setStatusEvaluation] = useState('');

  // 客户类型和客户状态的选项通过字典系统获取，无需本地状态

  const fetchDictionaryOptions = async () => {
    try {
      const response = await fetch('/api/dictionary/options?categories=industry');
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // 转换字典格式为兼容格式 - 客户类型使用行业分类
          if (result.data.industry) {
            setCustomerTypes(result.data.industry.map((item: any) => ({
              id: item.value,
              code: item.value,
              name: item.label,
            })));
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch dictionary options:', error);
    }
  };

  const fetchCustomerDetail = async () => {
    try {
      const response = await fetch(`/api/customers/${resolvedParams.id}`);
      if (response.ok) {
        const result = await response.json();
        // API 返回格式: { success: true, data: {...} }
        const data = result.data;
        if (data) {
          setCustomer(data);
        }
      }
    } catch (error) {
      console.error('Failed to fetch customer:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async (page: number = 1) => {
    setProjectsLoading(true);
    try {
      const response = await fetch(`/api/customers/${resolvedParams.id}/projects?page=${page}&pageSize=${PROJECTS_PAGE_SIZE}`);
      if (response.ok) {
        const result = await response.json();
        // API 返回格式: { success: true, data: [...], meta: { pagination: { total, page, pageSize } } }
        setProjects(result.data || []);
        setProjectsTotal(result.meta?.pagination?.total || 0);
        setProjectsPage(page);
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
      setProjects([]);
      setProjectsTotal(0);
    } finally {
      setProjectsLoading(false);
    }
  };

  const fetchFollowRecords = async () => {
    try {
      const response = await fetch(`/api/customers/${resolvedParams.id}/follows`);
      if (response.ok) {
        const result = await response.json();
        // API 返回格式: { success: true, data: [...] }
        const data = result.data || [];
        if (Array.isArray(data)) {
          // API已经返回正确的字段名，直接设置
          setFollowRecords(data);
        } else {
          setFollowRecords([]);
        }
      } else {
        setFollowRecords([]);
      }
    } catch (error) {
      console.error('Failed to fetch follow records:', error);
      setFollowRecords([]);
    }
  };

  // 初始化加载数据
  useEffect(() => {
    const initData = async () => {
      await Promise.all([
        fetchDictionaryOptions(),
        fetchCustomerDetail(),
        fetchProjects(1),
        fetchFollowRecords(),
      ]);
    };
    initData();
  }, [resolvedParams.id]);

  // 当客户数据或项目数据变化时，更新状态评价
  useEffect(() => {
    if (customer) {
      const statusText = customer.status === 'active' ? '活跃' : 
                        customer.status === 'potential' ? '潜在' : 
                        customer.status === 'inactive' ? '非活跃' : '已流失';
      // 使用 projectsTotal（总项目数）而不是 currentProjectCount（进行中项目数）
      const projectCountText = projectsTotal > 0 ? `${projectsTotal} 个项目` : '暂无项目';
      setStatusEvaluation(`${statusText}客户，${projectCountText}`);
    }
  }, [customer, projectsTotal]);

  const toggleExpand = (recordId: number) => {
    setExpandedRecords(prev => {
      const newSet = new Set(prev);
      if (newSet.has(recordId)) {
        newSet.delete(recordId);
      } else {
        newSet.add(recordId);
      }
      return newSet;
    });
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      active: { label: '活跃', variant: 'default' },
      potential: { label: '潜在', variant: 'secondary' },
      inactive: { label: '非活跃', variant: 'outline' },
      lost: { label: '已流失', variant: 'destructive' },
    };
    const statusInfo = statusMap[status] || { label: status, variant: 'default' as const };
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  const getTypeBadge = (type: string) => {
    // 颜色配置（保持视觉效果一致性）
    const colorMap: Record<string, string> = {
      education: 'bg-purple-100 text-purple-700',
      government: 'bg-blue-100 text-blue-700',
      enterprise: 'bg-green-100 text-green-700',
      medical: 'bg-red-100 text-red-700',
      other: 'bg-gray-100 text-gray-700',
    };
    
    // 从 customerTypes 中查找类型名称（优先使用系统设置中的名称）
    const matchedType = customerTypes.find(t => t.code === type);
    const displayLabel = matchedType?.name || type || '未知';
    
    // 使用硬编码颜色或默认颜色
    const color = colorMap[type] || 'bg-gray-100 text-gray-700';
    
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${color}`}>{displayLabel}</span>;
  };

  const formatCurrency = (amount: string) => {
    return `¥${Number(amount).toLocaleString()}`;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('zh-CN');
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('zh-CN');
  };

  // 跟进记录筛选
  const [filterStaff, setFilterStaff] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterYear, setFilterYear] = useState<string>('all');
  const [filterMonth, setFilterMonth] = useState<string>('all');
  const [filterProject, setFilterProject] = useState<string>('all');

  // 获取所有筛选选项
  const allStaff = Array.from(new Set(followRecords.filter(r => r?.followerName).map(r => r.followerName)));
  const allTypes = Array.from(new Set(followRecords.filter(r => r?.followType).map(r => r.followType)));
  const allYears = Array.from(new Set(followRecords.filter(r => r?.followTime).map(r => new Date(r.followTime).getFullYear()))).sort((a, b) => b - a);

  // 筛选跟进记录
  const orderedFollowRecords = [...followRecords].sort((left, right) => {
    const leftTime = new Date(left.followTime).getTime();
    const rightTime = new Date(right.followTime).getTime();
    return rightTime - leftTime;
  });

  const filteredFollowRecords = orderedFollowRecords.filter((record) => {
    if (!record || !record.followTime) return false;
    
    const recordDate = new Date(record.followTime);

    const matchesStaff = filterStaff === 'all' || record.followerName === filterStaff;
    const matchesType = filterType === 'all' || record.followType === filterType;
    const matchesYear = filterYear === 'all' || recordDate.getFullYear().toString() === filterYear;
    const matchesMonth = filterMonth === 'all' || (recordDate.getMonth() + 1).toString() === filterMonth;
    const matchesProject = filterProject === 'all' ||
      (!record.projectId && filterProject === 'none') ||
      (record.projectId && filterProject === 'has') ||
      record.projectId?.toString() === filterProject;

    return matchesStaff && matchesType && matchesYear && matchesMonth && matchesProject;
  });

  // 重置筛选
  const resetFilters = () => {
    setFilterStaff('all');
    setFilterType('all');
    setFilterYear('all');
    setFilterMonth('all');
    setFilterProject('all');
  };

  // 加载更多跟进记录
  const loadMoreRecords = () => {
    setDisplayCount(prev => prev + RECORDS_PER_PAGE);
  };

  // 重置显示数量（当筛选条件变化时）
  useEffect(() => {
    setDisplayCount(RECORDS_PER_PAGE);
  }, [filterStaff, filterType, filterYear, filterMonth, filterProject]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">客户不存在</div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="customer-detail-page">
      {/* 页面头部 */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">{customer.customerName}</h1>
          <p className="text-muted-foreground mt-1">{customer.customerId} • {customer.contactName}</p>
        </div>
        <div className="flex items-center gap-2">
          {getTypeBadge(customer.customerType)}
          {getStatusBadge(customer.status)}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* 左侧主要内容区域 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 客户基本信息 */}
          <Card>
            <CardHeader>
              <CardTitle>客户信息</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-muted-foreground">客户名称</Label>
                  <p className="font-medium">{customer.customerName}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground">客户类型</Label>
                  {getTypeBadge(customer.customerType)}
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground">客户状态</Label>
                  {getStatusBadge(customer.status)}
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground">所在区域</Label>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <p className="font-medium">{customer.region || '-'}</p>
                  </div>
                </div>
                <div className="space-y-1 md:col-span-2">
                  <Label className="text-muted-foreground">详细地址</Label>
                  <p className="font-medium">{customer.address || '-'}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground">联系人</Label>
                  <p className="font-medium">{customer.contactName || '-'}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground">联系电话</Label>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <p className="font-medium">{customer.contactPhone || '-'}</p>
                  </div>
                </div>
                <div className="space-y-1 md:col-span-2">
                  <Label className="text-muted-foreground">联系邮箱</Label>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <p className="font-medium">{customer.contactEmail || '-'}</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-1">
                <Label className="text-muted-foreground">客户描述</Label>
                <p className="text-sm whitespace-pre-wrap">{customer.description || '-'}</p>
              </div>
            </CardContent>
          </Card>

          {/* 历史数据统计 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                历史数据统计
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                  <div className="text-sm text-blue-600 mb-1">历史中标总额</div>
                  <div className="text-2xl font-bold text-blue-700">{formatCurrency(customer.totalAmount)}</div>
                </div>
                <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                  <div className="text-sm text-green-600 mb-1">历史最大中标金额</div>
                  <div className="text-2xl font-bold text-green-700">{formatCurrency(customer.maxProjectAmount)}</div>
                </div>
                <div className="p-4 rounded-lg bg-purple-50 border border-purple-200">
                  <div className="text-sm text-purple-600 mb-1">历史项目数</div>
                  <div className="text-2xl font-bold text-purple-700">{projectsTotal}</div>
                </div>
              </div>

              {/* 历史支持人员名单 */}
              <div className="mt-4 p-4 rounded-lg border bg-muted/30">
                <div className="text-sm text-muted-foreground mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  历史支持人员名单
                </div>
                <div className="flex flex-wrap gap-2">
                  {allStaff.filter(Boolean).map((staff, index) => (
                    <Badge key={index} variant="secondary" className="gap-1 items-center">
                      <div className="h-4 w-4 rounded-full bg-muted flex items-center justify-center text-xs flex-shrink-0">
                        {staff?.charAt(0) || '?'}
                      </div>
                      <span className="truncate max-w-[60px]">{staff}</span>
                    </Badge>
                  ))}
                  {allStaff.filter(Boolean).length === 0 && (
                    <span className="text-sm text-muted-foreground">暂无支持人员记录</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 跟进记录时间轴 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    跟进记录
                  </CardTitle>
                  <CardDescription>
                    按跟进时间倒序合并展示，默认先显示最近 {Math.min(RECORDS_PER_PAGE, filteredFollowRecords.length || RECORDS_PER_PAGE)} 条记录。共 {filteredFollowRecords.length} 条记录
                    {(filterStaff !== 'all' || filterType !== 'all' || filterYear !== 'all' || filterMonth !== 'all' || filterProject !== 'all') && (
                      <span className="ml-2 text-muted-foreground">(已筛选)</span>
                    )}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* 筛选器 */}
              <div className="mb-6 p-4 rounded-lg bg-muted/30">
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">跟进人员</Label>
                    <Select value={filterStaff} onValueChange={setFilterStaff}>
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="全部人员" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">全部人员</SelectItem>
                        {allStaff.filter(Boolean).map(staff => (
                          <SelectItem key={staff} value={staff}>{staff}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">跟进类型</Label>
                    <Select value={filterType} onValueChange={setFilterType}>
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="全部类型" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">全部类型</SelectItem>
                        {allTypes.filter(Boolean).map(type => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">年份</Label>
                    <Select value={filterYear} onValueChange={setFilterYear}>
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="全部年份" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">全部年份</SelectItem>
                        {allYears.filter(Boolean).map(year => (
                          <SelectItem key={year} value={year.toString()}>{year}年</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">关联项目</Label>
                    <Select value={filterProject} onValueChange={setFilterProject}>
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="全部项目" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">全部项目</SelectItem>
                        <SelectItem value="has">有关联项目</SelectItem>
                        <SelectItem value="none">无关联项目</SelectItem>
                        {projects.filter(project => project && project.id && project.projectName).map(project => (
                          <SelectItem key={project.id} value={project.id.toString()}>
                            {project.projectName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {(filterStaff !== 'all' || filterType !== 'all' || filterYear !== 'all' || filterMonth !== 'all' || filterProject !== 'all') && (
                  <div className="mt-3 pt-3 border-t flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      筛选结果：{filteredFollowRecords.length} 条记录
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={resetFilters}
                      className="h-8 text-xs"
                    >
                      重置筛选
                    </Button>
                  </div>
                )}
              </div>

              {/* 时间轴内容 */}
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-muted" />

                {filteredFollowRecords.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    暂无跟进记录{followRecords.length > 0 ? '，或尝试调整筛选条件' : ''}
                  </div>
                ) : (
                  <>
                    {filteredFollowRecords.slice(0, displayCount).map((record, index) => {
                    const isExpanded = expandedRecords.has(record.id);
                    return (
                      <div key={record.id} className="relative pl-12 pb-8 last:pb-0" data-testid={`customer-follow-record-${record.id}`}>
                        <div className="absolute left-2 top-3 w-4 h-4 rounded-full bg-primary border-4 border-background cursor-pointer hover:scale-110 transition-transform" />
                        <div className="space-y-2">
                          {/* 简要信息（始终显示） */}
                          <div
                            className="flex items-center justify-between cursor-pointer hover:bg-muted/50 p-2 rounded-lg transition-colors"
                            onClick={() => toggleExpand(record.id)}
                            data-testid={`customer-follow-record-toggle-${record.id}`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                                <span className="text-xs font-medium">{record.followerName?.charAt(0) || '?'}</span>
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-sm truncate">{record.followerName}</span>
                                  <Badge variant="outline" className="text-xs flex-shrink-0">{record.followType}</Badge>
                                </div>
                                <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                  <Clock className="h-3 w-3" />
                                  {formatDateTime(record.followTime)}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {record.projectName && record.projectName !== '无关联项目' && (
                                <Badge variant="secondary" className="text-xs">{record.projectName}</Badge>
                              )}
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                          </div>

                          {/* 详细信息（展开时显示） */}
                          {isExpanded && (
                            <div className="mt-2 space-y-3 p-4 bg-muted/30 rounded-lg">
                              <div className="flex items-start gap-3">
                                <div className="flex-1">
                                  <Label className="text-xs text-muted-foreground">跟进内容</Label>
                                  <p className="text-sm mt-1 whitespace-pre-wrap line-clamp-6 max-h-40 overflow-hidden" title={record.followContent} data-testid={`customer-follow-record-content-${record.id}`}>{record.followContent}</p>
                                </div>
                              </div>
                              {record.attachmentUrl && (
                                <div className="pt-2 border-t">
                                  <Label className="text-xs text-muted-foreground">佐证物</Label>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Button variant="outline" size="sm" className="h-8" asChild>
                                      <a
                                        href={record.attachmentUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        data-testid={`customer-follow-attachment-link-${record.id}`}
                                      >
                                        <FileIcon className="h-3 w-3 mr-2" />
                                        {record.attachmentName || '查看附件'}
                                      </a>
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                    
                    {/* 加载更多按钮 */}
                    {filteredFollowRecords.length > displayCount && (
                      <div className="relative pl-12 pt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={loadMoreRecords}
                          className="w-full"
                        >
                          加载更多 ({filteredFollowRecords.length - displayCount} 条未显示)
                        </Button>
                      </div>
                    )}
                    
                    {/* 显示记录统计 */}
                    {filteredFollowRecords.length > 0 && (
                      <div className="relative pl-12 pt-4 text-center text-xs text-muted-foreground">
                        已显示 {Math.min(displayCount, filteredFollowRecords.length)} / {filteredFollowRecords.length} 条记录
                      </div>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 右侧快速操作区域 */}
        <div className="space-y-6">
          {/* 客户状态评价 */}
          <Card>
            <CardHeader>
              <CardTitle>客户状态评价</CardTitle>
              <CardDescription>AI 驱动的智能分析</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="p-4 rounded-lg bg-gradient-to-br from-purple-50 to-blue-50 border">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-white shadow-sm">
                      <Sparkles className="h-5 w-5 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-sm mb-2">AI 分析结果</div>
                      <p className="text-sm text-muted-foreground">
                        {statusEvaluation}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 rounded-lg bg-muted/50 border border-dashed">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Sparkles className="h-4 w-4" />
                    <span>AI 功能建设中</span>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    未来将支持智能推荐、风险预测、客户画像等功能
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 历史项目列表 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                关联项目
              </CardTitle>
              <CardDescription>
                {projectsTotal > 0 ? `共 ${projectsTotal} 个项目` : '暂无关联项目'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {projectsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-muted-foreground">加载中...</div>
                </div>
              ) : projects.length > 0 ? (
                <>
                  <div className="space-y-3">
                    {projects.filter(project => project && project.id).map((project) => (
                      <div 
                        key={project.id} 
                        className="p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => router.push(`/projects/${project.id}`)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-sm">{project.projectName}</div>
                            <div className="text-xs text-muted-foreground mt-1">{project.projectCode}</div>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="outline" className="text-xs">
                                <DollarSign className="h-3 w-3 mr-1" />
                                {formatCurrency(project.estimatedAmount)}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {formatDate(project.startDate)}
                              </Badge>
                            </div>
                          </div>
                          <Badge 
                            variant={project.statusLabel === '已归档' || project.statusLabel === '已取消' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {project.statusLabel || project.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* 分页控制 */}
                  {projectsTotal > PROJECTS_PAGE_SIZE && (
                    <div className="flex items-center justify-between mt-4 pt-4 border-t">
                      <div className="text-sm text-muted-foreground">
                        第 {(projectsPage - 1) * PROJECTS_PAGE_SIZE + 1}-{Math.min(projectsPage * PROJECTS_PAGE_SIZE, projectsTotal)} 项，共 {projectsTotal} 项
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          disabled={projectsPage === 1}
                          onClick={() => fetchProjects(projectsPage - 1)}
                        >
                          上一页
                        </Button>
                        <div className="text-sm">
                          第 {projectsPage} / {Math.ceil(projectsTotal / PROJECTS_PAGE_SIZE)} 页
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          disabled={projectsPage >= Math.ceil(projectsTotal / PROJECTS_PAGE_SIZE)}
                          onClick={() => fetchProjects(projectsPage + 1)}
                        >
                          下一页
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {/* 跳转到项目管理 */}
                  <div className="mt-3 pt-3 border-t text-center">
                    <Button 
                      variant="link" 
                      size="sm" 
                      className="text-muted-foreground"
                      onClick={() => router.push(`/projects?customerId=${customer?.id}`)}
                    >
                      在项目管理中查看全部项目
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Building2 className="h-12 w-12 text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">暂无关联项目</p>
                  <p className="text-sm text-muted-foreground mt-1">可在项目管理模块中创建新项目</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

    </div>
  );
}
