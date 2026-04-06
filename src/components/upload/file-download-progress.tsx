'use client';

import { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  File, 
  CheckCircle2, 
  XCircle, 
  X, 
  Clock, 
  Zap,
  HardDrive,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { 
  downloadFile, 
  DownloadProgress as DownloadProgressType,
  formatFileSize,
  formatTime,
  formatSpeed,
  checkFileAccessible
} from '@/lib/file-download';
import { cn } from '@/lib/utils';

// 下载状态类型
export type DownloadStatus = 'pending' | 'checking' | 'downloading' | 'completed' | 'failed' | 'cancelled';

// 下载项类型
export interface DownloadItem {
  id: string;
  url: string;
  fileName: string;
  status: DownloadStatus;
  progress: number;
  fileSize: number;
  downloadedBytes: number;
  speed: number;
  remainingTime: number;
  error?: string;
  contentType?: string;
}

// 单个下载项属性
export interface FileDownloadProgressProps {
  item: DownloadItem;
  onCancel?: () => void;
  onRetry?: () => void;
  onOpenInNewTab?: () => void;
  showActions?: boolean;
}

/**
 * 单个文件下载进度条组件
 */
export function FileDownloadProgress({
  item,
  onCancel,
  onRetry,
  onOpenInNewTab,
  showActions = true,
}: FileDownloadProgressProps) {
  const {
    fileName,
    status,
    progress,
    fileSize,
    downloadedBytes,
    speed,
    remainingTime,
    error,
    contentType,
  } = item;

  // 状态图标和颜色
  const getStatusDisplay = () => {
    switch (status) {
      case 'completed':
        return {
          icon: <CheckCircle2 className="h-5 w-5 text-green-500" />,
          badge: <Badge variant="default" className="bg-green-500">下载完成</Badge>,
          progressColor: 'bg-green-500',
        };
      case 'failed':
        return {
          icon: <XCircle className="h-5 w-5 text-red-500" />,
          badge: <Badge variant="destructive">下载失败</Badge>,
          progressColor: 'bg-red-500',
        };
      case 'cancelled':
        return {
          icon: <XCircle className="h-5 w-5 text-gray-500" />,
          badge: <Badge variant="secondary">已取消</Badge>,
          progressColor: 'bg-gray-500',
        };
      case 'checking':
        return {
          icon: <RefreshCw className="h-5 w-5 text-primary animate-spin" />,
          badge: <Badge variant="outline">检查中</Badge>,
          progressColor: 'bg-primary',
        };
      case 'downloading':
        return {
          icon: <Download className="h-5 w-5 text-primary animate-bounce" />,
          badge: <Badge variant="default">下载中</Badge>,
          progressColor: 'bg-primary',
        };
      default:
        return {
          icon: <Clock className="h-5 w-5 text-muted-foreground" />,
          badge: <Badge variant="outline">等待中</Badge>,
          progressColor: 'bg-primary',
        };
    }
  };

  const statusDisplay = getStatusDisplay();

  // 获取文件图标
  const getFileIcon = () => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const iconClass = "h-8 w-8";
    
    // 根据文件类型返回不同颜色
    const colorClass = {
      // 文档
      pdf: 'text-red-500',
      doc: 'text-blue-500',
      docx: 'text-blue-500',
      xls: 'text-green-500',
      xlsx: 'text-green-500',
      ppt: 'text-orange-500',
      pptx: 'text-orange-500',
      // 压缩包
      zip: 'text-purple-500',
      rar: 'text-purple-500',
      '7z': 'text-purple-500',
      // 图片
      jpg: 'text-pink-500',
      jpeg: 'text-pink-500',
      png: 'text-pink-500',
      gif: 'text-pink-500',
      // 视频
      mp4: 'text-cyan-500',
      avi: 'text-cyan-500',
      mov: 'text-cyan-500',
    }[ext || ''] || 'text-muted-foreground';

    return <File className={cn(iconClass, colorClass)} />;
  };

  return (
    <Card className={cn(
      "transition-all duration-200",
      status === 'downloading' && "ring-2 ring-primary/20",
      status === 'failed' && "ring-2 ring-red-500/20",
      status === 'completed' && "ring-2 ring-green-500/20"
    )}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* 文件图标 */}
          <div className="flex-shrink-0">
            {getFileIcon()}
          </div>

          {/* 文件信息和进度 */}
          <div className="flex-1 min-w-0">
            {/* 文件名和状态 */}
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-medium truncate" title={fileName}>
                  {fileName}
                </span>
                {statusDisplay.badge}
              </div>
              {statusDisplay.icon}
            </div>

            {/* 进度条 */}
            {(status === 'downloading' || status === 'checking') && (
              <div className="mb-2">
                <Progress 
                  value={progress} 
                  className={cn("h-2")}
                />
              </div>
            )}

            {/* 下载信息 */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              {/* 文件大小 */}
              {fileSize > 0 && (
                <div className="flex items-center gap-1">
                  <HardDrive className="h-4 w-4" />
                  <span>{formatFileSize(fileSize)}</span>
                </div>
              )}

              {/* 已下载 / 进度 */}
              {status === 'downloading' && (
                <span>
                  {formatFileSize(downloadedBytes)} / {formatFileSize(fileSize)} ({progress}%)
                </span>
              )}

              {/* 下载速度 */}
              {status === 'downloading' && speed > 0 && (
                <div className="flex items-center gap-1">
                  <Zap className="h-4 w-4" />
                  <span>{formatSpeed(speed)}</span>
                </div>
              )}

              {/* 剩余时间 */}
              {status === 'downloading' && remainingTime > 0 && (
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>剩余 {formatTime(remainingTime)}</span>
                </div>
              )}

              {/* 完成信息 */}
              {status === 'completed' && (
                <span className="text-green-600">文件已保存到下载文件夹</span>
              )}

              {/* 错误信息 */}
              {status === 'failed' && error && (
                <span className="text-red-600">{error}</span>
              )}
            </div>
          </div>

          {/* 操作按钮 */}
          {showActions && (
            <div className="flex-shrink-0 flex items-center gap-2">
              {/* 在新标签页打开 */}
              {onOpenInNewTab && (status === 'completed' || status === 'failed') && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onOpenInNewTab}
                  title="在新标签页打开"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              )}

              {/* 重试 */}
              {status === 'failed' && onRetry && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onRetry}
                  title="重试"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              )}

              {/* 取消 */}
              {(status === 'downloading' || status === 'pending' || status === 'checking') && onCancel && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onCancel}
                  title="取消"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// 下载管理器属性
