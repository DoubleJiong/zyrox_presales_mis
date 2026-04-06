/**
 * 数据导出工具
 * 支持Excel和CSV格式导出
 */

import * as XLSX from 'xlsx';

// =====================================================
// 类型定义
// =====================================================

export type ExportFormat = 'xlsx' | 'csv' | 'json';

export interface ExportColumn<T> {
  key: keyof T | string;
  header: string;
  width?: number;
  formatter?: (value: unknown, row: T) => string | number;
}

export interface ExportOptions<T> {
  filename: string;
  sheetName?: string;
  format: ExportFormat;
  columns: ExportColumn<T>[];
  data: T[];
}

export interface ExportResult {
  success: boolean;
  filename: string;
  size: number;
  downloadUrl?: string;
  error?: string;
}

// =====================================================
// 数据处理
// =====================================================

/**
 * 格式化导出数据
 */
function formatExportData<T>(
  data: T[],
  columns: ExportColumn<T>[]
): Record<string, unknown>[] {
  return data.map(row => {
    const formattedRow: Record<string, unknown> = {};

    for (const col of columns) {
      const key = col.key as string;
      let value = (row as Record<string, unknown>)[key];

      // 应用格式化函数
      if (col.formatter) {
        value = col.formatter(value, row);
      }

      // 处理特殊类型
      if (value instanceof Date) {
        value = value.toLocaleString('zh-CN');
      } else if (value === null || value === undefined) {
        value = '';
      } else if (typeof value === 'boolean') {
        value = value ? '是' : '否';
      } else if (typeof value === 'object') {
        value = JSON.stringify(value);
      }

      formattedRow[col.header] = value;
    }

    return formattedRow;
  });
}

// =====================================================
// Excel导出
// =====================================================

/**
 * 导出为Excel文件
 */
export function exportToExcel<T>(options: ExportOptions<T>): ExportResult {
  try {
    const { filename, sheetName = 'Sheet1', columns, data } = options;

    // 格式化数据
    const formattedData = formatExportData(data, columns);

    // 创建工作簿
    const workbook = XLSX.utils.book_new();

    // 创建工作表
    const worksheet = XLSX.utils.json_to_sheet(formattedData);

    // 设置列宽
    const colWidths = columns.map(col => ({ wch: col.width || 15 }));
    worksheet['!cols'] = colWidths;

    // 添加工作表到工作簿
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // 生成文件
    const excelBuffer = XLSX.write(workbook, {
      type: 'buffer',
      bookType: 'xlsx',
    });

    // 创建下载链接
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const downloadUrl = URL.createObjectURL(blob);
    const finalFilename = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;

    return {
      success: true,
      filename: finalFilename,
      size: blob.size,
      downloadUrl,
    };
  } catch (error) {
    return {
      success: false,
      filename: options.filename,
      size: 0,
      error: error instanceof Error ? error.message : '导出失败',
    };
  }
}

// =====================================================
// CSV导出
// =====================================================

/**
 * 导出为CSV文件
 */
export function exportToCSV<T>(options: ExportOptions<T>): ExportResult {
  try {
    const { filename, columns, data } = options;

    // 格式化数据
    const formattedData = formatExportData(data, columns);

    // 获取表头
    const headers = columns.map(col => col.header);

    // 生成CSV内容
    const csvRows: string[] = [];

    // 添加表头
    csvRows.push(headers.map(h => `"${h}"`).join(','));

    // 添加数据行
    for (const row of formattedData) {
      const values = headers.map(header => {
        const value = row[header];
        if (value === null || value === undefined) {
          return '""';
        }
        // 转义双引号
        const strValue = String(value).replace(/"/g, '""');
        return `"${strValue}"`;
      });
      csvRows.push(values.join(','));
    }

    const csvContent = csvRows.join('\n');

    // 添加BOM以支持中文
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8' });

    const downloadUrl = URL.createObjectURL(blob);
    const finalFilename = filename.endsWith('.csv') ? filename : `${filename}.csv`;

    return {
      success: true,
      filename: finalFilename,
      size: blob.size,
      downloadUrl,
    };
  } catch (error) {
    return {
      success: false,
      filename: options.filename,
      size: 0,
      error: error instanceof Error ? error.message : '导出失败',
    };
  }
}

// =====================================================
// JSON导出
// =====================================================

/**
 * 导出为JSON文件
 */
export function exportToJSON<T>(options: ExportOptions<T>): ExportResult {
  try {
    const { filename, columns, data } = options;

    // 格式化数据
    const formattedData = formatExportData(data, columns);

    const jsonContent = JSON.stringify(formattedData, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });

    const downloadUrl = URL.createObjectURL(blob);
    const finalFilename = filename.endsWith('.json') ? filename : `${filename}.json`;

    return {
      success: true,
      filename: finalFilename,
      size: blob.size,
      downloadUrl,
    };
  } catch (error) {
    return {
      success: false,
      filename: options.filename,
      size: 0,
      error: error instanceof Error ? error.message : '导出失败',
    };
  }
}

