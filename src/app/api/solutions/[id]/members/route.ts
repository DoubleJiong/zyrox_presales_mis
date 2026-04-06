import { NextRequest } from 'next/server';
import { db } from '@/db';
import { solutionSectionMembers, users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { withAuth } from '@/lib/auth-middleware';
import { successResponse, errorResponse } from '@/lib/api-response';

// GET /api/solutions/[id]/members - 获取板块成员列表
export const GET = withAuth(async (
  request: NextRequest,
  context: { userId: number; user?: any; params?: Record<string, string> }
) => {
  try {
    const plateId = parseInt(context.params?.id || '0');
    
    if (isNaN(plateId)) {
      return errorResponse('BAD_REQUEST', '无效的板块ID');
    }

    // 查询板块成员，关联用户信息
    const members = await db
      .select({
        id: solutionSectionMembers.id,
        plateId: solutionSectionMembers.plateId,
        userId: solutionSectionMembers.userId,
        role: solutionSectionMembers.role,
        createdAt: solutionSectionMembers.createdAt,
        user: {
          id: users.id,
          realName: users.realName,
          email: users.email,
          avatar: users.avatar,
          department: users.department,
          position: users.position,
        },
      })
      .from(solutionSectionMembers)
      .leftJoin(users, eq(solutionSectionMembers.userId, users.id))
      .where(eq(solutionSectionMembers.plateId, plateId));

    return successResponse(members);
  } catch (error) {
    console.error('获取板块成员失败:', error);
    return errorResponse('INTERNAL_ERROR', '获取板块成员失败', { status: 500 });
  }
});

// POST /api/solutions/[id]/members - 添加板块成员
export const POST = withAuth(async (
  request: NextRequest,
  context: { userId: number; user?: any; params?: Record<string, string> }
) => {
  try {
    const plateId = parseInt(context.params?.id || '0');
    
    if (isNaN(plateId)) {
      return errorResponse('BAD_REQUEST', '无效的板块ID');
    }

    const body = await request.json();
    const { userId: newMemberUserId, role = 'member' } = body;

    if (!newMemberUserId) {
      return errorResponse('BAD_REQUEST', '用户ID不能为空');
    }

    // 检查是否已存在
    const existing = await db
      .select()
      .from(solutionSectionMembers)
      .where(
        and(
          eq(solutionSectionMembers.plateId, plateId),
          eq(solutionSectionMembers.userId, newMemberUserId)
        )
      );

    if (existing.length > 0) {
      return errorResponse('CONFLICT', '该用户已是板块成员', { status: 400 });
    }

    // 添加成员
    const [member] = await db
      .insert(solutionSectionMembers)
      .values({
        plateId,
        userId: newMemberUserId,
        role,
        createdBy: context.userId,
      })
      .returning();

    // 获取用户信息
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, newMemberUserId));

    return successResponse({
      ...member,
      user: user ? {
        id: user.id,
        realName: user.realName,
        email: user.email,
        avatar: user.avatar,
        department: user.department,
        position: user.position,
      } : null,
    });
  } catch (error) {
    console.error('添加板块成员失败:', error);
    return errorResponse('INTERNAL_ERROR', '添加板块成员失败', { status: 500 });
  }
});
