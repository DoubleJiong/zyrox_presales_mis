'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { DictSelect } from '@/components/dictionary/dict-select';
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
import { Plus, Search, Clock, CheckCircle2, XCircle, Eye } from 'lucide-react';

interface Arbitration {
  id: number;
  arbitrationCode: string;
  projectId: number;
  taskId: number | null;
  initiatorId: number;
  arbitrationType: string;
  title: string;
  description: string;
  estimatedCost: string | null;
  actualCost: string | null;
  disputedAmount: string | null;
  status: string;
  approverId: number | null;
  approvalComments: string | null;
  priority: string;
  createdAt: string;
  projectName: string;
  initiatorName: string;
  approverName: string | null;
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof Clock }> = {
  pending: { label: '待审核', variant: 'secondary', icon: Clock },
  reviewing: { label: '审核中', variant: 'default', icon: Clock },
  approved: { label: '已通过', variant: 'outline', icon: CheckCircle2 },
  rejected: { label: '已拒绝', variant: 'destructive', icon: XCircle },
  completed: { label: '已完成', variant: 'outline', icon: CheckCircle2 },
};

const typeConfig: Record<string, { label: string }> = {
  cost: { label: '成本仲裁' },
  workload: { label: '工作量仲裁' },
  dispute: { label: '争议仲裁' },
};

const priorityConfig: Record<string, { label: string; color: string }> = {
  high: { label: '高', color: 'bg-red-500' },
  medium: { label: '中', color: 'bg-yellow-500' },
  low: { label: '低', color: 'bg-green-500' },
};

