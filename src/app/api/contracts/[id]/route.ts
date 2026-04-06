import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { contracts, customers, projects, users, contractBids, contractAcceptances, contractItems } from '@/db/schema';
import { eq, isNull, desc, sql, and } from 'drizzle-orm';
import { errorResponse, notFoundResponse, successResponse } from '@/lib/api-response';
import { syncProjectContractSnapshots } from '@/lib/project-contract-sync';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/contracts/:id
 * 获取合同详情
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const contractId = parseInt(id);

    if (isNaN(contractId) || contractId <= 0) {
      return errorResponse('BAD_REQUEST', '无效的合同ID');
    }

    // 查询合同基本信息
    const [contract] = await db
      .select({
        id: contracts.id,
        contractCode: contracts.contractCode,
        contractName: contracts.contractName,
        contractScanName: contracts.contractScanName,
        contractStatus: contracts.contractStatus,
        processStatus: contracts.processStatus,
        signMode: contracts.signMode,
        signerUnit: contracts.signerUnit,
        userUnit: contracts.userUnit,
        userUnitId: contracts.userUnitId,
        projectId: contracts.projectId,
        projectCode: contracts.projectCode,
        customerId: contracts.customerId,
        department: contracts.department,
        contractAmount: contracts.contractAmount,
        warrantyAmount: contracts.warrantyAmount,
        signDate: contracts.signDate,
        warrantyYears: contracts.warrantyYears,
        requireCompleteDate: contracts.requireCompleteDate,
        acceptanceDate: contracts.acceptanceDate,
        entryDate: contracts.entryDate,
        signerId: contracts.signerId,
        signerName: contracts.signerName,
        userType: contracts.userType,
        projectCategory: contracts.projectCategory,
        fundSource: contracts.fundSource,
        bank: contracts.bank,
        isNewCustomer: contracts.isNewCustomer,
        projectAddress: contracts.projectAddress,
        remark: contracts.remark,
        attachments: contracts.attachments,
        bidNoticeFile: contracts.bidNoticeFile,
        acceptanceFile: contracts.acceptanceFile,
        createdBy: contracts.createdBy,
        createdAt: contracts.createdAt,
        updatedAt: contracts.updatedAt,
        // 关联信息
        projectName: projects.projectName,
        customerName: customers.customerName,
        userUnitName: sql<string>`u2.customer_name`,
      })
      .from(contracts)
      .leftJoin(projects, and(
        eq(contracts.projectId, projects.id),
        isNull(projects.deletedAt)
      ))
      .leftJoin(customers, and(
        eq(contracts.customerId, customers.id),
        isNull(customers.deletedAt)
      ))
      .leftJoin(sql`bus_customer u2`, sql`bus_contract.user_unit_id = u2.id`)
      .where(and(
        eq(contracts.id, contractId),
        isNull(contracts.deletedAt)
      ));

    if (!contract) {
      return notFoundResponse('合同不存在');
    }

    // 查询中标信息
    const bids = await db
      .select()
      .from(contractBids)
      .where(eq(contractBids.contractId, contractId))
      .orderBy(desc(contractBids.createdAt));

    // 查询验收报告
    const acceptances = await db
      .select()
      .from(contractAcceptances)
      .where(eq(contractAcceptances.contractId, contractId))
      .orderBy(desc(contractAcceptances.createdAt));

    // 查询合同清单
    const items = await db
      .select()
      .from(contractItems)
      .where(eq(contractItems.contractId, contractId))
      .orderBy(contractItems.sortOrder);

    return successResponse({
      ...contract,
      bids,
      acceptances,
      items,
    });
  } catch (error) {
    console.error('Failed to fetch contract:', error);
    return errorResponse('INTERNAL_ERROR', '获取合同详情失败');
  }
}

