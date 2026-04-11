import { NextRequest } from 'next/server';
import { db } from '@/db';
import { sql } from 'drizzle-orm';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withAuth } from '@/lib/auth-middleware';
import { PERMISSIONS } from '@/lib/permissions';
import {
  buildEmptyDataScreenRegionDetailData,
  parseDataScreenRegionDetailFilters,
} from '@/lib/data-screen-region-detail';

type CountRow = { count?: number | string | null };
type AmountRow = {
  projectCount?: number | string | null;
  projectAmount?: number | string | null;
  contractAmount?: number | string | null;
  wonCount?: number | string | null;
};
type RiskCountRow = {
  riskCount?: number | string | null;
  highRiskCount?: number | string | null;
};
type CustomerRow = {
  id: number;
  customerName?: string | null;
  status?: string | null;
  totalAmount?: number | string | null;
  currentProjectCount?: number | string | null;
  lastInteractionTime?: string | null;
  address?: string | null;
};
type ProjectRow = {
  projectId: number;
  projectName?: string | null;
  customerName?: string | null;
  projectStage?: string | null;
  status?: string | null;
  estimatedAmount?: number | string | null;
  actualAmount?: number | string | null;
  managerName?: string | null;
};
type RiskRow = {
  id: number;
  projectId: number;
  projectName?: string | null;
  riskLevel?: string | null;
  riskDescription?: string | null;
  status?: string | null;
};
type StaffRow = {
  userId: number;
  realName?: string | null;
  position?: string | null;
  projectCount?: number | string | null;
};
type MetricRow = { total?: number | string | null };

function toNumber(value: number | string | null | undefined) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

export const dynamic = 'force-dynamic';

