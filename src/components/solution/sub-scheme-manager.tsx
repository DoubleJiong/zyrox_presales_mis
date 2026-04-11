'use client';

import { useEffect, useState, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Upload,
  Download,
  Trash2,
  FileText,
  History,
  Plus,
  Loader2,
  CheckCircle2,
  File,
  TrendingUp,
} from 'lucide-react';

// 子方案类型配置
const SUB_SCHEME_TYPES = [
  { code: 'planning_ppt', name: '策划方案PPT', required: true, multiple: false, icon: '📊', accept: '.ppt,.pptx' },
  { code: 'preliminary_word', name: '前期方案Word', required: true, multiple: false, icon: '📝', accept: '.doc,.docx' },
  { code: 'detailed_word', name: '详细方案Word', required: true, multiple: false, icon: '📄', accept: '.doc,.docx' },
  { code: 'quotation_excel', name: '配单/报价单Excel', required: true, multiple: false, icon: '📈', accept: '.xls,.xlsx' },
  { code: 'promotional_material', name: '宣传物料', required: false, multiple: true, icon: '📁', accept: '*' },
];

// 子方案接口
interface SubScheme {
  id: number;
  solutionId: number;
  subSchemeCode: string;
  subSchemeName: string;
  subSchemeType: string;
  version: string;
  status: string;
  description: string | null;
  viewCount: number;
  downloadCount: number;
  createdAt: string;
  updatedAt: string;
  files: SubSchemeFile[];
}

// 子方案文件接口
interface SubSchemeFile {
  id: number;
  subSchemeId: number;
  fileName: string;
  fileType: string;
  fileSize: number | null;
  fileUrl: string | null;
  version: string;
  isCurrent: boolean;
  uploadedByName: string | null;
  description: string | null;
  createdAt: string;
}

// 版本历史接口
interface VersionHistory {
  id: number;
  fileName: string;
  version: string;
  isCurrent: boolean;
  uploadedByName: string | null;
  createdAt: string;
}

// 权限接口
interface UserPermission {
  isTeamMember: boolean;
  role: string | null;
  permissions: {
    canEdit: boolean;
    canDelete: boolean;
    canApprove: boolean;
    canInvite: boolean;
    canUpload: boolean;
    canDownload: boolean;
  };
  isOwner: boolean;
}

interface SubSchemeManagerProps {
  solutionId: number;
  permissions: UserPermission | null;
}

