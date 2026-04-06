'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DictSelect } from '@/components/dictionary/dict-select';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Loader2, Save } from 'lucide-react';

interface ContractDetail {
  id: number;
  contractCode: string;
  contractName: string;
  contractStatus: string;
  processStatus: string;
  signMode: string;
  signerUnit: string | null;
  userUnit: string | null;
  userUnitId: number | null;
  projectId: number | null;
  projectCode: string | null;
  department: string | null;
  contractAmount: string;
  warrantyAmount: string | null;
  signDate: string | null;
  warrantyYears: number | null;
  requireCompleteDate: string | null;
  signerName: string | null;
  userType: string | null;
  projectCategory: string | null;
  fundSource: string | null;
  bank: string | null;
  projectAddress: string | null;
  remark: string | null;
}

interface SignMode {
  id: number;
  modeCode: string;
  modeName: string;
  description: string;
}

export default function EditContractPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [signModes, setSignModes] = useState<SignMode[]>([]);
  const [contract, setContract] = useState<ContractDetail | null>(null);

  const [formData, setFormData] = useState({
    contractName: '',
    contractStatus: 'draft',
    processStatus: 'pending',
    signMode: '1',
    signerUnit: '',
    userUnit: '',
    projectId: '',
    department: '',
    contractAmount: '',
    warrantyAmount: '',
    signDate: '',
    warrantyYears: '',
    requireCompleteDate: '',
    signerName: '',
    userType: '',
    projectCategory: '',
    fundSource: '',
    bank: '',
    projectAddress: '',
    remark: '',
  });

  useEffect(() => {
    fetchContract();
    fetchSignModes();
  }, []);

  const fetchContract = async () => {
    try {
      const response = await fetch(`/api/contracts/${resolvedParams.id}`);
      const result = await response.json();

      if (result.success) {
        const data = result.data;
        setContract(data);
        setFormData({
          contractName: data.contractName || '',
          contractStatus: data.contractStatus || 'draft',
          processStatus: data.processStatus || 'pending',
          signMode: data.signMode || '1',
          signerUnit: data.signerUnit || '',
          userUnit: data.userUnit || '',
          projectId: data.projectId ? String(data.projectId) : '',
          department: data.department || '',
          contractAmount: data.contractAmount || '',
          warrantyAmount: data.warrantyAmount || '',
          signDate: data.signDate || '',
          warrantyYears: data.warrantyYears ? String(data.warrantyYears) : '',
          requireCompleteDate: data.requireCompleteDate || '',
          signerName: data.signerName || '',
          userType: data.userType || '',
          projectCategory: data.projectCategory || '',
          fundSource: data.fundSource || '',
          bank: data.bank || '',
          projectAddress: data.projectAddress || '',
          remark: data.remark || '',
        });
      } else {
        toast({ variant: 'destructive', title: '合同不存在' });
        router.push('/contracts');
      }
    } catch (error) {
      console.error('Failed to fetch contract:', error);
      toast({ variant: 'destructive', title: '获取合同详情失败' });
    } finally {
      setLoading(false);
    }
  };

  const fetchSignModes = async () => {
    try {
      const response = await fetch('/api/sign-modes');
      const result = await response.json();
      if (result.success) {
        setSignModes(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch sign modes:', error);
    }
  };

  const handleSubmit = async () => {
    if (!formData.contractName) {
      toast({ variant: 'destructive', title: '请输入合同名称' });
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/contracts/${resolvedParams.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          projectId: formData.projectId ? parseInt(formData.projectId) : null,
          warrantyYears: formData.warrantyYears ? parseInt(formData.warrantyYears) : null,
        }),
      });

      const result = await response.json();
      if (result.success) {
        toast({ title: '合同更新成功' });
        router.push(`/contracts/${resolvedParams.id}`);
      } else {
        // 正确提取错误消息 - result.error 可能是对象 {code, message} 或字符串
        const errorMsg = typeof result.error === 'object' && result.error !== null
          ? (result.error.message || JSON.stringify(result.error))
          : (result.error || result.message || '更新失败，请稍后重试');
        toast({
          variant: 'destructive',
          title: '保存失败',
          description: errorMsg,
        });
      }
    } catch (error) {
      console.error('Contract update error:', error);
      toast({
        variant: 'destructive',
        title: '保存失败',
        description: error instanceof Error ? error.message : '网络错误，请稍后重试',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const selectedSignMode = signModes.find(m => m.modeCode === formData.signMode);

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          返回
        </Button>
        <h1 className="text-2xl font-bold">编辑合同</h1>
        <span className="text-muted-foreground">{contract?.contractCode}</span>
      </div>

      {/* 基本信息 */}
      <Card>
        <CardHeader>
          <CardTitle>合同基本信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contractName">合同名称 *</Label>
              <Input
                id="contractName"
                placeholder="请输入合同名称"
                value={formData.contractName}
                onChange={(e) => setFormData({ ...formData, contractName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">所属部门</Label>
              <Input
                id="department"
                placeholder="请输入所属部门"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>合同状态</Label>
              <DictSelect
                category="contract_status"
                value={formData.contractStatus}
                onValueChange={(v) => setFormData({ ...formData, contractStatus: v })}
                placeholder="请选择合同状态"
              />
            </div>
            <div className="space-y-2">
              <Label>流程状态</Label>
              <DictSelect
                category="process_status"
                value={formData.processStatus}
                onValueChange={(v) => setFormData({ ...formData, processStatus: v })}
                placeholder="请选择流程状态"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 签约方信息 */}
      <Card>
        <CardHeader>
          <CardTitle>签约方信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>签约模式</Label>
            <Select value={formData.signMode} onValueChange={(v) => setFormData({ ...formData, signMode: v })}>
              <SelectTrigger>
                <SelectValue placeholder="请选择签约模式" />
              </SelectTrigger>
              <SelectContent>
                {signModes.map((mode) => (
                  <SelectItem key={mode.modeCode} value={mode.modeCode}>
                    {mode.modeName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedSignMode && (
              <p className="text-sm text-muted-foreground">{selectedSignMode.description}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>签约单位名称</Label>
              <Input
                placeholder="请输入签约单位名称"
                value={formData.signerUnit}
                onChange={(e) => setFormData({ ...formData, signerUnit: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>用户单位名称</Label>
              <Input
                placeholder="请输入用户单位名称"
                value={formData.userUnit}
                onChange={(e) => setFormData({ ...formData, userUnit: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 金额与时间 */}
      <Card>
        <CardHeader>
          <CardTitle>金额与时间</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>合同金额 *</Label>
              <Input
                type="number"
                placeholder="请输入合同金额"
                value={formData.contractAmount}
                onChange={(e) => setFormData({ ...formData, contractAmount: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>质保金</Label>
              <Input
                type="number"
                placeholder="请输入质保金"
                value={formData.warrantyAmount}
                onChange={(e) => setFormData({ ...formData, warrantyAmount: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>签订日期</Label>
              <Input
                type="date"
                value={formData.signDate}
                onChange={(e) => setFormData({ ...formData, signDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>签订人</Label>
              <Input
                placeholder="请输入签订人"
                value={formData.signerName}
                onChange={(e) => setFormData({ ...formData, signerName: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>保修年限（年）</Label>
              <Input
                type="number"
                placeholder="请输入保修年限"
                value={formData.warrantyYears}
                onChange={(e) => setFormData({ ...formData, warrantyYears: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>要求完成时间</Label>
              <Input
                type="date"
                value={formData.requireCompleteDate}
                onChange={(e) => setFormData({ ...formData, requireCompleteDate: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 分类信息 */}
      <Card>
        <CardHeader>
          <CardTitle>分类信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>用户类型</Label>
              <DictSelect
                category="user_type"
                value={formData.userType}
                onValueChange={(v) => setFormData({ ...formData, userType: v })}
                placeholder="请选择用户类型"
              />
            </div>
            <div className="space-y-2">
              <Label>项目类别</Label>
              <DictSelect
                category="project_type"
                value={formData.projectCategory}
                onValueChange={(v) => setFormData({ ...formData, projectCategory: v })}
                placeholder="请选择项目类别"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>资金来源</Label>
              <DictSelect
                category="fund_source"
                value={formData.fundSource}
                onValueChange={(v) => setFormData({ ...formData, fundSource: v })}
                placeholder="请选择资金来源"
              />
            </div>
            <div className="space-y-2">
              <Label>银行</Label>
              <Input
                placeholder="请输入银行"
                value={formData.bank}
                onChange={(e) => setFormData({ ...formData, bank: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 其他信息 */}
      <Card>
        <CardHeader>
          <CardTitle>其他信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>项目地址</Label>
            <Input
              placeholder="请输入项目地址"
              value={formData.projectAddress}
              onChange={(e) => setFormData({ ...formData, projectAddress: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>备注</Label>
            <Textarea
              placeholder="请输入备注"
              value={formData.remark}
              onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* 操作按钮 */}
      <div className="flex justify-end gap-4">
        <Button variant="outline" onClick={() => router.back()}>
          取消
        </Button>
        <Button onClick={handleSubmit} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              保存中...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              保存
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
