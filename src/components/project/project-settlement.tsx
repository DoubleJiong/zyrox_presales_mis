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
  Calculator,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  Save,
  CheckCircle,
  Archive,
  FileText,
  Users,
  MessageSquare,
} from 'lucide-react';

interface ProjectSettlementProps {
  projectId: number;
  readOnly?: boolean;
}

interface SettlementData {
  projectId: number;
  settlementAmount: string | null;
  settlementDate: string | null;
  totalRevenue: string | null;
  totalCost: string | null;
  grossProfit: string | null;
  grossMargin: string | null;
  teamBonus: string | null;
  projectReview: string | null;
  lessonsLearned: string | null;
  customerFeedback: string | null;
  archiveStatus: string;
  archivedAt: string | null;
  archivedBy: number | null;
}

const ARCHIVE_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  unarchived: { label: '未归档', color: 'bg-gray-100 text-gray-600' },
  archived: { label: '已归档', color: 'bg-green-100 text-green-600' },
};

export function ProjectSettlement({ projectId, readOnly = false }: ProjectSettlementProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<SettlementData | null>(null);
  const [editedData, setEditedData] = useState<Partial<SettlementData>>({});
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchSettlementData();
  }, [projectId]);

  useEffect(() => {
    if (readOnly) {
      setIsEditing(false);
    }
  }, [readOnly]);

  const fetchSettlementData = async () => {
    try {
      const { data: result } = await apiClient.get<{ success: boolean; data: SettlementData }>(`/api/projects/${projectId}/settlement`);
      if (result.success) {
        setData(result.data);
        setEditedData(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch settlement data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: result, status } = await apiClient.put<{ success: boolean; data: SettlementData; error?: string }>(`/api/projects/${projectId}/settlement`, editedData);
      if (status === 200 && result.success) {
        setData(result.data);
        setIsEditing(false);
        toast({ title: '保存成功', description: '结算信息已更新' });
      } else {
        toast({ title: '保存失败', description: extractErrorMessage((result as any).error, '保存失败'), variant: 'destructive' });
      }
    } catch (error) {
      console.error('Failed to save settlement data:', error);
      toast({ title: '保存失败', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // 自动计算毛利率
  const calculateGrossMargin = () => {
    const revenue = parseFloat(editedData.totalRevenue || '0');
    const profit = parseFloat(editedData.grossProfit || '0');
    if (revenue > 0) {
      const margin = ((profit / revenue) * 100).toFixed(2);
      setEditedData({ ...editedData, grossMargin: margin });
    }
  };

  // 自动计算毛利润
  const calculateGrossProfit = () => {
    const revenue = parseFloat(editedData.totalRevenue || '0');
    const cost = parseFloat(editedData.totalCost || '0');
    const profit = revenue - cost;
    setEditedData({
      ...editedData,
      grossProfit: profit.toString(),
    });
  };

  if (loading) {
    return <div className="flex items-center justify-center h-48">加载中...</div>;
  }

  const currentData = isEditing ? editedData : data;

  return (
    <div className="space-y-6">
      {/* 结算金额 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                结算信息
              </CardTitle>
              <CardDescription>项目结算金额和日期</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={ARCHIVE_STATUS_CONFIG[currentData?.archiveStatus || 'unarchived']?.color}>
                {ARCHIVE_STATUS_CONFIG[currentData?.archiveStatus || 'unarchived']?.label}
              </Badge>
              {!readOnly && (
                <Button
                  variant={isEditing ? 'outline' : 'default'}
                  size="sm"
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
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label className="text-muted-foreground">结算金额</Label>
              {isEditing ? (
                <Input
                  type="number"
                  value={currentData?.settlementAmount || ''}
                  onChange={(e) => setEditedData({ ...editedData, settlementAmount: e.target.value })}
                  placeholder="请输入结算金额"
                  className="mt-1"
                />
              ) : (
                <p className="mt-1 text-2xl font-bold flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-muted-foreground" />
                  {currentData?.settlementAmount ? `¥${Number(currentData.settlementAmount).toLocaleString()}` : '-'}
                </p>
              )}
            </div>
            <div>
              <Label className="text-muted-foreground">结算日期</Label>
              {isEditing ? (
                <Input
                  type="date"
                  value={currentData?.settlementDate || ''}
                  onChange={(e) => setEditedData({ ...editedData, settlementDate: e.target.value })}
                  className="mt-1"
                />
              ) : (
                <p className="mt-1 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  {currentData?.settlementDate || '-'}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 财务分析 */}
      <Card>
        <CardHeader>
          <CardTitle>财务分析</CardTitle>
          <CardDescription>项目收入、成本和利润分析</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-4 border rounded-lg">
              <Label className="text-muted-foreground text-sm">总收入</Label>
              {isEditing ? (
                <div className="mt-2">
                  <Input
                    type="number"
                    value={currentData?.totalRevenue || ''}
                    onChange={(e) => setEditedData({ ...editedData, totalRevenue: e.target.value })}
                    onBlur={calculateGrossProfit}
                    placeholder="请输入总收入"
                  />
                </div>
              ) : (
                <p className="mt-2 text-xl font-bold text-green-600 flex items-center gap-1">
                  <TrendingUp className="h-4 w-4" />
                  {currentData?.totalRevenue ? `¥${Number(currentData.totalRevenue).toLocaleString()}` : '-'}
                </p>
              )}
            </div>
            <div className="p-4 border rounded-lg">
              <Label className="text-muted-foreground text-sm">总成本</Label>
              {isEditing ? (
                <div className="mt-2">
                  <Input
                    type="number"
                    value={currentData?.totalCost || ''}
                    onChange={(e) => setEditedData({ ...editedData, totalCost: e.target.value })}
                    onBlur={calculateGrossProfit}
                    placeholder="请输入总成本"
                  />
                </div>
              ) : (
                <p className="mt-2 text-xl font-bold text-red-600 flex items-center gap-1">
                  <TrendingDown className="h-4 w-4" />
                  {currentData?.totalCost ? `¥${Number(currentData.totalCost).toLocaleString()}` : '-'}
                </p>
              )}
            </div>
            <div className="p-4 border rounded-lg">
              <Label className="text-muted-foreground text-sm">毛利润</Label>
              {isEditing ? (
                <div className="mt-2">
                  <Input
                    type="number"
                    value={currentData?.grossProfit || ''}
                    onChange={(e) => setEditedData({ ...editedData, grossProfit: e.target.value })}
                    onBlur={calculateGrossMargin}
                    placeholder="自动计算"
                  />
                </div>
              ) : (
                <p className="mt-2 text-xl font-bold text-blue-600">
                  {currentData?.grossProfit ? `¥${Number(currentData.grossProfit).toLocaleString()}` : '-'}
                </p>
              )}
            </div>
            <div className="p-4 border rounded-lg">
              <Label className="text-muted-foreground text-sm">毛利率</Label>
              {isEditing ? (
                <div className="mt-2">
                  <Input
                    type="number"
                    step="0.01"
                    value={currentData?.grossMargin || ''}
                    onChange={(e) => setEditedData({ ...editedData, grossMargin: e.target.value })}
                    placeholder="自动计算"
                  />
                </div>
              ) : (
                <p className="mt-2 text-xl font-bold text-purple-600">
                  {currentData?.grossMargin ? `${currentData.grossMargin}%` : '-'}
                </p>
              )}
            </div>
          </div>
          <div className="mt-6">
            <Label className="text-muted-foreground">团队奖金</Label>
            {isEditing ? (
              <Input
                type="number"
                value={currentData?.teamBonus || ''}
                onChange={(e) => setEditedData({ ...editedData, teamBonus: e.target.value })}
                placeholder="请输入团队奖金"
                className="mt-1 max-w-xs"
              />
            ) : (
              <p className="mt-1 text-lg font-medium">
                {currentData?.teamBonus ? `¥${Number(currentData.teamBonus).toLocaleString()}` : '-'}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 项目总结 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              项目总结
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <Textarea
                value={currentData?.projectReview || ''}
                onChange={(e) => setEditedData({ ...editedData, projectReview: e.target.value })}
                placeholder="请输入项目总结"
                rows={5}
              />
            ) : (
              <p className="text-sm whitespace-pre-wrap">{currentData?.projectReview || '暂无项目总结'}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              客户反馈
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <Textarea
                value={currentData?.customerFeedback || ''}
                onChange={(e) => setEditedData({ ...editedData, customerFeedback: e.target.value })}
                placeholder="请输入客户反馈"
                rows={5}
              />
            ) : (
              <p className="text-sm whitespace-pre-wrap">{currentData?.customerFeedback || '暂无客户反馈'}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 经验教训 */}
      <Card>
        <CardHeader>
          <CardTitle>经验教训</CardTitle>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <Textarea
              value={currentData?.lessonsLearned || ''}
              onChange={(e) => setEditedData({ ...editedData, lessonsLearned: e.target.value })}
              placeholder="请输入经验教训"
              rows={4}
            />
          ) : (
            <p className="text-sm whitespace-pre-wrap">{currentData?.lessonsLearned || '暂无经验教训'}</p>
          )}
        </CardContent>
      </Card>

      {/* 归档状态 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5" />
            归档信息
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            {isEditing ? (
              <Select
                value={currentData?.archiveStatus || 'unarchived'}
                onValueChange={(value) => setEditedData({ ...editedData, archiveStatus: value })}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ARCHIVE_STATUS_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Badge className={ARCHIVE_STATUS_CONFIG[currentData?.archiveStatus || 'unarchived']?.color}>
                {ARCHIVE_STATUS_CONFIG[currentData?.archiveStatus || 'unarchived']?.label}
              </Badge>
            )}
            {currentData?.archivedAt && (
              <span className="text-sm text-muted-foreground">
                归档时间：{currentData.archivedAt}
              </span>
            )}
          </div>
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
          <Button onClick={handleSave} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? '保存中...' : '保存更改'}
          </Button>
        </div>
      )}
    </div>
  );
}
