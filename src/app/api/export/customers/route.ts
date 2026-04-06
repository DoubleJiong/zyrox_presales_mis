import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { customers } from '@/db/schema';
import { eq, and, isNull, sql } from 'drizzle-orm';
import { ExportService, ExportColumn, createExportResponse, ExportFormat } from '@/lib/export-service';

// 客户数据类型
interface CustomerExport {
  id: number;
  customerId: string;
  customerName: string;
  customerTypeId: number | null;
  region: string | null;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  address: string | null;
  status: string;
  totalAmount: string | null;
  currentProjectCount: number;
  createdAt: Date | null;
}

// 导出列配置
const exportColumns: ExportColumn<CustomerExport>[] = [
  { key: 'customerId', header: '客户编号', width: 15 },
  { key: 'customerName', header: '客户名称', width: 25 },
  { 
    key: 'customerTypeId', 
    header: '客户类型ID', 
    width: 12
  },
  { key: 'region', header: '区域', width: 12 },
  { key: 'contactName', header: '联系人', width: 12 },
  { key: 'contactPhone', header: '联系电话', width: 15 },
  { key: 'contactEmail', header: '联系邮箱', width: 20 },
  { key: 'address', header: '地址', width: 30 },
  { 
    key: 'status', 
    header: '状态', 
    width: 10,
    formatter: (value) => {
      const labels: Record<string, string> = {
        active: '活跃',
        inactive: '不活跃',
        potential: '潜在',
        lost: '流失',
      };
      return labels[value as string] || value || '';
    }
  },
  { 
    key: 'totalAmount', 
    header: '历史中标总额', 
    width: 15,
    formatter: (value) => {
      if (!value) return '¥0';
      return `¥${Number(value).toLocaleString()}`;
    }
  },
  { key: 'currentProjectCount', header: '当前跟进项目数', width: 12 },
  { 
    key: 'createdAt', 
    header: '创建时间', 
    width: 18,
    formatter: (value) => {
      if (!value) return '';
      return new Date(value).toLocaleDateString('zh-CN');
    }
  },
];

// POST /api/export/customers - 导出客户数据
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      format = 'xlsx', 
      ids, 
      status, 
      customerTypeId,
      region 
    } = body;

    // 构建查询条件
    const conditions = [isNull(customers.deletedAt)];

    if (ids && ids.length > 0) {
      conditions.push(sql`${customers.id} IN (${ids.join(',')})`);
    }

    if (status) {
      conditions.push(eq(customers.status, status));
    }

    if (customerTypeId) {
      conditions.push(eq(customers.customerTypeId, customerTypeId));
    }

    if (region) {
      conditions.push(eq(customers.region, region));
    }

    // 查询数据
    const data = await db
      .select({
        id: customers.id,
        customerId: customers.customerId,
        customerName: customers.customerName,
        customerTypeId: customers.customerTypeId,
        region: customers.region,
        contactName: customers.contactName,
        contactPhone: customers.contactPhone,
        contactEmail: customers.contactEmail,
        address: customers.address,
        status: customers.status,
        totalAmount: customers.totalAmount,
        currentProjectCount: customers.currentProjectCount,
        createdAt: customers.createdAt,
      })
      .from(customers)
      .where(and(...conditions))
      .orderBy(customers.id);

    if (data.length === 0) {
      return NextResponse.json(
        { success: false, error: '没有可导出的数据' },
        { status: 400 }
      );
    }

    // 导出
    const buffer = ExportService.export({
      data: data as CustomerExport[],
      columns: exportColumns,
      filename: `客户列表_${new Date().toISOString().split('T')[0]}`,
      format: format as ExportFormat,
      sheetName: '客户列表',
    });

    return createExportResponse(
      buffer,
      `客户列表_${new Date().toISOString().split('T')[0]}`,
      format as ExportFormat
    );
  } catch (error) {
    console.error('Export customers API error:', error);
    return NextResponse.json(
      { success: false, error: '导出失败' },
      { status: 500 }
    );
  }
}