export default function ArbitrationsPageClient() {
  const [arbitrations, setArbitrations] = useState<Arbitration[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedArbitration, setSelectedArbitration] = useState<Arbitration | null>(null);
  const [newArbitration, setNewArbitration] = useState({
    projectId: '',
    arbitrationType: 'cost',
    title: '',
    description: '',
    estimatedCost: '',
    actualCost: '',
    disputedAmount: '',
    priority: 'medium',
  });

  useEffect(() => {
    fetchArbitrations();
  }, []);

  const fetchArbitrations = async () => {
    try {
      const response = await fetch('/api/arbitrations');
      if (response.ok) {
        const result = await response.json();
        setArbitrations(result.data || result || []);
      }
    } catch (error) {
      console.error('Failed to fetch arbitrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateArbitration = async () => {
    try {
      const response = await fetch('/api/arbitrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newArbitration,
          projectId: parseInt(newArbitration.projectId),
        }),
      });
      if (response.ok) {
        setIsDialogOpen(false);
        setNewArbitration({
          projectId: '',
          arbitrationType: 'cost',
          title: '',
          description: '',
          estimatedCost: '',
          actualCost: '',
          disputedAmount: '',
          priority: 'medium',
        });
        await fetchArbitrations();
      }
    } catch (error) {
      console.error('Failed to create arbitration:', error);
    }
  };

  const formatAmount = (amount: string | null) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
    }).format(Number(amount));
  };

  const formatDate = (date: string) => new Date(date).toLocaleString('zh-CN');

  const filteredArbitrations = arbitrations.filter((arbitration) => {
    const matchesSearch =
      (arbitration.title?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (arbitration.projectName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (arbitration.arbitrationCode?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || arbitration.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">成本仲裁</h1>
          <p className="text-muted-foreground">管理项目成本仲裁申请和审核</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              新建仲裁申请
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>新建仲裁申请</DialogTitle>
              <DialogDescription>创建新的成本/工作量/争议仲裁申请</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>项目ID</Label>
                <Input
                  type="number"
                  value={newArbitration.projectId}
                  onChange={(e) => setNewArbitration({ ...newArbitration, projectId: e.target.value })}
                  placeholder="输入项目ID"
                />
              </div>
              <div>
                <Label>仲裁类型</Label>
                <DictSelect
                  category="arbitration_type"
                  value={newArbitration.arbitrationType}
                  onValueChange={(value) => setNewArbitration({ ...newArbitration, arbitrationType: value })}
                  placeholder="选择仲裁类型"
                />
              </div>
              <div>
                <Label>仲裁标题</Label>
                <Input
                  value={newArbitration.title}
                  onChange={(e) => setNewArbitration({ ...newArbitration, title: e.target.value })}
                  placeholder="输入仲裁标题"
                />
              </div>
              <div>
                <Label>仲裁描述</Label>
                <Textarea
                  value={newArbitration.description}
                  onChange={(e) => setNewArbitration({ ...newArbitration, description: e.target.value })}
                  rows={4}
                  placeholder="详细描述仲裁原因和背景"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>预估成本</Label>
                  <Input
                    type="number"
                    value={newArbitration.estimatedCost}
                    onChange={(e) => setNewArbitration({ ...newArbitration, estimatedCost: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label>实际成本</Label>
                  <Input
                    type="number"
                    value={newArbitration.actualCost}
                    onChange={(e) => setNewArbitration({ ...newArbitration, actualCost: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label>争议金额</Label>
                  <Input
                    type="number"
                    value={newArbitration.disputedAmount}
                    onChange={(e) => setNewArbitration({ ...newArbitration, disputedAmount: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div>
                <Label>优先级</Label>
                <DictSelect
                  category="priority"
                  value={newArbitration.priority}
                  onValueChange={(value) => setNewArbitration({ ...newArbitration, priority: value })}
                  placeholder="选择优先级"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleCreateArbitration}>提交申请</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索仲裁编号、标题或项目名称..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="状态筛选" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="pending">待审核</SelectItem>
                <SelectItem value="reviewing">审核中</SelectItem>
                <SelectItem value="approved">已通过</SelectItem>
                <SelectItem value="rejected">已拒绝</SelectItem>
                <SelectItem value="completed">已完成</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>仲裁列表</CardTitle>
          <CardDescription>共 {filteredArbitrations.length} 条仲裁申请</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">加载中...</div>
          ) : filteredArbitrations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">暂无仲裁申请</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>仲裁编号</TableHead>
                  <TableHead>标题</TableHead>
                  <TableHead>项目</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>发起人</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>优先级</TableHead>
                  <TableHead>争议金额</TableHead>
                  <TableHead>创建时间</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredArbitrations.map((arbitration) => {
                  const StatusIcon = statusConfig[arbitration.status]?.icon || Clock;
                  return (
                    <TableRow key={arbitration.id}>
                      <TableCell className="font-mono text-sm">{arbitration.arbitrationCode}</TableCell>
                      <TableCell className="font-medium">{arbitration.title}</TableCell>
                      <TableCell>{arbitration.projectName}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{typeConfig[arbitration.arbitrationType]?.label}</Badge>
                      </TableCell>
                      <TableCell>{arbitration.initiatorName}</TableCell>
                      <TableCell>
                        <Badge variant={statusConfig[arbitration.status]?.variant}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusConfig[arbitration.status]?.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={priorityConfig[arbitration.priority]?.color}>
                          {priorityConfig[arbitration.priority]?.label}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatAmount(arbitration.disputedAmount)}</TableCell>
                      <TableCell className="text-sm">{formatDate(arbitration.createdAt)}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedArbitration(arbitration);
                            setIsDialogOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {selectedArbitration && (
        <Dialog open={!!selectedArbitration} onOpenChange={() => setSelectedArbitration(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>仲裁详情</DialogTitle>
              <DialogDescription>{selectedArbitration.arbitrationCode}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>标题</Label>
                  <div className="mt-1 font-medium">{selectedArbitration.title}</div>
                </div>
                <div>
                  <Label>项目</Label>
                  <div className="mt-1">{selectedArbitration.projectName}</div>
                </div>
                <div>
                  <Label>仲裁类型</Label>
                  <div className="mt-1">
                    <Badge variant="outline">{typeConfig[selectedArbitration.arbitrationType]?.label}</Badge>
                  </div>
                </div>
                <div>
                  <Label>状态</Label>
                  <div className="mt-1">
                    <Badge variant={statusConfig[selectedArbitration.status]?.variant}>
                      {statusConfig[selectedArbitration.status]?.label}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label>预估成本</Label>
                  <div className="mt-1">{formatAmount(selectedArbitration.estimatedCost)}</div>
                </div>
                <div>
                  <Label>实际成本</Label>
                  <div className="mt-1">{formatAmount(selectedArbitration.actualCost)}</div>
                </div>
                <div>
                  <Label>争议金额</Label>
                  <div className="mt-1 font-medium text-red-500">{formatAmount(selectedArbitration.disputedAmount)}</div>
                </div>
                <div>
                  <Label>发起人</Label>
                  <div className="mt-1">{selectedArbitration.initiatorName}</div>
                </div>
              </div>
              <div>
                <Label>仲裁描述</Label>
                <div className="mt-1 p-3 bg-muted rounded text-sm">{selectedArbitration.description}</div>
              </div>
              {selectedArbitration.approvalComments && (
                <div>
                  <Label>审批意见</Label>
                  <div className="mt-1 p-3 bg-muted rounded text-sm">{selectedArbitration.approvalComments}</div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedArbitration(null)}>
                关闭
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}