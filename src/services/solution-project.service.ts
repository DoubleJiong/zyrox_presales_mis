/**
 * 方案-项目关联服务
 * 
 * 功能：
 * - 方案与项目的关联管理
 * - 子方案关联
 * - 贡献确认
 * - 价值追踪
 */

import { db } from '@/db';
import { 
  solutions, 
  solutionProjects, 
  solutionSubSchemes,
  solutionVersions,
  projects,
  users
} from '@/db/schema';
import { eq, desc, and, isNull, inArray, sql } from 'drizzle-orm';

// 类型定义
export interface CreateSolutionProjectParams {
  solutionId: number;
  projectId: number;
  subSchemeId?: number;
  versionId?: number;
  usageType: 'reference' | 'implementation' | 'customization';
  sourceType?: 'library' | 'upload' | 'create';
  stageBound?: 'opportunity' | 'bidding' | 'execution';
  notes?: string;
  userId: number;
}

export interface UpdateContributionParams {
  id: number;
  contributionConfirmed: boolean;
  contributionRatio?: number;
  estimatedValue?: number;
  actualValue?: number;
  winContributionScore?: number;
  feedbackScore?: number;
  feedbackContent?: string;
  userId: number;
}

export class SolutionProjectService {
  
  /**
   * 创建方案-项目关联
   */
  async createAssociation(params: CreateSolutionProjectParams) {
    const { solutionId, projectId, subSchemeId, versionId, usageType, sourceType, stageBound, notes, userId } = params;
    
    // 验证方案存在
    const [solution] = await db.select()
      .from(solutions)
      .where(eq(solutions.id, solutionId));
    
    if (!solution) {
      throw new Error('方案不存在');
    }
    
    // 验证项目存在
    const [project] = await db.select()
      .from(projects)
      .where(eq(projects.id, projectId));
    
    if (!project) {
      throw new Error('项目不存在');
    }
    
    // 检查是否已存在活动关联
    const [existing] = await db.select()
      .from(solutionProjects)
      .where(and(
        eq(solutionProjects.solutionId, solutionId),
        eq(solutionProjects.projectId, projectId),
        isNull(solutionProjects.deletedAt)
      ));
    
    if (existing) {
      // 更新使用次数
      return await db.update(solutionProjects)
        .set({
          usageCount: (existing.usageCount || 0) + 1,
          lastUsedAt: new Date(),
          usedByUserId: userId,
          updatedAt: new Date(),
        })
        .where(eq(solutionProjects.id, existing.id))
        .returning();
    }

    const [softDeletedExisting] = await db.select()
      .from(solutionProjects)
      .where(and(
        eq(solutionProjects.solutionId, solutionId),
        eq(solutionProjects.projectId, projectId)
      ))
      .orderBy(desc(solutionProjects.id));
    
    // 获取方案快照
    const snapshot = await this.generateSolutionSnapshot(solutionId, versionId);

    if (softDeletedExisting?.deletedAt) {
      const [revivedAssociation] = await db.update(solutionProjects)
        .set({
          deletedAt: null,
          subSchemeId,
          versionId,
          usageType,
          sourceType: sourceType || 'library',
          stageBound,
          notes,
          solutionSnapshot: snapshot,
          usageCount: (softDeletedExisting.usageCount || 0) + 1,
          lastUsedAt: new Date(),
          usedByUserId: userId,
          updatedAt: new Date(),
        })
        .where(eq(solutionProjects.id, softDeletedExisting.id))
        .returning();

      await this.updateSolutionProjectStats(solutionId);

      return revivedAssociation;
    }
    
    // 创建新关联
    const [association] = await db.insert(solutionProjects).values({
      solutionId,
      projectId,
      associationType: 'default',
      subSchemeId,
      versionId,
      usageType,
      sourceType: sourceType || 'library',
      stageBound,
      notes,
      solutionSnapshot: snapshot,
      usageCount: 1,
      lastUsedAt: new Date(),
      usedByUserId: userId,
      createdBy: userId,
    }).returning();
    
    // 更新方案统计
    await this.updateSolutionProjectStats(solutionId);
    
    return association;
  }
  
