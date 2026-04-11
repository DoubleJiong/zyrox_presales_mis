'use client';

import { useEffect, useMemo, useState } from 'react';
import { Building2, Calendar, ExternalLink, FolderKanban, MapPin, User } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { getProjectCustomerTypeOrIndustryLabel } from '@/lib/project-field-mappings';
import {
  getProjectTypeDisplayLabel,
  getProjectTypeOaCategoryLabel,
  normalizeProjectTypeCodes,
} from '@/lib/project-type-codec';

interface ProjectQuickView {
  id: number;
  projectCode: string;
  projectName: string;
  customerName: string;
  projectType: string | null;
  projectTypes?: string[];
  industry: string | null;
  region: string | null;
  description: string | null;
  managerName?: string | null;
  estimatedAmount: string | null;
  startDate: string | null;
  expectedDeliveryDate: string | null;
  updatedAt: string;
  risks?: string | null;
}

interface ProjectQuickViewDrawerProps {
  open: boolean;
  projectId: number | null;
  onOpenChange: (open: boolean) => void;
  onOpenDetailPage: (projectId: number) => void;
}

function formatCurrency(value: string | null | undefined): string {
  if (!value) {
    return '-';
  }

  return `¥${Number(value).toLocaleString()}`;
}

function formatDate(value: string | null | undefined): string {
  if (!value) {
    return '-';
  }

  return new Date(value).toLocaleDateString('zh-CN');
}

export function ProjectQuickViewDrawer({
  open,
  projectId,
  onOpenChange,
  onOpenDetailPage,
}: ProjectQuickViewDrawerProps) {
  const [project, setProject] = useState<ProjectQuickView | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !projectId) {
      return;
    }

    let cancelled = false;

    const fetchProjectDetail = async () => {
      try {
        setLoading(true);
        const { data: result } = await apiClient.get<{ success: boolean; data?: ProjectQuickView } | ProjectQuickView>(`/api/projects/${projectId}`);
        if (!cancelled) {
          setProject((result as any).data || result);
        }
      } catch (error) {
        console.error('Failed to fetch project quick view:', error);
        if (!cancelled) {
          setProject(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void fetchProjectDetail();

    return () => {
      cancelled = true;
    };
  }, [open, projectId]);

  const projectTypeCodes = useMemo(
    () => normalizeProjectTypeCodes(project?.projectTypes ?? project?.projectType),
    [project?.projectType, project?.projectTypes]
  );

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent className="h-full max-w-xl sm:max-w-xl">
        <DrawerHeader className="border-b">
          <DrawerTitle>{project?.projectName || '项目下钻详情'}</DrawerTitle>
          <DrawerDescription>{project?.projectCode || '加载项目详情中'}</DrawerDescription>
        </DrawerHeader>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading || !project ? (
            <div className="text-sm text-muted-foreground">正在加载项目详情...</div>
          ) : (
            <>
              <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span>{project.customerName || '-'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{project.region || '-'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{project.managerName || '未分配负责人'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>更新于 {formatDate(project.updatedAt)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium">项目类型</div>
                <div className="flex flex-wrap gap-2">
                  {projectTypeCodes.length > 0 ? projectTypeCodes.map((code) => (
                    <Badge key={code} variant="outline" className="gap-1">
                      <FolderKanban className="h-3 w-3" />
                      <span>{getProjectTypeDisplayLabel(code)}</span>
                      <span className="text-muted-foreground">/ {getProjectTypeOaCategoryLabel(code)}</span>
                    </Badge>
                  )) : (
                    <span className="text-sm text-muted-foreground">未设置</span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg border p-3">
                  <div className="text-muted-foreground">客户类型/行业</div>
                  <div className="mt-1 font-medium">{getProjectCustomerTypeOrIndustryLabel(project.industry) || '-'}</div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-muted-foreground">项目预算</div>
                  <div className="mt-1 font-medium">{formatCurrency(project.estimatedAmount)}</div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-muted-foreground">开始日期</div>
                  <div className="mt-1 font-medium">{formatDate(project.startDate)}</div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-muted-foreground">预计交付</div>
                  <div className="mt-1 font-medium">{formatDate(project.expectedDeliveryDate)}</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium">项目描述</div>
                <div className="rounded-lg border p-3 text-sm text-muted-foreground">
                  {project.description || '暂无描述'}
                </div>
              </div>

              {project.risks && (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-red-600">风险提示</div>
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {project.risks}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        <DrawerFooter className="border-t sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            onClick={() => {
              if (projectId) {
                onOpenDetailPage(projectId);
              }
            }}
            disabled={!projectId}
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            打开详情页
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}