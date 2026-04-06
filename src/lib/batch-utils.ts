/**
 * 批量操作工具
 * 支持批量更新、批量删除、批量状态变更等
 */

// =====================================================
// 类型定义
// =====================================================

export type BatchOperationType = 
  | 'delete' 
  | 'update' 
  | 'status_change' 
  | 'assign' 
  | 'export'
  | 'import';

export interface BatchOperation<T> {
  type: BatchOperationType;
  ids: number[];
  data?: Partial<T>;
  options?: BatchOperationOptions;
}

export interface BatchOperationOptions {
  skipValidation?: boolean;
  cascadeDelete?: boolean;
  notifyUsers?: boolean;
  auditLog?: boolean;
}

export interface BatchOperationResult {
  success: boolean;
  processed: number;
  failed: number;
  errors?: Array<{ id: number; error: string }>;
  message?: string;
}

export interface BatchOperationConfig<T> {
  entityName: string;
  primaryKey: string;
  maxBatchSize: number;
  validateItem?: (id: number, data?: Partial<T>) => Promise<boolean>;
  beforeOperation?: (ids: number[], data?: Partial<T>) => Promise<void>;
  afterOperation?: (ids: number[], data?: Partial<T>) => Promise<void>;
}

// =====================================================
// 批量操作执行器
// =====================================================

export class BatchOperationExecutor<T extends { id: number }> {
  private config: BatchOperationConfig<T>;
  private deleteFn: (ids: number[]) => Promise<number>;
  private updateFn: (id: number, data: Partial<T>) => Promise<T | null>;
  private getFn: (ids: number[]) => Promise<T[]>;

  constructor(
    config: BatchOperationConfig<T>,
    handlers: {
      delete: (ids: number[]) => Promise<number>;
      update: (id: number, data: Partial<T>) => Promise<T | null>;
      get: (ids: number[]) => Promise<T[]>;
    }
  ) {
    this.config = config;
    this.deleteFn = handlers.delete;
    this.updateFn = handlers.update;
    this.getFn = handlers.get;
  }

  /**
   * 执行批量操作
   */
  async execute(operation: BatchOperation<T>): Promise<BatchOperationResult> {
    const { type, ids, data, options = {} } = operation;

    // 验证批量大小
    if (ids.length > this.config.maxBatchSize) {
      return {
        success: false,
        processed: 0,
        failed: ids.length,
        message: `批量操作最多支持 ${this.config.maxBatchSize} 条记录`,
      };
    }

    // 执行前钩子
    if (this.config.beforeOperation) {
      await this.config.beforeOperation(ids, data);
    }

    // 根据操作类型执行
    let result: BatchOperationResult;

    switch (type) {
      case 'delete':
        result = await this.executeDelete(ids, options);
        break;
      case 'update':
        result = await this.executeUpdate(ids, data!, options);
        break;
      case 'status_change':
        result = await this.executeStatusChange(ids, data!, options);
        break;
      case 'assign':
        result = await this.executeAssign(ids, data!, options);
        break;
      default:
        result = {
          success: false,
          processed: 0,
          failed: ids.length,
          message: `不支持的操作类型: ${type}`,
        };
    }

    // 执行后钩子
    if (this.config.afterOperation && result.success) {
      await this.config.afterOperation(ids, data);
    }

    return result;
  }

  /**
   * 批量删除
   */
  private async executeDelete(
    ids: number[],
    options: BatchOperationOptions
  ): Promise<BatchOperationResult> {
    try {
      const deletedCount = await this.deleteFn(ids);

      return {
        success: true,
        processed: deletedCount,
        failed: ids.length - deletedCount,
        message: `成功删除 ${deletedCount} 条${this.config.entityName}`,
      };
    } catch (error) {
      return {
        success: false,
        processed: 0,
        failed: ids.length,
        message: error instanceof Error ? error.message : '删除失败',
      };
    }
  }

  /**
   * 批量更新
   */
  private async executeUpdate(
    ids: number[],
    data: Partial<T>,
    options: BatchOperationOptions
  ): Promise<BatchOperationResult> {
    const errors: Array<{ id: number; error: string }> = [];
    let processed = 0;

    for (const id of ids) {
      try {
        // 验证
        if (!options.skipValidation && this.config.validateItem) {
          const valid = await this.config.validateItem(id, data);
          if (!valid) {
            errors.push({ id, error: '验证失败' });
            continue;
          }
        }

        await this.updateFn(id, data);
        processed++;
      } catch (error) {
        errors.push({
          id,
          error: error instanceof Error ? error.message : '更新失败',
        });
      }
    }

    return {
      success: errors.length === 0,
      processed,
      failed: errors.length,
      errors: errors.length > 0 ? errors : undefined,
      message: `成功更新 ${processed} 条${this.config.entityName}`,
    };
  }

  /**
   * 批量状态变更
   */
  private async executeStatusChange(
    ids: number[],
    data: Partial<T>,
    options: BatchOperationOptions
  ): Promise<BatchOperationResult> {
    return this.executeUpdate(ids, data, options);
  }

  /**
   * 批量分配
   */
  private async executeAssign(
    ids: number[],
    data: Partial<T>,
    options: BatchOperationOptions
  ): Promise<BatchOperationResult> {
    return this.executeUpdate(ids, data, options);
  }
}

// =====================================================
// 批量操作预设配置
// =====================================================

// 客户批量操作配置
export const CUSTOMER_BATCH_CONFIG: BatchOperationConfig<{ id: number }> = {
  entityName: '客户',
  primaryKey: 'id',
  maxBatchSize: 100,
};

// 项目批量操作配置
export const PROJECT_BATCH_CONFIG: BatchOperationConfig<{ id: number }> = {
  entityName: '项目',
  primaryKey: 'id',
  maxBatchSize: 100,
};

// 用户批量操作配置
export const USER_BATCH_CONFIG: BatchOperationConfig<{ id: number }> = {
  entityName: '用户',
  primaryKey: 'id',
  maxBatchSize: 50,
};

// 线索批量操作配置
export const LEAD_BATCH_CONFIG: BatchOperationConfig<{ id: number }> = {
  entityName: '线索',
  primaryKey: 'id',
  maxBatchSize: 100,
};

// =====================================================
// 批量操作API
// =====================================================

/**
 * 批量操作请求体验证
 */
export function validateBatchRequest(
  ids: unknown,
  maxBatchSize: number = 100
): { valid: boolean; error?: string; parsedIds?: number[] } {
  if (!Array.isArray(ids)) {
    return { valid: false, error: 'ids 必须是数组' };
  }

  if (ids.length === 0) {
    return { valid: false, error: '请选择至少一条记录' };
  }

  if (ids.length > maxBatchSize) {
    return { valid: false, error: `一次最多操作 ${maxBatchSize} 条记录` };
  }

  const parsedIds = ids.map(id => {
    const num = Number(id);
    if (isNaN(num) || num <= 0) {
      return null;
    }
    return num;
  }).filter((id): id is number => id !== null);

  if (parsedIds.length !== ids.length) {
    return { valid: false, error: '包含无效的ID' };
  }

  return { valid: true, parsedIds };
}

/**
 * 创建批量操作响应
 */
export function createBatchResponse(
  result: BatchOperationResult
): { success: boolean; data: BatchOperationResult } {
  return {
    success: result.success,
    data: result,
  };
}
