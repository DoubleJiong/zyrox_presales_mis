/**
 * 版本对比对话框组件
 * 
 * 功能：
 * - 展示版本基本信息对比
 * - 展示文件清单对比
 * - 支持文件内容深度对比（Word/Excel/PPT）
 */

'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  FileText,
  FileSpreadsheet,
  Presentation,
  ChevronDown,
  ChevronRight,
  Plus,
  Minus,
  RefreshCw,
  Loader2,
  File,
  Sheet,
  Layers,
} from 'lucide-react';

interface VersionCompareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  solutionId: number;
  version1Id: number;
  version2Id: number;
  version1Name: string;
  version2Name: string;
}

// 类型定义
interface SolutionChange {
  field: string;
  oldValue: any;
  newValue: any;
}

interface FileChange {
  fileName: string;
  fileType: string;
  fileSize?: number;
  oldSize?: number;
  newSize?: number;
  oldUrl?: string;
  newUrl?: string;
}

interface FileDiff {
  added: FileChange[];
  removed: FileChange[];
  modified: FileChange[];
  unchanged: FileChange[];
}

interface SubSchemeChange {
  subSchemeName: string;
  subSchemeType?: string;
  description?: string;
}

interface SubSchemeDiff {
  added: SubSchemeChange[];
  removed: SubSchemeChange[];
}

interface WordDiff {
  type: 'added' | 'deleted' | 'modified' | 'unchanged';
  paragraphIndex: number;
  oldText?: string;
  newText?: string;
}

interface ExcelCellDiff {
  type: 'added' | 'deleted' | 'modified';
  sheet: string;
  cell: string;
  oldValue?: string | number;
  newValue?: string | number;
}

interface ExcelSheetDiff {
  sheetName: string;
  type: 'added' | 'deleted' | 'modified';
  cellDiffs: ExcelCellDiff[];
  summary: {
    added: number;
    deleted: number;
    modified: number;
  };
}

interface PPTSlideDiff {
  slideIndex: number;
  type: 'added' | 'deleted' | 'modified';
  title?: string;
  changes?: {
    elementId: string;
    oldText?: string;
    newText?: string;
  }[];
}

interface FileContentDiff {
  fileType: 'word' | 'excel' | 'ppt' | 'other';
  fileName: string;
  canCompare: boolean;
  diffs?: WordDiff[] | ExcelSheetDiff[] | PPTSlideDiff[];
  summary?: {
    added: number;
    deleted: number;
    modified: number;
    unchanged: number;
  };
  error?: string;
}

interface CompareResult {
  version1: { id: number; version: string; createdAt: string };
  version2: { id: number; version: string; createdAt: string };
  changes: {
    solution: { added: any[]; removed: any[]; modified: SolutionChange[] };
    subSchemes: SubSchemeDiff;
    files: FileDiff;
    fileContentDiffs: FileContentDiff[];
  };
}

// 文件类型图标
const fileTypeIcons: Record<string, React.ReactNode> = {
  docx: <FileText className="h-4 w-4 text-blue-500" />,
  doc: <FileText className="h-4 w-4 text-blue-500" />,
  xlsx: <FileSpreadsheet className="h-4 w-4 text-green-500" />,
  xls: <FileSpreadsheet className="h-4 w-4 text-green-500" />,
  pptx: <Presentation className="h-4 w-4 text-orange-500" />,
  ppt: <Presentation className="h-4 w-4 text-orange-500" />,
  pdf: <FileText className="h-4 w-4 text-red-500" />,
  default: <File className="h-4 w-4 text-gray-500" />,
};

// 字段名称映射
const fieldNameMap: Record<string, string> = {
  solutionName: '方案名称',
  description: '描述',
  industry: '行业',
  scenario: '场景',
  tags: '标签',
  content: '内容',
};

