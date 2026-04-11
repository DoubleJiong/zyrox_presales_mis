'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import { RequireAuth } from '@/components/auth/PermissionProvider';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { PERMISSIONS } from '@/lib/permissions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TeamExecutionObjectDetailDrawer } from '@/components/team-execution-cockpit/object-detail-drawer';
import { TeamExecutionFilterToolbar } from '@/components/team-execution-cockpit/filter-toolbar';
import { useTeamExecutionCustomer } from '@/hooks/use-team-execution-customer';
import { useTeamExecutionProject } from '@/hooks/use-team-execution-project';
import { useTeamExecutionRole } from '@/hooks/use-team-execution-role';
import { useTeamExecutionSolution } from '@/hooks/use-team-execution-solution';
import { useTeamExecutionSummary } from '@/hooks/use-team-execution-summary';
import { useTeamExecutionRisk } from '@/hooks/use-team-execution-risk';
import {
  DEFAULT_TEAM_EXECUTION_FILTERS,
  buildTeamExecutionSearchParams,
  getTeamExecutionFocusLabel,
  getTeamExecutionRangeLabel,
  getTeamExecutionViewLabel,
  parseTeamExecutionFilters,
  type TeamExecutionFilters,
  type TeamExecutionFocus,
  type TeamExecutionTimeRange,
  type TeamExecutionView,
} from '@/lib/team-execution-cockpit/filters';
import type { TeamExecutionDetailEntityType } from '@/lib/team-execution-cockpit/detail-links';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Briefcase,
  Clock3,
  FileStack,
  FolderKanban,
  Layers3,
  Search,
  ShieldCheck,
  Siren,
  Sparkles,
  Target,
  Users,
} from 'lucide-react';

const viewCards = [
  {
    title: '角色视角',
    description: '人员负载分布、角色组对比、人员风险排行、执行明细表。',
    status: '已完成',
  },
  {
    title: '项目视角',
    description: '项目阶段任务分布、项目风险热度、人力投入概览、执行明细表。',
    status: '已完成',
  },
  {
    title: '客户视角',
    description: '客户活跃度、事项规模排行、重点客户推进风险与协同明细。',
    status: '轻量已完成',
  },
  {
    title: '方案视角',
    description: '方案状态分布、评审压力、参与人员热度与推进明细。',
    status: '轻量已完成',
  },
];

