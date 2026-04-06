'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { extractErrorMessage } from '@/lib/api-response';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Edit, Trash2, Users, Shield, Mail, MapPin, Construction } from 'lucide-react';

interface User {
  id: number;
  username: string;
  email: string;
  name: string;
  avatar: string | null;
  status: string;
  roles: number[];
  roleIds: number[];
  roleNames: string[];
  roleCodes: string[];
  phone: string | null;
  baseLocation: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Role {
  id: number;
  name: string;
  code: string;
  roleName?: string;
  roleCode?: string;
}

interface Subsidiary {
  id: number;
  code: string;
  name: string;
}

// 区域售前工程师角色编码
const REGIONAL_PRESALE_CODE = 'regional_presale_engineer';

export default function UsersSettings() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [subsidiaries, setSubsidiaries] = useState<Subsidiary[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    name: '',
    password: '',
    phone: '',
    status: 'active',
    roleIds: [] as number[],
    baseLocation: '',
  });

  useEffect(() => {
    Promise.all([
      fetchUsers(),
      fetchRoles(),
      fetchSubsidiaries(),
    ]).finally(() => setLoading(false));
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users?includeRoles=true');
      if (response.ok) {
        const result = await response.json();
        setUsers(result.data || result || []);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await fetch('/api/roles');
      if (response.ok) {
        const result = await response.json();
        // 兼容两种字段名
        const roleList = (result.data || result || []).map((r: any) => ({
          id: r.id,
          name: r.name || r.roleName,
          code: r.code || r.roleCode,
        }));
        setRoles(roleList);
      }
    } catch (error) {
      console.error('Failed to fetch roles:', error);
    }
  };

  const fetchSubsidiaries = async () => {
    try {
      const response = await fetch('/api/subsidiaries?simple=true&status=active');
      if (response.ok) {
        const result = await response.json();
        setSubsidiaries(result.data || result || []);
      }
    } catch (error) {
      console.error('Failed to fetch subsidiaries:', error);
    }
  };

  const handleSubmit = async () => {
    // 验证区域售前工程师必须填写Base所在地
    if (shouldShowBaseLocation() && !formData.baseLocation) {
      alert('区域售前工程师必须选择Base所在地');
      return;
    }

    try {
      const payload = {
        username: formData.username,
        email: formData.email,
        name: formData.name,
        password: formData.password || undefined,
        phone: formData.phone || null,
        status: formData.status,
        roleIds: formData.roleIds,
        baseLocation: formData.baseLocation || null,
      };

      if (editingUser) {
        // 编辑时如果密码为空则不传
        if (!payload.password) {
          delete (payload as any).password;
        }
        const response = await fetch('/api/users', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingUser.id,
            ...payload,
          }),
        });
        if (response.ok) {
          setIsDialogOpen(false);
          resetForm();
          await fetchUsers();
        } else {
          const error = await response.json();
          alert(extractErrorMessage(error.error, '更新失败'));
        }
      } else {
        const response = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (response.ok) {
          setIsDialogOpen(false);
          resetForm();
          await fetchUsers();
        } else {
          const error = await response.json();
          alert(extractErrorMessage(error.error, '创建失败'));
        }
      }
    } catch (error) {
      console.error('Failed to save user:', error);
      alert('保存失败，请重试');
    }
  };

  const resetForm = () => {
    setFormData({
      username: '',
      email: '',
      name: '',
      password: '',
      phone: '',
      status: 'active',
      roleIds: [],
      baseLocation: '',
    });
    setEditingUser(null);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      email: user.email,
      name: user.name,
      password: '',
      phone: user.phone || '',
      status: user.status,
      roleIds: user.roleIds || user.roles || [],
      baseLocation: user.baseLocation || '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这个用户吗？此操作不可撤销。')) {
      return;
    }

    try {
      const response = await fetch(`/api/users?id=${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        await fetchUsers();
      }
    } catch (error) {
      console.error('Failed to delete user:', error);
    }
  };

  // 切换角色选择
  const handleRoleToggle = (roleId: number) => {
    setFormData(prev => {
      const newRoleIds = prev.roleIds.includes(roleId)
        ? prev.roleIds.filter(id => id !== roleId)
        : [...prev.roleIds, roleId];
      
      // 如果取消选择区域售前工程师，清空Base所在地
      const hasRegionalPresale = newRoleIds.some(id => {
        const role = roles.find(r => r.id === id);
        return role?.code === REGIONAL_PRESALE_CODE;
      });
      
      return {
        ...prev,
        roleIds: newRoleIds,
        baseLocation: hasRegionalPresale ? prev.baseLocation : '',
      };
    });
  };

  // 判断是否需要显示Base所在地
  const shouldShowBaseLocation = () => {
    return formData.roleIds.some(id => {
      const role = roles.find(r => r.id === id);
      return role?.code === REGIONAL_PRESALE_CODE;
    });
  };

  // 判断用户是否有区域售前工程师角色
  const hasRegionalPresaleRole = (user: User) => {
    return (user.roleCodes || []).includes(REGIONAL_PRESALE_CODE);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">加载中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">用户配置</h2>
          <p className="text-muted-foreground">管理用户账号和角色分配</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="h-4 w-4 mr-2" />
              新增用户
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingUser ? '编辑用户' : '新增用户'}</DialogTitle>
              <DialogDescription>
                配置用户的基本信息和角色（支持多角色）
              </DialogDescription>
            </DialogHeader>
            
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="basic">基本信息</TabsTrigger>
                <TabsTrigger value="roles">角色分配</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>用户名 *</Label>
                    <Input
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      placeholder="例如：zhang_san"
                      disabled={!!editingUser}
                    />
                    <p className="text-xs text-muted-foreground mt-1">登录账号，创建后不可修改</p>
                  </div>
                  <div>
                    <Label>姓名 *</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="例如：张三"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>邮箱 *</Label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="例如：zhang@example.com"
                    />
                  </div>
                  <div>
                    <Label>电话</Label>
                    <Input
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="例如：13800138000"
                    />
                  </div>
                </div>
                <div>
                  <Label>{editingUser ? '密码（留空则不修改）' : '密码 *'}</Label>
                  <Input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder={editingUser ? "留空则不修改密码" : "请输入密码"}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {editingUser ? '管理员重置密码后，用户下次登录将被要求修改密码。' : '新建账号后，用户首次登录将被要求修改密码。'}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="status"
                    checked={formData.status === 'active'}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, status: checked ? 'active' : 'inactive' })
                    }
                  />
                  <Label htmlFor="status" className="cursor-pointer">
                    启用账号
                  </Label>
                </div>
              </TabsContent>

              <TabsContent value="roles" className="space-y-4">
                <div className="text-sm text-muted-foreground mb-2">
                  为用户分配角色（可多选），用户将继承所选角色的所有权限
                </div>
                <ScrollArea className="h-[300px] pr-4">
                  <div className="space-y-3">
                    {roles.map((role) => {
                      const isSelected = formData.roleIds.includes(role.id);
                      return (
                        <Card 
                          key={role.id} 
                          data-testid={`user-role-card-${role.id}`}
                          className={isSelected ? 'border-primary bg-primary/5' : ''}
                        >
                          <CardContent className="pt-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <Checkbox
                                  id={`role-${role.id}`}
                                  data-testid={`user-role-toggle-${role.id}`}
                                  checked={isSelected}
                                  onCheckedChange={() => handleRoleToggle(role.id)}
                                />
                                <div>
                                  <Label
                                    htmlFor={`role-${role.id}`}
                                    className="font-medium cursor-pointer"
                                  >
                                    {role.name}
                                  </Label>
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {role.code}
                                  </p>
                                </div>
                              </div>
                              <Badge variant="outline">RBAC</Badge>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </ScrollArea>

                {/* Base所在地选择器 - 仅当选择了区域售前工程师角色时显示 */}
                {shouldShowBaseLocation() && (
                  <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-amber-600" />
                        Base所在地 *
                      </CardTitle>
                      <CardDescription className="text-xs">
                        区域售前工程师需要指定工作地点（分子公司）
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <Select
                        value={formData.baseLocation}
                        onValueChange={(value) => setFormData({ ...formData, baseLocation: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="请选择Base所在地" />
                        </SelectTrigger>
                        <SelectContent>
                          {subsidiaries.map((sub) => (
                            <SelectItem key={sub.id} value={sub.name}>
                              {sub.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
            
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleSubmit}>
                {editingUser ? '更新' : '创建'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* ABAC 开发中提示 */}
      <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800">
        <Construction className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-700 dark:text-amber-300">
          基于属性的访问控制（ABAC）功能尚在开发中，敬请期待。当前仅支持基于角色的访问控制（RBAC）。
        </AlertDescription>
      </Alert>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">用户总数</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              系统共 {users.length} 个用户
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">启用用户</CardTitle>
            <Users className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {users.filter(u => u.status === 'active').length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              占比 {users.length > 0 ? ((users.filter(u => u.status === 'active').length / users.length) * 100).toFixed(0) : 0}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">已分配角色</CardTitle>
            <Shield className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {users.filter(u => u.roleIds && u.roleIds.length > 0).length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              已分配角色的用户数
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle>用户列表</CardTitle>
          <CardDescription>管理所有用户的角色配置（支持多角色）</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>用户名</TableHead>
                <TableHead>姓名</TableHead>
                <TableHead>邮箱</TableHead>
                <TableHead>电话</TableHead>
                <TableHead>角色</TableHead>
                <TableHead>Base所在地</TableHead>
                <TableHead className="text-center">状态</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-mono text-sm">
                    {user.username}
                  </TableCell>
                  <TableCell className="font-medium">
                    {user.name}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-3 w-3 text-muted-foreground" />
                      {user.email}
                    </div>
                  </TableCell>
                  <TableCell>
                    {user.phone || '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {(user.roleNames || []).map((roleName, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {roleName}
                        </Badge>
                      ))}
                      {(!user.roleNames || user.roleNames.length === 0) && (
                        <span className="text-muted-foreground text-sm">未分配</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {hasRegionalPresaleRole(user) ? (
                      <Badge variant="outline" className="gap-1">
                        <MapPin className="h-3 w-3" />
                        {user.baseLocation || '未设置'}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
                      {user.status === 'active' ? '启用' : '禁用'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        data-testid="user-edit-button"
                        onClick={() => handleEdit(user)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        data-testid="user-delete-button"
                        onClick={() => handleDelete(user.id)}
                        disabled={user.username === 'admin'}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