export function SubSchemeManager({ solutionId, permissions }: SubSchemeManagerProps) {
  const { toast } = useToast();
  const [subSchemes, setSubSchemes] = useState<SubScheme[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 上传弹窗
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadTarget, setUploadTarget] = useState<{ type: string; subSchemeId: number | null }>({ type: '', subSchemeId: null });
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadDescription, setUploadDescription] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 版本历史弹窗
  const [showVersionDialog, setShowVersionDialog] = useState(false);
  const [versionHistory, setVersionHistory] = useState<VersionHistory[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);

  useEffect(() => {
    if (solutionId) {
      fetchSubSchemes();
    }
  }, [solutionId]);

  const fetchSubSchemes = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/solutions/${solutionId}/sub-schemes`);
      if (res.ok) {
        const data = await res.json();
        const nextSubSchemes = data.data || [];
        setSubSchemes(nextSubSchemes);
        return nextSubSchemes;
      }
    } catch (error) {
      console.error('Failed to fetch sub-schemes:', error);
    } finally {
      setLoading(false);
    }

    return [];
  };

  // 初始化标准子方案
  const initializeStandardSubSchemes = async () => {
    try {
      for (const type of SUB_SCHEME_TYPES.filter(t => t.required)) {
        const existing = subSchemes.find(s => s.subSchemeType === type.code);
        if (!existing) {
          await fetch(`/api/solutions/${solutionId}/sub-schemes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              subSchemeName: type.name,
              subSchemeType: type.code,
              status: 'draft',
            }),
          });
        }
      }
      await fetchSubSchemes();
      toast({ title: '初始化完成', description: '已创建标准子方案结构' });
    } catch (error) {
      console.error('Failed to initialize:', error);
      toast({ title: '初始化失败', variant: 'destructive' });
    }
  };

  // 打开上传弹窗
  const openUploadDialog = async (type: string, subSchemeId: number | null = null) => {
    if (!subSchemeId) {
      const typeConfig = SUB_SCHEME_TYPES.find(t => t.code === type);
      if (!typeConfig) return;
      
      try {
        const res = await fetch(`/api/solutions/${solutionId}/sub-schemes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subSchemeName: typeConfig.name,
            subSchemeType: type,
            status: 'draft',
          }),
        });
        if (res.ok) {
          const data = await res.json();
          subSchemeId = data.data.id;
          await fetchSubSchemes();
        }
      } catch (error) {
        console.error('Failed to create sub-scheme:', error);
        return;
      }
    }
    
    setUploadTarget({ type, subSchemeId });
    setUploadFile(null);
    setUploadDescription('');
    setShowUploadDialog(true);
  };

  // 处理文件选择
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFile(file);
    }
  };

  // 上传文件
  const handleUpload = async () => {
    if (!uploadFile || !uploadTarget.subSchemeId) {
      toast({ title: '请选择文件', variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('description', uploadDescription);

      const res = await fetch(`/api/solutions/${solutionId}/sub-schemes/${uploadTarget.subSchemeId}/files`, {
        method: 'POST',
        body: formData,
      });

      const result = await res.json();
      if (res.ok && result.message) {
        toast({ title: '上传成功', description: '文件已上传' });
        await fetchSubSchemes();
        setShowUploadDialog(false);
      } else {
        // 显示具体的错误信息
        // error 可能是字符串或 { code, message } 对象
        const errorMsg = typeof result.error === 'string' 
          ? result.error 
          : (result.error?.message || result.message || '上传失败，请稍后重试');
        toast({ 
          title: '上传失败', 
          description: errorMsg, 
          variant: 'destructive' 
        });
      }
    } catch (error) {
      console.error('Failed to upload:', error);
      const errorMsg = error instanceof Error ? error.message : '网络错误，请稍后重试';
      toast({ 
        title: '上传失败', 
        description: errorMsg,
        variant: 'destructive' 
      });
    } finally {
      setUploading(false);
    }
  };

  // 下载文件
  const handleDownload = async (file: SubSchemeFile) => {
    try {
      await fetch(`/api/solutions/${solutionId}/statistics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionType: 'download',
          resourceId: file.id,
          resourceName: file.fileName,
        }),
      });

      if (file.fileUrl) {
        window.open(file.fileUrl, '_blank');
      } else {
        toast({ title: '文件链接不可用', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Failed to download:', error);
      toast({ title: '下载失败', variant: 'destructive' });
    }
  };

  // 删除文件
  const handleDeleteFile = async (file: SubSchemeFile) => {
    if (!confirm('确定要删除这个文件吗？')) return;
    
    try {
      const res = await fetch(`/api/solutions/${solutionId}/sub-schemes/${file.subSchemeId}/files/${file.id}`, {
        method: 'DELETE',
      });
      
      if (res.ok) {
        toast({ title: '删除成功' });
        await fetchSubSchemes();
      } else {
        toast({ title: '删除失败', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Failed to delete:', error);
      toast({ title: '删除失败', variant: 'destructive' });
    }
  };

  // 查看版本历史
  const viewVersionHistory = async (subSchemeId: number) => {
    setLoadingVersions(true);
    setShowVersionDialog(true);
    try {
      const res = await fetch(`/api/solutions/${solutionId}/sub-schemes/${subSchemeId}/files/history`);
      if (res.ok) {
        const data = await res.json();
        setVersionHistory(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch history:', error);
    } finally {
      setLoadingVersions(false);
    }
  };

  // 获取子方案按类型分组
  const getSubSchemesByType = (type: string) => {
    return subSchemes.filter(s => s.subSchemeType === type);
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '-';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // 格式化日期
  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleString('zh-CN');
  };

  // 计算统计信息
  const stats = {
    totalFiles: subSchemes.reduce((acc, s) => acc + (s.files?.filter(f => f.isCurrent).length || 0), 0),
    completedTypes: SUB_SCHEME_TYPES.filter(t => t.required).filter(t => {
      const typeSubSchemes = getSubSchemesByType(t.code);
      return typeSubSchemes[0]?.files?.some(f => f.isCurrent);
    }).length,
    totalRequired: SUB_SCHEME_TYPES.filter(t => t.required).length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 工具栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* 统计概览 */}
          <div className="flex items-center gap-3">
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-primary/10 rounded">
                  <File className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xl font-bold">{stats.totalFiles}</p>
                  <p className="text-xs text-muted-foreground">文件总数</p>
                </div>
              </div>
            </Card>
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-green-500/10 rounded">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="text-xl font-bold">{stats.completedTypes}/{stats.totalRequired}</p>
                  <p className="text-xs text-muted-foreground">必填项完成</p>
                </div>
              </div>
            </Card>
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-orange-500/10 rounded">
                  <TrendingUp className="h-4 w-4 text-orange-600" />
                </div>
                <div>
                  <p className="text-xl font-bold">
                    {subSchemes.reduce((acc, s) => acc + (s.downloadCount || 0), 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">下载次数</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
        {permissions?.isTeamMember && (
          <Button variant="outline" size="sm" onClick={initializeStandardSubSchemes}>
            <Plus className="h-4 w-4 mr-2" />
            初始化标准结构
          </Button>
        )}
      </div>

      {/* 主内容区 - 使用 Tabs 组织 */}
      <Tabs defaultValue="standard" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="standard">标准子方案</TabsTrigger>
          <TabsTrigger value="materials">宣传物料</TabsTrigger>
        </TabsList>

        <TabsContent value="standard" className="mt-4">
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-base">标准子方案文件</CardTitle>
              <CardDescription>必填项需完成上传才能提交审核</CardDescription>
            </CardHeader>
            <CardContent className="px-3">
              <Table>
                <TableHeader>
                  <TableRow className="h-9">
                    <TableHead className="w-[200px]">文件类型</TableHead>
                    <TableHead>文件名</TableHead>
                    <TableHead className="w-[80px]">大小</TableHead>
                    <TableHead className="w-[80px]">版本</TableHead>
                    <TableHead className="w-[100px]">上传人</TableHead>
                    <TableHead className="w-[140px]">更新时间</TableHead>
                    <TableHead className="w-[120px] text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {SUB_SCHEME_TYPES.filter(t => !t.multiple).map((type) => {
                    const typeSubSchemes = getSubSchemesByType(type.code);
                    const subScheme = typeSubSchemes[0];
                    const currentFile = subScheme?.files?.find(f => f.isCurrent);
                    
                    return (
                      <TableRow key={type.code} className="h-12">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{type.icon}</span>
                            <div>
                              <div className="flex items-center gap-1">
                                <span className="font-medium text-sm">{type.name}</span>
                                {type.required && (
                                  <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                                    必填
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {currentFile ? (
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <span className="text-sm truncate max-w-[200px]">{currentFile.fileName}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">未上传</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">{formatFileSize(currentFile?.fileSize || null)}</TableCell>
                        <TableCell>
                          {currentFile ? (
                            <Badge variant="outline" className="text-xs">v{currentFile.version}</Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">{currentFile?.uploadedByName || '-'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(currentFile?.createdAt || null)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {currentFile ? (
                              <>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-7 px-2"
                                  onClick={() => subScheme && viewVersionHistory(subScheme.id)}
                                >
                                  <History className="h-3.5 w-3.5" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-7 px-2"
                                  onClick={() => handleDownload(currentFile)}
                                >
                                  <Download className="h-3.5 w-3.5" />
                                </Button>
                                {permissions?.permissions.canUpload && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-7 px-2"
                                    onClick={() => openUploadDialog(type.code, subScheme?.id || null)}
                                  >
                                    <Upload className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                                {permissions?.permissions.canDelete && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-7 px-2 text-destructive"
                                    onClick={() => handleDeleteFile(currentFile)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </>
                            ) : (
                              permissions?.permissions.canUpload && (
                                <Button 
                                  size="sm" 
                                  className="h-7"
                                  onClick={() => openUploadDialog(type.code, null)}
                                >
                                  <Upload className="h-3.5 w-3.5 mr-1" />
                                  上传
                                </Button>
                              )
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="materials" className="mt-4">
          <Card>
            <CardHeader className="py-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">宣传物料</CardTitle>
                  <CardDescription>可上传多个文件，支持各类宣传资料</CardDescription>
                </div>
                {permissions?.permissions.canUpload && (
                  <Button 
                    size="sm"
                    onClick={() => openUploadDialog('promotional_material', getSubSchemesByType('promotional_material')[0]?.id || null)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    添加文件
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="px-3">
              {(() => {
                const materialSubSchemes = getSubSchemesByType('promotional_material');
                const allFiles = materialSubSchemes.flatMap(s => s.files || []).filter(f => f.isCurrent);
                
                return allFiles.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow className="h-9">
                        <TableHead>文件名</TableHead>
                        <TableHead className="w-[80px]">类型</TableHead>
                        <TableHead className="w-[80px]">大小</TableHead>
                        <TableHead className="w-[100px]">上传人</TableHead>
                        <TableHead className="w-[140px]">上传时间</TableHead>
                        <TableHead className="w-[100px] text-right">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allFiles.map((file) => (
                        <TableRow key={file.id} className="h-12">
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">{file.fileName}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{file.fileType.toUpperCase()}</TableCell>
                          <TableCell className="text-sm">{formatFileSize(file.fileSize)}</TableCell>
                          <TableCell className="text-sm">{file.uploadedByName || '-'}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{formatDate(file.createdAt)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => handleDownload(file)}>
                                <Download className="h-3.5 w-3.5" />
                              </Button>
                              {permissions?.permissions.canDelete && (
                                <Button variant="ghost" size="sm" className="h-7 px-2 text-destructive" onClick={() => handleDeleteFile(file)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    暂无宣传物料，点击"添加文件"上传
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 上传弹窗 */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>上传文件</DialogTitle>
            <DialogDescription className="text-sm">
              上传{SUB_SCHEME_TYPES.find(t => t.code === uploadTarget.type)?.name}文件
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-sm">选择文件</Label>
              {/* 改进的文件选择控件 */}
              <div 
                className="mt-1.5 border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept={SUB_SCHEME_TYPES.find(t => t.code === uploadTarget.type)?.accept || '*'}
                  className="hidden"
                />
                {uploadFile ? (
                  <div className="flex items-center justify-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <div className="text-left">
                      <p className="text-sm font-medium truncate max-w-[250px]">{uploadFile.name}</p>
                      <p className="text-xs text-muted-foreground">{formatFileSize(uploadFile.size)}</p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="ml-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        setUploadFile(null);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = '';
                        }
                      }}
                    >
                      重新选择
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="mx-auto w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Upload className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">点击选择文件</p>
                      <p className="text-xs text-muted-foreground">
                        支持 {SUB_SCHEME_TYPES.find(t => t.code === uploadTarget.type)?.accept?.split(',').join('、') || '所有格式'} 格式
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div>
              <Label className="text-sm">备注</Label>
              <Textarea
                value={uploadDescription}
                onChange={(e) => setUploadDescription(e.target.value)}
                placeholder="文件描述或变更说明..."
                rows={2}
                className="mt-1.5 text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowUploadDialog(false)}>
              取消
            </Button>
            <Button size="sm" onClick={handleUpload} disabled={uploading || !uploadFile}>
              {uploading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              上传
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 版本历史弹窗 */}
      <Dialog open={showVersionDialog} onOpenChange={setShowVersionDialog}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>版本历史</DialogTitle>
            <DialogDescription>查看文件的所有历史版本</DialogDescription>
          </DialogHeader>
          {loadingVersions ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : versionHistory.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="h-9">
                  <TableHead>文件名</TableHead>
                  <TableHead className="w-[80px]">版本</TableHead>
                  <TableHead className="w-[100px]">状态</TableHead>
                  <TableHead className="w-[100px]">上传人</TableHead>
                  <TableHead className="w-[140px]">上传时间</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {versionHistory.map((v) => (
                  <TableRow key={v.id} className="h-10">
                    <TableCell className="text-sm">{v.fileName}</TableCell>
                    <TableCell>
                      <Badge variant={v.isCurrent ? 'default' : 'secondary'} className="text-xs">
                        v{v.version}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {v.isCurrent ? (
                        <Badge variant="outline" className="text-xs text-green-600">当前版本</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">历史版本</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{v.uploadedByName || '-'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(v.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground text-sm">
              暂无版本历史
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowVersionDialog(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
