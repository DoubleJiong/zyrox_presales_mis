'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
} from '@/components/ui/dialog';
import { apiClient } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { 
  DollarSign, 
  Calendar, 
  Edit3, 
  Plus, 
  Trash2, 
  Users, 
  Building2,
  TrendingUp,
  AlertTriangle,
  Save,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { validatePhone } from '@/lib/validators';

interface ProjectInfo {
  id: number;
  projectName: string;
  estimatedAmount: string | null;
  expectedBiddingDate: string | null;
  estimatedDuration: number | null;
  urgencyLevel: string | null;
  risks: string | null;
}

interface DecisionMaker {
  id: number;
  name: string;
  position: string | null;
  department: string | null;
  attitude: string | null;
  influenceLevel: number | null;
  contactInfo: string | null;
  notes: string | null;
}

interface Competitor {
  id: number;
  name: string;
  strengths: string | null;
  weaknesses: string | null;
  strategy: string | null;
  threatLevel: string | null;
  notes: string | null;
}

interface ProjectInfoTabProps {
  projectId: number;
  projectInfo: ProjectInfo;
  readOnly?: boolean;
  onUpdate?: () => Promise<void> | void;
}

const ATTITUDE_OPTIONS = [
  { value: 'supportive', label: '支持', color: 'bg-green-100 text-green-800' },
  { value: 'neutral', label: '中立', color: 'bg-gray-100 text-gray-800' },
  { value: 'opposed', label: '反对', color: 'bg-red-100 text-red-800' },
  { value: 'unknown', label: '未知', color: 'bg-yellow-100 text-yellow-800' },
];

const THREAT_LEVEL_OPTIONS = [
  { value: 'high', label: '高', color: 'bg-red-100 text-red-800' },
  { value: 'medium', label: '中', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'low', label: '低', color: 'bg-green-100 text-green-800' },
];

const URGENCY_OPTIONS = [
  { value: 'urgent', label: '紧急' },
  { value: 'normal', label: '正常' },
  { value: 'low', label: '不紧急' },
];

export function ProjectInfoTab({ projectId, projectInfo, readOnly = false, onUpdate }: ProjectInfoTabProps) {
  const { toast } = useToast();
  
  // 编辑状态
  const [isEditingBasic, setIsEditingBasic] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // 基本信息编辑
  const [editedInfo, setEditedInfo] = useState({
    estimatedAmount: projectInfo.estimatedAmount || '',
    expectedBiddingDate: projectInfo.expectedBiddingDate || '',
    estimatedDuration: projectInfo.estimatedDuration || '',
    urgencyLevel: projectInfo.urgencyLevel || '',
    risks: projectInfo.risks || '',
  });
  
  // 决策人列表
  const [decisionMakers, setDecisionMakers] = useState<DecisionMaker[]>([]);
  const [decisionMakerDialogOpen, setDecisionMakerDialogOpen] = useState(false);
  const [editingDecisionMaker, setEditingDecisionMaker] = useState<DecisionMaker | null>(null);
  const [decisionMakerForm, setDecisionMakerForm] = useState({
    name: '',
    position: '',
    department: '',
    attitude: 'unknown',
    influenceLevel: 3,
    contactInfo: '',
    notes: '',
  });
  
  // 竞争对手列表
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [competitorDialogOpen, setCompetitorDialogOpen] = useState(false);
  const [editingCompetitor, setEditingCompetitor] = useState<Competitor | null>(null);
  const [competitorForm, setCompetitorForm] = useState({
    name: '',
    strengths: '',
    weaknesses: '',
    strategy: '',
    threatLevel: 'medium',
    notes: '',
  });
  
  useEffect(() => {
    fetchDecisionMakers();
    fetchCompetitors();
  }, [projectId]);
  
  // 监听 projectInfo 变化，同步更新 editedInfo
  useEffect(() => {
    setEditedInfo({
      estimatedAmount: projectInfo.estimatedAmount || '',
      expectedBiddingDate: projectInfo.expectedBiddingDate || '',
      estimatedDuration: projectInfo.estimatedDuration || '',
      urgencyLevel: projectInfo.urgencyLevel || '',
      risks: projectInfo.risks || '',
    });
  }, [projectInfo]);
  
  // 获取决策人列表
  const fetchDecisionMakers = async () => {
    try {
      const { data } = await apiClient.get(`/api/projects/${projectId}/decision-makers`);
      setDecisionMakers((data as any)?.data || []);
    } catch (error) {
      console.error('Failed to fetch decision makers:', error);
    }
  };
  
  // 获取竞争对手列表
  const fetchCompetitors = async () => {
    try {
      const { data } = await apiClient.get(`/api/projects/${projectId}/competitors`);
      setCompetitors((data as any)?.data || []);
    } catch (error) {
      console.error('Failed to fetch competitors:', error);
    }
  };
  
  // 保存基本信息
  const handleSaveBasicInfo = async () => {
    setSaving(true);
    try {
      const response = await apiClient.put(`/api/projects/${projectId}`, {
        estimatedAmount: editedInfo.estimatedAmount ? parseFloat(editedInfo.estimatedAmount) : null,
        expectedBiddingDate: editedInfo.expectedBiddingDate || null,
        estimatedDuration: editedInfo.estimatedDuration ? parseInt(String(editedInfo.estimatedDuration)) : null,
        urgencyLevel: editedInfo.urgencyLevel || null,
        risks: editedInfo.risks || null,
      });
      
      if ((response.data as any)?.success) {
        toast({ title: '保存成功', description: '项目信息已更新' });
        // 先等待父组件刷新数据，再退出编辑模式
        if (onUpdate) {
          await onUpdate();
        }
        setIsEditingBasic(false);
        // 确保本地 state 也同步更新
        setEditedInfo({
          estimatedAmount: editedInfo.estimatedAmount || '',
          expectedBiddingDate: editedInfo.expectedBiddingDate || '',
          estimatedDuration: editedInfo.estimatedDuration || '',
          urgencyLevel: editedInfo.urgencyLevel || '',
          risks: editedInfo.risks || '',
        });
      }
    } catch (error) {
      toast({ title: '保存失败', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };
  
  // 决策人操作
  const handleSaveDecisionMaker = async () => {
    if (!decisionMakerForm.name) {
      toast({ title: '请填写姓名', variant: 'destructive' });
      return;
    }
    
    // 验证联系方式（手机号或座机号）
    if (decisionMakerForm.contactInfo && decisionMakerForm.contactInfo.trim()) {
      const phoneResult = validatePhone(decisionMakerForm.contactInfo.trim());
      if (!phoneResult.valid) {
        toast({ 
          title: '联系方式格式错误', 
          description: phoneResult.message,
          variant: 'destructive' 
        });
        return;
      }
    }
    
    try {
      const url = `/api/projects/${projectId}/decision-makers${editingDecisionMaker ? `/${editingDecisionMaker.id}` : ''}`;
      const method = editingDecisionMaker ? 'put' : 'post';
      
      const response = await apiClient[method](url, decisionMakerForm);
      
      if ((response.data as any)?.success) {
        toast({ 
          title: editingDecisionMaker ? '更新成功' : '添加成功',
          description: `决策人已${editingDecisionMaker ? '更新' : '添加'}`
        });
        fetchDecisionMakers();
        setDecisionMakerDialogOpen(false);
        resetDecisionMakerForm();
      }
    } catch (error) {
      toast({ title: '操作失败', variant: 'destructive' });
    }
  };
  
  const handleDeleteDecisionMaker = async (id: number) => {
    if (!confirm('确定要删除该决策人吗？')) return;
    
    try {
      const response = await apiClient.delete(`/api/projects/${projectId}/decision-makers/${id}`);
      if ((response.data as any)?.success) {
        toast({ title: '删除成功' });
        fetchDecisionMakers();
      }
    } catch (error) {
      toast({ title: '删除失败', variant: 'destructive' });
    }
  };
  
  const resetDecisionMakerForm = () => {
    setDecisionMakerForm({
      name: '',
      position: '',
      department: '',
      attitude: 'unknown',
      influenceLevel: 3,
      contactInfo: '',
      notes: '',
    });
    setEditingDecisionMaker(null);
  };
  
  // 竞争对手操作
  const handleSaveCompetitor = async () => {
    if (!competitorForm.name) {
      toast({ title: '请填写竞争对手名称', variant: 'destructive' });
      return;
    }
    
    try {
      const url = `/api/projects/${projectId}/competitors${editingCompetitor ? `/${editingCompetitor.id}` : ''}`;
      const method = editingCompetitor ? 'put' : 'post';
      
      const response = await apiClient[method](url, competitorForm);
      
      if ((response.data as any)?.success) {
        toast({ 
          title: editingCompetitor ? '更新成功' : '添加成功',
          description: `竞争对手已${editingCompetitor ? '更新' : '添加'}`
        });
        fetchCompetitors();
        setCompetitorDialogOpen(false);
        resetCompetitorForm();
      }
    } catch (error) {
      toast({ title: '操作失败', variant: 'destructive' });
    }
  };
  
  const handleDeleteCompetitor = async (id: number) => {
    if (!confirm('确定要删除该竞争对手吗？')) return;
    
    try {
      const response = await apiClient.delete(`/api/projects/${projectId}/competitors/${id}`);
      if ((response.data as any)?.success) {
        toast({ title: '删除成功' });
        fetchCompetitors();
      }
    } catch (error) {
      toast({ title: '删除失败', variant: 'destructive' });
    }
  };
  
  const resetCompetitorForm = () => {
    setCompetitorForm({
      name: '',
      strengths: '',
      weaknesses: '',
      strategy: '',
      threatLevel: 'medium',
      notes: '',
    });
    setEditingCompetitor(null);
  };
  
  const getAttitudeLabel = (attitude: string | null) => {
    const option = ATTITUDE_OPTIONS.find(o => o.value === attitude);
    return option?.label || '未知';
  };
  
  const getAttitudeColor = (attitude: string | null) => {
    const option = ATTITUDE_OPTIONS.find(o => o.value === attitude);
    return option?.color || 'bg-gray-100 text-gray-800';
  };
  
  const getThreatLevelLabel = (level: string | null) => {
    const option = THREAT_LEVEL_OPTIONS.find(o => o.value === level);
    return option?.label || '中';
  };
  
  const getThreatLevelColor = (level: string | null) => {
    const option = THREAT_LEVEL_OPTIONS.find(o => o.value === level);
    return option?.color || 'bg-yellow-100 text-yellow-800';
  };

  return (
    <div className="space-y-6">
      {/* 预算与时间 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                预算与时间
              </CardTitle>
              <CardDescription>项目的预算规划和时间安排</CardDescription>
            </div>
            {!readOnly && (
              <Button
                variant="outline"
                size="sm"
                data-testid="project-info-edit-button"
                onClick={() => {
                  if (isEditingBasic) {
                    setIsEditingBasic(false);
                    setEditedInfo({
                      estimatedAmount: projectInfo.estimatedAmount || '',
                      expectedBiddingDate: projectInfo.expectedBiddingDate || '',
                      estimatedDuration: projectInfo.estimatedDuration || '',
                      urgencyLevel: projectInfo.urgencyLevel || '',
                      risks: projectInfo.risks || '',
                    });
                  } else {
                    setIsEditingBasic(true);
                  }
                }}
              >
                {isEditingBasic ? (
                  <>
                    <X className="mr-2 h-4 w-4" />
                    取消
                  </>
                ) : (
                  <>
                    <Edit3 className="mr-2 h-4 w-4" />
                    编辑
                  </>
                )}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isEditingBasic ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>项目预算（万元）</Label>
                  <Input
                    type="number"
                    data-testid="project-info-estimated-amount-input"
                    value={editedInfo.estimatedAmount}
                    onChange={(e) => setEditedInfo({ ...editedInfo, estimatedAmount: e.target.value })}
                    placeholder="请输入项目预算"
                  />
                </div>
                <div className="space-y-2">
                  <Label>预期招标时间</Label>
                  <Input
                    type="date"
                    data-testid="project-info-expected-bidding-date-input"
                    value={editedInfo.expectedBiddingDate}
                    onChange={(e) => setEditedInfo({ ...editedInfo, expectedBiddingDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>预计工期（月）</Label>
                  <Input
                    type="number"
                    data-testid="project-info-estimated-duration-input"
                    value={editedInfo.estimatedDuration}
                    onChange={(e) => setEditedInfo({ ...editedInfo, estimatedDuration: e.target.value })}
                    placeholder="请输入预计工期"
                  />
                </div>
                <div className="space-y-2">
                  <Label>项目紧急程度</Label>
                  <Select
                    value={editedInfo.urgencyLevel}
                    onValueChange={(value) => setEditedInfo({ ...editedInfo, urgencyLevel: value })}
                  >
                    <SelectTrigger data-testid="project-info-urgency-level-trigger">
                      <SelectValue placeholder="请选择紧急程度" />
                    </SelectTrigger>
                    <SelectContent>
                      {URGENCY_OPTIONS.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>风险说明</Label>
                <Textarea
                  data-testid="project-info-risks-textarea"
                  value={editedInfo.risks}
                  onChange={(e) => setEditedInfo({ ...editedInfo, risks: e.target.value })}
                  placeholder="请输入项目风险说明"
                  rows={4}
                />
              </div>
              <div className="flex gap-2">
                <Button data-testid="project-info-save-button" onClick={handleSaveBasicInfo} disabled={saving}>
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? '保存中...' : '保存'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-1">
                <Label className="text-muted-foreground">项目预算</Label>
                <p className="text-2xl font-bold">
                  {projectInfo.estimatedAmount ? `¥${parseFloat(projectInfo.estimatedAmount).toLocaleString()}` : '-'}
                </p>
              </div>
              <div className="space-y-1">
                <Label className="text-muted-foreground">预期招标时间</Label>
                <p className="font-medium">{projectInfo.expectedBiddingDate || '-'}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-muted-foreground">预计工期</Label>
                <p className="font-medium">{projectInfo.estimatedDuration ? `${projectInfo.estimatedDuration}个月` : '-'}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-muted-foreground">紧急程度</Label>
                <p className="font-medium">
                  {URGENCY_OPTIONS.find(o => o.value === projectInfo.urgencyLevel)?.label || '-'}
                </p>
              </div>
            </div>
          )}
          {!isEditingBasic && projectInfo.risks && (
            <div className="mt-4 pt-4 border-t">
              <Label className="text-muted-foreground">风险说明</Label>
              <p className="mt-2 text-sm whitespace-pre-wrap">{projectInfo.risks}</p>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* 决策人信息 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                决策人信息
              </CardTitle>
              <CardDescription>客户方关键决策者分析</CardDescription>
            </div>
            {!readOnly && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  resetDecisionMakerForm();
                  setDecisionMakerDialogOpen(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                添加决策人
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {decisionMakers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>姓名</TableHead>
                  <TableHead>职务</TableHead>
                  <TableHead>部门</TableHead>
                  <TableHead>态度</TableHead>
                  <TableHead>影响力</TableHead>
                  <TableHead>联系方式</TableHead>
                  {!readOnly && <TableHead className="w-[100px]">操作</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {decisionMakers.map((maker) => (
                  <TableRow key={maker.id}>
                    <TableCell className="font-medium">{maker.name}</TableCell>
                    <TableCell>{maker.position || '-'}</TableCell>
                    <TableCell>{maker.department || '-'}</TableCell>
                    <TableCell>
                      <Badge className={getAttitudeColor(maker.attitude)}>
                        {getAttitudeLabel(maker.attitude)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span
                            key={star}
                            className={cn(
                              'text-sm',
                              star <= (maker.influenceLevel || 0) ? 'text-yellow-500' : 'text-gray-300'
                            )}
                          >
                            ★
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>{maker.contactInfo || '-'}</TableCell>
                    {!readOnly && (
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingDecisionMaker(maker);
                              setDecisionMakerForm({
                                name: maker.name,
                                position: maker.position || '',
                                department: maker.department || '',
                                attitude: maker.attitude || 'unknown',
                                influenceLevel: maker.influenceLevel || 3,
                                contactInfo: maker.contactInfo || '',
                                notes: maker.notes || '',
                              });
                              setDecisionMakerDialogOpen(true);
                            }}
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={() => handleDeleteDecisionMaker(maker.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>暂无决策人信息</p>
              {!readOnly && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => {
                    resetDecisionMakerForm();
                    setDecisionMakerDialogOpen(true);
                  }}
                >
                  添加决策人
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* 竞争对手分析 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                竞争对手分析
              </CardTitle>
              <CardDescription>竞争态势和应对策略</CardDescription>
            </div>
            {!readOnly && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  resetCompetitorForm();
                  setCompetitorDialogOpen(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                添加竞争对手
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {competitors.length > 0 ? (
            <div className="space-y-4">
              {competitors.map((competitor) => (
                <div key={competitor.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <h4 className="font-medium">{competitor.name}</h4>
                      <Badge className={getThreatLevelColor(competitor.threatLevel)}>
                        威胁等级: {getThreatLevelLabel(competitor.threatLevel)}
                      </Badge>
                    </div>
                    {!readOnly && (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingCompetitor(competitor);
                            setCompetitorForm({
                              name: competitor.name,
                              strengths: competitor.strengths || '',
                              weaknesses: competitor.weaknesses || '',
                              strategy: competitor.strategy || '',
                              threatLevel: competitor.threatLevel || 'medium',
                              notes: competitor.notes || '',
                            });
                            setCompetitorDialogOpen(true);
                          }}
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => handleDeleteCompetitor(competitor.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">优势：</span>
                      <p className="mt-1">{competitor.strengths || '-'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">劣势：</span>
                      <p className="mt-1">{competitor.weaknesses || '-'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">应对策略：</span>
                      <p className="mt-1">{competitor.strategy || '-'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>暂无竞争对手信息</p>
              {!readOnly && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => {
                    resetCompetitorForm();
                    setCompetitorDialogOpen(true);
                  }}
                >
                  添加竞争对手
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* 决策人对话框 */}
      <Dialog open={decisionMakerDialogOpen} onOpenChange={setDecisionMakerDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingDecisionMaker ? '编辑决策人' : '添加决策人'}</DialogTitle>
            <DialogDescription>填写客户方关键决策者信息</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>姓名 *</Label>
                <Input
                  value={decisionMakerForm.name}
                  onChange={(e) => setDecisionMakerForm({ ...decisionMakerForm, name: e.target.value })}
                  placeholder="请输入姓名"
                />
              </div>
              <div className="space-y-2">
                <Label>职务</Label>
                <Input
                  value={decisionMakerForm.position}
                  onChange={(e) => setDecisionMakerForm({ ...decisionMakerForm, position: e.target.value })}
                  placeholder="请输入职务"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>部门</Label>
                <Input
                  value={decisionMakerForm.department}
                  onChange={(e) => setDecisionMakerForm({ ...decisionMakerForm, department: e.target.value })}
                  placeholder="请输入部门"
                />
              </div>
              <div className="space-y-2">
                <Label>联系方式</Label>
                <Input
                  value={decisionMakerForm.contactInfo}
                  onChange={(e) => setDecisionMakerForm({ ...decisionMakerForm, contactInfo: e.target.value })}
                  placeholder="请输入联系方式"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>态度</Label>
                <Select
                  value={decisionMakerForm.attitude}
                  onValueChange={(value) => setDecisionMakerForm({ ...decisionMakerForm, attitude: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="请选择态度" />
                  </SelectTrigger>
                  <SelectContent>
                    {ATTITUDE_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>影响力 (1-5)</Label>
                <Select
                  value={decisionMakerForm.influenceLevel.toString()}
                  onValueChange={(value) => setDecisionMakerForm({ ...decisionMakerForm, influenceLevel: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="请选择影响力" />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map(level => (
                      <SelectItem key={level} value={level.toString()}>
                        {'★'.repeat(level)}{'☆'.repeat(5 - level)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>备注</Label>
              <Textarea
                value={decisionMakerForm.notes}
                onChange={(e) => setDecisionMakerForm({ ...decisionMakerForm, notes: e.target.value })}
                placeholder="其他备注信息"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDecisionMakerDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSaveDecisionMaker}>
              {editingDecisionMaker ? '更新' : '添加'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* 竞争对手对话框 */}
      <Dialog open={competitorDialogOpen} onOpenChange={setCompetitorDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingCompetitor ? '编辑竞争对手' : '添加竞争对手'}</DialogTitle>
            <DialogDescription>填写竞争对手信息和分析</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>竞争对手名称 *</Label>
                <Input
                  value={competitorForm.name}
                  onChange={(e) => setCompetitorForm({ ...competitorForm, name: e.target.value })}
                  placeholder="请输入名称"
                />
              </div>
              <div className="space-y-2">
                <Label>威胁等级</Label>
                <Select
                  value={competitorForm.threatLevel}
                  onValueChange={(value) => setCompetitorForm({ ...competitorForm, threatLevel: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="请选择威胁等级" />
                  </SelectTrigger>
                  <SelectContent>
                    {THREAT_LEVEL_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>优势</Label>
              <Textarea
                value={competitorForm.strengths}
                onChange={(e) => setCompetitorForm({ ...competitorForm, strengths: e.target.value })}
                placeholder="竞争对手的主要优势"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>劣势</Label>
              <Textarea
                value={competitorForm.weaknesses}
                onChange={(e) => setCompetitorForm({ ...competitorForm, weaknesses: e.target.value })}
                placeholder="竞争对手的主要劣势"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>应对策略</Label>
              <Textarea
                value={competitorForm.strategy}
                onChange={(e) => setCompetitorForm({ ...competitorForm, strategy: e.target.value })}
                placeholder="我们的应对策略"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>备注</Label>
              <Textarea
                value={competitorForm.notes}
                onChange={(e) => setCompetitorForm({ ...competitorForm, notes: e.target.value })}
                placeholder="其他备注信息"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompetitorDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSaveCompetitor}>
              {editingCompetitor ? '更新' : '添加'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
