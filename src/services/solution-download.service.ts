/**
 * 解决方案下载记录服务
 * 
 * 功能：
 * - 记录文件下载日志
 * - 查询下载历史
 * - 统计下载数据
 */

import { db } from '@/db';
import { solutionStatistics, solutions, users, solutionFiles } from '@/db/schema';
import { eq, and, desc, sql, gte, lte, between } from 'drizzle-orm';

// 下载记录类型
export interface DownloadRecord {
  id: number;
  solutionId: number;
  solutionName: string;
  fileId: number | null;
  fileName: string | null;
  userId: number | null;
  userName: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  extraData: Record<string, any> | null;
  createdAt: Date;
}

// 创建下载记录参数
export interface CreateDownloadRecordParams {
  solutionId: number;
  subSchemeId?: number;
  fileId?: number;
  fileName?: string;
  userId?: number;
  ipAddress?: string;
  userAgent?: string;
  extraData?: Record<string, any>;
}

// 查询下载记录参数
export interface GetDownloadRecordsParams {
  solutionId?: number;
  userId?: number;
  fileId?: number;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  pageSize?: number;
}

// 下载统计
export interface DownloadStatistics {
  totalDownloads: number;
  uniqueDownloaders: number;
  todayDownloads: number;
  weekDownloads: number;
  monthDownloads: number;
  topDownloaders: Array<{
    userId: number | null;
    userName: string;
    downloadCount: number;
  }>;
  recentDownloads: DownloadRecord[];
}

class SolutionDownloadService {
  
  /**
   * 记录下载操作
   */
  async recordDownload(params: CreateDownloadRecordParams): Promise<number> {
    const { solutionId, subSchemeId, fileId, fileName, userId, ipAddress, userAgent, extraData } = params;
    
    // 插入下载记录
    const [record] = await db.insert(solutionStatistics).values({
      solutionId,
      subSchemeId: subSchemeId || null,
      userId: userId || null,
      actionType: 'download',
      resourceId: fileId || null,
      resourceName: fileName || null,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
      extraData: extraData || null,
    }).returning();
    
    // 更新方案下载计数
    await this.updateDownloadCount(solutionId);
    
    return record.id;
  }
  
