'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { apiClient } from '@/lib/api-client';
import { 
  FileText, 
  MessageSquare, 
  Calendar,
  Building2,
  MapPin,
  Users,
  Clock,
  TrendingUp,
  Eye,
  ChevronRight,
  Paperclip,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProjectOverviewCardProps {
  projectId: number;
}

interface FollowRecord {
  id: number;
  followContent: string;
  followTime: string;
  followType: string;
  followerName: string;
  isBusinessTrip?: boolean;
  tripStartDate?: string;
  tripEndDate?: string;
  tripCost?: string;
  attachments?: Array<{
    name: string;
    size: number;
    type: string;
  }>;
}

interface ProjectSolution {
  id: number;
  solutionId: number;
  solutionCode: string;
  solutionName: string;
  version: string;
  usageType: 'reference' | 'implementation' | 'customization';
  implementationStatus: string | null;
  industry: string | null;
  scenario: string | null;
  author: { id: number; name: string } | null;
  tags: string[] | null;
  associatedAt: string;
}

const USAGE_TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  reference: { label: '参考方案', color: 'bg-blue-100 text-blue-700' },
  implementation: { label: '实施方案', color: 'bg-green-100 text-green-700' },
  customization: { label: '定制方案', color: 'bg-purple-100 text-purple-700' },
};

const FOLLOW_TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  '电话沟通': { label: '电话沟通', color: 'bg-green-100 text-green-700' },
  '现场拜访': { label: '现场拜访', color: 'bg-blue-100 text-blue-700' },
  '会议': { label: '会议', color: 'bg-purple-100 text-purple-700' },
  '邮件': { label: '邮件', color: 'bg-orange-100 text-orange-700' },
  '技术交流': { label: '技术交流', color: 'bg-cyan-100 text-cyan-700' },
  '需求调研': { label: '需求调研', color: 'bg-yellow-100 text-yellow-700' },
  '方案演示': { label: '方案演示', color: 'bg-pink-100 text-pink-700' },
  '其他': { label: '其他', color: 'bg-gray-100 text-gray-700' },
};

