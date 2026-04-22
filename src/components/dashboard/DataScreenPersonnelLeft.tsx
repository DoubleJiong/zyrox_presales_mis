'use client';

import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import type { PersonDetail, PersonnelViewData } from '@/types/data-screen';
import { DS_COLORS, DsPanel, DsSkeleton, DS_TOOLTIP, fmtWan, STAGE_LABEL } from './DataScreenShell';

interface Props {
  data: PersonnelViewData | null;
  loading: boolean;
  detail?: PersonDetail | null;
  detailLoading?: boolean;
  selectedUserId?: number | null;
}

function useECharts(
  containerRef: React.RefObject<HTMLDivElement | null>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  option: any,
  deps: unknown[],
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chartRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !containerRef.current) return;
    if (!chartRef.current) {
      chartRef.current = echarts.init(containerRef.current, null, { renderer: 'canvas' });
      new ResizeObserver(() => chartRef.current?.resize()).observe(containerRef.current!);
    }
    chartRef.current.setOption(option, { notMerge: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => () => { chartRef.current?.dispose(); chartRef.current = null; }, []);
}

function MiniChip({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '5px 8px',
      background: 'rgba(0,212,255,0.06)',
      border: '1px solid ' + DS_COLORS.border,
      borderRadius: 6,
      minWidth: 58,
    }}>
      <span style={{ fontSize: 14, fontWeight: 700, color: color ?? DS_COLORS.primary, lineHeight: 1.2 }}>{value}</span>
      <span style={{ fontSize: 9, color: DS_COLORS.muted, marginTop: 2 }}>{label}</span>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: DS_COLORS.muted, fontSize: 11 }}>
      {text}
    </div>
  );
}

function TaskPriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, { label: string; color: string }> = {
    urgent: { label: '紧急', color: DS_COLORS.danger },
    high: { label: '高', color: DS_COLORS.warning },
    medium: { label: '中', color: DS_COLORS.primary },
    low: { label: '低', color: DS_COLORS.muted },
  };
  const cfg = map[priority] ?? map.medium;
  return (
    <span style={{
      fontSize: 9,
      padding: '1px 4px',
      borderRadius: 3,
      background: cfg.color + '22',
      color: cfg.color,
      border: '1px solid ' + cfg.color + '44',
      flexShrink: 0,
    }}>{cfg.label}</span>
  );
}

function isSameDay(dateA: Date, dateB: Date) {
  return dateA.getFullYear() === dateB.getFullYear()
    && dateA.getMonth() === dateB.getMonth()
    && dateA.getDate() === dateB.getDate();
}

function isWithinDays(date: Date, base: Date, days: number) {
  const diffMs = date.getTime() - base.getTime();
  return diffMs >= 0 && diffMs < days * 24 * 60 * 60 * 1000;
}

function TrendBar({ label, value, max, target, abnormal }: { label: string; value: number; max: number; target: number; abnormal: boolean }) {
  const ratio = max > 0 ? value / max : 0;
  const height = Math.max(6, Math.round(ratio * 26) + 4);
  const isBelowTarget = value < target;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 24 }}>
      <div style={{ fontSize: 9, color: abnormal ? DS_COLORS.danger : DS_COLORS.muted, lineHeight: 1 }}>{value > 0 ? value : '-'}</div>
      <div style={{ height: 34, display: 'flex', alignItems: 'flex-end' }}>
        <div style={{
          width: 10,
          height,
          borderRadius: 3,
          background: abnormal
            ? 'linear-gradient(180deg, ' + DS_COLORS.danger + ', ' + DS_COLORS.warning + ')'
            : 'linear-gradient(180deg, ' + DS_COLORS.success + ', ' + DS_COLORS.primary + ')',
          boxShadow: '0 0 10px ' + (abnormal ? DS_COLORS.danger : DS_COLORS.primary) + '55',
          border: isBelowTarget ? '1px solid ' + DS_COLORS.warning + '88' : 'none',
        }} />
      </div>
      <div style={{ fontSize: 8, color: DS_COLORS.muted, lineHeight: 1 }}>{label}</div>
    </div>
  );
}

