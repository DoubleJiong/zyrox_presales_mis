'use client';

import { useState, useCallback, useRef } from 'react';
import { uploadFileWithChunks, UploadProgress, cancelUpload } from '@/lib/chunk-upload';
import { downloadFile, DownloadProgress, checkFileAccessible } from '@/lib/file-download';

// =====================================================
// 类型定义
// =====================================================

export type UploadStatus = 'idle' | 'pending' | 'uploading' | 'completed' | 'failed' | 'cancelled';

export interface FileUploadState {
  file: File | null;
  status: UploadStatus;
  progress: number;
  uploadedBytes: number;
  speed: number;
  remainingTime: number;
  error: string | null;
  result: {
    key: string;
    url: string;
  } | null;
}

export interface UseFileUploadOptions {
  // 目标存储路径
  targetPath?: string;
  // 业务关联ID
  solutionId?: number;
  subSchemeId?: number;
  // 分片大小（字节），默认5MB
  chunkSize?: number;
  // 并发数，默认3
  concurrency?: number;
  // 大文件阈值，超过此大小使用分片上传，默认10MB
  chunkUploadThreshold?: number;
  // 最大文件大小限制（字节）
  maxFileSize?: number;
  // 允许的文件类型
  allowedTypes?: string[];
  // 上传成功回调
  onSuccess?: (result: { key: string; url: string; file: File }) => void;
  // 上传失败回调
  onError?: (error: Error, file: File) => void;
  // 进度更新回调
  onProgress?: (progress: UploadProgress, file: File) => void;
}

export interface UseFileUploadReturn {
  // 状态
  state: FileUploadState;
  // 选择文件
  selectFile: (file: File) => boolean;
  // 开始上传
  upload: () => Promise<{ key: string; url: string } | null>;
  // 取消上传
  cancel: () => void;
  // 重置状态
  reset: () => void;
  // 是否正在上传
  isUploading: boolean;
  // 验证文件
  validateFile: (file: File) => { valid: boolean; error?: string };
}

// =====================================================
// Hook实现
// =====================================================

export function useFileUpload(options: UseFileUploadOptions = {}): UseFileUploadReturn {
  const {
    targetPath = 'uploads',
    solutionId,
    subSchemeId,
    chunkSize = 5 * 1024 * 1024,
    concurrency = 3,
    chunkUploadThreshold = 10 * 1024 * 1024,
    maxFileSize = 100 * 1024 * 1024,
    allowedTypes = [],
    onSuccess,
    onError,
    onProgress,
  } = options;

  const [state, setState] = useState<FileUploadState>({
    file: null,
    status: 'idle',
    progress: 0,
    uploadedBytes: 0,
    speed: 0,
    remainingTime: 0,
    error: null,
    result: null,
  });

  const uploadIdRef = useRef<string | null>(null);

  // 验证文件
  const validateFile = useCallback((file: File): { valid: boolean; error?: string } => {
    // 检查文件大小
    if (file.size > maxFileSize) {
      const maxSizeMB = Math.floor(maxFileSize / (1024 * 1024));
      return { valid: false, error: `文件大小超出限制（最大 ${maxSizeMB}MB）` };
    }

    // 检查文件类型
    if (allowedTypes.length > 0) {
      const isValidType = allowedTypes.some(type => {
        if (type.endsWith('/*')) {
          return file.type.startsWith(type.slice(0, -1));
        }
        return file.type === type;
      });

      if (!isValidType) {
        return { valid: false, error: `不支持的文件类型: ${file.type || '未知'}` };
      }
    }

    return { valid: true };
  }, [maxFileSize, allowedTypes]);

  // 选择文件
  const selectFile = useCallback((file: File): boolean => {
    const { valid, error } = validateFile(file);
    
    if (!valid) {
      setState(prev => ({
        ...prev,
        file,
        status: 'failed',
        error: error || '文件验证失败',
      }));
      return false;
    }

    setState({
      file,
      status: 'pending',
      progress: 0,
      uploadedBytes: 0,
      speed: 0,
      remainingTime: 0,
      error: null,
      result: null,
    });
    
    return true;
  }, [validateFile]);

  // 开始上传
  const upload = useCallback(async (): Promise<{ key: string; url: string } | null> => {
    if (!state.file) {
      setState(prev => ({ ...prev, error: '请先选择文件' }));
      return null;
    }

    if (state.status === 'uploading') {
      return null;
    }

    try {
      setState(prev => ({ ...prev, status: 'uploading', error: null }));

      const result = await uploadFileWithChunks(state.file, {
        chunkSize,
        concurrency,
        targetPath,
        solutionId,
        subSchemeId,
        onProgress: (progress: UploadProgress) => {
          setState(prev => ({
            ...prev,
            progress: progress.progress,
            uploadedBytes: progress.uploadedBytes,
            speed: progress.speed,
            remainingTime: progress.remainingTime,
          }));
          onProgress?.(progress, state.file!);
        },
      });

      uploadIdRef.current = result.key;

      setState(prev => ({
        ...prev,
        status: 'completed',
        progress: 100,
        result: { key: result.key, url: result.url },
      }));

      onSuccess?.({ key: result.key, url: result.url, file: state.file });
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '上传失败';
      
      setState(prev => ({
        ...prev,
        status: 'failed',
        error: errorMessage,
      }));

      onError?.(error as Error, state.file);
      
      return null;
    }
  }, [state.file, state.status, chunkSize, concurrency, targetPath, solutionId, subSchemeId, onSuccess, onError, onProgress]);

  // 取消上传
  const cancel = useCallback(() => {
    if (uploadIdRef.current) {
      cancelUpload(uploadIdRef.current);
    }
    
    setState(prev => ({
      ...prev,
      status: 'cancelled',
    }));
  }, []);

  // 重置状态
  const reset = useCallback(() => {
    setState({
      file: null,
      status: 'idle',
      progress: 0,
      uploadedBytes: 0,
      speed: 0,
      remainingTime: 0,
      error: null,
      result: null,
    });
    uploadIdRef.current = null;
  }, []);

  return {
    state,
    selectFile,
    upload,
    cancel,
    reset,
    isUploading: state.status === 'uploading',
    validateFile,
  };
}

