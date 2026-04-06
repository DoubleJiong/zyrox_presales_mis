import { eq, or } from 'drizzle-orm';
import { projects } from '@/db/schema';

export const VALID_PROJECT_STATUS_FILTERS = [
  'planning',
  'active',
  'completed',
  'paused',
  'lead',
  'in_progress',
  'won',
  'lost',
  'on_hold',
  'draft',
  'ongoing',
  'archived',
  'abandoned',
  'opportunity',
  'bidding_pending',
  'bidding',
  'solution_review',
  'contract_pending',
  'delivery_preparing',
  'delivering',
  'settlement',
  'cancelled',
] as const;

export function isValidProjectStatusFilter(status: string): boolean {
  return VALID_PROJECT_STATUS_FILTERS.includes(status as (typeof VALID_PROJECT_STATUS_FILTERS)[number]);
}

export function buildProjectStatusFilter(status: string) {
  switch (status) {
    case 'planning':
    case 'opportunity':
      return or(
        eq(projects.projectStage, 'opportunity'),
        eq(projects.status, 'lead'),
        eq(projects.status, 'draft')
      );
    case 'active':
      return or(
        eq(projects.projectStage, 'bidding_pending'),
        eq(projects.projectStage, 'bidding'),
        eq(projects.projectStage, 'solution_review'),
        eq(projects.projectStage, 'contract_pending'),
        eq(projects.projectStage, 'delivery_preparing'),
        eq(projects.projectStage, 'delivering'),
        eq(projects.projectStage, 'settlement'),
        eq(projects.status, 'in_progress'),
        eq(projects.status, 'on_hold'),
        eq(projects.status, 'ongoing')
      );
    case 'paused':
    case 'on_hold':
      return eq(projects.status, 'on_hold');
    case 'completed':
    case 'archived':
      return or(
        eq(projects.projectStage, 'archived'),
        eq(projects.status, 'won'),
        eq(projects.status, 'lost'),
        eq(projects.status, 'completed'),
        eq(projects.status, 'archived')
      );
    case 'cancelled':
      return or(
        eq(projects.projectStage, 'cancelled'),
        eq(projects.status, 'cancelled'),
        eq(projects.status, 'abandoned')
      );
    case 'lead':
    case 'draft':
    case 'in_progress':
    case 'won':
    case 'lost':
    case 'ongoing':
    case 'abandoned':
      return eq(projects.status, status);
    case 'bidding_pending':
    case 'bidding':
    case 'solution_review':
    case 'contract_pending':
    case 'delivery_preparing':
    case 'delivering':
    case 'settlement':
      return eq(projects.projectStage, status);
    default:
      return eq(projects.projectStage, status);
  }
}