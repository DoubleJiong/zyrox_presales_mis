/**
 * 项目状态、阶段、优先级颜色工具函数
 * 基于 docs/项目管理模块优化/02-详细设计文档.md 实现
 */

import { ProjectStatus, ProjectStage } from './status-transitions';

// 优先级类型
export type Priority = 'urgent' | 'high' | 'medium' | 'low';

/**
 * 获取状态背景颜色类名
 */
export function getStatusBgColor(status: string): string {
  const colorMap: Record<string, string> = {
    lead: 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200',
    in_progress: 'bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200',
    won: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-emerald-200',
    lost: 'bg-red-100 text-red-700 hover:bg-red-200 border-red-200',
    on_hold: 'bg-amber-100 text-amber-700 hover:bg-amber-200 border-amber-200',
    draft: 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200',
    ongoing: 'bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200',
    completed: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-emerald-200',
    cancelled: 'bg-gray-100 text-gray-500 hover:bg-gray-200 border-gray-200',
    archived: 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-gray-200',
    abandoned: 'bg-gray-100 text-gray-500 hover:bg-gray-200 border-gray-200',
  };
  return colorMap[status] || 'bg-gray-100 text-gray-700 border-gray-200';
}

/**
 * 获取状态徽章颜色类名
 */
export function getStatusBadgeColor(status: string): string {
  const colorMap: Record<string, string> = {
    lead: 'bg-slate-500',
    in_progress: 'bg-blue-500',
    won: 'bg-emerald-500',
    lost: 'bg-red-500',
    on_hold: 'bg-amber-500',
    draft: 'bg-slate-500',
    ongoing: 'bg-blue-500',
    completed: 'bg-emerald-500',
    cancelled: 'bg-gray-400',
    archived: 'bg-gray-400',
    abandoned: 'bg-gray-400',
  };
  return colorMap[status] || 'bg-gray-500';
}

/**
 * 获取阶段背景颜色类名
 */
export function getStageBgColor(stage: string): string {
  const colorMap: Record<string, string> = {
    opportunity: 'bg-blue-50 text-blue-700 border-blue-200',
    bidding_pending: 'bg-amber-50 text-amber-700 border-amber-200',
    bidding: 'bg-orange-50 text-orange-700 border-orange-200',
    solution_review: 'bg-violet-50 text-violet-700 border-violet-200',
    contract_pending: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    delivery_preparing: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    delivering: 'bg-green-50 text-green-700 border-green-200',
    settlement: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    archived: 'bg-gray-50 text-gray-600 border-gray-200',
    cancelled: 'bg-gray-50 text-gray-500 border-gray-200',
    execution: 'bg-green-50 text-green-700 border-green-200',
    acceptance: 'bg-purple-50 text-purple-700 border-purple-200',
  };
  return colorMap[stage] || 'bg-gray-50 text-gray-600 border-gray-200';
}

/**
 * 获取阶段进度条颜色类名
 */
export function getStageProgressColor(stage: string): string {
  const colorMap: Record<string, string> = {
    opportunity: 'bg-blue-500',
    bidding_pending: 'bg-amber-500',
    bidding: 'bg-orange-500',
    solution_review: 'bg-violet-500',
    contract_pending: 'bg-cyan-500',
    delivery_preparing: 'bg-emerald-500',
    delivering: 'bg-green-500',
    settlement: 'bg-yellow-500',
    archived: 'bg-gray-400',
    cancelled: 'bg-gray-400',
    execution: 'bg-green-500',
    acceptance: 'bg-purple-500',
  };
  return colorMap[stage] || 'bg-gray-500';
}

/**
 * 获取优先级背景颜色类名
 */
export function getPriorityBgColor(priority: string): string {
  const colorMap: Record<string, string> = {
    urgent: 'bg-red-500 text-white hover:bg-red-600 border-red-600',
    high: 'bg-orange-100 text-orange-700 hover:bg-orange-200 border-orange-200',
    medium: 'bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200',
    low: 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-gray-200',
  };
  return colorMap[priority] || 'bg-gray-100 text-gray-600 border-gray-200';
}

/**
 * 获取优先级徽章颜色类名
 */
export function getPriorityBadgeColor(priority: string): string {
  const colorMap: Record<string, string> = {
    urgent: 'bg-red-500 text-white',
    high: 'bg-orange-500 text-white',
    medium: 'bg-blue-500 text-white',
    low: 'bg-gray-400 text-white',
  };
  return colorMap[priority] || 'bg-gray-500 text-white';
}

