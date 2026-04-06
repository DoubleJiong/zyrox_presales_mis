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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2, TrendingUp, Eye } from 'lucide-react';

interface StaffAssessment {
  id: number;
  staffId: number;
  staffName: string;
  assessmentPeriod: string;
  assessmentType: string;
  overallScore: number;
  rating: string;
  assessor: string;
  assessDate: string;
  status: string;
  comments: string;
  criteria: Record<string, number>;
  createdAt: string;
  createdBy: string;
}

interface StaffAssessmentManagerProps {
  staffId: number;
  staffName: string;
  assessments: StaffAssessment[];
  onAssessmentsChange: () => void;
}

const assessmentTypes = [
  { value: '季度考核', label: '季度考核' },
  { value: '半年考核', label: '半年考核' },
  { value: '年度考核', label: '年度考核' },
  { value: '专项考核', label: '专项考核' },
];

const ratingMap = {
  '优秀': { minScore: 90, color: '#10b981', variant: 'default' as const },
  '良好': { minScore: 80, color: '#3b82f6', variant: 'secondary' as const },
  '合格': { minScore: 70, color: '#f59e0b', variant: 'outline' as const },
  '待改进': { minScore: 60, color: '#ef4444', variant: 'destructive' as const },
  '不合格': { minScore: 0, color: '#ef4444', variant: 'destructive' as const },
};

