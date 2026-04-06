'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, X } from 'lucide-react';

interface StaffTag {
  id: number;
  staffId: number;
  tagName: string;
  tagType: string;
  tagColor: string;
  description: string;
  createdAt: string;
  createdBy: string;
}

interface StaffTagManagerProps {
  staffId: number;
  tags: StaffTag[];
  onTagsChange: () => void;
}

const tagTypes = [
  { value: 'skill', label: '技能标签', color: '#3b82f6' },
  { value: 'ability', label: '能力标签', color: '#10b981' },
  { value: 'experience', label: '经验标签', color: '#8b5cf6' },
  { value: 'status', label: '状态标签', color: '#f59e0b' },
];

const tagColors = [
  { value: '#3b82f6', label: '蓝色', color: '#3b82f6' },
  { value: '#10b981', label: '绿色', color: '#10b981' },
  { value: '#8b5cf6', label: '紫色', color: '#8b5cf6' },
  { value: '#f59e0b', label: '橙色', color: '#f59e0b' },
  { value: '#ef4444', label: '红色', color: '#ef4444' },
  { value: '#06b6d4', label: '青色', color: '#06b6d4' },
  { value: '#ec4899', label: '粉色', color: '#ec4899' },
  { value: '#64748b', label: '灰色', color: '#64748b' },
];

export default function StaffTagManager({ staffId, tags, onTagsChange }: StaffTagManagerProps) {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<StaffTag | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [newTag, setNewTag] = useState({
    tagName: '',
    tagType: 'skill',
    tagColor: '#3b82f6',
    description: '',
  });

  const handleAddTag = async () => {
    if (!newTag.tagName) {
      alert('请填写标签名称');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/staff-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffId,
          ...newTag,
        }),
      });

      if (response.ok) {
        setAddDialogOpen(false);
        setNewTag({ tagName: '', tagType: 'skill', tagColor: '#3b82f6', description: '' });
        onTagsChange();
      }
    } catch (error) {
      console.error('Failed to add tag:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditTag = async () => {
    if (!editingTag || !newTag.tagName) {
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/staff-tags', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingTag.id,
          ...newTag,
        }),
      });

      if (response.ok) {
        setEditDialogOpen(false);
        setEditingTag(null);
        setNewTag({ tagName: '', tagType: 'skill', tagColor: '#3b82f6', description: '' });
        onTagsChange();
      }
    } catch (error) {
      console.error('Failed to update tag:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTag = async (id: number) => {
    if (!confirm('确定要删除这个标签吗？')) return;

    try {
      const response = await fetch(`/api/staff-tags?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        onTagsChange();
      }
    } catch (error) {
      console.error('Failed to delete tag:', error);
    }
  };

  const openEditDialog = (tag: StaffTag) => {
    setEditingTag(tag);
    setNewTag({
      tagName: tag.tagName,
      tagType: tag.tagType,
      tagColor: tag.tagColor,
      description: tag.description,
    });
    setEditDialogOpen(true);
  };

  const getTagTypeLabel = (type: string) => {
    const tagType = tagTypes.find((t) => t.value === type);
    return tagType?.label || type;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">标签列表</h3>
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              添加标签
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>添加标签</DialogTitle>
              <DialogDescription>为该人员添加一个新标签</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="tagName">标签名称 *</Label>
                <Input
                  id="tagName"
                  placeholder="请输入标签名称"
                  value={newTag.tagName}
                  onChange={(e) => setNewTag({ ...newTag, tagName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tagType">标签类型</Label>
                <Select
                  value={newTag.tagType}
                  onValueChange={(value) => setNewTag({ ...newTag, tagType: value })}
                >
                  <SelectTrigger id="tagType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {tagTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tagColor">标签颜色</Label>
                <div className="flex flex-wrap gap-2">
                  {tagColors.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        newTag.tagColor === color.value
                          ? 'border-primary scale-110'
                          : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: color.color }}
                      onClick={() => setNewTag({ ...newTag, tagColor: color.value })}
                    />
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">描述</Label>
                <Textarea
                  id="description"
                  placeholder="请输入标签描述（可选）"
                  value={newTag.description}
                  onChange={(e) => setNewTag({ ...newTag, description: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleAddTag} disabled={submitting}>
                {submitting ? '添加中...' : '添加'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {tags.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground border rounded-lg">
          暂无标签，点击上方按钮添加
        </div>
      ) : (
        <div className="space-y-3">
          {tags.map((tag) => (
            <div
              key={tag.id}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-4 flex-1">
                <div
                  className="w-6 h-6 rounded-full flex-shrink-0"
                  style={{ backgroundColor: tag.tagColor }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{tag.tagName}</span>
                    <Badge variant="outline" className="text-xs">
                      {getTagTypeLabel(tag.tagType)}
                    </Badge>
                  </div>
                  {tag.description && (
                    <div className="text-sm text-muted-foreground truncate">{tag.description}</div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Dialog open={editDialogOpen && editingTag?.id === tag.id} onOpenChange={setEditDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="sm" onClick={() => openEditDialog(tag)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>编辑标签</DialogTitle>
                      <DialogDescription>修改标签信息</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="editTagName">标签名称 *</Label>
                        <Input
                          id="editTagName"
                          placeholder="请输入标签名称"
                          value={newTag.tagName}
                          onChange={(e) => setNewTag({ ...newTag, tagName: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="editTagType">标签类型</Label>
                        <Select
                          value={newTag.tagType}
                          onValueChange={(value) => setNewTag({ ...newTag, tagType: value })}
                        >
                          <SelectTrigger id="editTagType">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {tagTypes.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="editTagColor">标签颜色</Label>
                        <div className="flex flex-wrap gap-2">
                          {tagColors.map((color) => (
                            <button
                              key={color.value}
                              type="button"
                              className={`w-8 h-8 rounded-full border-2 transition-all ${
                                newTag.tagColor === color.value
                                  ? 'border-primary scale-110'
                                  : 'border-transparent hover:scale-105'
                              }`}
                              style={{ backgroundColor: color.color }}
                              onClick={() => setNewTag({ ...newTag, tagColor: color.value })}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="editDescription">描述</Label>
                        <Textarea
                          id="editDescription"
                          placeholder="请输入标签描述（可选）"
                          value={newTag.description}
                          onChange={(e) => setNewTag({ ...newTag, description: e.target.value })}
                          rows={3}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                        取消
                      </Button>
                      <Button onClick={handleEditTag} disabled={submitting}>
                        {submitting ? '保存中...' : '保存'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteTag(tag.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
