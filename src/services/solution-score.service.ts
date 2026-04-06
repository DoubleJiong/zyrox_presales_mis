/**
 * 解决方案评价体系服务
 * 
 * 功能：
 * - 四维评分计算（质量分、商业价值分、用户认可分、活跃度分）
 * - 评分历史追踪
 * - 排行榜计算
 * - 实时计算，无需定时任务
 */

import { db } from '@/db';
import { 
  solutions, 
  solutionScores,
  solutionScoreHistory,
  solutionReviews
} from '@/db/schema';
import { eq, desc, and, sql, isNull } from 'drizzle-orm';

// 类型定义
export interface ScoreDimension {
  qualityScore: string;      // 质量分 (30%)
  businessValueScore: string; // 商业价值分 (35%)
  userRecognitionScore: string; // 用户认可分 (20%)
  activityScore: string;     // 活跃度分 (15%)
  totalScore: string;
}

// 默认权重配置
const DEFAULT_WEIGHTS = {
  quality: 0.3,
  businessValue: 0.35,
  userRecognition: 0.2,
  activity: 0.15,
};

export class SolutionScoreService {
  
  /**
   * 计算方案总分（实时计算）
   */
  async calculateScore(solutionId: number): Promise<ScoreDimension> {
    // 获取方案基本信息
    const [solution] = await db.select()
      .from(solutions)
      .where(eq(solutions.id, solutionId));
    
    if (!solution) {
      throw new Error('方案不存在');
    }
    
    // 并行计算各维度分数
    const [qualityScore, businessValueScore, userRecognitionScore, activityScore] = await Promise.all([
      this.calculateQualityScore(solutionId, solution),
      this.calculateBusinessValueScore(solutionId),
      this.calculateUserRecognitionScore(solution),
      this.calculateActivityScore(solution),
    ]);
    
    // 计算加权总分
    const totalScore = 
      qualityScore * DEFAULT_WEIGHTS.quality +
      businessValueScore * DEFAULT_WEIGHTS.businessValue +
      userRecognitionScore * DEFAULT_WEIGHTS.userRecognition +
      activityScore * DEFAULT_WEIGHTS.activity;
    
    return {
      qualityScore: qualityScore.toFixed(2),
      businessValueScore: businessValueScore.toFixed(2),
      userRecognitionScore: userRecognitionScore.toFixed(2),
      activityScore: activityScore.toFixed(2),
      totalScore: totalScore.toFixed(2),
    };
  }
  
  /**
   * 计算质量分（基于评审结果）
   */
  private async calculateQualityScore(solutionId: number, solution: any): Promise<number> {
    const result = await db.execute(sql`
      SELECT 
        COUNT(*) as review_count,
        AVG(review_score) as avg_score,
        COUNT(CASE WHEN review_status = 'approved' THEN 1 END) as approved_count
      FROM bus_solution_review
      WHERE solution_id = ${solutionId} AND deleted_at IS NULL
    `);
    
    const row = (result as any[])[0] || {};
    const reviewCount = Number(row.review_count) || 0;
    const avgScore = Number(row.avg_score) || 0;
    const approvedCount = Number(row.approved_count) || 0;
    
    // 基础分（满分60分）
    let score = 30;
    
    // 评审通过加分（最多20分）
    if (reviewCount > 0) {
      score += Math.min(20, (approvedCount / reviewCount) * 20);
    }
    
    // 平均评分加分（最多20分）
    if (avgScore > 0) {
      score += (avgScore / 10) * 20;
    }
    
    return Math.min(100, score);
  }
  
