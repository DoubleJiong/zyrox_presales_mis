import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';
import { buildEmptyWorkbenchSummaryReadModel, getWorkbenchSummaryReadModel } from '@/lib/workbench/read-model';

export const dynamic = 'force-dynamic';

function jsonNoStore(body: unknown) {
  return NextResponse.json(body, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}

function inferAlertSeverity(title: string) {
  if (title.includes('严重')) {
    return 'critical';
  }

  if (title.includes('高')) {
    return 'high';
  }

  if (title.includes('低')) {
    return 'low';
  }

  return 'medium';
}

function buildLegacyPanels(inboxFeed: Awaited<ReturnType<typeof getWorkbenchSummaryReadModel>>['inboxFeed']) {
  return {
    riskAlerts: inboxFeed
      .filter((activity) => activity.type === 'alert')
      .map((activity) => ({
        id: activity.relatedId || activity.id,
        ruleName: activity.title,
        severity: inferAlertSeverity(activity.title),
        message: activity.description,
        href: activity.href || '/alerts/histories?status=pending',
      })),
    unreadMessages: inboxFeed
      .filter((activity) => activity.type === 'message')
      .map((activity) => ({
        id: activity.relatedId || activity.id,
        title: activity.title,
        href: activity.href || '/messages',
      })),
  };
}

export const GET = withAuth(async (request: NextRequest, { userId }) => {
  try {
    const readModel = await getWorkbenchSummaryReadModel(userId);
    const legacyPanels = buildLegacyPanels(readModel.inboxFeed);

    return jsonNoStore({
      success: true,
      data: {
        ...readModel,
        ...legacyPanels,
      },
    });
  } catch (error) {
    console.error('Get workbench summary error:', error);
    return jsonNoStore({
      success: true,
      data: {
        ...buildEmptyWorkbenchSummaryReadModel(),
        riskAlerts: [],
        unreadMessages: [],
      },
    });
  }
});
