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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ProjectSolutions } from '@/components/project/project-solutions';
import { UserSelect } from '@/components/ui/user-select';
import { apiClient } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { 
  Users, 
  Plus, 
  X, 
  Search,
  MapPin,
  Paperclip,
  MessageSquare,
  FileStack,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TeamMember {
  id: number;
  userId: number;
  memberId: number;
  name: string;
  role: string;
  roleCode: string;
  stage?: string;
}

interface User {
  id: number;
  username: string;
  realName: string;
  email?: string;
  department?: string;
}

interface FollowRecord {
  id: number;
  followType: string;
  followContent: string;
  followTime: string;
  followerName: string;
  isBusinessTrip?: boolean;
  attachmentUrl?: string | null;
  attachments?: Array<{ name: string; url?: string | null; size: number }>;
}

function formatAttachmentSize(size: number) {
  if (!size) return '-';
  if (size >= 1024 * 1024) return `${(size / 1024 / 1024).toFixed(2)} MB`;
  if (size >= 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${size} B`;
}

interface ProjectPlanningTabProps {
  projectId: number;
  readOnly?: boolean;
  canManageMembers?: boolean;
  onSolutionChange?: () => void;
}

export function ProjectPlanningTab({ projectId, readOnly = false, canManageMembers = !readOnly, onSolutionChange }: ProjectPlanningTabProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const defaultFollowType = '电话';
  
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [memberRole, setMemberRole] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [addingMember, setAddingMember] = useState(false);
  
  // 移除成员确认对话框状态
  const [removeMemberDialogOpen, setRemoveMemberDialogOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<TeamMember | null>(null);
  
  const [followRecords, setFollowRecords] = useState<FollowRecord[]>([]);
  const [followDisplayCount, setFollowDisplayCount] = useState(5);
  const [addFollowDialogOpen, setAddFollowDialogOpen] = useState(false);
  const [addingFollow, setAddingFollow] = useState(false);
  const [newFollow, setNewFollow] = useState({
    followerId: user?.id ?? null as number | null,
    followerName: user?.realName || '',
    followTime: new Date().toISOString().slice(0, 16),
    followType: defaultFollowType,
    followContent: '',
    attachment: null as File | null,
    isBusinessTrip: false,
    tripStartDate: '',
    tripEndDate: '',
    tripCost: ''
  });
  
  const FOLLOWS_PER_PAGE = 5;
  const followMemberOptions = teamMembers.length > 0
    ? teamMembers
    : user
      ? [{
          id: user.id,
          memberId: user.id,
          userId: user.id,
          name: user.realName,
          role: '当前用户',
          roleCode: 'self',
        } satisfies TeamMember]
      : [];
  
  useEffect(() => {
    fetchTeamMembers();
    fetchUsers();
    fetchFollowRecords();
  }, [projectId]);
  
  const fetchTeamMembers = async () => {
    console.log('[ProjectPlanningTab] projectId:', projectId);
    try {
      // 只获取项目策划阶段的成员（planning 或 all）
      const { data: result } = await apiClient.get(`/api/projects/${projectId}/members?stage=planning`);
      const members = (result as any)?.data?.members || [];
      console.log('[ProjectPlanningTab] API返回成员:', members.length, '人');
      console.log('[ProjectPlanningTab] 成员详情:', members.map((m: any) => ({ name: m.userName, stage: m.stage })));
      if (Array.isArray(members)) {
        const teamMemberList: TeamMember[] = members.map((m: any) => ({
          id: m.userId,
          memberId: m.id,
          userId: m.userId,
          name: m.userName || `用户${m.userId}`,
          role: m.role === 'manager' ? '负责人' : m.role === 'supervisor' ? '主管' : '成员',
          roleCode: m.role,
          stage: m.stage,
        }));
        setTeamMembers(teamMemberList);
        
        const defaultFollower = teamMemberList.find(m => m.roleCode === 'manager') || teamMemberList[0];
        setNewFollow(prev => ({ 
          ...prev,
          followerId: defaultFollower?.userId ?? prev.followerId ?? user?.id ?? null,
          followerName: defaultFollower?.name || prev.followerName || user?.realName || '',
          followType: prev.followType || defaultFollowType,
        }));
      }
    } catch (error) {
      console.error('Failed to fetch team members:', error);
    }
  };

  useEffect(() => {
    if (!user) {
      return;
    }

    setNewFollow(prev => ({
      ...prev,
      followerId: prev.followerId ?? user.id,
      followerName: prev.followerName || user.realName,
      followType: prev.followType || defaultFollowType,
    }));
  }, [user]);
  
  const fetchUsers = async () => {
    try {
      const { data: result } = await apiClient.get<User[] | { data: User[] }>('/api/users');
      const data = (result as any).data || result;
      setAvailableUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const searchUsers = async (keyword: string) => {
    try {
      const url = keyword.trim()
        ? `/api/users?keyword=${encodeURIComponent(keyword.trim())}`
        : '/api/users';
      const { data: result } = await apiClient.get<User[] | { data: User[] }>(url);
      const data = (result as any).data || result;
      setAvailableUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };
  
  const fetchFollowRecords = async () => {
    try {
      const { data: result } = await apiClient.get(`/api/projects/${projectId}/follows`);
      const data = (result as any).data || [];
      if (Array.isArray(data)) {
        setFollowRecords(data);
      }
    } catch (error) {
      console.error('Failed to fetch follow records:', error);
    }
  };
  
  const handleAddMember = async () => {
    if (!selectedUserId || !memberRole) {
      toast({ title: '请填写完整信息', description: '请选择人员并指定角色', variant: 'destructive' });
      return;
    }

    if (teamMembers.some(m => m.userId === selectedUserId)) {
      toast({ title: '人员已存在', description: '该人员已是团队成员', variant: 'destructive' });
      return;
    }

    setAddingMember(true);
    try {
      const response = await apiClient.post(`/api/projects/${projectId}/members`, {
        userId: selectedUserId,
        role: memberRole,
        stage: 'planning',
      });
      if ((response.data as any)?.success) {
        await fetchTeamMembers();
        const message = (response.data as any)?.message || ((response.data as any)?.updated ? '成员阶段已更新' : '团队成员已添加');
        toast({ title: '操作成功', description: message });
      } else {
        // API返回了错误
        const errorMsg = (response.data as any)?.error?.message || (response.data as any)?.error || '添加失败';
        toast({ title: '添加失败', description: errorMsg, variant: 'destructive' });
      }
    } catch (error: any) {
      // 处理axios错误
      const errorMsg = error.response?.data?.error?.message || error.response?.data?.error || error.message || '请稍后重试';
      toast({ title: '添加失败', description: errorMsg, variant: 'destructive' });
    } finally {
      setAddingMember(false);
      setSelectedUserId(null);
      setMemberRole('');
      setAddMemberDialogOpen(false);
    }
  };
  
  // 打开移除确认对话框
  const handleRemoveMemberClick = (member: TeamMember) => {
    setMemberToRemove(member);
    setRemoveMemberDialogOpen(true);
  };
  
  // 确认移除成员
  const handleConfirmRemoveMember = async () => {
    if (!memberToRemove) return;
    
    try {
      const response = await apiClient.delete(`/api/projects/${projectId}/members?userId=${memberToRemove.userId}`);
      if ((response.data as any)?.success) {
        await fetchTeamMembers();
        toast({ title: '移除成功', description: '团队成员已移除' });
      }
    } catch (error: any) {
      toast({ title: '移除失败', description: error.message || '请稍后重试', variant: 'destructive' });
    } finally {
      setRemoveMemberDialogOpen(false);
      setMemberToRemove(null);
    }
  };
  
  const handleUpdateMemberRole = async (memberId: number, newRole: string) => {
    try {
      const response = await apiClient.put(`/api/projects/${projectId}/members`, {
        memberId,
        role: newRole,
      });
      if ((response.data as any)?.success) {
        await fetchTeamMembers();
        toast({ title: '更新成功', description: '成员角色已更新' });
      }
    } catch (error: any) {
      toast({ title: '更新失败', description: error.message || '请稍后重试', variant: 'destructive' });
    }
  };
  
  const handleAddFollow = async () => {
    // 验证必填字段并给出提示
    if (!newFollow.followerName) {
      toast({ title: '请选择跟进人', variant: 'destructive' });
      return;
    }
    if (!newFollow.followTime) {
      toast({ title: '请选择跟进时间', variant: 'destructive' });
      return;
    }
    if (!newFollow.followType) {
      toast({ title: '请选择跟进方式', variant: 'destructive' });
      return;
    }
    if (!newFollow.followContent || !newFollow.followContent.trim()) {
      toast({ title: '请填写跟进内容', variant: 'destructive' });
      return;
    }

    try {
      setAddingFollow(true);
      const formData = new FormData();
      formData.append('followType', newFollow.followType);
      formData.append('followContent', newFollow.followContent);
      formData.append('followTime', newFollow.followTime);
      formData.append('followerName', newFollow.followerName);
      formData.append('isBusinessTrip', newFollow.isBusinessTrip.toString());
      if (newFollow.isBusinessTrip) {
        formData.append('tripStartDate', newFollow.tripStartDate);
        formData.append('tripEndDate', newFollow.tripEndDate);
        formData.append('tripCost', newFollow.tripCost);
      }
      if (newFollow.attachment) {
        formData.append('attachment', newFollow.attachment);
      }

      const response = await fetch(`/api/projects/${projectId}/follows`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok && result.success) {
        await fetchFollowRecords();
        // 重置表单，默认选择第一个团队成员（优先负责人）
        const defaultMember = teamMembers.find(m => m.roleCode === 'manager') || teamMembers[0];
        setNewFollow({
          followerId: defaultMember?.userId || user?.id || null,
          followerName: defaultMember?.name || user?.realName || '',
          followTime: new Date().toISOString().slice(0, 16),
          followType: defaultFollowType,
          followContent: '',
          attachment: null,
          isBusinessTrip: false,
          tripStartDate: '',
          tripEndDate: '',
          tripCost: ''
        });
        setAddFollowDialogOpen(false);
        toast({ title: '添加成功', description: '跟进记录已添加' });
      } else {
        // 处理错误情况
        const errorMsg = result.error?.message || result.error || '添加失败，请重试';
        toast({ title: '添加失败', description: errorMsg, variant: 'destructive' });
      }
    } catch (error) {
      console.error('Failed to add follow record:', error);
      toast({ title: '添加失败', variant: 'destructive' });
    } finally {
      setAddingFollow(false);
    }
  };
  
  const handleDeleteFollowRecord = async (recordId: number) => {
    if (!confirm('确定要删除该跟进记录吗？')) return;
    
    try {
      const response = await apiClient.delete(`/api/projects/${projectId}/follows?followId=${recordId}`);
      if ((response.data as any)?.success) {
        await fetchFollowRecords();
        toast({ title: '删除成功' });
      }
    } catch (error) {
      toast({ title: '删除失败', variant: 'destructive' });
    }
  };
  
  const currentTeamMemberIds = teamMembers.map(m => m.userId);
  const availableTeamMembers = availableUsers.filter(user => !currentTeamMemberIds.includes(user.id));
  const memberManagementReadOnly = readOnly || !canManageMembers;

  return (
    <div className="space-y-6">
      {/* 项目策划团队 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                项目策划团队
              </CardTitle>
              <CardDescription>负责商机跟进和方案设计的团队成员</CardDescription>
            </div>
            {!memberManagementReadOnly && (
              <Button data-testid="planning-add-member-button" size="sm" variant="outline" onClick={() => setAddMemberDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                添加成员
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {teamMembers.length > 0 ? (
            <div className="space-y-3">
              {teamMembers.map((member) => (
                <div
                  key={member.id}
                  data-testid="planning-team-member-row"
                  data-member-name={member.name}
                  className="flex items-center gap-3 p-3 border rounded-lg"
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-medium">{member.name.charAt(0)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{member.name}</div>
                  </div>
                  {!memberManagementReadOnly ? (
                    <>
                      <Select
                        value={member.roleCode}
                        onValueChange={(value) => handleUpdateMemberRole(member.memberId, value)}
                      >
                        <SelectTrigger data-testid={`planning-member-role-trigger-${member.memberId}`} className="w-24 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="manager">负责人</SelectItem>
                          <SelectItem value="supervisor">主管</SelectItem>
                          <SelectItem value="member">成员</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        data-testid={`planning-member-remove-button-${member.userId}`}
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleRemoveMemberClick(member)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <Badge variant="outline">{member.role}</Badge>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>暂无团队成员</p>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* 跟进记录 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                跟进记录
              </CardTitle>
              <CardDescription>商机跟进和客户沟通记录</CardDescription>
            </div>
            {!readOnly && (
              <Button data-testid="planning-add-follow-button" size="sm" variant="outline" onClick={() => setAddFollowDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                添加记录
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {followRecords.length > 0 ? (
            <div className="relative pl-8 space-y-8">
              <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-border" />
              
              {followRecords.slice(0, followDisplayCount).map((record, index) => (
                <div key={index} data-testid="planning-follow-record-item" data-follow-content={record.followContent} className="relative">
                  <div className="absolute -left-5 w-4 h-4 rounded-full bg-primary border-4 border-background" />
                  
                  <div className="bg-muted/30 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{record.followType}</Badge>
                        {record.isBusinessTrip && (
                          <Badge variant="secondary" className="text-xs">
                            <MapPin className="h-3 w-3 mr-1" />
                            出差
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {record.followTime}
                        </span>
                        {!readOnly && (
                          <Button
                            data-testid={`planning-follow-delete-button-${record.id}`}
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteFollowRecord(record.id)}
                            title="删除"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <p className="text-sm mb-2 line-clamp-3 whitespace-pre-wrap">{record.followContent}</p>
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-muted-foreground">
                        跟进人：{record.followerName}
                      </div>
                      {record.attachments && record.attachments.length > 0 && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Paperclip className="h-3 w-3" />
                          <span>{record.attachments.length} 个附件</span>
                        </div>
                      )}
                    </div>
                    {record.attachments && record.attachments.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {record.attachments.map((attachment, attachmentIndex) => (
                          <div key={`${record.id}-${attachmentIndex}`} className="flex items-center gap-2 text-xs">
                            <Paperclip className="h-3 w-3 text-muted-foreground" />
                            {attachment.url || record.attachmentUrl ? (
                              <a
                                data-testid={`planning-follow-attachment-link-${record.id}-${attachmentIndex}`}
                                href={attachment.url || record.attachmentUrl || '#'}
                                target="_blank"
                                rel="noreferrer"
                                className="text-primary underline-offset-4 hover:underline"
                              >
                                {attachment.name}
                              </a>
                            ) : (
                              <span data-testid={`planning-follow-attachment-name-${record.id}-${attachmentIndex}`}>{attachment.name}</span>
                            )}
                            <span className="text-muted-foreground">({formatAttachmentSize(attachment.size)})</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {followRecords.length > followDisplayCount && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setFollowDisplayCount(prev => prev + FOLLOWS_PER_PAGE)}
                >
                  加载更多
                </Button>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>暂无跟进记录</p>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* 解决方案 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileStack className="h-5 w-5" />
            解决方案
          </CardTitle>
          <CardDescription>项目相关的解决方案和方案文档</CardDescription>
        </CardHeader>
        <CardContent>
          <ProjectSolutions 
            projectId={projectId} 
            onSolutionChange={onSolutionChange}
          />
        </CardContent>
      </Card>
      
      {/* 添加团队成员对话框 */}
      <Dialog open={addMemberDialogOpen} onOpenChange={setAddMemberDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>添加团队成员</DialogTitle>
            <DialogDescription>选择要添加到项目策划团队的成员</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>选择人员</Label>
              <UserSelect
                users={availableTeamMembers}
                value={selectedUserId}
                onChange={(v) => setSelectedUserId(v as number | null)}
                onSearchChange={(value) => {
                  setUserSearch(value);
                  searchUsers(value);
                }}
                placeholder="搜索并选择人员"
                className="planning-member-user-select-trigger"
              />
            </div>
            <div className="space-y-2">
              <Label>角色</Label>
              <Select value={memberRole} onValueChange={setMemberRole}>
                <SelectTrigger data-testid="planning-member-role-select-trigger">
                  <SelectValue placeholder="请选择角色" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manager">负责人</SelectItem>
                  <SelectItem value="supervisor">主管</SelectItem>
                  <SelectItem value="member">成员</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setAddMemberDialogOpen(false);
              setSelectedUserId(null);
              setMemberRole('');
              setUserSearch('');
            }}>
              取消
            </Button>
            <Button data-testid="planning-member-add-confirm-button" onClick={handleAddMember} disabled={addingMember}>
              {addingMember ? '添加中...' : '添加'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* 添加跟进记录对话框 */}
      <Dialog open={addFollowDialogOpen} onOpenChange={setAddFollowDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>添加跟进记录</DialogTitle>
            <DialogDescription>记录客户沟通和商机进展</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>跟进人</Label>
                <Select
                  value={newFollow.followerId?.toString() || ''}
                  onValueChange={(value) => {
                    const numericValue = value ? Number(value) : null;
                    const member = followMemberOptions.find(m => m.userId === numericValue);
                    setNewFollow({ 
                      ...newFollow, 
                      followerId: numericValue,
                      followerName: member?.name || '' 
                    });
                  }}
                >
                  <SelectTrigger data-testid="planning-follow-follower-trigger">
                    <SelectValue placeholder={followMemberOptions.length === 0 ? "请先添加团队成员" : "选择跟进人"} />
                  </SelectTrigger>
                  <SelectContent>
                    {followMemberOptions.length === 0 ? (
                      <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                        暂无团队成员，请先添加
                      </div>
                    ) : (
                      followMemberOptions.map((member) => (
                        <SelectItem key={member.userId} value={member.userId.toString()}>
                          {member.name}
                          {member.role && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              ({member.role})
                            </span>
                          )}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>跟进时间</Label>
                <Input
                  data-testid="planning-follow-time-input"
                  type="datetime-local"
                  value={newFollow.followTime}
                  onChange={(e) => setNewFollow({ ...newFollow, followTime: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>跟进方式</Label>
              <Select
                value={newFollow.followType}
                onValueChange={(value) => setNewFollow({ ...newFollow, followType: value })}
              >
                <SelectTrigger data-testid="planning-follow-type-trigger">
                  <SelectValue placeholder="选择跟进方式" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="电话">电话</SelectItem>
                  <SelectItem value="微信">微信</SelectItem>
                  <SelectItem value="邮件">邮件</SelectItem>
                  <SelectItem value="现场拜访">现场拜访</SelectItem>
                  <SelectItem value="会议">会议</SelectItem>
                  <SelectItem value="其他">其他</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>跟进内容</Label>
              <Textarea
                data-testid="planning-follow-content-textarea"
                value={newFollow.followContent}
                onChange={(e) => setNewFollow({ ...newFollow, followContent: e.target.value })}
                placeholder="请详细描述跟进内容..."
                rows={4}
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isBusinessTrip"
                data-testid="planning-follow-business-trip-checkbox"
                checked={newFollow.isBusinessTrip}
                onChange={(e) => setNewFollow({ ...newFollow, isBusinessTrip: e.target.checked })}
                className="rounded border-gray-300"
              />
              <Label htmlFor="isBusinessTrip">标记为出差</Label>
            </div>
            {newFollow.isBusinessTrip && (
              <div className="grid grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
                <div className="space-y-2">
                  <Label>出发日期</Label>
                  <Input
                    data-testid="planning-follow-trip-start-date-input"
                    type="date"
                    value={newFollow.tripStartDate}
                    onChange={(e) => setNewFollow({ ...newFollow, tripStartDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>返回日期</Label>
                  <Input
                    data-testid="planning-follow-trip-end-date-input"
                    type="date"
                    value={newFollow.tripEndDate}
                    onChange={(e) => setNewFollow({ ...newFollow, tripEndDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>差旅费用</Label>
                  <Input
                    data-testid="planning-follow-trip-cost-input"
                    type="number"
                    value={newFollow.tripCost}
                    onChange={(e) => setNewFollow({ ...newFollow, tripCost: e.target.value })}
                    placeholder="金额"
                  />
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="planning-follow-attachment-input">佐证附件</Label>
              <Input
                id="planning-follow-attachment-input"
                data-testid="planning-follow-attachment-input"
                type="file"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setNewFollow({ ...newFollow, attachment: file });
                }}
              />
              {newFollow.attachment && (
                <p className="text-xs text-muted-foreground">
                  已选择：{newFollow.attachment.name}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddFollowDialogOpen(false)}>
              取消
            </Button>
            <Button data-testid="planning-follow-add-confirm-button" onClick={handleAddFollow} disabled={addingFollow}>
              {addingFollow ? '添加中...' : '添加'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* 移除成员确认对话框 */}
      <AlertDialog open={removeMemberDialogOpen} onOpenChange={setRemoveMemberDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认移除成员</AlertDialogTitle>
            <AlertDialogDescription>
              确定要从项目策划团队中移除成员「{memberToRemove?.name}」吗？移除后该成员将无法访问此项目。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRemoveMember} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              确认移除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
