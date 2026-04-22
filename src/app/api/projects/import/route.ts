import { NextRequest, NextResponse } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withAuth } from '@/lib/auth-middleware';
import { db } from '@/db';
import { projects, customers, users, attributes, subsidiaries } from '@/db/schema';
import { sql, eq, and, isNull } from 'drizzle-orm';
import * as XLSX from 'xlsx';
import * as iconv from 'iconv-lite';
import { PROJECT_STAGE_CONFIG, PROJECT_STATUS_CONFIG } from '@/lib/utils/status-transitions';
import { resolveProjectLifecycleForCreate } from '@/lib/project-lifecycle';
import {
  normalizeImportedProjectCustomerTypeOrIndustry,
  normalizeImportedRegion,
  PROJECT_IMPORT_TEMPLATE_EXAMPLE,
  PROJECT_IMPORT_TEMPLATE_HEADERS,
} from '@/lib/project-field-mappings';

/**
 * 项目导入 API V2
 * 支持 Excel 和 CSV 格式的项目数据导入
 * 支持预览和实际导入两种模式
 */

// 编码检测和转换
function detectAndDecodeContent(buffer: ArrayBuffer): string {
  const uint8Array = new Uint8Array(buffer);
  
  if (uint8Array[0] === 0xEF && uint8Array[1] === 0xBB && uint8Array[2] === 0xBF) {
    return iconv.decode(Buffer.from(uint8Array.slice(3)), 'utf-8');
  }
  if (uint8Array[0] === 0xFF && uint8Array[1] === 0xFE) {
    return iconv.decode(Buffer.from(uint8Array), 'utf-16le');
  }
  if (uint8Array[0] === 0xFE && uint8Array[1] === 0xFF) {
    return iconv.decode(Buffer.from(uint8Array), 'utf-16be');
  }
  
  const buf = Buffer.from(uint8Array);
  const utf8Content = iconv.decode(buf, 'utf-8');
  const hasReplacementChars = utf8Content.includes('\uFFFD');
  const hasChinese = /[\u4e00-\u9fa5]/.test(utf8Content);
  
  if (!hasReplacementChars && hasChinese) return utf8Content;
  
  const gbkContent = iconv.decode(buf, 'gbk');
  if (/[\u4e00-\u9fa5]/.test(gbkContent)) return gbkContent;
  
  return utf8Content;
}

// CSV解析
function parseCSV(content: string): string[][] {
  const lines: string[][] = [];
  let currentLine: string[] = [];
  let currentCell = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      currentLine.push(currentCell.trim());
      currentCell = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (currentCell || currentLine.length > 0) {
        currentLine.push(currentCell.trim());
      }
      if (currentLine.length > 0) lines.push(currentLine);
      currentLine = [];
      currentCell = '';
    } else {
      currentCell += char;
    }
  }
  
  if (currentCell || currentLine.length > 0) {
    currentLine.push(currentCell.trim());
    if (currentLine.length > 0) lines.push(currentLine);
  }
  
  return lines;
}

// 字段映射
const FIELD_MAPPING: Record<string, string> = {
  '项目名称': 'projectName',
  '项目名': 'projectName',
  '客户名称': 'customerName',
  '客户': 'customerName',
  '项目类型': 'projectTypeName',
  '类型': 'projectTypeName',
  '项目阶段': 'projectStageName',
  '阶段': 'projectStageName',
  '项目状态': 'statusName',
  '状态': 'statusName',
  '客户类型': 'industry',
  '客户类型/行业': 'industry',
  '行业': 'industry',
  '区域': 'region',
  '地区': 'region',
  '描述': 'description',
  '项目描述': 'description',
  '负责人': 'managerName',
  '项目经理': 'managerName',
  '预计金额': 'estimatedAmount',
  '预算金额': 'estimatedAmount',
  '预算': 'estimatedAmount',
  '开始日期': 'startDate',
  '结束日期': 'endDate',
  '预计交付日期': 'expectedDeliveryDate',
  '交付日期': 'expectedDeliveryDate',
  '优先级': 'priority',
  '风险': 'risks',
  '风险说明': 'risks',
  '年份': 'year',
  '年度': 'year',
  '资金来源': 'fundSource',
  '承接公司': 'contractingCompanyName',
  '招标方式': 'biddingMethod',
  '标签': 'tags',
};