/**
 * 获取状态显示标签
 */
export function getStatusLabel(status: string): string {
  const labelMap: Record<string, string> = {
    lead: '商机线索',
    in_progress: '跟进中',
    won: '已中标',
    lost: '已丢标',
    on_hold: '已暂停',
    draft: '草稿',
    ongoing: '进行中',
    completed: '已完成',
    cancelled: '已取消',
    archived: '已归档',
    abandoned: '已放弃',
  };
  return labelMap[status] || status;
}

/**
 * 获取阶段显示标签
 */
export function getStageLabel(stage: string): string {
  const labelMap: Record<string, string> = {
    opportunity: '商机阶段',
    bidding_pending: '投标立项待审批',
    bidding: '招标投标',
    solution_review: '方案评审中',
    contract_pending: '合同/商务确认中',
    delivery_preparing: '执行准备中',
    delivering: '执行中',
    settlement: '结算中',
    archived: '已归档',
    cancelled: '已取消',
    execution: '实施阶段',
    acceptance: '验收阶段',
  };
  return labelMap[stage] || stage;
}

/**
 * 获取阶段短标签
 */
export function getStageShortLabel(stage: string): string {
  const labelMap: Record<string, string> = {
    opportunity: '商机',
    bidding_pending: '待审批',
    bidding: '投标',
    solution_review: '评审',
    contract_pending: '商务',
    delivery_preparing: '准备',
    delivering: '执行',
    settlement: '结算',
    archived: '归档',
    cancelled: '取消',
    execution: '实施',
    acceptance: '验收',
  };
  return labelMap[stage] || stage;
}

/**
 * 获取优先级显示标签
 */
export function getPriorityLabel(priority: string): string {
  const labelMap: Record<string, string> = {
    urgent: '紧急',
    high: '高',
    medium: '中',
    low: '低',
  };
  return labelMap[priority] || priority;
}

/**
 * CSS 类名映射（用于全局样式）
 */
export const PROJECT_COLORS = {
  // 状态颜色
  status: {
    lead: {
      bg: 'bg-slate-100',
      text: 'text-slate-700',
      border: 'border-slate-200',
      badge: 'bg-slate-500'
    },
    in_progress: {
      bg: 'bg-blue-100',
      text: 'text-blue-700',
      border: 'border-blue-200',
      badge: 'bg-blue-500'
    },
    won: {
      bg: 'bg-emerald-100',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
      badge: 'bg-emerald-500'
    },
    lost: {
      bg: 'bg-red-100',
      text: 'text-red-700',
      border: 'border-red-200',
      badge: 'bg-red-500'
    },
    on_hold: {
      bg: 'bg-amber-100',
      text: 'text-amber-700',
      border: 'border-amber-200',
      badge: 'bg-amber-500'
    },
    cancelled: {
      bg: 'bg-gray-100',
      text: 'text-gray-500',
      border: 'border-gray-200',
      badge: 'bg-gray-400'
    }
  },
  // 阶段颜色
  stage: {
    opportunity: {
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      border: 'border-blue-200',
      progress: 'bg-blue-500'
    },
    bidding: {
      bg: 'bg-orange-50',
      text: 'text-orange-700',
      border: 'border-orange-200',
      progress: 'bg-orange-500'
    },
    execution: {
      bg: 'bg-green-50',
      text: 'text-green-700',
      border: 'border-green-200',
      progress: 'bg-green-500'
    },
    acceptance: {
      bg: 'bg-purple-50',
      text: 'text-purple-700',
      border: 'border-purple-200',
      progress: 'bg-purple-500'
    },
    settlement: {
      bg: 'bg-yellow-50',
      text: 'text-yellow-700',
      border: 'border-yellow-200',
      progress: 'bg-yellow-500'
    },
    archived: {
      bg: 'bg-gray-50',
      text: 'text-gray-600',
      border: 'border-gray-200',
      progress: 'bg-gray-400'
    }
  },
  // 优先级颜色
  priority: {
    urgent: {
      bg: 'bg-red-500',
      text: 'text-white',
      border: 'border-red-600'
    },
    high: {
      bg: 'bg-orange-100',
      text: 'text-orange-700',
      border: 'border-orange-200'
    },
    medium: {
      bg: 'bg-blue-100',
      text: 'text-blue-700',
      border: 'border-blue-200'
    },
    low: {
      bg: 'bg-gray-100',
      text: 'text-gray-600',
      border: 'border-gray-200'
    }
  }
};
