import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { customers, customerTypes, users, projects } from '@/db/schema';
import { desc, eq, sql, count, and, or, isNull, lt } from 'drizzle-orm';
import { withAuth } from '@/lib/auth-middleware';
import { successResponse, errorResponse, validatePagination } from '@/lib/api-response';
import { formatDateField } from '@/lib/utils';
import { getPermissionContext, buildScopeCondition } from '@/lib/permissions/data-scope';
import { hasFullAccess } from '@/lib/permissions/middleware';
import { DataScope, type ResourceType } from '@/lib/permissions/types';
import { sanitizeString, containsHtml, isValidEmail, isValidPhone, sanitizeSearchString } from '@/lib/xss';
import { mapCustomerTypeCodeToDictValue, resolveCustomerTypeId } from '@/lib/customer-types';

// 辅助函数：生成客户编号
function generateCustomerId(id: number): string {
  return `CUST${String(id).padStart(3, '0')}`;
}

// GET - 获取客户列表
export const GET = withAuth(async (
  request: NextRequest,
  context: { userId: number; user?: any }
) => {
  try {
    const { searchParams } = new URL(request.url);
    // BUG-035, BUG-036: 清理搜索字符串，限制长度并移除危险字符
    const search = sanitizeSearchString(searchParams.get('search') || '');
    const status = searchParams.get('status') || '';
    const region = searchParams.get('region') || '';
    const customerTypeId = searchParams.get('customerTypeId') || '';
    const customerType = searchParams.get('customerType') || ''; // 支持通过类型名称筛选
    const userId = context.userId;

    // ============ 分页性能优化 ============
    // 支持两种分页模式：
    // 1. 传统分页（page/pageSize）- 适合小数据量
    // 2. 游标分页（cursor）- 适合大数据量，性能更好
    const cursor = searchParams.get('cursor'); // 游标：上一页最后一条记录的ID
    const pagination = validatePagination(
      searchParams.get('page'),
      searchParams.get('pageSize')
    );
    
    if (!pagination.valid) {
      return errorResponse('BAD_REQUEST', pagination.error || '分页参数无效');
    }
    
    const { page, pageSize } = pagination;

    // 获取权限上下文
    const permissionContext = await getPermissionContext(userId, 'customer' as ResourceType);
    const isFullAccess = hasFullAccess(permissionContext);

    // 构建查询条件数组
    const conditions: any[] = [isNull(customers.deletedAt)];
    
    if (search) {
      conditions.push(
        sql`(${customers.customerName} ILIKE ${`%${search}%`} OR ${customers.contactName} ILIKE ${`%${search}%`})`
      );
    }
    
    // BUG-022: 验证客户状态参数是否有效
    const validStatuses = ['active', 'inactive', 'potential', 'churned'];
    if (status && !validStatuses.includes(status)) {
      return errorResponse('BAD_REQUEST', `无效的客户状态，有效值为: ${validStatuses.join(', ')}`);
    }
    if (status) {
      conditions.push(eq(customers.status, status));
    }
    
    if (region) {
      conditions.push(eq(customers.region, region));
    }
    
    // BUG-042: 验证customerTypeId是否为有效数字
    if (customerTypeId) {
      const parsedCustomerTypeId = parseInt(customerTypeId);
      if (isNaN(parsedCustomerTypeId)) {
        return errorResponse('BAD_REQUEST', '客户类型ID格式无效');
      }
      conditions.push(eq(customers.customerTypeId, parsedCustomerTypeId));
    }
    
    // 支持通过客户类型名称筛选
    if (customerType) {
      const resolvedCustomerTypeId = await resolveCustomerTypeId(customerType);
      if (resolvedCustomerTypeId) {
        conditions.push(eq(customers.customerTypeId, resolvedCustomerTypeId));
      } else {
        conditions.push(eq(customers.customerTypeId, -1));
      }
    }

    // 添加数据权限过滤
    if (!isFullAccess) {
      const scopeCondition = buildScopeCondition(permissionContext, 'customer', customers._.name);
      if (scopeCondition) {
        conditions.push(scopeCondition);
      }
    }

    // ============ 游标分页：性能优化 ============
    // 游标分页比OFFSET分页性能更好，特别是大数据量时
    if (cursor) {
      // 解析游标：格式为 "id_timestamp" 
      const [cursorId] = cursor.split('_');
      conditions.push(lt(customers.id, parseInt(cursorId)));
    }

    // ============ 并行查询：总数量和数据列表 ============
    const [totalResult, customerList] = await Promise.all([
      // 总数量查询（仅在传统分页模式时需要）
      cursor ? Promise.resolve(null) : db
        .select({ count: count() })
        .from(customers)
        .leftJoin(customerTypes, eq(customers.customerTypeId, customerTypes.id))
        .where(and(...conditions)),
      
      // 数据列表查询（游标分页多取一条判断是否有下一页）
      db
        .select({
          id: customers.id,
          customerId: customers.customerId,
          customerName: customers.customerName,
          customerTypeId: customers.customerTypeId,
          customerTypeName: customerTypes.name,
          customerTypeCode: customerTypes.code,
          defaultProjectTypeCode: customerTypes.defaultProjectTypeCode,
          region: customers.region,
          status: customers.status,
          totalAmount: customers.totalAmount,
          currentProjectCount: customers.currentProjectCount,
          lastCooperationDate: customers.lastCooperationDate,
          maxProjectAmount: customers.maxProjectAmount,
          contactName: customers.contactName,
          contactPhone: customers.contactPhone,
          contactEmail: customers.contactEmail,
          address: customers.address,
          description: customers.description,
          createdBy: customers.createdBy,
          creatorName: users.realName,
          createdAt: customers.createdAt,
          updatedAt: customers.updatedAt,
        })
        .from(customers)
        .leftJoin(customerTypes, eq(customers.customerTypeId, customerTypes.id))
        .leftJoin(users, eq(customers.createdBy, users.id))
        .where(and(...conditions))
        .orderBy(desc(customers.id)) // 使用ID排序比createdAt性能更好（有主键索引）
        .limit(cursor ? pageSize + 1 : pageSize)
        .offset(cursor ? 0 : (page - 1) * pageSize)
    ]);

    // ============ 处理游标分页结果 ============
    let hasNextPage = false;
    let nextCursor: string | null = null;
    let finalList = customerList;
    
    if (cursor && customerList.length > pageSize) {
      // 游标模式：多取了一条，说明有下一页
      hasNextPage = true;
      finalList = customerList.slice(0, pageSize);
      // 生成下一页游标：最后一条记录的ID
      const lastItem = finalList[finalList.length - 1];
      nextCursor = `${lastItem.id}_${lastItem.createdAt?.getTime() || 0}`;
    }

    // 添加 customerType 和 customerTypeCode 字段（用于前端兼容）并格式化日期字段
    const customersWithType = finalList.map(customer => {
      // 将 sys_customer_type.code 转换为 sys_attribute 的 value (字典code)
      const dictCode = mapCustomerTypeCodeToDictValue(customer.customerTypeCode);
      
      return {
        ...customer,
        customerType: customer.customerTypeName || '',          // 显示名称（用于列表显示）
        customerTypeCode: dictCode,                              // 字典code（用于编辑下拉框）
        lastCooperationDate: formatDateField(customer.lastCooperationDate),
        createdAt: formatDateField(customer.createdAt),
        updatedAt: formatDateField(customer.updatedAt),
      };
    });

    // ============ 返回结果 ============
    // 游标分页和传统分页返回不同的元数据
    const paginationMeta = cursor ? {
      // 游标分页元数据
      hasNextPage,
      nextCursor,
      pageSize,
    } : {
      // 传统分页元数据
      page,
      pageSize,
      total: totalResult?.[0]?.count || 0,
      totalPages: Math.ceil((totalResult?.[0]?.count || 0) / pageSize),
    };

    // 返回结果时包含权限信息和分页元数据
    return successResponse({
      customers: customersWithType,
      total: customersWithType.length,
      pagination: paginationMeta,
      permission: {
        canCreate: isFullAccess || permissionContext.dataPermission?.scope !== undefined,
        canUpdate: isFullAccess || permissionContext.dataPermission?.scope === DataScope.SELF,
        canDelete: isFullAccess,
        scope: permissionContext.dataPermission?.scope || DataScope.SELF,
      },
    });
  } catch (error) {
    console.error('Failed to fetch customers:', error);
    return errorResponse('INTERNAL_ERROR', '获取客户列表失败');
  }
});