  /**
   * 批量记录下载（批量下载场景）
   */
  async recordBatchDownload(params: {
    solutionId: number;
    files: Array<{ fileId: number; fileName: string }>;
    userId?: number;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    const { solutionId, files, userId, ipAddress, userAgent } = params;
    
    // 批量插入下载记录
    const records = files.map(file => ({
      solutionId,
      userId: userId || null,
      actionType: 'download' as const,
      resourceId: file.fileId,
      resourceName: file.fileName,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
      extraData: { batchDownload: true } as Record<string, any>,
    }));
    
    await db.insert(solutionStatistics).values(records);
    
    // 更新方案下载计数（按批次计算一次）
    await this.updateDownloadCount(solutionId);
  }
  
  /**
   * 获取下载记录列表
   */
  async getDownloadRecords(params: GetDownloadRecordsParams): Promise<{
    records: DownloadRecord[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const { solutionId, userId, fileId, startDate, endDate, page = 1, pageSize = 20 } = params;
    
    // 构建查询条件
    const conditions = [
      eq(solutionStatistics.actionType, 'download'),
      sql`${solutionStatistics.deletedAt} IS NULL`,
    ];
    
    if (solutionId) {
      conditions.push(eq(solutionStatistics.solutionId, solutionId));
    }
    if (userId) {
      conditions.push(eq(solutionStatistics.userId, userId));
    }
    if (fileId) {
      conditions.push(eq(solutionStatistics.resourceId, fileId));
    }
    if (startDate && endDate) {
      conditions.push(between(solutionStatistics.createdAt, startDate, endDate));
    } else if (startDate) {
      conditions.push(gte(solutionStatistics.createdAt, startDate));
    } else if (endDate) {
      conditions.push(lte(solutionStatistics.createdAt, endDate));
    }
    
    // 查询总数
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(solutionStatistics)
      .where(and(...conditions));
    
    const total = countResult?.count || 0;
    
    // 分页查询记录
    const records = await db
      .select({
        id: solutionStatistics.id,
        solutionId: solutionStatistics.solutionId,
        solutionName: solutions.solutionName,
        fileId: solutionStatistics.resourceId,
        fileName: solutionStatistics.resourceName,
        userId: solutionStatistics.userId,
        userName: users.realName,
        ipAddress: solutionStatistics.ipAddress,
        userAgent: solutionStatistics.userAgent,
        extraData: solutionStatistics.extraData,
        createdAt: solutionStatistics.createdAt,
      })
      .from(solutionStatistics)
      .leftJoin(solutions, eq(solutionStatistics.solutionId, solutions.id))
      .leftJoin(users, eq(solutionStatistics.userId, users.id))
      .where(and(...conditions))
      .orderBy(desc(solutionStatistics.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);
    
    return {
      records: records.map(r => ({
        id: r.id,
        solutionId: r.solutionId,
        solutionName: r.solutionName || '未知方案',
        fileId: r.fileId,
        fileName: r.fileName,
        userId: r.userId,
        userName: r.userName,
        ipAddress: r.ipAddress,
        userAgent: r.userAgent,
        extraData: r.extraData as Record<string, any> | null,
        createdAt: r.createdAt,
      })),
      total,
      page,
      pageSize,
    };
  }
  
  /**
   * 获取解决方案的下载统计
   */
  async getDownloadStatistics(solutionId: number): Promise<DownloadStatistics> {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    // 总下载量
    const [totalResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(solutionStatistics)
      .where(and(
        eq(solutionStatistics.solutionId, solutionId),
        eq(solutionStatistics.actionType, 'download'),
        sql`${solutionStatistics.deletedAt} IS NULL`
      ));
    
    // 独立下载用户数
    const [uniqueResult] = await db
      .select({ count: sql<number>`count(distinct ${solutionStatistics.userId})` })
      .from(solutionStatistics)
      .where(and(
        eq(solutionStatistics.solutionId, solutionId),
        eq(solutionStatistics.actionType, 'download'),
        sql`${solutionStatistics.userId} IS NOT NULL`,
        sql`${solutionStatistics.deletedAt} IS NULL`
      ));
    
    // 今日下载量
    const [todayResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(solutionStatistics)
      .where(and(
        eq(solutionStatistics.solutionId, solutionId),
        eq(solutionStatistics.actionType, 'download'),
        gte(solutionStatistics.createdAt, today),
        sql`${solutionStatistics.deletedAt} IS NULL`
      ));
    
    // 本周下载量
    const [weekResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(solutionStatistics)
      .where(and(
        eq(solutionStatistics.solutionId, solutionId),
        eq(solutionStatistics.actionType, 'download'),
        gte(solutionStatistics.createdAt, weekAgo),
        sql`${solutionStatistics.deletedAt} IS NULL`
      ));
    
    // 本月下载量
    const [monthResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(solutionStatistics)
      .where(and(
        eq(solutionStatistics.solutionId, solutionId),
        eq(solutionStatistics.actionType, 'download'),
        gte(solutionStatistics.createdAt, monthAgo),
        sql`${solutionStatistics.deletedAt} IS NULL`
      ));
    
    // 下载次数最多的用户
    const topDownloaders = await db
      .select({
        userId: solutionStatistics.userId,
        userName: users.realName,
        downloadCount: sql<number>`count(*)`,
      })
      .from(solutionStatistics)
      .leftJoin(users, eq(solutionStatistics.userId, users.id))
      .where(and(
        eq(solutionStatistics.solutionId, solutionId),
        eq(solutionStatistics.actionType, 'download'),
        sql`${solutionStatistics.userId} IS NOT NULL`,
        sql`${solutionStatistics.deletedAt} IS NULL`
      ))
      .groupBy(solutionStatistics.userId, users.realName)
      .orderBy(desc(sql`count(*)`))
      .limit(5);
    
    // 最近下载记录
    const recentRecords = await db
      .select({
        id: solutionStatistics.id,
        solutionId: solutionStatistics.solutionId,
        solutionName: solutions.solutionName,
        fileId: solutionStatistics.resourceId,
        fileName: solutionStatistics.resourceName,
        userId: solutionStatistics.userId,
        userName: users.realName,
        ipAddress: solutionStatistics.ipAddress,
        userAgent: solutionStatistics.userAgent,
        extraData: solutionStatistics.extraData,
        createdAt: solutionStatistics.createdAt,
      })
      .from(solutionStatistics)
      .leftJoin(solutions, eq(solutionStatistics.solutionId, solutions.id))
      .leftJoin(users, eq(solutionStatistics.userId, users.id))
      .where(and(
        eq(solutionStatistics.solutionId, solutionId),
        eq(solutionStatistics.actionType, 'download'),
        sql`${solutionStatistics.deletedAt} IS NULL`
      ))
      .orderBy(desc(solutionStatistics.createdAt))
      .limit(10);
    
    return {
      totalDownloads: totalResult?.count || 0,
      uniqueDownloaders: uniqueResult?.count || 0,
      todayDownloads: todayResult?.count || 0,
      weekDownloads: weekResult?.count || 0,
      monthDownloads: monthResult?.count || 0,
      topDownloaders: topDownloaders.map(d => ({
        userId: d.userId,
        userName: d.userName || '匿名用户',
        downloadCount: d.downloadCount,
      })),
      recentDownloads: recentRecords.map(r => ({
        id: r.id,
        solutionId: r.solutionId,
        solutionName: r.solutionName || '未知方案',
        fileId: r.fileId,
        fileName: r.fileName,
        userId: r.userId,
        userName: r.userName,
        ipAddress: r.ipAddress,
        userAgent: r.userAgent,
        extraData: r.extraData as Record<string, any> | null,
        createdAt: r.createdAt,
      })),
    };
  }
  
  /**
   * 更新方案下载计数
   */
  private async updateDownloadCount(solutionId: number): Promise<void> {
    // 统计当前下载次数
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(solutionStatistics)
      .where(and(
        eq(solutionStatistics.solutionId, solutionId),
        eq(solutionStatistics.actionType, 'download'),
        sql`${solutionStatistics.deletedAt} IS NULL`
      ));
    
    // 更新方案表的下载计数字段
    await db
      .update(solutions)
      .set({
        downloadCount: result?.count || 0,
        updatedAt: new Date(),
      })
      .where(eq(solutions.id, solutionId));
  }
  
  /**
   * 获取用户的下载历史
   */
  async getUserDownloadHistory(userId: number, page = 1, pageSize = 20): Promise<{
    records: DownloadRecord[];
    total: number;
  }> {
    const result = await this.getDownloadRecords({ userId, page, pageSize });
    return {
      records: result.records,
      total: result.total,
    };
  }
}

export const solutionDownloadService = new SolutionDownloadService();
