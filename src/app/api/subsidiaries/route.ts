import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { subsidiaries } from '@/db/schema';
import { eq, isNull, and, asc } from 'drizzle-orm';
import { successResponse, errorResponse } from '@/lib/api-response';

// GET - 获取分子公司列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const companyType = searchParams.get('companyType');
    const simple = searchParams.get('simple') === 'true';

    // 构建查询条件
    const conditions = [isNull(subsidiaries.deletedAt)];
    if (status) {
      conditions.push(eq(subsidiaries.status, status));
    }
    if (companyType && companyType !== 'all') {
      conditions.push(eq(subsidiaries.companyType, companyType));
    }

    const list = await db
      .select()
      .from(subsidiaries)
      .where(and(...conditions))
      .orderBy(asc(subsidiaries.subsidiaryName));

    // 简单格式返回（用于下拉选择）
    if (simple) {
      return successResponse(list.map(item => ({
        id: item.id,
        code: item.subsidiaryCode,
        name: item.subsidiaryName,
      })));
    }

    return successResponse(list);
  } catch (error) {
    console.error('Failed to fetch subsidiaries:', error);
    return errorResponse('INTERNAL_ERROR', '获取分子公司列表失败');
  }
}

// POST - 创建分子公司
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { subsidiaryCode, subsidiaryName, companyType, regions, address, contactPerson, contactPhone, status } = body;

    if (!subsidiaryCode || !subsidiaryName) {
      return errorResponse('BAD_REQUEST', '编码和名称为必填项');
    }

    const [created] = await db
      .insert(subsidiaries)
      .values({
        subsidiaryCode,
        subsidiaryName,
        companyType: companyType || 'sales_branch',
        regions: regions || [],
        address: address || null,
        contactPerson: contactPerson || null,
        contactPhone: contactPhone || null,
        status: status || 'active',
      })
      .returning();

    return successResponse(created, { status: 201 });
  } catch (error) {
    console.error('Failed to create subsidiary:', error);
    return errorResponse('INTERNAL_ERROR', '创建分子公司失败');
  }
}

// PUT - 更新分子公司
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, subsidiaryCode, subsidiaryName, companyType, regions, address, contactPerson, contactPhone, status } = body;

    if (!id) {
      return errorResponse('BAD_REQUEST', '分子公司ID为必填项');
    }

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (subsidiaryCode !== undefined) updateData.subsidiaryCode = subsidiaryCode;
    if (subsidiaryName !== undefined) updateData.subsidiaryName = subsidiaryName;
    if (companyType !== undefined) updateData.companyType = companyType;
    if (regions !== undefined) updateData.regions = regions;
    if (address !== undefined) updateData.address = address;
    if (contactPerson !== undefined) updateData.contactPerson = contactPerson;
    if (contactPhone !== undefined) updateData.contactPhone = contactPhone;
    if (status !== undefined) updateData.status = status;

    const [updated] = await db
      .update(subsidiaries)
      .set(updateData)
      .where(and(
        eq(subsidiaries.id, id),
        isNull(subsidiaries.deletedAt)
      ))
      .returning();

    if (!updated) {
      return errorResponse('NOT_FOUND', '分子公司不存在');
    }

    return successResponse(updated);
  } catch (error) {
    console.error('Failed to update subsidiary:', error);
    return errorResponse('INTERNAL_ERROR', '更新分子公司失败');
  }
}

// DELETE - 删除分子公司（软删除）
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get('id') || '');

    if (!id) {
      return errorResponse('BAD_REQUEST', '分子公司ID为必填项');
    }

    const [deleted] = await db
      .update(subsidiaries)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(
        eq(subsidiaries.id, id),
        isNull(subsidiaries.deletedAt)
      ))
      .returning({ id: subsidiaries.id });

    if (!deleted) {
      return errorResponse('NOT_FOUND', '分子公司不存在');
    }

    return successResponse({ success: true });
  } catch (error) {
    console.error('Failed to delete subsidiary:', error);
    return errorResponse('INTERNAL_ERROR', '删除分子公司失败');
  }
}
