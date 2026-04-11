/**
 * 项目阶段转换规则
 * 以统一项目状态机为准，旧阶段值仅保留兼容展示。
 */

import { canTransitionProjectStage } from '@/modules/project/project-stage-policy';
import {
  GovernedProjectStage,
  PROJECT_STAGE_CONFIG,
  PROJECT_STAGE_ORDER,
  PROJECT_STATUS_CONFIG,
  ProjectStage,
  ProjectStatus,
  STAGE_TRANSITIONS,
} from './status-transitions';

const LEGACY_STAGE_ORDER: ProjectStage[] = ['opportunity', 'bidding', 'execution', 'acceptance', 'settlement', 'archived'];

function isGovernedStage(stage: ProjectStage): stage is GovernedProjectStage {
  return PROJECT_STAGE_ORDER.includes(stage as GovernedProjectStage);
}

function getStageOrder(stage: ProjectStage): ProjectStage[] {
  return isGovernedStage(stage) ? PROJECT_STAGE_ORDER : LEGACY_STAGE_ORDER;
}

/**
 * 阶段回退规则配置
 */
export interface StageRollbackRule {
  canRollbackTo: ProjectStage[];       // 可回退到的目标阶段
  requiresReason: boolean;              // 是否必须填写回退原因
  requiresApproval: boolean;            // 是否需要审批
  preserveData: boolean;                // 是否保留当前阶段数据
  notifyRoles: string[];                // 需要通知的角色
  warningMessage?: string;              // 回退警告信息
}

// 阶段回退规则矩阵
export const STAGE_ROLLBACK_RULES: Record<ProjectStage, StageRollbackRule> = {
  opportunity: {
    canRollbackTo: [],                  // 商机阶段无法回退
    requiresReason: false,
    requiresApproval: false,
    preserveData: false,
    notifyRoles: [],
  },
  bidding_pending: {
    canRollbackTo: ['opportunity'],
    requiresReason: true,
    requiresApproval: false,
    preserveData: true,
    notifyRoles: ['manager', 'members'],
    warningMessage: '投标立项待审批回退后，待审批记录仍会保留用于审计。',
  },
  bidding: {
    canRollbackTo: [],
    requiresReason: false,
    requiresApproval: false,
    preserveData: true,
    notifyRoles: [],
  },
  solution_review: {
    canRollbackTo: ['bidding'],
    requiresReason: true,               // 必须填写原因
    requiresApproval: false,
    preserveData: true,
    notifyRoles: ['manager', 'members'],
    warningMessage: '回退到招标投标后，方案评审记录保留用于审计。',
  },
  contract_pending: {
    canRollbackTo: ['bidding'],
    requiresReason: true,
    requiresApproval: false,
    preserveData: true,
    notifyRoles: ['manager', 'supervisor'],
    warningMessage: '回退到招标投标后，合同/商务确认记录保留用于审计。',
  },
  delivery_preparing: {
    canRollbackTo: [],
    requiresReason: false,
    requiresApproval: false,
    preserveData: true,
    notifyRoles: [],
  },
  delivering: {
    canRollbackTo: [],
    requiresReason: false,
    requiresApproval: false,
    preserveData: true,
    notifyRoles: [],
  },
  settlement: {
    canRollbackTo: [],
    requiresReason: false,
    requiresApproval: false,
    preserveData: true,
    notifyRoles: [],
  },
  archived: {
    canRollbackTo: [],
    requiresReason: false,
    requiresApproval: false,
    preserveData: true,
    notifyRoles: [],
  },
  cancelled: {
    canRollbackTo: [],
    requiresReason: false,
    requiresApproval: false,
    preserveData: false,
    notifyRoles: [],
  },
  execution: {
    canRollbackTo: ['bidding'],
    requiresReason: true,
    requiresApproval: false,
    preserveData: true,
    notifyRoles: ['manager'],
  },
  acceptance: {
    canRollbackTo: ['execution', 'bidding'],
    requiresReason: true,
    requiresApproval: false,
    preserveData: true,
    notifyRoles: ['manager'],
  },
};

/**
 * 常见回退原因选项
 */
export const ROLLBACK_REASONS: Record<string, string[]> = {
  'bidding->opportunity': [
    '招标文件变更，需重新评估',
    '投标延期，需等待新招标时间',
    '内部审批驳回，需重新准备',
    '竞争策略调整',
    '客户需求变更',
    '预算或资源问题',
    '其他原因',
  ],
  'archived->bidding': [
    '项目重新启动',
    '归档信息有误',
    '客户要求重新投标',
  ],
  'archived->opportunity': [
    '商机重新激活',
    '归档信息有误',
    '客户重新发起需求',
  ],
};

