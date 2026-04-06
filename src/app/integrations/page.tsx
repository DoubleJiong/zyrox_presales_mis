'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  MessageSquare,
  Save,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Loader2,
  Users,
  Building2,
  Bell,
  Settings2,
  ExternalLink,
  ArrowLeft,
} from 'lucide-react';
import { extractErrorMessage } from '@/lib/api-response';

interface DingTalkConfig {
  appKey: string;
  appSecret: string;
  agentId: string;
  corpId: string;
  enabled: boolean;
  syncUsers: boolean;
  syncDepts: boolean;
  notifyEnabled: boolean;
}

export default function IntegrationsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'failed'>('unknown');
  
  const [config, setConfig] = useState<DingTalkConfig>({
    appKey: '',
    appSecret: '',
    agentId: '',
    corpId: '',
    enabled: false,
    syncUsers: false,
    syncDepts: false,
    notifyEnabled: false,
  });

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/integrations/dingtalk/config');
      const data = await response.json();
      
      if (data.success) {
        setConfig(data.data);
      } else {
        toast({
          title: '获取配置失败',
          description: extractErrorMessage(data.error, '请稍后重试'),
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Failed to fetch DingTalk config:', error);
      toast({
        title: '获取配置失败',
        description: '网络错误，请稍后重试',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/integrations/dingtalk/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: '保存成功',
          description: '钉钉配置已更新',
        });
      } else {
        toast({
          title: '保存失败',
          description: extractErrorMessage(data.error, '请稍后重试'),
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Failed to save DingTalk config:', error);
      toast({
        title: '保存失败',
        description: '网络错误，请稍后重试',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setConnectionStatus('unknown');
    
    try {
      const response = await fetch('/api/integrations/dingtalk/oauth/test', {
        method: 'POST',
      });
      const data = await response.json();
      
      if (data.success && data.data?.connected) {
        setConnectionStatus('connected');
        toast({
          title: '连接成功',
          description: '钉钉服务连接正常',
        });
      } else {
        setConnectionStatus('failed');
        toast({
          title: '连接失败',
          description: extractErrorMessage(data.error, '请检查配置是否正确'),
          variant: 'destructive',
        });
      }
    } catch (error) {
      setConnectionStatus('failed');
      toast({
        title: '连接失败',
        description: '网络错误，请稍后重试',
        variant: 'destructive',
      });
    } finally {
      setTesting(false);
    }
  };

  const updateConfig = (key: keyof DingTalkConfig, value: string | boolean) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="container mx-auto py-6 space-y-6 max-w-4xl">
      {/* 页面标题 */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/settings')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <MessageSquare className="h-8 w-8 text-blue-500" />
            外部系统集成
          </h1>
          <p className="text-muted-foreground mt-1">
            配置钉钉企业应用，实现消息推送和组织架构同步
          </p>
        </div>
        <div className="flex items-center gap-2">
          {connectionStatus === 'connected' && (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              已连接
            </Badge>
          )}
          {connectionStatus === 'failed' && (
            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
              <XCircle className="h-3 w-3 mr-1" />
              连接失败
            </Badge>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* 基础配置 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Settings2 className="h-5 w-5" />
                钉钉企业应用配置
              </CardTitle>
              <CardDescription>
                配置钉钉企业应用的基本信息。{' '}
                <a 
                  href="https://open.dingtalk.com/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center"
                >
                  前往钉钉开放平台
                  <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="corpId">企业ID (CorpId)</Label>
                  <Input
                    id="corpId"
                    placeholder="ding..."
                    value={config.corpId}
                    onChange={(e) => updateConfig('corpId', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    在钉钉开放平台获取企业唯一标识
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="agentId">应用ID (AgentId)</Label>
                  <Input
                    id="agentId"
                    placeholder="应用ID"
                    value={config.agentId}
                    onChange={(e) => updateConfig('agentId', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    企业内部应用的AgentId
                  </p>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="appKey">AppKey</Label>
                  <Input
                    id="appKey"
                    placeholder="AppKey"
                    value={config.appKey}
                    onChange={(e) => updateConfig('appKey', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="appSecret">AppSecret</Label>
                  <Input
                    id="appSecret"
                    type="password"
                    placeholder="AppSecret"
                    value={config.appSecret}
                    onChange={(e) => updateConfig('appSecret', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    请妥善保管，不要泄露
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 功能开关 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">功能设置</CardTitle>
              <CardDescription>
                开启或关闭钉钉集成功能
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    <Label>启用钉钉集成</Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    开启后将启用钉钉相关功能
                  </p>
                </div>
                <Switch
                  checked={config.enabled}
                  onCheckedChange={(checked) => updateConfig('enabled', checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-muted-foreground" />
                    <Label>消息通知</Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    将系统通知推送到钉钉
                  </p>
                </div>
                <Switch
                  checked={config.notifyEnabled}
                  onCheckedChange={(checked) => updateConfig('notifyEnabled', checked)}
                  disabled={!config.enabled}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <Label>同步用户</Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    从钉钉同步用户信息到系统
                  </p>
                </div>
                <Switch
                  checked={config.syncUsers}
                  onCheckedChange={(checked) => updateConfig('syncUsers', checked)}
                  disabled={!config.enabled}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <Label>同步部门</Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    从钉钉同步部门架构到系统
                  </p>
                </div>
                <Switch
                  checked={config.syncDepts}
                  onCheckedChange={(checked) => updateConfig('syncDepts', checked)}
                  disabled={!config.enabled}
                />
              </div>
            </CardContent>
          </Card>

          {/* 操作按钮 */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={handleTestConnection}
              disabled={testing || !config.corpId || !config.appKey}
            >
              {testing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              测试连接
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={fetchConfig}>
                重置
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                保存配置
              </Button>
            </div>
          </div>

          {/* 使用说明 */}
          <Card className="bg-muted/50">
            <CardHeader>
              <CardTitle className="text-base">使用说明</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>1. 登录钉钉开放平台，创建企业内部应用</p>
              <p>2. 获取应用的 AppKey、AppSecret 和 AgentId</p>
              <p>3. 配置应用权限：通讯录只读权限、消息通知权限</p>
              <p>4. 在企业信息中获取企业ID (CorpId)</p>
              <p>5. 将上述信息填入本页面配置，点击保存</p>
              <p>6. 点击"测试连接"验证配置是否正确</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
