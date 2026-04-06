'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DictSelect } from '@/components/dictionary/dict-select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ArrowLeft,
  Edit,
  Trash2,
  Loader2,
  FileText,
  Calendar,
  Building2,
  DollarSign,
  User,
  MapPin,
} from 'lucide-react';

interface ContractDetail {
  id: number;
  contractCode: string;
  contractName: string;
  contractScanName: string | null;
  contractStatus: string;
  processStatus: string;
  signMode: string;
  signerUnit: string | null;
  userUnit: string | null;
  userUnitId: number | null;
  projectId: number | null;
  projectCode: string | null;
  projectName: string | null;
  customerId: number | null;
  customerName: string | null;
  department: string | null;
  contractAmount: string;
  warrantyAmount: string | null;
  signDate: string | null;
  warrantyYears: number | null;
  requireCompleteDate: string | null;
  acceptanceDate: string | null;
  entryDate: string | null;
  signerId: number | null;
  signerName: string | null;
  userType: string | null;
  projectCategory: string | null;
  fundSource: string | null;
  bank: string | null;
  isNewCustomer: boolean;
  projectAddress: string | null;
  remark: string | null;
  attachments: any[] | null;
  bidNoticeFile: any | null;
  acceptanceFile: any | null;
  createdAt: string;
  bids: BidInfo[];
  acceptances: AcceptanceInfo[];
  items: ContractItem[];
}

interface BidInfo {
  id: number;
  bidCode: string | null;
  projectName: string | null;
  bidAmount: string | null;
  bidDate: string | null;
  department: string | null;
}

interface AcceptanceInfo {
  id: number;
  acceptanceCode: string | null;
  department: string | null;
  acceptanceDate: string | null;
  archiveDate: string | null;
}

interface ContractItem {
  id: number;
  productName: string;
  productModel: string | null;
  unit: string | null;
  quantity: string;
  unitPrice: string | null;
  amount: string;
  totalAmount: string | null;
}

// 状态配置
const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { label: '草稿', variant: 'outline' },
  pending: { label: '待审批', variant: 'secondary' },
  signed: { label: '已签订', variant: 'default' },
  executing: { label: '执行中', variant: 'default' },
  completed: { label: '已完成', variant: 'default' },
  archived: { label: '已归档', variant: 'secondary' },
};

