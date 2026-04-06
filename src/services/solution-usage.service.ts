/**
 * 方案使用记录服务
 * 
 * 功能：
 * - 记录方案使用情况
 * - 追踪使用转化
 * - 使用统计
 */

import { db } from '@/db';
import { 
  solutions, 
  solutionUsageRecord,
  solutionSubSchemes,
  projects,
  users
} from '@/db/schema';
import { eq, desc, and, inArray } from 'drizzle-orm';

// 类型定义
export interface CreateUsageRecordParams {
  solutionId: number;
  subSchemeId?: number;
  projectId?: number;
  userId: number;
  usageType: 'reference' | 'implementation' | 'customization' | 'view' | 'download';
  usageContext?: 'project_follow' | 'template_copy' | 'direct_view' | 'search_result';
  region?: string;
  notes?: string;
  versionId?: number;
  usageResult?: 'adopted' | 'modified' | 'abandoned';
  resultProjectId?: number;
  effectivenessScore?: number;
  effectivenessNotes?: string;
}

export class SolutionUsageService {
  
  /**
   * 创建使用记录
   */
  async createRecord(params: CreateUsageRecordParams) {
    const { 
      solutionId, subSchemeId, projectId, userId, usageType, usageContext, 
      region, notes, versionId, usageResult, resultProjectId, 
      effectivenessScore, effectivenessNotes 
    } = params;
    
    // 验证方案存在
    const [solution] = await db.select()
      .from(solutions)
      .where(eq(solutions.id, solutionId));
    
    if (!solution) {
      throw new Error('方案不存在');
    }
    
    const [record] = await db.insert(solutionUsageRecord).values({
      solutionId,
      subSchemeId,
      projectId,
      userId,
      usageType,
      usageContext,
      region,
      notes,
      versionId,
      usageResult,
      resultProjectId,
      effectivenessScore: effectivenessScore ? effectivenessScore.toString() : undefined,
      effectivenessNotes,
    }).returning();
    
    // 更新方案的查看/下载计数
    if (usageType === 'view') {
      await db.update(solutions)
        .set({ 
          viewCount: (solution.viewCount || 0) + 1,
          updatedAt: new Date(),
        })
        .where(eq(solutions.id, solutionId));
    } else if (usageType === 'download') {
      await db.update(solutions)
        .set({ 
          downloadCount: (solution.downloadCount || 0) + 1,
          updatedAt: new Date(),
        })
        .where(eq(solutions.id, solutionId));
    }
    
    return record;
  }
  
  /**
   * 获取方案的使用记录列表
   */
  async getSolutionUsageRecords(
    solutionId: number, 
    options: { usageType?: string; limit?: number } = {}
  ) {
    const { usageType, limit = 50 } = options;
    
    const conditions = [
      eq(solutionUsageRecord.solutionId, solutionId)
    ];
    
    if (usageType) {
      conditions.push(eq(solutionUsageRecord.usageType, usageType));
    }
    
    const records = await db.select({
      id: solutionUsageRecord.id,
      solutionId: solutionUsageRecord.solutionId,
      subSchemeId: solutionUsageRecord.subSchemeId,
      projectId: solutionUsageRecord.projectId,
      userId: solutionUsageRecord.userId,
      usageType: solutionUsageRecord.usageType,
      usageContext: solutionUsageRecord.usageContext,
      region: solutionUsageRecord.region,
      usageResult: solutionUsageRecord.usageResult,
      versionId: solutionUsageRecord.versionId,
      createdAt: solutionUsageRecord.createdAt,
      // 用户信息
      userName: users.realName,
      // 项目信息
      projectName: projects.projectName,
      // 子方案信息
      subSchemeName: solutionSubSchemes.subSchemeName,
    })
      .from(solutionUsageRecord)
      .leftJoin(users, eq(solutionUsageRecord.userId, users.id))
      .leftJoin(projects, eq(solutionUsageRecord.projectId, projects.id))
      .leftJoin(solutionSubSchemes, eq(solutionUsageRecord.subSchemeId, solutionSubSchemes.id))
      .where(and(...conditions))
      .orderBy(desc(solutionUsageRecord.createdAt))
      .limit(limit);
    
    return records;
  }
  
