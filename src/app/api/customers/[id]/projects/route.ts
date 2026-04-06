import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { projects, projectTypes, users, customers } from '@/db/schema';
import { desc, eq, and, isNull, or, sql, count } from 'drizzle-orm';
import { successResponse, errorResponse, paginatedResponse } from '@/lib/api-response';
import { getProjectDisplayStatusLabel } from '@/lib/project-display';

// GET - 获取客户关联项目（支持分页）
// 同时匹配 customerId 和 customerName，确保数据一致性
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const customerId = parseInt(id);

    if (isNaN(customerId)) {
      return errorResponse('INVALID_ID', '无效的客户ID', { status: 400 });
    }

    // 先获取客户名称，用于匹配
    const [customer] = await db
      .select({ customerName: customers.customerName })
      .from(customers)
      .where(eq(customers.id, customerId))
      .limit(1);

    if (!customer) {
      return errorResponse('NOT_FOUND', '客户不存在', { status: 404 });
    }

    const customerName = customer.customerName;

    // 解析分页参数
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '10', 10), 50); // 最大50条
    const offset = (page - 1) * pageSize;

    // 构建查询条件：匹配 customerId 或 customerName
    // 这样可以找到所有相关项目，无论通过哪种方式关联
    const matchCondition = or(
      eq(projects.customerId, customerId),
      sql`LOWER(${projects.customerName}) = LOWER(${customerName})`
    );

    // 获取总数
    const [{ total }] = await db
      .select({ total: count() })
      .from(projects)
      .where(
        and(
          matchCondition,
          isNull(projects.deletedAt)
        )
      );

    // 获取分页数据
    const projectList = await db
      .select({
        id: projects.id,
        projectCode: projects.projectCode,
        projectName: projects.projectName,
        projectTypeId: projects.projectTypeId,
        projectType: projects.projectType,
        projectTypeName: projectTypes.name,
        projectStage: projects.projectStage,
        status: projects.status,
        priority: projects.priority,
        progress: projects.progress,
        estimatedAmount: projects.estimatedAmount,
        actualAmount: projects.actualAmount,
        startDate: projects.startDate,
        endDate: projects.endDate,
        expectedDeliveryDate: projects.expectedDeliveryDate,
        managerId: projects.managerId,
        managerName: users.realName,
        description: projects.description,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
        // 添加 customerId 和 customerName 用于前端判断关联方式
        customerId: projects.customerId,
        customerName: projects.customerName,
      })
      .from(projects)
      .leftJoin(projectTypes, eq(projects.projectTypeId, projectTypes.id))
      .leftJoin(users, eq(projects.managerId, users.id))
      .where(
        and(
          matchCondition,
          isNull(projects.deletedAt)
        )
      )
      .orderBy(desc(projects.createdAt))
      .limit(pageSize)
      .offset(offset);

    const projectListWithDisplay = projectList.map((project) => ({
      ...project,
      statusLabel: getProjectDisplayStatusLabel(project),
    }));

    return paginatedResponse(projectListWithDisplay, total, { page, pageSize });
  } catch (error) {
    console.error('Failed to fetch customer projects:', error);
    return errorResponse('INTERNAL_ERROR', '获取客户项目失败');
  }
}
