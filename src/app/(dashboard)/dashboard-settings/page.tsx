'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Settings,
  LayoutGrid,
  Palette,
  Bell,
  Eye,
  Monitor,
  Sun,
  Moon,
  Save,
  RotateCcw,
  GripVertical,
  X,
  Check,
  BarChart3,
  TrendingUp,
  Users,
  Briefcase,
  Clock,
  Target,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// =====================================================
// 类型定义
// =====================================================

interface WidgetConfig {
  id: string;
  type: 'kpi' | 'chart' | 'list' | 'calendar' | 'timeline' | 'map';
  title: string;
  size: 'small' | 'medium' | 'large';
  position: { x: number; y: number };
  enabled: boolean;
  refreshInterval?: number;
  config?: Record<string, unknown>;
}

interface DashboardLayout {
  id: string;
  name: string;
  widgets: WidgetConfig[];
  columns: number;
  rowHeight: number;
  gap: number;
  isDefault: boolean;
}

interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  accentColor: string;
  fontSize: 'small' | 'medium' | 'large';
  compactMode: boolean;
  animationsEnabled: boolean;
  soundEnabled: boolean;
  autoRefresh: boolean;
  refreshInterval: number;
  showWelcome: boolean;
  defaultDashboard: string;
  notifications: {
    email: boolean;
    push: boolean;
    sound: boolean;
    desktop: boolean;
  };
}

// =====================================================
// 默认配置
// =====================================================

const defaultWidgets: WidgetConfig[] = [
  {
    id: 'widget-kpi-1',
    type: 'kpi',
    title: '关键指标概览',
    size: 'large',
    position: { x: 0, y: 0 },
    enabled: true,
    refreshInterval: 60,
  },
  {
    id: 'widget-chart-1',
    type: 'chart',
    title: '销售趋势图',
    size: 'medium',
    position: { x: 0, y: 1 },
    enabled: true,
    refreshInterval: 300,
  },
  {
    id: 'widget-list-1',
    type: 'list',
    title: '待办事项',
    size: 'medium',
    position: { x: 1, y: 1 },
    enabled: true,
  },
  {
    id: 'widget-calendar-1',
    type: 'calendar',
    title: '日程安排',
    size: 'medium',
    position: { x: 0, y: 2 },
    enabled: true,
  },
  {
    id: 'widget-timeline-1',
    type: 'timeline',
    title: '项目进度',
    size: 'medium',
    position: { x: 1, y: 2 },
    enabled: true,
  },
];

const defaultPreferences: UserPreferences = {
  theme: 'system',
  accentColor: '#3b82f6',
  fontSize: 'medium',
  compactMode: false,
  animationsEnabled: true,
  soundEnabled: true,
  autoRefresh: true,
  refreshInterval: 300,
  showWelcome: true,
  defaultDashboard: 'main',
  notifications: {
    email: true,
    push: true,
    sound: false,
    desktop: true,
  },
};

const accentColors = [
  { name: '蓝色', value: '#3b82f6' },
  { name: '绿色', value: '#10b981' },
  { name: '紫色', value: '#8b5cf6' },
  { name: '红色', value: '#ef4444' },
  { name: '橙色', value: '#f59e0b' },
  { name: '青色', value: '#06b6d4' },
  { name: '粉色', value: '#ec4899' },
  { name: '靛蓝', value: '#6366f1' },
];

// =====================================================
// 主组件
// =====================================================

