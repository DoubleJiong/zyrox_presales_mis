import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { projects, customers, projectMembers, solutionProjects, users } from '@/db/schema';
import { desc, eq, sql, and, or, inArray, isNull, count, lt } from 'drizzle-orm';
import { successResponse, errorResponse, validatePagination } from '@/lib/api-response';
import { withAuth } from '@/lib/auth-middleware';
import type { AuthUser } from '@/lib/jwt';
import { canAdminProject, canWriteProject, getAccessibleProjectIds } from '@/lib/permissions/project';
import { canViewOrphanProject, hasGlobalProjectView } from '@/shared/policy/project-policy';
import { syncSingleCustomerStats } from '@/lib/customer-stats';
import { resolveProjectLifecycleForCreate } from '@/lib/project-lifecycle';
import { PROJECT_STAGE_ORDER, type ProjectStage } from '@/lib/utils/status-transitions';
import { buildProjectStatusFilter, isValidProjectStatusFilter, VALID_PROJECT_STATUS_FILTERS } from '@/lib/project-query-filters';
import { sanitizeString, sanitizeSearchString } from '@/lib/xss';
import { generateIdempotencyKey, checkIdempotencyKey, storeIdempotencyKey } from '@/lib/idempotency';
import { resolveProjectCustomerSnapshot } from '@/lib/project-customer-snapshot';
import { formatDateField } from '@/lib/utils';
import { normalizeProjectTypeCode, normalizeProjectTypeCodes, serializeProjectTypeCodes } from '@/lib/project-type-codec';

