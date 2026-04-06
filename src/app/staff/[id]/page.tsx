'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
  Mail,
  Phone,
  Building,
  Briefcase,
  Calendar,
  MapPin,
  User,
  TrendingUp,
  Tag,
  FolderKanban,
} from 'lucide-react';
import StaffTagManager from '@/components/staff-tag-manager';
import StaffAssessmentManager from '@/components/staff-assessment-manager';

interface Staff {
  id: number;
  username: string;
  realName: string;
  email: string;
  phone: string | null;
  department: string | null;
  roleId: number | null;
  roleName: string | null;
  roleCode: string | null;
  status: string;
  avatar: string | null;
  lastLoginTime: string | null;
  createdAt: string;
  hireDate: string | null;
  position: string | null;
  location: string | null;
  birthday: string | null;
  gender: string | null;
}

interface StaffProject {
  id: number;
  staffId: number;
  projectId: number;
  projectCode: string;
  projectName: string;
  role: string;
  joinDate: string;
  leaveDate: string | null;
  status: string;
  statusLabel?: string;
  contribution: number;
  workload: number;
}

interface StaffTag {
  id: number;
  staffId: number;
  tagName: string;
  tagType: string;
  tagColor: string;
  description: string;
  createdAt: string;
  createdBy: string;
}

interface StaffAssessment {
  id: number;
  staffId: number;
  staffName: string;
  assessmentPeriod: string;
  assessmentType: string;
  overallScore: number;
  rating: string;
  assessor: string;
  assessDate: string;
  status: string;
  comments: string;
  criteria: Record<string, number>;
  createdAt: string;
  createdBy: string;
}