  /**
   * 获取方案的关联项目列表
   */
  async getSolutionProjects(solutionId: number, options: { usageType?: string } = {}) {
    const conditions = [
      eq(solutionProjects.solutionId, solutionId),
      isNull(solutionProjects.deletedAt)
    ];
    
    if (options.usageType) {
      conditions.push(eq(solutionProjects.usageType, options.usageType));
    }
    
    const associations = await db.select({
      id: solutionProjects.id,
      solutionId: solutionProjects.solutionId,
      projectId: solutionProjects.projectId,
      subSchemeId: solutionProjects.subSchemeId,
      versionId: solutionProjects.versionId,
      usageType: solutionProjects.usageType,
      usageCount: solutionProjects.usageCount,
      lastUsedAt: solutionProjects.lastUsedAt,
      contributionConfirmed: solutionProjects.contributionConfirmed,
      contributionRatio: solutionProjects.contributionRatio,
      estimatedValue: solutionProjects.estimatedValue,
      actualValue: solutionProjects.actualValue,
      winContributionScore: solutionProjects.winContributionScore,
      feedbackScore: solutionProjects.feedbackScore,
      createdAt: solutionProjects.createdAt,
      // 项目信息
      projectName: projects.projectName,
      projectCode: projects.projectCode,
      projectStage: projects.projectStage,
      bidResult: projects.bidResult,
      estimatedAmount: projects.estimatedAmount,
      actualAmount: projects.actualAmount,
      region: projects.region,
    })
      .from(solutionProjects)
      .leftJoin(projects, eq(solutionProjects.projectId, projects.id))
      .where(and(...conditions))
      .orderBy(desc(solutionProjects.createdAt));
    
    return associations;
  }
  
  /**
   * 获取项目的关联方案列表
   */
  async getProjectSolutions(projectId: number) {
    const associations = await db.select({
      id: solutionProjects.id,
      solutionId: solutionProjects.solutionId,
      subSchemeId: solutionProjects.subSchemeId,
      versionId: solutionProjects.versionId,
      usageType: solutionProjects.usageType,
      usageCount: solutionProjects.usageCount,
      lastUsedAt: solutionProjects.lastUsedAt,
      notes: solutionProjects.notes,
      contributionConfirmed: solutionProjects.contributionConfirmed,
      contributionRatio: solutionProjects.contributionRatio,
      estimatedValue: solutionProjects.estimatedValue,
      actualValue: solutionProjects.actualValue,
      winContributionScore: solutionProjects.winContributionScore,
      feedbackScore: solutionProjects.feedbackScore,
      feedbackContent: solutionProjects.feedbackContent,
      createdAt: solutionProjects.createdAt,
      // 方案信息
      solutionName: solutions.solutionName,
      solutionCode: solutions.solutionCode,
      solutionVersion: solutions.version,
      isTemplate: solutions.isTemplate,
      industry: solutions.industry,
      scenario: solutions.scenario,
      // 子方案信息
      subSchemeName: solutionSubSchemes.subSchemeName,
      subSchemeType: solutionSubSchemes.subSchemeType,
    })
      .from(solutionProjects)
      .leftJoin(solutions, eq(solutionProjects.solutionId, solutions.id))
      .leftJoin(solutionSubSchemes, eq(solutionProjects.subSchemeId, solutionSubSchemes.id))
      .where(and(
        eq(solutionProjects.projectId, projectId),
        isNull(solutionProjects.deletedAt)
      ))
      .orderBy(desc(solutionProjects.createdAt));
    
    return associations;
  }
  
  /**
   * 更新贡献确认
   */
  async updateContribution(params: UpdateContributionParams) {
    const { id, contributionConfirmed, contributionRatio, estimatedValue, actualValue, winContributionScore, feedbackScore, feedbackContent, userId } = params;
    
    const [association] = await db.select()
      .from(solutionProjects)
      .where(eq(solutionProjects.id, id));
    
    if (!association) {
      throw new Error('关联记录不存在');
    }
    
    const [updated] = await db.update(solutionProjects)
      .set({
        contributionConfirmed,
        contributionRatio: contributionRatio ? contributionRatio.toString() : association.contributionRatio,
        estimatedValue: estimatedValue ? estimatedValue.toString() : association.estimatedValue,
        actualValue: actualValue ? actualValue.toString() : association.actualValue,
        winContributionScore: winContributionScore ? winContributionScore.toString() : association.winContributionScore,
        feedbackScore: feedbackScore ? feedbackScore.toString() : association.feedbackScore,
        feedbackContent,
        confirmedAt: contributionConfirmed ? new Date() : null,
        confirmedBy: contributionConfirmed ? userId : null,
        updatedAt: new Date(),
      })
      .where(eq(solutionProjects.id, id))
      .returning();
    
    return updated;
  }
  
