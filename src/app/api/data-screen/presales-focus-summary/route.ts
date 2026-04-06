import { NextRequest } from 'next/server';
import { sql } from 'drizzle-orm';
import { db } from '@/db';
import { withAuth } from '@/lib/auth-middleware';
import { successResponse, errorResponse } from '@/lib/api-response';
import { getAccessibleProjectIds, isSystemAdmin } from '@/lib/permissions/project';

type RowRecord = Record<string, unknown>;

function normalizeRows<T extends RowRecord>(result: unknown): T[] {
  if (Array.isArray(result)) {
    return result as T[];
  }

  if (result && typeof result === 'object' && 'rows' in result && Array.isArray((result as { rows: unknown[] }).rows)) {
    return (result as { rows: T[] }).rows;
  }

  return [];
}

function toNumber(value: unknown) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function toScopeCondition(admin: boolean, accessibleProjectIds: number[]) {
  if (admin) {
    return sql`TRUE`;
  }

  if (accessibleProjectIds.length === 0) {
    return sql`FALSE`;
  }

  return sql`pr.project_id = ANY(${accessibleProjectIds})`;
}

function toReuseScopeCondition(admin: boolean, accessibleProjectIds: number[]) {
  if (admin) {
    return sql`TRUE`;
  }

  if (accessibleProjectIds.length === 0) {
    return sql`FALSE`;
  }

  return sql`sur.project_id = ANY(${accessibleProjectIds})`;
}

function toDateCondition(startDate: string | null, endDate: string | null) {
  if (startDate && endDate) {
    return sql`COALESCE(pr.service_date, pr.created_at) BETWEEN ${startDate}::timestamp AND (${endDate}::date + INTERVAL '1 day' - INTERVAL '1 second')`;
  }

  if (startDate) {
    return sql`COALESCE(pr.service_date, pr.created_at) >= ${startDate}::timestamp`;
  }

  if (endDate) {
    return sql`COALESCE(pr.service_date, pr.created_at) <= (${endDate}::date + INTERVAL '1 day' - INTERVAL '1 second')`;
  }

  return sql`TRUE`;
}

function buildEmptyPayload() {
  return {
    summary: {
      totalSupportHours: 0,
      activeSupportProjects: 0,
      overloadedStaffCount: 0,
      activeServiceTypes: 0,
      solutionReuseCoverageRate: 0,
      solutionUsageProjects: 0,
      missingWorklogRecordCount: 0,
    },
    topStaffLoad: [],
    keyProjects: [],
    serviceMix: [],
  };
}