/**
 * 判断阶段变更是否为回退操作
 */
export function isStageRollback(fromStage: ProjectStage, toStage: ProjectStage): boolean {
  const order = getStageOrder(fromStage);
  const fromIndex = order.indexOf(fromStage);
  const toIndex = order.indexOf(toStage);
  return toIndex < fromIndex;
}

/**
 * 检查阶段回退是否允许
 */
export function validateStageRollback(
  fromStage: ProjectStage,
  toStage: ProjectStage,
  currentStatus: ProjectStatus,
  currentBidResult?: string | null
): { valid: boolean; reason?: string; warning?: string; rule?: StageRollbackRule } {
  // 规则1：检查是否为回退操作
  if (!isStageRollback(fromStage, toStage)) {
    return { valid: true }; // 不是回退，走正常变更流程
  }

  // 规则2：获取回退规则
  const rule = STAGE_ROLLBACK_RULES[fromStage];
  
  // 规则3：检查是否允许回退到目标阶段
  if (!rule.canRollbackTo.includes(toStage)) {
    return { 
      valid: false, 
      reason: `「${PROJECT_STAGE_CONFIG[fromStage].label}」不允许回退到「${PROJECT_STAGE_CONFIG[toStage].label}」` 
    };
  }

  const normalizedBidResult = typeof currentBidResult === 'string' ? currentBidResult.trim().toLowerCase() : '';

  if (normalizedBidResult === 'lost' || currentStatus === 'cancelled' || currentStatus === 'archived') {
    return { 
      valid: false, 
      reason: '已丢标或已取消的项目不允许阶段回退' 
    };
  }

  return { 
    valid: true, 
    warning: rule.warningMessage,
    rule 
  };
}

export function getRecommendedCompatStatusForStage(targetStage: ProjectStage): ProjectStatus {
  switch (targetStage) {
    case 'opportunity':
      return 'lead';
    case 'archived':
      return 'archived';
    case 'cancelled':
      return 'cancelled';
    default:
      return 'in_progress';
  }
}

/**
 * 获取阶段回退原因选项
 */
export function getRollbackReasonOptions(fromStage: ProjectStage, toStage: ProjectStage): string[] {
  const key = `${fromStage}->${toStage}`;
  return ROLLBACK_REASONS[key] || ['其他原因'];
}

/**
 * 获取当前阶段可以变更到的目标阶段列表
 */
export function getAvailableStages(currentStage: ProjectStage): ProjectStage[] {
  return STAGE_TRANSITIONS[currentStage] || [];
}

/**
 * 检查阶段变更是否允许（考虑状态约束）
 */
export function validateStageTransition(
  fromStage: ProjectStage,
  toStage: ProjectStage,
  currentStatus: ProjectStatus
): { valid: boolean; reason?: string; warning?: string } {
  if (fromStage === toStage) {
    return { valid: false, reason: '目标阶段未发生变化' };
  }

  if (fromStage === 'archived' || fromStage === 'cancelled') {
    return { valid: false, reason: '归档后阶段不可变更' };
  }

  if (isGovernedStage(fromStage) && isGovernedStage(toStage)) {
    if (!canTransitionProjectStage(fromStage, toStage)) {
      return { valid: false, reason: '不支持的阶段变更' };
    }

    if (toStage === 'archived') {
      return {
        valid: true,
        warning: '归档后项目将进入只读状态，请确认前置业务已全部完成。',
      };
    }

    const governedWarnings: Partial<Record<ProjectStage, string>> = {
      bidding_pending: '该阶段通常应由投标立项审批提交动作触发，请确认当前操作符合治理流程。',
      solution_review: '进入方案评审前，请确认方案资料已完整。',
      contract_pending: '进入合同/商务确认前，请确认投标或评审结论已明确。',
      delivery_preparing: '进入执行准备前，请确认合同或商务条件已满足。',
      delivering: '进入执行中前，请确认交付负责人和计划已建立。',
      settlement: '进入结算中前，请确认交付已进入收尾。',
    };

    return governedWarnings[toStage]
      ? { valid: true, warning: governedWarnings[toStage] }
      : { valid: true };
  }

  const allowedStages = getAvailableStages(fromStage);
  if (!allowedStages.includes(toStage)) {
    return { valid: false, reason: '不支持的阶段变更' };
  }

  if (toStage === 'archived') {
    return { 
      valid: true, 
      warning: '归档后项目将不可修改，确定要归档吗？' 
    };
  }

  const warnings: Partial<Record<ProjectStage, string>> = {
    bidding: '进入招标投标阶段前，请确保招标信息完整',
    execution: '进入实施阶段前，请确保中标与交付前置条件已满足',
    acceptance: '进入验收阶段前，请确认交付成果可验收',
    archived: '归档前，请确保项目状态已更新（中标/丢标/取消）',
  };

  if (warnings[toStage]) {
    return { valid: true, warning: warnings[toStage] };
  }

  return { valid: true };
}

