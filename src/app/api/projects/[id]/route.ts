import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { projects, users, tasks, projectBudgetHistory, projectBiddings } from '@/db/schema';
import { eq, sql, and, isNull, or } from 'drizzle-orm';
import { withAuth } from '@/lib/auth-middleware';
import { successResponse, errorResponse } from '@/lib/api-response';
import { canReadProject, canWriteProject, canAdminProject } from '@/lib/permissions/project';
import { syncSingleCustomerStats } from '@/lib/customer-stats';
import { buildProjectResultSyncPayload, resolveProjectBidResult } from '@/lib/project-results';
import { sanitizeString, containsHtml } from '@/lib/xss';
import { resolveProjectCustomerSnapshot } from '@/lib/project-customer-snapshot';
import { formatDateField } from '@/lib/utils';
import { isGovernedProjectStage } from '@/modules/project/project-stage-policy';
import { normalizeProjectTypeCode, normalizeProjectTypeCodes, serializeProjectTypeCodes } from '@/lib/project-type-codec';

// GET - 获取项目详情
export const GET = withAuth(async (
  request: NextRequest,
  context: { userId: number; params?: Record<string, string> }
) => {
  try {
    const idParam = context.params?.id || '0';
    const projectId = parseInt(idParam);
    
    // BUG-016: 处理非数字ID或projectCode的情况
    if (isNaN(projectId) || projectId <= 0) {
      return errorResponse('BAD_REQUEST', '无效的项目ID');
    }

    // 权限检查
    const canRead = await canReadProject(projectId, context.userId);
    if (!canRead) {
      return errorResponse('FORBIDDEN', '您没有权限查看此项目');
    }

    const canWrite = await canWriteProject(projectId, context.userId);
    const canAdmin = await canAdminProject(projectId, context.userId);

    const projectList = await db
      .select({
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
        deliveryManagerId: projects.deliveryManagerId,
        projectStage: projects.projectStage,
        estimatedAmount: projects.estimatedAmount,
        actualAmount: projects.actualAmount,
        startDate: projects.startDate,
        endDate: projects.endDate,
        expectedDeliveryDate: projects.expectedDeliveryDate,
        status: projects.status,
        priority: projects.priority,
        progress: projects.progress,
        risks: projects.risks,
        bidResult: projects.bidResult,
        winCompetitor: projects.winCompetitor,
        loseReason: projects.loseReason,
        contractNumber: projects.contractNumber,
        lessonsLearned: projects.lessonsLearned,
        expectedBiddingDate: projects.expectedBiddingDate,
        estimatedDuration: projects.estimatedDuration,
        urgencyLevel: projects.urgencyLevel,
        previousStatus: projects.previousStatus,
        holdReason: projects.holdReason,
        cancelReason: projects.cancelReason,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
      })
      .from(projects)
      .where(and(
        eq(projects.id, projectId),
        isNull(projects.deletedAt)
      ))
      .limit(1);

    if (projectList.length === 0) {
      return errorResponse('NOT_FOUND', '项目不存在');
    }

    // 格式化日期字段
    const project = projectList[0];
    const formattedProject = {
      ...project,
      projectTypes: normalizeProjectTypeCodes(project.projectType),
      startDate: formatDateField(project.startDate),
      endDate: formatDateField(project.endDate),
      expectedDeliveryDate: formatDateField(project.expectedDeliveryDate),
      expectedBiddingDate: formatDateField(project.expectedBiddingDate),
      createdAt: formatDateField(project.createdAt),
      updatedAt: formatDateField(project.updatedAt),
      permissions: {
        canRead,
        canWrite,
        canAdmin,
      },
    };

    return successResponse(formattedProject);
  } catch (error) {
    console.error('Failed to fetch project detail:', error);
    return errorResponse('INTERNAL_ERROR', '获取项目详情失败');
  }
});

