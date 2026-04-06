/**
 * 方案排行榜页面
 * 
 * 功能：
 * - 展示方案排行榜
 * - 支持按维度筛选
 * - 显示评分详情
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Trophy,
  Medal,
  Star,
  TrendingUp,
  Users,
  Target,
  Activity,
  Eye,
  Download,
  ExternalLink,
  Crown,
  Loader2,
} from 'lucide-react';

interface LeaderboardEntry {
  rank: number;
  solutionId: number;
  solutionName: string;
  solutionCode: string;
  totalScore: string;
  qualityScore: string;
  businessValueScore: string;
  userRecognitionScore: string;
  activityScore: string;
  viewCount: number;
  downloadCount: number;
}

// 维度配置
const dimensionConfig = {
  total: { label: '综合评分', icon: Trophy, color: 'text-yellow-500' },
  quality: { label: '质量分', icon: Star, color: 'text-yellow-500' },
  business_value: { label: '商业价值分', icon: Target, color: 'text-green-500' },
  user_recognition: { label: '用户认可分', icon: Users, color: 'text-blue-500' },
  activity: { label: '活跃度分', icon: Activity, color: 'text-purple-500' },
};

// 排名样式
const getRankStyle = (rank: number) => {
  if (rank === 1) return { icon: Crown, color: 'text-yellow-500', bg: 'bg-yellow-50' };
  if (rank === 2) return { icon: Medal, color: 'text-gray-400', bg: 'bg-gray-50' };
  if (rank === 3) return { icon: Medal, color: 'text-amber-600', bg: 'bg-amber-50' };
  return { icon: null, color: 'text-muted-foreground', bg: '' };
};

export default function LeaderboardPage() {
  const router = useRouter();
  
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [dimension, setDimension] = useState<keyof typeof dimensionConfig>('total');
  const [limit, setLimit] = useState(20);

  useEffect(() => {
    fetchLeaderboard();
  }, [dimension, limit]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/solutions/leaderboard?dimension=${dimension}&limit=${limit}`);
      
      if (response.ok) {
        const data = await response.json();
        setLeaderboard(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSolutionClick = (solutionId: number) => {
    router.push(`/solutions/${solutionId}`);
  };

  const currentDimension = dimensionConfig[dimension];
  const DimensionIcon = currentDimension.icon;

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Trophy className="h-8 w-8 text-yellow-500" />
            方案排行榜
          </h1>
          <p className="text-muted-foreground mt-1">
            基于多维度评分的方案排名
          </p>
        </div>
      </div>

      {/* 筛选控制 */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">排序维度：</span>
              <Select value={dimension} onValueChange={(v) => setDimension(v as any)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(dimensionConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <config.icon className={`h-4 w-4 ${config.color}`} />
                        {config.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">显示数量：</span>
              <Select value={String(limit)} onValueChange={(v) => setLimit(Number(v))}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 前三名展示 */}
      {leaderboard.length >= 3 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {leaderboard.slice(0, 3).map((entry, index) => {
            const rankStyle = getRankStyle(index + 1);
            const RankIcon = rankStyle.icon!;

            return (
              <Card
                key={entry.solutionId}
                className={`${rankStyle.bg} cursor-pointer hover:shadow-lg transition-shadow`}
                onClick={() => handleSolutionClick(entry.solutionId)}
              >
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="flex justify-center mb-2">
                      <RankIcon className={`h-10 w-10 ${rankStyle.color}`} />
                    </div>
                    <div className="text-4xl font-bold mb-2">#{index + 1}</div>
                    <div className="font-medium text-lg truncate">{entry.solutionName}</div>
                    <div className="text-sm text-muted-foreground mb-3">{entry.solutionCode}</div>
                    
                    <div className={`text-3xl font-bold ${currentDimension.color} mb-2`}>
                      {parseFloat(entry.totalScore).toFixed(1)}
                    </div>
                    <Badge variant="outline">{currentDimension.label}</Badge>

                    <div className="flex justify-center gap-4 mt-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Eye className="h-4 w-4" />
                        {entry.viewCount}
                      </div>
                      <div className="flex items-center gap-1">
                        <Download className="h-4 w-4" />
                        {entry.downloadCount}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* 排行榜表格 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DimensionIcon className={`h-5 w-5 ${currentDimension.color}`} />
            完整排名
          </CardTitle>
          <CardDescription>
            按{currentDimension.label}排序
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : leaderboard.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16 text-center">排名</TableHead>
                  <TableHead>方案名称</TableHead>
                  <TableHead className="text-center">综合评分</TableHead>
                  <TableHead className="text-center">质量分</TableHead>
                  <TableHead className="text-center">商业价值</TableHead>
                  <TableHead className="text-center">用户认可</TableHead>
                  <TableHead className="text-center">活跃度</TableHead>
                  <TableHead className="text-center">浏览</TableHead>
                  <TableHead className="text-center">下载</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaderboard.map((entry) => {
                  const rankStyle = getRankStyle(entry.rank);
                  const RankIcon = rankStyle.icon;

                  return (
                    <TableRow
                      key={entry.solutionId}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSolutionClick(entry.solutionId)}
                    >
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center">
                          {RankIcon ? (
                            <RankIcon className={`h-5 w-5 ${rankStyle.color}`} />
                          ) : (
                            <span className="font-bold">{entry.rank}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{entry.solutionName}</div>
                          <div className="text-xs text-muted-foreground">{entry.solutionCode}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-bold text-lg">
                          {parseFloat(entry.totalScore).toFixed(1)}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={dimensionConfig.quality.color}>
                          {parseFloat(entry.qualityScore).toFixed(1)}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={dimensionConfig.business_value.color}>
                          {parseFloat(entry.businessValueScore).toFixed(1)}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={dimensionConfig.user_recognition.color}>
                          {parseFloat(entry.userRecognitionScore).toFixed(1)}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={dimensionConfig.activity.color}>
                          {parseFloat(entry.activityScore).toFixed(1)}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1 text-muted-foreground">
                          <Eye className="h-4 w-4" />
                          {entry.viewCount}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1 text-muted-foreground">
                          <Download className="h-4 w-4" />
                          {entry.downloadCount}
                        </div>
                      </TableCell>
                      <TableCell>
                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              暂无排行数据
            </div>
          )}
        </CardContent>
      </Card>

      {/* 评分说明 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">评分说明</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
            {Object.entries(dimensionConfig).map(([key, config]) => (
              <div key={key} className="flex items-center gap-2">
                <config.icon className={`h-5 w-5 ${config.color}`} />
                <div>
                  <div className="font-medium">{config.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {key === 'total' && '加权综合评分'}
                    {key === 'quality' && '权重 30%'}
                    {key === 'business_value' && '权重 35%'}
                    {key === 'user_recognition' && '权重 20%'}
                    {key === 'activity' && '权重 15%'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
