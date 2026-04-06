import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { arbitrations, users, projects } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';
import { successResponse, errorResponse } from '@/lib/api-response';

// GET - 获取仲裁列表
export async function GET() {
  try {
    const arbitrationList = await db
      .select({
        id: arbitrations.id,
        arbitrationCode: arbitrations.arbitrationCode,
        projectId: arbitrations.projectId,
        taskId: arbitrations.taskId,
        initiatorId: arbitrations.initiatorId,
        arbitrationType: arbitrations.arbitrationType,
        title: arbitrations.title,
        description: arbitrations.description,
        estimatedCost: arbitrations.estimatedCost,
        actualCost: arbitrations.actualCost,
        disputedAmount: arbitrations.disputedAmount,
        status: arbitrations.status,
        approverId: arbitrations.approverId,
        approvalComments: arbitrations.approvalComments,
        priority: arbitrations.priority,
        createdAt: arbitrations.createdAt,
        projectName: projects.projectName,
        initiatorName: users.realName,
      })
      .from(arbitrations)
      .leftJoin(users, eq(arbitrations.initiatorId, users.id))
      .leftJoin(projects, eq(arbitrations.projectId, projects.id))
      .orderBy(desc(arbitrations.createdAt));

    return successResponse(arbitrationList);
  } catch (error) {
    console.error('Failed to fetch arbitrations:', error);
    return errorResponse('INTERNAL_ERROR', '获取仲裁列表失败');
  }
}

// POST - 创建仲裁申请
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 生成仲裁编号
    const arbitrationCode = `ARB${Date.now().toString().slice(-8)}`;

    const newArbitration = await db
      .insert(arbitrations)
      .values({
        arbitrationCode,
        projectId: body.projectId,
        taskId: body.taskId || null,
        initiatorId: body.initiatorId || 1, // TODO: 从JWT获取用户ID
        arbitrationType: body.arbitrationType,
        title: body.title,
        description: body.description,
        estimatedCost: body.estimatedCost || null,
        actualCost: body.actualCost || null,
        disputedAmount: body.disputedAmount || null,
        priority: body.priority || 'medium',
      })
      .returning();

    return NextResponse.json(newArbitration[0], { status: 201 });
  } catch (error) {
    console.error('Failed to create arbitration:', error);
    return errorResponse('INTERNAL_ERROR', '创建仲裁申请失败');
  }
}
