import { NextRequest } from 'next/server';
import { successResponse } from '@/lib/api-response';
import { withAuth } from '@/lib/auth-middleware';
import { PERMISSIONS } from '@/lib/permissions';
import {
  buildEmptyDataScreenPersonnelViewInitData,
  getDataScreenPersonnelViewInitData,
  parseDataScreenPersonnelViewInitFilters,
} from '@/lib/data-screen-personnel-view';

export const dynamic = 'force-dynamic';

export const GET = withAuth(
  async (request: NextRequest, { userId }) => {
    const filters = parseDataScreenPersonnelViewInitFilters(request.nextUrl.searchParams);

    try {
      const payload = await getDataScreenPersonnelViewInitData(userId, filters);
      return successResponse(payload);
    } catch (error) {
      console.error('Get data-screen personnel view init error:', error);
      return successResponse(buildEmptyDataScreenPersonnelViewInitData(filters));
    }
  },
  {
    requiredPermissions: [PERMISSIONS.DATASCREEN_VIEW],
  }
);