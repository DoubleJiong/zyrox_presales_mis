import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth';
import { getUserSolutionPermission } from '@/lib/solution-permissions';

// GET /api/solutions/[id]/permissions - 获取当前用户对该方案的权限
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

    const permission = await getUserSolutionPermission(user.id, solutionId);
    
    return NextResponse.json(permission);
  } catch (error) {
    console.error('Error fetching permissions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch permissions' },
      { status: 500 }
    );
  }
}