export const GET = withAuth(
  async (request: NextRequest) => {
    const filters = parseDataScreenRegionDetailFilters(request.nextUrl.searchParams);

    if (!filters.region) {
      return errorResponse('BAD_REQUEST', '缺少区域参数', { status: 400 });
    }

    const regionLike = `%${filters.region}%`;
    const regionLikeWithoutSuffix = `%${filters.region.replace(/市$/, '')}%`;
    const isZhejiangView = filters.map === 'zhejiang';

    try {
      const [
        customerCountRows,
        projectMetricRows,
        riskCountRows,
        activeStaffRows,
        solutionUsageRows,
        presalesActivityRows,
        customerRows,
        projectRows,
        riskRows,
        staffRows,
      ] = await Promise.all([
        db.execute(sql`
          SELECT COUNT(*) AS count
          FROM bus_customer
          WHERE deleted_at IS NULL
            AND (
              region = ${filters.region}
              OR (${isZhejiangView} = true AND (address LIKE ${regionLike} OR address LIKE ${regionLikeWithoutSuffix}))
            )
        `),
        db.execute(sql`
          SELECT
            COUNT(*) AS "projectCount",
            COALESCE(SUM(CAST(estimated_amount AS DECIMAL)), 0) AS "projectAmount",
            COALESCE(SUM(CAST(actual_amount AS DECIMAL)), 0) AS "contractAmount",
            COALESCE(SUM(CASE WHEN COALESCE(bid_result, '') = 'won' OR COALESCE(status, '') = 'won' THEN 1 ELSE 0 END), 0) AS "wonCount"
          FROM bus_project p
          LEFT JOIN bus_customer c ON c.id = p.customer_id AND c.deleted_at IS NULL
          WHERE p.deleted_at IS NULL
            AND (
              p.region = ${filters.region}
              OR (${isZhejiangView} = true AND (c.address LIKE ${regionLike} OR c.address LIKE ${regionLikeWithoutSuffix}))
            )
        `),
        db.execute(sql`
          SELECT
            COUNT(*) AS "riskCount",
            COALESCE(SUM(CASE WHEN pr.risk_level IN ('high', 'critical') THEN 1 ELSE 0 END), 0) AS "highRiskCount"
          FROM bus_project_risk pr
          INNER JOIN bus_project p ON p.id = pr.project_id AND p.deleted_at IS NULL
          LEFT JOIN bus_customer c ON c.id = p.customer_id AND c.deleted_at IS NULL
          WHERE (
              p.region = ${filters.region}
              OR (${isZhejiangView} = true AND (c.address LIKE ${regionLike} OR c.address LIKE ${regionLikeWithoutSuffix}))
            )
        `),
        db.execute(sql`
          SELECT COUNT(DISTINCT u.id) AS count
          FROM sys_user u
          LEFT JOIN bus_project_member pm ON pm.user_id = u.id
          LEFT JOIN bus_project p ON p.id = pm.project_id AND p.deleted_at IS NULL
          LEFT JOIN bus_customer c ON c.id = p.customer_id AND c.deleted_at IS NULL
          WHERE u.deleted_at IS NULL
            AND COALESCE(u.status, 'active') = 'active'
            AND (
              u.base_location = ${filters.region}
              OR p.region = ${filters.region}
              OR (${isZhejiangView} = true AND (
                u.base_location = ${filters.region.replace(/市$/, '')}
                OR u.base_location = ${filters.region}
                OR c.address LIKE ${regionLike}
                OR c.address LIKE ${regionLikeWithoutSuffix}
              ))
            )
        `),
        db.execute(sql`
          SELECT COALESCE(COUNT(*), 0) AS total
          FROM bus_solution_usage_record sur
          LEFT JOIN bus_project p ON p.id = sur.project_id AND p.deleted_at IS NULL
          LEFT JOIN bus_customer c ON c.id = p.customer_id AND c.deleted_at IS NULL
          WHERE (
              sur.region = ${filters.region}
              OR p.region = ${filters.region}
              OR (${isZhejiangView} = true AND (c.address LIKE ${regionLike} OR c.address LIKE ${regionLikeWithoutSuffix}))
            )
            AND sur.created_at::date BETWEEN ${filters.startDate}::date AND ${filters.endDate}::date
        `),
        db.execute(sql`
          SELECT COALESCE(COUNT(*), 0) AS total
          FROM bus_project_presales_record pr
          INNER JOIN bus_project p ON p.id = pr.project_id AND p.deleted_at IS NULL
          LEFT JOIN bus_customer c ON c.id = p.customer_id AND c.deleted_at IS NULL
          WHERE pr.deleted_at IS NULL
            AND (
              p.region = ${filters.region}
              OR (${isZhejiangView} = true AND (c.address LIKE ${regionLike} OR c.address LIKE ${regionLikeWithoutSuffix}))
            )
            AND pr.service_date::date BETWEEN ${filters.startDate}::date AND ${filters.endDate}::date
        `),
        db.execute(sql`
          SELECT
            id,
            customer_name AS "customerName",
            COALESCE(status, 'active') AS status,
            COALESCE(CAST(total_amount AS DECIMAL), 0) AS "totalAmount",
            COALESCE(current_project_count, 0) AS "currentProjectCount",
            last_interaction_time AS "lastInteractionTime",
            COALESCE(address, '') AS address
          FROM bus_customer
          WHERE deleted_at IS NULL
            AND (
              region = ${filters.region}
              OR (${isZhejiangView} = true AND (address LIKE ${regionLike} OR address LIKE ${regionLikeWithoutSuffix}))
            )
          ORDER BY current_project_count DESC, last_interaction_time DESC NULLS LAST, customer_name ASC
          LIMIT 5
        `),
        db.execute(sql`
          SELECT
            p.id AS "projectId",
            p.project_name AS "projectName",
            COALESCE(p.customer_name, '') AS "customerName",
            COALESCE(p.project_stage, '') AS "projectStage",
            COALESCE(p.status, '') AS status,
            COALESCE(CAST(p.estimated_amount AS DECIMAL), 0) AS "estimatedAmount",
            COALESCE(CAST(p.actual_amount AS DECIMAL), 0) AS "actualAmount",
            COALESCE(u.real_name, '') AS "managerName"
          FROM bus_project p
          LEFT JOIN sys_user u ON u.id = p.manager_id
          LEFT JOIN bus_customer c ON c.id = p.customer_id AND c.deleted_at IS NULL
          WHERE p.deleted_at IS NULL
            AND (
              p.region = ${filters.region}
              OR (${isZhejiangView} = true AND (c.address LIKE ${regionLike} OR c.address LIKE ${regionLikeWithoutSuffix}))
            )
          ORDER BY COALESCE(CAST(p.actual_amount AS DECIMAL), 0) DESC, COALESCE(CAST(p.estimated_amount AS DECIMAL), 0) DESC, p.project_name ASC
          LIMIT 5
        `),
        db.execute(sql`
          SELECT
            pr.id,
            pr.project_id AS "projectId",
            p.project_name AS "projectName",
            COALESCE(pr.risk_level, 'medium') AS "riskLevel",
            COALESCE(pr.risk_description, '') AS "riskDescription",
            COALESCE(pr.status, 'active') AS status
          FROM bus_project_risk pr
          INNER JOIN bus_project p ON p.id = pr.project_id AND p.deleted_at IS NULL
          LEFT JOIN bus_customer c ON c.id = p.customer_id AND c.deleted_at IS NULL
          WHERE (
              p.region = ${filters.region}
              OR (${isZhejiangView} = true AND (c.address LIKE ${regionLike} OR c.address LIKE ${regionLikeWithoutSuffix}))
            )
          ORDER BY
            CASE COALESCE(pr.risk_level, 'medium')
              WHEN 'critical' THEN 1
              WHEN 'high' THEN 2
              WHEN 'medium' THEN 3
              ELSE 4
            END,
            pr.updated_at DESC
          LIMIT 5
        `),
        db.execute(sql`
          SELECT
            u.id AS "userId",
            COALESCE(u.real_name, '') AS "realName",
            COALESCE(u.position, '') AS position,
            COUNT(DISTINCT p.id) AS "projectCount"
          FROM sys_user u
          LEFT JOIN bus_project_member pm ON pm.user_id = u.id
          LEFT JOIN bus_project p ON p.id = pm.project_id AND p.deleted_at IS NULL
          LEFT JOIN bus_customer c ON c.id = p.customer_id AND c.deleted_at IS NULL
          WHERE u.deleted_at IS NULL
            AND COALESCE(u.status, 'active') = 'active'
            AND (
              u.base_location = ${filters.region}
              OR p.region = ${filters.region}
              OR (${isZhejiangView} = true AND (
                u.base_location = ${filters.region.replace(/市$/, '')}
                OR u.base_location = ${filters.region}
                OR c.address LIKE ${regionLike}
                OR c.address LIKE ${regionLikeWithoutSuffix}
              ))
            )
          GROUP BY u.id, u.real_name, u.position
          ORDER BY COUNT(DISTINCT p.id) DESC, u.real_name ASC
          LIMIT 5
        `),
      ]);

      const customerCount = toNumber((Array.isArray(customerCountRows) ? customerCountRows[0] : (customerCountRows as any).rows?.[0])?.count);
      const projectMetrics = (Array.isArray(projectMetricRows) ? projectMetricRows[0] : (projectMetricRows as any).rows?.[0]) as AmountRow | undefined;
      const riskMetrics = (Array.isArray(riskCountRows) ? riskCountRows[0] : (riskCountRows as any).rows?.[0]) as RiskCountRow | undefined;
      const activeStaffCount = toNumber((Array.isArray(activeStaffRows) ? activeStaffRows[0] : (activeStaffRows as any).rows?.[0])?.count);
      const solutionUsage = toNumber((Array.isArray(solutionUsageRows) ? solutionUsageRows[0] : (solutionUsageRows as any).rows?.[0])?.total);
      const preSalesActivity = toNumber((Array.isArray(presalesActivityRows) ? presalesActivityRows[0] : (presalesActivityRows as any).rows?.[0])?.total);

      return successResponse({
        filtersEcho: filters,
        regionLabel: filters.region,
        summary: {
          customerCount,
          projectCount: toNumber(projectMetrics?.projectCount),
          projectAmount: toNumber(projectMetrics?.projectAmount),
          contractAmount: toNumber(projectMetrics?.contractAmount),
          riskCount: toNumber(riskMetrics?.riskCount),
          highRiskCount: toNumber(riskMetrics?.highRiskCount),
          activeStaffCount,
          solutionUsage,
          preSalesActivity,
        },
        customerSnapshot: {
          items: ((Array.isArray(customerRows) ? customerRows : (customerRows as any).rows || []) as CustomerRow[]).map((row) => ({
            id: row.id,
            name: row.customerName || '--',
            status: row.status || 'active',
            totalAmount: toNumber(row.totalAmount),
            currentProjectCount: toNumber(row.currentProjectCount),
            lastInteractionTime: row.lastInteractionTime || null,
            address: row.address || '--',
          })),
        },
        projectSnapshot: {
          wonCount: toNumber(projectMetrics?.wonCount),
          items: ((Array.isArray(projectRows) ? projectRows : (projectRows as any).rows || []) as ProjectRow[]).map((row) => ({
            id: row.projectId,
            name: row.projectName || '--',
            customerName: row.customerName || '--',
            stage: row.projectStage || '--',
            status: row.status || '--',
            amount: Math.max(toNumber(row.actualAmount), toNumber(row.estimatedAmount)),
            managerName: row.managerName || '--',
          })),
        },
        riskSnapshot: {
          items: ((Array.isArray(riskRows) ? riskRows : (riskRows as any).rows || []) as RiskRow[]).map((row) => ({
            id: row.id,
            projectId: row.projectId,
            projectName: row.projectName || '--',
            riskLevel: row.riskLevel || 'medium',
            description: row.riskDescription || '--',
            status: row.status || 'active',
          })),
        },
        collaborationSnapshot: {
          items: ((Array.isArray(staffRows) ? staffRows : (staffRows as any).rows || []) as StaffRow[]).map((row) => ({
            userId: row.userId,
            realName: row.realName || '--',
            position: row.position || '成员',
            projectCount: toNumber(row.projectCount),
          })),
        },
        actions: [
          { label: '查看客户列表', href: '/customers' },
          { label: '查看项目列表', href: '/projects' },
        ],
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Get data-screen region detail error:', error);
      return successResponse(buildEmptyDataScreenRegionDetailData(filters));
    }
  },
  {
    requiredPermissions: [PERMISSIONS.DATASCREEN_VIEW],
  }
);