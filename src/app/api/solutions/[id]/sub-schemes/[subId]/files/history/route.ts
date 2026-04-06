import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { solutionFiles, users } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { authenticate } from '@/lib/auth';

// GET /api/solutions/[id]/sub-schemes/[subId]/files/history - 获取版本历史
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

    // 获取所有版本的文件
    const files = await db
      .select({
        id: solutionFiles.id,
        fileName: solutionFiles.fileName,
        version: solutionFiles.version,
        isCurrent: solutionFiles.isCurrent,
        uploadedByName: users.realName,
        createdAt: solutionFiles.createdAt,
      })
      .from(solutionFiles)
      .leftJoin(users, eq(solutionFiles.uploadedBy, users.id))
      .where(eq(solutionFiles.subSchemeId, subSchemeId))
      .orderBy(desc(solutionFiles.createdAt));

    return NextResponse.json({ data: files });
  } catch (error) {
    console.error('Error fetching version history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch version history' },
      { status: 500 }
    );
  }
}
