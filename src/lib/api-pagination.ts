/**
 * API 分页优化工具
 * 提供高效的分页查询和数据处理
 */

import { NextRequest } from 'next/server';
import { sql, SQL } from 'drizzle-orm';

// ============ 分页类型定义 ============

export interface PaginationParams {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// ============ 分页参数解析 ============

export function parsePaginationParams(
  request: NextRequest,
  options: {
    defaultPageSize?: number;
    maxPageSize?: number;
    allowedSortFields?: string[];
  } = {}
): PaginationParams {
  const {
    defaultPageSize = 20,
    maxPageSize = 100,
    allowedSortFields = [],
  } = options;

  const { searchParams } = request.nextUrl;

  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
  const pageSize = Math.min(maxPageSize, Math.max(1, parseInt(searchParams.get('pageSize') || String(defaultPageSize), 10) || defaultPageSize));

  const sortBy = searchParams.get('sortBy') || undefined;
  const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';

  // 验证排序字段
  const validSortBy = sortBy && allowedSortFields.includes(sortBy) ? sortBy : undefined;
  const validSortOrder = sortOrder === 'asc' || sortOrder === 'desc' ? sortOrder : 'desc';

  return {
    page,
    pageSize,
    sortBy: validSortBy,
    sortOrder: validSortOrder,
  };
}

// ============ 游标分页 ============

export interface CursorPaginationParams {
  cursor?: string;
  limit: number;
  direction?: 'forward' | 'backward';
}

export interface CursorPaginatedResult<T> {
  data: T[];
  pagination: {
    nextCursor: string | null;
    prevCursor: string | null;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * 编码游标
 */
export function encodeCursor(data: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(data)).toString('base64url');
}

/**
 * 解码游标
 */
export function decodeCursor(cursor: string): Record<string, unknown> | null {
  try {
    return JSON.parse(Buffer.from(cursor, 'base64url').toString('utf-8'));
  } catch {
    return null;
  }
}

// ============ 分页响应构建 ============

/**
 * 构建标准分页响应
 */
export function buildPaginatedResponse<T>(
  data: T[],
  total: number,
  params: PaginationParams
): PaginatedResult<T> {
  const { page, pageSize } = params;
  const totalPages = Math.ceil(total / pageSize);

  return {
    data,
    pagination: {
      page,
      pageSize,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}

// ============ 无限滚动支持 ============

export interface InfiniteScrollResult<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

// ============ 批量查询优化 ============

/**
 * 批量查询构建器
 * 减少数据库查询次数
 */
export class BatchQueryBuilder {
  private queries: Promise<unknown>[] = [];
  private keys: string[] = [];

  /**
   * 添加查询
   */
  add<T>(key: string, query: Promise<T>): this {
    this.queries.push(query);
    this.keys.push(key);
    return this;
  }

  /**
   * 执行所有查询
   */
  async execute(): Promise<Record<string, unknown>> {
    const results = await Promise.all(this.queries);

    const data: Record<string, unknown> = {};
    this.keys.forEach((key, index) => {
      data[key] = results[index];
    });

    return data;
  }
}

// ============ 分页链接生成 ============

/**
 * 生成分页链接
 */
export function generatePaginationLinks(
  baseUrl: string,
  params: PaginationParams,
  total: number
): {
  first: string;
  last: string;
  next: string | null;
  prev: string | null;
} {
  const totalPages = Math.ceil(total / params.pageSize);

  const buildUrl = (page: number) => {
    const url = new URL(baseUrl, 'http://localhost');
    url.searchParams.set('page', String(page));
    url.searchParams.set('pageSize', String(params.pageSize));
    if (params.sortBy) {
      url.searchParams.set('sortBy', params.sortBy);
      url.searchParams.set('sortOrder', params.sortOrder || 'desc');
    }
    return url.toString().replace('http://localhost', '');
  };

  return {
    first: buildUrl(1),
    last: buildUrl(totalPages),
    next: params.page < totalPages ? buildUrl(params.page + 1) : null,
    prev: params.page > 1 ? buildUrl(params.page - 1) : null,
  };
}

// ============ 导出 SQL 工具 ============

export { sql, SQL };