// 状态映射
const STATUS_MAP: Record<string, string> = {
  '商机': 'lead',
  '线索': 'lead',
  '商机线索': 'lead',
  '跟进中': 'in_progress',
  '进行中': 'in_progress',
  '执行中': 'in_progress',
  '已中标': 'won',
  '中标': 'won',
  '已丢标': 'lost',
  '丢标': 'lost',
  '落标': 'lost',
  '已暂停': 'on_hold',
  '暂停': 'on_hold',
  '已取消': 'cancelled',
  '取消': 'cancelled',
  '已放弃': 'cancelled',
  '放弃': 'cancelled',
};

const STAGE_MAP: Record<string, { projectStage: string; bidResult?: string | null }> = {
  '商机': { projectStage: 'opportunity' },
  '线索': { projectStage: 'opportunity' },
  '商机线索': { projectStage: 'opportunity' },
  '商机阶段': { projectStage: 'opportunity' },
  '待审批': { projectStage: 'bidding_pending' },
  '投标立项待审批': { projectStage: 'bidding_pending' },
  '招标投标': { projectStage: 'bidding' },
  '投标': { projectStage: 'bidding' },
  '方案评审中': { projectStage: 'solution_review' },
  '评审': { projectStage: 'solution_review' },
  '合同/商务确认中': { projectStage: 'contract_pending' },
  '商务': { projectStage: 'contract_pending' },
  '执行准备中': { projectStage: 'delivery_preparing' },
  '准备': { projectStage: 'delivery_preparing' },
  '执行中': { projectStage: 'delivering' },
  '实施': { projectStage: 'delivering' },
  '实施阶段': { projectStage: 'delivering' },
  '结算中': { projectStage: 'settlement' },
  '结算': { projectStage: 'settlement' },
  '已归档': { projectStage: 'archived' },
  '归档': { projectStage: 'archived' },
  '已取消': { projectStage: 'cancelled' },
  '取消': { projectStage: 'cancelled' },
  '中标': { projectStage: 'archived', bidResult: 'won' },
  '已中标': { projectStage: 'archived', bidResult: 'won' },
  '丢标': { projectStage: 'archived', bidResult: 'lost' },
  '已丢标': { projectStage: 'archived', bidResult: 'lost' },
  '落标': { projectStage: 'archived', bidResult: 'lost' },
  '跟进中': { projectStage: 'bidding' },
  '进行中': { projectStage: 'bidding' },
  '已暂停': { projectStage: 'bidding' },
  '暂停': { projectStage: 'bidding' },
};

// 优先级兼容映射
const PRIORITY_MAP: Record<string, string> = {
  '高': 'high',
  '紧急': 'high',
  '中': 'medium',
  '普通': 'medium',
  '低': 'low',
};

function normalizeDictCode(code: string, category: string): string {
  if (!code) return code;
  if (code.startsWith(`${category}.`)) {
    return code.slice(category.length + 1);
  }
  if (code.startsWith(`${category}_`)) {
    return code.slice(category.length + 1);
  }
  return code;
}

function normalizeLookupValue(value: string): string {
  return value.trim().toLowerCase();
}

function setLookupValue<T>(map: Map<string, T>, key: string | null | undefined, value: T): void {
  if (!key) {
    return;
  }

  const trimmedKey = key.trim();
  if (!trimmedKey) {
    return;
  }

  map.set(trimmedKey, value);
  map.set(normalizeLookupValue(trimmedKey), value);
}

function findLookupValue<T>(map: Map<string, T>, key: string | null | undefined): T | undefined {
  if (!key) {
    return undefined;
  }

  return map.get(key) ?? map.get(normalizeLookupValue(key));
}

function buildProjectStatusMap(): Map<string, string> {
  const statusMap = new Map<string, string>();

  Object.entries(PROJECT_STATUS_CONFIG).forEach(([code, config]) => {
    setLookupValue(statusMap, code, code);
    setLookupValue(statusMap, config.label, code);
  });

  [
    ['商机', 'lead'],
    ['线索', 'lead'],
    ['商机线索', 'lead'],
    ['跟进中', 'in_progress'],
    ['进行中', 'in_progress'],
    ['执行中', 'in_progress'],
    ['中标', 'won'],
    ['已中标', 'won'],
    ['丢标', 'lost'],
    ['落标', 'lost'],
    ['已丢标', 'lost'],
    ['暂停', 'on_hold'],
    ['已暂停', 'on_hold'],
    ['取消', 'cancelled'],
    ['已取消', 'cancelled'],
  ].forEach(([label, code]) => setLookupValue(statusMap, label, code));

  return statusMap;
}

