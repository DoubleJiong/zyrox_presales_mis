'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface ProjectType {
  id: number;
  code: string;
  name: string;
  description: string | null;
}

export default function ProjectTypesPage() {
  const [items, setItems] = useState<ProjectType[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ code: '', name: '', description: '' });

  const loadItems = useCallback(async () => {
    try {
      const res = await fetch('/api/project-types');
      if (res.ok) {
        const payload = await res.json();
        if (payload.success) setItems(payload.data ?? []);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => { loadItems(); }, [loadItems]);

  const handleCreate = async () => {
    if (!form.code || !form.name) {
      toast.error('编码和名称为必填项');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/project-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: form.code, name: form.name, description: form.description }),
      });
      const payload = await res.json();
      if (res.ok && payload.success) {
        setDialogOpen(false);
        setForm({ code: '', name: '', description: '' });
        await loadItems();
        toast.success('项目类型创建成功');
      } else {
        toast.error(payload.error ?? '创建失败');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: ProjectType) => {
    if (!window.confirm(`确认删除项目类型「${item.name}」？`)) return;
    try {
      const res = await fetch(`/api/project-types?id=${item.id}`, { method: 'DELETE' });
      const payload = await res.json();
      if (res.ok && payload.success) {
        await loadItems();
        toast.success('已删除');
      } else {
        toast.error(payload.error ?? '删除失败');
      }
    } catch {
      toast.error('网络错误');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">项目类型管理</h1>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          新增项目类型
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">项目类型列表</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">暂无项目类型</div>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  data-testid="project-types-row"
                  className="flex items-center justify-between rounded-md border px-4 py-3"
                >
                  <div>
                    <span className="font-medium">{item.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{item.code}</span>
                    {item.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    data-testid={`project-type-delete-button-${item.id}`}
                    onClick={() => handleDelete(item)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新增项目类型</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="pt-code">编码</Label>
              <Input
                id="pt-code"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="如: custom_type"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pt-name">名称</Label>
              <Input
                id="pt-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="如: 自定义类型"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pt-description">描述</Label>
              <Textarea
                id="pt-description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="可选"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button onClick={handleCreate} disabled={saving}>创建</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