// =====================================================
// 批量文件上传Hook
// =====================================================

export interface BatchFileItem {
  id: string;
  file: File;
  status: UploadStatus;
  progress: number;
  uploadedBytes: number;
  speed: number;
  remainingTime: number;
  error: string | null;
  result: { key: string; url: string } | null;
}

export interface UseBatchFileUploadOptions extends Omit<UseFileUploadOptions, 'onSuccess' | 'onError' | 'onProgress'> {
  // 最大并发上传数
  maxConcurrentUploads?: number;
  // 全部完成回调
  onAllComplete?: (results: Array<{ file: File; key: string; url: string }>) => void;
  // 单个文件完成回调
  onFileComplete?: (result: { file: File; key: string; url: string }) => void;
  // 单个文件失败回调
  onFileError?: (error: Error, file: File) => void;
}

export interface UseBatchFileUploadReturn {
  // 文件列表
  files: BatchFileItem[];
  // 添加文件
  addFiles: (fileList: FileList | File[]) => { added: File[]; rejected: Array<{ file: File; error: string }> };
  // 移除文件
  removeFile: (id: string) => void;
  // 开始上传所有文件
  uploadAll: () => Promise<void>;
  // 取消所有上传
  cancelAll: () => void;
  // 清空文件列表
  clearFiles: () => void;
  // 正在上传的文件数
  uploadingCount: number;
  // 已完成的文件数
  completedCount: number;
  // 总进度
  totalProgress: number;
}

