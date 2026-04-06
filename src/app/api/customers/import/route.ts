import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { customers, customerTypes } from '@/db/schema';
import { sql, isNull, or, eq } from 'drizzle-orm';
import * as iconv from 'iconv-lite';
import { resolveCanonicalCustomerTypeCode } from '@/lib/customer-types';

// 检测编码并转换内容
function detectAndDecodeContent(buffer: ArrayBuffer): string {
  const uint8Array = new Uint8Array(buffer);
  
  // 检查 UTF-8 BOM
  if (uint8Array[0] === 0xEF && uint8Array[1] === 0xBB && uint8Array[2] === 0xBF) {
    console.log('[decodeContent] 检测到 UTF-8 BOM');
    return iconv.decode(Buffer.from(uint8Array.slice(3)), 'utf-8');
  }
  
  // 检查 UTF-16 LE BOM
  if (uint8Array[0] === 0xFF && uint8Array[1] === 0xFE) {
    console.log('[decodeContent] 检测到 UTF-16 LE BOM');
    return iconv.decode(Buffer.from(uint8Array), 'utf-16le');
  }
  
  // 检查 UTF-16 BE BOM
  if (uint8Array[0] === 0xFE && uint8Array[1] === 0xFF) {
    console.log('[decodeContent] 检测到 UTF-16 BE BOM');
    return iconv.decode(Buffer.from(uint8Array), 'utf-16be');
  }
  
  const buf = Buffer.from(uint8Array);
  
  // 尝试 UTF-8 解码
  const utf8Content = iconv.decode(buf, 'utf-8');
  
  // 检查是否有解码错误（替换字符 U+FFFD）
  const hasReplacementChars = utf8Content.includes('\uFFFD');
  
  // 检查是否包含常见的中文字符
  const hasChinese = /[\u4e00-\u9fa5]/.test(utf8Content);
  
  if (!hasReplacementChars && hasChinese) {
    console.log('[decodeContent] UTF-8 编码检测成功');
    return utf8Content;
  }
  
  // 尝试 GBK 解码（中国常用编码）
  console.log('[decodeContent] 尝试使用 GBK 编码解析');
  const gbkContent = iconv.decode(buf, 'gbk');
  
  // 检查 GBK 解码是否成功（应该包含中文字符）
  const gbkHasChinese = /[\u4e00-\u9fa5]/.test(gbkContent);
  
  if (gbkHasChinese) {
    console.log('[decodeContent] GBK 编码解析成功');
    return gbkContent;
  }
  
  // 如果都失败，返回 UTF-8
  console.log('[decodeContent] 编码检测失败，使用 UTF-8');
  return utf8Content;
}

// 解析 CSV 文件
function parseCSV(content: string): string[][] {
  console.log('[parseCSV] 原始内容长度:', content.length);
  console.log('[parseCSV] 前100字符:', content.substring(0, 100));
  console.log('[parseCSV] 前10个字符码:', content.substring(0, 10).split('').map(c => c.charCodeAt(0)));
  
  // 移除 BOM 字符（如果存在）
  if (content.charCodeAt(0) === 0xFEFF) {
    console.log('[parseCSV] 检测到BOM，移除');
    content = content.slice(1);
  }
  
  // 尝试检测其他可能的BOM变体
  if (content.charCodeAt(0) === 0xEF && content.charCodeAt(1) === 0xBB && content.charCodeAt(2) === 0xBF) {
    console.log('[parseCSV] 检测到UTF-8 BOM (EF BB BF)，移除');
    content = content.slice(3);
  }

  const lines: string[][] = [];
  let currentLine: string[] = [];
  let currentCell = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if ((char === ',' || char === '，') && !inQuotes) {
      // 支持英文逗号和中文逗号
      currentLine.push(currentCell.trim());
      currentCell = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (currentCell || currentLine.length > 0) {
        currentLine.push(currentCell.trim());
      }
      if (currentLine.length > 0) {
        lines.push(currentLine);
      }
      currentLine = [];
      currentCell = '';
      // 跳过换行符
      if (char === '\r' && content[i + 1] === '\n') {
        i++;
      }
    } else {
      currentCell += char;
    }
  }

  // 添加最后一行
  if (currentCell || currentLine.length > 0) {
    currentLine.push(currentCell.trim());
    if (currentLine.length > 0) {
      lines.push(currentLine);
    }
  }

  console.log('[parseCSV] 解析后的行数:', lines.length);
  if (lines.length > 0) {
    console.log('[parseCSV] 第一行(表头):', lines[0]);
    console.log('[parseCSV] 第一行每个字段的字符码:', lines[0].map(cell => 
      `"${cell}" -> [${cell.split('').map(c => c.charCodeAt(0)).join(', ')}]`
    ));
  }

  return lines;
}

