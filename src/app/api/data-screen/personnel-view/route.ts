import { NextRequest } from 'next/server';
import { db } from '@/db';
import {
  users, roles, userRoles, projects,
  projectMembers, solutionTeams, staffProfiles,
  solutions, projectPresalesRecords, tasks, todos,
  schedules, workLogs,
} from '@/db/schema';
import { sql, isNull, and, eq, inArray, count, desc } from 'drizzle-orm';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withAuth } from '@/lib/auth-middleware';
import { PERMISSIONS } from '@/lib/permissions';
import type { PersonnelViewData, PersonDetail } from '@/types/data-screen';

// Actual role_code values in sys_role table (UPPERCASE)
const SOLUTION_ENGINEER_CODE = 'SOLUTION_ENGINEER';
const HQ_ROLE_CODES = ['PRESALES_MANAGER'];     // 售前主管 → 总部
const REGIONAL_ROLE_CODES = ['PRESALES_ENGINEER']; // 售前工程师 → 区域
const ALL_PRESALES_CODES = [SOLUTION_ENGINEER_CODE, ...HQ_ROLE_CODES, ...REGIONAL_ROLE_CODES];

function toWan(val: string | number | null | undefined): number {
  if (val === null || val === undefined || val === '') return 0;
  const n = Number(val);
  if (isNaN(n) || n === 0) return 0;
  return Math.round(n / 100) / 100;
}

/** Get user IDs that have any of the given role codes (via sys_user_role many-to-many) */
async function getUserIdsByRoles(roleCodes: string[]): Promise<number[]> {
  if (roleCodes.length === 0) return [];
  const rows = await db
    .selectDistinct({ id: users.id })
    .from(users)
    .innerJoin(userRoles, eq(userRoles.userId, users.id))
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .where(and(
      isNull(users.deletedAt),
      eq(users.status, 'active'),
      isNull(roles.deletedAt),
      inArray(roles.roleCode, roleCodes),
    ));
  return rows.map(r => r.id);
}