export default function StaffDetailPage() {
  const params = useParams();
  const router = useRouter();
  const staffId = params.id as string;

  const [staff, setStaff] = useState<Staff | null>(null);
  const [projects, setProjects] = useState<StaffProject[]>([]);
  const [tags, setTags] = useState<StaffTag[]>([]);
  const [assessments, setAssessments] = useState<StaffAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('basic');

  useEffect(() => {
    loadData();
  }, [staffId]);

  const loadData = async () => {
    try {
      setLoading(true);
      // 调用正确的 API
      const [profileRes, projectsRes] = await Promise.all([
        fetch(`/api/staff/profile/${staffId}`),
        fetch(`/api/staff/relations/projects?staffId=${staffId}`),
      ]);

      if (!profileRes.ok || !projectsRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const profileData = await profileRes.json();
      const projectsData = await projectsRes.json();

      setStaff(profileData.data);
      setProjects(projectsData.data || []);
      setTags([]); // 暂无标签 API
      setAssessments([]); // 暂无考核 API
    } catch (error) {
      console.error('Failed to load staff data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      active: { label: '启用', variant: 'default' },
      inactive: { label: '禁用', variant: 'secondary' },
      in_progress: { label: '进行中', variant: 'default' },
      completed: { label: '已完成', variant: 'outline' },
    };
    const statusInfo = statusMap[status] || { label: status, variant: 'default' as const };
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  const getRatingBadge = (rating: string) => {
    const ratingMap: Record<string, { color: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      '优秀': { color: 'bg-green-100 text-green-600', variant: 'outline' as const },
      '良好': { color: 'bg-blue-100 text-blue-600', variant: 'secondary' as const },
      '合格': { color: 'bg-yellow-100 text-yellow-600', variant: 'outline' as const },
      '待改进': { color: 'bg-red-100 text-red-600', variant: 'destructive' as const },
      '不合格': { color: 'bg-red-100 text-red-600', variant: 'destructive' as const },
    };
    const ratingInfo = ratingMap[rating] || { color: 'bg-gray-100 text-gray-600', variant: 'secondary' as const };
    return <Badge variant={ratingInfo.variant}>{rating}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  if (!staff) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">人员不存在</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">人员详情</h1>
          <p className="text-muted-foreground">查看和管理人员详细信息</p>
        </div>
      </div>

      {/* 人员基本信息卡片 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-6">
            <Avatar className="h-20 w-20">
              <AvatarFallback className="text-3xl">{staff.realName.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold">{staff.realName}</h2>
                <Badge variant="outline">{staff.username}</Badge>
                {getStatusBadge(staff.status)}
              </div>
              <div className="text-muted-foreground mb-4">
                {staff.department} · {staff.position}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{staff.email}</span>
                </div>
                {staff.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{staff.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{staff.department || '-'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{staff.position || '-'}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 详情标签页 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="basic">
            <User className="h-4 w-4 mr-2" />
            基本信息
          </TabsTrigger>
          <TabsTrigger value="projects">
            <FolderKanban className="h-4 w-4 mr-2" />
            参与项目
            <Badge variant="secondary" className="ml-2">{projects.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="tags">
            <Tag className="h-4 w-4 mr-2" />
            标签管理
            <Badge variant="secondary" className="ml-2">{tags.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="assessments">
            <TrendingUp className="h-4 w-4 mr-2" />
            考核管理
            <Badge variant="secondary" className="ml-2">{assessments.length}</Badge>
          </TabsTrigger>
        </TabsList>

        {/* 基本信息 */}
        <TabsContent value="basic" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>个人信息</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">姓名</div>
                    <div className="font-medium">{staff.realName}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">用户名</div>
                    <div className="font-medium">{staff.username}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">性别</div>
                    <div className="font-medium">{staff.gender || '-'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">出生日期</div>
                    <div className="font-medium">
                      {staff.birthday ? new Date(staff.birthday).toLocaleDateString('zh-CN') : '-'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>联系方式</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{staff.email}</span>
                </div>
                {staff.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{staff.phone}</span>
                  </div>
                )}
                {staff.location && (
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{staff.location}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>职位信息</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">部门</div>
                    <div className="font-medium flex items-center gap-2">
                      <Building className="h-4 w-4 text-muted-foreground" />
                      {staff.department || '-'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">职位</div>
                    <div className="font-medium">{staff.position || '-'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">角色</div>
                    <div className="font-medium">
                      <Badge variant="outline">{staff.roleCode}</Badge>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">状态</div>
                    <div className="font-medium">{getStatusBadge(staff.status)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">入职日期</div>
                    <div className="font-medium flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {staff.hireDate ? new Date(staff.hireDate).toLocaleDateString('zh-CN') : '-'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">创建时间</div>
                    <div className="font-medium">{new Date(staff.createdAt).toLocaleDateString('zh-CN')}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>账户信息</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">最后登录时间</div>
                  <div className="font-medium">
                    {staff.lastLoginTime
                      ? new Date(staff.lastLoginTime).toLocaleString('zh-CN')
                      : '从未登录'}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 参与项目 */}
        <TabsContent value="projects">
          <Card>
            <CardHeader>
              <CardTitle>参与项目 ({projects.length})</CardTitle>
              <CardDescription>该人员参与的所有项目列表</CardDescription>
            </CardHeader>
            <CardContent>
              {projects.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  暂无参与的项目
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>项目名称</TableHead>
                      <TableHead>项目编号</TableHead>
                      <TableHead>角色</TableHead>
                      <TableHead>加入日期</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>贡献度</TableHead>
                      <TableHead>工作量</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projects.map((project) => (
                      <TableRow key={project.id}>
                        <TableCell className="font-medium">{project.projectName}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{project.projectCode}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{project.role}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {new Date(project.joinDate).toLocaleDateString('zh-CN')}
                        </TableCell>
                        <TableCell>
                          {project.statusLabel ? (
                            <Badge variant={project.statusLabel === '已归档' || project.statusLabel === '已取消' ? 'outline' : 'secondary'}>
                              {project.statusLabel}
                            </Badge>
                          ) : getStatusBadge(project.status)}
                        </TableCell>
                        <TableCell className="text-sm">
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-secondary rounded-full h-2">
                              <div
                                className="bg-primary h-2 rounded-full"
                                style={{ width: `${project.contribution}%` }}
                              />
                            </div>
                            <span className="text-xs">{project.contribution}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{project.workload}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 标签管理 */}
        <TabsContent value="tags">
          <StaffTagManager
            staffId={parseInt(staffId)}
            tags={tags}
            onTagsChange={loadData}
          />
        </TabsContent>

        {/* 考核管理 */}
        <TabsContent value="assessments">
          <StaffAssessmentManager
            staffId={parseInt(staffId)}
            staffName={staff.realName}
            assessments={assessments}
            onAssessmentsChange={loadData}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
