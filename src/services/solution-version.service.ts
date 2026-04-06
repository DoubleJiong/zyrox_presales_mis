/**
 * 解决方案版本控制服务
 * 
 * 功能：
 * - 创建版本快照
 * - 版本发布管理
 * - 版本对比（包含文件内容对比）
 * - 版本回滚
 * 
 * 注意：数据库字段映射
 * - creator_id (而非 author_id)
 * - is_current (而非 isLatest)
 * - is_published (而非 isPublished)
 */

import { db } from '@/db';
import { 
  solutions, 
  solutionSubSchemes, 
  solutionFiles,
  users
} from '@/db/schema';
import { eq, desc, and, sql } from 'drizzle-orm';
import { fileCompareService, FileCompareResult } from './file-compare.service';

// 类型定义
export interface CreateVersionParams {
  solutionId: number;
  changeType: 'major' | 'minor' | 'patch';
  changelog: string;
  operatorId: number;
  changeSource?: 'manual' | 'edit' | 'review' | 'auto';
}

export interface SolutionSnapshot {
  solution: Record<string, any>;
  subSchemes: any[];
  files: any[];
}

export interface VersionInfo {
  id: number;
  solutionId: number;
  version: string;
  versionName: string | null;
  changelog: string | null;
  status: string;
  isCurrent: boolean;
  isPublished: boolean;
  publishedAt: Date | null;
  createdAt: Date;
  creatorId: number;
  creatorName: string | null;
  snapshot: any;
}

export class SolutionVersionService {
  
  /**
   * 创建新版本
   */
  async createVersion(params: CreateVersionParams) {
    const { solutionId, changeType, changelog, operatorId, changeSource = 'manual' } = params;
    
    // 1. 获取当前方案数据
    const [solution] = await db.select()
      .from(solutions)
      .where(eq(solutions.id, solutionId));
    
    if (!solution) {
      throw new Error('方案不存在');
    }
    
    // 2. 校验是否可以创建版本
    if (!['draft', 'approved'].includes(solution.status || 'draft')) {
      throw new Error('只有草稿或已发布状态的方案可以创建版本');
    }
    
    // 3. 计算新版本号
    const newVersion = this.calculateNewVersion(solution.version || '1.0', changeType);
    
    // 4. 生成快照
    const snapshot = await this.generateSnapshot(solutionId);
    
    // 5. 将之前的 is_current 设为 false
    await db.execute(sql`
      UPDATE bus_solution_version 
      SET is_current = false 
      WHERE solution_id = ${solutionId} AND is_current = true
    `);
    
    // 6. 创建新版本记录
    const result = await db.execute(sql`
      INSERT INTO bus_solution_version (
        solution_id, version, changelog, creator_id, 
        is_current, is_published, snapshot_data, 
        sub_schemes_snapshot, files_snapshot, change_source, created_at
      ) VALUES (
        ${solutionId}, ${newVersion}, ${changelog}, ${operatorId},
        true, false, ${JSON.stringify(snapshot.solution)}::jsonb,
        ${JSON.stringify(snapshot.subSchemes)}::jsonb,
        ${JSON.stringify(snapshot.files)}::jsonb,
        ${changeSource}, NOW()
      )
      RETURNING id
    `);
    
    const newVersionId = result[0]?.id || result[0]?.id;
    
    // 7. 更新方案版本号
    await db.update(solutions)
      .set({ version: newVersion, updatedAt: new Date() })
      .where(eq(solutions.id, solutionId));
    
    return {
      id: newVersionId,
      solutionId,
      version: newVersion,
      changelog,
      isCurrent: true,
    };
  }
  
