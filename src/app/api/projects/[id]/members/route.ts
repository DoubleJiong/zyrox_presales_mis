import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { projectMembers, users, projects } from '@/db/schema';
import { eq, and, isNull, sql, or, inArray } from 'drizzle-orm';
import { withAuth } from '@/lib/auth-middleware';
import { successResponse, errorResponse } from '@/lib/api-response';
import { canAdminProject, isSystemAdmin } from '@/lib/permissions/project';

/**
 * GET /api/projects/[id]/members
 * 获取项目成员列表
 */
export const GET = withAuth(async (
  request: NextRequest,
  context: { userId: number; user?: any }
) => {
  try {
    const projectId = parseInt(request.nextUrl.pathname.split('/')[3]);
    const { searchParams } = new URL(request.url);
    const stageFilter = searchParams.get('stage'); // planning, bidding, all
    
    if (isNaN(projectId)) {
      return errorResponse('BAD_REQUEST', '无效的项目ID');
    }

    // 构建查询条件
    const baseConditions = [
      eq(projectMembers.projectId, projectId),
      isNull(users.deletedAt)
    ];
    
    // 如果指定了阶段筛选，同时获取指定阶段和"全程"（all或null）的成员
    let whereCondition;
    if (stageFilter && stageFilter !== 'all') {
      // 需要同时满足基础条件和阶段条件
      whereCondition = and(
        ...baseConditions,
        or(
          eq(projectMembers.stage, stageFilter),
          eq(projectMembers.stage, 'all'),
          isNull(projectMembers.stage) // 旧数据stage为null，视为全程参与
        )
      );
    } else {
      whereCondition = and(...baseConditions);
    }

    // 查询项目成员
    const members = await db
      .select({
        id: projectMembers.id,
        projectId: projectMembers.projectId,
        userId: projectMembers.userId,
        role: projectMembers.role,
        stage: projectMembers.stage,
        joinedAt: projectMembers.joinedAt,
        invitedBy: projectMembers.invitedBy,
        // 用户信息
        userName: users.realName,
        userEmail: users.email,
        userPhone: users.phone,
        userDepartment: users.department,
        userPosition: users.position,
        userAvatar: users.avatar,
      })
      .from(projectMembers)
      .innerJoin(users, eq(projectMembers.userId, users.id))
      .where(whereCondition)
      .orderBy(sql`CASE ${projectMembers.role} 
        WHEN 'manager' THEN 1 
        WHEN 'supervisor' THEN 2 
        ELSE 3 
      END`);

    // 获取邀请人名称
    const inviterIds = members
      .map(m => m.invitedBy)
      .filter((id): id is number => id !== null);

    let inviterNames: Record<number, string> = {};
    if (inviterIds.length > 0) {
      const inviters = await db
        .select({ id: users.id, realName: users.realName })
        .from(users)
        .where(inArray(users.id, inviterIds));
      
      inviterNames = inviters.reduce((acc, u) => {
        acc[u.id] = u.realName || '';
        return acc;
      }, {} as Record<number, string>);
    }

    // 获取项目负责人信息
    const [project] = await db
      .select({ managerId: projects.managerId, managerName: users.realName })
      .from(projects)
      .leftJoin(users, eq(projects.managerId, users.id))
      .where(and(
        eq(projects.id, projectId),
        isNull(projects.deletedAt)
      ))
      .limit(1);

    const result = members.map(m => ({
      ...m,
      inviterName: m.invitedBy ? inviterNames[m.invitedBy] : null,
      isManager: m.userId === project?.managerId,
    }));

    // 如果项目负责人不在成员列表中，添加到结果中
    const managerInList = members.some(m => m.userId === project?.managerId);
    if (!managerInList && project?.managerId) {
      const [managerUser] = await db
        .select({
          id: users.id,
          realName: users.realName,
          email: users.email,
          phone: users.phone,
          department: users.department,
          position: users.position,
          avatar: users.avatar,
        })
        .from(users)
        .where(eq(users.id, project.managerId))
        .limit(1);

      if (managerUser) {
        result.unshift({
          id: 0, // 特殊ID表示项目负责人
          projectId,
          userId: managerUser.id,
          role: 'manager',
          stage: 'all', // 项目负责人默认全程参与
          joinedAt: null,
          invitedBy: null,
          userName: managerUser.realName,
          userEmail: managerUser.email,
          userPhone: managerUser.phone,
          userDepartment: managerUser.department,
          userPosition: managerUser.position,
          userAvatar: managerUser.avatar,
          inviterName: null,
          isManager: true,
        });
      }
    }

    return successResponse({ members: result });
  } catch (error) {
    console.error('Failed to fetch project members:', error);
    return errorResponse('INTERNAL_ERROR', '获取项目成员失败');
  }
});

