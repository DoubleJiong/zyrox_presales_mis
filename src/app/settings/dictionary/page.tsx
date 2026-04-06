'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { 
  Settings, 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Building2, 
  FolderKanban,
  CircleDot,
  Building,
  MapPin,
  AlertCircle,
  FileText,
  Target,
  Lightbulb,
  FileCheck,
  Wrench,
  Scale,
  AlertTriangle,
  Users,
  FileSpreadsheet,
  ChevronRight,
  GripVertical,
  Loader2,
  Upload,
  Download,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import { extractErrorMessage } from '@/lib/api-response';
import {
  canManageAttributeCategoryInGui,
  isDedicatedMasterDataAttributeCategory,
  isGuiManagedSystemAttributeCategory,
} from '@/lib/config/dictionary-governance';

// 字典分类图标映射
const categoryIcons: Record<string, React.ReactNode> = {
  customer_type: <Building2 className="h-4 w-4" />,
  project_type: <FolderKanban className="h-4 w-4" />,
  project_status: <CircleDot className="h-4 w-4" />,
  industry: <Building className="h-4 w-4" />,
  region: <MapPin className="h-4 w-4" />,
  priority: <AlertCircle className="h-4 w-4" />,
  demand_type: <FileText className="h-4 w-4" />,
  intent_level: <Target className="h-4 w-4" />,
  opportunity_stage: <Lightbulb className="h-4 w-4" />,
  solution_type: <FileCheck className="h-4 w-4" />,
  service_type: <Wrench className="h-4 w-4" />,
  arbitration_type: <Scale className="h-4 w-4" />,
  alert_severity: <AlertTriangle className="h-4 w-4" />,
  alert_category: <AlertTriangle className="h-4 w-4" />,
  member_role: <Users className="h-4 w-4" />,
  file_type: <FileSpreadsheet className="h-4 w-4" />,
};

