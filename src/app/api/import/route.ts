import { NextRequest } from 'next/server';
import { db } from '@/db';
import { projects, customers, opportunities } from '@/db/schema';
import { successResponse, errorResponse } from '@/lib/api-response';
import { authenticate } from '@/lib/auth';

/**
 * Excel 导入 API
 * POST /api/import
 */
export async function POST(request: NextRequest) {
  try {
    const user = await authenticate(request);
    if (!user?.id) {
      return errorResponse('UNAUTHORIZED', '请先登录');
    }

    const body = await request.json();
    const { type, data } = body;

    if (!type || !data || !Array.isArray(data) || data.length === 0) {
      return errorResponse('BAD_REQUEST', '参数错误');
    }

    if (data.length > 500) {
      return errorResponse('BAD_REQUEST', '单次最多导入500条数据');
    }

    let result;
    switch (type) {
      case 'projects':
        result = await importProjects(data);
        break;
      case 'customers':
        result = await importCustomers(data);
        break;
      case 'opportunities':
        result = await importOpportunities(data);
        break;
      default:
        return errorResponse('BAD_REQUEST', '不支持的导入类型');
    }

    return successResponse(result);
  } catch (error) {
    console.error('Import error:', error);
    return errorResponse('INTERNAL_ERROR', '导入失败');
  }
}

async function importProjects(data: Record<string, any>[]) {
  const errors: { row: number; field: string; message: string }[] = [];
  const successItems: any[] = [];

  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    try {
      const projectCode = item.projectCode || `PRJ-${Date.now()}-${i}`;

      const [inserted] = await db.insert(projects).values({
        projectCode,
        projectName: item.projectName || '未命名项目',
        status: item.status || 'planning',
        priority: item.priority || 'medium',
        customerId: item.customerId ? Number(item.customerId) : null,
        managerId: item.managerId ? Number(item.managerId) : null,
        description: item.description || null,
      }).returning();

      successItems.push(inserted);
    } catch (error: any) {
      errors.push({
        row: i + 2,
        field: '数据',
        message: error.message || '导入失败',
      });
    }
  }

  return {
    success: errors.length === 0,
    total: data.length,
    succeeded: successItems.length,
    failed: errors.length,
    errors,
  };
}

async function importCustomers(data: Record<string, any>[]) {
  const errors: { row: number; field: string; message: string }[] = [];
  const successItems: any[] = [];

  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    try {
      const customerId = item.customerId || `CUS-${Date.now()}-${i}`;

      const [inserted] = await db.insert(customers).values({
        customerId,
        customerName: item.customerName || '未命名客户',
        status: item.status || 'potential',
        region: item.region || null,
        address: item.address || null,
        contactName: item.contact || null,
        contactPhone: item.phone || null,
        contactEmail: item.email || null,
      }).returning();

      successItems.push(inserted);
    } catch (error: any) {
      errors.push({
        row: i + 2,
        field: '数据',
        message: error.message || '导入失败',
      });
    }
  }

  return {
    success: errors.length === 0,
    total: data.length,
    succeeded: successItems.length,
    failed: errors.length,
    errors,
  };
}

async function importOpportunities(data: Record<string, any>[]) {
  const errors: { row: number; field: string; message: string }[] = [];
  const successItems: any[] = [];

  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    try {
      const [inserted] = await db.insert(opportunities).values({
        customerName: item.customerName || '未命名客户',
        contactName: item.contactName || '',
        contactPhone: item.contactPhone || '',
        projectName: item.projectName || '未命名商机',
        status: item.status || 'new',
        estimatedAmount: item.estimatedAmount ? String(item.estimatedAmount) : null,
        demandDescription: item.demandDescription || null,
        ownerId: 1, // 默认所有者
      }).returning();

      successItems.push(inserted);
    } catch (error: any) {
      errors.push({
        row: i + 2,
        field: '数据',
        message: error.message || '导入失败',
      });
    }
  }

  return {
    success: errors.length === 0,
    total: data.length,
    succeeded: successItems.length,
    failed: errors.length,
    errors,
  };
}

/**
 * 获取导入模板配置
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'projects';

  const templates: Record<string, { name: string; fields: string[] }> = {
    projects: {
      name: '项目导入模板',
      fields: ['项目编码', '项目名称', '客户ID', '项目经理ID', '状态', '优先级', '描述'],
    },
    customers: {
      name: '客户导入模板',
      fields: ['客户编码', '客户名称', '类型', '状态', '行业', '地址', '联系人', '电话', '邮箱'],
    },
    opportunities: {
      name: '商机导入模板',
      fields: ['客户名称', '联系人', '联系电话', '项目名称', '状态', '预计金额', '需求描述'],
    },
  };

  const template = templates[type];
  if (!template) {
    return errorResponse('BAD_REQUEST', '不支持的模板类型');
  }

  return successResponse({ type, ...template });
}