export default function ContractDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();

  const [contract, setContract] = useState<ContractDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAuthenticated) {
      fetchContract();
    }
  }, [isAuthenticated]);

  const fetchContract = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/contracts/${resolvedParams.id}`);
      const result = await response.json();

      if (result.success) {
        setContract(result.data);
      } else {
        toast({ variant: 'destructive', title: '合同不存在' });
        router.push('/contracts');
      }
    } catch (error) {
      console.error('Failed to fetch contract:', error);
      toast({ variant: 'destructive', title: '获取合同详情失败' });
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount: string | null) => {
    if (!amount) return '-';
    const num = parseFloat(amount);
    if (isNaN(num)) return '-';
    return `¥${num.toLocaleString()}`;
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('zh-CN');
  };

  const getStatusBadge = (status: string) => {
    const config = statusConfig[status] || { label: status, variant: 'outline' as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="text-center py-8">
        <p>合同不存在</p>
        <Button onClick={() => router.push('/contracts')}>返回列表</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push('/contracts')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{contract.contractCode}</h1>
            <p className="text-muted-foreground">{contract.contractName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge(contract.contractStatus)}
          <Button onClick={() => router.push(`/contracts/${contract.id}/edit`)}>
            <Edit className="h-4 w-4 mr-2" />
            编辑
          </Button>
        </div>
      </div>

      {/* 详情内容 */}
      <Tabs defaultValue="basic" className="space-y-4">
        <TabsList>
          <TabsTrigger value="basic">基本信息</TabsTrigger>
          <TabsTrigger value="bid">中标信息</TabsTrigger>
          <TabsTrigger value="acceptance">验收报告</TabsTrigger>
          <TabsTrigger value="items">合同清单</TabsTrigger>
        </TabsList>

        {/* 基本信息 */}
        <TabsContent value="basic">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                合同基本信息
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <p className="text-sm text-muted-foreground">合同编号</p>
                  <p className="font-medium">{contract.contractCode}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">合同名称</p>
                  <p className="font-medium">{contract.contractName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">合同状态</p>
                  {getStatusBadge(contract.contractStatus)}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">流程状态</p>
                  <p className="font-medium">{contract.processStatus === 'completed' ? '已完结' : '进行中'}</p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Building2 className="h-3 w-3" /> 签约单位
                  </p>
                  <p className="font-medium">{contract.signerUnit || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Building2 className="h-3 w-3" /> 用户单位
                  </p>
                  <p className="font-medium">{contract.userUnit || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">签约模式</p>
                  <p className="font-medium">模式{contract.signMode}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">是否新客户</p>
                  <p className="font-medium">{contract.isNewCustomer ? '是' : '否'}</p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <DollarSign className="h-3 w-3" /> 合同金额
                  </p>
                  <p className="font-medium text-green-600">{formatAmount(contract.contractAmount)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">质保金</p>
                  <p className="font-medium">{formatAmount(contract.warrantyAmount)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> 签订日期
                  </p>
                  <p className="font-medium">{formatDate(contract.signDate)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <User className="h-3 w-3" /> 签订人
                  </p>
                  <p className="font-medium">{contract.signerName || '-'}</p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">保修年限</p>
                  <p className="font-medium">{contract.warrantyYears ? `${contract.warrantyYears}年` : '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">要求完成时间</p>
                  <p className="font-medium">{formatDate(contract.requireCompleteDate)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">验收时间</p>
                  <p className="font-medium">{formatDate(contract.acceptanceDate)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">录入日期</p>
                  <p className="font-medium">{formatDate(contract.entryDate)}</p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">所属部门</p>
                  <p className="font-medium">{contract.department || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">关联项目</p>
                  <p 
                    className="font-medium text-blue-600 cursor-pointer hover:underline"
                    onClick={() => contract.projectId && router.push(`/projects/${contract.projectId}`)}
                  >
                    {contract.projectCode} {contract.projectName}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">用户类型</p>
                  <p className="font-medium">{contract.userType || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">项目类别</p>
                  <p className="font-medium">{contract.projectCategory || '-'}</p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">资金来源</p>
                  <p className="font-medium">{contract.fundSource || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">银行</p>
                  <p className="font-medium">{contract.bank || '-'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> 项目地址
                  </p>
                  <p className="font-medium">{contract.projectAddress || '-'}</p>
                </div>
              </div>

              {contract.remark && (
                <div className="mt-6 pt-6 border-t">
                  <p className="text-sm text-muted-foreground">备注</p>
                  <p className="mt-1">{contract.remark}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 中标信息 */}
        <TabsContent value="bid">
          <Card>
            <CardHeader>
              <CardTitle>中标信息</CardTitle>
            </CardHeader>
            <CardContent>
              {contract.bids.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">暂无中标信息</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>中标编号</TableHead>
                      <TableHead>项目名称</TableHead>
                      <TableHead className="text-right">中标金额</TableHead>
                      <TableHead>中标时间</TableHead>
                      <TableHead>部门</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contract.bids.map((bid) => (
                      <TableRow key={bid.id}>
                        <TableCell>{bid.bidCode || '-'}</TableCell>
                        <TableCell>{bid.projectName || '-'}</TableCell>
                        <TableCell className="text-right">{formatAmount(bid.bidAmount)}</TableCell>
                        <TableCell>{formatDate(bid.bidDate)}</TableCell>
                        <TableCell>{bid.department || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 验收报告 */}
        <TabsContent value="acceptance">
          <Card>
            <CardHeader>
              <CardTitle>验收报告</CardTitle>
            </CardHeader>
            <CardContent>
              {contract.acceptances.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">暂无验收报告</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>验收编号</TableHead>
                      <TableHead>部门/分公司</TableHead>
                      <TableHead>验收日期</TableHead>
                      <TableHead>归档日期</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contract.acceptances.map((acc) => (
                      <TableRow key={acc.id}>
                        <TableCell>{acc.acceptanceCode || '-'}</TableCell>
                        <TableCell>{acc.department || '-'}</TableCell>
                        <TableCell>{formatDate(acc.acceptanceDate)}</TableCell>
                        <TableCell>{formatDate(acc.archiveDate)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 合同清单 */}
        <TabsContent value="items">
          <Card>
            <CardHeader>
              <CardTitle>合同清单</CardTitle>
            </CardHeader>
            <CardContent>
              {contract.items.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">暂无清单数据</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>产品名称</TableHead>
                      <TableHead>型号</TableHead>
                      <TableHead>单位</TableHead>
                      <TableHead className="text-right">数量</TableHead>
                      <TableHead className="text-right">单价</TableHead>
                      <TableHead className="text-right">金额</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contract.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.productName}</TableCell>
                        <TableCell>{item.productModel || '-'}</TableCell>
                        <TableCell>{item.unit || '-'}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">{formatAmount(item.unitPrice)}</TableCell>
                        <TableCell className="text-right">{formatAmount(item.amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
