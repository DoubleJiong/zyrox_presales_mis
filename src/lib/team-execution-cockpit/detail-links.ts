export type TeamExecutionDetailEntityType = 'person' | 'project' | 'customer' | 'solution';

export function buildTeamExecutionEntityHref(entityType: TeamExecutionDetailEntityType, entityId: number) {
  switch (entityType) {
    case 'person':
      return `/staff/${entityId}`;
    case 'project':
      return `/projects/${entityId}`;
    case 'customer':
      return `/customers/${entityId}`;
    case 'solution':
      return `/solutions/${entityId}`;
    default:
      return '/data-screen/team-execution';
  }
}

export function buildTeamExecutionTaskHref(input: {
  entityType: TeamExecutionDetailEntityType;
  entityId: number;
}) {
  const params = new URLSearchParams();
  params.set('scope', 'all');

  if (input.entityType === 'person') {
    params.set('assigneeId', String(input.entityId));
    return `/tasks?${params.toString()}`;
  }

  if (input.entityType === 'project') {
    params.set('projectId', String(input.entityId));
    return `/tasks?${params.toString()}`;
  }

  return null;
}