// =====================================================
// 统一导出接口
// =====================================================

/**
 * 导出数据
 */
export function exportData<T>(options: ExportOptions<T>): ExportResult {
  const { format } = options;

  switch (format) {
    case 'xlsx':
      return exportToExcel(options);
    case 'csv':
      return exportToCSV(options);
    case 'json':
      return exportToJSON(options);
    default:
      return {
        success: false,
        filename: options.filename,
        size: 0,
        error: `不支持的导出格式: ${format}`,
      };
  }
}

// =====================================================
// 前端下载工具
// =====================================================

/**
 * 触发文件下载
 */
export function downloadFile(url: string, filename: string): void {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // 释放URL对象
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

/**
 * 导出并下载
 */
export function exportAndDownload<T>(options: ExportOptions<T>): boolean {
  const result = exportData(options);

  if (result.success && result.downloadUrl) {
    downloadFile(result.downloadUrl, result.filename);
    return true;
  } else {
    console.error('Export failed:', result.error);
    return false;
  }
}

// =====================================================
// 预定义导出配置
// =====================================================

// 客户导出列配置
export const CUSTOMER_EXPORT_COLUMNS: ExportColumn<Record<string, unknown>>[] = [
  { key: 'customerId', header: '客户编号', width: 15 },
  { key: 'customerName', header: '客户名称', width: 25 },
  { key: 'region', header: '区域', width: 12 },
  { key: 'status', header: '状态', width: 10 },
  { key: 'totalAmount', header: '历史成交金额', width: 15 },
  { key: 'currentProjectCount', header: '当前项目数', width: 12 },
  { key: 'contactName', header: '联系人', width: 12 },
  { key: 'contactPhone', header: '联系电话', width: 15 },
  { key: 'contactEmail', header: '联系邮箱', width: 20 },
  { key: 'createdAt', header: '创建时间', width: 18 },
];

// 项目导出列配置
export const PROJECT_EXPORT_COLUMNS: ExportColumn<Record<string, unknown>>[] = [
  { key: 'projectCode', header: '项目编号', width: 15 },
  { key: 'projectName', header: '项目名称', width: 30 },
  { key: 'customerName', header: '客户名称', width: 25 },
  { key: 'projectStage', header: '项目阶段', width: 12 },
  { key: 'status', header: '状态', width: 10 },
  { key: 'estimatedAmount', header: '预估金额', width: 15 },
  { key: 'actualAmount', header: '实际金额', width: 15 },
  { key: 'managerId', header: '项目经理', width: 12 },
  { key: 'startDate', header: '开始日期', width: 12 },
  { key: 'endDate', header: '结束日期', width: 12 },
  { key: 'progress', header: '进度(%)', width: 10 },
  { key: 'createdAt', header: '创建时间', width: 18 },
];

// 用户导出列配置
export const USER_EXPORT_COLUMNS: ExportColumn<Record<string, unknown>>[] = [
  { key: 'id', header: '用户ID', width: 10 },
  { key: 'username', header: '用户名', width: 15 },
  { key: 'realName', header: '姓名', width: 12 },
  { key: 'email', header: '邮箱', width: 25 },
  { key: 'phone', header: '电话', width: 15 },
  { key: 'department', header: '部门', width: 15 },
  { key: 'status', header: '状态', width: 10 },
  { key: 'lastLoginTime', header: '最后登录', width: 18 },
  { key: 'createdAt', header: '创建时间', width: 18 },
];

// 线索导出列配置
export const LEAD_EXPORT_COLUMNS: ExportColumn<Record<string, unknown>>[] = [
  { key: 'id', header: '线索ID', width: 10 },
  { key: 'customerName', header: '客户名称', width: 25 },
  { key: 'contactName', header: '联系人', width: 12 },
  { key: 'contactPhone', header: '联系电话', width: 15 },
  { key: 'demandType', header: '需求类型', width: 15 },
  { key: 'region', header: '区域', width: 12 },
  { key: 'intentLevel', header: '意向等级', width: 10 },
  { key: 'estimatedAmount', header: '预估金额', width: 15 },
  { key: 'status', header: '状态', width: 10 },
  { key: 'createdAt', header: '创建时间', width: 18 },
];