export function useBatchFileUpload(options: UseBatchFileUploadOptions = {}): UseBatchFileUploadReturn {
  const {
    targetPath = 'uploads',
    solutionId,
    subSchemeId,
    chunkSize = 5 * 1024 * 1024,
    concurrency = 3,
    maxFileSize = 100 * 1024 * 1024,
    allowedTypes = [],
    maxConcurrentUploads = 3,
    onAllComplete,
    onFileComplete,
    onFileError,
  } = options;

  const [files, setFiles] = useState<BatchFileItem[]>([]);
  const uploadingKeysRef = useRef<Set<string>>(new Set());

  // 验证单个文件
  const validateFile = useCallback((file: File): { valid: boolean; error?: string } => {
    if (file.size > maxFileSize) {
      const maxSizeMB = Math.floor(maxFileSize / (1024 * 1024));
      return { valid: false, error: `文件大小超出限制（最大 ${maxSizeMB}MB）` };
    }

    if (allowedTypes.length > 0) {
      const isValidType = allowedTypes.some(type => {
        if (type.endsWith('/*')) {
          return file.type.startsWith(type.slice(0, -1));
        }
        return file.type === type;
      });

      if (!isValidType) {
        return { valid: false, error: `不支持的文件类型: ${file.type || '未知'}` };
      }
    }

    return { valid: true };
  }, [maxFileSize, allowedTypes]);

  // 添加文件
  const addFiles = useCallback((fileList: FileList | File[]): { added: File[]; rejected: Array<{ file: File; error: string }> } => {
    const fileArray = Array.from(fileList);
    const added: File[] = [];
    const rejected: Array<{ file: File; error: string }> = [];

    const newItems: BatchFileItem[] = [];

    fileArray.forEach(file => {
      const { valid, error } = validateFile(file);
      
      if (valid) {
        const item: BatchFileItem = {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          file,
          status: 'pending',
          progress: 0,
          uploadedBytes: 0,
          speed: 0,
          remainingTime: 0,
          error: null,
          result: null,
        };
        newItems.push(item);
        added.push(file);
      } else {
        rejected.push({ file, error: error || '文件验证失败' });
      }
    });

    if (newItems.length > 0) {
      setFiles(prev => [...prev, ...newItems]);
    }

    return { added, rejected };
  }, [validateFile]);

  // 移除文件
  const removeFile = useCallback((id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  }, []);

  // 上传单个文件
  const uploadSingleFile = useCallback(async (item: BatchFileItem): Promise<void> => {
    try {
      setFiles(prev => prev.map(f => 
        f.id === item.id ? { ...f, status: 'uploading' as const } : f
      ));

      const result = await uploadFileWithChunks(item.file, {
        chunkSize,
        concurrency,
        targetPath,
        solutionId,
        subSchemeId,
        onProgress: (progress: UploadProgress) => {
          setFiles(prev => prev.map(f => 
            f.id === item.id ? {
              ...f,
              progress: progress.progress,
              uploadedBytes: progress.uploadedBytes,
              speed: progress.speed,
              remainingTime: progress.remainingTime,
            } : f
          ));
        },
      });

      setFiles(prev => prev.map(f => 
        f.id === item.id ? {
          ...f,
          status: 'completed' as const,
          progress: 100,
          result: { key: result.key, url: result.url },
        } : f
      ));

      onFileComplete?.({ file: item.file, key: result.key, url: result.url });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '上传失败';
      
      setFiles(prev => prev.map(f => 
        f.id === item.id ? {
          ...f,
          status: 'failed' as const,
          error: errorMessage,
        } : f
      ));

      onFileError?.(error as Error, item.file);
    }
  }, [chunkSize, concurrency, targetPath, solutionId, subSchemeId, onFileComplete, onFileError]);

  // 上传所有文件
  const uploadAll = useCallback(async (): Promise<void> => {
    const pendingFiles = files.filter(f => f.status === 'pending');
    if (pendingFiles.length === 0) return;

    const results: Array<{ file: File; key: string; url: string }> = [];

    // 使用队列控制并发
    const queue = [...pendingFiles];
    const executing: Promise<void>[] = [];

    while (queue.length > 0 || executing.length > 0) {
      while (executing.length < maxConcurrentUploads && queue.length > 0) {
        const item = queue.shift()!;
        
        const task = uploadSingleFile(item).then(() => {
          executing.splice(executing.indexOf(task), 1);
        });
        
        executing.push(task);
      }

      if (executing.length > 0) {
        await Promise.race(executing);
      }
    }

    // 检查所有完成的文件
    const completedFiles = files.filter(f => f.status === 'completed' && f.result);
    if (completedFiles.length === files.length) {
      onAllComplete?.(
        completedFiles.map(f => ({
          file: f.file,
          key: f.result!.key,
          url: f.result!.url,
        }))
      );
    }
  }, [files, maxConcurrentUploads, uploadSingleFile, onAllComplete]);

  // 取消所有上传
  const cancelAll = useCallback(() => {
    uploadingKeysRef.current.forEach(key => {
      cancelUpload(key);
    });
    uploadingKeysRef.current.clear();

    setFiles(prev => prev.map(f => 
      f.status === 'uploading' ? { ...f, status: 'cancelled' as const } : f
    ));
  }, []);

  // 清空文件列表
  const clearFiles = useCallback(() => {
    cancelAll();
    setFiles([]);
  }, [cancelAll]);

  // 计算统计信息
  const uploadingCount = files.filter(f => f.status === 'uploading').length;
  const completedCount = files.filter(f => f.status === 'completed').length;
  const totalProgress = files.length > 0
    ? Math.round(files.reduce((sum, f) => sum + f.progress, 0) / files.length)
    : 0;

  return {
    files,
    addFiles,
    removeFile,
    uploadAll,
    cancelAll,
    clearFiles,
    uploadingCount,
    completedCount,
    totalProgress,
  };
}

