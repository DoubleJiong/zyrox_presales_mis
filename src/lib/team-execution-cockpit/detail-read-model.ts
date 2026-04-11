import { db } from '@/db';
import { customers, customerTypes, solutionTypes, solutions } from '@/db/schema';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import type { TeamExecutionFilters } from '@/lib/team-execution-cockpit/filters';
import {
  buildProjectExecutionStats,
  buildUserExecutionStats,
  loadTeamExecutionScope,
  type TeamExecutionScope,
} from '@/lib/team-execution-cockpit/read-model';
import {
  buildTeamExecutionEntityHref,
  buildTeamExecutionTaskHref,
  type TeamExecutionDetailEntityType,
} from '@/lib/team-execution-cockpit/detail-links';

export interface TeamExecutionObjectDetailReadModel {
  filtersEcho: TeamExecutionFilters;
  entityType: TeamExecutionDetailEntityType;
  entityId: number;
  title: string;
  subtitle: string;
  description: string | null;
  statusLabel: string | null;
  metrics: Array<{
    label: string;
    value: string;
  }>;
  fields: Array<{
    label: string;
    value: string;
  }>;
  sections: Array<{
    title: string;
    emptyText: string;
    items: Array<{
      entityType: TeamExecutionDetailEntityType;
      entityId: number;
      title: string;
      subtitle: string;
      href: string;
    }>;
  }>;
  actions: Array<{
    label: string;
    href: string;
    variant: 'default' | 'outline';
  }>;
}

