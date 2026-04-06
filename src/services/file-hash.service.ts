/**
 * 文件哈希计算服务
 * 
 * 功能：
 * - 计算文件MD5/SHA256哈希值
 * - 检测文件是否被修改
 * - 查找重复文件
 */

import { db } from '@/db';
import { solutionFiles } from '@/db/schema';
import { eq, and, isNull, inArray } from 'drizzle-orm';
import crypto from 'crypto';

// 哈希计算结果
export interface HashResult {
  hash: string;
  algorithm: 'md5' | 'sha256';
  fileSize: number;
}

// 文件变更检测结果
export interface FileChangeResult {
  fileId: number;
  fileName: string;
  oldHash: string | null;
  newHash: string;
  isChanged: boolean;
}

// 重复文件结果
export interface DuplicateFileGroup {
  hash: string;
  files: Array<{
    id: number;
    fileName: string;
    fileSize: number | null;
    subSchemeId: number;
    uploadedBy: number | null;
    createdAt: Date;
  }>;
}

class FileHashService {
  
  /**
   * 计算Buffer的MD5哈希
   */
  calculateMD5(buffer: Buffer): string {
    return crypto.createHash('md5').update(buffer).digest('hex');
  }
  
  /**
   * 计算Buffer的SHA256哈希
   */
  calculateSHA256(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }
  
  /**
   * 计算文件哈希（从URL下载后计算）
   */
  async calculateHashFromUrl(fileUrl: string, algorithm: 'md5' | 'sha256' = 'md5'): Promise<HashResult> {
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const hash = algorithm === 'md5' 
      ? this.calculateMD5(buffer)
      : this.calculateSHA256(buffer);
    
    return {
      hash,
      algorithm,
      fileSize: buffer.length,
    };
  }
  
  /**
   * 计算文件哈希（从Buffer）
   */
  calculateHashFromBuffer(buffer: Buffer, algorithm: 'md5' | 'sha256' = 'md5'): HashResult {
    const hash = algorithm === 'md5' 
      ? this.calculateMD5(buffer)
      : this.calculateSHA256(buffer);
    
    return {
      hash,
      algorithm,
      fileSize: buffer.length,
    };
  }
  
  /**
   * 更新文件哈希值
   */
  async updateFileHash(fileId: number, hash: string): Promise<void> {
    await db
      .update(solutionFiles)
      .set({
        fileHash: hash,
        updatedAt: new Date(),
      })
      .where(eq(solutionFiles.id, fileId));
  }
  
  /**
   * 批量更新文件哈希值
   */
  async batchUpdateFileHash(updates: Array<{ fileId: number; hash: string }>): Promise<void> {
    for (const { fileId, hash } of updates) {
      await this.updateFileHash(fileId, hash);
    }
  }
  
  /**
   * 检测文件是否被修改（对比哈希值）
   */
  async detectFileChange(fileId: number, newBuffer: Buffer): Promise<FileChangeResult> {
    // 获取文件信息
    const [file] = await db
      .select()
      .from(solutionFiles)
      .where(eq(solutionFiles.id, fileId));
    
    if (!file) {
      throw new Error('文件不存在');
    }
    
    // 计算新哈希
    const newHash = this.calculateMD5(newBuffer);
    
    return {
      fileId: file.id,
      fileName: file.fileName,
      oldHash: file.fileHash,
      newHash,
      isChanged: file.fileHash !== newHash,
    };
  }
  
  /**
   * 检查文件哈希是否已存在（用于检测重复文件）
   */
  async checkHashExists(hash: string, excludeFileId?: number): Promise<{
    exists: boolean;
    files: Array<{ id: number; fileName: string; subSchemeId: number }>;
  }> {
    const conditions = [
      eq(solutionFiles.fileHash, hash),
      isNull(solutionFiles.deletedAt),
    ];
    
    const files = await db
      .select({
        id: solutionFiles.id,
        fileName: solutionFiles.fileName,
        subSchemeId: solutionFiles.subSchemeId,
      })
      .from(solutionFiles)
      .where(and(...conditions));
    
    // 排除指定文件
    const filteredFiles = excludeFileId 
      ? files.filter(f => f.id !== excludeFileId)
      : files;
    
    return {
      exists: filteredFiles.length > 0,
      files: filteredFiles,
    };
  }
  
