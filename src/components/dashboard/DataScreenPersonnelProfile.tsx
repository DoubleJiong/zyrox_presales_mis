'use client';

import React from 'react';
import type { PersonDetail, PersonCurrentTask, PersonnelViewData } from '@/types/data-screen';
import { DS_COLORS, DsPanel, DsSkeleton, fmtWan, STAGE_LABEL } from './DataScreenShell';

interface Props {
  detail: PersonDetail | null | undefined;
  overview?: PersonnelViewData | null;
  loading: boolean;
}

const ROLE_LABEL: Record<string, string> = {
  solution_engineer:       '解决方案工程师',
  presale_manager:         '售前经理',
  hq_presale_engineer:     '总部售前工程师',
  regional_presale_engineer: '区域售前工程师',
  business_support:        '商务支撑',
};

const SOLUTION_ROLE_LABEL: Record<string, string> = {
  creator:     '主创',
  contributor: '贡献者',
  reviewer:    '评审',
  maintainer:  '维护者',
};

function StatChip({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '6px 10px',
      background: 'rgba(0,212,255,0.06)',
      border: '1px solid ' + DS_COLORS.border,
      borderRadius: 6,
      minWidth: 58,
    }}>
      <span style={{ fontSize: 16, fontWeight: 700, color: color ?? DS_COLORS.primary, lineHeight: 1.2 }}>{value}</span>
      <span style={{ fontSize: 10, color: DS_COLORS.muted, marginTop: 2 }}>{label}</span>
    </div>
  );
}

function BidResultBadge({ result }: { result: string | null }) {
  if (!result) return null;
  const map: Record<string, { label: string; color: string }> = {
    won:     { label: '中标', color: DS_COLORS.success },
    lost:    { label: '未中', color: DS_COLORS.danger },
    pending: { label: '待定', color: DS_COLORS.muted },
  };
  const cfg = map[result] ?? { label: result, color: DS_COLORS.muted };
  return (
    <span style={{
      fontSize: 9,
      padding: '1px 5px',
      borderRadius: 3,
      background: cfg.color + '22',
      color: cfg.color,
      border: '1px solid ' + cfg.color + '55',
      marginLeft: 4,
      flexShrink: 0,
    }}>{cfg.label}</span>
  );
}

const PRIORITY_CFG: Record<string, { label: string; color: string }> = {
  urgent: { label: '紧急', color: DS_COLORS.danger },
  high:   { label: '高',   color: DS_COLORS.warning },
  medium: { label: '中',   color: DS_COLORS.primary },
  low:    { label: '低',   color: DS_COLORS.muted },
};

const TODO_TYPE_LABEL: Record<string, string> = {
  followup:         '跟进',
  meeting:          '会议',
  document:         '文档',
  approval:         '审批',
  leader_assigned:  '指派',
  personal:         '个人',
};

const STATUS_CFG: Record<string, { label: string; color: string }> = {
  pending:     { label: '待处理', color: DS_COLORS.muted },
  in_progress: { label: '进行中', color: DS_COLORS.success },
};

/** Checks whether a due date is overdue relative to today */
function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date(new Date().toDateString());
}