export interface DownloadManagerProps {
  onGetFileUrl: (fileKey: string) => Promise<string>;
  className?: string;
}

/**
 * 文件下载管理器组件
 * 支持多文件下载、进度追踪
 */
export function DownloadManager({
  onGetFileUrl,
  className,
}: DownloadManagerProps) {
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const abortControllers = useRef<Map<string, AbortController>>(new Map());

  // 开始下载
  const startDownload = useCallback(async (
    url: string,
    fileName: string,
    fileKey?: string
  ) => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const controller = new AbortController();
    abortControllers.current.set(id, controller);

    // 添加下载项
    const newItem: DownloadItem = {
      id,
      url,
      fileName,
      status: 'checking',
      progress: 0,
      fileSize: 0,
      downloadedBytes: 0,
      speed: 0,
      remainingTime: 0,
    };

    setDownloads(prev => [...prev, newItem]);

    // 检查文件是否可访问
    const checkResult = await checkFileAccessible(url);
    
    if (!checkResult.accessible) {
      setDownloads(prev => prev.map(item => 
        item.id === id ? {
          ...item,
          status: 'failed' as const,
          error: checkResult.error || '文件无法访问',
        } : item
      ));
      return;
    }

    // 更新文件信息
    setDownloads(prev => prev.map(item => 
      item.id === id ? {
        ...item,
        status: 'downloading' as const,
        fileSize: checkResult.fileSize || 0,
        contentType: checkResult.contentType,
      } : item
    ));

    // 开始下载
    await downloadFile(url, {
      fileName,
      signal: controller.signal,
      onProgress: (progress: DownloadProgressType) => {
        setDownloads(prev => prev.map(item => 
          item.id === id ? {
            ...item,
            progress: progress.progress,
            downloadedBytes: progress.downloadedBytes,
            speed: progress.speed,
            remainingTime: progress.remainingTime,
            status: progress.status as DownloadItem['status'],
          } : item
        ));
      },
      onComplete: () => {
        abortControllers.current.delete(id);
      },
      onError: (error) => {
        setDownloads(prev => prev.map(item => 
          item.id === id ? {
            ...item,
            status: 'failed' as const,
            error: error.message,
          } : item
        ));
        abortControllers.current.delete(id);
      },
    });
  }, []);

  // 取消下载
  const cancelDownload = useCallback((id: string) => {
    const controller = abortControllers.current.get(id);
    if (controller) {
      controller.abort();
      abortControllers.current.delete(id);
    }

    setDownloads(prev => prev.map(item => 
      item.id === id ? { ...item, status: 'cancelled' as const } : item
    ));
  }, []);

  // 重试下载
  const retryDownload = useCallback((id: string) => {
    const item = downloads.find(d => d.id === id);
    if (item) {
      // 移除旧项
      setDownloads(prev => prev.filter(d => d.id !== id));
      // 重新开始下载
      startDownload(item.url, item.fileName);
    }
  }, [downloads, startDownload]);

  // 清除已完成
  const clearCompleted = useCallback(() => {
    setDownloads(prev => prev.filter(item => 
      item.status !== 'completed' && item.status !== 'cancelled'
    ));
  }, []);

  // 清除所有
  const clearAll = useCallback(() => {
    // 取消所有正在下载的任务
    abortControllers.current.forEach(controller => controller.abort());
    abortControllers.current.clear();
    setDownloads([]);
  }, []);

  return {
    downloads,
    startDownload,
    cancelDownload,
    retryDownload,
    clearCompleted,
    clearAll,
    DownloadUI: () => (
      <div className={cn("space-y-4", className)}>
        {downloads.length > 0 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {downloads.length} 个下载任务
            </div>
            <div className="flex gap-2">
              {downloads.some(d => d.status === 'completed') && (
                <Button variant="ghost" size="sm" onClick={clearCompleted}>
                  清除已完成
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={clearAll}>
                清除全部
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {downloads.map(item => (
            <FileDownloadProgress
              key={item.id}
              item={item}
              onCancel={() => cancelDownload(item.id)}
              onRetry={() => retryDownload(item.id)}
              onOpenInNewTab={() => window.open(item.url, '_blank')}
            />
          ))}
        </div>
      </div>
    ),
  };
}

export default FileDownloadProgress;
