import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { solutionStatistics, solutions, users } from '@/db/schema';
import { eq, and, desc, sql, gte, lte } from 'drizzle-orm';
import { authenticate } from '@/lib/auth';

// GET /api/solutions/[id]/statistics - 获取统计记录
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
    const actionType = searchParams.get('actionType');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '50');
    const groupBy = searchParams.get('groupBy'); // day, user, action

    // 如果是聚合查询
    if (groupBy) {
      let query;
      
      switch (groupBy) {
        case 'day': {
          // 按天聚合
          query = db
            .select({
              date: sql<string>`to_char(${solutionStatistics.createdAt}, 'YYYY-MM-DD')`,
              actionType: solutionStatistics.actionType,
              count: sql<number>`count(*)`,
            })
            .from(solutionStatistics)
            .where(eq(solutionStatistics.solutionId, solutionId));
          
          if (actionType) {
            query = query.where(
              and(
                eq(solutionStatistics.solutionId, solutionId),
                eq(solutionStatistics.actionType, actionType)
              )
            ) as any;
          }

          if (startDate) {
            query = query.where(gte(solutionStatistics.createdAt, new Date(startDate))) as any;
          }

          if (endDate) {
            query = query.where(lte(solutionStatistics.createdAt, new Date(endDate))) as any;
          }

          const result = await query.groupBy(
            sql`to_char(${solutionStatistics.createdAt}, 'YYYY-MM-DD')`,
            solutionStatistics.actionType
          ).orderBy(sql`to_char(${solutionStatistics.createdAt}, 'YYYY-MM-DD')`);

          return NextResponse.json({ data: result, groupBy: 'day' });
        }

        case 'user': {
          // 按用户聚合
          const result = await db
            .select({
              userId: solutionStatistics.userId,
              userName: users.realName,
              actionType: solutionStatistics.actionType,
              count: sql<number>`count(*)`,
              lastAction: sql<Date>`max(${solutionStatistics.createdAt})`,
            })
            .from(solutionStatistics)
            .leftJoin(users, eq(solutionStatistics.userId, users.id))
            .where(eq(solutionStatistics.solutionId, solutionId))
            .groupBy(solutionStatistics.userId, users.realName, solutionStatistics.actionType)
            .orderBy(desc(sql`count(*)`));

          return NextResponse.json({ data: result, groupBy: 'user' });
        }

        case 'action': {
          // 按操作类型聚合
          const result = await db
            .select({
              actionType: solutionStatistics.actionType,
              count: sql<number>`count(*)`,
            })
            .from(solutionStatistics)
            .where(eq(solutionStatistics.solutionId, solutionId))
            .groupBy(solutionStatistics.actionType);

          return NextResponse.json({ data: result, groupBy: 'action' });
        }

        default:
          return NextResponse.json(
            { error: 'Invalid groupBy value. Use: day, user, action' },
            { status: 400 }
          );
      }
    }

    // 构建查询条件
    const conditions = [eq(solutionStatistics.solutionId, solutionId)];

    if (actionType) {
      conditions.push(eq(solutionStatistics.actionType, actionType));
    }

    if (startDate) {
      conditions.push(gte(solutionStatistics.createdAt, new Date(startDate)));
    }

    if (endDate) {
      conditions.push(lte(solutionStatistics.createdAt, new Date(endDate)));
    }

    // 获取总数
    const [{ total }] = await db
      .select({ total: sql<number>`count(*)` })
      .from(solutionStatistics)
      .where(and(...conditions));

    // 分页获取详细记录
    const offset = (page - 1) * pageSize;
    const records = await db
      .select({
        id: solutionStatistics.id,
        solutionId: solutionStatistics.solutionId,
        subSchemeId: solutionStatistics.subSchemeId,
        userId: solutionStatistics.userId,
        actionType: solutionStatistics.actionType,
        resourceId: solutionStatistics.resourceId,
        resourceName: solutionStatistics.resourceName,
        ipAddress: solutionStatistics.ipAddress,
        createdAt: solutionStatistics.createdAt,
        // 用户信息
        userName: users.realName,
        userEmail: users.email,
      })
      .from(solutionStatistics)
      .leftJoin(users, eq(solutionStatistics.userId, users.id))
      .where(and(...conditions))
      .orderBy(desc(solutionStatistics.createdAt))
      .limit(pageSize)
      .offset(offset);

    return NextResponse.json({
      data: records,
      pagination: {
        page,
        pageSize,
        total: Number(total),
        totalPages: Math.ceil(Number(total) / pageSize),
      },
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}

// POST /api/solutions/[id]/statistics - 记录统计
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

    // 验证操作类型
    const validActionTypes = ['view', 'download', 'like', 'share', 'rating'];
    if (!body.actionType || !validActionTypes.includes(body.actionType)) {
      return NextResponse.json(
        { error: `Invalid actionType. Must be one of: ${validActionTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // 记录统计
    const [stat] = await db
      .insert(solutionStatistics)
      .values({
        solutionId,
        subSchemeId: body.subSchemeId || null,
        userId: user.id,
        actionType: body.actionType,
        resourceId: body.resourceId || null,
        resourceName: body.resourceName || null,
        ipAddress: body.ipAddress || null,
        userAgent: body.userAgent || null,
        extraData: body.extraData || null,
      })
      .returning();

    // 更新解决方案的计数器
    const updateField: Record<string, any> = { updatedAt: new Date() };
    
    switch (body.actionType) {
      case 'view':
        updateField.viewCount = sql`${solutions.viewCount} + 1`;
        break;
      case 'download':
        updateField.downloadCount = sql`${solutions.downloadCount} + 1`;
        break;
      case 'like':
        updateField.likeCount = sql`${solutions.likeCount} + 1`;
        break;
      case 'share':
        updateField.shareCount = sql`${solutions.shareCount} + 1`;
        break;
      case 'rating':
        if (body.rating !== undefined) {
          // 更新平均评分
          const currentRating = solution.rating || 0;
          const currentCount = solution.ratingCount || 0;
          const newCount = currentCount + 1;
          const newRating = ((currentRating * currentCount) + body.rating) / newCount;
          updateField.rating = newRating.toFixed(2);
          updateField.ratingCount = newCount;
        }
        break;
    }

    await db
      .update(solutions)
      .set(updateField)
      .where(eq(solutions.id, solutionId));

    return NextResponse.json({
      message: 'Statistics recorded',
      data: stat,
    });
  } catch (error) {
    console.error('Error recording statistics:', error);
    return NextResponse.json(
      { error: 'Failed to record statistics' },
      { status: 500 }
    );
  }
}
