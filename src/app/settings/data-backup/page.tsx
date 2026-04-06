'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { RefreshCw, AlertTriangle, RotateCcw, Database, Loader2 } from 'lucide-react';
import { extractErrorMessage } from '@/lib/api-response';

interface SystemStats {
  [key: string]: number;
}

export default function DataBackupSettings() {
  const { toast } = useToast();
  const [systemStats, setSystemStats] = useState<SystemStats>({});
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const [resetDialog, setResetDialog] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  useEffect(() => {
    loadSystemStats();
  }, []);

  const loadSystemStats = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/settings/reset-system');
      if (response.ok) {
        const result = await response.json();
        setSystemStats(result.data || {});
      }
    } catch (error) {
      console.error('Failed to load system stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResetSystem = async () => {
    if (confirmText !== '恢复出厂设置') {
      toast({
        variant: 'destructive',
        title: '确认文本不正确',
        description: '请输入"恢复出厂设置"以确认操作',
      });
      return;
    }

    setResetting(true);
    try {
      const response = await fetch('/api/settings/reset-system', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: '恢复成功',
          description: '系统已恢复到出厂设置',
        });
        setSystemStats(result.data?.stats || {});
      } else {
        const error = await response.json();
        toast({
          variant: 'destructive',
          title: '恢复失败',
          description: extractErrorMessage(error.error, '操作失败，请稍后重试'),
        });
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: '恢复失败',
        description: error.message || '网络错误，请稍后重试',
      });
    } finally {
      setResetting(false);
      setResetDialog(false);
      setConfirmText('');
    }
  };

  // 计算存储空间
  const totalSpace = 10240; // 10GB
  const usedSpace = 2450; // 2.45GB
  const usedPercentage = (usedSpace / totalSpace) * 100;

  return (
    <div className="space-y-6" data-testid="data-maintenance-page">
      <Alert data-testid="data-maintenance-boundary-alert">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>当前不是“数据备份”能力</AlertTitle>
        <AlertDescription>
          当前页面仅提供基础数据统计与恢复出厂设置，不包含数据库备份、备份下载或数据恢复链路。本轮发布应按“基础数据维护”而非“数据备份”理解。
        </AlertDescription>
      </Alert>

      {/* 系统数据统计 */}
      <Card data-testid="data-maintenance-stats-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            基础数据统计
          </CardTitle>
          <CardDescription>当前系统基础配置和业务数据量概览</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8" data-testid="data-maintenance-loading-state">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span>加载中...</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(systemStats).map(([name, count]) => (
                <div key={name} className="p-4 rounded-lg border bg-card" data-testid={`data-maintenance-stat-${name}`}>
                  <div className="text-sm text-muted-foreground">{name}</div>
                  <div className="text-2xl font-bold mt-1">{count}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 恢复出厂设置 */}
      <Card className="border-destructive/50" data-testid="data-maintenance-reset-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <RotateCcw className="h-5 w-5" />
            恢复出厂设置
          </CardTitle>
          <CardDescription>
            将系统基础数据恢复到初始状态，包括角色、类型、字典等配置数据
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>警告</AlertTitle>
            <AlertDescription>
              此操作将重置以下数据：
              <ul className="mt-2 ml-4 list-disc space-y-1">
                <li>角色数据（7个默认角色）</li>
                <li>客户类型（5个默认类型）</li>
                <li>项目类型（5个默认类型）</li>
                <li>解决方案类型（5个默认类型）</li>
                <li>售前服务类型（6个默认类型）</li>
                <li>分子公司数据（26家默认公司）</li>
                <li>字典分类和属性数据</li>
              </ul>
              <p className="mt-2 font-medium">业务数据（项目、客户、方案等）不会受影响。</p>
            </AlertDescription>
          </Alert>
          
          <div className="flex gap-4">
            <Button variant="outline" onClick={loadSystemStats} disabled={loading} data-testid="data-maintenance-refresh-button">
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              刷新统计
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => setResetDialog(true)}
              data-testid="data-maintenance-open-reset-dialog"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              恢复出厂设置
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 恢复出厂设置确认对话框 */}
      <Dialog open={resetDialog} onOpenChange={setResetDialog}>
        <DialogContent className="max-w-md" data-testid="data-maintenance-reset-dialog">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              确认恢复出厂设置
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-4 pt-2">
                <p>此操作将重置所有基础配置数据，且无法撤销。</p>
                <p className="font-medium">请输入 <span className="text-destructive">恢复出厂设置</span> 以确认此操作：</p>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="请输入确认文本"
                  data-testid="data-maintenance-confirm-input"
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-destructive"
                />
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setResetDialog(false); setConfirmText(''); }} data-testid="data-maintenance-cancel-reset">
              取消
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleResetSystem}
              disabled={resetting || confirmText !== '恢复出厂设置'}
              data-testid="data-maintenance-confirm-reset"
            >
              {resetting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  恢复中...
                </>
              ) : (
                '确认恢复'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