// ── Project Manhour Ranking ────────────────────────────────────────────────
function ManhourPanel({ data, loading }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const rows = data?.projectManhourRanking ?? [];

  const option = {
    backgroundColor: 'transparent',
    tooltip: { ...DS_TOOLTIP, formatter: (p: { name: string; value: number }) => `${p.name}<br/>工时: ${p.value}h` },
    grid: { top: 4, bottom: 4, left: 4, right: 56, containLabel: true },
    xAxis: { type: 'value', axisLabel: { color: DS_COLORS.muted, fontSize: 9 }, splitLine: { lineStyle: { color: DS_COLORS.border } } },
    yAxis: {
      type: 'category',
      data: rows.map(r => r.projectName.length > 8 ? r.projectName.slice(0, 8) + '…' : r.projectName),
      axisLabel: { color: DS_COLORS.text, fontSize: 9 },
      axisTick: { show: false },
    },
    series: [{
      type: 'bar',
      data: rows.map(r => r.totalHours),
      barMaxWidth: 12,
      itemStyle: {
        color: {
          type: 'linear', x: 0, y: 0, x2: 1, y2: 0,
          colorStops: [
            { offset: 0, color: DS_COLORS.primary + '55' },
            { offset: 1, color: DS_COLORS.primary },
          ],
        },
        borderRadius: [0, 3, 3, 0],
      },
      label: {
        show: true,
        position: 'right',
        formatter: (p: { value: number }) => p.value + 'h',
        color: DS_COLORS.muted,
        fontSize: 9,
      },
    }],
  };

  useECharts(ref, option, [rows]);

  return (
    <DsPanel title="项目人力投入排行" style={{ flex: 1, minHeight: 0 }}>
      {loading ? <DsSkeleton /> : rows.length === 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: DS_COLORS.muted, fontSize: 11 }}>
          暂无数据
        </div>
      ) : (
        <div ref={ref} style={{ width: '100%', height: '100%' }} />
      )}
    </DsPanel>
  );
}

// ── HQ Per-capita Bar ──────────────────────────────────────────────────────
function HqPerCapitaPanel({ data, loading }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const rows = data?.hqPerCapitaList ?? [];

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      ...DS_TOOLTIP,
      formatter: (p: { name: string; value: number; seriesName: string }) =>
        `${p.name}<br/>${p.seriesName}: ${p.value}`,
    },
    grid: { top: 4, bottom: 4, left: 4, right: 56, containLabel: true },
    xAxis: { type: 'value', axisLabel: { color: DS_COLORS.muted, fontSize: 9 }, splitLine: { lineStyle: { color: DS_COLORS.border } } },
    yAxis: {
      type: 'category',
      data: rows.map(r => r.displayName),
      axisLabel: { color: DS_COLORS.text, fontSize: 9 },
      axisTick: { show: false },
    },
    series: [
      {
        name: '中标金额(万)',
        type: 'bar',
        data: rows.map(r => r.wonAmount),
        barMaxWidth: 10,
        itemStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 1, y2: 0,
            colorStops: [
              { offset: 0, color: DS_COLORS.success + '44' },
              { offset: 1, color: DS_COLORS.success },
            ],
          },
          borderRadius: [0, 3, 3, 0],
        },
        label: {
          show: true,
          position: 'right',
          formatter: (p: { value: number }) => p.value > 0 ? p.value.toFixed(0) + '万' : '0',
          color: DS_COLORS.muted,
          fontSize: 9,
        },
      },
    ],
  };

  useECharts(ref, option, [rows]);

  return (
    <DsPanel title="总部人均产值" style={{ flex: 1, minHeight: 0 }}>
      {loading ? <DsSkeleton /> : rows.length === 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: DS_COLORS.muted, fontSize: 11 }}>
          暂无数据
        </div>
      ) : (
        <div ref={ref} style={{ width: '100%', height: '100%' }} />
      )}
    </DsPanel>
  );
}