  /**
   * 计算商业价值分（基于项目中标情况）
   */
  private async calculateBusinessValueScore(solutionId: number): Promise<number> {
    const result = await db.execute(sql`
      SELECT 
        COUNT(DISTINCT sp.project_id) as project_count,
        COUNT(CASE WHEN p.bid_result = 'won' THEN 1 END) as won_count,
        COALESCE(SUM(CASE WHEN p.bid_result = 'won' THEN CAST(p.actual_amount AS DECIMAL) ELSE 0 END), 0) as total_amount
      FROM bus_solution_project sp
      LEFT JOIN bus_project p ON sp.project_id = p.id
      WHERE sp.solution_id = ${solutionId} AND sp.deleted_at IS NULL
    `);
    
    const row = (result as any[])[0] || {};
    const projectCount = Number(row.project_count) || 0;
    const wonCount = Number(row.won_count) || 0;
    const totalAmount = Number(row.total_amount) || 0;
    
    // 基础分（满分100分）
    let score = 20;
    
    // 项目数量加分（最多30分）
    score += Math.min(30, projectCount * 5);
    
    // 中标率加分（最多30分）
    if (projectCount > 0) {
      const wonRate = wonCount / projectCount;
      score += wonRate * 30;
    }
    
    // 金额加分（最多20分）
    if (totalAmount >= 1000000) {
      score += 20;
    } else if (totalAmount >= 500000) {
      score += 15;
    } else if (totalAmount >= 100000) {
      score += 10;
    } else if (totalAmount > 0) {
      score += 5;
    }
    
    return Math.min(100, score);
  }
  
  /**
   * 计算用户认可分（基于点赞、评分、下载）
   */
  private calculateUserRecognitionScore(solution: any): number {
    const viewCount = solution.viewCount || 0;
    const downloadCount = solution.downloadCount || 0;
    const likeCount = solution.likeCount || 0;
    const rating = parseFloat(solution.rating) || 0;
    const ratingCount = solution.ratingCount || 0;
    
    // 基础分
    let score = 20;
    
    // 浏览量加分（最多20分）
    if (viewCount >= 1000) {
      score += 20;
    } else if (viewCount >= 500) {
      score += 15;
    } else if (viewCount >= 100) {
      score += 10;
    } else if (viewCount >= 50) {
      score += 5;
    }
    
    // 下载量加分（最多25分）
    if (downloadCount >= 100) {
      score += 25;
    } else if (downloadCount >= 50) {
      score += 20;
    } else if (downloadCount >= 20) {
      score += 15;
    } else if (downloadCount >= 10) {
      score += 10;
    } else if (downloadCount > 0) {
      score += 5;
    }
    
    // 评分加分（最多20分）
    if (rating > 0 && ratingCount >= 3) {
      score += (rating / 5) * 20;
    } else if (rating > 0) {
      score += (rating / 5) * 10;
    }
    
    // 点赞加分（最多15分）
    if (likeCount >= 50) {
      score += 15;
    } else if (likeCount >= 20) {
      score += 10;
    } else if (likeCount >= 10) {
      score += 5;
    }
    
    return Math.min(100, score);
  }
  
  /**
   * 计算活跃度分（基于最近更新时间）
   */
  private calculateActivityScore(solution: any): number {
    const updatedAt = solution.updatedAt ? new Date(solution.updatedAt) : null;
    const createdAt = solution.createdAt ? new Date(solution.createdAt) : null;
    
    // 基础分
    let score = 30;
    
    if (updatedAt) {
      const daysSinceUpdate = Math.floor((Date.now() - updatedAt.getTime()) / (1000 * 60 * 60 * 24));
      
      // 最近更新加分
      if (daysSinceUpdate <= 7) {
        score += 40;
      } else if (daysSinceUpdate <= 30) {
        score += 30;
      } else if (daysSinceUpdate <= 90) {
        score += 20;
      } else if (daysSinceUpdate <= 180) {
        score += 10;
      }
    } else if (createdAt) {
      const daysSinceCreate = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysSinceCreate <= 30) {
        score += 30;
      } else if (daysSinceCreate <= 90) {
        score += 20;
      }
    }
    
    // 模板使用次数加分（最多30分）
    const templateUsageCount = solution.templateUsageCount || 0;
    if (templateUsageCount >= 10) {
      score += 30;
    } else if (templateUsageCount >= 5) {
      score += 20;
    } else if (templateUsageCount >= 2) {
      score += 10;
    } else if (templateUsageCount > 0) {
      score += 5;
    }
    
