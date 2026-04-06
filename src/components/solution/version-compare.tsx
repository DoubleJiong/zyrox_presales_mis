/**
 * 版本对比组件
 * 
 * 功能：
 * - 选择两个版本进行对比
 * - 展示方案基本信息变更
 * - 展示子方案变更
 * - 差异高亮显示
 */

'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  GitCompare,
  ArrowRight,
  Plus,
  Minus,
  Edit,
  CheckCircle2,
  XCircle,
  FileText,
  Loader2,
} from 'lucide-react';

interface Version {
  id: number;
  versionNumber: string;
  versionName: string | null;
  changeLog: string | null;
  status: string;
  createdAt: string;
}

interface VersionDiff {
  version1: {
    id: number;
    versionNumber: string;
    createdAt: string;
  };
  version2: {
    id: number;
    versionNumber: string;
    createdAt: string;
  };
  solutionDiff: {
    fields: Array<{
      field: string;
      label: string;
      oldValue: any;
      newValue: any;
      changed: boolean;
    }>;
  };
  subSchemesDiff: {
    added: Array<any>;
    removed: Array<any>;
    modified: Array<{
      subScheme: any;
      changes: Array<{
        field: string;
        oldValue: any;
        newValue: any;
      }>;
    }>;
  };
  filesDiff: {
    added: Array<any>;
    removed: Array<any>;
    modified: Array<any>;
  };
  statisticsDiff: {
    viewCount: { old: number; new: number };
    downloadCount: { old: number; new: number };
    likeCount: { old: number; new: number };
  };
}

interface VersionCompareProps {
  solutionId: number;
  versions: Version[];
}

// 字段标签映射
const fieldLabels: Record<string, string> = {
  solutionName: '方案名称',
  description: '描述',
  content: '方案内容',
  industry: '适用行业',
  scenario: '适用场景',
  status: '状态',
  version: '版本号',
  tags: '标签',
};

// 变更类型样式
const changeTypeStyles = {
  added: { icon: Plus, color: 'text-green-600', bg: 'bg-green-50', label: '新增' },
  removed: { icon: Minus, color: 'text-red-600', bg: 'bg-red-50', label: '删除' },
  modified: { icon: Edit, color: 'text-blue-600', bg: 'bg-blue-50', label: '修改' },
  unchanged: { icon: CheckCircle2, color: 'text-gray-400', bg: 'bg-gray-50', label: '未变' },
};

