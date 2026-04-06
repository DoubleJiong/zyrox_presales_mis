import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { staffRegionRelations } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { authenticate } from '@/lib/auth';

// PUT /api/staff/relations/regions/[id] - 更新人员区域关联
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
      .from(staffRegionRelations)
      .where(eq(staffRegionRelations.id, id))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: 'Staff region relation not found' },
        { status: 404 }
      );
    }

    const updateData: any = {};
    const allowedFields = [
      'region', 'regionLevel', 'isPrimary', 'expertiseLevel',
      'startDate', 'endDate', 'notes',
    ];

    allowedFields.forEach((field) => {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    });

    const [updated] = await db
      .update(staffRegionRelations)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(staffRegionRelations.id, id))
      .returning();

    return NextResponse.json({
      message: 'Staff region relation updated successfully',
      data: updated,
    });
  } catch (error) {
    console.error('Error updating staff region relation:', error);
    return NextResponse.json(
      { error: 'Failed to update staff region relation' },
      { status: 500 }
    );
  }
}

// DELETE /api/staff/relations/regions/[id] - 删除人员区域关联
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
      .delete(staffRegionRelations)
      .where(eq(staffRegionRelations.id, id))
      .returning();

    return NextResponse.json({
      message: 'Staff region relation deleted successfully',
      data: deleted,
    });
  } catch (error) {
    console.error('Error deleting staff region relation:', error);
    return NextResponse.json(
      { error: 'Failed to delete staff region relation' },
      { status: 500 }
    );
  }
}