export const GET = withAuth(async (request: NextRequest, { userId }) => {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const admin = await isSystemAdmin(userId);
    const accessibleProjectIds = admin ? [] : await getAccessibleProjectIds(userId);

    if (!admin && accessibleProjectIds.length === 0) {
      return successResponse(buildEmptyPayload());
    }

    const scopeCondition = toScopeCondition(admin, accessibleProjectIds);
    const reuseScopeCondition = toReuseScopeCondition(admin, accessibleProjectIds);
    const dateCondition = toDateCondition(startDate, endDate);

    const [summaryRows, topStaffRows, keyProjectRows, serviceMixRows, solutionReuseRows] = await Promise.all([
      db.execute(sql`
        WITH staff_load AS (
          SELECT
            pr.staff_id,
            SUM(COALESCE(CAST(pr.total_work_hours AS DECIMAL), CAST(pr.duration_hours AS DECIMAL), 0)) AS total_hours
          FROM bus_project_presales_record pr
          INNER JOIN bus_project p ON p.id = pr.project_id AND p.deleted_at IS NULL
          WHERE pr.deleted_at IS NULL
            AND ${scopeCondition}
            AND ${dateCondition}
          GROUP BY pr.staff_id
        )
        SELECT
          COALESCE(SUM(COALESCE(CAST(pr.total_work_hours AS DECIMAL), CAST(pr.duration_hours AS DECIMAL), 0)), 0) AS total_support_hours,
          COUNT(DISTINCT pr.project_id) AS active_support_projects,
          COUNT(DISTINCT pr.service_type_id) AS active_service_types,
          COUNT(*) FILTER (WHERE COALESCE(CAST(pr.total_work_hours AS DECIMAL), CAST(pr.duration_hours AS DECIMAL), 0) <= 0) AS missing_worklog_record_count,
          COALESCE((SELECT COUNT(*) FROM staff_load WHERE total_hours >= 24), 0) AS overloaded_staff_count
        FROM bus_project_presales_record pr
        INNER JOIN bus_project p ON p.id = pr.project_id AND p.deleted_at IS NULL
        WHERE pr.deleted_at IS NULL
          AND ${scopeCondition}
          AND ${dateCondition}
      `),
      db.execute(sql`
        SELECT
          pr.staff_id,
          COALESCE(u.real_name, '未知') AS staff_name,
          COALESCE(SUM(COALESCE(CAST(pr.total_work_hours AS DECIMAL), CAST(pr.duration_hours AS DECIMAL), 0)), 0) AS total_hours,
          COUNT(DISTINCT pr.project_id) AS project_count,
          COUNT(*) AS service_count
        FROM bus_project_presales_record pr
        INNER JOIN bus_project p ON p.id = pr.project_id AND p.deleted_at IS NULL
        LEFT JOIN sys_user u ON u.id = pr.staff_id
        WHERE pr.deleted_at IS NULL
          AND ${scopeCondition}
          AND ${dateCondition}
        GROUP BY pr.staff_id, u.real_name
        ORDER BY total_hours DESC, project_count DESC
        LIMIT 5
      `),
      db.execute(sql`
        SELECT
          pr.project_id,
          p.project_name,
          p.region,
          p.project_stage,
          COALESCE(SUM(COALESCE(CAST(pr.total_work_hours AS DECIMAL), CAST(pr.duration_hours AS DECIMAL), 0)), 0) AS support_hours,
          COALESCE(MAX(pr.participant_count), 1) AS participant_count,
          COUNT(*) AS service_count
        FROM bus_project_presales_record pr
        INNER JOIN bus_project p ON p.id = pr.project_id AND p.deleted_at IS NULL
        WHERE pr.deleted_at IS NULL
          AND ${scopeCondition}
          AND ${dateCondition}
        GROUP BY pr.project_id, p.project_name, p.region, p.project_stage
        ORDER BY support_hours DESC, participant_count DESC
        LIMIT 5
      `),
      db.execute(sql`
        SELECT
          pst.service_category,
          COALESCE(SUM(COALESCE(CAST(pr.total_work_hours AS DECIMAL), CAST(pr.duration_hours AS DECIMAL), 0)), 0) AS total_hours,
          COUNT(*) AS service_count
        FROM bus_project_presales_record pr
        INNER JOIN bus_project p ON p.id = pr.project_id AND p.deleted_at IS NULL
        INNER JOIN sys_presales_service_type pst ON pst.id = pr.service_type_id
        WHERE pr.deleted_at IS NULL
          AND ${scopeCondition}
          AND ${dateCondition}
        GROUP BY pst.service_category
        ORDER BY total_hours DESC
      `),
      db.execute(sql`
        SELECT
          COUNT(DISTINCT sur.project_id) AS usage_projects,
          COUNT(*) AS usage_count
        FROM bus_solution_usage_record sur
        INNER JOIN bus_project p ON p.id = sur.project_id AND p.deleted_at IS NULL
        WHERE ${reuseScopeCondition}
      `),
    ]);

    const summaryRow = normalizeRows<RowRecord>(summaryRows)[0] || {};
    const topStaffLoad = normalizeRows<RowRecord>(topStaffRows).map((row) => ({
      staffId: toNumber(row.staff_id),
      name: String(row.staff_name || '未知'),
      totalHours: toNumber(row.total_hours),
      projectCount: toNumber(row.project_count),
      serviceCount: toNumber(row.service_count),
    }));
    const keyProjects = normalizeRows<RowRecord>(keyProjectRows).map((row) => ({
      projectId: toNumber(row.project_id),
      projectName: String(row.project_name || '未知项目'),
      region: String(row.region || '未分配区域'),
      stage: String(row.project_stage || '未分类'),
      supportHours: toNumber(row.support_hours),
      participantCount: toNumber(row.participant_count),
      serviceCount: toNumber(row.service_count),
    }));
    const serviceMix = normalizeRows<RowRecord>(serviceMixRows).map((row) => ({
      category: String(row.service_category || 'other'),
      totalHours: toNumber(row.total_hours),
      serviceCount: toNumber(row.service_count),
    }));
    const solutionReuseRow = normalizeRows<RowRecord>(solutionReuseRows)[0] || {};

    const activeSupportProjects = toNumber(summaryRow.active_support_projects);
    const solutionUsageProjects = toNumber(solutionReuseRow.usage_projects);

    return successResponse({
      summary: {
        totalSupportHours: toNumber(summaryRow.total_support_hours),
        activeSupportProjects,
        overloadedStaffCount: toNumber(summaryRow.overloaded_staff_count),
        activeServiceTypes: toNumber(summaryRow.active_service_types),
        solutionReuseCoverageRate: activeSupportProjects > 0
          ? Math.round((solutionUsageProjects / activeSupportProjects) * 100)
          : 0,
        solutionUsageProjects,
        missingWorklogRecordCount: toNumber(summaryRow.missing_worklog_record_count),
      },
      topStaffLoad,
      keyProjects,
      serviceMix,
    });
  } catch (error) {
    console.error('Presales focus summary API error:', error);
    return errorResponse('INTERNAL_ERROR', '获取售前负责人视图摘要失败');
  }
});