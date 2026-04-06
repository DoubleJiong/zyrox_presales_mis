import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { staffCustomerRelations } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { authenticate } from '@/lib/auth';

// PUT /api/staff/relations/customers/[id] - 更新人员客户关联
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
      .from(staffCustomerRelations)
      .where(eq(staffCustomerRelations.id, id))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: 'Staff customer relation not found' },
        { status: 404 }
      );
    }

    const updateData: any = {};
    const allowedFields = [
      'role', 'relationshipLevel', 'startDate', 'endDate',
      'lastContactDate', 'contactFrequency', 'customerSatisfaction', 'notes',
    ];

    allowedFields.forEach((field) => {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    });

    const [updated] = await db
      .update(staffCustomerRelations)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(staffCustomerRelations.id, id))
      .returning();

    return NextResponse.json({
      message: 'Staff customer relation updated successfully',
      data: updated,
    });
  } catch (error) {
    console.error('Error updating staff customer relation:', error);
    return NextResponse.json(
      { error: 'Failed to update staff customer relation' },
      { status: 500 }
    );
  }
}

// DELETE /api/staff/relations/customers/[id] - 删除人员客户关联
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
      .delete(staffCustomerRelations)
      .where(eq(staffCustomerRelations.id, id))
      .returning();

    return NextResponse.json({
      message: 'Staff customer relation deleted successfully',
      data: deleted,
    });
  } catch (error) {
    console.error('Error deleting staff customer relation:', error);
    return NextResponse.json(
      { error: 'Failed to delete staff customer relation' },
      { status: 500 }
    );
  }
}
