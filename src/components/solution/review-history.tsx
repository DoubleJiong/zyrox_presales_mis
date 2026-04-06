/**
 * 评审历史组件
 * 
 * 功能：
 * - 展示评审记录列表
 * - 显示评审状态、评分、意见
 * - 支持筛选和排序
 */

'use client';

import { useState, useEffect } from 'react';
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
  MessageSquare,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  User,
  Calendar,
  Star,
  ChevronRight,
  Filter,
} from 'lucide-react';

interface Review {
  id: number;
  solutionId: number;
  subSchemeId: number | null;
  versionId: number | null;
  reviewerId: number;
  reviewerName: string | null;
  reviewerDepartment: string | null;
  reviewType: string;
  reviewStatus: 'pending' | 'approved' | 'rejected' | 'revision_required';
  reviewScore: number | null;
  reviewComment: string | null;
  reviewCriteria: Array<{
    criterion: string;
    score: number;
    comment?: string;
  }> | null;
  reviewRound: number;
  dueDate: string | null;
  reviewedAt: string | null;
  createdAt: string;
  subScheme?: {
    subSchemeName: string;
    subSchemeType: string;
  };
}

interface ReviewHistoryProps {
  solutionId: number;
  reviews?: Review[];
  showFilter?: boolean;
}

// 评审状态配置
const statusConfig = {
  pending: {
    label: '待评审',
    icon: Clock,
    color: 'text-yellow-600',
    bg: 'bg-yellow-50',
    badge: 'secondary',
  },
  approved: {
    label: '已通过',
    icon: CheckCircle2,
    color: 'text-green-600',
    bg: 'bg-green-50',
    badge: 'default',
  },
  rejected: {
    label: '已拒绝',
    icon: XCircle,
    color: 'text-red-600',
    bg: 'bg-red-50',
    badge: 'destructive',
  },
  revision_required: {
    label: '需修订',
    icon: AlertTriangle,
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    badge: 'outline',
  },
};

// 评审类型配置
const typeConfig: Record<string, string> = {
  submit: '提交评审',
  approve: '审批通过',
  reject: '审批拒绝',
  comment: '评审意见',
  revision: '要求修订',
};

// 获取评分等级
const getScoreLevel = (score: number) => {
  if (score >= 80) return { label: '优秀', color: 'text-green-600' };
  if (score >= 60) return { label: '合格', color: 'text-blue-600' };
  if (score >= 40) return { label: '待改进', color: 'text-yellow-600' };
  return { label: '不合格', color: 'text-red-600' };
};

export function ReviewHistory({ solutionId, reviews: propReviews, showFilter = true }: ReviewHistoryProps) {
  const router = useRouter();
  const [reviews, setReviews] = useState<Review[]>(propReviews || []);
  const [loading, setLoading] = useState(!propReviews);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    if (!propReviews) {
      fetchReviews();
    }
  }, [solutionId]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/solutions/${solutionId}/reviews`);
      
      if (response.ok) {
        const data = await response.json();
        setReviews(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  // 筛选评审
  const filteredReviews = reviews.filter((review) => {
    if (filterStatus === 'all') return true;
    return review.reviewStatus === filterStatus;
  });

  // 统计数据
  const stats = {
    total: reviews.length,
    approved: reviews.filter((r) => r.reviewStatus === 'approved').length,
    rejected: reviews.filter((r) => r.reviewStatus === 'rejected').length,
    pending: reviews.filter((r) => r.reviewStatus === 'pending').length,
    avgScore: reviews.filter((r) => r.reviewScore).length > 0
      ? reviews.filter((r) => r.reviewScore).reduce((sum, r) => sum + (r.reviewScore || 0), 0) / reviews.filter((r) => r.reviewScore).length
      : 0,
  };

  // 格式化日期
  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            评审历史
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">加载中...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              评审历史
            </CardTitle>
            <CardDescription>
              共 {reviews.length} 条评审记录
            </CardDescription>
          </div>
          {showFilter && (
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-32">
                <Filter className="h-4 w-4 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                <SelectItem value="pending">待评审</SelectItem>
                <SelectItem value="approved">已通过</SelectItem>
                <SelectItem value="rejected">已拒绝</SelectItem>
                <SelectItem value="revision_required">需修订</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* 统计摘要 */}
        <div className="grid grid-cols-5 gap-2 mb-6">
          <div className="text-center p-3 bg-muted rounded-lg">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-xs text-muted-foreground">总评审</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
            <div className="text-xs text-muted-foreground">通过</div>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
            <div className="text-xs text-muted-foreground">拒绝</div>
          </div>
          <div className="text-center p-3 bg-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <div className="text-xs text-muted-foreground">待评审</div>
          </div>
          <div className="text-center p-3 bg-muted rounded-lg">
            <div className="text-2xl font-bold">{stats.avgScore.toFixed(1)}</div>
            <div className="text-xs text-muted-foreground">平均分</div>
          </div>
        </div>

        {/* 评审列表 */}
        {filteredReviews.length > 0 ? (
          <div className="space-y-4">
            {filteredReviews.map((review) => {
              const status = statusConfig[review.reviewStatus];
              const StatusIcon = status.icon;

              return (
                <div
                  key={review.id}
                  className={`p-4 border rounded-lg ${status.bg} hover:shadow-sm transition-shadow`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* 头部信息 */}
                      <div className="flex items-center gap-2 mb-2">
                        <StatusIcon className={`h-5 w-5 ${status.color}`} />
                        <Badge variant={status.badge as any}>{status.label}</Badge>
                        <span className="text-sm text-muted-foreground">
                          第 {review.reviewRound} 轮
                        </span>
                        {review.reviewScore && (
                          <Badge variant="outline" className="gap-1">
                            <Star className="h-3 w-3" />
                            {review.reviewScore}
                          </Badge>
                        )}
                      </div>

                      {/* 评审人信息 */}
                      <div className="flex items-center gap-4 text-sm mb-2">
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{review.reviewerName || '未知'}</span>
                          {review.reviewerDepartment && (
                            <span className="text-muted-foreground">
                              ({review.reviewerDepartment})
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          {formatDate(review.reviewedAt || review.createdAt)}
                        </div>
                      </div>

                      {/* 子方案信息 */}
                      {review.subScheme && (
                        <div className="text-sm text-muted-foreground mb-2">
                          子方案：{review.subScheme.subSchemeName}
                          <Badge variant="outline" className="ml-2 text-xs">
                            {review.subScheme.subSchemeType}
                          </Badge>
                        </div>
                      )}

                      {/* 评审意见 */}
                      {review.reviewComment && (
                        <div className="mt-2 p-3 bg-white/50 rounded border text-sm">
                          {review.reviewComment}
                        </div>
                      )}

                      {/* 评审维度评分 */}
                      {review.reviewCriteria && review.reviewCriteria.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {review.reviewCriteria.map((criteria, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {criteria.criterion}: {criteria.score}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            {filterStatus === 'all' ? '暂无评审记录' : '没有符合条件的评审记录'}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
