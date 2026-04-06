import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { projects } from '@/db/schema';
import { eq, sql, isNull } from 'drizzle-orm';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withAuth } from '@/lib/auth-middleware';

// POST - 确认导入项目
export const POST = withAuth(async (request: NextRequest, context: { userId: number }) => {
  try {
    const body = await request.json();
    const { projects: projectsToImport } = body;

    if (!projectsToImport || !Array.isArray(projectsToImport)) {
      return errorResponse('BAD_REQUEST', '缺少项目数据');
    }

    // 获取现有项目编号（排除已删除的项目）
    const existingProjects = await db
      .select({ projectCode: projects.projectCode })
      .from(projects)
      .where(isNull(projects.deletedAt));

    const existingCodes = new Set(existingProjects.map(p => p.projectCode));

    // 过滤掉已存在的项目
    const newProjects = projectsToImport.filter(p => !existingCodes.has(p.projectCode));

    if (newProjects.length === 0) {
      return NextResponse.json({
        success: true,
        message: '所有项目已存在，无需导入',
        imported: 0,
        skipped: projectsToImport.length,
      });
    }

    // 生成项目编号并插入
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');

    const projectsToInsert = newProjects.map((p, index) => ({
      projectCode: `PRJ${dateStr}${String(index + 1).padStart(3, '0')}`,
      projectName: p.projectName,
      customerName: p.customerName,
      customerId: p.customerId || null,
      projectTypeId: p.projectTypeId || null,
      industry: p.industry || null,
      region: p.region || null,
      description: p.description || null,
      managerId: p.managerId || context.userId, // 默认设置当前用户为负责人
      estimatedAmount: p.estimatedAmount || null,
      startDate: p.startDate || null,
      endDate: p.endDate || null,
      status: p.status || 'draft',
      priority: p.priority || 'medium',
      progress: 0,
    }));

    const insertedProjects = await db
      .insert(projects)
      .values(projectsToInsert)
      .returning();

    return NextResponse.json({
      success: true,
      message: `成功导入 ${insertedProjects.length} 个项目`,
      imported: insertedProjects.length,
      skipped: projectsToImport.length - newProjects.length,
      data: insertedProjects,
    });
  } catch (error) {
    console.error('Failed to confirm import:', error);
    return errorResponse('INTERNAL_ERROR', '确认导入失败');
  }
});
