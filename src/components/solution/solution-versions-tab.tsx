/**
 * 方案版本管理组件
 * 
 * 功能：
 * - 版本列表展示
 * - 版本创建
 * - 版本发布
 * - 版本对比（支持文件内容深度对比）
 * - 版本回滚
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  GitBranch,
  Plus,
  Eye,
  RotateCcw,
  Send,
  CheckCircle2,
  Clock,
  FileText,
  ArrowRight,
  GitCompare,
} from 'lucide-react';
import { VersionCompareDialog } from './version-compare-dialog';

interface Version {
  id: number;
  solutionId: number;
  versionNumber: string;
  versionName: string | null;
  changeLog: string | null;
  status: 'draft' | 'published' | 'deprecated';
  isLatest: boolean;
  publishedAt: string | null;
  publishedBy: number | null;
  publisherName: string | null;
  createdAt: string;
  createdBy: number;
  creatorName: string | null;
  snapshot: {
    solutionName: string;
    description: string;
    content: string;
    industry: string | null;
    scenario: string | null;
    tags: string[];
    subSchemes: Array<{
      subSchemeName: string;
      subSchemeType: string;
      description: string;
    }>;
  } | null;
}

interface SolutionVersionsTabProps {
  solutionId: number;
  permissions: {
    permissions?: {
      canEdit: boolean;
    };
  } | null;
}

const versionStatusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { label: '草稿', variant: 'secondary' },
  published: { label: '已发布', variant: 'default' },
  deprecated: { label: '已废弃', variant: 'destructive' },
};

export function SolutionVersionsTab({ solutionId, permissions }: SolutionVersionsTabProps) {
  const router = useRouter();
  const { toast } = useToast();
  
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 对话框状态
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [showRollbackDialog, setShowRollbackDialog] = useState(false);
  const [showCompareDialog, setShowCompareDialog] = useState(false);
  
  // 版本对比选择状态
  const [selectedVersionIds, setSelectedVersionIds] = useState<number[]>([]);
  
  // 表单状态
  const [newVersion, setNewVersion] = useState({
    versionName: '',
    changeLog: '',
  });
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null);
  const [publishNotes, setPublishNotes] = useState('');
  const [compareVersions, setCompareVersions] = useState<{ from: number; to: number }>({
    from: 0,
    to: 0,
  });

  useEffect(() => {
    fetchVersions();
  }, [solutionId]);

  const fetchVersions = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/solutions/${solutionId}/versions`);
      if (response.ok) {
        const data = await response.json();
        setVersions(data.versions || []);
      }
    } catch (error) {
      console.error('Failed to fetch versions:', error);
    } finally {
      setLoading(false);
    }
  };

  // 切换版本选择
  const toggleVersionSelection = (versionId: number) => {
    setSelectedVersionIds((prev) => {
      if (prev.includes(versionId)) {
        return prev.filter((id) => id !== versionId);
      }
      if (prev.length >= 2) {
        // 已选择两个，替换第一个
        return [prev[1], versionId];
      }
      return [...prev, versionId];
    });
  };

  // 打开版本对比对话框
  const openCompareDialog = () => {
    if (selectedVersionIds.length === 2) {
      setShowCompareDialog(true);
    }
  };

  const handleCreateVersion = async () => {
    if (!newVersion.versionName.trim()) {
      toast({ title: '请输入版本名称', variant: 'destructive' });
      return;
    }

    try {
      const response = await fetch(`/api/solutions/${solutionId}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newVersion),
      });

      if (response.ok) {
        fetchVersions();
        setShowCreateDialog(false);
        setNewVersion({ versionName: '', changeLog: '' });
        toast({ title: '版本创建成功' });
      } else {
        const error = await response.json();
        toast({ title: error.error || '创建失败', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Failed to create version:', error);
      toast({ title: '创建失败', variant: 'destructive' });
    }
  };

  const handlePublishVersion = async (versionId: number) => {
    try {
      const response = await fetch(
        `/api/solutions/${solutionId}/versions/${versionId}/publish`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ publishNotes }),
        }
      );

      if (response.ok) {
        fetchVersions();
        setShowPublishDialog(false);
        setPublishNotes('');
        setSelectedVersion(null);
        toast({ title: '版本发布成功' });
      } else {
        const error = await response.json();
        toast({ title: error.error || '发布失败', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Failed to publish version:', error);
      toast({ title: '发布失败', variant: 'destructive' });
    }
  };

  const handleRollbackVersion = async (versionId: number) => {
    try {
      const response = await fetch(
        `/api/solutions/${solutionId}/versions/${versionId}/rollback`,
        {
          method: 'POST',
        }
      );

      if (response.ok) {
        fetchVersions();
        setShowRollbackDialog(false);
        setSelectedVersion(null);
        toast({ title: '版本回滚成功' });
        router.refresh();
      } else {
        const error = await response.json();
        toast({ title: error.error || '回滚失败', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Failed to rollback version:', error);
      toast({ title: '回滚失败', variant: 'destructive' });
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleString('zh-CN');
  };

  const canEdit = permissions?.permissions?.canEdit;

  // 获取选中的版本对象
  const selectedVersions = versions.filter(v => selectedVersionIds.includes(v.id));
  const canCompare = selectedVersionIds.length === 2;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">加载版本列表...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 版本列表 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <GitBranch className="h-5 w-5" />
                版本历史
              </CardTitle>
              <CardDescription>共 {versions.length} 个版本</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {/* 版本对比按钮 */}
              <Button
                size="sm"
                variant="outline"
                disabled={!canCompare}
                onClick={openCompareDialog}
              >
                <GitCompare className="h-4 w-4 mr-2" />
                对比版本
                {selectedVersionIds.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {selectedVersionIds.length}/2
                  </Badge>
                )}
              </Button>
              {canEdit && (
                <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      创建版本
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>创建新版本</DialogTitle>
                      <DialogDescription>保存当前方案状态为新版本快照</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>版本名称</Label>
                        <Input
                          value={newVersion.versionName}
                          onChange={(e) => setNewVersion({ ...newVersion, versionName: e.target.value })}
                          placeholder="例如：V2.0 - 重大更新"
                        />
                      </div>
                      <div>
                        <Label>变更说明</Label>
                        <Textarea
                          value={newVersion.changeLog}
                          onChange={(e) => setNewVersion({ ...newVersion, changeLog: e.target.value })}
                          placeholder="描述本次版本的主要变更..."
                          rows={4}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                        取消
                      </Button>
                      <Button onClick={handleCreateVersion}>创建</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {versions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>版本</TableHead>
                  <TableHead>名称</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>创建人</TableHead>
                  <TableHead>创建时间</TableHead>
                  <TableHead>发布时间</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {versions.map((version) => (
                  <TableRow 
                    key={version.id}
                    className={selectedVersionIds.includes(version.id) ? 'bg-muted/50' : ''}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedVersionIds.includes(version.id)}
                        onCheckedChange={() => toggleVersionSelection(version.id)}
                        aria-label="选择此版本进行对比"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="text-sm">{version.versionNumber}</code>
                        {version.isLatest && (
                          <Badge variant="outline" className="text-xs">
                            最新
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{version.versionName || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={versionStatusConfig[version.status]?.variant || 'secondary'}>
                        {versionStatusConfig[version.status]?.label || version.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{version.creatorName || '-'}</TableCell>
                    <TableCell>{formatDate(version.createdAt)}</TableCell>
                    <TableCell>{formatDate(version.publishedAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* 查看快照 */}
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" title="查看快照">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>版本 {version.versionNumber} 快照</DialogTitle>
                            </DialogHeader>
                            {version.snapshot && (
                              <div className="space-y-4">
                                <div>
                                  <Label>方案名称</Label>
                                  <p className="text-sm mt-1">{version.snapshot.solutionName}</p>
                                </div>
                                <div>
                                  <Label>描述</Label>
                                  <p className="text-sm mt-1">{version.snapshot.description || '无'}</p>
                                </div>
                                <div>
                                  <Label>行业/场景</Label>
                                  <p className="text-sm mt-1">
                                    {version.snapshot.industry || '-'} / {version.snapshot.scenario || '-'}
                                  </p>
                                </div>
                                {version.snapshot.tags && version.snapshot.tags.length > 0 && (
                                  <div>
                                    <Label>标签</Label>
                                    <div className="flex flex-wrap gap-2 mt-1">
                                      {version.snapshot.tags.map((tag) => (
                                        <Badge key={tag} variant="secondary">{tag}</Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {version.snapshot.subSchemes && version.snapshot.subSchemes.length > 0 && (
                                  <div>
                                    <Label>子方案 ({version.snapshot.subSchemes.length})</Label>
                                    <div className="space-y-2 mt-1">
                                      {version.snapshot.subSchemes.map((sub, idx) => (
                                        <div key={idx} className="p-2 bg-muted rounded text-sm">
                                          <div className="font-medium">{sub.subSchemeName}</div>
                                          <div className="text-muted-foreground">{sub.subSchemeType}</div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                <div>
                                  <Label>变更说明</Label>
                                  <p className="text-sm mt-1 whitespace-pre-wrap">
                                    {version.changeLog || '无'}
                                  </p>
                                </div>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>

                        {/* 发布按钮 */}
                        {canEdit && version.status === 'draft' && (
                          <Dialog
                            open={showPublishDialog && selectedVersion?.id === version.id}
                            onOpenChange={(open) => {
                              setShowPublishDialog(open);
                              if (open) setSelectedVersion(version);
                              else setSelectedVersion(null);
                            }}
                          >
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="icon" title="发布版本">
                                <Send className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>发布版本 {version.versionNumber}</DialogTitle>
                                <DialogDescription>发布后该版本将可供他人引用</DialogDescription>
                              </DialogHeader>
                              <div>
                                <Label>发布说明（可选）</Label>
                                <Textarea
                                  value={publishNotes}
                                  onChange={(e) => setPublishNotes(e.target.value)}
                                  placeholder="补充说明..."
                                  rows={3}
                                />
                              </div>
                              <DialogFooter>
                                <Button variant="outline" onClick={() => setShowPublishDialog(false)}>
                                  取消
                                </Button>
                                <Button onClick={() => handlePublishVersion(version.id)}>
                                  确认发布
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        )}

                        {/* 回滚按钮 */}
                        {canEdit && !version.isLatest && version.status === 'published' && (
                          <Dialog
                            open={showRollbackDialog && selectedVersion?.id === version.id}
                            onOpenChange={(open) => {
                              setShowRollbackDialog(open);
                              if (open) setSelectedVersion(version);
                              else setSelectedVersion(null);
                            }}
                          >
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="icon" title="回滚到此版本">
                                <RotateCcw className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>回滚到版本 {version.versionNumber}</DialogTitle>
                                <DialogDescription>
                                  将方案内容恢复到该版本的状态，此操作会创建新版本
                                </DialogDescription>
                              </DialogHeader>
                              <DialogFooter>
                                <Button variant="outline" onClick={() => setShowRollbackDialog(false)}>
                                  取消
                                </Button>
                                <Button
                                  variant="destructive"
                                  onClick={() => handleRollbackVersion(version.id)}
                                >
                                  确认回滚
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>暂无版本记录</p>
              {canEdit && (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setShowCreateDialog(true)}
                >
                  创建第一个版本
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 版本对比对话框 */}
      {canCompare && (
        <VersionCompareDialog
          open={showCompareDialog}
          onOpenChange={(open) => {
            setShowCompareDialog(open);
            if (!open) {
              // 关闭时不清除选择，方便再次对比
            }
          }}
          solutionId={solutionId}
          version1Id={selectedVersionIds[0]}
          version2Id={selectedVersionIds[1]}
          version1Name={selectedVersions[0]?.versionNumber || ''}
          version2Name={selectedVersions[1]?.versionNumber || ''}
        />
      )}
    </div>
  );
}