// ── Regional Per-capita Bar ────────────────────────────────────────────────
function RegionalPerCapitaPanel({ data, loading }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const rows = data?.regionalPerCapitaList ?? [];

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      ...DS_TOOLTIP,
      formatter: (p: { name: string; value: number; seriesName: string }) =>
        `${p.name}<br/>${p.seriesName}: ${p.value}`,
    },
    grid: { top: 4, bottom: 4, left: 4, right: 56, containLabel: true },
    xAxis: { type: 'value', axisLabel: { color: DS_COLORS.muted, fontSize: 9 }, splitLine: { lineStyle: { color: DS_COLORS.border } } },
    yAxis: {
      type: 'category',
      data: rows.map(r => {
        const name = r.displayName;
        const region = r.region ? `(${r.region.slice(0, 2)})` : '';
        return name + region;
      }),
      axisLabel: { color: DS_COLORS.text, fontSize: 9 },
      axisTick: { show: false },
    },
    series: [
      {
        name: '中标金额(万)',
        type: 'bar',
        data: rows.map(r => r.wonAmount),
        barMaxWidth: 10,
        itemStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 1, y2: 0,
            colorStops: [
              { offset: 0, color: DS_COLORS.warning + '44' },
              { offset: 1, color: DS_COLORS.warning },
            ],
          },
          borderRadius: [0, 3, 3, 0],
        },
        label: {
          show: true,
          position: 'right',
          formatter: (p: { value: number }) => p.value > 0 ? p.value.toFixed(0) + '万' : '0',
          color: DS_COLORS.muted,
          fontSize: 9,
        },
      },
    ],
  };

  useECharts(ref, option, [rows]);

  return (
    <DsPanel title="区域人均产值" style={{ flex: 1, minHeight: 0 }}>
      {loading ? <DsSkeleton /> : rows.length === 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: DS_COLORS.muted, fontSize: 11 }}>
          暂无数据
        </div>
      ) : (
        <div ref={ref} style={{ width: '100%', height: '100%' }} />
      )}
    </DsPanel>
  );
}

export function DataScreenPersonnelLeft({ data, loading, detail, detailLoading, selectedUserId }: Props) {
  const personMode = selectedUserId !== null;

  if (personMode) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <PersonalOverviewPanel detail={detail ?? null} loading={Boolean(detailLoading)} />
        <PersonalTasksPanel detail={detail ?? null} loading={Boolean(detailLoading)} />
        <PersonalSolutionsPanel detail={detail ?? null} loading={Boolean(detailLoading)} />
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <ManhourPanel data={data} loading={loading} />
      <HqPerCapitaPanel data={data} loading={loading} />
      <RegionalPerCapitaPanel data={data} loading={loading} />
    </div>
  );
}

