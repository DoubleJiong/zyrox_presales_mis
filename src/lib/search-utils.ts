/**
 * 高级搜索工具
 * 支持多条件组合搜索、字段匹配、模糊搜索等
 */

// =====================================================
// 类型定义
// =====================================================

// 搜索条件操作符
export type SearchOperator =
  | 'eq'        // 等于
  | 'ne'        // 不等于
  | 'gt'        // 大于
  | 'gte'       // 大于等于
  | 'lt'        // 小于
  | 'lte'       // 小于等于
  | 'like'      // 模糊匹配
  | 'ilike'     // 不区分大小写模糊匹配
  | 'in'        // 包含在列表中
  | 'notIn'     // 不包含在列表中
  | 'between'   // 区间
  | 'isNull'    // 为空
  | 'isNotNull' // 不为空
  | 'contains'  // 包含（数组/JSON）
  | 'startsWith' // 以...开头
  | 'endsWith';  // 以...结尾

// 单个搜索条件
export interface SearchCondition {
  field: string;
  operator: SearchOperator;
  value: unknown;
  valueEnd?: unknown; // 用于between操作
}

// 搜索条件组
export interface SearchGroup {
  type: 'and' | 'or';
  conditions: SearchCondition[];
  groups?: SearchGroup[];
}

// 搜索配置
export interface SearchConfig {
  fields: SearchFieldConfig[];
  defaultOperator?: SearchOperator;
  maxConditions?: number;
}

// 字段配置
export interface SearchFieldConfig {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'multiSelect' | 'boolean';
  operators?: SearchOperator[];
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
  defaultValue?: unknown;
}

// 搜索结果
export interface SearchResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  filters: SearchCondition[];
}

// =====================================================
// 搜索字段预设配置
// =====================================================

// 客户搜索字段
export const CUSTOMER_SEARCH_FIELDS: SearchFieldConfig[] = [
  {
    key: 'customerName',
    label: '客户名称',
    type: 'text',
    operators: ['like', 'eq', 'startsWith', 'endsWith'],
    placeholder: '请输入客户名称',
  },
  {
    key: 'region',
    label: '区域',
    type: 'select',
    operators: ['eq', 'ne', 'in'],
    options: [
      { value: '华东', label: '华东' },
      { value: '华南', label: '华南' },
      { value: '华北', label: '华北' },
      { value: '华中', label: '华中' },
      { value: '西南', label: '西南' },
      { value: '西北', label: '西北' },
      { value: '东北', label: '东北' },
    ],
  },
  {
    key: 'status',
    label: '状态',
    type: 'select',
    operators: ['eq', 'ne', 'in'],
    options: [
      { value: 'active', label: '活跃' },
      { value: 'inactive', label: '非活跃' },
      { value: 'potential', label: '潜在' },
      { value: 'lost', label: '流失' },
    ],
  },
  {
    key: 'totalAmount',
    label: '历史成交金额',
    type: 'number',
    operators: ['eq', 'gt', 'gte', 'lt', 'lte', 'between'],
  },
  {
    key: 'createdAt',
    label: '创建时间',
    type: 'date',
    operators: ['eq', 'gt', 'gte', 'lt', 'lte', 'between'],
  },
  {
    key: 'contactName',
    label: '联系人',
    type: 'text',
    operators: ['like', 'eq'],
  },
  {
    key: 'contactPhone',
    label: '联系电话',
    type: 'text',
    operators: ['like', 'eq', 'startsWith'],
  },
];

