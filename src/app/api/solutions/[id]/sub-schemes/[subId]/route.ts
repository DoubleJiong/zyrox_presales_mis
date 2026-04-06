import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { solutionSubSchemes, solutions, users, solutionStatistics } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { authenticate } from '@/lib/auth';

// GET /api/solutions/[id]/sub-schemes/[subId] - 获取单个子方案详情
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; subId: string }> }
) {
  try {
    const user = await authenticate(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: idParam, subId } = await params;
    const solutionId = parseInt(idParam);
    const subSchemeId = parseInt(subId);

    // 获取子方案详情
    const [subScheme] = await db
      .select()
      .from(solutionSubSchemes)
      .where(
        and(
          eq(solutionSubSchemes.id, subSchemeId),
          eq(solutionSubSchemes.solutionId, solutionId)
        )
      )
      .limit(1);

    if (!subScheme) {
      return NextResponse.json({ error: 'Sub-scheme not found' }, { status: 404 });
    }

    // 增加浏览次数
    await db
      .update(solutionSubSchemes)
      .set({ viewCount: sql`${solutionSubSchemes.viewCount} + 1` })
      .where(eq(solutionSubSchemes.id, subSchemeId));

    // 记录浏览统计
    await db.insert(solutionStatistics).values({
      solutionId,
      subSchemeId,
      userId: user.id,
      actionType: 'view',
      resourceId: subSchemeId,
      resourceName: subScheme.subSchemeName,
    });

    // 获取负责人信息
    let responsibleUser = null;
    if (subScheme.responsibleUserId) {
      const [userData] = await db
        .select({ id: users.id, realName: users.realName, email: users.email })
        .from(users)
        .where(eq(users.id, subScheme.responsibleUserId))
        .limit(1);
      responsibleUser = userData;
    }

    // 获取父子方案信息
    let parentSubScheme = null;
    if (subScheme.parentSubSchemeId) {
      const [parentData] = await db
        .select({
          id: solutionSubSchemes.id,
          subSchemeCode: solutionSubSchemes.subSchemeCode,
          subSchemeName: solutionSubSchemes.subSchemeName,
        })
        .from(solutionSubSchemes)
        .where(eq(solutionSubSchemes.id, subScheme.parentSubSchemeId))
        .limit(1);
      parentSubScheme = parentData;
    }

    // 获取子子方案列表
    const children = await db
      .select({
        id: solutionSubSchemes.id,
        subSchemeCode: solutionSubSchemes.subSchemeCode,
        subSchemeName: solutionSubSchemes.subSchemeName,
        subSchemeType: solutionSubSchemes.subSchemeType,
        status: solutionSubSchemes.status,
        sortOrder: solutionSubSchemes.sortOrder,
      })
      .from(solutionSubSchemes)
      .where(eq(solutionSubSchemes.parentSubSchemeId, subSchemeId))
      .orderBy(solutionSubSchemes.sortOrder);

    return NextResponse.json({
      data: {
        ...subScheme,
        viewCount: subScheme.viewCount + 1, // 返回更新后的浏览次数
        responsibleUser,
        parentSubScheme,
        children,
      },
    });
  } catch (error) {
    console.error('Error fetching sub-scheme:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sub-scheme' },
      { status: 500 }
    );
  }
}

