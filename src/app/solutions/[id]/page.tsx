/**
 * 解决方案详情页 - 重构版
 * 
 * 采用左右分栏布局：
 * - 左侧：固定信息卡片区（基本信息、统计数据、团队成员、快捷操作）
 * - 右侧：主内容区（根据Tab切换）
 * 
 * Tab精简为4个：
 * - 子方案管理
 * - 版本管理
 * - 项目关联
 * - 评审记录
 */

'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ArrowLeft,
  Download,
  Eye,
  Clock,
  User,
  FileText,
  CheckCircle2,
  XCircle,
  Clock as ClockIcon,
  Plus,
  Users,
  GitBranch,
  MessageSquare,
  Trash2,
  Edit,
  Send,
  ThumbsUp,
  ThumbsDown,
  AlertCircle,
  Briefcase,
  BarChart3,
  Calendar,
  Tag,
  Building,
  MapPin,
  FileStack,
  TrendingUp,
  Package,
} from 'lucide-react';
import { SubSchemeManager } from '@/components/solution/sub-scheme-manager';
import { SolutionVersionsTab } from '@/components/solution/solution-versions-tab';
import { SolutionProjectsTab } from '@/components/solution/solution-projects-tab';

// 解决方案接口
interface Solution {
  id: number;
  solutionCode: string;
  solutionName: string;
  solutionTypeId: number | null;
  solutionTypeName: string | null;
  version: string;
  industry: string | null;
  scenario: string | null;
  description: string | null;
  content: string | null;
  authorId: number;
  authorName: string | null;
  ownerId: number | null;
  ownerName: string | null;
  reviewerId: number | null;
  reviewerName: string | null;
  isTemplate: boolean;
  templateId: number | null;
  templateName: string | null;
  status: string;
  approvalStatus: string | null;
  tags: string[] | null;
  viewCount: number;
  downloadCount: number;
  likeCount: number;
  rating: string | null;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  publishDate: string | null;
  subSchemes?: SubScheme[];
}

// 子方案接口
interface SubScheme {
  id: number;
  solutionId: number;
  subSchemeCode: string;
  subSchemeName: string;
  subSchemeType: string | null;
  parentSubSchemeId: number | null;
  sortOrder: number;
  version: string;
  description: string | null;
  estimatedCost: string | null;
  estimatedDuration: number | null;
  responsibleUserId: number | null;
  responsibleUserName: string | null;
  status: string;
  tags: string[] | null;
  viewCount: number;
  downloadCount: number;
  childrenCount: number;
  createdAt: string;
  updatedAt: string;
}

// 团队成员接口
interface TeamMember {
  id: number;
  solutionId: number;
  userId: number;
  role: string;
  permissions: {
    canEdit: boolean;
    canDelete: boolean;
    canApprove: boolean;
    canInvite: boolean;
    canUpload: boolean;
    canDownload: boolean;
  } | null;
  joinedAt: string;
  invitedBy: number | null;
  inviter: { id: number; realName: string } | null;
  status: string;
  notes: string | null;
  userName: string;
  userEmail: string;
  userDepartment: string | null;
  userPosition: string | null;
  userAvatar: string | null;
}

// 评审记录接口
interface Review {
  id: number;
  solutionId: number;
  subSchemeId: number | null;
  subScheme: { id: number; subSchemeCode: string; subSchemeName: string } | null;
  reviewerId: number;
  reviewerName: string;
  reviewerEmail: string;
  reviewerDepartment: string | null;
  reviewType: string;
  reviewStatus: string;
  reviewComment: string | null;
  reviewScore: number | null;
  reviewCriteria: Array<{ criterion: string; score: number; comment: string }> | null;
  reviewedAt: string | null;
  nextReviewerId: number | null;
  nextReviewer: { id: number; realName: string } | null;
  dueDate: string | null;
  isFinal: boolean;
  createdAt: string;
}

