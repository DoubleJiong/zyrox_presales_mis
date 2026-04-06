import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { projectRisks, users, projects } from '@/db/schema';
import { eq, desc, and, count, isNull } from 'drizzle-orm';
import { withAuth } from '@/lib/auth-middleware';
import { errorResponse } from '@/lib/api-response';

// 风险等级配置
const RISK_LEVELS = {
  low: { name: '低风险', color: 'emerald', icon: 'shield-check' },
  medium: { name: '中风险', color: 'amber', icon: 'alert-circle' },
  high: { name: '高风险', color: 'orange', icon: 'alert-triangle' },
  critical: { name: '严重风险', color: 'rose', icon: 'flame' },
} as const;

// 检查项目是否存在且未被删除
async function checkProjectExists(projectId: number): Promise<boolean> {
  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(
      eq(projects.id, projectId),
      isNull(projects.deletedAt)
    ))
    .limit(1);
  return !!project;
}

// 获取风险评估列表
export const GET = withAuth(async (
  request: NextRequest,
  context: { userId: number; params?: Record<string, string> }
) => {
  try {
    const projectId = parseInt(context.params?.id || '0');

    if (isNaN(projectId)) {
      return NextResponse.json({ success: false, error: '无效的项目ID' }, { status: 400 });
    }

    // 检查项目是否存在
    if (!(await checkProjectExists(projectId))) {
      return NextResponse.json({ success: false, error: '项目不存在' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const riskLevel = searchParams.get('riskLevel');
    const status = searchParams.get('status');

    // 构建查询条件
    const conditions = [eq(projectRisks.projectId, projectId)];
    if (riskLevel) {
      conditions.push(eq(projectRisks.riskLevel, riskLevel));
    }
    if (status) {
      conditions.push(eq(projectRisks.status, status));
    }

    const risks = await db
      .select()
      .from(projectRisks)
      .where(and(...conditions))
      .orderBy(desc(projectRisks.riskLevel), desc(projectRisks.createdAt));

    // 统计各等级风险数量
    const stats = await db
      .select({
        riskLevel: projectRisks.riskLevel,
        count: count(),
      })
      .from(projectRisks)
      .where(eq(projectRisks.projectId, projectId))
      .groupBy(projectRisks.riskLevel);

    const statsMap = stats.reduce((acc, s) => {
      acc[s.riskLevel] = s.count;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      success: true,
      data: risks,
      stats: statsMap,
      riskLevels: RISK_LEVELS,
    });
  } catch (error) {
    console.error('Failed to fetch risks:', error);
    return NextResponse.json({ success: false, error: '获取风险评估失败' }, { status: 500 });
  }
});

// 添加风险评估
export const POST = withAuth(async (
  request: NextRequest,
  context: { userId: number; params?: Record<string, string> }
) => {
  try {
    const projectId = parseInt(context.params?.id || '0');

    if (isNaN(projectId)) {
      return NextResponse.json({ success: false, error: '无效的项目ID' }, { status: 400 });
    }

    // 检查项目是否存在
    if (!(await checkProjectExists(projectId))) {
      return NextResponse.json({ success: false, error: '项目不存在' }, { status: 404 });
    }

    const body = await request.json();
    const { riskDescription, riskLevel, riskSource, alertId } = body;

    if (!riskDescription || !riskLevel) {
      return NextResponse.json({ success: false, error: '请填写完整信息' }, { status: 400 });
    }

    if (!RISK_LEVELS[riskLevel as keyof typeof RISK_LEVELS]) {
      return NextResponse.json({ success: false, error: '不支持的风险等级' }, { status: 400 });
    }

    // 获取当前用户信息
    const [user] = await db
      .select({ realName: users.realName })
      .from(users)
      .where(eq(users.id, context.userId))
      .limit(1);

    const [newRisk] = await db
      .insert(projectRisks)
      .values({
        projectId,
        riskDescription,
        riskLevel,
        riskSource: riskSource || 'manual',
        alertId: alertId || null,
        status: 'active',
        createdBy: context.userId,
        createdByName: user?.realName || null,
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: newRisk,
      message: '风险已添加',
    });
  } catch (error) {
    console.error('Failed to add risk:', error);
    return NextResponse.json({ success: false, error: '添加风险失败' }, { status: 500 });
  }
});

// 更新风险评估
export const PUT = withAuth(async (
  request: NextRequest,
  context: { userId: number; params?: Record<string, string> }
) => {
  try {
    const projectId = parseInt(context.params?.id || '0');

    if (isNaN(projectId)) {
      return NextResponse.json({ success: false, error: '无效的项目ID' }, { status: 400 });
    }

    // 检查项目是否存在
    if (!(await checkProjectExists(projectId))) {
      return NextResponse.json({ success: false, error: '项目不存在' }, { status: 404 });
    }

    const body = await request.json();
    const { riskId, riskDescription, riskLevel, status, resolution } = body;

    if (!riskId) {
      return NextResponse.json({ success: false, error: '缺少风险记录ID' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (riskDescription) updateData.riskDescription = riskDescription;
    if (riskLevel) updateData.riskLevel = riskLevel;
    if (status) updateData.status = status;
    if (resolution) {
      updateData.resolution = resolution;
      updateData.resolvedBy = context.userId;
      updateData.resolvedAt = new Date();
    }

    const [updatedRisk] = await db
      .update(projectRisks)
      .set(updateData)
      .where(eq(projectRisks.id, riskId))
      .returning();

    return NextResponse.json({
      success: true,
      data: updatedRisk,
      message: '风险已更新',
    });
  } catch (error) {
    console.error('Failed to update risk:', error);
    return NextResponse.json({ success: false, error: '更新风险失败' }, { status: 500 });
  }
});

// 删除风险评估
export const DELETE = withAuth(async (
  request: NextRequest,
  context: { userId: number; params?: Record<string, string> }
) => {
  try {
    const projectId = parseInt(context.params?.id || '0');

    if (isNaN(projectId)) {
      return NextResponse.json({ success: false, error: '无效的项目ID' }, { status: 400 });
    }

    // 检查项目是否存在
    if (!(await checkProjectExists(projectId))) {
      return NextResponse.json({ success: false, error: '项目不存在' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const riskId = searchParams.get('riskId');

    if (!riskId) {
      return NextResponse.json({ success: false, error: '缺少风险记录ID' }, { status: 400 });
    }

    await db.delete(projectRisks).where(eq(projectRisks.id, parseInt(riskId)));

    return NextResponse.json({
      success: true,
      message: '风险已删除',
    });
  } catch (error) {
    console.error('Failed to delete risk:', error);
    return NextResponse.json({ success: false, error: '删除风险失败' }, { status: 500 });
  }
});
