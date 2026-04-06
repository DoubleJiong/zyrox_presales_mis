import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { solutionTeams, solutions, users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { authenticate } from '@/lib/auth';

// 默认权限配置
const DEFAULT_PERMISSIONS: Record<string, {
  canEdit: boolean;
  canDelete: boolean;
  canApprove: boolean;
  canInvite: boolean;
  canUpload: boolean;
  canDownload: boolean;
}> = {
  owner: { canEdit: true, canDelete: true, canApprove: true, canInvite: true, canUpload: true, canDownload: true },
  maintainer: { canEdit: true, canDelete: false, canApprove: false, canInvite: true, canUpload: true, canDownload: true },
  contributor: { canEdit: true, canDelete: false, canApprove: false, canInvite: false, canUpload: true, canDownload: true },
  reviewer: { canEdit: false, canDelete: false, canApprove: true, canInvite: false, canUpload: false, canDownload: true },
  viewer: { canEdit: false, canDelete: false, canApprove: false, canInvite: false, canUpload: false, canDownload: false },
};

// GET /api/solutions/[id]/team/[memberId] - 获取单个团队成员详情
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const user = await authenticate(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: idParam, memberId } = await params;
    const solutionId = parseInt(idParam);
    const teamMemberId = parseInt(memberId);

    // 获取团队成员详情
    const [member] = await db
      .select()
      .from(solutionTeams)
      .where(
        and(
          eq(solutionTeams.id, teamMemberId),
          eq(solutionTeams.solutionId, solutionId)
        )
      )
      .limit(1);

    if (!member) {
      return NextResponse.json({ error: 'Team member not found' }, { status: 404 });
    }

    // 获取用户信息
    const [userData] = await db
      .select()
      .from(users)
      .where(eq(users.id, member.userId))
      .limit(1);

    // 获取邀请人信息
    let inviter = null;
    if (member.invitedBy) {
      const [inviterData] = await db
        .select({ id: users.id, realName: users.realName })
        .from(users)
        .where(eq(users.id, member.invitedBy))
        .limit(1);
      inviter = inviterData;
    }

    return NextResponse.json({
      data: {
        ...member,
        user: userData,
        inviter,
      },
    });
  } catch (error) {
    console.error('Error fetching team member:', error);
    return NextResponse.json(
      { error: 'Failed to fetch team member' },
      { status: 500 }
    );
  }
}

// PUT /api/solutions/[id]/team/[memberId] - 更新团队成员
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const user = await authenticate(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: idParam, memberId } = await params;
    const solutionId = parseInt(idParam);
    const teamMemberId = parseInt(memberId);
    const body = await req.json();

    // 检查团队成员是否存在
    const [existing] = await db
      .select()
      .from(solutionTeams)
      .where(
        and(
          eq(solutionTeams.id, teamMemberId),
          eq(solutionTeams.solutionId, solutionId)
        )
      )
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: 'Team member not found' }, { status: 404 });
    }

    // 准备更新数据
    const updateData: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (body.role) {
      updateData.role = body.role;
      // 如果更新了角色但没有提供权限，使用默认权限
      if (!body.permissions && DEFAULT_PERMISSIONS[body.role]) {
        updateData.permissions = DEFAULT_PERMISSIONS[body.role];
      }
    }

    if (body.permissions !== undefined) {
      updateData.permissions = body.permissions;
    }

    if (body.status !== undefined) {
      updateData.status = body.status;
    }

    if (body.notes !== undefined) {
      updateData.notes = body.notes;
    }

    // 执行更新
    const [updated] = await db
      .update(solutionTeams)
      .set(updateData)
      .where(eq(solutionTeams.id, teamMemberId))
      .returning();

    return NextResponse.json({
      message: 'Team member updated successfully',
      data: updated,
    });
  } catch (error) {
    console.error('Error updating team member:', error);
    return NextResponse.json(
      { error: 'Failed to update team member' },
      { status: 500 }
    );
  }
}

// DELETE /api/solutions/[id]/team/[memberId] - 移除团队成员
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const user = await authenticate(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: idParam, memberId } = await params;
    const solutionId = parseInt(idParam);
    const teamMemberId = parseInt(memberId);

    // 检查团队成员是否存在
    const [existing] = await db
      .select()
      .from(solutionTeams)
      .where(
        and(
          eq(solutionTeams.id, teamMemberId),
          eq(solutionTeams.solutionId, solutionId)
        )
      )
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: 'Team member not found' }, { status: 404 });
    }

    // 不允许移除方案作者
    const [solution] = await db
      .select()
      .from(solutions)
      .where(eq(solutions.id, solutionId))
      .limit(1);

    if (solution && solution.authorId === existing.userId) {
      return NextResponse.json(
        { error: 'Cannot remove the solution author from team' },
        { status: 400 }
      );
    }

    // 软删除
    const [deleted] = await db
      .update(solutionTeams)
      .set({ deletedAt: new Date(), status: 'inactive' })
      .where(eq(solutionTeams.id, teamMemberId))
      .returning();

    return NextResponse.json({
      message: 'Team member removed successfully',
      data: deleted,
    });
  } catch (error) {
    console.error('Error removing team member:', error);
    return NextResponse.json(
      { error: 'Failed to remove team member' },
      { status: 500 }
    );
  }
}
