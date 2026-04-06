/**
 * 周报生成器服务
 * 
 * 核心功能：
 * 1. 从多个数据源收集数据
 * 2. 分析汇总数据
 * 3. 生成结构化的文字周报
 */

import { and, between, eq } from 'drizzle-orm';
import { db } from '@/db';
import * as schema from '@/db/schema';
import {
  ReportType,
  ReportStatus,
  WeeklyReport,
  WeeklyReportContent,
  ReportStatistics,
  ReportGeneratorConfig,
  ReportSection,
  ProjectSummary,
  TaskSummary,
  OpportunitySummary,
  BiddingSummary,
  KnowledgeSummary,
} from './types';

// ============================================
// 周报生成器类
// ============================================

export class WeeklyReportGenerator {
  private userId: number;
  private config: ReportGeneratorConfig;

  constructor(userId: number, config: ReportGeneratorConfig) {
    this.userId = userId;
    this.config = config;
  }

  /**
   * 生成周报
   */
  async generate(): Promise<WeeklyReport> {
    const dateRange = this.config.dateRange || this.getDefaultDateRange();
    const statistics = this.getDefaultStatistics();
    
    const content = this.generateDefaultContent(statistics);
    const reporter = await this.getReporterInfo();

    const report: WeeklyReport = {
      type: this.config.type,
      status: ReportStatus.GENERATED,
      reporterId: this.userId,
      reporterName: reporter.name,
      roleId: reporter.roleId,
      roleName: reporter.roleName,
      weekNumber: this.getWeekNumber(dateRange.start),
      year: dateRange.start.getFullYear(),
      startDate: dateRange.start,
      endDate: dateRange.end,
      content,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return report;
  }

  private getDefaultDateRange(): { start: Date; end: Date } {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);

    const start = new Date(now);
    start.setDate(diff);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    return { start, end };
  }

  private getWeekNumber(date: Date): number {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }

  private getDefaultStatistics(): ReportStatistics {
    return {
      totalProjects: 0,
      activeProjects: 0,
      completedProjects: 0,
      totalTasks: 0,
      completedTasks: 0,
      inProgressTasks: 0,
      overdueTasks: 0,
      totalEstimatedHours: 0,
      totalActualHours: 0,
      utilizationRate: 0,
      totalOpportunities: 0,
      newOpportunities: 0,
      wonOpportunities: 0,
      pipelineValue: 0,
      totalBiddings: 0,
      submittedBiddings: 0,
      wonBiddings: 0,
      knowledgeCount: 0,
      totalViews: 0,
      totalLikes: 0,
    };
  }

  private generateDefaultContent(statistics: ReportStatistics): WeeklyReportContent {
    return {
      summary: {
        title: '本周工作总结',
        content: '本周工作已记录。',
        bulletPoints: [],
      },
      projectProgress: {
        title: '项目进度',
        content: '暂无项目进度更新。',
        bulletPoints: [],
      },
      taskCompletion: {
        title: '任务完成情况',
        content: '暂无任务更新。',
        bulletPoints: [],
      },
      opportunityTracking: {
        title: '商机跟进',
        content: '暂无商机跟进记录。',
        bulletPoints: [],
      },
      biddingProgress: {
        title: '投标进展',
        content: '暂无投标进展记录。',
        bulletPoints: [],
      },
      risksAndIssues: {
        title: '风险与问题',
        content: '暂无风险与问题。',
        bulletPoints: [],
      },
      nextWeekPlan: {
        title: '下周工作计划',
        content: '待确认下周工作计划。',
        bulletPoints: [],
      },
      coordinationNeeded: {
        title: '需要协调的事项',
        content: '暂无需要协调的事项。',
        bulletPoints: [],
      },
      statistics,
    };
  }

  private async getReporterInfo(): Promise<{ name: string; roleId?: number; roleName?: string }> {
    const userResult = await db.query.users.findFirst({
      where: eq(schema.users.id, this.userId),
      with: {
        role: true,
      },
    });

    if (!userResult) {
      return { name: '' };
    }

    // 类型断言处理
    const user = userResult as unknown as {
      realName: string;
      role?: {
        id: number;
        roleName: string;
      } | null;
    };

    if (!user.role) {
      return { name: user.realName };
    }

    return {
      name: user.realName,
      roleId: user.role.id,
      roleName: user.role.roleName,
    };
  }
}

export function createWeeklyReportGenerator(
  userId: number,
  config: ReportGeneratorConfig
): WeeklyReportGenerator {
  return new WeeklyReportGenerator(userId, config);
}