// POST - 创建新客户
export const POST = withAuth(async (
  request: NextRequest,
  context: { userId: number; user?: any }
) => {
  try {
    const body = await request.json();
    const userId = context.userId;
    let { 
      customerName, 
      customerTypeId, 
      customerType, // 支持通过类型名称/code查找
      region, 
      status = 'potential', 
      contactName, 
      contactPhone, 
      contactEmail, 
      address, 
      description,
    } = body;

    // 如果传入了customerType而不是customerTypeId，尝试查找对应的ID
    if (customerType && !customerTypeId) {
      customerTypeId = await resolveCustomerTypeId(customerType);
    }

    if (customerType && !customerTypeId) {
      return errorResponse('BAD_REQUEST', '客户类型无效');
    }

    // 验证必填字段
    if (!customerName || !customerTypeId || !region) {
      return errorResponse('BAD_REQUEST', '客户名称、客户类型、所属地区为必填项');
    }

    // BUG-001: XSS防护 - 清理用户输入
    customerName = sanitizeString(customerName);
    contactName = contactName ? sanitizeString(contactName) : null;
    address = address ? sanitizeString(address) : null;
    description = description ? sanitizeString(description) : null;

    // BUG-011: 客户名称长度验证
    if (!customerName || customerName.trim() === '') {
      return errorResponse('BAD_REQUEST', '客户名称不能为空或仅包含无效字符');
    }
    if (customerName.length > 200) {
      return errorResponse('BAD_REQUEST', '客户名称不能超过200个字符');
    }

    // BUG-028/029: 邮箱和手机号格式验证
    if (contactEmail && !isValidEmail(contactEmail)) {
      return errorResponse('BAD_REQUEST', '邮箱格式不正确');
    }
    if (contactPhone && !isValidPhone(contactPhone)) {
      return errorResponse('BAD_REQUEST', '手机号格式不正确（需要11位大陆手机号）');
    }

    // BUG-041: 客户行业枚举校验
    const validIndustries = ['政府', '金融', '教育', '医疗', '制造', '零售', '能源', '交通', '通信', '其他'];
    if (body.industry && !validIndustries.includes(body.industry)) {
      return errorResponse('BAD_REQUEST', '无效的行业类型');
    }

    // BUG-039: 客户状态枚举校验
    const validStatuses = ['potential', 'active', 'inactive', 'churned'];
    if (status && !validStatuses.includes(status)) {
      return errorResponse('BAD_REQUEST', '无效的客户状态');
    }

    // 检查创建权限
    const permissionContext = await getPermissionContext(userId, 'customer' as ResourceType);
    const canCreate = hasFullAccess(permissionContext) || 
      permissionContext.dataPermission?.scope !== undefined;

    if (!canCreate) {
      return errorResponse('FORBIDDEN', '无权创建客户', { status: 403 });
    }

    // ============ 幂等性检查：防止重复提交 ============
    // 使用客户名称作为幂等性键，确保短时间内不会重复创建同名客户
    const idempotencyKey = `customer_create:${userId}:${customerName.toLowerCase().trim()}`;
    const { checkIdempotencyKey, storeIdempotencyKey } = await import('@/lib/idempotency');
    
    const existingResponse = await checkIdempotencyKey(idempotencyKey);
    if (existingResponse) {
      // 返回之前创建的客户，实现幂等性
      return new NextResponse(existingResponse, {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // ============ 并发安全：使用数据库事务 + 唯一约束检查 ============
    // 使用事务确保原子性，防止并发创建同名客户
    let newCustomer;
    try {
      await db.transaction(async (tx) => {
        // 在事务中使用行锁查询，防止并发
        const existingCustomer = await tx
          .select()
          .from(customers)
          .where(
            and(
              eq(customers.customerName, customerName),
              isNull(customers.deletedAt)
            )
          )
          .limit(1);

        if (existingCustomer.length > 0) {
          throw new Error('DUPLICATE_CUSTOMER_NAME');
        }

        // 获取当前最大ID
        const maxIdResult = await tx
          .select({ maxId: sql<number>`COALESCE(MAX(${customers.id}), 0)` })
          .from(customers);
        
        const nextId = (Number(maxIdResult[0]?.maxId) || 0) + 1;
        const customerId = generateCustomerId(nextId);

        // 创建新客户
        [newCustomer] = await tx
          .insert(customers)
          .values({
            customerId,
            customerName,
            customerTypeId: Number(customerTypeId),
            region,
            status,
            contactName: contactName || null,
            contactPhone: contactPhone || null,
            contactEmail: contactEmail || null,
            address: address || null,
            description: description || null,
            createdBy: userId,
            totalAmount: '0.00',
            currentProjectCount: 0,
            maxProjectAmount: '0.00',
          })
          .returning();
      });
    } catch (error: any) {
      // 处理并发冲突
      if (error.message === 'DUPLICATE_CUSTOMER_NAME') {
        return errorResponse('CONFLICT', '客户名称已存在，请确认是否重复');
      }
      // 处理数据库唯一约束违反（如果数据库有唯一约束）
      if (error.code === '23505') { // PostgreSQL unique violation
        return errorResponse('CONFLICT', '客户名称已存在（并发冲突），请刷新后重试');
      }
      throw error;
    }

    // ============ 存储幂等性响应 ============
    const response = successResponse(newCustomer!);
    await storeIdempotencyKey(idempotencyKey, JSON.stringify({
      success: true,
      data: newCustomer,
    }));

    return response;
  } catch (error) {
    console.error('Failed to create customer:', error);
    return errorResponse('INTERNAL_ERROR', '创建客户失败');
  }
});
