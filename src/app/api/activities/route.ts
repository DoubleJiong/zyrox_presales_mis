import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';
import { getWorkbenchInboxFeed, normalizeActivityTypes } from '@/lib/workbench/read-model';

export const GET = withAuth(async (request: NextRequest, { userId }) => {
  try {
    const { searchParams } = new URL(request.url);
    const requestedLimit = parseInt(searchParams.get('limit') || '20', 10);
    const limit = Number.isNaN(requestedLimit)
      ? 20
      : Math.min(Math.max(requestedLimit, 1), 20);
    const types = normalizeActivityTypes(searchParams.get('types'));
    const result = await getWorkbenchInboxFeed({ userId, limit, types });

    return NextResponse.json({
      success: true,
      data: {
        list: result.list,
        total: result.total,
      },
    });
  } catch (error) {
    console.error('Get activities API error:', error);
    return NextResponse.json(
      { success: false, error: '获取动态列表失败' },
      { status: 500 }
    );
  }
});