  /**
   * 获取用户的使用记录
   */
  async getUserUsageRecords(userId: number, limit: number = 50) {
    const records = await db.select({
      id: solutionUsageRecord.id,
      solutionId: solutionUsageRecord.solutionId,
      subSchemeId: solutionUsageRecord.subSchemeId,
      projectId: solutionUsageRecord.projectId,
      usageType: solutionUsageRecord.usageType,
      usageContext: solutionUsageRecord.usageContext,
      region: solutionUsageRecord.region,
      usageResult: solutionUsageRecord.usageResult,
      createdAt: solutionUsageRecord.createdAt,
      // 方案信息
      solutionName: solutions.solutionName,
      solutionCode: solutions.solutionCode,
      // 项目信息
      projectName: projects.projectName,
      // 子方案信息
      subSchemeName: solutionSubSchemes.subSchemeName,
    })
      .from(solutionUsageRecord)
      .leftJoin(solutions, eq(solutionUsageRecord.solutionId, solutions.id))
      .leftJoin(projects, eq(solutionUsageRecord.projectId, projects.id))
      .leftJoin(solutionSubSchemes, eq(solutionUsageRecord.subSchemeId, solutionSubSchemes.id))
      .where(eq(solutionUsageRecord.userId, userId))
      .orderBy(desc(solutionUsageRecord.createdAt))
      .limit(limit);
    
    return records;
  }
  
  /**
   * 获取使用统计
   */
  async getUsageStatistics(solutionId: number) {
    const records = await db.select()
      .from(solutionUsageRecord)
      .where(eq(solutionUsageRecord.solutionId, solutionId));
    
    // 统计唯一用户数
    const uniqueUsers = new Set(records.map(r => r.userId)).size;
    
    // 统计各类型使用次数
    const typeStats: Record<string, number> = {};
    for (const r of records) {
      typeStats[r.usageType] = (typeStats[r.usageType] || 0) + 1;
    }
    
    // 统计转化情况
    const adoptions = records.filter(r => r.usageResult === 'adopted').length;
    
    // 统计各结果类型
    const resultStats: Record<string, number> = {};
    for (const r of records) {
      if (r.usageResult) {
        resultStats[r.usageResult] = (resultStats[r.usageResult] || 0) + 1;
      }
    }
    
    // 统计热门用户
    const userUsageCount: Record<number, number> = {};
    for (const r of records) {
      userUsageCount[r.userId] = (userUsageCount[r.userId] || 0) + 1;
    }
    
    // 获取用户名
    const userIds = Object.keys(userUsageCount).map(Number);
    let topUsers: Array<{ userId: number; name: string; count: number }> = [];
    
    if (userIds.length > 0) {
      const userList = await db.select({
        id: users.id,
        realName: users.realName,
      })
        .from(users)
        .where(inArray(users.id, userIds));
      
      topUsers = Object.entries(userUsageCount)
        .map(([userId, cnt]) => {
          const user = userList.find(u => u.id === Number(userId));
          return {
            userId: Number(userId),
            name: user?.realName || '未知',
            count: cnt,
          };
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
    }
    
    return {
      totalRecords: records.length,
      uniqueUserCount: uniqueUsers,
      typeStats,
      adoptions,
      resultStats,
      topUsers,
    };
  }
  
  /**
   * 更新使用结果
   */
  async updateUsageResult(
    recordId: number, 
    result: 'adopted' | 'modified' | 'abandoned', 
    resultProjectId?: number,
    effectivenessScore?: number,
    effectivenessNotes?: string
  ) {
    const updateData: any = {
      usageResult: result,
    };
    
    if (resultProjectId) {
      updateData.resultProjectId = resultProjectId;
    }
    
    if (effectivenessScore !== undefined) {
      updateData.effectivenessScore = effectivenessScore.toString();
    }
    
    if (effectivenessNotes) {
      updateData.effectivenessNotes = effectivenessNotes;
    }
    
    const [updated] = await db.update(solutionUsageRecord)
      .set(updateData)
      .where(eq(solutionUsageRecord.id, recordId))
      .returning();
    
    return updated;
  }
  
  /**
   * 批量记录使用（用于项目关联时）
   */
  async batchCreateRecords(records: CreateUsageRecordParams[]) {
    const results = [];
    for (const record of records) {
      try {
        const result = await this.createRecord(record);
        results.push({ success: true, data: result });
      } catch (error) {
        results.push({ 
          success: false, 
          error: error instanceof Error ? error.message : '记录失败' 
        });
      }
    }
    return results;
  }
}

// 导出单例
export const solutionUsageService = new SolutionUsageService();
