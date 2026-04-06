/**
 * 权限查询构建器
 * 
 * 用于构建带权限过滤的查询条件
 * 支持链式调用和复杂条件组合
 */

import { SQL, and, or, eq, inArray, sql } from 'drizzle-orm';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { DataScope, ResourceType, PermissionContext, RESOURCE_FIELD_MAP } from './types';
import { getPermissionContext, buildScopeCondition } from './data-scope';

// ============================================
// 类型定义
// ============================================

export interface QueryOptions {
  includeArchived?: boolean;
  customConditions?: SQL<unknown>[];
  orderBy?: SQL<unknown>[];
  limit?: number;
  offset?: number;
}

export interface FilterCondition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike' | 'in' | 'notin' | 'isnull' | 'isnotnull';
  value: any;
}

// ============================================
// 权限查询构建器类
// ============================================

export class PermissionQueryBuilder {
  private userId: number;
  private resource: ResourceType;
  private context: PermissionContext | null = null;
  private filters: FilterCondition[] = [];
  private options: QueryOptions = {};

  constructor(userId: number, resource: ResourceType) {
    this.userId = userId;
    this.resource = resource;
  }

  /**
   * 初始化权限上下文
   */
  async init(): Promise<PermissionQueryBuilder> {
    this.context = await getPermissionContext(this.userId, this.resource);
    return this;
  }

  /**
   * 添加过滤条件
   */
  where(field: string, operator: FilterCondition['operator'], value: any): PermissionQueryBuilder {
    this.filters.push({ field, operator, value });
    return this;
  }

  /**
   * 添加相等条件
   */
  whereEq(field: string, value: any): PermissionQueryBuilder {
    return this.where(field, 'eq', value);
  }

  /**
   * 添加模糊匹配条件
   */
  whereLike(field: string, value: string): PermissionQueryBuilder {
    return this.where(field, 'ilike', `%${value}%`);
  }

  /**
   * 添加IN条件
   */
  whereIn(field: string, values: any[]): PermissionQueryBuilder {
    return this.where(field, 'in', values);
  }

  /**
   * 添加自定义条件
   */
  addCustomCondition(condition: SQL<unknown>): PermissionQueryBuilder {
    if (!this.options.customConditions) {
      this.options.customConditions = [];
    }
    this.options.customConditions.push(condition);
    return this;
  }

  /**
   * 设置排序
   */
  orderBy(...orders: SQL<unknown>[]): PermissionQueryBuilder {
    this.options.orderBy = orders;
    return this;
  }

  /**
   * 设置分页
   */
  paginate(page: number, pageSize: number): PermissionQueryBuilder {
    this.options.offset = (page - 1) * pageSize;
    this.options.limit = pageSize;
    return this;
  }

  /**
   * 是否包含已归档数据
   */
  includeArchived(include: boolean = true): PermissionQueryBuilder {
    this.options.includeArchived = include;
    return this;
  }

  /**
   * 构建完整的查询条件
   */
  buildCondition(): SQL<unknown> | undefined {
    if (!this.context) {
      throw new Error('QueryBuilder not initialized. Call init() first.');
    }

    const conditions: SQL<unknown>[] = [];

    // 1. 添加数据权限范围条件
    const scopeCondition = buildScopeCondition(this.context, this.resource);
    if (scopeCondition) {
      conditions.push(scopeCondition);
    }

    // 2. 添加自定义过滤条件
    const filterConditions = this.filters.map(f => this.buildFilterCondition(f));
    conditions.push(...filterConditions);

    // 3. 添加自定义SQL条件
    if (this.options.customConditions) {
      conditions.push(...this.options.customConditions);
    }

    return conditions.length > 0 ? and(...conditions) : undefined;
  }

