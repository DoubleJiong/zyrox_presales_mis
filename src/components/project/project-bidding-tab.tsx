'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
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
import { UserSelect } from '@/components/ui/user-select';
import { apiClient } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { 
  Users, 
  Plus, 
  X, 
  Search,
  Calendar,
  FileStack,
  Clock,
  Edit3,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface BiddingTeamMember {
  id: number;
  userId: number;
  memberId: number;
  name: string;
  role: string;
  roleCode: string;
}

interface User {
  id: number;
  username: string;
  realName: string;
  department?: string;
}

interface BiddingWorkLog {
  id: number;
  logDate: string;
  authorId: number;
  authorName?: string;
  workType: string;
  content: string;
  workHours: string | null;
}

interface BiddingProposal {
  id: number;
  name: string;
  type: string | null;
  status: string;
  progress: number;
  ownerId: number | null;
  ownerName?: string;
  deadline: string | null;
  notes: string | null;
}

interface ProjectBiddingTabProps {
  projectId: number;
  readOnly?: boolean;
  canManageMembers?: boolean;
}

const PROPOSAL_TYPE_OPTIONS = [
  { value: 'technical', label: '技术标书' },
  { value: 'commercial', label: '商务标书' },
  { value: 'qualification', label: '资格标书' },
];

const PROPOSAL_STATUS_OPTIONS = [
  { value: 'draft', label: '草稿', color: 'bg-gray-100 text-gray-800' },
  { value: 'in_progress', label: '进行中', color: 'bg-blue-100 text-blue-800' },
  { value: 'completed', label: '已完成', color: 'bg-green-100 text-green-800' },
  { value: 'submitted', label: '已提交', color: 'bg-purple-100 text-purple-800' },
];

const WORK_TYPE_OPTIONS = [
  '标书编制',
  '招标分析',
  '现场踏勘',
  '答疑澄清',
  '投标决策',
  '其他',
];

export function ProjectBiddingTab({ projectId, readOnly = false, canManageMembers = !readOnly }: ProjectBiddingTabProps) {
  const { toast } = useToast();
  
  // 招投标团队
  const [teamMembers, setTeamMembers] = useState<BiddingTeamMember[]>([]);
  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [memberRole, setMemberRole] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [addingMember, setAddingMember] = useState(false);
  
  // 移除成员确认对话框状态
  const [removeMemberDialogOpen, setRemoveMemberDialogOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<BiddingTeamMember | null>(null);
  
  // 投标工作日志
  const [workLogs, setWorkLogs] = useState<BiddingWorkLog[]>([]);
  const [workLogDialogOpen, setWorkLogDialogOpen] = useState(false);
  const [editingWorkLog, setEditingWorkLog] = useState<BiddingWorkLog | null>(null);
  const [workLogForm, setWorkLogForm] = useState({
    logDate: new Date().toISOString().slice(0, 10),
    workType: '',
    content: '',
    workHours: '',
  });
  const [savingWorkLog, setSavingWorkLog] = useState(false);
  
  // 投标方案
  const [proposals, setProposals] = useState<BiddingProposal[]>([]);
  const [proposalDialogOpen, setProposalDialogOpen] = useState(false);
  const [editingProposal, setEditingProposal] = useState<BiddingProposal | null>(null);
  const [proposalForm, setProposalForm] = useState({
    name: '',
    type: 'technical',
    status: 'draft',
    progress: 0,
    deadline: '',
    notes: '',
  });
  const [savingProposal, setSavingProposal] = useState(false);
  
  useEffect(() => {
    fetchTeamMembers();
    fetchUsers();
    fetchWorkLogs();
    fetchProposals();
  }, [projectId]);
  
  const fetchTeamMembers = async () => {
    console.log('[ProjectBiddingTab] projectId:', projectId);
    try {
      const { data: result } = await apiClient.get(`/api/projects/${projectId}/members?stage=bidding`);
      const members = (result as any)?.data?.members || [];
      console.log('[ProjectBiddingTab] API返回成员:', members.length, '人');
      console.log('[ProjectBiddingTab] 成员详情:', members.map((m: any) => ({ name: m.userName, stage: m.stage })));
      if (Array.isArray(members)) {
        const teamMemberList: BiddingTeamMember[] = members.map((m: any) => ({
          id: m.userId,
          memberId: m.id,
          userId: m.userId,
          name: m.userName || `用户${m.userId}`,
          role: m.role === 'manager' ? '负责人' : m.role === 'supervisor' ? '主管' : '成员',
          roleCode: m.role,
        }));
        setTeamMembers(teamMemberList);
      }
    } catch (error) {
      console.error('Failed to fetch team members:', error);
    }
  };
  
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
  
  const fetchWorkLogs = async () => {
    try {
      const { data: result } = await apiClient.get(`/api/projects/${projectId}/bidding-logs`);
      setWorkLogs((result as any)?.data || []);
    } catch (error) {
      console.error('Failed to fetch work logs:', error);
    }
  };
  
  const fetchProposals = async () => {
    try {
      const { data: result } = await apiClient.get(`/api/projects/${projectId}/bidding-proposals`);
      setProposals((result as any)?.data || []);
    } catch (error) {
      console.error('Failed to fetch proposals:', error);
    }
  };
  
  // 团队成员操作
  const handleAddMember = async () => {
    if (!selectedUserId || !memberRole) {
      toast({ title: '请填写完整信息', variant: 'destructive' });
      return;
    }

    if (teamMembers.some(m => m.userId === selectedUserId)) {
      toast({ title: '人员已存在', variant: 'destructive' });
      return;
    }

    setAddingMember(true);
    try {
      const response = await apiClient.post(`/api/projects/${projectId}/members`, {
        userId: selectedUserId,
        role: memberRole,
        stage: 'bidding',
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
  const handleRemoveMemberClick = (member: BiddingTeamMember) => {
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
  
  // 工作日志操作
  const handleSaveWorkLog = async () => {
    if (!workLogForm.logDate || !workLogForm.workType || !workLogForm.content) {
      toast({ title: '请填写完整信息', variant: 'destructive' });
      return;
    }
    
    setSavingWorkLog(true);
    try {
      const url = `/api/projects/${projectId}/bidding-logs${editingWorkLog ? `/${editingWorkLog.id}` : ''}`;
      const method = editingWorkLog ? 'put' : 'post';
      
      const response = await apiClient[method](url, workLogForm);
      
      if ((response.data as any)?.success) {
        toast({ title: editingWorkLog ? '更新成功' : '添加成功' });
        fetchWorkLogs();
        setWorkLogDialogOpen(false);
        resetWorkLogForm();
      }
    } catch (error) {
      toast({ title: '操作失败', variant: 'destructive' });
    } finally {
      setSavingWorkLog(false);
    }
  };
  
  const handleDeleteWorkLog = async (id: number) => {
    if (!confirm('确定要删除该工作日志吗？')) return;
    
    try {
      const response = await apiClient.delete(`/api/projects/${projectId}/bidding-logs/${id}`);
      if ((response.data as any)?.success) {
        toast({ title: '删除成功' });
        fetchWorkLogs();
      }
    } catch (error) {
      toast({ title: '删除失败', variant: 'destructive' });
    }
  };
  
  const resetWorkLogForm = () => {
    setWorkLogForm({
      logDate: new Date().toISOString().slice(0, 10),
      workType: '',
      content: '',
      workHours: '',
    });
    setEditingWorkLog(null);
  };
  
  // 投标方案操作
  const handleSaveProposal = async () => {
    if (!proposalForm.name) {
      toast({ title: '请填写标书名称', variant: 'destructive' });
      return;
    }
    
    setSavingProposal(true);
    try {
      const url = `/api/projects/${projectId}/bidding-proposals${editingProposal ? `/${editingProposal.id}` : ''}`;
      const method = editingProposal ? 'put' : 'post';
      
      const normalizedProposalForm = {
        ...proposalForm,
        progress: proposalForm.status === 'completed' ? 100 : proposalForm.progress,
      };

      const response = await apiClient[method](url, normalizedProposalForm);
      
      if ((response.data as any)?.success) {
        toast({ title: editingProposal ? '更新成功' : '创建成功' });
        fetchProposals();
        setProposalDialogOpen(false);
        resetProposalForm();
      }
    } catch (error) {
      toast({ title: '操作失败', variant: 'destructive' });
    } finally {
      setSavingProposal(false);
    }
  };
  
  const handleDeleteProposal = async (id: number) => {
    if (!confirm('确定要删除该投标方案吗？')) return;
    
    try {
      const response = await apiClient.delete(`/api/projects/${projectId}/bidding-proposals/${id}`);
      if ((response.data as any)?.success) {
        toast({ title: '删除成功' });
        fetchProposals();
      }
    } catch (error) {
      toast({ title: '删除失败', variant: 'destructive' });
    }
  };
  
  const resetProposalForm = () => {
    setProposalForm({
      name: '',
      type: 'technical',
      status: 'draft',
      progress: 0,
      deadline: '',
      notes: '',
    });
    setEditingProposal(null);
  };
  
  const currentTeamMemberIds = teamMembers.map(m => m.userId);
  const availableTeamMembers = availableUsers.filter(user => !currentTeamMemberIds.includes(user.id));
  const memberManagementReadOnly = readOnly || !canManageMembers;
  
  const getProposalStatusColor = (status: string) => {
    const option = PROPOSAL_STATUS_OPTIONS.find(o => o.value === status);
    return option?.color || 'bg-gray-100 text-gray-800';
  };
  
  const getProposalStatusLabel = (status: string) => {
    const option = PROPOSAL_STATUS_OPTIONS.find(o => o.value === status);
    return option?.label || status;
  };

  const getProposalDisplayProgress = (proposal: BiddingProposal) => {
    return proposal.status === 'completed' ? 100 : proposal.progress;
  };

  return (
    <div className="space-y-6">
      {/* 招投标团队 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                招投标团队
              </CardTitle>
              <CardDescription>负责投标文件编制和投标工作的团队</CardDescription>
            </div>
            {!memberManagementReadOnly && (
              <Button data-testid="bidding-add-member-button" size="sm" variant="outline" onClick={() => setAddMemberDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                添加成员
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {teamMembers.length > 0 ? (
            <div className="flex flex-wrap gap-3">
              {teamMembers.map((member) => (
                <div key={member.id} data-testid="bidding-team-member-row" data-member-name={member.name} className="flex items-center gap-2 px-3 py-2 border rounded-lg bg-muted/30">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-xs font-medium">{member.name.charAt(0)}</span>
                  </div>
                  <div>
                    <div className="text-sm font-medium">{member.name}</div>
                    <div className="text-xs text-muted-foreground">{member.role}</div>
                  </div>
                  {!memberManagementReadOnly && (
                    <Button
                      data-testid={`bidding-member-remove-button-${member.userId}`}
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => handleRemoveMemberClick(member)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>暂无招投标团队成员</p>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* 投标方案 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileStack className="h-5 w-5" />
                投标方案
              </CardTitle>
              <CardDescription>技术标、商务标、资格标等投标文件</CardDescription>
            </div>
            {!readOnly && (
              <Button size="sm" variant="outline" onClick={() => {
                
                resetProposalForm();
                setProposalDialogOpen(true);
              }} data-testid="bidding-create-proposal-button">
                <Plus className="mr-2 h-4 w-4" />
                创建投标方案
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {proposals.length > 0 ? (
            <div className="space-y-4">
              {proposals.map((proposal) => (
                <div key={proposal.id} data-testid="bidding-proposal-row" data-proposal-name={proposal.name} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <h4 className="font-medium">{proposal.name}</h4>
                      <Badge className={getProposalStatusColor(proposal.status)}>
                        {getProposalStatusLabel(proposal.status)}
                      </Badge>
                      {proposal.type && (
                        <Badge variant="outline">
                          {PROPOSAL_TYPE_OPTIONS.find(o => o.value === proposal.type)?.label || proposal.type}
                        </Badge>
                      )}
                    </div>
                    {!readOnly && (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          data-testid={`bidding-proposal-edit-button-${proposal.id}`}
                          onClick={() => {
                            setEditingProposal(proposal);
                            setProposalForm({
                              name: proposal.name,
                              type: proposal.type || 'technical',
                              status: proposal.status,
                              progress: proposal.progress,
                              deadline: proposal.deadline || '',
                              notes: proposal.notes || '',
                            });
                            setProposalDialogOpen(true);
                          }}
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          data-testid={`bidding-proposal-delete-button-${proposal.id}`}
                          className="text-destructive"
                          onClick={() => handleDeleteProposal(proposal.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">完成进度</span>
                      <span className="font-medium">{proposal.progress}%</span>
                    </div>
                    <Progress value={proposal.progress} className="h-2" />
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      {proposal.deadline && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          截止: {proposal.deadline}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileStack className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>暂无投标方案</p>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* 投标工作日志 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                投标工作日志
              </CardTitle>
              <CardDescription>投标过程中的工作记录</CardDescription>
            </div>
            {!readOnly && (
              <Button size="sm" variant="outline" onClick={() => {
                resetWorkLogForm();
                setWorkLogDialogOpen(true);
              }} data-testid="bidding-add-work-log-button">
                <Plus className="mr-2 h-4 w-4" />
                添加日志
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {workLogs.length > 0 ? (
            <div className="space-y-4">
              {workLogs.map((log) => (
                <div key={log.id} data-testid="bidding-work-log-row" data-work-log-content={log.content} className="border-l-2 border-primary/50 pl-4 py-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline">{log.workType}</Badge>
                        <span className="text-sm text-muted-foreground">{log.logDate}</span>
                        {log.workHours && (
                          <span className="text-xs text-muted-foreground">{log.workHours}h</span>
                        )}
                      </div>
                      <p className="text-sm">{log.content}</p>
                    </div>
                    {!readOnly && (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          data-testid={`bidding-work-log-edit-button-${log.id}`}
                          onClick={() => {
                            setEditingWorkLog(log);
                            setWorkLogForm({
                              logDate: log.logDate,
                              workType: log.workType,
                              content: log.content,
                              workHours: log.workHours || '',
                            });
                            setWorkLogDialogOpen(true);
                          }}
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          data-testid={`bidding-work-log-delete-button-${log.id}`}
                          className="text-destructive"
                          onClick={() => handleDeleteWorkLog(log.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>暂无工作日志</p>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* 添加团队成员对话框 */}
      <Dialog open={addMemberDialogOpen} onOpenChange={setAddMemberDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>添加招投标团队成员</DialogTitle>
            <DialogDescription>选择参与投标工作的人员</DialogDescription>
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
                className="bidding-member-user-select-trigger"
              />
            </div>
            <div className="space-y-2">
              <Label>角色</Label>
              <Select value={memberRole} onValueChange={setMemberRole}>
                <SelectTrigger data-testid="bidding-member-role-trigger">
                  <SelectValue placeholder="请选择角色" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manager">投标负责人</SelectItem>
                  <SelectItem value="supervisor">技术负责人</SelectItem>
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
            }}>
              取消
            </Button>
            <Button data-testid="bidding-member-add-confirm-button" onClick={handleAddMember} disabled={addingMember}>
              {addingMember ? '添加中...' : '添加'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* 工作日志对话框 */}
      <Dialog open={workLogDialogOpen} onOpenChange={setWorkLogDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingWorkLog ? '编辑工作日志' : '添加工作日志'}</DialogTitle>
            <DialogDescription>记录投标工作内容</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>工作日期</Label>
                <Input
                  type="date"
                  data-testid="bidding-work-log-date-input"
                  value={workLogForm.logDate}
                  onChange={(e) => setWorkLogForm({ ...workLogForm, logDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>工作类型</Label>
                <Select
                  value={workLogForm.workType}
                  onValueChange={(value) => setWorkLogForm({ ...workLogForm, workType: value })}
                >
                  <SelectTrigger data-testid="bidding-work-log-type-trigger">
                    <SelectValue placeholder="选择类型" />
                  </SelectTrigger>
                  <SelectContent>
                    {WORK_TYPE_OPTIONS.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>工作内容</Label>
              <Textarea
                data-testid="bidding-work-log-content-textarea"
                value={workLogForm.content}
                onChange={(e) => setWorkLogForm({ ...workLogForm, content: e.target.value })}
                placeholder="详细描述工作内容..."
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label>工时（小时）</Label>
              <Input
                type="number"
                data-testid="bidding-work-log-hours-input"
                value={workLogForm.workHours}
                onChange={(e) => setWorkLogForm({ ...workLogForm, workHours: e.target.value })}
                placeholder="请输入工时"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWorkLogDialogOpen(false)}>
              取消
            </Button>
            <Button data-testid="bidding-work-log-save-button" onClick={handleSaveWorkLog} disabled={savingWorkLog}>
              {savingWorkLog ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* 投标方案对话框 */}
      <Dialog open={proposalDialogOpen} onOpenChange={setProposalDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingProposal ? '编辑投标文件' : '创建投标文件'}</DialogTitle>
            <DialogDescription>管理标书编制进度</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>标书名称 *</Label>
              <Input
                data-testid="bidding-proposal-name-input"
                value={proposalForm.name}
                onChange={(e) => setProposalForm({ ...proposalForm, name: e.target.value })}
                placeholder="如：技术标书、商务标书"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>标书类型</Label>
                <Select
                  value={proposalForm.type}
                  onValueChange={(value) => setProposalForm({ ...proposalForm, type: value })}
                >
                  <SelectTrigger data-testid="bidding-proposal-type-trigger">
                    <SelectValue placeholder="选择类型" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROPOSAL_TYPE_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>状态</Label>
                <Select
                  value={proposalForm.status}
                  onValueChange={(value) => setProposalForm({
                    ...proposalForm,
                    status: value,
                    progress: value === 'completed' ? 100 : proposalForm.progress,
                  })}
                >
                  <SelectTrigger data-testid="bidding-proposal-status-trigger">
                    <SelectValue placeholder="选择状态" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROPOSAL_STATUS_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>完成进度 (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  data-testid="bidding-proposal-progress-input"
                  value={proposalForm.status === 'completed' ? 100 : proposalForm.progress}
                  disabled={proposalForm.status === 'completed'}
                  onChange={(e) => setProposalForm({ ...proposalForm, progress: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) })}
                />
              </div>
              <div className="space-y-2">
                <Label>截止日期</Label>
                <Input
                  type="date"
                  data-testid="bidding-proposal-deadline-input"
                  value={proposalForm.deadline}
                  onChange={(e) => setProposalForm({ ...proposalForm, deadline: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>备注</Label>
              <Textarea
                data-testid="bidding-proposal-notes-textarea"
                value={proposalForm.notes}
                onChange={(e) => setProposalForm({ ...proposalForm, notes: e.target.value })}
                placeholder="其他备注信息"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProposalDialogOpen(false)}>
              取消
            </Button>
            <Button data-testid="bidding-proposal-save-button" onClick={handleSaveProposal} disabled={savingProposal}>
              {savingProposal ? '保存中...' : '保存'}
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
              确定要从招投标团队中移除成员「{memberToRemove?.name}」吗？移除后该成员将无法访问此项目。
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
