'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Upload, FileText, Loader2, CheckCircle2, AlertCircle, 
  AlertTriangle, ChevronRight, Sparkles, HardDrive, Zap, Clock
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  uploadFileWithChunks, 
  UploadProgress as ChunkUploadProgress,
  formatFileSize,
  formatSpeed,
  formatTime,
} from '@/lib/chunk-upload';

// 大文件阈值：10MB以上使用分片上传
const CHUNK_UPLOAD_THRESHOLD = 10 * 1024 * 1024;

interface ContractUploadProps {
  onAnalyzeComplete: (data: ContractAnalyzeResult) => void;
}

interface MissingField {
  key: string;
  label: string;
  required: boolean;
  section: string;
  sectionId: string;
}

interface ContractAnalyzeResult {
  extractedInfo: Record<string, any>;
  missingFields: MissingField[];
  missingRequiredFields: MissingField[];
  groupedMissingFields: Record<string, MissingField[]>;
  summary: {
    totalFields: number;
    recognizedFields: number;
    missingCount: number;
    missingRequiredCount: number;
  };
}

type UploadStatus = 'idle' | 'uploading' | 'analyzing' | 'success' | 'partial' | 'error';

export function ContractUpload({ onAnalyzeComplete }: ContractUploadProps) {
  const { toast } = useToast();
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileName, setFileName] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [analyzeResult, setAnalyzeResult] = useState<ContractAnalyzeResult | null>(null);
  const [showMissingFields, setShowMissingFields] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 分片上传进度状态
  const [chunkProgress, setChunkProgress] = useState<{
    uploadedBytes: number;
    speed: number;
    remainingTime: number;
  }>({
    uploadedBytes: 0,
    speed: 0,
    remainingTime: 0,
  });
  const [useChunkUpload, setUseChunkUpload] = useState(false);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        variant: 'destructive',
        title: '文件格式不支持',
        description: '请上传 PDF、JPG、PNG、GIF 或 WebP 格式的文件',
      });
      return;
    }

    // 验证文件大小 (50MB)
    if (file.size > 50 * 1024 * 1024) {
      toast({
        variant: 'destructive',
        title: '文件过大',
        description: '文件大小不能超过 50MB',
      });
      return;
    }

    setFileName(file.name);
    setErrorMessage('');
    setAnalyzeResult(null);
    setShowMissingFields(false);
    
    // 判断是否使用分片上传（大文件）
    const shouldUseChunkUpload = file.size >= CHUNK_UPLOAD_THRESHOLD;
    setUseChunkUpload(shouldUseChunkUpload);
    
    try {
      // Step 1: 上传文件
      setStatus('uploading');
      setUploadProgress(0);
      setChunkProgress({ uploadedBytes: 0, speed: 0, remainingTime: 0 });

      // 使用 XMLHttpRequest 以获取真实的上传进度
      const uploadResult = await new Promise<any>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const formData = new FormData();
        formData.append('file', file);

        // 上传进度回调
        const startTime = Date.now();
        let lastProgressTime = startTime;
        let lastProgressBytes = 0;

        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const progress = Math.round((e.loaded / e.total) * 100);
            setUploadProgress(progress);
            
            // 计算速度和剩余时间
            const now = Date.now();
            const timeDiff = (now - lastProgressTime) / 1000;
            const bytesDiff = e.loaded - lastProgressBytes;
            
            if (timeDiff > 0.5) { // 每0.5秒更新一次
              const speed = bytesDiff / timeDiff;
              const remainingBytes = e.total - e.loaded;
              const remainingTime = speed > 0 ? remainingBytes / speed : 0;
              
              setChunkProgress({
                uploadedBytes: e.loaded,
                speed,
                remainingTime,
              });
              
              lastProgressTime = now;
              lastProgressBytes = e.loaded;
            }
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              resolve(JSON.parse(xhr.responseText));
            } catch {
              reject(new Error('解析响应失败'));
            }
          } else {
            try {
              const errorData = JSON.parse(xhr.responseText);
              const errorMsg = typeof errorData.error === 'string'
                ? errorData.error
                : (errorData.error?.message || '文件上传失败');
              reject(new Error(errorMsg));
            } catch {
              reject(new Error(`上传失败: ${xhr.status}`));
            }
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('网络错误，请检查网络连接'));
        });

        xhr.addEventListener('abort', () => {
          reject(new Error('上传已取消'));
        });

        xhr.open('POST', '/api/contracts/upload');
        xhr.send(formData);
      });

      if (!uploadResult.success) {
        const errorMsg = typeof uploadResult.error === 'string'
          ? uploadResult.error
          : (uploadResult.error?.message || '文件上传失败');
        throw new Error(errorMsg);
      }

      setUploadProgress(60);

      // 检查是否可以进行AI分析
      console.log('[合同上传] 上传结果:', {
        canAnalyze: uploadResult.data.canAnalyze,
        analyzeMode: uploadResult.data.analyzeMode,
        hasBase64Url: !!uploadResult.data.base64Url,
        hasPdfText: !!uploadResult.data.pdfText,
      });
      
      if (!uploadResult.data.canAnalyze) {
        // 无法进行AI分析
        setUploadProgress(100);
        setStatus('success');
        toast({
          title: '文件上传成功',
          description: '文件内容无法识别，请手动填写合同信息',
        });
        return;
      }

      // Step 2: AI分析
      setStatus('analyzing');
      setUploadProgress(80);

      // 构建分析请求参数
      const analyzeParams: Record<string, any> = {
        fileType: uploadResult.data.fileType,
        analyzeMode: uploadResult.data.analyzeMode,
      };
      
      // 根据分析模式传递不同的数据
      if (uploadResult.data.analyzeMode === 'text') {
        analyzeParams.pdfText = uploadResult.data.pdfText;
      } else {
        analyzeParams.base64Url = uploadResult.data.base64Url;
        analyzeParams.fileUrl = uploadResult.data.signedUrl;
      }
      
      console.log('[合同上传] 开始AI分析，参数:', {
        fileType: analyzeParams.fileType,
        analyzeMode: analyzeParams.analyzeMode,
        hasBase64Url: !!analyzeParams.base64Url,
        hasFileUrl: !!analyzeParams.fileUrl,
        hasPdfText: !!analyzeParams.pdfText,
      });

      const analyzeResponse = await fetch('/api/contracts/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(analyzeParams),
      });

      const analyzeResult = await analyzeResponse.json();

      if (!analyzeResult.success) {
        // error 可能是字符串或 { code, message } 对象
        const errorMsg = typeof analyzeResult.error === 'string'
          ? analyzeResult.error
          : (analyzeResult.error?.message || '合同分析失败');
        throw new Error(errorMsg);
      }

      setUploadProgress(100);
      setAnalyzeResult(analyzeResult.data);

      // 根据识别结果设置状态
      const { missingRequiredFields, summary } = analyzeResult.data;
      if (missingRequiredFields.length > 0) {
        setStatus('partial');
        setShowMissingFields(true);
      } else {
        setStatus('success');
      }

      // 回调填充表单
      onAnalyzeComplete(analyzeResult.data);

      // 显示提示
      if (missingRequiredFields.length > 0) {
        toast({
          title: '部分信息未识别',
          description: `已识别 ${summary.recognizedFields}/${summary.totalFields} 个字段，${missingRequiredFields.length} 个必填项需要手工填写`,
          variant: 'default',
        });
      } else if (analyzeResult.data.missingFields.length > 0) {
        toast({
          title: '合同分析完成',
          description: `已识别 ${summary.recognizedFields}/${summary.totalFields} 个字段，部分非必填项需要手工填写`,
        });
      } else {
        toast({
          title: '合同分析完成',
          description: '所有关键信息已成功识别',
        });
      }

    } catch (error) {
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : '处理失败');
      toast({
        variant: 'destructive',
        title: '处理失败',
        description: error instanceof Error ? error.message : '请稍后重试',
      });
    }

    // 清空文件输入
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      element.classList.add('ring-2', 'ring-primary', 'ring-offset-2');
      setTimeout(() => {
        element.classList.remove('ring-2', 'ring-primary', 'ring-offset-2');
      }, 3000);
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'uploading':
      case 'analyzing':
        return <Loader2 className="h-8 w-8 animate-spin text-primary" />;
      case 'success':
        return <CheckCircle2 className="h-8 w-8 text-green-500" />;
      case 'partial':
        return <AlertTriangle className="h-8 w-8 text-amber-500" />;
      case 'error':
        return <AlertCircle className="h-8 w-8 text-destructive" />;
      default:
        return <Upload className="h-8 w-8 text-muted-foreground" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'uploading':
        return '正在上传文件...';
      case 'analyzing':
        return '正在AI分析合同内容...';
      case 'success':
        return `分析完成！已识别 ${analyzeResult?.summary.recognizedFields}/${analyzeResult?.summary.totalFields} 个字段`;
      case 'partial':
        return `部分识别成功，${analyzeResult?.missingRequiredFields.length} 个必填项需手工填写`;
      case 'error':
        return errorMessage || '处理失败';
      default:
        return '点击或拖拽上传合同文件';
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border-dashed">
        <CardContent className="p-6">
          <div className="flex items-center gap-6">
            {/* 上传区域 */}
            <div
              onClick={handleClick}
              className={`flex-1 flex flex-col items-center justify-center p-4 rounded-lg cursor-pointer transition-colors
                ${status === 'idle' ? 'hover:bg-muted/50' : 'pointer-events-none'}
                ${status === 'error' ? 'bg-destructive/5' : ''}
                ${status === 'partial' ? 'bg-amber-50 dark:bg-amber-950/20' : ''}`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.gif,.webp"
                onChange={handleFileSelect}
                className="hidden"
              />
              {getStatusIcon()}
              <p className="mt-2 text-sm text-muted-foreground text-center">
                {getStatusText()}
              </p>
              {status === 'idle' && (
                <p className="mt-1 text-xs text-muted-foreground">
                  支持 PDF、JPG、PNG 格式，最大 10MB
                </p>
              )}
            </div>

            {/* 进度和文件信息 */}
            {(status !== 'idle' || fileName) && (
              <div className="w-56 space-y-2">
                {fileName && (
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate flex-1" title={fileName}>
                      {fileName}
                    </span>
                  </div>
                )}
                
                {(status === 'uploading' || status === 'analyzing') && (
                  <div className="space-y-2">
                    <Progress value={uploadProgress} className="h-2" />
                    
                    {/* 大文件上传详情 */}
                    {useChunkUpload && status === 'uploading' && chunkProgress.speed > 0 && (
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <HardDrive className="h-3 w-3" />
                            <span>{formatFileSize(chunkProgress.uploadedBytes)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Zap className="h-3 w-3" />
                            <span>{formatSpeed(chunkProgress.speed)}</span>
                          </div>
                        </div>
                        {chunkProgress.remainingTime > 0 && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>剩余 {formatTime(chunkProgress.remainingTime)}</span>
                          </div>
                        )}
                      </div>
                    )}
                    
                    <p className="text-xs text-muted-foreground text-right">
                      {status === 'analyzing' ? 'AI分析中...' : `${uploadProgress}%`}
                    </p>
                  </div>
                )}

                {(status === 'error' || status === 'partial') && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      setStatus('idle');
                      setUploadProgress(0);
                      setFileName('');
                      setErrorMessage('');
                      setAnalyzeResult(null);
                      setShowMissingFields(false);
                    }}
                  >
                    重新上传
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 未识别字段提醒 */}
      {status === 'partial' && analyzeResult && showMissingFields && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 space-y-3">
                <div>
                  <h4 className="font-medium text-amber-800 dark:text-amber-200">
                    以下信息未能识别，请手工填写
                  </h4>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                    AI已识别 {analyzeResult.summary.recognizedFields}/{analyzeResult.summary.totalFields} 个字段，
                    {analyzeResult.missingRequiredFields.length > 0 && (
                      <span className="font-medium text-amber-800 dark:text-amber-200">
                        {analyzeResult.missingRequiredFields.length} 个必填项
                      </span>
                    )}
                    需要您补充完善
                  </p>
                </div>

                {/* 按区块分组显示未识别字段 */}
                <div className="space-y-2">
                  {Object.entries(analyzeResult.groupedMissingFields).map(([section, fields]) => (
                    <div key={section} className="space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium text-amber-800 dark:text-amber-200">{section}</span>
                        <Badge variant="outline" className="text-xs border-amber-300 text-amber-700 dark:border-amber-600 dark:text-amber-300">
                          {fields.length} 项
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-2 ml-2">
                        {fields.map((field) => (
                          <Button
                            key={field.key}
                            variant="outline"
                            size="sm"
                            className={`h-7 text-xs gap-1 
                              ${field.required 
                                ? 'border-red-300 text-red-700 hover:bg-red-50 dark:border-red-600 dark:text-red-300 dark:hover:bg-red-950/30' 
                                : 'border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-600 dark:text-amber-300 dark:hover:bg-amber-900/30'
                              }`}
                            onClick={() => scrollToSection(field.sectionId)}
                          >
                            {field.required && <span className="text-red-500">*</span>}
                            {field.label}
                            <ChevronRight className="h-3 w-3" />
                          </Button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    点击字段名称可快速定位到对应表单位置
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 全部识别成功的提示 */}
      {status === 'success' && analyzeResult && (
        <Card className="border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              <div>
                <h4 className="font-medium text-green-800 dark:text-green-200">
                  合同信息识别完成
                </h4>
                <p className="text-sm text-green-700 dark:text-green-300">
                  已成功识别 {analyzeResult.summary.recognizedFields} 个字段，
                  {analyzeResult.summary.missingCount > 0 && (
                    <span>还有 {analyzeResult.summary.missingCount} 个非必填项可按需补充</span>
                  )}
                  {analyzeResult.summary.missingCount === 0 && (
                    <span>所有关键字段均已填充</span>
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
