/**
 * 数据导出服务
 * 
 * 支持导出为 Excel (XLSX) 和 CSV 格式
 */

import * as XLSX from 'xlsx';

// 导出格式
export type ExportFormat = 'xlsx' | 'csv';

// 导出列配置
export interface ExportColumn<T> {
  key: keyof T;
  header: string;
  width?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  formatter?: (value: any, row: T) => string | number | undefined;
}

// 导出配置
export interface ExportConfig<T> {
  columns: ExportColumn<T>[];
  data: T[];
  filename: string;
  format: ExportFormat;
  sheetName?: string;
}

/**
 * 导出服务类
 */
export class ExportService {
  /**
   * 导出数据为文件
   */
  static export<T>(config: ExportConfig<T>): Buffer {
    const { columns, data, filename, format, sheetName = 'Sheet1' } = config;

    // 转换数据为表格格式
    const headers = columns.map(col => col.header);
    const rows = data.map(row => 
      columns.map(col => {
        const value = row[col.key];
        if (col.formatter) {
          return col.formatter(value, row);
        }
        return value ?? '';
      })
    );

    // 创建工作表数据
    const sheetData = [headers, ...rows];

    // 创建工作簿
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

    // 设置列宽
    const colWidths = columns.map(col => ({ wch: col.width || 15 }));
    worksheet['!cols'] = colWidths;

    // 添加工作表到工作簿
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // 生成文件
    const buffer = XLSX.write(workbook, {
      type: 'buffer',
      bookType: format === 'csv' ? 'csv' : 'xlsx',
    });

    return buffer;
  }

  /**
   * 导出为 Excel 格式
   */
  static exportToExcel<T>(
    data: T[],
    columns: ExportColumn<T>[],
    filename: string,
    sheetName?: string
  ): Buffer {
    return this.export({
      data,
      columns,
      filename,
      format: 'xlsx',
      sheetName,
    });
  }

  /**
   * 导出为 CSV 格式
   */
  static exportToCSV<T>(
    data: T[],
    columns: ExportColumn<T>[],
    filename: string
  ): Buffer {
    return this.export({
      data,
      columns,
      filename,
      format: 'csv',
    });
  }

  /**
   * 获取 Content-Type
   */
  static getContentType(format: ExportFormat): string {
    return format === 'xlsx'
      ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      : 'text/csv';
  }

  /**
   * 获取文件扩展名
   */
  static getFileExtension(format: ExportFormat): string {
    return format === 'xlsx' ? '.xlsx' : '.csv';
  }
}

/**
 * 通用导出工具函数
 */
export function createExportResponse(
  buffer: Buffer,
  filename: string,
  format: ExportFormat
): Response {
  const contentType = ExportService.getContentType(format);
  const extension = ExportService.getFileExtension(format);
  const fullFilename = filename.endsWith(extension) ? filename : `${filename}${extension}`;

  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(fullFilename)}"`,
      'Content-Length': buffer.length.toString(),
    },
  });
}