export function VersionCompareDialog({
  open,
  onOpenChange,
  solutionId,
  version1Id,
  version2Id,
  version1Name,
  version2Name,
}: VersionCompareDialogProps) {
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [includeContent, setIncludeContent] = useState(false);
  const [compareResult, setCompareResult] = useState<CompareResult | null>(null);
  
  // 展开状态
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  const [expandedSheets, setExpandedSheets] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open && version1Id && version2Id) {
      fetchCompareResult();
    }
  }, [open, version1Id, version2Id, includeContent]);

  const fetchCompareResult = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/solutions/${solutionId}/versions/compare?version1=${version1Id}&version2=${version2Id}&includeContent=${includeContent}`
      );
      
      if (response.ok) {
        const data = await response.json();
        setCompareResult(data.data);
      } else {
        const error = await response.json();
        toast({ title: error.error || '对比失败', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Failed to compare versions:', error);
      toast({ title: '对比失败', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const toggleFileExpand = (fileName: string) => {
    setExpandedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(fileName)) {
        next.delete(fileName);
      } else {
        next.add(fileName);
      }
      return next;
    });
  };

  const toggleSheetExpand = (sheetName: string) => {
    setExpandedSheets((prev) => {
      const next = new Set(prev);
      if (next.has(sheetName)) {
        next.delete(sheetName);
      } else {
        next.add(sheetName);
      }
      return next;
    });
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    return fileTypeIcons[ext] || fileTypeIcons.default;
  };

  // 渲染 Word 差异
  const renderWordDiff = (diffs: WordDiff[]) => {
    return (
      <div className="space-y-2">
        {diffs.map((diff, idx) => (
          <div
            key={idx}
            className={`p-2 rounded text-sm ${
              diff.type === 'added'
                ? 'bg-green-50 dark:bg-green-950 border-l-2 border-green-500'
                : diff.type === 'deleted'
                ? 'bg-red-50 dark:bg-red-950 border-l-2 border-red-500'
                : diff.type === 'modified'
                ? 'bg-yellow-50 dark:bg-yellow-950 border-l-2 border-yellow-500'
                : ''
            }`}
          >
            {diff.type === 'added' && (
              <div className="flex items-start gap-2">
                <Plus className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                <span className="text-green-700 dark:text-green-300">{diff.newText}</span>
              </div>
            )}
            {diff.type === 'deleted' && (
              <div className="flex items-start gap-2">
                <Minus className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                <span className="text-red-700 dark:text-red-300 line-through">{diff.oldText}</span>
              </div>
            )}
            {diff.type === 'modified' && (
              <div className="space-y-1">
                <div className="flex items-start gap-2">
                  <Minus className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                  <span className="text-red-700 dark:text-red-300 line-through">{diff.oldText}</span>
                </div>
                <div className="flex items-start gap-2">
                  <Plus className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  <span className="text-green-700 dark:text-green-300">{diff.newText}</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  // 渲染 Excel 差异
  const renderExcelDiff = (diffs: ExcelSheetDiff[]) => {
    return (
      <div className="space-y-3">
        {diffs.map((sheetDiff, idx) => (
          <Collapsible
            key={idx}
            open={expandedSheets.has(sheetDiff.sheetName)}
            onOpenChange={() => toggleSheetExpand(sheetDiff.sheetName)}
          >
            <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 hover:bg-muted rounded">
              {expandedSheets.has(sheetDiff.sheetName) ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <Sheet className="h-4 w-4 text-green-500" />
              <span className="font-medium">{sheetDiff.sheetName}</span>
              <div className="flex items-center gap-2 ml-auto text-xs text-muted-foreground">
                {sheetDiff.summary.added > 0 && (
                  <Badge variant="outline" className="bg-green-50 text-green-700">
                    +{sheetDiff.summary.added}
                  </Badge>
                )}
                {sheetDiff.summary.deleted > 0 && (
                  <Badge variant="outline" className="bg-red-50 text-red-700">
                    -{sheetDiff.summary.deleted}
                  </Badge>
                )}
                {sheetDiff.summary.modified > 0 && (
                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                    ~{sheetDiff.summary.modified}
                  </Badge>
                )}
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="ml-6 mt-2 space-y-1">
                {sheetDiff.cellDiffs.slice(0, 50).map((cell, cellIdx) => (
                  <div
                    key={cellIdx}
                    className={`flex items-center gap-3 p-1.5 rounded text-sm font-mono ${
                      cell.type === 'added'
                        ? 'bg-green-50 dark:bg-green-950'
                        : cell.type === 'deleted'
                        ? 'bg-red-50 dark:bg-red-950'
                        : 'bg-yellow-50 dark:bg-yellow-950'
                    }`}
                  >
                    <span className="w-12 text-muted-foreground">{cell.cell}</span>
                    {cell.type === 'added' && (
                      <span className="text-green-700 dark:text-green-300">{cell.newValue}</span>
                    )}
                    {cell.type === 'deleted' && (
                      <span className="text-red-700 dark:text-red-300 line-through">{cell.oldValue}</span>
                    )}
                    {cell.type === 'modified' && (
                      <>
                        <span className="text-red-700 dark:text-red-300 line-through">{cell.oldValue}</span>
                        <span className="text-muted-foreground">→</span>
                        <span className="text-green-700 dark:text-green-300">{cell.newValue}</span>
                      </>
                    )}
                  </div>
                ))}
                {sheetDiff.cellDiffs.length > 50 && (
                  <div className="text-xs text-muted-foreground text-center py-2">
                    还有 {sheetDiff.cellDiffs.length - 50} 处变更未显示
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>
    );
  };

  // 渲染 PPT 差异
  const renderPPTDiff = (diffs: PPTSlideDiff[]) => {
    return (
      <div className="space-y-3">
        {diffs.map((slideDiff, idx) => (
          <div
            key={idx}
            className={`p-3 rounded border ${
              slideDiff.type === 'added'
                ? 'bg-green-50 dark:bg-green-950 border-green-200'
                : slideDiff.type === 'deleted'
                ? 'bg-red-50 dark:bg-red-950 border-red-200'
                : 'bg-yellow-50 dark:bg-yellow-950 border-yellow-200'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <Layers className="h-4 w-4 text-orange-500" />
              <span className="font-medium">第 {slideDiff.slideIndex} 页</span>
              {slideDiff.title && (
                <span className="text-muted-foreground">- {slideDiff.title}</span>
              )}
              <Badge
                variant="outline"
                className={
                  slideDiff.type === 'added'
                    ? 'bg-green-100 text-green-700'
                    : slideDiff.type === 'deleted'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-yellow-100 text-yellow-700'
                }
              >
                {slideDiff.type === 'added' ? '新增' : slideDiff.type === 'deleted' ? '删除' : '修改'}
              </Badge>
            </div>
            {slideDiff.changes && slideDiff.changes.length > 0 && (
              <div className="ml-6 space-y-1 text-sm">
                {slideDiff.changes.map((change, changeIdx) => (
                  <div key={changeIdx} className="space-y-1">
                    {change.oldText && (
                      <div className="flex items-start gap-2">
                        <Minus className="h-3 w-3 text-red-500 mt-0.5 shrink-0" />
                        <span className="text-red-700 dark:text-red-300 line-through">{change.oldText}</span>
                      </div>
                    )}
                    {change.newText && (
                      <div className="flex items-start gap-2">
                        <Plus className="h-3 w-3 text-green-500 mt-0.5 shrink-0" />
                        <span className="text-green-700 dark:text-green-300">{change.newText}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            版本对比
          </DialogTitle>
          <DialogDescription>
            对比版本 {version1Name} 与 {version2Name} 的差异
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : compareResult ? (
          <ScrollArea className="h-[70vh]">
            <div className="space-y-6 pr-4">
              {/* 摘要统计 */}
              <div className="grid grid-cols-4 gap-4">
                <div className="p-3 bg-red-50 dark:bg-red-950 rounded-lg text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {compareResult.changes.solution.modified.length +
                      (compareResult.changes.subSchemes.added?.length || 0) +
                      (compareResult.changes.subSchemes.removed?.length || 0) +
                      (compareResult.changes.files.added?.length || 0) +
                      (compareResult.changes.files.removed?.length || 0) +
                      (compareResult.changes.files.modified?.length || 0)}
                  </div>
                  <div className="text-xs text-muted-foreground">总变更</div>
                </div>
                <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {(compareResult.changes.files.added?.length || 0) +
                      (compareResult.changes.subSchemes.added?.length || 0)}
                  </div>
                  <div className="text-xs text-muted-foreground">新增</div>
                </div>
                <div className="p-3 bg-red-50 dark:bg-red-950 rounded-lg text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {(compareResult.changes.files.removed?.length || 0) +
                      (compareResult.changes.subSchemes.removed?.length || 0)}
                  </div>
                  <div className="text-xs text-muted-foreground">删除</div>
                </div>
                <div className="p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg text-center">
                  <div className="text-2xl font-bold text-yellow-600">
                    {compareResult.changes.solution.modified.length +
                      (compareResult.changes.files.modified?.length || 0)}
                  </div>
                  <div className="text-xs text-muted-foreground">修改</div>
                </div>
              </div>

              {/* 详细对比 */}
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="basic">基本信息</TabsTrigger>
                  <TabsTrigger value="files">文件变更</TabsTrigger>
                  <TabsTrigger value="content">内容对比</TabsTrigger>
                </TabsList>

                {/* 基本信息对比 */}
                <TabsContent value="basic" className="space-y-4">
                  {/* 方案信息变更 */}
                  {compareResult.changes.solution.modified.length > 0 && (
                    <Card className="p-4">
                      <h4 className="font-medium mb-3">方案信息变更</h4>
                      <div className="space-y-2">
                        {compareResult.changes.solution.modified.map((change, idx) => (
                          <div key={idx} className="p-2 bg-muted rounded text-sm">
                            <div className="text-muted-foreground mb-1">
                              {fieldNameMap[change.field] || change.field}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-red-600 line-through">
                                {JSON.stringify(change.oldValue)}
                              </span>
                              <span className="text-muted-foreground">→</span>
                              <span className="text-green-600">
                                {JSON.stringify(change.newValue)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}

                  {/* 子方案变更 */}
                  {(compareResult.changes.subSchemes.added?.length > 0 ||
                    compareResult.changes.subSchemes.removed?.length > 0) && (
                    <Card className="p-4">
                      <h4 className="font-medium mb-3">子方案变更</h4>
                      <div className="space-y-2">
                        {compareResult.changes.subSchemes.added?.map((sub, idx) => (
                          <div key={`added-${idx}`} className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-950 rounded text-sm">
                            <Plus className="h-4 w-4 text-green-500" />
                            <span className="font-medium">{sub.subSchemeName}</span>
                            {sub.subSchemeType && (
                              <Badge variant="outline">{sub.subSchemeType}</Badge>
                            )}
                          </div>
                        ))}
                        {compareResult.changes.subSchemes.removed?.map((sub, idx) => (
                          <div key={`removed-${idx}`} className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-950 rounded text-sm">
                            <Minus className="h-4 w-4 text-red-500" />
                            <span className="font-medium">{sub.subSchemeName}</span>
                            {sub.subSchemeType && (
                              <Badge variant="outline">{sub.subSchemeType}</Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}

                  {compareResult.changes.solution.modified.length === 0 &&
                    !compareResult.changes.subSchemes.added?.length &&
                    !compareResult.changes.subSchemes.removed?.length && (
                      <div className="text-center py-8 text-muted-foreground">
                        基本信息无变化
                      </div>
                    )}
                </TabsContent>

                {/* 文件变更 */}
                <TabsContent value="files" className="space-y-4">
                  {/* 新增文件 */}
                  {compareResult.changes.files.added?.length > 0 && (
                    <Card className="p-4">
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <Plus className="h-4 w-4 text-green-500" />
                        新增文件 ({compareResult.changes.files.added.length})
                      </h4>
                      <div className="space-y-2">
                        {compareResult.changes.files.added.map((file, idx) => (
                          <div key={idx} className="flex items-center gap-3 p-2 bg-green-50 dark:bg-green-950 rounded text-sm">
                            {getFileIcon(file.fileName)}
                            <span className="font-medium">{file.fileName}</span>
                            <span className="text-muted-foreground">
                              {formatFileSize(file.fileSize)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}

                  {/* 删除文件 */}
                  {compareResult.changes.files.removed?.length > 0 && (
                    <Card className="p-4">
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <Minus className="h-4 w-4 text-red-500" />
                        删除文件 ({compareResult.changes.files.removed.length})
                      </h4>
                      <div className="space-y-2">
                        {compareResult.changes.files.removed.map((file, idx) => (
                          <div key={idx} className="flex items-center gap-3 p-2 bg-red-50 dark:bg-red-950 rounded text-sm">
                            {getFileIcon(file.fileName)}
                            <span className="font-medium line-through">{file.fileName}</span>
                            <span className="text-muted-foreground">
                              {formatFileSize(file.fileSize)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}

                  {/* 修改文件 */}
                  {compareResult.changes.files.modified?.length > 0 && (
                    <Card className="p-4">
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <RefreshCw className="h-4 w-4 text-yellow-500" />
                        修改文件 ({compareResult.changes.files.modified.length})
                      </h4>
                      <div className="space-y-2">
                        {compareResult.changes.files.modified.map((file, idx) => (
                          <div key={idx} className="flex items-center gap-3 p-2 bg-yellow-50 dark:bg-yellow-950 rounded text-sm">
                            {getFileIcon(file.fileName)}
                            <span className="font-medium">{file.fileName}</span>
                            <span className="text-muted-foreground">
                              {formatFileSize(file.oldSize)} → {formatFileSize(file.newSize)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}

                  {compareResult.changes.files.added?.length === 0 &&
                    compareResult.changes.files.removed?.length === 0 &&
                    compareResult.changes.files.modified?.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        文件无变化
                      </div>
                    )}
                </TabsContent>

                {/* 内容对比 */}
                <TabsContent value="content" className="space-y-4">
                  {!includeContent && (
                    <div className="flex items-center justify-between p-4 bg-muted rounded">
                      <span className="text-sm text-muted-foreground">
                        文件内容对比需要额外加载
                      </span>
                      <Button size="sm" onClick={() => setIncludeContent(true)}>
                        加载内容对比
                      </Button>
                    </div>
                  )}

                  {includeContent && compareResult.changes.fileContentDiffs?.length > 0 && (
                    <div className="space-y-3">
                      {compareResult.changes.fileContentDiffs.map((fileDiff, idx) => (
                        <Collapsible
                          key={idx}
                          open={expandedFiles.has(fileDiff.fileName)}
                          onOpenChange={() => toggleFileExpand(fileDiff.fileName)}
                        >
                          <CollapsibleTrigger className="flex items-center gap-2 w-full p-3 hover:bg-muted rounded border">
                            {expandedFiles.has(fileDiff.fileName) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                            {getFileIcon(fileDiff.fileName)}
                            <span className="font-medium">{fileDiff.fileName}</span>
                            {fileDiff.canCompare && fileDiff.summary && (
                              <div className="flex items-center gap-2 ml-auto text-xs">
                                {fileDiff.summary.added > 0 && (
                                  <Badge variant="outline" className="bg-green-50 text-green-700">
                                    +{fileDiff.summary.added}
                                  </Badge>
                                )}
                                {fileDiff.summary.deleted > 0 && (
                                  <Badge variant="outline" className="bg-red-50 text-red-700">
                                    -{fileDiff.summary.deleted}
                                  </Badge>
                                )}
                                {fileDiff.summary.modified > 0 && (
                                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                                    ~{fileDiff.summary.modified}
                                  </Badge>
                                )}
                              </div>
                            )}
                            {!fileDiff.canCompare && (
                              <Badge variant="outline" className="ml-auto">
                                {fileDiff.fileType === 'other' ? '不支持' : fileDiff.error}
                              </Badge>
                            )}
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="p-3 border-l-2 ml-4 mt-2">
                              {fileDiff.canCompare && fileDiff.diffs && (
                                <>
                                  {fileDiff.fileType === 'word' && renderWordDiff(fileDiff.diffs as WordDiff[])}
                                  {fileDiff.fileType === 'excel' && renderExcelDiff(fileDiff.diffs as ExcelSheetDiff[])}
                                  {fileDiff.fileType === 'ppt' && renderPPTDiff(fileDiff.diffs as PPTSlideDiff[])}
                                </>
                              )}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      ))}
                    </div>
                  )}

                  {includeContent && compareResult.changes.fileContentDiffs?.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      没有可对比的文件内容
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </ScrollArea>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            选择两个版本进行对比
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
