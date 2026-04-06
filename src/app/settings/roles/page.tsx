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
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { extractErrorMessage } from '@/lib/api-response';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Edit, Trash2, Shield, ShieldCheck, Settings, Construction } from 'lucide-react';

interface Role {
  id: number;
  roleName: string;
  roleCode: string;
  description: string;
  status: string;
  permissions?: string[];
  createdAt: string;
  updatedAt: string;
}

interface Permission {
  id: number;
  code: string;
  name: string;
  module: string;
  description: string;
}

const moduleNames: Record<string, string> = {
  customer: '客户管理',
  project: '项目管理',
  staff: '人员管理',
  solution: '解决方案',
  performance: '绩效管理',
  alert: '预警管理',
  settings: '系统设置',
  system: '系统',
};

// 系统预设角色编码，不可删除
const SYSTEM_ROLE_CODES = new Set(['admin', 'presale_manager', 'hq_presale_engineer', 'regional_presale_engineer', 'solution_engineer', 'sales_rep', 'finance_specialist']);

function isSystemRoleCode(roleCode: string) {
  return SYSTEM_ROLE_CODES.has(roleCode.toLowerCase());
}

export default function RolesSettings() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    roleName: '',
    roleCode: '',
    description: '',
    status: 'active',
  });

  useEffect(() => {
    Promise.all([
      fetchRoles(),
      fetchPermissions(),
    ]).finally(() => setLoading(false));
  }, []);

  const fetchRoles = async () => {
    try {
      const response = await fetch('/api/roles?includePermissions=true');
      if (response.ok) {
        const result = await response.json();
        setRoles(result.data || result || []);
      }
    } catch (error) {
      console.error('Failed to fetch roles:', error);
    }
  };

  const fetchPermissions = async () => {
    try {
      const response = await fetch('/api/permissions');
      if (response.ok) {
        const result = await response.json();
        setPermissions(result.data || result || []);
      }
    } catch (error) {
      console.error('Failed to fetch permissions:', error);
    }
  };

  const handleSubmit = async () => {
    try {
      const payload = {
        ...formData,
        permissions: selectedPermissions,
      };

      if (editingRole) {
        const response = await fetch('/api/roles', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingRole.id,
            ...payload,
          }),
        });
        if (response.ok) {
          setIsDialogOpen(false);
          resetForm();
          await fetchRoles();
        } else {
          const error = await response.json();
          alert(extractErrorMessage(error.error, '更新失败'));
        }
      } else {
        const response = await fetch('/api/roles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (response.ok) {
          setIsDialogOpen(false);
          resetForm();
          await fetchRoles();
        } else {
          const error = await response.json();
          alert(extractErrorMessage(error.error, '创建失败'));
        }
      }
    } catch (error) {
      console.error('Failed to save role:', error);
      alert('保存失败，请重试');
    }
  };

  const resetForm = () => {
    setFormData({
      roleName: '',
      roleCode: '',
      description: '',
      status: 'active',
    });
    setSelectedPermissions([]);
    setEditingRole(null);
  };

  const handleEdit = (role: Role) => {
    setEditingRole(role);
    setFormData({
      roleName: role.roleName,
      roleCode: role.roleCode,
      description: role.description || '',
      status: role.status,
    });
    setSelectedPermissions(role.permissions || []);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    // 检查是否是系统角色
    const role = roles.find(r => r.id === id);
    if (role && isSystemRoleCode(role.roleCode)) {
      alert('系统预设角色不能删除');
      return;
    }

    if (!confirm('确定要删除这个角色吗？此操作不可撤销。')) {
      return;
    }

    try {
      const response = await fetch(`/api/roles?id=${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        await fetchRoles();
      } else {
        const error = await response.json();
        alert(extractErrorMessage(error.error, '删除失败'));
      }
    } catch (error) {
      console.error('Failed to delete role:', error);
      alert('删除失败，请重试');
    }
  };

  const handlePermissionToggle = (code: string) => {
    if (selectedPermissions.includes(code)) {
      setSelectedPermissions(selectedPermissions.filter(p => p !== code));
    } else {
      setSelectedPermissions([...selectedPermissions, code]);
    }
  };

  const handleModuleSelectAll = (module: string, allChecked: boolean) => {
    const modulePermissions = permissions
      .filter(p => p.module === module)
      .map(p => p.code);

    if (allChecked) {
      setSelectedPermissions([...new Set([...selectedPermissions, ...modulePermissions])]);
    } else {
      setSelectedPermissions(selectedPermissions.filter(p => !modulePermissions.includes(p)));
    }
  };

  const isModuleAllSelected = (module: string) => {
    const modulePermissions = permissions
      .filter(p => p.module === module)
      .map(p => p.code);
    return modulePermissions.length > 0 && modulePermissions.every(p => selectedPermissions.includes(p));
  };

  const isModulePartiallySelected = (module: string) => {
    const modulePermissions = permissions
      .filter(p => p.module === module)
      .map(p => p.code);
    return modulePermissions.some(p => selectedPermissions.includes(p)) && !isModuleAllSelected(module);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="roles-page-loading">
        <div className="text-lg">加载中...</div>
      </div>
    );
  }

  // 按模块分组权限
  const permissionsByModule = permissions.reduce((acc, permission) => {
    if (!acc[permission.module]) {
      acc[permission.module] = [];
    }
    acc[permission.module].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);

  return (
    <div className="space-y-6" data-testid="roles-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">角色权限配置</h2>
          <p className="text-muted-foreground">基于角色的访问控制 (RBAC)</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()} data-testid="roles-add-button">
              <Plus className="h-4 w-4 mr-2" />
              新增角色
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto" data-testid="roles-dialog">
            <DialogHeader>
              <DialogTitle>{editingRole ? '编辑角色' : '新增角色'}</DialogTitle>
              <DialogDescription>
                配置角色的基本信息和权限
              </DialogDescription>
            </DialogHeader>
            
            <Tabs defaultValue="basic" className="w-full" data-testid="roles-tabs">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="basic" data-testid="roles-basic-tab">基本信息</TabsTrigger>
                <TabsTrigger value="permissions" data-testid="roles-permissions-tab">权限配置</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>角色名称</Label>
                    <Input
                      data-testid="roles-role-name-input"
                      value={formData.roleName}
                      onChange={(e) => setFormData({ ...formData, roleName: e.target.value })}
                      placeholder="例如：售前经理"
                    />
                  </div>
                  <div>
                    <Label>角色编码</Label>
                    <Input
                      data-testid="roles-role-code-input"
                      value={formData.roleCode}
                      onChange={(e) => setFormData({ ...formData, roleCode: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                      placeholder="例如：presales_manager"
                      disabled={!!editingRole}
                    />
                    <p className="text-xs text-muted-foreground mt-1">英文下划线格式，创建后不可修改</p>
                  </div>
                </div>
                <div>
                  <Label>描述</Label>
                  <Textarea
                    data-testid="roles-description-input"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="描述该角色的职责和权限范围"
                    rows={3}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="status"
                    data-testid="roles-status-switch"
                    checked={formData.status === 'active'}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, status: checked ? 'active' : 'inactive' })
                    }
                  />
                  <Label htmlFor="status" className="cursor-pointer">
                    启用状态
                  </Label>
                </div>
              </TabsContent>

              <TabsContent value="permissions" className="space-y-4">
                <div className="text-sm text-muted-foreground mb-2">
                  勾选角色所需的权限，用户将继承其所属角色的权限
                </div>
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-4">
                    {Object.entries(permissionsByModule).map(([module, modulePerms]) => {
                      const allSelected = isModuleAllSelected(module);
                      return (
                        <Card key={module} data-testid={`roles-permission-module-${module}`}>
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-base flex items-center gap-2">
                                <Shield className="h-4 w-4" />
                                {moduleNames[module] || module}
                              </CardTitle>
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  id={`module-${module}`}
                                  data-testid={`roles-module-checkbox-${module}`}
                                  checked={allSelected}
                                  onCheckedChange={() => handleModuleSelectAll(module, !allSelected)}
                                />
                                <Label htmlFor={`module-${module}`} className="text-sm cursor-pointer">
                                  全选
                                </Label>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="grid grid-cols-2 gap-3">
                              {modulePerms.map((permission) => (
                                <div key={permission.id} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`perm-${permission.id}`}
                                    data-testid={`roles-permission-checkbox-${permission.code}`}
                                    checked={selectedPermissions.includes(permission.code)}
                                    onCheckedChange={() => handlePermissionToggle(permission.code)}
                                  />
                                  <Label
                                    htmlFor={`perm-${permission.id}`}
                                    className="text-sm cursor-pointer flex-1"
                                  >
                                    {permission.name}
                                  </Label>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
            
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} data-testid="roles-cancel-button">
                取消
              </Button>
              <Button onClick={handleSubmit} data-testid="roles-save-button">
                {editingRole ? '更新' : '创建'}
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
            <CardTitle className="text-sm font-medium">角色总数</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{roles.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              已定义 {roles.length} 个角色
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">启用角色</CardTitle>
            <ShieldCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {roles.filter(r => r.status === 'active').length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              占比 {roles.length > 0 ? ((roles.filter(r => r.status === 'active').length / roles.length) * 100).toFixed(0) : 0}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">权限总数</CardTitle>
            <Settings className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {permissions.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              系统共定义 {permissions.length} 个权限
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Roles List */}
      <Card data-testid="roles-list-card">
        <CardHeader>
          <CardTitle>角色列表</CardTitle>
          <CardDescription>管理所有角色的配置信息</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>角色名称</TableHead>
                <TableHead>角色编码</TableHead>
                <TableHead>描述</TableHead>
                <TableHead className="text-center">权限数</TableHead>
                <TableHead className="text-center">状态</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles.map((role) => (
                <TableRow key={role.id} data-testid={`roles-row-${role.id}`}>
                  <TableCell className="font-medium">
                    {role.roleName}
                    {isSystemRoleCode(role.roleCode) && (
                      <Badge variant="outline" className="ml-2 text-xs">系统</Badge>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {role.roleCode}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm max-w-xs truncate">
                    {role.description || '-'}
                  </TableCell>
                  <TableCell className="text-center">
                    {(role.permissions || []).includes('*') ? '全部' : (role.permissions || []).length}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={role.status === 'active' ? 'default' : 'secondary'}>
                      {role.status === 'active' ? '启用' : '禁用'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(role)}
                        data-testid={`roles-edit-button-${role.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(role.id)}
                        disabled={isSystemRoleCode(role.roleCode)}
                        data-testid={`roles-delete-button-${role.id}`}
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