export function ProjectOverviewCard({ projectId }: ProjectOverviewCardProps) {
  const [followRecords, setFollowRecords] = useState<FollowRecord[]>([]);
  const [solutions, setSolutions] = useState<ProjectSolution[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 详情弹窗状态
  const [selectedFollow, setSelectedFollow] = useState<FollowRecord | null>(null);
  const [followDetailOpen, setFollowDetailOpen] = useState(false);
  const [selectedSolution, setSelectedSolution] = useState<ProjectSolution | null>(null);
  const [solutionDetailOpen, setSolutionDetailOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, [projectId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [followRes, solutionRes] = await Promise.all([
        apiClient.get<{ success: boolean; data: FollowRecord[] }>(`/api/projects/${projectId}/follows`),
        apiClient.get<{ success: boolean; data: ProjectSolution[] }>(`/api/projects/${projectId}/solutions`),
      ]);
      
      const followData = (followRes.data as any).data || followRes.data;
      const solutionData = (solutionRes.data as any).data || solutionRes.data;
      
      if (Array.isArray(followData)) {
        setFollowRecords(followData);
      }
      if (Array.isArray(solutionData)) {
        setSolutions(solutionData);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 统计数据
  const stats = {
    followCount: followRecords.length,
    tripCount: followRecords.filter(r => r.isBusinessTrip).length,
    solutionCount: solutions.length,
    implementationCount: solutions.filter(s => s.usageType === 'implementation').length,
  };

  return (
    <div className="space-y-6">
      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200/50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <MessageSquare className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-700">{stats.followCount}</p>
                <p className="text-xs text-blue-600/70">跟进记录</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-950/30 dark:to-orange-900/20 border-orange-200/50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <MapPin className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-700">{stats.tripCount}</p>
                <p className="text-xs text-orange-600/70">出差次数</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/30 dark:to-green-900/20 border-green-200/50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <FileText className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-700">{stats.solutionCount}</p>
                <p className="text-xs text-green-600/70">解决方案</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/30 dark:to-purple-900/20 border-purple-200/50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-700">{stats.implementationCount}</p>
                <p className="text-xs text-purple-600/70">实施方案</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 跟进记录时间线 */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base">跟进记录</CardTitle>
              <Badge variant="secondary" className="text-xs">{stats.followCount} 条</Badge>
            </div>
            <span className="text-xs text-muted-foreground">在「项目策划」Tab中管理</span>
          </div>
          <CardDescription className="text-xs">
            最近跟进动态（点击查看详情）
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-24 text-muted-foreground">
              加载中...
            </div>
          ) : followRecords.length > 0 ? (
            <ScrollArea className="h-[280px]">
              <div className="relative pl-6 space-y-4">
                {/* 时间轴线 */}
                <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-gradient-to-b from-primary/50 via-primary/30 to-transparent" />
                
                {followRecords.slice(0, 10).map((record, index) => {
                  const typeConfig = FOLLOW_TYPE_CONFIG[record.followType] || FOLLOW_TYPE_CONFIG['其他'];
                  return (
                    <div 
                      key={record.id || index} 
                      className="relative group cursor-pointer"
                      onClick={() => {
                        setSelectedFollow(record);
                        setFollowDetailOpen(true);
                      }}
                    >
                      {/* 时间轴节点 */}
                      <div className={cn(
                        "absolute -left-4 top-1.5 w-3 h-3 rounded-full border-2 border-background",
                        record.isBusinessTrip ? "bg-orange-500" : "bg-primary"
                      )} />
                      
                      <div className="bg-muted/30 hover:bg-muted/50 rounded-lg p-3 transition-colors border border-transparent hover:border-primary/20">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className={cn("text-xs", typeConfig.color)}>
                                {typeConfig.label}
                              </Badge>
                              {record.isBusinessTrip && (
                                <Badge variant="outline" className="text-xs text-orange-600">
                                  <MapPin className="h-3 w-3 mr-1" />
                                  出差
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm line-clamp-2">{record.followContent}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1 flex-shrink-0">
                            <span className="text-xs text-muted-foreground">{formatDate(record.followTime)}</span>
                            <span className="text-xs text-muted-foreground">{record.followerName}</span>
                          </div>
                        </div>
                        {record.attachments && record.attachments.length > 0 && (
                          <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                            <Paperclip className="h-3 w-3" />
                            <span>{record.attachments.length} 个附件</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                
                {followRecords.length > 10 && (
                  <div className="text-center text-xs text-muted-foreground pt-2">
                    还有 {followRecords.length - 10} 条记录，在「项目策划」Tab中查看全部
                  </div>
                )}
              </div>
            </ScrollArea>
          ) : (
            <div className="flex flex-col items-center justify-center h-24 text-muted-foreground">
              <MessageSquare className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">暂无跟进记录</p>
              <p className="text-xs">在「项目策划」Tab中添加</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 解决方案列表 */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base">解决方案</CardTitle>
              <Badge variant="secondary" className="text-xs">{stats.solutionCount} 个</Badge>
            </div>
            <span className="text-xs text-muted-foreground">在「项目策划」Tab中管理</span>
          </div>
          <CardDescription className="text-xs">
            已关联的解决方案（点击查看详情）
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-24 text-muted-foreground">
              加载中...
            </div>
          ) : solutions.length > 0 ? (
            <div className="space-y-3">
              {solutions.slice(0, 5).map((solution) => {
                const usageConfig = USAGE_TYPE_CONFIG[solution.usageType] || USAGE_TYPE_CONFIG.reference;
                return (
                  <div
                    key={solution.id}
                    className="flex items-center gap-3 p-3 bg-muted/30 hover:bg-muted/50 rounded-lg cursor-pointer transition-colors border border-transparent hover:border-primary/20"
                    onClick={() => {
                      setSelectedSolution(solution);
                      setSolutionDetailOpen(true);
                    }}
                  >
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500/20 to-green-600/20 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-green-600" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm truncate">{solution.solutionName}</span>
                        <Badge className={cn("text-xs", usageConfig.color)}>
                          {usageConfig.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {solution.author && (
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {solution.author.name}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(solution.associatedAt)}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  </div>
                );
              })}
              
              {solutions.length > 5 && (
                <div className="text-center text-xs text-muted-foreground pt-2">
                  还有 {solutions.length - 5} 个方案，在「项目策划」Tab中查看全部
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-24 text-muted-foreground">
              <FileText className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">暂无解决方案</p>
              <p className="text-xs">在「项目策划」Tab中关联</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 跟进记录详情弹窗 */}
      <Dialog open={followDetailOpen} onOpenChange={setFollowDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              跟进记录详情
            </DialogTitle>
          </DialogHeader>
          {selectedFollow && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge className={FOLLOW_TYPE_CONFIG[selectedFollow.followType]?.color || 'bg-gray-100'}>
                  {selectedFollow.followType}
                </Badge>
                {selectedFollow.isBusinessTrip && (
                  <Badge variant="outline" className="text-orange-600">
                    <MapPin className="h-3 w-3 mr-1" />
                    出差
                  </Badge>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">跟进人：</span>
                  <span className="font-medium">{selectedFollow.followerName}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">跟进时间：</span>
                  <span className="font-medium">{formatDateTime(selectedFollow.followTime)}</span>
                </div>
              </div>
              
              {selectedFollow.isBusinessTrip && (
                <div className="p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 text-sm">
                  <div className="font-medium text-orange-700 mb-2">出差信息</div>
                  <div className="grid grid-cols-2 gap-2 text-orange-600">
                    {selectedFollow.tripStartDate && (
                      <div>开始：{formatDate(selectedFollow.tripStartDate)}</div>
                    )}
                    {selectedFollow.tripEndDate && (
                      <div>结束：{formatDate(selectedFollow.tripEndDate)}</div>
                    )}
                    {selectedFollow.tripCost && (
                      <div>差旅成本：¥{selectedFollow.tripCost}</div>
                    )}
                  </div>
                </div>
              )}
              
              <div>
                <span className="text-muted-foreground text-sm">跟进内容：</span>
                <p className="mt-1 p-3 bg-muted/30 rounded-lg text-sm whitespace-pre-wrap">
                  {selectedFollow.followContent}
                </p>
              </div>
              
              {selectedFollow.attachments && selectedFollow.attachments.length > 0 && (
                <div>
                  <span className="text-muted-foreground text-sm">附件：</span>
                  <div className="mt-1 space-y-1">
                    {selectedFollow.attachments.map((att, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2 bg-muted/30 rounded text-sm">
                        <Paperclip className="h-4 w-4 text-muted-foreground" />
                        <span>{att.name}</span>
                        <span className="text-xs text-muted-foreground">
                          ({(att.size / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 解决方案详情弹窗 */}
      <Dialog open={solutionDetailOpen} onOpenChange={setSolutionDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              解决方案详情
            </DialogTitle>
          </DialogHeader>
          {selectedSolution && (
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-lg">{selectedSolution.solutionName}</h3>
                <p className="text-sm text-muted-foreground">{selectedSolution.solutionCode}</p>
              </div>
              
              <div className="flex items-center gap-2">
                <Badge className={USAGE_TYPE_CONFIG[selectedSolution.usageType]?.color}>
                  {USAGE_TYPE_CONFIG[selectedSolution.usageType]?.label}
                </Badge>
                {selectedSolution.version && (
                  <Badge variant="outline">v{selectedSolution.version}</Badge>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                {selectedSolution.author && (
                  <div>
                    <span className="text-muted-foreground">作者：</span>
                    <span className="font-medium">{selectedSolution.author.name}</span>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">关联时间：</span>
                  <span className="font-medium">{formatDate(selectedSolution.associatedAt)}</span>
                </div>
                {selectedSolution.industry && (
                  <div>
                    <span className="text-muted-foreground">行业：</span>
                    <span className="font-medium">{selectedSolution.industry}</span>
                  </div>
                )}
                {selectedSolution.scenario && (
                  <div>
                    <span className="text-muted-foreground">场景：</span>
                    <span className="font-medium">{selectedSolution.scenario}</span>
                  </div>
                )}
              </div>
              
              {selectedSolution.tags && selectedSolution.tags.length > 0 && (
                <div>
                  <span className="text-muted-foreground text-sm">标签：</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedSolution.tags.map((tag, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">{tag}</Badge>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="pt-2">
                <Button variant="outline" className="w-full" asChild>
                  <a href={`/solutions/${selectedSolution.solutionId}`} target="_blank">
                    <Eye className="h-4 w-4 mr-2" />
                    查看完整方案
                  </a>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
