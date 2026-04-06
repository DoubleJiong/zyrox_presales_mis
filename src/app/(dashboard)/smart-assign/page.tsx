'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
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
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Brain,
  Users,
  Target,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  BarChart3,
  Settings2,
  UserCheck,
  Sparkles,
  RefreshCw,
  ChevronRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// =====================================================
// 类型定义
// =====================================================

interface EmployeeCapacity {
  userId: number;
  userName: string;
  department: string;
  region?: string;
  skills: string[];
  currentWorkload: number;
  maxCapacity: number;
  availability: number;
  completedTasks: number;
  avgCompletionTime: number;
  successRate: number;
}

interface AssignmentSuggestion {
  userId: number;
  userName: string;
  score: number;
  reasons: string[];
  currentWorkload: number;
  availability: number;
}

interface AssignmentRule {
  id: string;
  name: string;
  description?: string;
  type: string;
  enabled: boolean;
  priority: number;
  weight: number;
}

// =====================================================
// 主组件
// =====================================================

export default function SmartAssignPage() {
  const [activeTab, setActiveTab] = useState('suggestions');
  const [employees, setEmployees] = useState<EmployeeCapacity[]>([]);
  const [suggestions, setSuggestions] = useState<AssignmentSuggestion[]>([]);
  const [rules, setRules] = useState<AssignmentRule[]>([]);
  const [loading, setLoading] = useState(false);

  // 任务信息表单
  const [taskInfo, setTaskInfo] = useState({
    type: 'project',
    priority: 'medium',
    region: '',
    requiredSkills: '',
    estimatedHours: 8,
  });

  // 选中的员工
  const [selectedEmployee, setSelectedEmployee] = useState<number | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  // 加载员工数据
  const loadEmployees = useCallback(async () => {
    try {
      const res = await fetch('/api/smart-assign?action=employees');
      const data = await res.json();
      if (data.success) {
        setEmployees(data.employees);
      }
    } catch (error) {
      console.error('加载员工数据失败:', error);
    }
  }, []);

  // 加载规则
  const loadRules = useCallback(async () => {
    try {
      const res = await fetch('/api/smart-assign?action=rules');
      const data = await res.json();
      if (data.success) {
        setRules(data.rules);
      }
    } catch (error) {
      console.error('加载规则失败:', error);
    }
  }, []);

  useEffect(() => {
    loadEmployees();
    loadRules();
  }, [loadEmployees, loadRules]);

  // 获取分配建议
  const getSuggestions = async () => {
    setLoading(true);
    try {
      const task = {
        id: `task-${Date.now()}`,
        type: taskInfo.type,
        priority: taskInfo.priority as 'low' | 'medium' | 'high' | 'urgent',
        region: taskInfo.region || undefined,
        requiredSkills: taskInfo.requiredSkills
          ? taskInfo.requiredSkills.split(',').map((s) => s.trim())
          : undefined,
        estimatedHours: taskInfo.estimatedHours,
      };

      const res = await fetch(
        `/api/smart-assign?action=suggestions&task=${encodeURIComponent(
          JSON.stringify(task)
        )}&max=5`
      );
      const data = await res.json();
      if (data.success) {
        setSuggestions(data.suggestions);
      }
    } catch (error) {
      console.error('获取分配建议失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 更新规则状态
  const toggleRule = async (ruleId: string, enabled: boolean) => {
    try {
      await fetch('/api/smart-assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updateRule',
          data: { ruleId, updates: { enabled } },
        }),
      });

      setRules((prev) =>
        prev.map((r) => (r.id === ruleId ? { ...r, enabled } : r))
      );
    } catch (error) {
      console.error('更新规则失败:', error);
    }
  };

  // 确认分配
  const confirmAssignment = async () => {
    if (!selectedEmployee) return;

    try {
      // 实际项目中这里应该调用任务分配API
      console.log('确认分配给用户:', selectedEmployee);
      setConfirmDialogOpen(false);
      setSelectedEmployee(null);
    } catch (error) {
      console.error('分配失败:', error);
    }
  };

  // 获取得分颜色
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  // 获取得分背景色
  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-500/20';
    if (score >= 60) return 'bg-yellow-500/20';
    return 'bg-red-500/20';
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Brain className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">智能任务分配</h1>
              <p className="text-muted-foreground text-sm">
                基于多维度规则的自动任务分配引擎
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={loadEmployees}>
            <RefreshCw className="w-4 h-4 mr-2" />
            刷新数据
          </Button>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-card/50 backdrop-blur border-border/50">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-blue-400" />
                <div>
                  <p className="text-sm text-muted-foreground">可用员工</p>
                  <p className="text-2xl font-bold">{employees.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur border-border/50">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <Target className="w-8 h-8 text-green-400" />
                <div>
                  <p className="text-sm text-muted-foreground">活跃规则</p>
                  <p className="text-2xl font-bold">
                    {rules.filter((r) => r.enabled).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur border-border/50">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-8 h-8 text-yellow-400" />
                <div>
                  <p className="text-sm text-muted-foreground">平均成功率</p>
                  <p className="text-2xl font-bold">
                    {employees.length > 0
                      ? Math.round(
                          employees.reduce((a, b) => a + b.successRate, 0) /
                            employees.length
                        )
                      : 0}
                    %
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur border-border/50">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <BarChart3 className="w-8 h-8 text-purple-400" />
                <div>
                  <p className="text-sm text-muted-foreground">平均负载</p>
                  <p className="text-2xl font-bold">
                    {employees.length > 0
                      ? Math.round(
                          (employees.reduce((a, b) => a + b.currentWorkload, 0) /
                            employees.reduce((a, b) => a + b.maxCapacity, 0)) *
                            100
                        )
                      : 0}
                    %
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 主内容区 */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-card/50">
            <TabsTrigger value="suggestions" className="gap-2">
              <Sparkles className="w-4 h-4" />
              分配建议
            </TabsTrigger>
            <TabsTrigger value="employees" className="gap-2">
              <Users className="w-4 h-4" />
              员工能力
            </TabsTrigger>
            <TabsTrigger value="rules" className="gap-2">
              <Settings2 className="w-4 h-4" />
              规则配置
            </TabsTrigger>
          </TabsList>

          {/* 分配建议 Tab */}
          <TabsContent value="suggestions" className="space-y-6 mt-4">
            {/* 任务信息表单 */}
            <Card className="bg-card/50 backdrop-blur border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">任务信息</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>任务类型</Label>
                    <Select
                      value={taskInfo.type}
                      onValueChange={(v) =>
                        setTaskInfo({ ...taskInfo, type: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="project">项目任务</SelectItem>
                        <SelectItem value="customer">客户跟进</SelectItem>
                        <SelectItem value="support">技术支持</SelectItem>
                        <SelectItem value="meeting">会议安排</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>优先级</Label>
                    <Select
                      value={taskInfo.priority}
                      onValueChange={(v) =>
                        setTaskInfo({ ...taskInfo, priority: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">低</SelectItem>
                        <SelectItem value="medium">中</SelectItem>
                        <SelectItem value="high">高</SelectItem>
                        <SelectItem value="urgent">紧急</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>区域</Label>
                    <Select
                      value={taskInfo.region}
                      onValueChange={(v) =>
                        setTaskInfo({ ...taskInfo, region: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="选择区域" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="华东">华东</SelectItem>
                        <SelectItem value="华南">华南</SelectItem>
                        <SelectItem value="华北">华北</SelectItem>
                        <SelectItem value="华中">华中</SelectItem>
                        <SelectItem value="西南">西南</SelectItem>
                        <SelectItem value="西北">西北</SelectItem>
                        <SelectItem value="东北">东北</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>所需技能</Label>
                    <Input
                      placeholder="多个技能用逗号分隔"
                      value={taskInfo.requiredSkills}
                      onChange={(e) =>
                        setTaskInfo({ ...taskInfo, requiredSkills: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>预计工时: {taskInfo.estimatedHours} 小时</Label>
                    <Slider
                      value={[taskInfo.estimatedHours]}
                      onValueChange={(v) =>
                        setTaskInfo({ ...taskInfo, estimatedHours: v[0] })
                      }
                      min={1}
                      max={40}
                      step={1}
                    />
                  </div>

                  <div className="flex items-end">
                    <Button
                      onClick={getSuggestions}
                      disabled={loading}
                      className="w-full"
                    >
                      {loading ? (
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Brain className="w-4 h-4 mr-2" />
                      )}
                      智能推荐
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 分配建议结果 */}
            <AnimatePresence mode="wait">
              {suggestions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-4"
                >
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Target className="w-5 h-5 text-primary" />
                    推荐候选人
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {suggestions.map((suggestion, index) => (
                      <motion.div
                        key={suggestion.userId}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <Card
                          className={`bg-card/50 backdrop-blur border-border/50 cursor-pointer transition-all hover:border-primary/50 ${
                            selectedEmployee === suggestion.userId
                              ? 'ring-2 ring-primary'
                              : ''
                          }`}
                          onClick={() => {
                            setSelectedEmployee(suggestion.userId);
                            setConfirmDialogOpen(true);
                          }}
                        >
                          <CardContent className="pt-4">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                  <span className="text-sm font-medium">
                                    {suggestion.userName.charAt(0)}
                                  </span>
                                </div>
                                <div>
                                  <p className="font-medium">
                                    {suggestion.userName}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    排名 #{index + 1}
                                  </p>
                                </div>
                              </div>
                              <div
                                className={`px-2 py-1 rounded-md ${getScoreBgColor(
                                  suggestion.score
                                )}`}
                              >
                                <span
                                  className={`text-sm font-bold ${getScoreColor(
                                    suggestion.score
                                  )}`}
                                >
                                  {suggestion.score}
                                </span>
                              </div>
                            </div>

                            {/* 匹配理由 */}
                            <div className="space-y-1 mb-3">
                              {suggestion.reasons.map((reason, i) => (
                                <div
                                  key={i}
                                  className="flex items-center gap-2 text-xs text-muted-foreground"
                                >
                                  <CheckCircle2 className="w-3 h-3 text-green-400" />
                                  {reason}
                                </div>
                              ))}
                            </div>

                            {/* 指标 */}
                            <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border/50 pt-3">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                工作量: {suggestion.currentWorkload}
                              </span>
                              <span className="flex items-center gap-1">
                                <TrendingUp className="w-3 h-3" />
                                可用性: {suggestion.availability}%
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </TabsContent>

          {/* 员工能力 Tab */}
          <TabsContent value="employees" className="mt-4">
            <Card className="bg-card/50 backdrop-blur border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">员工能力分析</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/50">
                        <th className="text-left py-3 px-4">员工</th>
                        <th className="text-left py-3 px-4">部门</th>
                        <th className="text-left py-3 px-4">区域</th>
                        <th className="text-left py-3 px-4">工作负载</th>
                        <th className="text-left py-3 px-4">可用性</th>
                        <th className="text-left py-3 px-4">成功率</th>
                        <th className="text-left py-3 px-4">技能</th>
                      </tr>
                    </thead>
                    <tbody>
                      {employees.map((emp) => (
                        <tr
                          key={emp.userId}
                          className="border-b border-border/30 hover:bg-muted/30 transition-colors"
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <span className="text-xs font-medium">
                                  {emp.userName.charAt(0)}
                                </span>
                              </div>
                              {emp.userName}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-muted-foreground">
                            {emp.department}
                          </td>
                          <td className="py-3 px-4">
                            {emp.region && (
                              <Badge variant="outline">{emp.region}</Badge>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    emp.currentWorkload / emp.maxCapacity > 0.7
                                      ? 'bg-red-500'
                                      : emp.currentWorkload / emp.maxCapacity >
                                        0.5
                                      ? 'bg-yellow-500'
                                      : 'bg-green-500'
                                  }`}
                                  style={{
                                    width: `${
                                      (emp.currentWorkload / emp.maxCapacity) *
                                      100
                                    }%`,
                                  }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {emp.currentWorkload}/{emp.maxCapacity}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`text-sm ${
                                emp.availability >= 50
                                  ? 'text-green-400'
                                  : emp.availability >= 30
                                  ? 'text-yellow-400'
                                  : 'text-red-400'
                              }`}
                            >
                              {emp.availability}%
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`text-sm ${
                                emp.successRate >= 90
                                  ? 'text-green-400'
                                  : emp.successRate >= 70
                                  ? 'text-yellow-400'
                                  : 'text-red-400'
                              }`}
                            >
                              {emp.successRate.toFixed(1)}%
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex flex-wrap gap-1">
                              {emp.skills.slice(0, 3).map((skill, i) => (
                                <Badge
                                  key={i}
                                  variant="secondary"
                                  className="text-xs"
                                >
                                  {skill}
                                </Badge>
                              ))}
                              {emp.skills.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{emp.skills.length - 3}
                                </Badge>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 规则配置 Tab */}
          <TabsContent value="rules" className="mt-4">
            <Card className="bg-card/50 backdrop-blur border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">分配规则配置</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {rules.map((rule) => (
                    <div
                      key={rule.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border/30"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            rule.enabled
                              ? 'bg-primary/20 text-primary'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          <span className="text-sm font-bold">
                            {rule.priority}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{rule.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {rule.description}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="text-sm">
                          <span className="text-muted-foreground">权重: </span>
                          <span className="font-medium">{rule.weight}%</span>
                        </div>
                        <Switch
                          checked={rule.enabled}
                          onCheckedChange={(checked) =>
                            toggleRule(rule.id, checked)
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* 确认分配对话框 */}
        <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>确认任务分配</DialogTitle>
              <DialogDescription>
                确认将此任务分配给选定的员工吗？
              </DialogDescription>
            </DialogHeader>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setConfirmDialogOpen(false)}
              >
                取消
              </Button>
              <Button onClick={confirmAssignment}>
                <UserCheck className="w-4 h-4 mr-2" />
                确认分配
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
