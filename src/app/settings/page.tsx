'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { 
  Settings as SettingsIcon, 
  Database, 
  FileText, 
  Building2, 
  FolderKanban, 
  ShieldCheck, 
  MapPin, 
  FileSpreadsheet, 
  Activity, 
  ChevronDown,
  BookOpen,
  ArrowRight,
  Sparkles,
  Lock
} from 'lucide-react';
import PresalesSettings from './presales/page';
import UsersSettings from './users/page';
import RolesSettings from './roles/page';
import SubsidiariesSettings from './companies/page';
import SystemLogsSettings from './system-logs/page';
import DataBackupSettings from './data-backup/page';

interface ConfigItem {
  id: string;
  title: string;
  description: string;
  icon: any;
  component?: React.ComponentType;
  href?: string;
  badge?: string;
  badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline';
}

export default function SettingsPage() {
  // 核心配置 - 数据字典入口（优先展示）
  const coreConfigs: ConfigItem[] = [
    {
      id: 'dictionary',
      title: '数据字典',
      description: '统一管理业务字典：行业、区域、优先级、投标方式等下拉选项',
      icon: BookOpen,
      href: '/settings/dictionary',
      badge: '核心',
      badgeVariant: 'default',
    },
    {
      id: 'project-types',
      title: '项目类型',
      description: '维护项目类型主数据真源，并同步项目与客户默认类型编码',
      icon: FolderKanban,
      href: '/settings/project-types',
      badge: '主数据',
      badgeVariant: 'secondary',
    },
  ];

  // 业务配置（精简后）
  const businessConfigs: ConfigItem[] = [
    {
      id: 'presales',
      title: '售前服务配置',
      description: '配置售前服务类型和权重设置',
      icon: SettingsIcon,
      component: PresalesSettings,
    },
    {
      id: 'roles',
      title: '角色权限配置',
      description: '基于RBAC和ABAC融合的权限管理',
      icon: ShieldCheck,
      component: RolesSettings,
    },
    {
      id: 'data-permissions',
      title: '数据权限配置',
      description: '配置各角色的数据访问范围（全部/仅自己/本角色/下级）',
      icon: Lock,
      href: '/settings/data-permissions',
      badge: 'V2.0',
      badgeVariant: 'secondary',
    },
    {
      id: 'users',
      title: '用户配置',
      description: '管理系统用户和角色属性赋予',
      icon: Activity,
      component: UsersSettings,
    },
    {
      id: 'companies',
      title: '分子公司配置',
      description: '管理各分子公司的属性和管辖区',
      icon: MapPin,
      component: SubsidiariesSettings,
    },
  ];

  // 系统管理
  const systemConfigs: ConfigItem[] = [
    {
      id: 'system-logs',
      title: '系统日志',
      description: '查看系统操作日志和审计记录',
      icon: FileText,
      component: SystemLogsSettings,
    },
    {
      id: 'data-backup',
      title: '基础数据维护',
      description: '查看基础数据统计并执行恢复出厂设置',
      icon: Database,
      component: DataBackupSettings,
    },
  ];

  const [openItems, setOpenItems] = useState<Set<string>>(new Set());

  const toggleItem = (id: string) => {
    setOpenItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const ConfigCollapsible = ({ item }: { item: ConfigItem }) => {
    const isOpen = openItems.has(item.id);
    const Component = item.component;

    return (
      <Collapsible open={isOpen} onOpenChange={() => toggleItem(item.id)} className="border-b last:border-b-0">
        <CollapsibleTrigger asChild>
          <button className="w-full px-6 py-4 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left">
            <item.icon className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
            <div className="flex-1 min-w-0">
              <div className="font-medium flex items-center gap-2">
                {item.title}
                {item.badge && (
                  <Badge variant={item.badgeVariant || 'default'} className="text-xs">
                    {item.badge}
                  </Badge>
                )}
              </div>
              <div className="text-sm text-muted-foreground truncate">{item.description}</div>
            </div>
            <ChevronDown className={`h-4 w-4 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </CollapsibleTrigger>
        {Component && (
          <CollapsibleContent className="px-6 pb-6">
            <div className="mt-4">
              <Component />
            </div>
          </CollapsibleContent>
        )}
      </Collapsible>
    );
  };

  const ConfigLink = ({ item }: { item: ConfigItem }) => {
    return (
      <Link
        href={item.href || '#'}
        className="w-full px-6 py-4 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left group"
      >
        <item.icon className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
        <div className="flex-1 min-w-0">
          <div className="font-medium flex items-center gap-2">
            {item.title}
            {item.badge && (
              <Badge variant={item.badgeVariant || 'default'} className="text-xs">
                {item.badge}
              </Badge>
            )}
          </div>
          <div className="text-sm text-muted-foreground truncate">{item.description}</div>
        </div>
        <ArrowRight className="h-4 w-4 flex-shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
      </Link>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">系统设置</h1>
        <p className="text-muted-foreground">管理系统配置、权限和基础数据</p>
      </div>

      <div className="grid gap-6">
        {/* 核心配置 - 数据字典 */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-primary">
              <Sparkles className="h-5 w-5" />
              核心配置
            </CardTitle>
            <CardDescription>系统中最常用的配置项，统一管理所有下拉选项</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {coreConfigs.map((item) => (
                <ConfigLink key={item.id} item={item} />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 业务配置 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="h-5 w-5" />
              业务配置
            </CardTitle>
            <CardDescription>配置售前服务、角色权限等业务数据</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {businessConfigs.map((item) => (
                <ConfigCollapsible key={item.id} item={item} />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 系统管理 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              系统管理
            </CardTitle>
            <CardDescription>管理系统日志、数据备份等系统功能</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {systemConfigs.map((item) => (
                <ConfigCollapsible key={item.id} item={item} />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
