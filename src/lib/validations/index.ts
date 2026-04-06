/**
 * 统一表单验证规则
 * 用于前后端共享验证逻辑，确保数据一致性
 */

// ============ 枚举定义 ============

export const CUSTOMER_STATUS = {
  values: ['potential', 'active', 'inactive', 'churned'] as const,
  labels: {
    potential: '潜在客户',
    active: '活跃客户',
    inactive: '非活跃客户',
    churned: '流失客户',
  } as const,
};

export const CUSTOMER_INDUSTRY = {
  values: ['高校', '高职', '中专', 'K12', '政府', '企业', '军警', '医院'] as const,
};

export const PROJECT_STATUS = {
  values: ['lead', 'opportunity', 'bidding', 'negotiation', 'contract', 'execution', 'completed', 'cancelled'] as const,
  labels: {
    lead: '商机线索',
    opportunity: '商机',
    bidding: '投标中',
    negotiation: '谈判中',
    contract: '已签约',
    execution: '执行中',
    completed: '已完成',
    cancelled: '已取消',
  } as const,
};

export const PROJECT_PRIORITY = {
  values: ['low', 'medium', 'high', 'urgent'] as const,
  labels: {
    low: '低',
    medium: '中',
    high: '高',
    urgent: '紧急',
  } as const,
};

export const PROJECT_STAGE = {
  values: ['opportunity', 'bidding', 'negotiation', 'contract', 'execution', 'completed'] as const,
  labels: {
    opportunity: '商机',
    bidding: '投标',
    negotiation: '谈判',
    contract: '合同',
    execution: '执行',
    completed: '完成',
  } as const,
};

export const OPPORTUNITY_STAGE = {
  values: ['initial', 'requirement', 'solution', 'quotation', 'negotiation', 'won', 'lost'] as const,
  labels: {
    initial: '初步接触',
    requirement: '需求确认',
    solution: '方案提供',
    quotation: '报价阶段',
    negotiation: '商务谈判',
    won: '赢单',
    lost: '输单',
  } as const,
};

export const WIN_RATE_BY_STAGE: Record<string, number> = {
  initial: 10,
  requirement: 20,
  solution: 40,
  quotation: 60,
  negotiation: 80,
  won: 100,
  lost: 0,
};

export const CONTRACT_STATUS = {
  values: ['draft', 'pending', 'signed', 'executing', 'completed', 'cancelled'] as const,
  labels: {
    draft: '草稿',
    pending: '待签署',
    signed: '已签署',
    executing: '执行中',
    completed: '已完成',
    cancelled: '已取消',
  } as const,
};

// ============ 通用验证函数 ============

/**
 * 验证字符串非空
 */
export function validateRequired(value: unknown, fieldName: string): string | null {
  if (value === undefined || value === null || value === '') {
    return `${fieldName}为必填项`;
  }
  if (typeof value === 'string' && value.trim() === '') {
    return `${fieldName}不能为空或仅包含空白字符`;
  }
  return null;
}

/**
 * 验证字符串长度
 */
export function validateLength(
  value: string | undefined | null,
  min: number,
  max: number,
  fieldName: string
): string | null {
  if (!value) return null;
  if (value.length < min) {
    return `${fieldName}长度不能少于${min}个字符`;
  }
  if (value.length > max) {
    return `${fieldName}长度不能超过${max}个字符`;
  }
  return null;
}

/**
 * 验证数字范围
 */
export function validateNumberRange(
  value: number | string | undefined | null,
  min: number,
  max: number,
  fieldName: string
): string | null {
  if (value === undefined || value === null || value === '') return null;
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) {
    return `${fieldName}必须是有效的数字`;
  }
  if (num < min) {
    return `${fieldName}不能小于${min.toLocaleString()}`;
  }
  if (num > max) {
    return `${fieldName}不能大于${max.toLocaleString()}`;
  }
  return null;
}

/**
 * 验证金额（非负数）
 */
export function validateAmount(
  value: number | string | undefined | null,
  fieldName: string,
  allowNegative = false
): string | null {
  if (value === undefined || value === null || value === '') return null;
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) {
    return `${fieldName}必须是有效的金额`;
  }
  if (!allowNegative && num < 0) {
    return `${fieldName}不能为负数`;
  }
  // 设置合理的上限（100亿）
  if (num > 10_000_000_000) {
    return `${fieldName}不能超过100亿`;
  }
  return null;
}

/**
 * 验证进度百分比（0-100）
 */
export function validateProgress(value: number | undefined | null): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'number' || isNaN(value)) {
    return '进度必须是数字';
  }
  if (value < 0 || value > 100) {
    return '进度必须在0-100之间';
  }
  return null;
}

