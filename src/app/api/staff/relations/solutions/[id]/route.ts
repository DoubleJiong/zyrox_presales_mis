import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { staffSolutionRelations } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { authenticate } from '@/lib/auth';

// PUT /api/staff/relations/solutions/[id] - 更新人员解决方案关联
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: idParam } = await params;
    const id = parseInt(idParam);
    const body = await req.json();

    const existing = await db
      .select()
      .from(staffSolutionRelations)
      .where(eq(staffSolutionRelations.id, id))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: 'Staff solution relation not found' },
        { status: 404 }
      );
    }

    const updateData: any = {};
    const allowedFields = [
      'role', 'contribution', 'contributionDate', 'contributionHours',
      'expertiseArea', 'approvalStatus', 'notes',
    ];

    allowedFields.forEach((field) => {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    });

    const [updated] = await db
      .update(staffSolutionRelations)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(staffSolutionRelations.id, id))
      .returning();

    return NextResponse.json({
      message: 'Staff solution relation updated successfully',
      data: updated,
    });
  } catch (error) {
    console.error('Error updating staff solution relation:', error);
    return NextResponse.json(
      { error: 'Failed to update staff solution relation' },
      { status: 500 }
    );
  }
}

// DELETE /api/staff/relations/solutions/[id] - 删除人员解决方案关联
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: idParam } = await params;
    const id = parseInt(idParam);

    const [deleted] = await db
      .delete(staffSolutionRelations)
      .where(eq(staffSolutionRelations.id, id))
      .returning();

    return NextResponse.json({
      message: 'Staff solution relation deleted successfully',
      data: deleted,
    });
  } catch (error) {
    console.error('Error deleting staff solution relation:', error);
    return NextResponse.json(
      { error: 'Failed to delete staff solution relation' },
      { status: 500 }
    );
  }
}
