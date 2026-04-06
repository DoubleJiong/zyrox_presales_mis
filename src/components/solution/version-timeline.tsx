/**
 * 版本时间线组件
 * 
 * 功能：
 * - 时间线形式展示版本历史
 * - 显示每个版本的关键信息
 * - 支持展开查看详情
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  GitBranch,
  Clock,
  User,
  CheckCircle2,
  FileText,
  ChevronDown,
  ChevronRight,
  Send,
  RotateCcw,
  Edit,
  Eye,
} from 'lucide-react';

interface Version {
  id: number;
  solutionId: number;
  versionNumber: string;
  versionName: string | null;
  changeLog: string | null;
  changeType: 'major' | 'minor' | 'patch';
  status: 'draft' | 'published' | 'deprecated';
  isLatest: boolean;
  isPublished: boolean;
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

interface VersionTimelineProps {
  solutionId: number;
  versions: Version[];
  onVersionSelect?: (versionId: number) => void;
}

// 变更类型配置
const changeTypeConfig = {
  major: { label: '主版本', color: 'bg-red-100 text-red-700', icon: Edit },
  minor: { label: '次版本', color: 'bg-blue-100 text-blue-700', icon: FileText },
  patch: { label: '补丁版本', color: 'bg-gray-100 text-gray-700', icon: CheckCircle2 },
};

// 版本状态配置
const statusConfig = {
  draft: { label: '草稿', color: 'bg-yellow-100 text-yellow-700' },
  published: { label: '已发布', color: 'bg-green-100 text-green-700' },
  deprecated: { label: '已废弃', color: 'bg-gray-100 text-gray-500' },
};

export function VersionTimeline({ solutionId, versions, onVersionSelect }: VersionTimelineProps) {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // 格式化日期
  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 时间线节点样式
  const getTimelineNodeStyle = (version: Version, index: number) => {
    if (version.isLatest) return 'bg-primary text-primary-foreground';
    if (version.status === 'deprecated') return 'bg-muted text-muted-foreground';
    return 'bg-muted-foreground/20 text-muted-foreground';
  };

  if (versions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            版本时间线
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            暂无版本记录
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitBranch className="h-5 w-5" />
          版本时间线
        </CardTitle>
        <CardDescription>
          共 {versions.length} 个版本
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* 时间线主轴 */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

          {/* 版本节点列表 */}
          <div className="space-y-0">
            {versions.map((version, index) => {
              const changeType = changeTypeConfig[version.changeType || 'patch'];
              const ChangeIcon = changeType.icon;
              const isExpanded = expandedId === version.id;

              return (
                <div key={version.id} className="relative pl-12 pb-8 last:pb-0">
                  {/* 时间线节点 */}
                  <div
                    className={`absolute left-0 w-8 h-8 rounded-full flex items-center justify-center ${getTimelineNodeStyle(version, index)}`}
                  >
                    {version.isLatest ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <GitBranch className="h-4 w-4" />
                    )}
                  </div>

                  {/* 版本卡片 */}
                  <Collapsible
                    open={isExpanded}
                    onOpenChange={(open) => setExpandedId(open ? version.id : null)}
                  >
                    <CollapsibleTrigger asChild>
                      <div className={`p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors ${isExpanded ? 'border-primary' : ''}`}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-bold text-lg">{version.versionNumber}</span>
                              {version.versionName && (
                                <span className="text-muted-foreground">- {version.versionName}</span>
                              )}
                              {version.isLatest && (
                                <Badge className="bg-primary text-primary-foreground">最新</Badge>
                              )}
                              <Badge className={changeType.color}>
                                <ChangeIcon className="h-3 w-3 mr-1" />
                                {changeType.label}
                              </Badge>
                              <Badge className={statusConfig[version.status]?.color}>
                                {statusConfig[version.status]?.label}
                              </Badge>
                            </div>
                            
                            {version.changeLog && (
                              <p className="text-sm text-muted-foreground line-clamp-1">
                                {version.changeLog}
                              </p>
                            )}

                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {version.creatorName || '未知'}
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatDate(version.createdAt)}
                              </div>
                              {version.isPublished && version.publisherName && (
                                <div className="flex items-center gap-1">
                                  <Send className="h-3 w-3" />
                                  {version.publisherName} 发布
                                </div>
                              )}
                            </div>
                          </div>

                          <Button variant="ghost" size="sm">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <div className="mt-2 p-4 bg-muted/50 rounded-lg border">
                        {/* 快照信息 */}
                        {version.snapshot && (
                          <div className="space-y-4">
                            <div>
                              <h4 className="font-medium mb-2">方案信息</h4>
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                  <span className="text-muted-foreground">名称：</span>
                                  {version.snapshot.solutionName}
                                </div>
                                <div>
                                  <span className="text-muted-foreground">行业：</span>
                                  {version.snapshot.industry || '-'}
                                </div>
                                <div>
                                  <span className="text-muted-foreground">场景：</span>
                                  {version.snapshot.scenario || '-'}
                                </div>
                                <div>
                                  <span className="text-muted-foreground">标签：</span>
                                  {version.snapshot.tags?.join(', ') || '-'}
                                </div>
                              </div>
                            </div>

                            {version.snapshot.subSchemes && version.snapshot.subSchemes.length > 0 && (
                              <div>
                                <h4 className="font-medium mb-2">子方案 ({version.snapshot.subSchemes.length})</h4>
                                <div className="space-y-1">
                                  {version.snapshot.subSchemes.map((sub, i) => (
                                    <div key={i} className="flex items-center gap-2 text-sm">
                                      <Badge variant="outline" className="text-xs">
                                        {sub.subSchemeType}
                                      </Badge>
                                      <span>{sub.subSchemeName}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* 操作按钮 */}
                        <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onVersionSelect?.(version.id);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            查看详情
                          </Button>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