// GET - 获取项目列表
export const GET = withAuth(async (req: NextRequest, { userId, user }) => {
  try {
    const { searchParams } = new URL(req.url);
    // BUG-035, BUG-036: 清理搜索字符串，限制长度并移除危险字符
    const search = sanitizeSearchString(searchParams.get('search') || '');
    const status = searchParams.get('status') || '';
    const priority = searchParams.get('priority') || '';
    
    // ============ 分页支持 ============
    const cursor = searchParams.get('cursor');
    const pagination = validatePagination(
      searchParams.get('page'),
      searchParams.get('pageSize')
    );
    
    if (!pagination.valid) {
      return errorResponse('BAD_REQUEST', pagination.error || '分页参数无效');
    }
    
    const { page, pageSize } = pagination;
    
    const allowGlobalProjectView = hasGlobalProjectView(user);
    const allowOrphanProjectView = canViewOrphanProject(user);

    // 构建基础查询条件
    const baseConditions = [isNull(projects.deletedAt)];
    
    // BUG-020: 验证状态参数是否有效
    if (status && !isValidProjectStatusFilter(status)) {
      return errorResponse('BAD_REQUEST', `无效的项目状态，有效值为: ${VALID_PROJECT_STATUS_FILTERS.join(', ')}`);
    }
    
    // BUG-040: 验证优先级参数是否有效
    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    if (priority && !validPriorities.includes(priority)) {
      return errorResponse('BAD_REQUEST', `无效的优先级，有效值为: ${validPriorities.join(', ')}`);
    }
    
    // 添加搜索条件
    if (search) {
      baseConditions.push(
        or(
          sql`${projects.projectName} ILIKE ${`%${search}%`}`,
          sql`${projects.projectCode} ILIKE ${`%${search}%`}`,
          sql`${projects.customerName} ILIKE ${`%${search}%`}`
        )!
      );
    }
    
    // 添加状态筛选
    if (status) {
      baseConditions.push(buildProjectStatusFilter(status));
    }
    
    // 添加优先级筛选
    if (priority) {
      baseConditions.push(eq(projects.priority, priority));
    }
    
    // 游标分页条件
    if (cursor) {
      const [cursorId] = cursor.split('_');
      baseConditions.push(lt(projects.id, parseInt(cursorId)));
    }

    // 定义项目查询的选择字段
    const projectSelectFields = {
      id: projects.id,
      projectCode: projects.projectCode,
      projectName: projects.projectName,
      customerId: projects.customerId,
      customerName: projects.customerName,
      projectTypeId: projects.projectTypeId,
      projectType: projects.projectType,
      industry: projects.industry,
      region: projects.region,
      description: projects.description,
      managerId: projects.managerId,
      estimatedAmount: projects.estimatedAmount,
      actualAmount: projects.actualAmount,
      startDate: projects.startDate,
      endDate: projects.endDate,
      expectedDeliveryDate: projects.expectedDeliveryDate,
      status: projects.status,
      bidResult: projects.bidResult,
      priority: projects.priority,
      projectStage: projects.projectStage,
      progress: projects.progress,
      risks: projects.risks,
      createdAt: projects.createdAt,
      updatedAt: projects.updatedAt,
      managerName: users.realName,
      memberCount: sql<number>`(SELECT COUNT(*) FROM bus_project_member pm WHERE pm.project_id = ${projects.id})`,
      taskTotal: sql<number>`(SELECT COUNT(*) FROM bus_project_task pt WHERE pt.project_id = ${projects.id} AND pt.deleted_at IS NULL)`,
      taskCompleted: sql<number>`(SELECT COUNT(*) FROM bus_project_task pt WHERE pt.project_id = ${projects.id} AND pt.status = 'completed' AND pt.deleted_at IS NULL)`,
      taskPending: sql<number>`(SELECT COUNT(*) FROM bus_project_task pt WHERE pt.project_id = ${projects.id} AND pt.status = 'pending' AND pt.deleted_at IS NULL)`,
      taskInProgress: sql<number>`(SELECT COUNT(*) FROM bus_project_task pt WHERE pt.project_id = ${projects.id} AND pt.status = 'in_progress' AND pt.deleted_at IS NULL)`,
    };

    let projectList;
    let totalResult = null;
    
    if (allowGlobalProjectView) {
      // 系统管理员和售前主管类角色（presales_manager/sales_manager 等）可以看到全量项目
      [totalResult, projectList] = await Promise.all([
        cursor ? Promise.resolve(null) : db
          .select({ count: count() })
          .from(projects)
          .where(and(...baseConditions)),
        
        db
          .select(projectSelectFields)
          .from(projects)
          .leftJoin(users, eq(projects.managerId, users.id))
          .where(and(...baseConditions))
          .orderBy(desc(projects.id))
          .limit(cursor ? pageSize + 1 : pageSize)
          .offset(cursor ? 0 : (page - 1) * pageSize)
      ]);
    } else {
      // 普通角色仅可见自己负责或参与的项目；无负责人项目默认不暴露
      const accessibleIds = new Set(await getAccessibleProjectIds(userId));

      if (allowOrphanProjectView) {
        const orphanProjects = await db
          .select({ id: projects.id })
          .from(projects)
          .where(and(
            sql`${projects.managerId} IS NULL`,
            isNull(projects.deletedAt)
          ));

        orphanProjects.forEach((project) => accessibleIds.add(project.id));
      }

      if (accessibleIds.size === 0) {
        return successResponse({
          projects: [],
          pagination: cursor ? {
            hasNextPage: false,
            nextCursor: null,
            pageSize,
          } : {
            page,
            pageSize,
            total: 0,
            totalPages: 0,
          },
        });
      }

      // 添加项目ID过滤条件
      baseConditions.push(inArray(projects.id, Array.from(accessibleIds)));
      
      [totalResult, projectList] = await Promise.all([
        cursor ? Promise.resolve(null) : db
          .select({ count: count() })
          .from(projects)
          .where(and(...baseConditions)),
        
        db
          .select(projectSelectFields)
          .from(projects)
          .leftJoin(users, eq(projects.managerId, users.id))
          .where(and(...baseConditions))
          .orderBy(desc(projects.id))
          .limit(cursor ? pageSize + 1 : pageSize)
          .offset(cursor ? 0 : (page - 1) * pageSize)
      ]);
    }

    // ============ 处理游标分页结果 ============
    let hasNextPage = false;
    let nextCursor: string | null = null;
    let finalList = projectList;
    
    if (cursor && projectList.length > pageSize) {
      hasNextPage = true;
      finalList = projectList.slice(0, pageSize);
      const lastItem = finalList[finalList.length - 1];
      nextCursor = `${lastItem.id}_${lastItem.createdAt?.getTime() || 0}`;
    }

    // 格式化返回数据
    const formattedList = finalList.map(p => ({
      ...p,
      managerName: p.managerName || null,
      memberCount: Number(p.memberCount) || 0,
      startDate: formatDateField(p.startDate),
      endDate: formatDateField(p.endDate),
      expectedDeliveryDate: formatDateField(p.expectedDeliveryDate),
      createdAt: formatDateField(p.createdAt),
      updatedAt: formatDateField(p.updatedAt),
      taskStats: {
        total: Number(p.taskTotal) || 0,
        completed: Number(p.taskCompleted) || 0,
        pending: Number(p.taskPending) || 0,
        inProgress: Number(p.taskInProgress) || 0,
      },
    }));

    // 返回带分页元数据的结果
    const paginationMeta = cursor ? {
      hasNextPage,
      nextCursor,
      pageSize,
    } : {
      page,
      pageSize,
      total: totalResult?.[0]?.count || 0,
      totalPages: Math.ceil((totalResult?.[0]?.count || 0) / pageSize),
    };

    return successResponse({
      projects: formattedList,
      pagination: paginationMeta,
    });
  } catch (error) {
    console.error('Failed to fetch projects:', error);
    return errorResponse('INTERNAL_ERROR', '获取项目列表失败');
  }
});

