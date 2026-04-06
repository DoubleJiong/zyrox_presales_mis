import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { customers, projects, users, todos, schedules } from '@/db/schema';
import { isNull, eq, and, gte, lte, between, sql } from 'drizzle-orm';
import * as XLSX from 'xlsx';
import {
  getProjectCustomerTypeOrIndustryLabel,
  getProjectStageLabel,
  getProjectStatusLabel,
} from '@/lib/project-field-mappings';

/**
 * 通用数据导出 API
 * GET /api/export?type=customers&format=excel&startDate=2024-01-01&endDate=2024-12-31
 * 
 * 支持导出类型：
 * - customers: 客户数据
 * - projects: 项目数据
 * - performances: 绩效数据
 * - todos: 待办数据
 * - schedules: 日程数据
 * 
 * 支持格式：
 * - csv: CSV 格式
 * - excel: Excel 格式
 */

// 转义 CSV 字段
function escapeCSVField(field: any): string {
  if (field === null || field === undefined) {
    return '';
  }
  const str = String(field);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// 数组转换为 CSV
function arrayToCSV(headers: string[], data: any[]): string {
  const headerRow = headers.map(escapeCSVField).join(',');
  const dataRows = data.map(row =>
    headers.map(header => escapeCSVField(row[header])).join(',')
  );
  return [headerRow, ...dataRows].join('\n');
}

// 获取客户数据
async function getCustomersData(startDate?: string, endDate?: string) {
  const conditions = [isNull(customers.deletedAt)];
  
  const results = await db
    .select({
      客户编号: customers.customerId,
      客户名称: customers.customerName,
      区域: customers.region,
      状态: customers.status,
      历史中标总额: customers.totalAmount,
      当前跟进项目数: customers.currentProjectCount,
      最大中标金额: customers.maxProjectAmount,
      联系人: customers.contactName,
      联系电话: customers.contactPhone,
      联系邮箱: customers.contactEmail,
      地址: customers.address,
      描述: customers.description,
      创建时间: customers.createdAt,
      更新时间: customers.updatedAt,
    })
    .from(customers)
    .where(and(...conditions));

  // 状态转换
  return results.map(r => ({
    ...r,
    状态: r.状态 === 'active' ? '活跃' : r.状态 === 'inactive' ? '非活跃' : r.状态 === 'potential' ? '潜在' : '流失',
    历史中标总额: r.历史中标总额 ? `¥${Number(r.历史中标总额).toLocaleString()}` : '¥0',
    最大中标金额: r.最大中标金额 ? `¥${Number(r.最大中标金额).toLocaleString()}` : '¥0',
    创建时间: r.创建时间 ? new Date(r.创建时间).toLocaleString('zh-CN') : '',
    更新时间: r.更新时间 ? new Date(r.更新时间).toLocaleString('zh-CN') : '',
  }));
}

// 获取项目数据
async function getProjectsData(startDate?: string, endDate?: string) {
  const conditions = [isNull(projects.deletedAt)];

  const results = await db
    .select({
      项目编号: projects.projectCode,
      项目名称: projects.projectName,
      客户名称: projects.customerName,
      项目阶段: projects.projectStage,
      客户类型或行业: projects.industry,
      区域: projects.region,
      项目状态: projects.status,
      优先级: projects.priority,
      进度: projects.progress,
      预估金额: projects.estimatedAmount,
      实际金额: projects.actualAmount,
      合同金额: projects.contractAmount,
      开始日期: projects.startDate,
      结束日期: projects.endDate,
      描述: projects.description,
      风险说明: projects.risks,
      创建时间: projects.createdAt,
      更新时间: projects.updatedAt,
    })
    .from(projects)
    .where(and(...conditions));

  return results.map(r => ({
    ...r,
    项目阶段: getProjectStageLabel(r.项目阶段),
    客户类型或行业: getProjectCustomerTypeOrIndustryLabel(r.客户类型或行业),
    项目状态: getProjectStatusLabel(r.项目状态),
    优先级: r.优先级 === 'urgent' ? '紧急' : r.优先级 === 'high' ? '高' : r.优先级 === 'medium' ? '中' : '低',
    进度: `${r.进度}%`,
    预估金额: r.预估金额 ? `¥${Number(r.预估金额).toLocaleString()}` : '',
    实际金额: r.实际金额 ? `¥${Number(r.实际金额).toLocaleString()}` : '',
    合同金额: r.合同金额 ? `¥${Number(r.合同金额).toLocaleString()}` : '',
    开始日期: r.开始日期 || '',
    结束日期: r.结束日期 || '',
    创建时间: r.创建时间 ? new Date(r.创建时间).toLocaleString('zh-CN') : '',
    更新时间: r.更新时间 ? new Date(r.更新时间).toLocaleString('zh-CN') : '',
  }));
}

// 获取待办数据
async function getTodosData(userId?: number, startDate?: string, endDate?: string) {
  const conditions: any[] = [];
  
  if (userId) {
    conditions.push(eq(todos.assigneeId, userId));
  }

  const results = await db
    .select({
      标题: todos.title,
      类型: todos.type,
      分类: todos.category,
      优先级: todos.priority,
      状态: todos.todoStatus,
      截止日期: todos.dueDate,
      截止时间: todos.dueTime,
      关联类型: todos.relatedType,
      关联名称: todos.relatedName,
      描述: todos.description,
      创建时间: todos.createdAt,
    })
    .from(todos)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  return results.map(r => ({
    ...r,
    类型: r.类型 || '',
    分类: r.分类 === 'system' ? '系统' :
          r.分类 === 'reminder' ? '提醒' :
          r.分类 === 'business' ? '业务' : '个人',
    优先级: r.优先级 === 'urgent' ? '紧急' :
            r.优先级 === 'high' ? '高' :
            r.优先级 === 'medium' ? '中' : '低',
    状态: r.状态 === 'pending' ? '待处理' :
          r.状态 === 'in_progress' ? '进行中' :
          r.状态 === 'completed' ? '已完成' :
          r.状态 === 'cancelled' ? '已取消' : '已延期',
    截止日期: r.截止日期 || '',
    截止时间: r.截止时间 || '',
    创建时间: r.创建时间 ? new Date(r.创建时间).toLocaleString('zh-CN') : '',
  }));
}

// 获取日程数据
async function getSchedulesData(userId?: number, startDate?: string, endDate?: string) {
  const conditions: any[] = [];
  
  if (userId) {
    conditions.push(eq(schedules.userId, userId));
  }

  const results = await db
    .select({
      标题: schedules.title,
      类型: schedules.type,
      开始日期: schedules.startDate,
      开始时间: schedules.startTime,
      结束日期: schedules.endDate,
      结束时间: schedules.endTime,
      全天: schedules.allDay,
      地点: schedules.location,
      状态: schedules.scheduleStatus,
      描述: schedules.description,
      创建时间: schedules.createdAt,
    })
    .from(schedules)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  return results.map(r => ({
    ...r,
    类型: r.类型 === 'meeting' ? '会议' :
          r.类型 === 'visit' ? '拜访' :
          r.类型 === 'call' ? '电话' :
          r.类型 === 'presentation' ? '演示' : '其他',
    全天: r.全天 ? '是' : '否',
    状态: r.状态 === 'scheduled' ? '已安排' :
          r.状态 === 'completed' ? '已完成' : '已取消',
    开始日期: r.开始日期 || '',
    开始时间: r.开始时间 || '',
    结束日期: r.结束日期 || '',
    结束时间: r.结束时间 || '',
    创建时间: r.创建时间 ? new Date(r.创建时间).toLocaleString('zh-CN') : '',
  }));
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'customers';
    const format = searchParams.get('format') || 'excel';
    const userId = searchParams.get('userId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let data: any[] = [];
    let fileName = '';

    // 根据类型获取数据
    switch (type) {
      case 'customers':
        data = await getCustomersData(startDate || undefined, endDate || undefined);
        fileName = `客户数据_${new Date().toISOString().split('T')[0]}`;
        break;

      case 'projects':
        data = await getProjectsData(startDate || undefined, endDate || undefined);
        fileName = `项目数据_${new Date().toISOString().split('T')[0]}`;
        break;

      case 'todos':
        data = await getTodosData(userId ? parseInt(userId) : undefined, startDate || undefined, endDate || undefined);
        fileName = `待办数据_${new Date().toISOString().split('T')[0]}`;
        break;

      case 'schedules':
        data = await getSchedulesData(userId ? parseInt(userId) : undefined, startDate || undefined, endDate || undefined);
        fileName = `日程数据_${new Date().toISOString().split('T')[0]}`;
        break;

      default:
        return NextResponse.json(
          { success: false, message: '不支持的导出类型' },
          { status: 400 }
        );
    }

    // 检查是否有数据
    if (data.length === 0) {
      return NextResponse.json(
        { success: false, message: '没有可导出的数据' },
        { status: 400 }
      );
    }

    // 根据格式生成文件
    if (format === 'csv') {
      const headers = Object.keys(data[0]);
      const csvContent = arrayToCSV(headers, data);
      const bom = '\uFEFF';
      const csvWithBom = bom + csvContent;

      return new NextResponse(csvWithBom, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}.csv"`,
        },
      });
    } else {
      // Excel 格式
      const headers = Object.keys(data[0]);
      const ws = XLSX.utils.json_to_sheet(data, { header: headers });
      
      // 设置列宽
      const colWidths = headers.map(h => ({ wch: Math.max(h.length * 2, 15) }));
      ws['!cols'] = colWidths;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '数据');

      const excelBuffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
      const uint8Array = new Uint8Array(excelBuffer);

      return new NextResponse(uint8Array, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}.xlsx"`,
        },
      });
    }
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { success: false, message: '导出失败', error: String(error) },
      { status: 500 }
    );
  }
}
