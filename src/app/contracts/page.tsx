'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
} from '@/components/ui/dialog';
import { DictSelect } from '@/components/dictionary/dict-select';
import {
  Plus,
  Search,
  Eye,
  Edit,
  Trash2,
  FileText,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react';

interface Contract {
  id: number;
  contractCode: string;
  contractName: string;
  contractStatus: string;
  processStatus: string;
  signMode: string;
  signerUnit: string;
  userUnit: string;
  contractAmount: string;
  warrantyAmount: string | null;
  signDate: string | null;
  signerName: string | null;
  department: string | null;
  projectId: number | null;
  projectCode: string | null;
  projectName: string | null;
  customerId: number | null;
  customerName: string | null;
  isNewCustomer: boolean;
  createdAt: string;
}

const ITEMS_PER_PAGE = 20;
const SEARCH_DEBOUNCE_MS = 300;

// 合同状态配置
const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { label: '草稿', variant: 'outline' },
  pending: { label: '待审批', variant: 'secondary' },
  signed: { label: '已签订', variant: 'default' },
  executing: { label: '执行中', variant: 'default' },
  completed: { label: '已完成', variant: 'default' },
  archived: { label: '已归档', variant: 'secondary' },
};

// 流程状态配置
const processStatusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: '进行中', color: 'text-blue-600' },
  completed: { label: '已完结', color: 'text-green-600' },
};

