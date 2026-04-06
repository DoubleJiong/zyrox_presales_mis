import { normalizeProjectBidResult } from '@/lib/project-results';

const ACTIVE_PROJECT_STAGES = new Set([
  'bidding_pending',
  'bidding',
  'solution_review',
  'contract_pending',
  'delivery_preparing',
  'delivering',
  'settlement',
  'execution',
  'acceptance',
]);

export function resolveProjectLifecycleForCreate(input: {
  projectStage?: unknown;
  bidResult?: unknown;
}) {
  const normalizedBidResult = normalizeProjectBidResult(input.bidResult);

  if (normalizedBidResult === 'won' || normalizedBidResult === 'lost') {
    return {
      projectStage: 'archived',
      status: normalizedBidResult,
      bidResult: normalizedBidResult,
    };
  }

  const normalizedStage = typeof input.projectStage === 'string' && input.projectStage.trim()
    ? input.projectStage.trim()
    : 'opportunity';

  if (normalizedStage === 'cancelled') {
    return {
      projectStage: 'cancelled',
      status: 'cancelled',
      bidResult: null,
    };
  }

  if (normalizedStage === 'archived') {
    return {
      projectStage: 'archived',
      status: 'archived',
      bidResult: null,
    };
  }

  if (ACTIVE_PROJECT_STAGES.has(normalizedStage)) {
    return {
      projectStage: normalizedStage,
      status: 'in_progress',
      bidResult: null,
    };
  }

  return {
    projectStage: 'opportunity',
    status: 'lead',
    bidResult: null,
  };
}