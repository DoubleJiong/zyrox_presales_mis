import { db } from '@/db';
import { solutionTeams, solutions } from '@/db/schema';
import { eq, and, or, isNull } from 'drizzle-orm';

export type SolutionPermission = 
  | 'canEdit'
  | 'canDelete'
  | 'canApprove'
  | 'canInvite'
  | 'canUpload'
  | 'canDownload';

export interface UserSolutionPermission {
  isTeamMember: boolean;
  role: string | null;
  permissions: Record<SolutionPermission, boolean>;
  isOwner: boolean;
}

/**
 * 获取用户对方案的权限
 * @param userId 用户ID
 * @param solutionId 方案ID
 * @returns 权限信息
 */
export async function getUserSolutionPermission(
  userId: number,
  solutionId: number
): Promise<UserSolutionPermission> {
  // 获取方案信息
  const [solution] = await db
    .select({
      authorId: solutions.authorId,
      ownerId: solutions.ownerId,
    })
    .from(solutions)
    .where(eq(solutions.id, solutionId))
    .limit(1);

  if (!solution) {
    return {
      isTeamMember: false,
      role: null,
      permissions: {
        canEdit: false,
        canDelete: false,
        canApprove: false,
        canInvite: false,
        canUpload: false,
        canDownload: true, // 非团队成员只能下载
      },
      isOwner: false,
    };
  }

  // 检查是否是方案作者或负责人
  const isOwner = solution.authorId === userId || solution.ownerId === userId;

  // 获取团队成员信息
  const [teamMember] = await db
    .select({
      role: solutionTeams.role,
      permissions: solutionTeams.permissions,
      status: solutionTeams.status,
    })
    .from(solutionTeams)
    .where(
      and(
        eq(solutionTeams.solutionId, solutionId),
        eq(solutionTeams.userId, userId),
        or(
          isNull(solutionTeams.deletedAt),
          eq(solutionTeams.status, 'active')
        )
      )
    )
    .limit(1);

  // 如果是方案作者或负责人，拥有所有权限
  if (isOwner) {
    return {
      isTeamMember: true,
      role: 'owner',
      permissions: {
        canEdit: true,
        canDelete: true,
        canApprove: true,
        canInvite: true,
        canUpload: true,
        canDownload: true,
      },
      isOwner: true,
    };
  }

  // 如果是团队成员
  if (teamMember && teamMember.status === 'active') {
    const permissions = teamMember.permissions || getDefaultPermissions(teamMember.role);
    return {
      isTeamMember: true,
      role: teamMember.role,
      permissions: {
        canEdit: permissions.canEdit ?? false,
        canDelete: permissions.canDelete ?? false,
        canApprove: permissions.canApprove ?? false,
        canInvite: permissions.canInvite ?? false,
        canUpload: permissions.canUpload ?? false,
        canDownload: permissions.canDownload ?? true,
      },
      isOwner: false,
    };
  }

  // 非团队成员 - 只能查看和下载
  return {
    isTeamMember: false,
    role: null,
    permissions: {
      canEdit: false,
      canDelete: false,
      canApprove: false,
      canInvite: false,
      canUpload: false,
      canDownload: true,
    },
    isOwner: false,
  };
}

/**
 * 检查用户是否有特定权限
 * @param userId 用户ID
 * @param solutionId 方案ID
 * @param permission 权限类型
 * @returns 是否有权限
 */
export async function checkSolutionPermission(
  userId: number,
  solutionId: number,
  permission: SolutionPermission
): Promise<boolean> {
  const userPermission = await getUserSolutionPermission(userId, solutionId);
  return userPermission.permissions[permission];
}

/**
 * 获取角色默认权限
 */
function getDefaultPermissions(role: string): Record<SolutionPermission, boolean> {
  const defaultPermissions: Record<string, Record<SolutionPermission, boolean>> = {
    owner: {
      canEdit: true,
      canDelete: true,
      canApprove: true,
      canInvite: true,
      canUpload: true,
      canDownload: true,
    },
    maintainer: {
      canEdit: true,
      canDelete: false,
      canApprove: false,
      canInvite: true,
      canUpload: true,
      canDownload: true,
    },
    contributor: {
      canEdit: true,
      canDelete: false,
      canApprove: false,
      canInvite: false,
      canUpload: true,
      canDownload: true,
    },
    reviewer: {
      canEdit: false,
      canDelete: false,
      canApprove: true,
      canInvite: false,
      canUpload: false,
      canDownload: true,
    },
    viewer: {
      canEdit: false,
      canDelete: false,
      canApprove: false,
      canInvite: false,
      canUpload: false,
      canDownload: true,
    },
  };

  return defaultPermissions[role] || defaultPermissions.viewer;
}