function CurrentTasksSection({ tasks }: { tasks: PersonCurrentTask[] | undefined }) {
  if (!tasks || tasks.length === 0) return null;
  return (
    <div>
      {/* Section divider */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        marginBottom: 6,
      }}>
        <div style={{
          width: 3,
          height: 12,
          borderRadius: 2,
          background: DS_COLORS.warning,
          flexShrink: 0,
        }} />
        <span style={{ fontSize: 11, fontWeight: 600, color: DS_COLORS.warning }}>
          当前事项
        </span>
        <span style={{
          fontSize: 9,
          padding: '1px 5px',
          borderRadius: 8,
          background: DS_COLORS.warning + '22',
          color: DS_COLORS.warning,
          border: '1px solid ' + DS_COLORS.warning + '55',
        }}>
          {tasks.length}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {tasks.map(t => {
          const pCfg = PRIORITY_CFG[t.priority] ?? PRIORITY_CFG.medium;
          const sCfg = STATUS_CFG[t.status] ?? STATUS_CFG.pending;
          const overdue = isOverdue(t.dueDate);
          return (
            <div
              key={t.kind + ':' + t.id}
              style={{
                padding: '5px 8px',
                background: 'rgba(255,204,0,0.04)',
                border: '1px solid ' + (overdue ? DS_COLORS.danger + '44' : 'rgba(255,204,0,0.15)'),
                borderRadius: 4,
                display: 'flex',
                flexDirection: 'column',
                gap: 3,
              }}
            >
              {/* Title row */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 5 }}>
                {/* Kind icon */}
                <span style={{
                  fontSize: 9,
                  padding: '1px 4px',
                  borderRadius: 2,
                  background: t.kind === 'task' ? 'rgba(0,212,255,0.15)' : 'rgba(178,75,243,0.15)',
                  color: t.kind === 'task' ? DS_COLORS.primary : DS_COLORS.secondary,
                  flexShrink: 0,
                  marginTop: 1,
                }}>
                  {t.kind === 'task' ? '任务' : (TODO_TYPE_LABEL[t.taskType ?? ''] ?? '待办')}
                </span>
                <span style={{
                  fontSize: 11,
                  color: DS_COLORS.text,
                  flex: 1,
                  lineHeight: 1.4,
                  wordBreak: 'break-all',
                }}>
                  {t.title}
                </span>
              </div>
              {/* Meta row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                {/* Priority badge */}
                <span style={{
                  fontSize: 9,
                  padding: '1px 4px',
                  borderRadius: 2,
                  background: pCfg.color + '22',
                  color: pCfg.color,
                  border: '1px solid ' + pCfg.color + '44',
                }}>
                  {pCfg.label}
                </span>
                {/* Status */}
                <span style={{ fontSize: 9, color: sCfg.color }}>{sCfg.label}</span>
                {/* Related name */}
                {t.relatedName && (
                  <span style={{
                    fontSize: 9,
                    color: DS_COLORS.muted,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: 90,
                  }}>
                    {t.relatedName}
                  </span>
                )}
                {/* Due date */}
                {t.dueDate && (
                  <span style={{
                    fontSize: 9,
                    marginLeft: 'auto',
                    color: overdue ? DS_COLORS.danger : DS_COLORS.muted,
                    flexShrink: 0,
                  }}>
                    {overdue ? '⚠ ' : ''}{t.dueDate}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TeamOverviewSection({ overview }: { overview?: PersonnelViewData | null }) {
  const kpi = overview?.kpi;
  const nodes = overview?.graphData?.nodes ?? [];
  const activeProjectCount = nodes.filter(n => n.nodeType === 'project').length;
  const activeSolutionCount = nodes.filter(n => n.nodeType === 'solution').length;
  const totalPeople = (kpi?.solutionEngineerCount ?? 0)
    + (kpi?.hqPresalesCount ?? 0)
    + (kpi?.regionalPresalesCount ?? 0)
    + (kpi?.businessSupportCount ?? 0);
  const leadProject = overview?.projectManhourRanking?.[0] ?? null;
  const topHq = overview?.hqPerCapitaList?.[0] ?? null;
  const topRegional = overview?.regionalPerCapitaList?.[0] ?? null;

  return (
    <div style={{
      padding: '10px 12px',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      height: '100%',
      overflowY: 'auto',
      boxSizing: 'border-box',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: DS_COLORS.text }}>团队总览</div>
          <div style={{ fontSize: 10, color: DS_COLORS.muted, marginTop: 2 }}>未选中人员时显示当前团队画像</div>
        </div>
        <div style={{
          fontSize: 10,
          padding: '3px 8px',
          borderRadius: 999,
          background: DS_COLORS.primary + '18',
          color: DS_COLORS.primary,
          border: '1px solid ' + DS_COLORS.primary + '44',
          flexShrink: 0,
        }}>
          共 {totalPeople} 人
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <StatChip label="在岗团队" value={totalPeople} color={DS_COLORS.primary} />
        <StatChip label="活跃项目" value={activeProjectCount} color={DS_COLORS.success} />
        <StatChip label="活跃方案" value={activeSolutionCount} color={DS_COLORS.secondary} />
        <StatChip label="图谱连接" value={overview?.graphData?.edges?.length ?? 0} color={DS_COLORS.warning} />
      </div>

      <div style={{
        fontSize: 11,
        color: DS_COLORS.muted,
        lineHeight: 1.6,
        padding: '6px 8px',
        background: 'rgba(0,212,255,0.04)',
        borderRadius: 4,
        borderLeft: '2px solid ' + DS_COLORS.border,
      }}>
        当前视图聚焦售前团队的角色结构、项目投入与方案协作情况。点击中间图谱中的人员节点，可切换到个人画像和事项视图。
      </div>

      {leadProject && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: DS_COLORS.warning, marginBottom: 4 }}>当前重点投入项目</div>
          <div style={{
            padding: '8px 10px',
            borderRadius: 6,
            background: 'rgba(255,204,0,0.05)',
            border: '1px solid rgba(255,204,0,0.18)',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: DS_COLORS.text }}>{leadProject.projectName}</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 10, color: DS_COLORS.muted }}>
              <span>投入工时 {leadProject.totalHours}h</span>
              <span>参与人数 {leadProject.memberCount} 人</span>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: DS_COLORS.primary, marginBottom: 4 }}>总部产出领先</div>
          {topHq ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 8px',
              background: 'rgba(0,212,255,0.04)',
              borderRadius: 4,
            }}>
              <span style={{ fontSize: 11, color: DS_COLORS.text, flex: 1 }}>{topHq.displayName}</span>
              <span style={{ fontSize: 10, color: DS_COLORS.muted }}>{fmtWan(topHq.wonAmount)} 万</span>
              <span style={{ fontSize: 10, color: DS_COLORS.primary }}>{topHq.projectCount} 项</span>
            </div>
          ) : (
            <div style={{ fontSize: 10, color: DS_COLORS.muted }}>暂无总部统计数据</div>
          )}
        </div>

        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: DS_COLORS.success, marginBottom: 4 }}>区域产出领先</div>
          {topRegional ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 8px',
              background: 'rgba(0,255,136,0.04)',
              borderRadius: 4,
            }}>
              <span style={{ fontSize: 11, color: DS_COLORS.text, flex: 1 }}>{topRegional.displayName}</span>
              <span style={{ fontSize: 10, color: DS_COLORS.muted }}>{topRegional.region ?? '未分区'}</span>
              <span style={{ fontSize: 10, color: DS_COLORS.success }}>{fmtWan(topRegional.wonAmount)} 万</span>
            </div>
          ) : (
            <div style={{ fontSize: 10, color: DS_COLORS.muted }}>暂无区域统计数据</div>
          )}
        </div>
      </div>
    </div>
  );
}

