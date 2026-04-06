/**
 * 操作日志服务
 * 
 * 提供操作日志的记录和查询功能
 */

import { db } from '@/db';
import { operationLogs, users } from '@/db/schema';
import { eq, and, desc, gte, lte, like, isNull, sql } from 'drizzle-orm';

// 操作类型
export type ActionType = 'create' | 'update' | 'delete' | 'export' | 'import' | 'login' | 'logout' | 'approve' | 'reject';

// 操作状态
export type OperationStatus = 'success' | 'failed';

// 创建操作日志参数
export interface CreateOperationLogParams {
  userId: number;
  module: string;
  action: ActionType | string;
  resource?: string;
  resourceId?: number;
  method?: string;
  path?: string;
  params?: Record<string, unknown>;
  result?: Record<string, unknown>;
  status: OperationStatus;
  error?: string;
  duration?: number;
  ip?: string;
  userAgent?: string;
}

// 查询操作日志参数
export interface QueryOperationLogsParams {
  userId?: number;
  module?: string;
  action?: string;
  status?: OperationStatus;
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

function formatOperationLogDetails(log: {
  action: string;
  resource?: string | null;
  resourceId?: number | null;
  path?: string | null;
  method?: string | null;
  error?: string | null;
}) {
  if (log.error) {
    return log.error;
  }

  if (log.resource && log.resourceId) {
    return `${log.action} ${log.resource}#${log.resourceId}`;
  }

  if (log.resource) {
    return `${log.action} ${log.resource}`;
  }

  if (log.method && log.path) {
    return `${log.method} ${log.path}`;
  }

  return log.action;
}

// 操作日志服务类
export class OperationLogService {
  /**
   * 记录操作日志
   */
  static async log(params: CreateOperationLogParams): Promise<number> {
    const [log] = await db
      .insert(operationLogs)
      .values({
        userId: params.userId,
        module: params.module,
        action: params.action,
        resource: params.resource,
        resourceId: params.resourceId,
        method: params.method,
        path: params.path,
        params: params.params,
        result: params.result,
        status: params.status,
        error: params.error,
        duration: params.duration,
        ip: params.ip,
        userAgent: params.userAgent,
      })
      .returning();

    return log.id;
  }

  /**
   * 查询操作日志
   */
  static async query(params: QueryOperationLogsParams) {
    const {
      userId,
      module,
      action,
      status,
      startDate,
      endDate,
      search,
      page = 1,
      pageSize = 20,
    } = params;

    const conditions = [isNull(operationLogs.deletedAt)];

    if (userId) {
      conditions.push(eq(operationLogs.userId, userId));
    }

    if (module) {
      conditions.push(eq(operationLogs.module, module));
    }

    if (action) {
      conditions.push(eq(operationLogs.action, action));
    }

    if (status) {
      conditions.push(eq(operationLogs.status, status));
    }

    if (startDate) {
      conditions.push(gte(operationLogs.createdAt, new Date(startDate)));
    }

    if (endDate) {
      conditions.push(lte(operationLogs.createdAt, new Date(endDate)));
    }

    if (search) {
      conditions.push(like(operationLogs.resource, `%${search}%`));
    }

    // 获取总数
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(operationLogs)
      .where(and(...conditions));

    const total = countResult?.count || 0;

    // 获取日志列表
    const logs = await db
      .select({
        log: operationLogs,
        user: users,
      })
      .from(operationLogs)
      .leftJoin(users, eq(operationLogs.userId, users.id))
      .where(and(...conditions))
      .orderBy(desc(operationLogs.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return {
      list: logs.map(({ log, user }) => ({
        id: log.id,
        userId: log.userId,
        userName: user?.realName || `用户#${log.userId}`,
        module: log.module,
        action: log.action,
        details: formatOperationLogDetails(log),
        resource: log.resource,
        resourceId: log.resourceId,
        method: log.method,
        path: log.path,
        params: log.params,
        result: log.result,
        status: log.status,
        error: log.error,
        duration: log.duration,
        ip: log.ip,
        userAgent: log.userAgent,
        createdAt: log.createdAt,
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * 记录创建操作
   */
  static async logCreate(
    userId: number,
    module: string,
    resource: string,
    resourceId: number,
    params?: Record<string, unknown>,
    ip?: string
  ): Promise<number> {
    return this.log({
      userId,
      module,
      action: 'create',
      resource,
      resourceId,
      params,
      status: 'success',
      ip,
    });
  }

  /**
   * 记录更新操作
   */
  static async logUpdate(
    userId: number,
    module: string,
    resource: string,
    resourceId: number,
    params?: Record<string, unknown>,
    result?: Record<string, unknown>,
    ip?: string
  ): Promise<number> {
    return this.log({
      userId,
      module,
      action: 'update',
      resource,
      resourceId,
      params,
      result,
      status: 'success',
      ip,
    });
  }

  /**
   * 记录删除操作
   */
  static async logDelete(
    userId: number,
    module: string,
    resource: string,
    resourceId: number,
    ip?: string
  ): Promise<number> {
    return this.log({
      userId,
      module,
      action: 'delete',
      resource,
      resourceId,
      status: 'success',
      ip,
    });
  }

  /**
   * 记录导出操作
   */
  static async logExport(
    userId: number,
    module: string,
    params?: Record<string, unknown>,
    ip?: string
  ): Promise<number> {
    return this.log({
      userId,
      module,
      action: 'export',
      params,
      status: 'success',
      ip,
    });
  }

  /**
   * 记录登录操作
   */
  static async logLogin(
    userId: number,
    status: OperationStatus,
    ip?: string,
    userAgent?: string,
    error?: string
  ): Promise<number> {
    return this.log({
      userId,
      module: 'auth',
      action: 'login',
      status,
      ip,
      userAgent,
      error,
    });
  }

  /**
   * 记录审批操作
   */
  static async logApprove(
    userId: number,
    module: string,
    resource: string,
    resourceId: number,
    approved: boolean,
    comment?: string,
    ip?: string
  ): Promise<number> {
    return this.log({
      userId,
      module,
      action: approved ? 'approve' : 'reject',
      resource,
      resourceId,
      params: { comment },
      status: 'success',
      ip,
    });
  }
}

// 导出便捷方法
export const logOperation = OperationLogService.log;
export const logCreate = OperationLogService.logCreate;
export const logUpdate = OperationLogService.logUpdate;
export const logDelete = OperationLogService.logDelete;
export const logExport = OperationLogService.logExport;
export const logLogin = OperationLogService.logLogin;
export const logApprove = OperationLogService.logApprove;
