import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { solutionTeams, solutions, users, attributes } from '@/db/schema';
import { eq, and, desc, sql, isNull } from 'drizzle-orm';
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

// GET /api/solutions/[id]/team - 获取方案团队成员列表
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: idParam } = await params;
    const solutionId = parseInt(idParam);

    // 检查解决方案是否存在
    const [solution] = await db
      .select()
      .from(solutions)
      .where(eq(solutions.id, solutionId))
      .limit(1);

    if (!solution) {
      return NextResponse.json({ error: 'Solution not found' }, { status: 404 });
    }

    // 获取团队成员列表
    const teamMembers = await db
      .select({
        id: solutionTeams.id,
        solutionId: solutionTeams.solutionId,
        userId: solutionTeams.userId,
        role: solutionTeams.role,
        permissions: solutionTeams.permissions,
        joinedAt: solutionTeams.joinedAt,
        invitedBy: solutionTeams.invitedBy,
        status: solutionTeams.status,
        notes: solutionTeams.notes,
        // 用户信息
        userName: users.realName,
        userEmail: users.email,
        userDepartment: users.department,
        userPosition: users.position,
        userAvatar: users.avatar,
      })
      .from(solutionTeams)
      .innerJoin(users, eq(solutionTeams.userId, users.id))
      .where(
        and(
          eq(solutionTeams.solutionId, solutionId),
          eq(solutionTeams.status, 'active'),
          isNull(solutionTeams.deletedAt)
        )
      )
      .orderBy(desc(solutionTeams.role));

    // 获取邀请人信息
    const teamMembersWithInviter = await Promise.all(
      teamMembers.map(async (member) => {
        let inviter = null;
        if (member.invitedBy) {
          const [inviterData] = await db
            .select({ id: users.id, realName: users.realName })
            .from(users)
            .where(eq(users.id, member.invitedBy))
            .limit(1);
          inviter = inviterData;
        }
        return {
          ...member,
          inviter,
        };
      })
    );

    return NextResponse.json({
      data: teamMembersWithInviter,
    });
  } catch (error) {
    console.error('Error fetching team members:', error);
    return NextResponse.json(
      { error: 'Failed to fetch team members' },
      { status: 500 }
    );
  }
}

// POST /api/solutions/[id]/team - 添加团队成员
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: idParam } = await params;
    const solutionId = parseInt(idParam);
    const body = await req.json();

    // 检查解决方案是否存在
    const [solution] = await db
      .select()
      .from(solutions)
      .where(eq(solutions.id, solutionId))
      .limit(1);

    if (!solution) {
      return NextResponse.json({ error: 'Solution not found' }, { status: 404 });
    }

    // 验证必填字段
    if (!body.userId || !body.role) {
      return NextResponse.json(
        { error: 'userId and role are required' },
        { status: 400 }
      );
    }

    // 检查用户是否存在
    const [targetUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, body.userId))
      .limit(1);

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 检查用户是否已在团队中
    const [existingMember] = await db
      .select()
      .from(solutionTeams)
      .where(
        and(
          eq(solutionTeams.solutionId, solutionId),
          eq(solutionTeams.userId, body.userId)
        )
      )
      .limit(1);

    if (existingMember) {
      // 更新现有成员
      const [updated] = await db
        .update(solutionTeams)
        .set({
          role: body.role,
          permissions: body.permissions || DEFAULT_PERMISSIONS[body.role] || null,
          status: 'active',
          updatedAt: new Date(),
        })
        .where(eq(solutionTeams.id, existingMember.id))
        .returning();

      return NextResponse.json({
        message: 'Team member updated successfully',
        data: updated,
      });
    }

    // 获取角色默认权限
    let permissions = body.permissions;
    if (!permissions && DEFAULT_PERMISSIONS[body.role]) {
      permissions = DEFAULT_PERMISSIONS[body.role];
    }

    // 添加新成员
    const [newMember] = await db
      .insert(solutionTeams)
      .values({
        solutionId,
        userId: body.userId,
        role: body.role,
        permissions,
        invitedBy: user.id,
        status: 'active',
        notes: body.notes || null,
      })
      .returning();

    return NextResponse.json({
      message: 'Team member added successfully',
      data: newMember,
    });
  } catch (error) {
    console.error('Error adding team member:', error);
    return NextResponse.json(
      { error: 'Failed to add team member' },
      { status: 500 }
    );
  }
}
