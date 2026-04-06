import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { staffProjectRelations } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { authenticate } from '@/lib/auth';

// PUT /api/staff/relations/projects/[id] - 更新人员项目关联
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
      .from(staffProjectRelations)
      .where(eq(staffProjectRelations.id, id))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: 'Staff project relation not found' },
        { status: 404 }
      );
    }

    const updateData: any = {};
    const allowedFields = [
      'role', 'responsibility', 'joinDate', 'leaveDate',
      'workloadPercentage', 'contributionScore', 'performance',
      'feedback', 'isPrimary',
    ];

    allowedFields.forEach((field) => {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    });

    const [updated] = await db
      .update(staffProjectRelations)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(staffProjectRelations.id, id))
      .returning();

    return NextResponse.json({
      message: 'Staff project relation updated successfully',
      data: updated,
    });
  } catch (error) {
    console.error('Error updating staff project relation:', error);
    return NextResponse.json(
      { error: 'Failed to update staff project relation' },
      { status: 500 }
    );
  }
}

// DELETE /api/staff/relations/projects/[id] - 删除人员项目关联
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
      .delete(staffProjectRelations)
      .where(eq(staffProjectRelations.id, id))
      .returning();

    return NextResponse.json({
      message: 'Staff project relation deleted successfully',
      data: deleted,
    });
  } catch (error) {
    console.error('Error deleting staff project relation:', error);
    return NextResponse.json(
      { error: 'Failed to delete staff project relation' },
      { status: 500 }
    );
  }
}
