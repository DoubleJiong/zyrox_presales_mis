'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { SearchableSelect } from '@/components/ui/searchable-select';
import { DictSelect } from '@/components/dictionary/dict-select';
import { Badge } from '@/components/ui/badge';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from '@/components/ui/drawer';
import { validatePhone, validateEmail, validateLength } from '@/lib/validators';
import { PermissionButton } from '@/components/auth/PermissionProvider';
import { PERMISSIONS } from '@/lib/permissions';
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
import {
  Search,
  Plus,
  Eye,
  Edit,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Calendar,
  Briefcase,
  LayoutGrid,
  Table as TableIcon,
  ChevronLeft,
  ChevronRight,
  Building,
  Phone,
  Mail,
  MapPin,
  X,
  FileText,
  History,
  TrendingUp,
  DollarSign,
  AlertCircle,
  Upload,
  FileUp,
  Download,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { matchCustomerName } from '@/lib/customer-name-dedup';

interface Customer {
  id: number;
  customerId: string;
  customerName: string;
  customerType: string;          // 显示名称（用于列表显示）
  customerTypeCode?: string;     // 字典code（用于编辑下拉框）
  region: string;
  status: string;
  totalAmount: string;
  currentProjectCount: number;
  lastCooperationDate: string | null;
  lastInteractionTime: string | null; // V1.3: 最近互动时间
  maxProjectAmount: string;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  address: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

interface SimilarCustomerCandidate {
  id: number;
  customerId: string;
  customerName: string;
  customerType: string;
  customerTypeCode?: string;
  region: string;
  contactName: string | null;
  updatedAt: string | null;
  matchType: 'exact' | 'similar';
}

type CustomerSortField = 'updatedAt' | 'lastInteractionTime' | 'totalAmount' | 'maxProjectAmount';
type CustomerSortDirection = 'asc' | 'desc';
type CustomerNameCheckStatus = 'checking' | 'exists' | 'similar' | 'available' | 'idle';

export default function CustomersPage() {
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

  const router = useRouter();
  const { toast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [totalCount, setTotalCount] = useState(0); // 数据库总数量
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<CustomerSortField>('updatedAt');
  const [sortDirection, setSortDirection] = useState<CustomerSortDirection>('desc');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const itemsPerPage = 9;

  // 新建客户相关
  const [addCustomerDialogOpen, setAddCustomerDialogOpen] = useState(false);
  const [editCustomerDialogOpen, setEditCustomerDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [newCustomer, setNewCustomer] = useState({
    customerName: '',
    customerType: '',
    region: '',
    status: 'potential',
    contactName: '',
    contactPhone: '',
    contactEmail: '',
    address: '',
    description: ''
  });
  const [editCustomer, setEditCustomer] = useState({
    customerName: '',
    customerType: '',
    region: '',
    status: 'potential',
    contactName: '',
    contactPhone: '',
    contactEmail: '',
    address: '',
    description: ''
  });
  const [submittingCustomer, setSubmittingCustomer] = useState(false);
  const [duplicateError, setDuplicateError] = useState('');
  const [createNameCheckStatus, setCreateNameCheckStatus] = useState<CustomerNameCheckStatus>('idle');
  const [editNameCheckStatus, setEditNameCheckStatus] = useState<CustomerNameCheckStatus>('idle');
  const [createSimilarCustomers, setCreateSimilarCustomers] = useState<SimilarCustomerCandidate[]>([]);
  const [editSimilarCustomers, setEditSimilarCustomers] = useState<SimilarCustomerCandidate[]>([]);
  const [createSimilarConfirmed, setCreateSimilarConfirmed] = useState(false);
  const [editSimilarConfirmed, setEditSimilarConfirmed] = useState(false);

  // 客户类型列表（从字典系统获取，用于显示映射）
  const [customerTypeList, setCustomerTypeList] = useState<{id: number; code: string; name: string; status: string}[]>([]);

  // 防抖检查客户名称
  const createNameCheckTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editNameCheckTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 导入客户相关
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: number;
    failed: number;
    errors: string[];
  } | null>(null);


  useEffect(() => {
    fetchCustomerTypesFromDict();
  }, []);

  // 当筛选条件或分页变化时重新获取数据
  useEffect(() => {
    // 等待客户类型列表加载完成后再获取客户数据
    if (customerTypeList.length > 0 || typeFilter === 'all') {
      fetchCustomers();
    }
  }, [currentPage, statusFilter, typeFilter, sortField, sortDirection, customerTypeList.length]);

  // 搜索防抖
  useEffect(() => {
    const timer = setTimeout(() => {
      if (customerTypeList.length > 0 || typeFilter === 'all') {
        fetchCustomers({ search, page: 1 });
        setCurrentPage(1);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    return () => {
      if (createNameCheckTimeoutRef.current) {
        clearTimeout(createNameCheckTimeoutRef.current);
      }
      if (editNameCheckTimeoutRef.current) {
        clearTimeout(editNameCheckTimeoutRef.current);
      }
    };
  }, []);

  const fetchCustomerTypesFromDict = async () => {
    try {
      const response = await fetch('/api/dictionary/options?categories=industry,customer_status');
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // 转换字典格式为兼容格式 - 客户类型
          const types = (result.data.industry || []).map((item: any) => ({
            id: item.value,
            code: item.value,
            name: item.label,
            status: 'active',
          }));
          setCustomerTypeList(types);
        }
      }
    } catch (error) {
      console.error('Failed to fetch customer types from dict:', error);
    }
  };

  const fetchCustomers = async (params?: { page?: number; search?: string; status?: string; type?: string }) => {
    setLoading(true);
    try {
      // 构建查询参数
      const queryParams = new URLSearchParams();
      const pageToUse = params?.page ?? currentPage;
      const searchToUse = params?.search ?? search;
      const statusToUse = params?.status ?? statusFilter;
      const typeToUse = params?.type ?? typeFilter;
      
      queryParams.set('page', String(pageToUse));
      queryParams.set('pageSize', String(itemsPerPage));
      queryParams.set('sortField', sortField);
      queryParams.set('sortDirection', sortDirection);
      
      if (searchToUse) {
        queryParams.set('search', searchToUse);
      }
      if (statusToUse && statusToUse !== 'all') {
        queryParams.set('status', statusToUse);
      }
      // 通过customerType名称筛选（后端支持）
      if (typeToUse && typeToUse !== 'all') {
        // 查找类型名称
        const matchedType = customerTypeList.find(t => t.code === typeToUse);
        if (matchedType?.name) {
          queryParams.set('customerType', matchedType.name);
        }
      }
      
      const response = await fetch(`/api/customers?${queryParams.toString()}`);
      const result = await response.json();
      // API 返回格式: { success: true, data: { customers: [...], pagination: { total: ... } } }
      if (result.success && result.data) {
        // 兼容两种格式：data.customers 或直接 data 数组
        const customerData = result.data.customers || result.data;
        setCustomers(Array.isArray(customerData) ? customerData : []);
        // 获取总数
        const total = result.data.pagination?.total || result.data.total || customerData.length || 0;
        setTotalCount(total);
      } else {
        console.error('Invalid data format received from API');
        setCustomers([]);
        setTotalCount(0);
      }
    } catch (error) {
      console.error('Failed to fetch customers:', error);
      setCustomers([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  const openExistingCustomerDetail = (customerId: number) => {
    if (typeof window !== 'undefined') {
      window.open(`/customers/${customerId}`, '_blank', 'noopener,noreferrer');
      return;
    }
    router.push(`/customers/${customerId}`);
  };

  const resetCreateNameCheck = () => {
    setCreateNameCheckStatus('idle');
    setCreateSimilarCustomers([]);
    setCreateSimilarConfirmed(false);
  };

  const resetEditNameCheck = () => {
    setEditNameCheckStatus('idle');
    setEditSimilarCustomers([]);
    setEditSimilarConfirmed(false);
  };

  const resolveNameCheckStatus = (matches: SimilarCustomerCandidate[]): CustomerNameCheckStatus => {
    if (matches.some((customer) => customer.matchType === 'exact')) {
      return 'exists';
    }
    if (matches.length > 0) {
      return 'similar';
    }
    return 'available';
  };

  const fetchSimilarCustomers = async (customerName: string, excludeId?: number): Promise<SimilarCustomerCandidate[]> => {
    const trimmedName = customerName.trim();
    if (trimmedName.length < 2) {
      return [];
    }

    const queryParams = new URLSearchParams({
      similarTo: trimmedName,
      similarLimit: '5',
    });

    if (excludeId) {
      queryParams.set('excludeId', String(excludeId));
    }

    const response = await fetch(`/api/customers?${queryParams.toString()}`);
    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error('FAILED_TO_QUERY_SIMILAR_CUSTOMERS');
    }

    return Array.isArray(result.data?.customers) ? result.data.customers : [];
  };

  const runCreateNameCheck = async (customerName: string) => {
    const trimmedName = customerName.trim();
    if (trimmedName.length < 2) {
      resetCreateNameCheck();
      return { status: 'idle' as CustomerNameCheckStatus, matches: [] as SimilarCustomerCandidate[] };
    }

    setCreateNameCheckStatus('checking');
    const matches = await fetchSimilarCustomers(trimmedName);
    const status = resolveNameCheckStatus(matches);
    setCreateSimilarCustomers(matches);
    setCreateNameCheckStatus(status);
    return { status, matches };
  };

  const runEditNameCheck = async (customerName: string) => {
    const trimmedName = customerName.trim();
    const originalName = editingCustomer?.customerName?.trim() || '';

    if (trimmedName.length < 2 || (originalName && matchCustomerName(trimmedName, originalName).matchType === 'exact')) {
      resetEditNameCheck();
      return { status: 'idle' as CustomerNameCheckStatus, matches: [] as SimilarCustomerCandidate[] };
    }

    setEditNameCheckStatus('checking');
    const matches = await fetchSimilarCustomers(trimmedName, editingCustomer?.id);
    const status = resolveNameCheckStatus(matches);
    setEditSimilarCustomers(matches);
    setEditNameCheckStatus(status);
    return { status, matches };
  };

  const renderSimilarCustomerReminder = (
    matches: SimilarCustomerCandidate[],
    confirmed: boolean,
    onConfirm: () => void,
    onCancel: () => void,
  ) => {
    if (!matches.length) {
      return null;
    }

    return (
      <div className="space-y-3 rounded-md border border-amber-200 bg-amber-50 p-3" data-testid="customer-similar-warning">
        <div className="flex items-start gap-2 text-amber-900">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <div className="space-y-1">
            <p className="text-sm font-medium">发现相似客户，请先确认是否重复</p>
            <p className="text-xs">完全重复会被系统拦截；相似客户允许确认后继续保存。</p>
          </div>
        </div>
        <div className="space-y-2">
          {matches.map((customer) => (
            <div key={customer.id} className="rounded border border-amber-200 bg-white p-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-foreground">{customer.customerName}</p>
                  <p className="text-xs text-muted-foreground">
                    {customer.region || '未填写地区'}
                    {customer.customerType ? ` / ${customer.customerType}` : ''}
                    {customer.contactName ? ` / 联系人：${customer.contactName}` : ''}
                  </p>
                </div>
                <Badge variant={customer.matchType === 'exact' ? 'destructive' : 'secondary'}>
                  {customer.matchType === 'exact' ? '完全重复' : '相似客户'}
                </Badge>
              </div>
              <div className="mt-2 flex items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">最近更新：{customer.updatedAt ? formatDate(customer.updatedAt) : '-'}</p>
                <Button type="button" variant="outline" size="sm" onClick={() => openExistingCustomerDetail(customer.id)}>
                  查看已有客户
                </Button>
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>
            取消提交并返回编辑
          </Button>
          <Button type="button" size="sm" onClick={onConfirm} disabled={confirmed}>
            {confirmed ? '已确认继续' : '继续创建新客户'}
          </Button>
        </div>
      </div>
    );
  };

  // 处理新建客户提交
  const handleAddCustomer = async () => {
    // 验证必填字段
    if (!newCustomer.customerName || !newCustomer.customerType || !newCustomer.region) {
      toast({
        variant: 'destructive',
        title: '验证失败',
        description: '请填写必填字段（客户名称、客户类型、所属地区）',
      });
      return;
    }

    // 验证客户名称长度
    const nameLengthResult = validateLength(newCustomer.customerName.trim(), 2, 100, '客户名称');
    if (!nameLengthResult.valid) {
      toast({
        variant: 'destructive',
        title: '验证失败',
        description: nameLengthResult.message,
      });
      return;
    }

    const createCheck = await runCreateNameCheck(newCustomer.customerName);
    if (createCheck.status === 'exists') {
      setDuplicateError('客户名称已存在，请确认是否重复');
      setCreateNameCheckStatus('exists');
      setCreateSimilarConfirmed(false);
      return;
    }

    if (createCheck.status === 'similar' && !createSimilarConfirmed) {
      setDuplicateError('发现相似客户，请确认后再继续创建');
      return;
    }

    // 验证联系电话格式
    if (newCustomer.contactPhone) {
      const phoneResult = validatePhone(newCustomer.contactPhone);
      if (!phoneResult.valid) {
        toast({
          variant: 'destructive',
          title: '验证失败',
          description: phoneResult.message,
        });
        return;
      }
    }

    // 验证邮箱格式
    if (newCustomer.contactEmail) {
      const emailResult = validateEmail(newCustomer.contactEmail);
      if (!emailResult.valid) {
        toast({
          variant: 'destructive',
          title: '验证失败',
          description: emailResult.message,
        });
        return;
      }
    }

    setDuplicateError('');
    setSubmittingCustomer(true);

    try {
      // 直接传递 customerType（字典编码），让 API 查找对应的 ID
      const submitData = {
        customerName: newCustomer.customerName,
        customerType: newCustomer.customerType, // 传递字典编码
        region: newCustomer.region,
        status: newCustomer.status,
        contactName: newCustomer.contactName,
        contactPhone: newCustomer.contactPhone,
        contactEmail: newCustomer.contactEmail,
        address: newCustomer.address,
        description: newCustomer.description,
      };

      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      if (response.ok) {
        // 刷新客户列表
        await fetchCustomers();
        // 重置表单
        setNewCustomer({
          customerName: '',
          customerType: '',
          region: '',
          status: 'potential',
          contactName: '',
          contactPhone: '',
          contactEmail: '',
          address: '',
          description: ''
        });
        // 重置检查状态
        resetCreateNameCheck();
        setDuplicateError('');
        // 关闭对话框
        setAddCustomerDialogOpen(false);
        toast({
          title: '操作成功',
          description: '客户创建成功！',
        });
      } else {
        const error = await response.json();
        toast({
          variant: 'destructive',
          title: '创建失败',
          description: `创建失败：${error.message || '未知错误'}`,
        });
      }
    } catch (error) {
      console.error('Failed to create customer:', error);
      toast({
        variant: 'destructive',
        title: '操作失败',
        description: '创建失败，请稍后重试',
      });
    } finally {
      setSubmittingCustomer(false);
    }
  };

  // 处理文件选择
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      if (fileExt !== 'csv' && fileExt !== 'xlsx' && fileExt !== 'xls') {
        toast({
          variant: 'destructive',
          title: '文件格式错误',
          description: '仅支持 CSV、Excel (.xlsx, .xls) 格式的文件',
        });
        return;
      }
      setImportFile(file);
      setImportResult(null);
    }
  };

  // 下载模板
  const downloadTemplate = () => {
    const template = [
      ['客户名称', '客户类型', '所属地区', '客户状态', '联系人', '联系电话', '联系邮箱', '详细地址', '客户描述'],
      ['示例公司', 'enterprise', '华北', 'potential', '张三', '13800138000', 'zhangsan@example.com', '北京市朝阳区', '示例客户描述'],
      ['', 'education', '华东', 'active', '', '', '', '', ''],
      ['', 'government', '华南', 'inactive', '', '', '', '', ''],
      ['', 'medical', '华中', 'lost', '', '', '', '', ''],
      ['', 'other', '西北', 'potential', '', '', '', '', ''],
    ];

    // 添加 BOM 以支持中文
    const BOM = '\uFEFF';
    const csvContent = BOM + template.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = '客户导入模板.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  };

  // 处理导入提交
  const handleImport = async () => {
    if (!importFile) {
      toast({
        variant: 'destructive',
        title: '验证失败',
        description: '请选择要导入的文件',
      });
      return;
    }

    setImporting(true);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append('file', importFile);

      const response = await fetch('/api/customers/import', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setImportResult({
          success: result.data?.success || 0,
          failed: result.data?.failed || 0,
          errors: result.data?.errors || [],
        });
        // 刷新客户列表
        await fetchCustomers();
      } else {
        // 正确提取错误消息 - result.error 可能是对象 {code, message} 或字符串
        const errorMsg = typeof result.error === 'object' && result.error !== null
          ? (result.error.message || JSON.stringify(result.error))
          : (result.error || result.message || '导入失败，请检查文件格式是否正确');
        setImportResult({
          success: 0,
          failed: 0,
          errors: [errorMsg],
        });
      }
    } catch (error) {
      console.error('Failed to import customers:', error);
      setImportResult({
        success: 0,
        failed: 0,
        errors: ['网络错误或服务器异常，请稍后重试'],
      });
    } finally {
      setImporting(false);
    }
  };

  const openCustomerDetail = (customer: Customer) => {
    setSelectedCustomer(customer);
    setDrawerOpen(true);
  };

  // 打开编辑客户对话框
  const openEditCustomerDialog = (customer: Customer) => {
    setEditingCustomer(customer);
    setEditCustomer({
      customerName: customer.customerName,
      // 使用 customerTypeCode（字典code）而不是 customerType（显示名称）
      // 这样 DictSelect 组件才能正确匹配选项
      customerType: customer.customerTypeCode || customer.customerType || '',
      region: customer.region || '',
      status: customer.status,
      contactName: customer.contactName || '',
      contactPhone: customer.contactPhone || '',
      contactEmail: customer.contactEmail || '',
      address: customer.address || '',
      description: customer.description || '',
    });
    // 重置检查状态，避免编辑时显示重名错误
    setDuplicateError('');
    resetEditNameCheck();
    setEditCustomerDialogOpen(true);
  };

  // 保存编辑的客户
  const handleEditCustomer = async () => {
    if (!editingCustomer) return;
    
    // 验证必填字段
    if (!editCustomer.customerName || !editCustomer.customerType || !editCustomer.region) {
      toast({
        variant: 'destructive',
        title: '验证失败',
        description: '请填写必填字段（客户名称、客户类型、所属地区）',
      });
      return;
    }

    // 验证客户名称长度
    const nameLengthResult = validateLength(editCustomer.customerName.trim(), 2, 100, '客户名称');
    if (!nameLengthResult.valid) {
      toast({
        variant: 'destructive',
        title: '验证失败',
        description: nameLengthResult.message,
      });
      return;
    }

    const editCheck = await runEditNameCheck(editCustomer.customerName);
    if (editCheck.status === 'exists') {
      toast({
        variant: 'destructive',
        title: '验证失败',
        description: '客户名称已存在，请确认是否重复',
      });
      return;
    }

    if (editCheck.status === 'similar' && !editSimilarConfirmed) {
      setDuplicateError('发现相似客户，请确认后再保存修改');
      return;
    }

    // 验证联系电话格式
    if (editCustomer.contactPhone) {
      const phoneResult = validatePhone(editCustomer.contactPhone);
      if (!phoneResult.valid) {
        toast({
          variant: 'destructive',
          title: '验证失败',
          description: phoneResult.message,
        });
        return;
      }
    }

    // 验证邮箱格式
    if (editCustomer.contactEmail) {
      const emailResult = validateEmail(editCustomer.contactEmail);
      if (!emailResult.valid) {
        toast({
          variant: 'destructive',
          title: '验证失败',
          description: emailResult.message,
        });
        return;
      }
    }

    setSubmittingCustomer(true);

    try {
      // 直接传递 customerType（字典编码），让 API 查找对应的 ID
      const submitData = {
        customerName: editCustomer.customerName,
        customerType: editCustomer.customerType, // 传递字典编码
        region: editCustomer.region,
        status: editCustomer.status,
        contactName: editCustomer.contactName,
        contactPhone: editCustomer.contactPhone,
        contactEmail: editCustomer.contactEmail,
        address: editCustomer.address,
        description: editCustomer.description,
      };

      const response = await fetch(`/api/customers/${editingCustomer.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        // 刷新客户列表
        await fetchCustomers();
        // 关闭对话框
        setEditCustomerDialogOpen(false);
        setEditingCustomer(null);
        resetEditNameCheck();
        toast({
          title: '操作成功',
          description: '客户信息更新成功！',
        });
      } else {
        // 正确提取错误消息 - result.error 是对象 {code, message}
        const errorMsg = typeof result.error === 'object' && result.error !== null
          ? (result.error.message || JSON.stringify(result.error))
          : (result.error || '更新失败');
        toast({
          variant: 'destructive',
          title: '更新失败',
          description: errorMsg,
        });
      }
    } catch (error) {
      console.error('Failed to update customer:', error);
      toast({
        variant: 'destructive',
        title: '操作失败',
        description: '更新失败，请稍后重试',
      });
    } finally {
      setSubmittingCustomer(false);
    }
  };

  // 筛选现在在后端处理，这里保留 filteredCustomers 用于判断是否有数据
  const filteredCustomers = customers;

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
    // 根据类型名称生成一致的颜色（使用简单的哈希算法）
    const colors = [
      'text-purple-600 bg-purple-100',
      'text-blue-600 bg-blue-100',
      'text-green-600 bg-green-100',
      'text-red-600 bg-red-100',
      'text-amber-600 bg-amber-100',
      'text-cyan-600 bg-cyan-100',
      'text-pink-600 bg-pink-100',
      'text-indigo-600 bg-indigo-100',
    ];
    
    // 从 customerTypeList 中查找类型名称（优先使用系统设置中的名称）
    const matchedType = customerTypeList.find(t => t.code === type);
    const displayLabel = matchedType?.name || type || '未知';
    
    // 使用类型编码的字符码来生成颜色索引
    const colorIndex = type 
      ? type.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length 
      : 0;
    
    const colorClass = colors[colorIndex];
    const Icon = Building;
    
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${colorClass}`}>
        <Icon className="h-3 w-3" />
        {displayLabel}
      </span>
    );
  };

  const formatCurrency = (amount: string) => {
    return `¥${Number(amount).toLocaleString()}`;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('zh-CN');
  };

  const handleSortChange = (field: CustomerSortField) => {
    setCurrentPage(1);
    if (sortField === field) {
      setSortDirection((current) => (current === 'desc' ? 'asc' : 'desc'));
      return;
    }

    setSortField(field);
    setSortDirection(field === 'updatedAt' ? 'desc' : 'asc');
  };

  const renderSortIcon = (field: CustomerSortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />;
    }

    return sortDirection === 'desc'
      ? <ArrowDown className="h-3.5 w-3.5" />
      : <ArrowUp className="h-3.5 w-3.5" />;
  };

  const renderSortHeader = (label: string, field: CustomerSortField, align: 'left' | 'right' = 'left') => (
    <button
      type="button"
      className={`inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground ${align === 'right' ? 'ml-auto' : ''}`}
      onClick={() => handleSortChange(field)}
    >
      <span>{label}</span>
      {renderSortIcon(field)}
    </button>
  );

  // 分页计算（使用后端返回的总数）
  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalCount);
  // 后端已经分页，直接使用 customers
  const paginatedCustomers = customers;

  const getTypeIcon = (type: string) => {
    // 根据类型名称生成一致的颜色（使用简单的哈希算法）
    const colors = [
      'text-purple-500',
      'text-blue-500',
      'text-green-500',
      'text-red-500',
      'text-amber-500',
      'text-cyan-500',
      'text-pink-500',
      'text-indigo-500',
    ];
    
    // 使用类型名称的字符码来生成颜色索引（与getTypeBadge保持一致）
    const colorIndex = type 
      ? type.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length 
      : 0;
    
    const colorClass = colors[colorIndex];
    const Icon = Building;
    return <Icon className={`h-4 w-4 ${colorClass}`} />;
  };

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      active: 'text-green-600',
      potential: 'text-blue-600',
      inactive: 'text-gray-600',
      lost: 'text-red-600',
    };
    return colorMap[status] || 'text-gray-600';
  };

  return (
    <div className="space-y-6" data-testid="customers-page">
      {/* 页面标题和操作栏 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">客户管理</h1>
          <p className="text-muted-foreground mt-1">管理客户信息，查看客户历史数据和项目情况</p>
        </div>
        <div className="flex gap-2">
          <PermissionButton 
            size="sm" 
            variant="outline" 
            permission={PERMISSIONS.CUSTOMER_EXPORT}
            hideWhenNoPermission
            onClick={() => window.location.href = '/api/export?type=customers&format=excel'}
          >
            <Download className="mr-2 h-4 w-4" />
            导出数据
          </PermissionButton>
          <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
            <DialogTrigger asChild>
              <PermissionButton 
                size="sm" 
                variant="outline"
                permission={PERMISSIONS.CUSTOMER_CREATE}
                hideWhenNoPermission
              >
                <Upload className="mr-2 h-4 w-4" />
                导入客户
              </PermissionButton>
            </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>批量导入客户</DialogTitle>
                  <DialogDescription>
                    上传 CSV 或 Excel 文件批量导入客户数据，请确保数据格式符合要求
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  {/* 下载模板 */}
                  <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div>
                      <h4 className="font-medium">下载导入模板</h4>
                      <p className="text-sm text-muted-foreground">使用标准模板填写客户信息，确保格式正确</p>
                    </div>
                    <Button onClick={downloadTemplate} variant="outline" size="sm">
                      <Download className="mr-2 h-4 w-4" />
                      下载模板
                    </Button>
                  </div>

                  {/* 字段说明 */}
                  <div className="border rounded-lg">
                    <div className="p-4 bg-muted/50 border-b">
                      <h4 className="font-medium">字段格式说明</h4>
                    </div>
                    <div className="p-4">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 px-2 font-medium w-24">字段名称</th>
                            <th className="text-center py-2 px-2 font-medium w-16">必填</th>
                            <th className="text-left py-2 px-2 font-medium">可选值</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b hover:bg-muted/30">
                            <td className="py-2 px-2 font-medium">客户名称</td>
                            <td className="py-2 px-2 text-center text-red-500">是</td>
                            <td className="py-2 px-2 text-muted-foreground">-</td>
                          </tr>
                          <tr className="border-b hover:bg-muted/30">
                            <td className="py-2 px-2 font-medium">客户类型</td>
                            <td className="py-2 px-2 text-center text-red-500">是</td>
                            <td className="py-2 px-2">{customerTypeList.map(t => t.name).join('、') || '从系统设置获取'}</td>
                          </tr>
                          <tr className="border-b hover:bg-muted/30">
                            <td className="py-2 px-2 font-medium">所属地区</td>
                            <td className="py-2 px-2 text-center text-red-500">是</td>
                            <td className="py-2 px-2">各省份及浙江省地市</td>
                          </tr>
                          <tr className="border-b hover:bg-muted/30">
                            <td className="py-2 px-2 font-medium">客户状态</td>
                            <td className="py-2 px-2 text-center">否</td>
                            <td className="py-2 px-2">潜在、活跃、非活跃、已流失（默认：潜在）</td>
                          </tr>
                          <tr className="border-b hover:bg-muted/30">
                            <td className="py-2 px-2 font-medium">联系人</td>
                            <td className="py-2 px-2 text-center">否</td>
                            <td className="py-2 px-2 text-muted-foreground">-</td>
                          </tr>
                          <tr className="border-b hover:bg-muted/30">
                            <td className="py-2 px-2 font-medium">联系电话</td>
                            <td className="py-2 px-2 text-center">否</td>
                            <td className="py-2 px-2 text-muted-foreground">-</td>
                          </tr>
                          <tr className="border-b hover:bg-muted/30">
                            <td className="py-2 px-2 font-medium">联系邮箱</td>
                            <td className="py-2 px-2 text-center">否</td>
                            <td className="py-2 px-2 text-muted-foreground">-</td>
                          </tr>
                          <tr className="border-b hover:bg-muted/30">
                            <td className="py-2 px-2 font-medium">详细地址</td>
                            <td className="py-2 px-2 text-center">否</td>
                            <td className="py-2 px-2 text-muted-foreground">-</td>
                          </tr>
                          <tr className="hover:bg-muted/30">
                            <td className="py-2 px-2 font-medium">客户描述</td>
                            <td className="py-2 px-2 text-center">否</td>
                            <td className="py-2 px-2 text-muted-foreground">-</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* 文件上传 */}
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
                      <FileUp className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-sm font-medium mb-2">
                        {importFile ? importFile.name : '点击或拖拽文件到此处上传'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        支持 CSV、Excel (.xlsx, .xls) 格式，文件大小不超过 10MB
                      </p>
                    </label>
                  </div>

                  {/* 导入结果 */}
                  {importResult && (
                    <div className="border rounded-lg">
                      <div className="p-4 bg-muted/50 border-b">
                        <h4 className="font-medium">导入结果</h4>
                      </div>
                      <div className="p-4 space-y-3">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2 text-green-600">
                            <CheckCircle className="h-5 w-5" />
                            <span className="font-medium">成功：{importResult.success} 条</span>
                          </div>
                          {importResult.failed > 0 && (
                            <div className="flex items-center gap-2 text-red-600">
                              <XCircle className="h-5 w-5" />
                              <span className="font-medium">失败：{importResult.failed} 条</span>
                            </div>
                          )}
                        </div>
                        {importResult.errors.length > 0 && (
                          <div className="max-h-40 overflow-y-auto">
                            <p className="text-sm font-medium mb-2">错误详情：</p>
                            <ul className="text-sm text-red-600 space-y-1">
                              {importResult.errors.map((error, index) => (
                                <li key={index}>{error}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setImportDialogOpen(false);
                      setImportFile(null);
                      setImportResult(null);
                    }}
                    disabled={importing}
                  >
                    关闭
                  </Button>
                  <Button onClick={handleImport} disabled={!importFile || importing}>
                    {importing ? '导入中...' : '开始导入'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Dialog open={addCustomerDialogOpen} onOpenChange={(open) => {
              setAddCustomerDialogOpen(open);
              if (!open) {
                // 弹窗关闭时重置状态
                setDuplicateError('');
                resetCreateNameCheck();
                setNewCustomer({
                  customerName: '',
                  customerType: '',
                  region: '',
                  status: 'potential',
                  contactName: '',
                  contactPhone: '',
                  contactEmail: '',
                  address: '',
                  description: ''
                });
              }
            }}>
              <DialogTrigger asChild>
                <PermissionButton 
                  size="sm"
                  permission={PERMISSIONS.CUSTOMER_CREATE}
                  hideWhenNoPermission
                  data-testid="customer-create-button"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  新建客户
                </PermissionButton>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="customer-create-dialog">
              <DialogHeader>
                <DialogTitle>新建客户</DialogTitle>
                <DialogDescription>填写客户基本信息，带 * 的为必填项</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2" data-testid="customer-create-name-field">
                  <Label htmlFor="customerName">
                    客户名称 <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="customerName"
                      placeholder="请输入客户名称"
                      value={newCustomer.customerName}
                      onChange={(e) => {
                        const value = e.target.value;
                        setNewCustomer({ ...newCustomer, customerName: value });
                        setDuplicateError('');
                        setCreateSimilarConfirmed(false);
                        
                        // 实时检查客户名称
                        if (value.trim().length >= 2) {
                          setCreateNameCheckStatus('checking');
                          // 清除之前的定时器
                          if (createNameCheckTimeoutRef.current) {
                            clearTimeout(createNameCheckTimeoutRef.current);
                          }
                          // 设置新的防抖检查
                          createNameCheckTimeoutRef.current = setTimeout(() => {
                            runCreateNameCheck(value).catch(() => {
                              resetCreateNameCheck();
                            });
                          }, 500);
                        } else {
                          resetCreateNameCheck();
                        }
                      }}
                      className={createNameCheckStatus === 'exists' ? 'border-red-500 focus-visible:ring-red-500' : 
                                 createNameCheckStatus === 'similar' ? 'border-amber-500 focus-visible:ring-amber-500' :
                                 createNameCheckStatus === 'available' ? 'border-green-500 focus-visible:ring-green-500' : ''}
                    />
                    {createNameCheckStatus === 'checking' && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                      </div>
                    )}
                    {createNameCheckStatus === 'exists' && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500">
                        <AlertCircle className="h-4 w-4" />
                      </div>
                    )}
                    {createNameCheckStatus === 'similar' && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-500">
                        <AlertCircle className="h-4 w-4" />
                      </div>
                    )}
                    {createNameCheckStatus === 'available' && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>
                  {createNameCheckStatus === 'exists' && (
                    <p className="text-xs text-red-500">客户名称已存在，请确认是否重复</p>
                  )}
                  {createNameCheckStatus === 'similar' && (
                    <p className="text-xs text-amber-600">发现相似客户，确认后仍可继续创建</p>
                  )}
                  {createNameCheckStatus === 'available' && (
                    <p className="text-xs text-green-500">客户名称可用</p>
                  )}
                  {createNameCheckStatus === 'idle' && (
                    <p className="text-xs text-muted-foreground">客户编号将由系统自动生成</p>
                  )}
                  {renderSimilarCustomerReminder(
                    createSimilarCustomers,
                    createSimilarConfirmed,
                    () => {
                      setCreateSimilarConfirmed(true);
                      setDuplicateError('');
                    },
                    () => {
                      setCreateSimilarConfirmed(false);
                    },
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2" data-testid="customer-create-type-field">
                    <Label>
                      客户类型 <span className="text-red-500">*</span>
                    </Label>
                    <DictSelect
                      category="industry"
                      value={newCustomer.customerType}
                      onValueChange={(value) => setNewCustomer({ ...newCustomer, customerType: value })}
                      placeholder="请选择客户类型"
                    />
                  </div>
                  <div className="space-y-2" data-testid="customer-create-region-field">
                    <Label htmlFor="region">
                      所属地区 <span className="text-red-500">*</span>
                    </Label>
                    <SearchableSelect
                      options={regionOptions}
                      value={newCustomer.region}
                      onValueChange={(value) => setNewCustomer({ ...newCustomer, region: value })}
                      placeholder="请选择地区"
                      emptyText="未找到匹配的地区"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2" data-testid="customer-create-status-field">
                    <Label>客户状态</Label>
                    <DictSelect
                      category="customer_status"
                      value={newCustomer.status}
                      onValueChange={(value) => setNewCustomer({ ...newCustomer, status: value })}
                      placeholder="请选择状态"
                    />
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-medium mb-4">联系方式</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2" data-testid="customer-create-contact-name-field">
                      <Label htmlFor="contactName">联系人</Label>
                      <Input
                        id="contactName"
                        placeholder="请输入联系人姓名"
                        value={newCustomer.contactName}
                        onChange={(e) => setNewCustomer({ ...newCustomer, contactName: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2" data-testid="customer-create-contact-phone-field">
                      <Label htmlFor="contactPhone">联系电话</Label>
                      <Input
                        id="contactPhone"
                        placeholder="请输入联系电话"
                        value={newCustomer.contactPhone}
                        onChange={(e) => setNewCustomer({ ...newCustomer, contactPhone: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="mt-4" data-testid="customer-create-contact-email-field">
                    <Label htmlFor="contactEmail">联系邮箱</Label>
                    <Input
                      id="contactEmail"
                      type="email"
                      placeholder="请输入联系邮箱"
                      value={newCustomer.contactEmail}
                      onChange={(e) => setNewCustomer({ ...newCustomer, contactEmail: e.target.value })}
                    />
                  </div>
                  <div className="mt-4" data-testid="customer-create-address-field">
                    <Label htmlFor="address">详细地址</Label>
                    <Input
                      id="address"
                      placeholder="请输入详细地址"
                      value={newCustomer.address}
                      onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2" data-testid="customer-create-description-field">
                  <Label htmlFor="description">客户描述</Label>
                  <Textarea
                    id="description"
                    placeholder="请输入客户描述信息..."
                    rows={3}
                    value={newCustomer.description}
                    onChange={(e) => setNewCustomer({ ...newCustomer, description: e.target.value })}
                  />
                </div>

                {duplicateError && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-md text-sm">
                    <AlertCircle className="h-4 w-4" />
                    {duplicateError}
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setAddCustomerDialogOpen(false);
                    setNewCustomer({
                      customerName: '',
                      customerType: '',
                      region: '',
                      status: 'potential',
                      contactName: '',
                      contactPhone: '',
                      contactEmail: '',
                      address: '',
                      description: ''
                    });
                    setDuplicateError('');
                    resetCreateNameCheck();
                  }}
                >
                  取消
                </Button>
                <Button onClick={handleAddCustomer} disabled={submittingCustomer} data-testid="customer-create-submit-button">
                  {submittingCustomer ? '创建中...' : '创建客户'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* 编辑客户对话框 */}
          <Dialog open={editCustomerDialogOpen} onOpenChange={(open) => {
            setEditCustomerDialogOpen(open);
            if (!open) {
              // 弹窗关闭时重置状态
              setEditingCustomer(null);
              setDuplicateError('');
              resetEditNameCheck();
            }
          }}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="customer-edit-dialog">
              <DialogHeader>
                <DialogTitle>编辑客户</DialogTitle>
                <DialogDescription>修改客户基本信息，带 * 的为必填项</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2" data-testid="customer-edit-name-field">
                  <Label htmlFor="edit-customerName">
                    客户名称 <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="edit-customerName"
                    placeholder="请输入客户名称"
                    value={editCustomer.customerName}
                    onChange={(e) => {
                      const value = e.target.value;
                      setEditCustomer({ ...editCustomer, customerName: value });
                      setDuplicateError('');
                      setEditSimilarConfirmed(false);

                      if (editNameCheckTimeoutRef.current) {
                        clearTimeout(editNameCheckTimeoutRef.current);
                      }

                      if (value.trim().length < 2) {
                        resetEditNameCheck();
                        return;
                      }

                      editNameCheckTimeoutRef.current = setTimeout(() => {
                        runEditNameCheck(value).catch(() => {
                          resetEditNameCheck();
                        });
                      }, 500);
                    }}
                    className={editNameCheckStatus === 'exists' ? 'border-red-500 focus-visible:ring-red-500' : editNameCheckStatus === 'similar' ? 'border-amber-500 focus-visible:ring-amber-500' : editNameCheckStatus === 'available' ? 'border-green-500 focus-visible:ring-green-500' : ''}
                  />
                  {editNameCheckStatus === 'exists' && (
                    <p className="text-xs text-red-500">客户名称已存在，请确认是否重复</p>
                  )}
                  {editNameCheckStatus === 'similar' && (
                    <p className="text-xs text-amber-600">发现相似客户，确认后仍可继续保存</p>
                  )}
                  {editNameCheckStatus === 'available' && (
                    <p className="text-xs text-green-500">当前名称未发现重复或相似客户</p>
                  )}
                  {renderSimilarCustomerReminder(
                    editSimilarCustomers,
                    editSimilarConfirmed,
                    () => {
                      setEditSimilarConfirmed(true);
                      setDuplicateError('');
                    },
                    () => {
                      setEditSimilarConfirmed(false);
                    },
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2" data-testid="customer-edit-type-field">
                    <Label htmlFor="edit-customerType">
                      客户类型 <span className="text-red-500">*</span>
                    </Label>
                    <DictSelect
                      category="industry"
                      value={editCustomer.customerType}
                      onValueChange={(value) => setEditCustomer({ ...editCustomer, customerType: value })}
                      placeholder="请选择客户类型"
                    />
                  </div>
                  <div className="space-y-2" data-testid="customer-edit-region-field">
                    <Label htmlFor="edit-region">
                      所属地区 <span className="text-red-500">*</span>
                    </Label>
                    <SearchableSelect
                      options={regionOptions}
                      value={editCustomer.region}
                      onValueChange={(value) => setEditCustomer({ ...editCustomer, region: value })}
                      placeholder="请选择地区"
                      emptyText="未找到匹配的地区"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2" data-testid="customer-edit-status-field">
                    <Label htmlFor="edit-status">客户状态</Label>
                    <DictSelect
                      category="customer_status"
                      value={editCustomer.status}
                      onValueChange={(value) => setEditCustomer({ ...editCustomer, status: value })}
                      placeholder="请选择客户状态"
                    />
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-4">联系信息</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2" data-testid="customer-edit-contact-name-field">
                      <Label htmlFor="edit-contactName">联系人</Label>
                      <Input
                        id="edit-contactName"
                        placeholder="请输入联系人姓名"
                        value={editCustomer.contactName}
                        onChange={(e) => setEditCustomer({ ...editCustomer, contactName: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2" data-testid="customer-edit-contact-phone-field">
                      <Label htmlFor="edit-contactPhone">联系电话</Label>
                      <Input
                        id="edit-contactPhone"
                        placeholder="请输入联系电话"
                        value={editCustomer.contactPhone}
                        onChange={(e) => setEditCustomer({ ...editCustomer, contactPhone: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="mt-4" data-testid="customer-edit-contact-email-field">
                    <Label htmlFor="edit-contactEmail">联系邮箱</Label>
                    <Input
                      id="edit-contactEmail"
                      type="email"
                      placeholder="请输入联系邮箱"
                      value={editCustomer.contactEmail}
                      onChange={(e) => setEditCustomer({ ...editCustomer, contactEmail: e.target.value })}
                    />
                  </div>
                  <div className="mt-4" data-testid="customer-edit-address-field">
                    <Label htmlFor="edit-address">详细地址</Label>
                    <Input
                      id="edit-address"
                      placeholder="请输入详细地址"
                      value={editCustomer.address}
                      onChange={(e) => setEditCustomer({ ...editCustomer, address: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2" data-testid="customer-edit-description-field">
                  <Label htmlFor="edit-description">客户描述</Label>
                  <Textarea
                    id="edit-description"
                    placeholder="请输入客户描述信息..."
                    rows={3}
                    value={editCustomer.description}
                    onChange={(e) => setEditCustomer({ ...editCustomer, description: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditCustomerDialogOpen(false);
                    setEditingCustomer(null);
                  }}
                >
                  取消
                </Button>
                <Button onClick={handleEditCustomer} disabled={submittingCustomer} data-testid="customer-edit-submit-button">
                  {submittingCustomer ? '保存中...' : '保存修改'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 搜索和筛选 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索客户名称、编号或联系人..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-10"
                />
              </div>
            </div>
            <DictSelect
              category="customer_status"
              value={statusFilter === 'all' ? '' : statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value || 'all');
                setCurrentPage(1);
              }}
              placeholder="客户状态"
              className="w-[120px] h-9"
              allowClear
            />
            <DictSelect
              category="industry"
              value={typeFilter === 'all' ? '' : typeFilter}
              onValueChange={(value) => {
                setTypeFilter(value || 'all');
                setCurrentPage(1);
              }}
              placeholder="客户类型"
              className="w-[120px] h-9"
              allowClear
            />
            <Button 
              variant="outline" 
              size="sm" 
              className="h-9"
              onClick={() => {
                setSearch('');
                setStatusFilter('all');
                setTypeFilter('all');
                setCurrentPage(1);
              }}
            >
              重置
            </Button>
            <div className="flex items-center gap-2 border-l pl-4">
              <span className="text-sm text-muted-foreground">视图:</span>
              <div className="flex gap-1">
                <Button
                  variant={viewMode === 'table' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-9 w-9 p-0"
                  onClick={() => setViewMode('table')}
                >
                  <TableIcon className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'card' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-9 w-9 p-0"
                  onClick={() => setViewMode('card')}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 客户列表 */}
      <Card>
        <CardHeader>
          <CardTitle>客户列表 (共 {totalCount} 条)</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">加载中...</div>
          ) : filteredCustomers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              暂无客户数据
            </div>
          ) : (
            <>
              {viewMode === 'table' ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>客户名称</TableHead>
                      <TableHead>客户编号</TableHead>
                      <TableHead>客户类型</TableHead>
                      <TableHead>区域</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead className="text-right">{renderSortHeader('历史中标总额', 'totalAmount', 'right')}</TableHead>
                      <TableHead className="text-right">当前跟进项目数</TableHead>
                      <TableHead>{renderSortHeader('最近互动时间', 'lastInteractionTime')}</TableHead>
                      <TableHead className="text-right">{renderSortHeader('历史最大中标金额', 'maxProjectAmount', 'right')}</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedCustomers.map((customer) => (
                      <TableRow 
                        key={customer.id}
                        onClick={() => openCustomerDetail(customer)}
                        className="cursor-pointer hover:bg-muted/50"
                        data-testid={`customer-row-${customer.id}`}
                      >
                        <TableCell className="font-medium">{customer.customerName}</TableCell>
                        <TableCell className="text-muted-foreground">{customer.customerId}</TableCell>
                        <TableCell>{getTypeBadge(customer.customerType)}</TableCell>
                        <TableCell>{customer.region || '-'}</TableCell>
                        <TableCell>{getStatusBadge(customer.status)}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(customer.totalAmount)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Briefcase className="h-3 w-3" />
                            <span>{customer.currentProjectCount}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {formatDate(customer.lastInteractionTime)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(customer.maxProjectAmount)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              data-testid={`customer-detail-button-${customer.id}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                openCustomerDetail(customer);
                              }}
                              title="查看详情"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <PermissionButton
                              variant="ghost"
                              size="sm"
                              permission={PERMISSIONS.CUSTOMER_UPDATE}
                              hideWhenNoPermission
                              data-testid={`customer-edit-button-${customer.id}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditCustomerDialog(customer);
                              }}
                              title="编辑"
                            >
                              <Edit className="h-4 w-4" />
                            </PermissionButton>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {paginatedCustomers.map((customer) => (
                    <Card 
                      key={customer.id}
                      onClick={() => openCustomerDetail(customer)}
                      className="hover:shadow-md transition-shadow cursor-pointer"
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            {getTypeIcon(customer.customerType)}
                            <div>
                              <CardTitle className="text-lg">{customer.customerName}</CardTitle>
                              <p className="text-sm text-muted-foreground">{customer.customerId}</p>
                            </div>
                          </div>
                          {getStatusBadge(customer.status)}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Building className="h-3 w-3" />
                          <span>{customer.region || '未设置'}</span>
                          <span>•</span>
                          {getTypeBadge(customer.customerType)}
                        </div>

                        {customer.contactName && (
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            <span className="text-muted-foreground">{customer.contactName}</span>
                            <span className="text-muted-foreground">•</span>
                            <span>{customer.contactPhone}</span>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                          <div className="space-y-1">
                            <div className="text-xs text-muted-foreground">历史中标总额</div>
                            <div className="font-semibold text-green-600">
                              {formatCurrency(customer.totalAmount)}
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="text-xs text-muted-foreground">最大中标金额</div>
                            <div className="font-semibold">
                              {formatCurrency(customer.maxProjectAmount)}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                          <div className="space-y-1">
                            <div className="text-xs text-muted-foreground">跟进项目</div>
                            <div className="font-semibold flex items-center gap-1">
                              <Briefcase className="h-3 w-3" />
                              <span>{customer.currentProjectCount}</span>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="text-xs text-muted-foreground">最近互动</div>
                            <div className="text-sm font-medium">
                              {formatDate(customer.lastInteractionTime)}
                            </div>
                          </div>
                        </div>

                        {customer.description && (
                          <div className="pt-2 border-t">
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {customer.description}
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* 分页 */}
              {totalPages > 1 && (
                <nav aria-label="pagination" data-testid="pagination" className="flex items-center justify-between mt-6 pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    显示 {startIndex + 1} - {endIndex} 条，共 {totalCount} 条
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-3"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
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
                        } else if (
                          page === currentPage - 2 ||
                          page === currentPage + 2
                        ) {
                          return <span key={page} className="text-muted-foreground">...</span>;
                        }
                        return null;
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-3"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
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

      {/* 客户详情抽屉 */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen} direction="right">
        <DrawerContent className="max-h-[85vh] w-[500px]">
          {selectedCustomer && (
            <>
              <DrawerHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getTypeIcon(selectedCustomer.customerType)}
                    <div>
                      <DrawerTitle className="text-2xl">{selectedCustomer.customerName}</DrawerTitle>
                      <p className="text-sm text-muted-foreground mt-1">{selectedCustomer.customerId}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(selectedCustomer.status)}
                    {getTypeBadge(selectedCustomer.customerType)}
                  </div>
                </div>
              </DrawerHeader>

              <div className="px-4 pb-4 overflow-y-auto">
                <div className="space-y-6">
                  {/* 基本信息 */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        基本信息
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <div className="text-sm text-muted-foreground">客户类型</div>
                        <div className="font-medium">{getTypeBadge(selectedCustomer.customerType)}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-sm text-muted-foreground">所属区域</div>
                        <div className="font-medium flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {selectedCustomer.region || '-'}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-sm text-muted-foreground">联系人</div>
                        <div className="font-medium">{selectedCustomer.contactName || '-'}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-sm text-muted-foreground">联系电话</div>
                        <div className="font-medium flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {selectedCustomer.contactPhone || '-'}
                        </div>
                      </div>
                      <div className="space-y-1 col-span-2">
                        <div className="text-sm text-muted-foreground">联系邮箱</div>
                        <div className="font-medium flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {selectedCustomer.contactEmail || '-'}
                        </div>
                      </div>
                      <div className="space-y-1 col-span-2">
                        <div className="text-sm text-muted-foreground">客户地址</div>
                        <div className="font-medium">{selectedCustomer.address || '-'}</div>
                      </div>
                      {selectedCustomer.description && (
                        <div className="space-y-1 col-span-2">
                          <div className="text-sm text-muted-foreground">客户描述</div>
                          <div className="font-medium">{selectedCustomer.description}</div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* 交易数据 */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        交易数据
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <div className="text-sm text-muted-foreground">历史中标总额</div>
                        <div className="font-semibold text-lg text-green-600">
                          {formatCurrency(selectedCustomer.totalAmount)}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-sm text-muted-foreground">历史最大中标金额</div>
                        <div className="font-semibold text-lg">
                          {formatCurrency(selectedCustomer.maxProjectAmount)}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-sm text-muted-foreground">当前跟进项目数</div>
                        <div className="font-semibold text-lg flex items-center gap-1">
                          <Briefcase className="h-4 w-4" />
                          {selectedCustomer.currentProjectCount}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-sm text-muted-foreground">最近互动时间</div>
                        <div className="font-semibold text-lg flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {formatDate(selectedCustomer.lastInteractionTime)}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* 历史项目 */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <History className="h-4 w-4" />
                        历史项目
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center py-4 text-muted-foreground text-sm">
                        点击"查看详情"按钮查看完整项目列表
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <DrawerFooter className="border-t gap-2">
                <DrawerClose asChild>
                  <Button variant="outline" size="sm" className="flex-1">
                    <X className="h-4 w-4 mr-2" />
                    关闭
                  </Button>
                </DrawerClose>
                <Button 
                  size="sm" 
                  className="flex-1"
                  onClick={() => {
                    setDrawerOpen(false);
                    router.push(`/customers/${selectedCustomer.id}`);
                  }}
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  查看详情
                </Button>
              </DrawerFooter>
            </>
          )}
        </DrawerContent>
      </Drawer>
    </div>
  );
}