/**
 * 验证胜率（0-100）
 */
export function validateWinRate(value: number | undefined | null): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'number' || isNaN(value)) {
    return '胜率必须是数字';
  }
  if (value < 0 || value > 100) {
    return '胜率必须在0-100之间';
  }
  return null;
}

/**
 * 验证邮箱格式
 */
export function validateEmail(value: string | undefined | null): string | null {
  if (!value) return null;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(value)) {
    return '邮箱格式不正确';
  }
  return null;
}

/**
 * 验证手机号格式（中国大陆）
 */
export function validatePhone(value: string | undefined | null): string | null {
  if (!value) return null;
  const phoneRegex = /^1[3-9]\d{9}$/;
  if (!phoneRegex.test(value)) {
    return '手机号格式不正确（需要11位大陆手机号）';
  }
  return null;
}

/**
 * 验证日期格式
 */
export function validateDate(value: string | Date | undefined | null, fieldName: string): string | null {
  if (!value) return null;
  const date = typeof value === 'string' ? new Date(value) : value;
  if (isNaN(date.getTime())) {
    return `${fieldName}日期格式不正确`;
  }
  return null;
}

/**
 * 验证日期逻辑（结束日期不能早于开始日期）
 */
export function validateDateRange(
  startDate: string | Date | undefined | null,
  endDate: string | Date | undefined | null
): string | null {
  if (!startDate || !endDate) return null;
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
  if (end < start) {
    return '结束日期不能早于开始日期';
  }
  return null;
}

/**
 * 验证日期不能是未来日期
 */
export function validateNotFutureDate(value: string | Date | undefined | null, fieldName: string): string | null {
  if (!value) return null;
  const date = typeof value === 'string' ? new Date(value) : value;
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  if (date > today) {
    return `${fieldName}不能是未来日期`;
  }
  return null;
}

/**
 * 验证枚举值
 */
export function validateEnum<T extends string>(
  value: string | undefined | null,
  allowedValues: readonly T[],
  fieldName: string
): string | null {
  if (!value) return null;
  if (!allowedValues.includes(value as T)) {
    return `无效的${fieldName}，允许的值：${allowedValues.join(', ')}`;
  }
  return null;
}

/**
 * 验证胜率与阶段一致性
 */
export function validateWinRateStageConsistency(winRate: number, stage: string): string | null {
  const expectedRate = WIN_RATE_BY_STAGE[stage];
  if (expectedRate !== undefined && Math.abs(winRate - expectedRate) > 20) {
    return `商机阶段「${OPPORTUNITY_STAGE.labels[stage as keyof typeof OPPORTUNITY_STAGE.labels] || stage}」的胜率通常为${expectedRate}%，您设置的${winRate}%可能不合理`;
  }
  return null;
}

/**
 * 验证项目进度与状态一致性
 */
export function validateProgressStatusConsistency(progress: number, status: string): string | null {
  // 已完成状态进度应为100
  if (status === 'completed' && progress < 100) {
    return '项目状态为「已完成」时，进度应为100%';
  }
  // 执行中状态进度应大于0
  if (status === 'execution' && progress === 0) {
    return '项目状态为「执行中」时，进度应大于0%';
  }
  return null;
}

// ============ 表单验证规则定义 ============

export const CUSTOMER_VALIDATION_RULES = {
  customerName: {
    required: true,
    minLength: 1,
    maxLength: 200,
    label: '客户名称',
  },
  customerTypeId: {
    required: true,
    label: '客户类型',
  },
  region: {
    required: true,
    maxLength: 50,
    label: '所属地区',
  },
  status: {
    required: false,
    enum: CUSTOMER_STATUS.values,
    defaultValue: 'potential',
    label: '客户状态',
  },
  industry: {
    required: false,
    enum: CUSTOMER_INDUSTRY.values,
    label: '所属行业',
  },
  contactEmail: {
    required: false,
    format: 'email',
    label: '联系邮箱',
  },
  contactPhone: {
    required: false,
    format: 'phone',
    label: '联系电话',
  },
  address: {
    required: false,
    maxLength: 500,
    label: '详细地址',
  },
  description: {
    required: false,
    maxLength: 2000,
    label: '备注',
  },
} as const;

