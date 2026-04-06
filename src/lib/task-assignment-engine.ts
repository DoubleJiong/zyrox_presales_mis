/**
 * 智能任务分配引擎
 * 基于规则的自动任务分配系统
 */

import { db } from '@/db';
import { and, eq, gt, lt, sql, desc } from 'drizzle-orm';
import { users, projects, customers } from '@/db/schema';

// =====================================================
// 类型定义
// =====================================================

export interface TaskAssignmentRule {
  id: string;
  name: string;
  description?: string;
  type: 'region' | 'skill' | 'workload' | 'priority' | 'custom';
  enabled: boolean;
  priority: number;
  conditions: AssignmentCondition[];
  weight: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AssignmentCondition {
  field: string;
  operator: 'equals' | 'contains' | 'gt' | 'lt' | 'in' | 'between';
  value: any;
}

export interface EmployeeCapacity {
  userId: number;
  userName: string;
  department: string;
  region?: string;
  skills: string[];
  currentWorkload: number;
  maxCapacity: number;
  availability: number; // 0-100
  completedTasks: number;
  avgCompletionTime: number;
  successRate: number;
}

export interface AssignmentSuggestion {
  userId: number;
  userName: string;
  score: number;
  reasons: string[];
  currentWorkload: number;
  availability: number;
}

export interface TaskInfo {
  id: string;
  type: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  region?: string;
  requiredSkills?: string[];
  estimatedHours?: number;
  customerId?: number;
  projectId?: number;
  deadline?: Date;
}

// =====================================================
// 规则配置存储
// =====================================================

// 内存中存储规则配置（实际应存数据库）
let assignmentRules: TaskAssignmentRule[] = [
  {
    id: 'rule-region',
    name: '区域匹配规则',
    description: '优先分配给负责该区域的员工',
    type: 'region',
    enabled: true,
    priority: 1,
    conditions: [],
    weight: 30,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'rule-workload',
    name: '工作负载均衡规则',
    description: '优先分配给工作量较少的员工',
    type: 'workload',
    enabled: true,
    priority: 2,
    conditions: [],
    weight: 25,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'rule-skill',
    name: '技能匹配规则',
    description: '优先分配给具备所需技能的员工',
    type: 'skill',
    enabled: true,
    priority: 3,
    conditions: [],
    weight: 20,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'rule-success',
    name: '成功率优先规则',
    description: '优先分配给历史成功率高的员工',
    type: 'priority',
    enabled: true,
    priority: 4,
    conditions: [],
    weight: 15,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'rule-availability',
    name: '可用性规则',
    description: '优先分配给当前可用性高的员工',
    type: 'priority',
    enabled: true,
    priority: 5,
    conditions: [],
    weight: 10,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

// =====================================================
// 员工能力分析
// =====================================================

/**
 * 获取员工能力信息
 */
export async function getEmployeeCapacities(
  department?: string
): Promise<EmployeeCapacity[]> {
  try {
    // 查询用户列表
    const userList = await db
      .select({
        userId: users.id,
        userName: users.realName,
        department: users.department,
        position: users.department,
      })
      .from(users)
      .where(
        and(
          eq(users.status, 'active'),
          department ? eq(users.department, department) : undefined
        )
      );

    // 计算每个员工的工作负载
    const capacities: EmployeeCapacity[] = await Promise.all(
      userList.map(async (user) => {
        // 获取员工当前任务数（简化计算）
        const workload = await calculateUserWorkload(user.userId);

        return {
          userId: user.userId,
          userName: user.userName,
          department: user.department || '',
          region: extractRegionFromDepartment(user.department),
          skills: extractSkillsFromPosition(user.position),
          currentWorkload: workload.current,
          maxCapacity: workload.max,
          availability: Math.max(0, 100 - (workload.current / workload.max) * 100),
          completedTasks: workload.completedCount,
          avgCompletionTime: workload.avgTime,
          successRate: workload.successRate,
        };
      })
    );

    return capacities;
  } catch (error) {
    console.error('获取员工能力信息失败:', error);
    return [];
  }
}

/**
 * 计算用户工作负载
 */
async function calculateUserWorkload(userId: number): Promise<{
  current: number;
  max: number;
  completedCount: number;
  avgTime: number;
  successRate: number;
}> {
  // 这里简化计算，实际应该查询任务表
  // 默认值
  return {
    current: Math.floor(Math.random() * 10) + 1,
    max: 15,
    completedCount: Math.floor(Math.random() * 50) + 10,
    avgTime: Math.random() * 5 + 1,
    successRate: Math.random() * 20 + 80,
  };
}

/**
 * 从部门提取区域信息
 */
function extractRegionFromDepartment(department?: string): string {
  if (!department) return '';
  
  const regionMap: Record<string, string> = {
    '华东区': '华东',
    '华南区': '华南',
    '华北区': '华北',
    '华中区': '华中',
    '西南区': '西南',
    '西北区': '西北',
    '东北区': '东北',
  };

  for (const [key, value] of Object.entries(regionMap)) {
    if (department.includes(key)) return value;
  }

  return '';
}

/**
 * 从职位提取技能
 */
function extractSkillsFromPosition(position?: string): string[] {
  if (!position) return [];

  const skillMap: Record<string, string[]> = {
    '教育': ['教育行业', '智慧校园', 'K12'],
    '医疗': ['医疗行业', '智慧医院', '公共卫生'],
    '政务': ['政务服务', '数字政府', '智慧城市'],
    '企业': ['企业数字化', 'OA', 'ERP'],
    '金融': ['金融科技', '银行', '保险'],
  };

  const skills: string[] = [];
  for (const [key, value] of Object.entries(skillMap)) {
    if (position?.includes(key)) {
      skills.push(...value);
    }
  }

  return skills;
}

// =====================================================
// 分配建议计算
// =====================================================

/**
 * 获取任务分配建议
 */
export async function getAssignmentSuggestions(
  task: TaskInfo,
  options?: {
    department?: string;
    maxSuggestions?: number;
  }
): Promise<AssignmentSuggestion[]> {
  const { department, maxSuggestions = 5 } = options || {};

  // 获取员工能力信息
  const employees = await getEmployeeCapacities(department);

  if (employees.length === 0) {
    return [];
  }

  // 获取启用的规则
  const enabledRules = assignmentRules
    .filter((r) => r.enabled)
    .sort((a, b) => a.priority - b.priority);

  // 计算每个员工的得分
  const suggestions: AssignmentSuggestion[] = employees.map((employee) => {
    let totalScore = 0;
    const reasons: string[] = [];

    enabledRules.forEach((rule) => {
      const result = calculateRuleScore(rule, task, employee);
      totalScore += result.score * (rule.weight / 100);

      if (result.reason) {
        reasons.push(result.reason);
      }
    });

    return {
      userId: employee.userId,
      userName: employee.userName,
      score: Math.round(totalScore * 100) / 100,
      reasons,
      currentWorkload: employee.currentWorkload,
      availability: employee.availability,
    };
  });

  // 按得分排序并返回前N个
  return suggestions
    .sort((a, b) => b.score - a.score)
    .slice(0, maxSuggestions);
}

/**
 * 计算规则得分
 */
function calculateRuleScore(
  rule: TaskAssignmentRule,
  task: TaskInfo,
  employee: EmployeeCapacity
): { score: number; reason?: string } {
  switch (rule.type) {
    case 'region':
      return calculateRegionScore(task, employee);
    case 'workload':
      return calculateWorkloadScore(employee);
    case 'skill':
      return calculateSkillScore(task, employee);
    case 'priority':
      if (rule.name.includes('成功率')) {
        return calculateSuccessRateScore(employee);
      }
      if (rule.name.includes('可用性')) {
        return calculateAvailabilityScore(employee);
      }
      return { score: 50 };
    default:
      return { score: 50 };
  }
}

/**
 * 区域匹配得分
 */
function calculateRegionScore(
  task: TaskInfo,
  employee: EmployeeCapacity
): { score: number; reason?: string } {
  if (!task.region || !employee.region) {
    return { score: 50 };
  }

  if (task.region === employee.region) {
    return {
      score: 100,
      reason: `负责${employee.region}区域`,
    };
  }

  return { score: 30 };
}

/**
 * 工作负载得分
 */
function calculateWorkloadScore(
  employee: EmployeeCapacity
): { score: number; reason?: string } {
  const workloadRatio = employee.currentWorkload / employee.maxCapacity;

  if (workloadRatio < 0.3) {
    return {
      score: 100,
      reason: '工作量较轻',
    };
  } else if (workloadRatio < 0.5) {
    return { score: 80, reason: '工作量适中' };
  } else if (workloadRatio < 0.7) {
    return { score: 60, reason: '工作量较重' };
  } else {
    return { score: 30, reason: '工作量过重' };
  }
}

/**
 * 技能匹配得分
 */
function calculateSkillScore(
  task: TaskInfo,
  employee: EmployeeCapacity
): { score: number; reason?: string } {
  if (!task.requiredSkills || task.requiredSkills.length === 0) {
    return { score: 50 };
  }

  const matchedSkills = task.requiredSkills.filter((skill) =>
    employee.skills.includes(skill)
  );

  if (matchedSkills.length === 0) {
    return { score: 20 };
  }

  const matchRatio = matchedSkills.length / task.requiredSkills.length;

  if (matchRatio >= 0.8) {
    return {
      score: 100,
      reason: `具备${matchedSkills.length}项相关技能`,
    };
  } else if (matchRatio >= 0.5) {
    return { score: 70, reason: '部分技能匹配' };
  }

  return { score: 40 };
}

/**
 * 成功率得分
 */
function calculateSuccessRateScore(
  employee: EmployeeCapacity
): { score: number; reason?: string } {
  if (employee.successRate >= 95) {
    return { score: 100, reason: '历史成功率优秀' };
  } else if (employee.successRate >= 85) {
    return { score: 80, reason: '历史成功率良好' };
  } else if (employee.successRate >= 70) {
    return { score: 60 };
  }

  return { score: 40 };
}

/**
 * 可用性得分
 */
function calculateAvailabilityScore(
  employee: EmployeeCapacity
): { score: number; reason?: string } {
  if (employee.availability >= 80) {
    return { score: 100, reason: '当前可用性高' };
  } else if (employee.availability >= 50) {
    return { score: 70 };
  } else if (employee.availability >= 30) {
    return { score: 50 };
  }

  return { score: 20 };
}

// =====================================================
// 规则管理
// =====================================================

/**
 * 获取所有规则
 */
export function getAssignmentRules(): TaskAssignmentRule[] {
  return [...assignmentRules];
}

/**
 * 更新规则
 */
export function updateAssignmentRule(
  ruleId: string,
  updates: Partial<TaskAssignmentRule>
): boolean {
  const index = assignmentRules.findIndex((r) => r.id === ruleId);
  if (index === -1) return false;

  assignmentRules[index] = {
    ...assignmentRules[index],
    ...updates,
    updatedAt: new Date(),
  };

  return true;
}

/**
 * 添加新规则
 */
export function addAssignmentRule(rule: Omit<TaskAssignmentRule, 'id' | 'createdAt' | 'updatedAt'>): TaskAssignmentRule {
  const newRule: TaskAssignmentRule = {
    ...rule,
    id: `rule-${Date.now()}`,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  assignmentRules.push(newRule);
  return newRule;
}

/**
 * 删除规则
 */
export function deleteAssignmentRule(ruleId: string): boolean {
  const index = assignmentRules.findIndex((r) => r.id === ruleId);
  if (index === -1) return false;

  assignmentRules.splice(index, 1);
  return true;
}

/**
 * 批量分配任务
 */
export async function batchAssignTasks(
  assignments: Array<{ taskId: string; userId: number }>
): Promise<{ success: boolean; assigned: number; failed: number }> {
  let assigned = 0;
  let failed = 0;

  for (const { taskId, userId } of assignments) {
    try {
      // 实际项目中这里应该更新任务表的assignee_id字段
      console.log(`分配任务 ${taskId} 给用户 ${userId}`);
      assigned++;
    } catch (error) {
      console.error(`分配任务 ${taskId} 失败:`, error);
      failed++;
    }
  }

  return { success: true, assigned, failed };
}
