import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { solutions, solutionTypes, users, solutionSubSchemes, dictionaryItems, projects } from '@/db/schema';
import { eq, and, desc, sql, inArray, isNull } from 'drizzle-orm';
import { withAuth } from '@/lib/auth-middleware';
import { successResponse, errorResponse } from '@/lib/api-response';
import { parsePaginationParams } from '@/lib/pagination';
import { validateSolutionInput, sanitizeInput } from '@/lib/input-validation';

// GET /api/solutions - 获取解决方案列表
export const GET = withAuth(async (req: NextRequest, { userId }) => {
  try {
    const { searchParams } = new URL(req.url);
    const { page, pageSize, offset } = parsePaginationParams(searchParams);
    const status = searchParams.get('status');
    const solutionTypeId = searchParams.get('solutionTypeId');
    const industry = searchParams.get('industry');
    const isTemplate = searchParams.get('isTemplate');
    const isPublic = searchParams.get('isPublic');
    const keyword = searchParams.get('keyword');
    const authorId = searchParams.get('authorId');
    const tags = searchParams.get('tags');
    
    // V3.0: 新增筛选参数
    const solutionCategory = searchParams.get('solutionCategory'); // 方案类型：base/project
    const plateId = searchParams.get('plateId'); // 方案板块ID
    const projectId = searchParams.get('projectId'); // 关联项目ID

    const conditions = [isNull(solutions.deletedAt)]; // 默认排除已删除
    
    if (status) {
      const statuses = status.split(',').map(item => item.trim()).filter(Boolean);
      if (statuses.length === 1) {
        conditions.push(eq(solutions.status, statuses[0]));
      } else if (statuses.length > 1) {
        conditions.push(inArray(solutions.status, statuses));
      }
    }
    
    if (solutionTypeId) {
      conditions.push(eq(solutions.solutionTypeId, parseInt(solutionTypeId)));
    }
    
    if (industry) {
      conditions.push(eq(solutions.industry, industry));
    }
    
    if (isTemplate !== null) {
      conditions.push(eq(solutions.isTemplate, isTemplate === 'true'));
    }
    
    if (isPublic !== null) {
      conditions.push(eq(solutions.isPublic, isPublic === 'true'));
    }
    
    if (authorId) {
      conditions.push(eq(solutions.authorId, parseInt(authorId)));
    }
    
    // V3.0: 方案类型筛选
    if (solutionCategory) {
      conditions.push(eq(solutions.solutionCategory, solutionCategory));
    }
    
    // V3.0: 方案板块筛选
    if (plateId) {
      conditions.push(eq(solutions.plateId, parseInt(plateId)));
    }
    
    // V3.0: 关联项目筛选
    if (projectId) {
      conditions.push(eq(solutions.projectId, parseInt(projectId)));
    }
    
    // 标签过滤
    if (tags) {
      const tagArray = tags.split(',').map(t => t.trim());
      conditions.push(
        sql`${solutions.tags} ? ${tagArray}`
      );
    }

    // 关键词搜索：始终以解决方案为主实体，同时允许命中其子方案名称
    if (keyword) {
      conditions.push(
        sql`(
          ${solutions.solutionName} ILIKE ${'%' + keyword + '%'}
          OR ${solutions.description} ILIKE ${'%' + keyword + '%'}
          OR ${solutions.scenario} ILIKE ${'%' + keyword + '%'}
          OR EXISTS (
            SELECT 1 FROM ${solutionSubSchemes}
            WHERE ${solutionSubSchemes.solutionId} = ${solutions.id}
            AND ${solutionSubSchemes.subSchemeName} ILIKE ${'%' + keyword + '%'}
          )
        )`
      );
    }

    const countQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(solutions)
      .where(conditions.length > 0 ? and(...conditions) : undefined);
    
    const [{ count }] = await countQuery;

    const data = await db
      .select({
        id: solutions.id,
        solutionCode: solutions.solutionCode,
        solutionName: solutions.solutionName,
        solutionTypeId: solutions.solutionTypeId,
        version: solutions.version,
        industry: solutions.industry,
        scenario: solutions.scenario,
        description: solutions.description,
        authorId: solutions.authorId,
        ownerId: solutions.ownerId,
        isTemplate: solutions.isTemplate,
        templateId: solutions.templateId,
        status: solutions.status,
        publishDate: solutions.publishDate,
        tags: solutions.tags,
        thumbnail: solutions.thumbnail,
        viewCount: solutions.viewCount,
        downloadCount: solutions.downloadCount,
        likeCount: solutions.likeCount,
        rating: solutions.rating,
        ratingCount: solutions.ratingCount,
        isPublic: solutions.isPublic,
        createdAt: solutions.createdAt,
        updatedAt: solutions.updatedAt,
        // V3.0: 新增字段
        solutionCategory: solutions.solutionCategory,
        plateId: solutions.plateId,
        projectId: solutions.projectId,
        // 关联信息
        solutionTypeName: solutionTypes.name,
        authorName: users.realName,
        // V3.0: 板块名称
        plateName: dictionaryItems.itemName,
        // V3.0: 项目名称
        projectName: projects.projectName,
      })
      .from(solutions)
      .leftJoin(solutionTypes, eq(solutions.solutionTypeId, solutionTypes.id))
      .leftJoin(users, eq(solutions.authorId, users.id))
      .leftJoin(dictionaryItems, eq(solutions.plateId, dictionaryItems.id))
      .leftJoin(projects, eq(solutions.projectId, projects.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(solutions.createdAt))
      .limit(pageSize)
      .offset(offset);

    // V2.1: 为每个方案查询子方案信息
    const solutionsWithSubSchemes = await Promise.all(
      data.map(async (solution) => {
        const subSchemesData = await db
          .select({
            id: solutionSubSchemes.id,
            subSchemeName: solutionSubSchemes.subSchemeName,
            subSchemeType: solutionSubSchemes.subSchemeType,
            version: solutionSubSchemes.version,
          })
          .from(solutionSubSchemes)
          .where(eq(solutionSubSchemes.solutionId, solution.id));
        
        return {
          ...solution,
          subSchemes: subSchemesData,
        };
      })
    );

    return successResponse(solutionsWithSubSchemes, {
      pagination: {
        page,
        pageSize,
        total: count,
      },
    });
  } catch (error) {
    console.error('Error fetching solutions:', error);
    return errorResponse('INTERNAL_ERROR', '获取解决方案列表失败');
  }
});

// POST /api/solutions - 创建解决方案
export const POST = withAuth(async (req: NextRequest, { userId }) => {
  try {
    const body = await req.json();
    
    // 输入验证
    const validation = validateSolutionInput(body);
    if (!validation.valid) {
      return errorResponse('BAD_REQUEST', validation.errors.join('; '));
    }
    
    // authorId 可选，未提供时使用当前用户ID
    if (!body.solutionName) {
      return errorResponse('BAD_REQUEST', '解决方案名称不能为空');
    }

    // 如果未提供 solutionCode，自动生成
    const solutionCode = body.solutionCode || `SOL${Date.now()}${Math.floor(Math.random() * 900 + 100)}`;

    // 检查解决方案编号是否已存在（仅当提供了 solutionCode 时检查）
    if (body.solutionCode) {
      const existing = await db
        .select()
        .from(solutions)
        .where(eq(solutions.solutionCode, solutionCode))
        .limit(1);

      if (existing.length > 0) {
        return errorResponse('BAD_REQUEST', '解决方案编号已存在');
      }
    }

    const [newSolution] = await db
      .insert(solutions)
      .values({
        solutionCode: solutionCode,
        solutionName: sanitizeInput(body.solutionName),
        solutionTypeId: body.solutionTypeId || null,
        version: body.version || '1.0',
        industry: body.industry || null,
        scenario: body.scenario || null,
        description: body.description ? sanitizeInput(body.description) : null,
        coreFeatures: body.coreFeatures || null,
        technicalArchitecture: body.technicalArchitecture ? sanitizeInput(body.technicalArchitecture) : null,
        components: body.components || null,
        advantages: body.advantages ? sanitizeInput(body.advantages) : null,
        limitations: body.limitations ? sanitizeInput(body.limitations) : null,
        targetAudience: body.targetAudience || null,
        complexity: body.complexity || null,
        estimatedCost: body.estimatedCost || null,
        estimatedDuration: body.estimatedDuration || null,
        authorId: body.authorId || userId, // 使用当前用户ID
        ownerId: body.ownerId || body.authorId || userId,
        reviewerId: body.reviewerId || null,
        isTemplate: body.isTemplate || false,
        templateId: body.templateId || null,
        status: body.status || 'draft',
        tags: body.tags || null,
        attachments: body.attachments || null,
        thumbnail: body.thumbnail || null,
        isPublic: body.isPublic ?? false,
        publishScope: body.publishScope || null,
        externalReferences: body.externalReferences || null,
        dependencies: body.dependencies || null,
        notes: body.notes ? sanitizeInput(body.notes) : null,
        // V3.0: 新增字段
        solutionCategory: body.solutionCategory || 'base',
        plateId: body.plateId || null,
        projectId: body.projectId || null,
      })
      .returning();

    return successResponse(newSolution);
  } catch (error) {
    console.error('Error creating solution:', error);
    return errorResponse('INTERNAL_ERROR', '创建解决方案失败');
  }
});
