'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Bell,
  Settings,
  List,
  TrendingUp,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Clock,
  ChevronRight,
  Activity,
  Shield,
  Zap
} from 'lucide-react';

export default function AlertsPage() {
  const router = useRouter();
  const [stats, setStats] = useState({
    totalRules: 0,
    activeRules: 0,
    totalAlerts: 0,
    pendingAlerts: 0,
  });
  const [recentAlerts, setRecentAlerts] = useState<Array<{
    id: number;
    ruleName: string;
    targetName: string;
    severity: string;
    status: string;
    createdAt: string;
  }>>([]);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [rulesResponse, historiesResponse] = await Promise.all([
        fetch('/api/alerts/rules'),
        fetch('/api/alerts/histories'),
      ]);
      
      if (rulesResponse.ok && historiesResponse.ok) {
        const rulesResult = await rulesResponse.json();
        const historiesResult = await historiesResponse.json();
        
        // API 返回格式: { success: true, data: [...] }
        const rules = rulesResult.data || [];
        const histories = historiesResult.data || [];
        
        setStats({
          totalRules: rules.length,
          activeRules: rules.filter((r: any) => r.status === 'active').length,
          totalAlerts: histories.length,
          pendingAlerts: histories.filter((h: any) => h.status === 'pending').length,
        });

        setRecentAlerts(
          [...histories]
            .sort((left: any, right: any) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
            .slice(0, 5)
            .map((history: any) => ({
              id: history.id,
              ruleName: history.ruleName,
              targetName: history.targetName,
              severity: history.severity,
              status: history.status,
              createdAt: history.createdAt,
            }))
        );
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const getSeverityColor = (severity: string) => {
    const colorMap: Record<string, string> = {
      low: 'bg-blue-500',
      medium: 'bg-yellow-500',
      high: 'bg-orange-500',
      critical: 'bg-red-500',
    };
    return colorMap[severity] || 'bg-gray-500';
  };

  const getSeverityIcon = (severity: string) => {
    if (severity === 'critical' || severity === 'high') return <AlertCircle className="h-5 w-5" />;
    if (severity === 'medium') return <AlertTriangle className="h-5 w-5" />;
    return <CheckCircle className="h-5 w-5" />;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 60000);
    
    if (diff < 60) return `${diff}分钟前`;
    if (diff < 1440) return `${Math.floor(diff / 60)}小时前`;
    return `${Math.floor(diff / 1440)}天前`;
  };

  return (
    <div className="min-h-screen bg-background" data-testid="alerts-page">
      {/* 页面头部 */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold">预警管理</h1>
                  <p className="text-muted-foreground mt-1">配置规则、监控预警、处理风险</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="container mx-auto px-4 py-6">
        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">预警规则</p>
                  <p className="text-2xl font-bold mt-1">{stats.totalRules}</p>
                  <p className="text-xs text-green-600 mt-1">
                    {stats.activeRules} 条启用中
                  </p>
                </div>
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Settings className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">总预警数</p>
                  <p className="text-2xl font-bold mt-1">{stats.totalAlerts}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    历史总计
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Bell className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">待处理</p>
                  <p className="text-2xl font-bold mt-1 text-orange-600">{stats.pendingAlerts}</p>
                  <p className="text-xs text-orange-600 mt-1">
                    需要立即处理
                  </p>
                </div>
                <div className="p-3 bg-orange-100 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">系统状态</p>
                  <p className="text-2xl font-bold mt-1 text-green-600">正常</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    运行中
                  </p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <Activity className="h-5 w-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 功能入口 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <Card 
            className="cursor-pointer hover:shadow-lg transition-all hover:border-primary"
            onClick={() => router.push('/alerts/rules')}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>预警规则配置</CardTitle>
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Settings className="h-5 w-5 text-primary" />
                </div>
              </div>
              <CardDescription>
                创建和管理预警规则，设置触发条件和通知方式
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="text-sm">
                    <span className="text-muted-foreground">当前规则：</span>
                    <span className="font-medium">{stats.totalRules} 条</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">启用规则：</span>
                    <span className="font-medium text-green-600">{stats.activeRules} 条</span>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-lg transition-all hover:border-primary"
            onClick={() => router.push('/alerts/histories')}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>预警历史记录</CardTitle>
                <div className="p-2 bg-blue-100 rounded-lg">
                  <List className="h-5 w-5 text-blue-600" />
                </div>
              </div>
              <CardDescription>
                查看所有预警触发记录，进行确认和处理
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="text-sm">
                    <span className="text-muted-foreground">总记录数：</span>
                    <span className="font-medium">{stats.totalAlerts} 条</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">待处理：</span>
                    <span className="font-medium text-orange-600">{stats.pendingAlerts} 条</span>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 快捷操作 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>快捷操作</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button
                variant="outline"
                className="h-auto flex-col gap-2 py-6"
                onClick={() => router.push('/alerts/rules')}
              >
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                <span className="font-medium">新建规则</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto flex-col gap-2 py-6"
                onClick={() => router.push('/alerts/histories')}
              >
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Clock className="h-5 w-5 text-blue-600" />
                </div>
                <span className="font-medium">查看待处理</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto flex-col gap-2 py-6"
                onClick={() => router.push('/alerts/histories?status=resolved')}
              >
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <span className="font-medium">查看已解决</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto flex-col gap-2 py-6"
                onClick={() => router.push('/alerts/histories?severity=critical')}
              >
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                </div>
                <span className="font-medium">严重预警</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 最近预警 */}
        <Card data-testid="alerts-recent-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>最近预警</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/alerts/histories')}
              >
                查看全部
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentAlerts.map((alert) => (
                <div
                  key={alert.id}
                  data-testid={`alerts-recent-item-${alert.id}`}
                  className="flex items-center gap-4 p-4 border rounded-lg hover:bg-accent transition-colors cursor-pointer"
                  onClick={() => router.push('/alerts/histories')}
                >
                  <div className={`p-2 rounded-lg ${getSeverityColor(alert.severity)} bg-opacity-10`}>
                    {getSeverityIcon(alert.severity)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{alert.ruleName}</div>
                      <Badge variant={alert.status === 'pending' ? 'default' : 'secondary'}>
                        {alert.status === 'pending'
                          ? '待处理'
                          : alert.status === 'acknowledged'
                            ? '已确认'
                            : alert.status === 'resolved'
                              ? '已解决'
                              : '已忽略'}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {alert.targetName} • {formatDate(alert.createdAt)}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              ))}
              {recentAlerts.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>暂无预警记录</p>
                  <p className="text-sm mt-1">系统运行正常</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
