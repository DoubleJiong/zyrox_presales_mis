/**
 * 文件下载工具
 * 
 * 功能：
 * - 流式下载大文件
 * - 下载进度追踪
 * - 错误处理和重试
 */

// 下载进度类型
export interface DownloadProgress {
  url: string;
  fileName: string;
  fileSize: number;
  downloadedBytes: number;
  progress: number; // 0-100
  speed: number; // bytes/s
  remainingTime: number; // seconds
  status: 'pending' | 'downloading' | 'completed' | 'failed' | 'cancelled';
  error?: string;
}

// 下载选项
export interface DownloadOptions {
  fileName?: string;
  onProgress?: (progress: DownloadProgress) => void;
  onComplete?: () => void;
  onError?: (error: Error) => void;
  maxRetries?: number;
  signal?: AbortSignal;
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
  if (!isFinite(seconds) || seconds < 0) return '计算中...';
  if (seconds < 60) return `${Math.round(seconds)}秒`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}分钟`;
  return `${Math.round(seconds / 3600)}小时`;
}

/**
 * 格式化速度
 */
export function formatSpeed(bytesPerSecond: number): string {
  if (bytesPerSecond === 0) return '计算中...';
  return formatFileSize(bytesPerSecond) + '/s';
}

/**
 * 使用 fetch + blob 模式下载文件
 * 支持进度追踪和跨域下载
 */
export async function downloadFile(
  url: string,
  options: DownloadOptions = {}
): Promise<void> {
  const {
    fileName,
    onProgress,
    onComplete,
    onError,
    maxRetries = 3,
    signal,
  } = options;

  let lastError: Error | null = null;

  for (let retry = 0; retry < maxRetries; retry++) {
    try {
      // 发起请求
      const response = await fetch(url, {
        signal,
        mode: 'cors',
      });

      if (!response.ok) {
        throw new Error(`下载失败: ${response.status} ${response.statusText}`);
      }

      // 获取文件大小
      const contentLength = response.headers.get('content-length');
      const fileSize = contentLength ? parseInt(contentLength, 10) : 0;

      // 从 URL 或 Content-Disposition 获取文件名
      let finalFileName = fileName;
      if (!finalFileName) {
        // 尝试从 Content-Disposition 获取
        const contentDisposition = response.headers.get('content-disposition');
        if (contentDisposition) {
          const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(contentDisposition);
          if (matches && matches[1]) {
            finalFileName = decodeURIComponent(matches[1].replace(/['"]/g, ''));
          }
        }
        // 从 URL 获取
        if (!finalFileName) {
          const urlPath = new URL(url).pathname;
          finalFileName = urlPath.split('/').pop() || 'download';
        }
      }

      // 进度状态
      let downloadedBytes = 0;
      const startTime = Date.now();
      let lastProgressTime = startTime;
      let lastProgressBytes = 0;

      // 更新进度
      const updateProgress = (status: DownloadProgress['status'], error?: string) => {
        if (!onProgress) return;

        const now = Date.now();
        const timeDiff = (now - lastProgressTime) / 1000;
        const bytesDiff = downloadedBytes - lastProgressBytes;
        const speed = timeDiff > 0 ? bytesDiff / timeDiff : 0;
        const remainingBytes = fileSize - downloadedBytes;
        const remainingTime = speed > 0 ? remainingBytes / speed : 0;

        onProgress({
          url,
          fileName: finalFileName || 'unknown',
          fileSize,
          downloadedBytes,
          progress: fileSize > 0 ? Math.round((downloadedBytes / fileSize) * 100) : 0,
          speed,
          remainingTime,
          status,
          error,
        });

        lastProgressTime = now;
        lastProgressBytes = downloadedBytes;
      };

      // 读取响应流
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('无法读取响应流');
      }

      const chunks: Uint8Array[] = [];
      updateProgress('downloading');

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        if (signal?.aborted) {
          reader.cancel();
          throw new Error('下载已取消');
        }

        chunks.push(value);
        downloadedBytes += value.length;
        updateProgress('downloading');
      }

      // 合并所有 chunk
      const blob = new Blob(chunks as BlobPart[]);
      const blobUrl = window.URL.createObjectURL(blob);

      // 触发下载
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = finalFileName || 'download';
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();

      // 清理
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);

      updateProgress('completed');
      onComplete?.();
      return;
    } catch (error) {
      lastError = error as Error;
      
      if (signal?.aborted) {
        onProgress?.({
          url,
          fileName: fileName || 'unknown',
          fileSize: 0,
          downloadedBytes: 0,
          progress: 0,
          speed: 0,
          remainingTime: 0,
          status: 'cancelled',
          error: '下载已取消',
        });
        onError?.(lastError);
        return;
      }

      console.warn(`下载失败，重试 ${retry + 1}/${maxRetries}:`, error);
      
      // 指数退避
      if (retry < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retry) * 1000));
      }
    }
  }

  // 所有重试都失败
  const errorMessage = lastError?.message || '下载失败';
  onProgress?.({
    url,
    fileName: fileName || 'unknown',
    fileSize: 0,
    downloadedBytes: 0,
    progress: 0,
    speed: 0,
    remainingTime: 0,
    status: 'failed',
    error: errorMessage,
  });
  onError?.(lastError || new Error(errorMessage));
}

/**
 * 批量下载文件
 */
export async function downloadFiles(
  files: Array<{ url: string; fileName?: string }>,
  options: Omit<DownloadOptions, 'fileName'> & {
    onFileStart?: (index: number, fileName: string) => void;
    onFileComplete?: (index: number, fileName: string) => void;
    onAllComplete?: () => void;
    concurrency?: number;
  } = {}
): Promise<void> {
  const {
    onFileStart,
    onFileComplete,
    onAllComplete,
    concurrency = 2,
    ...downloadOptions
  } = options;

  const total = files.length;
  let completed = 0;

  const downloadOne = async (index: number) => {
    const file = files[index];
    const fileName = file.fileName || new URL(file.url).pathname.split('/').pop() || 'download';
    
    onFileStart?.(index, fileName);
    
    await downloadFile(file.url, {
      ...downloadOptions,
      fileName,
      onComplete: () => {
        completed++;
        onFileComplete?.(index, fileName);
        downloadOptions.onComplete?.();
      },
    });
  };

  // 并发控制
  const queue: Promise<void>[] = [];
  for (let i = 0; i < files.length; i++) {
    const task = downloadOne(i);
    queue.push(task);

    if (queue.length >= concurrency) {
      await Promise.race(queue);
      // 移除已完成的任务
      const pending = queue.filter(t => 
        Promise.race([t, Promise.resolve('pending')]).then(
          () => false,
          () => true
        )
      );
    }
  }

  await Promise.all(queue);
  onAllComplete?.();
}

/**
 * 预检查文件 URL 是否可访问
 */
export async function checkFileAccessible(url: string): Promise<{
  accessible: boolean;
  fileSize?: number;
  contentType?: string;
  error?: string;
}> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    
    if (!response.ok) {
      return {
        accessible: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const contentLength = response.headers.get('content-length');
    const contentType = response.headers.get('content-type');

    return {
      accessible: true,
      fileSize: contentLength ? parseInt(contentLength, 10) : undefined,
      contentType: contentType || undefined,
    };
  } catch (error) {
    return {
      accessible: false,
      error: error instanceof Error ? error.message : '无法访问',
    };
  }
}

/**
 * 刷新签名 URL（如果即将过期）
 */
export async function refreshSignedUrl(
  originalUrl: string,
  getNewUrl: () => Promise<string>
): Promise<string> {
  // 解析 URL 中的过期时间（AWS S3 签名 URL 格式）
  try {
    const url = new URL(originalUrl);
    const expires = url.searchParams.get('X-Amz-Expires');
    const date = url.searchParams.get('X-Amz-Date');

    if (expires && date) {
      // 计算签名 URL 的过期时间
      const signedTime = new Date(
        date.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z/, '$1-$2-$3T$4:$5:$6Z')
      ).getTime();
      const expireSeconds = parseInt(expires, 10);
      const expireTime = signedTime + expireSeconds * 1000;

      // 如果 URL 即将过期（剩余时间小于 5 分钟），刷新 URL
      const now = Date.now();
      if (expireTime - now < 5 * 60 * 1000) {
        console.log('签名 URL 即将过期，正在刷新...');
        return await getNewUrl();
      }
    }
  } catch {
    // 解析失败，保持原 URL
  }

  return originalUrl;
}
