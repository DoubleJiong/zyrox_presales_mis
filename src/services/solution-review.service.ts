/**
 * 解决方案评审服务
 * 
 * 功能：
 * - 评审模板管理
 * - 评审流程管理
 * - 评审打分
 * - 评审结果统计
 */

import { db } from '@/db';
import { 
  solutions, 
  solutionVersions,
  solutionReviews,
  reviewTemplates,
  reviewDetails,
  solutionSubSchemes,
  users
} from '@/db/schema';
import { eq, desc, and, isNull, inArray } from 'drizzle-orm';
import {
  createSolutionReviewApproval,
  submitSolutionReviewApproval,
} from '@/modules/solution/solution-review-approval-adapter';

// 类型定义
export interface CreateReviewParams {
  solutionId: number;
  subSchemeId?: number;
  versionId?: number;
  reviewerId: number;
  reviewType: string;
  reviewComment?: string;
  reviewScore?: number;
  dueDate?: Date;
}

export interface SubmitReviewParams {
  reviewId: number;
  operatorId: number;
  reviewStatus: 'approved' | 'rejected' | 'revision_required';
  reviewComment?: string;
  reviewScore?: number;
  reviewCriteria?: Array<{
    criterion: string;
    score: number;
    comment?: string;
  }>;
}

export class SolutionReviewService {
  
  /**
   * 获取评审模板列表
   */
  async getTemplates(templateType?: string) {
    const conditions = [eq(reviewTemplates.isActive, true)];
    
    if (templateType) {
      conditions.push(eq(reviewTemplates.templateType, templateType));
    }
    
    const templates = await db.select()
      .from(reviewTemplates)
      .where(and(...conditions))
      .orderBy(reviewTemplates.templateType, reviewTemplates.templateName);
    
    return templates;
  }
  
  /**
   * 获取评审模板详情
   */
  async getTemplateDetail(templateId: number) {
    const [template] = await db.select()
      .from(reviewTemplates)
      .where(eq(reviewTemplates.id, templateId));
    
    return template || null;
  }
  
  /**
   * 创建评审记录
   */
  async createReview(params: CreateReviewParams) {
    return createSolutionReviewApproval(params);
  }
  
  /**
   * 获取评审列表
   */
  async getReviewList(
    solutionId?: number,
    options: { reviewStatus?: string; reviewerId?: number } = {}
  ) {
    const conditions = [isNull(solutionReviews.deletedAt)];
    
    if (solutionId) {
      conditions.push(eq(solutionReviews.solutionId, solutionId));
    }
    
    if (options.reviewStatus) {
      conditions.push(eq(solutionReviews.reviewStatus, options.reviewStatus));
    }
    
    const reviews = await db.select({
      id: solutionReviews.id,
      solutionId: solutionReviews.solutionId,
      solutionName: solutions.solutionName,
      subSchemeId: solutionReviews.subSchemeId,
      versionId: solutionReviews.versionId,
      reviewerId: solutionReviews.reviewerId,
      reviewType: solutionReviews.reviewType,
      reviewStatus: solutionReviews.reviewStatus,
      reviewScore: solutionReviews.reviewScore,
      reviewComment: solutionReviews.reviewComment,
      reviewRound: solutionReviews.reviewRound,
      dueDate: solutionReviews.dueDate,
      reviewedAt: solutionReviews.reviewedAt,
      createdAt: solutionReviews.createdAt,
      reviewerName: users.realName,
    })
      .from(solutionReviews)
      .leftJoin(solutions, eq(solutionReviews.solutionId, solutions.id))
      .leftJoin(users, eq(solutionReviews.reviewerId, users.id))
      .where(and(...conditions))
      .orderBy(desc(solutionReviews.createdAt));
    
    // 如果指定了评审人，过滤
    if (options.reviewerId) {
      return reviews.filter(r => r.reviewerId === options.reviewerId);
    }
    
    return reviews;
  }
  
  /**
   * 获取评审详情
   */
  async getReviewDetail(reviewId: number) {
    const [review] = await db.select()
      .from(solutionReviews)
      .where(eq(solutionReviews.id, reviewId));
    
    if (!review) {
      return null;
    }
    
    // 获取方案信息
    const [solution] = await db.select()
      .from(solutions)
      .where(eq(solutions.id, review.solutionId));
    
    // 获取评审人信息
    const [reviewer] = await db.select({
      id: users.id,
      name: users.realName,
    })
      .from(users)
      .where(eq(users.id, review.reviewerId));
    
    // 获取子方案信息（如果有）
    let subScheme = null;
    if (review.subSchemeId) {
      [subScheme] = await db.select()
        .from(solutionSubSchemes)
        .where(eq(solutionSubSchemes.id, review.subSchemeId));
    }
    
    // 获取评审详情（维度评分）
    const details = await db.select()
      .from(reviewDetails)
      .where(eq(reviewDetails.reviewId, reviewId));
    
    return {
      ...review,
      solution,
      reviewer,
      subScheme,
      details,
    };
  }
  
  /**
   * 提交评审结果
   */
  async submitReview(params: SubmitReviewParams) {
    return submitSolutionReviewApproval(params);
  }
  
  /**
   * 获取待评审列表（评审人视角）
   */
  async getPendingReviewsForReviewer(reviewerId: number) {
    const reviews = await db.select({
      id: solutionReviews.id,
      solutionId: solutionReviews.solutionId,
      solutionName: solutions.solutionName,
      reviewType: solutionReviews.reviewType,
      reviewRound: solutionReviews.reviewRound,
      dueDate: solutionReviews.dueDate,
      createdAt: solutionReviews.createdAt,
    })
      .from(solutionReviews)
      .leftJoin(solutions, eq(solutionReviews.solutionId, solutions.id))
      .where(and(
        eq(solutionReviews.reviewerId, reviewerId),
        eq(solutionReviews.reviewStatus, 'pending'),
        isNull(solutionReviews.deletedAt)
      ))
      .orderBy(solutionReviews.dueDate);
    
    return reviews;
  }
  
  /**
   * 获取评审统计
   */
  async getReviewStatistics(solutionId: number) {
    const reviews = await db.select()
      .from(solutionReviews)
      .where(and(
        eq(solutionReviews.solutionId, solutionId),
        isNull(solutionReviews.deletedAt)
      ));
    
    const total = reviews.length;
    const approved = reviews.filter(r => r.reviewStatus === 'approved').length;
    const rejected = reviews.filter(r => r.reviewStatus === 'rejected').length;
    const pending = reviews.filter(r => r.reviewStatus === 'pending').length;
    
    const scores = reviews
      .filter(r => r.reviewScore !== null)
      .map(r => r.reviewScore as number);
    
    const avgScore = scores.length > 0 
      ? scores.reduce((sum, s) => sum + s, 0) / scores.length 
      : 0;
    
    return {
      total,
      approved,
      rejected,
      pending,
      avgScore: Math.round(avgScore * 100) / 100,
    };
  }
}

// 导出单例
export const solutionReviewService = new SolutionReviewService();
