import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';
import { successResponse, errorResponse } from '@/lib/api-response';
import { PERMISSIONS } from '@/lib/permissions';
import { getTeamExecutionObjectDetailReadModel } from '@/lib/team-execution-cockpit/detail-read-model';
import { parseTeamExecutionFilters, resolveTeamExecutionDateRange } from '@/lib/team-execution-cockpit/filters';
import type { TeamExecutionDetailEntityType } from '@/lib/team-execution-cockpit/detail-links';

const ALLOWED_ENTITY_TYPES: TeamExecutionDetailEntityType[] = ['person', 'project', 'customer', 'solution'];

export const dynamic = 'force-dynamic';

export const GET = withAuth(
  async (request: NextRequest, { userId }) => {
    try {
      const entityType = request.nextUrl.searchParams.get('entityType') as TeamExecutionDetailEntityType | null;
      const entityId = Number(request.nextUrl.searchParams.get('entityId') || '0');

      if (!entityType || !ALLOWED_ENTITY_TYPES.includes(entityType) || !Number.isInteger(entityId) || entityId <= 0) {
        return errorResponse('BAD_REQUEST', '无效的详情对象参数');
      }

      const filters = parseTeamExecutionFilters(request.nextUrl.searchParams);
      const dateRange = resolveTeamExecutionDateRange(filters.range);
      const readModel = await getTeamExecutionObjectDetailReadModel(userId, entityType, entityId, filters, dateRange);

      if (!readModel) {
        return errorResponse('NOT_FOUND', '当前对象不存在或不在可见范围内');
      }

      return successResponse(readModel);
    } catch (error) {
      console.error('Get team execution detail error:', error);
      return errorResponse('INTERNAL_ERROR', '获取详情抽屉数据失败');
    }
  },
  {
    requiredPermissions: [PERMISSIONS.TEAM_EXECUTION_COCKPIT_VIEW],
  }
);