function buildProjectStageMap(): Map<string, { projectStage: string; bidResult?: string | null }> {
  const stageMap = new Map<string, { projectStage: string; bidResult?: string | null }>();

  Object.entries(PROJECT_STAGE_CONFIG).forEach(([code, config]) => {
    const value = { projectStage: code, bidResult: null };
    setLookupValue(stageMap, code, value);
    setLookupValue(stageMap, config.label, value);
    setLookupValue(stageMap, config.shortLabel, value);
  });

  Object.entries(STAGE_MAP).forEach(([label, value]) => {
    setLookupValue(stageMap, label, value);
  });

  return stageMap;
}

// 区域映射
function buildProjectTypeMap(projectTypeList: Array<{ code: string | null; name: string | null }>): Map<string, { code: string; name: string }> {
  const map = new Map<string, { code: string; name: string }>();

  projectTypeList.forEach((pt) => {
    const code = pt.code || '';
    const name = pt.name || code;
    const entry = { code, name };
    setLookupValue(map, name, entry);
    setLookupValue(map, code, entry);
  });

  return map;
}

function buildAttributeValueMap(
  items: Array<{ code: string; name: string; value: string | null }>,
  category: string,
): Map<string, string> {
  const map = new Map<string, string>();

  items.forEach((item) => {
    const normalizedCode = normalizeDictCode(item.code, category);
    const resolvedValue = item.value || normalizedCode;

    setLookupValue(map, item.name, resolvedValue);
    setLookupValue(map, item.code, resolvedValue);
    setLookupValue(map, normalizedCode, resolvedValue);
    setLookupValue(map, item.value, resolvedValue);
    setLookupValue(map, resolvedValue, resolvedValue);
  });

  return map;
}

// 解析Excel文件
function parseExcel(buffer: ArrayBuffer): string[][] {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' }) as string[][];
  return data;
}

// 解析项目数据
function parseProjects(data: string[][], headers: string[]): Array<Record<string, string>> {
  const results: Array<Record<string, string>> = [];
  
  // 建立字段索引映射
  const fieldIndexMap: Record<string, number> = {};
  headers.forEach((header, index) => {
    const fieldName = FIELD_MAPPING[header.trim()] || header.trim().toLowerCase();
    fieldIndexMap[fieldName] = index;
  });

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0 || (row.length === 1 && row[0] === '')) continue;

    const project: Record<string, string> = {};
    Object.entries(fieldIndexMap).forEach(([fieldName, index]) => {
      const value = row[index];
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        project[fieldName] = String(value).trim();
      }
    });

    // 必须有项目名称
    if (project.projectName) {
      project._rowNumber = String(i + 1);
      results.push(project);
    }
  }
  
  return results;
}