// =====================================================
// 文件下载Hook
// =====================================================

export type DownloadStatus = 'idle' | 'checking' | 'downloading' | 'completed' | 'failed' | 'cancelled';

export interface FileDownloadState {
  url: string;
  fileName: string;
  status: DownloadStatus;
  progress: number;
  fileSize: number;
  downloadedBytes: number;
  speed: number;
  remainingTime: number;
  error: string | null;
}

export interface UseFileDownloadOptions {
  // 下载成功回调
  onSuccess?: () => void;
  // 下载失败回调
  onError?: (error: Error) => void;
  // 进度更新回调
  onProgress?: (progress: DownloadProgress) => void;
}

export interface UseFileDownloadReturn {
  // 状态
  state: FileDownloadState;
  // 开始下载
  download: (url: string, fileName?: string) => Promise<void>;
  // 取消下载
  cancel: () => void;
  // 重置状态
  reset: () => void;
  // 是否正在下载
  isDownloading: boolean;
}

export function useFileDownload(options: UseFileDownloadOptions = {}): UseFileDownloadReturn {
  const { onSuccess, onError, onProgress } = options;

  const [state, setState] = useState<FileDownloadState>({
    url: '',
    fileName: '',
    status: 'idle',
    progress: 0,
    fileSize: 0,
    downloadedBytes: 0,
    speed: 0,
    remainingTime: 0,
    error: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  // 开始下载
  const download = useCallback(async (url: string, fileName?: string): Promise<void> => {
    // 创建新的 AbortController
    abortControllerRef.current = new AbortController();

    // 检查文件是否可访问
    setState({
      url,
      fileName: fileName || 'download',
      status: 'checking',
      progress: 0,
      fileSize: 0,
      downloadedBytes: 0,
      speed: 0,
      remainingTime: 0,
      error: null,
    });

    try {
      const checkResult = await checkFileAccessible(url);
      
      if (!checkResult.accessible) {
        throw new Error(checkResult.error || '文件无法访问');
      }

      setState(prev => ({
        ...prev,
        status: 'downloading',
        fileSize: checkResult.fileSize || 0,
      }));

      await downloadFile(url, {
        fileName,
        signal: abortControllerRef.current.signal,
        onProgress: (progress: DownloadProgress) => {
          setState(prev => ({
            ...prev,
            progress: progress.progress,
            downloadedBytes: progress.downloadedBytes,
            speed: progress.speed,
            remainingTime: progress.remainingTime,
          }));
          onProgress?.(progress);
        },
        onComplete: () => {
          setState(prev => ({ ...prev, status: 'completed', progress: 100 }));
          onSuccess?.();
        },
        onError: (error) => {
          setState(prev => ({
            ...prev,
            status: 'failed',
            error: error.message,
          }));
          onError?.(error);
        },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '下载失败';
      setState(prev => ({
        ...prev,
        status: 'failed',
        error: errorMessage,
      }));
      onError?.(error as Error);
    }
  }, [onSuccess, onError, onProgress]);

  // 取消下载
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setState(prev => ({ ...prev, status: 'cancelled' }));
  }, []);

  // 重置状态
  const reset = useCallback(() => {
    setState({
      url: '',
      fileName: '',
      status: 'idle',
      progress: 0,
      fileSize: 0,
      downloadedBytes: 0,
      speed: 0,
      remainingTime: 0,
      error: null,
    });
    abortControllerRef.current = null;
  }, []);

  return {
    state,
    download,
    cancel,
    reset,
    isDownloading: state.status === 'downloading' || state.status === 'checking',
  };
}

export default useFileUpload;
