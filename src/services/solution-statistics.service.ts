/**
 * 方案统计服务
 * 
 * 功能：
 * - 综合统计汇总（直接计算，无需定时任务）
 * - 区域热度分析
 * - 用户使用排行
 * - 实时统计数据
 */

import { db } from '@/db';
import { 
  solutions, 
  solutionStatsSummary,
  solutionProjects,
  solutionUsageRecord,
  solutionReviews,
  projects,
  users
} from '@/db/schema';
import { eq, desc, and, isNull, inArray, sql } from 'drizzle-orm';

export interface SolutionStatsSummaryData {
  projectStats: {
    totalCount: number;
    wonCount: number;
    lostCount: number;
    pendingCount: number;
    totalEstimatedAmount: number;
    totalContractAmount: number;
    wonRate: number;
  };
  usageStats: {
    uniqueUserCount: number;
    topUsers: Array<{ userId: number; name: string; count: number }>;
    templateUsageCount: number;
  };
  regionStats: {
    topRegions: Array<{ region: string; count: number; wonRate: number }>;
    allRegions: Record<string, number>;
  };
  reviewStats: {
    totalCount: number;
    approvedCount: number;
    rejectedCount: number;
    avgScore: number;
  };
  recentProjects: Array<{
    projectId: number;
    projectName: string;
    status: string;
    bidResult: string | null;
    estimatedAmount: string | null;
  }>;
}

export class SolutionStatisticsService {
  
  /**
   * 获取方案统计汇总（实时计算）
   */
  async getStatsSummary(solutionId: number): Promise<SolutionStatsSummaryData> {
    // 并行获取所有统计数据以提高性能
    const [projectStats, usageStats, regionStats, reviewStats, recentProjects] = await Promise.all([
      this.getProjectStats(solutionId),
      this.getUsageStats(solutionId),
      this.getRegionStats(solutionId),
      this.getReviewStats(solutionId),
      this.getRecentProjects(solutionId),
    ]);
    
    return {
      projectStats,
      usageStats,
      regionStats,
      reviewStats,
      recentProjects,
    };
  }
  
  /**
   * 获取项目统计
   */
  private async getProjectStats(solutionId: number) {
    const result = await db.execute(sql`
      SELECT 
        COUNT(*) as total_count,
        COUNT(CASE WHEN p.bid_result = 'won' THEN 1 END) as won_count,
        COUNT(CASE WHEN p.bid_result = 'lost' THEN 1 END) as lost_count,
        COUNT(CASE WHEN p.bid_result IS NULL OR p.bid_result = 'pending' THEN 1 END) as pending_count,
        COALESCE(SUM(CAST(p.estimated_amount AS DECIMAL)), 0) as total_estimated,
        COALESCE(SUM(CASE WHEN p.bid_result = 'won' THEN CAST(p.actual_amount AS DECIMAL) ELSE 0 END), 0) as total_contract
      FROM bus_solution_project sp
      LEFT JOIN bus_project p ON sp.project_id = p.id
      WHERE sp.solution_id = ${solutionId} AND sp.deleted_at IS NULL
    `);
    
    const row = (result as any[])[0] || {};
    const wonCount = Number(row.won_count) || 0;
    const lostCount = Number(row.lost_count) || 0;
    const wonRate = (wonCount + lostCount) > 0 
      ? (wonCount / (wonCount + lostCount)) * 100 
      : 0;
    
    return {
      totalCount: Number(row.total_count) || 0,
      wonCount,
      lostCount,
      pendingCount: Number(row.pending_count) || 0,
      totalEstimatedAmount: Number(row.total_estimated) || 0,
      totalContractAmount: Number(row.total_contract) || 0,
      wonRate: Math.round(wonRate * 100) / 100,
    };
  }
  
