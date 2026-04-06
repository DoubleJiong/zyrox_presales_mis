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
  Trophy,
  XCircle,
  DollarSign,
  Calendar,
  Save,
  FileText,
  Building2,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';

interface ProjectArchiveProps {
  projectId: number;
  readOnly?: boolean;
}

interface ProjectData {
  id: number;
  projectName: string;
  bidResult: string | null;
  actualAmount: string | null;
  winCompetitor: string | null;
  loseReason: string | null;
  contractNumber: string | null;
  lessonsLearned: string | null;
}

const BID_RESULT_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  won: { label: '已中标', color: 'bg-green-100 text-green-600', icon: Trophy },
  lost: { label: '已丢标', color: 'bg-red-100 text-red-600', icon: XCircle },
  pending: { label: '待定', color: 'bg-gray-100 text-gray-600', icon: AlertCircle },
};

export function ProjectArchive({ projectId, readOnly = false }: ProjectArchiveProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [project, setProject] = useState<ProjectData | null>(null);
  const [editedData, setEditedData] = useState<Partial<ProjectData>>({});
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchProjectData();
  }, [projectId]);

  useEffect(() => {
    if (readOnly) {
      setIsEditing(false);
    }
  }, [readOnly]);

  const fetchProjectData = async () => {
    try {
      const { data: result } = await apiClient.get<{ success: boolean; data?: ProjectData } | ProjectData>(`/api/projects/${projectId}`);
      const projectData = (result as any).data || result;
      setProject(projectData);
      setEditedData(projectData);
    } catch (error) {
      console.error('Failed to fetch project data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: result, status } = await apiClient.put<{ success: boolean; data: ProjectData; error?: string }>(`/api/projects/${projectId}`, editedData);
      if (status === 200) {
        const projectData = (result as any).data || result;
        setProject(projectData);
        setIsEditing(false);
        toast({ title: '保存成功', description: '归档信息已更新' });
      } else {
        toast({ title: '保存失败', description: extractErrorMessage((result as any).error, '保存失败'), variant: 'destructive' });
      }
    } catch (error) {
      console.error('Failed to save project data:', error);
      toast({ title: '保存失败', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount: string | null) => {
    if (!amount) return '-';
    return `¥${Number(amount).toLocaleString()}`;
  };

  if (loading) {
    return <div className="flex items-center justify-center h-48">加载中...</div>;
  }

  if (!project) {
    return <div className="flex items-center justify-center h-48">项目不存在</div>;
  }

  const currentData = isEditing ? editedData : project;
  const bidResultInfo = BID_RESULT_CONFIG[currentData?.bidResult || 'pending'];

  return (
    <div className="space-y-6">
      {/* 项目结果 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                项目结果
              </CardTitle>
              <CardDescription>项目中标/丢标归档信息</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={bidResultInfo.color}>
                {bidResultInfo.label}
              </Badge>
              {!readOnly && (
                <Button
                  data-testid="project-archive-edit-button"
                  variant={isEditing ? 'outline' : 'default'}
                  size="sm"
                  onClick={() => {
                    if (isEditing) {
                      setEditedData(project);
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
            {/* 投标结果 */}
            <div>
              <Label className="text-muted-foreground">投标结果</Label>
              {isEditing ? (
                <Select
                  value={currentData?.bidResult || 'pending'}
                  onValueChange={(value) => setEditedData({ ...editedData, bidResult: value })}
                >
                  <SelectTrigger className="mt-1" data-testid="project-archive-bid-result-trigger">
                    <SelectValue placeholder="选择投标结果" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="won">已中标</SelectItem>
                    <SelectItem value="lost">已丢标</SelectItem>
                    <SelectItem value="pending">待定</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="mt-1 flex items-center gap-2">
                  {bidResultInfo.icon && <bidResultInfo.icon className="h-5 w-5" />}
                  <span className="font-medium">{bidResultInfo.label}</span>
                </div>
              )}
            </div>

            {/* 中标金额 */}
            {(currentData?.bidResult === 'won' || !isEditing) && (
              <div>
                <Label className="text-muted-foreground">中标金额</Label>
                {isEditing ? (
                  <Input
                    data-testid="project-archive-actual-amount-input"
                    type="number"
                    value={currentData?.actualAmount || ''}
                    onChange={(e) => setEditedData({ ...editedData, actualAmount: e.target.value })}
                    placeholder="请输入中标金额"
                    className="mt-1"
                  />
                ) : (
                  <p className="mt-1 text-2xl font-bold flex items-center gap-2 text-green-600">
                    <DollarSign className="h-5 w-5" />
                    {formatCurrency(currentData?.actualAmount)}
                  </p>
                )}
              </div>
            )}

            {/* 合同编号 */}
            {(currentData?.bidResult === 'won' || !isEditing) && (
              <div>
                <Label className="text-muted-foreground">合同编号</Label>
                {isEditing ? (
                  <Input
                    data-testid="project-archive-contract-number-input"
                    value={currentData?.contractNumber || ''}
                    onChange={(e) => setEditedData({ ...editedData, contractNumber: e.target.value })}
                    placeholder="请输入合同编号"
                    className="mt-1"
                  />
                ) : (
                  <p className="mt-1 font-medium">{currentData?.contractNumber || '-'}</p>
                )}
              </div>
            )}

            {/* 中标竞争对手（丢标时显示） */}
            {(currentData?.bidResult === 'lost' || (!isEditing && currentData?.winCompetitor)) && (
              <div>
                <Label className="text-muted-foreground">中标竞争对手</Label>
                {isEditing ? (
                  <Input
                    data-testid="project-archive-win-competitor-input"
                    value={currentData?.winCompetitor || ''}
                    onChange={(e) => setEditedData({ ...editedData, winCompetitor: e.target.value })}
                    placeholder="请输入中标竞争对手"
                    className="mt-1"
                  />
                ) : (
                  <div className="mt-1 flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{currentData?.winCompetitor || '-'}</span>
                  </div>
                )}
              </div>
            )}

            {/* 落标原因（丢标时显示） */}
            {(currentData?.bidResult === 'lost' || (!isEditing && currentData?.loseReason)) && (
              <div className="md:col-span-2">
                <Label className="text-muted-foreground">落标原因</Label>
                {isEditing ? (
                  <Textarea
                    data-testid="project-archive-lose-reason-textarea"
                    value={currentData?.loseReason || ''}
                    onChange={(e) => setEditedData({ ...editedData, loseReason: e.target.value })}
                    placeholder="请输入落标原因分析"
                    className="mt-1"
                    rows={3}
                  />
                ) : (
                  <p className="mt-1">{currentData?.loseReason || '-'}</p>
                )}
              </div>
            )}
          </div>

          {isEditing && (
            <div className="flex gap-2 mt-6 pt-4 border-t">
              <Button data-testid="project-archive-save-button" onClick={handleSave} disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? '保存中...' : '保存更改'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 经验总结 */}
      <Card>
        <CardHeader>
          <CardTitle>经验总结</CardTitle>
          <CardDescription>项目经验教训总结</CardDescription>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <Textarea
                data-testid="project-archive-lessons-learned-textarea"
              value={currentData?.lessonsLearned || ''}
              onChange={(e) => setEditedData({ ...editedData, lessonsLearned: e.target.value })}
              placeholder="请输入项目经验总结..."
              rows={6}
            />
          ) : (
            <div className="whitespace-pre-wrap">
              {currentData?.lessonsLearned || '暂无经验总结'}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