  /**
   * 查找所有重复文件
   */
  async findDuplicateFiles(): Promise<DuplicateFileGroup[]> {
    // 查询所有有哈希值的文件
    const files = await db
      .select({
        id: solutionFiles.id,
        fileName: solutionFiles.fileName,
        fileSize: solutionFiles.fileSize,
        fileHash: solutionFiles.fileHash,
        subSchemeId: solutionFiles.subSchemeId,
        uploadedBy: solutionFiles.uploadedBy,
        createdAt: solutionFiles.createdAt,
      })
      .from(solutionFiles)
      .where(and(
        isNull(solutionFiles.deletedAt),
        sql`${solutionFiles.fileHash} IS NOT NULL`
      ));
    
    // 按哈希分组
    const hashGroups = new Map<string, DuplicateFileGroup>();
    
    for (const file of files) {
      if (!file.fileHash) continue;
      
      if (!hashGroups.has(file.fileHash)) {
        hashGroups.set(file.fileHash, {
          hash: file.fileHash,
          files: [],
        });
      }
      
      hashGroups.get(file.fileHash)!.files.push({
        id: file.id,
        fileName: file.fileName,
        fileSize: file.fileSize,
        subSchemeId: file.subSchemeId,
        uploadedBy: file.uploadedBy,
        createdAt: file.createdAt,
      });
    }
    
    // 只返回有重复的组
    return Array.from(hashGroups.values()).filter(group => group.files.length > 1);
  }
  
  /**
   * 为未计算哈希的文件计算哈希值
   */
  async computeMissingHashes(): Promise<{
    total: number;
    success: number;
    failed: number;
    errors: Array<{ fileId: number; error: string }>;
  }> {
    // 查询所有没有哈希值的文件
    const files = await db
      .select({
        id: solutionFiles.id,
        fileName: solutionFiles.fileName,
        fileUrl: solutionFiles.fileUrl,
      })
      .from(solutionFiles)
      .where(and(
        isNull(solutionFiles.deletedAt),
        sql`${solutionFiles.fileHash} IS NULL`
      ));
    
    const result = {
      total: files.length,
      success: 0,
      failed: 0,
      errors: [] as Array<{ fileId: number; error: string }>,
    };
    
    for (const file of files) {
      try {
        if (!file.fileUrl) {
          throw new Error('文件URL为空');
        }
        
        // 从URL下载并计算哈希
        const hashResult = await this.calculateHashFromUrl(file.fileUrl, 'md5');
        
        // 更新数据库
        await this.updateFileHash(file.id, hashResult.hash);
        result.success++;
      } catch (error) {
        result.failed++;
        result.errors.push({
          fileId: file.id,
          error: error instanceof Error ? error.message : '计算哈希失败',
        });
      }
    }
    
    return result;
  }
  
  /**
   * 验证文件完整性（对比当前哈希与存储哈希）
   */
  async verifyFileIntegrity(fileId: number): Promise<{
    isValid: boolean;
    storedHash: string | null;
    currentHash: string;
    message: string;
  }> {
    // 获取文件信息
    const [file] = await db
      .select()
      .from(solutionFiles)
      .where(eq(solutionFiles.id, fileId));
    
    if (!file) {
      throw new Error('文件不存在');
    }
    
    if (!file.fileHash) {
      return {
        isValid: false,
        storedHash: null,
        currentHash: '',
        message: '文件尚未计算哈希值',
      };
    }
    
    if (!file.fileUrl) {
      return {
        isValid: false,
        storedHash: file.fileHash,
        currentHash: '',
        message: '文件URL为空，无法验证',
      };
    }
    
    try {
      // 计算当前哈希
      const hashResult = await this.calculateHashFromUrl(file.fileUrl, 'md5');
      
      const isValid = file.fileHash === hashResult.hash;
      
      return {
        isValid,
        storedHash: file.fileHash,
        currentHash: hashResult.hash,
        message: isValid ? '文件完整性验证通过' : '文件可能已被修改',
      };
    } catch (error) {
      return {
        isValid: false,
        storedHash: file.fileHash,
        currentHash: '',
        message: `验证失败: ${error instanceof Error ? error.message : '未知错误'}`,
      };
    }
  }
}

// 导入sql用于查询
import { sql } from 'drizzle-orm';

export const fileHashService = new FileHashService();
