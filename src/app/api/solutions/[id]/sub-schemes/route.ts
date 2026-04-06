import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { solutionSubSchemes, solutions, users } from '@/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { authenticate } from '@/lib/auth';
import { validateSubSchemeInput, sanitizeInput } from '@/lib/input-validation';

// GET /api/solutions/[id]/sub-schemes - 获取解决方案的子方案列表
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

    const { searchParams } = new URL(req.url);
    const parentSubSchemeId = searchParams.get('parentSubSchemeId');
    const status = searchParams.get('status');
    const subSchemeType = searchParams.get('subSchemeType');

    // 构建查询条件
    const conditions = [eq(solutionSubSchemes.solutionId, solutionId)];
    
    if (parentSubSchemeId !== null) {
      if (parentSubSchemeId === 'null' || parentSubSchemeId === '') {
        conditions.push(sql`${solutionSubSchemes.parentSubSchemeId} IS NULL`);
      } else {
        conditions.push(eq(solutionSubSchemes.parentSubSchemeId, parseInt(parentSubSchemeId)));
      }
    }
    
    if (status) {
      conditions.push(eq(solutionSubSchemes.status, status));
    }
    
    if (subSchemeType) {
      conditions.push(eq(solutionSubSchemes.subSchemeType, subSchemeType));
    }

    // 获取子方案列表
    const subSchemes = await db
      .select({
        id: solutionSubSchemes.id,
        solutionId: solutionSubSchemes.solutionId,
        subSchemeCode: solutionSubSchemes.subSchemeCode,
        subSchemeName: solutionSubSchemes.subSchemeName,
        subSchemeType: solutionSubSchemes.subSchemeType,
        parentSubSchemeId: solutionSubSchemes.parentSubSchemeId,
        sortOrder: solutionSubSchemes.sortOrder,
        version: solutionSubSchemes.version,
        description: solutionSubSchemes.description,
        estimatedCost: solutionSubSchemes.estimatedCost,
        estimatedDuration: solutionSubSchemes.estimatedDuration,
        responsibleUserId: solutionSubSchemes.responsibleUserId,
        status: solutionSubSchemes.status,
        tags: solutionSubSchemes.tags,
        viewCount: solutionSubSchemes.viewCount,
        downloadCount: solutionSubSchemes.downloadCount,
        createdAt: solutionSubSchemes.createdAt,
        updatedAt: solutionSubSchemes.updatedAt,
        // 关联负责人信息
        responsibleUserName: users.realName,
      })
      .from(solutionSubSchemes)
      .leftJoin(users, eq(solutionSubSchemes.responsibleUserId, users.id))
      .where(and(...conditions))
      .orderBy(solutionSubSchemes.sortOrder, desc(solutionSubSchemes.createdAt));

    // 获取每个子方案的子项数量
    const subSchemesWithChildren = await Promise.all(
      subSchemes.map(async (subScheme) => {
        const [{ count }] = await db
          .select({ count: sql<number>`count(*)` })
          .from(solutionSubSchemes)
          .where(eq(solutionSubSchemes.parentSubSchemeId, subScheme.id));

        return {
          ...subScheme,
          childrenCount: Number(count),
        };
      })
    );

    return NextResponse.json({
      data: subSchemesWithChildren,
    });
  } catch (error) {
    console.error('Error fetching sub-schemes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sub-schemes' },
      { status: 500 }
    );
  }
}

// POST /api/solutions/[id]/sub-schemes - 创建子方案
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

    // 输入验证
    const validation = validateSubSchemeInput(body);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.errors.join('; ') },
        { status: 400 }
      );
    }

    // 验证必填字段
    if (!body.subSchemeName) {
      return NextResponse.json(
        { error: 'subSchemeName is required' },
        { status: 400 }
      );
    }

    // 生成子方案编号
    const subSchemeCode = body.subSchemeCode || `SUB-${solution.solutionCode}-${Date.now().toString(36).toUpperCase()}`;

    // 获取当前最大排序号
    const [{ maxSort }] = await db
      .select({ maxSort: sql<number>`coalesce(max(sort_order), 0)` })
      .from(solutionSubSchemes)
      .where(eq(solutionSubSchemes.solutionId, solutionId));

    // 创建子方案
    const [newSubScheme] = await db
      .insert(solutionSubSchemes)
      .values({
        solutionId,
        subSchemeCode,
        subSchemeName: sanitizeInput(body.subSchemeName),
        subSchemeType: body.subSchemeType || null,
        parentSubSchemeId: body.parentSubSchemeId || null,
        sortOrder: body.sortOrder ?? (Number(maxSort) + 1),
        version: body.version || '1.0',
        description: body.description ? sanitizeInput(body.description) : null,
        content: body.content ? sanitizeInput(body.content) : null,
        technicalSpec: body.technicalSpec ? sanitizeInput(body.technicalSpec) : null,
        estimatedCost: body.estimatedCost || null,
        estimatedDuration: body.estimatedDuration || null,
        responsibleUserId: body.responsibleUserId || null,
        status: body.status || 'draft',
        tags: body.tags || null,
        attachments: body.attachments || null,
        notes: body.notes ? sanitizeInput(body.notes) : null,
      })
      .returning();

    // 更新解决方案的更新时间
    await db
      .update(solutions)
      .set({ updatedAt: new Date() })
      .where(eq(solutions.id, solutionId));

    return NextResponse.json({
      message: 'Sub-scheme created successfully',
      data: newSubScheme,
    });
  } catch (error) {
    console.error('Error creating sub-scheme:', error);
    return NextResponse.json(
      { error: 'Failed to create sub-scheme' },
      { status: 500 }
    );
  }
}
