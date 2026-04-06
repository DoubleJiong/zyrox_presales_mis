/**
 * 大文件分片上传工具
 * 
 * 功能：
 * - 文件分片
 * - 断点续传
 * - 上传进度回调
 * - 并发控制
 */

// 默认分片大小：5MB
const DEFAULT_CHUNK_SIZE = 5 * 1024 * 1024;

// 并发上传数
const DEFAULT_CONCURRENCY = 3;

/**
 * 获取认证token
 */
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

/**
 * 获取认证headers
 */
function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// 分片上传接口类型
interface ChunkUploadInitParams {
  fileName: string;
  fileSize: number;
  contentType: string;
  fileHash: string;
  totalChunks: number;
  targetPath?: string;
  solutionId?: number;
  subSchemeId?: number;
  metadata?: Record<string, unknown>;
}

interface UploadTask {
  uploadId: string;
  fileName: string;
  fileSize: number;
  totalChunks: number;
  uploadedChunks: number[];
  status: string;
  message?: string;
}

interface UploadProgress {
  uploadId: string;
  fileName: string;
  fileSize: number;
  uploadedBytes: number;
  uploadedChunks: number;
  totalChunks: number;
  progress: number; // 0-100
  speed: number; // bytes/s
  remainingTime: number; // seconds
  status: 'pending' | 'uploading' | 'completed' | 'failed' | 'paused';
}

// 导出 UploadProgress 类型
export type { UploadProgress };

interface ChunkUploadOptions {
  chunkSize?: number;
  concurrency?: number;
  targetPath?: string;
  solutionId?: number;
  subSchemeId?: number;
  onProgress?: (progress: UploadProgress) => void;
  onComplete?: (result: { key: string; url: string }) => void;
  onError?: (error: Error) => void;
  onRetry?: (chunkIndex: number, retryCount: number) => void;
  maxRetries?: number;
}

/**
 * 计算文件hash（SHA-256）
 */
export async function calculateFileHash(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const buffer = reader.result as ArrayBuffer;
        const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        resolve(hashHex);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

/**
 * 初始化分片上传任务
 */
async function initChunkUpload(params: ChunkUploadInitParams): Promise<UploadTask> {
  const response = await fetch('/api/upload/chunk', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || error.error || '初始化上传失败');
  }

  const result = await response.json();
  return result.data;
}

/**
 * 上传单个分片
 */
async function uploadChunk(
  uploadId: string,
  chunkIndex: number,
  chunk: Blob,
  maxRetries: number = 3
): Promise<{ uploadedChunks: number[]; progress: number }> {
  let lastError: Error | null = null;

  for (let retry = 0; retry < maxRetries; retry++) {
    try {
      const formData = new FormData();
      formData.append('uploadId', uploadId);
      formData.append('chunkIndex', chunkIndex.toString());
      formData.append('chunk', chunk);

      const response = await fetch('/api/upload/chunk/upload', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || error.error || `分片 ${chunkIndex} 上传失败`);
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      lastError = error as Error;
      console.warn(`分片 ${chunkIndex} 上传失败，重试 ${retry + 1}/${maxRetries}`);
      // 指数退避
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, retry) * 1000));
    }
  }

  throw lastError || new Error(`分片 ${chunkIndex} 上传失败`);
}

/**
 * 合并分片
 */
