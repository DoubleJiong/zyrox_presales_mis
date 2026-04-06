'use client';

import { useRef, useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Upload, File, X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useFileUpload, UseFileUploadOptions, UploadStatus } from '@/hooks/use-file-upload';
import { Progress } from '@/components/ui/progress';
import { formatFileSize, formatSpeed, formatTime } from '@/lib/chunk-upload';

// =====================================================
// 类型定义
// =====================================================

export interface SimpleFileUploadProps extends UseFileUploadOptions {
  // 按钮文字
  buttonText?: string;
  // 按钮变体
  buttonVariant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  // 按钮大小
  buttonSize?: 'default' | 'sm' | 'lg' | 'icon';
  // 是否显示进度条
  showProgress?: boolean;
  // 是否显示文件信息
  showFileInfo?: boolean;
  // 是否自动上传（选择文件后自动开始上传）
  autoUpload?: boolean;
  // 自定义类名
  className?: string;
  // 禁用状态
  disabled?: boolean;
  // 接受的文件类型
  accept?: string;
  // 子元素（用于自定义触发器）
  children?: React.ReactNode;
  // 文件选择回调
  onFileSelect?: (file: File) => void;
}

// =====================================================
// 组件实现
// =====================================================

export function SimpleFileUpload({
  buttonText = '选择文件',
  buttonVariant = 'outline',
  buttonSize = 'default',
  showProgress = true,
  showFileInfo = true,
  autoUpload = true,
  className,
  disabled = false,
  accept,
  children,
  onFileSelect,
  ...uploadOptions
}: SimpleFileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const {
    state,
    selectFile,
    upload,
    cancel,
    reset,
    isUploading,
  } = useFileUpload(uploadOptions);

  // 处理文件选择
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const valid = selectFile(file);
      if (valid) {
        onFileSelect?.(file);
        if (autoUpload) {
          upload();
        }
      }
    }
    // 重置 input 以便可以再次选择相同文件
    e.target.value = '';
  }, [selectFile, autoUpload, upload, onFileSelect]);

  // 点击触发文件选择
  const handleClick = useCallback(() => {
    if (!disabled && !isUploading) {
      fileInputRef.current?.click();
    }
  }, [disabled, isUploading]);

  // 取消上传
  const handleCancel = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    cancel();
    reset();
  }, [cancel, reset]);

  // 获取状态图标
  const getStatusIcon = () => {
    switch (state.status) {
      case 'uploading':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Upload className="h-4 w-4" />;
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      {/* 隐藏的文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept={accept}
        onChange={handleFileChange}
        disabled={disabled || isUploading}
      />

      {/* 触发器 */}
      {children ? (
        <div onClick={handleClick} className="cursor-pointer">
          {children}
        </div>
      ) : (
        <Button
          variant={buttonVariant}
          size={buttonSize}
          onClick={handleClick}
          disabled={disabled || isUploading}
        >
          {getStatusIcon()}
          <span className="ml-2">
            {isUploading ? '上传中...' : state.status === 'completed' ? '上传完成' : buttonText}
          </span>
        </Button>
      )}

      {/* 文件信息和进度 */}
      {showFileInfo && state.file && (
        <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
          <File className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{state.file.name}</div>
            <div className="text-xs text-muted-foreground">
              {formatFileSize(state.file.size)}
            </div>
          </div>
          
          {/* 进度信息 */}
          {isUploading && showProgress && (
            <div className="text-xs text-muted-foreground">
              {state.progress}%
            </div>
          )}

          {/* 状态指示 */}
          {state.status === 'completed' && (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          )}
          {state.status === 'failed' && (
            <AlertCircle className="h-4 w-4 text-red-500" />
          )}
          
          {/* 取消按钮 */}
          {(isUploading || state.status === 'pending') && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handleCancel}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      )}

      {/* 进度条 */}
      {showProgress && isUploading && (
        <div className="space-y-1">
          <Progress value={state.progress} className="h-1" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>
              {formatFileSize(state.uploadedBytes)} / {formatFileSize(state.file?.size || 0)}
            </span>
            {state.speed > 0 && (
              <>
                <span>{formatSpeed(state.speed)}</span>
                <span>剩余 {formatTime(state.remainingTime)}</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* 错误信息 */}
      {state.error && (
        <div className="text-xs text-red-500 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {state.error}
        </div>
      )}
    </div>
  );
}

// =====================================================
// 拖拽上传组件
// =====================================================

export interface DropZoneUploadProps extends UseFileUploadOptions {
  // 提示文字
  promptText?: string;
  // 拖拽时的提示文字
  dragActiveText?: string;
  // 是否显示进度条
  showProgress?: boolean;
  // 是否自动上传
  autoUpload?: boolean;
  // 自定义类名
  className?: string;
  // 禁用状态
  disabled?: boolean;
  // 接受的文件类型
  accept?: string;
  // 子元素
  children?: React.ReactNode;
  // 文件选择回调
  onFileSelect?: (file: File) => void;
}

export function DropZoneUpload({
  promptText = '拖拽文件到此处，或点击选择文件',
  dragActiveText = '松开鼠标上传文件',
  showProgress = true,
  autoUpload = true,
  className,
  disabled = false,
  accept,
  children,
  onFileSelect,
  ...uploadOptions
}: DropZoneUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const {
    state,
    selectFile,
    upload,
    cancel,
    reset,
    isUploading,
  } = useFileUpload(uploadOptions);

  // 处理文件选择
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const valid = selectFile(file);
      if (valid) {
        onFileSelect?.(file);
        if (autoUpload) {
          upload();
        }
      }
    }
    e.target.value = '';
  }, [selectFile, autoUpload, upload, onFileSelect]);

  // 拖拽事件处理
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !isUploading) {
      setIsDragging(true);
    }
  }, [disabled, isUploading]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled || isUploading) return;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      const valid = selectFile(file);
      if (valid) {
        onFileSelect?.(file);
        if (autoUpload) {
          upload();
        }
      }
    }
  }, [disabled, isUploading, selectFile, autoUpload, upload, onFileSelect]);

  const handleClick = useCallback(() => {
    if (!disabled && !isUploading) {
      fileInputRef.current?.click();
    }
  }, [disabled, isUploading]);

  return (
    <div className={cn("space-y-2", className)}>
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept={accept}
        onChange={handleFileChange}
        disabled={disabled || isUploading}
      />

      {/* 拖拽区域 */}
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
          isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
          (disabled || isUploading) && "opacity-50 pointer-events-none"
        )}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        {children || (
          <div className="flex flex-col items-center gap-2">
            <Upload className="h-10 w-10 text-muted-foreground" />
            <div className="text-sm text-muted-foreground">
              {isDragging ? dragActiveText : promptText}
            </div>
            {uploadOptions.maxFileSize && (
              <div className="text-xs text-muted-foreground">
                最大文件大小: {formatFileSize(uploadOptions.maxFileSize)}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 文件信息和进度 */}
      {state.file && (
        <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
          <File className="h-5 w-5 text-muted-foreground flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{state.file.name}</div>
            <div className="text-xs text-muted-foreground">
              {formatFileSize(state.file.size)}
              {isUploading && ` · ${state.progress}%`}
            </div>
            {showProgress && isUploading && (
              <Progress value={state.progress} className="h-1 mt-1" />
            )}
          </div>
          
          {state.status === 'completed' && (
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          )}
          {state.status === 'failed' && (
            <AlertCircle className="h-5 w-5 text-red-500" />
          )}
          
          {(isUploading || state.status === 'pending') && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => {
                e.stopPropagation();
                cancel();
                reset();
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}

      {/* 错误信息 */}
      {state.error && (
        <div className="text-sm text-red-500 flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {state.error}
        </div>
      )}
    </div>
  );
}

export default SimpleFileUpload;
