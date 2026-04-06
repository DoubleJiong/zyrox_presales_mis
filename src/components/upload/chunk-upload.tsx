'use client';

import { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Upload, 
  FolderOpen, 
  X, 
  AlertCircle,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { 
  uploadFileWithChunks, 
  UploadProgress,
  formatFileSize,
  cancelUpload
} from '@/lib/chunk-upload';
import { 
  FileUploadProgress, 
  UploadFileItem,
  UploadList,
  TotalProgress
} from '@/components/upload/file-upload-progress';
import { cn } from '@/lib/utils';

// 大文件阈值：10MB以上使用分片上传
const CHUNK_UPLOAD_THRESHOLD = 10 * 1024 * 1024;

// 分片上传组件属性
export interface ChunkUploadProps {
  // 目标存储路径
  targetPath: string;
  // 业务关联ID
  solutionId?: number;
  subSchemeId?: number;
  // 允许的文件类型（MIME类型）
  allowedTypes?: string[];
  // 最大文件大小（字节）
  maxFileSize?: number;
  // 是否支持多文件
  multiple?: boolean;
  // 上传完成回调
  onUploadComplete?: (result: { key: string; url: string; fileName: string; fileSize: number }) => void;
  // 上传错误回调
  onUploadError?: (error: Error) => void;
  // 取消上传回调
  onCancel?: () => void;
  // 是否显示描述输入框
  showDescription?: boolean;
  // 描述值
  description?: string;
  // 描述变更回调
  onDescriptionChange?: (description: string) => void;
  // 自定义类名
  className?: string;
}

/**
 * 支持分片上传的文件上传组件
 */
export function ChunkUpload({
  targetPath,
  solutionId,
  subSchemeId,
  allowedTypes = [],
  maxFileSize = 100 * 1024 * 1024, // 默认100MB
  multiple = false,
  onUploadComplete,
  onUploadError,
  onCancel,
  showDescription = false,
  description = '',
  onDescriptionChange,
  className,
}: ChunkUploadProps) {
  // 文件上传状态
  const [uploadItems, setUploadItems] = useState<UploadFileItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  
  // 拖拽状态
  const [isDragging, setIsDragging] = useState(false);
  
  // 文件输入引用
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 上传ID映射（用于取消上传）
  const uploadIdMap = useRef<Map<string, string>>(new Map());

  // 验证文件类型
  const validateFileType = useCallback((file: File): boolean => {
    if (allowedTypes.length === 0) return true;
    return allowedTypes.some(type => {
      if (type.endsWith('/*')) {
        return file.type.startsWith(type.slice(0, -1));
      }
      return file.type === type;
    });
  }, [allowedTypes]);

  // 验证文件大小
  const validateFileSize = useCallback((file: File): boolean => {
    return file.size <= maxFileSize;
  }, [maxFileSize]);

  // 处理文件选择
  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newItems: UploadFileItem[] = [];
    
    Array.from(files).forEach(file => {
      // 验证文件类型
      if (!validateFileType(file)) {
        onUploadError?.(new Error(`不支持的文件类型: ${file.type}`));
        return;
      }

      // 验证文件大小
      if (!validateFileSize(file)) {
        onUploadError?.(new Error(`文件大小超出限制: ${formatFileSize(file.size)} > ${formatFileSize(maxFileSize)}`));
        return;
      }

      const item: UploadFileItem = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file,
        status: 'pending',
        progress: 0,
        uploadedBytes: 0,
        speed: 0,
        remainingTime: 0,
      };

      newItems.push(item);
    });

    if (newItems.length > 0) {
      setUploadItems(prev => multiple ? [...prev, ...newItems] : newItems);
    }
  }, [validateFileType, validateFileSize, maxFileSize, multiple, onUploadError]);

  // 上传单个文件
  const uploadSingleFile = useCallback(async (item: UploadFileItem) => {
    const { file, id } = item;

    try {
      // 更新状态为上传中
      setUploadItems(prev => prev.map(i => 
        i.id === id ? { ...i, status: 'uploading' as const } : i
      ));

      // 根据文件大小选择上传方式
      const useChunkUpload = file.size >= CHUNK_UPLOAD_THRESHOLD;

      const result = await uploadFileWithChunks(file, {
        chunkSize: 5 * 1024 * 1024, // 5MB分片
        concurrency: 3, // 并发数
        targetPath,
        solutionId,
        subSchemeId,
        onProgress: (progress: UploadProgress) => {
          setUploadItems(prev => prev.map(i => 
            i.id === id ? {
              ...i,
              progress: progress.progress,
              uploadedBytes: progress.uploadedBytes,
              speed: progress.speed,
              remainingTime: progress.remainingTime,
              status: progress.status as UploadFileItem['status'],
            } : i
          ));
        },
      });

      // 保存上传ID
      uploadIdMap.current.set(id, result.key);

      // 更新状态为完成
      setUploadItems(prev => prev.map(i => 
        i.id === id ? { ...i, status: 'completed' as const, progress: 100 } : i
      ));

      // 调用完成回调
      onUploadComplete?.({
        key: result.key,
        url: result.url,
        fileName: file.name,
        fileSize: file.size,
      });

      return result;
    } catch (error) {
      // 更新状态为失败
      setUploadItems(prev => prev.map(i => 
        i.id === id ? { 
          ...i, 
          status: 'failed' as const,
          error: error instanceof Error ? error.message : '上传失败',
        } : i
      ));

      onUploadError?.(error as Error);
      throw error;
    }
  }, [targetPath, solutionId, subSchemeId, onUploadComplete, onUploadError]);

  // 开始上传所有文件
  const handleUpload = useCallback(async () => {
    const pendingItems = uploadItems.filter(item => item.status === 'pending');
    if (pendingItems.length === 0) return;

    setIsUploading(true);

    try {
      // 串行上传（避免并发上传导致资源竞争）
      for (const item of pendingItems) {
        await uploadSingleFile(item);
      }
    } finally {
      setIsUploading(false);
    }
  }, [uploadItems, uploadSingleFile]);

  // 取消上传
  const handleCancel = useCallback((id: string) => {
    const uploadKey = uploadIdMap.current.get(id);
    if (uploadKey) {
      cancelUpload(uploadKey);
    }

    setUploadItems(prev => prev.map(i => 
      i.id === id ? { ...i, status: 'cancelled' as const } : i
    ));
  }, []);

  // 移除文件
  const handleRemove = useCallback((id: string) => {
    setUploadItems(prev => prev.filter(i => i.id !== id));
  }, []);

  // 清除已完成
  const handleClearCompleted = useCallback(() => {
    setUploadItems(prev => prev.filter(i => i.status !== 'completed'));
  }, []);

  // 拖拽事件处理
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

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
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  // 点击选择文件
  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Upload className="h-5 w-5" />
          文件上传
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 拖拽上传区域 */}
        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
            isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
            isUploading && "opacity-50 pointer-events-none"
          )}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={handleClick}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            multiple={multiple}
            accept={allowedTypes.join(',')}
            onChange={(e) => handleFileSelect(e.target.files)}
          />
          
          <div className="flex flex-col items-center gap-2">
            <FolderOpen className="h-12 w-12 text-muted-foreground" />
            <div className="text-lg font-medium">
              {isDragging ? '松开鼠标上传文件' : '拖拽文件到此处上传'}
            </div>
            <div className="text-sm text-muted-foreground">
              或点击选择文件
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              支持最大 {formatFileSize(maxFileSize)} 的文件
              {allowedTypes.length > 0 && (
                <span className="block mt-1">
                  支持格式: {allowedTypes.join(', ')}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 描述输入框 */}
        {showDescription && (
          <div className="space-y-2">
            <Label htmlFor="description">文件描述</Label>
            <Textarea
              id="description"
              placeholder="请输入文件描述（可选）"
              value={description}
              onChange={(e) => onDescriptionChange?.(e.target.value)}
              disabled={isUploading}
              rows={3}
            />
          </div>
        )}

        {/* 总体进度 */}
        {uploadItems.length > 0 && (
          <TotalProgress items={uploadItems} />
        )}

        {/* 文件列表 */}
        {uploadItems.length > 0 && (
          <UploadList
            items={uploadItems}
            onCancel={handleCancel}
            onClearCompleted={handleClearCompleted}
          />
        )}

        {/* 操作按钮 */}
        <div className="flex justify-end gap-2">
          {onCancel && (
            <Button variant="outline" onClick={onCancel} disabled={isUploading}>
              取消
            </Button>
          )}
          
          {uploadItems.some(item => item.status === 'pending') && (
            <Button onClick={handleUpload} disabled={isUploading}>
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  上传中...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  开始上传
                </>
              )}
            </Button>
          )}

          {uploadItems.every(item => item.status === 'completed') && uploadItems.length > 0 && (
            <Button variant="default" className="bg-green-600 hover:bg-green-700">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              上传完成
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default ChunkUpload;
