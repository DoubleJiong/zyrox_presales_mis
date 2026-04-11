/**
 * 项目状态与阶段元数据
 * 设计基线：docs/plans/2026-03-29-project-state-machine-and-approval-system-design.md
 */

export type LegacyProjectStatus = 'lead' | 'in_progress' | 'won' | 'lost' | 'on_hold';
export type CompatProjectStatus = 'draft' | 'ongoing' | 'completed' | 'cancelled' | 'archived' | 'abandoned';
export type ProjectStatus = LegacyProjectStatus | CompatProjectStatus;

export type GovernedProjectStage =
  | 'opportunity'
  | 'bidding_pending'
  | 'bidding'
  | 'solution_review'
  | 'contract_pending'
  | 'delivery_preparing'
  | 'delivering'
  | 'settlement'
  | 'archived'
  | 'cancelled';

export type LegacyProjectStage = 'execution' | 'acceptance';
export type ProjectStage = GovernedProjectStage | LegacyProjectStage;

export const PROJECT_STAGE_ORDER: ProjectStage[] = [
  'opportunity',
  'bidding_pending',
  'bidding',
  'solution_review',
  'contract_pending',
  'delivery_preparing',
  'delivering',
  'settlement',
  'archived',
  'cancelled',
];

export const STAGE_TRANSITIONS: Record<ProjectStage, ProjectStage[]> = {
  opportunity: ['bidding_pending', 'cancelled'],
  bidding_pending: ['bidding', 'opportunity', 'cancelled'],
  bidding: ['solution_review', 'contract_pending', 'cancelled'],
  solution_review: ['bidding', 'contract_pending', 'cancelled'],
  contract_pending: ['delivery_preparing', 'bidding', 'cancelled'],
  delivery_preparing: ['delivering', 'cancelled'],
  delivering: ['settlement'],
  settlement: ['archived'],
  archived: [],
  cancelled: [],
  execution: ['acceptance', 'settlement'],
  acceptance: ['settlement', 'archived'],
};

export const PROJECT_STATUS_CONFIG: Record<ProjectStatus, { label: string; color: string; description: string }> = {
  lead: { label: '商机线索', color: 'slate', description: '旧版业务状态，保留兼容展示。' },
  in_progress: { label: '跟进中', color: 'blue', description: '旧版业务状态，保留兼容展示。' },
  won: { label: '已中标', color: 'emerald', description: '旧版业务状态，保留兼容展示。' },
  lost: { label: '已丢标', color: 'red', description: '旧版业务状态，保留兼容展示。' },
  on_hold: { label: '已暂停', color: 'amber', description: '旧版业务状态，保留兼容展示。' },
  draft: { label: '草稿', color: 'slate', description: '兼容状态，仅用于旧链路兼容。' },
  ongoing: { label: '进行中', color: 'blue', description: '兼容状态，仅用于旧链路兼容。' },
  completed: { label: '已完成', color: 'emerald', description: '兼容状态，仅用于旧链路兼容。' },
  cancelled: { label: '已取消', color: 'gray', description: '项目已取消。' },
  archived: { label: '已归档', color: 'gray', description: '兼容状态，仅用于旧链路兼容。' },
  abandoned: { label: '已放弃', color: 'gray', description: '历史兼容状态。' },
};

export const PROJECT_STAGE_CONFIG: Record<ProjectStage, { label: string; shortLabel: string; color: string; description: string }> = {
  opportunity: { label: '商机阶段', shortLabel: '商机', color: 'blue', description: '线索跟进、需求澄清和立项准备。' },
  bidding_pending: { label: '投标立项待审批', shortLabel: '待审批', color: 'amber', description: '已提交投标立项审批，等待审批结果。' },
  bidding: { label: '招标投标', shortLabel: '投标', color: 'orange', description: '投标准备、报价和投标执行。' },
  solution_review: { label: '投标评标', shortLabel: '评标', color: 'violet', description: '项目进入投标评标与结果确认阶段。' },
  contract_pending: { label: '合同/商务确认中', shortLabel: '商务', color: 'cyan', description: '方案或商务条件已进入合同确认。' },
  delivery_preparing: { label: '执行准备中', shortLabel: '准备', color: 'emerald', description: '交付前资源、计划和交接准备。' },
  delivering: { label: '执行中', shortLabel: '执行', color: 'green', description: '项目进入交付执行阶段。' },
  settlement: { label: '结算中', shortLabel: '结算', color: 'yellow', description: '项目进入结算与收尾。' },
  archived: { label: '已归档', shortLabel: '归档', color: 'gray', description: '项目业务闭环完成，仅允许查询和补录。' },
  cancelled: { label: '已取消', shortLabel: '取消', color: 'gray', description: '项目终止，不再进入后续链路。' },
  execution: { label: '实施阶段', shortLabel: '实施', color: 'green', description: '历史阶段值，保留兼容展示。' },
  acceptance: { label: '验收阶段', shortLabel: '验收', color: 'purple', description: '历史阶段值，保留兼容展示。' },
};

