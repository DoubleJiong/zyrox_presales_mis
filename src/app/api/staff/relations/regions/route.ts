import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { staffRegionRelations, users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { authenticate } from '@/lib/auth';

// GET /api/staff/relations/regions - 获取人员区域关联列表
export async function GET(req: NextRequest) {
  try {
    const user = await authenticate(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const staffId = searchParams.get('staffId');
    const region = searchParams.get('region');
    const regionLevel = searchParams.get('regionLevel');
    const isPrimary = searchParams.get('isPrimary');

    const conditions = [];
    
    if (staffId) {
      conditions.push(eq(staffRegionRelations.staffId, parseInt(staffId)));
    }
    
    if (region) {
      conditions.push(eq(staffRegionRelations.region, region));
    }
    
    if (regionLevel) {
      conditions.push(eq(staffRegionRelations.regionLevel, regionLevel));
    }
    
    if (isPrimary !== null) {
      conditions.push(eq(staffRegionRelations.isPrimary, isPrimary === 'true'));
    }

    const data = await db
      .select({
        id: staffRegionRelations.id,
        staffId: staffRegionRelations.staffId,
        region: staffRegionRelations.region,
        regionLevel: staffRegionRelations.regionLevel,
        isPrimary: staffRegionRelations.isPrimary,
        expertiseLevel: staffRegionRelations.expertiseLevel,
        startDate: staffRegionRelations.startDate,
        endDate: staffRegionRelations.endDate,
        notes: staffRegionRelations.notes,
        createdAt: staffRegionRelations.createdAt,
        updatedAt: staffRegionRelations.updatedAt,
        // 人员信息
        staffName: users.realName,
      })
      .from(staffRegionRelations)
      .leftJoin(users, eq(staffRegionRelations.staffId, users.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(staffRegionRelations.createdAt);

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error fetching staff region relations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch staff region relations' },
      { status: 500 }
    );
  }
}

// POST /api/staff/relations/regions - 创建人员区域关联
export async function POST(req: NextRequest) {
  try {
    const user = await authenticate(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    
    if (!body.staffId || !body.region || !body.regionLevel || !body.startDate) {
      return NextResponse.json(
        { error: 'staffId, region, regionLevel, and startDate are required' },
        { status: 400 }
      );
    }

    const existing = await db
      .select()
      .from(staffRegionRelations)
      .where(
        and(
          eq(staffRegionRelations.staffId, body.staffId),
          eq(staffRegionRelations.region, body.region)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'Staff region relation already exists' },
        { status: 409 }
      );
    }

    const [newRelation] = await db
      .insert(staffRegionRelations)
      .values({
        staffId: body.staffId,
        region: body.region,
        regionLevel: body.regionLevel,
        isPrimary: body.isPrimary || false,
        expertiseLevel: body.expertiseLevel || null,
        startDate: body.startDate,
        endDate: body.endDate || null,
        notes: body.notes || null,
      })
      .returning();

    return NextResponse.json({
      message: 'Staff region relation created successfully',
      data: newRelation,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating staff region relation:', error);
    return NextResponse.json(
      { error: 'Failed to create staff region relation' },
      { status: 500 }
    );
  }
}