  /**
   * 构建单个过滤条件
   */
  private buildFilterCondition(filter: FilterCondition): SQL<unknown> {
    const { field, operator, value } = filter;
    const fieldRef = sql.identifier(field);

    switch (operator) {
      case 'eq':
        return eq(fieldRef, value);
      case 'ne':
        return sql`${fieldRef} != ${value}`;
      case 'gt':
        return sql`${fieldRef} > ${value}`;
      case 'gte':
        return sql`${fieldRef} >= ${value}`;
      case 'lt':
        return sql`${fieldRef} < ${value}`;
      case 'lte':
        return sql`${fieldRef} <= ${value}`;
      case 'like':
        return sql`${fieldRef} LIKE ${value}`;
      case 'ilike':
        return sql`${fieldRef} ILIKE ${value}`;
      case 'in':
        return inArray(fieldRef, Array.isArray(value) ? value : [value]);
      case 'notin':
        return sql`${fieldRef} NOT IN ${value}`;
      case 'isnull':
        return sql`${fieldRef} IS NULL`;
      case 'isnotnull':
        return sql`${fieldRef} IS NOT NULL`;
      default:
        return sql`1=1`;
    }
  }

  /**
   * 获取查询选项
   */
  getOptions(): QueryOptions {
    return this.options;
  }

  /**
   * 获取权限上下文
   */
  getContext(): PermissionContext | null {
    return this.context;
  }
}

// ============================================
// 预定义的权限视图
// ============================================

export type PermissionView = 'full' | 'readable' | 'editable' | 'managed';

/**
 * 获取用户对资源的视图类型
 */
export async function getResourceView(
  userId: number,
  resource: ResourceType,
  resourceId: number
): Promise<PermissionView> {
  const context = await getPermissionContext(userId, resource);
  const resourceConfig = RESOURCE_FIELD_MAP[resource];

  // 获取记录
  const tableMap: Partial<Record<ResourceType, any>> = {
    customer: schema.customers,
    project: schema.projects,
    solution: schema.solutions,
    task: schema.tasks,
    opportunity: schema.opportunities,
    bidding: schema.projectBiddings,
    quotation: schema.quotations,
    knowledge: schema.solutions,
    staff: schema.users,
  };

  const table = tableMap[resource];
  if (!table) return 'readable';

  const record = await db.select().from(table).where(eq(table.id, resourceId)).limit(1);

  if (!record[0]) {
    return 'readable';
  }

  const data = record[0];
  const scope = context.dataPermission?.scope || DataScope.SELF;

  // 全部数据权限
  if (scope === DataScope.ALL) {
    return 'full';
  }

  // 检查是否是管理者
  if (resourceConfig.managerField && data[resourceConfig.managerField] === userId) {
    return 'managed';
  }

  // 检查是否是创建者
  if (data[resourceConfig.creatorField] === userId) {
    return 'editable';
  }

  // 其他情况
  if (scope === DataScope.ROLE || scope === DataScope.MANAGE) {
    return 'readable';
  }

  return 'readable';
}

// ============================================
// 字段级权限控制
// ============================================

/**
 * 获取用户可访问的字段列表
 */
export async function getAccessibleFields(
  userId: number,
  resource: ResourceType
): Promise<string[]> {
  const context = await getPermissionContext(userId, resource);

  // 如果配置了允许的字段，返回配置
  if (context.dataPermission?.allowedFields) {
    return context.dataPermission.allowedFields;
  }

  // 默认返回所有字段
  const tableMap: Partial<Record<ResourceType, any>> = {
    customer: schema.customers,
    project: schema.projects,
    solution: schema.solutions,
    task: schema.tasks,
    opportunity: schema.opportunities,
    bidding: schema.projectBiddings,
    quotation: schema.quotations,
    knowledge: schema.solutions,
    staff: schema.users,
  };

  const table = tableMap[resource];
  if (!table) return [];
  
  // 返回表的所有列名
  return Object.keys(table);
}

/**
 * 过滤数据中的敏感字段
 */
export function filterSensitiveFields(
  data: Record<string, any>,
  accessibleFields: string[]
): Record<string, any> {
  const filtered: Record<string, any> = {};

  for (const field of accessibleFields) {
    if (field in data) {
      filtered[field] = data[field];
    }
  }

  return filtered;
}

// ============================================
// 导出便捷方法
// ============================================

export function createQueryBuilder(userId: number, resource: ResourceType): PermissionQueryBuilder {
  return new PermissionQueryBuilder(userId, resource);
}
