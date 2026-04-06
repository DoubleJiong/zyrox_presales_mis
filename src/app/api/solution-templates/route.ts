/**
 * 方案模板管理 API
 * 
 * 功能：
 * - 获取模板列表（支持分类筛选、搜索）
 * - 创建模板
 * - 更新模板
 * - 删除模板
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { solutions } from '@/db/schema';
import { eq, like, and, or, desc, sql } from 'drizzle-orm';

// 获取模板列表
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');
    const scope = searchParams.get('scope');
    const keyword = searchParams.get('keyword');

    // 构建查询条件
    const conditions = [eq(solutions.isTemplate, true)];
    
    if (category) {
      conditions.push(eq(solutions.templateCategory, category));
    }
    
    if (scope) {
      conditions.push(eq(solutions.templateScope, scope));
    }
    
    if (keyword) {
      conditions.push(
        or(
          like(solutions.solutionName, `%${keyword}%`),
          like(solutions.solutionCode, `%${keyword}%`)
        )!
      );
    }

    const templateList = await db
      .select({
        id: solutions.id,
        solutionCode: solutions.solutionCode,
        solutionName: solutions.solutionName,
        version: solutions.version,
        templateCategory: solutions.templateCategory,
        templateScope: solutions.templateScope,
        templateUsageCount: solutions.templateUsageCount,
        createdAt: solutions.createdAt,
        updatedAt: solutions.updatedAt,
      })
      .from(solutions)
      .where(and(...conditions))
      .orderBy(desc(solutions.templateUsageCount), desc(solutions.createdAt));

    return NextResponse.json({
      success: true,
      data: templateList,
    });
  } catch (error) {
    console.error('获取模板列表失败:', error);
    return NextResponse.json(
      { success: false, error: '获取模板列表失败' },
      { status: 500 }
    );
  }
}

// 创建模板
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      sourceSolutionId,
      templateCategory,
      templateScope,
      solutionName,
      solutionCode,
      description,
      version,
      // 继承其他属性...
    } = body;

    // 如果是从现有方案创建模板
    if (sourceSolutionId) {
      const [sourceSolution] = await db
        .select()
        .from(solutions)
        .where(eq(solutions.id, sourceSolutionId))
        .limit(1);

      if (!sourceSolution) {
        return NextResponse.json(
          { success: false, error: '源方案不存在' },
          { status: 404 }
        );
      }

      // 创建新模板
      const [newTemplate] = await db
        .insert(solutions)
        .values({
          solutionCode: solutionCode || `TPL-${Date.now()}`,
          solutionName: solutionName || `${sourceSolution.solutionName}（模板）`,
          version: version || '1.0',
          status: 'active',
          isTemplate: true,
          templateCategory: templateCategory || 'standard',
          templateScope: templateScope || 'company',
          templateUsageCount: 0,
          description: description || sourceSolution.description,
          // 继承源方案的其他属性
          solutionType: sourceSolution.solutionType,
          industry: sourceSolution.industry,
          technologies: sourceSolution.technologies,
          features: sourceSolution.features,
          architecture: sourceSolution.architecture,
          implementationGuide: sourceSolution.implementationGuide,
          estimatedCost: sourceSolution.estimatedCost,
          estimatedDuration: sourceSolution.estimatedDuration,
          riskAssessment: sourceSolution.riskAssessment,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      return NextResponse.json({
        success: true,
        data: newTemplate,
        message: '模板创建成功',
      });
    }

    // 直接创建新模板
    const [newTemplate] = await db
      .insert(solutions)
      .values({
        solutionCode: solutionCode || `TPL-${Date.now()}`,
        solutionName,
        version: version || '1.0',
        status: 'active',
        isTemplate: true,
        templateCategory: templateCategory || 'standard',
        templateScope: templateScope || 'company',
        templateUsageCount: 0,
        description,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: newTemplate,
      message: '模板创建成功',
    });
  } catch (error) {
    console.error('创建模板失败:', error);
    return NextResponse.json(
      { success: false, error: '创建模板失败' },
      { status: 500 }
    );
  }
}
