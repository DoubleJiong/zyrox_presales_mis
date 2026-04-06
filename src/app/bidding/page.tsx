'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { BiddingAnalysis, BiddingReminders } from '@/components/bidding';
import {
  Search,
  Plus,
  Filter,
  Download,
  Eye,
  Edit,
  Trophy,
  XCircle,
  Clock,
  DollarSign,
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

// 投标数据类型
interface BiddingProject {
  id: number;
  projectCode: string;
  projectName: string;
  customerName: string;
  region: string;
  managerId: number;
  estimatedAmount: string;
  contractAmount: string;
  projectStage: string;
  bidResult: string | null;
  createdAt: string;
  updatedAt: string;
  biddingId: number | null;
  biddingType: string | null;
  bidDeadline: string | null;
  bidBondAmount: string | null;
  bidBondStatus: string | null;
  bidPrice: string | null;
  bidOpenDate: string | null;
  bidResult_detail: string | null;
  loseReason: string | null;
  winCompetitor: string | null;
  bidTeam: any;
  tenderDocuments: any;
  bidDocuments: any;
}

// 投标状态映射
const bidResultMap: Record<string, { label: string; color: string }> = {
  pending: { label: '待定', color: 'bg-yellow-100 text-yellow-700' },
  won: { label: '中标', color: 'bg-green-100 text-green-700' },
  lost: { label: '落标', color: 'bg-red-100 text-red-700' },
};

// 投标类型映射
const biddingTypeMap: Record<string, string> = {
  public: '公开招标',
  private: '邀请招标',
  negotiation: '竞争性谈判',
  single: '单一来源',
};

// 保证金状态映射
const bondStatusMap: Record<string, { label: string; color: string }> = {
  unpaid: { label: '未缴纳', color: 'bg-gray-100 text-gray-700' },
  paid: { label: '已缴纳', color: 'bg-blue-100 text-blue-700' },
  returned: { label: '已退还', color: 'bg-green-100 text-green-700' },
  forfeited: { label: '已没收', color: 'bg-red-100 text-red-700' },
};

export default function BiddingManagementPage() {
  const [biddings, setBiddings] = useState<BiddingProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedProject, setSelectedProject] = useState<BiddingProject | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  useEffect(() => {
    fetchBiddings();
  }, [statusFilter]);

  const fetchBiddings = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      
      const response = await fetch(`/api/biddings?${params.toString()}`);
      const result = await response.json();
      if (result.success) {
        setBiddings(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch biddings:', error);
    } finally {
      setLoading(false);
    }
  };

  // 格式化金额
  const formatAmount = (amount: string | null) => {
    if (!amount) return '-';
    const num = parseFloat(amount);
    if (isNaN(num)) return '-';
    if (num >= 10000) {
      return `${(num / 10000).toFixed(1)}万`;
    }
    return num.toFixed(0);
  };

  // 筛选数据
  const filteredBiddings = biddings.filter((bidding) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      bidding.projectName.toLowerCase().includes(searchLower) ||
      bidding.customerName?.toLowerCase().includes(searchLower) ||
      bidding.projectCode?.toLowerCase().includes(searchLower)
    );
  });

  // 统计数据
  const stats = {
    total: biddings.length,
    pending: biddings.filter((b) => b.bidResult === 'pending' || !b.bidResult).length,
    won: biddings.filter((b) => b.bidResult === 'won').length,
    lost: biddings.filter((b) => b.bidResult === 'lost').length,
    winRate: biddings.length > 0
      ? ((biddings.filter((b) => b.bidResult === 'won').length / 
          biddings.filter((b) => b.bidResult === 'won' || b.bidResult === 'lost').length) * 100 || 0).toFixed(1)
      : '0',
  };

  const handleViewDetail = (project: BiddingProject) => {
    setSelectedProject(project);
    setShowDetailDialog(true);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">投标管理</h1>
          <p className="text-muted-foreground">管理投标项目、审批流程和统计分析</p>
        </div>
        <Link href="/bidding/create">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            新建投标
          </Button>
        </Link>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-muted-foreground">投标总数</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <div className="text-sm text-muted-foreground">待定</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">{stats.won}</div>
            <div className="text-sm text-muted-foreground">中标</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-red-600">{stats.lost}</div>
            <div className="text-sm text-muted-foreground">落标</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-blue-600">{stats.winRate}%</div>
            <div className="text-sm text-muted-foreground">中标率</div>
          </CardContent>
        </Card>
      </div>

      {/* 主内容区 */}
      <Tabs defaultValue="list" className="space-y-4">
        <TabsList>
          <TabsTrigger value="list">投标列表</TabsTrigger>
          <TabsTrigger value="reminders">投标提醒</TabsTrigger>
          <TabsTrigger value="analysis">统计分析</TabsTrigger>
          <TabsTrigger value="approvals">审批流程</TabsTrigger>
        </TabsList>

        {/* 投标列表 */}
        <TabsContent value="list">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row justify-between gap-4">
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="搜索项目名称、客户..."
                      className="pl-10 w-64"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部状态</SelectItem>
                      <SelectItem value="pending">待定</SelectItem>
                      <SelectItem value="won">中标</SelectItem>
                      <SelectItem value="lost">落标</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  导出
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">加载中...</div>
              ) : filteredBiddings.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">暂无投标数据</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>项目名称</TableHead>
                      <TableHead>客户名称</TableHead>
                      <TableHead>投标类型</TableHead>
                      <TableHead>投标金额</TableHead>
                      <TableHead>投标截止</TableHead>
                      <TableHead>保证金状态</TableHead>
                      <TableHead>投标结果</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBiddings.map((bidding) => (
                      <TableRow key={bidding.id}>
                        <TableCell className="max-w-[200px]">
                          <div className="min-w-0">
                            <div className="font-medium truncate" title={bidding.projectName}>{bidding.projectName}</div>
                            <div className="text-xs text-muted-foreground truncate" title={bidding.projectCode}>{bidding.projectCode}</div>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[150px]">
                          <span className="truncate block" title={bidding.customerName || ''}>{bidding.customerName || '-'}</span>
                        </TableCell>
                        <TableCell>
                          {bidding.biddingType 
                            ? biddingTypeMap[bidding.biddingType] || bidding.biddingType 
                            : '-'}
                        </TableCell>
                        <TableCell>
                          {formatAmount(bidding.bidPrice || bidding.estimatedAmount)}
                        </TableCell>
                        <TableCell>
                          {bidding.bidDeadline 
                            ? format(new Date(bidding.bidDeadline), 'yyyy-MM-dd')
                            : '-'}
                        </TableCell>
                        <TableCell>
                          {bidding.bidBondStatus ? (
                            <Badge className={bondStatusMap[bidding.bidBondStatus]?.color || ''}>
                              {bondStatusMap[bidding.bidBondStatus]?.label || bidding.bidBondStatus}
                            </Badge>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge className={bidResultMap[bidding.bidResult || 'pending']?.color || ''}>
                            {bidResultMap[bidding.bidResult || 'pending']?.label || '待定'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleViewDetail(bidding)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Link href={`/bidding/${bidding.id}/edit`}>
                              <Button variant="ghost" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </Link>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 投标提醒 */}
        <TabsContent value="reminders">
          <BiddingReminders />
        </TabsContent>

        {/* 统计分析 */}
        <TabsContent value="analysis">
          <BiddingAnalysis />
        </TabsContent>

        {/* 审批流程 */}
        <TabsContent value="approvals">
          <Card>
            <CardHeader>
              <CardTitle>投标审批</CardTitle>
              <CardDescription>管理投标立项、报价和文件审批</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                审批功能开发中...
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 详情弹窗 */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>投标详情</DialogTitle>
            <DialogDescription>
              {selectedProject?.projectName}
            </DialogDescription>
          </DialogHeader>
          {selectedProject && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">项目编号</Label>
                  <div className="font-medium">{selectedProject.projectCode}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">客户名称</Label>
                  <div className="font-medium">{selectedProject.customerName || '-'}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">投标类型</Label>
                  <div className="font-medium">
                    {selectedProject.biddingType 
                      ? biddingTypeMap[selectedProject.biddingType] || selectedProject.biddingType 
                      : '-'}
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">投标结果</Label>
                  <div>
                    <Badge className={bidResultMap[selectedProject.bidResult || 'pending']?.color}>
                      {bidResultMap[selectedProject.bidResult || 'pending']?.label}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">预估金额</Label>
                  <div className="font-medium">{formatAmount(selectedProject.estimatedAmount)}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">投标报价</Label>
                  <div className="font-medium">{formatAmount(selectedProject.bidPrice)}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">投标截止</Label>
                  <div className="font-medium">
                    {selectedProject.bidDeadline 
                      ? format(new Date(selectedProject.bidDeadline), 'yyyy-MM-dd HH:mm')
                      : '-'}
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">开标日期</Label>
                  <div className="font-medium">
                    {selectedProject.bidOpenDate 
                      ? format(new Date(selectedProject.bidOpenDate), 'yyyy-MM-dd')
                      : '-'}
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">保证金金额</Label>
                  <div className="font-medium">{formatAmount(selectedProject.bidBondAmount)}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">保证金状态</Label>
                  <div>
                    {selectedProject.bidBondStatus ? (
                      <Badge className={bondStatusMap[selectedProject.bidBondStatus]?.color}>
                        {bondStatusMap[selectedProject.bidBondStatus]?.label}
                      </Badge>
                    ) : '-'}
                  </div>
                </div>
              </div>
              
              {selectedProject.loseReason && (
                <div>
                  <Label className="text-muted-foreground">落标原因</Label>
                  <div className="mt-1 p-2 bg-red-50 dark:bg-red-950/30 rounded text-sm">
                    {selectedProject.loseReason}
                  </div>
                </div>
              )}
              
              {selectedProject.winCompetitor && (
                <div>
                  <Label className="text-muted-foreground">中标竞争对手</Label>
                  <div className="mt-1 font-medium">{selectedProject.winCompetitor}</div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
              关闭
            </Button>
            <Link href={`/bidding/${selectedProject?.id}`}>
              <Button>查看完整信息</Button>
            </Link>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
