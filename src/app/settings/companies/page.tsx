'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Edit, Trash2, Building2, MapPin, Phone, User, X } from 'lucide-react';
import { validatePhone, validateRequired } from '@/lib/validators';

interface Subsidiary {
  id: number;
  subsidiaryCode: string;
  subsidiaryName: string;
  companyType: string | null;
  regions: string[] | null;
  address: string | null;
  contactPerson: string | null;
  contactPhone: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

// 公司类型映射
const companyTypeMap: Record<string, { label: string; color: string }> = {
  sales_subsidiary: { label: '销售子公司', color: 'bg-blue-500' },
  sales_branch: { label: '销售分公司', color: 'bg-green-500' },
  independent: { label: '独立子公司', color: 'bg-purple-500' },
};

// 全国省份列表（除浙江）
const provinces = [
  '北京', '天津', '河北', '山西', '内蒙古',
  '辽宁', '吉林', '黑龙江',
  '上海', '江苏', '安徽', '福建', '江西', '山东',
  '河南', '湖北', '湖南', '广东', '广西', '海南',
  '重庆', '四川', '贵州', '云南', '西藏',
  '陕西', '甘肃', '青海', '宁夏', '新疆',
  '香港', '澳门', '台湾',
  '全国',
];

// 浙江省地市
const zhejiangCities = [
  '杭州', '宁波', '温州', '嘉兴', '湖州',
  '绍兴', '金华', '衢州', '舟山', '台州', '丽水',
];

// 所有可选区域
const allRegions = [...zhejiangCities, ...provinces];

export default function SubsidiariesSettings() {
  const { toast } = useToast();
  const [subsidiaries, setSubsidiaries] = useState<Subsidiary[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSubsidiary, setEditingSubsidiary] = useState<Subsidiary | null>(null);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    subsidiaryCode: '',
    subsidiaryName: '',
    companyType: 'sales_branch',
    address: '',
    contactPerson: '',
    contactPhone: '',
    status: 'active',
  });

  useEffect(() => {
    fetchSubsidiaries();
  }, []);

  const fetchSubsidiaries = async () => {
    try {
      const response = await fetch('/api/subsidiaries');
      if (response.ok) {
        const result = await response.json();
        const data = result.data || result || [];
        setSubsidiaries(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Failed to fetch subsidiaries:', error);
      setSubsidiaries([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    // 验证必填字段
    const nameResult = validateRequired(formData.subsidiaryName, '公司名称');
    if (!nameResult.valid) {
      toast({ variant: 'destructive', title: '验证失败', description: nameResult.message });
      return;
    }

    const codeResult = validateRequired(formData.subsidiaryCode, '公司编码');
    if (!codeResult.valid) {
      toast({ variant: 'destructive', title: '验证失败', description: codeResult.message });
      return;
    }

    if (selectedRegions.length === 0) {
      toast({ variant: 'destructive', title: '验证失败', description: '请选择至少一个区域' });
      return;
    }

    // 验证联系电话格式
    if (formData.contactPhone) {
      const phoneResult = validatePhone(formData.contactPhone);
      if (!phoneResult.valid) {
        toast({ variant: 'destructive', title: '验证失败', description: phoneResult.message });
        return;
      }
    }

    try {
      const payload = {
        subsidiaryCode: formData.subsidiaryCode,
        subsidiaryName: formData.subsidiaryName,
        companyType: formData.companyType,
        regions: selectedRegions,
        address: formData.address || null,
        contactPerson: formData.contactPerson || null,
        contactPhone: formData.contactPhone || null,
        status: formData.status,
      };

      if (editingSubsidiary) {
        const response = await fetch('/api/subsidiaries', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingSubsidiary.id, ...payload }),
        });
        if (response.ok) {
          setIsDialogOpen(false);
          resetForm();
          await fetchSubsidiaries();
          toast({ title: '操作成功', description: '公司信息更新成功' });
        }
      } else {
        const response = await fetch('/api/subsidiaries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (response.ok) {
          setIsDialogOpen(false);
          resetForm();
          await fetchSubsidiaries();
          toast({ title: '操作成功', description: '公司创建成功' });
        }
      }
    } catch (error) {
      console.error('Failed to save subsidiary:', error);
      toast({ variant: 'destructive', title: '操作失败', description: '保存失败，请稍后重试' });
    }
  };

  const resetForm = () => {
    setFormData({
      subsidiaryCode: '',
      subsidiaryName: '',
      companyType: 'sales_branch',
      address: '',
      contactPerson: '',
      contactPhone: '',
      status: 'active',
    });
    setSelectedRegions([]);
    setEditingSubsidiary(null);
  };

  const handleEdit = (subsidiary: Subsidiary) => {
    setEditingSubsidiary(subsidiary);
    setFormData({
      subsidiaryCode: subsidiary.subsidiaryCode,
      subsidiaryName: subsidiary.subsidiaryName,
      companyType: subsidiary.companyType || 'sales_branch',
      address: subsidiary.address || '',
      contactPerson: subsidiary.contactPerson || '',
      contactPhone: subsidiary.contactPhone || '',
      status: subsidiary.status,
    });
    setSelectedRegions(subsidiary.regions || []);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除该公司吗？')) return;
    
    try {
      const response = await fetch(`/api/subsidiaries?id=${id}`, { method: 'DELETE' });
      if (response.ok) {
        await fetchSubsidiaries();
        toast({ title: '删除成功', description: '公司已被删除' });
      }
    } catch (error) {
      console.error('Failed to delete subsidiary:', error);
      toast({ variant: 'destructive', title: '删除失败', description: '请稍后重试' });
    }
  };

  const toggleRegion = (region: string) => {
    if (selectedRegions.includes(region)) {
      setSelectedRegions(selectedRegions.filter(r => r !== region));
    } else {
      setSelectedRegions([...selectedRegions, region]);
    }
  };

  const removeRegion = (region: string) => {
    setSelectedRegions(selectedRegions.filter(r => r !== region));
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
      active: { label: '启用', variant: 'default' },
      inactive: { label: '停用', variant: 'secondary' },
    };
    const config = statusMap[status] || { label: status, variant: 'secondary' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getCompanyTypeBadge = (type: string | null) => {
    if (!type) return <span className="text-muted-foreground">-</span>;
    const config = companyTypeMap[type];
    if (!config) return <span className="text-muted-foreground">{type}</span>;
    return (
      <Badge variant="outline" className={config.color + ' text-white'}>
        {config.label}
      </Badge>
    );
  };

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
          <h2 className="text-2xl font-bold">分子公司配置</h2>
          <p className="text-muted-foreground">管理各分子公司的基本信息和覆盖区域</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="h-4 w-4 mr-2" />
              新增公司
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>{editingSubsidiary ? '编辑公司' : '新增公司'}</DialogTitle>
              <DialogDescription>配置分子公司的基本信息和覆盖区域</DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>公司名称 <span className="text-destructive">*</span></Label>
                  <Input
                    value={formData.subsidiaryName}
                    onChange={(e) => setFormData({ ...formData, subsidiaryName: e.target.value })}
                    placeholder="例如：杭州分公司"
                  />
                </div>
                <div>
                  <Label>公司编码 <span className="text-destructive">*</span></Label>
                  <Input
                    value={formData.subsidiaryCode}
                    onChange={(e) => setFormData({ ...formData, subsidiaryCode: e.target.value.toUpperCase().replace(/\s+/g, '') })}
                    placeholder="例如：HZ001"
                    disabled={!!editingSubsidiary}
                  />
                  <p className="text-xs text-muted-foreground mt-1">大写字母+数字，系统唯一</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>公司类型</Label>
                  <Select
                    value={formData.companyType}
                    onValueChange={(value) => setFormData({ ...formData, companyType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sales_subsidiary">销售子公司</SelectItem>
                      <SelectItem value="sales_branch">销售分公司</SelectItem>
                      <SelectItem value="independent">独立子公司</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>状态</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">启用</SelectItem>
                      <SelectItem value="inactive">停用</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* 区域多选 */}
              <div>
                <Label>覆盖区域 <span className="text-destructive">*</span></Label>
                <div className="border rounded-lg p-4 space-y-4">
                  {/* 已选区域显示 */}
                  <div className="flex flex-wrap gap-2 min-h-[32px]">
                    {selectedRegions.length === 0 ? (
                      <span className="text-muted-foreground text-sm">请选择覆盖区域</span>
                    ) : (
                      selectedRegions.map((region) => (
                        <Badge key={region} variant="secondary" className="gap-1">
                          <MapPin className="h-3 w-3" />
                          {region}
                          <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => removeRegion(region)} />
                        </Badge>
                      ))
                    )}
                  </div>

                  {/* 浙江省地市 */}
                  <div>
                    <p className="text-sm font-medium mb-2">浙江省地市</p>
                    <div className="grid grid-cols-6 gap-2">
                      {zhejiangCities.map((city) => (
                        <label key={city} className="flex items-center gap-1 cursor-pointer">
                          <Checkbox
                            checked={selectedRegions.includes(city)}
                            onCheckedChange={() => toggleRegion(city)}
                          />
                          <span className="text-sm">{city}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* 其他省份 */}
                  <div>
                    <p className="text-sm font-medium mb-2">其他省份/直辖市</p>
                    <ScrollArea className="h-[200px]">
                      <div className="grid grid-cols-6 gap-2">
                        {provinces.map((province) => (
                          <label key={province} className="flex items-center gap-1 cursor-pointer">
                            <Checkbox
                              checked={selectedRegions.includes(province)}
                              onCheckedChange={() => toggleRegion(province)}
                            />
                            <span className="text-sm">{province}</span>
                          </label>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </div>
              </div>

              <div>
                <Label>详细地址</Label>
                <Textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="公司详细地址"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>联系人</Label>
                  <Input
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    placeholder="联系人姓名"
                  />
                </div>
                <div>
                  <Label>联系电话</Label>
                  <Input
                    value={formData.contactPhone}
                    onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                    placeholder="联系电话"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>取消</Button>
              <Button onClick={handleSubmit}>{editingSubsidiary ? '保存' : '创建'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">总公司数</CardTitle>
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{subsidiaries.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">销售子公司</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {subsidiaries.filter(s => s.companyType === 'sales_subsidiary').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">销售分公司</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {subsidiaries.filter(s => s.companyType === 'sales_branch').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">独立子公司</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {subsidiaries.filter(s => s.companyType === 'independent').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>公司列表</CardTitle>
          <CardDescription>系统中的所有分子公司</CardDescription>
        </CardHeader>
        <CardContent>
          {subsidiaries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">暂无数据，请点击"新增公司"添加</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>编码</TableHead>
                  <TableHead>公司名称</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>覆盖区域</TableHead>
                  <TableHead>联系人</TableHead>
                  <TableHead>联系电话</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subsidiaries.map((subsidiary) => (
                  <TableRow key={subsidiary.id}>
                    <TableCell className="font-mono">{subsidiary.subsidiaryCode}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{subsidiary.subsidiaryName}</span>
                      </div>
                    </TableCell>
                    <TableCell>{getCompanyTypeBadge(subsidiary.companyType)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {(subsidiary.regions || []).slice(0, 3).map((region) => (
                          <Badge key={region} variant="outline" className="text-xs">
                            <MapPin className="h-3 w-3 mr-1" />
                            {region}
                          </Badge>
                        ))}
                        {(subsidiary.regions || []).length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{(subsidiary.regions || []).length - 3}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {subsidiary.contactPerson ? (
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3 text-muted-foreground" />
                          {subsidiary.contactPerson}
                        </div>
                      ) : <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell>
                      {subsidiary.contactPhone ? (
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          {subsidiary.contactPhone}
                        </div>
                      ) : <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell>{getStatusBadge(subsidiary.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(subsidiary)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(subsidiary.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
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
  );
}