export const GET = withAuth(
  async (req: NextRequest) => {
    try {
      const { searchParams } = new URL(req.url);
      const userIdParam = searchParams.get('userId');
      const userId = userIdParam ? parseInt(userIdParam, 10) : null;

      // ── 1. KPI: role headcounts ───────────────────────────────────────────
      const roleCounts = await db
        .select({ roleCode: roles.roleCode, cnt: count() })
        .from(userRoles)
        .innerJoin(roles, eq(roles.id, userRoles.roleId))
        .innerJoin(users, eq(users.id, userRoles.userId))
        .where(and(
          isNull(users.deletedAt),
          eq(users.status, 'active'),
          isNull(roles.deletedAt),
          inArray(roles.roleCode, ALL_PRESALES_CODES),
        ))
        .groupBy(roles.roleCode);

      const countByCode: Record<string, number> = {};
      for (const row of roleCounts) {
        countByCode[row.roleCode] = Number(row.cnt);
      }

      const solutionEngineerCount = countByCode[SOLUTION_ENGINEER_CODE] ?? 0;
      const hqPresalesCount = HQ_ROLE_CODES.reduce((s, c) => s + (countByCode[c] ?? 0), 0);
      const regionalPresalesCount = REGIONAL_ROLE_CODES.reduce((s, c) => s + (countByCode[c] ?? 0), 0);
      const businessSupportCount = 0; // no such role in current DB

      // ── 2. Per-capita stats ───────────────────────────────────────────────
      const hqUserIds = await getUserIdsByRoles(HQ_ROLE_CODES);
      const regionalUserIds = await getUserIdsByRoles(REGIONAL_ROLE_CODES);

      // HQ: distinct won projects + amounts via bus_project_member
      let hqPerCapitaOutput = 0;
      let hqPerCapitaProjects = 0;
      if (hqUserIds.length > 0) {
        const [hqStats] = await db
          .select({
            totalAmount: sql<string>`SUM(DISTINCT CASE WHEN ${projects.bidResult} = 'won' THEN COALESCE(${projects.actualAmount}, ${projects.estimatedAmount}, 0) ELSE 0 END)`,
            projectCnt: sql<string>`COUNT(DISTINCT ${projects.id})`,
          })
          .from(projectMembers)
          .innerJoin(projects, eq(projectMembers.projectId, projects.id))
          .where(and(
            inArray(projectMembers.userId, hqUserIds),
            isNull(projects.deletedAt),
          ));
        const hqWonAmount = toWan(hqStats?.totalAmount);
        const hqProjectCount = Number(hqStats?.projectCnt ?? 0);
        hqPerCapitaOutput = hqPresalesCount > 0 ? Math.round((hqWonAmount / hqPresalesCount) * 100) / 100 : 0;
        hqPerCapitaProjects = hqPresalesCount > 0 ? Math.round((hqProjectCount / hqPresalesCount) * 10) / 10 : 0;
      }

      // Regional: distinct won projects + amounts via bus_project_member
      let regionalPerCapitaOutput = 0;
      let regionalPerCapitaProjects = 0;
      if (regionalUserIds.length > 0) {
        const [regStats] = await db
          .select({
            totalAmount: sql<string>`SUM(DISTINCT CASE WHEN ${projects.bidResult} = 'won' THEN COALESCE(${projects.actualAmount}, ${projects.estimatedAmount}, 0) ELSE 0 END)`,
            projectCnt: sql<string>`COUNT(DISTINCT ${projects.id})`,
          })
          .from(projectMembers)
          .innerJoin(projects, eq(projectMembers.projectId, projects.id))
          .where(and(
            inArray(projectMembers.userId, regionalUserIds),
            isNull(projects.deletedAt),
          ));
        const regWonAmount = toWan(regStats?.totalAmount);
        const regProjectCount = Number(regStats?.projectCnt ?? 0);
        regionalPerCapitaOutput = regionalPresalesCount > 0 ? Math.round((regWonAmount / regionalPresalesCount) * 100) / 100 : 0;
        regionalPerCapitaProjects = regionalPresalesCount > 0 ? Math.round((regProjectCount / regionalPresalesCount) * 10) / 10 : 0;
      }

      // ── 3. Graph data ─────────────────────────────────────────────────────
      const solEngIds = await getUserIdsByRoles([SOLUTION_ENGINEER_CODE]);
      const allPresalesIds = [...new Set([...hqUserIds, ...regionalUserIds, ...solEngIds])];

      // Get user info for graph persons
      const graphUsers = allPresalesIds.length > 0
        ? await db
          .selectDistinct({
            id: users.id,
            realName: users.realName,
            roleCode: roles.roleCode,
          })
          .from(users)
          .innerJoin(userRoles, eq(userRoles.userId, users.id))
          .innerJoin(roles, eq(roles.id, userRoles.roleId))
          .where(and(
            inArray(users.id, allPresalesIds),
            isNull(users.deletedAt),
          ))
        : [];

      // Project edges via bus_project_member
      const projEdges = allPresalesIds.length > 0
        ? await db
          .select({
            userId: projectMembers.userId,
            projectId: projects.id,
            projectName: projects.projectName,
            projectStage: projects.projectStage,
            role: projectMembers.role,
          })
          .from(projectMembers)
          .innerJoin(projects, eq(projectMembers.projectId, projects.id))
          .where(and(
            inArray(projectMembers.userId, allPresalesIds),
            isNull(projects.deletedAt),
            sql`${projects.projectStage} NOT IN ('archived', 'cancelled')`,
          ))
          .limit(120)
        : [];

      // Solution edges via bus_solution_team
      const solEdges = allPresalesIds.length > 0
        ? await db
          .select({
            userId: solutionTeams.userId,
            solutionId: solutions.id,
            solutionName: solutions.solutionName,
            role: solutionTeams.role,
          })
          .from(solutionTeams)
          .innerJoin(solutions, eq(solutionTeams.solutionId, solutions.id))
          .where(and(
            inArray(solutionTeams.userId, allPresalesIds),
            isNull(solutionTeams.deletedAt),
          ))
          .limit(80)
        : [];

      // Build graph nodes + edges
      const nodeMap = new Map<string, { id: string; name: string; nodeType: 'person' | 'project' | 'solution'; projectCount?: number; overdueTaskCount?: number }>();

      // Compute per-user active project count from projEdges (distinct projects)
      const userProjectSets = new Map<number, Set<number>>();
      for (const e of projEdges) {
        if (!userProjectSets.has(e.userId)) userProjectSets.set(e.userId, new Set());
        userProjectSets.get(e.userId)!.add(e.projectId);
      }
      const projectCountByUser = new Map<number, number>();
      for (const [uid, set] of userProjectSets) {
        projectCountByUser.set(uid, set.size);
      }

      // Query overdue task count per presales user
      const overdueRows = allPresalesIds.length > 0
        ? await db
          .select({
            userId: tasks.assigneeId,
            cnt: count(),
          })
          .from(tasks)
          .where(and(
            inArray(tasks.assigneeId, allPresalesIds),
            isNull(tasks.deletedAt),
            sql`${tasks.status} IN ('pending', 'in_progress')`,
            sql`${tasks.dueDate} IS NOT NULL`,
            sql`${tasks.dueDate}::date < CURRENT_DATE`,
          ))
          .groupBy(tasks.assigneeId)
        : [];
      const overdueCountByUser = new Map<number, number>();
      for (const row of overdueRows) {
        if (row.userId !== null) overdueCountByUser.set(row.userId, Number(row.cnt));
      }

      // Deduplicate users by id (selectDistinct may return dupes due to multi-role)
      const seenUsers = new Set<number>();
      for (const u of graphUsers) {
        if (!seenUsers.has(u.id)) {
          seenUsers.add(u.id);
          nodeMap.set(`u:${u.id}`, {
            id: `u:${u.id}`,
            name: u.realName,
            nodeType: 'person',
            projectCount: projectCountByUser.get(u.id) ?? 0,
            overdueTaskCount: overdueCountByUser.get(u.id) ?? 0,
          });
        }
      }

      // Direct roles for project members: manager/supervisor = direct, member = indirect
      const DIRECT_PROJECT_ROLES = new Set(['manager', 'supervisor']);

      const graphEdges: { source: string; target: string; lineType: 'direct' | 'indirect' }[] = [];

      for (const e of projEdges) {
        const pKey = `p:${e.projectId}`;
        if (!nodeMap.has(pKey)) {
          nodeMap.set(pKey, { id: pKey, name: e.projectName, nodeType: 'project' });
        }
        const lineType = DIRECT_PROJECT_ROLES.has(e.role) ? 'direct' : 'indirect';
        graphEdges.push({ source: `u:${e.userId}`, target: pKey, lineType });
      }

      for (const e of solEdges) {
        const sKey = `s:${e.solutionId}`;
        if (!nodeMap.has(sKey)) {
          nodeMap.set(sKey, { id: sKey, name: e.solutionName, nodeType: 'solution' });
        }
        graphEdges.push({ source: `u:${e.userId}`, target: sKey, lineType: 'direct' });
      }

      // ── 4. Project manhour ranking ─────────────────────────────────────────
      const manhourRows = await db
        .select({
          projectId: projectPresalesRecords.projectId,
          projectName: projects.projectName,
          totalHours: sql<string>`SUM(COALESCE(${projectPresalesRecords.totalWorkHours}, ${projectPresalesRecords.durationHours}, 0))`,
          memberCount: sql<string>`COUNT(DISTINCT ${projectPresalesRecords.staffId})`,
        })
        .from(projectPresalesRecords)
        .innerJoin(projects, eq(projectPresalesRecords.projectId, projects.id))
        .where(
          and(
            isNull(projectPresalesRecords.deletedAt),
            isNull(projects.deletedAt),
          ),
        )
        .groupBy(projectPresalesRecords.projectId, projects.projectName)
        .orderBy(desc(sql`SUM(COALESCE(${projectPresalesRecords.totalWorkHours}, ${projectPresalesRecords.durationHours}, 0))`))
        .limit(10);

      const projectManhourRanking = manhourRows.map(r => ({
        projectId: r.projectId,
        projectName: r.projectName,
        totalHours: Math.round(Number(r.totalHours) * 10) / 10,
        memberCount: Number(r.memberCount),
      }));

      // ── 5. HQ per-capita list ──────────────────────────────────────────────
      const hqPerCapitaList: PersonnelViewData['hqPerCapitaList'] = [];
      if (hqUserIds.length > 0) {
        const hqPersonStats = await db
          .select({
            userId: users.id,
            displayName: users.realName,
            projectCount: sql<string>`COUNT(DISTINCT ${projectMembers.projectId})`,
            wonAmount: sql<string>`SUM(DISTINCT CASE WHEN ${projects.bidResult} = 'won' THEN COALESCE(${projects.actualAmount}, ${projects.estimatedAmount}, 0) ELSE 0 END)`,
          })
          .from(users)
          .leftJoin(projectMembers, eq(projectMembers.userId, users.id))
          .leftJoin(projects, and(
            eq(projects.id, projectMembers.projectId),
            isNull(projects.deletedAt),
          ))
          .where(inArray(users.id, hqUserIds))
          .groupBy(users.id, users.realName)
          .orderBy(desc(sql`SUM(DISTINCT CASE WHEN ${projects.bidResult} = 'won' THEN COALESCE(${projects.actualAmount}, ${projects.estimatedAmount}, 0) ELSE 0 END)`));

        for (const r of hqPersonStats) {
          hqPerCapitaList.push({
            userId: r.userId,
            displayName: r.displayName,
            projectCount: Number(r.projectCount),
            wonAmount: toWan(r.wonAmount),
          });
        }
      }

      // ── 6. Regional per-capita list ───────────────────────────────────────
      const regionalPerCapitaList: PersonnelViewData['regionalPerCapitaList'] = [];
      if (regionalUserIds.length > 0) {
        const regPersonStats = await db
          .select({
            userId: users.id,
            displayName: users.realName,
            baseLocation: users.baseLocation,
            projectCount: sql<string>`COUNT(DISTINCT ${projectMembers.projectId})`,
            wonAmount: sql<string>`SUM(DISTINCT CASE WHEN ${projects.bidResult} = 'won' THEN COALESCE(${projects.actualAmount}, ${projects.estimatedAmount}, 0) ELSE 0 END)`,
          })
          .from(users)
          .leftJoin(projectMembers, eq(projectMembers.userId, users.id))
          .leftJoin(projects, and(
            eq(projects.id, projectMembers.projectId),
            isNull(projects.deletedAt),
          ))
          .where(inArray(users.id, regionalUserIds))
          .groupBy(users.id, users.realName, users.baseLocation)
          .orderBy(desc(sql`SUM(DISTINCT CASE WHEN ${projects.bidResult} = 'won' THEN COALESCE(${projects.actualAmount}, ${projects.estimatedAmount}, 0) ELSE 0 END)`));

        for (const r of regPersonStats) {
          regionalPerCapitaList.push({
            userId: r.userId,
            displayName: r.displayName,
            region: r.baseLocation,
            projectCount: Number(r.projectCount),
            wonAmount: toWan(r.wonAmount),
          });
        }
      }

      // ── 7. Person detail (optional) ───────────────────────────────────────
      let personDetail: PersonDetail | undefined;
      if (userId && !isNaN(userId)) {
        const [userRow] = await db
          .select({
            id: users.id,
            realName: users.realName,
            department: users.department,
            position: users.position,
            baseLocation: users.baseLocation,
            roleCode: roles.roleCode,
            roleName: roles.roleName,
          })
          .from(users)
          .innerJoin(userRoles, eq(userRoles.userId, users.id))
          .innerJoin(roles, eq(roles.id, userRoles.roleId))
          .where(and(eq(users.id, userId), isNull(users.deletedAt), isNull(roles.deletedAt)))
          .limit(1);

        if (userRow) {
          const [profileRow] = await db
            .select({
              avatar: staffProfiles.avatar,
              bio: staffProfiles.bio,
              skills: staffProfiles.skills,
              expertise: staffProfiles.expertise,
              certifications: staffProfiles.certifications,
            })
            .from(staffProfiles)
            .where(eq(staffProfiles.userId, userId));

          // Person stats via bus_project_member
          const [statsRow] = await db
            .select({
              projectCount: sql<string>`COUNT(DISTINCT ${projectMembers.projectId})`,
              wonAmount: sql<string>`SUM(DISTINCT CASE WHEN ${projects.bidResult} = 'won' THEN COALESCE(${projects.actualAmount}, ${projects.estimatedAmount}, 0) ELSE 0 END)`,
            })
            .from(projectMembers)
            .innerJoin(projects, and(
              eq(projects.id, projectMembers.projectId),
              isNull(projects.deletedAt),
            ))
            .where(eq(projectMembers.userId, userId));

          const [hoursRow] = await db
            .select({
              totalHours: sql<string>`SUM(COALESCE(${projectPresalesRecords.totalWorkHours}, ${projectPresalesRecords.durationHours}, 0))`,
            })
            .from(projectPresalesRecords)
            .where(and(
              eq(projectPresalesRecords.staffId, userId),
              isNull(projectPresalesRecords.deletedAt),
            ));

          const solutionCount = (await db
            .select({ cnt: count() })
            .from(solutionTeams)
            .where(and(
              eq(solutionTeams.userId, userId),
              isNull(solutionTeams.deletedAt),
            )))[0]?.cnt ?? 0;

          // Recent projects via bus_project_member
          const recentProjects = await db
            .select({
              id: projects.id,
              projectName: projects.projectName,
              projectStage: projects.projectStage,
              bidResult: projects.bidResult,
            })
            .from(projectMembers)
            .innerJoin(projects, eq(projects.id, projectMembers.projectId))
            .where(and(
              eq(projectMembers.userId, userId),
              isNull(projects.deletedAt),
            ))
            .orderBy(desc(projectMembers.createdAt))
            .limit(6);

          // Solutions via bus_solution_team
          const personSolutions = await db
            .select({
              id: solutions.id,
              solutionName: solutions.solutionName,
              role: solutionTeams.role,
            })
            .from(solutionTeams)
            .innerJoin(solutions, eq(solutions.id, solutionTeams.solutionId))
            .where(and(
              eq(solutionTeams.userId, userId),
              isNull(solutionTeams.deletedAt),
            ))
            .limit(6);

          // Current tasks: active project tasks assigned to this user
          const activeTasks = await db
            .select({
              id: tasks.id,
              title: tasks.taskName,
              priority: tasks.priority,
              status: tasks.status,
              dueDate: tasks.dueDate,
              taskType: tasks.taskType,
              projectName: projects.projectName,
            })
            .from(tasks)
            .leftJoin(projects, eq(projects.id, tasks.projectId))
            .where(and(
              eq(tasks.assigneeId, userId),
              isNull(tasks.deletedAt),
              sql`${tasks.status} IN ('pending', 'in_progress')`,
            ))
            .orderBy(sql`CASE ${tasks.priority} WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END`, tasks.dueDate)
            .limit(10);

          // Current todos: pending/in-progress todos assigned to this user
          const activeTodos = await db
            .select({
              id: todos.id,
              title: todos.title,
              priority: todos.priority,
              status: todos.todoStatus,
              dueDate: todos.dueDate,
              taskType: todos.type,
              relatedName: todos.relatedName,
            })
            .from(todos)
            .where(and(
              eq(todos.assigneeId, userId),
              sql`${todos.todoStatus} IN ('pending', 'in_progress')`,
            ))
            .orderBy(sql`CASE ${todos.priority} WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END`, todos.dueDate)
            .limit(10);

          const currentTasks = [
            ...activeTasks.map(t => ({
              id: t.id,
              kind: 'task' as const,
              title: t.title,
              priority: t.priority ?? 'medium',
              status: t.status,
              dueDate: t.dueDate ? new Date(t.dueDate).toISOString().slice(0, 10) : null,
              relatedName: t.projectName ?? null,
              taskType: t.taskType ?? null,
            })),
            ...activeTodos.map(t => ({
              id: t.id,
              kind: 'todo' as const,
              title: t.title,
              priority: t.priority ?? 'medium',
              status: t.status ?? 'pending',
              dueDate: t.dueDate ? new Date(t.dueDate).toISOString().slice(0, 10) : null,
              relatedName: t.relatedName ?? null,
              taskType: t.taskType ?? null,
            })),
          ].slice(0, 15);

          // Upcoming schedules: today + next 7 days
          const scheduleRows = await db
            .select({
              id: schedules.id,
              title: schedules.title,
              startDate: schedules.startDate,
              startTime: schedules.startTime,
              type: schedules.type,
            })
            .from(schedules)
            .where(and(
              eq(schedules.userId, userId),
              sql`${schedules.startDate}::date >= CURRENT_DATE`,
              sql`${schedules.startDate}::date < CURRENT_DATE + INTERVAL '7 days'`,
              sql`${schedules.scheduleStatus} != 'cancelled'`,
            ))
            .orderBy(schedules.startDate, schedules.startTime)
            .limit(5);

          const upcomingSchedules = scheduleRows.map(s => ({
            id: s.id,
            title: s.title,
            startDate: s.startDate,
            startTime: s.startTime ?? null,
            type: s.type ?? null,
          }));

          // Worklog trend: last 8 weeks grouped by week
          const worklogRows = await db
            .select({
              week: sql<string>`to_char(date_trunc('week', ${workLogs.logDate}::timestamp), 'MM/DD')`,
              hours: sql<string>`SUM(COALESCE(${workLogs.workHours}, 0))`,
            })
            .from(workLogs)
            .where(and(
              eq(workLogs.userId, userId),
              sql`${workLogs.logDate}::date >= CURRENT_DATE - INTERVAL '56 days'`,
            ))
            .groupBy(sql`date_trunc('week', ${workLogs.logDate}::timestamp)`)
            .orderBy(sql`date_trunc('week', ${workLogs.logDate}::timestamp)`)
            .limit(8);

          const worklogTrend = worklogRows.map(r => ({
            week: r.week,
            hours: Math.round(Number(r.hours) * 10) / 10,
          }));

          personDetail = {
            userId: userRow.id,
            realName: userRow.realName,
            roleCode: userRow.roleCode,
            roleName: userRow.roleName,
            department: userRow.department,
            position: userRow.position,
            baseLocation: userRow.baseLocation,
            avatar: profileRow?.avatar ?? null,
            bio: profileRow?.bio ?? null,
            skills: profileRow?.skills ?? null,
            expertise: profileRow?.expertise ?? null,
            certifications: profileRow?.certifications ?? null,
            projectCount: Number(statsRow?.projectCount ?? 0),
            solutionCount: Number(solutionCount),
            wonAmount: toWan(statsRow?.wonAmount),
            presalesHours: Math.round(Number(hoursRow?.totalHours ?? 0) * 10) / 10,
            recentProjects: recentProjects.map(p => ({
              id: p.id,
              projectName: p.projectName,
              projectStage: p.projectStage,
              bidResult: p.bidResult,
            })),
            solutions: personSolutions.map(s => ({
              id: s.id,
              solutionName: s.solutionName,
              role: s.role,
            })),
            currentTasks,
            upcomingSchedules,
            worklogTrend,
          };
        }
      }

      const result: PersonnelViewData = {
        kpi: {
          solutionEngineerCount,
          hqPresalesCount,
          regionalPresalesCount,
          businessSupportCount,
          hqPerCapitaOutput,
          regionalPerCapitaOutput,
          hqPerCapitaProjects,
          regionalPerCapitaProjects,
        },
        graphData: {
          nodes: Array.from(nodeMap.values()),
          edges: graphEdges,
        },
        projectManhourRanking,
        hqPerCapitaList,
        regionalPerCapitaList,
        ...(personDetail ? { personDetail } : {}),
      };

      return successResponse(result);
    } catch (err) {
      console.error('[personnel-view] error:', err);
      return errorResponse('INTERNAL_ERROR', '人员大屏数据加载失败', { status: 500 });
    }
  },
  { requiredPermissions: [PERMISSIONS.DATASCREEN_VIEW] },
);