// 项目搜索字段
export const PROJECT_SEARCH_FIELDS: SearchFieldConfig[] = [
  {
    key: 'projectName',
    label: '项目名称',
    type: 'text',
    operators: ['like', 'eq', 'startsWith', 'endsWith'],
    placeholder: '请输入项目名称',
  },
  {
    key: 'customerName',
    label: '客户名称',
    type: 'text',
    operators: ['like', 'eq'],
  },
  {
    key: 'projectStage',
    label: '项目阶段',
    type: 'select',
    operators: ['eq', 'ne', 'in'],
    options: [
      { value: 'opportunity', label: '商机' },
      { value: 'bidding', label: '投标' },
      { value: 'execution', label: '执行' },
      { value: 'settlement', label: '结算' },
      { value: 'archived', label: '归档' },
    ],
  },
  {
    key: 'status',
    label: '状态',
    type: 'select',
    operators: ['eq', 'ne', 'in'],
    options: [
      { value: 'draft', label: '草稿' },
      { value: 'ongoing', label: '进行中' },
      { value: 'completed', label: '已完成' },
      { value: 'cancelled', label: '已取消' },
    ],
  },
  {
    key: 'priority',
    label: '优先级',
    type: 'select',
    operators: ['eq', 'in'],
    options: [
      { value: 'high', label: '高' },
      { value: 'medium', label: '中' },
      { value: 'low', label: '低' },
    ],
  },
  {
    key: 'estimatedAmount',
    label: '预估金额',
    type: 'number',
    operators: ['eq', 'gt', 'gte', 'lt', 'lte', 'between'],
  },
  {
    key: 'progress',
    label: '进度',
    type: 'number',
    operators: ['eq', 'gt', 'gte', 'lt', 'lte', 'between'],
  },
  {
    key: 'startDate',
    label: '开始日期',
    type: 'date',
    operators: ['eq', 'gt', 'gte', 'lt', 'lte', 'between'],
  },
  {
    key: 'endDate',
    label: '结束日期',
    type: 'date',
    operators: ['eq', 'gt', 'gte', 'lt', 'lte', 'between'],
  },
  {
    key: 'createdAt',
    label: '创建时间',
    type: 'date',
    operators: ['eq', 'gt', 'gte', 'lt', 'lte', 'between'],
  },
];

// 用户搜索字段
export const USER_SEARCH_FIELDS: SearchFieldConfig[] = [
  {
    key: 'username',
    label: '用户名',
    type: 'text',
    operators: ['like', 'eq'],
  },
  {
    key: 'realName',
    label: '姓名',
    type: 'text',
    operators: ['like', 'eq'],
  },
  {
    key: 'email',
    label: '邮箱',
    type: 'text',
    operators: ['like', 'eq'],
  },
  {
    key: 'department',
    label: '部门',
    type: 'select',
    operators: ['eq', 'ne', 'in'],
  },
  {
    key: 'status',
    label: '状态',
    type: 'select',
    operators: ['eq', 'in'],
    options: [
      { value: 'active', label: '启用' },
      { value: 'inactive', label: '禁用' },
    ],
  },
];

// =====================================================
// 搜索条件解析
// =====================================================

/**
 * 解析搜索参数
 */
export function parseSearchParams(
  params: URLSearchParams,
  config: SearchConfig
): SearchCondition[] {
  const conditions: SearchCondition[] = [];
  const { fields } = config;

  for (const field of fields) {
    const value = params.get(field.key);
    const operator = (params.get(`${field.key}_operator`) as SearchOperator) || 'eq';
    const valueEnd = params.get(`${field.key}_end`);

    if (value !== null && value !== '') {
      conditions.push({
        field: field.key,
        operator,
        value: parseValue(value, field.type),
        valueEnd: valueEnd ? parseValue(valueEnd, field.type) : undefined,
      });
    }
  }

  // 解析全局搜索
  const globalSearch = params.get('search');
  if (globalSearch) {
    // 对所有文本字段添加模糊搜索条件
    for (const field of fields) {
      if (field.type === 'text') {
        conditions.push({
          field: field.key,
          operator: 'ilike',
          value: globalSearch,
        });
      }
    }
  }

  return conditions;
}

/**
 * 解析值
 */
function parseValue(value: string, type: string): unknown {
  switch (type) {
    case 'number':
      return parseFloat(value);
    case 'date':
      return new Date(value);
    case 'boolean':
      return value === 'true';
    case 'multiSelect':
      return value.split(',');
    default:
      return value;
  }
}

// =====================================================
// 搜索条件验证
// =====================================================

/**
 * 验证搜索条件
 */