  /**
   * 获取使用统计
   */
  private async getUsageStats(solutionId: number) {
    const result = await db.execute(sql`
      SELECT 
        user_id,
        COUNT(*) as usage_count
      FROM bus_solution_usage_record
      WHERE solution_id = ${solutionId}
      GROUP BY user_id
      ORDER BY usage_count DESC
      LIMIT 10
    `);
    
    const userStats = result as any[];
    const uniqueUserCount = userStats.length;
    const userIds = userStats.map(r => r.user_id);
    
    // 获取用户名称
    let topUsers: Array<{ userId: number; name: string; count: number }> = [];
    if (userIds.length > 0) {
      const userList = await db.select({
        id: users.id,
        realName: users.realName,
      })
        .from(users)
        .where(inArray(users.id, userIds));
      
      const userMap = new Map(userList.map(u => [u.id, u.realName]));
      topUsers = userStats.map(r => ({
        userId: r.user_id,
        name: userMap.get(r.user_id) || '未知',
        count: Number(r.usage_count),
      }));
    }
    
    // 获取模板使用次数
    const templateResult = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM bus_solution_usage_record
      WHERE solution_id = ${solutionId} AND usage_type = 'implementation'
    `);
    const templateUsageCount = Number((templateResult as any[])[0]?.count) || 0;
    
    return {
      uniqueUserCount,
      topUsers,
      templateUsageCount,
    };
  }
  
  /**
   * 获取区域统计
   */
  private async getRegionStats(solutionId: number) {
    const result = await db.execute(sql`
      SELECT 
        p.region,
        COUNT(*) as project_count,
        COUNT(CASE WHEN p.bid_result = 'won' THEN 1 END) as won_count,
        COUNT(CASE WHEN p.bid_result IN ('won', 'lost') THEN 1 END) as result_count
      FROM bus_solution_project sp
      LEFT JOIN bus_project p ON sp.project_id = p.id
      WHERE sp.solution_id = ${solutionId} AND sp.deleted_at IS NULL AND p.region IS NOT NULL
      GROUP BY p.region
      ORDER BY project_count DESC
      LIMIT 10
    `);
    
    const regionData = result as any[];
    const allRegions: Record<string, number> = {};
    const topRegions = regionData.map(r => {
      const region = r.region;
      const count = Number(r.project_count);
      const wonCount = Number(r.won_count);
      const resultCount = Number(r.result_count);
      allRegions[region] = count;
      
      return {
        region,
        count,
        wonRate: resultCount > 0 ? Math.round((wonCount / resultCount) * 10000) / 100 : 0,
      };
    });
    
    return { topRegions, allRegions };
  }
  
  /**
   * 获取评审统计
   */
  private async getReviewStats(solutionId: number) {
    const result = await db.execute(sql`
      SELECT 
        COUNT(*) as total_count,
        COUNT(CASE WHEN review_status = 'approved' THEN 1 END) as approved_count,
        COUNT(CASE WHEN review_status = 'rejected' THEN 1 END) as rejected_count,
        AVG(review_score) as avg_score
      FROM bus_solution_review
      WHERE solution_id = ${solutionId} AND deleted_at IS NULL
    `);
    
    const row = (result as any[])[0] || {};
    
    return {
      totalCount: Number(row.total_count) || 0,
      approvedCount: Number(row.approved_count) || 0,
      rejectedCount: Number(row.rejected_count) || 0,
      avgScore: Math.round((Number(row.avg_score) || 0) * 100) / 100,
    };
  }
  
  /**
   * 获取最近关联项目
   */
  private async getRecentProjects(solutionId: number) {
    const result = await db.execute(sql`
      SELECT 
        p.id as project_id,
        p.project_name,
        p.project_stage as status,
        p.bid_result,
        p.estimated_amount
      FROM bus_solution_project sp
      LEFT JOIN bus_project p ON sp.project_id = p.id
      WHERE sp.solution_id = ${solutionId} AND sp.deleted_at IS NULL
      ORDER BY sp.created_at DESC
      LIMIT 5
    `);
    
    return (result as any[]).map(r => ({
      projectId: r.project_id,
      projectName: r.project_name || '',
      status: r.status || '',
      bidResult: r.bid_result,
      estimatedAmount: r.estimated_amount,
    }));
  }
  
  /**
   * 获取热门方案排行（实时计算）
   */
  async getHotSolutions(limit: number = 10) {
    const result = await db.execute(sql`
      SELECT 
        s.id as solution_id,
        s.solution_name,
        s.solution_code,
        COUNT(DISTINCT sp.project_id) as project_count,
        COUNT(CASE WHEN p.bid_result = 'won' THEN 1 END) as won_count,
        s.view_count,
        s.download_count
      FROM bus_solution s
      LEFT JOIN bus_solution_project sp ON s.id = sp.solution_id AND sp.deleted_at IS NULL
      LEFT JOIN bus_project p ON sp.project_id = p.id
      WHERE s.deleted_at IS NULL
      GROUP BY s.id, s.solution_name, s.solution_code, s.view_count, s.download_count
      ORDER BY project_count DESC, s.view_count DESC
      LIMIT ${limit}
    `);
    
    return (result as any[]).map(r => ({
      solutionId: r.solution_id,
      solutionName: r.solution_name,
      solutionCode: r.solution_code,
      projectCount: Number(r.project_count) || 0,
      wonProjectCount: Number(r.won_count) || 0,
      viewCount: Number(r.view_count) || 0,
      downloadCount: Number(r.download_count) || 0,
    }));
  }
  
  /**
   * 刷新并保存统计（用于缓存场景，可选）
   */
  async refreshStats(solutionId: number) {
    const summary = await this.getStatsSummary(solutionId);
    
    // 检查是否已有统计记录
    const existing = await db.execute(sql`
      SELECT id FROM bus_solution_stats_summary WHERE solution_id = ${solutionId}
    `);
    
    const statsData = {
      project_count: summary.projectStats.totalCount,
      won_project_count: summary.projectStats.wonCount,
      lost_project_count: summary.projectStats.lostCount,
      total_estimated_amount: summary.projectStats.totalEstimatedAmount.toString(),
      total_contract_amount: summary.projectStats.totalContractAmount.toString(),
      avg_won_rate: summary.projectStats.wonRate.toString(),
      unique_user_count: summary.usageStats.uniqueUserCount,
      template_usage_count: summary.usageStats.templateUsageCount,
      region_stats: JSON.stringify(summary.regionStats.allRegions),
      top_regions: JSON.stringify(summary.regionStats.topRegions),
      top_users: JSON.stringify(summary.usageStats.topUsers),
    };
    
    if ((existing as any[]).length > 0) {
      await db.execute(sql`
        UPDATE bus_solution_stats_summary 
        SET 
          project_count = ${statsData.project_count},
          won_project_count = ${statsData.won_project_count},
          lost_project_count = ${statsData.lost_project_count},
          total_estimated_amount = ${statsData.total_estimated_amount},
          total_contract_amount = ${statsData.total_contract_amount},
          avg_won_rate = ${statsData.avg_won_rate},
          unique_user_count = ${statsData.unique_user_count},
          template_usage_count = ${statsData.template_usage_count},
          region_stats = ${statsData.region_stats}::jsonb,
          top_regions = ${statsData.top_regions}::jsonb,
          top_users = ${statsData.top_users}::jsonb,
          updated_at = NOW()
        WHERE solution_id = ${solutionId}
      `);
    } else {
      await db.execute(sql`
        INSERT INTO bus_solution_stats_summary (
          solution_id, project_count, won_project_count, lost_project_count,
          total_estimated_amount, total_contract_amount, avg_won_rate,
          unique_user_count, template_usage_count, region_stats, top_regions, top_users
        ) VALUES (
          ${solutionId}, ${statsData.project_count}, ${statsData.won_project_count}, ${statsData.lost_project_count},
          ${statsData.total_estimated_amount}, ${statsData.total_contract_amount}, ${statsData.avg_won_rate},
          ${statsData.unique_user_count}, ${statsData.template_usage_count},
          ${statsData.region_stats}::jsonb, ${statsData.top_regions}::jsonb, ${statsData.top_users}::jsonb
        )
      `);
    }
    
    return summary;
  }
}

// 导出单例
export const solutionStatisticsService = new SolutionStatisticsService();