  /**
   * 删除关联
   */
  async deleteAssociation(id: number) {
    const [association] = await db.select()
      .from(solutionProjects)
      .where(eq(solutionProjects.id, id));
    
    if (!association) {
      throw new Error('关联记录不存在');
    }
    
    // 软删除
    await db.update(solutionProjects)
      .set({ deletedAt: new Date() })
      .where(eq(solutionProjects.id, id));
    
    // 更新方案统计
    await this.updateSolutionProjectStats(association.solutionId);
    
    return { success: true };
  }
  
  /**
   * 获取方案统计摘要
   */
  async getSolutionStatsSummary(solutionId: number) {
    const associations = await this.getSolutionProjects(solutionId);
    
    const totalCount = associations.length;
    const wonCount = associations.filter(a => a.bidResult === 'won').length;
    const lostCount = associations.filter(a => a.bidResult === 'lost').length;
    const pendingCount = associations.filter(a => !a.bidResult || a.bidResult === 'pending').length;
    
    const totalEstimatedAmount = associations
      .filter(a => a.estimatedAmount)
      .reduce((sum, a) => sum + parseFloat(a.estimatedAmount || '0'), 0);
    
    const totalContractAmount = associations
      .filter(a => a.bidResult === 'won' && a.actualAmount)
      .reduce((sum, a) => sum + parseFloat(a.actualAmount || '0'), 0);
    
    const wonRate = totalCount > 0 ? (wonCount / (wonCount + lostCount)) * 100 : 0;
    
    // 区域统计
    const regionStats: Record<string, number> = {};
    for (const a of associations) {
      if (a.region) {
        regionStats[a.region] = (regionStats[a.region] || 0) + 1;
      }
    }
    
    const topRegions = Object.entries(regionStats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([region, count]) => ({ region, count }));
    
    return {
      projectStats: {
        totalCount,
        wonCount,
        lostCount,
        pendingCount,
        totalEstimatedAmount,
        totalContractAmount,
        wonRate: Math.round(wonRate * 100) / 100,
      },
      regionStats: {
        topRegions,
        allRegions: regionStats,
      },
      recentProjects: associations.slice(0, 5),
    };
  }
  
  /**
   * 生成方案快照
   */
  private async generateSolutionSnapshot(solutionId: number, versionId?: number) {
    const [solution] = await db.select()
      .from(solutions)
      .where(eq(solutions.id, solutionId));
    
    if (!solution) {
      return null;
    }
    
    return {
      solutionCode: solution.solutionCode,
      solutionName: solution.solutionName,
      version: solution.version || '1.0',
      description: solution.description,
      coreFeatures: solution.coreFeatures,
      technicalArchitecture: solution.technicalArchitecture,
      components: solution.components,
      industry: solution.industry,
      scenario: solution.scenario,
      estimatedCost: solution.estimatedCost,
      estimatedDuration: solution.estimatedDuration,
      tags: solution.tags,
      attachments: solution.attachments,
    };
  }
  
  /**
   * 更新方案的项目统计
   */
  private async updateSolutionProjectStats(solutionId: number) {
    const associations = await this.getSolutionProjects(solutionId);
    
    const projectCount = associations.length;
    const wonProjectCount = associations.filter(a => a.bidResult === 'won').length;
    
    // 更新方案的 projectCount 字段
    await db.update(solutions)
      .set({
        projectCount,
        updatedAt: new Date(),
      })
      .where(eq(solutions.id, solutionId));
  }
}

// 导出单例
export const solutionProjectService = new SolutionProjectService();
