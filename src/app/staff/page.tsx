'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DictSelect } from '@/components/dictionary/dict-select';
import {
  Search,
  Mail,
  Phone,
  Building,
  Eye,
  Calendar,
  MapPin,
  Briefcase,
  User,
  ArrowRight,
  Shield,
  IdCard,
} from 'lucide-react';

interface Staff {
  id: number;
  profileId: number | null;
  username: string;
  realName: string;
  employeeId: string | null;
  email: string;
  phone: string | null;
  department: string | null;
  roleId: number | null;
  roleName: string | null;
  roleCode: string | null;
  roleIds: number[];
  roleNames: string[];
  status: string;
  profileStatus: string | null;
  avatar: string | null;
  lastLoginTime: string | null;
  createdAt: string;
  hireDate: string | null;
  position: string | null;
  location: string | null;
  birthday: string | null;
  gender: string | null;
}

const ITEMS_PER_PAGE = 10;

export default function StaffPage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [rolesList, setRolesList] = useState<Array<{ id: number; roleName: string; roleCode: string }>>([]);

  useEffect(() => {
    Promise.all([fetchStaff(), fetchRoles()]).finally(() => setLoading(false));
  }, []);

  const fetchStaff = async () => {
    try {
      const response = await fetch('/api/staff');
      const result = await response.json();
      setStaff(result.data || result || []);
    } catch (error) {
      console.error('Failed to fetch staff:', error);
      setStaff([]);
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await fetch('/api/roles');
      const result = await response.json();
      setRolesList(result.data || result || []);
    } catch (error) {
      console.error('Failed to fetch roles:', error);
      setRolesList([]);
    }
  };

  const filteredStaff = staff.filter((member) => {
    const keyword = search.toLowerCase();
    const matchesSearch =
      (member.realName?.toLowerCase() || '').includes(keyword) ||
      (member.username?.toLowerCase() || '').includes(keyword) ||
      (member.email?.toLowerCase() || '').includes(keyword) ||
      (member.employeeId?.toLowerCase() || '').includes(keyword) ||
      member.phone?.includes(search);

    const matchesDepartment = departmentFilter === 'all' || member.department === departmentFilter;
    const matchesRole = roleFilter === 'all' || member.roleCode === roleFilter;
    const matchesStatus = statusFilter === 'all' || member.status === statusFilter;

    return matchesSearch && matchesDepartment && matchesRole && matchesStatus;
  });

  const paginatedStaff = filteredStaff.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [search, departmentFilter, roleFilter, statusFilter]);

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      active: { label: '启用', variant: 'default' },
      inactive: { label: '禁用', variant: 'secondary' },
    };
    const statusInfo = statusMap[status] || { label: status || '-', variant: 'outline' as const };
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  const getRoleBadges = (member: Staff) => {
    if (member.roleIds.length > 0) {
      return member.roleIds.map((roleId, index) => {
        const role = rolesList.find((item) => item.id === roleId);
        return (
          <Badge key={roleId} variant="outline">
            {role?.roleName || member.roleNames[index] || '-'}
          </Badge>
        );
      });
    }

    if (member.roleName || member.roleCode) {
      return [
        <Badge key={`${member.id}-primary-role`} variant="outline">
          {member.roleName || member.roleCode}
        </Badge>,
      ];
    }

    return [
      <Badge key={`${member.id}-no-role`} variant="outline">
        未分配角色
      </Badge>,
    ];
  };

  return (
    <div className="space-y-6" data-testid="staff-page">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">人员档案</h1>
          <p className="text-muted-foreground">人员管理模块只保留档案与关系视图；账号新增、编辑、删除已收敛到用户配置。</p>
        </div>
        <Button asChild data-testid="staff-account-entry-link">
          <Link href="/settings/users">
            <Shield className="mr-2 h-4 w-4" />
            前往用户配置
          </Link>
        </Button>
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-2 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
            <div>账号口令、启停用、角色分配统一在“系统设置 / 用户配置”维护。</div>
            <div>当前页面用于查看人员档案、项目关系和履历信息，不再承担账号生命周期写入。</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[220px] relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                data-testid="staff-search-input"
                placeholder="搜索姓名、工号、用户名、邮箱、电话..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <DictSelect
              category="department"
              value={departmentFilter === 'all' ? '' : departmentFilter}
              onValueChange={(value) => setDepartmentFilter(value || 'all')}
              placeholder="部门筛选"
              allowClear
              className="w-[180px]"
            />
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="角色筛选" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部角色</SelectItem>
                <SelectItem value="admin">管理员</SelectItem>
                <SelectItem value="presale_manager">售前主管</SelectItem>
                <SelectItem value="hq_presale_engineer">总部售前</SelectItem>
                <SelectItem value="solution_engineer">解决方案</SelectItem>
                <SelectItem value="regional_presale_engineer">区域售前</SelectItem>
                <SelectItem value="sales_rep">销售代表</SelectItem>
                <SelectItem value="finance_specialist">财务专员</SelectItem>
              </SelectContent>
            </Select>
            <DictSelect
              category="user_status"
              value={statusFilter === 'all' ? '' : statusFilter}
              onValueChange={(value) => setStatusFilter(value || 'all')}
              placeholder="账户状态"
              allowClear
              className="w-[150px]"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>人员档案列表 ({filteredStaff.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">加载中...</div>
          ) : filteredStaff.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">暂无人员档案数据</div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>姓名</TableHead>
                    <TableHead>工号</TableHead>
                    <TableHead>角色</TableHead>
                    <TableHead>联系方式</TableHead>
                    <TableHead>部门</TableHead>
                    <TableHead>档案状态</TableHead>
                    <TableHead>账户状态</TableHead>
                    <TableHead>最后登录</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedStaff.map((member) => (
                    <TableRow
                      key={member.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedStaff(member)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback>{member.realName.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{member.realName}</div>
                            <div className="text-sm text-muted-foreground">{member.username}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm">
                          <IdCard className="h-3 w-3 text-muted-foreground" />
                          {member.employeeId || '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">{getRoleBadges(member)}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1 text-sm">
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {member.email}
                          </div>
                          {member.phone && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              {member.phone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Building className="h-3 w-3 text-muted-foreground" />
                          {member.department || '-'}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(member.profileStatus || 'active')}</TableCell>
                      <TableCell>{getStatusBadge(member.status)}</TableCell>
                      <TableCell>
                        {member.lastLoginTime
                          ? new Date(member.lastLoginTime).toLocaleDateString('zh-CN')
                          : '从未登录'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          data-testid={`staff-view-button-${member.id}`}
                          variant="ghost"
                          size="sm"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedStaff(member);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {filteredStaff.length > ITEMS_PER_PAGE && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    显示 {(currentPage - 1) * ITEMS_PER_PAGE + 1} 到{' '}
                    {Math.min(currentPage * ITEMS_PER_PAGE, filteredStaff.length)} 条，共 {filteredStaff.length} 条
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                      disabled={currentPage === 1}
                    >
                      上一页
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((page) => Math.min(Math.ceil(filteredStaff.length / ITEMS_PER_PAGE), page + 1))}
                      disabled={currentPage >= Math.ceil(filteredStaff.length / ITEMS_PER_PAGE)}
                    >
                      下一页
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Drawer open={!!selectedStaff} onOpenChange={(open) => !open && setSelectedStaff(null)} direction="right">
        <DrawerContent className="max-h-[85vh] w-[500px]">
          {selectedStaff && (
            <>
              <DrawerHeader>
                <DrawerTitle className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="text-lg">{selectedStaff.realName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="text-xl">{selectedStaff.realName}</div>
                    <div className="text-sm text-muted-foreground">{selectedStaff.username}</div>
                  </div>
                </DrawerTitle>
                <DrawerDescription>
                  人员档案视图。账号变更入口已收敛到“系统设置 / 用户配置”。
                </DrawerDescription>
              </DrawerHeader>

              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">工号</div>
                    <div className="font-medium">{selectedStaff.employeeId || '-'}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">角色</div>
                    <div className="flex flex-wrap gap-1">{getRoleBadges(selectedStaff)}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">档案状态</div>
                    <div>{getStatusBadge(selectedStaff.profileStatus || 'active')}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">账户状态</div>
                    <div>{getStatusBadge(selectedStaff.status)}</div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <User className="h-5 w-5" />
                    基本信息
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground mb-1">姓名</div>
                      <div className="font-medium">{selectedStaff.realName}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground mb-1">性别</div>
                      <div className="font-medium">{selectedStaff.gender || '-'}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground mb-1">职位</div>
                      <div className="font-medium flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                        {selectedStaff.position || '-'}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground mb-1">入职日期</div>
                      <div className="font-medium flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {selectedStaff.hireDate ? new Date(selectedStaff.hireDate).toLocaleDateString('zh-CN') : '-'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    联系方式
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedStaff.email}</span>
                    </div>
                    {selectedStaff.phone && (
                      <div className="flex items-center gap-3">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedStaff.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <Building className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedStaff.department || '-'}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedStaff.location || '-'}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
                  账号密码、启停用、角色分配、删除用户等操作已从本页移除，统一回到“系统设置 / 用户配置”处理，避免人员档案与用户账号双入口维护同一实体。
                </div>
              </div>

              <DrawerFooter>
                <Button variant="outline" onClick={() => setSelectedStaff(null)}>
                  关闭
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/settings/users">
                    前往用户配置
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild>
                  <Link href={`/staff/${selectedStaff.id}`}>
                    查看完整档案
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </DrawerFooter>
            </>
          )}
        </DrawerContent>
      </Drawer>
    </div>
  );
}