export default function StaffAssessmentManager({
  staffId,
  staffName,
  assessments,
  onAssessmentsChange,
}: StaffAssessmentManagerProps) {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editingAssessment, setEditingAssessment] = useState<StaffAssessment | null>(null);
  const [viewingAssessment, setViewingAssessment] = useState<StaffAssessment | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [newAssessment, setNewAssessment] = useState<{
    assessmentPeriod: string;
    assessmentType: string;
    overallScore: number;
    assessor: string;
    assessDate: string;
    status: string;
    comments: string;
    criteria: Record<string, number>;
  }>({
    assessmentPeriod: '',
    assessmentType: '季度考核',
    overallScore: 80,
    assessor: 'admin',
    assessDate: new Date().toISOString().split('T')[0],
    status: 'completed',
    comments: '',
    criteria: {
      工作质量: 80,
      工作效率: 80,
      团队协作: 80,
      技术能力: 80,
      创新能力: 80,
    },
  });

  const handleAddAssessment = async () => {
    if (!newAssessment.assessmentPeriod || !newAssessment.assessmentType) {
      alert('请填写必填字段');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/stass-assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffId,
          staffName,
          ...newAssessment,
        }),
      });

      if (response.ok) {
        setAddDialogOpen(false);
        setNewAssessment({
          assessmentPeriod: '',
          assessmentType: '季度考核',
          overallScore: 80,
          assessor: 'admin',
          assessDate: new Date().toISOString().split('T')[0],
          status: 'completed',
          comments: '',
          criteria: {
            工作质量: 80,
            工作效率: 80,
            团队协作: 80,
            技术能力: 80,
            创新能力: 80,
          },
        });
        onAssessmentsChange();
      }
    } catch (error) {
      console.error('Failed to add assessment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditAssessment = async () => {
    if (!editingAssessment) return;

    setSubmitting(true);
    try {
      const response = await fetch('/api/staff-assessments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingAssessment.id,
          ...newAssessment,
        }),
      });

      if (response.ok) {
        setEditDialogOpen(false);
        setEditingAssessment(null);
        setNewAssessment({
          assessmentPeriod: '',
          assessmentType: '季度考核',
          overallScore: 80,
          assessor: 'admin',
          assessDate: new Date().toISOString().split('T')[0],
          status: 'completed',
          comments: '',
          criteria: {
            工作质量: 80,
            工作效率: 80,
            团队协作: 80,
            技术能力: 80,
            创新能力: 80,
          },
        });
        onAssessmentsChange();
      }
    } catch (error) {
      console.error('Failed to update assessment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAssessment = async (id: number) => {
    if (!confirm('确定要删除这条考核记录吗？')) return;

    try {
      const response = await fetch(`/api/staff-assessments?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        onAssessmentsChange();
      }
    } catch (error) {
      console.error('Failed to delete assessment:', error);
    }
  };

  const openEditDialog = (assessment: StaffAssessment) => {
    setEditingAssessment(assessment);
    setNewAssessment({
      assessmentPeriod: assessment.assessmentPeriod,
      assessmentType: assessment.assessmentType,
      overallScore: assessment.overallScore,
      assessor: assessment.assessor,
      assessDate: assessment.assessDate,
      status: assessment.status,
      comments: assessment.comments,
      criteria: assessment.criteria,
    });
    setEditDialogOpen(true);
  };

  const openViewDialog = (assessment: StaffAssessment) => {
    setViewingAssessment(assessment);
    setViewDialogOpen(true);
  };

  const getRatingBadge = (rating: string) => {
    const ratingInfo = ratingMap[rating as keyof typeof ratingMap];
    if (!ratingInfo) return <Badge variant="secondary">{rating}</Badge>;
    return <Badge variant={ratingInfo.variant}>{rating}</Badge>;
  };

  const calculateOverallScore = () => {
    const criteria = newAssessment.criteria;
    const scores = Object.values(criteria);
    if (scores.length === 0) return 80;
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  };

  const handleCriteriaChange = (criterion: string, value: number) => {
    setNewAssessment({
      ...newAssessment,
      criteria: {
        ...newAssessment.criteria,
        [criterion]: value,
      },
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">考核记录</h3>
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              添加考核
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>添加考核记录</DialogTitle>
              <DialogDescription>为该人员添加一条新的考核记录</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="assessmentPeriod">考核周期 *</Label>
                  <Input
                    id="assessmentPeriod"
                    placeholder="例如：2025-Q1"
                    value={newAssessment.assessmentPeriod}
                    onChange={(e) => setNewAssessment({ ...newAssessment, assessmentPeriod: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="assessmentType">考核类型 *</Label>
                  <Select
                    value={newAssessment.assessmentType}
                    onValueChange={(value) => setNewAssessment({ ...newAssessment, assessmentType: value })}
                  >
                    <SelectTrigger id="assessmentType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {assessmentTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="assessor">考核人</Label>
                  <Input
                    id="assessor"
                    placeholder="考核人姓名"
                    value={newAssessment.assessor}
                    onChange={(e) => setNewAssessment({ ...newAssessment, assessor: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="assessDate">考核日期</Label>
                  <Input
                    id="assessDate"
                    type="date"
                    value={newAssessment.assessDate}
                    onChange={(e) => setNewAssessment({ ...newAssessment, assessDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label>考核标准（0-100分）</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {Object.entries(newAssessment.criteria).map(([criterion, score]) => (
                    <div key={criterion} className="space-y-2">
                      <Label htmlFor={`criteria-${criterion}`} className="text-sm">
                        {criterion}
                      </Label>
                      <Input
                        id={`criteria-${criterion}`}
                        type="number"
                        min="0"
                        max="100"
                        value={score}
                        onChange={(e) =>
                          handleCriteriaChange(criterion, parseInt(e.target.value) || 0)
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="comments">评价意见</Label>
                <Textarea
                  id="comments"
                  placeholder="请输入评价意见（可选）"
                  value={newAssessment.comments}
                  onChange={(e) => setNewAssessment({ ...newAssessment, comments: e.target.value })}
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleAddAssessment} disabled={submitting}>
                {submitting ? '添加中...' : '添加'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {assessments.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground border rounded-lg">
          暂无考核记录，点击上方按钮添加
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>考核周期</TableHead>
                <TableHead>考核类型</TableHead>
                <TableHead>考核日期</TableHead>
                <TableHead>考核人</TableHead>
                <TableHead>总分</TableHead>
                <TableHead>评级</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assessments.map((assessment) => (
                <TableRow key={assessment.id}>
                  <TableCell className="font-medium">{assessment.assessmentPeriod}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{assessment.assessmentType}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {new Date(assessment.assessDate).toLocaleDateString('zh-CN')}
                  </TableCell>
                  <TableCell className="text-sm">{assessment.assessor}</TableCell>
                  <TableCell className="font-medium">{assessment.overallScore}</TableCell>
                  <TableCell>{getRatingBadge(assessment.rating)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openViewDialog(assessment)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(assessment)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteAssessment(assessment.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* 查看考核详情 */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>考核详情</DialogTitle>
            <DialogDescription>查看详细的考核信息</DialogDescription>
          </DialogHeader>
          {viewingAssessment && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">考核周期</div>
                  <div className="font-medium">{viewingAssessment.assessmentPeriod}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">考核类型</div>
                  <div className="font-medium">
                    <Badge variant="outline">{viewingAssessment.assessmentType}</Badge>
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">考核人</div>
                  <div className="font-medium">{viewingAssessment.assessor}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">考核日期</div>
                  <div className="font-medium">
                    {new Date(viewingAssessment.assessDate).toLocaleDateString('zh-CN')}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold">考核标准</h4>
                <div className="space-y-2">
                  {Object.entries(viewingAssessment.criteria).map(([criterion, score]) => (
                    <div key={criterion} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <span className="font-medium">{criterion}</span>
                      <div className="flex items-center gap-3">
                        <div className="w-24 bg-secondary rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full"
                            style={{ width: `${score}%` }}
                          />
                        </div>
                        <span className="font-bold">{score}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg">
                <span className="font-semibold">总分</span>
                <div className="flex items-center gap-4">
                  <span className="text-3xl font-bold">{viewingAssessment.overallScore}</span>
                  {getRatingBadge(viewingAssessment.rating)}
                </div>
              </div>

              {viewingAssessment.comments && (
                <div className="space-y-2">
                  <h4 className="font-semibold">评价意见</h4>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm">{viewingAssessment.comments}</p>
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setViewDialogOpen(false)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
