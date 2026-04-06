/**
 * 投标统计分析API
 * 
 * 提供中标率、投标趋势、竞争对手分析等统计数据
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { projects, projectBiddings, users } from '@/db/schema';
import { eq, and, gte, lte, sql, desc } from 'drizzle-orm';
import { withAuth } from '@/lib/auth-middleware';
import { successResponse, errorResponse } from '@/lib/api-response';

// 统计时间范围类型
type TimeRange = 'week' | 'month' | 'quarter' | 'year';

// 获取时间范围起始日期
function getTimeRangeStart(range: TimeRange): Date {
  const now = new Date();
  switch (range) {
    case 'week':
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - 7);
      return weekStart;
    case 'month':
      return new Date(now.getFullYear(), now.getMonth(), 1);
    case 'quarter':
      const quarter = Math.floor(now.getMonth() / 3);
      return new Date(now.getFullYear(), quarter * 3, 1);
    case 'year':
      return new Date(now.getFullYear(), 0, 1);
    default:
      return new Date(now.getFullYear(), 0, 1);
  }
}

// GET - 获取投标统计数据
export const GET = withAuth(async (
  request: NextRequest,
  context: { userId: number; user?: any }
) => {
  try {
    const { searchParams } = new URL(request.url);
    const range = (searchParams.get('range') || 'year') as TimeRange;
    const managerId = searchParams.get('managerId');

    const timeStart = getTimeRangeStart(range);

    // 构建查询条件
    const conditions = [
      eq(projects.projectStage, 'bidding'),
      gte(projects.createdAt, timeStart),
    ];

    if (managerId) {
      conditions.push(eq(projects.managerId, parseInt(managerId)));
    }

    // 获取投标项目列表
    const biddingProjects = await db
      .select({
        id: projects.id,
        projectName: projects.projectName,
        managerId: projects.managerId,
        estimatedAmount: projects.estimatedAmount,
        contractAmount: projects.contractAmount,
        bidResult: projects.bidResult,
        createdAt: projects.createdAt,
        // 投标详情
        biddingId: projectBiddings.id,
        biddingType: projectBiddings.biddingType,
        bidPrice: projectBiddings.bidPrice,
        bidResultDetail: projectBiddings.bidResult,
        loseReason: projectBiddings.loseReason,
        winCompetitor: projectBiddings.winCompetitor,
      })
      .from(projects)
      .leftJoin(
        projectBiddings,
        eq(projects.id, projectBiddings.projectId)
      )
      .where(and(...conditions));

    // 计算基础统计
    const totalBids = biddingProjects.length;
    const wonBids = biddingProjects.filter(p => p.bidResult === 'won').length;
    const lostBids = biddingProjects.filter(p => p.bidResult === 'lost').length;
    const pendingBids = biddingProjects.filter(p => !p.bidResult || p.bidResult === 'pending').length;

    // 计算中标率
    const completedBids = wonBids + lostBids;
    const winRate = completedBids > 0 ? ((wonBids / completedBids) * 100).toFixed(1) : '0';

    // 计算金额统计
    const totalBidAmount = biddingProjects.reduce((sum, p) => {
      const amount = parseFloat(p.bidPrice || p.estimatedAmount || '0');
      return sum + amount;
    }, 0);

    const wonAmount = biddingProjects
      .filter(p => p.bidResult === 'won')
      .reduce((sum, p) => {
        const amount = parseFloat(p.contractAmount || p.bidPrice || p.estimatedAmount || '0');
        return sum + amount;
      }, 0);

    // 按投标类型统计
    const biddingTypeStats = biddingProjects.reduce((acc, p) => {
      const type = p.biddingType || 'unknown';
      if (!acc[type]) {
        acc[type] = { total: 0, won: 0, lost: 0 };
      }
      acc[type].total++;
      if (p.bidResult === 'won') acc[type].won++;
      if (p.bidResult === 'lost') acc[type].lost++;
      return acc;
    }, {} as Record<string, { total: number; won: number; lost: number }>);

    // 竞争对手分析
    const competitorStats = biddingProjects
      .filter(p => p.winCompetitor)
      .reduce((acc, p) => {
        const competitor = p.winCompetitor!;
        if (!acc[competitor]) {
          acc[competitor] = { wins: 0, losses: 0 };
        }
        // 我们中标，竞争对手落标
        if (p.bidResult === 'won') {
          acc[competitor].losses++;
        }
        // 竞争对手中标
        if (p.bidResult === 'lost') {
          acc[competitor].wins++;
        }
        return acc;
      }, {} as Record<string, { wins: number; losses: number }>);

    // 落标原因分析
    const loseReasonStats = biddingProjects
      .filter(p => p.loseReason)
      .reduce((acc, p) => {
        const reason = p.loseReason!;
        acc[reason] = (acc[reason] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    // 按月统计趋势
    const monthlyTrend: Array<{ month: string; total: number; won: number; lost: number }> = [];
    const monthMap = new Map<string, { total: number; won: number; lost: number }>();

    biddingProjects.forEach(p => {
      const date = new Date(p.createdAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, { total: 0, won: 0, lost: 0 });
      }
      
      const stats = monthMap.get(monthKey)!;
      stats.total++;
      if (p.bidResult === 'won') stats.won++;
      if (p.bidResult === 'lost') stats.lost++;
    });

    monthMap.forEach((stats, month) => {
      monthlyTrend.push({ month, ...stats });
    });
    monthlyTrend.sort((a, b) => a.month.localeCompare(b.month));

    // 按项目经理统计
    const managerIds = [...new Set(biddingProjects.map(p => p.managerId).filter(Boolean))];
    const managers = managerIds.length > 0
      ? await db.query.users.findMany({
          where: and(...managerIds.map(id => eq(users.id, id!))),
          columns: { id: true, realName: true },
        })
      : [];

    const managerStats = biddingProjects.reduce((acc, p) => {
      if (!p.managerId) return acc;
      const managerName = managers.find(m => m.id === p.managerId)?.realName || '未知';
      if (!acc[managerName]) {
        acc[managerName] = { total: 0, won: 0, lost: 0, amount: 0 };
      }
      acc[managerName].total++;
      if (p.bidResult === 'won') {
        acc[managerName].won++;
        acc[managerName].amount += parseFloat(p.contractAmount || p.bidPrice || '0');
      }
      if (p.bidResult === 'lost') acc[managerName].lost++;
      return acc;
    }, {} as Record<string, { total: number; won: number; lost: number; amount: number }>);

    // 构建响应
    const statistics = {
      summary: {
        totalBids,
        wonBids,
        lostBids,
        pendingBids,
        winRate: parseFloat(winRate),
        totalBidAmount,
        wonAmount,
        averageBidAmount: totalBids > 0 ? totalBidAmount / totalBids : 0,
      },
      biddingTypeStats,
      competitorStats,
      loseReasonStats,
      monthlyTrend,
      managerStats,
      timeRange: {
        start: timeStart.toISOString(),
        end: new Date().toISOString(),
        range,
      },
    };

    return successResponse(statistics);
  } catch (error) {
    console.error('Failed to fetch bidding statistics:', error);
    return errorResponse('INTERNAL_ERROR', '获取投标统计失败');
  }
});
