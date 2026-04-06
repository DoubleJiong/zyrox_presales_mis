import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { staffSolutionRelations, solutions, users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { authenticate } from '@/lib/auth';

// GET /api/staff/relations/solutions - 获取人员解决方案关联列表
export async function GET(req: NextRequest) {
  try {
    const user = await authenticate(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const staffId = searchParams.get('staffId');
    const solutionId = searchParams.get('solutionId');
    const role = searchParams.get('role');
    const approvalStatus = searchParams.get('approvalStatus');

    const conditions = [];
    
    if (staffId) {
      conditions.push(eq(staffSolutionRelations.staffId, parseInt(staffId)));
    }
    
    if (solutionId) {
      conditions.push(eq(staffSolutionRelations.solutionId, parseInt(solutionId)));
    }
    
    if (role) {
      conditions.push(eq(staffSolutionRelations.role, role));
    }
    
    if (approvalStatus) {
      conditions.push(eq(staffSolutionRelations.approvalStatus, approvalStatus));
    }

    const data = await db
      .select({
        id: staffSolutionRelations.id,
        staffId: staffSolutionRelations.staffId,
        solutionId: staffSolutionRelations.solutionId,
        role: staffSolutionRelations.role,
        contribution: staffSolutionRelations.contribution,
        contributionDate: staffSolutionRelations.contributionDate,
        contributionHours: staffSolutionRelations.contributionHours,
        expertiseArea: staffSolutionRelations.expertiseArea,
        approvalStatus: staffSolutionRelations.approvalStatus,
        notes: staffSolutionRelations.notes,
        createdAt: staffSolutionRelations.createdAt,
        updatedAt: staffSolutionRelations.updatedAt,
        // 解决方案信息
        solutionName: solutions.solutionName,
        solutionCode: solutions.solutionCode,
        version: solutions.version,
        solutionStatus: solutions.status,
        // 人员信息
        staffName: users.realName,
      })
      .from(staffSolutionRelations)
      .leftJoin(solutions, eq(staffSolutionRelations.solutionId, solutions.id))
      .leftJoin(users, eq(staffSolutionRelations.staffId, users.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(staffSolutionRelations.createdAt);

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error fetching staff solution relations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch staff solution relations' },
      { status: 500 }
    );
  }
}

// POST /api/staff/relations/solutions - 创建人员解决方案关联
export async function POST(req: NextRequest) {
  try {
    const user = await authenticate(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    
    if (!body.staffId || !body.solutionId || !body.role || !body.contributionDate) {
      return NextResponse.json(
        { error: 'staffId, solutionId, role, and contributionDate are required' },
        { status: 400 }
      );
    }

    const existing = await db
      .select()
      .from(staffSolutionRelations)
      .where(
        and(
          eq(staffSolutionRelations.staffId, body.staffId),
          eq(staffSolutionRelations.solutionId, body.solutionId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'Staff solution relation already exists' },
        { status: 409 }
      );
    }

    const [newRelation] = await db
      .insert(staffSolutionRelations)
      .values({
        staffId: body.staffId,
        solutionId: body.solutionId,
        role: body.role,
        contribution: body.contribution || null,
        contributionDate: body.contributionDate,
        contributionHours: body.contributionHours || null,
        expertiseArea: body.expertiseArea || null,
        approvalStatus: body.approvalStatus || 'approved',
        notes: body.notes || null,
      })
      .returning();

    return NextResponse.json({
      message: 'Staff solution relation created successfully',
      data: newRelation,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating staff solution relation:', error);
    return NextResponse.json(
      { error: 'Failed to create staff solution relation' },
      { status: 500 }
    );
  }
}
