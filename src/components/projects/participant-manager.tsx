'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { apiClient } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  Users,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Divide,
} from 'lucide-react';

interface Participant {
  id: number;
  presalesRecordId: number;
  userId: number;
  contributionPct: string;
  workHours: string | null;
  role: string;
  remarks: string | null;
  createdAt: string;
  userName: string;
  userEmail: string;
  userDepartment: string | null;
}

interface ParticipantManagerProps {
  projectId: number;
  recordId: number;
  onStatsUpdate?: () => void;
}

// 角色配置
const ROLE_CONFIG: Record<string, { label: string; color: string }> = {
  primary_contributor: { label: '主要贡献者', color: 'bg-blue-100 text-blue-700' },
  assistant: { label: '协助者', color: 'bg-gray-100 text-gray-700' },
  reviewer: { label: '审核者', color: 'bg-purple-100 text-purple-700' },
};

export function ParticipantManager({ projectId, recordId, onStatsUpdate }: ParticipantManagerProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [totalContribution, setTotalContribution] = useState(0);
  const [isValid, setIsValid] = useState(true);
  
  // 添加参与人对话框
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<Array<{ id: number; realName: string; department: string | null }>>([]);
  const [newParticipant, setNewParticipant] = useState({
    userId: 0,
    contributionPct: '10',
    workHours: '',
    role: 'assistant',
    remarks: '',
  });

  useEffect(() => {
    fetchParticipants();
    fetchUsers();
  }, [recordId]);

  const fetchParticipants = async () => {
    setLoading(true);
    try {
      const { data: result } = await apiClient.get<{
        participants: Participant[];
        totalContribution: number;
        isValid: boolean;
      }>(`/api/projects/${projectId}/presales/${recordId}/participants`);
      
      setParticipants(result.participants || []);
      setTotalContribution(result.totalContribution || 0);
      setIsValid(result.isValid);
    } catch (error) {
      console.error('Failed to fetch participants:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      // 只获取售前和解决方案工程师角色的人员
      const roleCodes = 'presale_manager,hq_presale_engineer,regional_presale_engineer,solution_engineer';
      const { data: result } = await apiClient.get<{ data: Array<{ id: number; realName: string; department: string | null }> } | Array<{ id: number; realName: string; department: string | null }>>(`/api/users?roleCodes=${roleCodes}`);
      const data = (result as any).data || result;
      setAvailableUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const handleAddParticipant = async () => {
    if (!newParticipant.userId) {
      toast({
        title: '请选择参与人',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const { data: result, status } = await apiClient.post<{ id: number }>(
        `/api/projects/${projectId}/presales/${recordId}/participants`,
        {
          userId: newParticipant.userId,
          contributionPct: newParticipant.contributionPct,
          workHours: newParticipant.workHours || null,
          role: newParticipant.role,
          remarks: newParticipant.remarks || null,
        }
      );

      if (status === 201 || (result as any).id) {
        toast({
          title: '添加成功',
          description: '参与人已添加',
        });
        setAddDialogOpen(false);
        setNewParticipant({
          userId: 0,
          contributionPct: '10',
          workHours: '',
          role: 'assistant',
          remarks: '',
        });
        fetchParticipants();
        onStatsUpdate?.();
      }
    } catch (error: any) {
      toast({
        title: '添加失败',
        description: error.message || '请稍后重试',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveParticipant = async (participantId: number) => {
    try {
      await apiClient.delete(`/api/projects/${projectId}/presales/${recordId}/participants/${participantId}`);
      toast({
        title: '删除成功',
        description: '参与人已移除',
      });
      fetchParticipants();
      onStatsUpdate?.();
    } catch (error) {
      toast({
        title: '删除失败',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateContribution = async (participantId: number, newPct: string) => {
    try {
      // 先删除再添加更新后的参与人
      const participant = participants.find(p => p.id === participantId);
      if (!participant) return;

      await apiClient.put(
        `/api/projects/${projectId}/presales/${recordId}/participants`,
        {
          participants: participants.map(p => 
            p.id === participantId 
              ? { ...p, contributionPct: newPct }
              : p
          ).map(p => ({
            userId: p.userId,
            contributionPct: p.contributionPct,
            workHours: p.workHours,
            role: p.role,
            remarks: p.remarks,
          }))
        }
      );
      fetchParticipants();
      onStatsUpdate?.();
    } catch (error) {
      toast({
        title: '更新失败',
        variant: 'destructive',
      });
    }
  };

  // 均分贡献百分比
  const handleEqualizeContribution = async () => {
    if (participants.length === 0) return;
    
    const equalPct = (100 / participants.length).toFixed(2);
    
    try {
      await apiClient.put(
        `/api/projects/${projectId}/presales/${recordId}/participants`,
        {
          participants: participants.map(p => ({
            userId: p.userId,
            contributionPct: equalPct,
            workHours: p.workHours,
            role: p.role,
            remarks: p.remarks,
          }))
        }
      );
      toast({
        title: '均分成功',
        description: `已将贡献百分比均分为 ${equalPct}%`,
      });
      fetchParticipants();
      onStatsUpdate?.();
    } catch (error) {
      toast({
        title: '均分失败',
        variant: 'destructive',
      });
    }
  };

  // 获取用户头像缩写
  const getAvatarFallback = (name: string) => {
    return name ? name.slice(0, 2) : '??';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 头部：标题和添加按钮 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">参与人 ({participants.length})</span>
        </div>
        <div className="flex items-center gap-2">
          {participants.length > 1 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleEqualizeContribution}
              title="将贡献百分比均分给所有参与人"
            >
              <Divide className="h-4 w-4 mr-1" />
              均分
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setAddDialogOpen(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            添加
          </Button>
        </div>
      </div>

      {/* 贡献百分比提示 */}
      {!isValid && (
        <div className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded-md text-amber-700 text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>贡献百分比总和为 {totalContribution.toFixed(1)}%，建议调整至 100%</span>
        </div>
      )}

      {/* 参与人列表 */}
      {participants.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground text-sm">
          暂无参与人，点击"添加"按钮添加
        </div>
      ) : (
        <ScrollArea className="max-h-[300px]">
          <div className="space-y-2">
            {participants.map((participant) => (
              <div
                key={participant.id}
                className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">
                    {getAvatarFallback(participant.userName)}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">
                      {participant.userName}
                    </span>
                    {participant.role && ROLE_CONFIG[participant.role] && (
                      <Badge variant="secondary" className={cn('text-xs', ROLE_CONFIG[participant.role].color)}>
                        {ROLE_CONFIG[participant.role].label}
                      </Badge>
                    )}
                  </div>
                  {participant.userDepartment && (
                    <span className="text-xs text-muted-foreground">
                      {participant.userDepartment}
                    </span>
                  )}
                </div>

                {/* 贡献百分比 */}
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={participant.contributionPct}
                    onChange={(e) => handleUpdateContribution(participant.id, e.target.value)}
                    className="w-16 h-8 text-center"
                    min="0"
                    max="100"
                    step="5"
                  />
                  <span className="text-xs text-muted-foreground">%</span>
                </div>

                {/* 工时 */}
                {participant.workHours && (
                  <span className="text-xs text-muted-foreground">
                    {participant.workHours}h
                  </span>
                )}

                {/* 删除按钮 */}
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => handleRemoveParticipant(participant.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}

      {/* 总计 */}
      {participants.length > 0 && (
        <div className="flex items-center justify-between pt-2 border-t text-sm">
          <span className="text-muted-foreground">贡献百分比总计</span>
          <div className="flex items-center gap-2">
            <span className={cn('font-medium', isValid ? 'text-green-600' : 'text-amber-600')}>
              {totalContribution.toFixed(1)}%
            </span>
            {isValid && (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            )}
          </div>
        </div>
      )}

      {/* 添加参与人对话框 */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>添加参与人</DialogTitle>
            <DialogDescription>
              为此服务记录添加参与人，贡献百分比总和应为100%
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* 选择用户 */}
            <div className="space-y-2">
              <Label>选择人员</Label>
              <Select
                value={newParticipant.userId.toString()}
                onValueChange={(value) => setNewParticipant(prev => ({ ...prev, userId: parseInt(value) }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="请选择人员" />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers
                    .filter(u => !participants.some(p => p.userId === u.id))
                    .map((user) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.realName}
                        {user.department && ` (${user.department})`}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* 贡献百分比 */}
            <div className="space-y-2">
              <Label>贡献百分比 (%)</Label>
              <Input
                type="number"
                value={newParticipant.contributionPct}
                onChange={(e) => setNewParticipant(prev => ({ ...prev, contributionPct: e.target.value }))}
                min="0"
                max="100"
                step="5"
              />
              <p className="text-xs text-muted-foreground">
                剩余可分配: {(100 - totalContribution).toFixed(1)}%
              </p>
            </div>

            {/* 角色 */}
            <div className="space-y-2">
              <Label>参与角色</Label>
              <Select
                value={newParticipant.role}
                onValueChange={(value) => setNewParticipant(prev => ({ ...prev, role: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="primary_contributor">主要贡献者</SelectItem>
                  <SelectItem value="assistant">协助者</SelectItem>
                  <SelectItem value="reviewer">审核者</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 工时 */}
            <div className="space-y-2">
              <Label>投入工时（小时，可选）</Label>
              <Input
                type="number"
                value={newParticipant.workHours}
                onChange={(e) => setNewParticipant(prev => ({ ...prev, workHours: e.target.value }))}
                placeholder="如：8"
                min="0"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleAddParticipant} disabled={saving}>
              {saving ? '添加中...' : '确认添加'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