/**
 * 检查是否可以跳过某个阶段
 */
export function canSkipStage(fromStage: ProjectStage, toStage: ProjectStage): boolean {
  const order = getStageOrder(fromStage);
  const fromIndex = order.indexOf(fromStage);
  const toIndex = order.indexOf(toStage);
  
  return toIndex <= fromIndex + 1;
}

/**
 * 获取阶段变更时的必填字段
 */
export function getRequiredFieldsForStage(stage: ProjectStage, status: ProjectStatus): string[] {
  const baseFields = ['projectName', 'customerId'];
  
  const stageFields: Partial<Record<ProjectStage, string[]>> = {
    opportunity: ['budget', 'region'],
    bidding_pending: ['bidDeadline'],
    bidding: ['bidDeadline', 'bidMethod'],
    contract_pending: ['estimatedAmount'],
    delivery_preparing: ['managerId', 'deliveryManagerId'],
    delivering: ['managerId', 'deliveryManagerId'],
    settlement: ['managerId', 'deliveryManagerId'],
  };
  
  return [...baseFields, ...(stageFields[stage] || [])];
}

/**
 * 获取可用的阶段选项列表（带禁用信息）
 */
export function getStageOptions(
  currentStage: ProjectStage,
  currentStatus: ProjectStatus
): Array<{
  stage: ProjectStage;
  label: string;
  shortLabel: string;
  disabled: boolean;
  reason?: string;
  warning?: string;
}> {
  const allStages = isGovernedStage(currentStage) ? PROJECT_STAGE_ORDER : LEGACY_STAGE_ORDER;
  
  return allStages.map(stage => {
    const config = PROJECT_STAGE_CONFIG[stage];
    const validation = validateStageTransition(currentStage, stage, currentStatus);
    
    return {
      stage,
      label: config.label,
      shortLabel: config.shortLabel,
      disabled: !validation.valid,
      reason: validation.reason,
      warning: validation.warning
    };
  });
}

/**
 * 判断投标信息选项卡是否可访问
 */
export function canAccessBiddingTab(currentStage: ProjectStage): boolean {
  return currentStage !== 'opportunity';
}

/**
 * 判断项目结果选项卡是否可访问
 */
export function canAccessResultTab(
  currentStage: ProjectStage,
  currentStatus: ProjectStatus,
  bidResult?: string | null
): boolean {
  const normalizedBidResult = typeof bidResult === 'string' ? bidResult.trim().toLowerCase() : '';

  if (normalizedBidResult === 'won' || normalizedBidResult === 'lost') {
    return true;
  }

  if (currentStatus === 'won' || currentStatus === 'lost' || currentStatus === 'archived' || currentStatus === 'completed') {
    return true;
  }

  return [
    'bidding',
    'delivery_preparing',
    'delivering',
    'settlement',
    'archived',
    'execution',
    'acceptance',
  ].includes(currentStage);
}

/**
 * 判断项目结算选项卡是否可访问
 */
export function canAccessSettlementTab(currentStage: ProjectStage): boolean {
  return currentStage === 'settlement' || currentStage === 'archived';
}

/**
 * 判断实施方案选项卡是否可访问（交付准备中、执行中及之后阶段）
 */
export function canAccessImplementationPlanTab(currentStage: ProjectStage): boolean {
  return ['delivery_preparing', 'delivering', 'execution', 'acceptance', 'settlement', 'archived'].includes(currentStage);
}

/**
 * 获取应该显示的选项卡列表
 */
export function getVisibleTabs(stage: ProjectStage, status: ProjectStatus): string[] {
  const baseTabs = ['basic', 'opportunity'];
  
  if (canAccessBiddingTab(stage)) {
    baseTabs.push('bidding');
  }

  if (canAccessResultTab(stage, status)) {
    baseTabs.push('settlement');
  }

  if (canAccessSettlementTab(stage)) {
    baseTabs.push('financials');
  }
  
  return baseTabs;
}

/**
 * 判断项目是否只读
 */
export function isProjectReadOnly(stage: ProjectStage, status: ProjectStatus): boolean {
  return stage === 'archived' || stage === 'cancelled' || status === 'cancelled' || status === 'archived';
}