// 客户状态映射
const statusMap: Record<string, string> = {
  '潜在': 'potential',
  'potential': 'potential',
  'POTENTIAL': 'potential',
  '活跃': 'active',
  'active': 'active',
  'ACTIVE': 'active',
  '非活跃': 'inactive',
  'inactive': 'inactive',
  'INACTIVE': 'inactive',
  '已流失': 'lost',
  'lost': 'lost',
  'LOST': 'lost',
};

// 地区全称到简称的映射
const regionMapping: Record<string, string> = {
  '北京市': '北京',
  '天津市': '天津',
  '上海市': '上海',
  '重庆市': '重庆',
  '河北省': '河北',
  '山西省': '山西',
  '辽宁省': '辽宁',
  '吉林省': '吉林',
  '黑龙江省': '黑龙江',
  '江苏省': '江苏',
  '浙江省': '浙江',
  '安徽省': '安徽',
  '福建省': '福建',
  '江西省': '江西',
  '山东省': '山东',
  '河南省': '河南',
  '湖北省': '湖北',
  '湖南省': '湖南',
  '广东省': '广东',
  '海南省': '海南',
  '四川省': '四川',
  '贵州省': '贵州',
  '云南省': '云南',
  '陕西省': '陕西',
  '甘肃省': '甘肃',
  '青海省': '青海',
  '台湾省': '台湾',
  '内蒙古自治区': '内蒙古',
  '广西壮族自治区': '广西',
  '西藏自治区': '西藏',
  '宁夏回族自治区': '宁夏',
  '新疆维吾尔自治区': '新疆',
  '香港特别行政区': '香港',
  '澳门特别行政区': '澳门',
  // 浙江省市
  '浙江省杭州市': '浙江',
  '浙江省湖州市': '浙江',
  '浙江省宁波市': '浙江',
  '浙江省温州市': '浙江',
};

// 省份后缀正则
const provinceSuffixRegex = /^(.+?)(省|自治区|维吾尔自治区|壮族自治区|回族自治区|特别行政区)$/;

/**
 * 标准化地区名称（自动转换全称到简称）
 */
function normalizeRegion(region: string): string {
  if (!region) return region;
  
  const trimmed = region.trim();
  
  // 1. 精确匹配
  if (regionMapping[trimmed]) {
    return regionMapping[trimmed];
  }
  
  // 2. 去除后缀
  const match = trimmed.match(provinceSuffixRegex);
  if (match) {
    const baseName = match[1];
    if (['内蒙古', '广西', '西藏', '宁夏', '新疆'].includes(baseName)) {
      return baseName;
    }
    return baseName;
  }
  
  // 3. 处理"省市"组合格式
  for (const [full, short] of Object.entries(regionMapping)) {
    if (trimmed.startsWith(full) || trimmed.includes(full)) {
      return short;
    }
  }
  
  return trimmed;
}

// 浙江省市列表
const zhejiangCities = ['杭州', '宁波', '温州', '嘉兴', '湖州', '绍兴', '金华', '衢州', '舟山', '台州', '丽水', '浙江'];

