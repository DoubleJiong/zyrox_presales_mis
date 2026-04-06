import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { customers, customerTypes, users } from '@/db/schema';
import { eq, and, isNull, or, sql } from 'drizzle-orm';
import { withAuth } from '@/lib/auth-middleware';
import { successResponse, errorResponse } from '@/lib/api-response';
import { getPermissionContext } from '@/lib/permissions/data-scope';
import { hasFullAccess } from '@/lib/permissions/middleware';
import { DataScope } from '@/lib/permissions/types';
import type { ResourceType } from '@/lib/permissions/types';
import { formatDateField } from '@/lib/utils';
import { mapCustomerTypeCodeToDictValue, resolveCustomerTypeId } from '@/lib/customer-types';
import { syncProjectCustomerSnapshot } from '@/lib/project-customer-snapshot';

// GET - 获取单个客户详情
export const GET = withAuth(async (
  request: NextRequest,
  context: { userId: number; user?: any; params?: Record<string, string> }
) => {
  try {
    const customerId = parseInt(context.params?.id || '0');
    const userId = context.userId;

    if (isNaN(customerId)) {
      return errorResponse('BAD_REQUEST', '无效的客户ID');
    }

    // 获取权限上下文
    const permissionContext = await getPermissionContext(userId, 'customer' as ResourceType);
    const isFullAccess = hasFullAccess(permissionContext);

    const [customer] = await db
      .select({
        id: customers.id,
        customerId: customers.customerId,
        customerName: customers.customerName,
        customerTypeId: customers.customerTypeId,
        customerTypeName: customerTypes.name,
        customerTypeCode: customerTypes.code,  // 添加code字段
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
      .where(
        and(
          eq(customers.id, customerId),
          isNull(customers.deletedAt)
        )
      )
      .limit(1);

    if (!customer) {
      return errorResponse('NOT_FOUND', '客户不存在');
    }

    // 检查访问权限
    if (!isFullAccess) {
      if (permissionContext.dataPermission?.scope === DataScope.SELF) {
        if (customer.createdBy !== userId) {
          return errorResponse('FORBIDDEN', '无权访问此客户');
        }
      }
    }

    // 返回结果时包含权限信息
    // 将 customerType.code 转换为字典code（用于编辑下拉框）
    const dictCode = mapCustomerTypeCodeToDictValue(customer.customerTypeCode);
    
    return successResponse({
      ...customer,
      customerType: customer.customerTypeName, // 添加 customerType 别名，用于前端兼容（显示名称）
      customerTypeCode: dictCode,               // 字典code（用于编辑下拉框）
      // 格式化日期字段
      lastCooperationDate: formatDateField(customer.lastCooperationDate),
      createdAt: formatDateField(customer.createdAt),
      updatedAt: formatDateField(customer.updatedAt),
      permission: {
        canUpdate: isFullAccess || customer.createdBy === userId,
        canDelete: isFullAccess,
      },
    });
  } catch (error) {
    console.error('Failed to fetch customer:', error);
    return errorResponse('INTERNAL_ERROR', '获取客户详情失败');
  }
});

// PUT - 更新客户信息
export const PUT = withAuth(async (
  request: NextRequest,
  context: { userId: number; user?: any; params?: Record<string, string> }
) => {
  try {
    const customerId = parseInt(context.params?.id || '0');
    const userId = context.userId;

    if (isNaN(customerId)) {
      return errorResponse('BAD_REQUEST', '无效的客户ID');
    }

    const body = await request.json();
    let { 
      customerName, 
      customerTypeId, 
      customerType, // 支持通过类型名称/code查找
      region, 
      status,
      contactName, 
      contactPhone, 
      contactEmail, 
      address, 
      description 
    } = body;

    // 查询客户
    const [existingCustomer] = await db
      .select()
      .from(customers)
      .where(
        and(
          eq(customers.id, customerId),
          isNull(customers.deletedAt)
        )
      )
      .limit(1);

    if (!existingCustomer) {
      return errorResponse('NOT_FOUND', '客户不存在');
    }

    // 如果传入了customerType而不是customerTypeId，尝试查找对应的ID
    if (customerType && !customerTypeId) {
      customerTypeId = await resolveCustomerTypeId(customerType);
    }

    if (customerType && !customerTypeId) {
      return errorResponse('BAD_REQUEST', '客户类型无效');
    }

    // 使用现有值作为默认值（用户体验优化：支持部分字段更新）
    const finalCustomerName = customerName ?? existingCustomer.customerName;
    const finalCustomerTypeId = customerTypeId ?? existingCustomer.customerTypeId;
    const finalRegion = region ?? existingCustomer.region;

    // 验证必填字段（使用最终值）
    if (!finalCustomerName) {
      return errorResponse('BAD_REQUEST', '客户名称不能为空');
    }
    if (!finalCustomerTypeId) {
      return errorResponse('BAD_REQUEST', '客户类型不能为空');
    }
    if (!finalRegion) {
      return errorResponse('BAD_REQUEST', '所属地区不能为空');
    }

    // 检查更新权限
    const permissionContext = await getPermissionContext(userId, 'customer' as ResourceType);
    const isFullAccess = hasFullAccess(permissionContext);
    const isCreator = existingCustomer.createdBy === userId;
    const canUpdate = isFullAccess || isCreator;

    if (!canUpdate) {
      return errorResponse('FORBIDDEN', '无权更新此客户');
    }

    // 检查客户名称是否修改
    const isNameChanged = finalCustomerName !== existingCustomer.customerName;
    
    // 只有当客户名称被修改时，才检查是否与其他客户重复
    if (isNameChanged) {
      const [duplicateCustomer] = await db
        .select()
        .from(customers)
        .where(
          and(
            eq(customers.customerName, finalCustomerName),
            isNull(customers.deletedAt)
          )
        )
        .limit(1);

      if (duplicateCustomer) {
        return errorResponse('CONFLICT', '客户名称已存在，请确认是否重复');
      }
    }

    // 更新客户信息
    const [updatedCustomer] = await db
      .update(customers)
      .set({
        customerName: finalCustomerName,
        customerTypeId: Number(finalCustomerTypeId),
        region: finalRegion,
        status: status || existingCustomer.status,
        contactName: contactName !== undefined ? contactName : existingCustomer.contactName,
        contactPhone: contactPhone !== undefined ? contactPhone : existingCustomer.contactPhone,
        contactEmail: contactEmail !== undefined ? contactEmail : existingCustomer.contactEmail,
        address: address !== undefined ? address : existingCustomer.address,
        description: description !== undefined ? description : existingCustomer.description,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(customers.id, customerId),
          isNull(customers.deletedAt)
        )
      )
      .returning();

    if (isNameChanged) {
      await syncProjectCustomerSnapshot(customerId, finalCustomerName);
    }

    return successResponse(updatedCustomer);
  } catch (error) {
    console.error('Failed to update customer:', error);
    return errorResponse('INTERNAL_ERROR', '更新客户失败');
  }
});

// DELETE - 删除客户（软删除）
export const DELETE = withAuth(async (
  request: NextRequest,
  context: { userId: number; user?: any; params?: Record<string, string> }
) => {
  try {
    const customerId = parseInt(context.params?.id || '0');
    const userId = context.userId;

    if (isNaN(customerId)) {
      return errorResponse('BAD_REQUEST', '无效的客户ID');
    }

    // 检查删除权限（仅管理员可删除）
    const permissionContext = await getPermissionContext(userId, 'customer' as ResourceType);
    const canDelete = hasFullAccess(permissionContext);

    if (!canDelete) {
      return errorResponse('FORBIDDEN', '仅管理员可删除客户');
    }

    // 检查是否有进行中的项目
    const [customer] = await db
      .select()
      .from(customers)
      .where(
        and(
          eq(customers.id, customerId),
          isNull(customers.deletedAt)
        )
      )
      .limit(1);

    if (!customer) {
      return errorResponse('NOT_FOUND', '客户不存在');
    }

    // BUG-006: 检查客户是否有关联的项目
    const { projects } = await import('@/db/schema');
    const relatedProjects = await db
      .select({ id: projects.id })
      .from(projects)
      .where(
        and(
          eq(projects.customerId, customerId),
          isNull(projects.deletedAt)
        )
      )
      .limit(1);

    if (relatedProjects.length > 0) {
      return errorResponse('BAD_REQUEST', '该客户存在关联项目，无法删除。请先删除或转移相关项目。');
    }

    // 软删除客户
    await db
      .update(customers)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(customers.id, customerId));

    return successResponse({ message: '客户已删除' });
  } catch (error) {
    console.error('Failed to delete customer:', error);
    return errorResponse('INTERNAL_ERROR', '删除客户失败');
  }
});
