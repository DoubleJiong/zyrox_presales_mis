'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api-client';
import { extractErrorMessage } from '@/lib/api-response';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  FileText,
  Calendar,
  Save,
  Upload,
} from 'lucide-react';

interface ProjectBiddingProps {
  projectId: number;
  defaultEditing?: boolean;
}

interface BiddingData {
  projectId: number;
  // V1.3: 基本信息字段
  bidNumber: string | null;
  bidProjectName: string | null;
  biddingMethod: string | null;
  scoringMethod: string | null;
  priceLimit: string | null;
  fundSource: string | null;
  // 原有字段
  biddingType: string | null;
  bidDeadline: string | null;
  bidBondAmount: string | null;
  bidBondStatus: string;
  bidBondPayDate: string | null;
  bidBondReturnDate: string | null;
  tenderDocuments: Array<{ name: string; url: string; uploadDate: string; size?: number; type?: string }>;
  bidDocuments: Array<{ name: string; url: string; uploadDate: string; size?: number; type?: string; isMain?: boolean }>;
  bidTeam: Array<{ userId: number; userName: string; role: string }>;
  bidPrice: string | null;
  bidOpenDate: string | null;
  bidResult: string;
  loseReason: string | null;
  winCompetitor: string | null;
  reviewComments: string | null;
  lessonsLearned: string | null;
}

// V1.3: 招标方式配置
const BIDDING_METHOD_CONFIG: Record<string, { label: string }> = {
  open: { label: '公开招标' },
  invite: { label: '邀请招标' },
  competitive: { label: '竞争性谈判' },
  consultation: { label: '竞争性磋商' },
  inquiry: { label: '询价' },
  centralized: { label: '集采' },
  single: { label: '单一来源' },
};

// V1.3: 评分办法配置
const SCORING_METHOD_CONFIG: Record<string, { label: string }> = {
  comprehensive: { label: '综合评分法' },
  lowest: { label: '最低价中标' },
  technical: { label: '技术评分法' },
};

// V1.3: 资金来源配置
const FUND_SOURCE_CONFIG: Record<string, { label: string }> = {
  fiscal: { label: '财政资金' },
  self_funded: { label: '自筹资金' },
  bank: { label: '银行投资' },
  operator: { label: '运营商投资' },
  other: { label: '其他' },
};

const BID_TYPE_CONFIG: Record<string, { label: string }> = {
  public: { label: '公开招标' },
  private: { label: '邀请招标' },
  negotiation: { label: '竞争性谈判' },
  single: { label: '单一来源' },
};

const BOND_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  unpaid: { label: '未缴纳', color: 'bg-gray-100 text-gray-600' },
  paid: { label: '已缴纳', color: 'bg-blue-100 text-blue-600' },
  returned: { label: '已退还', color: 'bg-green-100 text-green-600' },
  forfeited: { label: '已没收', color: 'bg-red-100 text-red-600' },
};

