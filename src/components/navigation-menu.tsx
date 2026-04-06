'use client';

import { useEffect, useState } from 'react';
import { LayoutDashboard, Users, FolderKanban, BarChart3, FileText, Settings, MonitorPlay, Scale, Bell, Calendar, CheckSquare, MessageSquare, FileCheck } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

export interface NavItem {
  title: string;
  href: string;
  icon: any;
  badge?: number;
  badgeKey?: string; // 用于从API获取badge
}

// 静态导航项配置
export const navItemsConfig: Omit<NavItem, 'badge'>[] = [
  {
    title: '工作台',
    href: '/workbench',
    icon: LayoutDashboard,
  },
  {
    title: '日程管理',
    href: '/calendar',
    icon: Calendar,
  },
  {
    title: '数据大屏',
    href: '/data-screen',
    icon: MonitorPlay,
  },
  {
    title: '客户管理',
    href: '/customers',
    icon: Users,
  },
  {
    title: '项目管理',
    href: '/projects',
    icon: FolderKanban,
    badgeKey: 'projects',
  },
  {
    title: '任务中心',
    href: '/tasks',
    icon: CheckSquare,
    badgeKey: 'tasks',
  },
  {
    title: '人员档案',
    href: '/staff',
    icon: Users,
  },
  {
    title: '解决方案',
    href: '/solutions',
    icon: FileText,
    badgeKey: 'solutions',
  },
  {
    title: '成本仲裁',
    href: '/arbitrations',
    icon: Scale,
    badgeKey: 'arbitrations',
  },
  {
    title: '绩效管理',
    href: '/performance',
    icon: BarChart3,
  },
  {
    title: '预警管理',
    href: '/alerts',
    icon: Bell,
    badgeKey: 'alerts',
  },
  {
    title: '合同管理',
    href: '/contracts',
    icon: FileCheck,
    badgeKey: 'contracts',
  },
  {
    title: '消息中心',
    href: '/messages',
    icon: MessageSquare,
    badgeKey: 'messages',
  },
  {
    title: '系统设置',
    href: '/settings',
    icon: Settings,
  },
];

// Hook for fetching navigation badges
export function useNavBadges() {
  const [badges, setBadges] = useState<Record<string, number>>({});
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchBadges = async () => {
      try {
        const response = await fetch('/api/navigation/badges');
        const result = await response.json();
        if (result.success) {
          setBadges(result.data);
        }
      } catch (error) {
        console.error('Failed to fetch navigation badges:', error);
      }
    };

    fetchBadges();
    
    // 每5分钟刷新一次
    const interval = setInterval(fetchBadges, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  return badges;
}

// 导出带有动态badge的导航项
export function useNavItems(): NavItem[] {
  const badges = useNavBadges();
  
  return navItemsConfig.map(item => ({
    ...item,
    badge: item.badgeKey ? (badges[item.badgeKey] || 0) : undefined,
  }));
}

// 兼容旧代码的静态导出
export const navItems: NavItem[] = navItemsConfig.map(item => ({
  ...item,
  badge: 0,
}));
