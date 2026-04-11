'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ProjectSolutions } from '@/components/project/project-solutions';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiClient } from '@/lib/api-client';
import { getProjectCustomerTypeOrIndustryLabel } from '@/lib/project-field-mappings';
import { 
  ArrowLeft, 
  Building2, 
  Calendar, 
  DollarSign, 
  FileText,
  Users,
  TrendingUp,
  AlertCircle,
  MapPin,
  Plus,
  ChevronRight,
  CheckCircle2,
  Clock,
  Target,
  Upload,
  Search,
  FileStack,
  Gavel,
  Calculator,
  Phone,
  ChevronDown,
  FileIcon,
  Sparkles,
  MessageSquare,
  Paperclip,
  X,
  Activity,
  Archive,
  Info,
  ClipboardList,
  Wrench,
} from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DictSelect } from '@/components/dictionary/dict-select';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useFileUpload } from '@/hooks/use-file-upload';
import { ProjectStageProgress } from '@/components/project-stage-progress';
import { PROJECT_STAGES } from '@/components/project-stage-progress';
import { ProjectInfoTab } from '@/components/project/project-info-tab';
import { ProjectPlanningTab } from '@/components/project/project-planning-tab';
import { ProjectBiddingTab } from '@/components/project/project-bidding-tab';
import { ProjectSettlement } from '@/components/project/project-settlement';
import { ProjectImplementationPlan } from '@/components/project/project-implementation-plan';
import { ProjectArchive } from '@/components/project/project-archive';
import { ProjectOverviewCard } from '@/components/project/project-overview-card';
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

import { StageSelector } from '@/components/projects/stage-selector';
import { PrioritySelector } from '@/components/projects/priority-selector';
import { ParticipantManager } from '@/components/projects/participant-manager';

// 导入工具函数
import { 
  ProjectStatus, 
  ProjectStage,
  PROJECT_STAGE_CONFIG 
} from '@/lib/utils/status-transitions';
import { 
  canAccessBiddingTab, 
  canAccessResultTab,
  canAccessSettlementTab,
  canAccessImplementationPlanTab,
  isProjectReadOnly 
} from '@/lib/utils/stage-transitions';
import { 
  getStageBgColor, 
  getPriorityBgColor,
  getPriorityLabel,
  getStageLabel,
  Priority
} from '@/lib/utils/project-colors';
import { getProjectTypeDisplayLabel, getProjectTypeOaCategoryLabel, normalizeProjectTypeCodes } from '@/lib/project-type-codec';

interface Project {
  id: number;
  projectCode: string;
  projectName: string;
  customerId: number | null;
  customerName: string;
  projectType: string;
  projectTypes?: string[];
  industry: string | null;
  region: string | null;
  description: string | null;
  managerId: number | null;
  projectStage: string | null; // V1.3: 项目阶段
  estimatedAmount: string | null;
  actualAmount: string | null;
  startDate: string | null;
  endDate: string | null;
  expectedDeliveryDate: string | null;
  status: string;
  priority: string;
  progress: number;
  risks: string | null;
  // V2.2: 新增字段
  bidResult?: string | null;
  winCompetitor?: string | null;
  loseReason?: string | null;
  contractNumber?: string | null;
  lessonsLearned?: string | null;
  expectedBiddingDate?: string | null;
  estimatedDuration?: number | null;
  urgencyLevel?: string | null;
  previousStatus?: string | null; // V2.1: 暂停前的状态
  holdReason?: string | null; // V2.1: 暂停原因
  cancelReason?: string | null; // V2.1: 取消原因
  createdAt: string;
  updatedAt: string;
  permissions?: {
    canRead: boolean;
    canWrite: boolean;
    canAdmin: boolean;
  };
}

interface TeamMember {
  id: number; // userId
  memberId: number; // 成员记录ID（用于更新角色）
  name: string;
  role: string; // 显示用的中文角色
  roleCode: string; // 原始角色代码
  stage?: string; // 所属阶段：planning/bidding/all
  avatar?: string;
}

interface FollowRecord {
  id: number;
  followType: string;
  followContent: string;
  followTime: string;
  followerName: string;
}

interface FollowRecord {
  id: number;
  followType: string;
  followContent: string;
  followTime: string;
  followerName: string;
}

interface User {
  id: number;
  realName: string;
  username: string;
  email: string;
  department: string | null;
}

// 跟进记录接口 - 与客户详情页严格统一
interface FollowRecord {
  id: number;
  followContent: string;
  followTime: string;
  followType: string;
  followerName: string;
  customerId?: number;
  customerName?: string;
  projectId?: number;
  projectName?: string;
  attachmentUrl?: string;
  attachmentName?: string;
  attachments?: Array<{
    name: string;
    size: number;
    type: string;
  }>;
  isBusinessTrip?: boolean; // 是否出差
  tripStartDate?: string; // 出差起始时间
  tripEndDate?: string; // 出差结束时间
  tripCost?: string; // 差旅成本
}

