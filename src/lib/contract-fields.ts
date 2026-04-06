/**
 * 合同字段配置
 * 
 * 定义需要AI识别的关键字段及其表单位置映射
 * 红色字段为必填/关键识别字段
 */

export interface ContractFieldConfig {
  key: string;           // AI返回的字段名
  label: string;         // 字段中文名称
  formField: string;     // 对应表单字段名
  required: boolean;     // 是否必填
  section: string;       // 所属表单区块
  sectionId: string;     // 区块DOM ID
}

// AI需要识别的关键字段配置
export const CONTRACT_KEY_FIELDS: ContractFieldConfig[] = [
  // 基本信息
  {
    key: 'contractName',
    label: '项目名称（内容）',
    formField: 'contractName',
    required: true,
    section: '基本信息',
    sectionId: 'section-basic',
  },
  {
    key: 'contractCode',
    label: '合同编号',
    formField: 'contractCode',
    required: false,
    section: '基本信息',
    sectionId: 'section-basic',
  },
  
  // 签约方信息
  {
    key: 'signerUnit',
    label: '签约单位名称',
    formField: 'signerUnit',
    required: true,
    section: '签约方信息',
    sectionId: 'section-parties',
  },
  {
    key: 'userUnit',
    label: '用户单位名称',
    formField: 'userUnit',
    required: true,
    section: '签约方信息',
    sectionId: 'section-parties',
  },
  
  // 金额与时间
  {
    key: 'contractAmount',
    label: '合同金额',
    formField: 'contractAmount',
    required: true,
    section: '金额与时间',
    sectionId: 'section-amount',
  },
  {
    key: 'warrantyAmount',
    label: '质保金',
    formField: 'warrantyAmount',
    required: false,
    section: '金额与时间',
    sectionId: 'section-amount',
  },
  {
    key: 'signDate',
    label: '签订日期',
    formField: 'signDate',
    required: false,
    section: '金额与时间',
    sectionId: 'section-amount',
  },
  {
    key: 'signerName',
    label: '签订人',
    formField: 'signerName',
    required: false,
    section: '金额与时间',
    sectionId: 'section-amount',
  },
  {
    key: 'warrantyYears',
    label: '保修年限',
    formField: 'warrantyYears',
    required: false,
    section: '金额与时间',
    sectionId: 'section-amount',
  },
  {
    key: 'endDate',
    label: '项目要求完成时间',
    formField: 'requireCompleteDate',
    required: false,
    section: '金额与时间',
    sectionId: 'section-amount',
  },
  
  // 分类信息
  {
    key: 'userType',
    label: '用户类型',
    formField: 'userType',
    required: false,
    section: '分类信息',
    sectionId: 'section-category',
  },
  {
    key: 'projectCategory',
    label: '项目类别',
    formField: 'projectCategory',
    required: false,
    section: '分类信息',
    sectionId: 'section-category',
  },
  {
    key: 'fundSource',
    label: '资金来源',
    formField: 'fundSource',
    required: false,
    section: '分类信息',
    sectionId: 'section-category',
  },
  {
    key: 'bank',
    label: '银行',
    formField: 'bank',
    required: false,
    section: '分类信息',
    sectionId: 'section-category',
  },
  
  // 其他信息
  {
    key: 'projectAddress',
    label: '项目地址',
    formField: 'projectAddress',
    required: false,
    section: '其他信息',
    sectionId: 'section-other',
  },
  {
    key: 'projectContent',
    label: '备注（项目内容）',
    formField: 'remark',
    required: false,
    section: '其他信息',
    sectionId: 'section-other',
  },
];

// 获取未识别的字段
export function getMissingFields(extractedInfo: Record<string, any>): ContractFieldConfig[] {
  return CONTRACT_KEY_FIELDS.filter(field => {
    const value = extractedInfo[field.key];
    return value === null || value === undefined || value === '';
  });
}

// 获取未识别的必填字段
export function getMissingRequiredFields(extractedInfo: Record<string, any>): ContractFieldConfig[] {
  return CONTRACT_KEY_FIELDS.filter(field => {
    if (!field.required) return false;
    const value = extractedInfo[field.key];
    return value === null || value === undefined || value === '';
  });
}

// 按区块分组未识别字段
export function groupMissingFieldsBySection(missingFields: ContractFieldConfig[]): Record<string, ContractFieldConfig[]> {
  const grouped: Record<string, ContractFieldConfig[]> = {};
  
  missingFields.forEach(field => {
    if (!grouped[field.section]) {
      grouped[field.section] = [];
    }
    grouped[field.section].push(field);
  });
  
  return grouped;
}
