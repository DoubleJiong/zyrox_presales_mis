'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { extractErrorMessage } from '@/lib/api-response';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Plus, Edit, Trash2, Settings, Weight, Clock } from 'lucide-react';

interface ServiceType {
  id: number;
  serviceCode: string;
  serviceName: string;
  serviceCategory: string;
  description: string | null;
  weight: number;
  standardDuration: number | null;
  isRequired: boolean;
  sortOrder: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

const categoryConfig: Record<string, { label: string; color: string }> = {
  analysis: { label: '分析类', color: 'bg-blue-500' },
  design: { label: '设计类', color: 'bg-purple-500' },
  presentation: { label: '演示类', color: 'bg-green-500' },
  negotiation: { label: '谈判类', color: 'bg-orange-500' },
};

export default function PresalesSettings() {
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceType | null>(null);
  const [formData, setFormData] = useState({
    serviceCode: '',
    serviceName: '',
    serviceCategory: 'analysis',
    description: '',
    weight: 10,
    standardDuration: '',
    isRequired: false,
    sortOrder: 0,
  });

  useEffect(() => {
    fetchServiceTypes();
  }, []);

  const fetchServiceTypes = async () => {
    try {
      const response = await fetch('/api/service-types');
      if (response.ok) {
        const result = await response.json();
        // API 返回格式: { success: true, data: [...] }
        setServiceTypes(result.data || result || []);
      }
    } catch (error) {
      console.error('Failed to fetch service types:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const url = '/api/service-types';
      const method = editingService ? 'PUT' : 'POST';
      const body = editingService
        ? { id: editingService.id, ...formData }
        : formData;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...body,
          standardDuration: formData.standardDuration ? parseInt(formData.standardDuration) : null,
        }),
      });
      
      if (response.ok) {
        setIsDialogOpen(false);
        resetForm();
        await fetchServiceTypes();
      } else {
        const error = await response.json();
        console.error('Failed to save service type:', error);
        alert(extractErrorMessage(error.error, '保存失败'));
      }
    } catch (error) {
      console.error('Failed to save service type:', error);
      alert('保存失败，请重试');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这个服务类型吗？此操作不可撤销。')) {
      return;
    }

    try {
      const response = await fetch(`/api/service-types?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // 删除成功，更新前端状态
        setServiceTypes(serviceTypes.filter(s => s.id !== id));
      } else {
        const error = await response.json();
        console.error('Failed to delete service type:', error);
        alert(extractErrorMessage(error.error, '删除失败'));
      }
    } catch (error) {
      console.error('Failed to delete service type:', error);
      alert('删除失败，请重试');
    }
  };

  const resetForm = () => {
    setFormData({
      serviceCode: '',
      serviceName: '',
      serviceCategory: 'analysis',
      description: '',
      weight: 10,
      standardDuration: '',
      isRequired: false,
      sortOrder: 0,
    });
    setEditingService(null);
  };

  const handleEdit = (service: ServiceType) => {
    setEditingService(service);
    setFormData({
      serviceCode: service.serviceCode,
      serviceName: service.serviceName,
      serviceCategory: service.serviceCategory,
      description: service.description || '',
      weight: service.weight,
      standardDuration: service.standardDuration?.toString() || '',
      isRequired: service.isRequired,
      sortOrder: service.sortOrder,
    });
    setIsDialogOpen(true);
  };

  const totalWeight = serviceTypes.reduce((sum, service) => sum + service.weight, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">加载中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">售前服务配置</h2>
          <p className="text-muted-foreground">管理售前服务类型和权重设置</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="h-4 w-4 mr-2" />
              新增服务类型
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingService ? '编辑服务类型' : '新增服务类型'}</DialogTitle>
              <DialogDescription>
                配置售前服务的基本信息和权重参数
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>服务编码</Label>
                  <Input
                    value={formData.serviceCode}
                    onChange={(e) => setFormData({ ...formData, serviceCode: e.target.value.toUpperCase() })}
                    placeholder="例如：ANALYSIS"
                  />
                </div>
                <div>
                  <Label>服务名称</Label>
                  <Input
                    value={formData.serviceName}
                    onChange={(e) => setFormData({ ...formData, serviceName: e.target.value })}
                    placeholder="例如：需求调研与分析"
                  />
                </div>
              </div>
              <div>
                <Label>服务分类</Label>
                <Select
                  value={formData.serviceCategory}
                  onValueChange={(value) => setFormData({ ...formData, serviceCategory: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="analysis">分析类</SelectItem>
                    <SelectItem value="design">设计类</SelectItem>
                    <SelectItem value="presentation">演示类</SelectItem>
                    <SelectItem value="negotiation">谈判类</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>服务描述</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  placeholder="详细描述该服务的内容..."
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>权重</Label>
                  <Input
                    type="number"
                    value={formData.weight}
                    onChange={(e) => setFormData({ ...formData, weight: parseInt(e.target.value) })}
                    min={0}
                    max={100}
                  />
                  <p className="text-xs text-muted-foreground mt-1">用于绩效计算</p>
                </div>
                <div>
                  <Label>标准时长（小时）</Label>
                  <Input
                    type="number"
                    value={formData.standardDuration}
                    onChange={(e) => setFormData({ ...formData, standardDuration: e.target.value })}
                    min={0}
                  />
                  <p className="text-xs text-muted-foreground mt-1">参考工作量</p>
                </div>
                <div>
                  <Label>排序</Label>
                  <Input
                    type="number"
                    value={formData.sortOrder}
                    onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) })}
                    min={0}
                  />
                  <p className="text-xs text-muted-foreground mt-1">显示顺序</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="required"
                  checked={formData.isRequired}
                  onCheckedChange={(checked) => setFormData({ ...formData, isRequired: checked })}
                />
                <Label htmlFor="required">是否必选服务</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleSubmit}>保存</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">服务类型总数</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{serviceTypes.length}</div>
            <p className="text-xs text-muted-foreground">已配置服务种类</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">权重总和</CardTitle>
            <Weight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalWeight}</div>
            <p className="text-xs text-muted-foreground">所有服务权重之和</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">必选服务数</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{serviceTypes.filter(s => s.isRequired).length}</div>
            <p className="text-xs text-muted-foreground">必须执行的服务</p>
          </CardContent>
        </Card>
      </div>

      {/* 服务类型列表 */}
      <Card>
        <CardHeader>
          <CardTitle>服务类型列表</CardTitle>
          <CardDescription>
            配置项目中可能用到的所有售前服务类型
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>排序</TableHead>
                <TableHead>服务编码</TableHead>
                <TableHead>服务名称</TableHead>
                <TableHead>分类</TableHead>
                <TableHead>权重</TableHead>
                <TableHead>标准时长</TableHead>
                <TableHead>必选</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {serviceTypes.map((service) => (
                <TableRow key={service.id}>
                  <TableCell>{service.sortOrder}</TableCell>
                  <TableCell className="font-mono text-sm">{service.serviceCode}</TableCell>
                  <TableCell className="font-medium">{service.serviceName}</TableCell>
                  <TableCell>
                    <Badge className={categoryConfig[service.serviceCategory]?.color}>
                      {categoryConfig[service.serviceCategory]?.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{service.weight}</span>
                  </TableCell>
                  <TableCell>{service.standardDuration ? `${service.standardDuration}h` : '-'}</TableCell>
                  <TableCell>
                    {service.isRequired ? (
                      <Badge variant="default">必选</Badge>
                    ) : (
                      <Badge variant="outline">可选</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={service.status === 'active' ? 'default' : 'secondary'}>
                      {service.status === 'active' ? '启用' : '禁用'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(service)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(service.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