/**
 * POST /api/projects/[id]/members
 * 添加项目成员
 */
export const POST = withAuth(async (
  request: NextRequest,
  context: { userId: number; user?: any }
) => {
  try {
    const projectId = parseInt(request.nextUrl.pathname.split('/')[3]);
    
    if (isNaN(projectId)) {
      return errorResponse('BAD_REQUEST', '无效的项目ID');
    }

    // 检查是否有权限管理项目成员
    const canManage = await canAdminProject(projectId, context.userId);
    const isAdmin = await isSystemAdmin(context.userId);

    if (!canManage && !isAdmin) {
      return errorResponse('FORBIDDEN', '您没有权限管理项目成员');
    }

    const body = await request.json();
    const { userId: newMemberUserId, role = 'member', stage = 'all' } = body;

    if (!newMemberUserId) {
      return errorResponse('BAD_REQUEST', '请指定要添加的用户');
    }

    // 验证stage字段
    const validStages = ['planning', 'bidding', 'all'];
    if (!validStages.includes(stage)) {
      return errorResponse('BAD_REQUEST', '无效的阶段参数，必须是 planning、bidding 或 all');
    }

    // 检查用户是否存在
    const [userExists] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(
        eq(users.id, newMemberUserId),
        isNull(users.deletedAt)
      ))
      .limit(1);

    if (!userExists) {
      return errorResponse('NOT_FOUND', '用户不存在');
    }

    // 检查项目是否存在
    const [projectExists] = await db
      .select({ id: projects.id, managerId: projects.managerId })
      .from(projects)
      .where(and(
        eq(projects.id, projectId),
        isNull(projects.deletedAt)
      ))
      .limit(1);

    if (!projectExists) {
      return errorResponse('NOT_FOUND', '项目不存在');
    }

    // 检查是否已经是成员
    const [existingMember] = await db
      .select({ id: projectMembers.id, stage: projectMembers.stage, role: projectMembers.role })
      .from(projectMembers)
      .where(and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.userId, newMemberUserId)
      ))
      .limit(1);

    if (existingMember) {
      // 如果用户已存在，检查是否需要更新stage
      // 如果现有stage与新stage不同，且都不是'all'，则更新为'all'（全程参与）
      if (existingMember.stage !== stage && existingMember.stage !== 'all' && stage !== 'all') {
        const [updatedMember] = await db
          .update(projectMembers)
          .set({ 
            stage: 'all',
            role, // 同时更新角色
            updatedAt: new Date()
          })
          .where(eq(projectMembers.id, existingMember.id))
          .returning();
        
        return successResponse({
          member: {
            ...updatedMember,
            addedBy: context.user?.realName || '系统',
          },
          message: '成员阶段已更新为全程参与',
          updated: true,
        });
      }
      
      // stage相同或已是'all'，返回提示
      return errorResponse('BAD_REQUEST', '该用户已是项目成员，无需重复添加');
    }

    // 项目负责人不能作为普通成员添加
    if (newMemberUserId === projectExists.managerId) {
      return errorResponse('BAD_REQUEST', '项目负责人已是成员，无需重复添加');
    }

    // 添加成员
    const [newMember] = await db
      .insert(projectMembers)
      .values({
        projectId,
        userId: newMemberUserId,
        role,
        stage,
        invitedBy: context.userId,
      })
      .returning();

    return successResponse({
      member: {
        ...newMember,
        addedBy: context.user?.realName || '系统',
      },
      message: '成员添加成功',
    });
  } catch (error) {
    console.error('Failed to add project member:', error);
    return errorResponse('INTERNAL_ERROR', '添加项目成员失败');
  }
});