function parseDate(value: string | Date | null | undefined) {
  if (!value) {
    return null;
  }

  const parsed = value instanceof Date ? new Date(value) : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function formatDate(value: Date | string | null | undefined, fallback = '未设置') {
  const parsed = parseDate(value);
  if (!parsed) {
    return fallback;
  }

  return parsed.toISOString().slice(0, 10).replace(/-/g, '.');
}

function uniqueItems<T>(items: T[], getKey: (item: T) => string) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = getKey(item);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

async function loadDetailContext(scope: TeamExecutionScope) {
  const customerIds = Array.from(new Set(scope.projectRows.map((project) => project.customerId).filter((value): value is number => !!value)));
  const linkedSolutionIds = Array.from(new Set([
    ...scope.solutionRows.map((solution) => solution.id),
    ...scope.solutionProjectRows.map((item) => item.solutionId),
  ]));

  const customerRows = customerIds.length > 0
    ? await db
        .select({
          id: customers.id,
          customerName: customers.customerName,
          region: customers.region,
          status: customers.status,
          contactName: customers.contactName,
          lastInteractionTime: customers.lastInteractionTime,
          currentProjectCount: customers.currentProjectCount,
          customerTypeName: customerTypes.name,
        })
        .from(customers)
        .leftJoin(customerTypes, eq(customers.customerTypeId, customerTypes.id))
        .where(and(inArray(customers.id, customerIds), isNull(customers.deletedAt)))
    : [];

  const solutionRows = linkedSolutionIds.length > 0
    ? await db
        .select({
          id: solutions.id,
          solutionName: solutions.solutionName,
          version: solutions.version,
          status: solutions.status,
          description: solutions.description,
          projectId: solutions.projectId,
          authorId: solutions.authorId,
          ownerId: solutions.ownerId,
          reviewerId: solutions.reviewerId,
          solutionTypeName: solutionTypes.name,
        })
        .from(solutions)
        .leftJoin(solutionTypes, eq(solutions.solutionTypeId, solutionTypes.id))
        .where(and(inArray(solutions.id, linkedSolutionIds), isNull(solutions.deletedAt)))
    : [];

  return {
    customerMap: new Map(customerRows.map((item) => [item.id, item])),
    solutionMap: new Map(solutionRows.map((item) => [item.id, item])),
  };
}

export async function getTeamExecutionObjectDetailReadModel(
  userId: number,
  entityType: TeamExecutionDetailEntityType,
  entityId: number,
  filters: TeamExecutionFilters,
  range: { startDate: string; endDate: string }
): Promise<TeamExecutionObjectDetailReadModel | null> {
  const scope = await loadTeamExecutionScope(userId);
  if (scope.projectRows.length === 0) {
    return null;
  }

  const today = parseDate(range.endDate) || new Date();
  const userStats = buildUserExecutionStats(scope, filters, today);
  const projectStats = buildProjectExecutionStats(scope, filters, today);
  const { customerMap, solutionMap } = await loadDetailContext(scope);
  const userStatMap = new Map(userStats.map((item) => [item.userId, item]));
  const projectStatMap = new Map(projectStats.map((item) => [item.projectId, item]));

  const makeActions = (type: TeamExecutionDetailEntityType, id: number) => {
    const actions: TeamExecutionObjectDetailReadModel['actions'] = [
      {
        label: `打开${type === 'person' ? '人员' : type === 'project' ? '项目' : type === 'customer' ? '客户' : '方案'}页面`,
        href: buildTeamExecutionEntityHref(type, id),
        variant: 'default',
      },
    ];

    const taskHref = buildTeamExecutionTaskHref({ entityType: type, entityId: id });
    if (taskHref) {
      actions.push({
        label: '进入任务中心',
        href: taskHref,
        variant: 'outline',
      });
    }

    return actions;
  };

  if (entityType === 'person') {
    const user = scope.userMap.get(entityId);
    const stat = userStatMap.get(entityId);
    if (!user || !stat) {
      return null;
    }

    const relatedProjects = uniqueItems(
      scope.projectRows
        .filter((project) => {
          if (project.managerId === entityId || project.deliveryManagerId === entityId) {
            return true;
          }
          if (scope.memberIdsByProject.get(project.id)?.has(entityId)) {
            return true;
          }
          if (scope.taskRows.some((task) => task.projectId === project.id && task.assigneeId === entityId)) {
            return true;
          }
          if (scope.todoRows.some((todo) => todo.assigneeId === entityId && todo.relatedType === 'project' && todo.relatedId === project.id)) {
            return true;
          }
          return scope.solutionRows.some((solution) => solution.projectId === project.id && [solution.authorId, solution.ownerId, solution.reviewerId].includes(entityId));
        })
        .map((project) => ({
          entityType: 'project' as const,
          entityId: project.id,
          title: project.projectName,
          subtitle: `${project.customerName || '未关联客户'} / ${project.projectStage || '未标记阶段'}`,
          href: buildTeamExecutionEntityHref('project', project.id),
        })),
      (item) => `${item.entityType}-${item.entityId}`
    ).slice(0, 6);

    const relatedCustomers = uniqueItems(
      relatedProjects
        .map((project) => {
          const projectRow = scope.projectRows.find((item) => item.id === project.entityId);
          if (!projectRow?.customerId) {
            return null;
          }
          const customer = customerMap.get(projectRow.customerId);
          if (!customer) {
            return null;
          }
          return {
            entityType: 'customer' as const,
            entityId: customer.id,
            title: customer.customerName,
            subtitle: `${customer.region || '未设置区域'} / ${customer.status || '未设置状态'}`,
            href: buildTeamExecutionEntityHref('customer', customer.id),
          };
        })
        .filter((item): item is NonNullable<typeof item> => !!item),
      (item) => `${item.entityType}-${item.entityId}`
    ).slice(0, 6);

    const relatedSolutions = uniqueItems(
      Array.from(solutionMap.values())
        .filter((solution) => {
          if ([solution.authorId, solution.ownerId, solution.reviewerId].includes(entityId)) {
            return true;
          }
          const linkedProjects = relatedProjects.map((project) => project.entityId);
          return !!solution.projectId && linkedProjects.includes(solution.projectId);
        })
        .map((solution) => ({
          entityType: 'solution' as const,
          entityId: solution.id,
          title: solution.solutionName,
          subtitle: `${solution.solutionTypeName || '未设置类型'} / 版本 ${solution.version}`,
          href: buildTeamExecutionEntityHref('solution', solution.id),
        })),
      (item) => `${item.entityType}-${item.entityId}`
    ).slice(0, 6);

    return {
      filtersEcho: filters,
      entityType,
      entityId,
      title: user.realName,
      subtitle: `${user.roleName || '未分配角色'} / ${user.department || '未设置部门'}`,
      description: stat.reasons.join(' / '),
      statusLabel: stat.lowActivity ? '低活跃预警' : '执行画像',
      metrics: [
        { label: '待处理', value: String(stat.pendingCount) },
        { label: '逾期事项', value: String(stat.overdueCount) },
        { label: '高优事项', value: String(stat.highPriorityCount) },
        { label: '活跃项目', value: String(stat.activeProjectCount) },
      ],
      fields: [
        { label: '岗位', value: user.position || '未设置岗位' },
        { label: '区域', value: user.region || '未设置区域' },
        { label: '负载等级', value: stat.loadBucket },
        { label: '最近活跃', value: formatDate(stat.lastActivityAt, `近 ${filters.range} 无推进痕迹`) },
      ],
      sections: [
        { title: '相关项目', emptyText: '当前没有可展示的项目关系。', items: relatedProjects },
        { title: '相关客户', emptyText: '当前没有可展示的客户关系。', items: relatedCustomers },
        { title: '相关方案', emptyText: '当前没有可展示的方案关系。', items: relatedSolutions },
      ],
      actions: makeActions(entityType, entityId),
    };
  }

  if (entityType === 'project') {
    const project = scope.projectRows.find((item) => item.id === entityId);
    const stat = projectStatMap.get(entityId);
    if (!project || !stat) {
      return null;
    }

    const relatedPeople = uniqueItems(
      [
        ...(project.managerId ? [project.managerId] : []),
        ...(project.deliveryManagerId ? [project.deliveryManagerId] : []),
        ...(scope.memberIdsByProject.get(project.id) ? Array.from(scope.memberIdsByProject.get(project.id) as Set<number>) : []),
      ]
        .map((userId) => {
          const user = scope.userMap.get(userId);
          if (!user) {
            return null;
          }
          return {
            entityType: 'person' as const,
            entityId: userId,
            title: user.realName,
            subtitle: `${user.roleName || '未分配角色'} / ${user.department || '未设置部门'}`,
            href: buildTeamExecutionEntityHref('person', userId),
          };
        })
        .filter((item): item is NonNullable<typeof item> => !!item),
      (item) => `${item.entityType}-${item.entityId}`
    ).slice(0, 6);

    const relatedCustomer = project.customerId ? customerMap.get(project.customerId) : null;
    const relatedCustomerItems = relatedCustomer ? [{
      entityType: 'customer' as const,
      entityId: relatedCustomer.id,
      title: relatedCustomer.customerName,
      subtitle: `${relatedCustomer.region || '未设置区域'} / ${relatedCustomer.status || '未设置状态'}`,
      href: buildTeamExecutionEntityHref('customer', relatedCustomer.id),
    }] : [];

    const linkedSolutionIds = uniqueItems(
      [
        ...scope.solutionRows.filter((solution) => solution.projectId === entityId).map((solution) => solution.id),
        ...scope.solutionProjectRows.filter((item) => item.projectId === entityId).map((item) => item.solutionId),
      ],
      (id) => String(id)
    );

    const relatedSolutions = linkedSolutionIds
      .map((solutionId) => solutionMap.get(solutionId))
      .filter((item): item is NonNullable<typeof item> => !!item)
      .map((solution) => ({
        entityType: 'solution' as const,
        entityId: solution.id,
        title: solution.solutionName,
        subtitle: `${solution.solutionTypeName || '未设置类型'} / 版本 ${solution.version}`,
        href: buildTeamExecutionEntityHref('solution', solution.id),
      }))
      .slice(0, 6);

    return {
      filtersEcho: filters,
      entityType,
      entityId,
      title: project.projectName,
      subtitle: `${project.customerName || '未关联客户'} / ${project.projectStage || '未标记阶段'}`,
      description: stat.reasons.join(' / '),
      statusLabel: project.status || '未设置状态',
      metrics: [
        { label: '未完任务', value: String(stat.openTaskCount) },
        { label: '逾期 / 阻塞', value: String(stat.overdueTaskCount + stat.blockedTodoCount) },
        { label: '活跃参与', value: String(stat.activePeopleCount) },
        { label: '风险分', value: String(stat.riskScore) },
      ],
      fields: [
        { label: '优先级', value: project.priority || '未设置优先级' },
        { label: '最近推进', value: formatDate(stat.lastProgressAt, '未记录推进时间') },
        { label: '成员池', value: String(stat.memberCount) },
        { label: '过载成员', value: String(stat.overloadedPeopleCount) },
      ],
      sections: [
        { title: '相关人员', emptyText: '当前没有可展示的人员关系。', items: relatedPeople },
        { title: '关联客户', emptyText: '当前项目未关联客户。', items: relatedCustomerItems },
        { title: '关联方案', emptyText: '当前项目未关联方案。', items: relatedSolutions },
      ],
      actions: makeActions(entityType, entityId),
    };
  }

  if (entityType === 'customer') {
    const customer = customerMap.get(entityId);
    if (!customer) {
      return null;
    }

    const relatedProjects = scope.projectRows
      .filter((project) => project.customerId === entityId)
      .map((project) => ({
        entityType: 'project' as const,
        entityId: project.id,
        title: project.projectName,
        subtitle: `${project.projectStage || '未标记阶段'} / ${project.status || '未设置状态'}`,
        href: buildTeamExecutionEntityHref('project', project.id),
      }))
      .slice(0, 6);

    const projectIds = relatedProjects.map((project) => project.entityId);
    const relatedSolutions = uniqueItems(
      [
        ...scope.solutionRows.filter((solution) => solution.projectId && projectIds.includes(solution.projectId)).map((solution) => solution.id),
        ...scope.solutionProjectRows.filter((item) => projectIds.includes(item.projectId)).map((item) => item.solutionId),
      ],
      (id) => String(id)
    )
      .map((solutionId) => solutionMap.get(solutionId))
      .filter((item): item is NonNullable<typeof item> => !!item)
      .map((solution) => ({
        entityType: 'solution' as const,
        entityId: solution.id,
        title: solution.solutionName,
        subtitle: `${solution.solutionTypeName || '未设置类型'} / 版本 ${solution.version}`,
        href: buildTeamExecutionEntityHref('solution', solution.id),
      }))
      .slice(0, 6);

    const relatedPeople = uniqueItems(
      relatedProjects.flatMap((project) => {
        const projectRow = scope.projectRows.find((item) => item.id === project.entityId);
        if (!projectRow) {
          return [];
        }
        return [
          ...(projectRow.managerId ? [projectRow.managerId] : []),
          ...(projectRow.deliveryManagerId ? [projectRow.deliveryManagerId] : []),
          ...(scope.memberIdsByProject.get(projectRow.id) ? Array.from(scope.memberIdsByProject.get(projectRow.id) as Set<number>) : []),
        ];
      })
        .map((userId) => {
          const user = scope.userMap.get(userId);
          if (!user) {
            return null;
          }
          return {
            entityType: 'person' as const,
            entityId: userId,
            title: user.realName,
            subtitle: `${user.roleName || '未分配角色'} / ${user.department || '未设置部门'}`,
            href: buildTeamExecutionEntityHref('person', userId),
          };
        })
        .filter((item): item is NonNullable<typeof item> => !!item),
      (item) => `${item.entityType}-${item.entityId}`
    ).slice(0, 6);

    return {
      filtersEcho: filters,
      entityType,
      entityId,
      title: customer.customerName,
      subtitle: `${customer.customerTypeName || '未设置客户类型'} / ${customer.region || '未设置区域'}`,
      description: customer.contactName ? `当前主要联系人：${customer.contactName}` : '当前未设置主要联系人。',
      statusLabel: customer.status || '未设置状态',
      metrics: [
        { label: '当前项目数', value: String(customer.currentProjectCount ?? relatedProjects.length) },
        { label: '关联项目', value: String(relatedProjects.length) },
        { label: '关联方案', value: String(relatedSolutions.length) },
        { label: '关键人员', value: String(relatedPeople.length) },
      ],
      fields: [
        { label: '联系人', value: customer.contactName || '未设置联系人' },
        { label: '最近互动', value: formatDate(customer.lastInteractionTime, '未记录互动时间') },
        { label: '区域', value: customer.region || '未设置区域' },
        { label: '客户状态', value: customer.status || '未设置状态' },
      ],
      sections: [
        { title: '关联项目', emptyText: '当前客户暂无关联项目。', items: relatedProjects },
        { title: '关联方案', emptyText: '当前客户暂无关联方案。', items: relatedSolutions },
        { title: '关键协同人员', emptyText: '当前客户暂无关键协同人员。', items: relatedPeople },
      ],
      actions: makeActions(entityType, entityId),
    };
  }

  const solution = solutionMap.get(entityId);
  if (!solution) {
    return null;
  }

  const relatedProjectIds = uniqueItems(
    [
      ...(solution.projectId ? [solution.projectId] : []),
      ...scope.solutionProjectRows.filter((item) => item.solutionId === entityId).map((item) => item.projectId),
    ],
    (id) => String(id)
  );
  const relatedProjects = relatedProjectIds
    .map((projectId) => scope.projectRows.find((item) => item.id === projectId))
    .filter((item): item is NonNullable<typeof item> => !!item)
    .map((project) => ({
      entityType: 'project' as const,
      entityId: project.id,
      title: project.projectName,
      subtitle: `${project.customerName || '未关联客户'} / ${project.projectStage || '未标记阶段'}`,
      href: buildTeamExecutionEntityHref('project', project.id),
    }))
    .slice(0, 6);

  const relatedCustomers = uniqueItems(
    relatedProjects
      .map((project) => {
        const projectRow = scope.projectRows.find((item) => item.id === project.entityId);
        if (!projectRow?.customerId) {
          return null;
        }
        const customer = customerMap.get(projectRow.customerId);
        if (!customer) {
          return null;
        }
        return {
          entityType: 'customer' as const,
          entityId: customer.id,
          title: customer.customerName,
          subtitle: `${customer.region || '未设置区域'} / ${customer.status || '未设置状态'}`,
          href: buildTeamExecutionEntityHref('customer', customer.id),
        };
      })
      .filter((item): item is NonNullable<typeof item> => !!item),
    (item) => `${item.entityType}-${item.entityId}`
  ).slice(0, 6);

  const relatedPeople = uniqueItems(
    [solution.authorId, solution.ownerId, solution.reviewerId]
      .filter((value): value is number => !!value)
      .map((userId) => {
        const user = scope.userMap.get(userId);
        if (!user) {
          return null;
        }
        return {
          entityType: 'person' as const,
          entityId: userId,
          title: user.realName,
          subtitle: `${user.roleName || '未分配角色'} / ${user.department || '未设置部门'}`,
          href: buildTeamExecutionEntityHref('person', userId),
        };
      })
      .filter((item): item is NonNullable<typeof item> => !!item),
    (item) => `${item.entityType}-${item.entityId}`
  ).slice(0, 6);

  return {
    filtersEcho: filters,
    entityType,
    entityId,
    title: solution.solutionName,
    subtitle: `${solution.solutionTypeName || '未设置类型'} / 版本 ${solution.version}`,
    description: solution.description || '当前未填写方案描述。',
    statusLabel: solution.status || '未设置状态',
    metrics: [
      { label: '关联项目', value: String(relatedProjects.length) },
      { label: '关联客户', value: String(relatedCustomers.length) },
      { label: '相关人员', value: String(relatedPeople.length) },
      { label: '版本', value: solution.version },
    ],
    fields: [
      { label: '方案类型', value: solution.solutionTypeName || '未设置类型' },
      { label: '方案状态', value: solution.status || '未设置状态' },
      { label: '主项目', value: solution.projectId ? scope.projectRows.find((item) => item.id === solution.projectId)?.projectName || '未关联项目' : '未关联项目' },
      { label: '描述', value: solution.description || '未填写方案描述' },
    ],
    sections: [
      { title: '关联项目', emptyText: '当前方案暂无关联项目。', items: relatedProjects },
      { title: '关联客户', emptyText: '当前方案暂无关联客户。', items: relatedCustomers },
      { title: '相关人员', emptyText: '当前方案暂无相关人员。', items: relatedPeople },
    ],
    actions: makeActions(entityType, entityId),
  };
}