    return Math.min(100, score);
  }
  
  /**
   * 获取或计算方案评分
   */
  async getScoreDetail(solutionId: number) {
    // 先尝试获取已有评分
    const [existing] = await db.select()
      .from(solutionScores)
      .where(eq(solutionScores.solutionId, solutionId));
    
    // 如果有评分且在24小时内计算过，直接返回
    if (existing && existing.calculatedAt) {
      const hoursSinceCalc = (Date.now() - new Date(existing.calculatedAt).getTime()) / (1000 * 60 * 60);
      if (hoursSinceCalc < 24) {
        return existing;
      }
    }
    
    // 否则重新计算
    return this.updateScore(solutionId);
  }
  
  /**
   * 更新方案评分
   */
  async updateScore(solutionId: number): Promise<ScoreDimension> {
    const scores = await this.calculateScore(solutionId);
    
    // 保存历史记录
    await db.execute(sql`
      INSERT INTO bus_solution_score_history (
        solution_id, snapshot_date, snapshot_type,
        quality_score, business_value_score, user_recognition_score, activity_score, total_score
      ) VALUES (
        ${solutionId}, CURRENT_DATE, 'manual',
        ${scores.qualityScore}, ${scores.businessValueScore}, 
        ${scores.userRecognitionScore}, ${scores.activityScore}, ${scores.totalScore}
      )
    `);
    
    // 更新或插入当前评分
    const existing = await db.execute(sql`
      SELECT id FROM bus_solution_score WHERE solution_id = ${solutionId}
    `);
    
    if ((existing as any[]).length > 0) {
      await db.execute(sql`
        UPDATE bus_solution_score 
        SET 
          quality_score = ${scores.qualityScore},
          business_value_score = ${scores.businessValueScore},
          user_recognition_score = ${scores.userRecognitionScore},
          activity_score = ${scores.activityScore},
          total_score = ${scores.totalScore},
          calculated_at = NOW()
        WHERE solution_id = ${solutionId}
      `);
    } else {
      await db.execute(sql`
        INSERT INTO bus_solution_score (
          solution_id, quality_score, business_value_score, 
          user_recognition_score, activity_score, total_score, calculated_at
        ) VALUES (
          ${solutionId}, ${scores.qualityScore}, ${scores.businessValueScore},
          ${scores.userRecognitionScore}, ${scores.activityScore}, ${scores.totalScore}, NOW()
        )
      `);
    }
    
    return scores;
  }
  
  /**
   * 获取评分历史
   */
  async getScoreHistory(solutionId: number, limit: number = 30) {
    const result = await db.execute(sql`
      SELECT *
      FROM bus_solution_score_history
      WHERE solution_id = ${solutionId}
      ORDER BY snapshot_date DESC
      LIMIT ${limit}
    `);
    
    return result;
  }
  
  /**
   * 获取排行榜（实时计算）
   */
  async getLeaderboard(limit: number = 20) {
    const result = await db.execute(sql`
      SELECT 
        ss.solution_id,
        ss.total_score,
        ss.quality_score,
        ss.business_value_score,
        ss.user_recognition_score,
        ss.activity_score,
        s.solution_name,
        s.solution_code,
        s.view_count,
        s.download_count
      FROM bus_solution_score ss
      JOIN bus_solution s ON ss.solution_id = s.id
      WHERE s.deleted_at IS NULL
      ORDER BY ss.total_score DESC
      LIMIT ${limit}
    `);
    
    return (result as any[]).map((row, index) => ({
      rank: index + 1,
      solutionId: row.solution_id,
      solutionName: row.solution_name,
      solutionCode: row.solution_code,
      totalScore: row.total_score,
      qualityScore: row.quality_score,
      businessValueScore: row.business_value_score,
      userRecognitionScore: row.user_recognition_score,
      activityScore: row.activity_score,
      viewCount: row.view_count,
      downloadCount: row.download_count,
    }));
  }
}

// 导出单例
export const solutionScoreService = new SolutionScoreService();
