import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { solutions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { authenticate } from '@/lib/auth';

// POST /api/solutions/[id]/set-as-template - 将方案设置为模板
export async function POST(
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
    
    // 安全解析请求体，支持空body
    let body: { templateCategory?: string; templateScope?: string } = {};
    try {
      const text = await req.text();
      if (text && text.trim()) {
        body = JSON.parse(text);
      }
    } catch {
      // 忽略JSON解析错误，使用默认值
    }

    // 获取方案
    const [solution] = await db
      .select()
      .from(solutions)
      .where(eq(solutions.id, solutionId))
      .limit(1);

    if (!solution) {
      return NextResponse.json({ error: 'Solution not found' }, { status: 404 });
    }

    // 检查权限：只有作者可以将方案设为模板
    if (solution.authorId !== user.id) {
      return NextResponse.json(
        { error: 'Only the author can set this solution as a template' },
        { status: 403 }
      );
    }

    // 检查方案状态：只有已发布的方案可以设为模板
    if (solution.status !== 'published' && solution.status !== 'approved') {
      return NextResponse.json(
        { error: 'Only published solutions can be set as templates' },
        { status: 400 }
      );
    }

    // 更新方案为模板
    const [updated] = await db
      .update(solutions)
      .set({
        isTemplate: true,
        templateCategory: body.templateCategory || 'standard',
        templateScope: body.templateScope || 'company',
        updatedAt: new Date(),
      })
      .where(eq(solutions.id, solutionId))
      .returning();

    return NextResponse.json({
      message: 'Solution set as template successfully',
      data: updated,
    });
  } catch (error) {
    console.error('Error setting solution as template:', error);
    return NextResponse.json(
      { error: 'Failed to set solution as template' },
      { status: 500 }
    );
  }
}

// DELETE /api/solutions/[id]/set-as-template - 取消模板状态
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
    const solutionId = parseInt(idParam);

    // 获取方案
    const [solution] = await db
      .select()
      .from(solutions)
      .where(eq(solutions.id, solutionId))
      .limit(1);

    if (!solution) {
      return NextResponse.json({ error: 'Solution not found' }, { status: 404 });
    }

    // 检查权限
    if (solution.authorId !== user.id) {
      return NextResponse.json(
        { error: 'Only the author can remove template status' },
        { status: 403 }
      );
    }

    // 取消模板状态
    const [updated] = await db
      .update(solutions)
      .set({
        isTemplate: false,
        templateCategory: null,
        updatedAt: new Date(),
      })
      .where(eq(solutions.id, solutionId))
      .returning();

    return NextResponse.json({
      message: 'Template status removed successfully',
      data: updated,
    });
  } catch (error) {
    console.error('Error removing template status:', error);
    return NextResponse.json(
      { error: 'Failed to remove template status' },
      { status: 500 }
    );
  }
}
