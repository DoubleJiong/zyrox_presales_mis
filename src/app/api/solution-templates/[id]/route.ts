/**
 * 单个方案模板 API
 * 
 * 功能：
 * - 获取模板详情
 * - 更新模板
 * - 删除模板
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { solutions } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

// 获取模板详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [template] = await db
      .select()
      .from(solutions)
      .where(and(
        eq(solutions.id, parseInt(id)),
        eq(solutions.isTemplate, true)
      ))
      .limit(1);

    if (!template) {
      return NextResponse.json(
        { success: false, error: '模板不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: template,
    });
  } catch (error) {
    console.error('获取模板详情失败:', error);
    return NextResponse.json(
      { success: false, error: '获取模板详情失败' },
      { status: 500 }
    );
  }
}

// 更新模板
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const [existingTemplate] = await db
      .select()
      .from(solutions)
      .where(and(
        eq(solutions.id, parseInt(id)),
        eq(solutions.isTemplate, true)
      ))
      .limit(1);

    if (!existingTemplate) {
      return NextResponse.json(
        { success: false, error: '模板不存在' },
        { status: 404 }
      );
    }

    // 构建更新数据
    const updateData: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (body.solutionName) updateData.solutionName = body.solutionName;
    if (body.templateCategory) updateData.templateCategory = body.templateCategory;
    if (body.templateScope) updateData.templateScope = body.templateScope;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.version) updateData.version = body.version;
    if (body.solutionType) updateData.solutionType = body.solutionType;
    if (body.industry) updateData.industry = body.industry;
    if (body.technologies) updateData.technologies = body.technologies;
    if (body.features) updateData.features = body.features;
    if (body.architecture) updateData.architecture = body.architecture;
    if (body.implementationGuide) updateData.implementationGuide = body.implementationGuide;
    if (body.estimatedCost) updateData.estimatedCost = body.estimatedCost;
    if (body.estimatedDuration) updateData.estimatedDuration = body.estimatedDuration;
    if (body.riskAssessment) updateData.riskAssessment = body.riskAssessment;

    const [updatedTemplate] = await db
      .update(solutions)
      .set(updateData)
      .where(eq(solutions.id, parseInt(id)))
      .returning();

    return NextResponse.json({
      success: true,
      data: updatedTemplate,
      message: '模板更新成功',
    });
  } catch (error) {
    console.error('更新模板失败:', error);
    return NextResponse.json(
      { success: false, error: '更新模板失败' },
      { status: 500 }
    );
  }
}

// 删除模板
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [existingTemplate] = await db
      .select()
      .from(solutions)
      .where(and(
        eq(solutions.id, parseInt(id)),
        eq(solutions.isTemplate, true)
      ))
      .limit(1);

    if (!existingTemplate) {
      return NextResponse.json(
        { success: false, error: '模板不存在' },
        { status: 404 }
      );
    }

    // 检查是否被使用
    if (existingTemplate.templateUsageCount && existingTemplate.templateUsageCount > 0) {
      return NextResponse.json(
        { success: false, error: '该模板已被使用，无法删除' },
        { status: 400 }
      );
    }

    await db.delete(solutions).where(eq(solutions.id, parseInt(id)));

    return NextResponse.json({
      success: true,
      message: '模板删除成功',
    });
  } catch (error) {
    console.error('删除模板失败:', error);
    return NextResponse.json(
      { success: false, error: '删除模板失败' },
      { status: 500 }
    );
  }
}