// 状态配置
const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { label: '草稿', variant: 'secondary' },
  reviewing: { label: '审核中', variant: 'default' },
  published: { label: '已发布', variant: 'outline' },
  approved: { label: '已通过', variant: 'outline' },
  rejected: { label: '已拒绝', variant: 'destructive' },
  deprecated: { label: '已废弃', variant: 'secondary' },
};

const reviewStatusConfig: Record<string, { label: string; icon: any; color: string }> = {
  pending: { label: '待评审', icon: ClockIcon, color: 'text-yellow-500' },
  approved: { label: '已通过', icon: CheckCircle2, color: 'text-green-500' },
  rejected: { label: '已拒绝', icon: XCircle, color: 'text-red-500' },
  revision_required: { label: '需修订', icon: AlertCircle, color: 'text-orange-500' },
  cancelled: { label: '已取消', icon: XCircle, color: 'text-gray-500' },
};

const reviewTypeConfig: Record<string, { label: string }> = {
  submit: { label: '提交评审' },
  approve: { label: '审批通过' },
  reject: { label: '审批拒绝' },
  comment: { label: '评审意见' },
  revision: { label: '要求修订' },
  withdraw: { label: '撤回评审' },
};

const roleConfig: Record<string, { label: string; color: string }> = {
  owner: { label: '负责人', color: 'bg-primary text-primary-foreground' },
  maintainer: { label: '维护者', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  contributor: { label: '贡献者', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  reviewer: { label: '评审人', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
  viewer: { label: '查看者', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200' },
};

export default function SolutionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  // 状态
  const [solution, setSolution] = useState<Solution | null>(null);
  const [subSchemes, setSubSchemes] = useState<SubScheme[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'versions');
  
  // 编辑状态
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Solution>>({});
  
  // 对话框状态
  const [showTeamDialog, setShowTeamDialog] = useState(false);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showRevisionDialog, setShowRevisionDialog] = useState(false);
  const [rejectComment, setRejectComment] = useState('');
  const [revisionComment, setRevisionComment] = useState('');
  const [reviewerSearch, setReviewerSearch] = useState('');
  const [reviewerOptions, setReviewerOptions] = useState<Array<{ id: number; realName: string; email: string; department: string | null }>>([]);
  const [selectedReviewer, setSelectedReviewer] = useState<{ id: number; realName: string } | null>(null);
  
  // 团队成员添加状态
  const [newMember, setNewMember] = useState({
    userId: '',
    role: 'viewer',
    notes: '',
  });
  const [availableUsers, setAvailableUsers] = useState<Array<{ id: number; realName: string; email: string; department: string | null }>>([]);
  const [searchUser, setSearchUser] = useState('');
  
  // 权限
  const [userPermission, setUserPermission] = useState<{
    isTeamMember: boolean;
    role: string | null;
    isOwner: boolean;
    permissions: {
      canEdit: boolean;
      canDelete: boolean;
      canApprove: boolean;
      canInvite: boolean;
      canUpload: boolean;
      canDownload: boolean;
    };
  } | null>(null);

  useEffect(() => {
    setActiveTab(searchParams.get('tab') || 'versions');
  }, [searchParams]);

  // 加载数据
  useEffect(() => {
    fetchSolutionDetail();
    fetchPermissions();
  }, [params.id]);

  useEffect(() => {
    if (solution?.reviewerId && solution.reviewerName && !selectedReviewer) {
      setSelectedReviewer({ id: solution.reviewerId, realName: solution.reviewerName });
      setReviewerSearch(solution.reviewerName);
    }
  }, [selectedReviewer, solution?.reviewerId, solution?.reviewerName]);

  const fetchPermissions = async () => {
    try {
      const response = await fetch(`/api/solutions/${params.id}/permissions`);
      if (response.ok) {
        const data = await response.json();
        setUserPermission(data);
      }
    } catch (error) {
      console.error('Failed to fetch permissions:', error);
    }
  };

  const fetchSolutionDetail = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/solutions/${params.id}`);
      if (response.ok) {
        const result = await response.json();
        const data = result.data || result;
        if (!data.solution) {
          throw new Error('Unexpected solution detail payload');
        }

        setSolution(data.solution);
        setSubSchemes(data.solution.subSchemes || []);
        fetchTeamMembers();
        fetchReviews();
      }
    } catch (error) {
      console.error('Failed to fetch solution:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      const response = await fetch(`/api/solutions/${params.id}/team`);
      if (response.ok) {
        const data = await response.json();
        setTeamMembers(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch team members:', error);
    }
  };

  const fetchReviews = async () => {
    try {
      const response = await fetch(`/api/solutions/${params.id}/reviews`);
      if (response.ok) {
        const data = await response.json();
        setReviews(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch reviews:', error);
    }
  };

  const getPendingReview = () => {
    const pendingReviews = reviews.filter((review) => review.reviewStatus === 'pending');
    if (pendingReviews.length === 0) {
      return null;
    }

    return pendingReviews.sort(
      (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    )[0];
  };

  const getErrorMessage = async (response: Response, fallback: string) => {
    try {
      const payload = await response.json();
      return payload.error || payload.message || fallback;
    } catch {
      return fallback;
    }
  };

  // 保存编辑
  const handleSave = async () => {
    try {
      const response = await fetch(`/api/solutions/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      if (response.ok) {
        await fetchSolutionDetail();
        setIsEditing(false);
        toast({ title: '保存成功', description: '方案信息已更新' });
      }
    } catch (error) {
      console.error('Failed to update solution:', error);
      toast({ title: '保存失败', variant: 'destructive' });
    }
  };

  // 批量下载
  const handleBatchDownload = async () => {
    try {
      const response = await fetch(`/api/solutions/${params.id}/download-all`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${solution?.solutionName || '方案'}_所有文件.zip`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        // 更新下载计数
        if (solution) {
          setSolution({ ...solution, downloadCount: solution.downloadCount + 1 });
        }
        toast({ title: '下载成功' });
      } else {
        const error = await response.json();
        toast({ title: error.error || '下载失败', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Failed to download:', error);
      toast({ title: '下载失败', variant: 'destructive' });
    }
  };

  // 提交评审
  const handleSubmitReview = async () => {
    if (!selectedReviewer) {
      toast({ title: '请选择评审人', variant: 'destructive' });
      return;
    }

    try {
      const response = await fetch(`/api/solutions/${params.id}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewerId: selectedReviewer.id,
          reviewType: 'submit',
        }),
      });
      if (response.ok) {
        await fetchSolutionDetail();
        await fetchReviews();
        setShowReviewDialog(false);
        setReviewerOptions([]);
        toast({ title: '已提交评审' });
      } else {
        const errorMessage = await getErrorMessage(response, '提交评审失败');
        toast({ title: '提交失败', description: errorMessage, variant: 'destructive' });
      }
    } catch (error) {
      console.error('Failed to submit review:', error);
      toast({ title: '提交失败', variant: 'destructive' });
    }
  };

  // 审批通过
  const handleApproveReview = async (score: number = 0) => {
    const pendingReview = getPendingReview();
    if (!pendingReview) {
      toast({ title: '没有待处理评审', variant: 'destructive' });
      return;
    }

    try {
      const response = await fetch(`/api/solutions/${params.id}/reviews/${pendingReview.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewStatus: 'approved',
          reviewScore: score,
        }),
      });
      if (response.ok) {
        await fetchSolutionDetail();
        await fetchReviews();
        toast({ title: '审批通过' });
      } else {
        const errorMessage = await getErrorMessage(response, '审批失败');
        toast({ title: '操作失败', description: errorMessage, variant: 'destructive' });
      }
    } catch (error) {
      console.error('Failed to approve:', error);
      toast({ title: '操作失败', variant: 'destructive' });
    }
  };

  // 审批拒绝
  const handleRejectReview = async (comment: string) => {
    const pendingReview = getPendingReview();
    if (!pendingReview) {
      toast({ title: '没有待处理评审', variant: 'destructive' });
      return;
    }

    try {
      const response = await fetch(`/api/solutions/${params.id}/reviews/${pendingReview.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewStatus: 'rejected',
          reviewComment: comment,
        }),
      });
      if (response.ok) {
        await fetchSolutionDetail();
        await fetchReviews();
        setShowRejectDialog(false);
        setRejectComment('');
        toast({ title: '已拒绝' });
      } else {
        const errorMessage = await getErrorMessage(response, '拒绝评审失败');
        toast({ title: '操作失败', description: errorMessage, variant: 'destructive' });
      }
    } catch (error) {
      console.error('Failed to reject:', error);
      toast({ title: '操作失败', variant: 'destructive' });
    }
  };

  // 要求修订
  const handleRequestRevision = async (comment: string) => {
    const pendingReview = getPendingReview();
    if (!pendingReview) {
      toast({ title: '没有待处理评审', variant: 'destructive' });
      return;
    }

    try {
      const response = await fetch(`/api/solutions/${params.id}/reviews/${pendingReview.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewStatus: 'revision_required',
          reviewComment: comment,
        }),
      });
      if (response.ok) {
        await fetchSolutionDetail();
        await fetchReviews();
        setShowRevisionDialog(false);
        setRevisionComment('');
        toast({ title: '已发送修订要求' });
      } else {
        const errorMessage = await getErrorMessage(response, '发送修订要求失败');
        toast({ title: '操作失败', description: errorMessage, variant: 'destructive' });
      }
    } catch (error) {
      console.error('Failed to request revision:', error);
      toast({ title: '操作失败', variant: 'destructive' });
    }
  };

  // 移除团队成员
  const handleRemoveTeamMember = async (memberId: number) => {
    if (!confirm('确定要移除该成员吗？')) return;
    try {
      const response = await fetch(`/api/solutions/${params.id}/team/${memberId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        fetchTeamMembers();
        toast({ title: '移除成功' });
      }
    } catch (error) {
      console.error('Failed to remove team member:', error);
      toast({ title: '移除失败', variant: 'destructive' });
    }
  };

  // 搜索用户
  const searchUsers = async (keyword: string) => {
    if (!keyword || keyword.length < 1) {
      setAvailableUsers([]);
      return;
    }
    try {
      const response = await fetch(`/api/users?keyword=${encodeURIComponent(keyword)}`);
      if (response.ok) {
        const data = await response.json();
        setAvailableUsers(data.data || data || []);
      }
    } catch (error) {
      console.error('Failed to search users:', error);
    }
  };

  const searchReviewUsers = async (keyword: string) => {
    if (!keyword || keyword.length < 1) {
      setReviewerOptions([]);
      return;
    }
    try {
      const response = await fetch(`/api/users?keyword=${encodeURIComponent(keyword)}`);
      if (response.ok) {
        const data = await response.json();
        setReviewerOptions(data.data || data || []);
      }
    } catch (error) {
      console.error('Failed to search reviewers:', error);
    }
  };

  // 添加团队成员
  const handleAddTeamMember = async () => {
    if (!newMember.userId) {
      toast({ title: '请选择成员', variant: 'destructive' });
      return;
    }
    try {
      const response = await fetch(`/api/solutions/${params.id}/team`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: parseInt(newMember.userId),
          role: newMember.role,
          notes: newMember.notes || null,
        }),
      });
      if (response.ok) {
        fetchTeamMembers();
        setShowTeamDialog(false);
        setNewMember({ userId: '', role: 'viewer', notes: '' });
        setAvailableUsers([]);
        setSearchUser('');
        toast({ title: '添加成功', description: '成员已加入团队' });
      } else {
        const error = await response.json();
        toast({ title: '添加失败', description: error.error, variant: 'destructive' });
      }
    } catch (error) {
      console.error('Failed to add team member:', error);
      toast({ title: '添加失败', variant: 'destructive' });
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleString('zh-CN');
  };

  const formatDateShort = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('zh-CN');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">加载中...</div>
      </div>
    );
  }

  if (!solution) {
    return (
      <div className="flex flex-col items-center justify-center h-screen space-y-4">
        <div className="text-lg text-muted-foreground">方案不存在</div>
        <Button onClick={() => router.back()}>返回</Button>
      </div>
    );
  }

  const canEdit = userPermission?.permissions.canEdit;

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)]" data-testid="solution-detail-page">
      {/* 顶部标题栏 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{solution.solutionName}</h1>
              <Badge variant={statusConfig[solution.status]?.variant || 'secondary'}>
                {statusConfig[solution.status]?.label || solution.status}
              </Badge>
              {solution.isTemplate && (
                <Badge variant="outline" className="text-primary">模板</Badge>
              )}
              {solution.isPublic && <Badge variant="secondary">公开</Badge>}
            </div>
            <p className="text-sm text-muted-foreground">{solution.solutionCode} · 版本 {solution.version}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && !isEditing && (
            <>
              <Button variant="outline" onClick={handleBatchDownload} data-testid="solution-batch-download-button">
                <Package className="h-4 w-4 mr-2" />
                下载全部
              </Button>
              <Button onClick={() => { setEditForm(solution); setIsEditing(true); }} data-testid="solution-detail-edit-button">
                <Edit className="h-4 w-4 mr-2" />
                编辑
              </Button>
            </>
          )}
          {isEditing && (
            <>
              <Button variant="outline" onClick={() => setIsEditing(false)}>取消</Button>
              <Button onClick={handleSave} data-testid="solution-detail-save-button">保存</Button>
            </>
          )}
        </div>
      </div>

      {/* 主内容区：左右分栏 */}
      <div className="flex-1 flex gap-4 overflow-hidden">
        {/* 左侧信息卡片区 - 固定宽度 */}
        <div className="w-72 shrink-0 space-y-4 overflow-y-auto">
          {/* 基本信息 */}
          <Card data-testid="solution-basic-info-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FileText className="h-4 w-4" />
                基本信息
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {isEditing ? (
                <div className="space-y-3">
                  <div data-testid="solution-detail-name-field">
                    <Label className="text-xs">方案名称</Label>
                    <Input
                      data-testid="solution-detail-name-input"
                      value={editForm.solutionName || ''}
                      onChange={(e) => setEditForm({ ...editForm, solutionName: e.target.value })}
                      className="h-8"
                    />
                  </div>
                  <div data-testid="solution-detail-description-field">
                    <Label className="text-xs">描述</Label>
                    <Textarea
                      data-testid="solution-detail-description-input"
                      value={editForm.description || ''}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      rows={3}
                      className="text-sm"
                    />
                  </div>
                  <div data-testid="solution-detail-status-field">
                    <Label className="text-xs">状态</Label>
                    <Select
                      value={editForm.status || ''}
                      onValueChange={(value) => setEditForm({ ...editForm, status: value })}
                    >
                      <SelectTrigger className="h-8" data-testid="solution-detail-status-trigger">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">草稿</SelectItem>
                        <SelectItem value="reviewing">审核中</SelectItem>
                        <SelectItem value="published">已发布</SelectItem>
                        <SelectItem value="approved">已通过</SelectItem>
                        <SelectItem value="rejected">已拒绝</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-muted-foreground">{solution.description || '暂无描述'}</p>
                  <Separator />
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Building className="h-3.5 w-3.5" />
                      <span>{solution.industry || '未设置'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" />
                      <span>{solution.scenario || '未设置'}</span>
                    </div>
                  </div>
                  <Separator />
                  <div className="space-y-1.5 text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <User className="h-3.5 w-3.5" />
                      <span>创建人：{solution.authorName || '未知'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>创建：{formatDateShort(solution.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5" />
                      <span>更新：{formatDateShort(solution.updatedAt)}</span>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* 使用统计 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                使用统计
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center p-2 bg-muted rounded">
                  <div className="text-lg font-bold">{solution.viewCount}</div>
                  <div className="text-xs text-muted-foreground">浏览</div>
                </div>
                <div className="text-center p-2 bg-muted rounded">
                  <div className="text-lg font-bold">{solution.downloadCount}</div>
                  <div className="text-xs text-muted-foreground">下载</div>
                </div>
                <div className="text-center p-2 bg-muted rounded">
                  <div className="text-lg font-bold">{solution.likeCount}</div>
                  <div className="text-xs text-muted-foreground">点赞</div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">评分</span>
                <span className="font-medium">{solution.rating || '-'}</span>
              </div>
            </CardContent>
          </Card>

          {/* 标签 */}
          {solution.tags && solution.tags.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  标签
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {solution.tags.map((tag, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">{tag}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 团队成员 */}
          <Card data-testid="solution-team-card">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  团队
                </CardTitle>
                {canEdit && (
                  <Button variant="ghost" size="sm" className="h-6 px-2" onClick={() => setShowTeamDialog(true)} data-testid="solution-team-open-dialog-button">
                    <Plus className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {teamMembers.length > 0 ? (
                <div className="space-y-2">
                  {teamMembers.slice(0, 5).map((member) => (
                    <div key={member.id} className="flex items-center justify-between gap-2" data-testid={`solution-team-member-${member.id}`}>
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs shrink-0">
                          {member.userName?.charAt(0) || <User className="h-3 w-3" />}
                        </div>
                        <span className="text-sm truncate max-w-24">{member.userName}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Badge variant="outline" className="text-xs">
                          {roleConfig[member.role]?.label || member.role}
                        </Badge>
                        {canEdit && member.role !== 'owner' && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleRemoveTeamMember(member.id)}
                            data-testid={`solution-team-remove-button-${member.id}`}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  {teamMembers.length > 5 && (
                    <div className="text-xs text-muted-foreground text-center">
                      还有 {teamMembers.length - 5} 名成员
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  暂无团队成员
                </div>
              )}
            </CardContent>
          </Card>

          {/* 子方案概览 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FileStack className="h-4 w-4" />
                子方案能力
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-3xl font-bold">{subSchemes.length}</div>
                <div className="text-xs text-muted-foreground">个挂接子方案</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 右侧主内容区 */}
        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="grid grid-cols-4 w-full max-w-md">
              <TabsTrigger value="sub-schemes">
                <FileStack className="h-4 w-4 mr-1" />
                子方案管理
              </TabsTrigger>
              <TabsTrigger value="versions">
                <GitBranch className="h-4 w-4 mr-1" />
                版本
              </TabsTrigger>
              <TabsTrigger value="projects">
                <Briefcase className="h-4 w-4 mr-1" />
                项目
              </TabsTrigger>
              <TabsTrigger value="reviews">
                <MessageSquare className="h-4 w-4 mr-1" />
                评审
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-hidden mt-4">
              {/* 子方案管理 */}
              <TabsContent value="sub-schemes" className="h-full m-0">
                <ScrollArea className="h-full">
                  <SubSchemeManager solutionId={Number(params.id)} permissions={userPermission} />
                </ScrollArea>
              </TabsContent>

              {/* 版本管理 */}
              <TabsContent value="versions" className="h-full m-0">
                <ScrollArea className="h-full">
                  <SolutionVersionsTab solutionId={Number(params.id)} permissions={userPermission} />
                </ScrollArea>
              </TabsContent>

              {/* 项目关联 */}
              <TabsContent value="projects" className="h-full m-0">
                <ScrollArea className="h-full">
                  <SolutionProjectsTab solutionId={Number(params.id)} solutionName={solution?.solutionName} permissions={userPermission} />
                </ScrollArea>
              </TabsContent>

              {/* 评审记录 */}
              <TabsContent value="reviews" className="h-full m-0">
                <ScrollArea className="h-full">
                  <Card data-testid="solution-reviews-card">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <MessageSquare className="h-5 w-5" />
                            评审记录
                          </CardTitle>
                          <CardDescription>共 {reviews.length} 条记录</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          {solution.status === 'reviewing' && userPermission?.permissions.canApprove && (
                            <>
                              <Button size="sm" variant="outline" onClick={() => setShowRevisionDialog(true)} data-testid="solution-review-request-revision-button">
                                <AlertCircle className="h-4 w-4 mr-2" />
                                要求修订
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => setShowRejectDialog(true)} data-testid="solution-review-reject-button">
                                <ThumbsDown className="h-4 w-4 mr-2" />
                                拒绝
                              </Button>
                              <Button size="sm" onClick={() => handleApproveReview(0)} data-testid="solution-review-approve-button">
                                <ThumbsUp className="h-4 w-4 mr-2" />
                                通过
                              </Button>
                            </>
                          )}
                          {solution.status === 'draft' && canEdit && (
                            <Button size="sm" onClick={() => setShowReviewDialog(true)} data-testid="solution-review-open-dialog-button">
                              <Send className="h-4 w-4 mr-2" />
                              提交评审
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {reviews.length > 0 ? (
                        <div className="space-y-3">
                          {reviews.map((review) => {
                            const StatusIcon = reviewStatusConfig[review.reviewStatus]?.icon || ClockIcon;
                            return (
                              <div key={review.id} className="border rounded-lg p-3" data-testid={`solution-review-record-${review.id}`}>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <StatusIcon className={`h-4 w-4 ${reviewStatusConfig[review.reviewStatus]?.color}`} />
                                    <span className="font-medium text-sm">{review.reviewerName}</span>
                                    <Badge variant="outline" className="text-xs">
                                      {reviewTypeConfig[review.reviewType]?.label || review.reviewType}
                                    </Badge>
                                  </div>
                                  <span className="text-xs text-muted-foreground">
                                    {formatDate(review.reviewedAt || review.createdAt)}
                                  </span>
                                </div>
                                {review.reviewComment && (
                                  <div className="mt-2 p-2 bg-muted rounded text-sm">
                                    {review.reviewComment}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-12 text-muted-foreground">
                          暂无评审记录
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </ScrollArea>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>

      {/* 邀请成员对话框 */}
      <Dialog open={showTeamDialog} onOpenChange={setShowTeamDialog}>
        <DialogContent data-testid="solution-team-dialog">
          <DialogHeader>
            <DialogTitle>邀请成员</DialogTitle>
            <DialogDescription>添加新成员到方案团队</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div data-testid="solution-team-user-field">
              <Label>搜索用户</Label>
              <Input
                data-testid="solution-team-user-search-input"
                placeholder="输入姓名或邮箱搜索..."
                value={searchUser}
                onChange={(e) => {
                  setSearchUser(e.target.value);
                  searchUsers(e.target.value);
                }}
              />
              {availableUsers.length > 0 && (
                <div className="mt-2 border rounded max-h-40 overflow-y-auto">
                  {availableUsers.map((user) => (
                    <div
                      key={user.id}
                      data-testid={`solution-team-user-option-${user.id}`}
                      className="p-2 hover:bg-muted cursor-pointer flex items-center justify-between"
                      onClick={() => {
                        setNewMember({ ...newMember, userId: String(user.id) });
                        setSearchUser(user.realName);
                        setAvailableUsers([]);
                      }}
                    >
                      <div>
                        <div className="font-medium text-sm">{user.realName}</div>
                        <div className="text-xs text-muted-foreground">{user.email}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div data-testid="solution-team-role-field">
              <Label>角色</Label>
              <Select
                value={newMember.role}
                onValueChange={(value) => setNewMember({ ...newMember, role: value })}
              >
                <SelectTrigger data-testid="solution-team-role-trigger">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(roleConfig).map(([key, value]) => (
                    <SelectItem key={key} value={key}>{value.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div data-testid="solution-team-notes-field">
              <Label>备注（可选）</Label>
              <Input
                data-testid="solution-team-notes-input"
                value={newMember.notes}
                onChange={(e) => setNewMember({ ...newMember, notes: e.target.value })}
                placeholder="添加备注..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTeamDialog(false)}>取消</Button>
            <Button onClick={handleAddTeamMember} data-testid="solution-team-submit-button">添加</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 提交评审对话框 */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent data-testid="solution-review-dialog">
          <DialogHeader>
            <DialogTitle>提交评审</DialogTitle>
            <DialogDescription>确认提交此方案进行评审？</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div data-testid="solution-reviewer-field">
              <Label>评审人</Label>
              <Input
                data-testid="solution-reviewer-search-input"
                placeholder="输入姓名或邮箱搜索评审人..."
                value={reviewerSearch}
                onChange={(e) => {
                  const value = e.target.value;
                  setReviewerSearch(value);
                  setSelectedReviewer(null);
                  searchReviewUsers(value);
                }}
              />
              {reviewerOptions.length > 0 && (
                <div className="mt-2 border rounded max-h-40 overflow-y-auto">
                  {reviewerOptions.map((user) => (
                    <div
                      key={user.id}
                      data-testid={`solution-reviewer-option-${user.id}`}
                      className="p-2 hover:bg-muted cursor-pointer"
                      onClick={() => {
                        setSelectedReviewer({ id: user.id, realName: user.realName });
                        setReviewerSearch(user.realName);
                        setReviewerOptions([]);
                      }}
                    >
                      <div className="font-medium text-sm">{user.realName}</div>
                      <div className="text-xs text-muted-foreground">{user.email}</div>
                    </div>
                  ))}
                </div>
              )}
              {selectedReviewer && (
                <p className="mt-2 text-sm text-muted-foreground" data-testid="solution-reviewer-selected-value">
                  已选择：{selectedReviewer.realName}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReviewDialog(false)}>取消</Button>
            <Button onClick={handleSubmitReview} data-testid="solution-review-submit-button">确认提交</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 拒绝对话框 */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent data-testid="solution-review-reject-dialog">
          <DialogHeader>
            <DialogTitle>拒绝方案</DialogTitle>
            <DialogDescription>请填写拒绝理由</DialogDescription>
          </DialogHeader>
          <Textarea
            data-testid="solution-review-reject-comment-input"
            value={rejectComment}
            onChange={(e) => setRejectComment(e.target.value)}
            placeholder="请输入拒绝理由..."
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>取消</Button>
            <Button variant="destructive" onClick={() => handleRejectReview(rejectComment)} data-testid="solution-review-reject-submit-button">确认拒绝</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 要求修订对话框 */}
      <Dialog open={showRevisionDialog} onOpenChange={setShowRevisionDialog}>
        <DialogContent data-testid="solution-review-revision-dialog">
          <DialogHeader>
            <DialogTitle>要求修订</DialogTitle>
            <DialogDescription>请填写修订要求</DialogDescription>
          </DialogHeader>
          <Textarea
            data-testid="solution-review-revision-comment-input"
            value={revisionComment}
            onChange={(e) => setRevisionComment(e.target.value)}
            placeholder="请输入修订要求..."
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRevisionDialog(false)}>取消</Button>
            <Button onClick={() => handleRequestRevision(revisionComment)} data-testid="solution-review-revision-submit-button">发送</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