export function ProjectBidding({ projectId, defaultEditing = false }: ProjectBiddingProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<BiddingData | null>(null);
  const [editedData, setEditedData] = useState<Partial<BiddingData>>({});
  const [isEditing, setIsEditing] = useState(defaultEditing);

  useEffect(() => {
    fetchBiddingData();
  }, [projectId]);

  useEffect(() => {
    setIsEditing(defaultEditing);
  }, [defaultEditing, projectId]);

  const fetchBiddingData = async () => {
    try {
      const { data: result } = await apiClient.get<{ success: boolean; data: BiddingData }>(`/api/projects/${projectId}/bidding`);
      if (result.success) {
        setData(result.data);
        setEditedData(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch bidding data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDateInputValue = (value: string | null | undefined) => {
    if (!value) return '';
    const normalized = new Date(value);
    if (Number.isNaN(normalized.getTime())) {
      return '';
    }
    return normalized.toISOString().slice(0, 10);
  };

  const formatDateDisplayValue = (value: string | null | undefined) => {
    if (!value) return '-';
    const normalized = new Date(value);
    if (Number.isNaN(normalized.getTime())) {
      return value;
    }
    return normalized.toLocaleDateString('zh-CN');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: result, status } = await apiClient.put<{ success: boolean; data: BiddingData; error?: string }>(`/api/projects/${projectId}/bidding`, editedData);
      if (status === 200 && result.success) {
        setData(result.data);
        setIsEditing(false);
        toast({ title: '保存成功', description: '投标信息已更新' });
      } else {
        toast({ title: '保存失败', description: extractErrorMessage((result as any).error, '保存失败'), variant: 'destructive' });
      }
    } catch (error) {
      console.error('Failed to save bidding data:', error);
      toast({ title: '保存失败', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-48">加载中...</div>;
  }

  const currentData = isEditing ? editedData : data;

  return (
    <div className="space-y-6">
      {/* 投标状态和基本信息 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                招投标信息
              </CardTitle>
              <CardDescription>招标方式、标上名称和报价信息</CardDescription>
            </div>
            <Button
              variant={isEditing ? 'outline' : 'default'}
              size="sm"
              data-testid="bidding-info-edit-button"
              onClick={() => {
                if (isEditing) {
                  setEditedData(data || {});
                  setIsEditing(false);
                } else {
                  setIsEditing(true);
                }
              }}
            >
              {isEditing ? '取消' : '编辑'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* V1.3: 新增基本信息字段 */}
            <div>
              <Label className="text-muted-foreground">项目标编号</Label>
              {isEditing ? (
                <Input
                  type="text"
                  data-testid="bidding-bid-number-input"
                  value={currentData?.bidNumber || ''}
                  onChange={(e) => setEditedData({ ...editedData, bidNumber: e.target.value })}
                  placeholder="请输入项目标编号"
                  className="mt-1"
                />
              ) : (
                <p className="mt-1 font-medium">{currentData?.bidNumber || '-'}</p>
              )}
            </div>
            <div>
              <Label className="text-muted-foreground">项目名称（标上名称）</Label>
              {isEditing ? (
                <Input
                  type="text"
                  data-testid="bidding-bid-project-name-input"
                  value={currentData?.bidProjectName || ''}
                  onChange={(e) => setEditedData({ ...editedData, bidProjectName: e.target.value })}
                  placeholder="请输入项目名称"
                  className="mt-1"
                />
              ) : (
                <p className="mt-1 font-medium">{currentData?.bidProjectName || '-'}</p>
              )}
            </div>
            <div>
              <Label className="text-muted-foreground">招标方式</Label>
              {isEditing ? (
                <Select
                  value={currentData?.biddingMethod || ''}
                  onValueChange={(value) => setEditedData({ ...editedData, biddingMethod: value })}
                >
                  <SelectTrigger data-testid="bidding-method-trigger" className="mt-1">
                    <SelectValue placeholder="请选择招标方式" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(BIDDING_METHOD_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="mt-1 font-medium">
                  {BIDDING_METHOD_CONFIG[currentData?.biddingMethod || '']?.label || '-'}
                </p>
              )}
            </div>
            <div>
              <Label className="text-muted-foreground">评分办法</Label>
              {isEditing ? (
                <Select
                  value={currentData?.scoringMethod || ''}
                  onValueChange={(value) => setEditedData({ ...editedData, scoringMethod: value })}
                >
                  <SelectTrigger data-testid="bidding-scoring-method-trigger" className="mt-1">
                    <SelectValue placeholder="请选择评分办法" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(SCORING_METHOD_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="mt-1 font-medium">
                  {SCORING_METHOD_CONFIG[currentData?.scoringMethod || '']?.label || '-'}
                </p>
              )}
            </div>
            <div>
              <Label className="text-muted-foreground">价格红线</Label>
              {isEditing ? (
                <Input
                  type="number"
                  data-testid="bidding-price-limit-input"
                  value={currentData?.priceLimit || ''}
                  onChange={(e) => setEditedData({ ...editedData, priceLimit: e.target.value })}
                  placeholder="请输入价格红线"
                  className="mt-1"
                />
              ) : (
                <p className="mt-1 font-medium">
                  {currentData?.priceLimit ? `¥${Number(currentData.priceLimit).toLocaleString()}` : '-'}
                </p>
              )}
            </div>
            <div>
              <Label className="text-muted-foreground">资金来源</Label>
              {isEditing ? (
                <Select
                  value={currentData?.fundSource || ''}
                  onValueChange={(value) => setEditedData({ ...editedData, fundSource: value })}
                >
                  <SelectTrigger data-testid="bidding-fund-source-trigger" className="mt-1">
                    <SelectValue placeholder="请选择资金来源" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(FUND_SOURCE_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="mt-1 font-medium">
                  {FUND_SOURCE_CONFIG[currentData?.fundSource || '']?.label || '-'}
                </p>
              )}
            </div>
            <div>
              <Label className="text-muted-foreground">投标截止时间</Label>
              {isEditing ? (
                <Input
                  type="datetime-local"
                  data-testid="bidding-deadline-input"
                  value={currentData?.bidDeadline || ''}
                  onChange={(e) => setEditedData({ ...editedData, bidDeadline: e.target.value })}
                  className="mt-1"
                />
              ) : (
                <p className="mt-1 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  {formatDateDisplayValue(currentData?.bidDeadline)}
                </p>
              )}
            </div>
            <div>
              <Label className="text-muted-foreground">开标日期</Label>
              {isEditing ? (
                <Input
                  type="datetime-local"
                  data-testid="bidding-open-date-input"
                  value={currentData?.bidOpenDate || ''}
                  onChange={(e) => setEditedData({ ...editedData, bidOpenDate: e.target.value })}
                  className="mt-1"
                />
              ) : (
                <p className="mt-1 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  {formatDateDisplayValue(currentData?.bidOpenDate)}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 投标报价 */}
      <Card>
        <CardHeader>
          <CardTitle>投标报价</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label className="text-muted-foreground">投标报价</Label>
              {isEditing ? (
                <Input
                  type="number"
                  data-testid="bidding-bid-price-input"
                  value={currentData?.bidPrice || ''}
                  onChange={(e) => setEditedData({ ...editedData, bidPrice: e.target.value })}
                  placeholder="请输入投标报价"
                  className="mt-1"
                />
              ) : (
                <p className="mt-1 text-2xl font-bold">
                  {currentData?.bidPrice ? `¥${Number(currentData.bidPrice).toLocaleString()}` : '-'}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 投标保证金 */}
      <Card>
        <CardHeader>
          <CardTitle>投标保证金</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <Label className="text-muted-foreground">保证金金额</Label>
              {isEditing ? (
                <Input
                  type="number"
                  value={currentData?.bidBondAmount || ''}
                  onChange={(e) => setEditedData({ ...editedData, bidBondAmount: e.target.value })}
                  placeholder="请输入保证金金额"
                  className="mt-1"
                />
              ) : (
                <p className="mt-1 font-medium">
                  {currentData?.bidBondAmount ? `¥${Number(currentData.bidBondAmount).toLocaleString()}` : '-'}
                </p>
              )}
            </div>
            <div>
              <Label className="text-muted-foreground">保证金状态</Label>
              {isEditing ? (
                <Select
                  value={currentData?.bidBondStatus || 'unpaid'}
                  onValueChange={(value) => setEditedData({ ...editedData, bidBondStatus: value })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(BOND_STATUS_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="mt-1">
                  <Badge className={BOND_STATUS_CONFIG[currentData?.bidBondStatus || 'unpaid']?.color}>
                    {BOND_STATUS_CONFIG[currentData?.bidBondStatus || 'unpaid']?.label}
                  </Badge>
                </div>
              )}
            </div>
            <div>
              <Label className="text-muted-foreground">缴纳日期</Label>
              {isEditing ? (
                <Input
                  type="date"
                  value={currentData?.bidBondPayDate || ''}
                  onChange={(e) => setEditedData({ ...editedData, bidBondPayDate: e.target.value })}
                  className="mt-1"
                />
              ) : (
                <p className="mt-1">{currentData?.bidBondPayDate || '-'}</p>
              )}
            </div>
            <div>
              <Label className="text-muted-foreground">退还日期</Label>
              {isEditing ? (
                <Input
                  type="date"
                  value={currentData?.bidBondReturnDate || ''}
                  onChange={(e) => setEditedData({ ...editedData, bidBondReturnDate: e.target.value })}
                  className="mt-1"
                />
              ) : (
                <p className="mt-1">{currentData?.bidBondReturnDate || '-'}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 评审意见 */}
      <Card>
        <CardHeader>
          <CardTitle>评审意见</CardTitle>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <Textarea
              value={currentData?.reviewComments || ''}
              onChange={(e) => setEditedData({ ...editedData, reviewComments: e.target.value })}
              placeholder="请输入评审意见"
              rows={4}
            />
          ) : (
            <p className="text-sm">{currentData?.reviewComments || '暂无评审意见'}</p>
          )}
        </CardContent>
      </Card>

      {/* 保存按钮 */}
      {isEditing && (
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => {
            setEditedData(data || {});
            setIsEditing(false);
          }}>
            取消
          </Button>
          <Button data-testid="bidding-save-button" onClick={handleSave} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? '保存中...' : '保存更改'}
          </Button>
        </div>
      )}
    </div>
  );
}
