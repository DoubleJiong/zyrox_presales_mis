'use client';

import Link from 'next/link';
import { ArrowRight, ExternalLink, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { useTeamExecutionDetail } from '@/hooks/use-team-execution-detail';
import type { TeamExecutionFilters } from '@/lib/team-execution-cockpit/filters';
import type { TeamExecutionDetailEntityType } from '@/lib/team-execution-cockpit/detail-links';

type Selection = {
  entityType: TeamExecutionDetailEntityType;
  entityId: number;
} | null;

type Props = {
  selection: Selection;
  filters: TeamExecutionFilters;
  onClose: () => void;
  onNavigateEntity: (selection: NonNullable<Selection>) => void;
};

const entityTypeLabel: Record<TeamExecutionDetailEntityType, string> = {
  person: '人员',
  project: '项目',
  customer: '客户',
  solution: '方案',
};

export function TeamExecutionObjectDetailDrawer({ selection, filters, onClose, onNavigateEntity }: Props) {
  const { data, isLoading, error } = useTeamExecutionDetail(selection, filters);
  const open = !!selection;

  return (
    <Drawer open={open} direction="right" onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DrawerContent data-testid="team-execution-detail-drawer" className="border-slate-800 bg-slate-950 text-slate-100 sm:max-w-lg">
        <DrawerHeader>
          <DrawerTitle data-testid="team-execution-detail-title" className="text-white">
            {isLoading ? '加载详情中...' : data?.title || '对象详情'}
          </DrawerTitle>
          <DrawerDescription className="text-slate-400">
            统一详情抽屉保持只读，并在当前驾驶舱上下文内提供对象摘要与业务跳转入口。
          </DrawerDescription>
        </DrawerHeader>

        <div className="space-y-4 px-4 pb-6">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-24 w-full bg-slate-800" />
              <Skeleton className="h-28 w-full bg-slate-800" />
              <Skeleton className="h-40 w-full bg-slate-800" />
            </div>
          ) : error ? (
            <Empty className="min-h-[320px] rounded-3xl border-slate-800 bg-slate-900/50 text-slate-300">
              <EmptyHeader>
                <EmptyMedia variant="icon" className="bg-cyan-500/15 text-cyan-200">
                  <Search className="size-6" />
                </EmptyMedia>
                <EmptyTitle className="text-white">详情加载失败</EmptyTitle>
                <EmptyDescription className="text-slate-400">{error}</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : data ? (
            <>
              <div className="rounded-3xl border border-cyan-500/20 bg-cyan-500/10 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="border-cyan-400/40 text-cyan-100">
                    {entityTypeLabel[data.entityType]}
                  </Badge>
                  <Badge variant="secondary" className="bg-slate-800 text-slate-100">
                    {data.filtersEcho.view}
                  </Badge>
                  <Badge variant="secondary" className="bg-slate-800 text-slate-100">
                    {data.filtersEcho.range}
                  </Badge>
                  {data.statusLabel ? (
                    <Badge variant="secondary" className="bg-amber-500/15 text-amber-100">
                      {data.statusLabel}
                    </Badge>
                  ) : null}
                </div>
                <p className="mt-4 text-lg font-semibold text-white">{data.subtitle}</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">{data.description || '当前对象暂无补充说明。'}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                {data.metrics.map((metric) => (
                  <div key={metric.label} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
                    <div className="text-slate-400">{metric.label}</div>
                    <div className="mt-2 text-xl font-semibold text-white">{metric.value}</div>
                  </div>
                ))}
              </div>

              <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-4 text-sm">
                <h3 className="font-medium text-white">详情字段</h3>
                <div className="mt-4 space-y-3">
                  {data.fields.map((field) => (
                    <div key={field.label} className="flex items-start justify-between gap-4 rounded-2xl border border-slate-800/80 bg-slate-950/60 px-3 py-2">
                      <span className="text-slate-400">{field.label}</span>
                      <span className="text-right text-slate-200">{field.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {data.sections.map((section) => (
                <div key={section.title} className="rounded-3xl border border-slate-800 bg-slate-900/70 p-4 text-sm">
                  <h3 className="font-medium text-white">{section.title}</h3>
                  {section.items.length > 0 ? (
                    <div className="mt-4 space-y-3">
                      {section.items.map((item) => (
                        <div key={`${item.entityType}-${item.entityId}`} className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-3">
                          <div className="flex items-start justify-between gap-3">
                            <button
                              type="button"
                              onClick={() => onNavigateEntity({ entityType: item.entityType, entityId: item.entityId })}
                              className="text-left transition hover:text-cyan-200"
                            >
                              <div className="font-medium text-white">{item.title}</div>
                              <div className="mt-1 text-xs text-slate-400">{item.subtitle}</div>
                            </button>
                            <Button asChild size="sm" variant="outline" className="border-slate-700 bg-transparent text-slate-200 hover:bg-slate-800">
                              <Link href={item.href}>
                                页面
                                <ExternalLink className="ml-2 h-3.5 w-3.5" />
                              </Link>
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-4 text-slate-400">{section.emptyText}</p>
                  )}
                </div>
              ))}

              <div className="flex flex-wrap gap-3">
                {data.actions.map((action) => (
                  <Button
                    key={`${action.label}-${action.href}`}
                    data-testid={action.variant === 'default' ? 'team-execution-detail-primary-action' : 'team-execution-detail-secondary-action'}
                    asChild
                    variant={action.variant}
                    className={action.variant === 'default'
                      ? 'bg-cyan-500 text-slate-950 hover:bg-cyan-400'
                      : 'border-slate-700 bg-transparent text-slate-100 hover:bg-slate-800'}
                  >
                    <Link href={action.href}>
                      {action.label}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                ))}
              </div>
            </>
          ) : (
            <Empty className="min-h-[320px] rounded-3xl border-slate-800 bg-slate-900/50 text-slate-300">
              <EmptyHeader>
                <EmptyMedia variant="icon" className="bg-cyan-500/15 text-cyan-200">
                  <Search className="size-6" />
                </EmptyMedia>
                <EmptyTitle className="text-white">当前对象不可用</EmptyTitle>
                <EmptyDescription className="text-slate-400">对象不存在，或不在当前驾驶舱可见范围内。</EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}