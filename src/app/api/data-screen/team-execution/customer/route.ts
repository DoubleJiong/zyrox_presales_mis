import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';
import { successResponse } from '@/lib/api-response';
import { PERMISSIONS } from '@/lib/permissions';
import {
  buildEmptyTeamExecutionCustomerReadModel,
  getTeamExecutionCustomerReadModel,
} from '@/lib/team-execution-cockpit/read-model';
import { parseTeamExecutionFilters, resolveTeamExecutionDateRange } from '@/lib/team-execution-cockpit/filters';

export const dynamic = 'force-dynamic';

export const GET = withAuth(
  async (request: NextRequest, { userId }) => {
    try {
      const filters = parseTeamExecutionFilters(request.nextUrl.searchParams);
      const dateRange = resolveTeamExecutionDateRange(filters.range);
      const readModel = await getTeamExecutionCustomerReadModel(userId, filters, dateRange);

      return successResponse(readModel);
    } catch (error) {
      console.error('Get team execution customer view error:', error);
      const filters = parseTeamExecutionFilters(request.nextUrl.searchParams);
      return successResponse(buildEmptyTeamExecutionCustomerReadModel(filters));
    }
  },
  {
    requiredPermissions: [PERMISSIONS.TEAM_EXECUTION_COCKPIT_VIEW],
  }
);