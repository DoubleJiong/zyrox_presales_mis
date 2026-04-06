'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  DataScope, 
  ResourceType, 
  RESOURCE_FIELD_MAP,
  DataScope as DataScopeEnum,
} from '@/lib/permissions/types';

// 数据范围标签
const DATA_SCOPE_LABELS: Record<DataScope, string> = {
  [DataScopeEnum.NONE]: '无权限',
  [DataScopeEnum.ALL]: '全部数据',
  [DataScopeEnum.SELF]: '仅自己',
  [DataScopeEnum.ROLE]: '同角色',
  [DataScopeEnum.MANAGE]: '管理范围',
};

// 数据范围颜色
const DATA_SCOPE_COLORS: Record<DataScope, string> = {
  [DataScopeEnum.NONE]: 'bg-destructive text-destructive-foreground',
  [DataScopeEnum.ALL]: 'bg-success text-success-foreground',
  [DataScopeEnum.SELF]: 'bg-muted text-muted-foreground',
  [DataScopeEnum.ROLE]: 'bg-primary text-primary-foreground',
  [DataScopeEnum.MANAGE]: 'bg-warning text-warning-foreground',
};

// 资源类型标签
const RESOURCE_LABELS: Record<ResourceType, string> = {
  customer: '客户',
  project: '项目',
  solution: '解决方案',
  task: '任务',
  opportunity: '商机',
  bidding: '投标',
  quotation: '报价',
  knowledge: '知识库',
  staff: '员工',
};

// 权限配置接口
export interface RolePermissionConfig {
  resource: ResourceType;
  scope: DataScope;
  allowedFields?: string[];
}

// 权限矩阵属性
interface PermissionMatrixProps {
  permissions: RolePermissionConfig[];
  onChange?: (resource: ResourceType, scope: DataScope) => void;
  editable?: boolean;
  className?: string;
}

export function PermissionMatrix({
  permissions,
  onChange,
  editable = false,
  className,
}: PermissionMatrixProps) {
  const resources = Object.keys(RESOURCE_FIELD_MAP) as ResourceType[];

  const getPermission = (resource: ResourceType): RolePermissionConfig | undefined => {
    return permissions.find(p => p.resource === resource);
  };

  return (
    <div className={cn('rounded-md border', className)}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-48">资源类型</TableHead>
            <TableHead className="w-40">数据范围</TableHead>
            <TableHead>说明</TableHead>
            {editable && <TableHead className="w-24">操作</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {resources.map((resource) => {
            const permission = getPermission(resource);
            const scope = permission?.scope || DataScopeEnum.SELF;

            return (
              <TableRow key={resource}>
                <TableCell className="font-medium">
                  {RESOURCE_LABELS[resource]}
                </TableCell>
                <TableCell>
                  {editable ? (
                    <Select
                      value={scope}
                      onValueChange={(value) => onChange?.(resource, value as DataScope)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(DATA_SCOPE_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge className={cn('text-xs', DATA_SCOPE_COLORS[scope])}>
                      {DATA_SCOPE_LABELS[scope]}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {getScopeDescription(resource, scope)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

// 获取范围描述
function getScopeDescription(resource: ResourceType, scope: DataScope): string {
  const resourceLabel = RESOURCE_LABELS[resource];
  
  switch (scope) {
    case DataScopeEnum.ALL:
      return `可查看和管理所有${resourceLabel}数据`;
    case DataScopeEnum.SELF:
      return `仅可查看和管理自己创建/负责的${resourceLabel}`;
    case DataScopeEnum.ROLE:
      return `可查看同角色用户创建的${resourceLabel}`;
    case DataScopeEnum.MANAGE:
      return `可查看自己负责的${resourceLabel}及相关项目数据`;
    default:
      return '';
  }
}

// 权限徽章组件
interface PermissionBadgeProps {
  scope: DataScope;
  className?: string;
}

export function PermissionBadge({ scope, className }: PermissionBadgeProps) {
  return (
    <Badge className={cn('text-xs', DATA_SCOPE_COLORS[scope], className)}>
      {DATA_SCOPE_LABELS[scope]}
    </Badge>
  );
}

export default PermissionMatrix;