export default function TeamExecutionCockpitPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startPageTransition] = useTransition();
  const [selectedDetail, setSelectedDetail] = useState<{ entityType: TeamExecutionDetailEntityType; entityId: number } | null>(null);

  const filters = useMemo(() => parseTeamExecutionFilters(searchParams), [searchParams]);
  const { data: summaryData, isLoading: isSummaryLoading, error: summaryError } = useTeamExecutionSummary(filters);
  const { data: riskData, isLoading: isRiskLoading, error: riskError } = useTeamExecutionRisk(filters);
  const { data: roleData, isLoading: isRoleLoading, error: roleError } = useTeamExecutionRole(filters, filters.view === 'role');
  const { data: projectData, isLoading: isProjectLoading, error: projectError } = useTeamExecutionProject(filters, filters.view === 'project');
  const { data: customerData, isLoading: isCustomerLoading, error: customerError } = useTeamExecutionCustomer(filters, filters.view === 'customer');
  const { data: solutionData, isLoading: isSolutionLoading, error: solutionError } = useTeamExecutionSolution(filters, filters.view === 'solution');

  const updateFilters = (nextFilters: TeamExecutionFilters) => {
    const params = buildTeamExecutionSearchParams(nextFilters);
    const target = params.toString() ? `${pathname}?${params.toString()}` : pathname;

    startPageTransition(() => {
      router.replace(target, { scroll: false });
    });
  };

  const handleViewChange = (view: TeamExecutionView) => {
    updateFilters({ ...filters, view });
  };

  const handleRangeChange = (range: TeamExecutionTimeRange) => {
    updateFilters({ ...filters, range });
  };

  const handleFocusChange = (focus: TeamExecutionFocus) => {
    updateFilters({ ...filters, focus });
  };

  const handleKeywordApply = (keyword: string) => {
    updateFilters({ ...filters, q: keyword });
  };

  const handleReset = () => {
    updateFilters(DEFAULT_TEAM_EXECUTION_FILTERS);
  };

  const activeViewLabel = getTeamExecutionViewLabel(filters.view);
  const activeRangeLabel = getTeamExecutionRangeLabel(filters.range);
  const activeFocusLabel = getTeamExecutionFocusLabel(filters.focus);

  const activeViewDescription = {
    role: '当前优先面向“谁负载过高、谁逾期较多、谁最近推进不足”的分析问题。',
    project: '当前优先面向“哪个项目卡住、风险高、负载失衡”的分析问题。',
    customer: '当前优先面向“哪些客户推进不足、事项堆积、互动不足”的分析问题。',
    solution: '当前优先面向“哪些方案卡在制作、评审或交付支撑环节”的分析问题。',
  }[filters.view];

  const queryProtocolRows = [
    { label: 'view', value: filters.view, display: activeViewLabel },
    { label: 'range', value: filters.range, display: activeRangeLabel },
    { label: 'focus', value: filters.focus, display: activeFocusLabel },
    { label: 'q', value: filters.q || '空', display: filters.q || '未设置关键词' },
  ];

  const riskOverviewCards = [
    {
      title: '高风险人员',
      value: riskData.overview.highRiskPeople,
      description: '负载偏高、逾期偏多或连续低活跃的人员数量。',
      icon: Users,
    },
    {
      title: '高风险项目',
      value: riskData.overview.highRiskProjects,
      description: '逾期、卡点、久未更新且仍在推进中的项目数量。',
      icon: FolderKanban,
    },
    {
      title: '逾期项',
      value: riskData.overview.overdueItems,
      description: '当前筛选范围下的逾期任务与逾期待办总量。',
      icon: Clock3,
    },
    {
      title: '重度阻塞项',
      value: riskData.overview.blockedItems,
      description: '已逾期 3 天以上或高优先级的关键阻塞项。',
      icon: Siren,
    },
  ];

  const riskSectionTitle = filters.view === 'project' ? '项目风险热区' : '人员风险热区';
  const riskSectionDescription = filters.view === 'project'
    ? '优先暴露卡住的项目、阶段停滞和高优任务堆积。'
    : '优先暴露谁负载过高、谁逾期较多、谁最近推进不足。';

  const hasRiskContent = riskData.people.length > 0 || riskData.projects.length > 0 || riskData.blockedList.length > 0;
  const combinedError = summaryError || riskError || (filters.view === 'role' ? roleError : null) || (filters.view === 'project' ? projectError : null) || (filters.view === 'customer' ? customerError : null) || (filters.view === 'solution' ? solutionError : null);

  const formatActivity = (value: string | null, thresholdDays: number) => {
    if (!value) {
      return `近 ${thresholdDays} 天无推进痕迹`;
    }

    return value.slice(0, 10).replace(/-/g, '.');
  };

  const loadBucketLabel = {
    reserve: '储备',
    balanced: '平衡',
    busy: '繁忙',
    overloaded: '过载',
  } as const;

  const customerInteractionLabel = {
    active: '活跃互动',
    watch: '关注观察',
    cooling: '降温预警',
    silent: '沉默客户',
  } as const;

  const solutionStatusLabel = {
    draft: '草稿',
    review: '审核中',
    reviewing: '审核中',
    approved: '已通过',
    rejected: '已驳回',
    published: '已发布',
  } as const;

  const openDetail = (entityType: TeamExecutionDetailEntityType, entityId: number) => {
    setSelectedDetail({ entityType, entityId });
  };

  const metricCards = [
    {
      title: '待处理总量',
      value: summaryData.summary.pendingTotal,
      description: '统计当前可见项目范围内的未完成任务与进行中待办。',
      icon: Layers3,
    },
    {
      title: '今日到期任务数',
      value: summaryData.summary.dueTodayTasks,
      description: '以当前自然日为准，统计今天到期且未完成的项目任务。',
      icon: ShieldCheck,
    },
    {
      title: '已逾期任务数',
      value: summaryData.summary.overdueTasks,
      description: '统计截止日早于今天、当前仍未完成的项目任务。',
      icon: Users,
    },
    {
      title: '高优任务数',
      value: summaryData.summary.highPriorityTasks,
      description: '统计优先级为 high 或 urgent 的未完成项目任务。',
      icon: Briefcase,
    },
    {
      title: '当前活跃项目数',
      value: summaryData.summary.activeProjects,
      description: `按“${summaryData.window.label}”窗口统计最近有更新且仍处于活跃状态的项目。`,
      icon: FolderKanban,
    },
    {
      title: '重点项目涉及人员数',
      value: summaryData.summary.keyProjectPeople,
      description: '统计高优或紧急项目所覆盖的负责人、交付负责人及项目成员。',
      icon: Users,
    },
    {
      title: '负载过高人员数',
      value: summaryData.summary.overloadedPeople,
      description: '按待处理量、逾期量与高优任务量综合识别过载人员。',
      icon: ShieldCheck,
    },
    {
      title: '连续低活跃人员数',
      value: summaryData.summary.lowActivityPeople,
      description: `最近 ${summaryData.window.activityThresholdDays} 天内缺少项目、任务、待办或方案更新痕迹的相关人员。`,
      icon: Briefcase,
    },
  ];

  const primaryRiskList = filters.view === 'project' ? riskData.projects : riskData.people;
  const secondaryRiskList = filters.view === 'project' ? riskData.people : riskData.projects;

  const primaryRiskLabel = filters.view === 'project' ? '项目风险榜' : '人员风险榜';
  const secondaryRiskLabel = filters.view === 'project' ? '人员协同风险榜' : '项目协同风险榜';

  return (
    <RequireAuth permissions={[PERMISSIONS.TEAM_EXECUTION_COCKPIT_VIEW]}>
      <div data-testid="team-execution-page" className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(0,212,255,0.16),_transparent_34%),linear-gradient(180deg,_#07111f_0%,_#091827_42%,_#0f172a_100%)] text-slate-100">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8 lg:px-8">
          <section className="rounded-3xl border border-cyan-500/20 bg-slate-950/55 p-6 shadow-[0_0_80px_rgba(8,145,178,0.12)] backdrop-blur">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-3">
                <Badge variant="outline" className="border-cyan-400/40 bg-cyan-500/10 text-cyan-200">
                  数据大屏子驾驶舱
                </Badge>
                <div className="space-y-2">
                  <h1 className="text-3xl font-semibold tracking-tight lg:text-4xl">团队执行驾驶舱</h1>
                  <p className="max-w-3xl text-sm leading-6 text-slate-300 lg:text-base">
                    当前首屏已经具备统一筛选协议、汇总指标与风险聚焦，并已落地角色、项目、客户、方案四类分析视角。下一步将进入测试与联调收口。
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button asChild variant="outline" className="border-slate-700 bg-slate-900/70 text-slate-100 hover:bg-slate-800">
                  <Link href="/data-screen">
                    返回数据大屏
                  </Link>
                </Button>
                <Button asChild className="bg-cyan-500 text-slate-950 hover:bg-cyan-400">
                  <Link href="/settings/roles">
                    配置角色权限
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </section>

          <TeamExecutionFilterToolbar
            filters={filters}
            pending={isPending}
            onViewChange={handleViewChange}
            onRangeChange={handleRangeChange}
            onFocusChange={handleFocusChange}
            onKeywordApply={handleKeywordApply}
            onReset={handleReset}
          />

          {combinedError ? (
            <Alert className="border-amber-500/30 bg-amber-500/10 text-amber-50">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>部分数据加载失败</AlertTitle>
              <AlertDescription>
                当前页面仍会展示可回退数据，但风险聚焦或汇总结果可能不完整。错误信息：{combinedError}
              </AlertDescription>
            </Alert>
          ) : null}

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {metricCards.map((card) => {
              const Icon = card.icon;
              return (
                <Card key={card.title} className="border-cyan-500/15 bg-slate-950/60 text-slate-100">
                  <CardHeader className="space-y-3 pb-3">
                    <div className="flex items-center justify-between">
                      <CardDescription className="text-slate-400">{card.title}</CardDescription>
                      <Icon className="h-5 w-5 text-cyan-300" />
                    </div>
                    <CardTitle className="text-xl text-white">
                      {isSummaryLoading ? <Skeleton className="h-8 w-20 bg-slate-800" /> : card.value}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-6 text-slate-300">{card.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
            <Card className="border-cyan-500/15 bg-slate-950/60 text-slate-100">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Activity className="h-5 w-5 text-cyan-300" />
                  {riskSectionTitle}
                </CardTitle>
                <CardDescription className="text-slate-400">
                  {riskSectionDescription}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {riskOverviewCards.map((card) => {
                    const Icon = card.icon;
                    return (
                      <div key={card.title} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm text-slate-400">{card.title}</p>
                          <Icon className="h-4 w-4 text-cyan-300" />
                        </div>
                        <div className="mt-3 text-2xl font-semibold text-white">
                          {isRiskLoading ? <Skeleton className="h-8 w-16 bg-slate-800" /> : card.value}
                        </div>
                        <p className="mt-3 text-xs leading-5 text-slate-400">{card.description}</p>
                      </div>
                    );
                  })}
                </div>

                {isRiskLoading ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    {Array.from({ length: 2 }).map((_, index) => (
                      <div key={index} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                        <Skeleton className="h-5 w-28 bg-slate-800" />
                        <div className="mt-4 space-y-3">
                          {Array.from({ length: 4 }).map((__, itemIndex) => (
                            <div key={itemIndex} className="rounded-xl border border-slate-800/80 p-3">
                              <Skeleton className="h-4 w-40 bg-slate-800" />
                              <Skeleton className="mt-3 h-3 w-full bg-slate-800" />
                              <Skeleton className="mt-2 h-3 w-2/3 bg-slate-800" />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : hasRiskContent ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <h2 className="text-base font-medium text-white">{primaryRiskLabel}</h2>
                        <Badge variant="secondary" className="bg-cyan-500/15 text-cyan-100">
                          Top {primaryRiskList.length}
                        </Badge>
                      </div>
                      <div className="space-y-3">
                        {filters.view === 'project'
                          ? riskData.projects.map((project, index) => (
                              <div key={project.projectId} className="rounded-xl border border-slate-800/80 p-4">
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="text-sm text-slate-400">#{index + 1}</p>
                                    <h3 className="mt-1 font-medium text-white">{project.projectName}</h3>
                                    <p className="mt-1 text-sm text-slate-400">{project.customerName || '未关联客户'} / {project.stage || '未标记阶段'}</p>
                                  </div>
                                  <Badge variant="secondary" className="bg-amber-500/15 text-amber-100">
                                    风险分 {project.riskScore}
                                  </Badge>
                                </div>
                                <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-300">
                                  <Badge variant="outline" className="border-slate-700 text-slate-200">未完任务 {project.openTaskCount}</Badge>
                                  <Badge variant="outline" className="border-slate-700 text-slate-200">逾期 {project.overdueTaskCount}</Badge>
                                  <Badge variant="outline" className="border-slate-700 text-slate-200">逾期待办 {project.blockedTodoCount}</Badge>
                                  <Badge variant="outline" className="border-slate-700 text-slate-200">停滞 {project.staleDays} 天</Badge>
                                </div>
                                <p className="mt-3 text-sm leading-6 text-slate-300">{project.reasons.join(' / ')}</p>
                              </div>
                            ))
                          : riskData.people.map((person, index) => (
                              <div key={person.userId} className="rounded-xl border border-slate-800/80 p-4">
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="text-sm text-slate-400">#{index + 1}</p>
                                    <h3 className="mt-1 font-medium text-white">{person.name}</h3>
                                    <p className="mt-1 text-sm text-slate-400">{person.department || '未设置部门'} / {person.position || '未设置岗位'}</p>
                                  </div>
                                  <Badge variant="secondary" className="bg-amber-500/15 text-amber-100">
                                    风险分 {person.riskScore}
                                  </Badge>
                                </div>
                                <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-300">
                                  <Badge variant="outline" className="border-slate-700 text-slate-200">待处理 {person.pendingCount}</Badge>
                                  <Badge variant="outline" className="border-slate-700 text-slate-200">逾期 {person.overdueCount}</Badge>
                                  <Badge variant="outline" className="border-slate-700 text-slate-200">高优 {person.highPriorityCount}</Badge>
                                  <Badge variant="outline" className="border-slate-700 text-slate-200">重点项目 {person.keyProjectCount}</Badge>
                                </div>
                                <p className="mt-3 text-sm leading-6 text-slate-300">{person.reasons.join(' / ')}</p>
                              </div>
                            ))}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <h2 className="text-base font-medium text-white">{secondaryRiskLabel}</h2>
                        <Badge variant="secondary" className="bg-slate-800 text-slate-100">
                          协同观察
                        </Badge>
                      </div>
                      <div className="space-y-3">
                        {filters.view === 'project'
                          ? riskData.people.slice(0, 4).map((person) => (
                              <div key={person.userId} className="rounded-xl border border-slate-800/80 p-4">
                                <div className="flex items-center justify-between gap-3">
                                  <div>
                                    <h3 className="font-medium text-white">{person.name}</h3>
                                    <p className="mt-1 text-sm text-slate-400">{person.department || '未设置部门'}</p>
                                  </div>
                                  <Badge variant="secondary" className="bg-cyan-500/15 text-cyan-100">{person.riskScore}</Badge>
                                </div>
                                <p className="mt-3 text-sm leading-6 text-slate-300">{person.reasons.join(' / ')}</p>
                              </div>
                            ))
                          : riskData.projects.slice(0, 4).map((project) => (
                              <div key={project.projectId} className="rounded-xl border border-slate-800/80 p-4">
                                <div className="flex items-center justify-between gap-3">
                                  <div>
                                    <h3 className="font-medium text-white">{project.projectName}</h3>
                                    <p className="mt-1 text-sm text-slate-400">{project.customerName || '未关联客户'}</p>
                                  </div>
                                  <Badge variant="secondary" className="bg-cyan-500/15 text-cyan-100">{project.riskScore}</Badge>
                                </div>
                                <p className="mt-3 text-sm leading-6 text-slate-300">{project.reasons.join(' / ')}</p>
                              </div>
                            ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <Empty className="min-h-[280px] rounded-3xl border-slate-800 bg-slate-900/70 text-slate-300">
                    <EmptyHeader>
                      <EmptyMedia variant="icon" className="bg-cyan-500/15 text-cyan-200">
                        <Search className="size-6" />
                      </EmptyMedia>
                      <EmptyTitle className="text-white">当前筛选条件下没有风险项</EmptyTitle>
                      <EmptyDescription className="text-slate-400">
                        可以切换时间范围、关注焦点或清空关键词，重新查看风险榜和阻塞项。
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                )}
              </CardContent>
            </Card>

            <Card className="border-cyan-500/15 bg-slate-950/60 text-slate-100">
              <CardHeader>
                <CardTitle className="text-white">查询协议快照</CardTitle>
                <CardDescription className="text-slate-400">
                  汇总卡、风险榜和后续视角分析都共享这一套参数协定。
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-slate-300">
                {queryProtocolRows.map((row) => (
                  <div key={row.label} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-white">{row.label}</p>
                      <Badge variant="secondary" className="bg-slate-800 text-slate-100">
                        {row.value}
                      </Badge>
                    </div>
                    <p className="mt-2 leading-6 text-slate-300">{row.display}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>

          {filters.view === 'role' ? (
            <section data-testid="team-execution-role-panel" className="grid gap-6 xl:grid-cols-[1.02fr_1.28fr]">
              <Card className="border-cyan-500/15 bg-slate-950/60 text-slate-100">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Sparkles className="h-5 w-5 text-cyan-300" />
                    人员负载分布与角色组对比
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    角色视角沿用与首屏风险榜一致的最近活跃口径，方便从“谁忙、哪组偏重、谁需要协调”三个层面同步判断。
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {isRoleLoading ? Array.from({ length: 4 }).map((_, index) => (
                      <div key={index} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                        <Skeleton className="h-4 w-16 bg-slate-800" />
                        <Skeleton className="mt-4 h-8 w-12 bg-slate-800" />
                        <Skeleton className="mt-3 h-3 w-full bg-slate-800" />
                      </div>
                    )) : roleData.loadDistribution.map((item) => (
                      <div key={item.bucket} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                        <p className="text-sm text-slate-400">{item.label}</p>
                        <div className="mt-4 text-3xl font-semibold text-white">{item.count}</div>
                        <p className="mt-3 text-xs leading-5 text-slate-400">{item.description}</p>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-4">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <h2 className="text-base font-medium text-white">角色组负载对比</h2>
                        <p className="mt-1 text-sm text-slate-400">按角色汇总成员规模、待处理量、逾期量与均值风险分。</p>
                      </div>
                      {!isRoleLoading ? (
                        <Badge variant="secondary" className="bg-slate-800 text-slate-100">
                          {roleData.overview.totalPeople} 人纳入分析
                        </Badge>
                      ) : null}
                    </div>

                    {isRoleLoading ? (
                      <div className="space-y-3">
                        {Array.from({ length: 4 }).map((_, index) => (
                          <div key={index} className="rounded-2xl border border-slate-800/80 p-4">
                            <Skeleton className="h-4 w-32 bg-slate-800" />
                            <Skeleton className="mt-3 h-3 w-full bg-slate-800" />
                            <Skeleton className="mt-2 h-3 w-2/3 bg-slate-800" />
                          </div>
                        ))}
                      </div>
                    ) : roleData.roleGroups.length > 0 ? (
                      <div className="space-y-3">
                        {roleData.roleGroups.map((group) => (
                          <div key={group.roleName} className="rounded-2xl border border-slate-800/80 p-4">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <h3 className="font-medium text-white">{group.roleName}</h3>
                                <p className="mt-1 text-sm text-slate-400">{group.memberCount} 人，均值风险分 {group.avgRiskScore}</p>
                              </div>
                              <div className="flex flex-wrap gap-2 text-xs">
                                <Badge variant="outline" className="border-slate-700 text-slate-200">待处理 {group.pendingTotal}</Badge>
                                <Badge variant="outline" className="border-slate-700 text-slate-200">逾期 {group.overdueTotal}</Badge>
                                <Badge variant="outline" className="border-slate-700 text-slate-200">过载 {group.overloadedCount}</Badge>
                                <Badge variant="outline" className="border-slate-700 text-slate-200">低活跃 {group.lowActivityCount}</Badge>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <Empty className="min-h-[220px] rounded-3xl border-slate-800 bg-slate-900/40 text-slate-300">
                        <EmptyHeader>
                          <EmptyMedia variant="icon" className="bg-cyan-500/15 text-cyan-200">
                            <Users className="size-6" />
                          </EmptyMedia>
                          <EmptyTitle className="text-white">当前没有角色分组数据</EmptyTitle>
                          <EmptyDescription className="text-slate-400">
                            可以放宽关键词或切换关注焦点，再重新查看角色组对比结果。
                          </EmptyDescription>
                        </EmptyHeader>
                      </Empty>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-cyan-500/15 bg-slate-950/60 text-slate-100">
                <CardHeader>
                  <CardTitle className="text-white">人员风险排行与执行明细</CardTitle>
                  <CardDescription className="text-slate-400">
                    同一套筛选条件下，同时输出风险榜和执行明细表；点击人员即可查看轻量钻取信息。
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4 lg:grid-cols-[0.92fr_1.08fr]">
                    <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-4">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <h2 className="text-base font-medium text-white">人员风险排行</h2>
                        {!isRoleLoading ? (
                          <Badge variant="secondary" className="bg-amber-500/15 text-amber-100">
                            Top {roleData.riskRanking.length}
                          </Badge>
                        ) : null}
                      </div>
                      {isRoleLoading ? (
                        <div className="space-y-3">
                          {Array.from({ length: 5 }).map((_, index) => (
                            <div key={index} className="rounded-2xl border border-slate-800/80 p-4">
                              <Skeleton className="h-4 w-24 bg-slate-800" />
                              <Skeleton className="mt-3 h-3 w-full bg-slate-800" />
                              <Skeleton className="mt-2 h-3 w-2/3 bg-slate-800" />
                            </div>
                          ))}
                        </div>
                      ) : roleData.riskRanking.length > 0 ? (
                        <div className="space-y-3">
                          {roleData.riskRanking.map((person, index) => (
                            <button
                              key={person.userId}
                              data-testid={`team-execution-person-risk-${person.userId}`}
                              type="button"
                              onClick={() => openDetail('person', person.userId)}
                              className="w-full rounded-2xl border border-slate-800/80 p-4 text-left transition hover:border-cyan-500/40 hover:bg-slate-900"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-sm text-slate-400">#{index + 1}</p>
                                  <h3 className="mt-1 font-medium text-white">{person.name}</h3>
                                  <p className="mt-1 text-sm text-slate-400">{person.roleName} / {person.department || '未设置部门'}</p>
                                </div>
                                <Badge variant="secondary" className="bg-amber-500/15 text-amber-100">
                                  风险分 {person.riskScore}
                                </Badge>
                              </div>
                              <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-300">
                                <Badge variant="outline" className="border-slate-700 text-slate-200">{loadBucketLabel[person.loadBucket]}</Badge>
                                <Badge variant="outline" className="border-slate-700 text-slate-200">待处理 {person.pendingCount}</Badge>
                                <Badge variant="outline" className="border-slate-700 text-slate-200">逾期 {person.overdueCount}</Badge>
                              </div>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <Empty className="min-h-[240px] rounded-3xl border-slate-800 bg-slate-900/40 text-slate-300">
                          <EmptyHeader>
                            <EmptyMedia variant="icon" className="bg-cyan-500/15 text-cyan-200">
                              <Search className="size-6" />
                            </EmptyMedia>
                            <EmptyTitle className="text-white">当前没有人员风险排行</EmptyTitle>
                            <EmptyDescription className="text-slate-400">
                              说明当前筛选下尚未识别到明显异常人员，或关键词过滤过窄。
                            </EmptyDescription>
                          </EmptyHeader>
                        </Empty>
                      )}
                    </div>

                    <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-4">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                          <h2 className="text-base font-medium text-white">人员执行明细表</h2>
                          <p className="mt-1 text-sm text-slate-400">姓名、角色、部门、区域和最近活跃时间统一对齐当前角色视角口径。</p>
                        </div>
                        {!isRoleLoading ? (
                          <Badge variant="secondary" className="bg-slate-800 text-slate-100">
                            逾期 {roleData.overview.overduePeople} 人
                          </Badge>
                        ) : null}
                      </div>
                      {isRoleLoading ? (
                        <div className="space-y-3">
                          {Array.from({ length: 6 }).map((_, index) => (
                            <Skeleton key={index} className="h-10 w-full bg-slate-800" />
                          ))}
                        </div>
                      ) : roleData.details.length > 0 ? (
                        <Table className="text-slate-200">
                          <TableHeader>
                            <TableRow className="border-slate-800 hover:bg-transparent">
                              <TableHead className="text-slate-400">人员</TableHead>
                              <TableHead className="text-slate-400">角色 / 部门</TableHead>
                              <TableHead className="text-slate-400">区域</TableHead>
                              <TableHead className="text-slate-400">待处理</TableHead>
                              <TableHead className="text-slate-400">逾期</TableHead>
                              <TableHead className="text-slate-400">活跃项目</TableHead>
                              <TableHead className="text-slate-400">最近活跃</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {roleData.details.map((person) => (
                              <TableRow key={person.userId} className="border-slate-800 hover:bg-slate-900/80">
                                <TableCell>
                                  <button
                                    data-testid={`team-execution-person-detail-${person.userId}`}
                                    type="button"
                                    onClick={() => openDetail('person', person.userId)}
                                    className="text-left text-cyan-200 transition hover:text-cyan-100"
                                  >
                                    <div className="font-medium">{person.name}</div>
                                    <div className="mt-1 text-xs text-slate-400">{loadBucketLabel[person.loadBucket]} / 风险分 {person.riskScore}</div>
                                  </button>
                                </TableCell>
                                <TableCell>
                                  <div>{person.roleName}</div>
                                  <div className="mt-1 text-xs text-slate-400">{person.department || '未设置部门'}</div>
                                </TableCell>
                                <TableCell>{person.region || '未设置区域'}</TableCell>
                                <TableCell>{person.pendingCount}</TableCell>
                                <TableCell>{person.overdueCount}</TableCell>
                                <TableCell>{person.activeProjectCount}</TableCell>
                                <TableCell>{formatActivity(person.lastActivityAt, roleData.window.activityThresholdDays)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      ) : (
                        <Empty className="min-h-[240px] rounded-3xl border-slate-800 bg-slate-900/40 text-slate-300">
                          <EmptyHeader>
                            <EmptyMedia variant="icon" className="bg-cyan-500/15 text-cyan-200">
                              <Users className="size-6" />
                            </EmptyMedia>
                            <EmptyTitle className="text-white">当前没有人员执行明细</EmptyTitle>
                            <EmptyDescription className="text-slate-400">
                              当前筛选条件没有命中角色视角数据，可以切换范围或清空关键词后重试。
                            </EmptyDescription>
                          </EmptyHeader>
                        </Empty>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>
          ) : null}

          {filters.view === 'project' ? (
            <section data-testid="team-execution-project-panel" className="grid gap-6 xl:grid-cols-[1.05fr_1.25fr]">
              <Card className="border-cyan-500/15 bg-slate-950/60 text-slate-100">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Sparkles className="h-5 w-5 text-cyan-300" />
                    项目阶段分布与人力投入
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    项目视角沿用与项目风险榜一致的最近推进与风险口径，同时补充项目所覆盖成员和过载人力的投入概览。
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {isProjectLoading ? Array.from({ length: 4 }).map((_, index) => (
                      <div key={index} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                        <Skeleton className="h-4 w-16 bg-slate-800" />
                        <Skeleton className="mt-4 h-8 w-14 bg-slate-800" />
                        <Skeleton className="mt-3 h-3 w-full bg-slate-800" />
                      </div>
                    )) : [
                      { label: '纳入分析项目', value: projectData.overview.totalProjects, description: '当前筛选范围下进入项目视角分析的项目总数。' },
                      { label: '高风险项目', value: projectData.overview.highRiskProjects, description: '风险分达到高风险阈值的项目数量。' },
                      { label: '停滞项目', value: projectData.overview.stalledProjects, description: `最近 ${projectData.window.activityThresholdDays} 天以上推进不足的重点观察项目。` },
                      { label: '人力紧张项目', value: projectData.overview.staffingTightProjects, description: '过载成员集中或单点资源过紧的项目数量。' },
                    ].map((item) => (
                      <div key={item.label} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                        <p className="text-sm text-slate-400">{item.label}</p>
                        <div className="mt-4 text-3xl font-semibold text-white">{item.value}</div>
                        <p className="mt-3 text-xs leading-5 text-slate-400">{item.description}</p>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-4">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <h2 className="text-base font-medium text-white">项目阶段任务分布</h2>
                        <p className="mt-1 text-sm text-slate-400">按阶段统计项目数量、其中高风险项目数，以及当前累计逾期任务量。</p>
                      </div>
                      {!isProjectLoading ? (
                        <Badge variant="secondary" className="bg-slate-800 text-slate-100">
                          {projectData.stageDistribution.length} 个阶段
                        </Badge>
                      ) : null}
                    </div>

                    {isProjectLoading ? (
                      <div className="space-y-3">
                        {Array.from({ length: 4 }).map((_, index) => (
                          <div key={index} className="rounded-2xl border border-slate-800/80 p-4">
                            <Skeleton className="h-4 w-32 bg-slate-800" />
                            <Skeleton className="mt-3 h-3 w-full bg-slate-800" />
                            <Skeleton className="mt-2 h-3 w-2/3 bg-slate-800" />
                          </div>
                        ))}
                      </div>
                    ) : projectData.stageDistribution.length > 0 ? (
                      <div className="space-y-3">
                        {projectData.stageDistribution.map((stage) => (
                          <div key={stage.stage} className="rounded-2xl border border-slate-800/80 p-4">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <h3 className="font-medium text-white">{stage.label}</h3>
                                <p className="mt-1 text-sm text-slate-400">共 {stage.count} 个项目，高风险 {stage.highRiskCount} 个</p>
                              </div>
                              <Badge variant="outline" className="border-slate-700 text-slate-200">逾期任务 {stage.overdueTaskTotal}</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <Empty className="min-h-[220px] rounded-3xl border-slate-800 bg-slate-900/40 text-slate-300">
                        <EmptyHeader>
                          <EmptyMedia variant="icon" className="bg-cyan-500/15 text-cyan-200">
                            <FolderKanban className="size-6" />
                          </EmptyMedia>
                          <EmptyTitle className="text-white">当前没有阶段分布数据</EmptyTitle>
                          <EmptyDescription className="text-slate-400">
                            可以放宽筛选范围后重新查看项目阶段分布。
                          </EmptyDescription>
                        </EmptyHeader>
                      </Empty>
                    )}
                  </div>

                  <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-4">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <h2 className="text-base font-medium text-white">项目人力投入概览</h2>
                        <p className="mt-1 text-sm text-slate-400">优先暴露成员规模、实际参与人数和过载成员数量，便于识别资源失衡项目。</p>
                      </div>
                      {!isProjectLoading ? (
                        <Badge variant="secondary" className="bg-slate-800 text-slate-100">Top {projectData.staffingOverview.length}</Badge>
                      ) : null}
                    </div>

                    {isProjectLoading ? (
                      <div className="space-y-3">
                        {Array.from({ length: 4 }).map((_, index) => (
                          <div key={index} className="rounded-2xl border border-slate-800/80 p-4">
                            <Skeleton className="h-4 w-40 bg-slate-800" />
                            <Skeleton className="mt-3 h-3 w-full bg-slate-800" />
                          </div>
                        ))}
                      </div>
                    ) : projectData.staffingOverview.length > 0 ? (
                      <div className="space-y-3">
                        {projectData.staffingOverview.map((project) => (
                          <button
                            key={project.projectId}
                            data-testid={`team-execution-project-staffing-${project.projectId}`}
                            type="button"
                            onClick={() => openDetail('project', project.projectId)}
                            className="w-full rounded-2xl border border-slate-800/80 p-4 text-left transition hover:border-cyan-500/40 hover:bg-slate-900"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <h3 className="font-medium text-white">{project.projectName}</h3>
                                <p className="mt-1 text-sm text-slate-400">{project.customerName || '未关联客户'}</p>
                              </div>
                              <Badge variant="secondary" className="bg-cyan-500/15 text-cyan-100">参与 {project.activePeopleCount} 人</Badge>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2 text-xs">
                              <Badge variant="outline" className="border-slate-700 text-slate-200">成员池 {project.memberCount}</Badge>
                              <Badge variant="outline" className="border-slate-700 text-slate-200">过载 {project.overloadedPeopleCount}</Badge>
                              <Badge variant="outline" className="border-slate-700 text-slate-200">未完任务 {project.openTaskCount}</Badge>
                              <Badge variant="outline" className="border-slate-700 text-slate-200">逾期待办 {project.blockedTodoCount}</Badge>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <Empty className="min-h-[220px] rounded-3xl border-slate-800 bg-slate-900/40 text-slate-300">
                        <EmptyHeader>
                          <EmptyMedia variant="icon" className="bg-cyan-500/15 text-cyan-200">
                            <Users className="size-6" />
                          </EmptyMedia>
                          <EmptyTitle className="text-white">当前没有项目人力投入数据</EmptyTitle>
                          <EmptyDescription className="text-slate-400">
                            说明当前筛选下未命中项目协同数据，或关键词过滤过窄。
                          </EmptyDescription>
                        </EmptyHeader>
                      </Empty>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-cyan-500/15 bg-slate-950/60 text-slate-100">
                <CardHeader>
                  <CardTitle className="text-white">项目风险热度与执行明细</CardTitle>
                  <CardDescription className="text-slate-400">
                    同一套项目统计口径下，同时输出项目风险热度榜和项目执行明细，点击项目可查看轻量钻取信息。
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4 lg:grid-cols-[0.92fr_1.08fr]">
                    <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-4">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <h2 className="text-base font-medium text-white">项目风险热度</h2>
                        {!isProjectLoading ? (
                          <Badge variant="secondary" className="bg-amber-500/15 text-amber-100">Top {projectData.riskHeat.length}</Badge>
                        ) : null}
                      </div>

                      {isProjectLoading ? (
                        <div className="space-y-3">
                          {Array.from({ length: 5 }).map((_, index) => (
                            <div key={index} className="rounded-2xl border border-slate-800/80 p-4">
                              <Skeleton className="h-4 w-32 bg-slate-800" />
                              <Skeleton className="mt-3 h-3 w-full bg-slate-800" />
                              <Skeleton className="mt-2 h-3 w-2/3 bg-slate-800" />
                            </div>
                          ))}
                        </div>
                      ) : projectData.riskHeat.length > 0 ? (
                        <div className="space-y-3">
                          {projectData.riskHeat.map((project, index) => (
                            <button
                              key={project.projectId}
                              data-testid={`team-execution-project-risk-${project.projectId}`}
                              type="button"
                              onClick={() => openDetail('project', project.projectId)}
                              className="w-full rounded-2xl border border-slate-800/80 p-4 text-left transition hover:border-cyan-500/40 hover:bg-slate-900"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-sm text-slate-400">#{index + 1}</p>
                                  <h3 className="mt-1 font-medium text-white">{project.projectName}</h3>
                                  <p className="mt-1 text-sm text-slate-400">{project.customerName || '未关联客户'} / {project.stage || '未标记阶段'}</p>
                                </div>
                                <Badge variant="secondary" className="bg-amber-500/15 text-amber-100">风险分 {project.riskScore}</Badge>
                              </div>
                              <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-300">
                                <Badge variant="outline" className="border-slate-700 text-slate-200">未完任务 {project.openTaskCount}</Badge>
                                <Badge variant="outline" className="border-slate-700 text-slate-200">逾期 {project.overdueTaskCount}</Badge>
                                <Badge variant="outline" className="border-slate-700 text-slate-200">过载成员 {project.overloadedPeopleCount}</Badge>
                              </div>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <Empty className="min-h-[240px] rounded-3xl border-slate-800 bg-slate-900/40 text-slate-300">
                          <EmptyHeader>
                            <EmptyMedia variant="icon" className="bg-cyan-500/15 text-cyan-200">
                              <Search className="size-6" />
                            </EmptyMedia>
                            <EmptyTitle className="text-white">当前没有项目风险热度榜</EmptyTitle>
                            <EmptyDescription className="text-slate-400">
                              说明当前筛选下尚未识别到明显异常项目，或关键词过滤过窄。
                            </EmptyDescription>
                          </EmptyHeader>
                        </Empty>
                      )}
                    </div>

                    <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-4">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                          <h2 className="text-base font-medium text-white">项目执行明细表</h2>
                          <p className="mt-1 text-sm text-slate-400">阶段、状态、最近推进时间和项目风险热区保持同一套统计规则。</p>
                        </div>
                        {!isProjectLoading ? (
                          <Badge variant="secondary" className="bg-slate-800 text-slate-100">高风险 {projectData.overview.highRiskProjects} 个</Badge>
                        ) : null}
                      </div>
                      {isProjectLoading ? (
                        <div className="space-y-3">
                          {Array.from({ length: 6 }).map((_, index) => (
                            <Skeleton key={index} className="h-10 w-full bg-slate-800" />
                          ))}
                        </div>
                      ) : projectData.details.length > 0 ? (
                        <Table className="text-slate-200">
                          <TableHeader>
                            <TableRow className="border-slate-800 hover:bg-transparent">
                              <TableHead className="text-slate-400">项目</TableHead>
                              <TableHead className="text-slate-400">阶段 / 状态</TableHead>
                              <TableHead className="text-slate-400">人力</TableHead>
                              <TableHead className="text-slate-400">未完</TableHead>
                              <TableHead className="text-slate-400">逾期</TableHead>
                              <TableHead className="text-slate-400">最近推进</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {projectData.details.map((project) => (
                              <TableRow key={project.projectId} className="border-slate-800 hover:bg-slate-900/80">
                                <TableCell>
                                  <button
                                    data-testid={`team-execution-project-detail-${project.projectId}`}
                                    type="button"
                                    onClick={() => openDetail('project', project.projectId)}
                                    className="text-left text-cyan-200 transition hover:text-cyan-100"
                                  >
                                    <div className="font-medium">{project.projectName}</div>
                                    <div className="mt-1 text-xs text-slate-400">{project.customerName || '未关联客户'} / 风险分 {project.riskScore}</div>
                                  </button>
                                </TableCell>
                                <TableCell>
                                  <div>{project.stage || '未标记阶段'}</div>
                                  <div className="mt-1 text-xs text-slate-400">{project.status || '未设置状态'}</div>
                                </TableCell>
                                <TableCell>
                                  <div>{project.activePeopleCount} 人参与</div>
                                  <div className="mt-1 text-xs text-slate-400">过载 {project.overloadedPeopleCount} / 成员池 {project.memberCount}</div>
                                </TableCell>
                                <TableCell>{project.openTaskCount}</TableCell>
                                <TableCell>{project.overdueTaskCount + project.blockedTodoCount}</TableCell>
                                <TableCell>{formatActivity(project.lastProgressAt, projectData.window.activityThresholdDays)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      ) : (
                        <Empty className="min-h-[240px] rounded-3xl border-slate-800 bg-slate-900/40 text-slate-300">
                          <EmptyHeader>
                            <EmptyMedia variant="icon" className="bg-cyan-500/15 text-cyan-200">
                              <FolderKanban className="size-6" />
                            </EmptyMedia>
                            <EmptyTitle className="text-white">当前没有项目执行明细</EmptyTitle>
                            <EmptyDescription className="text-slate-400">
                              当前筛选条件没有命中项目视角数据，可以切换范围或清空关键词后重试。
                            </EmptyDescription>
                          </EmptyHeader>
                        </Empty>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>
          ) : null}

          {filters.view === 'customer' ? (
            <section data-testid="team-execution-customer-panel" className="grid gap-6 xl:grid-cols-[1.02fr_1.28fr]">
              <Card className="border-cyan-500/15 bg-slate-950/60 text-slate-100">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Target className="h-5 w-5 text-cyan-300" />
                    客户活跃度分布与事项规模
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    客户视角聚焦最近互动、关联事项规模和重点项目承压，先满足领导识别“哪些客户该回访、哪些客户事项堆积”。
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {isCustomerLoading ? Array.from({ length: 4 }).map((_, index) => (
                      <div key={index} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                        <Skeleton className="h-4 w-16 bg-slate-800" />
                        <Skeleton className="mt-4 h-8 w-12 bg-slate-800" />
                        <Skeleton className="mt-3 h-3 w-full bg-slate-800" />
                      </div>
                    )) : [
                      { label: '纳入分析客户', value: customerData.overview.totalCustomers, description: '当前筛选范围内进入客户视角分析的客户总数。' },
                      { label: '低互动客户', value: customerData.overview.lowInteractionCustomers, description: '最近互动明显减少或沉默的客户数量。' },
                      { label: '事项堆积客户', value: customerData.overview.highBacklogCustomers, description: '关联任务与待办规模偏高的客户数量。' },
                      { label: '高风险客户', value: customerData.overview.highRiskCustomers, description: '互动降温且事项承压明显的客户数量。' },
                    ].map((item) => (
                      <div key={item.label} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                        <p className="text-sm text-slate-400">{item.label}</p>
                        <div className="mt-4 text-3xl font-semibold text-white">{item.value}</div>
                        <p className="mt-3 text-xs leading-5 text-slate-400">{item.description}</p>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-4">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <h2 className="text-base font-medium text-white">客户活跃度分布</h2>
                        <p className="mt-1 text-sm text-slate-400">按最近互动时间分成四档，快速识别哪些客户正在降温或已经沉默。</p>
                      </div>
                      {!isCustomerLoading ? (
                        <Badge variant="secondary" className="bg-slate-800 text-slate-100">
                          {customerData.window.label}
                        </Badge>
                      ) : null}
                    </div>

                    {isCustomerLoading ? (
                      <div className="space-y-3">
                        {Array.from({ length: 4 }).map((_, index) => (
                          <div key={index} className="rounded-2xl border border-slate-800/80 p-4">
                            <Skeleton className="h-4 w-24 bg-slate-800" />
                            <Skeleton className="mt-3 h-3 w-full bg-slate-800" />
                          </div>
                        ))}
                      </div>
                    ) : customerData.activityDistribution.length > 0 ? (
                      <div className="space-y-3">
                        {customerData.activityDistribution.map((item) => (
                          <div key={item.bucket} className="rounded-2xl border border-slate-800/80 p-4">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <h3 className="font-medium text-white">{item.label}</h3>
                                <p className="mt-1 text-sm text-slate-400">{item.description}</p>
                              </div>
                              <Badge variant="outline" className="border-slate-700 text-slate-200">{item.count} 个客户</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <Empty className="min-h-[220px] rounded-3xl border-slate-800 bg-slate-900/40 text-slate-300">
                        <EmptyHeader>
                          <EmptyMedia variant="icon" className="bg-cyan-500/15 text-cyan-200">
                            <Users className="size-6" />
                          </EmptyMedia>
                          <EmptyTitle className="text-white">当前没有客户活跃度数据</EmptyTitle>
                          <EmptyDescription className="text-slate-400">
                            可以放宽时间范围或清空关键词后重试。
                          </EmptyDescription>
                        </EmptyHeader>
                      </Empty>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-cyan-500/15 bg-slate-950/60 text-slate-100">
                <CardHeader>
                  <CardTitle className="text-white">客户事项规模排行与协同明细</CardTitle>
                  <CardDescription className="text-slate-400">
                    同一套客户统计口径下，同时展示关联事项规模排行和客户协同明细表；点击客户可直接进入统一详情抽屉。
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4 lg:grid-cols-[0.92fr_1.08fr]">
                    <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-4">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <h2 className="text-base font-medium text-white">客户事项规模排行</h2>
                        {!isCustomerLoading ? (
                          <Badge variant="secondary" className="bg-amber-500/15 text-amber-100">Top {customerData.scaleRanking.length}</Badge>
                        ) : null}
                      </div>

                      {isCustomerLoading ? (
                        <div className="space-y-3">
                          {Array.from({ length: 5 }).map((_, index) => (
                            <div key={index} className="rounded-2xl border border-slate-800/80 p-4">
                              <Skeleton className="h-4 w-32 bg-slate-800" />
                              <Skeleton className="mt-3 h-3 w-full bg-slate-800" />
                              <Skeleton className="mt-2 h-3 w-2/3 bg-slate-800" />
                            </div>
                          ))}
                        </div>
                      ) : customerData.scaleRanking.length > 0 ? (
                        <div className="space-y-3">
                          {customerData.scaleRanking.map((customer, index) => (
                            <button
                              key={customer.customerId}
                              data-testid={`team-execution-customer-scale-${customer.customerId}`}
                              type="button"
                              onClick={() => openDetail('customer', customer.customerId)}
                              className="w-full rounded-2xl border border-slate-800/80 p-4 text-left transition hover:border-cyan-500/40 hover:bg-slate-900"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-sm text-slate-400">#{index + 1}</p>
                                  <h3 className="mt-1 font-medium text-white">{customer.customerName}</h3>
                                  <p className="mt-1 text-sm text-slate-400">{customer.customerTypeName || '未设置类型'} / {customer.region || '未设置区域'}</p>
                                </div>
                                <Badge variant="secondary" className="bg-amber-500/15 text-amber-100">风险分 {customer.riskScore}</Badge>
                              </div>
                              <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-300">
                                <Badge variant="outline" className="border-slate-700 text-slate-200">{customerInteractionLabel[customer.interactionStatus]}</Badge>
                                <Badge variant="outline" className="border-slate-700 text-slate-200">事项 {customer.openItemCount}</Badge>
                                <Badge variant="outline" className="border-slate-700 text-slate-200">逾期 {customer.overdueItemCount}</Badge>
                                <Badge variant="outline" className="border-slate-700 text-slate-200">重点项目 {customer.keyProjectCount}</Badge>
                              </div>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <Empty className="min-h-[240px] rounded-3xl border-slate-800 bg-slate-900/40 text-slate-300">
                          <EmptyHeader>
                            <EmptyMedia variant="icon" className="bg-cyan-500/15 text-cyan-200">
                              <Search className="size-6" />
                            </EmptyMedia>
                            <EmptyTitle className="text-white">当前没有客户排行</EmptyTitle>
                            <EmptyDescription className="text-slate-400">
                              当前筛选条件下未命中客户协同数据。
                            </EmptyDescription>
                          </EmptyHeader>
                        </Empty>
                      )}
                    </div>

                    <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-4">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                          <h2 className="text-base font-medium text-white">客户协同明细表</h2>
                          <p className="mt-1 text-sm text-slate-400">统一展示客户类型、活跃项目、事项规模、重点项目承压和最近互动时间。</p>
                        </div>
                        {!isCustomerLoading ? (
                          <Badge variant="secondary" className="bg-slate-800 text-slate-100">低互动 {customerData.overview.lowInteractionCustomers} 个</Badge>
                        ) : null}
                      </div>
                      {isCustomerLoading ? (
                        <div className="space-y-3">
                          {Array.from({ length: 6 }).map((_, index) => (
                            <Skeleton key={index} className="h-10 w-full bg-slate-800" />
                          ))}
                        </div>
                      ) : customerData.details.length > 0 ? (
                        <Table className="text-slate-200">
                          <TableHeader>
                            <TableRow className="border-slate-800 hover:bg-transparent">
                              <TableHead className="text-slate-400">客户</TableHead>
                              <TableHead className="text-slate-400">类型 / 区域</TableHead>
                              <TableHead className="text-slate-400">活跃项目</TableHead>
                              <TableHead className="text-slate-400">事项规模</TableHead>
                              <TableHead className="text-slate-400">重点项目</TableHead>
                              <TableHead className="text-slate-400">最近互动</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {customerData.details.map((customer) => (
                              <TableRow key={customer.customerId} className="border-slate-800 hover:bg-slate-900/80">
                                <TableCell>
                                  <button
                                    data-testid={`team-execution-customer-detail-${customer.customerId}`}
                                    type="button"
                                    onClick={() => openDetail('customer', customer.customerId)}
                                    className="text-left text-cyan-200 transition hover:text-cyan-100"
                                  >
                                    <div className="font-medium">{customer.customerName}</div>
                                    <div className="mt-1 text-xs text-slate-400">{customer.contactName || '未设置联系人'} / 风险分 {customer.riskScore}</div>
                                  </button>
                                </TableCell>
                                <TableCell>
                                  <div>{customer.customerTypeName || '未设置类型'}</div>
                                  <div className="mt-1 text-xs text-slate-400">{customer.region || '未设置区域'}</div>
                                </TableCell>
                                <TableCell>
                                  <div>{customer.activeProjectCount} 个</div>
                                  <div className="mt-1 text-xs text-slate-400">当前项目 {customer.currentProjectCount}</div>
                                </TableCell>
                                <TableCell>
                                  <div>{customer.openItemCount} 项</div>
                                  <div className="mt-1 text-xs text-slate-400">逾期 {customer.overdueItemCount}</div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="border-slate-700 text-slate-200">{customer.keyProjectCount}</Badge>
                                </TableCell>
                                <TableCell>
                                  <div>{formatActivity(customer.lastInteractionTime, customerData.window.activityThresholdDays)}</div>
                                  <div className="mt-1 text-xs text-slate-400">{customerInteractionLabel[customer.interactionStatus]}</div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      ) : (
                        <Empty className="min-h-[240px] rounded-3xl border-slate-800 bg-slate-900/40 text-slate-300">
                          <EmptyHeader>
                            <EmptyMedia variant="icon" className="bg-cyan-500/15 text-cyan-200">
                              <Users className="size-6" />
                            </EmptyMedia>
                            <EmptyTitle className="text-white">当前没有客户协同明细</EmptyTitle>
                            <EmptyDescription className="text-slate-400">
                              可以切换范围或放宽关键词后重新查看。
                            </EmptyDescription>
                          </EmptyHeader>
                        </Empty>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>
          ) : null}

          {filters.view === 'solution' ? (
            <section data-testid="team-execution-solution-panel" className="grid gap-6 xl:grid-cols-[1.02fr_1.28fr]">
              <Card className="border-cyan-500/15 bg-slate-950/60 text-slate-100">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <FileStack className="h-5 w-5 text-cyan-300" />
                    方案状态分布与评审压力
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    方案视角聚焦状态分布、待评审压力和长期未更新项，优先识别“哪些方案卡在审核、哪些方案推进停滞”。
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {isSolutionLoading ? Array.from({ length: 4 }).map((_, index) => (
                      <div key={index} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                        <Skeleton className="h-4 w-16 bg-slate-800" />
                        <Skeleton className="mt-4 h-8 w-12 bg-slate-800" />
                        <Skeleton className="mt-3 h-3 w-full bg-slate-800" />
                      </div>
                    )) : [
                      { label: '纳入分析方案', value: solutionData.overview.totalSolutions, description: '当前筛选范围内纳入方案视角分析的方案总数。' },
                      { label: '审核中方案', value: solutionData.overview.reviewingSolutions, description: '当前处于审核状态、需要持续跟进的方案数量。' },
                      { label: '逾期评审', value: solutionData.overview.overdueReviews, description: '尚未完成且已过截止时间的评审条目数量。' },
                      { label: '停滞方案', value: solutionData.overview.staleSolutions, description: '最近长时间未更新的方案数量。' },
                    ].map((item) => (
                      <div key={item.label} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                        <p className="text-sm text-slate-400">{item.label}</p>
                        <div className="mt-4 text-3xl font-semibold text-white">{item.value}</div>
                        <p className="mt-3 text-xs leading-5 text-slate-400">{item.description}</p>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-4">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <h2 className="text-base font-medium text-white">方案状态分布</h2>
                        <p className="mt-1 text-sm text-slate-400">统一以方案状态为主轴，附带各状态下累计待评审压力。</p>
                      </div>
                      {!isSolutionLoading ? (
                        <Badge variant="secondary" className="bg-slate-800 text-slate-100">{solutionData.window.label}</Badge>
                      ) : null}
                    </div>

                    {isSolutionLoading ? (
                      <div className="space-y-3">
                        {Array.from({ length: 4 }).map((_, index) => (
                          <div key={index} className="rounded-2xl border border-slate-800/80 p-4">
                            <Skeleton className="h-4 w-24 bg-slate-800" />
                            <Skeleton className="mt-3 h-3 w-full bg-slate-800" />
                          </div>
                        ))}
                      </div>
                    ) : solutionData.statusDistribution.length > 0 ? (
                      <div className="space-y-3">
                        {solutionData.statusDistribution.map((item) => (
                          <div key={item.status} className="rounded-2xl border border-slate-800/80 p-4">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <h3 className="font-medium text-white">{item.label}</h3>
                                <p className="mt-1 text-sm text-slate-400">当前状态下共有 {item.count} 个方案，累计待评审 {item.pendingReviewCount} 条。</p>
                              </div>
                              <Badge variant="outline" className="border-slate-700 text-slate-200">{item.count} 个方案</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <Empty className="min-h-[220px] rounded-3xl border-slate-800 bg-slate-900/40 text-slate-300">
                        <EmptyHeader>
                          <EmptyMedia variant="icon" className="bg-cyan-500/15 text-cyan-200">
                            <FileStack className="size-6" />
                          </EmptyMedia>
                          <EmptyTitle className="text-white">当前没有方案状态数据</EmptyTitle>
                          <EmptyDescription className="text-slate-400">
                            可以放宽范围或清空关键词后重试。
                          </EmptyDescription>
                        </EmptyHeader>
                      </Empty>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-cyan-500/15 bg-slate-950/60 text-slate-100">
                <CardHeader>
                  <CardTitle className="text-white">方案压力排行与推进明细</CardTitle>
                  <CardDescription className="text-slate-400">
                    同一套方案统计口径下，同时展示评审压力排行和方案推进明细表；点击方案可直接进入统一详情抽屉。
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4 lg:grid-cols-[0.92fr_1.08fr]">
                    <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-4">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <h2 className="text-base font-medium text-white">方案评审压力排行</h2>
                        {!isSolutionLoading ? (
                          <Badge variant="secondary" className="bg-amber-500/15 text-amber-100">Top {solutionData.pressureRanking.length}</Badge>
                        ) : null}
                      </div>

                      {isSolutionLoading ? (
                        <div className="space-y-3">
                          {Array.from({ length: 5 }).map((_, index) => (
                            <div key={index} className="rounded-2xl border border-slate-800/80 p-4">
                              <Skeleton className="h-4 w-32 bg-slate-800" />
                              <Skeleton className="mt-3 h-3 w-full bg-slate-800" />
                              <Skeleton className="mt-2 h-3 w-2/3 bg-slate-800" />
                            </div>
                          ))}
                        </div>
                      ) : solutionData.pressureRanking.length > 0 ? (
                        <div className="space-y-3">
                          {solutionData.pressureRanking.map((solution, index) => (
                            <button
                              key={solution.solutionId}
                              data-testid={`team-execution-solution-pressure-${solution.solutionId}`}
                              type="button"
                              onClick={() => openDetail('solution', solution.solutionId)}
                              className="w-full rounded-2xl border border-slate-800/80 p-4 text-left transition hover:border-cyan-500/40 hover:bg-slate-900"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-sm text-slate-400">#{index + 1}</p>
                                  <h3 className="mt-1 font-medium text-white">{solution.solutionName}</h3>
                                  <p className="mt-1 text-sm text-slate-400">{solution.solutionTypeName || '未设置类型'} / 版本 {solution.version}</p>
                                </div>
                                <Badge variant="secondary" className="bg-amber-500/15 text-amber-100">风险分 {solution.riskScore}</Badge>
                              </div>
                              <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-300">
                                <Badge variant="outline" className="border-slate-700 text-slate-200">{solutionStatusLabel[solution.status as keyof typeof solutionStatusLabel] || solution.status || '未设置状态'}</Badge>
                                <Badge variant="outline" className="border-slate-700 text-slate-200">待评审 {solution.pendingReviewCount}</Badge>
                                <Badge variant="outline" className="border-slate-700 text-slate-200">逾期评审 {solution.overdueReviewCount}</Badge>
                                <Badge variant="outline" className="border-slate-700 text-slate-200">关联项目 {solution.relatedProjectCount}</Badge>
                              </div>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <Empty className="min-h-[240px] rounded-3xl border-slate-800 bg-slate-900/40 text-slate-300">
                          <EmptyHeader>
                            <EmptyMedia variant="icon" className="bg-cyan-500/15 text-cyan-200">
                              <Search className="size-6" />
                            </EmptyMedia>
                            <EmptyTitle className="text-white">当前没有方案压力排行</EmptyTitle>
                            <EmptyDescription className="text-slate-400">
                              当前筛选条件下未命中方案推进数据。
                            </EmptyDescription>
                          </EmptyHeader>
                        </Empty>
                      )}
                    </div>

                    <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-4">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                          <h2 className="text-base font-medium text-white">方案推进明细表</h2>
                          <p className="mt-1 text-sm text-slate-400">统一展示方案状态、审批状态、责任人、评审压力和最近更新时间。</p>
                        </div>
                        {!isSolutionLoading ? (
                          <Badge variant="secondary" className="bg-slate-800 text-slate-100">逾期评审 {solutionData.overview.overdueReviews} 条</Badge>
                        ) : null}
                      </div>
                      {isSolutionLoading ? (
                        <div className="space-y-3">
                          {Array.from({ length: 6 }).map((_, index) => (
                            <Skeleton key={index} className="h-10 w-full bg-slate-800" />
                          ))}
                        </div>
                      ) : solutionData.details.length > 0 ? (
                        <Table className="text-slate-200">
                          <TableHeader>
                            <TableRow className="border-slate-800 hover:bg-transparent">
                              <TableHead className="text-slate-400">方案</TableHead>
                              <TableHead className="text-slate-400">状态 / 审批</TableHead>
                              <TableHead className="text-slate-400">责任人</TableHead>
                              <TableHead className="text-slate-400">评审压力</TableHead>
                              <TableHead className="text-slate-400">关联项目</TableHead>
                              <TableHead className="text-slate-400">最近更新</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {solutionData.details.map((solution) => (
                              <TableRow key={solution.solutionId} className="border-slate-800 hover:bg-slate-900/80">
                                <TableCell>
                                  <button
                                    data-testid={`team-execution-solution-detail-${solution.solutionId}`}
                                    type="button"
                                    onClick={() => openDetail('solution', solution.solutionId)}
                                    className="text-left text-cyan-200 transition hover:text-cyan-100"
                                  >
                                    <div className="font-medium">{solution.solutionName}</div>
                                    <div className="mt-1 text-xs text-slate-400">{solution.solutionTypeName || '未设置类型'} / v{solution.version}</div>
                                  </button>
                                </TableCell>
                                <TableCell>
                                  <div>{solutionStatusLabel[solution.status as keyof typeof solutionStatusLabel] || solution.status || '未设置状态'}</div>
                                  <div className="mt-1 text-xs text-slate-400">{solution.approvalStatus || '未设置审批状态'}</div>
                                </TableCell>
                                <TableCell>
                                  <div>{solution.ownerName || '未设置负责人'}</div>
                                  <div className="mt-1 text-xs text-slate-400">评审 {solution.reviewerName || '未设置评审人'}</div>
                                </TableCell>
                                <TableCell>
                                  <div>待评审 {solution.pendingReviewCount}</div>
                                  <div className="mt-1 text-xs text-slate-400">逾期 {solution.overdueReviewCount} / 风险分 {solution.riskScore}</div>
                                </TableCell>
                                <TableCell>{solution.relatedProjectCount}</TableCell>
                                <TableCell>
                                  <div>{formatActivity(solution.lastUpdatedAt, solutionData.window.activityThresholdDays)}</div>
                                  <div className="mt-1 text-xs text-slate-400">停滞 {solution.staleDays} 天</div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      ) : (
                        <Empty className="min-h-[240px] rounded-3xl border-slate-800 bg-slate-900/40 text-slate-300">
                          <EmptyHeader>
                            <EmptyMedia variant="icon" className="bg-cyan-500/15 text-cyan-200">
                              <FileStack className="size-6" />
                            </EmptyMedia>
                            <EmptyTitle className="text-white">当前没有方案推进明细</EmptyTitle>
                            <EmptyDescription className="text-slate-400">
                              可以切换范围或放宽关键词后重新查看。
                            </EmptyDescription>
                          </EmptyHeader>
                        </Empty>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>
          ) : null}

          <section className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
            <Card className="border-cyan-500/15 bg-slate-950/60 text-slate-100">
              <CardHeader>
                <CardTitle className="text-white">当前激活视角</CardTitle>
                <CardDescription className="text-slate-400">
                  当前页已经能在 URL 中保留视角与筛选条件，刷新后不会丢失上下文。
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-3xl border border-cyan-500/20 bg-cyan-500/10 p-5">
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge variant="outline" className="border-cyan-400/50 bg-transparent text-cyan-100">
                      <span data-testid="team-execution-active-view">{activeViewLabel}</span>
                    </Badge>
                    <Badge variant="secondary" className="bg-slate-800 text-slate-100">
                      {activeRangeLabel}
                    </Badge>
                    <Badge variant="secondary" className="bg-slate-800 text-slate-100">
                      {activeFocusLabel}
                    </Badge>
                    {filters.q ? (
                      <Badge variant="secondary" className="bg-slate-800 text-slate-100">
                        关键词：{filters.q}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-4 text-sm leading-6 text-slate-200">{activeViewDescription}</p>
                  <p className="mt-3 text-sm leading-6 text-slate-300">
                    当前已在角色视角、项目视角、客户视角和方案视角下落地分析模块；后续将继续沿用同一协议推进测试与联调收口。
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-cyan-500/15 bg-slate-950/60 text-slate-100">
              <CardHeader>
                <CardTitle className="text-white">逾期与阻塞项</CardTitle>
                <CardDescription className="text-slate-400">
                  首屏风险聚焦之外，再单独保留一列处理级列表，方便领导快速确定催办对象。
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isRiskLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <div key={index} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                        <Skeleton className="h-4 w-2/3 bg-slate-800" />
                        <Skeleton className="mt-3 h-3 w-full bg-slate-800" />
                        <Skeleton className="mt-2 h-3 w-1/2 bg-slate-800" />
                      </div>
                    ))}
                  </div>
                ) : riskData.blockedList.length > 0 ? (
                  <div className="space-y-3">
                    {riskData.blockedList.map((item) => (
                      <div key={`${item.type}-${item.id}`} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="secondary" className="bg-rose-500/15 text-rose-100">
                                {item.type === 'task' ? '任务' : '待办'}
                              </Badge>
                              <h3 className="font-medium text-white">{item.title}</h3>
                            </div>
                            <p className="mt-2 text-sm text-slate-400">
                              {item.ownerName || '未分配责任人'}
                              {item.projectName ? ` / ${item.projectName}` : ''}
                            </p>
                          </div>
                          <Badge variant="secondary" className="bg-amber-500/15 text-amber-100">
                            逾期 {item.overdueDays} 天
                          </Badge>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs">
                          {item.priority ? (
                            <Badge variant="outline" className="border-slate-700 text-slate-200">优先级 {item.priority}</Badge>
                          ) : null}
                          {item.dueDate ? (
                            <Badge variant="outline" className="border-slate-700 text-slate-200">截止 {item.dueDate}</Badge>
                          ) : null}
                          {item.status ? (
                            <Badge variant="outline" className="border-slate-700 text-slate-200">状态 {item.status}</Badge>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Empty className="min-h-[260px] rounded-3xl border-slate-800 bg-slate-900/70 text-slate-300">
                    <EmptyHeader>
                      <EmptyMedia variant="icon" className="bg-cyan-500/15 text-cyan-200">
                        <ShieldCheck className="size-6" />
                      </EmptyMedia>
                      <EmptyTitle className="text-white">当前没有逾期阻塞项</EmptyTitle>
                      <EmptyDescription className="text-slate-400">
                        在当前查询条件下，没有需要立即催办的任务或待办。
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                )}
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-6 xl:grid-cols-4">
            {viewCards.map((view) => (
              <Card key={view.title} className="border-cyan-500/15 bg-slate-950/60 text-slate-100">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle className="text-base text-white">{view.title}</CardTitle>
                    <Badge variant="secondary" className="bg-cyan-500/15 text-cyan-100">
                      {view.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-6 text-slate-300">{view.description}</p>
                </CardContent>
              </Card>
            ))}
          </section>

          <TeamExecutionObjectDetailDrawer
            selection={selectedDetail}
            filters={filters}
            onClose={() => setSelectedDetail(null)}
            onNavigateEntity={(nextSelection) => setSelectedDetail(nextSelection)}
          />
        </div>
      </div>
    </RequireAuth>
  );
}