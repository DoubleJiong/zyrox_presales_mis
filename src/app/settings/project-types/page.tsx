'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, FolderKanban, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { extractErrorMessage } from '@/lib/api-response';

interface ProjectTypeItem {
  id: number;
  code: string;
  name: string;
  description: string | null;
  status: string;
  projectCount: number;
  customerTypeCount: number;
}

const MAX_PROJECT_TYPE_CODE_LENGTH = 20;
const MAX_PROJECT_TYPE_NAME_LENGTH = 50;

const emptyForm = {
  code: '',
  name: '',
  description: '',
  status: 'active',
};

export default function ProjectTypesPage() {
  const [items, setItems] = useState<ProjectTypeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ProjectTypeItem | null>(null);
  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => {
    void loadProjectTypes();
  }, []);

  const loadProjectTypes = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/project-types');
      const result = await response.json();
      if (result.success) {
        setItems(result.data || []);
      }
    } catch (error) {
      console.error('Failed to load project types:', error);
      alert('加载项目类型失败');
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = () => {
    setEditingItem(null);
    setFormData(emptyForm);
    setDialogOpen(true);
  };

  const openEditDialog = (item: ProjectTypeItem) => {
    setEditingItem(item);
    setFormData({
      code: item.code,
      name: item.name,
      description: item.description || '',
      status: item.status,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.code.trim() || !formData.name.trim()) {
      alert('项目类型编码和名称为必填项');
      return;
    }

    if (formData.code.trim().length > MAX_PROJECT_TYPE_CODE_LENGTH) {
      alert(`项目类型编码不能超过 ${MAX_PROJECT_TYPE_CODE_LENGTH} 个字符`);
      return;
    }

    if (formData.name.trim().length > MAX_PROJECT_TYPE_NAME_LENGTH) {
      alert(`项目类型名称不能超过 ${MAX_PROJECT_TYPE_NAME_LENGTH} 个字符`);
      return;
    }

    try {
      setSaving(true);
      const response = await fetch('/api/project-types', {
        method: editingItem ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingItem ? { id: editingItem.id, ...formData } : formData),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        alert(extractErrorMessage(result.error, '保存项目类型失败'));
        return;
      }

      setDialogOpen(false);
      setFormData(emptyForm);
      setEditingItem(null);
      await loadProjectTypes();
    } catch (error) {
      console.error('Failed to save project type:', error);
      alert('保存项目类型失败');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (item: ProjectTypeItem, checked: boolean) => {
    try {
      const response = await fetch('/api/project-types', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: item.id,
          status: checked ? 'active' : 'inactive',
        }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        alert(extractErrorMessage(result.error, '更新状态失败'));
        return;
      }

      await loadProjectTypes();
    } catch (error) {
      console.error('Failed to toggle project type status:', error);
      alert('更新状态失败');
    }
  };

  const handleDelete = async (item: ProjectTypeItem) => {
    if (!confirm(`确定要删除项目类型“${item.name}”吗？`)) {
      return;
    }

    try {
      const response = await fetch(`/api/project-types?id=${item.id}`, {
        method: 'DELETE',
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        alert(extractErrorMessage(result.error, '删除项目类型失败'));
        return;
      }

      await loadProjectTypes();
    } catch (error) {
      console.error('Failed to delete project type:', error);
      alert('删除项目类型失败');
    }
  };

  const filteredItems = items.filter((item) => {
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) {
      return true;
    }

    return item.code.toLowerCase().includes(keyword)
      || item.name.toLowerCase().includes(keyword)
      || (item.description || '').toLowerCase().includes(keyword);
  });

  const activeCount = items.filter((item) => item.status === 'active').length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FolderKanban className="h-6 w-6" />
            项目类型管理
          </h1>
          <p className="text-muted-foreground">`project_type` 已从通用字典边界中剥离，统一维护 `sys_project_type` 真源。</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              新增项目类型
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingItem ? '编辑项目类型' : '新增项目类型'}</DialogTitle>
              <DialogDescription>
                项目页录入、导入和客户默认项目类型都会读取这里的真源。
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="project-type-code">编码</Label>
                <Input
                  id="project-type-code"
                  value={formData.code}
                  onChange={(event) => setFormData({
                    ...formData,
                    code: event.target.value.toLowerCase().replace(/[\s-]+/g, '_'),
                  })}
                  placeholder="例如：integration"
                  maxLength={MAX_PROJECT_TYPE_CODE_LENGTH}
                />
                <p className="text-xs text-muted-foreground">最多 {MAX_PROJECT_TYPE_CODE_LENGTH} 个字符，仅建议使用小写字母、数字和下划线。</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="project-type-name">名称</Label>
                <Input
                  id="project-type-name"
                  value={formData.name}
                  onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                  placeholder="例如：系统集成"
                  maxLength={MAX_PROJECT_TYPE_NAME_LENGTH}
                />
                <p className="text-xs text-muted-foreground">最多 {MAX_PROJECT_TYPE_NAME_LENGTH} 个字符。</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="project-type-description">描述</Label>
                <Textarea
                  id="project-type-description"
                  value={formData.description}
                  onChange={(event) => setFormData({ ...formData, description: event.target.value })}
                  placeholder="可选说明"
                  rows={3}
                />
              </div>
              <div className="flex items-center justify-between rounded-md border px-3 py-2">
                <div>
                  <div className="text-sm font-medium">启用状态</div>
                  <div className="text-xs text-muted-foreground">停用后不会出现在项目录入下拉中，但历史项目仍保留原值。</div>
                </div>
                <Switch
                  checked={formData.status === 'active'}
                  onCheckedChange={(checked) => setFormData({ ...formData, status: checked ? 'active' : 'inactive' })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
              <Button onClick={handleSubmit} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingItem ? '保存' : '创建'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>治理边界</AlertTitle>
        <AlertDescription>
          项目类型属于主数据表，不再建议通过通用字典页面维护。若只想调整行业、区域、优先级等业务字典，继续使用
          <Link href="/settings/dictionary" className="ml-1 underline underline-offset-2">数据字典</Link>
          。
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>项目类型总数</CardDescription>
            <CardTitle>{items.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>当前启用</CardDescription>
            <CardTitle>{activeCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>已停用</CardDescription>
            <CardTitle>{items.length - activeCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>项目类型列表</CardTitle>
              <CardDescription>编码变更会同步项目表和客户类型默认项目类型编码，删除仍受引用保护。</CardDescription>
            </div>
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="搜索编码、名称或描述"
              className="max-w-xs"
              data-testid="project-types-search-input"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              加载中...
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">暂无匹配的项目类型</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>编码</TableHead>
                  <TableHead>名称</TableHead>
                  <TableHead>描述</TableHead>
                  <TableHead>引用情况</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => {
                  const inUse = item.projectCount > 0 || item.customerTypeCount > 0;

                  return (
                    <TableRow key={item.id} data-testid="project-types-row" data-project-type-code={item.code}>
                      <TableCell><code className="text-xs bg-muted px-1.5 py-0.5 rounded">{item.code}</code></TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-sm">{item.description || '-'}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>项目 {item.projectCount}</div>
                          <div className="text-muted-foreground">客户类型默认值 {item.customerTypeCount}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={item.status === 'active'}
                            onCheckedChange={(checked) => handleToggleStatus(item, checked)}
                            data-testid={`project-type-status-switch-${item.id}`}
                          />
                          <Badge variant={item.status === 'active' ? 'default' : 'secondary'}>
                            {item.status === 'active' ? '启用' : '停用'}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(item)}
                            data-testid={`project-type-edit-button-${item.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(item)}
                            disabled={inUse}
                            className="text-destructive hover:text-destructive"
                            data-testid={`project-type-delete-button-${item.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}