import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { projects, projectSettlements } from '@/db/schema';
import { eq } from 'drizzle-orm';

function getArchivedProjectStatus(currentStatus: string, bidResult: string | null) {
  if (bidResult === 'won' || bidResult === 'lost') {
    return bidResult;
  }

  return 'archived';
}

// POST - 归档项目
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const [project] = await db
      .select({ status: projects.status, bidResult: projects.bidResult })
      .from(projects)
      .where(eq(projects.id, parseInt(id)))
      .limit(1);

    if (!project) {
      return NextResponse.json(
        { success: false, error: '项目不存在' },
        { status: 404 }
      );
    }

    // 更新项目状态
    const [updatedProject] = await db
      .update(projects)
      .set({
        projectStage: 'archived',
        status: getArchivedProjectStatus(project.status, project.bidResult),
        progress: 100,
        updatedAt: new Date(),
      })
      .where(eq(projects.id, parseInt(id)))
      .returning();

    // 更新结算归档状态
    await db
      .update(projectSettlements)
      .set({
        archiveStatus: 'archived',
        archivedAt: new Date(),
        archivedBy: body.archivedBy || null,
      })
      .where(eq(projectSettlements.projectId, parseInt(id)));

    return NextResponse.json({
      success: true,
      data: updatedProject,
      message: '项目已归档',
    });
  } catch (error) {
    console.error('Failed to archive project:', error);
    return NextResponse.json(
      { success: false, error: '归档失败' },
      { status: 500 }
    );
  }
}