  /**
   * 获取版本列表
   */
  async getVersionList(solutionId: number, options: { includeDraft?: boolean; limit?: number } = {}) {
    const { includeDraft = true, limit = 20 } = options;
    
    const whereClause = includeDraft 
      ? sql`WHERE solution_id = ${solutionId}`
      : sql`WHERE solution_id = ${solutionId} AND is_published = true`;
    
    const result = await db.execute(sql`
      SELECT 
        v.id,
        v.solution_id,
        v.version,
        v.changelog,
        v.is_current,
        v.is_published,
        v.published_at,
        v.created_at,
        v.creator_id,
        v.snapshot_data,
        u.real_name as creator_name
      FROM bus_solution_version v
      LEFT JOIN sys_user u ON v.creator_id = u.id
      ${whereClause}
      ORDER BY v.created_at DESC
      LIMIT ${limit}
    `);
    
    return (result as any[]).map((row: any) => ({
      id: row.id,
      solutionId: row.solution_id,
      version: row.version,
      versionName: null,
      changelog: row.changelog,
      status: row.is_published ? 'released' : 'draft',
      isCurrent: row.is_current,
      isPublished: row.is_published,
      publishedAt: row.published_at,
      createdAt: row.created_at,
      creatorId: row.creator_id,
      creatorName: row.creator_name,
      snapshot: row.snapshot_data,
    }));
  }
  
  /**
   * 获取版本详情
   */
  async getVersionDetail(versionId: number): Promise<VersionInfo | null> {
    // 只查询数据库中实际存在的字段，避免 schema 定义的额外字段
    const result = await db.execute(sql`
      SELECT 
        v.id,
        v.solution_id,
        v.version,
        v.version_name,
        v.changelog,
        v.is_current,
        v.is_published,
        v.published_at,
        v.created_at,
        v.creator_id,
        v.status,
        v.snapshot_data,
        u.real_name as creator_name
      FROM bus_solution_version v
      LEFT JOIN sys_user u ON v.creator_id = u.id
      WHERE v.id = ${versionId}
    `);
    
    if ((result as any[]).length === 0) {
      return null;
    }
    
    const row: any = (result as any[])[0];
    return {
      id: row.id,
      solutionId: row.solution_id,
      version: row.version,
      versionName: row.version_name,
      changelog: row.changelog,
      status: row.status || (row.is_published ? 'released' : 'draft'),
      isCurrent: row.is_current,
      isPublished: row.is_published,
      publishedAt: row.published_at,
      createdAt: row.created_at,
      creatorId: row.creator_id,
      creatorName: row.creator_name,
      snapshot: row.snapshot_data,
    };
  }
  
  /**
   * 发布版本
   */
  async publishVersion(versionId: number, userId: number, publishNotes?: string) {
    const version = await this.getVersionDetail(versionId);
    
    if (!version) {
      throw new Error('版本不存在');
    }
    
    if (version.isPublished) {
      throw new Error('版本已发布');
    }
    
    await db.execute(sql`
      UPDATE bus_solution_version 
      SET is_published = true, published_at = NOW(), published_by = ${userId}
      WHERE id = ${versionId}
    `);
    
    return { success: true, message: '版本发布成功' };
  }
  
  /**
   * 版本回滚
   */
  async rollbackVersion(versionId: number, operatorId: number) {
    const version = await this.getVersionDetail(versionId);
    
    if (!version) {
      throw new Error('版本不存在');
    }
    
    if (!version.isPublished) {
      throw new Error('只能回滚已发布的版本');
    }
    
    if (version.isCurrent) {
      throw new Error('当前版本无法回滚');
    }
    
    // 从快照恢复数据
    if (version.snapshot) {
      const snapshot = typeof version.snapshot === 'string' 
        ? JSON.parse(version.snapshot) 
        : version.snapshot;
      
      // 更新方案基本信息
      await db.update(solutions)
        .set({
          solutionName: snapshot.solutionName,
          description: snapshot.description,
          content: snapshot.content,
          industry: snapshot.industry,
          scenario: snapshot.scenario,
          tags: snapshot.tags,
          updatedAt: new Date(),
        })
        .where(eq(solutions.id, version.solutionId));
    }
    
    // 创建新版本记录（回滚版本）
    const newVersion = `${version.version}-rollback-${Date.now()}`;
    const snapshot = await this.generateSnapshot(version.solutionId);
    
    await db.execute(sql`
      UPDATE bus_solution_version SET is_current = false WHERE solution_id = ${version.solutionId}
    `);
    
    const result = await db.execute(sql`
      INSERT INTO bus_solution_version (
        solution_id, version, changelog, creator_id, 
        is_current, is_published, snapshot_data,
        sub_schemes_snapshot, files_snapshot, change_source, created_at
      ) VALUES (
        ${version.solutionId}, ${newVersion}, ${`回滚自版本 ${version.version}`}, ${operatorId},
        true, false, ${JSON.stringify(snapshot.solution)}::jsonb,
        ${JSON.stringify(snapshot.subSchemes)}::jsonb,
        ${JSON.stringify(snapshot.files)}::jsonb,
        'manual', NOW()
      )
      RETURNING *
    `);
    
    return {
      success: true,
      message: '版本回滚成功',
      newVersionId: (result as any[])[0]?.id,
    };
  }
  
