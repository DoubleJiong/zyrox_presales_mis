'use client';

import { useState, useEffect } from 'react';
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
import { ArrowLeft, Loader2, Save, Sparkles } from 'lucide-react';
import { ContractUpload } from '@/components/contracts/contract-upload';

interface SignMode {
  id: number;
  modeCode: string;
  modeName: string;
  description: string;
}

// AI分析结果类型
interface MissingField {
  key: string;
  label: string;
  required: boolean;
  section: string;
  sectionId: string;
}

interface ContractAnalyzeResult {
  extractedInfo: Record<string, any>;
  missingFields: MissingField[];
  missingRequiredFields: MissingField[];
  groupedMissingFields: Record<string, MissingField[]>;
  summary: {
    totalFields: number;
    recognizedFields: number;
    missingCount: number;
    missingRequiredCount: number;
  };
}

export default function NewContractPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [signModes, setSignModes] = useState<SignMode[]>([]);
  const [aiExtracted, setAiExtracted] = useState(false); // 标记是否通过AI提取
  const [missingRequiredCount, setMissingRequiredCount] = useState(0);

  // 表单数据
  const [formData, setFormData] = useState({
    contractName: '',
    signMode: '1',
    signerUnit: '',
    userUnit: '',
    userUnitId: '',
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

  // 加载签约模式
  useEffect(() => {
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

    fetchSignModes();
  }, []);

  // AI分析完成后的回调 - 自动填充表单
  const handleAnalyzeComplete = (result: ContractAnalyzeResult) => {
    const extractedInfo = result.extractedInfo;
    setAiExtracted(true);
    setMissingRequiredCount(result.summary.missingRequiredCount);
    
    // 映射AI提取的字段到表单
    const updates: Partial<typeof formData> = {};
    
    if (extractedInfo.contractName) updates.contractName = extractedInfo.contractName;
    if (extractedInfo.signerUnit) updates.signerUnit = extractedInfo.signerUnit;
    if (extractedInfo.userUnit) updates.userUnit = extractedInfo.userUnit;
    if (extractedInfo.contractAmount) updates.contractAmount = extractedInfo.contractAmount;
    if (extractedInfo.warrantyAmount) updates.warrantyAmount = extractedInfo.warrantyAmount;
    if (extractedInfo.signDate) updates.signDate = extractedInfo.signDate;
    if (extractedInfo.warrantyYears) updates.warrantyYears = String(extractedInfo.warrantyYears);
    if (extractedInfo.projectAddress) updates.projectAddress = extractedInfo.projectAddress;
    if (extractedInfo.signerName) updates.signerName = extractedInfo.signerName;
    if (extractedInfo.bank) updates.bank = extractedInfo.bank;
    if (extractedInfo.userType) updates.userType = extractedInfo.userType;
    if (extractedInfo.projectCategory) updates.projectCategory = extractedInfo.projectCategory;
    if (extractedInfo.fundSource) updates.fundSource = extractedInfo.fundSource;
    if (extractedInfo.projectContent) updates.remark = extractedInfo.projectContent;
    if (extractedInfo.remark && !updates.remark) updates.remark = extractedInfo.remark;
    
    // 计算要求完成日期（合同结束日期）
    if (extractedInfo.endDate) updates.requireCompleteDate = extractedInfo.endDate;

    setFormData(prev => ({ ...prev, ...updates }));
  };

  const handleSubmit = async () => {
    // 验证必填字段
    if (!formData.contractName) {
      toast({ variant: 'destructive', title: '请输入合同名称' });
      document.getElementById('section-basic')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    if (!formData.signMode) {
      toast({ variant: 'destructive', title: '请选择签约模式' });
      document.getElementById('section-parties')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    if (!formData.contractAmount) {
      toast({ variant: 'destructive', title: '请输入合同金额' });
      document.getElementById('section-amount')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          projectId: formData.projectId ? parseInt(formData.projectId) : null,
          userUnitId: formData.userUnitId ? parseInt(formData.userUnitId) : null,
          contractAmount: formData.contractAmount,
          warrantyAmount: formData.warrantyAmount || null,
          warrantyYears: formData.warrantyYears ? parseInt(formData.warrantyYears) : null,
          createdBy: user?.id,
        }),
      });

      const result = await response.json();
      if (result.success) {
        toast({ title: '合同创建成功' });
        router.push(`/contracts/${result.data.id}`);
      } else {
        // 正确提取错误消息 - result.error 可能是对象 {code, message} 或字符串
        const errorMsg = typeof result.error === 'object' && result.error !== null
          ? (result.error.message || JSON.stringify(result.error))
          : (result.error || result.message || '创建失败，请稍后重试');
        toast({
          variant: 'destructive',
          title: '保存失败',
          description: errorMsg,
        });
      }
    } catch (error) {
      console.error('Contract save error:', error);
      toast({
        variant: 'destructive',
        title: '保存失败',
        description: error instanceof Error ? error.message : '网络错误，请稍后重试',
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedSignMode = signModes.find(m => m.modeCode === formData.signMode);

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          返回
        </Button>
        <h1 className="text-2xl font-bold">新建合同</h1>
        {aiExtracted && (
          <span className="flex items-center gap-1 text-sm text-primary bg-primary/10 px-2 py-1 rounded-full">
            <Sparkles className="h-3 w-3" />
            AI智能填充
          </span>
        )}
        {missingRequiredCount > 0 && (
          <span className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/30 px-2 py-1 rounded-full">
            {missingRequiredCount} 个必填项待补充
          </span>
        )}
      </div>

      {/* AI智能上传区域 */}
      <ContractUpload onAnalyzeComplete={handleAnalyzeComplete} />

      {/* 基本信息 */}
      <Card id="section-basic">
        <CardHeader>
          <CardTitle>合同基本信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contractName">
                合同名称（项目内容） <span className="text-red-500">*</span>
              </Label>
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
        </CardContent>
      </Card>

      {/* 签约方信息 */}
      <Card id="section-parties">
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
              <Label>
                签约单位名称 <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="请输入签约单位名称"
                value={formData.signerUnit}
                onChange={(e) => setFormData({ ...formData, signerUnit: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>
                用户单位名称 <span className="text-red-500">*</span>
              </Label>
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
      <Card id="section-amount">
        <CardHeader>
          <CardTitle>金额与时间</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                合同金额 <span className="text-red-500">*</span>
              </Label>
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
              <Label>项目要求完成时间</Label>
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
      <Card id="section-category">
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
      <Card id="section-other">
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
        <Button onClick={handleSubmit} disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              提交中...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              提交
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
