'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { apiClient } from '@/lib/api-client';
import { extractErrorMessage } from '@/lib/api-response';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Target,
  TrendingUp,
  Calendar,
  DollarSign,
  Plus,
  X,
  AlertTriangle,
  Building2,
  FileText,
  Pencil,
  Check,
  Upload,
  Sparkles,
  Trash2,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Clock,
  CheckCircle2,
  AlertCircle,
  Zap,
} from 'lucide-react';

interface ProjectOpportunityProps {
  projectId: number;
}

// 风险项接口
interface RiskItem {
  id: string;
  content: string;
  level: 'high' | 'medium' | 'low';
  createdAt: string;
}

// 行动项接口
interface ActionItem {
  id: string;
  content: string;
  dueDate: string | null;
  completed: boolean;
  createdAt: string;
}

interface OpportunityData {
  projectId: number;
  opportunityStage: string;
  expectedAmount: string | null;
  winProbability: number;
  expectedCloseDate: string | null;
  competitorList: Array<{ name: string; strength: string; strategy: string }>;
  decisionMaker: string | null;
  requirementSummary: string | null;
  solutionOutline: string | null;
  keySuccessFactors: string | null;
  riskAssessment: string | null;
  // 扩展字段（存储JSON）
  riskList?: RiskItem[];
  actionList?: ActionItem[];
  requirementFiles?: Array<{ name: string; url: string; uploadedAt: string }>;
  aiSummary?: string | null;
  nextAction: string | null;
  nextActionDate: string | null;
}

const STAGE_CONFIG: Record<string, { label: string; color: string; probability: number }> = {
  lead: { label: '初步线索', color: 'bg-gray-100 text-gray-600', probability: 10 },
  qualified: { label: '需求确认', color: 'bg-blue-100 text-blue-600', probability: 25 },
  proposal: { label: '方案报价', color: 'bg-yellow-100 text-yellow-600', probability: 50 },
  negotiation: { label: '招标投标', color: 'bg-orange-100 text-orange-600', probability: 75 },
  won: { label: '已成交', color: 'bg-green-100 text-green-600', probability: 100 },
  lost: { label: '已失败', color: 'bg-red-100 text-red-600', probability: 0 },
};

const RISK_LEVEL_CONFIG = {
  high: { label: '高风险', color: 'bg-red-500', borderColor: 'border-red-300' },
  medium: { label: '中风险', color: 'bg-amber-500', borderColor: 'border-amber-300' },
  low: { label: '低风险', color: 'bg-green-500', borderColor: 'border-green-300' },
};

