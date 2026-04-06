import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { solutions, solutionTypes, users, solutionSubSchemes } from '@/db/schema';
import { eq, sql, isNull, and } from 'drizzle-orm';
import { withAuth } from '@/lib/auth-middleware';
import { successResponse, errorResponse } from '@/lib/api-response';
import { validateSolutionInput, sanitizeInput } from '@/lib/input-validation';

// GET /api/solutions/[id] - 获取单个解决方案详情
// 已修复：使用 withAuth 中间件替代 authenticate
export const GET = withAuth(async (
  req: NextRequest,
  context: { userId: number; params?: Record<string, string> }
) => {
  try {
    const id = parseInt(context.params?.id || '0');

    if (!id || isNaN(id)) {
      return errorResponse('BAD_REQUEST', '无效的解决方案ID');
    }

    const [solution] = await db
      .select()
      .from(solutions)
      .where(and(
        eq(solutions.id, id),
        isNull(solutions.deletedAt)
      ))
      .limit(1);

    if (!solution) {
      return errorResponse('NOT_FOUND', '解决方案不存在');
    }

    // 增加浏览次数
    await db
      .update(solutions)
      .set({ viewCount: sql`${solutions.viewCount} + 1` })
      .where(eq(solutions.id, id));

    // 获取关联信息
    const [solutionType] = await db
      .select()
      .from(solutionTypes)
      .where(eq(solutionTypes.id, solution.solutionTypeId!))
      .limit(1);

    const [author] = await db
      .select()
      .from(users)
      .where(eq(users.id, solution.authorId))
      .limit(1);

    let owner = null;
    if (solution.ownerId) {
      const [ownerData] = await db
        .select()
        .from(users)
        .where(eq(users.id, solution.ownerId))
        .limit(1);
      owner = ownerData;
    }

    let reviewer = null;
    if (solution.reviewerId) {
      const [reviewerData] = await db
        .select()
        .from(users)
        .where(eq(users.id, solution.reviewerId))
        .limit(1);
      reviewer = reviewerData;
    }

    let template = null;
    if (solution.templateId) {
      const [templateData] = await db
        .select({
          id: solutions.id,
          solutionName: solutions.solutionName,
          solutionCode: solutions.solutionCode,
          version: solutions.version,
        })
        .from(solutions)
        .where(eq(solutions.id, solution.templateId))
        .limit(1);
      template = templateData;
    }

    // 获取子方案信息
    const subSchemes = await db
      .select()
      .from(solutionSubSchemes)
      .where(eq(solutionSubSchemes.solutionId, id));

    return successResponse({
      solution: {
        ...solution,
        solutionTypeName: solutionType?.name || null,
        authorName: author?.realName || author?.username || '未知',
        ownerName: owner?.realName || owner?.username || null,
        reviewerName: reviewer?.realName || reviewer?.username || null,
        templateName: template?.solutionName || null,
        subSchemes,
      },
      reviews: [],
      solutionType,
      author,
      owner,
      reviewer,
      template,
    });
  } catch (error) {
    console.error('Error fetching solution:', error);
    return errorResponse('INTERNAL_ERROR', '获取解决方案详情失败');
  }
});

// PUT /api/solutions/[id] - 更新解决方案
// 已修复：使用 withAuth 中间件替代 authenticate
export const PUT = withAuth(async (
  req: NextRequest,
  context: { userId: number; params?: Record<string, string> }
) => {
  try {
    const id = parseInt(context.params?.id || '0');
    
    if (!id || isNaN(id)) {
      return errorResponse('BAD_REQUEST', '无效的解决方案ID');
    }

    const body = await req.json();

    // 检查解决方案是否存在
    const existing = await db
      .select()
      .from(solutions)
      .where(and(
        eq(solutions.id, id),
        isNull(solutions.deletedAt)
      ))
      .limit(1);

    if (existing.length === 0) {
      return errorResponse('NOT_FOUND', '解决方案不存在');
    }

    // 输入验证
    const validation = validateSolutionInput(body);
    if (!validation.valid) {
      return errorResponse('BAD_REQUEST', validation.errors.join('; '));
    }

    // 如果要修改 solutionCode，检查是否已被使用
    if (body.solutionCode && body.solutionCode !== existing[0].solutionCode) {
      const duplicate = await db
        .select()
        .from(solutions)
        .where(eq(solutions.solutionCode, body.solutionCode))
        .limit(1);

      if (duplicate.length > 0) {
        return errorResponse('CONFLICT', '解决方案编号已存在');
      }
    }

    const updateData: Record<string, any> = {};
    const allowedFields = [
      'solutionCode', 'solutionName', 'solutionTypeId', 'version',
      'industry', 'scenario', 'description', 'coreFeatures', 'technicalArchitecture',
      'components', 'advantages', 'limitations', 'targetAudience', 'complexity',
      'estimatedCost', 'estimatedDuration', 'ownerId', 'reviewerId',
      'isTemplate', 'templateId', 'status', 'approvalStatus', 'approvalDate',
      'approvalComments', 'publishDate', 'tags', 'attachments', 'thumbnail',
      'isPublic', 'publishScope', 'externalReferences', 'dependencies', 'notes',
    ];

    // 需要清理的文本字段
    const sanitizeFields = ['solutionName', 'description', 'technicalArchitecture', 'advantages', 'limitations', 'notes'];

    allowedFields.forEach((field) => {
      if (body[field] !== undefined) {
        // 对需要清理的字段进行XSS处理
        if (sanitizeFields.includes(field) && typeof body[field] === 'string') {
          updateData[field] = sanitizeInput(body[field]);
        } else {
          updateData[field] = body[field];
        }
      }
    });

    const [updated] = await db
      .update(solutions)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(solutions.id, id))
      .returning();

    return successResponse({
      message: '解决方案更新成功',
      data: updated,
    });
  } catch (error) {
    console.error('Error updating solution:', error);
    return errorResponse('INTERNAL_ERROR', '更新解决方案失败');
  }
});

// DELETE /api/solutions/[id] - 删除解决方案
// 已修复：
// 1. 使用 withAuth 中间件替代 authenticate
// 2. 删除前检查资源是否存在，不存在时返回404
export const DELETE = withAuth(async (
  req: NextRequest,
  context: { userId: number; params?: Record<string, string> }
) => {
  try {
    const id = parseInt(context.params?.id || '0');

    if (!id || isNaN(id)) {
      return errorResponse('BAD_REQUEST', '无效的解决方案ID');
    }

    // 修复：删除前检查解决方案是否存在
    const existing = await db
      .select()
      .from(solutions)
      .where(and(
        eq(solutions.id, id),
        isNull(solutions.deletedAt)
      ))
      .limit(1);

    if (existing.length === 0) {
      return errorResponse('NOT_FOUND', '解决方案不存在');
    }

    // 执行软删除
    const [deleted] = await db
      .update(solutions)
      .set({ deletedAt: new Date() })
      .where(eq(solutions.id, id))
      .returning();

    return successResponse({
      message: '解决方案删除成功',
      data: deleted,
    });
  } catch (error) {
    console.error('Error deleting solution:', error);
    return errorResponse('INTERNAL_ERROR', '删除解决方案失败');
  }
});