/**
 * PUT /api/contracts/:id
 * 更新合同
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const contractId = parseInt(id);
    const body = await request.json();

    // 检查合同是否存在
    const [existing] = await db
      .select()
      .from(contracts)
      .where(eq(contracts.id, contractId));

    if (!existing) {
      return notFoundResponse('合同不存在');
    }

    const nextProjectId = body.projectId ?? existing.projectId ?? null;

    // 检查是否为新客户
    let isNewCustomer = existing.isNewCustomer;
    if (body.userUnit && body.userUnit !== existing.userUnit) {
      const existingCustomer = await db
        .select()
        .from(customers)
        .where(eq(customers.customerName, body.userUnit))
        .limit(1);
      isNewCustomer = existingCustomer.length === 0;
    }

    // 更新合同
    const [updated] = await db
      .update(contracts)
      .set({
        contractName: body.contractName ?? existing.contractName,
        contractScanName: body.contractScanName ?? existing.contractScanName,
        contractStatus: body.contractStatus ?? existing.contractStatus,
        processStatus: body.processStatus ?? existing.processStatus,
        signMode: body.signMode ?? existing.signMode,
        signerUnit: body.signerUnit ?? existing.signerUnit,
        userUnit: body.userUnit ?? existing.userUnit,
        userUnitId: body.userUnitId ?? existing.userUnitId,
        projectId: body.projectId ?? existing.projectId,
        projectCode: body.projectCode ?? existing.projectCode,
        customerId: body.customerId ?? existing.customerId,
        department: body.department ?? existing.department,
        contractAmount: body.contractAmount ?? existing.contractAmount,
        warrantyAmount: body.warrantyAmount ?? existing.warrantyAmount,
        signDate: body.signDate ?? existing.signDate,
        warrantyYears: body.warrantyYears ?? existing.warrantyYears,
        requireCompleteDate: body.requireCompleteDate ?? existing.requireCompleteDate,
        acceptanceDate: body.acceptanceDate ?? existing.acceptanceDate,
        signerId: body.signerId ?? existing.signerId,
        signerName: body.signerName ?? existing.signerName,
        userType: body.userType ?? existing.userType,
        projectCategory: body.projectCategory ?? existing.projectCategory,
        fundSource: body.fundSource ?? existing.fundSource,
        bank: body.bank ?? existing.bank,
        isNewCustomer,
        projectAddress: body.projectAddress ?? existing.projectAddress,
        remark: body.remark ?? existing.remark,
        attachments: body.attachments ?? existing.attachments,
        bidNoticeFile: body.bidNoticeFile ?? existing.bidNoticeFile,
        acceptanceFile: body.acceptanceFile ?? existing.acceptanceFile,
        updatedAt: new Date(),
      })
      .where(eq(contracts.id, contractId))
      .returning();

    await syncProjectContractSnapshots([existing.projectId, nextProjectId]);

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error('Failed to update contract:', error);
    // 返回详细错误信息
    let errorMessage = '更新合同失败';
    if (error instanceof Error) {
      errorMessage = error.message;
      // 处理数据库唯一约束错误
      if (error.message.includes('duplicate key') || error.message.includes('unique')) {
        errorMessage = '合同编号已存在，请刷新后重试';
      } else if (error.message.includes('not null') || error.message.includes('null value')) {
        errorMessage = '必填字段缺失，请检查表单';
      } else if (error.message.includes('foreign key')) {
        errorMessage = '关联数据不存在，请检查关联的项目或客户';
      }
    }
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/contracts/:id
 * 删除合同（软删除）
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const contractId = parseInt(id);

    const [existing] = await db
      .select({ projectId: contracts.projectId })
      .from(contracts)
      .where(and(
        eq(contracts.id, contractId),
        isNull(contracts.deletedAt)
      ))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { success: false, error: '合同不存在' },
        { status: 404 }
      );
    }

    // 软删除合同
    const [deleted] = await db
      .update(contracts)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(contracts.id, contractId))
      .returning();

    await syncProjectContractSnapshots([existing.projectId]);

    return NextResponse.json({
      success: true,
      data: { id: deleted.id },
    });
  } catch (error) {
    console.error('Failed to delete contract:', error);
    return NextResponse.json(
      { success: false, error: '删除合同失败' },
      { status: 500 }
    );
  }
}
