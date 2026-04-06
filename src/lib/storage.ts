/**
 * 文件存储工具类
 * 封装 S3 对象存储操作
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { S3Storage } from 'coze-coding-dev-sdk';

// =====================================================
// 存储实例
// =====================================================

let storageInstance: S3Storage | null = null;
const LOCAL_UPLOAD_PREFIX = 'local-uploads';

function isRemoteStorageConfigured() {
  return Boolean(process.env.COZE_BUCKET_ENDPOINT_URL);
}

function isLocalStorageKey(key: string) {
  return key.startsWith(`${LOCAL_UPLOAD_PREFIX}/`);
}

function getLocalUploadPath(key: string) {
  return path.join(process.cwd(), 'public', ...key.split('/'));
}

/**
 * 获取存储实例（单例模式）
 */
export function getStorage(): S3Storage {
  if (!storageInstance) {
    storageInstance = new S3Storage({
      endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL || '',
      accessKey: '',
      secretKey: '',
      bucketName: process.env.COZE_BUCKET_NAME || 'zhengyuan-presales',
      region: 'cn-beijing',
    });
  }
  return storageInstance;
}

// =====================================================
// 类型定义
// =====================================================

export interface UploadResult {
  key: string;
  url: string;
  fileName: string;
  fileSize: number;
  contentType: string;
}

export interface FileUploadOptions {
  /** 文件内容 Buffer */
  fileContent: Buffer;
  /** 原始文件名 */
  fileName: string;
  /** MIME类型 */
  contentType?: string;
  /** 存储路径前缀 */
  prefix?: string;
  /** 签名URL有效期（秒），默认1天 */
  urlExpireTime?: number;
}

export interface FileStreamUploadOptions {
  /** 文件流 */
  stream: any; // 使用 any 以支持多种流类型
  /** 文件名 */
  fileName: string;
  /** MIME类型 */
  contentType?: string;
  /** 存储路径前缀 */
  prefix?: string;
  /** 签名URL有效期（秒） */
  urlExpireTime?: number;
}

// =====================================================
// 常量
// =====================================================

// 允许的文件类型
export const ALLOWED_CONTENT_TYPES: Record<string, string[]> = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
  document: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
  ],
  archive: ['application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed'],
  video: ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo'],
  audio: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/aac'],
};

// 最大文件大小（字节）
export const MAX_FILE_SIZES: Record<string, number> = {
  image: 10 * 1024 * 1024,      // 10MB
  document: 50 * 1024 * 1024,   // 50MB
  archive: 100 * 1024 * 1024,   // 100MB
  video: 500 * 1024 * 1024,     // 500MB
  audio: 50 * 1024 * 1024,      // 50MB
  default: 100 * 1024 * 1024,   // 100MB
};

// =====================================================
// 工具函数
// =====================================================

/**
 * 获取文件类型分类
 */
export function getFileCategory(contentType: string): string {
  for (const [category, types] of Object.entries(ALLOWED_CONTENT_TYPES)) {
    if (types.includes(contentType)) {
      return category;
    }
  }
  return 'other';
}

/**
 * 验证文件类型
 */
export function validateFileType(contentType: string, allowedCategories?: string[]): boolean {
  if (!allowedCategories || allowedCategories.length === 0) {
    // 默认允许所有类型
    return true;
  }

  const category = getFileCategory(contentType);
  return allowedCategories.includes(category) || allowedCategories.includes('other');
}

/**
 * 验证文件大小
 */
export function validateFileSize(fileSize: number, contentType: string): boolean {
  const category = getFileCategory(contentType);
  const maxSize = MAX_FILE_SIZES[category] || MAX_FILE_SIZES.default;
  return fileSize <= maxSize;
}

/**
 * 生成安全的文件名
 * 移除特殊字符，保留扩展名
 */
export function sanitizeFileName(fileName: string): string {
  // 获取扩展名
  const lastDot = fileName.lastIndexOf('.');
  const ext = lastDot > 0 ? fileName.substring(lastDot) : '';
  const name = lastDot > 0 ? fileName.substring(0, lastDot) : fileName;

  // 移除特殊字符，只保留字母、数字、下划线、短横
  const safeName = name.replace(/[^a-zA-Z0-9_\-\u4e00-\u9fa5]/g, '_');

  // 限制长度
  const maxLength = 100;
  const truncatedName = safeName.length > maxLength 
    ? safeName.substring(0, maxLength) 
    : safeName;

  return truncatedName + ext;
}

/**
 * 生成带时间戳的唯一文件名
 */
export function generateUniqueFileName(originalName: string, prefix?: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const safeName = sanitizeFileName(originalName);
  
  const parts = [prefix, timestamp.toString(), random, safeName].filter(Boolean);
  return parts.join('_');
}

// =====================================================
// 上传函数
// =====================================================

