import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { staffActivities } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { authenticate } from '@/lib/auth';

// GET /api/staff/activities/[id] - 获取单个人员动态详情
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
    const id = parseInt(idParam);

    const [activity] = await db
      .select()
      .from(staffActivities)
      .where(eq(staffActivities.id, id))
      .limit(1);

    if (!activity) {
      return NextResponse.json(
        { error: 'Staff activity not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: activity });
  } catch (error) {
    console.error('Error fetching staff activity:', error);
    return NextResponse.json(
      { error: 'Failed to fetch staff activity' },
      { status: 500 }
    );
  }
}

// PUT /api/staff/activities/[id] - 更新人员动态
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
      .from(staffActivities)
      .where(eq(staffActivities.id, id))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: 'Staff activity not found' },
        { status: 404 }
      );
    }

    const updateData: any = {};
    const allowedFields = [
      'activityType', 'activityTitle', 'description', 'projectId',
      'customerId', 'solutionId', 'activityDate', 'duration', 'location',
      'participants', 'outcome', 'nextStep', 'attachments', 'visibility', 'tags',
    ];

    allowedFields.forEach((field) => {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    });

    const [updated] = await db
      .update(staffActivities)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(staffActivities.id, id))
      .returning();

    return NextResponse.json({
      message: 'Staff activity updated successfully',
      data: updated,
    });
  } catch (error) {
    console.error('Error updating staff activity:', error);
    return NextResponse.json(
      { error: 'Failed to update staff activity' },
      { status: 500 }
    );
  }
}

// DELETE /api/staff/activities/[id] - 删除人员动态
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
      .delete(staffActivities)
      .where(eq(staffActivities.id, id))
      .returning();

    return NextResponse.json({
      message: 'Staff activity deleted successfully',
      data: deleted,
    });
  } catch (error) {
    console.error('Error deleting staff activity:', error);
    return NextResponse.json(
      { error: 'Failed to delete staff activity' },
      { status: 500 }
    );
  }
}