export function DataScreenPersonnelProfile({ detail, overview, loading }: Props) {
  return (
    <DsPanel title="人员画像" style={{ height: '100%' }}>
      {loading ? (
        <DsSkeleton />
      ) : !detail ? (
        <TeamOverviewSection overview={overview} />
      ) : (
        <div style={{
          padding: '10px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          height: '100%',
          overflowY: 'auto',
          boxSizing: 'border-box',
        }}>
          {/* Avatar + basic info */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: 'rgba(0,212,255,0.15)',
              border: '2px solid ' + DS_COLORS.primary + '66',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              fontSize: 18,
              fontWeight: 700,
              color: DS_COLORS.primary,
              overflow: 'hidden',
            }}>
              {detail.avatar
                ? <img src={detail.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : detail.realName.slice(-2)
              }
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: DS_COLORS.text }}>{detail.realName}</span>
                <span style={{
                  fontSize: 10,
                  padding: '1px 6px',
                  borderRadius: 10,
                  background: DS_COLORS.primary + '22',
                  color: DS_COLORS.primary,
                  border: '1px solid ' + DS_COLORS.primary + '55',
                }}>
                  {ROLE_LABEL[detail.roleCode] ?? detail.roleName}
                </span>
              </div>
              <div style={{ fontSize: 11, color: DS_COLORS.muted, marginTop: 3 }}>
                {[detail.department, detail.position, detail.baseLocation].filter(Boolean).join(' · ')}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <StatChip label="参与项目" value={detail.projectCount} color={DS_COLORS.primary} />
            <StatChip label="方案贡献" value={detail.solutionCount} color={DS_COLORS.secondary} />
            <StatChip label="中标金额" value={fmtWan(detail.wonAmount) + '万'} color={DS_COLORS.success} />
            <StatChip label="售前工时" value={detail.presalesHours + 'h'} color={DS_COLORS.warning} />
          </div>

          {/* Bio */}
          {detail.bio && (
            <div style={{
              fontSize: 11,
              color: DS_COLORS.muted,
              lineHeight: 1.6,
              padding: '6px 8px',
              background: 'rgba(0,212,255,0.04)',
              borderRadius: 4,
              borderLeft: '2px solid ' + DS_COLORS.border,
            }}>
              {detail.bio}
            </div>
          )}

          {/* Skills / Expertise */}
          {(detail.skills || detail.expertise) && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: DS_COLORS.primary, marginBottom: 4 }}>技能专长</div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {[
                  ...(Array.isArray(detail.skills) ? detail.skills : []),
                  ...(Array.isArray(detail.expertise) ? detail.expertise : []),
                ].slice(0, 8).map((s, i) => (
                  <span key={i} style={{
                    fontSize: 10,
                    padding: '2px 6px',
                    borderRadius: 3,
                    border: '1px solid ' + DS_COLORS.border,
                    color: DS_COLORS.muted,
                  }}>
                    {String(s)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Recent projects */}
          {detail.recentProjects.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: DS_COLORS.primary, marginBottom: 4 }}>参与项目</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {detail.recentProjects.map(p => (
                  <div key={p.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    fontSize: 11,
                    color: DS_COLORS.text,
                    padding: '4px 8px',
                    background: 'rgba(0,212,255,0.04)',
                    borderRadius: 4,
                    gap: 4,
                  }}>
                    <span style={{
                      width: 4,
                      height: 4,
                      borderRadius: '50%',
                      background: DS_COLORS.success,
                      flexShrink: 0,
                    }} />
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.projectName}
                    </span>
                    <span style={{ fontSize: 9, color: DS_COLORS.muted, flexShrink: 0 }}>
                      {STAGE_LABEL[p.projectStage] ?? p.projectStage}
                    </span>
                    <BidResultBadge result={p.bidResult} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Solutions */}
          {detail.solutions.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: DS_COLORS.secondary, marginBottom: 4 }}>方案贡献</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {detail.solutions.map(s => (
                  <div key={s.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    fontSize: 11,
                    color: DS_COLORS.text,
                    padding: '4px 8px',
                    background: 'rgba(178,75,243,0.05)',
                    borderRadius: 4,
                    gap: 4,
                  }}>
                    <span style={{
                      width: 4,
                      height: 4,
                      borderRadius: 2,
                      background: DS_COLORS.secondary,
                      flexShrink: 0,
                    }} />
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.solutionName}
                    </span>
                    <span style={{ fontSize: 9, color: DS_COLORS.secondary, flexShrink: 0 }}>
                      {SOLUTION_ROLE_LABEL[s.role] ?? s.role}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Current tasks */}
          <CurrentTasksSection tasks={detail.currentTasks} />
        </div>
      )}
    </DsPanel>
  );
}
