'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { DictSelect } from '@/components/dictionary/dict-select';
import { ArrowLeft, Loader2 } from 'lucide-react';

export default function NewCustomerPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    customerName: '',
    contactName: '',
    contactPhone: '',
    contactEmail: '',
    demandType: '',
    region: '',
    intentLevel: '',
    description: '',
    estimatedAmount: '',
    estimatedDate: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          estimatedAmount: formData.estimatedAmount ? parseFloat(formData.estimatedAmount) : null,
        }),
      });

      if (!response.ok) {
        throw new Error('创建客户失败');
      }

      const customer = await response.json();
      router.push(`/customers/${customer.id}`);
    } catch (error) {
      console.error('Failed to create customer:', error);
      toast({
        variant: 'destructive',
        title: '操作失败',
        description: '创建客户失败，请稍后重试',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">新建客户</h1>
          <p className="text-muted-foreground">填写客户信息并创建新的客户线索</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>基本信息</CardTitle>
            <CardDescription>填写客户的基本联系方式</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="customerName">客户名称 *</Label>
                <Input
                  id="customerName"
                  placeholder="请输入客户公司或个人名称"
                  value={formData.customerName}
                  onChange={(e) => handleChange('customerName', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactName">联系人 *</Label>
                <Input
                  id="contactName"
                  placeholder="请输入联系人姓名"
                  value={formData.contactName}
                  onChange={(e) => handleChange('contactName', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactPhone">联系电话 *</Label>
                <Input
                  id="contactPhone"
                  placeholder="请输入联系电话"
                  value={formData.contactPhone}
                  onChange={(e) => handleChange('contactPhone', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactEmail">联系邮箱</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  placeholder="请输入联系邮箱"
                  value={formData.contactEmail}
                  onChange={(e) => handleChange('contactEmail', e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>需求类型</Label>
              <DictSelect
                category="demand_type"
                value={formData.demandType}
                onValueChange={(value) => handleChange('demandType', value)}
                placeholder="请选择需求类型"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>区域</Label>
                <DictSelect
                  category="region"
                  value={formData.region}
                  onValueChange={(value) => handleChange('region', value)}
                  placeholder="请选择区域"
                />
              </div>

              <div className="space-y-2">
                <Label>意向等级</Label>
                <DictSelect
                  category="intent_level"
                  value={formData.intentLevel}
                  onValueChange={(value) => handleChange('intentLevel', value)}
                  placeholder="请选择意向等级"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="estimatedAmount">预估金额（元）</Label>
                <Input
                  id="estimatedAmount"
                  type="number"
                  placeholder="请输入预估金额"
                  value={formData.estimatedAmount}
                  onChange={(e) => handleChange('estimatedAmount', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="estimatedDate">预估成交日期</Label>
                <Input
                  id="estimatedDate"
                  type="date"
                  value={formData.estimatedDate}
                  onChange={(e) => handleChange('estimatedDate', e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">需求描述</Label>
              <Textarea
                id="description"
                placeholder="请详细描述客户的需求和期望"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4 mt-6">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            取消
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                创建中...
              </>
            ) : (
              '创建客户'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