// PUT - 更新项目
export const PUT = withAuth(async (
  request: NextRequest,
  context: { userId: number; params?: Record<string, string> }
) => {
  try {
    const body = await request.json();
    const projectId = parseInt(context.params?.id || '0');

    // 权限检查
    const canWrite = await canWriteProject(projectId, context.userId);
    if (!canWrite) {
      return errorResponse('FORBIDDEN', '您没有权限编辑此项目');
    }

    // 获取原项目信息
    const [originalProject] = await db
      .select()
      .from(projects)
      .where(and(
        eq(projects.id, projectId),
        isNull(projects.deletedAt)
      ))
      .limit(1);

    if (!originalProject) {
      return errorResponse('NOT_FOUND', '项目不存在');
    }

    // ============ BUG-001: 已取消状态不可变更 ============
    if (originalProject.projectStage === 'cancelled') {
      return errorResponse('FORBIDDEN', '已取消的项目不能再进行修改');
    }

    if (body.status !== undefined && body.status !== originalProject.status) {
      return errorResponse('BAD_REQUEST', '项目兼容状态不支持直接修改，请通过阶段变更或结果归档接口处理');
    }

    // ============ BUG-020: 项目进度范围校验 ============
    if (body.progress !== undefined) {
      const progress = parseInt(body.progress);
      if (isNaN(progress) || progress < 0 || progress > 100) {
        return errorResponse('BAD_REQUEST', '项目进度必须在0-100之间');
      }
    }

    // ============ BUG-013: 项目名称不能为空 ============
    if (body.projectName !== undefined) {
      const sanitizedName = sanitizeString(body.projectName);
      if (!sanitizedName || sanitizedName.trim() === '') {
        return errorResponse('BAD_REQUEST', '项目名称不能为空');
      }
      if (sanitizedName.length > 200) {
        return errorResponse('BAD_REQUEST', '项目名称不能超过200个字符');
      }
      body.projectName = sanitizedName;
    }

    // ============ BUG-014: 金额不能为负数 ============
    if (body.estimatedAmount !== undefined) {
      const amount = parseFloat(body.estimatedAmount);
      if (!isNaN(amount) && amount < 0) {
        return errorResponse('BAD_REQUEST', '预计金额不能为负数');
      }
    }
    if (body.actualAmount !== undefined) {
      const amount = parseFloat(body.actualAmount);
      if (!isNaN(amount) && amount < 0) {
        return errorResponse('BAD_REQUEST', '实际金额不能为负数');
      }
    }

    // ============ BUG-015: 结束日期不能早于开始日期 ============
    const startDate = body.startDate || originalProject.startDate;
    const endDate = body.endDate || originalProject.endDate;
    if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
      return errorResponse('BAD_REQUEST', '结束日期不能早于开始日期');
    }

    // ============ BUG-040: 项目优先级枚举校验 ============
    if (body.priority !== undefined) {
      const validPriorities = ['low', 'medium', 'high', 'urgent'];
      if (!validPriorities.includes(body.priority)) {
        return errorResponse('BAD_REQUEST', '无效的项目优先级');
      }
    }

    // ============ XSS防护: 清理用户输入 ============
    const sanitizedBody = {
      ...body,
      projectName: body.projectName !== undefined ? sanitizeString(body.projectName) : undefined,
      customerName: body.customerName !== undefined ? sanitizeString(body.customerName) : undefined,
      projectType: body.projectType !== undefined ? sanitizeString(String(body.projectType)) : undefined,
      projectTypes: body.projectTypes !== undefined ? normalizeProjectTypeCodes(body.projectTypes) : undefined,
      description: body.description !== undefined ? (body.description ? sanitizeString(body.description) : null) : undefined,
      risks: body.risks !== undefined ? (body.risks ? sanitizeString(body.risks) : null) : undefined,
      loseReason: body.loseReason !== undefined ? (body.loseReason ? sanitizeString(body.loseReason) : null) : undefined,
      holdReason: body.holdReason !== undefined ? (body.holdReason ? sanitizeString(body.holdReason) : null) : undefined,
      cancelReason: body.cancelReason !== undefined ? (body.cancelReason ? sanitizeString(body.cancelReason) : null) : undefined,
      winCompetitor: body.winCompetitor !== undefined ? (body.winCompetitor ? sanitizeString(body.winCompetitor) : null) : undefined,
      contractNumber: body.contractNumber !== undefined ? (body.contractNumber ? sanitizeString(body.contractNumber) : null) : undefined,
      lessonsLearned: body.lessonsLearned !== undefined ? (body.lessonsLearned ? sanitizeString(body.lessonsLearned) : null) : undefined,
    };

    const hasBidResultUpdate = body.bidResult !== undefined;
    const resolvedBidResult = hasBidResultUpdate
      ? resolveProjectBidResult({
          projectBidResult: body.bidResult,
          biddingBidResult: originalProject.bidResult,
          projectStatus: originalProject.status,
        })
      : null;

    const oldStatus = originalProject.status;

    // ============ BUG-003: 中标时必须填写金额 ============
    if (resolvedBidResult === 'won') {
      const actualAmount = sanitizedBody.actualAmount ?? originalProject.actualAmount;
      if (!actualAmount || parseFloat(actualAmount) <= 0) {
        return errorResponse('BAD_REQUEST', '项目中标时必须填写实际金额（actualAmount）');
      }
    }

    // ============ TC-STAGE-*: 阶段转换限制 ============
    const oldStage = originalProject.projectStage;
    const newStage = sanitizedBody.projectStage;

    if (newStage && newStage !== oldStage) {
      if (typeof oldStage === 'string' && typeof newStage === 'string' && (isGovernedProjectStage(oldStage) || isGovernedProjectStage(newStage))) {
        return errorResponse('BAD_REQUEST', '项目阶段变更必须通过专用阶段接口执行');
      }

      // TC-STAGE-012: 归档后不可变更阶段
      if (oldStage === 'archived') {
        return errorResponse('BAD_REQUEST', '归档后的项目不可变更阶段');
      }

      // TC-STAGE-010/011: 中标后不可退回商机阶段或招投标阶段
      const currentStatus = oldStatus;
      if (currentStatus === 'won' || currentStatus === 'archived') {
        const restrictedStages = ['opportunity', 'bidding'];
        if (restrictedStages.includes(newStage) && !restrictedStages.includes(oldStage)) {
          return errorResponse('BAD_REQUEST', `中标后不可退回到${newStage === 'opportunity' ? '商机' : '招投标'}阶段`);
        }
      }

      // TC-STAGE-020: 未中标不可进入实施阶段
      const implementationStages = ['execution', 'settlement'];
      if (implementationStages.includes(newStage) && currentStatus !== 'won') {
        return errorResponse('BAD_REQUEST', '进入实施阶段需要先中标');
      }
    }

    const oldCustomerId = originalProject.customerId;
    let customerSnapshot = {
      customerId: oldCustomerId,
      customerName: originalProject.customerName,
    };

    if (sanitizedBody.customerId !== undefined || sanitizedBody.customerName !== undefined) {
      try {
        customerSnapshot = await resolveProjectCustomerSnapshot({
          customerId: sanitizedBody.customerId !== undefined ? sanitizedBody.customerId : oldCustomerId,
          customerName: sanitizedBody.customerName !== undefined ? sanitizedBody.customerName : originalProject.customerName,
        });
      } catch (error) {
        if (error instanceof Error && error.message === 'CUSTOMER_NOT_FOUND') {
          return errorResponse('BAD_REQUEST', '指定的客户不存在');
        }
        throw error;
      }
    }

    const newCustomerId = customerSnapshot.customerId;

    let resolvedProjectTypeId = originalProject.projectTypeId;
    let resolvedProjectTypeCode = originalProject.projectType;

    if (sanitizedBody.projectTypeId !== undefined || sanitizedBody.projectType !== undefined || sanitizedBody.projectTypes !== undefined) {
      const { projectTypes } = await import('@/db/schema');
      const activeProjectTypes = await db
        .select({ id: projectTypes.id, code: projectTypes.code, name: projectTypes.name })
        .from(projectTypes)
        .where(isNull(projectTypes.deletedAt));

      const requestedProjectTypeCodes = normalizeProjectTypeCodes(sanitizedBody.projectTypes ?? sanitizedBody.projectType);
      const resolvedCodes: string[] = [];

      if ((sanitizedBody.projectType !== undefined || sanitizedBody.projectTypes !== undefined) && sanitizedBody.projectTypeId === undefined) {
        resolvedProjectTypeId = undefined;
      }

      if (sanitizedBody.projectTypeId !== undefined && sanitizedBody.projectTypeId !== null && sanitizedBody.projectTypeId !== '') {
        const typeById = activeProjectTypes.find((item) => item.id === Number(sanitizedBody.projectTypeId));

        if (!typeById) {
          return errorResponse('BAD_REQUEST', '指定的项目类型不存在');
        }

        resolvedProjectTypeId = typeById.id;
        resolvedProjectTypeCode = typeById.code;
        if (requestedProjectTypeCodes.length === 0) {
          resolvedCodes.push(typeById.code);
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
        resolvedCodes.length > 0 ? resolvedCodes : normalizeProjectTypeCodes(originalProject.projectType)
      );
    }

    // BUG-003: 检查预算是否有变化，用于记录历史
    const oldEstimatedAmount = originalProject.estimatedAmount;
    const newEstimatedAmount = sanitizedBody.estimatedAmount;
    const hasBudgetChange = newEstimatedAmount !== undefined && 
                            String(oldEstimatedAmount || '0') !== String(newEstimatedAmount);

    // 更新项目
    const projectUpdateData: Record<string, unknown> = {
      projectName: sanitizedBody.projectName !== undefined ? sanitizedBody.projectName : undefined,
      customerId: sanitizedBody.customerId !== undefined || sanitizedBody.customerName !== undefined ? newCustomerId : undefined,
      customerName: sanitizedBody.customerId !== undefined || sanitizedBody.customerName !== undefined ? customerSnapshot.customerName : undefined,
      projectTypeId: sanitizedBody.projectTypeId !== undefined || sanitizedBody.projectType !== undefined || sanitizedBody.projectTypes !== undefined ? resolvedProjectTypeId : undefined,
      projectType: sanitizedBody.projectTypeId !== undefined || sanitizedBody.projectType !== undefined || sanitizedBody.projectTypes !== undefined ? resolvedProjectTypeCode : undefined,
      industry: sanitizedBody.industry !== undefined ? sanitizedBody.industry : undefined,
      region: sanitizedBody.region !== undefined ? sanitizedBody.region : undefined,
      description: sanitizedBody.description !== undefined ? sanitizedBody.description : undefined,
      managerId: sanitizedBody.managerId !== undefined ? sanitizedBody.managerId : undefined,
      deliveryManagerId: sanitizedBody.deliveryManagerId !== undefined ? sanitizedBody.deliveryManagerId : undefined,
      projectStage: sanitizedBody.projectStage !== undefined ? sanitizedBody.projectStage : undefined,
      estimatedAmount: sanitizedBody.estimatedAmount !== undefined ? sanitizedBody.estimatedAmount : undefined,
      actualAmount: sanitizedBody.actualAmount !== undefined ? sanitizedBody.actualAmount : undefined,
      startDate: sanitizedBody.startDate !== undefined ? (sanitizedBody.startDate || null) : undefined,
      endDate: sanitizedBody.endDate !== undefined ? (sanitizedBody.endDate || null) : undefined,
      expectedDeliveryDate: sanitizedBody.expectedDeliveryDate !== undefined ? (sanitizedBody.expectedDeliveryDate || null) : undefined,
      expectedBiddingDate: sanitizedBody.expectedBiddingDate !== undefined ? (sanitizedBody.expectedBiddingDate || null) : undefined,
      estimatedDuration: sanitizedBody.estimatedDuration !== undefined ? sanitizedBody.estimatedDuration : undefined,
      urgencyLevel: sanitizedBody.urgencyLevel !== undefined ? sanitizedBody.urgencyLevel : undefined,
      priority: sanitizedBody.priority !== undefined ? sanitizedBody.priority : undefined,
      progress: sanitizedBody.progress !== undefined ? sanitizedBody.progress : undefined,
      risks: sanitizedBody.risks !== undefined ? sanitizedBody.risks : undefined,
      loseReason: sanitizedBody.loseReason !== undefined ? sanitizedBody.loseReason : undefined,
      holdReason: sanitizedBody.holdReason !== undefined ? sanitizedBody.holdReason : undefined,
      cancelReason: sanitizedBody.cancelReason !== undefined ? sanitizedBody.cancelReason : undefined,
      winCompetitor: sanitizedBody.winCompetitor !== undefined ? sanitizedBody.winCompetitor : undefined,
      contractNumber: sanitizedBody.contractNumber !== undefined ? sanitizedBody.contractNumber : undefined,
      lessonsLearned: sanitizedBody.lessonsLearned !== undefined ? sanitizedBody.lessonsLearned : undefined,
      updatedAt: new Date(),
    };

    if (hasBidResultUpdate && resolvedBidResult) {
      Object.assign(
        projectUpdateData,
        buildProjectResultSyncPayload({
          bidResult: resolvedBidResult,
          winCompetitor: sanitizedBody.winCompetitor ?? originalProject.winCompetitor,
          loseReason: sanitizedBody.loseReason ?? originalProject.loseReason,
        })
      );
    }

    const [updatedProject] = await db
      .update(projects)
      .set(projectUpdateData)
      .where(eq(projects.id, projectId))
      .returning();

    if (hasBidResultUpdate && resolvedBidResult) {
      const biddingSyncData = {
        bidResult: resolvedBidResult,
        winCompetitor: resolvedBidResult === 'lost' ? sanitizedBody.winCompetitor ?? originalProject.winCompetitor ?? null : null,
        loseReason: resolvedBidResult === 'lost' ? sanitizedBody.loseReason ?? originalProject.loseReason ?? null : null,
        lessonsLearned: sanitizedBody.lessonsLearned ?? originalProject.lessonsLearned ?? null,
        updatedAt: new Date(),
      };

      const [existingBidding] = await db
        .select({ id: projectBiddings.id })
        .from(projectBiddings)
        .where(eq(projectBiddings.projectId, projectId))
        .limit(1);

      if (existingBidding) {
        await db
          .update(projectBiddings)
          .set(biddingSyncData)
          .where(eq(projectBiddings.projectId, projectId));
      } else {
        await db.insert(projectBiddings).values({
          projectId,
          ...biddingSyncData,
        });
      }
    }

    // BUG-003: 如果预算有变化，记录预算历史
    if (hasBudgetChange) {
      // 获取当前用户信息
      const [currentUser] = await db
        .select({ realName: users.realName })
        .from(users)
        .where(eq(users.id, context.userId))
        .limit(1);

      const isFirstEntry = oldEstimatedAmount === null || oldEstimatedAmount === undefined;
      
      await db.insert(projectBudgetHistory).values({
        projectId,
        oldAmount: oldEstimatedAmount ? String(oldEstimatedAmount) : null,
        newAmount: String(newEstimatedAmount),
        changeReason: isFirstEntry ? null : '项目编辑更新',
        isFirstEntry,
        changedBy: context.userId,
        changedByName: currentUser?.realName || null,
      });
    }

    // 如果客户变更，更新客户项目数统计
    if (oldCustomerId !== newCustomerId) {
      // 同步原客户统计
      if (oldCustomerId) {
        await syncSingleCustomerStats(oldCustomerId);
      }
      // 同步新客户统计
      if (newCustomerId) {
        await syncSingleCustomerStats(newCustomerId);
      }
    } else if (newCustomerId) {
      // 即使客户没变，金额变化也需要同步
      await syncSingleCustomerStats(newCustomerId);
    }

    return successResponse(updatedProject);
  } catch (error) {
    console.error('Failed to update project:', error);
    return errorResponse('INTERNAL_ERROR', '更新项目失败');
  }
});