// 全国省份/大区域
const validRegions = [
  // 大区域
  '华北', '华东', '华南', '华中', '西北', '西南', '东北', '港澳台', '海外',
  // 省份/直辖市
  '北京', '天津', '河北', '山西', '内蒙古',
  '辽宁', '吉林', '黑龙江',
  '上海', '江苏', '安徽', '福建', '江西', '山东',
  '河南', '湖北', '湖南', '广东', '广西', '海南',
  '重庆', '四川', '贵州', '云南', '西藏',
  '陕西', '甘肃', '青海', '宁夏', '新疆',
  '香港', '澳门', '台湾',
  // 浙江省市
  ...zhejiangCities,
];

// 验证客户数据
function validateCustomerData(
  data: string[], 
  rowNumber: number,
  fieldIndexMap: Record<string, number>,
  existingNames: Set<string>,
  customerTypeByName: Map<string, number>,
  customerTypeByCode: Map<string, number>
): { valid: boolean; error?: string; customerData?: any } {
  // 检查数据行是否有效
  if (!data || !Array.isArray(data)) {
    return { valid: false, error: `第 ${rowNumber} 行：数据格式错误` };
  }

  // 辅助函数：根据字段名获取值
  const getFieldValue = (fieldNames: string[]): string => {
    for (const name of fieldNames) {
      const index = fieldIndexMap[name];
      if (index !== undefined && data[index] !== undefined) {
        return data[index].trim();
      }
    }
    return '';
  };

  // 必填字段检查
  const customerName = getFieldValue(['客户名称', 'customerName']);
  if (!customerName) {
    return { valid: false, error: `第 ${rowNumber} 行：客户名称不能为空` };
  }

  const customerTypeValue = getFieldValue(['客户类型', 'customerType']);
  if (!customerTypeValue) {
    return { valid: false, error: `第 ${rowNumber} 行：客户类型不能为空` };
  }

  const regionRaw = getFieldValue(['所属区域', '所属地区', '地区', '区域', 'region']);
  if (!regionRaw) {
    return { valid: false, error: `第 ${rowNumber} 行：所属区域不能为空` };
  }
  
  // 自动标准化地区名称（四川省 -> 四川，上海市 -> 上海 等）
  const region = normalizeRegion(regionRaw);

  // 检查客户名称是否重复
  if (existingNames.has(customerName)) {
    return { valid: false, error: `第 ${rowNumber} 行：客户名称 "${customerName}" 已存在` };
  }

  // 客户类型验证（优先通过名称匹配，其次通过code匹配）
  let customerTypeId: number | undefined;
  
  // 1. 先尝试通过名称精确匹配
  customerTypeId = customerTypeByName.get(customerTypeValue);
  
  // 2. 如果没找到，尝试通过名称忽略大小写匹配
  if (!customerTypeId) {
    for (const [name, id] of customerTypeByName.entries()) {
      if (name.toLowerCase() === customerTypeValue.toLowerCase()) {
        customerTypeId = id;
        break;
      }
    }
  }
  
  // 3. 如果还没找到，尝试通过code匹配
  if (!customerTypeId) {
    customerTypeId = customerTypeByCode.get(customerTypeValue.toUpperCase());
  }
  
  // 4. 最后尝试通过code忽略大小写匹配
  if (!customerTypeId) {
    for (const [code, id] of customerTypeByCode.entries()) {
      if (code.toLowerCase() === customerTypeValue.toLowerCase()) {
        customerTypeId = id;
        break;
      }
    }
  }

  // 5. 兼容旧枚举和业务别名，统一映射到收口后的客户类型编码
  if (!customerTypeId) {
    const canonicalCode = resolveCanonicalCustomerTypeCode(customerTypeValue);
    if (canonicalCode) {
      customerTypeId = customerTypeByCode.get(canonicalCode) || customerTypeByCode.get(canonicalCode.toUpperCase());
    }
  }
  
  if (!customerTypeId) {
    const validTypes = Array.from(customerTypeByName.keys()).join('、') || '请先在系统设置中添加客户类型';
    return { valid: false, error: `第 ${rowNumber} 行：客户类型 "${customerTypeValue}" 在系统中不存在，可选值：${validTypes}` };
  }

  // 客户状态验证（如果提供，支持中文和英文）
  let status = 'potential';
  const statusValue = getFieldValue(['客户状态', '状态', 'status']);
  if (statusValue) {
    const mappedStatus = statusMap[statusValue] || statusMap[statusValue.toLowerCase()];
    if (!mappedStatus) {
      const validStatuses = ['潜在/potential', '活跃/active', '非活跃/inactive', '已流失/lost'];
      return { valid: false, error: `第 ${rowNumber} 行：客户状态无效，可选值：${validStatuses.join(', ')}` };
    }
    status = mappedStatus;
  }

  // 获取可选字段
  const contactName = getFieldValue(['联系人', 'contactName']) || null;
  const contactPhone = getFieldValue(['联系电话', 'contactPhone']) || null;
  const contactEmail = getFieldValue(['联系邮箱', '邮箱', 'contactEmail']) || null;
  const address = getFieldValue(['详细地址', '地址', 'address']) || null;
  const description = getFieldValue(['客户描述', '描述', 'description']) || null;

  return {
    valid: true,
    customerData: {
      customerName,
      customerTypeId,
      region,
      status,
      contactName,
      contactPhone,
      contactEmail,
      address,
      description,
    }
  };
}