export default function DashboardSettingsPage() {
  const [activeTab, setActiveTab] = useState('layout');
  const [layout, setLayout] = useState<DashboardLayout>({
    id: 'main',
    name: '主仪表盘',
    widgets: defaultWidgets,
    columns: 2,
    rowHeight: 280,
    gap: 16,
    isDefault: true,
  });
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);
  const [editWidgetDialogOpen, setEditWidgetDialogOpen] = useState(false);
  const [selectedWidget, setSelectedWidget] = useState<WidgetConfig | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // 获取默认标题 - 移到 addWidget 之前定义
  const getDefaultTitle = useCallback((type: WidgetConfig['type']): string => {
    const titles: Record<WidgetConfig['type'], string> = {
      kpi: '关键指标',
      chart: '数据图表',
      list: '数据列表',
      calendar: '日历',
      timeline: '时间轴',
      map: '地图',
    };
    return titles[type];
  }, []);

  // 更新小组件
  const updateWidget = useCallback((widgetId: string, updates: Partial<WidgetConfig>) => {
    setLayout((prev) => ({
      ...prev,
      widgets: prev.widgets.map((w) =>
        w.id === widgetId ? { ...w, ...updates } : w
      ),
    }));
    setHasChanges(true);
  }, []);

  // 切换小组件启用状态
  const toggleWidget = useCallback((widgetId: string) => {
    setLayout((prev) => ({
      ...prev,
      widgets: prev.widgets.map((w) =>
        w.id === widgetId ? { ...w, enabled: !w.enabled } : w
      ),
    }));
    setHasChanges(true);
  }, []);

  // 添加小组件
  const addWidget = useCallback((type: WidgetConfig['type']) => {
    const newWidget: WidgetConfig = {
      id: `widget-${Date.now()}`,
      type,
      title: getDefaultTitle(type),
      size: 'medium',
      position: { x: 0, y: layout.widgets.length },
      enabled: true,
    };

    setLayout((prev) => ({
      ...prev,
      widgets: [...prev.widgets, newWidget],
    }));
    setHasChanges(true);
  }, [layout.widgets.length, getDefaultTitle]);

  // 删除小组件
  const removeWidget = useCallback((widgetId: string) => {
    setLayout((prev) => ({
      ...prev,
      widgets: prev.widgets.filter((w) => w.id !== widgetId),
    }));
    setHasChanges(true);
  }, []);

  // 更新偏好设置
  const updatePreference = useCallback(<K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  }, []);

  // 更新通知设置
  const updateNotification = useCallback((key: keyof UserPreferences['notifications'], value: boolean) => {
    setPreferences((prev) => ({
      ...prev,
      notifications: { ...prev.notifications, [key]: value },
    }));
    setHasChanges(true);
  }, []);

  // 保存设置
  const handleSave = () => {
    // 实际项目中这里应该保存到后端
    console.log('保存设置:', { layout, preferences });
    setHasChanges(false);
  };

  // 重置设置
  const handleReset = () => {
    setLayout({
      id: 'main',
      name: '主仪表盘',
      widgets: defaultWidgets,
      columns: 2,
      rowHeight: 280,
      gap: 16,
      isDefault: true,
    });
    setPreferences(defaultPreferences);
    setHasChanges(false);
  };

  // 获取类型图标
  const getTypeIcon = (type: WidgetConfig['type']) => {
    const icons: Record<WidgetConfig['type'], React.ReactNode> = {
      kpi: <Target className="w-4 h-4" />,
      chart: <BarChart3 className="w-4 h-4" />,
      list: <Briefcase className="w-4 h-4" />,
      calendar: <Clock className="w-4 h-4" />,
      timeline: <TrendingUp className="w-4 h-4" />,
      map: <Users className="w-4 h-4" />,
    };
    return icons[type];
  };

  // 获取类型标签
  const getTypeLabel = (type: WidgetConfig['type']): string => {
    const labels: Record<WidgetConfig['type'], string> = {
      kpi: 'KPI 指标',
      chart: '数据图表',
      list: '数据列表',
      calendar: '日历视图',
      timeline: '时间轴',
      map: '地图可视化',
    };
    return labels[type];
  };

  // 获取尺寸标签
  const getSizeLabel = (size: WidgetConfig['size']): string => {
    const labels: Record<WidgetConfig['size'], string> = {
      small: '小',
      medium: '中',
      large: '大',
    };
    return labels[size];
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Settings className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">仪表盘设置</h1>
              <p className="text-muted-foreground text-sm">
                自定义布局与偏好设置
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasChanges && (
              <Badge variant="secondary" className="gap-1">
                <AlertTriangle className="w-3 h-3" />
                未保存更改
              </Badge>
            )}
            <Button variant="outline" onClick={handleReset}>
              <RotateCcw className="w-4 h-4 mr-2" />
              重置
            </Button>
            <Button onClick={handleSave} disabled={!hasChanges}>
              <Save className="w-4 h-4 mr-2" />
              保存设置
            </Button>
          </div>
        </div>

        {/* 主内容区 */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-card/50">
            <TabsTrigger value="layout" className="gap-2">
              <LayoutGrid className="w-4 h-4" />
              布局设置
            </TabsTrigger>
            <TabsTrigger value="appearance" className="gap-2">
              <Palette className="w-4 h-4" />
              外观设置
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="w-4 h-4" />
              通知设置
            </TabsTrigger>
            <TabsTrigger value="advanced" className="gap-2">
              <Eye className="w-4 h-4" />
              高级设置
            </TabsTrigger>
          </TabsList>

          {/* 布局设置 Tab */}
          <TabsContent value="layout" className="space-y-6 mt-4">
            {/* 布局预览 */}
            <Card className="bg-card/50 backdrop-blur border-border/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">布局预览</CardTitle>
                  <Select
                    value={layout.columns.toString()}
                    onValueChange={(v) => {
                      setLayout((prev) => ({ ...prev, columns: parseInt(v) }));
                      setHasChanges(true);
                    }}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">单列布局</SelectItem>
                      <SelectItem value="2">双列布局</SelectItem>
                      <SelectItem value="3">三列布局</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <div
                  className="grid gap-4"
                  style={{
                    gridTemplateColumns: `repeat(${layout.columns}, 1fr)`,
                  }}
                >
                  {layout.widgets
                    .filter((w) => w.enabled)
                    .map((widget) => (
                      <div
                        key={widget.id}
                        className={cn(
                          'relative p-4 rounded-lg border border-border/50 bg-muted/30 hover:border-primary/30 transition-colors cursor-pointer group',
                          widget.size === 'large' &&
                            layout.columns > 1 &&
                            'col-span-2'
                        )}
                        onClick={() => {
                          setSelectedWidget(widget);
                          setEditWidgetDialogOpen(true);
                        }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <GripVertical className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                            {getTypeIcon(widget.type)}
                            <span className="font-medium">{widget.title}</span>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {getSizeLabel(widget.size)}
                          </Badge>
                        </div>
                        <div className="h-[100px] rounded-md bg-muted/50 flex items-center justify-center">
                          <span className="text-sm text-muted-foreground">
                            {getTypeLabel(widget.type)}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            {/* 小组件管理 */}
            <Card className="bg-card/50 backdrop-blur border-border/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">小组件管理</CardTitle>
                  <Select
                    onValueChange={(v) => addWidget(v as WidgetConfig['type'])}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="添加组件" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kpi">KPI 指标</SelectItem>
                      <SelectItem value="chart">数据图表</SelectItem>
                      <SelectItem value="list">数据列表</SelectItem>
                      <SelectItem value="calendar">日历视图</SelectItem>
                      <SelectItem value="timeline">时间轴</SelectItem>
                      <SelectItem value="map">地图可视化</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {layout.widgets.map((widget) => (
                    <div
                      key={widget.id}
                      className={cn(
                        'flex items-center justify-between p-4 rounded-lg border transition-colors',
                        widget.enabled
                          ? 'border-border/50 bg-muted/30'
                          : 'border-border/30 bg-muted/10 opacity-60'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                        <div
                          className={cn(
                            'w-10 h-10 rounded-lg flex items-center justify-center',
                            widget.enabled ? 'bg-primary/10' : 'bg-muted'
                          )}
                        >
                          {getTypeIcon(widget.type)}
                        </div>
                        <div>
                          <p className="font-medium">{widget.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {getTypeLabel(widget.type)} ·{' '}
                            {getSizeLabel(widget.size)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedWidget(widget);
                            setEditWidgetDialogOpen(true);
                          }}
                        >
                          编辑
                        </Button>
                        <Switch
                          checked={widget.enabled}
                          onCheckedChange={() => toggleWidget(widget.id)}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => removeWidget(widget.id)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 外观设置 Tab */}
          <TabsContent value="appearance" className="space-y-6 mt-4">
            <Card className="bg-card/50 backdrop-blur border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">主题设置</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* 主题模式 */}
                <div className="space-y-3">
                  <Label>主题模式</Label>
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { value: 'light', label: '浅色', icon: <Sun className="w-5 h-5" /> },
                      { value: 'dark', label: '深色', icon: <Moon className="w-5 h-5" /> },
                      { value: 'system', label: '跟随系统', icon: <Monitor className="w-5 h-5" /> },
                    ].map((theme) => (
                      <div
                        key={theme.value}
                        className={cn(
                          'flex flex-col items-center gap-2 p-4 rounded-lg border cursor-pointer transition-all',
                          preferences.theme === theme.value
                            ? 'border-primary bg-primary/5'
                            : 'border-border/50 hover:border-primary/50'
                        )}
                        onClick={() =>
                          updatePreference('theme', theme.value as UserPreferences['theme'])
                        }
                      >
                        {theme.icon}
                        <span className="text-sm">{theme.label}</span>
                        {preferences.theme === theme.value && (
                          <Check className="w-4 h-4 text-primary" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 主题色 */}
                <div className="space-y-3">
                  <Label>主题色</Label>
                  <div className="flex flex-wrap gap-3">
                    {accentColors.map((color) => (
                      <button
                        key={color.value}
                        className={cn(
                          'w-10 h-10 rounded-full flex items-center justify-center transition-all',
                          preferences.accentColor === color.value
                            ? 'ring-2 ring-offset-2 ring-offset-background'
                            : 'hover:scale-110'
                        )}
                        style={{ backgroundColor: color.value }}
                        onClick={() => updatePreference('accentColor', color.value)}
                      >
                        {preferences.accentColor === color.value && (
                          <Check className="w-5 h-5 text-white" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 字体大小 */}
                <div className="space-y-3">
                  <Label>字体大小</Label>
                  <Select
                    value={preferences.fontSize}
                    onValueChange={(v) =>
                      updatePreference('fontSize', v as UserPreferences['fontSize'])
                    }
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">小</SelectItem>
                      <SelectItem value="medium">中</SelectItem>
                      <SelectItem value="large">大</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 紧凑模式 */}
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                  <div>
                    <p className="font-medium">紧凑模式</p>
                    <p className="text-sm text-muted-foreground">
                      减少界面间距，显示更多内容
                    </p>
                  </div>
                  <Switch
                    checked={preferences.compactMode}
                    onCheckedChange={(v) => updatePreference('compactMode', v)}
                  />
                </div>

                {/* 动画效果 */}
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                  <div>
                    <p className="font-medium">动画效果</p>
                    <p className="text-sm text-muted-foreground">
                      启用界面过渡动画
                    </p>
                  </div>
                  <Switch
                    checked={preferences.animationsEnabled}
                    onCheckedChange={(v) => updatePreference('animationsEnabled', v)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 通知设置 Tab */}
          <TabsContent value="notifications" className="space-y-6 mt-4">
            <Card className="bg-card/50 backdrop-blur border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">通知偏好</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  {
                    key: 'email',
                    label: '邮件通知',
                    description: '通过邮件接收重要通知',
                    icon: <Bell className="w-5 h-5" />,
                  },
                  {
                    key: 'push',
                    label: '推送通知',
                    description: '浏览器推送通知',
                    icon: <Bell className="w-5 h-5" />,
                  },
                  {
                    key: 'sound',
                    label: '声音提醒',
                    description: '播放提示音',
                    icon: <Bell className="w-5 h-5" />,
                  },
                  {
                    key: 'desktop',
                    label: '桌面通知',
                    description: '显示桌面通知弹窗',
                    icon: <Bell className="w-5 h-5" />,
                  },
                ].map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between p-4 rounded-lg bg-muted/30"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        {item.icon}
                      </div>
                      <div>
                        <p className="font-medium">{item.label}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.description}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={
                        preferences.notifications[item.key as keyof typeof preferences.notifications]
                      }
                      onCheckedChange={(v) =>
                        updateNotification(
                          item.key as keyof typeof preferences.notifications,
                          v
                        )
                      }
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 高级设置 Tab */}
          <TabsContent value="advanced" className="space-y-6 mt-4">
            <Card className="bg-card/50 backdrop-blur border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">数据刷新</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* 自动刷新 */}
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                  <div>
                    <p className="font-medium">自动刷新</p>
                    <p className="text-sm text-muted-foreground">
                      定期自动更新仪表盘数据
                    </p>
                  </div>
                  <Switch
                    checked={preferences.autoRefresh}
                    onCheckedChange={(v) => updatePreference('autoRefresh', v)}
                  />
                </div>

                {/* 刷新间隔 */}
                {preferences.autoRefresh && (
                  <div className="space-y-3">
                    <Label>
                      刷新间隔: {preferences.refreshInterval} 秒
                    </Label>
                    <Slider
                      value={[preferences.refreshInterval]}
                      onValueChange={(v) =>
                        updatePreference('refreshInterval', v[0])
                      }
                      min={60}
                      max={600}
                      step={60}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>1分钟</span>
                      <span>10分钟</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">显示设置</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* 欢迎页 */}
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                  <div>
                    <p className="font-medium">显示欢迎页</p>
                    <p className="text-sm text-muted-foreground">
                      登录后显示欢迎页面
                    </p>
                  </div>
                  <Switch
                    checked={preferences.showWelcome}
                    onCheckedChange={(v) => updatePreference('showWelcome', v)}
                  />
                </div>

                {/* 声音效果 */}
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                  <div>
                    <p className="font-medium">声音效果</p>
                    <p className="text-sm text-muted-foreground">
                      操作时播放声音效果
                    </p>
                  </div>
                  <Switch
                    checked={preferences.soundEnabled}
                    onCheckedChange={(v) => updatePreference('soundEnabled', v)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* 布局设置 */}
            <Card className="bg-card/50 backdrop-blur border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">布局参数</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <Label>行高度: {layout.rowHeight}px</Label>
                  <Slider
                    value={[layout.rowHeight]}
                    onValueChange={(v) => {
                      setLayout((prev) => ({ ...prev, rowHeight: v[0] }));
                      setHasChanges(true);
                    }}
                    min={200}
                    max={400}
                    step={20}
                  />
                </div>

                <div className="space-y-3">
                  <Label>间距: {layout.gap}px</Label>
                  <Slider
                    value={[layout.gap]}
                    onValueChange={(v) => {
                      setLayout((prev) => ({ ...prev, gap: v[0] }));
                      setHasChanges(true);
                    }}
                    min={8}
                    max={32}
                    step={4}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* 编辑小组件对话框 */}
        <Dialog
          open={editWidgetDialogOpen}
          onOpenChange={(open) => {
            setEditWidgetDialogOpen(open);
            if (!open) setSelectedWidget(null);
          }}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>编辑组件</DialogTitle>
              <DialogDescription>
                自定义组件显示设置
              </DialogDescription>
            </DialogHeader>

            {selectedWidget && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>标题</Label>
                  <Input
                    value={selectedWidget.title}
                    onChange={(e) =>
                      updateWidget(selectedWidget.id, { title: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>尺寸</Label>
                  <Select
                    value={selectedWidget.size}
                    onValueChange={(v) =>
                      updateWidget(selectedWidget.id, {
                        size: v as WidgetConfig['size'],
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">小</SelectItem>
                      <SelectItem value="medium">中</SelectItem>
                      <SelectItem value="large">大</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {selectedWidget.refreshInterval !== undefined && (
                  <div className="space-y-2">
                    <Label>
                      刷新间隔: {selectedWidget.refreshInterval} 秒
                    </Label>
                    <Slider
                      value={[selectedWidget.refreshInterval]}
                      onValueChange={(v) =>
                        updateWidget(selectedWidget.id, { refreshInterval: v[0] })
                      }
                      min={30}
                      max={600}
                      step={30}
                    />
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setEditWidgetDialogOpen(false)}
              >
                关闭
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
