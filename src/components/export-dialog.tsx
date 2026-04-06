'use client';

import { useState, useEffect, useCallback } from 'react';
import { Download, FileSpreadsheet, FileText, Loader2, Check, X, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { 
  EXPORT_FIELD_CONFIGS, 
  ExportField, 
  ExportTemplate, 
  DEFAULT_EXPORT_TEMPLATES,
  exportTaskManager,
  ExportTask 
} from '@/lib/export-progress-service';

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'customers' | 'projects' | 'staff';
  title: string;
  totalRecords: number;
  selectedIds?: number[];
  onExport: (config: ExportConfig) => Promise<void>;
}

export interface ExportConfig {
  format: 'xlsx' | 'csv' | 'pdf';
  fields: ExportField[];
  ids?: number[];
  filters?: Record<string, any>;
}

export function ExportDialog({
  open,
  onOpenChange,
  type,
  title,
  totalRecords,
  selectedIds,
  onExport,
}: ExportDialogProps) {
  const [format, setFormat] = useState<'xlsx' | 'csv' | 'pdf'>('xlsx');
  const [fields, setFields] = useState<ExportField[]>([]);
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [template, setTemplate] = useState<string>('default');
  const [activeTab, setActiveTab] = useState<'fields' | 'templates'>('fields');

  // 初始化字段配置
  useEffect(() => {
    const defaultFields = EXPORT_FIELD_CONFIGS[type] || [];
    setFields(defaultFields.map(f => ({ ...f })));
  }, [type]);

  // 监听导出进度
  useEffect(() => {
    if (!taskId) return;

    const interval = setInterval(() => {
      const task = exportTaskManager.getTask(taskId);
      if (task) {
        setProgress(task.progress);
        if (task.status === 'completed' || task.status === 'failed') {
          clearInterval(interval);
          setExporting(false);
          if (task.status === 'completed' && task.fileUrl) {
            // 自动下载文件
            window.open(task.fileUrl, '_blank');
          }
        }
      }
    }, 500);

    return () => clearInterval(interval);
  }, [taskId]);

  // 切换字段可见性
  const toggleField = (key: string) => {
    setFields(prev =>
      prev.map(f => (f.key === key ? { ...f, visible: !f.visible } : f))
    );
  };

  // 全选/取消全选
  const toggleAll = (visible: boolean) => {
    setFields(prev => prev.map(f => ({ ...f, visible })));
  };

  // 选择模板
  const selectTemplate = (templateId: string) => {
    setTemplate(templateId);
    if (templateId === 'default') {
      const defaultFields = EXPORT_FIELD_CONFIGS[type] || [];
      setFields(defaultFields.map(f => ({ ...f })));
    } else {
      const selectedTemplate = DEFAULT_EXPORT_TEMPLATES.find(t => t.id === templateId);
      if (selectedTemplate) {
        setFields(selectedTemplate.fields.map(f => ({ ...f })));
        setFormat(selectedTemplate.format);
      }
    }
  };

  // 开始导出
  const handleExport = async () => {
    const visibleFields = fields.filter(f => f.visible);
    if (visibleFields.length === 0) {
      return;
    }

    setExporting(true);
    setProgress(0);

    try {
      await onExport({
        format,
        fields: visibleFields,
        ids: selectedIds,
      });
      
      setProgress(100);
      setTimeout(() => {
        onOpenChange(false);
        reset();
      }, 1000);
    } catch (error) {
      console.error('Export failed:', error);
      setExporting(false);
    }
  };

  // 重置状态
  const reset = () => {
    setExporting(false);
    setProgress(0);
    setTaskId(null);
  };

  // 取消导出
  const handleCancel = () => {
    if (taskId) {
      exportTaskManager.deleteTask(taskId);
    }
    reset();
    onOpenChange(false);
  };

  const visibleCount = fields.filter(f => f.visible).length;
  const totalRecordsText = selectedIds && selectedIds.length > 0
    ? `已选择 ${selectedIds.length} 条记录`
    : `共 ${totalRecords} 条记录`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            导出{title}
          </DialogTitle>
          <DialogDescription>
            {totalRecordsText}，请选择导出格式和字段
          </DialogDescription>
        </DialogHeader>

        {!exporting ? (
          <>
            {/* 格式选择 */}
            <div className="space-y-3">
              <label className="text-sm font-medium">导出格式</label>
              <div className="flex gap-2">
                <Button
                  variant={format === 'xlsx' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFormat('xlsx')}
                  className="flex-1"
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Excel (XLSX)
                </Button>
                <Button
                  variant={format === 'csv' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFormat('csv')}
                  className="flex-1"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  CSV
                </Button>
              </div>
            </div>

            {/* 字段选择 */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'fields' | 'templates')}>
              <TabsList className="w-full">
                <TabsTrigger value="fields" className="flex-1">字段选择</TabsTrigger>
                <TabsTrigger value="templates" className="flex-1">导出模板</TabsTrigger>
              </TabsList>

              <TabsContent value="fields" className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">
                    已选择 {visibleCount}/{fields.length} 个字段
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleAll(true)}
                    >
                      全选
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleAll(false)}
                    >
                      取消全选
                    </Button>
                  </div>
                </div>

                <ScrollArea className="h-60 border rounded-md">
                  <div className="p-2 space-y-1">
                    {fields.map((field) => (
                      <div
                        key={field.key}
                        className={cn(
                          'flex items-center gap-2 p-2 rounded hover:bg-muted/50 cursor-pointer',
                          field.visible && 'bg-muted/30'
                        )}
                        onClick={() => toggleField(field.key)}
                      >
                        <Checkbox
                          checked={field.visible}
                          onCheckedChange={() => toggleField(field.key)}
                        />
                        <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                        <span className="flex-1 text-sm">{field.label}</span>
                        <Badge variant="outline" className="text-xs">
                          {field.width}px
                        </Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="templates" className="mt-4">
                <div className="space-y-2">
                  {DEFAULT_EXPORT_TEMPLATES
                    .filter(t => t.type === type)
                    .map((t) => (
                      <div
                        key={t.id}
                        className={cn(
                          'flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50',
                          template === t.id && 'border-primary bg-primary/5'
                        )}
                        onClick={() => selectTemplate(t.id)}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{t.name}</span>
                            {t.isDefault && (
                              <Badge variant="secondary" className="text-xs">默认</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {t.fields.length} 个字段 · {t.format.toUpperCase()} 格式
                          </p>
                        </div>
                        {template === t.id && (
                          <Check className="h-4 w-4 text-primary" />
                        )}
                      </div>
                    ))}
                  
                  <div
                    className={cn(
                      'flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50',
                      template === 'default' && 'border-primary bg-primary/5'
                    )}
                    onClick={() => selectTemplate('default')}
                  >
                    <div className="flex-1">
                      <span className="font-medium">自定义</span>
                      <p className="text-xs text-muted-foreground mt-1">
                        手动选择导出字段
                      </p>
                    </div>
                    {template === 'default' && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                取消
              </Button>
              <Button
                onClick={handleExport}
                disabled={visibleCount === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                开始导出
              </Button>
            </DialogFooter>
          </>
        ) : (
          /* 导出进度 */
          <div className="py-6 space-y-4">
            <div className="flex flex-col items-center gap-3">
              {progress < 100 ? (
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
              ) : (
                <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                  <Check className="h-6 w-6 text-green-600" />
                </div>
              )}
              
              <div className="text-center">
                <p className="font-medium">
                  {progress < 100 ? '正在导出...' : '导出完成'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {progress < 100 
                    ? `正在处理数据，请勿关闭窗口 (${progress}%)`
                    : '文件已准备就绪，即将开始下载'
                  }
                </p>
              </div>
            </div>

            <Progress value={progress} className="h-2" />

            <div className="flex justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                disabled={progress >= 100}
              >
                <X className="h-4 w-4 mr-2" />
                {progress >= 100 ? '关闭' : '取消导出'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