export function VersionCompare({ solutionId, versions }: VersionCompareProps) {
  const { toast } = useToast();
  
  const [version1Id, setVersion1Id] = useState<string>('');
  const [version2Id, setVersion2Id] = useState<string>('');
  const [diff, setDiff] = useState<VersionDiff | null>(null);
  const [loading, setLoading] = useState(false);

  // 自动选择最新的两个版本
  useEffect(() => {
    if (versions.length >= 2 && !version1Id && !version2Id) {
      setVersion1Id(String(versions[0].id));
      setVersion2Id(String(versions[1].id));
    }
  }, [versions]);

  // 执行对比
  const handleCompare = async () => {
    if (!version1Id || !version2Id) {
      toast({ title: '请选择两个版本进行对比', variant: 'destructive' });
      return;
    }

    if (version1Id === version2Id) {
      toast({ title: '请选择不同的版本进行对比', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `/api/solutions/${solutionId}/versions/compare?version1=${version1Id}&version2=${version2Id}`
      );

      if (response.ok) {
        const data = await response.json();
        setDiff(data.data);
      } else {
        const error = await response.json();
        toast({ title: error.error || '对比失败', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Failed to compare versions:', error);
      toast({ title: '对比失败', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // 渲染差异值
  const renderDiffValue = (oldValue: any, newValue: any, changed: boolean) => {
    if (!changed) {
      return <span className="text-muted-foreground">{oldValue || '-'}</span>;
    }

    return (
      <div className="flex items-center gap-2">
        <span className="text-red-600 line-through bg-red-50 px-1 rounded">
          {oldValue || '(空)'}
        </span>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
        <span className="text-green-600 bg-green-50 px-1 rounded font-medium">
          {newValue || '(空)'}
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* 版本选择 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitCompare className="h-5 w-5" />
            版本对比
          </CardTitle>
          <CardDescription>选择两个版本进行对比，查看变更详情</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium">版本 A</label>
              <Select value={version1Id} onValueChange={setVersion1Id}>
                <SelectTrigger>
                  <SelectValue placeholder="选择版本" />
                </SelectTrigger>
                <SelectContent>
                  {versions.map((v) => (
                    <SelectItem key={v.id} value={String(v.id)} disabled={String(v.id) === version2Id}>
                      {v.versionNumber} {v.versionName && `- ${v.versionName}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium">版本 B</label>
              <Select value={version2Id} onValueChange={setVersion2Id}>
                <SelectTrigger>
                  <SelectValue placeholder="选择版本" />
                </SelectTrigger>
                <SelectContent>
                  {versions.map((v) => (
                    <SelectItem key={v.id} value={String(v.id)} disabled={String(v.id) === version1Id}>
                      {v.versionNumber} {v.versionName && `- ${v.versionName}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleCompare} disabled={loading || !version1Id || !version2Id}>
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <GitCompare className="h-4 w-4 mr-2" />
              )}
              开始对比
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 对比结果 */}
      {diff && (
        <div className="space-y-4">
          {/* 基本信息变更 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">基本信息变更</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {diff.solutionDiff.fields.map((field) => {
                  const changeType = field.changed ? 'modified' : 'unchanged';
                  const style = changeTypeStyles[changeType];
                  const Icon = style.icon;

                  return (
                    <div key={field.field} className={`p-3 rounded-lg ${style.bg}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className={`h-4 w-4 ${style.color}`} />
                        <span className="font-medium">{fieldLabels[field.field] || field.field}</span>
                        {field.changed && (
                          <Badge variant="outline" className={style.color}>
                            {style.label}
                          </Badge>
                        )}
                      </div>
                      {renderDiffValue(field.oldValue, field.newValue, field.changed)}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* 子方案变更 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">子方案变更</CardTitle>
              <CardDescription>
                新增 {diff.subSchemesDiff.added.length} 个，
                删除 {diff.subSchemesDiff.removed.length} 个，
                修改 {diff.subSchemesDiff.modified.length} 个
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* 新增的子方案 */}
              {diff.subSchemesDiff.added.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-medium text-green-600 mb-2 flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    新增子方案
                  </h4>
                  <div className="space-y-2">
                    {diff.subSchemesDiff.added.map((sub: any, index: number) => (
                      <div key={index} className="p-2 bg-green-50 rounded flex items-center gap-2">
                        <Badge variant="outline">{sub.subSchemeType}</Badge>
                        <span>{sub.subSchemeName}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 删除的子方案 */}
              {diff.subSchemesDiff.removed.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-medium text-red-600 mb-2 flex items-center gap-2">
                    <Minus className="h-4 w-4" />
                    删除子方案
                  </h4>
                  <div className="space-y-2">
                    {diff.subSchemesDiff.removed.map((sub: any, index: number) => (
                      <div key={index} className="p-2 bg-red-50 rounded flex items-center gap-2 line-through">
                        <Badge variant="outline">{sub.subSchemeType}</Badge>
                        <span>{sub.subSchemeName}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 修改的子方案 */}
              {diff.subSchemesDiff.modified.length > 0 && (
                <div>
                  <h4 className="font-medium text-blue-600 mb-2 flex items-center gap-2">
                    <Edit className="h-4 w-4" />
                    修改子方案
                  </h4>
                  <div className="space-y-2">
                    {diff.subSchemesDiff.modified.map((item: any, index: number) => (
                      <div key={index} className="p-2 bg-blue-50 rounded">
                        <div className="font-medium mb-2">{item.subScheme.subSchemeName}</div>
                        <div className="space-y-1 text-sm">
                          {item.changes.map((change: any, i: number) => (
                            <div key={i} className="flex items-center gap-2">
                              <span className="text-muted-foreground">{change.field}:</span>
                              <span className="text-red-600 line-through">{change.oldValue || '(空)'}</span>
                              <ArrowRight className="h-3 w-3" />
                              <span className="text-green-600">{change.newValue || '(空)'}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {diff.subSchemesDiff.added.length === 0 &&
                diff.subSchemesDiff.removed.length === 0 &&
                diff.subSchemesDiff.modified.length === 0 && (
                  <div className="text-center py-4 text-muted-foreground">
                    子方案无变更
                  </div>
                )}
            </CardContent>
          </Card>

          {/* 统计数据变更 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">统计数据变更</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">浏览量</div>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-lg">{diff.statisticsDiff.viewCount.old}</span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <span className="text-lg font-bold text-green-600">
                      {diff.statisticsDiff.viewCount.new}
                    </span>
                  </div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">下载量</div>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-lg">{diff.statisticsDiff.downloadCount.old}</span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <span className="text-lg font-bold text-green-600">
                      {diff.statisticsDiff.downloadCount.new}
                    </span>
                  </div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">点赞数</div>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-lg">{diff.statisticsDiff.likeCount.old}</span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <span className="text-lg font-bold text-green-600">
                      {diff.statisticsDiff.likeCount.new}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