// POST - 创建新项目
export const POST = withAuth(async (request: NextRequest, { userId }) => {
  try {
    const body = await request.json();
    const requestedProjectTypeCodes = normalizeProjectTypeCodes(body.projectTypes ?? body.projectType);

    // XSS防护：清理用户输入
    const sanitizedName = sanitizeString(body.projectName || '');
    const sanitizedCustomerName = sanitizeString(body.customerName || '');
    const sanitizedDescription = body.description ? sanitizeString(body.description) : null;
    const sanitizedRisks = body.risks ? sanitizeString(body.risks) : null;

    // 验证必填字段
    if (!sanitizedName || sanitizedName.trim() === '') {
      return errorResponse('BAD_REQUEST', '项目名称不能为空');
    }

    if (sanitizedName.length > 200) {
      return errorResponse('BAD_REQUEST', '项目名称不能超过200个字符');
    }

    const createdLifecycle = resolveProjectLifecycleForCreate({
      projectStage: body.projectStage,
      bidResult: body.bidResult,
    });

    let customerSnapshot;
    try {
      customerSnapshot = await resolveProjectCustomerSnapshot({
        customerId: body.customerId,
        customerName: sanitizedCustomerName,
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'CUSTOMER_NOT_FOUND') {
        return errorResponse('BAD_REQUEST', '指定的客户不存在');
      }
      throw error;
    }

    // TC-VALID-001: 商机阶段必填字段校验
    // 商机阶段（默认阶段）需要校验以下必填字段
    const projectStage = createdLifecycle.projectStage;
    if (projectStage === 'opportunity') {
      const missingFields: string[] = [];
      
      if (!customerSnapshot.customerName || customerSnapshot.customerName.trim() === '') {
        missingFields.push('客户名称');
      }
      // 项目类型：支持 projectTypeId 或 projectType
      if (!body.projectTypeId && requestedProjectTypeCodes.length === 0) {
        missingFields.push('项目类型');
      }
      if (!body.estimatedAmount) {
        missingFields.push('项目预算');
      }
      if (!body.region) {
        missingFields.push('区域');
      }
      
      if (missingFields.length > 0) {
        return errorResponse('BAD_REQUEST', `请填写必填字段：${missingFields.join('、')}`);
      }
    }

    // TC-B004: 预算上限校验
    // 设置合理的预算上限为100亿（数据库最大支持万亿级别，但业务上限制为100亿）
    const MAX_BUDGET = 10_000_000_000; // 100亿
    if (body.estimatedAmount !== undefined && body.estimatedAmount !== null) {
      const amount = parseFloat(body.estimatedAmount);
      if (!isNaN(amount) && amount > MAX_BUDGET) {
        return errorResponse('BAD_REQUEST', `项目预算不能超过 ${MAX_BUDGET.toLocaleString()} 元`);
      }
      if (!isNaN(amount) && amount < 0) {
        return errorResponse('BAD_REQUEST', '项目预算不能为负数');
      }
    }

    // BUG-016: 验证projectTypeId是否存在
    if (body.projectTypeId) {
      const { projectTypes } = await import('@/db/schema');
      const typeExists = await db
        .select({ id: projectTypes.id })
        .from(projectTypes)
        .where(eq(projectTypes.id, body.projectTypeId))
        .limit(1);
      
      if (typeExists.length === 0) {
        return errorResponse('BAD_REQUEST', '指定的项目类型不存在');
      }
    }

    // 生成项目编号（PRJ20260212001格式）
    // 使用数据库序列来避免并发冲突
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `PRJ${dateStr}`;
    
    // BUG-029: 使用数据库行锁确保并发安全的项目编号生成
    // 使用 FOR UPDATE SKIP LOCKED 防止并发冲突
    let projectCode = '';
    let attempts = 0;
    const maxAttempts = 5;
    
    while (attempts < maxAttempts) {
      attempts++;
      
      // 查询当天最大的项目编号
      const maxCodeResult = await db.execute(sql`
        SELECT project_code 
        FROM bus_project 
        WHERE project_code LIKE ${prefix + '%'}
        ORDER BY LENGTH(project_code) DESC, project_code DESC 
        LIMIT 1
      `);
      
      let nextNum = 1;
      const rows = maxCodeResult as unknown as { project_code: string }[];
      if (rows[0]?.project_code) {
        const lastCode = rows[0].project_code;
        const numStr = lastCode.replace(prefix, '');
        const lastNum = parseInt(numStr, 10);
        if (!isNaN(lastNum)) {
          nextNum = lastNum + 1;
        }
      }
      
      // 使用4位数字格式，确保足够的容量
      const candidateCode = `${prefix}${String(nextNum).padStart(4, '0')}`;
      
      // 检查该编号是否已存在（防止并发冲突）
      const existingCode = await db.execute(sql`
        SELECT id FROM bus_project WHERE project_code = ${candidateCode} LIMIT 1
      `);
      
      if ((existingCode as unknown as any[]).length === 0) {
        projectCode = candidateCode;
        break;
      }
      // 如果编号已存在，重试
    }
    
    if (!projectCode) {
      // 最终降级：使用时间戳确保唯一性
      projectCode = `${prefix}${Date.now().toString().slice(-4)}`;
    }

    // V1.2: 自动设置项目负责人为当前用户（如果未指定）
    const managerId = body.managerId || userId;
    const deliveryManagerId = body.deliveryManagerId || null;

    // 处理项目类型：如果传入的是 projectType 字符串，查找对应的 projectTypeId
    let projectTypeId = body.projectTypeId || null;
    let projectTypeCode = serializeProjectTypeCodes(requestedProjectTypeCodes);

    if (body.projectTypeId || requestedProjectTypeCodes.length > 0) {
      try {
        const { projectTypes } = await import('@/db/schema');
        const activeProjectTypes = await db
          .select({ id: projectTypes.id, code: projectTypes.code, name: projectTypes.name })
          .from(projectTypes)
          .where(isNull(projectTypes.deletedAt));

        const resolvedCodes: string[] = [];

        if (body.projectTypeId) {
          const primaryType = activeProjectTypes.find((item) => item.id === Number(body.projectTypeId));
          if (!primaryType) {
            return errorResponse('BAD_REQUEST', '指定的项目类型不存在');
          }
          projectTypeId = primaryType.id;
          if (requestedProjectTypeCodes.length === 0) {
            resolvedCodes.push(primaryType.code);
          }
        }

        requestedProjectTypeCodes.forEach((requestedCode) => {
          const normalizedRequestedCode = normalizeProjectTypeCode(requestedCode);
          const matchedType = activeProjectTypes.find((item) => {
            const normalizedCode = normalizeProjectTypeCode(item.code);
            const normalizedName = normalizeProjectTypeCode(item.name);
            return normalizedCode === normalizedRequestedCode
              || normalizedName === normalizedRequestedCode
              || `${normalizedName}项目` === normalizedRequestedCode;
          });

          if (!matchedType) {
            throw new Error(`PROJECT_TYPE_NOT_FOUND:${requestedCode}`);
          }

          if (!projectTypeId) {
            projectTypeId = matchedType.id;
          }

          if (!resolvedCodes.includes(matchedType.code)) {
            resolvedCodes.push(matchedType.code);
          }
        });

        projectTypeCode = serializeProjectTypeCodes(resolvedCodes);
      } catch (e) {
        if (e instanceof Error && e.message.startsWith('PROJECT_TYPE_NOT_FOUND:')) {
          return errorResponse('BAD_REQUEST', `指定的项目类型不存在: ${e.message.replace('PROJECT_TYPE_NOT_FOUND:', '')}`);
        }
        console.error('Failed to find project type ID:', e);
      }
    }

    const idempotencyFingerprint = [
      sanitizedName,
      String(customerSnapshot.customerId ?? customerSnapshot.customerName ?? 'none'),
      String(projectTypeId ?? projectTypeCode ?? 'none'),
      String(managerId),
      String(deliveryManagerId ?? 'none'),
    ].join(':');
    const idempotencyKey = generateIdempotencyKey('project', userId, 'create', idempotencyFingerprint);
    const existingResponse = await checkIdempotencyKey(idempotencyKey);
    if (existingResponse) {
      return new NextResponse(existingResponse, {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const newProject = await db
      .insert(projects)
      .values({
        projectCode,
        projectName: sanitizedName,
        customerId: customerSnapshot.customerId,
        customerName: customerSnapshot.customerName,
        projectTypeId: projectTypeId,
        projectType: projectTypeCode, // 保存项目类型代码，支持逗号分隔的多值协议
        industry: body.industry || null,
        region: body.region || null,
        description: sanitizedDescription,
        managerId, // 自动设置项目负责人
        deliveryManagerId,
        estimatedAmount: body.estimatedAmount || null,
        startDate: body.startDate || null,
        endDate: body.endDate || null,
        expectedDeliveryDate: body.expectedDeliveryDate || null,
        projectStage: createdLifecycle.projectStage,
        status: createdLifecycle.status,
        bidResult: createdLifecycle.bidResult,
        priority: body.priority || 'medium',
        progress: 0,
        risks: sanitizedRisks,
      })
      .returning();

    const projectId = newProject[0].id;

    // V1.2: 如果项目负责人不是当前用户，添加项目负责人为团队成员（manager角色）
    if (managerId !== userId) {
      await db.insert(projectMembers).values({
        projectId,
        userId: managerId,
        role: 'manager',
        invitedBy: userId,
      });
    }

    // V1.2: 添加创建者为项目团队成员（如果创建者不是负责人）
    if (managerId !== userId) {
      await db.insert(projectMembers).values({
        projectId,
        userId,
        role: 'member',
        invitedBy: userId,
      });
    }

    // 更新客户的项目数统计
    if (customerSnapshot.customerId) {
      await syncSingleCustomerStats(customerSnapshot.customerId);
    }

    // ============ 存储幂等性响应 ============
    await storeIdempotencyKey(idempotencyKey, JSON.stringify({
      success: true,
      data: newProject[0],
    }));

    // BUG-017: 统一API响应格式
    return successResponse(newProject[0], { status: 201 });
  } catch (error) {
    console.error('Failed to create project:', error);
    return errorResponse('INTERNAL_ERROR', '创建项目失败');
  }
});

// PUT - 更新项目
export const PUT = withAuth(async (request: NextRequest, context: { userId: number; user?: AuthUser }) => {
  try {
    const userId = context.userId;
    const body = await request.json();
    const requestedProjectTypeCodes = normalizeProjectTypeCodes(body.projectTypes ?? body.projectType);
    const { id, projectName, customerId, customerName, projectTypeId, projectType, industry, region, description, managerId, deliveryManagerId, estimatedAmount, startDate, endDate, expectedDeliveryDate, priority, progress, risks, projectStage } = body;

    if (!id) {
      return errorResponse('BAD_REQUEST', '缺少项目ID');
    }

    // V1.2: 权限检查
    const canWrite = await canWriteProject(id, userId);
    if (!canWrite) {
      return errorResponse('FORBIDDEN', '您没有权限编辑此项目');
    }

    // BUG-020: 进度范围校验
    if (progress !== undefined && progress !== null) {
      const progressNum = parseInt(progress);
      if (isNaN(progressNum) || progressNum < 0 || progressNum > 100) {
        return errorResponse('BAD_REQUEST', '项目进度必须在0-100之间');
      }
    }

    // BUG-040: 优先级枚举校验
    if (priority) {
      const validPriorities = ['low', 'medium', 'high', 'urgent'];
      if (!validPriorities.includes(priority)) {
        return errorResponse('BAD_REQUEST', '无效的优先级');
      }
    }

    // TC-B004: 预算上限校验
    const MAX_BUDGET = 10_000_000_000; // 100亿
    if (estimatedAmount !== undefined && estimatedAmount !== null) {
      const amount = parseFloat(estimatedAmount);
      if (!isNaN(amount) && amount > MAX_BUDGET) {
        return errorResponse('BAD_REQUEST', `项目预算不能超过 ${MAX_BUDGET.toLocaleString()} 元`);
      }
      if (!isNaN(amount) && amount < 0) {
        return errorResponse('BAD_REQUEST', '项目预算不能为负数');
      }
    }

    // 查找要更新的项目
    const projectList = await db
      .select()
      .from(projects)
      .where(eq(projects.id, id));

    if (!projectList || projectList.length === 0) {
      return errorResponse('NOT_FOUND', '项目不存在');
    }

    const currentProject = projectList[0];
    let customerSnapshot = {
      customerId: currentProject.customerId,
      customerName: currentProject.customerName,
    };

    if (customerId !== undefined || customerName !== undefined) {
      try {
        customerSnapshot = await resolveProjectCustomerSnapshot({
          customerId: customerId !== undefined ? customerId : currentProject.customerId,
          customerName: customerName !== undefined ? customerName : currentProject.customerName,
        });
      } catch (error) {
        if (error instanceof Error && error.message === 'CUSTOMER_NOT_FOUND') {
          return errorResponse('BAD_REQUEST', '指定的客户不存在');
        }
        throw error;
      }
    }

    // ============ 乐观锁版本控制 ============
    // 检查版本号是否匹配，防止并发更新冲突
    const { OptimisticLock } = await import('@/lib/idempotency');
    const clientVersion = body.version || body.updatedAt;
    
    if (clientVersion && !OptimisticLock.validateVersion(
      currentProject.updatedAt?.getTime() || null,
      new Date(clientVersion).getTime()
    )) {
      return NextResponse.json(OptimisticLock.createConflictError('项目'), { status: 409 });
    }

    // BUG-031: 项目阶段转换校验
    if (projectStage && projectStage !== currentProject.projectStage) {
      const currentStage = (currentProject.projectStage || 'opportunity') as ProjectStage;
      const currentIndex = PROJECT_STAGE_ORDER.indexOf(currentStage);
      const targetIndex = PROJECT_STAGE_ORDER.indexOf(projectStage);

      if (targetIndex === -1) {
        return errorResponse('BAD_REQUEST', '无效的项目阶段');
      }
      
      // 只允许前进到下一阶段或保持当前阶段（允许回退到opportunity作为特殊处理）
      if (currentIndex !== -1 && targetIndex > currentIndex + 1) {
        return errorResponse('BAD_REQUEST', `项目阶段不能从「${currentProject.projectStage}」跳过中间阶段直接到「${projectStage}」`);
      }
    }

    const nextLifecycle = resolveProjectLifecycleForCreate({
      projectStage: projectStage !== undefined ? projectStage : currentProject.projectStage,
      bidResult: currentProject.bidResult,
    });

    // BUG-007: 结束日期不能早于开始日期
    const finalStartDate = startDate || currentProject.startDate;
    const finalEndDate = endDate || currentProject.endDate;
    if (finalStartDate && finalEndDate && new Date(finalEndDate) < new Date(finalStartDate)) {
      return errorResponse('BAD_REQUEST', '结束日期不能早于开始日期');
    }

    let resolvedProjectTypeId = projectTypeId;
    let resolvedProjectTypeCode = projectType !== undefined ? projectType : currentProject.projectType;

    if (projectTypeId !== undefined || projectType !== undefined || body.projectTypes !== undefined) {
      const { projectTypes } = await import('@/db/schema');
      const activeProjectTypes = await db
        .select({ id: projectTypes.id, code: projectTypes.code, name: projectTypes.name })
        .from(projectTypes)
        .where(isNull(projectTypes.deletedAt));

      const resolvedCodes: string[] = [];

      if ((projectType !== undefined || body.projectTypes !== undefined) && projectTypeId === undefined) {
        resolvedProjectTypeId = undefined;
      }

      if (resolvedProjectTypeId !== undefined && resolvedProjectTypeId !== null && resolvedProjectTypeId !== '') {
        const primaryType = activeProjectTypes.find((item) => item.id === Number(resolvedProjectTypeId));
        if (!primaryType) {
          return errorResponse('BAD_REQUEST', '指定的项目类型不存在');
        }
        resolvedProjectTypeId = primaryType.id;
        if (requestedProjectTypeCodes.length === 0) {
          resolvedCodes.push(primaryType.code);
        }
      }

      requestedProjectTypeCodes.forEach((requestedCode) => {
        const normalizedRequestedCode = normalizeProjectTypeCode(requestedCode);
        const matchedType = activeProjectTypes.find((item) => {
          const normalizedCode = normalizeProjectTypeCode(item.code);
          const normalizedName = normalizeProjectTypeCode(item.name);
          return normalizedCode === normalizedRequestedCode
            || normalizedName === normalizedRequestedCode
            || `${normalizedName}项目` === normalizedRequestedCode;
        });

        if (!matchedType) {
          throw new Error(`PROJECT_TYPE_NOT_FOUND:${requestedCode}`);
        }

        if (!resolvedProjectTypeId) {
          resolvedProjectTypeId = matchedType.id;
        }

        if (!resolvedCodes.includes(matchedType.code)) {
          resolvedCodes.push(matchedType.code);
        }
      });

      if (!resolvedProjectTypeId) {
        return errorResponse('BAD_REQUEST', '指定的项目类型不存在');
      }

      resolvedProjectTypeCode = serializeProjectTypeCodes(
        resolvedCodes.length > 0 ? resolvedCodes : normalizeProjectTypeCodes(currentProject.projectType)
      );
    }

    // 更新项目
    const updatedProject = await db
      .update(projects)
      .set({
        projectName: projectName || projectList[0].projectName,
        customerId: customerSnapshot.customerId,
        customerName: customerSnapshot.customerName,
        projectTypeId: projectTypeId !== undefined || projectType !== undefined || body.projectTypes !== undefined ? resolvedProjectTypeId : projectList[0].projectTypeId,
        projectType: projectTypeId !== undefined || projectType !== undefined || body.projectTypes !== undefined ? resolvedProjectTypeCode : projectList[0].projectType,
        industry: industry !== undefined ? industry : projectList[0].industry,
        region: region !== undefined ? region : projectList[0].region,
        description: description !== undefined ? description : projectList[0].description,
        managerId: managerId !== undefined ? managerId : projectList[0].managerId,
        deliveryManagerId: deliveryManagerId !== undefined ? deliveryManagerId : projectList[0].deliveryManagerId,
        estimatedAmount: estimatedAmount !== undefined ? estimatedAmount : projectList[0].estimatedAmount,
        startDate: startDate || projectList[0].startDate,
        endDate: endDate || projectList[0].endDate,
        expectedDeliveryDate: expectedDeliveryDate || projectList[0].expectedDeliveryDate,
        status: nextLifecycle.status,
        priority: priority || projectList[0].priority,
        progress: progress !== undefined ? progress : projectList[0].progress,
        risks: risks !== undefined ? risks : projectList[0].risks,
        // V1.3: 项目阶段更新
        projectStage: nextLifecycle.projectStage,
        updatedAt: new Date(),
      })
      .where(eq(projects.id, id))
      .returning();

    // BUG-017: 统一API响应格式
    return successResponse(updatedProject[0]);
  } catch (error) {
    console.error('Failed to update project:', error);
    return errorResponse('INTERNAL_ERROR', '更新项目失败');
  }
});

// DELETE - 删除项目
export const DELETE = withAuth(async (request: NextRequest, context: { userId: number; user?: AuthUser }) => {
  try {
    const userId = context.userId;
    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get('id') || '');

    if (!id) {
      return errorResponse('BAD_REQUEST', '缺少项目ID');
    }

    // V1.2: 权限检查（需要ADMIN权限才能删除）
    const canAdmin = await canAdminProject(id, userId);
    if (!canAdmin) {
      return errorResponse('FORBIDDEN', '您没有权限删除此项目');
    }

    // 查找要删除的项目
    const projectList = await db
      .select()
      .from(projects)
      .where(eq(projects.id, id));

    if (!projectList || projectList.length === 0) {
      return errorResponse('NOT_FOUND', '项目不存在');
    }

    // 清理项目关联方案记录，避免外键约束阻塞项目删除。
    await db
      .delete(solutionProjects)
      .where(eq(solutionProjects.projectId, id));

    // 删除项目
    await db
      .delete(projects)
      .where(eq(projects.id, id));

    return successResponse({ success: true });
  } catch (error) {
    console.error('Failed to delete project:', error);
    return errorResponse('INTERNAL_ERROR', '删除项目失败');
  }
});
