import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { follows, projects, users } from '@/db/schema';
import { eq, and, desc, isNull, inArray } from 'drizzle-orm';
import { withAuth } from '@/lib/auth-middleware';
import { getProjectDisplayStatusLabel } from '@/lib/project-display';

// 获取用户的重点项目列表
export const GET = withAuth(async (request: NextRequest, { userId }) => {
  try {
    // 获取用户标记为重点的项目
    const starredProjects = await db
      .select({
        followId: follows.id,
        followType: follows.followType,
        followedAt: follows.createdAt,
        project: {
          id: projects.id,
          projectCode: projects.projectCode,
          projectName: projects.projectName,
          customerName: projects.customerName,
          projectStage: projects.projectStage,
          status: projects.status,
          progress: projects.progress,
          estimatedAmount: projects.estimatedAmount,
          startDate: projects.startDate,
          endDate: projects.endDate,
          managerId: projects.managerId,
        },
      })
      .from(follows)
      .innerJoin(
        projects,
        and(
          eq(follows.targetId, projects.id),
          eq(follows.targetType, 'project')
        )
      )
      .where(
        and(
          eq(follows.userId, userId),
          eq(follows.followType, 'starred'),
          isNull(follows.deletedAt),
          isNull(projects.deletedAt)
        )
      )
      .orderBy(desc(follows.createdAt));

    // 获取项目经理名称
    const managerIds = starredProjects
      .map(p => p.project.managerId)
      .filter((id): id is number => id !== null);

    let managers: Record<number, string> = {};
    if (managerIds.length > 0) {
      const managerList = await db
        .select({ id: users.id, realName: users.realName })
        .from(users)
        .where(inArray(users.id, managerIds));
      
      managers = managerList.reduce((acc, m) => {
        acc[m.id] = m.realName || '';
        return acc;
      }, {} as Record<number, string>);
    }

    const result = starredProjects.map(p => ({
      id: p.project.id,
      projectCode: p.project.projectCode,
      projectName: p.project.projectName,
      customerName: p.project.customerName,
      status: p.project.status,
      statusLabel: getProjectDisplayStatusLabel(p.project),
      progress: p.project.progress,
      estimatedAmount: p.project.estimatedAmount,
      startDate: p.project.startDate,
      endDate: p.project.endDate,
      managerName: p.project.managerId ? managers[p.project.managerId] : null,
      followedAt: p.followedAt,
    }));

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Get starred projects API error:', error);
    return NextResponse.json(
      { success: false, error: '获取重点项目列表失败' },
      { status: 500 }
    );
  }
});

// 切换项目重点标记状态
export const POST = withAuth(async (request: NextRequest, { userId }) => {
  try {
    const body = await request.json();
    const { projectId, projectName } = body;

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: '项目ID不能为空' },
        { status: 400 }
      );
    }

    // 检查是否已标记
    const [existing] = await db
      .select()
      .from(follows)
      .where(
        and(
          eq(follows.userId, userId),
          eq(follows.targetType, 'project'),
          eq(follows.targetId, projectId)
        )
      );

    if (existing && !existing.deletedAt) {
      // 已存在，取消标记（软删除）
      await db
        .update(follows)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(eq(follows.id, existing.id));

      return NextResponse.json({
        success: true,
        data: { starred: false },
        message: '已取消重点项目标记',
      });
    }

    // 不存在或已删除，创建/恢复标记
    if (existing && existing.deletedAt) {
      await db
        .update(follows)
        .set({
          followType: 'starred',
          deletedAt: null,
          updatedAt: new Date(),
        })
        .where(eq(follows.id, existing.id));
    } else {
      await db.insert(follows).values({
        userId,
        targetType: 'project',
        targetId: projectId,
        targetName: projectName,
        followType: 'starred',
        notificationEnabled: true,
      });
    }

    return NextResponse.json({
      success: true,
      data: { starred: true },
      message: '已标记为重点项目',
    });
  } catch (error) {
    console.error('Toggle starred project API error:', error);
    return NextResponse.json(
      { success: false, error: '操作失败' },
      { status: 500 }
    );
  }
});
