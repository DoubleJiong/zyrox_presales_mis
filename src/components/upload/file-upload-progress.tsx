'use client';

import { useState, useEffect, useCallback } from 'react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  File, 
  CheckCircle2, 
  XCircle, 
  Pause, 
  Play, 
  X, 
  Clock, 
  Zap,
  HardDrive
} from 'lucide-react';
import { formatFileSize, formatTime, formatSpeed } from '@/lib/chunk-upload';
import { cn } from '@/lib/utils';

// 上传状态类型
export type UploadStatus = 'pending' | 'uploading' | 'paused' | 'completed' | 'failed' | 'cancelled';

// 上传文件项类型
export interface UploadFileItem {
  id: string;
  file: File;
  status: UploadStatus;
  progress: number;
  uploadedBytes: number;
  speed: number;
  remainingTime: number;
  error?: string;
}

// 单个文件上传进度条属性
export interface FileUploadProgressProps {
  item: UploadFileItem;
  onCancel?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onRetry?: () => void;
  showActions?: boolean;
}

/**
 * 单个文件上传进度条组件
 */
export function FileUploadProgress({
  item,
  onCancel,
  onPause,
  onResume,
  onRetry,
  showActions = true,
}: FileUploadProgressProps) {
  const {
    file,
    status,
    progress,
    uploadedBytes,
    speed,
    remainingTime,
    error,
  } = item;

  // 状态图标和颜色
  const getStatusDisplay = () => {
    switch (status) {
      case 'completed':
        return {
          icon: <CheckCircle2 className="h-5 w-5 text-green-500" />,
          badge: <Badge variant="default" className="bg-green-500">上传完成</Badge>,
          progressColor: 'bg-green-500',
        };
      case 'failed':
        return {
          icon: <XCircle className="h-5 w-5 text-red-500" />,
          badge: <Badge variant="destructive">上传失败</Badge>,
          progressColor: 'bg-red-500',
        };
      case 'paused':
        return {
          icon: <Pause className="h-5 w-5 text-amber-500" />,
          badge: <Badge variant="outline" className="border-amber-500 text-amber-500">已暂停</Badge>,
          progressColor: 'bg-amber-500',
        };
      case 'cancelled':
        return {
          icon: <XCircle className="h-5 w-5 text-gray-500" />,
          badge: <Badge variant="secondary">已取消</Badge>,
          progressColor: 'bg-gray-500',
        };
      case 'uploading':
        return {
          icon: <Upload className="h-5 w-5 text-primary animate-pulse" />,
          badge: <Badge variant="default">上传中</Badge>,
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
    const ext = file.name.split('.').pop()?.toLowerCase();
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
      status === 'uploading' && "ring-2 ring-primary/20",
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
                <span className="font-medium truncate" title={file.name}>
                  {file.name}
                </span>
                {statusDisplay.badge}
              </div>
              {statusDisplay.icon}
            </div>

            {/* 进度条 */}
            {(status === 'uploading' || status === 'paused') && (
              <div className="mb-2">
                <Progress 
                  value={progress} 
                  className={cn("h-2", status === 'paused' && "opacity-70")}
                />
              </div>
            )}

            {/* 上传信息 */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              {/* 文件大小 */}
              <div className="flex items-center gap-1">
                <HardDrive className="h-4 w-4" />
                <span>{formatFileSize(file.size)}</span>
              </div>

              {/* 已上传 / 进度 */}
              {(status === 'uploading' || status === 'paused') && (
                <span>
                  {formatFileSize(uploadedBytes)} / {formatFileSize(file.size)} ({progress}%)
                </span>
              )}

              {/* 上传速度 */}
              {status === 'uploading' && speed > 0 && (
                <div className="flex items-center gap-1">
                  <Zap className="h-4 w-4" />
                  <span>{formatSpeed(speed)}</span>
                </div>
              )}

              {/* 剩余时间 */}
              {status === 'uploading' && remainingTime > 0 && (
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>剩余 {formatTime(remainingTime)}</span>
                </div>
              )}

              {/* 完成信息 */}
              {status === 'completed' && (
                <span className="text-green-600">上传完成，文件已保存</span>
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
              {/* 暂停/继续 */}
              {status === 'uploading' && onPause && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onPause}
                  title="暂停"
                >
                  <Pause className="h-4 w-4" />
                </Button>
              )}
              {status === 'paused' && onResume && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onResume}
                  title="继续"
                >
                  <Play className="h-4 w-4" />
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
                  <Play className="h-4 w-4" />
                </Button>
              )}

              {/* 取消 */}
              {(status === 'uploading' || status === 'paused' || status === 'pending') && onCancel && (
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

// 批量上传列表属性
export interface UploadListProps {
  items: UploadFileItem[];
  onCancel?: (id: string) => void;
  onPause?: (id: string) => void;
  onResume?: (id: string) => void;
  onRetry?: (id: string) => void;
  onClearCompleted?: () => void;
}

/**
 * 文件上传列表组件
 */
export function UploadList({
  items,
  onCancel,
  onPause,
  onResume,
  onRetry,
  onClearCompleted,
}: UploadListProps) {
  const completedCount = items.filter(item => item.status === 'completed').length;
  const failedCount = items.filter(item => item.status === 'failed').length;
  const uploadingCount = items.filter(item => item.status === 'uploading').length;

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* 统计信息 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>共 {items.length} 个文件</span>
          {uploadingCount > 0 && <span>上传中: {uploadingCount}</span>}
          {completedCount > 0 && <span className="text-green-600">完成: {completedCount}</span>}
          {failedCount > 0 && <span className="text-red-600">失败: {failedCount}</span>}
        </div>
        {completedCount > 0 && onClearCompleted && (
          <Button variant="ghost" size="sm" onClick={onClearCompleted}>
            清除已完成
          </Button>
        )}
      </div>

      {/* 文件列表 */}
      <div className="space-y-2">
        {items.map(item => (
          <FileUploadProgress
            key={item.id}
            item={item}
            onCancel={() => onCancel?.(item.id)}
            onPause={() => onPause?.(item.id)}
            onResume={() => onResume?.(item.id)}
            onRetry={() => onRetry?.(item.id)}
          />
        ))}
      </div>
    </div>
  );
}

// 总体上传进度属性
export interface TotalProgressProps {
  items: UploadFileItem[];
  title?: string;
}

/**
 * 总体上传进度组件
 */
export function TotalProgress({ items, title = '上传进度' }: TotalProgressProps) {
  const totalFiles = items.length;
  const completedFiles = items.filter(item => item.status === 'completed').length;
  const failedFiles = items.filter(item => item.status === 'failed').length;
  
  const totalBytes = items.reduce((sum, item) => sum + item.file.size, 0);
  const uploadedBytes = items.reduce((sum, item) => sum + item.uploadedBytes, 0);
  const totalProgress = totalBytes > 0 ? Math.round((uploadedBytes / totalBytes) * 100) : 0;

  const isAllCompleted = completedFiles === totalFiles;
  const hasFailed = failedFiles > 0;

  return (
    <Card className={cn(
      isAllCompleted && "ring-2 ring-green-500/20",
      hasFailed && !isAllCompleted && "ring-2 ring-red-500/20"
    )}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="font-medium">{title}</span>
          <span className="text-sm text-muted-foreground">
            {completedFiles}/{totalFiles} 文件
          </span>
        </div>

        <Progress value={totalProgress} className="h-3 mb-2" />

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{formatFileSize(uploadedBytes)} / {formatFileSize(totalBytes)}</span>
          <span>{totalProgress}%</span>
        </div>

        {isAllCompleted && (
          <div className="mt-2 text-sm text-green-600 text-center">
            所有文件上传完成
          </div>
        )}

        {hasFailed && !isAllCompleted && (
          <div className="mt-2 text-sm text-red-600 text-center">
            {failedFiles} 个文件上传失败
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default FileUploadProgress;
