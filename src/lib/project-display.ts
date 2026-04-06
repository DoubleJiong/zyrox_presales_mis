import { getProjectStageLabel, getProjectStatusLabel } from '@/lib/project-field-mappings';
import { PROJECT_STAGE_CONFIG, type ProjectStage } from '@/lib/utils/status-transitions';

type ProjectDisplayRow = {
  projectStage?: string | null;
  status?: string | null;
};

export function resolveEffectiveProjectStage(project: ProjectDisplayRow): ProjectStage {
  if (project.projectStage && project.projectStage in PROJECT_STAGE_CONFIG) {
    return project.projectStage as ProjectStage;
  }

  switch (project.status) {
    case 'lead':
    case 'draft':
      return 'opportunity';
    case 'in_progress':
    case 'on_hold':
    case 'ongoing':
      return 'bidding';
    case 'won':
    case 'lost':
    case 'completed':
    case 'archived':
      return 'archived';
    case 'cancelled':
    case 'abandoned':
      return 'cancelled';
    default:
      return 'opportunity';
  }
}

export function getProjectDisplayStatusLabel(project: ProjectDisplayRow): string {
  const effectiveStage = resolveEffectiveProjectStage(project);
  return getProjectStageLabel(effectiveStage) || getProjectStatusLabel(project.status);
}

export function getProjectCompatStatusLabel(project: Pick<ProjectDisplayRow, 'status'>): string {
  return getProjectStatusLabel(project.status);
}