/**
 * PUT /api/projects/[id]/members
 * 更新项目成员信息（角色、阶段）
 */
export const PUT = withAuth(async (
  request: NextRequest,
  context: { userId: number; user?: any }
) => {
  try {
    const projectId = parseInt(request.nextUrl.pathname.split('/')[3]);
    
    if (isNaN(projectId)) {
      return errorResponse('BAD_REQUEST', '无效的项目ID');
    }

    // 检查是否有权限管理项目成员
    const canManage = await canAdminProject(projectId, context.userId);
    const isAdmin = await isSystemAdmin(context.userId);

    if (!canManage && !isAdmin) {
      return errorResponse('FORBIDDEN', '您没有权限管理项目成员');
    }

    const body = await request.json();
    const { memberId, role, stage } = body;

    if (!memberId) {
      return errorResponse('BAD_REQUEST', '请指定要更新的成员ID');
    }

    // 检查成员是否存在
    const [existingMember] = await db
      .select({
        id: projectMembers.id,
        projectId: projectMembers.projectId,
        userId: projectMembers.userId,
        role: projectMembers.role,
        stage: projectMembers.stage,
      })
      .from(projectMembers)
      .where(eq(projectMembers.id, memberId))
      .limit(1);

    if (!existingMember || existingMember.projectId !== projectId) {
      return errorResponse('NOT_FOUND', '成员不存在');
    }

    // 构建更新数据
    const updateData: Record<string, any> = { updatedAt: new Date() };
    if (role) updateData.role = role;
    if (stage) {
      const validStages = ['planning', 'bidding', 'all'];
      if (!validStages.includes(stage)) {
        return errorResponse('BAD_REQUEST', '无效的阶段参数');
      }
      updateData.stage = stage;
    }

    // 更新成员信息
    const [updatedMember] = await db
      .update(projectMembers)
      .set(updateData)
      .where(eq(projectMembers.id, memberId))
      .returning();

    return successResponse({
      member: updatedMember,
      message: '成员信息已更新',
    });
  } catch (error) {
    console.error('Failed to update project member:', error);
    return errorResponse('INTERNAL_ERROR', '更新项目成员失败');
  }
});

/**
 * DELETE /api/projects/[id]/members?userId=xxx
 * 移除项目成员
 */
export const DELETE = withAuth(async (
  request: NextRequest,
  context: { userId: number; user?: any }
) => {
  try {
    const projectId = parseInt(request.nextUrl.pathname.split('/')[3]);
    const { searchParams } = new URL(request.url);
    const memberUserId = parseInt(searchParams.get('userId') || '');
    
    if (isNaN(projectId)) {
      return errorResponse('BAD_REQUEST', '无效的项目ID');
    }

    if (isNaN(memberUserId)) {
      return errorResponse('BAD_REQUEST', '请指定要移除的用户');
    }

    // 检查是否有权限管理项目成员
    const canManage = await canAdminProject(projectId, context.userId);
    const isAdmin = await isSystemAdmin(context.userId);

    if (!canManage && !isAdmin) {
      return errorResponse('FORBIDDEN', '您没有权限管理项目成员');
    }

    // 检查是否是项目负责人
    const [project] = await db
      .select({ managerId: projects.managerId })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (project?.managerId === memberUserId) {
      return errorResponse('BAD_REQUEST', '不能移除项目负责人，请先变更项目负责人');
    }

    // 移除成员
    const [deleted] = await db
      .delete(projectMembers)
      .where(and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.userId, memberUserId)
      ))
      .returning();

    if (!deleted) {
      return errorResponse('NOT_FOUND', '该用户不是项目成员');
    }

    return successResponse({ message: '成员已移除' });
  } catch (error) {
    console.error('Failed to remove project member:', error);
    return errorResponse('INTERNAL_ERROR', '移除项目成员失败');
  }
});