// 类型定义
interface DictionaryCategory {
  id: number;
  categoryCode: string;
  categoryName: string;
  description: string | null;
  icon: string | null;
  isSystem: boolean;
  sortOrder: number;
  status: string;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface DictionaryItem {
  id: number;
  category: string;
  code: string;
  name: string;
  value: string;
  valueType: string;
  description: string | null;
  parentId: number | null;
  sortOrder: number;
  isSystem: boolean;
  extraData: Record<string, any> | null;
  status: string;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  children?: DictionaryItem[];
}

export default function DictionaryManagementPage() {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get('category');
  
  const [categories, setCategories] = useState<DictionaryCategory[]>([]);
  const [items, setItems] = useState<DictionaryItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(initialCategory);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // 对话框状态
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<DictionaryItem | null>(null);
  const [saving, setSaving] = useState(false);
  
  // 表单状态
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    value: '',
    description: '',
    sortOrder: 0,
    status: 'active',
  });

  const selectedCategoryInfo = categories.find(c => c.categoryCode === selectedCategory);
  const isDedicatedMasterDataCategory = selectedCategoryInfo
    ? isDedicatedMasterDataAttributeCategory(selectedCategoryInfo.categoryCode)
    : false;
  const canManageSelectedCategory = selectedCategoryInfo
    ? !isDedicatedMasterDataCategory
      && canManageAttributeCategoryInGui(selectedCategoryInfo.categoryCode, selectedCategoryInfo.isSystem)
    : false;

  // 加载分类列表
  const loadCategories = async () => {
    try {
      const response = await fetch('/api/dictionary/categories');
      const data = await response.json();
      if (data.success) {
        setCategories(data.data);
        // 优先使用 URL 参数中的分类，否则使用第一个分类
        if (data.data.length > 0) {
          const categoryFromUrl = initialCategory && data.data.some((c: DictionaryCategory) => c.categoryCode === initialCategory);
          if (categoryFromUrl) {
            setSelectedCategory(initialCategory);
          } else if (!selectedCategory) {
            setSelectedCategory(data.data[0].categoryCode);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
      toast.error('加载字典分类失败');
    }
  };

  // 加载字典项
  const loadItems = async (category: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/dictionary/items?category=${category}`);
      const data = await response.json();
      if (data.success) {
        setItems(data.data);
      }
    } catch (error) {
      console.error('Failed to load items:', error);
      toast.error('加载字典项失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      loadItems(selectedCategory);
    }
  }, [selectedCategory]);

  // 过滤字典项
  const filteredItems = items.filter(item => 
    (item.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (item.code?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  // 打开新建对话框
  const handleAddItem = () => {
    if (!canManageSelectedCategory) {
      toast.error('当前分类属于流程/策略枚举，只允许代码维护');
      return;
    }

    setEditingItem(null);
    setFormData({
      code: '',
      name: '',
      value: '',
      description: '',
      sortOrder: items.length + 1,
      status: 'active',
    });
    setItemDialogOpen(true);
  };

  // 打开编辑对话框
  const handleEditItem = (item: DictionaryItem) => {
    setEditingItem(item);
    // 从 code 中提取简码
    const code = item.code.includes('.') ? item.code.split('.').slice(1).join('.') : item.code;
    setFormData({
      code,
      name: item.name,
      value: item.value,
      description: item.description || '',
      sortOrder: item.sortOrder,
      status: item.status,
    });
    setItemDialogOpen(true);
  };

  // 保存字典项
  const handleSaveItem = async () => {
    if (!selectedCategory) return;
    
    // 验证
    if (!formData.code.trim() || !formData.name.trim()) {
      toast.error('编码和名称为必填项');
      return;
    }

    setSaving(true);
    try {
      const url = '/api/dictionary/items';
      const method = editingItem ? 'PUT' : 'POST';
      const body = editingItem
        ? {
            id: editingItem.id,
            name: formData.name,
            value: formData.value || formData.code,
            description: formData.description,
            sortOrder: formData.sortOrder,
            status: formData.status,
          }
        : {
            category: selectedCategory,
            code: formData.code,
            name: formData.name,
            value: formData.value || formData.code,
            description: formData.description,
            sortOrder: formData.sortOrder,
            status: formData.status,
          };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (data.success) {
        toast.success(editingItem ? '更新成功' : '创建成功');
        setItemDialogOpen(false);
        loadItems(selectedCategory);
      } else {
        toast.error(extractErrorMessage(data.error, '操作失败'));
      }
    } catch (error) {
      console.error('Save error:', error);
      toast.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  // 删除字典项
  const handleDeleteItem = async (item: DictionaryItem) => {
    if (!canManageAttributeCategoryInGui(item.category, item.isSystem)) {
      toast.error('系统预置字典项不可删除');
      return;
    }

    if (!confirm(`确定要删除字典项"${item.name}"吗？`)) {
      return;
    }

    try {
      const response = await fetch(`/api/dictionary/items?id=${item.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (data.success) {
        toast.success('删除成功');
        loadItems(selectedCategory!);
      } else {
        toast.error(extractErrorMessage(data.error, '删除失败'));
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('删除失败');
    }
  };

  // 切换状态
  const handleToggleStatus = async (item: DictionaryItem) => {
    if (!canManageAttributeCategoryInGui(item.category, item.isSystem)) {
      toast.error('系统预置字典项不可修改状态');
      return;
    }

    const newStatus = item.status === 'active' ? 'inactive' : 'active';
    
    try {
      const response = await fetch('/api/dictionary/items', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: item.id,
          status: newStatus,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success('状态已更新');
        loadItems(selectedCategory!);
      } else {
        toast.error(extractErrorMessage(data.error, '操作失败'));
      }
    } catch (error) {
      console.error('Toggle error:', error);
      toast.error('操作失败');
    }
  };

  // 从配置同步字典数据
  const [syncing, setSyncing] = useState(false);
  
  const handleSyncFromConfig = async () => {
    if (!confirm('确定要从配置文件同步字典数据吗？这将更新所有系统预置的字典分类和字典项。')) {
      return;
    }

    setSyncing(true);
    try {
      const response = await fetch('/api/dictionary/sync', {
        method: 'POST',
      });

      const data = await response.json();
      if (data.success) {
        toast.success(`同步成功：${data.results.join(', ')}`);
        // 刷新数据
        await loadCategories();
        if (selectedCategory) {
          await loadItems(selectedCategory);
        }
      } else {
        toast.error(extractErrorMessage(data.error, '同步失败'));
      }
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('同步失败');
    } finally {
      setSyncing(false);
    }
  };

  // 导出字典数据
  const handleExport = async (format: 'json' | 'csv') => {
    try {
      const categories = selectedCategory ? selectedCategory : '';
      const response = await fetch(`/api/dictionary/export?categories=${categories}&format=${format}`);
      
      if (!response.ok) {
        throw new Error('导出失败');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dictionary_export_${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('导出成功');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('导出失败');
    }
  };

  // 导入字典数据
  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (isDedicatedMasterDataCategory) {
      toast.error('当前分类已迁移到专用主数据管理页，不支持通过通用字典导入');
      event.target.value = '';
      return;
    }

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      const response = await fetch('/api/dictionary/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data, mode: 'merge' }),
      });

      const result = await response.json();
      if (result.success) {
        toast.success(`导入成功：创建 ${result.results.items.created} 项，更新 ${result.results.items.updated} 项`);
        loadCategories();
        if (selectedCategory) {
          loadItems(selectedCategory);
        }
      } else {
        // 使用 extractErrorMessage 安全提取错误消息
        toast.error(extractErrorMessage(result.error, '导入失败'));
      }
    } catch (error) {
      console.error('Import error:', error);
      toast.error('导入失败：文件格式错误');
    }

    // 清空文件选择
    event.target.value = '';
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            数据字典管理
            <Badge variant="secondary" className="text-xs font-normal">
              <Sparkles className="h-3 w-3 mr-1" />
              统一数据源
            </Badge>
          </h1>
          <p className="text-muted-foreground">管理系统中的所有下拉选项数据源，一处配置，全局生效</p>
          {selectedCategoryInfo && (
            <p className="text-xs text-muted-foreground mt-1">
              {isDedicatedMasterDataCategory
                ? '当前分类已迁移到项目类型主数据管理页，不在通用字典中维护。'
                : canManageSelectedCategory
                ? '当前分类允许通过 GUI 维护，配置同步不会覆盖现有业务值。'
                : '当前分类属于系统流程/策略枚举，仅供查看，不建议通过 GUI 修改。'}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSyncFromConfig}
            disabled={syncing}
          >
            {syncing ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-1" />
            )}
            从配置同步
          </Button>
          <input
            type="file"
            id="import-file"
            accept=".json"
            className="hidden"
            onChange={handleImport}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => document.getElementById('import-file')?.click()}
            disabled={isDedicatedMasterDataCategory}
          >
            <Upload className="h-4 w-4 mr-1" />
            导入
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('json')}
            disabled={isDedicatedMasterDataCategory}
          >
            <Download className="h-4 w-4 mr-1" />
            导出JSON
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('csv')}
            disabled={isDedicatedMasterDataCategory}
          >
            <FileSpreadsheet className="h-4 w-4 mr-1" />
            导出CSV
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-12 gap-6">
        {/* 左侧分类列表 */}
        <Card className="col-span-3">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">字典分类</CardTitle>
            <CardDescription>选择分类查看字典项</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.categoryCode)}
                  className={`w-full flex items-center justify-between p-3 text-left hover:bg-muted/50 transition-colors ${
                    selectedCategory === category.categoryCode ? 'bg-muted' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-md ${
                      selectedCategory === category.categoryCode 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted'
                    }`}>
                      {categoryIcons[category.categoryCode] || <Settings className="h-4 w-4" />}
                    </div>
                    <div>
                      <div className="font-medium text-sm">{category.categoryName}</div>
                      <div className="text-xs text-muted-foreground">{category.categoryCode}</div>
                    </div>
                  </div>
                  <ChevronRight className={`h-4 w-4 text-muted-foreground ${
                    selectedCategory === category.categoryCode ? 'opacity-100' : 'opacity-0'
                  }`} />
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 右侧字典项列表 */}
        <Card className="col-span-9">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">
                  {selectedCategoryInfo?.categoryName || '字典项'}
                </CardTitle>
                <CardDescription>
                  {selectedCategoryInfo?.description || '选择左侧分类查看字典项'}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="搜索字典项..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 w-48"
                  />
                </div>
                <Button onClick={handleAddItem} size="sm" disabled={!canManageSelectedCategory}>
                  <Plus className="h-4 w-4 mr-1" />
                  新增字典项
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isDedicatedMasterDataCategory ? (
              <Alert>
                <FolderKanban className="h-4 w-4" />
                <AlertTitle>项目类型已切换到专用管理路径</AlertTitle>
                <AlertDescription>
                  `project_type` 由 `sys_project_type` 统一维护，编码变更还需要同步项目表和客户类型默认值。
                  <Link href="/settings/project-types" className="ml-1 underline underline-offset-2">
                    前往项目类型管理
                  </Link>
                </AlertDescription>
              </Alert>
            ) : loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm ? '未找到匹配的字典项' : '暂无字典项'}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">排序</TableHead>
                    <TableHead>编码</TableHead>
                    <TableHead>名称</TableHead>
                    <TableHead>描述</TableHead>
                    <TableHead className="w-24">状态</TableHead>
                    <TableHead className="w-24">类型</TableHead>
                    <TableHead className="w-24 text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                          <span className="text-sm">{item.sortOrder}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                          {item.code.includes('.') ? item.code.split('.').slice(1).join('.') : item.code}
                        </code>
                      </TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                        {item.description}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={item.status === 'active'}
                          onCheckedChange={() => handleToggleStatus(item)}
                          disabled={!canManageAttributeCategoryInGui(item.category, item.isSystem)}
                        />
                      </TableCell>
                      <TableCell>
                        {item.isSystem && (
                          <Badge variant="secondary" className="text-xs">
                            {isGuiManagedSystemAttributeCategory(item.category) ? '系统/业务可管' : '系统'}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditItem(item)}
                            disabled={!canManageAttributeCategoryInGui(item.category, item.isSystem)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteItem(item)}
                            disabled={!canManageAttributeCategoryInGui(item.category, item.isSystem)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 新建/编辑字典项对话框 */}
      <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? '编辑字典项' : '新增字典项'}</DialogTitle>
            <DialogDescription>
              {selectedCategoryInfo?.categoryName} - {selectedCategoryInfo?.description}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="code" className="text-right">编码</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="col-span-3"
                placeholder="唯一标识符（如：education）"
                disabled={!!editingItem}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">名称</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="col-span-3"
                placeholder="显示名称"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="value" className="text-right">值</Label>
              <Input
                id="value"
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                className="col-span-3"
                placeholder="可选，默认与编码相同"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="sortOrder" className="text-right">排序</Label>
              <Input
                id="sortOrder"
                type="number"
                value={formData.sortOrder}
                onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">描述</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="col-span-3"
                placeholder="可选描述"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="status" className="text-right">状态</Label>
              <div className="col-span-3 flex items-center gap-2">
                <Switch
                  checked={formData.status === 'active'}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, status: checked ? 'active' : 'inactive' })
                  }
                />
                <span className="text-sm">
                  {formData.status === 'active' ? '启用' : '禁用'}
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setItemDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSaveItem} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingItem ? '保存' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
