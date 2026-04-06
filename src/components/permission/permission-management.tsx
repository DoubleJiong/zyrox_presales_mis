'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PermissionMatrix, type RolePermissionConfig } from './permission-matrix';
import { DataScope, ResourceType } from '@/lib/permissions/types';
import { Loader2, Save, RefreshCw } from 'lucide-react';
import { extractErrorMessage } from '@/lib/api-response';

// 角色信息接口
interface Role {
  id: number;
  roleName: string;
  roleCode: string;
  description: string | null;
}

// 权限管理页面属性
interface PermissionManagementProps {
  className?: string;
}

export function PermissionManagement({ className }: PermissionManagementProps) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Record<number, RolePermissionConfig[]>>({});
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // 加载角色列表
  useEffect(() => {
    loadRoles();
  }, []);

  // 加载角色列表
  const loadRoles = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/roles');
      const result = await response.json();
      
      if (result.success) {
        setRoles(result.data || []);
        if (result.data?.length > 0) {
          setSelectedRoleId(result.data[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to load roles:', error);
    } finally {
      setLoading(false);
    }
  };

  // 加载角色权限
  const loadRolePermissions = async (roleId: number) => {
    try {
      const response = await fetch(`/api/roles/${roleId}/permissions`);
      const result = await response.json();
      
      if (result.success) {
        setPermissions(prev => ({
          ...prev,
          [roleId]: result.data || [],
        }));
      }
    } catch (error) {
      console.error('Failed to load role permissions:', error);
    }
  };

  // 当选中角色时加载权限
  useEffect(() => {
    if (selectedRoleId && !permissions[selectedRoleId]) {
      loadRolePermissions(selectedRoleId);
    }
  }, [selectedRoleId, permissions]);

  // 处理权限变更
  const handlePermissionChange = (resource: ResourceType, scope: DataScope) => {
    if (!selectedRoleId) return;

    setPermissions(prev => {
      const rolePermissions = prev[selectedRoleId] || [];
      const existingIndex = rolePermissions.findIndex(p => p.resource === resource);
      
      if (existingIndex >= 0) {
        const updated = [...rolePermissions];
        updated[existingIndex] = { ...updated[existingIndex], scope };
        return { ...prev, [selectedRoleId]: updated };
      } else {
        return {
          ...prev,
          [selectedRoleId]: [...rolePermissions, { resource, scope }],
        };
      }
    });
  };

  // 保存权限配置
  const handleSave = async () => {
    if (!selectedRoleId) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/roles/${selectedRoleId}/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: permissions[selectedRoleId] || [] }),
      });

      const result = await response.json();
      
      if (result.success) {
        // 显示成功提示
        alert('权限配置已保存');
      } else {
        alert('保存失败: ' + extractErrorMessage(result.error, '未知错误'));
      }
    } catch (error) {
      console.error('Failed to save permissions:', error);
      alert('保存失败');
    } finally {
      setSaving(false);
    }
  };

  // 刷新权限
  const handleRefresh = () => {
    if (selectedRoleId) {
      loadRolePermissions(selectedRoleId);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">数据权限管理</h2>
          <p className="text-muted-foreground mt-1">
            配置角色的数据访问范围，控制用户可见的数据范围
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            刷新
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <Save className="h-4 w-4 mr-2" />
            保存配置
          </Button>
        </div>
      </div>

      {/* 角色标签页 */}
      <Tabs 
        value={selectedRoleId?.toString()} 
        onValueChange={(value) => setSelectedRoleId(Number(value))}
      >
        <TabsList>
          {roles.map((role) => (
            <TabsTrigger key={role.id} value={role.id.toString()}>
              {role.roleName}
            </TabsTrigger>
          ))}
        </TabsList>

        {roles.map((role) => (
          <TabsContent key={role.id} value={role.id.toString()}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{role.roleName}</span>
                  <span className="text-sm font-normal text-muted-foreground">
                    {role.roleCode}
                  </span>
                </CardTitle>
                {role.description && (
                  <p className="text-sm text-muted-foreground">
                    {role.description}
                  </p>
                )}
              </CardHeader>
              <CardContent>
                <PermissionMatrix
                  permissions={permissions[role.id] || []}
                  onChange={handlePermissionChange}
                  editable
                />
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* 说明 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">权限范围说明</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <strong>全部数据：</strong>
              <span className="text-muted-foreground">
                可以查看和管理系统中的所有数据，通常为管理员角色
              </span>
            </div>
            <div>
              <strong>仅自己：</strong>
              <span className="text-muted-foreground">
                只能查看和管理自己创建或负责的数据
              </span>
            </div>
            <div>
              <strong>同角色：</strong>
              <span className="text-muted-foreground">
                可以查看同角色用户创建的数据，适用于协作场景
              </span>
            </div>
            <div>
              <strong>管理范围：</strong>
              <span className="text-muted-foreground">
                可以查看自己负责的项目及下属任务数据
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default PermissionManagement;