export function validateSearchCondition(
  condition: SearchCondition,
  fieldConfig: SearchFieldConfig
): { valid: boolean; error?: string } {
  // 检查操作符是否允许
  if (fieldConfig.operators && !fieldConfig.operators.includes(condition.operator)) {
    return { valid: false, error: `字段 ${fieldConfig.label} 不支持操作符 ${condition.operator}` };
  }

  // 检查值是否有效
  if (condition.operator === 'between') {
    if (condition.value === undefined || condition.valueEnd === undefined) {
      return { valid: false, error: '区间搜索需要提供起始值和结束值' };
    }
  } else if (!['isNull', 'isNotNull'].includes(condition.operator)) {
    if (condition.value === undefined || condition.value === '') {
      return { valid: false, error: '请提供搜索值' };
    }
  }

  // 检查选项值
  if (fieldConfig.options && ['eq', 'ne', 'in', 'notIn'].includes(condition.operator)) {
    const validOptions = fieldConfig.options.map(o => o.value);
    const values = Array.isArray(condition.value) ? condition.value : [condition.value];
    for (const v of values) {
      if (!validOptions.includes(String(v))) {
        return { valid: false, error: `无效的选项值: ${v}` };
      }
    }
  }

  return { valid: true };
}

// =====================================================
// 搜索条件序列化
// =====================================================

/**
 * 序列化搜索条件为URL参数
 */
export function serializeSearchConditions(
  conditions: SearchCondition[]
): URLSearchParams {
  const params = new URLSearchParams();

  for (const condition of conditions) {
    if (condition.value !== undefined) {
      params.set(condition.field, String(condition.value));
      if (condition.operator !== 'eq') {
        params.set(`${condition.field}_operator`, condition.operator);
      }
      if (condition.valueEnd !== undefined) {
        params.set(`${condition.field}_end`, String(condition.valueEnd));
      }
    }
  }

  return params;
}

/**
 * 从URL参数恢复搜索条件
 */
export function deserializeSearchConditions(
  params: URLSearchParams
): SearchCondition[] {
  const conditions: SearchCondition[] = [];
  const processedFields = new Set<string>();

  for (const [key, value] of params.entries()) {
    if (key.endsWith('_operator') || key.endsWith('_end')) continue;

    if (!processedFields.has(key)) {
      processedFields.add(key);

      const operator = (params.get(`${key}_operator`) as SearchOperator) || 'eq';
      const valueEnd = params.get(`${key}_end`);

      if (value) {
        conditions.push({
          field: key,
          operator,
          value,
          valueEnd: valueEnd || undefined,
        });
      }
    }
  }

  return conditions;
}

// =====================================================
// 搜索历史管理
// =====================================================

const SEARCH_HISTORY_KEY = 'search_history';
const MAX_HISTORY_ITEMS = 10;

/**
 * 保存搜索历史
 */
export function saveSearchHistory(
  entityType: string,
  conditions: SearchCondition[],
  name?: string
): void {
  const history = getSearchHistory();
  const historyItem = {
    id: Date.now().toString(),
    entityType,
    name: name || `搜索 ${new Date().toLocaleString()}`,
    conditions,
    createdAt: new Date().toISOString(),
  };

  // 移除同名的旧记录
  const filtered = history.filter(
    h => !(h.entityType === entityType && h.name === historyItem.name)
  );

  // 添加新记录
  filtered.unshift(historyItem);

  // 限制数量
  const trimmed = filtered.slice(0, MAX_HISTORY_ITEMS);

  localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(trimmed));
}

/**
 * 获取搜索历史
 */
export function getSearchHistory(): Array<{
  id: string;
  entityType: string;
  name: string;
  conditions: SearchCondition[];
  createdAt: string;
}> {
  try {
    const stored = localStorage.getItem(SEARCH_HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * 删除搜索历史
 */
export function deleteSearchHistory(id: string): void {
  const history = getSearchHistory();
  const filtered = history.filter(h => h.id !== id);
  localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(filtered));
}

/**
 * 清空搜索历史
 */
export function clearSearchHistory(): void {
  localStorage.removeItem(SEARCH_HISTORY_KEY);
}