// PUT /api/solutions/[id]/sub-schemes/[subId] - 更新子方案
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; subId: string }> }
) {
  try {
    const user = await authenticate(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: idParam, subId } = await params;
    const solutionId = parseInt(idParam);
    const subSchemeId = parseInt(subId);
    const body = await req.json();

    // 检查子方案是否存在
    const [existing] = await db
      .select()
      .from(solutionSubSchemes)
      .where(
        and(
          eq(solutionSubSchemes.id, subSchemeId),
          eq(solutionSubSchemes.solutionId, solutionId)
        )
      )
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: 'Sub-scheme not found' }, { status: 404 });
    }

    // 准备更新数据
    const updateData: Record<string, any> = {
      updatedAt: new Date(),
    };

    const allowedFields = [
      'subSchemeCode', 'subSchemeName', 'subSchemeType', 'parentSubSchemeId',
      'sortOrder', 'version', 'description', 'content', 'technicalSpec',
      'estimatedCost', 'estimatedDuration', 'responsibleUserId',
      'status', 'tags', 'attachments', 'notes',
    ];

    allowedFields.forEach((field) => {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    });

    // 执行更新
    const [updated] = await db
      .update(solutionSubSchemes)
      .set(updateData)
      .where(eq(solutionSubSchemes.id, subSchemeId))
      .returning();

    // 更新解决方案的更新时间
    await db
      .update(solutions)
      .set({ updatedAt: new Date() })
      .where(eq(solutions.id, solutionId));

    return NextResponse.json({
      message: 'Sub-scheme updated successfully',
      data: updated,
    });
  } catch (error) {
    console.error('Error updating sub-scheme:', error);
    return NextResponse.json(
      { error: 'Failed to update sub-scheme' },
      { status: 500 }
    );
  }
}

// DELETE /api/solutions/[id]/sub-schemes/[subId] - 删除子方案
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; subId: string }> }
) {
  try {
    const user = await authenticate(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: idParam, subId } = await params;
    const solutionId = parseInt(idParam);
    const subSchemeId = parseInt(subId);

    // 检查是否有子子方案
    const [{ childCount }] = await db
      .select({ childCount: sql<number>`count(*)` })
      .from(solutionSubSchemes)
      .where(eq(solutionSubSchemes.parentSubSchemeId, subSchemeId));

    if (Number(childCount) > 0) {
      return NextResponse.json(
        { error: 'Cannot delete sub-scheme with children. Delete children first.' },
        { status: 400 }
      );
    }

    // 软删除
    const [deleted] = await db
      .update(solutionSubSchemes)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(solutionSubSchemes.id, subSchemeId),
          eq(solutionSubSchemes.solutionId, solutionId)
        )
      )
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: 'Sub-scheme not found' }, { status: 404 });
    }

    // 更新解决方案的更新时间
    await db
      .update(solutions)
      .set({ updatedAt: new Date() })
      .where(eq(solutions.id, solutionId));

    return NextResponse.json({
      message: 'Sub-scheme deleted successfully',
      data: deleted,
    });
  } catch (error) {
    console.error('Error deleting sub-scheme:', error);
    return NextResponse.json(
      { error: 'Failed to delete sub-scheme' },
      { status: 500 }
    );
  }
}

// POST /api/solutions/[id]/sub-schemes/[subId] - 下载子方案（记录下载统计）
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; subId: string }> }
) {
  try {
    const user = await authenticate(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: idParam, subId } = await params;
    const solutionId = parseInt(idParam);
    const subSchemeId = parseInt(subId);
    const body = await req.json();

    // 检查操作类型
    if (body.action !== 'download') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // 获取子方案
    const [subScheme] = await db
      .select()
      .from(solutionSubSchemes)
      .where(
        and(
          eq(solutionSubSchemes.id, subSchemeId),
          eq(solutionSubSchemes.solutionId, solutionId)
        )
      )
      .limit(1);

    if (!subScheme) {
      return NextResponse.json({ error: 'Sub-scheme not found' }, { status: 404 });
    }

    // 增加下载次数
    await db
      .update(solutionSubSchemes)
      .set({ downloadCount: sql`${solutionSubSchemes.downloadCount} + 1` })
      .where(eq(solutionSubSchemes.id, subSchemeId));

    // 记录下载统计
    await db.insert(solutionStatistics).values({
      solutionId,
      subSchemeId,
      userId: user.id,
      actionType: 'download',
      resourceId: body.resourceId || subSchemeId,
      resourceName: body.resourceName || subScheme.subSchemeName,
    });

    return NextResponse.json({
      message: 'Download recorded',
      downloadCount: subScheme.downloadCount + 1,
    });
  } catch (error) {
    console.error('Error recording download:', error);
    return NextResponse.json(
      { error: 'Failed to record download' },
      { status: 500 }
    );
  }
}
