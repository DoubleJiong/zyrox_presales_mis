import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { contracts, customers, projects, users } from '@/db/schema';
import { desc, eq, ilike, and, isNull, or, sql, count } from 'drizzle-orm';
import { validatePagination, successResponse, errorResponse } from '@/lib/api-response';
import { withAuth } from '@/lib/auth-middleware';
import { syncProjectContractSnapshot } from '@/lib/project-contract-sync';

/**
 * GET /api/contracts
 * 获取合同列表（支持分页、筛选）
 * 已修复：添加认证中间件保护
 */
export const GET = withAuth(async (request: NextRequest, { userId }) => {
  try {
    const { searchParams } = new URL(request.url);
    
    // BUG-028: 验证分页参数
    const pagination = validatePagination(
      searchParams.get('page'),
      searchParams.get('pageSize')
    );
    
    if (!pagination.valid) {
      return errorResponse('BAD_REQUEST', pagination.error || '分页参数无效');
    }
    
    const { page, pageSize, offset } = pagination;
    
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const signMode = searchParams.get('signMode') || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';

    // 构建查询条件
    const conditions = [isNull(contracts.deletedAt)];
    
    if (search) {
      conditions.push(
        or(
          ilike(contracts.contractCode, `%${search}%`),
          ilike(contracts.contractName, `%${search}%`),
          ilike(contracts.signerUnit, `%${search}%`),
          ilike(contracts.userUnit, `%${search}%`)
        )
      );
    }
    
    if (status) {
      conditions.push(eq(contracts.contractStatus, status));
    }
    
    if (signMode) {
      conditions.push(eq(contracts.signMode, signMode));
    }

    // 查询总数
    const [{ total }] = await db
      .select({ total: count() })
      .from(contracts)
      .where(and(...conditions));

    // 查询列表
    const list = await db
      .select({
        id: contracts.id,
        contractCode: contracts.contractCode,
        contractName: contracts.contractName,
        contractStatus: contracts.contractStatus,
        processStatus: contracts.processStatus,
        signMode: contracts.signMode,
        signerUnit: contracts.signerUnit,
        userUnit: contracts.userUnit,
        contractAmount: contracts.contractAmount,
        warrantyAmount: contracts.warrantyAmount,
        signDate: contracts.signDate,
        signerName: contracts.signerName,
        department: contracts.department,
        projectId: contracts.projectId,
        projectCode: contracts.projectCode,
        customerId: contracts.customerId,
        isNewCustomer: contracts.isNewCustomer,
        createdAt: contracts.createdAt,
        // 关联信息
        projectName: projects.projectName,
        customerName: customers.customerName,
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
      .where(and(...conditions))
      .orderBy(desc(contracts.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return NextResponse.json({
      success: true,
      data: {
        list,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error('Failed to fetch contracts:', error);
    return errorResponse('INTERNAL_ERROR', '获取合同列表失败');
  }
});

/**
 * POST /api/contracts
 * 创建合同
 * 已修复：添加认证中间件保护
 */
export const POST = withAuth(async (request: NextRequest, { userId }) => {
  try {
    const body = await request.json();
    
    // 输入验证
    if (!body.contractName || body.contractName.trim() === '') {
      return errorResponse('BAD_REQUEST', '合同名称不能为空');
    }
    
    // BUG-019: 合同金额必须大于0
    const contractAmount = parseFloat(body.contractAmount);
    if (isNaN(contractAmount) || contractAmount <= 0) {
      return errorResponse('BAD_REQUEST', '合同金额必须大于0');
    }
    
    // BUG-009: 合同签订日期验证 - 不能是未来日期
    if (body.signDate) {
      const signDate = new Date(body.signDate);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (signDate > today) {
        return errorResponse('BAD_REQUEST', '签订日期不能是未来日期');
      }
    }
    
    // BUG-018: 合同结束日期不能早于签订日期
    if (body.signDate && body.requireCompleteDate) {
      const signDate = new Date(body.signDate);
      const completeDate = new Date(body.requireCompleteDate);
      if (completeDate < signDate) {
        return errorResponse('BAD_REQUEST', '要求完成日期不能早于签订日期');
      }
    }
    
    // 验证合同状态枚举值
    const validStatuses = ['draft', 'pending', 'signed', 'executing', 'completed', 'terminated'];
    if (body.contractStatus && !validStatuses.includes(body.contractStatus)) {
      return errorResponse('BAD_REQUEST', '无效的合同状态');
    }
    
    // BUG-023: 生成合同编号（并发安全）
    const year = new Date().getFullYear();
    const prefix = `HT-${year}-`;
    let contractCode = '';
    let attempts = 0;
    const maxAttempts = 5;
    
    while (attempts < maxAttempts) {
      attempts++;
      
      // 查询当年最大编号
      const result = await db.execute(sql`
        SELECT MAX(contract_code) as max_code
        FROM bus_contract
        WHERE contract_code LIKE ${prefix + '%'}
      `);
      
      const maxCode = (result as any)[0]?.max_code;
      let nextNum = 1;
      
      if (maxCode) {
        const match = maxCode.match(/HT-(\d{4})-(\d{3,4})/);
        if (match) {
          nextNum = parseInt(match[2]) + 1;
        }
      }
      
      const candidateCode = `HT-${year}-${String(nextNum).padStart(3, '0')}`;
      
      // 检查该编号是否已存在
      const existingCode = await db.execute(sql`
        SELECT id FROM bus_contract WHERE contract_code = ${candidateCode} LIMIT 1
      `);
      
      if ((existingCode as unknown as any[]).length === 0) {
        contractCode = candidateCode;
        break;
      }
    }
    
    if (!contractCode) {
      // 最终降级：使用时间戳确保唯一性
      contractCode = `HT-${year}-${Date.now().toString().slice(-4)}`;
    }

    // 检查是否为新客户
    let isNewCustomer = false;
    if (body.userUnit) {
      const existingCustomer = await db
        .select()
        .from(customers)
        .where(ilike(customers.customerName, body.userUnit))
        .limit(1);
      isNewCustomer = existingCustomer.length === 0;
    }
    
    // 验证项目是否存在（如果提供了projectId）
    if (body.projectId) {
      const [project] = await db
        .select({ id: projects.id })
        .from(projects)
        .where(and(
          eq(projects.id, body.projectId),
          isNull(projects.deletedAt)
        ))
        .limit(1);
      
      if (!project) {
        return errorResponse('BAD_REQUEST', '关联的项目不存在');
      }
    }

    // 插入合同
    const [contract] = await db
      .insert(contracts)
      .values({
        contractCode,
        contractName: body.contractName.trim(),
        contractScanName: body.contractScanName || null,
        contractStatus: body.contractStatus || 'draft',
        processStatus: body.processStatus || 'pending',
        signMode: body.signMode,
        signerUnit: body.signerUnit || null,
        userUnit: body.userUnit || null,
        userUnitId: body.userUnitId || null,
        projectId: body.projectId || null,
        projectCode: body.projectCode || null,
        customerId: body.customerId || null,
        department: body.department || null,
        contractAmount: String(contractAmount),
        warrantyAmount: body.warrantyAmount ? String(body.warrantyAmount) : null,
        signDate: body.signDate || null,
        warrantyYears: body.warrantyYears || null,
        requireCompleteDate: body.requireCompleteDate || null,
        acceptanceDate: body.acceptanceDate || null,
        entryDate: new Date().toISOString().split('T')[0],
        signerId: body.signerId || null,
        signerName: body.signerName || null,
        userType: body.userType || null,
        projectCategory: body.projectCategory || null,
        fundSource: body.fundSource || null,
        bank: body.bank || null,
        isNewCustomer,
        projectAddress: body.projectAddress || null,
        remark: body.remark || null,
        attachments: body.attachments || null,
        bidNoticeFile: body.bidNoticeFile || null,
        acceptanceFile: body.acceptanceFile || null,
        createdBy: userId, // 使用认证用户ID
      })
      .returning();

    // 从合同表回算项目合同快照，避免多合同/删改换绑时残留脏数据。
    if (contract.projectId) {
      await syncProjectContractSnapshot(contract.projectId);
    }

    return successResponse(contract);
  } catch (error) {
    console.error('Failed to create contract:', error);
    
    // BUG-001修复: 不泄露SQL语句和数据库细节
    // 只返回用户友好的错误信息
    let errorMessage = '创建合同失败，请稍后重试';
    
    if (error instanceof Error) {
      // 处理已知错误类型，但不泄露具体SQL信息
      const msg = error.message.toLowerCase();
      if (msg.includes('duplicate key') || msg.includes('unique')) {
        errorMessage = '合同编号已存在，请刷新后重试';
      } else if (msg.includes('not null') || msg.includes('null value')) {
        errorMessage = '必填字段缺失，请检查表单';
      } else if (msg.includes('foreign key')) {
        errorMessage = '关联数据不存在，请检查关联的项目或客户';
      }
      // 其他数据库错误不泄露具体信息
    }
    
    return errorResponse('INTERNAL_ERROR', errorMessage);
  }
});