// 售前服务类型
interface ServiceType {
  id: number;
  serviceCode: string;
  serviceName: string;
}

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const { toast } = useToast();
  const [project, setProject] = useState<Project | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  // 编辑状态
  const [isEditing, setIsEditing] = useState(false);
  const [editedProject, setEditedProject] = useState<Partial<Project>>({});
  const [saving, setSaving] = useState(false);

  // 添加团队成员对话框
  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [memberRole, setMemberRole] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);

  // 跟进记录状态
  const [followRecords, setFollowRecords] = useState<FollowRecord[]>([]);
  const [followDisplayCount, setFollowDisplayCount] = useState(5); // 默认显示5条
  const FOLLOWS_PER_PAGE = 5; // 每次加载5条
  const [addFollowDialogOpen, setAddFollowDialogOpen] = useState(false);
  const [addingFollow, setAddingFollow] = useState(false);
  const [newFollow, setNewFollow] = useState({
    followerName: '',
    followTime: new Date().toISOString().slice(0, 16),
    followType: '',
    followContent: '',
    attachment: null as File | null,
    isBusinessTrip: false,
    tripStartDate: '',
    tripEndDate: '',
    tripCost: ''
  });
  
  // 分片上传相关状态
  const [attachmentUploading, setAttachmentUploading] = useState(false);
  const [attachmentUploadProgress, setAttachmentUploadProgress] = useState(0);
  const [uploadedAttachment, setUploadedAttachment] = useState<{
    key: string;
    name: string;
    size: number;
    type: string;
  } | null>(null);
  
  const { selectFile, upload, state: uploadState } = useFileUpload({
    targetPath: 'follows',
    chunkSize: 5 * 1024 * 1024, // 5MB
    concurrency: 3,
    onProgress: (progress) => {
      setAttachmentUploadProgress(progress.progress);
    },
    onSuccess: (result) => {
      setUploadedAttachment({
        key: result.key,
        name: result.file.name,
        size: result.file.size,
        type: result.file.type,
      });
      setAttachmentUploading(false);
    },
    onError: (error) => {
      console.error('Attachment upload failed:', error);
      setAttachmentUploading(false);
    },
  });
  
  // 执行分片上传
  const doChunkUpload = async (file: File) => {
    const valid = selectFile(file);
    if (valid) {
      setAttachmentUploading(true);
      setAttachmentUploadProgress(0);
      await upload();
    }
  };
  const [serviceTypes, setServiceTypes] = useState<{id: number; serviceCode: string; serviceName: string}[]>([]);
  const [solutionCount, setSolutionCount] = useState(0);
  
  // V2.1: 售前服务记录状态
  const [presalesRecords, setPresalesRecords] = useState<Array<{
    id: number;
    serviceName: string;
    serviceCode: string;
    staffName: string;
    startTime: string | null;
    workHours: string | null;
    totalWorkHours: string | null;
    participantCount: number;
    description: string | null;
    outcome: string | null;
    participants?: Array<{
      id: number;
      userId: number;
      contributionPct: string;
      workHours: string | null;
      role: string;
      userName: string;
    }>;
  }>>([]);
  const [participantManagerOpen, setParticipantManagerOpen] = useState(false);
  const [selectedRecordId, setSelectedRecordId] = useState<number | null>(null);

  useEffect(() => {
    fetchProjectDetail();
    fetchUsers();
    fetchTeamMembers();
    fetchFollowRecords();
    fetchServiceTypes();
    fetchSolutionCount();
    fetchPresalesRecords();
  }, [resolvedParams.id]);

  const fetchProjectDetail = async () => {
    try {
      const { data: result } = await apiClient.get<{ success: boolean; data?: Project } | Project>(`/api/projects/${resolvedParams.id}`);
      setProject((result as any).data || result);
    } catch (error) {
      console.error('Failed to fetch project:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data: result } = await apiClient.get<User[] | { data: User[] }>('/api/users');
      const data = (result as any).data || result;
      setAvailableUsers(Array.isArray(data) ? data : []);
      // 设置默认跟进人
      if (Array.isArray(data) && data.length > 0) {
        setNewFollow(prev => ({ ...prev, followerName: data[0].realName }));
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      const { data: result } = await apiClient.get<{ success: boolean; data: { members: Array<{ id: number; userId: number; role: string; stage?: string; userName?: string; userEmail?: string; user?: { id: number; username: string; realName: string; email: string } }> } }>(`/api/projects/${resolvedParams.id}/members`);
      // API 返回格式: { success: true, data: { members: [...] } }
      // 成员数据包含 userName 字段（API 直接返回）
      const members = (result as any).data?.members || [];
      console.log('[项目详情页] API返回成员数据:', members.length, '人');
      console.log('[项目详情页] 成员详情:', members.map((m: any) => ({ name: m.userName, stage: m.stage })));
      if (Array.isArray(members)) {
        // 转换为 TeamMember 格式，保存原始角色代码用于修改
        const teamMemberList: TeamMember[] = members.map((m: any) => ({
          id: m.userId,
          memberId: m.id, // 保存成员记录ID
          name: m.userName || m.user?.realName || `用户${m.userId}`,
          role: m.role === 'manager' ? '负责人' : m.role === 'supervisor' ? '主管' : '成员',
          roleCode: m.role, // 保存原始角色代码
          stage: m.stage || 'all', // 所属阶段
        }));
        setTeamMembers(teamMemberList);
      } else {
        setTeamMembers([]);
      }
    } catch (error) {
      console.error('Failed to fetch team members:', error);
      setTeamMembers([]);
    }
  };

  const fetchFollowRecords = async () => {
    try {
      const { data: result } = await apiClient.get<{ success: boolean; data: FollowRecord[] } | FollowRecord[]>(`/api/projects/${resolvedParams.id}/follows`);
      const data = (result as any).data || [];
      if (Array.isArray(data)) {
        setFollowRecords(data);
      } else {
        setFollowRecords([]);
      }
    } catch (error) {
      console.error('Failed to fetch follow records:', error);
      setFollowRecords([]);
    }
  };

  // 获取解决方案数量
  const fetchSolutionCount = async () => {
    try {
      const { data: result } = await apiClient.get<{ success: boolean; data: any[] }>(`/api/projects/${resolvedParams.id}/solutions`);
      if (result.success && Array.isArray(result.data)) {
        setSolutionCount(result.data.length);
      } else {
        setSolutionCount(0);
      }
    } catch (error) {
      console.error('Failed to fetch solution count:', error);
      setSolutionCount(0);
    }
  };

  // 删除跟进记录
  const handleDeleteFollowRecord = async (followId: number) => {
    if (!confirm('确定要删除这条跟进记录吗？')) return;
    
    try {
      const response = await fetch(`/api/projects/${resolvedParams.id}/follows?followId=${followId}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: '删除成功',
          description: '跟进记录已删除',
        });
        fetchFollowRecords();
      } else {
        // API 返回的错误格式: { success: false, error: { code, message } }
        const errorMsg = result.error?.message || (typeof result.error === 'string' ? result.error : '删除失败，请稍后重试');
        toast({
          variant: 'destructive',
          title: '删除失败',
          description: errorMsg,
        });
      }
    } catch (error) {
      console.error('Failed to delete follow record:', error);
      toast({
        variant: 'destructive',
        title: '删除失败',
        description: '删除失败，请稍后重试',
      });
    }
  };

  const fetchServiceTypes = async () => {
    try {
      const { data: result } = await apiClient.get<{ id: number; serviceCode: string; serviceName: string }[] | { data: { id: number; serviceCode: string; serviceName: string }[] }>('/api/service-types');
      const data = (result as any).data || result;
      if (Array.isArray(data) && data.length > 0) {
        setServiceTypes(data);
      }
    } catch (error) {
      console.error('Failed to fetch service types:', error);
    }
  };

  // V2.1: 获取售前服务记录
  const fetchPresalesRecords = async () => {
    try {
      const { data: result } = await apiClient.get<Array<{
        id: number;
        serviceName: string;
        serviceCode: string;
        staffName: string;
        startTime: string | null;
        workHours: string | null;
        totalWorkHours: string | null;
        participantCount: number;
        description: string | null;
        outcome: string | null;
        participants?: Array<{
          id: number;
          userId: number;
          contributionPct: string;
          workHours: string | null;
          role: string;
          userName: string;
        }>;
      }>>(`/api/projects/${resolvedParams.id}/presales`);
      setPresalesRecords(Array.isArray(result) ? result : []);
    } catch (error) {
      console.error('Failed to fetch presales records:', error);
      setPresalesRecords([]);
    }
  };

  // V2.1: 打开参与人管理对话框
  const handleManageParticipants = (recordId: number) => {
    setSelectedRecordId(recordId);
    setParticipantManagerOpen(true);
  };

  // V1.3: 项目阶段配置
  const PROJECT_STAGE_CONFIG: Record<string, { label: string; color: string }> = {
    opportunity: { label: '商机', color: 'bg-blue-100 text-blue-600' },
    bidding: { label: '招标投标', color: 'bg-orange-100 text-orange-600' },
    execution: { label: '实施', color: 'bg-green-100 text-green-600' },
    acceptance: { label: '验收', color: 'bg-purple-100 text-purple-600' },
    settlement: { label: '结算', color: 'bg-yellow-100 text-yellow-600' },
    archived: { label: '归档', color: 'bg-gray-100 text-gray-600' },
  };

  const getStageBadge = (stage: string | null) => {
    if (!stage) return <span className="text-muted-foreground">未设置</span>;
    const stageInfo = PROJECT_STAGE_CONFIG[stage];
    if (!stageInfo) return <span className="text-muted-foreground">{stage}</span>;
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${stageInfo.color}`}>{stageInfo.label}</span>;
  };

  const getPriorityBadge = (priority: string) => {
    const priorityMap: Record<string, { label: string; color: string }> = {
      high: { label: '高', color: 'bg-red-100 text-red-600' },
      medium: { label: '中', color: 'bg-yellow-100 text-yellow-600' },
      low: { label: '低', color: 'bg-gray-100 text-gray-600' },
    };
    const priorityInfo = priorityMap[priority] || { label: priority, color: 'bg-gray-100 text-gray-600' };
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityInfo.color}`}>{priorityInfo.label}</span>;
  };

  // 获取优先级背景颜色（用于顶部选择器）
  const getPriorityBgColor = (priority: string) => {
    const colorMap: Record<string, string> = {
      urgent: 'bg-red-500 text-white hover:bg-red-600',
      high: 'bg-orange-100 text-orange-700 hover:bg-orange-200',
      medium: 'bg-blue-100 text-blue-700 hover:bg-blue-200',
      low: 'bg-gray-100 text-gray-600 hover:bg-gray-200',
    };
    return colorMap[priority] || 'bg-gray-100 text-gray-700';
  };

  const getTypeBadge = (type: string, types?: string[]) => {
    const codes = normalizeProjectTypeCodes(types ?? type);
    if (codes.length === 0) {
      return <span className="text-muted-foreground">未设置</span>;
    }

    return (
      <div className="flex flex-wrap gap-1">
        {codes.map((code) => (
          <Badge key={code} variant="outline">
            {getProjectTypeDisplayLabel(code)} / {getProjectTypeOaCategoryLabel(code)}
          </Badge>
        ))}
      </div>
    );
  };

  const formatCurrency = (amount: string | null) => {
    if (!amount) return '-';
    return `¥${Number(amount).toLocaleString()}`;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('zh-CN');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiClient.put(`/api/projects`, { id: project?.id, ...editedProject });
      await fetchProjectDetail();
      setIsEditing(false);
      setEditedProject({});
    } catch (error) {
      console.error('Failed to save project:', error);
    } finally {
      setSaving(false);
    }
  };

  // 处理项目阶段变更
  const [stageChanging, setStageChanging] = useState(false);
  const [pendingStage, setPendingStage] = useState<string | null>(null);
  const [stageChangeDialogOpen, setStageChangeDialogOpen] = useState(false);

  const handleStageChangeRequest = (newStage: string) => {
    if (newStage === project?.projectStage) return;
    setPendingStage(newStage);
    setStageChangeDialogOpen(true);
  };

  const handleConfirmStageChange = async () => {
    if (!pendingStage || !project) return;
    
    setStageChanging(true);
    try {
      await apiClient.put(`/api/projects`, { id: project.id, projectStage: pendingStage });
      await fetchProjectDetail();
      toast({
        title: '阶段已更新',
        description: `项目阶段已切换为「${PROJECT_STAGES.find(s => s.key === pendingStage)?.label || pendingStage}」`,
      });
    } catch (error) {
      console.error('Failed to update stage:', error);
      toast({
        title: '更新失败',
        description: '无法更新项目阶段，请稍后重试',
        variant: 'destructive',
      });
    } finally {
      setStageChanging(false);
      setStageChangeDialogOpen(false);
      setPendingStage(null);
    }
  };

  // 更新项目优先级
  const [priorityChanging, setPriorityChanging] = useState(false);
  const handlePriorityChange = async (newPriority: string) => {
    if (!project || newPriority === project.priority) return;
    
    setPriorityChanging(true);
    try {
      await apiClient.put(`/api/projects`, { id: project.id, priority: newPriority });
      await fetchProjectDetail();
      toast({
        title: '优先级已更新',
        description: '项目优先级已更新',
      });
    } catch (error) {
      console.error('Failed to update priority:', error);
      toast({
        title: '更新失败',
        description: '无法更新项目优先级，请稍后重试',
        variant: 'destructive',
      });
    } finally {
      setPriorityChanging(false);
    }
  };

  // 判断招标信息是否可访问（阶段到达招标投标或之后才能访问）
  const canAccessBidding = () => {
    return canAccessBiddingTab((project?.projectStage || 'opportunity') as ProjectStage);
  };

  const canAccessResult = () => {
    return canAccessResultTab(
      (project?.projectStage || 'opportunity') as ProjectStage,
      (project?.status || 'lead') as ProjectStatus,
      project?.bidResult ?? null
    );
  };

  const canAccessSettlement = () => {
    return canAccessSettlementTab((project?.projectStage || 'opportunity') as ProjectStage);
  };

  const canAccessImplementationPlan = () => {
    return canAccessImplementationPlanTab((project?.projectStage || 'opportunity') as ProjectStage);
  };
  
  // 判断项目是否只读
  const isReadOnly = () => {
    return isProjectReadOnly(
      (project?.projectStage || 'opportunity') as ProjectStage, 
      (project?.status || 'lead') as ProjectStatus
    );
  };

  // 添加团队成员
  const [addingMember, setAddingMember] = useState(false);

  const handleAddMember = async () => {
    if (!selectedUserId || !memberRole) {
      toast({
        title: '请填写完整信息',
        description: '请选择人员并指定角色',
        variant: 'destructive',
      });
      return;
    }

    // 检查是否已存在
    if (teamMembers.some(m => m.id === selectedUserId)) {
      toast({
        title: '人员已存在',
        description: '该人员已是团队成员',
        variant: 'destructive',
      });
      return;
    }

    setAddingMember(true);
    try {
      const response = await apiClient.post(`/api/projects/${resolvedParams.id}/members`, {
        userId: selectedUserId,
        role: memberRole,
      });

      if ((response.data as any)?.success) {
        // 重新获取团队成员列表
        await fetchTeamMembers();
        toast({
          title: '添加成功',
          description: '团队成员已添加',
        });
      } else {
        throw new Error((response.data as any)?.error || '添加失败');
      }
    } catch (error: any) {
      console.error('Failed to add member:', error);
      toast({
        title: '添加失败',
        description: error.message || '请稍后重试',
        variant: 'destructive',
      });
    } finally {
      setAddingMember(false);
      setSelectedUserId(null);
      setMemberRole('');
      setAddMemberDialogOpen(false);
    }
  };

  // 移除团队成员
  const handleRemoveMember = async (userId: number) => {
    try {
      const response = await apiClient.delete(`/api/projects/${resolvedParams.id}/members?userId=${userId}`);
      
      if ((response.data as any)?.success) {
        // 重新获取团队成员列表
        await fetchTeamMembers();
        toast({
          title: '移除成功',
          description: '团队成员已移除',
        });
      } else {
        throw new Error((response.data as any)?.error || '移除失败');
      }
    } catch (error: any) {
      console.error('Failed to remove member:', error);
      toast({
        title: '移除失败',
        description: error.message || '请稍后重试',
        variant: 'destructive',
      });
    }
  };

  // 更新成员角色
  const handleUpdateMemberRole = async (memberId: number, newRole: string) => {
    try {
      const response = await apiClient.put(`/api/projects/${resolvedParams.id}/members`, {
        memberId,
        role: newRole,
      });
      
      if ((response.data as any)?.success) {
        // 重新获取团队成员列表
        await fetchTeamMembers();
        toast({
          title: '更新成功',
          description: '成员角色已更新',
        });
      } else {
        throw new Error((response.data as any)?.error || '更新失败');
      }
    } catch (error: any) {
      console.error('Failed to update member role:', error);
      toast({
        title: '更新失败',
        description: error.message || '请稍后重试',
        variant: 'destructive',
      });
    }
  };

  // 添加跟进记录
  const handleAddFollow = async () => {
    if (!newFollow.followType || !newFollow.followContent || !newFollow.followTime || !newFollow.followerName) {
      return;
    }

    try {
      setAddingFollow(true);
      
      // 使用 FormData 支持文件上传，与客户详情页统一
      const formData = new FormData();
      formData.append('followType', newFollow.followType);
      formData.append('followContent', newFollow.followContent);
      formData.append('followTime', newFollow.followTime);
      formData.append('followerName', newFollow.followerName);
      formData.append('isBusinessTrip', newFollow.isBusinessTrip ? 'true' : 'false');
      
      // 添加出差相关信息
      if (newFollow.isBusinessTrip) {
        formData.append('tripStartDate', newFollow.tripStartDate || '');
        formData.append('tripEndDate', newFollow.tripEndDate || '');
        formData.append('tripCost', newFollow.tripCost || '0');
      }
      
      // 添加佐证文件
      // 如果已通过分片上传完成，则发送文件key；否则发送文件本身
      if (uploadedAttachment) {
        formData.append('attachmentKey', uploadedAttachment.key);
        formData.append('attachmentName', uploadedAttachment.name);
        formData.append('attachmentSize', String(uploadedAttachment.size));
      } else if (newFollow.attachment) {
        formData.append('attachment', newFollow.attachment);
      }

      // 获取token
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      
      const response = await fetch(`/api/projects/${resolvedParams.id}/follows`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData
      });

      if (response.ok) {
        await fetchFollowRecords();
        setNewFollow({
          followerName: availableUsers[0]?.realName || '',
          followTime: new Date().toISOString().slice(0, 16),
          followType: '',
          followContent: '',
          attachment: null,
          isBusinessTrip: false,
          tripStartDate: '',
          tripEndDate: '',
          tripCost: ''
        });
        setUploadedAttachment(null);
        setAttachmentUploadProgress(0);
        setAddFollowDialogOpen(false);
      } else {
        const error = await response.json();
        console.error('Failed to add follow record:', error);
      }
    } catch (error) {
      console.error('Failed to add follow record:', error);
    } finally {
      setAddingFollow(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted-foreground">项目不存在</div>
      </div>
    );
  }

  const stageReadOnly = isReadOnly();
  const permissionReadOnly = !project.permissions?.canWrite;
  const workflowReadOnly = stageReadOnly || permissionReadOnly;
  const archiveReadOnly = project.projectStage === 'cancelled' || permissionReadOnly;
  const settlementReadOnly = permissionReadOnly || project.projectStage === 'cancelled' || project.projectStage === 'archived';
  const implementationReadOnly = permissionReadOnly || project.projectStage === 'cancelled' || project.projectStage === 'archived';
  const canManageMembers = !stageReadOnly && !permissionReadOnly && !!project.permissions?.canAdmin;

  const filteredUsers = availableUsers.filter(user =>
    (user.realName?.toLowerCase() || '').includes(userSearch.toLowerCase()) ||
    (user.username?.toLowerCase() || '').includes(userSearch.toLowerCase())
  );

  const currentTeamMemberIds = teamMembers.map(m => m.id);
  const availableTeamMembers = filteredUsers.filter(user => !currentTeamMemberIds.includes(user.id));

  return (
    <div className="min-h-screen bg-background">
      {/* 顶部导航栏 */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                返回列表
              </Button>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">{project.projectName}</h1>
                {/* 使用新的阶段选择器组件 */}
                <StageSelector
                  projectId={project.id}
                  currentStage={project.projectStage as ProjectStage}
                  currentStatus={project.status as ProjectStatus}
                  disabled={workflowReadOnly}
                  onStageChange={() => fetchProjectDetail()}
                />
                {/* 使用新的优先级选择器组件 */}
                <PrioritySelector
                  currentPriority={project.priority as 'urgent' | 'high' | 'medium' | 'low'}
                  disabled={workflowReadOnly}
                  onPriorityChange={(newPriority) => handlePriorityChange(newPriority)}
                />
                <p className="text-sm text-muted-foreground">{project.projectCode}</p>
              </div>
            </div>
          </div>
          {/* 项目阶段进度条 - 纯展示 */}
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">项目阶段进度</span>
              <span className="text-sm text-muted-foreground">使用上方阶段选择器切换阶段</span>
            </div>
            <ProjectStageProgress 
              currentStage={project.projectStage || 'opportunity'} 
              size="md"
            />
          </div>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="container mx-auto px-4 py-6">
        <Tabs defaultValue="basic" className="space-y-6">
          <TabsList className="grid w-full grid-cols-7 lg:w-auto lg:inline-grid">
            <TabsTrigger 
              value="basic" 
              className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:font-semibold data-[state=active]:shadow-sm"
            >
              <FileStack className="h-4 w-4" />
              基本信息
            </TabsTrigger>
            <TabsTrigger value="info" className="flex items-center gap-2">
              <Info className="h-4 w-4" />
              项目信息
            </TabsTrigger>
            <TabsTrigger value="planning" className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              项目策划
            </TabsTrigger>
            <TabsTrigger 
              value="bidding" 
              className="flex items-center gap-2 data-[disabled]:opacity-50"
              disabled={!canAccessBidding()}
              title={!canAccessBidding() ? '项目阶段到达「招标投标」后才可访问' : ''}
            >
              <Gavel className="h-4 w-4" />
              招投标
            </TabsTrigger>
            <TabsTrigger 
              value="settlement" 
              className="flex items-center gap-2 data-[disabled]:opacity-50"
              disabled={!canAccessResult()}
              title={!canAccessResult() ? '项目进入招投标阶段后才可访问' : ''}
            >
              <Archive className="h-4 w-4" />
              中标/丢标
            </TabsTrigger>
            <TabsTrigger 
              value="implementation"
              className="flex items-center gap-2 data-[disabled]:opacity-50"
              disabled={!canAccessImplementationPlan()}
              title={!canAccessImplementationPlan() ? '项目进入「交付准备中」阶段后才可访问' : ''}
            >
              <Wrench className="h-4 w-4" />
              实施方案
            </TabsTrigger>
            <TabsTrigger 
              value="financials" 
              className="flex items-center gap-2 data-[disabled]:opacity-50"
              disabled={!canAccessSettlement()}
              title={!canAccessSettlement() ? '项目进入结算或已归档后才可访问' : ''}
            >
              <Calculator className="h-4 w-4" />
              结算信息
            </TabsTrigger>
          </TabsList>

          {/* 基本信息 Tab */}
          <TabsContent value="basic" className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧主内容区 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 项目基本信息 - 纯展示模式 */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>项目档案</CardTitle>
                    <CardDescription>项目的基本信息和详细描述（只读）</CardDescription>
                  </div>
                  <Badge variant="secondary" className="text-xs">只读</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">项目编号</Label>
                    <p className="font-mono">{project.projectCode}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">项目类型</Label>
                    <div className="font-medium">{getTypeBadge(project.projectType, project.projectTypes)}</div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">客户类型/行业</Label>
                    <p className="font-medium">{getProjectCustomerTypeOrIndustryLabel(project.industry) || '-'}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">所在区域</Label>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <p className="font-medium">{project.region || '-'}</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">客户名称</Label>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <p className="font-medium">{project.customerName}</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">项目预算</Label>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <p className="font-medium">{formatCurrency(project.estimatedAmount)}</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">中标金额</Label>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <p className={`font-medium ${project.actualAmount ? 'text-green-600' : ''}`}>
                        {formatCurrency(project.actualAmount)}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">开始日期</Label>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <p className="font-medium">{formatDate(project.startDate)}</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">预计交付日期</Label>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <p className="font-medium">{formatDate(project.expectedDeliveryDate)}</p>
                    </div>
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <Label className="text-muted-foreground">项目描述</Label>
                    <p className="font-medium">{project.description || '-'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 项目概览 - 跟进记录和解决方案（只读展示） */}
            <ProjectOverviewCard projectId={parseInt(resolvedParams.id)} />
          </div>

          {/* 右侧侧边栏 */}
          <div className="space-y-6">
            {/* 项目信息 - 纯展示（修改入口在顶部导航栏） */}
            <Card>
              <CardHeader>
                <CardTitle>项目信息</CardTitle>
                <CardDescription className="text-xs">
                  项目阶段和优先级请在页面顶部修改
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">项目阶段</span>
                    <span className={cn(
                      'px-2.5 py-1 rounded-md text-sm font-medium',
                      getStageBgColor(project.projectStage as ProjectStage)
                    )}>
                      {getStageLabel((project.projectStage || 'opportunity') as ProjectStage)}
                    </span>
                  </div>
                </div>
                
                {/* 优先级 - 纯展示 */}
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">优先级</span>
                    <span className={cn(
                      'px-2.5 py-1 rounded-md text-sm font-medium',
                      getPriorityBgColor(project.priority)
                    )}>
                      {getPriorityLabel(project.priority as Priority)}
                    </span>
                  </div>
                </div>
                
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">创建时间</span>
                    <span>{formatDate(project.createdAt)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-2">
                    <span className="text-muted-foreground">更新时间</span>
                    <span>{formatDate(project.updatedAt)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 团队成员 - 纯展示，按阶段分组 */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>团队成员</CardTitle>
                  <Badge variant="secondary" className="text-xs">只读</Badge>
                </div>
                <CardDescription className="text-xs">
                  可在「项目策划」和「招投标」Tab中管理各阶段成员
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* 项目策划团队 */}
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-xs">项目策划团队</Badge>
                    <span className="text-xs text-muted-foreground">
                      ({teamMembers.filter(m => m.stage === 'planning' || m.stage === 'all' || !m.stage).length}人)
                    </span>
                  </div>
                  <div className="space-y-2">
                    {teamMembers
                      .filter(m => m.stage === 'planning' || m.stage === 'all' || !m.stage)
                      .map((member) => (
                        <div key={`planning-${member.id}`} className="flex items-center gap-3 p-2 bg-muted/30 rounded-lg">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-xs font-medium">{member.name.charAt(0)}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{member.name}</div>
                          </div>
                          <Badge variant="secondary" className="text-xs">{member.role}</Badge>
                          {(member.stage === 'all' || !member.stage) && (
                            <Badge variant="outline" className="text-xs text-blue-600">全程</Badge>
                          )}
                        </div>
                      ))}
                    {teamMembers.filter(m => m.stage === 'planning' || m.stage === 'all' || !m.stage).length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-2">暂无成员</p>
                    )}
                  </div>
                </div>
                
                {/* 招投标团队 */}
                <div className="border-t pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-xs">招投标团队</Badge>
                    <span className="text-xs text-muted-foreground">
                      ({teamMembers.filter(m => m.stage === 'bidding' || m.stage === 'all' || !m.stage).length}人)
                    </span>
                  </div>
                  <div className="space-y-2">
                    {teamMembers
                      .filter(m => m.stage === 'bidding' || m.stage === 'all' || !m.stage)
                      .map((member) => (
                        <div key={`bidding-${member.id}`} className="flex items-center gap-3 p-2 bg-muted/30 rounded-lg">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-xs font-medium">{member.name.charAt(0)}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{member.name}</div>
                          </div>
                          <Badge variant="secondary" className="text-xs">{member.role}</Badge>
                          {(member.stage === 'all' || !member.stage) && (
                            <Badge variant="outline" className="text-xs text-blue-600">全程</Badge>
                          )}
                        </div>
                      ))}
                    {teamMembers.filter(m => m.stage === 'bidding' || m.stage === 'all' || !m.stage).length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-2">暂无成员</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 项目数据统计 */}
            <Card>
              <CardHeader>
                <CardTitle>项目数据统计</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">跟进次数</span>
                  </div>
                  <span className="font-medium">{followRecords.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">解决方案提供数</span>
                  </div>
                  <span className="font-medium">{solutionCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">团队人员数</span>
                  </div>
                  <span className="font-medium">{teamMembers.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">出差次数</span>
                  </div>
                  <span className="font-medium">{followRecords.filter(r => r.isBusinessTrip).length}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
          </TabsContent>

          {/* 项目信息 Tab */}
          <TabsContent value="info">
            <ProjectInfoTab 
              projectId={project.id} 
              projectInfo={{
                id: project.id,
                projectName: project.projectName,
                estimatedAmount: project.estimatedAmount,
                expectedBiddingDate: project.expectedBiddingDate || null,
                estimatedDuration: project.estimatedDuration || null,
                urgencyLevel: project.urgencyLevel || null,
                risks: project.risks,
              }}
              readOnly={workflowReadOnly}
              onUpdate={fetchProjectDetail}
            />
          </TabsContent>

          {/* 项目策划 Tab */}
          <TabsContent value="planning">
            <ProjectPlanningTab projectId={project.id} readOnly={workflowReadOnly} canManageMembers={canManageMembers} />
          </TabsContent>

          {/* 招投标 Tab */}
          <TabsContent value="bidding">
            <ProjectBiddingTab projectId={project.id} readOnly={workflowReadOnly} canManageMembers={canManageMembers} />
          </TabsContent>

          {/* 中标/丢标 Tab */}
          <TabsContent value="settlement">
            <ProjectArchive projectId={project.id} readOnly={archiveReadOnly} />
          </TabsContent>

          {/* 实施方案 Tab */}
          <TabsContent value="implementation">
            <ProjectImplementationPlan projectId={project.id} readOnly={implementationReadOnly} />
          </TabsContent>

          {/* 结算信息 Tab */}
          <TabsContent value="financials">
            <ProjectSettlement projectId={project.id} readOnly={settlementReadOnly} />
          </TabsContent>
        </Tabs>
      </div>

      {/* 阶段变更确认对话框 */}
      <AlertDialog open={stageChangeDialogOpen} onOpenChange={setStageChangeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认切换项目阶段</AlertDialogTitle>
            <AlertDialogDescription>
              您确定要将项目阶段从「{PROJECT_STAGES.find(s => s.key === project?.projectStage)?.label || '未设置'}」
              切换为「{PROJECT_STAGES.find(s => s.key === pendingStage)?.label || pendingStage}」吗？
              <br />
              <span className="text-muted-foreground text-sm mt-2 block">
                {pendingStage && PROJECT_STAGES.find(s => s.key === pendingStage)?.description}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={stageChanging}>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmStageChange} disabled={stageChanging}>
              {stageChanging ? '切换中...' : '确认切换'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 添加团队成员对话框 */}
      <Dialog open={addMemberDialogOpen} onOpenChange={setAddMemberDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>添加团队成员</DialogTitle>
            <DialogDescription>选择要添加到项目的团队成员</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* 人员搜索 */}
            <div className="space-y-2">
              <Label>搜索人员</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="输入姓名搜索"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* 人员列表 */}
            <div className="space-y-2">
              <Label>选择人员</Label>
              <ScrollArea className="h-48 border rounded-md p-2">
                {availableTeamMembers.length > 0 ? (
                  <div className="space-y-2">
                    {availableTeamMembers.map((user) => (
                      <div
                        key={user.id}
                        className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                          selectedUserId === user.id
                            ? 'bg-primary/10 border border-primary/20'
                            : 'hover:bg-accent border border-transparent'
                        }`}
                        onClick={() => setSelectedUserId(user.id)}
                      >
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-medium">{user.realName.charAt(0)}</span>
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">{user.realName}</div>
                          <div className="text-sm text-muted-foreground">@{user.username}</div>
                        </div>
                        {user.department && (
                          <Badge variant="outline" className="text-xs">
                            {user.department}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>没有可添加的人员</p>
                  </div>
                )}
              </ScrollArea>
            </div>

            {/* 角色选择 */}
            <div className="space-y-2">
              <Label>角色</Label>
              <Select value={memberRole} onValueChange={setMemberRole}>
                <SelectTrigger>
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
            <Button 
              onClick={handleAddMember} 
              disabled={!selectedUserId || !memberRole || addingMember}
            >
              {addingMember ? '添加中...' : '添加'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 添加跟进记录对话框 */}
      <Dialog open={addFollowDialogOpen} onOpenChange={setAddFollowDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>添加跟进记录</DialogTitle>
            <DialogDescription>填写跟进信息，记录项目沟通情况</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* 第一行：跟进人和跟进时间 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>跟进人 *</Label>
                <Select
                  value={newFollow.followerName}
                  onValueChange={(value) => setNewFollow({ ...newFollow, followerName: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="请选择跟进人" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableUsers.length > 0 ? (
                      availableUsers.filter(user => user && user.realName).map(user => (
                        <SelectItem key={user.id} value={user.realName}>
                          {user.realName}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="loading" disabled>加载中...</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>跟进时间 *</Label>
                <Input
                  type="date"
                  value={newFollow.followTime}
                  onChange={(e) => setNewFollow({ ...newFollow, followTime: e.target.value })}
                />
              </div>
            </div>
            
            {/* 第二行：跟进类型 */}
            <div className="space-y-2">
              <Label>跟进类型 *</Label>
              <Select
                value={newFollow.followType}
                onValueChange={(value) => setNewFollow({ ...newFollow, followType: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="请选择跟进类型" />
                </SelectTrigger>
                <SelectContent>
                  {serviceTypes.filter(type => type && type.serviceCode && type.serviceName).map(type => (
                    <SelectItem key={type.id} value={type.serviceCode}>{type.serviceName}</SelectItem>
                  ))}
                  <SelectItem value="site_visit">现场拜访</SelectItem>
                  <SelectItem value="phone">电话沟通</SelectItem>
                  <SelectItem value="wechat">微信沟通</SelectItem>
                  <SelectItem value="email">邮件沟通</SelectItem>
                  <SelectItem value="video_meeting">视频会议</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* 第三行：是否出差 */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2 py-2">
                <input
                  type="checkbox"
                  id="isBusinessTrip"
                  checked={newFollow.isBusinessTrip}
                  onChange={(e) => setNewFollow({ ...newFollow, isBusinessTrip: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="isBusinessTrip" className="text-sm font-normal cursor-pointer">
                  是否出差
                </Label>
              </div>
              
              {/* 出差相关信息（勾选后显示） */}
              {newFollow.isBusinessTrip && (
                <div className="grid grid-cols-3 gap-4 pl-6 border-l-2 border-primary/20">
                  <div className="space-y-2">
                    <Label>出差起始时间</Label>
                    <Input
                      type="date"
                      value={newFollow.tripStartDate}
                      onChange={(e) => setNewFollow({ ...newFollow, tripStartDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>出差结束时间</Label>
                    <Input
                      type="date"
                      value={newFollow.tripEndDate}
                      onChange={(e) => setNewFollow({ ...newFollow, tripEndDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>差旅成本（元）</Label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={newFollow.tripCost}
                      onChange={(e) => setNewFollow({ ...newFollow, tripCost: e.target.value })}
                    />
                  </div>
                </div>
              )}
            </div>
            
            {/* 第四行：跟进内容 */}
            <div className="space-y-2">
              <Label>跟进内容 *</Label>
              <Textarea
                placeholder="请输入跟进内容..."
                value={newFollow.followContent}
                onChange={(e) => setNewFollow({ ...newFollow, followContent: e.target.value })}
                rows={4}
              />
            </div>
            
            {/* 第五行：佐证物上传 */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Paperclip className="h-4 w-4" />
                佐证物
                <span className="text-xs text-muted-foreground font-normal">(用于项目仲裁，最大100MB，支持分片上传)</span>
              </Label>
              <div className="border-2 border-dashed rounded-lg p-6">
                {/* 上传进度显示 */}
                {attachmentUploading ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <FileIcon className="h-4 w-4" />
                      <span className="text-sm">{newFollow.attachment?.name}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${attachmentUploadProgress}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                      上传中... {attachmentUploadProgress.toFixed(0)}%
                    </p>
                  </div>
                ) : uploadedAttachment ? (
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span className="text-sm">{uploadedAttachment.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({(uploadedAttachment.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setUploadedAttachment(null);
                        setNewFollow({ ...newFollow, attachment: null });
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : newFollow.attachment ? (
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2">
                      <FileIcon className="h-4 w-4" />
                      <span className="text-sm">{newFollow.attachment.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({(newFollow.attachment.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setNewFollow({ ...newFollow, attachment: null })}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="text-center">
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-2">
                      点击或拖拽文件到此处上传
                    </p>
                    <Input
                      type="file"
                      className="hidden"
                      id="follow-attachment"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          // 检查文件大小
                          const maxSize = 100 * 1024 * 1024; // 100MB
                          if (file.size > maxSize) {
                            toast({
                              title: '文件过大',
                              description: '佐证物文件大小不能超过100MB',
                              variant: 'destructive',
                            });
                            return;
                          }
                          // 大于10MB使用分片上传
                          const chunkThreshold = 10 * 1024 * 1024;
                          if (file.size > chunkThreshold) {
                            setNewFollow({ ...newFollow, attachment: file });
                            doChunkUpload(file);
                          } else {
                            // 小文件直接设置，在提交时上传
                            setNewFollow({ ...newFollow, attachment: file });
                          }
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById('follow-attachment')?.click()}
                    >
                      选择文件
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddFollowDialogOpen(false)}>
              取消
            </Button>
            <Button
              onClick={handleAddFollow}
              disabled={addingFollow}
            >
              {addingFollow ? '提交中...' : '提交'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* V2.1: 参与人管理对话框 */}
      <Dialog open={participantManagerOpen} onOpenChange={setParticipantManagerOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>管理参与人</DialogTitle>
            <DialogDescription>
              管理此服务记录的参与人员及其贡献分配
            </DialogDescription>
          </DialogHeader>
          {selectedRecordId && (
            <ParticipantManager
              projectId={parseInt(resolvedParams.id)}
              recordId={selectedRecordId}
              onStatsUpdate={fetchPresalesRecords}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
