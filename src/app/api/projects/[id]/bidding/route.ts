import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { projectBiddings, projects } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { withAuth } from '@/lib/auth-middleware';
import { successResponse, errorResponse } from '@/lib/api-response';
import { canReadProject, canWriteProject } from '@/lib/permissions/project';
import { buildProjectResultSyncPayload, resolveProjectBidResult } from '@/lib/project-results';

function normalizeTimestampField(value: unknown) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === '') {
    return null;
  }

  if (value instanceof Date) {
    return value;
  }

  const normalized = new Date(String(value));
  return Number.isNaN(normalized.getTime()) ? null : normalized;
}

function normalizeDateField(value: unknown) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === '') {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  const normalized = new Date(String(value));
  return Number.isNaN(normalized.getTime()) ? null : normalized.toISOString().slice(0, 10);
}

// GET - 获取项目投标信息
export const GET = withAuth(async (
  request: NextRequest,
  context: { userId: number; params?: Record<string, string> }
) => {
  try {
    const projectId = parseInt(context.params?.id || '0');

    // 检查项目是否存在且未被删除
    const [projectExists] = await db
      .select({
        id: projects.id,
        status: projects.status,
        bidResult: projects.bidResult,
        winCompetitor: projects.winCompetitor,
        loseReason: projects.loseReason,
        lessonsLearned: projects.lessonsLearned,
      })
      .from(projects)
      .where(and(
        eq(projects.id, projectId),
        isNull(projects.deletedAt)
      ))
      .limit(1);

    if (!projectExists) {
      return errorResponse('NOT_FOUND', '项目不存在');
    }

    // 权限检查
    const canRead = await canReadProject(projectId, context.userId);
    if (!canRead) {
      return errorResponse('FORBIDDEN', '您没有权限查看此项目');
    }

    const [projectBid] = await db
      .select()
      .from(projectBiddings)
      .where(eq(projectBiddings.projectId, projectId))
      .limit(1);

    const resolvedBidResult = resolveProjectBidResult({
      projectBidResult: projectExists.bidResult,
      biddingBidResult: projectBid?.bidResult,
      projectStatus: projectExists.status,
    });

    if (!projectBid) {
      return NextResponse.json({
        success: true,
        data: {
          projectId,
          bidNumber: null,
          bidProjectName: null,
          biddingMethod: null,
          scoringMethod: null,
          priceLimit: null,
          fundSource: null,
          biddingType: null,
          bidDeadline: null,
          bidBondAmount: null,
          bidBondStatus: 'unpaid',
          bidBondPayDate: null,
          bidBondReturnDate: null,
          tenderDocuments: [],
          bidDocuments: [],
          bidTeam: [],
          bidPrice: null,
          bidOpenDate: null,
          bidResult: resolvedBidResult,
          loseReason: projectExists.loseReason || null,
          winCompetitor: projectExists.winCompetitor || null,
          reviewComments: null,
          lessonsLearned: projectExists.lessonsLearned || null,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        ...projectBid,
        bidResult: resolvedBidResult,
        loseReason: projectExists.loseReason || projectBid.loseReason || null,
        winCompetitor: projectExists.winCompetitor || projectBid.winCompetitor || null,
        lessonsLearned: projectExists.lessonsLearned || projectBid.lessonsLearned || null,
      },
    });
  } catch (error) {
    console.error('Get project bidding error:', error);
    return errorResponse('INTERNAL_ERROR', '获取项目投标信息失败');
  }
});

// PUT - 更新项目投标信息
export const PUT = withAuth(async (
  request: NextRequest,
  context: { userId: number; params?: Record<string, string> }
) => {
  try {
    const projectId = parseInt(context.params?.id || '0');
    const body = await request.json();
    const normalizedBody = {
      bidNumber: body.bidNumber,
      bidProjectName: body.bidProjectName,
      biddingMethod: body.biddingMethod,
      scoringMethod: body.scoringMethod,
      priceLimit: body.priceLimit,
      fundSource: body.fundSource,
      biddingType: body.biddingType,
      bidDeadline: normalizeTimestampField(body.bidDeadline),
      bidBondAmount: body.bidBondAmount,
      bidBondStatus: body.bidBondStatus,
      bidOpenDate: normalizeTimestampField(body.bidOpenDate),
      bidResult: body.bidResult,
      bidBondPayDate: normalizeDateField(body.bidBondPayDate),
      bidBondReturnDate: normalizeDateField(body.bidBondReturnDate),
      tenderDocuments: body.tenderDocuments,
      bidDocuments: body.bidDocuments,
      bidTeam: body.bidTeam,
      bidPrice: body.bidPrice,
      loseReason: body.loseReason,
      winCompetitor: body.winCompetitor,
      reviewComments: body.reviewComments,
      lessonsLearned: body.lessonsLearned,
    };

    // 检查项目是否存在且未被删除
    const [projectExists] = await db
      .select({
        id: projects.id,
        status: projects.status,
        bidResult: projects.bidResult,
        winCompetitor: projects.winCompetitor,
        loseReason: projects.loseReason,
      })
      .from(projects)
      .where(and(
        eq(projects.id, projectId),
        isNull(projects.deletedAt)
      ))
      .limit(1);

    if (!projectExists) {
      return errorResponse('NOT_FOUND', '项目不存在');
    }

    // 权限检查
    const canWrite = await canWriteProject(projectId, context.userId);
    if (!canWrite) {
      return errorResponse('FORBIDDEN', '您没有权限编辑此项目');
    }

    // BUG-005: 投标保证金不能为负数
    if (normalizedBody.bidBondAmount !== undefined && normalizedBody.bidBondAmount !== null) {
      const bondAmount = parseFloat(normalizedBody.bidBondAmount);
      if (!isNaN(bondAmount) && bondAmount < 0) {
        return errorResponse('BAD_REQUEST', '投标保证金不能为负数');
      }
    }

    // BUG-026: 投标报价不能为负数
    if (normalizedBody.bidPrice !== undefined && normalizedBody.bidPrice !== null) {
      const bidPrice = parseFloat(normalizedBody.bidPrice);
      if (!isNaN(bidPrice) && bidPrice < 0) {
        return errorResponse('BAD_REQUEST', '投标报价不能为负数');
      }
    }

    // BUG-023: 价格上限不能为负数
    if (normalizedBody.priceLimit !== undefined && normalizedBody.priceLimit !== null) {
      const priceLimit = parseFloat(normalizedBody.priceLimit);
      if (!isNaN(priceLimit) && priceLimit < 0) {
        return errorResponse('BAD_REQUEST', '价格上限不能为负数');
      }
    }

    const [existing] = await db
      .select()
      .from(projectBiddings)
      .where(eq(projectBiddings.projectId, projectId))
      .limit(1);

    let result;
    if (existing) {
      [result] = await db
        .update(projectBiddings)
        .set({
          ...normalizedBody,
          updatedAt: new Date(),
        })
        .where(eq(projectBiddings.projectId, projectId))
        .returning();
    } else {
      [result] = await db
        .insert(projectBiddings)
        .values({
          projectId,
          ...normalizedBody,
        })
        .returning();
    }

    const resolvedBidResult = resolveProjectBidResult({
      projectBidResult: projectExists.bidResult,
      biddingBidResult: normalizedBody.bidResult ?? existing?.bidResult,
      projectStatus: projectExists.status,
    });

    const projectUpdates: Record<string, unknown> = {
      updatedAt: new Date(),
      ...buildProjectResultSyncPayload({
        bidResult: resolvedBidResult,
        winCompetitor: normalizedBody.winCompetitor ?? projectExists.winCompetitor,
        loseReason: normalizedBody.loseReason ?? projectExists.loseReason,
      }),
    };

    await db
      .update(projects)
      .set(projectUpdates)
      .where(eq(projects.id, projectId));

    return NextResponse.json({
      success: true,
      data: result,
      message: '保存成功',
    });
  } catch (error) {
    console.error('Update project bidding error:', error);
    return errorResponse('INTERNAL_ERROR', '更新项目投标信息失败');
  }
});
