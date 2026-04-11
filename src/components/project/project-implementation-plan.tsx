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
  Wrench,
  Calendar,
  ClipboardList,
  ShieldCheck,
  AlertTriangle,
  MessageSquare,
} from 'lucide-react';

interface ProjectImplementationPlanProps {
  projectId: number;
  readOnly?: boolean;
}

interface ImplementationData {
  projectId: number;
  implementationStatus: string;
  deliveryPlan: string | null;
  implementationSteps: string | null;
  acceptanceCriteria: string | null;
  riskMitigation: string | null;
  progressNotes: string | null;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
  actualStartDate: string | null;
}

const IMPLEMENTATION_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  planning: { label: '规划中', color: 'bg-blue-100 text-blue-600' },
  in_progress: { label: '实施中', color: 'bg-amber-100 text-amber-600' },
  completed: { label: '已完成', color: 'bg-green-100 text-green-600' },
};

export function ProjectImplementationPlan({ projectId, readOnly = false }: ProjectImplementationPlanProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<ImplementationData | null>(null);
  const [editedData, setEditedData] = useState<Partial<ImplementationData>>({});
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchData();
  }, [projectId]);

  useEffect(() => {
    if (readOnly) {
      setIsEditing(false);
    }
  }, [readOnly]);

  const fetchData = async () => {
    try {
      const { data: result } = await apiClient.get<{ success: boolean; data: ImplementationData }>(
        `/api/projects/${projectId}/implementation`
      );
      if (result.success) {
        setData(result.data);
        setEditedData(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch implementation plan:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: result, status } = await apiClient.put<{ success: boolean; data: ImplementationData; error?: string }>(
        `/api/projects/${projectId}/implementation`,
        editedData
      );
      if (status === 200 && result.success) {
        setData(result.data);
        setIsEditing(false);
        toast({ title: '保存成功', description: '实施方案已更新' });
      } else {
        toast({
          title: '保存失败',
          description: extractErrorMessage((result as any).error, '保存失败'),
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Failed to save implementation plan:', error);
      toast({ title: '保存失败', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-48">加载中...</div>;
  }

  const currentData = isEditing ? editedData : data;
  const statusConfig = IMPLEMENTATION_STATUS_CONFIG[currentData?.implementationStatus || 'planning'];

  return (
    <div className="space-y-6">
      {/* 实施计划概览 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                实施方案
              </CardTitle>
              <CardDescription>项目交付计划与实施进度</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={statusConfig?.color}>
                {statusConfig?.label}
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
              {isEditing && (
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  {saving ? '保存中...' : '保存'}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <Label className="text-muted-foreground">实施状态</Label>
              {isEditing ? (
                <Select
                  value={currentData?.implementationStatus || 'planning'}
                  onValueChange={(value) => setEditedData({ ...editedData, implementationStatus: value })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(IMPLEMENTATION_STATUS_CONFIG).map(([key, cfg]) => (
                      <SelectItem key={key} value={key}>
                        {cfg.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="mt-1 font-medium">{statusConfig?.label || '-'}</p>
              )}
            </div>
            <div>
              <Label className="text-muted-foreground">计划开始日期</Label>
              {isEditing ? (
                <Input
                  type="date"
                  value={currentData?.plannedStartDate || ''}
                  onChange={(e) => setEditedData({ ...editedData, plannedStartDate: e.target.value || null })}
                  className="mt-1"
                />
              ) : (
                <p className="mt-1 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  {currentData?.plannedStartDate || '-'}
                </p>
              )}
            </div>
            <div>
              <Label className="text-muted-foreground">计划结束日期</Label>
              {isEditing ? (
                <Input
                  type="date"
                  value={currentData?.plannedEndDate || ''}
                  onChange={(e) => setEditedData({ ...editedData, plannedEndDate: e.target.value || null })}
                  className="mt-1"
                />
              ) : (
                <p className="mt-1 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  {currentData?.plannedEndDate || '-'}
                </p>
              )}
            </div>
            <div>
              <Label className="text-muted-foreground">实际开始日期</Label>
              {isEditing ? (
                <Input
                  type="date"
                  value={currentData?.actualStartDate || ''}
                  onChange={(e) => setEditedData({ ...editedData, actualStartDate: e.target.value || null })}
                  className="mt-1"
                />
              ) : (
                <p className="mt-1 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  {currentData?.actualStartDate || '-'}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 交付计划 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            交付计划
          </CardTitle>
          <CardDescription>项目整体交付思路与安排</CardDescription>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <Textarea
              value={currentData?.deliveryPlan || ''}
              onChange={(e) => setEditedData({ ...editedData, deliveryPlan: e.target.value || null })}
              placeholder="请描述项目交付计划，例如分阶段交付安排、里程碑节点等"
              rows={5}
            />
          ) : (
            <p className="text-sm whitespace-pre-wrap text-muted-foreground">
              {currentData?.deliveryPlan || '暂无交付计划'}
            </p>
          )}
        </CardContent>
      </Card>

      {/* 实施内容 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            实施内容
          </CardTitle>
          <CardDescription>具体实施步骤与内容安排</CardDescription>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <Textarea
              value={currentData?.implementationSteps || ''}
              onChange={(e) => setEditedData({ ...editedData, implementationSteps: e.target.value || null })}
              placeholder="请详细描述实施步骤，例如环境准备、系统部署、数据迁移、培训上线等"
              rows={6}
            />
          ) : (
            <p className="text-sm whitespace-pre-wrap text-muted-foreground">
              {currentData?.implementationSteps || '暂无实施内容'}
            </p>
          )}
        </CardContent>
      </Card>

      {/* 验收标准 & 风险应对 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              验收标准
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <Textarea
                value={currentData?.acceptanceCriteria || ''}
                onChange={(e) => setEditedData({ ...editedData, acceptanceCriteria: e.target.value || null })}
                placeholder="请输入项目验收标准与条件"
                rows={5}
              />
            ) : (
              <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                {currentData?.acceptanceCriteria || '暂无验收标准'}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              风险应对
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <Textarea
                value={currentData?.riskMitigation || ''}
                onChange={(e) => setEditedData({ ...editedData, riskMitigation: e.target.value || null })}
                placeholder="请描述已识别的风险及应对措施"
                rows={5}
              />
            ) : (
              <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                {currentData?.riskMitigation || '暂无风险应对'}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 进度备注 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            进度备注
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <Textarea
              value={currentData?.progressNotes || ''}
              onChange={(e) => setEditedData({ ...editedData, progressNotes: e.target.value || null })}
              placeholder="请记录当前进度情况、阻碍事项等"
              rows={4}
            />
          ) : (
            <p className="text-sm whitespace-pre-wrap text-muted-foreground">
              {currentData?.progressNotes || '暂无进度备注'}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
