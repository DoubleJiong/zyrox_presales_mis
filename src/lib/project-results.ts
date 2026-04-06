export type ProjectBidResult = 'pending' | 'won' | 'lost';

export function normalizeProjectBidResult(value: unknown): ProjectBidResult | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === 'pending' || normalized === 'won' || normalized === 'lost') {
    return normalized;
  }

  return null;
}

export function resolveProjectBidResult(input: {
  projectBidResult?: unknown;
  biddingBidResult?: unknown;
  projectStatus?: unknown;
}): ProjectBidResult {
  return (
    normalizeProjectBidResult(input.projectBidResult) ||
    normalizeProjectBidResult(input.biddingBidResult) ||
    normalizeProjectBidResult(input.projectStatus) ||
    'pending'
  );
}

export function buildProjectResultSyncPayload(input: {
  bidResult: ProjectBidResult;
  winCompetitor?: string | null;
  loseReason?: string | null;
}) {
  if (input.bidResult === 'won') {
    return {
      bidResult: 'won' as const,
      projectStage: 'archived',
      status: 'won',
      winCompetitor: null,
      loseReason: null,
    };
  }

  if (input.bidResult === 'lost') {
    return {
      bidResult: 'lost' as const,
      projectStage: 'archived',
      status: 'lost',
      winCompetitor: input.winCompetitor ?? null,
      loseReason: input.loseReason ?? null,
    };
  }

  return {
    bidResult: 'pending' as const,
    projectStage: 'bidding',
    status: 'in_progress',
    winCompetitor: null,
    loseReason: null,
  };
}