async function completeChunkUpload(uploadId: string): Promise<{ key: string; url: string; fileName: string; fileSize: number }> {
  const response = await fetch('/api/upload/chunk/complete', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify({ uploadId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || error.error || '合并分片失败');
  }

  const result = await response.json();
  return result.data;
}

/**
 * 分片上传主函数
 */
export async function uploadFileWithChunks(
  file: File,
  options: ChunkUploadOptions = {}
): Promise<{ key: string; url: string }> {
  const {
    chunkSize = DEFAULT_CHUNK_SIZE,
    concurrency = DEFAULT_CONCURRENCY,
    targetPath,
    solutionId,
    subSchemeId,
    onProgress,
    onComplete,
    onError,
    maxRetries = 3,
  } = options;

  // 计算分片数量
  const totalChunks = Math.ceil(file.size / chunkSize);
  const contentType = file.type || 'application/octet-stream';

  // 计算文件hash
  let fileHash: string;
  try {
    fileHash = await calculateFileHash(file);
  } catch {
    // 如果计算hash失败，使用文件名+大小+时间戳作为备选
    fileHash = `${file.name}-${file.size}-${Date.now()}`;
  }

  // 初始化上传任务
  const task = await initChunkUpload({
    fileName: file.name,
    fileSize: file.size,
    contentType,
    fileHash,
    totalChunks,
    targetPath,
    solutionId,
    subSchemeId,
  });

  const uploadId = task.uploadId;
  const uploadedChunks = new Set(task.uploadedChunks || []);

  // 上传进度状态
  let uploadedBytes = uploadedChunks.size * chunkSize;
  const startTime = Date.now();
  let lastProgressTime = startTime;
  let lastProgressBytes = uploadedBytes;

  // 更新进度回调
  const updateProgress = (status: UploadProgress['status']) => {
    if (!onProgress) return;

    const now = Date.now();
    const timeDiff = (now - lastProgressTime) / 1000;
    const bytesDiff = uploadedBytes - lastProgressBytes;
    const speed = timeDiff > 0 ? bytesDiff / timeDiff : 0;
    const remainingBytes = file.size - uploadedBytes;
    const remainingTime = speed > 0 ? remainingBytes / speed : 0;

    onProgress({
      uploadId,
      fileName: file.name,
      fileSize: file.size,
      uploadedBytes,
      uploadedChunks: uploadedChunks.size,
      totalChunks,
      progress: Math.round((uploadedChunks.size / totalChunks) * 100),
      speed,
      remainingTime,
      status,
    });

    lastProgressTime = now;
    lastProgressBytes = uploadedBytes;
  };

  // 如果所有分片已上传，直接合并
  if (uploadedChunks.size === totalChunks) {
    updateProgress('uploading');
    const result = await completeChunkUpload(uploadId);
    updateProgress('completed');
    onComplete?.(result);
    return result;
  }

  // 创建分片队列
  const pendingChunks: number[] = [];
  for (let i = 0; i < totalChunks; i++) {
    if (!uploadedChunks.has(i)) {
      pendingChunks.push(i);
    }
  }

  updateProgress('uploading');

  // 并发上传控制
  const uploadWithConcurrency = async () => {
    const executing: Promise<void>[] = [];

    while (pendingChunks.length > 0 || executing.length > 0) {
      // 填充并发队列
      while (executing.length < concurrency && pendingChunks.length > 0) {
        const chunkIndex = pendingChunks.shift()!;

        const task = (async () => {
          const start = chunkIndex * chunkSize;
          const end = Math.min(start + chunkSize, file.size);
          const chunk = file.slice(start, end);

          const result = await uploadChunk(uploadId, chunkIndex, chunk, maxRetries);
          
          // 更新已上传分片
          result.uploadedChunks.forEach(idx => uploadedChunks.add(idx));
          uploadedBytes = Math.min(uploadedChunks.size * chunkSize, file.size);
          
          updateProgress('uploading');
        })();

        executing.push(task);

        task.catch(error => {
          console.error(`分片 ${chunkIndex} 上传失败:`, error);
          onError?.(error as Error);
          throw error;
        });
      }

      // 等待任意一个完成
      if (executing.length > 0) {
        await Promise.race(executing);
        // 移除已完成的任务
        const completed = executing.filter(t => 
          Promise.race([t, Promise.resolve('pending')]).then(
            () => true,
            () => false
          )
        );
        // 简化处理：等待所有正在执行的任务
        await Promise.allSettled(executing);
        executing.length = 0;
      }
    }
  };

  // 执行上传
  await uploadWithConcurrency();

  // 合并分片
  const result = await completeChunkUpload(uploadId);
  updateProgress('completed');
  onComplete?.(result);

  return result;
}

/**
 * 查询上传进度
 */
export async function getUploadProgress(uploadId: string): Promise<UploadProgress | null> {
  const response = await fetch(`/api/upload/chunk?uploadId=${uploadId}`);
  
  if (!response.ok) {
    return null;
  }

  const result = await response.json();
  const data = result.data;

  return {
    uploadId: data.uploadId,
    fileName: data.fileName,
    fileSize: data.fileSize,
    uploadedBytes: Math.min((data.uploadedChunks?.length || 0) * DEFAULT_CHUNK_SIZE, data.fileSize),
    uploadedChunks: data.uploadedChunks?.length || 0,
    totalChunks: data.totalChunks,
    progress: data.progress,
    speed: 0,
    remainingTime: 0,
    status: data.status,
  };
}

/**
 * 取消上传
 */
export async function cancelUpload(uploadId: string): Promise<void> {
  await fetch(`/api/upload/chunk?uploadId=${uploadId}`, { method: 'DELETE' });
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 格式化时间
 */
export function formatTime(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}秒`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}分钟`;
  return `${Math.round(seconds / 3600)}小时`;
}

/**
 * 格式化速度
 */
export function formatSpeed(bytesPerSecond: number): string {
  return formatFileSize(bytesPerSecond) + '/s';
}