// POST - 导入客户
export async function POST(request: NextRequest) {
  console.log('[Customer Import] 开始处理导入请求');
  
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      console.log('[Customer Import] 错误：没有选择文件');
      return NextResponse.json(
        { success: false, error: '请选择要导入的文件' },
        { status: 400 }
      );
    }

    console.log('[Customer Import] 文件信息:', { name: file.name, size: file.size, type: file.type });

    // 验证文件类型
    if (!file.name.endsWith('.csv')) {
      console.log('[Customer Import] 错误：文件不是CSV格式');
      return NextResponse.json(
        { success: false, error: '只支持 CSV 格式文件' },
        { status: 400 }
      );
    }

    // 读取文件内容（使用 ArrayBuffer 支持多种编码）
    const buffer = await file.arrayBuffer();
    const content = detectAndDecodeContent(buffer);
    console.log('[Customer Import] 文件内容长度:', content.length);
    console.log('[Customer Import] 文件内容前100字符:', content.substring(0, 100));
    
    if (!content || content.trim().length === 0) {
      console.log('[Customer Import] 错误：文件内容为空');
      return NextResponse.json(
        { success: false, error: '文件内容为空' },
        { status: 400 }
      );
    }

    const lines = parseCSV(content);
    console.log('[Customer Import] 解析后的行数:', lines.length);
    if (lines.length > 0) {
      console.log('[Customer Import] 表头:', lines[0]);
    }

    if (!lines || lines.length < 2) {
      console.log('[Customer Import] 错误：文件内容为空或格式不正确');
      return NextResponse.json(
        { success: false, error: '文件内容为空或格式不正确，请确保至少包含表头和一行数据' },
        { status: 400 }
      );
    }

    // 验证表头
    const headers = lines[0];
    console.log('[Customer Import] 验证表头:', headers);
    
    if (!headers || !Array.isArray(headers)) {
      console.log('[Customer Import] 错误：表头格式不正确');
      return NextResponse.json(
        { success: false, error: '表头格式不正确，请下载标准模板' },
        { status: 400 }
      );
    }

    // 构建字段索引映射（支持不同的字段顺序）
    const fieldIndexMap: Record<string, number> = {};
    headers.forEach((header, index) => {
      if (header) {
        const normalizedHeader = header.trim();
        fieldIndexMap[normalizedHeader] = index;
        // 也支持英文字段名
        if (normalizedHeader === '客户名称') fieldIndexMap['customerName'] = index;
        if (normalizedHeader === '客户类型') fieldIndexMap['customerType'] = index;
        if (normalizedHeader === '所属区域' || normalizedHeader === '所属地区' || normalizedHeader === '地区' || normalizedHeader === '区域') fieldIndexMap['region'] = index;
        if (normalizedHeader === '客户状态' || normalizedHeader === '状态') fieldIndexMap['status'] = index;
        if (normalizedHeader === '联系人') fieldIndexMap['contactName'] = index;
        if (normalizedHeader === '联系电话') fieldIndexMap['contactPhone'] = index;
        if (normalizedHeader === '联系邮箱' || normalizedHeader === '邮箱') fieldIndexMap['contactEmail'] = index;
        if (normalizedHeader === '详细地址' || normalizedHeader === '地址') fieldIndexMap['address'] = index;
        if (normalizedHeader === '客户描述' || normalizedHeader === '描述') fieldIndexMap['description'] = index;
      }
    });
    console.log('[Customer Import] 字段索引映射:', fieldIndexMap);

    // 检查必填字段
    const hasCustomerName = fieldIndexMap['客户名称'] !== undefined || fieldIndexMap['customerName'] !== undefined;
    const hasCustomerType = fieldIndexMap['客户类型'] !== undefined || fieldIndexMap['customerType'] !== undefined;
    const hasRegion = fieldIndexMap['所属区域'] !== undefined || fieldIndexMap['所属地区'] !== undefined || 
                      fieldIndexMap['地区'] !== undefined || fieldIndexMap['区域'] !== undefined || 
                      fieldIndexMap['region'] !== undefined;
    
    console.log('[Customer Import] 表头验证结果:', { hasCustomerName, hasCustomerType, hasRegion });

    if (!hasCustomerName || !hasCustomerType) {
      console.log('[Customer Import] 错误：表头缺少必要字段');
      return NextResponse.json(
        { success: false, error: '表头缺少必要字段：客户名称、客户类型为必填项' },
        { status: 400 }
      );
    }

    // 获取现有客户名称（用于重复检查）
    console.log('[Customer Import] 正在获取现有客户列表...');
    const existingCustomers = await db
      .select({ customerName: customers.customerName })
      .from(customers)
      .where(isNull(customers.deletedAt));
    
    const existingNames = new Set(existingCustomers.map(c => c.customerName));
    console.log('[Customer Import] 现有客户数量:', existingNames.size);

    // 获取客户类型映射
    console.log('[Customer Import] 正在获取客户类型...');
    const customerTypesList = await db
      .select({ id: customerTypes.id, code: customerTypes.code, name: customerTypes.name })
      .from(customerTypes)
      .where(isNull(customerTypes.deletedAt));
    
    console.log('[Customer Import] 客户类型列表:', customerTypesList);
    
    // 构建两个映射：通过名称和通过code
    const customerTypeByName = new Map<string, number>();
    const customerTypeByCode = new Map<string, number>();
    
    customerTypesList.forEach(ct => {
      if (ct.id) {
        // 通过名称匹配
        if (ct.name) {
          customerTypeByName.set(ct.name, ct.id);
        }
        // 通过code匹配
        if (ct.code) {
          customerTypeByCode.set(ct.code.toUpperCase(), ct.id);
          customerTypeByCode.set(ct.code, ct.id);
        }
      }
    });

    console.log('[Customer Import] 客户类型映射 - 名称:', Object.fromEntries(customerTypeByName));
    console.log('[Customer Import] 客户类型映射 - Code:', Object.fromEntries(customerTypeByCode));

    // 如果数据库中没有客户类型，给出提示
    if (customerTypeByName.size === 0 && customerTypeByCode.size === 0) {
      console.log('[Customer Import] 错误：系统中没有客户类型数据');
      return NextResponse.json(
        { success: false, error: '系统中没有客户类型数据，请先在"客户类型配置"中添加客户类型' },
        { status: 400 }
      );
    }

    // 处理数据
    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];
    const customersToInsert: any[] = [];

    // 预先获取当前最大ID
    const maxIdResult = await db
      .select({ maxId: sql<number>`COALESCE(MAX(id), 0)` })
      .from(customers);
    let nextId = (maxIdResult[0]?.maxId || 0) + 1;

    // 从第2行开始处理数据（跳过表头）
    for (let i = 1; i < lines.length; i++) {
      const row = lines[i];

      // 跳过空行或无效行
      if (!row || !Array.isArray(row) || row.length === 0 || row.every(cell => !cell || cell.trim() === '')) {
        continue;
      }

      // 验证数据
      const validation = validateCustomerData(row, i + 1, fieldIndexMap, existingNames, customerTypeByName, customerTypeByCode);
      if (!validation.valid) {
        failedCount++;
        errors.push(validation.error!);
        continue;
      }

      const customerId = `CUST${String(nextId).padStart(3, '0')}`;
      nextId++;

      // 构建客户对象
      const customer = {
        customerId,
        customerName: validation.customerData!.customerName,
        customerTypeId: validation.customerData!.customerTypeId,
        region: validation.customerData!.region,
        status: validation.customerData!.status,
        contactName: validation.customerData!.contactName,
        contactPhone: validation.customerData!.contactPhone,
        contactEmail: validation.customerData!.contactEmail,
        address: validation.customerData!.address,
        description: validation.customerData!.description,
        totalAmount: '0',
        currentProjectCount: 0,
        maxProjectAmount: '0',
      };

      customersToInsert.push(customer);
      existingNames.add(validation.customerData!.customerName);
      successCount++;
    }

    // 批量插入客户数据
    if (customersToInsert.length > 0) {
      try {
        await db.insert(customers).values(customersToInsert);
      } catch (insertError) {
        console.error('Failed to insert customers:', insertError);
        // 如果批量插入失败，尝试逐条插入以获取更详细的错误信息
        let insertedCount = 0;
        const insertErrors: string[] = [];
        
        for (const customer of customersToInsert) {
          try {
            await db.insert(customers).values(customer);
            insertedCount++;
          } catch (singleError) {
            console.error(`Failed to insert customer ${customer.customerName}:`, singleError);
            insertErrors.push(`客户 "${customer.customerName}" 插入失败: ${singleError instanceof Error ? singleError.message : '未知错误'}`);
          }
        }
        
        // 更新成功和失败计数
        successCount = insertedCount;
        failedCount = failedCount + (customersToInsert.length - insertedCount);
        errors.push(...insertErrors);
        
        if (insertedCount === 0) {
          return NextResponse.json({
            success: false,
            error: '数据插入失败',
            message: '所有客户数据插入失败，请检查数据格式',
            details: insertErrors.slice(0, 10),
          }, { status: 400 });
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        success: successCount,
        failed: failedCount,
        total: successCount + failedCount,
        errors: errors.slice(0, 10), // 只返回前10个错误
        imported: customersToInsert.slice(0, 10), // 只返回前10条成功数据
      },
      message: `成功导入 ${successCount} 条客户数据${failedCount > 0 ? `，失败 ${failedCount} 条` : ''}${errors.length > 10 ? `（还有${errors.length - 10}条错误未显示）` : ''}`
    });
  } catch (error) {
    console.error('Failed to import customers:', error);
    return NextResponse.json(
      { 
        success: false,
        error: '导入失败，请稍后重试',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

// GET - 下载导入模板
export async function GET() {
  const template = `客户名称,客户类型,所属地区,客户状态,联系人,联系电话,联系邮箱,详细地址,客户描述
示例公司,企业,杭州,active,张三,13800138000,zhangsan@example.com,杭州市朝阳区,示例客户描述
杭州某大学,高校,杭州,potential,李老师,0571-88888888,li@school.edu.cn,杭州市西湖区,示例高校客户
某区政府,政府,宁波,active,王处长,0574-87654321,wang@gov.cn,宁波市海曙区,示例政府客户
某医院,医疗机构,温州,active,陈主任,0577-12345678,chen@hospital.com,温州市鹿城区,示例医疗客户
某中学,K12,嘉兴,active,赵老师,0573-98765432,zhao@school.com,嘉兴市南湖区,示例K12客户`;

  const filename = encodeURIComponent('客户导入模板.csv');

  return new NextResponse('\uFEFF' + template, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"; filename*=UTF-8''${filename}`,
    },
  });
}