export function ProjectOpportunity({ projectId }: ProjectOpportunityProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<OpportunityData | null>(null);

  // 各卡片独立编辑状态
  const [editingCard, setEditingCard] = useState<string | null>(null);
  const [editedData, setEditedData] = useState<Partial<OpportunityData>>({});
  const [saving, setSaving] = useState(false);

  // 对话框状态
  const [addCompetitorDialog, setAddCompetitorDialog] = useState(false);
  const [newCompetitor, setNewCompetitor] = useState({ name: '', strength: '', strategy: '' });
  
  // 新增风险对话框
  const [addRiskDialog, setAddRiskDialog] = useState(false);
  const [newRisk, setNewRisk] = useState<{ content: string; level: 'high' | 'medium' | 'low' }>({
    content: '',
    level: 'medium',
  });

  // 新增行动对话框
  const [addActionDialog, setAddActionDialog] = useState(false);
  const [newAction, setNewAction] = useState({ content: '', dueDate: '' });

  // 风险列表展开状态
  const [risksExpanded, setRisksExpanded] = useState(true);
  const [actionsExpanded, setActionsExpanded] = useState(true);

  // 赢单概率本地状态（用于滑块即时反馈）
  const [localProbability, setLocalProbability] = useState(10);

  useEffect(() => {
    fetchOpportunityData();
  }, [projectId]);

  // 同步 data.winProbability 到本地状态
  useEffect(() => {
    if (data?.winProbability !== undefined) {
      setLocalProbability(data.winProbability);
    }
  }, [data?.winProbability]);

  const fetchOpportunityData = async () => {
    try {
      const { data: result } = await apiClient.get<{ success: boolean; data: OpportunityData }>(`/api/projects/${projectId}/opportunity`);
      if (result.success) {
        // 解析扩展字段
        const parsedData = {
          ...result.data,
          riskList: parseJsonArray(result.data.riskAssessment, 'risk'),
          actionList: parseJsonArray(result.data.nextAction, 'action'),
        };
        setData(parsedData);
        setEditedData(parsedData);
      }
    } catch (error) {
      console.error('Failed to fetch opportunity data:', error);
    } finally {
      setLoading(false);
    }
  };

  // 解析JSON数组或旧格式数据
  const parseJsonArray = (data: string | null, type: 'risk' | 'action'): any[] => {
    if (!data) return [];
    try {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // 旧格式数据，转换为数组
      if (type === 'risk' && data) {
        return [{ id: Date.now().toString(), content: data, level: 'medium' as const, createdAt: new Date().toISOString() }];
      }
      if (type === 'action' && data) {
        return [{ id: Date.now().toString(), content: data, dueDate: null, completed: false, createdAt: new Date().toISOString() }];
      }
    }
    return [];
  };

  // 保存特定卡片的数据
  const saveCardData = async (cardName: string, updateData: Partial<OpportunityData>) => {
    setSaving(true);
    try {
      const { data: result, status } = await apiClient.put<{ success: boolean; data: OpportunityData; error?: string }>(
        `/api/projects/${projectId}/opportunity`, 
        updateData
      );
      if (status === 200 && result.success) {
        const parsedData = {
          ...result.data,
          riskList: parseJsonArray(result.data.riskAssessment, 'risk'),
          actionList: parseJsonArray(result.data.nextAction, 'action'),
        };
        setData(parsedData);
        setEditedData(parsedData);
        setEditingCard(null);
        toast({ title: '保存成功', description: '信息已更新' });
      } else {
        toast({ title: '保存失败', description: extractErrorMessage((result as any).error, '保存失败'), variant: 'destructive' });
      }
    } catch (error) {
      console.error('Failed to save opportunity data:', error);
      toast({ title: '保存失败', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // 开始编辑卡片
  const startEditing = (cardName: string) => {
    setEditingCard(cardName);
    setEditedData(data || {});
  };

  // 取消编辑
  const cancelEditing = () => {
    setEditingCard(null);
    setEditedData(data || {});
  };

  // ==================== 商机阶段卡片 ====================
  const renderStageCard = () => {
    const isEditing = editingCard === 'stage';
    const currentData = isEditing ? editedData : data;

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                商机阶段
              </CardTitle>
              <CardDescription>当前商机的进展阶段</CardDescription>
            </div>
            <Button
              variant={isEditing ? 'outline' : 'ghost'}
              size="sm"
              onClick={() => {
                if (isEditing) {
                  saveCardData('stage', {
                    opportunityStage: editedData.opportunityStage,
                  });
                } else {
                  startEditing('stage');
                }
              }}
              disabled={saving}
            >
              {isEditing ? (
                <>
                  <Check className="mr-1 h-4 w-4" />
                  保存
                </>
              ) : (
                <Pencil className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <Select
              value={currentData?.opportunityStage || 'lead'}
              onValueChange={(value) => setEditedData({ ...editedData, opportunityStage: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(STAGE_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="flex items-center gap-3">
              <Badge className={STAGE_CONFIG[currentData?.opportunityStage || 'lead']?.color}>
                {STAGE_CONFIG[currentData?.opportunityStage || 'lead']?.label}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // ==================== 赢单概率卡片（拖动条） ====================
  const renderProbabilityCard = () => {
    const getProbabilityColor = (value: number) => {
      if (value >= 70) return 'text-emerald-600';
      if (value >= 40) return 'text-amber-600';
      return 'text-rose-600';
    };

    const getProbabilityLabel = (value: number) => {
      if (value >= 80) return '极有希望';
      if (value >= 60) return '比较有把握';
      if (value >= 40) return '有机会';
      if (value >= 20) return '需要努力';
      return '机会较小';
    };

    const handleProbabilitySave = async (value: number[]) => {
      setSaving(true);
      try {
        const { data: result } = await apiClient.put<{ success: boolean; data: OpportunityData }>(
          `/api/projects/${projectId}/opportunity`,
          { winProbability: value[0] }
        );
        if (result.success) {
          setData({ ...data!, winProbability: value[0] });
          toast({ title: '已更新', description: `赢单概率已更新为 ${value[0]}%` });
        }
      } catch (error) {
        toast({ title: '更新失败', variant: 'destructive' });
      } finally {
        setSaving(false);
      }
    };

    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            赢单概率
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className={cn('text-3xl font-bold', getProbabilityColor(localProbability))}>
              {localProbability}%
            </span>
            <Badge variant="secondary">{getProbabilityLabel(localProbability)}</Badge>
          </div>
          <Slider
            value={[localProbability]}
            onValueChange={(value) => setLocalProbability(value[0])}
            onValueCommit={handleProbabilitySave}
            max={100}
            step={5}
            className="w-full"
            disabled={saving}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>机会较小</span>
            <span>极有希望</span>
          </div>
        </CardContent>
      </Card>
    );
  };

  // ==================== 预期金额卡片 ====================
  const renderAmountCard = () => {
    const isEditing = editingCard === 'amount';
    const currentData = isEditing ? editedData : data;

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                预期金额
              </CardTitle>
              <CardDescription>预期的项目成交金额</CardDescription>
            </div>
            <Button
              variant={isEditing ? 'outline' : 'ghost'}
              size="sm"
              onClick={() => {
                if (isEditing) {
                  saveCardData('amount', { expectedAmount: editedData.expectedAmount });
                } else {
                  startEditing('amount');
                }
              }}
              disabled={saving}
            >
              {isEditing ? (
                <>
                  <Check className="mr-1 h-4 w-4" />
                  保存
                </>
              ) : (
                <Pencil className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <div className="space-y-3">
              <Input
                type="number"
                value={currentData?.expectedAmount || ''}
                onChange={(e) => setEditedData({ ...editedData, expectedAmount: e.target.value })}
                placeholder="请输入预期金额"
              />
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={cancelEditing}>取消</Button>
              </div>
            </div>
          ) : (
            <div className="text-2xl font-bold">
              {currentData?.expectedAmount ? `¥${Number(currentData.expectedAmount).toLocaleString()}` : '未设置'}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // ==================== 预期成交日期卡片 ====================
  const renderDateCard = () => {
    const isEditing = editingCard === 'date';
    const currentData = isEditing ? editedData : data;

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                预期成交日期
              </CardTitle>
              <CardDescription>预计完成成交的日期</CardDescription>
            </div>
            <Button
              variant={isEditing ? 'outline' : 'ghost'}
              size="sm"
              onClick={() => {
                if (isEditing) {
                  saveCardData('date', { expectedCloseDate: editedData.expectedCloseDate });
                } else {
                  startEditing('date');
                }
              }}
              disabled={saving}
            >
              {isEditing ? (
                <>
                  <Check className="mr-1 h-4 w-4" />
                  保存
                </>
              ) : (
                <Pencil className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <div className="space-y-3">
              <Input
                type="date"
                value={currentData?.expectedCloseDate || ''}
                onChange={(e) => setEditedData({ ...editedData, expectedCloseDate: e.target.value })}
              />
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={cancelEditing}>取消</Button>
              </div>
            </div>
          ) : (
            <div className="text-lg font-medium">
              {currentData?.expectedCloseDate || '未设置'}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // ==================== 竞争对手分析卡片 ====================
  const handleAddCompetitor = async () => {
    if (!newCompetitor.name) return;
    const competitors = [...(data?.competitorList || []), newCompetitor];
    await saveCardData('competitors', { competitorList: competitors });
    setNewCompetitor({ name: '', strength: '', strategy: '' });
    setAddCompetitorDialog(false);
  };

  const handleRemoveCompetitor = async (index: number) => {
    const competitors = data?.competitorList?.filter((_, i) => i !== index) || [];
    await saveCardData('competitors', { competitorList: competitors });
  };

  const renderCompetitorCard = () => {
    const competitors = data?.competitorList || [];

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>竞争对手分析</CardTitle>
              <CardDescription>分析竞争对手的优势和应对策略</CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={() => setAddCompetitorDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              添加
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {competitors.length > 0 ? (
            <div className="space-y-4">
              {competitors.map((competitor, index) => (
                <div key={index} className="p-4 border rounded-lg relative group">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleRemoveCompetitor(index)}
                  >
                    <X className="h-4 w-4 text-destructive" />
                  </Button>
                  <div className="font-medium flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    {competitor.name}
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">优势：</span>
                    {competitor.strength}
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">应对策略：</span>
                    {competitor.strategy}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>暂无竞争对手信息</p>
              <Button size="sm" variant="outline" className="mt-2" onClick={() => setAddCompetitorDialog(true)}>
                <Plus className="mr-1 h-4 w-4" />
                添加竞争对手
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // ==================== 需求文档卡片（上传+AI概要） ====================
  const renderRequirementCard = () => {
    const isEditing = editingCard === 'requirement';
    const currentData = isEditing ? editedData : data;

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                需求文档
              </CardTitle>
              <CardDescription>上传需求文档，AI自动生成概要</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={isEditing ? 'outline' : 'ghost'}
                size="sm"
                onClick={() => {
                  if (isEditing) {
                    saveCardData('requirement', {
                      requirementSummary: editedData.requirementSummary,
                    });
                  } else {
                    startEditing('requirement');
                  }
                }}
                disabled={saving}
              >
                {isEditing ? (
                  <>
                    <Check className="mr-1 h-4 w-4" />
                    保存
                  </>
                ) : (
                  <Pencil className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 文件上传区 */}
          <div className="border-2 border-dashed rounded-lg p-4 text-center hover:border-primary/50 transition-colors cursor-pointer">
            <input type="file" className="hidden" id="requirement-file" accept=".pdf,.doc,.docx,.txt" />
            <label htmlFor="requirement-file" className="cursor-pointer">
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">点击上传需求文档</p>
              <p className="text-xs text-muted-foreground mt-1">支持 PDF、Word、TXT 格式</p>
            </label>
          </div>

          {/* AI概要输出 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">AI 概要</span>
            </div>
            {isEditing ? (
              <Textarea
                value={currentData?.requirementSummary || ''}
                onChange={(e) => setEditedData({ ...editedData, requirementSummary: e.target.value })}
                placeholder="AI将自动分析文档并生成需求概要..."
                rows={4}
              />
            ) : (
              <div className="bg-muted/50 rounded-lg p-3 text-sm">
                {currentData?.requirementSummary || (
                  <span className="text-muted-foreground">暂无需求概要，上传文档后AI将自动生成</span>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  // ==================== 风险评估卡片（多风险叠加） ====================
  const handleAddRisk = async () => {
    if (!newRisk.content) return;
    const risks: RiskItem[] = [
      ...(data?.riskList || []),
      {
        id: Date.now().toString(),
        content: newRisk.content,
        level: newRisk.level,
        createdAt: new Date().toISOString(),
      },
    ];
    await saveCardData('risks', { riskAssessment: JSON.stringify(risks) });
    setNewRisk({ content: '', level: 'medium' });
    setAddRiskDialog(false);
  };

  const handleRemoveRisk = async (id: string) => {
    const risks = data?.riskList?.filter((r) => r.id !== id) || [];
    await saveCardData('risks', { riskAssessment: JSON.stringify(risks) });
  };

  const renderRiskCard = () => {
    const risks = data?.riskList || [];

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                风险评估
              </CardTitle>
              <CardDescription>识别和跟踪项目风险</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {risks.length > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setRisksExpanded(!risksExpanded)}
                >
                  {risksExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={() => setAddRiskDialog(true)}>
                <Plus className="mr-1 h-4 w-4" />
                添加
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {risks.length > 0 ? (
            <div className={cn('relative', risksExpanded ? 'min-h-[120px]' : 'h-[80px] overflow-hidden')}>
              {/* 叠加卡片效果 */}
              {risks.map((risk, index) => (
                <div
                  key={risk.id}
                  className={cn(
                    'absolute w-full transition-all duration-300',
                    risksExpanded ? 'relative mb-3' : ''
                  )}
                  style={{
                    transform: risksExpanded 
                      ? 'none' 
                      : `translateY(${index * 8}px) scale(${1 - index * 0.05})`,
                    zIndex: risks.length - index,
                    opacity: risksExpanded ? 1 : (index < 3 ? 1 : 0),
                  }}
                >
                  <div className={cn(
                    'p-4 rounded-lg border-2 relative group',
                    RISK_LEVEL_CONFIG[risk.level].borderColor,
                    'bg-card'
                  )}>
                    {/* 风险等级指示条 */}
                    <div className={cn(
                      'absolute left-0 top-0 bottom-0 w-1 rounded-l-lg',
                      RISK_LEVEL_CONFIG[risk.level].color
                    )} />
                    
                    <div className="flex items-start justify-between pl-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge 
                            variant="outline"
                            className={cn(
                              'text-xs',
                              risk.level === 'high' && 'text-red-600 border-red-300',
                              risk.level === 'medium' && 'text-amber-600 border-amber-300',
                              risk.level === 'low' && 'text-green-600 border-green-300'
                            )}
                          >
                            {RISK_LEVEL_CONFIG[risk.level].label}
                          </Badge>
                        </div>
                        <p className="text-sm">{risk.content}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleRemoveRisk(risk.id)}
                      >
                        <X className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              {!risksExpanded && risks.length > 1 && (
                <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-card to-transparent pointer-events-none" />
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <AlertTriangle className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>暂无风险记录</p>
              <Button size="sm" variant="outline" className="mt-2" onClick={() => setAddRiskDialog(true)}>
                <Plus className="mr-1 h-4 w-4" />
                添加风险
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // ==================== 下一步行动卡片（多任务） ====================
  const handleAddAction = async () => {
    if (!newAction.content) return;
    const actions: ActionItem[] = [
      ...(data?.actionList || []),
      {
        id: Date.now().toString(),
        content: newAction.content,
        dueDate: newAction.dueDate || null,
        completed: false,
        createdAt: new Date().toISOString(),
      },
    ];
    await saveCardData('actions', { nextAction: JSON.stringify(actions) });
    setNewAction({ content: '', dueDate: '' });
    setAddActionDialog(false);
  };

  const handleToggleAction = async (id: string) => {
    const actions = data?.actionList?.map((a) =>
      a.id === id ? { ...a, completed: !a.completed } : a
    ) || [];
    await saveCardData('actions', { nextAction: JSON.stringify(actions) });
  };

  const handleRemoveAction = async (id: string) => {
    const actions = data?.actionList?.filter((a) => a.id !== id) || [];
    await saveCardData('actions', { nextAction: JSON.stringify(actions) });
  };

  const renderActionCard = () => {
    const actions = data?.actionList || [];
    const pendingActions = actions.filter((a) => !a.completed);
    const completedActions = actions.filter((a) => a.completed);

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                下一步行动
              </CardTitle>
              <CardDescription>跟踪待办事项和行动计划</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {actions.length > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setActionsExpanded(!actionsExpanded)}
                >
                  {actionsExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={() => setAddActionDialog(true)}>
                <Plus className="mr-1 h-4 w-4" />
                添加
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {actions.length > 0 ? (
            <div className="space-y-2">
              {/* 待办事项 */}
              {pendingActions.map((action) => (
                <div
                  key={action.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group"
                >
                  <button
                    onClick={() => handleToggleAction(action.id)}
                    className="mt-0.5 w-5 h-5 rounded-full border-2 border-primary/30 hover:border-primary flex items-center justify-center transition-colors"
                  >
                    <CheckCircle2 className="h-4 w-4 text-primary opacity-0 hover:opacity-100" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{action.content}</p>
                    {action.dueDate && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <Clock className="h-3 w-3" />
                        截止：{action.dueDate}
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleRemoveAction(action.id)}
                  >
                    <X className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}

              {/* 已完成事项 */}
              {actionsExpanded && completedActions.length > 0 && (
                <>
                  <div className="text-xs text-muted-foreground mt-4 mb-2">已完成</div>
                  {completedActions.map((action) => (
                    <div
                      key={action.id}
                      className="flex items-start gap-3 p-3 rounded-lg bg-muted/20 group"
                    >
                      <button
                        onClick={() => handleToggleAction(action.id)}
                        className="mt-0.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center"
                      >
                        <Check className="h-3 w-3 text-primary-foreground" />
                      </button>
                      <p className="text-sm text-muted-foreground line-through flex-1">
                        {action.content}
                      </p>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleRemoveAction(action.id)}
                      >
                        <X className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Zap className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>暂无行动计划</p>
              <Button size="sm" variant="outline" className="mt-2" onClick={() => setAddActionDialog(true)}>
                <Plus className="mr-1 h-4 w-4" />
                添加行动
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // ==================== 决策人信息卡片 ====================
  const renderDecisionMakerCard = () => {
    const isEditing = editingCard === 'decisionMaker';
    const currentData = isEditing ? editedData : data;

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>决策人信息</CardTitle>
              <CardDescription>客户方的关键决策人员</CardDescription>
            </div>
            <Button
              variant={isEditing ? 'outline' : 'ghost'}
              size="sm"
              onClick={() => {
                if (isEditing) {
                  saveCardData('decisionMaker', { decisionMaker: editedData.decisionMaker });
                } else {
                  startEditing('decisionMaker');
                }
              }}
              disabled={saving}
            >
              {isEditing ? (
                <>
                  <Check className="mr-1 h-4 w-4" />
                  保存
                </>
              ) : (
                <Pencil className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <div className="space-y-3">
              <Textarea
                value={currentData?.decisionMaker || ''}
                onChange={(e) => setEditedData({ ...editedData, decisionMaker: e.target.value })}
                placeholder="请输入决策人信息"
                rows={3}
              />
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={cancelEditing}>取消</Button>
              </div>
            </div>
          ) : (
            <p className="text-sm">{currentData?.decisionMaker || '未填写'}</p>
          )}
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return <div className="flex items-center justify-center h-48">加载中...</div>;
  }

  return (
    <div className="space-y-6">
      {/* 第一行：商机阶段 + 赢单概率 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {renderStageCard()}
        {renderProbabilityCard()}
      </div>

      {/* 第二行：预期金额 + 预期日期 + 决策人 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {renderAmountCard()}
        {renderDateCard()}
        {renderDecisionMakerCard()}
      </div>

      {/* 第三行：竞争对手分析 */}
      {renderCompetitorCard()}

      {/* 第四行：需求文档 */}
      {renderRequirementCard()}

      {/* 第五行：风险评估 + 下一步行动 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {renderRiskCard()}
        {renderActionCard()}
      </div>

      {/* 添加竞争对手对话框 */}
      <Dialog open={addCompetitorDialog} onOpenChange={setAddCompetitorDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加竞争对手</DialogTitle>
            <DialogDescription>填写竞争对手信息</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>竞争对手名称 *</Label>
              <Input
                value={newCompetitor.name}
                onChange={(e) => setNewCompetitor({ ...newCompetitor, name: e.target.value })}
                placeholder="请输入竞争对手名称"
              />
            </div>
            <div>
              <Label>主要优势</Label>
              <Textarea
                value={newCompetitor.strength}
                onChange={(e) => setNewCompetitor({ ...newCompetitor, strength: e.target.value })}
                placeholder="竞争对手的主要优势"
                rows={2}
              />
            </div>
            <div>
              <Label>应对策略</Label>
              <Textarea
                value={newCompetitor.strategy}
                onChange={(e) => setNewCompetitor({ ...newCompetitor, strategy: e.target.value })}
                placeholder="我们的应对策略"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddCompetitorDialog(false)}>取消</Button>
            <Button onClick={handleAddCompetitor} disabled={!newCompetitor.name || saving}>
              添加
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 添加风险对话框 */}
      <Dialog open={addRiskDialog} onOpenChange={setAddRiskDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加风险</DialogTitle>
            <DialogDescription>记录可能影响项目的风险</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>风险描述 *</Label>
              <Textarea
                value={newRisk.content}
                onChange={(e) => setNewRisk({ ...newRisk, content: e.target.value })}
                placeholder="请描述风险内容"
                rows={3}
              />
            </div>
            <div>
              <Label>风险等级</Label>
              <Select
                value={newRisk.level}
                onValueChange={(value: 'high' | 'medium' | 'low') => setNewRisk({ ...newRisk, level: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      高风险
                    </div>
                  </SelectItem>
                  <SelectItem value="medium">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      中风险
                    </div>
                  </SelectItem>
                  <SelectItem value="low">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-500" />
                      低风险
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddRiskDialog(false)}>取消</Button>
            <Button onClick={handleAddRisk} disabled={!newRisk.content || saving}>
              添加
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 添加行动对话框 */}
      <Dialog open={addActionDialog} onOpenChange={setAddActionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加行动项</DialogTitle>
            <DialogDescription>创建新的待办事项</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>行动内容 *</Label>
              <Textarea
                value={newAction.content}
                onChange={(e) => setNewAction({ ...newAction, content: e.target.value })}
                placeholder="请描述下一步行动"
                rows={3}
              />
            </div>
            <div>
              <Label>截止日期</Label>
              <Input
                type="date"
                value={newAction.dueDate}
                onChange={(e) => setNewAction({ ...newAction, dueDate: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddActionDialog(false)}>取消</Button>
            <Button onClick={handleAddAction} disabled={!newAction.content || saving}>
              添加
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
