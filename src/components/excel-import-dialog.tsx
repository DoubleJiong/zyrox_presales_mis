'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Download,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';

// 导入结果
export interface ImportResult {
  success: boolean;
  total: number;
  succeeded: number;
  failed: number;
  errors: ImportError[];
}

// 导入错误
export interface ImportError {
  row: number;
  field: string;
  message: string;
  value?: any;
}

// 字段映射配置
export interface FieldMapping {
  excelColumn: string;
  systemField: string;
  required: boolean;
  type?: 'string' | 'number' | 'date' | 'enum';
  enumValues?: string[];
  transformer?: (value: any) => any;
}

// 导入配置
export interface ImportConfig {
  entityName: string; // 实体名称，如"项目"、"客户"
  fieldMappings: FieldMapping[];
  templateUrl?: string; // 模板下载地址
  maxRows?: number; // 最大导入行数
}

// Excel 导入对话框属性
export interface ExcelImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: ImportConfig;
  onImport: (data: Record<string, any>[]) => Promise<ImportResult>;
  onSuccess?: () => void;
}

export function ExcelImportDialog({
  open,
  onOpenChange,
  config,
  onImport,
  onSuccess,
}: ExcelImportDialogProps) {
  const [file, setFile] = React.useState<File | null>(null);
  const [parsedData, setParsedData] = React.useState<Record<string, any>[] | null>(null);
  const [validationErrors, setValidationErrors] = React.useState<ImportError[]>([]);
  const [importing, setImporting] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [result, setResult] = React.useState<ImportResult | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const maxRows = config.maxRows || 500;

  // 重置状态
  const resetState = () => {
    setFile(null);
    setParsedData(null);
    setValidationErrors([]);
    setImporting(false);
    setProgress(0);
    setResult(null);
  };

  // 关闭对话框时重置
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetState();
    }
    onOpenChange(newOpen);
  };

  // 文件选择处理
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // 验证文件类型
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];
    if (!validTypes.includes(selectedFile.type)) {
      setValidationErrors([
        { row: 0, field: '文件', message: '请上传 Excel 文件 (.xlsx 或 .xls)' },
      ]);
      return;
    }

    setFile(selectedFile);
    setValidationErrors([]);
    setResult(null);

    try {
      const data = await parseExcelFile(selectedFile);
      const errors = validateData(data);
      setValidationErrors(errors);
      setParsedData(data);
    } catch (error) {
      setValidationErrors([
        { row: 0, field: '文件', message: '文件解析失败，请检查文件格式' },
      ]);
    }
  };

  // 解析 Excel 文件
  const parseExcelFile = async (file: File): Promise<Record<string, any>[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });
          resolve(jsonData as Record<string, any>[]);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsBinaryString(file);
    });
  };

  // 验证数据
  const validateData = (data: Record<string, any>[]): ImportError[] => {
    const errors: ImportError[] = [];

    if (data.length === 0) {
      errors.push({ row: 0, field: '数据', message: '文件中没有数据' });
      return errors;
    }

    if (data.length > maxRows) {
      errors.push({
        row: 0,
        field: '数据',
        message: `数据行数超过限制（最多 ${maxRows} 行）`,
      });
      return errors;
    }

    data.forEach((row, rowIndex) => {
      config.fieldMappings.forEach((mapping) => {
        const value = row[mapping.excelColumn];

        // 必填验证
        if (mapping.required && (value === undefined || value === null || value === '')) {
          errors.push({
            row: rowIndex + 2, // Excel 行号（加1为表头，加1为索引从0开始）
            field: mapping.excelColumn,
            message: `${mapping.excelColumn} 不能为空`,
            value,
          });
          return;
        }

        if (value === undefined || value === null || value === '') return;

        // 类型验证
        switch (mapping.type) {
          case 'number':
            if (isNaN(Number(value))) {
              errors.push({
                row: rowIndex + 2,
                field: mapping.excelColumn,
                message: `${mapping.excelColumn} 必须是数字`,
                value,
              });
            }
            break;
          case 'enum':
            if (mapping.enumValues && !mapping.enumValues.includes(String(value))) {
              errors.push({
                row: rowIndex + 2,
                field: mapping.excelColumn,
                message: `${mapping.excelColumn} 必须是: ${mapping.enumValues.join(', ')}`,
                value,
              });
            }
            break;
          case 'date':
            if (isNaN(Date.parse(String(value)))) {
              errors.push({
                row: rowIndex + 2,
                field: mapping.excelColumn,
                message: `${mapping.excelColumn} 必须是有效日期`,
                value,
              });
            }
            break;
        }
      });
    });

    return errors;
  };

  // 执行导入
  const handleImport = async () => {
    if (!parsedData || validationErrors.length > 0) return;

    setImporting(true);
    setProgress(0);

    try {
      // 转换数据
      const transformedData = parsedData.map((row) => {
        const newItem: Record<string, any> = {};
        config.fieldMappings.forEach((mapping) => {
          const value = row[mapping.excelColumn];
          if (mapping.transformer) {
            newItem[mapping.systemField] = mapping.transformer(value);
          } else {
            newItem[mapping.systemField] = value;
          }
        });
        return newItem;
      });

      // 模拟进度更新
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      const importResult = await onImport(transformedData);

      clearInterval(progressInterval);
      setProgress(100);
      setResult(importResult);

      if (importResult.success && importResult.failed === 0) {
        setTimeout(() => {
          onSuccess?.();
          handleOpenChange(false);
        }, 1500);
      }
    } catch (error) {
      setResult({
        success: false,
        total: parsedData.length,
        succeeded: 0,
        failed: parsedData.length,
        errors: [{ row: 0, field: '导入', message: '导入过程中发生错误' }],
      });
    } finally {
      setImporting(false);
    }
  };

  // 下载模板
  const handleDownloadTemplate = () => {
    if (config.templateUrl) {
      window.open(config.templateUrl, '_blank');
    } else {
      // 生成默认模板
      const headers = config.fieldMappings.map((m) => m.excelColumn);
      const ws = XLSX.utils.aoa_to_sheet([headers]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
      XLSX.writeFile(wb, `${config.entityName}导入模板.xlsx`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>导入{config.entityName}</DialogTitle>
          <DialogDescription>
            上传 Excel 文件批量导入{config.entityName}数据，支持 .xlsx 和 .xls 格式
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 文件上传区域 */}
          {!parsedData && !result && (
            <div
              className={cn(
                'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
                'hover:border-primary hover:bg-muted/50',
                file && 'border-primary bg-muted/50'
              )}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleFileSelect}
              />
              {file ? (
                <div className="flex items-center justify-center gap-2">
                  <FileSpreadsheet className="h-8 w-8 text-primary" />
                  <div className="text-left">
                    <p className="font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground">
                    点击或拖拽文件到此处上传
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    最多支持 {maxRows} 行数据
                  </p>
                </>
              )}
            </div>
          )}

          {/* 验证错误 */}
          {validationErrors.length > 0 && !importing && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span className="font-medium">发现 {validationErrors.length} 个错误</span>
              </div>
              <ScrollArea className="h-40 w-full rounded border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">行号</TableHead>
                      <TableHead className="w-24">字段</TableHead>
                      <TableHead>错误信息</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {validationErrors.slice(0, 50).map((error, index) => (
                      <TableRow key={index}>
                        <TableCell>{error.row || '-'}</TableCell>
                        <TableCell>{error.field}</TableCell>
                        <TableCell className="text-destructive">
                          {error.message}
                        </TableCell>
                      </TableRow>
                    ))}
                    {validationErrors.length > 50 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground">
                          还有 {validationErrors.length - 50} 个错误未显示...
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          )}

          {/* 解析成功预览 */}
          {parsedData && validationErrors.length === 0 && !result && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="font-medium">解析成功，共 {parsedData.length} 条数据</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFile(null);
                    setParsedData(null);
                  }}
                >
                  重新选择
                </Button>
              </div>
              <ScrollArea className="h-48 w-full rounded border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {config.fieldMappings.map((mapping) => (
                        <TableHead key={mapping.systemField}>
                          {mapping.excelColumn}
                          {mapping.required && (
                            <span className="text-destructive ml-1">*</span>
                          )}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.slice(0, 10).map((row, index) => (
                      <TableRow key={index}>
                        {config.fieldMappings.map((mapping) => (
                          <TableCell key={mapping.systemField}>
                            {String(row[mapping.excelColumn] || '-').slice(0, 30)}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                    {parsedData.length > 10 && (
                      <TableRow>
                        <TableCell
                          colSpan={config.fieldMappings.length}
                          className="text-center text-muted-foreground"
                        >
                          还有 {parsedData.length - 10} 条数据未显示...
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          )}

          {/* 导入进度 */}
          {importing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>正在导入...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          {/* 导入结果 */}
          {result && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                {result.success && result.failed === 0 ? (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-medium">导入成功</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-yellow-600">
                    <AlertCircle className="h-5 w-5" />
                    <span className="font-medium">部分导入成功</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">总计: {result.total}</Badge>
                  <Badge variant="outline" className="bg-green-500 text-white">
                    成功: {result.succeeded}
                  </Badge>
                  {result.failed > 0 && (
                    <Badge variant="destructive">失败: {result.failed}</Badge>
                  )}
                </div>
              </div>

              {result.errors.length > 0 && (
                <ScrollArea className="h-40 w-full rounded border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">行号</TableHead>
                        <TableHead className="w-24">字段</TableHead>
                        <TableHead>错误信息</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.errors.map((error, index) => (
                        <TableRow key={index}>
                          <TableCell>{error.row || '-'}</TableCell>
                          <TableCell>{error.field}</TableCell>
                          <TableCell className="text-destructive">
                            {error.message}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleDownloadTemplate}>
            <Download className="h-4 w-4 mr-2" />
            下载模板
          </Button>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            取消
          </Button>
          {parsedData && validationErrors.length === 0 && !result && (
            <Button onClick={handleImport} disabled={importing}>
              {importing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              开始导入
            </Button>
          )}
          {result && (
            <Button onClick={() => handleOpenChange(false)}>
              完成
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
