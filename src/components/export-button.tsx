'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ExportDialog, ExportConfig } from './export-dialog';
import { EXPORT_FIELD_CONFIGS, ExportField } from '@/lib/export-progress-service';

interface ExportButtonProps {
  type: 'customers' | 'projects' | 'staff';
  title: string;
  totalRecords: number;
  selectedIds?: number[];
  variant?: 'default' | 'outline' | 'ghost' | 'link' | 'destructive' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  filters?: Record<string, any>;
  onExportComplete?: () => void;
}

/**
 * 通用导出按钮组件
 * 集成了导出对话框和进度显示
 */
export function ExportButton({
  type,
  title,
  totalRecords,
  selectedIds,
  variant = 'outline',
  size = 'sm',
  className,
  filters,
  onExportComplete,
}: ExportButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleExport = async (config: ExportConfig) => {
    try {
      // 构建请求参数
      const params: Record<string, any> = {
        format: config.format,
        fields: config.fields.map(f => ({
          key: f.key,
          label: f.label,
          width: f.width,
          formatter: f.formatter?.toString(),
        })),
      };

      if (config.ids && config.ids.length > 0) {
        params.ids = config.ids;
      }

      if (filters) {
        params.filters = filters;
      }

      // 发送导出请求
      const response = await fetch(`/api/export/${type}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error('导出失败');
      }

      // 获取文件
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title}_${new Date().toISOString().split('T')[0]}.${config.format === 'xlsx' ? 'xlsx' : 'csv'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      onExportComplete?.();
    } catch (error) {
      console.error('Export failed:', error);
      throw error;
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={() => setDialogOpen(true)}
      >
        <Download className="mr-2 h-4 w-4" />
        导出数据
      </Button>

      <ExportDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        type={type}
        title={title}
        totalRecords={totalRecords}
        selectedIds={selectedIds}
        onExport={handleExport}
      />
    </>
  );
}

/**
 * 简单导出按钮（直接下载，不显示对话框）
 */
export function SimpleExportButton({
  type,
  title,
  filters,
  variant = 'outline',
  size = 'sm',
  className,
}: Omit<ExportButtonProps, 'totalRecords' | 'selectedIds'>) {
  const handleExport = async () => {
    try {
      const params = new URLSearchParams({
        format: 'xlsx',
        ...filters,
      });

      const response = await fetch(`/api/export/${type}?${params}`);
      
      if (!response.ok) {
        throw new Error('导出失败');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title}_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handleExport}
    >
      <Download className="mr-2 h-4 w-4" />
      导出数据
    </Button>
  );
}