export default function ContractsPage() {
  const router = useRouter();
  const { loading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  // 筛选条件
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // 删除确认
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contractToDelete, setContractToDelete] = useState<Contract | null>(null);
  const [deleting, setDeleting] = useState(false);

  // 缓存上一次的请求参数，避免重复请求
  const lastRequestRef = useRef<string>('');
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  // 使用useCallback优化fetchContracts
  const fetchContracts = useCallback(async (forceRefresh = false) => {
    const params = new URLSearchParams({
      page: String(currentPage),
      pageSize: String(ITEMS_PER_PAGE),
    });
    
    const searchValue = search.trim();
    if (searchValue) params.append('search', searchValue);
    if (statusFilter !== 'all') params.append('status', statusFilter);

    const requestKey = params.toString();
    
    // 如果请求参数相同且不是强制刷新，则跳过
    if (!forceRefresh && lastRequestRef.current === requestKey) {
      return;
    }
    lastRequestRef.current = requestKey;

    try {
      setLoading(true);
      const response = await fetch(`/api/contracts?${params}`);
      const result = await response.json();

      if (result.success) {
        setContracts(result.data.list || []);
        setTotal(result.data.total || 0);
      } else {
        // 处理API错误（如未登录、权限不足等）
        setContracts([]);
        setTotal(0);
        if (result.code === 'UNAUTHORIZED') {
          // 未登录时由认证中间件处理重定向，这里不做额外提示
        } else {
          toast({
            variant: 'destructive',
            title: '获取合同列表失败',
            description: typeof result.error === 'string' ? result.error : '请稍后重试',
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch contracts:', error);
      setContracts([]);
      setTotal(0);
      toast({
        variant: 'destructive',
        title: '获取合同列表失败',
        description: '网络错误，请检查网络连接',
      });
    } finally {
      setLoading(false);
    }
  }, [currentPage, statusFilter, search, toast]);

  // 防抖搜索
  const debouncedFetch = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      fetchContracts(true);
    }, SEARCH_DEBOUNCE_MS);
  }, [fetchContracts]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchContracts();
    }
  }, [isAuthenticated, currentPage, statusFilter]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const handleSearch = useCallback(() => {
    setCurrentPage(1);
    lastRequestRef.current = ''; // 重置缓存，强制刷新
    fetchContracts(true);
  }, [fetchContracts]);

  // 使用useMemo缓存格式化函数
  const formatAmount = useMemo(() => (amount: string | null) => {
    if (!amount) return '-';
    const num = parseFloat(amount);
    if (isNaN(num)) return '-';
    if (num >= 10000) {
      return `¥${(num / 10000).toFixed(2)}万`;
    }
    return `¥${num.toLocaleString()}`;
  }, []);

  const formatDate = useMemo(() => (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('zh-CN');
  }, []);

  const getStatusBadge = useMemo(() => (status: string) => {
    const config = statusConfig[status] || { label: status, variant: 'outline' as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  }, []);

  const getProcessStatusBadge = useMemo(() => (status: string) => {
    const config = processStatusConfig[status] || { label: status, color: 'text-gray-600' };
    return <span className={config.color}>{config.label}</span>;
  }, []);

  const handleDelete = async () => {
    if (!contractToDelete) return;
    
    setDeleting(true);
    try {
      const response = await fetch(`/api/contracts/${contractToDelete.id}`, {
        method: 'DELETE',
      });
      const result = await response.json();

      if (result.success) {
        toast({ title: '合同已删除' });
        setDeleteDialogOpen(false);
        setContractToDelete(null);
        fetchContracts();
      } else {
        // 正确提取错误消息 - result.error 可能是对象 {code, message} 或字符串
        const errorMsg = typeof result.error === 'object' && result.error !== null
          ? (result.error.message || JSON.stringify(result.error))
          : (result.error || '删除失败');
        throw new Error(errorMsg);
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '删除失败',
        description: error instanceof Error ? error.message : '请稍后重试',
      });
    } finally {
      setDeleting(false);
    }
  };

  if (authLoading || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="contracts-page">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">合同管理</h1>
          <p className="text-muted-foreground">管理合同台账、中标信息、验收报告</p>
        </div>
        <Button onClick={() => router.push('/contracts/new')} data-testid="new-contract-btn">
          <Plus className="mr-2 h-4 w-4" />
          新建合同
        </Button>
      </div>

      {/* 筛选区域 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索合同编号、名称、签约单位..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-10"
                  data-testid="search-input"
                />
              </div>
            </div>
            <DictSelect
              category="contract_status"
              value={statusFilter === 'all' ? '' : statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value || 'all');
                setCurrentPage(1);
              }}
              placeholder="合同状态"
              className="w-[150px]"
              allowClear
            />
            <Button variant="outline" onClick={handleSearch}>
              搜索
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setSearch('');
                setStatusFilter('all');
                setCurrentPage(1);
              }}
            >
              重置
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 合同列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            合同台账 ({total})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            </div>
          ) : contracts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              暂无合同数据
            </div>
          ) : (
            <>
              <Table data-testid="contracts-table">
                <TableHeader>
                  <TableRow>
                    <TableHead>合同编号</TableHead>
                    <TableHead>合同名称</TableHead>
                    <TableHead>签约单位</TableHead>
                    <TableHead>用户单位</TableHead>
                    <TableHead className="text-right">合同金额</TableHead>
                    <TableHead>签订日期</TableHead>
                    <TableHead>合同状态</TableHead>
                    <TableHead>流程状态</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contracts.map((contract) => (
                    <TableRow
                      key={contract.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onDoubleClick={() => router.push(`/contracts/${contract.id}`)}
                    >
                      <TableCell className="font-medium max-w-[120px]">
                        <span className="truncate block" title={contract.contractCode}>{contract.contractCode}</span>
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <span className="truncate block" title={contract.contractName}>{contract.contractName}</span>
                      </TableCell>
                      <TableCell className="max-w-[150px]">
                        <span className="truncate block" title={contract.signerUnit || ''}>{contract.signerUnit || '-'}</span>
                      </TableCell>
                      <TableCell className="max-w-[150px]">
                        <span className="truncate block" title={contract.userUnit || ''}>{contract.userUnit || '-'}</span>
                      </TableCell>
                      <TableCell className="text-right">{formatAmount(contract.contractAmount)}</TableCell>
                      <TableCell>{formatDate(contract.signDate)}</TableCell>
                      <TableCell>{getStatusBadge(contract.contractStatus)}</TableCell>
                      <TableCell>{getProcessStatusBadge(contract.processStatus)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/contracts/${contract.id}`);
                            }}
                            title="查看详情"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/contracts/${contract.id}/edit`);
                            }}
                            title="编辑"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setContractToDelete(contract);
                              setDeleteDialogOpen(true);
                            }}
                            title="删除"
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* 分页 */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    显示 {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, total)} 条，共 {total} 条
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      上一页
                    </Button>
                    <span className="text-sm">
                      第 {currentPage} / {totalPages} 页
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      下一页
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* 删除确认对话框 */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除合同 "{contractToDelete?.contractName}" 吗？此操作不可恢复。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? '删除中...' : '确认删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