export const PROJECT_VALIDATION_RULES = {
  projectName: {
    required: true,
    minLength: 1,
    maxLength: 200,
    label: '项目名称',
  },
  customerName: {
    required: true,
    minLength: 1,
    maxLength: 200,
    label: '客户名称',
  },
  projectTypeId: {
    required: false,
    label: '项目类型',
  },
  estimatedAmount: {
    required: false,
    type: 'amount',
    label: '预计预算',
  },
  actualAmount: {
    required: false,
    type: 'amount',
    label: '实际金额',
  },
  status: {
    required: false,
    enum: PROJECT_STATUS.values,
    defaultValue: 'lead',
    label: '项目状态',
  },
  priority: {
    required: false,
    enum: PROJECT_PRIORITY.values,
    defaultValue: 'medium',
    label: '优先级',
  },
  progress: {
    required: false,
    type: 'progress',
    defaultValue: 0,
    label: '项目进度',
  },
  projectStage: {
    required: false,
    enum: PROJECT_STAGE.values,
    defaultValue: 'opportunity',
    label: '项目阶段',
  },
  startDate: {
    required: false,
    type: 'date',
    label: '开始日期',
  },
  endDate: {
    required: false,
    type: 'date',
    label: '结束日期',
  },
  region: {
    required: false,
    maxLength: 50,
    label: '区域',
  },
  risks: {
    required: false,
    maxLength: 2000,
    label: '风险说明',
  },
  description: {
    required: false,
    maxLength: 2000,
    label: '项目描述',
  },
} as const;

export const OPPORTUNITY_VALIDATION_RULES = {
  opportunityName: {
    required: true,
    minLength: 1,
    maxLength: 200,
    label: '商机名称',
  },
  expectedAmount: {
    required: true,
    type: 'amount',
    label: '预期金额',
  },
  winRate: {
    required: true,
    type: 'winRate',
    defaultValue: 10,
    label: '胜率',
  },
  stage: {
    required: false,
    enum: OPPORTUNITY_STAGE.values,
    defaultValue: 'initial',
    label: '商机阶段',
  },
  expectedCloseDate: {
    required: false,
    type: 'date',
    label: '预计成交日期',
  },
} as const;

export const CONTRACT_VALIDATION_RULES = {
  contractName: {
    required: true,
    minLength: 1,
    maxLength: 200,
    label: '合同名称',
  },
  contractAmount: {
    required: true,
    type: 'amount',
    label: '合同金额',
  },
  contractType: {
    required: false,
    enum: ['框架合同', '订单合同', '服务合同', '采购合同', '其他'] as const,
    label: '合同类型',
  },
  signDate: {
    required: true,
    type: 'date',
    label: '签订日期',
  },
  endDate: {
    required: false,
    type: 'date',
    label: '结束日期',
  },
  status: {
    required: false,
    enum: CONTRACT_STATUS.values,
    defaultValue: 'draft',
    label: '合同状态',
  },
} as const;

// ============ 验证器工厂函数 ============

/**
 * 创建表单验证器
 */
export function createValidator<T extends Record<string, any>>(
  rules: Record<string, any>
) {
  return (data: Partial<T>): { valid: boolean; errors: Record<string, string> } => {
    const errors: Record<string, string> = {};

    for (const [field, rule] of Object.entries(rules)) {
      const value = data[field];
      const r = rule as any;

      // 必填验证
      if (r.required) {
        const error = validateRequired(value, r.label);
        if (error) {
          errors[field] = error;
          continue;
        }
      }

      // 字符串长度验证
      if (typeof value === 'string' && value) {
        if (r.minLength || r.maxLength) {
          const error = validateLength(value, r.minLength || 0, r.maxLength || Infinity, r.label);
          if (error) errors[field] = error;
        }
      }

      // 类型验证
      if (value !== undefined && value !== null) {
        switch (r.type) {
          case 'amount':
            const amountError = validateAmount(value, r.label);
            if (amountError) errors[field] = amountError;
            break;
          case 'progress':
            const progressError = validateProgress(Number(value));
            if (progressError) errors[field] = progressError;
            break;
          case 'winRate':
            const winRateError = validateWinRate(Number(value));
            if (winRateError) errors[field] = winRateError;
            break;
          case 'date':
            const dateError = validateDate(value, r.label);
            if (dateError) errors[field] = dateError;
            break;
        }

        // 格式验证
        if (r.format === 'email') {
          const emailError = validateEmail(String(value));
          if (emailError) errors[field] = emailError;
        } else if (r.format === 'phone') {
          const phoneError = validatePhone(String(value));
          if (phoneError) errors[field] = phoneError;
        }

        // 枚举验证
        if (r.enum) {
          const enumError = validateEnum(String(value), r.enum, r.label);
          if (enumError) errors[field] = enumError;
        }
      }
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors,
    };
  };
}

// 导出预定义验证器
export const validateCustomer = createValidator(CUSTOMER_VALIDATION_RULES);
export const validateProject = createValidator(PROJECT_VALIDATION_RULES);
export const validateOpportunity = createValidator(OPPORTUNITY_VALIDATION_RULES);
export const validateContract = createValidator(CONTRACT_VALIDATION_RULES);