  /**
   * 生成快照
   */
  private async generateSnapshot(solutionId: number): Promise<SolutionSnapshot> {
    // 获取方案基本信息
    const [solution] = await db.select()
      .from(solutions)
      .where(eq(solutions.id, solutionId));
    
    // 获取子方案
    const subSchemes = await db.select()
      .from(solutionSubSchemes)
      .where(eq(solutionSubSchemes.solutionId, solutionId));
    
    // 获取文件列表
    const files: any[] = [];
    for (const subScheme of subSchemes) {
      const subFiles = await db.select()
        .from(solutionFiles)
        .where(eq(solutionFiles.subSchemeId, subScheme.id));
      files.push(...subFiles);
    }
    
    return {
      solution: solution || {},
      subSchemes,
      files,
    };
  }
  
  /**
   * 计算新版本号
   */
  private calculateNewVersion(currentVersion: string, changeType: 'major' | 'minor' | 'patch'): string {
    const parts = currentVersion.split('.').map(Number);
    let [major = 1, minor = 0, patch = 0] = parts;
    
    switch (changeType) {
      case 'major':
        major += 1;
        minor = 0;
        patch = 0;
        break;
      case 'minor':
        minor += 1;
        patch = 0;
        break;
      case 'patch':
        patch += 1;
        break;
    }
    
    return `${major}.${minor}.${patch}`;
  }
  
  /**
   * 版本对比
   */
  async compareVersions(versionId1: number, versionId2: number, options: { includeFileContent?: boolean } = {}) {
    const { includeFileContent = false } = options;
    
    const [v1, v2] = await Promise.all([
      this.getVersionDetail(versionId1),
      this.getVersionDetail(versionId2),
    ]);
    
    if (!v1 || !v2) {
      throw new Error('版本不存在');
    }
    
    const parseSnapshot = (v: VersionInfo | null) => {
      if (!v?.snapshot) return null;
      return typeof v.snapshot === 'string' ? JSON.parse(v.snapshot) : v.snapshot;
    };
    
    const s1 = parseSnapshot(v1);
    const s2 = parseSnapshot(v2);
    
    // 获取文件快照
    const filesSnapshot1 = await this.getFilesSnapshot(versionId1);
    const filesSnapshot2 = await this.getFilesSnapshot(versionId2);
    
    // 文件清单对比
    const fileDiff = this.diffFiles(filesSnapshot1, filesSnapshot2);
    
    let fileContentDiffs: FileCompareResult[] = [];
    
    // 如果需要文件内容对比
    if (includeFileContent && fileDiff.modified.length > 0) {
      // 只对比修改过的文件（同名但可能内容不同）
      const modifiedFiles = fileDiff.modified.filter(f => 
        ['docx', 'doc', 'xlsx', 'xls', 'pptx', 'ppt'].includes(f.fileType.toLowerCase())
      );
      
      fileContentDiffs = await this.compareFileContents(
        modifiedFiles.map(f => ({ fileName: f.fileName, fileUrl: f.oldUrl || '' })),
        modifiedFiles.map(f => ({ fileName: f.fileName, fileUrl: f.newUrl || '' }))
      );
    }
    
    return {
      version1: {
        id: v1.id,
        version: v1.version,
        createdAt: v1.createdAt,
      },
      version2: {
        id: v2.id,
        version: v2.version,
        createdAt: v2.createdAt,
      },
      changes: {
        solution: this.diffSolution(s1?.solution, s2?.solution),
        subSchemes: this.diffArrays(s1?.subSchemes, s2?.subSchemes, 'subSchemeName'),
        files: fileDiff,
        fileContentDiffs,
      },
    };
  }
  