function PersonalOverviewPanel({ detail, loading }: { detail: PersonDetail | null; loading: boolean }) {
  return (
    <DsPanel title="个人项目快照" titleRight={<span style={{ fontSize: 10, color: DS_COLORS.warning }}>个人态</span>} style={{ flex: 1, minHeight: 0 }}>
      {loading ? <DsSkeleton /> : !detail ? <EmptyState text="暂无个人项目数据" /> : (
        <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8, height: '100%', boxSizing: 'border-box' }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <MiniChip label="项目数" value={detail.projectCount} color={DS_COLORS.primary} />
            <MiniChip label="方案数" value={detail.solutionCount} color={DS_COLORS.secondary} />
            <MiniChip label="中标额" value={fmtWan(detail.wonAmount) + '万'} color={DS_COLORS.success} />
            <MiniChip label="工时" value={detail.presalesHours + 'h'} color={DS_COLORS.warning} />
          </div>

          <div style={{ fontSize: 10, color: DS_COLORS.muted }}>近期参与项目</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, minHeight: 0, overflowY: 'auto' }}>
            {detail.recentProjects.length === 0 ? (
              <EmptyState text="暂无近期项目" />
            ) : detail.recentProjects.map(project => (
              <div key={project.id} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '5px 7px',
                borderRadius: 4,
                background: 'rgba(0,212,255,0.04)',
              }}>
                <span style={{ width: 4, height: 4, borderRadius: '50%', background: DS_COLORS.primary, flexShrink: 0 }} />
                <span style={{ fontSize: 10, color: DS_COLORS.text, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {project.projectName}
                </span>
                <span style={{ fontSize: 9, color: DS_COLORS.muted, flexShrink: 0 }}>
                  {STAGE_LABEL[project.projectStage] ?? project.projectStage}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </DsPanel>
  );
}

function PersonalTasksPanel({ detail, loading }: { detail: PersonDetail | null; loading: boolean }) {
  const tasks = detail?.currentTasks ?? [];
  const schedules = detail?.upcomingSchedules ?? [];
  const now = new Date();
  const todaySchedules = schedules.filter(schedule => {
    const d = new Date(schedule.startDate);
    return !Number.isNaN(d.getTime()) && isSameDay(d, now);
  });
  const weekSchedules = schedules.filter(schedule => {
    const d = new Date(schedule.startDate);
    return !Number.isNaN(d.getTime()) && !isSameDay(d, now) && isWithinDays(d, now, 7);
  });
  return (
    <DsPanel title="当前事项推进" titleRight={<span style={{ fontSize: 10, color: DS_COLORS.warning }}>{tasks.length}项 / 今{todaySchedules.length} / 本周{weekSchedules.length}</span>} style={{ flex: 1, minHeight: 0 }}>
      {loading ? <DsSkeleton /> : !detail ? <EmptyState text="暂无事项数据" /> : (
        <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6, height: '100%', boxSizing: 'border-box' }}>
          <div style={{ fontSize: 10, color: DS_COLORS.muted }}>待推进事项</div>
          {tasks.length === 0 ? (
            <div style={{ paddingBottom: 4 }}>
              <EmptyState text="当前无待推进事项" />
            </div>
          ) : tasks.slice(0, 4).map(task => (
            <div key={task.kind + ':' + task.id} style={{
              padding: '6px 8px',
              borderRadius: 4,
              border: '1px solid rgba(255,204,0,0.16)',
              background: 'rgba(255,204,0,0.04)',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  fontSize: 9,
                  padding: '1px 4px',
                  borderRadius: 3,
                  background: task.kind === 'task' ? DS_COLORS.primary + '22' : DS_COLORS.secondary + '22',
                  color: task.kind === 'task' ? DS_COLORS.primary : DS_COLORS.secondary,
                }}>{task.kind === 'task' ? '任务' : '待办'}</span>
                <span style={{ fontSize: 10, color: DS_COLORS.text, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {task.title}
                </span>
                <TaskPriorityBadge priority={task.priority} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 9, color: DS_COLORS.muted, flexWrap: 'wrap' }}>
                {task.relatedName && <span>{task.relatedName}</span>}
                {task.dueDate && <span>截止 {task.dueDate}</span>}
                <span>{task.status === 'in_progress' ? '进行中' : '待处理'}</span>
              </div>
            </div>
          ))}

          <div style={{ marginTop: 2, paddingTop: 6, borderTop: '1px solid ' + DS_COLORS.border, display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ fontSize: 10, color: DS_COLORS.muted }}>近期日程</span>
            <span style={{ fontSize: 9, color: DS_COLORS.success }}>今日 {todaySchedules.length}</span>
            <span style={{ fontSize: 9, color: DS_COLORS.primary }}>本周 {weekSchedules.length}</span>
          </div>
          {todaySchedules.length === 0 ? (
            <div style={{ paddingBottom: 2 }}>
              <EmptyState text="今日暂无日程" />
            </div>
          ) : todaySchedules.slice(0, 2).map(schedule => (
            <div key={schedule.id} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '5px 7px',
              borderRadius: 4,
              background: 'rgba(0,255,136,0.08)',
              border: '1px solid rgba(0,255,136,0.18)',
            }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: DS_COLORS.success, flexShrink: 0 }} />
              <span style={{ fontSize: 10, color: DS_COLORS.text, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {schedule.title}
              </span>
              <span style={{ fontSize: 9, color: DS_COLORS.muted, flexShrink: 0 }}>
                {schedule.startTime ? schedule.startTime.slice(0, 5) : '全天'}
              </span>
            </div>
          ))}

          <div style={{ fontSize: 9, color: DS_COLORS.muted }}>
            本周安排
          </div>
          {weekSchedules.length === 0 ? (
            <div style={{ paddingBottom: 4 }}>
              <EmptyState text="本周暂无后续日程" />
            </div>
          ) : weekSchedules.slice(0, 2).map(schedule => (
            <div key={schedule.id} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '5px 7px',
              borderRadius: 4,
              background: 'rgba(0,255,136,0.05)',
              border: '1px solid rgba(0,255,136,0.12)',
            }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: DS_COLORS.success, flexShrink: 0 }} />
              <span style={{ fontSize: 10, color: DS_COLORS.text, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {schedule.title}
              </span>
              <span style={{ fontSize: 9, color: DS_COLORS.muted, flexShrink: 0 }}>
                {schedule.startDate.slice(5)}{schedule.startTime ? ' ' + schedule.startTime.slice(0, 5) : ''}
              </span>
            </div>
          ))}
        </div>
      )}
    </DsPanel>
  );
}