/**
 * 上传文件
 */
export async function uploadFile(options: FileUploadOptions): Promise<UploadResult> {
  const {
    fileContent,
    fileName,
    contentType = 'application/octet-stream',
    prefix = 'uploads',
    urlExpireTime = 86400,
  } = options;

  try {
    if (!isRemoteStorageConfigured()) {
      const uniqueFileName = generateUniqueFileName(fileName, prefix);
      const key = `${LOCAL_UPLOAD_PREFIX}/${uniqueFileName}`;
      const filePath = getLocalUploadPath(key);

      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, fileContent);

      return {
        key,
        url: `/${key}`,
        fileName,
        fileSize: fileContent.length,
        contentType,
      };
    }

    const storage = getStorage();

    // 生成唯一文件名
    const uniqueFileName = generateUniqueFileName(fileName, prefix);

    // 上传文件
    const key = await storage.uploadFile({
      fileContent,
      fileName: uniqueFileName,
      contentType,
    });

    // 生成访问URL
    const url = await storage.generatePresignedUrl({
      key,
      expireTime: urlExpireTime,
    });

    return {
      key,
      url,
      fileName,
      fileSize: fileContent.length,
      contentType,
    };
  } catch (error) {
    console.error('[Storage] Upload failed:', error);
    // 提供更详细的错误信息
    if (error instanceof Error) {
      if (error.message.includes('endpoint') || error.message.includes('COZE_BUCKET')) {
        throw new Error('存储服务配置错误，请联系管理员');
      }
      throw error;
    }
    throw new Error('文件上传失败');
  }
}

/**
 * 流式上传文件
 */
export async function streamUploadFile(options: FileStreamUploadOptions): Promise<UploadResult> {
  const {
    stream,
    fileName,
    contentType = 'application/octet-stream',
    prefix = 'uploads',
    urlExpireTime = 86400,
  } = options;

  const storage = getStorage();

  // 生成唯一文件名
  const uniqueFileName = generateUniqueFileName(fileName, prefix);

  // 流式上传
  const key = await storage.streamUploadFile({
    stream,
    fileName: uniqueFileName,
    contentType,
  });

  // 生成访问URL
  const url = await storage.generatePresignedUrl({
    key,
    expireTime: urlExpireTime,
  });

  return {
    key,
    url,
    fileName,
    fileSize: 0, // 流式上传无法提前知道大小
    contentType,
  };
}

/**
 * 从URL上传文件
 */
export async function uploadFromUrl(
  url: string,
  options?: { prefix?: string; urlExpireTime?: number }
): Promise<UploadResult> {
  const storage = getStorage();
  const { prefix = 'uploads', urlExpireTime = 86400 } = options || {};

  // 从URL上传
  const key = await storage.uploadFromUrl({ url });

  // 生成访问URL
  const accessUrl = await storage.generatePresignedUrl({
    key,
    expireTime: urlExpireTime,
  });

  // 从URL提取文件名
  const urlPath = new URL(url).pathname;
  const fileName = urlPath.split('/').pop() || 'unknown';

  return {
    key,
    url: accessUrl,
    fileName,
    fileSize: 0,
    contentType: 'application/octet-stream',
  };
}

// =====================================================
// 文件操作函数
// =====================================================

/**
 * 获取文件访问URL
 */
export async function getFileUrl(key: string, expireTime: number = 86400): Promise<string> {
  if (isLocalStorageKey(key)) {
    return `/${key}`;
  }

  const storage = getStorage();
  return storage.generatePresignedUrl({ key, expireTime });
}

/**
 * 读取文件内容
 */
export async function readFile(key: string): Promise<Buffer> {
  if (isLocalStorageKey(key)) {
    return fs.readFile(getLocalUploadPath(key));
  }

  const storage = getStorage();
  return storage.readFile({ fileKey: key });
}

/**
 * 删除文件
 */
export async function deleteFile(key: string): Promise<boolean> {
  if (isLocalStorageKey(key)) {
    await fs.rm(getLocalUploadPath(key), { force: true });
    return true;
  }

  const storage = getStorage();
  return storage.deleteFile({ fileKey: key });
}

/**
 * 检查文件是否存在
 */
export async function fileExists(key: string): Promise<boolean> {
  if (isLocalStorageKey(key)) {
    try {
      await fs.access(getLocalUploadPath(key));
      return true;
    } catch {
      return false;
    }
  }

  const storage = getStorage();
  return storage.fileExists({ fileKey: key });
}

/**
 * 列出文件
 */
export async function listFiles(options: {
  prefix?: string;
  maxKeys?: number;
  continuationToken?: string;
}): Promise<{
  keys: string[];
  isTruncated: boolean;
  nextContinuationToken?: string;
}> {
  const storage = getStorage();
  return storage.listFiles(options);
}