  /**
   * 获取版本文件快照
   */
  private async getFilesSnapshot(versionId: number) {
    const result = await db.execute(sql`
      SELECT files_snapshot 
      FROM bus_solution_version 
      WHERE id = ${versionId}
    `);
    
    const row = (result as any[])[0];
    if (!row?.files_snapshot) return [];
    
    return typeof row.files_snapshot === 'string' 
      ? JSON.parse(row.files_snapshot) 
      : row.files_snapshot;
  }
  
  /**
   * 文件差异对比
   */
  private diffFiles(f1: any[] = [], f2: any[] = []) {
    const map1 = new Map(f1.map(f => [f.fileName, f]));
    const map2 = new Map(f2.map(f => [f.fileName, f]));
    
    const added = f2.filter(f => !map1.has(f.fileName)).map(f => ({
      fileName: f.fileName,
      fileType: f.fileType,
      fileSize: f.fileSize,
      newUrl: f.fileUrl,
    }));
    
    const removed = f1.filter(f => !map2.has(f.fileName)).map(f => ({
      fileName: f.fileName,
      fileType: f.fileType,
      fileSize: f.fileSize,
      oldUrl: f.fileUrl,
    }));
    
    // 同名文件（可能内容有变化）
    const modified: any[] = [];
    const unchanged: any[] = [];
    
    for (const [fileName, file1] of map1) {
      const file2 = map2.get(fileName);
      if (file2) {
        // 比较文件大小或哈希（如果有）
        if (file1.fileSize !== file2.fileSize || file1.fileHash !== file2.fileHash) {
          modified.push({
            fileName,
            fileType: file1.fileType,
            oldSize: file1.fileSize,
            newSize: file2.fileSize,
            oldUrl: file1.fileUrl,
            newUrl: file2.fileUrl,
          });
        } else {
          unchanged.push({
            fileName,
            fileType: file1.fileType,
            fileSize: file1.fileSize,
          });
        }
      }
    }
    
    return { added, removed, modified, unchanged };
  }
  
  /**
   * 对比文件内容
   */
  private async compareFileContents(
    oldFiles: { fileName: string; fileUrl: string }[],
    newFiles: { fileName: string; fileUrl: string }[]
  ): Promise<FileCompareResult[]> {
    return fileCompareService.compareMultipleFiles(oldFiles, newFiles);
  }
  
  /**
   * 方案差异对比
   */
  private diffSolution(s1: any, s2: any) {
    if (!s1 || !s2) return { added: [], removed: [], modified: [] };
    
    const fields = ['solutionName', 'description', 'industry', 'scenario', 'tags'];
    const modified: any[] = [];
    
    for (const field of fields) {
      if (JSON.stringify(s1[field]) !== JSON.stringify(s2[field])) {
        modified.push({
          field,
          oldValue: s1[field],
          newValue: s2[field],
        });
      }
    }
    
    return { added: [], removed: [], modified };
  }
  
  /**
   * 数组差异对比
   */
  private diffArrays(a1: any[] = [], a2: any[] = [], keyField: string) {
    const keys1 = new Set(a1.map(item => item[keyField]));
    const keys2 = new Set(a2.map(item => item[keyField]));
    
    const added = a2.filter(item => !keys1.has(item[keyField]));
    const removed = a1.filter(item => !keys2.has(item[keyField]));
    
    return { added, removed, modified: [] };
  }
}

// 导出单例
export const solutionVersionService = new SolutionVersionService();
