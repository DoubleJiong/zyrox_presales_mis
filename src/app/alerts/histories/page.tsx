'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DictSelect } from '@/components/dictionary/dict-select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Bell,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Eye,
  Check,
  X,
  Search,
  Filter,
  Clock,
  Building2,
  Users,
  FileText,
  Target,
  TrendingUp,
  ChevronRight
} from 'lucide-react';

interface AlertHistory {
  id: number;
  ruleId: number;
  ruleName: string;
  targetType: string;
  targetId: number;
  targetName: string;
  severity: string;
  status: string;
  alertData: Record<string, any>;
  acknowledgedAt: string | null;
  acknowledgedBy: number | null;
  resolvedAt: string | null;
  resolvedBy: number | null;
  resolutionNote: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function AlertHistoriesPage() {
  const [histories, setHistories] = useState<AlertHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterTargetType, setFilterTargetType] = useState('all');

  // 对话框状态
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<AlertHistory | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');

  useEffect(() => {
    fetchHistories();
  }, [filterStatus, filterSeverity, filterTargetType]);

  const fetchHistories = async () => {
    try {
      const params = new URLSearchParams();
      if (filterStatus !== 'all') params.append('status', filterStatus);
      if (filterSeverity !== 'all') params.append('severity', filterSeverity);
      if (filterTargetType !== 'all') params.append('targetType', filterTargetType);

      const response = await fetch(`/api/alerts/histories?${params}`);
      if (response.ok) {
        const result = await response.json();
        // API 返回格式: { success: true, data: [...] }
        setHistories(result.data || result || []);
      }
    } catch (error) {
      console.error('Failed to fetch alert histories:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredHistories = histories.filter(history => {
    const matchesSearch = (history.ruleName?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
                         (history.targetName?.toLowerCase() || '').includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const getSeverityBadge = (severity: string) => {
    const severityMap: Record<string, { label: string; color: string; icon: any }> = {
      low: { label: '低', color: 'bg-blue-100 text-blue-600', icon: CheckCircle },
      medium: { label: '中', color: 'bg-yellow-100 text-yellow-600', icon: AlertTriangle },
      high: { label: '高', color: 'bg-orange-100 text-orange-600', icon: AlertCircle },
      critical: { label: '严重', color: 'bg-red-100 text-red-600', icon: AlertCircle },
    };
    const severityInfo = severityMap[severity] || { label: severity, color: 'bg-gray-100 text-gray-600', icon: CheckCircle };
    const Icon = severityInfo.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${severityInfo.color}`}>
        <Icon className="h-3 w-3" />
        {severityInfo.label}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; color: string }> = {
      pending: { label: '待处理', color: 'bg-blue-100 text-blue-700' },
      acknowledged: { label: '已确认', color: 'bg-yellow-100 text-yellow-700' },
      resolved: { label: '已解决', color: 'bg-green-100 text-green-700' },
      ignored: { label: '已忽略', color: 'bg-gray-100 text-gray-700' },
    };
    const statusInfo = statusMap[status] || { label: status, color: 'bg-gray-100 text-gray-700' };
    return <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
      {statusInfo.label}
    </span>;
  };

  const getTargetIcon = (targetType: string) => {
    const typeMap: Record<string, any> = {
      project: Target,
      customer: Building2,
      user: Users,
      solution: FileText,
      opportunity: TrendingUp,
      lead: Target,
    };
    const Icon = typeMap[targetType] || Bell;
    return <Icon className="h-4 w-4" />;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleAcknowledge = async (alert: AlertHistory) => {
    try {
      const response = await fetch('/api/alerts/histories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: alert.id,
        }),
      });
      if (response.ok) {
        await fetchHistories();
      }
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
    }
  };

  const handleResolve = async () => {
    if (!selectedAlert) return;
    try {
      const response = await fetch('/api/alerts/histories', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedAlert.id,
          resolutionNote,
        }),
      });
      if (response.ok) {
        await fetchHistories();
        setResolveDialogOpen(false);
        setSelectedAlert(null);
        setResolutionNote('');
      }
    } catch (error) {
      console.error('Failed to resolve alert:', error);
    }
  };

  const openViewDialog = (alert: AlertHistory) => {
    setSelectedAlert(alert);
    setViewDialogOpen(true);
  };

  const openResolveDialog = (alert: AlertHistory) => {
    setSelectedAlert(alert);
    setResolutionNote('');
    setResolveDialogOpen(true);
  };

  const pendingCount = histories.filter(h => h.status === 'pending').length;
  const acknowledgedCount = histories.filter(h => h.status === 'acknowledged').length;
  const resolvedCount = histories.filter(h => h.status === 'resolved').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" data-testid="alerts-histories-page">
      {/* 页面头部 */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Bell className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold">预警历史</h1>
                  <p className="text-muted-foreground mt-1">查看和处理所有预警记录</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="container mx-auto px-4 py-6">
        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">总数</p>
                  <p className="text-2xl font-bold mt-1">{histories.length}</p>
                </div>
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Bell className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">待处理</p>
                  <p className="text-2xl font-bold mt-1 text-blue-600">{pendingCount}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Clock className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">已确认</p>
                  <p className="text-2xl font-bold mt-1 text-yellow-600">{acknowledgedCount}</p>
                </div>
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">已解决</p>
                  <p className="text-2xl font-bold mt-1 text-green-600">{resolvedCount}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 过滤器 */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="搜索规则名称或目标名称..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[150px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="pending">待处理</SelectItem>
                  <SelectItem value="acknowledged">已确认</SelectItem>
                  <SelectItem value="resolved">已解决</SelectItem>
                  <SelectItem value="ignored">已忽略</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">严重程度:</span>
                <DictSelect
                  category="alert_severity"
                  value={filterSeverity === 'all' ? '' : filterSeverity}
                  onValueChange={(value) => setFilterSeverity(value || 'all')}
                  placeholder="全部程度"
                  allowClear
                  className="w-[120px]"
                />
              </div>
              <Select value={filterTargetType} onValueChange={setFilterTargetType}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="目标类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部类型</SelectItem>
                  <SelectItem value="project">项目</SelectItem>
                  <SelectItem value="customer">客户</SelectItem>
                  <SelectItem value="user">用户</SelectItem>
                  <SelectItem value="solution">解决方案</SelectItem>
                  <SelectItem value="opportunity">商机</SelectItem>
                  <SelectItem value="lead">线索</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* 预警列表 */}
        <Card>
          <CardHeader>
            <CardTitle>预警记录</CardTitle>
            <CardDescription>共找到 {filteredHistories.length} 条记录</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>规则名称</TableHead>
                  <TableHead>目标</TableHead>
                  <TableHead>严重程度</TableHead>
                  <TableHead>触发条件</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>创建时间</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHistories.map((history) => (
                  <TableRow key={history.id}>
                    <TableCell>
                      <div className="font-medium">{history.ruleName}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-primary/10 rounded">
                          {getTargetIcon(history.targetType)}
                        </div>
                        <div>
                          <div className="font-medium">{history.targetName}</div>
                          <div className="text-xs text-muted-foreground capitalize">{history.targetType}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getSeverityBadge(history.severity)}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <span className="text-muted-foreground">{history.alertData?.condition}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        当前值: {history.alertData?.currentValue}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(history.status)}</TableCell>
                    <TableCell className="text-sm">{formatDate(history.createdAt)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openViewDialog(history)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {history.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleAcknowledge(history)}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openResolveDialog(history)}
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {history.status === 'acknowledged' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openResolveDialog(history)}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredHistories.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                      <div className="flex flex-col items-center">
                        <Bell className="h-12 w-12 mb-4 opacity-50" />
                        <p>暂无预警记录</p>
                        <p className="text-sm mt-1">预警规则触发后，记录将显示在这里</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* 查看详情对话框 */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>预警详情</DialogTitle>
            <DialogDescription>查看预警的详细信息</DialogDescription>
          </DialogHeader>
          {selectedAlert && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-sm">规则名称</Label>
                  <p className="font-medium">{selectedAlert.ruleName}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">严重程度</Label>
                  <div className="mt-1">{getSeverityBadge(selectedAlert.severity)}</div>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground text-sm">目标对象</Label>
                <div className="flex items-center gap-2 mt-1">
                  {getTargetIcon(selectedAlert.targetType)}
                  <span className="font-medium">{selectedAlert.targetName}</span>
                  <Badge variant="outline" className="capitalize">{selectedAlert.targetType}</Badge>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground text-sm">触发条件</Label>
                <div className="mt-1 p-3 bg-muted rounded-lg">
                  <p className="text-sm">{selectedAlert.alertData?.condition}</p>
                  <div className="text-sm mt-2">
                    <span className="text-muted-foreground">当前值：</span>
                    <span className="font-medium">{selectedAlert.alertData?.currentValue}</span>
                  </div>
                  {selectedAlert.alertData?.thresholdValue && (
                    <div className="text-sm mt-1">
                      <span className="text-muted-foreground">阈值：</span>
                      <span className="font-medium">{selectedAlert.alertData.thresholdValue} {selectedAlert.alertData.thresholdUnit}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-sm">状态</Label>
                  <div className="mt-1">{getStatusBadge(selectedAlert.status)}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">创建时间</Label>
                  <p className="font-medium">{formatDate(selectedAlert.createdAt)}</p>
                </div>
              </div>
              {selectedAlert.acknowledgedAt && (
                <div>
                  <Label className="text-muted-foreground text-sm">确认时间</Label>
                  <p className="font-medium">{formatDate(selectedAlert.acknowledgedAt)}</p>
                </div>
              )}
              {selectedAlert.resolvedAt && (
                <div>
                  <Label className="text-muted-foreground text-sm">解决时间</Label>
                  <p className="font-medium">{formatDate(selectedAlert.resolvedAt)}</p>
                </div>
              )}
              {selectedAlert.resolutionNote && (
                <div>
                  <Label className="text-muted-foreground text-sm">解决备注</Label>
                  <p className="mt-1 p-3 bg-muted rounded-lg text-sm">{selectedAlert.resolutionNote}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              关闭
            </Button>
            {selectedAlert?.status === 'pending' && (
              <Button onClick={() => {
                setViewDialogOpen(false);
                handleAcknowledge(selectedAlert);
              }}>
                确认预警
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 解决预警对话框 */}
      <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>解决预警</DialogTitle>
            <DialogDescription>记录该预警的解决方案</DialogDescription>
          </DialogHeader>
          {selectedAlert && (
            <div className="space-y-4 py-4">
              <div>
                <Label className="text-muted-foreground text-sm">规则名称</Label>
                <p className="font-medium">{selectedAlert.ruleName}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-sm">目标对象</Label>
                <p className="font-medium">{selectedAlert.targetName}</p>
              </div>
              <div>
                <Label>解决备注</Label>
                <Textarea
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  rows={4}
                  placeholder="描述解决方案和处理结果..."
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setResolveDialogOpen(false);
              setSelectedAlert(null);
              setResolutionNote('');
            }}>
              取消
            </Button>
            <Button onClick={handleResolve}>
              标记为已解决
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
