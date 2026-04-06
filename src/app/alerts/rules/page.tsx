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
import { Switch } from '@/components/ui/switch';
import { 
  Bell,
  Plus,
  Edit3,
  Trash2,
  Search,
  Filter,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Clock,
  Mail,
  MessageSquare,
  Smartphone,
  Settings,
  TrendingUp,
  Building2,
  Users,
  FileText,
  Target
} from 'lucide-react';

interface AlertRule {
  id: number;
  ruleName: string;
  ruleCode: string;
  ruleType: string;
  ruleCategory: string;
  conditionField: string;
  conditionOperator: string;
  thresholdValue: number;
  thresholdUnit: string;
  severity: string;
  status: string;
  checkFrequency: string;
  notificationChannels: string[];
  recipientIds: number[];
  description: string;
  createdAt: string;
  updatedAt: string;
  lastTriggeredAt: string | null;
  triggerCount: number;
}

export default function AlertRulesPage() {
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterSeverity, setFilterSeverity] = useState('all');

  // 对话框状态
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState<AlertRule | null>(null);

  // 表单状态
  const [formData, setFormData] = useState({
    ruleName: '',
    ruleType: '',
    ruleCategory: '',
    conditionField: '',
    conditionOperator: 'gt',
    thresholdValue: '',
    thresholdUnit: 'day',
    severity: 'medium',
    notificationChannels: [] as string[],
    recipientIds: [] as number[],
    description: '',
  });

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      const response = await fetch('/api/alerts/rules');
      if (response.ok) {
        const result = await response.json();
        // API 返回格式: { success: true, data: [...] }
        setRules(result.data || result || []);
      }
    } catch (error) {
      console.error('Failed to fetch alert rules:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredRules = rules.filter(rule => {
    const matchesSearch = (rule.ruleName?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
                         (rule.ruleCode?.toLowerCase() || '').includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || rule.ruleType === filterType;
    const matchesStatus = filterStatus === 'all' || rule.status === filterStatus;
    const matchesSeverity = filterSeverity === 'all' || rule.severity === filterSeverity;
    return matchesSearch && matchesType && matchesStatus && matchesSeverity;
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
    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
      active: { label: '启用', variant: 'default' },
      inactive: { label: '停用', variant: 'secondary' },
      draft: { label: '草稿', variant: 'outline' },
    };
    const statusInfo = statusMap[status] || { label: status, variant: 'outline' as const };
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  const getTypeIcon = (type: string) => {
    const typeMap: Record<string, { icon: any; label: string }> = {
      project: { icon: Target, label: '项目' },
      customer: { icon: Building2, label: '客户' },
      user: { icon: Users, label: '用户' },
      solution: { icon: FileText, label: '解决方案' },
      opportunity: { icon: TrendingUp, label: '商机' },
      lead: { icon: Target, label: '线索' },
    };
    const typeInfo = typeMap[type] || { icon: Bell, label: type };
    const Icon = typeInfo.icon;
    return <Icon className="h-4 w-4" />;
  };

  const getChannelIcon = (channel: string) => {
    const channelMap: Record<string, any> = {
      email: Mail,
      sms: Smartphone,
      system: Bell,
      webhook: Settings,
    };
    const Icon = channelMap[channel] || Bell;
    return <Icon className="h-3.5 w-3.5" />;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('zh-CN');
  };

  const handleAddRule = async () => {
    try {
      const response = await fetch('/api/alerts/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          thresholdValue: parseInt(formData.thresholdValue),
        }),
      });
      if (response.ok) {
        await fetchRules();
        setAddDialogOpen(false);
        resetForm();
      }
    } catch (error) {
      console.error('Failed to add rule:', error);
    }
  };

  const handleEditRule = async () => {
    if (!selectedRule) return;
    try {
      const response = await fetch('/api/alerts/rules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedRule.id,
          ...formData,
          thresholdValue: parseInt(formData.thresholdValue),
        }),
      });
      if (response.ok) {
        await fetchRules();
        setEditDialogOpen(false);
        setSelectedRule(null);
        resetForm();
      }
    } catch (error) {
      console.error('Failed to update rule:', error);
    }
  };

  const handleDeleteRule = async (id: number) => {
    if (!confirm('确定要删除这个预警规则吗？')) return;
    try {
      const response = await fetch(`/api/alerts/rules?id=${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        await fetchRules();
      }
    } catch (error) {
      console.error('Failed to delete rule:', error);
    }
  };

  const handleToggleStatus = async (rule: AlertRule) => {
    try {
      const response = await fetch('/api/alerts/rules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: rule.id,
          status: rule.status === 'active' ? 'inactive' : 'active',
        }),
      });
      if (response.ok) {
        await fetchRules();
      }
    } catch (error) {
      console.error('Failed to toggle rule status:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      ruleName: '',
      ruleType: '',
      ruleCategory: '',
      conditionField: '',
      conditionOperator: 'gt',
      thresholdValue: '',
      thresholdUnit: 'day',
      severity: 'medium',
      notificationChannels: [],
      recipientIds: [],
      description: '',
    });
  };

  const openEditDialog = (rule: AlertRule) => {
    setSelectedRule(rule);
    setFormData({
      ruleName: rule.ruleName,
      ruleType: rule.ruleType,
      ruleCategory: rule.ruleCategory,
      conditionField: rule.conditionField,
      conditionOperator: rule.conditionOperator,
      thresholdValue: rule.thresholdValue.toString(),
      thresholdUnit: rule.thresholdUnit,
      severity: rule.severity,
      notificationChannels: rule.notificationChannels || [],
      recipientIds: rule.recipientIds || [],
      description: rule.description,
    });
    setEditDialogOpen(true);
  };

  const toggleNotificationChannel = (channel: string) => {
    setFormData(prev => ({
      ...prev,
      notificationChannels: prev.notificationChannels.includes(channel)
        ? prev.notificationChannels.filter(c => c !== channel)
        : [...prev.notificationChannels, channel],
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
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
                  <h1 className="text-3xl font-bold">预警规则管理</h1>
                  <p className="text-muted-foreground mt-1">配置和管理系统预警规则</p>
                </div>
              </div>
            </div>
            <Button onClick={() => {
              resetForm();
              setAddDialogOpen(true);
            }}>
              <Plus className="mr-2 h-4 w-4" />
              新建规则
            </Button>
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
                  <p className="text-sm text-muted-foreground">总规则数</p>
                  <p className="text-2xl font-bold mt-1">{rules.length}</p>
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
                  <p className="text-sm text-muted-foreground">启用规则</p>
                  <p className="text-2xl font-bold mt-1 text-green-600">{rules.filter(r => r.status === 'active').length}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">停用规则</p>
                  <p className="text-2xl font-bold mt-1 text-gray-600">{rules.filter(r => r.status === 'inactive').length}</p>
                </div>
                <div className="p-3 bg-gray-100 rounded-lg">
                  <Clock className="h-5 w-5 text-gray-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">总触发次数</p>
                  <p className="text-2xl font-bold mt-1 text-orange-600">{rules.reduce((sum, r) => sum + r.triggerCount, 0)}</p>
                </div>
                <div className="p-3 bg-orange-100 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
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
                    placeholder="搜索规则名称或编码..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[150px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="类型" />
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
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="active">启用</SelectItem>
                  <SelectItem value="inactive">停用</SelectItem>
                  <SelectItem value="draft">草稿</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="严重程度" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部程度</SelectItem>
                  <SelectItem value="low">低</SelectItem>
                  <SelectItem value="medium">中</SelectItem>
                  <SelectItem value="high">高</SelectItem>
                  <SelectItem value="critical">严重</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* 规则列表 */}
        <Card>
          <CardHeader>
            <CardTitle>规则列表</CardTitle>
            <CardDescription>共找到 {filteredRules.length} 条规则</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>规则名称</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>条件</TableHead>
                  <TableHead>严重程度</TableHead>
                  <TableHead>通知渠道</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>触发次数</TableHead>
                  <TableHead>最后触发</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{rule.ruleName}</div>
                        <div className="text-xs text-muted-foreground">{rule.ruleCode}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getTypeIcon(rule.ruleType)}
                        <span className="text-sm capitalize">{rule.ruleType}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <span className="font-medium">{rule.conditionField}</span>
                        <span className="text-muted-foreground mx-1">{rule.conditionOperator}</span>
                        <span className="font-medium">{rule.thresholdValue} {rule.thresholdUnit}</span>
                      </div>
                    </TableCell>
                    <TableCell>{getSeverityBadge(rule.severity)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {rule.notificationChannels?.map((channel) => (
                          <div key={channel} className="p-1.5 bg-muted rounded">
                            {getChannelIcon(channel)}
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={rule.status === 'active'}
                          onCheckedChange={() => handleToggleStatus(rule)}
                        />
                        {getStatusBadge(rule.status)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <span className="font-medium">{rule.triggerCount}</span>
                        <span className="text-xs text-muted-foreground">次</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDate(rule.lastTriggeredAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEditDialog(rule)}
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteRule(rule.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredRules.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                      <div className="flex flex-col items-center">
                        <Bell className="h-12 w-12 mb-4 opacity-50" />
                        <p>暂无预警规则</p>
                        <p className="text-sm mt-1">点击"新建规则"创建第一个规则</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* 新建规则对话框 */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>新建预警规则</DialogTitle>
            <DialogDescription>配置新的预警规则，设置触发条件和通知方式</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>规则名称</Label>
                <Input
                  value={formData.ruleName}
                  onChange={(e) => setFormData({ ...formData, ruleName: e.target.value })}
                  placeholder="例如：项目长期未更新"
                />
              </div>
              <div className="space-y-2">
                <Label>规则类型</Label>
                <Select
                  value={formData.ruleType}
                  onValueChange={(value) => setFormData({ ...formData, ruleType: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="project">项目</SelectItem>
                    <SelectItem value="customer">客户</SelectItem>
                    <SelectItem value="user">用户</SelectItem>
                    <SelectItem value="solution">解决方案</SelectItem>
                    <SelectItem value="opportunity">商机</SelectItem>
                    <SelectItem value="lead">线索</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>预警分类</Label>
                <DictSelect
                  category="alert_category"
                  value={formData.ruleCategory}
                  onValueChange={(value) => setFormData({ ...formData, ruleCategory: value })}
                  placeholder="选择分类"
                />
              </div>
              <div className="space-y-2">
                <Label>严重程度</Label>
                <DictSelect
                  category="alert_severity"
                  value={formData.severity}
                  onValueChange={(value) => setFormData({ ...formData, severity: value })}
                  placeholder="选择严重程度"
                />
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">触发条件</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>条件字段</Label>
                  <Select
                    value={formData.conditionField}
                    onValueChange={(value) => setFormData({ ...formData, conditionField: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择字段" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="updatedAt">更新时间</SelectItem>
                      <SelectItem value="createdAt">创建时间</SelectItem>
                      <SelectItem value="lastCooperationDate">最后合作日期</SelectItem>
                      <SelectItem value="lastLoginTime">最后登录时间</SelectItem>
                      <SelectItem value="expectedDeliveryDate">预计交付日期</SelectItem>
                      <SelectItem value="progress">项目进度</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>操作符</Label>
                  <Select
                    value={formData.conditionOperator}
                    onValueChange={(value) => setFormData({ ...formData, conditionOperator: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gt">大于 ({'&gt;'})</SelectItem>
                      <SelectItem value="lt">小于 (&lt;)</SelectItem>
                      <SelectItem value="eq">等于 (=)</SelectItem>
                      <SelectItem value="gte">大于等于 (≥)</SelectItem>
                      <SelectItem value="lte">小于等于 (≤)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>阈值</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={formData.thresholdValue}
                      onChange={(e) => setFormData({ ...formData, thresholdValue: e.target.value })}
                      placeholder="数值"
                    />
                    <Select
                      value={formData.thresholdUnit}
                      onValueChange={(value) => setFormData({ ...formData, thresholdUnit: value })}
                    >
                      <SelectTrigger className="w-[100px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="day">天</SelectItem>
                        <SelectItem value="hour">小时</SelectItem>
                        <SelectItem value="week">周</SelectItem>
                        <SelectItem value="month">月</SelectItem>
                        <SelectItem value="percent">百分比</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">通知设置</h4>
              <div className="space-y-3">
                <Label>通知渠道</Label>
                <div className="flex flex-wrap gap-3">
                  {[
                    { id: 'email', label: '邮件', icon: Mail },
                    { id: 'sms', label: '短信', icon: Smartphone },
                    { id: 'system', label: '系统通知', icon: Bell },
                    { id: 'webhook', label: 'Webhook', icon: Settings },
                  ].map((channel) => (
                    <button
                      key={channel.id}
                      type="button"
                      onClick={() => toggleNotificationChannel(channel.id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
                        formData.notificationChannels.includes(channel.id)
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <channel.icon className="h-4 w-4" />
                      <span className="text-sm">{channel.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>描述</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                placeholder="描述该规则的用途和触发场景"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleAddRule} disabled={!formData.ruleName || !formData.ruleType}>
              创建规则
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑规则对话框 */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>编辑预警规则</DialogTitle>
            <DialogDescription>修改预警规则的配置</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>规则名称</Label>
                <Input
                  value={formData.ruleName}
                  onChange={(e) => setFormData({ ...formData, ruleName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>规则编码</Label>
                <Input value={selectedRule?.ruleCode || ''} disabled />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>严重程度</Label>
                <DictSelect
                  category="alert_severity"
                  value={formData.severity}
                  onValueChange={(value) => setFormData({ ...formData, severity: value })}
                  placeholder="选择严重程度"
                />
              </div>
              <div className="space-y-2">
                <Label>阈值</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={formData.thresholdValue}
                    onChange={(e) => setFormData({ ...formData, thresholdValue: e.target.value })}
                  />
                  <Select
                    value={formData.thresholdUnit}
                    onValueChange={(value) => setFormData({ ...formData, thresholdUnit: value })}
                  >
                    <SelectTrigger className="w-[100px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="day">天</SelectItem>
                      <SelectItem value="hour">小时</SelectItem>
                      <SelectItem value="week">周</SelectItem>
                      <SelectItem value="month">月</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">通知渠道</h4>
              <div className="flex flex-wrap gap-3">
                {[
                  { id: 'email', label: '邮件', icon: Mail },
                  { id: 'sms', label: '短信', icon: Smartphone },
                  { id: 'system', label: '系统通知', icon: Bell },
                  { id: 'webhook', label: 'Webhook', icon: Settings },
                ].map((channel) => (
                  <button
                    key={channel.id}
                    type="button"
                    onClick={() => toggleNotificationChannel(channel.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
                      formData.notificationChannels.includes(channel.id)
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <channel.icon className="h-4 w-4" />
                    <span className="text-sm">{channel.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>描述</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setEditDialogOpen(false);
              setSelectedRule(null);
              resetForm();
            }}>
              取消
            </Button>
            <Button onClick={handleEditRule}>
              保存修改
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