// 验证项目数据
function validateProjectData(
  project: Record<string, string>,
  rowNumber: number,
  existingNames: Set<string>,
  customerMap: Map<string, { id: number; name: string }>,
  userMap: Map<string, { id: number; name: string }>,
  projectTypeMap: Map<string, { name: string; code: string }>,
  stageMap: Map<string, { projectStage: string; bidResult?: string | null }>,
  statusMap: Map<string, string>,
  priorityMap: Map<string, string>,
  subsidiaryMap: Map<string, { id: number; name: string }>,
): { valid: boolean; error?: string; data?: any } {
  const errors: string[] = [];
  
  // 必填字段检查
  if (!project.projectName) {
    return { valid: false, error: `第 ${rowNumber} 行：项目名称不能为空` };
  }
  
  // 检查重复
  if (existingNames.has(project.projectName)) {
    return { valid: false, error: `第 ${rowNumber} 行：项目名称 "${project.projectName}" 已存在` };
  }

  // 准备数据
  const data: any = {
    projectName: project.projectName,
    customerName: project.customerName || '',
    customerId: null,
    projectTypeId: null, // deprecated
    managerId: null,
    industry: null,
    region: null,
    projectStage: 'opportunity',
    bidResult: null,
    status: 'lead',
    priority: 'medium',
    estimatedAmount: null,
    startDate: null,
    endDate: null,
    expectedDeliveryDate: null,
    description: project.description || '',
    risks: project.risks || '',
    year: null,
    fundSource: project.fundSource || '',
    tags: project.tags || '',
    contractingCompanyName: project.contractingCompanyName || '',
  };

  // 解析客户
  if (project.customerName) {
    const customer = customerMap.get(project.customerName);
    if (customer) {
      data.customerId = customer.id;
    } else {
      errors.push(`客户 "${project.customerName}" 不存在`);
    }
  }

  // 解析项目类型（使用字典匹配）
  if (project.projectTypeName) {
    const projectType = findLookupValue(projectTypeMap, project.projectTypeName);
    if (projectType) {
      data.projectType = projectType.code;
    } else {
      errors.push(`项目类型 "${project.projectTypeName}" 不存在`);
    }
  }

  const stageInput = project.projectStageName || project.statusName;
  if (stageInput) {
    const stageValue = findLookupValue(stageMap, stageInput);
    if (stageValue) {
      data.projectStage = stageValue.projectStage;
      data.bidResult = stageValue.bidResult ?? null;
    } else {
      errors.push(`阶段/状态 "${stageInput}" 无效`);
    }
  }

  // 解析兼容状态（仅兼容旧模板，最终仍由 projectStage 派生）
  if (project.statusName) {
    const status = STATUS_MAP[project.statusName] || findLookupValue(statusMap, project.statusName);
    if (status) {
      data.status = status;
    } else {
      errors.push(`状态 "${project.statusName}" 无效`);
    }
  }

  const createdLifecycle = resolveProjectLifecycleForCreate({
    projectStage: data.projectStage,
    bidResult: data.bidResult,
  });

  data.projectStage = createdLifecycle.projectStage;
  data.status = createdLifecycle.status;
  data.bidResult = createdLifecycle.bidResult;

  // 解析优先级
  if (project.priority) {
    const priority = findLookupValue(priorityMap, project.priority) || PRIORITY_MAP[project.priority];
    if (priority) {
      data.priority = priority;
    } else {
      errors.push(`优先级 "${project.priority}" 无效`);
    }
  }

  // 解析行业（兼容中英文标签；若无法识别则保留原值并给出警告）
  if (project.industry) {
    const normalizedIndustry = normalizeImportedProjectCustomerTypeOrIndustry(project.industry);
    if (normalizedIndustry === project.industry.trim()) {
      // 未能匹配任何已知行业枚举，给出提示（不阻断导入，保留原值）
      errors.push(`客户类型/行业 "${project.industry}" 无法识别，请使用：高校/高职/中专/K12/政府/企业/军警/医院/教育/医疗/金融/制造/科技/其他`);
    } else {
      data.industry = normalizedIndustry;
    }
  }

  // 解析区域（规范化为宏区域，支持宏区域名/省级短名/省级全称如"北京市"）
  if (project.region) {
    data.region = normalizeImportedRegion(project.region);
  }

  // 解析负责人
  if (project.managerName) {
    const manager = userMap.get(project.managerName);
    if (manager) {
      data.managerId = manager.id;
    } else {
      errors.push(`负责人 "${project.managerName}" 不存在`);
    }
  }

  // 解析承接公司
  if (project.contractingCompanyName) {
    const subsidiary = subsidiaryMap.get(project.contractingCompanyName);
    if (!subsidiary) {
      errors.push(`承接公司 "${project.contractingCompanyName}" 不存在，请使用系统中已有的分子公司名称`);
    }
  }

  // 解析金额
  if (project.estimatedAmount) {
    const amount = parseFloat(project.estimatedAmount.replace(/[,，]/g, ''));
    if (!isNaN(amount)) {
      data.estimatedAmount = amount;
    } else {
      errors.push(`预计金额 "${project.estimatedAmount}" 格式无效，请填写数字（如：8000000）`);
    }
  }

  // 解析日期
  const parseDate = (dateStr: string): string | null => {
    if (!dateStr) return null;
    // 支持多种格式
    const formats = [
      /^(\d{4})-(\d{1,2})-(\d{1,2})$/, // YYYY-MM-DD
      /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/, // YYYY/MM/DD
      /^(\d{4})年(\d{1,2})月(\d{1,2})日?$/, // 中文格式
    ];
    for (const regex of formats) {
      const match = dateStr.match(regex);
      if (match) {
        const [_, year, month, day] = match;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
    }
    // Excel日期数字
    const excelDate = parseFloat(dateStr);
    if (!isNaN(excelDate) && excelDate > 1000) {
      const date = XLSX.SSF.parse_date_code(excelDate);
      if (date) {
        return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
      }
    }
    return null;
  };

  if (project.startDate) {
    const parsed = parseDate(project.startDate);
    if (parsed) {
      data.startDate = parsed;
    } else {
      errors.push(`开始日期 "${project.startDate}" 格式无效，请使用 YYYY-MM-DD`);
    }
  }
  if (project.endDate) {
    const parsed = parseDate(project.endDate);
    if (parsed) {
      data.endDate = parsed;
    } else {
      errors.push(`结束日期 "${project.endDate}" 格式无效，请使用 YYYY-MM-DD`);
    }
  }
  if (project.expectedDeliveryDate) {
    const parsed = parseDate(project.expectedDeliveryDate);
    if (parsed) {
      data.expectedDeliveryDate = parsed;
    } else {
      errors.push(`预计交付日期 "${project.expectedDeliveryDate}" 格式无效，请使用 YYYY-MM-DD`);
    }
  }

  // 解析年份
  if (project.year) {
    const year = parseInt(project.year);
    if (!isNaN(year) && year >= 2000 && year <= 2100) {
      data.year = year;
    }
  }

  // 如果有错误，返回部分有效数据和错误
  return {
    valid: errors.length === 0,
    error: errors.length > 0 ? `第 ${rowNumber} 行：${errors.join('；')}` : undefined,
    data,
  };
}

// 生成项目编码
async function generateProjectCode(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `PRJ${year}`;
  
  const result = await db.execute(sql`
    SELECT project_code FROM bus_project 
    WHERE project_code LIKE ${prefix + '%'} 
    ORDER BY project_code DESC LIMIT 1
  `);
  
  let nextNum = 1;
  if (result && result.length > 0) {
    const lastCode = result[0].project_code as string;
    const lastNum = parseInt(lastCode.replace(prefix, ''));
    if (!isNaN(lastNum)) {
      nextNum = lastNum + 1;
    }
  }
  
  return `${prefix}${String(nextNum).padStart(4, '0')}`;
}

// POST - 预览或导入项目
export const POST = withAuth(async (request: NextRequest, context: { userId: number }) => {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const mode = formData.get('mode') as string || 'preview'; // preview 或 import
    const userId = context.userId;

    if (!file) {
      return errorResponse('BAD_REQUEST', '请上传文件');
    }

    const fileName = file.name.toLowerCase();
    const buffer = await file.arrayBuffer();

    let data: string[][] = [];
    let headers: string[] = [];

    // 解析文件
    if (fileName.endsWith('.csv')) {
      const content = detectAndDecodeContent(buffer);
      data = parseCSV(content);
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      data = parseExcel(buffer);
    } else {
      return errorResponse('BAD_REQUEST', '不支持的文件格式，请上传 CSV 或 Excel 文件');
    }

    if (data.length < 2) {
      return errorResponse('BAD_REQUEST', '文件内容为空或格式不正确');
    }

    headers = data[0].map(h => h.toString().trim());
    const projectList = parseProjects(data, headers);

    if (projectList.length === 0) {
      return errorResponse('BAD_REQUEST', '未找到有效的项目数据');
    }

    // 加载关联数据
    const [customerList, userList, projectTypeList, priorityDictItems, existingProjectNames, subsidiaryList] = await Promise.all([
      // 客户
      db.select({ id: customers.id, name: customers.customerName })
        .from(customers)
        .where(sql`${customers.deletedAt} IS NULL`),
      // 用户
      db.select({ id: users.id, name: users.realName })
        .from(users)
        .where(sql`${users.deletedAt} IS NULL`),
      // 项目类型（从字典）
      db.select({ code: attributes.value, name: attributes.name })
        .from(attributes)
        .where(and(
          eq(attributes.category, 'project_type'),
          eq(attributes.status, 'active'),
          isNull(attributes.deletedAt),
        )),
      // 优先级字典
      db.select({ code: attributes.code, name: attributes.name, value: attributes.value })
        .from(attributes)
        .where(and(
          eq(attributes.category, 'project_priority'),
          eq(attributes.status, 'active'),
          isNull(attributes.deletedAt),
        )),
      // 已存在的项目名称
      db.select({ projectName: projects.projectName })
        .from(projects)
        .where(sql`${projects.deletedAt} IS NULL`),
      // 分子公司（用于承接公司匹配）
      db.select({ id: subsidiaries.id, name: subsidiaries.subsidiaryName })
        .from(subsidiaries)
        .where(isNull(subsidiaries.deletedAt)),
    ]);

    // 建立映射
    const customerMap = new Map(customerList.map(c => [c.name, c]));
    const userMap = new Map(userList.map(u => [u.name, u]));
    const projectTypeMap = buildProjectTypeMap(projectTypeList);
    const subsidiaryMap = new Map(subsidiaryList.map(s => [s.name, s]));
    const stageDictMap = buildProjectStageMap();
    const statusDictMap = buildProjectStatusMap();
    const priorityDictMap = buildAttributeValueMap(priorityDictItems, 'project_priority');
    const existingNames = new Set(existingProjectNames.map(p => p.projectName));

    // 验证所有项目
    const validatedProjects: Array<{ row: number; project: Record<string, string>; valid: boolean; error?: string; data?: any }> = [];
    const errors: string[] = [];
    const validProjects: any[] = [];

    for (const project of projectList) {
      const rowNumber = parseInt(project._rowNumber || '0');
      const result = validateProjectData(project, rowNumber, existingNames, customerMap, userMap, projectTypeMap, stageDictMap, statusDictMap, priorityDictMap, subsidiaryMap);
      
      validatedProjects.push({
        row: rowNumber,
        project,
        valid: result.valid,
        error: result.error,
        data: result.data,
      });

      if (!result.valid) {
        errors.push(result.error!);
      } else {
        validProjects.push(result.data);
        existingNames.add(project.projectName); // 防止文件内重复
      }
    }

    // 预览模式：只返回验证结果
    if (mode === 'preview') {
      return NextResponse.json({
        success: true,
        data: {
          total: projectList.length,
          valid: validProjects.length,
          invalid: errors.length,
          headers,
          projects: validatedProjects.map(p => ({
            row: p.row,
            projectName: p.project.projectName,
            customerName: p.project.customerName,
            statusName: p.project.projectStageName || p.project.statusName,
            valid: p.valid,
            error: p.error,
          })),
          errors: errors.length > 0 ? errors : undefined,
        },
      });
    }

    // 导入模式：执行实际导入
    if (validProjects.length === 0) {
      return errorResponse('BAD_REQUEST', '没有有效的项目可以导入');
    }

    let successCount = 0;
    const importErrors: string[] = [];

    for (const projectData of validProjects) {
      try {
        const projectCode = await generateProjectCode();
        
        await db.insert(projects).values({
          projectCode,
          projectName: projectData.projectName,
          customerId: projectData.customerId,
          customerName: projectData.customerName,
          projectTypeId: null, // deprecated
          projectType: projectData.projectType || null,
          projectStage: projectData.projectStage,
          status: projectData.status,
          bidResult: projectData.bidResult,
          priority: projectData.priority,
          industry: projectData.industry,
          region: projectData.region,
          managerId: projectData.managerId,
          estimatedAmount: projectData.estimatedAmount ? String(projectData.estimatedAmount) : null,
          startDate: projectData.startDate,
          endDate: projectData.endDate,
          expectedDeliveryDate: projectData.expectedDeliveryDate,
          description: projectData.description,
          risks: projectData.risks,
          year: projectData.year,
          fundSource: projectData.fundSource,
          contractingCompanyId: projectData.contractingCompanyName
            ? (subsidiaryMap.get(projectData.contractingCompanyName)?.id || null)
            : null,
        });
        
        successCount++;
      } catch (error) {
        importErrors.push(`导入项目 "${projectData.projectName}" 失败：${error}`);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        total: projectList.length,
        success: successCount,
        failed: projectList.length - successCount,
        errors: importErrors.length > 0 ? importErrors : undefined,
      },
    });

  } catch (error) {
    console.error('Failed to import projects:', error);
    return errorResponse('INTERNAL_ERROR', '导入失败');
  }
});

// GET - 获取导入模板
export const GET = withAuth(async () => {
  return NextResponse.json({
    success: true,
    data: {
      headers: PROJECT_IMPORT_TEMPLATE_HEADERS,
      example: PROJECT_IMPORT_TEMPLATE_EXAMPLE,
    },
  });
});
