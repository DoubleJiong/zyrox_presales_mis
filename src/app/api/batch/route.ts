import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { projects, customers, opportunities, todos, users } from '@/db/schema';
import { eq, inArray, isNull, and } from 'drizzle-orm';
import { successResponse, errorResponse } from '@/lib/api-response';
import { authenticate } from '@/lib/auth';

/**
 * 批量操作 API
 * POST /api/batch
 * 
 * Body:
 * {
 *   action: 'delete' | 'status' | 'assign' | 'priority',
 *   type: 'projects' | 'customers' | 'opportunities' | 'todos',
 *   ids: number[],
 *   value?: string | number
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await authenticate(request);
    if (!user?.id) {
      return errorResponse('UNAUTHORIZED', '请先登录');
    }

    const body = await request.json();
    const { action, type, ids, value } = body;

    if (!action || !type || !ids || !Array.isArray(ids) || ids.length === 0) {
      return errorResponse('BAD_REQUEST', '参数错误');
    }

    if (ids.length > 100) {
      return errorResponse('BAD_REQUEST', '单次最多操作100条数据');
    }

    if (action === 'status' && type === 'projects') {
      return errorResponse('BAD_REQUEST', '项目兼容状态不支持批量直接修改，请通过阶段变更或结果归档接口处理');
    }

    const now = new Date();
    let result: { count: number; message: string };

    switch (action) {
      case 'delete':
        result = await handleBatchDelete(type, ids);
        break;
      case 'status':
        result = await handleBatchStatus(type, ids, String(value));
        break;
      case 'assign':
        result = await handleBatchAssign(type, ids, Number(value));
        break;
      case 'priority':
        result = await handleBatchPriority(type, ids, String(value));
        break;
      default:
        return errorResponse('BAD_REQUEST', '不支持的操作类型');
    }

    return successResponse({
      action,
      type,
      affectedCount: result.count,
      message: result.message,
    });
  } catch (error) {
    console.error('Batch operation error:', error);
    return errorResponse('INTERNAL_ERROR', '批量操作失败');
  }
}

async function handleBatchDelete(type: string, ids: number[]) {
  switch (type) {
    case 'projects':
      await db.update(projects)
        .set({ deletedAt: now() })
        .where(and(isNull(projects.deletedAt), inArray(projects.id, ids)));
      return { count: ids.length, message: `已删除 ${ids.length} 个项目` };

    case 'customers':
      await db.update(customers)
        .set({ deletedAt: now() })
        .where(and(isNull(customers.deletedAt), inArray(customers.id, ids)));
      return { count: ids.length, message: `已删除 ${ids.length} 个客户` };

    case 'opportunities':
      await db.update(opportunities)
        .set({ deletedAt: now() })
        .where(and(isNull(opportunities.deletedAt), inArray(opportunities.id, ids)));
      return { count: ids.length, message: `已删除 ${ids.length} 个商机` };

    case 'todos':
      await db.delete(todos).where(inArray(todos.id, ids));
      return { count: ids.length, message: `已删除 ${ids.length} 条待办` };

    default:
      throw new Error('不支持的删除类型');
  }
}

async function handleBatchStatus(type: string, ids: number[], status: string) {
  if (!status) throw new Error('状态值不能为空');

  switch (type) {
    case 'projects':
      throw new Error('项目兼容状态不支持批量直接修改');

    case 'customers':
      await db.update(customers)
        .set({ status, updatedAt: now() })
        .where(and(isNull(customers.deletedAt), inArray(customers.id, ids)));
      return { count: ids.length, message: `已修改 ${ids.length} 个客户状态` };

    case 'opportunities':
      await db.update(opportunities)
        .set({ status, updatedAt: now() })
        .where(and(isNull(opportunities.deletedAt), inArray(opportunities.id, ids)));
      return { count: ids.length, message: `已修改 ${ids.length} 个商机状态` };

    case 'todos':
      await db.update(todos)
        .set({ todoStatus: status, updatedAt: now() })
        .where(inArray(todos.id, ids));
      return { count: ids.length, message: `已修改 ${ids.length} 条待办状态` };

    default:
      throw new Error('不支持的状态修改类型');
  }
}

async function handleBatchAssign(type: string, ids: number[], assigneeId: number) {
  if (!assigneeId) throw new Error('分配人不能为空');

  const assignee = await db.select({ id: users.id })
    .from(users)
    .where(eq(users.id, assigneeId))
    .limit(1);

  if (assignee.length === 0) throw new Error('分配人不存在');

  switch (type) {
    case 'projects':
      await db.update(projects)
        .set({ managerId: assigneeId, updatedAt: now() })
        .where(and(isNull(projects.deletedAt), inArray(projects.id, ids)));
      return { count: ids.length, message: `已将 ${ids.length} 个项目分配给指定人员` };

    case 'todos':
      await db.update(todos)
        .set({ assigneeId, updatedAt: now() })
        .where(inArray(todos.id, ids));
      return { count: ids.length, message: `已将 ${ids.length} 条待办分配给指定人员` };

    default:
      throw new Error('不支持的分配类型');
  }
}

async function handleBatchPriority(type: string, ids: number[], priority: string) {
  if (!priority) throw new Error('优先级不能为空');

  switch (type) {
    case 'projects':
      await db.update(projects)
        .set({ priority, updatedAt: now() })
        .where(and(isNull(projects.deletedAt), inArray(projects.id, ids)));
      return { count: ids.length, message: `已修改 ${ids.length} 个项目优先级` };

    case 'todos':
      await db.update(todos)
        .set({ priority, updatedAt: now() })
        .where(inArray(todos.id, ids));
      return { count: ids.length, message: `已修改 ${ids.length} 条待办优先级` };

    default:
      throw new Error('不支持的优先级修改类型');
  }
}

function now(): Date {
  return new Date();
}