function PersonalSolutionsPanel({ detail, loading }: { detail: PersonDetail | null; loading: boolean }) {
  const rows = detail?.solutions ?? [];
  const trend = detail?.worklogTrend ?? [];
  const trendTotal = trend.reduce((sum, item) => sum + item.hours, 0);
  const trendAvg = trend.length > 0 ? trendTotal / trend.length : 0;
  const trendTarget = Math.max(8, Math.round(trendAvg * 10) / 10);
  const anomalies = trend.filter(item => item.hours > trendTarget * 1.6 || item.hours < trendTarget * 0.5);
  const trendMax = Math.max(trendTarget, trend.reduce((max, item) => Math.max(max, item.hours), 0));
  const targetRatio = trendMax > 0 ? trendTarget / trendMax : 0;
  const targetTop = 40 - Math.max(0, Math.min(36, Math.round(targetRatio * 34)));
  return (
    <DsPanel title="方案协作画像" titleRight={<span style={{ fontSize: 10, color: DS_COLORS.warning }}>{rows.length} / {trend.length}</span>} style={{ flex: 1, minHeight: 0 }}>
      {loading ? <DsSkeleton /> : !detail ? <EmptyState text="暂无方案数据" /> : (
        <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8, height: '100%', boxSizing: 'border-box' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ fontSize: 10, color: DS_COLORS.muted }}>近 8 周投入工时</span>
              <span style={{ fontSize: 9, color: DS_COLORS.success }}>
                {trendTotal.toFixed(1)}h
              </span>
            </div>
            {trend.length === 0 ? (
              <div style={{ paddingBottom: 2 }}>
                <EmptyState text="暂无工时记录" />
              </div>
            ) : (
              <div style={{
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'space-between',
                gap: 4,
                padding: '6px 8px 4px',
                borderRadius: 4,
                background: 'rgba(0,212,255,0.04)',
                border: '1px solid rgba(0,212,255,0.10)',
                position: 'relative',
              }}>
                <div style={{
                  position: 'absolute',
                  left: 8,
                  right: 8,
                  top: targetTop,
                  borderTop: '1px dashed ' + DS_COLORS.warning + '99',
                  pointerEvents: 'none',
                }} />
                <span style={{
                  position: 'absolute',
                  right: 10,
                  top: Math.max(0, targetTop - 10),
                  fontSize: 8,
                  color: DS_COLORS.warning,
                  background: 'rgba(10,20,40,0.75)',
                  padding: '0 3px',
                  borderRadius: 2,
                }}>目标 {trendTarget.toFixed(1)}h</span>
                {trend.map(item => (
                  <TrendBar
                    key={item.week}
                    label={item.week}
                    value={item.hours}
                    max={trendMax}
                    target={trendTarget}
                    abnormal={item.hours > trendTarget * 1.6 || item.hours < trendTarget * 0.5}
                  />
                ))}
              </div>
            )}
            {trend.length > 0 && (
              <div style={{ fontSize: 9, color: anomalies.length > 0 ? DS_COLORS.danger : DS_COLORS.muted }}>
                {anomalies.length > 0
                  ? `异常波动 ${anomalies.length} 周（${anomalies.map(item => item.week).join('、')}）`
                  : `波动正常，周均 ${trendAvg.toFixed(1)}h`}
              </div>
            )}
          </div>

          <div style={{ fontSize: 10, color: DS_COLORS.muted }}>
            当前已参与 {detail.solutionCount} 个方案协作，以下展示最近相关方案条目。
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, minHeight: 0, overflowY: 'auto' }}>
            {rows.length === 0 ? (
              <EmptyState text="暂无方案协作记录" />
            ) : rows.map(solution => (
              <div key={solution.id} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 8px',
                background: 'rgba(178,75,243,0.05)',
                borderRadius: 4,
              }}>
                <span style={{ width: 5, height: 5, borderRadius: 2, background: DS_COLORS.secondary, flexShrink: 0 }} />
                <span style={{ fontSize: 10, color: DS_COLORS.text, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {solution.solutionName}
                </span>
                <span style={{ fontSize: 9, color: DS_COLORS.secondary, flexShrink: 0 }}>{solution.role}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </DsPanel>
  );
}