// DELETE - 删除项目（软删除）
export const DELETE = withAuth(async (
  request: NextRequest,
  context: { userId: number; params?: Record<string, string> }
) => {
  try {
    const projectId = parseInt(context.params?.id || '0');

    // 权限检查（需要ADMIN权限才能删除）
    const canAdmin = await canAdminProject(projectId, context.userId);
    if (!canAdmin) {
      return errorResponse('FORBIDDEN', '您没有权限删除此项目');
    }

    // 获取原项目信息
    const [originalProject] = await db
      .select()
      .from(projects)
      .where(and(
        eq(projects.id, projectId),
        isNull(projects.deletedAt)
      ))
      .limit(1);

    if (!originalProject) {
      return errorResponse('NOT_FOUND', '项目不存在');
    }

    // BUG-024: 检查是否有关联合同
    const { contracts } = await import('@/db/schema');
    const relatedContracts = await db
      .select({ id: contracts.id, contractName: contracts.contractName })
      .from(contracts)
      .where(eq(contracts.projectId, projectId))
      .limit(5);

    if (relatedContracts.length > 0) {
      return errorResponse('BAD_REQUEST', 
        `该项目有${relatedContracts.length}个关联合同，请先解除关联或删除合同后再删除项目`);
    }

    // 软删除项目
    await db
      .update(projects)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(projects.id, projectId));

    // 更新客户项目数统计
    if (originalProject.customerId) {
      await syncSingleCustomerStats(originalProject.customerId);
    }

    return successResponse({ success: true, message: '项目已删除' });
  } catch (error) {
    console.error('Failed to delete project:', error);
    return errorResponse('INTERNAL_ERROR', '删除项目失败');
  }
});
