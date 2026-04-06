import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { customers, projects, solutions, users, todos, schedules } from '@/db/schema';
import { eq, or, like, and, isNull, sql, desc, gte, lte, between } from 'drizzle-orm';
import { successResponse, errorResponse } from '@/lib/api-response';
import { getProjectDisplayStatusLabel } from '@/lib/project-display';
import { buildProjectStatusFilter } from '@/lib/project-query-filters';

/**
 * 全局搜索 API
 * GET /api/search?q=keyword&type=all&status=all&priority=all&timeRange=all&startDate=&endDate=&userId=1
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const type = searchParams.get('type') || 'all';
    const status = searchParams.get('status') || 'all';
    const priority = searchParams.get('priority') || 'all';
    const timeRange = searchParams.get('timeRange') || 'all';
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    if (!query.trim()) {
      return successResponse({
        query: '',
        total: 0,
        results: {
          customers: [],
          projects: [],
          solutions: [],
          users: [],
          todos: [],
          schedules: [],
        },
      });
    }

    const searchTerm = `%${query.trim()}%`;
    const results: {
      customers: any[];
      projects: any[];
      solutions: any[];
      users: any[];
      todos: any[];
      schedules: any[];
    } = {
      customers: [],
      projects: [],
      solutions: [],
      users: [],
      todos: [],
      schedules: [],
    };

    // 时间范围计算
    const now = new Date();
    let timeCondition: any = null;
    
    if (timeRange !== 'all') {
      let startDate: Date | null = null;
      let endDate: Date | null = null;
      
      if (timeRange === 'custom' && startDateStr && endDateStr) {
        startDate = new Date(startDateStr);
        endDate = new Date(endDateStr);
      } else {
        switch (timeRange) {
          case 'today':
            startDate = new Date(now.setHours(0, 0, 0, 0));
            endDate = new Date(now.setHours(23, 59, 59, 999));
            break;
          case 'week':
            startDate = new Date(now.setDate(now.getDate() - 7));
            endDate = new Date();
            break;
          case 'month':
            startDate = new Date(now.setMonth(now.getMonth() - 1));
            endDate = new Date();
            break;
          case 'quarter':
            startDate = new Date(now.setMonth(now.getMonth() - 3));
            endDate = new Date();
            break;
          case 'year':
            startDate = new Date(now.setFullYear(now.getFullYear() - 1));
            endDate = new Date();
            break;
        }
      }
      
      if (startDate && endDate) {
        timeCondition = { startDate, endDate };
      }
    }

    // 搜索客户
    if (type === 'all' || type === 'customers') {
      const conditions: any[] = [
        isNull(customers.deletedAt),
        or(
          like(customers.customerName, searchTerm),
          like(customers.customerId, searchTerm),
          like(customers.address, searchTerm)
        ),
      ];

      // 状态过滤
      if (status !== 'all') {
        conditions.push(eq(customers.status, status));
      }

      const customerResults = await db
        .select({
          id: customers.id,
          name: customers.customerName,
          type: sql<string>`'customer'`,
          code: customers.customerId,
          status: customers.status,
          description: customers.address,
          createdAt: customers.createdAt,
        })
        .from(customers)
        .where(and(...conditions))
        .limit(limit);

      // 时间过滤（客户端）
      let filteredCustomers = customerResults;
      if (timeCondition && timeCondition.startDate && timeCondition.endDate) {
        filteredCustomers = customerResults.filter((c) => {
          if (!c.createdAt) return false;
          const createdDate = new Date(c.createdAt);
          return createdDate >= timeCondition.startDate! && createdDate <= timeCondition.endDate!;
        });
      }

      results.customers = filteredCustomers.map(c => ({
        ...c,
        title: c.name,
        subtitle: c.code,
        href: `/customers/${c.id}`,
        icon: 'users',
      }));
    }

    // 搜索项目
    if (type === 'all' || type === 'projects') {
      const conditions: any[] = [
        isNull(projects.deletedAt),
        or(
          like(projects.projectName, searchTerm),
          like(projects.projectCode, searchTerm),
          like(projects.description, searchTerm)
        ),
      ];

      // 状态过滤
      if (status !== 'all') {
        conditions.push(buildProjectStatusFilter(status));
      }

      // 优先级过滤
      if (priority !== 'all') {
        conditions.push(eq(projects.priority, priority));
      }

      const projectResults = await db
        .select({
          id: projects.id,
          name: projects.projectName,
          type: sql<string>`'project'`,
          code: projects.projectCode,
          projectStage: projects.projectStage,
          status: projects.status,
          priority: projects.priority,
          description: projects.description,
          createdAt: projects.createdAt,
        })
        .from(projects)
        .where(and(...conditions))
        .limit(limit);

      // 时间过滤
      let filteredProjects = projectResults;
      if (timeCondition && timeCondition.startDate && timeCondition.endDate) {
        filteredProjects = projectResults.filter((p) => {
          if (!p.createdAt) return false;
          const createdDate = new Date(p.createdAt);
          return createdDate >= timeCondition.startDate! && createdDate <= timeCondition.endDate!;
        });
      }

      results.projects = filteredProjects.map(p => ({
        ...p,
        title: p.name,
        subtitle: p.code,
        status: getProjectDisplayStatusLabel(p),
        href: `/projects/${p.id}`,
        icon: 'folder-kanban',
      }));
    }

    // 搜索解决方案
    if (type === 'all' || type === 'solutions') {
      const conditions: any[] = [
        isNull(solutions.deletedAt),
        or(
          like(solutions.solutionName, searchTerm),
          like(solutions.solutionCode, searchTerm),
          like(solutions.description, searchTerm)
        ),
      ];

      // 状态过滤
      if (status !== 'all') {
        conditions.push(eq(solutions.status, status));
      }

      const solutionResults = await db
        .select({
          id: solutions.id,
          name: solutions.solutionName,
          type: sql<string>`'solution'`,
          code: solutions.solutionCode,
          status: solutions.status,
          description: solutions.description,
          createdAt: solutions.createdAt,
        })
        .from(solutions)
        .where(and(...conditions))
        .limit(limit);

      // 时间过滤
      let filteredSolutions = solutionResults;
      if (timeCondition && timeCondition.startDate && timeCondition.endDate) {
        filteredSolutions = solutionResults.filter((s) => {
          if (!s.createdAt) return false;
          const createdDate = new Date(s.createdAt);
          return createdDate >= timeCondition.startDate! && createdDate <= timeCondition.endDate!;
        });
      }

      results.solutions = filteredSolutions.map(s => ({
        ...s,
        title: s.name,
        subtitle: s.code,
        href: `/solutions/${s.id}`,
        icon: 'file-text',
      }));
    }

    // 搜索用户
    if (type === 'all' || type === 'users') {
      const conditions: any[] = [
        isNull(users.deletedAt),
        or(
          like(users.realName, searchTerm),
          like(users.username, searchTerm),
          like(users.department, searchTerm)
        ),
      ];

      // 状态过滤
      if (status !== 'all') {
        conditions.push(eq(users.status, status));
      }

      const userResults = await db
        .select({
          id: users.id,
          name: users.realName,
          type: sql<string>`'user'`,
          code: users.username,
          status: users.status,
          description: users.department,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(and(...conditions))
        .limit(limit);

      results.users = userResults.map(u => ({
        ...u,
        title: u.name,
        subtitle: u.code,
        href: `/staff/${u.id}`,
        icon: 'user',
      }));
    }

    // 搜索待办事项
    if (type === 'all' || type === 'todos') {
      const conditions: any[] = [
        or(
          like(todos.title, searchTerm),
          like(todos.description, searchTerm),
          like(todos.relatedName, searchTerm)
        ),
      ];

      // 如果指定了用户ID，只搜索该用户的待办
      if (userId) {
        conditions.push(eq(todos.assigneeId, parseInt(userId)));
      }

      // 状态过滤
      if (status !== 'all') {
        conditions.push(eq(todos.todoStatus, status));
      }

      // 优先级过滤
      if (priority !== 'all') {
        conditions.push(eq(todos.priority, priority));
      }

      const todoResults = await db
        .select({
          id: todos.id,
          name: todos.title,
          type: sql<string>`'todo'`,
          status: todos.todoStatus,
          priority: todos.priority,
          dueDate: todos.dueDate,
          relatedType: todos.relatedType,
          relatedName: todos.relatedName,
          description: todos.description,
          createdAt: todos.createdAt,
        })
        .from(todos)
        .where(and(...conditions))
        .limit(limit);

      // 时间过滤
      let filteredTodos = todoResults;
      if (timeCondition && timeCondition.startDate && timeCondition.endDate) {
        filteredTodos = todoResults.filter((t) => {
          if (!t.dueDate) return false;
          const dueDate = new Date(t.dueDate);
          return dueDate >= timeCondition.startDate! && dueDate <= timeCondition.endDate!;
        });
      }

      results.todos = filteredTodos.map(t => ({
        ...t,
        title: t.name,
        subtitle: t.dueDate ? `截止: ${t.dueDate}` : '无截止日期',
        href: `/calendar?type=todo&id=${t.id}`,
        icon: 'check-square',
      }));
    }

    // 搜索日程
    if (type === 'all' || type === 'schedules') {
      const scheduleConditions: any[] = [
        or(
          like(schedules.title, searchTerm),
          like(schedules.description, searchTerm),
          like(schedules.location, searchTerm)
        ),
      ];

      // 如果指定了用户ID，只搜索该用户的日程
      if (userId) {
        scheduleConditions.push(eq(schedules.userId, parseInt(userId)));
      }

      // 状态过滤
      if (status !== 'all') {
        scheduleConditions.push(eq(schedules.scheduleStatus, status));
      }

      const scheduleResults = await db
        .select({
          id: schedules.id,
          name: schedules.title,
          type: sql<string>`'schedule'`,
          scheduleType: schedules.type,
          status: schedules.scheduleStatus,
          startDate: schedules.startDate,
          startTime: schedules.startTime,
          location: schedules.location,
          description: schedules.description,
          createdAt: schedules.createdAt,
        })
        .from(schedules)
        .where(and(...scheduleConditions))
        .limit(limit);

      // 时间过滤
      let filteredSchedules = scheduleResults;
      if (timeCondition && timeCondition.startDate && timeCondition.endDate) {
        filteredSchedules = scheduleResults.filter((s) => {
          if (!s.startDate) return false;
          const scheduleDate = new Date(s.startDate);
          return scheduleDate >= timeCondition.startDate! && scheduleDate <= timeCondition.endDate!;
        });
      }

      results.schedules = filteredSchedules.map(s => ({
        ...s,
        title: s.name,
        subtitle: s.startDate ? `${s.startDate}${s.startTime ? ` ${s.startTime}` : ''}` : '',
        href: `/calendar?type=schedule&id=${s.id}`,
        icon: 'calendar',
      }));
    }

    // 计算总结果数
    const total = 
      results.customers.length + 
      results.projects.length + 
      results.solutions.length + 
      results.users.length +
      results.todos.length +
      results.schedules.length;

    return successResponse({
      query,
      total,
      results,
      filters: {
        type,
        status,
        priority,
        timeRange,
      },
    });
  } catch (error) {
    console.error('Search error:', error);
    return errorResponse('INTERNAL_ERROR', '搜索失败');
  }
}
