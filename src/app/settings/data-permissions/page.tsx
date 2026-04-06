'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Shield, Plus, Edit2, Trash2, Lock } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface Role {
  id: number;
  roleName: string;
  roleCode: string;
}

interface DataPermission {
  id: number;
  roleId: number;
  resource: string;
  scope: string;
  allowedFields?: string[];
  conditions?: Record<string, any>;
  role?: Role;
}

const RESOURCE_LABELS: Record<string, string> = {
  customer: '客户管理',
  project: '项目管理',
  solution: '解决方案',
  task: '任务管理',
  opportunity: '商机管理',
  bidding: '投标管理',
  arbitration: '成本仲裁',
  alert: '预警管理',
};

const SCOPE_LABELS: Record<string, { label: string; description: string }> = {
  all: { label: '全部数据', description: '可访问所有数据' },
  self: { label: '仅自己', description: '仅可访问自己创建或负责的数据' },
  role: { label: '本角色', description: '可访问本角色所有用户的数据' },
  manage: { label: '下级及自己', description: '可访问下级用户及自己的数据' },
};

export default function DataPermissionsSettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState<DataPermission[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>('all');
  
  // 编辑对话框状态
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPermission, setEditingPermission] = useState<DataPermission | null>(null);
  const [formData, setFormData] = useState({
    roleId: '',
    resource: '',
    scope: 'self',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedRoleId && selectedRoleId !== 'all') {
      fetchPermissionsByRole(selectedRoleId);
    } else {
      fetchData();
    }
  }, [selectedRoleId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: result } = await apiClient.get<{
        success: boolean;
        data: {
          permissions: DataPermission[];
          roles: Role[];
        };
      }>('/api/settings/data-permissions');

      if (result.success) {
        setPermissions(result.data.permissions || []);
        setRoles(result.data.roles || []);
      }
    } catch (error) {
      console.error('Failed to fetch data permissions:', error);
      toast({
        variant: 'destructive',
        title: '获取数据失败',
        description: '请稍后重试',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPermissionsByRole = async (roleId: string) => {
    setLoading(true);
    try {
      const { data: result } = await apiClient.get<{
        success: boolean;
        data: {
          permissions: DataPermission[];
          roles: Role[];
        };
      }>(`/api/settings/data-permissions?roleId=${roleId}`);

      if (result.success) {
        setPermissions(result.data.permissions || []);
        setRoles(result.data.roles || []);
      }
    } catch (error) {
      console.error('Failed to fetch permissions by role:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (permission?: DataPermission) => {
    if (permission) {
      setEditingPermission(permission);
      setFormData({
        roleId: permission.roleId.toString(),
        resource: permission.resource,
        scope: permission.scope,
      });
    } else {
      setEditingPermission(null);
      setFormData({
        roleId: roles[0]?.id.toString() || '',
        resource: 'project',
        scope: 'self',
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingPermission(null);
    setFormData({ roleId: '', resource: '', scope: 'self' });
  };

  const handleSave = async () => {
    if (!formData.roleId || !formData.resource || !formData.scope) {
      toast({
        variant: 'destructive',
        title: '请填写完整信息',
      });
      return;
    }

    setSaving(true);
    try {
      const { data: result } = await apiClient.post('/api/settings/data-permissions', formData);

      if ((result as any).success) {
        toast({
          title: '保存成功',
          description: editingPermission ? '数据权限已更新' : '数据权限已创建',
        });
        handleCloseDialog();
        fetchData();
      } else {
        throw new Error((result as any).error || '保存失败');
      }
    } catch (error: any) {
      console.error('Failed to save permission:', error);
      toast({
        variant: 'destructive',
        title: '保存失败',
        description: error.message || '请稍后重试',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除此数据权限配置吗？')) return;

    try {
      const { data: result } = await apiClient.delete(`/api/settings/data-permissions?id=${id}`);

      if ((result as any).success) {
        toast({
          title: '删除成功',
        });
        fetchData();
      }
    } catch (error: any) {
      console.error('Failed to delete permission:', error);
      toast({
        variant: 'destructive',
        title: '删除失败',
        description: error.message || '请稍后重试',
      });
    }
  };

  return (
    <Card data-testid="data-permissions-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle>数据权限配置</CardTitle>
              <CardDescription>配置各角色的数据访问范围</CardDescription>
            </div>
          </div>
          <Button data-testid="data-permissions-add-button" onClick={() => handleOpenDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            添加配置
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* 筛选 */}
        <div className="mb-4 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">按角色筛选：</span>
            <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
              <SelectTrigger data-testid="data-permissions-role-filter" className="w-40">
                <SelectValue placeholder="全部角色" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部角色</SelectItem>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.id.toString()}>
                    {role.roleName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 权限列表 */}
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">加载中...</div>
        ) : permissions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Lock className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p>暂无数据权限配置</p>
            <p className="text-sm">点击"添加配置"按钮创建新的数据权限</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>角色</TableHead>
                <TableHead>资源</TableHead>
                <TableHead>数据范围</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {permissions.map((permission) => (
                <TableRow key={permission.id} data-testid={`data-permissions-row-${permission.id}`}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{permission.role?.roleName || `角色${permission.roleId}`}</Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span>{RESOURCE_LABELS[permission.resource] || permission.resource}</span>
                  </TableCell>
                  <TableCell>
                    <div>
                      <span className="font-medium">{SCOPE_LABELS[permission.scope]?.label || permission.scope}</span>
                      <p className="text-xs text-muted-foreground">
                        {SCOPE_LABELS[permission.scope]?.description || ''}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      data-testid={`data-permissions-edit-${permission.id}`}
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenDialog(permission)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      data-testid={`data-permissions-delete-${permission.id}`}
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(permission.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* 说明 */}
        <div className="mt-4 p-4 bg-muted/50 rounded-lg">
          <h4 className="font-medium mb-2">数据范围说明</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {Object.entries(SCOPE_LABELS).map(([key, value]) => (
              <div key={key} className="flex items-start gap-2">
                <Badge variant="secondary" className="shrink-0">{value.label}</Badge>
                <span className="text-muted-foreground">{value.description}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 编辑对话框 */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingPermission ? '编辑数据权限' : '添加数据权限'}</DialogTitle>
              <DialogDescription>配置角色的数据访问范围</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">角色</label>
                <Select
                  value={formData.roleId}
                  onValueChange={(value) => setFormData({ ...formData, roleId: value })}
                  disabled={!!editingPermission}
                >
                  <SelectTrigger data-testid="data-permissions-role-trigger">
                    <SelectValue placeholder="选择角色" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.id.toString()}>
                        {role.roleName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">资源类型</label>
                <Select
                  value={formData.resource}
                  onValueChange={(value) => setFormData({ ...formData, resource: value })}
                  disabled={!!editingPermission}
                >
                  <SelectTrigger data-testid="data-permissions-resource-trigger">
                    <SelectValue placeholder="选择资源" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(RESOURCE_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">数据范围</label>
                <Select
                  value={formData.scope}
                  onValueChange={(value) => setFormData({ ...formData, scope: value })}
                >
                  <SelectTrigger data-testid="data-permissions-scope-trigger">
                    <SelectValue placeholder="选择数据范围" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(SCOPE_LABELS).map(([key, value]) => (
                      <SelectItem key={key} value={key}>
                        <div>
                          <span>{value.label}</span>
                          <span className="text-muted-foreground ml-2 text-xs">
                            {value.description}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleCloseDialog}>
                取消
              </Button>
              <Button data-testid="data-permissions-save-button" onClick={handleSave} disabled={saving}>
                {saving ? '保存中...' : '保存'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
