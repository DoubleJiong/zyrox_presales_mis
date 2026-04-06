import { normalizeProjectBidResult } from '@/lib/project-results';

export type ProjectLifecycleBucket = 'lead' | 'in_progress' | 'won' | 'lost' | 'cancelled' | 'archived';

export const OPEN_PROJECT_LIFECYCLE_STAGES = [
  'opportunity',
  'bidding_pending',
  'bidding',
  'solution_review',
  'contract_pending',
  'delivery_preparing',
  'delivering',
  'settlement',
  'execution',
  'acceptance',
] as const;

export interface ProjectLifecycleRow {
  projectStage?: string | null;
  bidResult?: string | null;
  status?: string | null;
  count?: number | null;
  totalAmount?: number | string | null;
  actualAmount?: number | string | null;
}

export interface AggregatedProjectLifecycleRow {
  status: ProjectLifecycleBucket;
  count: number;
  totalAmount: number;
  actualAmount: number;
}

const ACTIVE_PROJECT_STAGES: Set<string> = new Set(
  OPEN_PROJECT_LIFECYCLE_STAGES.filter((stage) => stage !== 'opportunity')
);

const LIFECYCLE_BUCKET_ORDER: ProjectLifecycleBucket[] = ['lead', 'in_progress', 'won', 'lost', 'cancelled', 'archived'];

function toNumber(value: number | string | null | undefined): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

export function resolveProjectLifecycleBucket(row: Pick<ProjectLifecycleRow, 'projectStage' | 'bidResult' | 'status'>): ProjectLifecycleBucket {
  const normalizedStage = typeof row.projectStage === 'string' ? row.projectStage.trim() : '';
  const normalizedStatus = typeof row.status === 'string' ? row.status.trim().toLowerCase() : '';
  const normalizedBidResult = normalizeProjectBidResult(row.bidResult);

  if (normalizedBidResult === 'won') {
    return 'won';
  }

  if (normalizedBidResult === 'lost') {
    return 'lost';
  }

  if (normalizedStage === 'cancelled' || normalizedStatus === 'cancelled') {
    return 'cancelled';
  }

  if (normalizedStage === 'archived' || normalizedStatus === 'archived' || normalizedStatus === 'completed') {
    return 'archived';
  }

  if (normalizedStage === 'opportunity' || normalizedStatus === 'lead' || normalizedStatus === 'draft') {
    return 'lead';
  }

  if (ACTIVE_PROJECT_STAGES.has(normalizedStage) || normalizedStatus === 'in_progress' || normalizedStatus === 'ongoing' || normalizedStatus === 'on_hold') {
    return 'in_progress';
  }

  return 'lead';
}

export function isProjectLifecycleOpenForAlerts(row: Pick<ProjectLifecycleRow, 'projectStage' | 'bidResult' | 'status'>): boolean {
  const bucket = resolveProjectLifecycleBucket(row);
  return bucket === 'lead' || bucket === 'in_progress';
}

export function aggregateProjectLifecycleRows(rows: ProjectLifecycleRow[]): AggregatedProjectLifecycleRow[] {
  const aggregated = new Map<ProjectLifecycleBucket, AggregatedProjectLifecycleRow>();

  for (const bucket of LIFECYCLE_BUCKET_ORDER) {
    aggregated.set(bucket, {
      status: bucket,
      count: 0,
      totalAmount: 0,
      actualAmount: 0,
    });
  }

  for (const row of rows) {
    const bucket = resolveProjectLifecycleBucket(row);
    const current = aggregated.get(bucket)!;

    current.count += row.count ?? 0;
    current.totalAmount += toNumber(row.totalAmount);
    current.actualAmount += toNumber(row.actualAmount);
  }

  return LIFECYCLE_BUCKET_ORDER
    .map((bucket) => aggregated.get(bucket)!)
    .filter((row) => row.count > 0 || row.totalAmount > 0 || row.actualAmount > 0);
}

export function summarizeProjectLifecycle(rows: ProjectLifecycleRow[]) {
  const aggregated = aggregateProjectLifecycleRows(rows);
  const byStatus = Object.fromEntries(aggregated.map((row) => [row.status, row])) as Record<ProjectLifecycleBucket, AggregatedProjectLifecycleRow | undefined>;

  return {
    total: aggregated.reduce((sum, row) => sum + row.count, 0),
    active: (byStatus.lead?.count || 0) + (byStatus.in_progress?.count || 0),
    completed: byStatus.won?.count || 0,
    cancelled: byStatus.cancelled?.count || 0,
    won: byStatus.won?.count || 0,
    lost: byStatus.lost?.count || 0,
    archived: (byStatus.won?.count || 0) + (byStatus.lost?.count || 0) + (byStatus.archived?.count || 0),
    totalAmount: aggregated.reduce((sum, row) => sum + row.totalAmount, 0),
    actualAmount: aggregated.reduce((sum, row) => sum + row.actualAmount, 0),
  };
}