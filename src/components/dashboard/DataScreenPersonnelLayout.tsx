'use client';

import Link from 'next/link';
import {
  DataScreenPhase2Chip,
  DataScreenPhase2MicroLabel,
  DataScreenPhase2MetricCard,
  DataScreenPhase2SectionHeader,
  DataScreenPhase2StateMessage,
  phase2DetailEmptyTextStyle,
  phase2DetailListRowStyle,
  phase2DetailPanelStyle,
  phase2PreviewCardStyle,
  phase2DetailSectionTitleStyle,
  phase2SubtleCardStyle,
  phase2ZoneCardStyle,
} from '@/components/dashboard/DataScreenPhase2Primitives';
import type { DataScreenRoleViewPreset } from '@/lib/data-screen-phase2-filters';
import type {
  DataScreenPersonnelAbnormalFilter,
  DataScreenPersonnelLoadBucket,
  DataScreenPersonnelViewInitData,
} from '@/lib/data-screen-personnel-view';

interface DataScreenPersonnelLayoutProps {
  data: DataScreenPersonnelViewInitData | null;
  isLoading: boolean;
  error: string | null;
  activeViewPreset: DataScreenRoleViewPreset;
  viewPresetLabel: string;
  viewPresetSubtitle: string;
  startDate: string;
  endDate: string;
  selectedPersonId: number | null;
  activeAbnormalFilter: DataScreenPersonnelAbnormalFilter;
  onSelectPerson: (personId: number) => void;
  onSelectAbnormalFilter: (filter: DataScreenPersonnelAbnormalFilter) => void;
  onSelectItem: (itemId: string) => void;
}

const PERSONNEL_ITEM_TYPE_LABELS = {
  task: '任务',
  todo: '待办',
  'solution-review': '方案评审',
  'project-collaboration': '项目协同',
} as const;

const ABNORMAL_FILTER_LABELS: Record<DataScreenPersonnelAbnormalFilter, string> = {
  all: '全部事项',
  overdue: '逾期',
  'high-priority-stalled': '高优未推进',
  stale: '长时间未更新',
  'cross-project-overload': '跨项目过载',
};

const LOAD_BUCKET_ACCENT: Record<DataScreenPersonnelLoadBucket, string> = {
  reserve: '#6EE7FF',
  balanced: '#00D4FF',
  busy: '#FBBF24',
  overloaded: '#FF8A65',
};

const ABNORMAL_FILTER_ACCENT: Record<DataScreenPersonnelAbnormalFilter, string> = {
  all: '#00D4FF',
  overdue: '#FF8A65',
  'high-priority-stalled': '#FBBF24',
  stale: '#A78BFA',
  'cross-project-overload': '#34D399',
};

export function DataScreenPersonnelLayout({
  data,
  isLoading,
  error,
  activeViewPreset,
  viewPresetLabel,
  viewPresetSubtitle,
  startDate,
  endDate,
  selectedPersonId,
  activeAbnormalFilter,
  onSelectPerson,
  onSelectAbnormalFilter,
  onSelectItem,
}: DataScreenPersonnelLayoutProps) {
  const summary = data?.summary;
  const selectedPerson = data?.selectedPerson;
  const selectedItem = data?.selectedItem;
  const activeItemId = selectedItem?.id || null;
  const activePersonId = selectedPersonId || selectedPerson?.userId || null;
  const managedPeopleCount = summary?.managedPeopleCount ?? 0;
  const loadDistribution = data?.loadDistribution ?? [];
  const itemStatusSummary = data?.itemStatusSummary ?? [];
  const maxLoadCount = loadDistribution.reduce((max, item) => Math.max(max, item.count), 0);
  const maxItemStatusCount = itemStatusSummary.reduce((max, item) => Math.max(max, item.count), 0);
  const stateFeedback = isLoading
    ? {
        tone: 'loading' as const,
        title: '人员视角加载中',
        description: '正在同步当前筛选条件下的人员、事项和异常分层。',
      }
    : error
      ? {
          tone: 'error' as const,
          title: '人员视角加载异常',
          description: error,
        }
      : null;

  const summaryMetrics = [
    { key: 'managed-people', label: '管理中人员', value: formatCount(summary?.managedPeopleCount ?? 0), detail: '当前纳入管理口径的人效对象', accentColor: '#00D4FF' },
    { key: 'pending-items', label: '当前任务总量', value: formatCount(summary?.pendingItemCount ?? 0), detail: '任务、待办与评审事项总和', accentColor: '#34D399' },
    { key: 'overdue-items', label: '当前逾期事项', value: formatCount(summary?.overdueItemCount ?? 0), detail: '已逾期且仍未闭环的事项', accentColor: '#FF8A65' },
    { key: 'high-priority', label: '高优事项数', value: formatCount(summary?.highPriorityItemCount ?? 0), detail: 'high / urgent 与待评审重点项', accentColor: '#FBBF24' },
    { key: 'overloaded-people', label: '过载人员数', value: formatCount(summary?.overloadedPeopleCount ?? 0), detail: '待处理或逾期已超出健康阈值', accentColor: '#FF8A65' },
    { key: 'low-activity', label: '低活跃人员数', value: formatCount(summary?.lowActivityPeopleCount ?? 0), detail: '近期推进痕迹明显不足', accentColor: '#A78BFA' },
    { key: 'active-project-people', label: '参与项目人数', value: formatCount(summary?.activeProjectPeopleCount ?? 0), detail: '当前仍参与活跃项目的人员', accentColor: '#6EE7FF' },
    { key: 'active-solution-people', label: '参与方案人数', value: formatCount(summary?.activeSolutionPeopleCount ?? 0), detail: '当前仍参与方案支撑的人员', accentColor: '#00FF88' },
  ];

  return (
    <div
      data-testid="data-screen-personnel-layout"
      style={{
        flex: 1,
        display: 'grid',
        gridTemplateRows: 'auto auto minmax(0, 1fr)',
        gap: '14px',
        padding: '14px 18px 18px',
        overflow: 'hidden',
      }}
    >
      <section
        data-testid="data-screen-personnel-summary-belt"
        className="data-screen-personnel-summary-belt"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(8, minmax(0, 1fr))',
          gap: '10px',
        }}
      >
        {summaryMetrics.map((metric) => (
          <DataScreenPhase2MetricCard
            key={metric.key}
            testId={`data-screen-personnel-summary-card-${metric.key}`}
            label={metric.label}
            value={isLoading ? '--' : metric.value}
            detail={metric.detail}
            accentColor={metric.accentColor}
          />
        ))}
      </section>

      <section
        data-testid="data-screen-personnel-middle-grid"
        className="data-screen-personnel-middle-grid"
        style={{
          minHeight: 0,
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.05fr) minmax(0, 1fr)',
          gap: '12px',
        }}
      >
        <article data-testid="data-screen-personnel-load-zone" style={phase2ZoneCardStyle}>
          <DataScreenPhase2SectionHeader
            eyebrow="B1. 负载分布区"
            title="团队负载分层"
            subtitle="回答当前团队整体负载是否失衡，并同步看事项状态构成。"
            badge={`${formatCount(summary?.managedPeopleCount ?? 0)} 人`}
          />

          <div style={{ display: 'grid', gap: '12px' }}>
            {stateFeedback && !(data?.loadDistribution ?? []).length ? (
              <DataScreenPhase2StateMessage {...stateFeedback} compact />
            ) : null}
            {loadDistribution.length ? (
              <div
                data-testid="data-screen-personnel-load-chart-band"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.08fr)',
                  gap: '10px',
                  marginBottom: '2px',
                }}
              >
                <div
                  style={{
                    ...phase2PreviewCardStyle,
                    padding: '12px 14px',
                    border: '1px solid rgba(0,212,255,0.14)',
                    background: 'linear-gradient(180deg, rgba(0,212,255,0.08), rgba(255,255,255,0.03))',
                    display: 'grid',
                    gap: '10px',
                  }}
                >
                  <DataScreenPhase2MicroLabel label="分析图 01 / 负载梯度" />
                  <div
                    style={{
                      minHeight: '88px',
                      display: 'grid',
                      gridTemplateColumns: `repeat(${loadDistribution.length}, minmax(0, 1fr))`,
                      gap: '8px',
                      alignItems: 'end',
                    }}
                  >
                    {loadDistribution.map((item) => {
                      const accentColor = LOAD_BUCKET_ACCENT[item.bucket];

                      return (
                        <div key={`load-chart-${item.bucket}`} style={{ display: 'grid', gap: '7px', alignItems: 'end' }}>
                          <div style={{ textAlign: 'center', color: accentColor, fontSize: '11px', fontWeight: 700 }}>{formatCount(item.count)}</div>
                          <div style={{ height: '52px', display: 'flex', alignItems: 'end', justifyContent: 'center' }}>
                            <div
                              style={{
                                width: '100%',
                                maxWidth: '44px',
                                height: `${Math.max(18, maxLoadCount ? (item.count / maxLoadCount) * 52 : 0)}px`,
                                borderRadius: '14px 14px 8px 8px',
                                background: `linear-gradient(180deg, ${accentColor}, ${accentColor}44)`,
                                boxShadow: `0 12px 24px -20px ${accentColor}`,
                              }}
                            />
                          </div>
                          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.54)', fontSize: '10px', lineHeight: 1.4 }}>{item.label}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div
                  style={{
                    ...phase2PreviewCardStyle,
                    padding: '12px 14px',
                    border: '1px solid rgba(255,255,255,0.08)',
                    background: 'linear-gradient(180deg, rgba(255,138,101,0.08), rgba(255,255,255,0.03))',
                    display: 'grid',
                    gap: '10px',
                  }}
                >
                  <DataScreenPhase2MicroLabel label="分析图 02 / 事项状态压力" accentColor="#FFD2C6" />
                  <div style={{ display: 'grid', gap: '9px' }}>
                    {itemStatusSummary.slice(0, 4).map((item, index) => {
                      const accentColor = ['#00D4FF', '#34D399', '#FBBF24', '#FF8A65'][index % 4];
                      const overdueRatio = item.count > 0 ? item.overdueCount / item.count : 0;

                      return (
                        <div key={`status-chart-${item.key}`} style={{ display: 'grid', gap: '6px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                            <span style={{ color: 'rgba(255,255,255,0.62)', fontSize: '10px' }}>{item.label}</span>
                            <span style={{ color: accentColor, fontSize: '11px', fontWeight: 700 }}>{formatCount(item.count)}</span>
                          </div>
                          <div style={{ position: 'relative', height: '8px', borderRadius: '999px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                            <div
                              style={{
                                width: `${Math.max(10, maxItemStatusCount ? (item.count / maxItemStatusCount) * 100 : 0)}%`,
                                height: '100%',
                                borderRadius: '999px',
                                background: `linear-gradient(90deg, ${accentColor}, ${accentColor}55)`,
                              }}
                            />
                            {item.overdueCount > 0 ? (
                              <div
                                style={{
                                  position: 'absolute',
                                  inset: 0,
                                  width: `${Math.max(8, overdueRatio * 100)}%`,
                                  borderRadius: '999px',
                                  background: 'linear-gradient(90deg, rgba(255,138,101,0.92), rgba(255,138,101,0.56))',
                                  mixBlendMode: 'screen',
                                }}
                              />
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : null}
            {loadDistribution.map((item) => {
              const ratio = managedPeopleCount > 0 ? item.count / managedPeopleCount : 0;
              return (
                <div key={item.bucket} style={{ display: 'grid', gap: '7px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                    <div>
                      <div style={{ color: '#FFFFFF', fontSize: '12px', fontWeight: 600 }}>{item.label}</div>
                      <div style={{ marginTop: '3px', color: 'rgba(255,255,255,0.52)', fontSize: '10px', lineHeight: 1.5 }}>{item.description}</div>
                    </div>
                    <div style={{ color: LOAD_BUCKET_ACCENT[item.bucket], fontSize: '18px', fontWeight: 700 }}>{isLoading ? '--' : formatCount(item.count)}</div>
                  </div>
                  <div style={{ height: '7px', borderRadius: '999px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${Math.max(item.count > 0 ? 8 : 0, Math.min(100, ratio * 100))}%`,
                        height: '100%',
                        borderRadius: '999px',
                        background: `linear-gradient(90deg, ${LOAD_BUCKET_ACCENT[item.bucket]}99, ${LOAD_BUCKET_ACCENT[item.bucket]})`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: '14px', display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px' }}>
            {itemStatusSummary.map((item) => (
              <div key={item.key} style={phase2SubtleCardStyle}>
                <div style={{ color: 'rgba(255,255,255,0.52)', fontSize: '10px' }}>{item.label}</div>
                <div style={{ marginTop: '8px', color: '#E6F5FF', fontSize: '18px', fontWeight: 700 }}>{isLoading ? '--' : formatCount(item.count)}</div>
                <div style={{ marginTop: '6px', color: item.overdueCount > 0 ? '#FF8A65' : 'rgba(255,255,255,0.48)', fontSize: '10px' }}>逾期 {formatCount(item.overdueCount)}</div>
              </div>
            ))}
          </div>
        </article>

        <article data-testid="data-screen-personnel-risk-zone" style={phase2ZoneCardStyle}>
          <DataScreenPhase2SectionHeader
            eyebrow="B2. 风险排行区"
            title="最该盯的人"
            subtitle="点击人员后，下方事项穿透区会切换到对应人员的事项分析。"
            badge={`Top ${formatCount((data?.riskRanking ?? []).length)}`}
          />

          <div style={{ display: 'grid', gap: '10px' }}>
            {(data?.riskRanking ?? []).slice(0, 6).map((person, index) => {
              const isActive = activePersonId === person.userId;
              const isFeatured = index === 0;
              return (
                <button
                  key={person.userId}
                  data-testid={`data-screen-personnel-risk-person-${person.userId}`}
                  type="button"
                  onClick={() => onSelectPerson(person.userId)}
                  style={{
                    padding: isFeatured ? '14px 16px' : '12px 14px',
                    borderRadius: isFeatured ? '18px' : '14px',
                    border: `1px solid ${isActive ? 'rgba(0,212,255,0.34)' : isFeatured ? 'rgba(255,138,101,0.26)' : 'rgba(255,255,255,0.08)'}`,
                    background: isActive
                      ? 'linear-gradient(180deg, rgba(0,212,255,0.16), rgba(10,24,39,0.72))'
                      : isFeatured
                        ? 'linear-gradient(135deg, rgba(255,138,101,0.16), rgba(39,15,12,0.78) 32%, rgba(255,255,255,0.03))'
                        : 'rgba(255,255,255,0.03)',
                    textAlign: 'left',
                    cursor: 'pointer',
                    boxShadow: isFeatured ? '0 14px 30px -24px rgba(255,138,101,0.8)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ color: isFeatured ? '#FFB8A6' : 'rgba(255,255,255,0.48)', fontSize: '10px', letterSpacing: isFeatured ? '0.08em' : undefined }}>
                        {isFeatured ? '最高优先人物' : `#${index + 1}`}
                      </div>
                      <div style={{ marginTop: '4px', color: '#FFFFFF', fontSize: isFeatured ? '16px' : '14px', fontWeight: 700 }}>{person.name}</div>
                      <div style={{ marginTop: '5px', color: 'rgba(255,255,255,0.58)', fontSize: '11px' }}>{person.roleName} / {person.department || '未设置部门'}</div>
                    </div>
                    <div style={{ color: '#FF8A65', fontSize: isFeatured ? '24px' : '18px', fontWeight: 700 }}>{person.riskScore}</div>
                  </div>
                  <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    <RiskTag label={loadBucketLabel(person.loadBucket)} accentColor={LOAD_BUCKET_ACCENT[person.loadBucket]} />
                    <RiskTag label={`待处理 ${formatCount(person.pendingCount)}`} accentColor="#00D4FF" />
                    <RiskTag label={`逾期 ${formatCount(person.overdueCount)}`} accentColor={person.overdueCount > 0 ? '#FF8A65' : '#FBBF24'} />
                  </div>
                  {isFeatured ? (
                    <div style={{ marginTop: '10px', color: 'rgba(255,255,255,0.6)', fontSize: '11px', lineHeight: 1.7 }}>
                      {person.reasons.join(' / ') || '当前负载和风险指标综合排名最高。'}
                    </div>
                  ) : null}
                </button>
              );
            })}
          </div>
        </article>

        <article data-testid="data-screen-personnel-role-zone" style={phase2ZoneCardStyle}>
          <DataScreenPhase2SectionHeader
            eyebrow="B3. 角色组对比区"
            title="岗位结构失衡观察"
            subtitle="看不是单个谁的问题，而是哪一类岗位或区域整体失衡。"
            badge={activeViewPreset}
          />

          <div style={{ display: 'grid', gap: '10px' }}>
            {(data?.roleGroups ?? []).slice(0, 5).map((group, index) => (
              <div
                key={group.roleName}
                style={{
                  ...phase2SubtleCardStyle,
                  background: index === 0 ? 'linear-gradient(135deg, rgba(0,212,255,0.14), rgba(255,255,255,0.04))' : phase2SubtleCardStyle.background,
                  border: index === 0 ? '1px solid rgba(0,212,255,0.24)' : phase2SubtleCardStyle.border,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                  <div>
                    <div style={{ color: index === 0 ? '#6EE7FF' : 'rgba(255,255,255,0.46)', fontSize: '10px', letterSpacing: '0.06em' }}>
                      {index === 0 ? '当前最失衡岗位组' : '岗位组'}
                    </div>
                    <div style={{ marginTop: '4px', color: '#FFFFFF', fontSize: '13px', fontWeight: 700 }}>{group.roleName}</div>
                  </div>
                  <div style={{ color: '#00D4FF', fontSize: index === 0 ? '16px' : '12px', fontWeight: 700 }}>{formatCount(group.memberCount)} 人</div>
                </div>
                <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  <RiskTag label={`均值风险 ${group.avgRiskScore}`} accentColor="#FBBF24" />
                  <RiskTag label={`待处理 ${formatCount(group.pendingTotal)}`} accentColor="#34D399" />
                  <RiskTag label={`逾期 ${formatCount(group.overdueTotal)}`} accentColor={group.overdueTotal > 0 ? '#FF8A65' : '#6EE7FF'} />
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '14px', display: 'grid', gap: '8px' }}>
            <div style={{ color: 'rgba(255,255,255,0.48)', fontSize: '10px', letterSpacing: '0.08em' }}>区域简报</div>
          </div>

          <div style={{ marginTop: '10px', display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px' }}>
            {(data?.regionGroups ?? []).slice(0, 4).map((group) => (
              <div key={group.region} style={phase2SubtleCardStyle}>
                <div style={{ color: '#FFFFFF', fontSize: '12px', fontWeight: 600 }}>{group.region}</div>
                <div style={{ marginTop: '8px', color: '#E6F5FF', fontSize: '18px', fontWeight: 700 }}>{formatCount(group.memberCount)}</div>
                <div style={{ marginTop: '6px', color: 'rgba(255,255,255,0.48)', fontSize: '10px' }}>过载 {formatCount(group.overloadedCount)} / 风险 {formatCount(group.riskCount)}</div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section
        data-testid="data-screen-personnel-bottom-grid"
        className="data-screen-personnel-bottom-grid"
        style={{
          minHeight: 0,
          display: 'grid',
          gridTemplateColumns: 'minmax(320px, 0.9fr) minmax(0, 1.35fr)',
          gap: '12px',
          overflow: 'hidden',
        }}
      >
        <div style={{ minWidth: 0, minHeight: 0, display: 'grid', gridTemplateRows: 'auto minmax(0, 1fr)', gap: '12px', overflow: 'hidden' }}>
          <article data-testid="data-screen-personnel-selected-summary" style={phase2ZoneCardStyle}>
            <DataScreenPhase2SectionHeader
              eyebrow="C1. 当前选中人员摘要"
              title={selectedPerson?.name || '当前没有可选人员'}
              subtitle={selectedPerson ? `${selectedPerson.roleName} / ${selectedPerson.department || '未设置部门'} / ${selectedPerson.region || '未设置区域'}` : '等待人员数据进入当前口径'}
              badge={selectedPerson ? loadBucketLabel(selectedPerson.loadBucket) : '--'}
            />

            {selectedPerson ? (
              <>
                <div
                  style={{
                    padding: '14px 16px',
                    borderRadius: '18px',
                    border: '1px solid rgba(0,212,255,0.18)',
                    background: 'linear-gradient(135deg, rgba(0,212,255,0.16), rgba(255,255,255,0.03) 34%, rgba(255,138,101,0.06))',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ color: 'rgba(255,255,255,0.46)', fontSize: '10px', letterSpacing: '0.08em' }}>当前盯防人物</div>
                      <div style={{ marginTop: '6px', color: '#FFFFFF', fontSize: '18px', fontWeight: 700 }}>{selectedPerson.name}</div>
                      <div style={{ marginTop: '5px', color: 'rgba(255,255,255,0.58)', fontSize: '11px' }}>
                        最近活跃：{formatDateLabel(selectedPerson.lastActivityAt)}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ color: 'rgba(255,255,255,0.46)', fontSize: '10px' }}>风险分</div>
                      <div style={{ marginTop: '6px', color: '#FFB020', fontSize: '28px', fontWeight: 700 }}>{formatCount(selectedPerson.riskScore)}</div>
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px' }}>
                  <MetricCell label="当前事项" value={formatCount(selectedPerson.currentTaskCount)} accentColor="#00D4FF" />
                  <MetricCell label="逾期事项" value={formatCount(selectedPerson.overdueItemCount)} accentColor="#FF8A65" />
                  <MetricCell label="高优事项" value={formatCount(selectedPerson.highPriorityItemCount)} accentColor="#FBBF24" />
                  <MetricCell label="参与项目" value={formatCount(selectedPerson.activeProjectCount)} accentColor="#34D399" />
                  <MetricCell label="参与方案" value={formatCount(selectedPerson.activeSolutionCount)} accentColor="#A78BFA" />
                  <MetricCell label="风险分" value={formatCount(selectedPerson.riskScore)} accentColor="#FFB020" />
                </div>
                <div
                  style={{
                    marginTop: '12px',
                    padding: '12px 14px',
                    borderRadius: '14px',
                    border: '1px solid rgba(255,255,255,0.08)',
                    background: 'rgba(255,255,255,0.03)',
                    color: 'rgba(255,255,255,0.58)',
                    fontSize: '11px',
                    lineHeight: 1.8,
                  }}
                >
                  <div style={{ color: '#FFB8A6', fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em' }}>风险成因</div>
                  <div style={{ marginTop: '6px' }}>{selectedPerson.reasons.join(' / ') || '当前执行负载平稳'}</div>
                </div>
              </>
            ) : (
              <DataScreenPhase2StateMessage
                tone={stateFeedback?.tone || 'empty'}
                title={stateFeedback?.title || '暂无可选人员'}
                description={stateFeedback?.description || '当前没有可选人员。'}
                compact
              />
            )}
          </article>

          <article data-testid="data-screen-personnel-people-list" style={{ ...phase2ZoneCardStyle, minHeight: 0, overflow: 'hidden' }}>
            <DataScreenPhase2SectionHeader
              eyebrow="C2. 人员列表区"
              title="当前人员清单"
              subtitle="保留稳定的人选切换区，把人员和事项明细放进统一 drillthrough 流程。"
              badge={`${formatCount(data?.peopleList.pagination.total ?? 0)} 人`}
            />

            <div style={{ display: 'grid', gap: '10px', overflow: 'auto', paddingRight: '4px' }}>
              {(data?.peopleList.items ?? []).length ? data?.peopleList.items.map((person) => {
                const isActive = activePersonId === person.userId;
                return (
                  <button
                    key={person.userId}
                    data-testid={`data-screen-personnel-person-row-${person.userId}`}
                    type="button"
                    onClick={() => onSelectPerson(person.userId)}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '14px',
                      border: `1px solid ${isActive ? 'rgba(0,212,255,0.34)' : 'rgba(255,255,255,0.08)'}`,
                      background: isActive ? 'rgba(0,212,255,0.12)' : 'rgba(255,255,255,0.03)',
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                      <div>
                        <div style={{ color: '#FFFFFF', fontSize: '13px', fontWeight: 700 }}>{person.name}</div>
                        <div style={{ marginTop: '5px', color: 'rgba(255,255,255,0.58)', fontSize: '11px' }}>{person.roleName} / {person.region || '未设置区域'}</div>
                      </div>
                      <div style={{ color: LOAD_BUCKET_ACCENT[person.loadBucket], fontSize: '12px', fontWeight: 700 }}>{loadBucketLabel(person.loadBucket)}</div>
                    </div>
                    <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      <RiskTag label={`待处理 ${formatCount(person.pendingCount)}`} accentColor="#00D4FF" />
                      <RiskTag label={`逾期 ${formatCount(person.overdueCount)}`} accentColor={person.overdueCount > 0 ? '#FF8A65' : '#6EE7FF'} />
                      <RiskTag label={`高优 ${formatCount(person.highPriorityCount)}`} accentColor="#FBBF24" />
                    </div>
                  </button>
                );
              }) : (
                <DataScreenPhase2StateMessage
                  tone={stateFeedback?.tone || 'empty'}
                  title={stateFeedback?.title || '暂无人员列表'}
                  description={stateFeedback?.description || '当前口径下暂无人员列表。'}
                  compact
                />
              )}
            </div>
          </article>
        </div>

        <article data-testid="data-screen-personnel-item-zone" style={{ ...phase2ZoneCardStyle, minHeight: 0, overflow: 'hidden' }}>
          <DataScreenPhase2SectionHeader
            eyebrow="C3. 人员事项穿透区"
            title="当前事项列表"
            subtitle={`${viewPresetLabel} / ${viewPresetSubtitle}`}
            badge={`${formatCount(data?.itemList.pagination.total ?? 0)} 条`}
          />

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1.1fr) minmax(260px, 0.9fr)',
              gap: '12px',
              marginBottom: '12px',
            }}
          >
            <div
              style={{
                padding: '12px 14px',
                borderRadius: '16px',
                border: '1px solid rgba(0,212,255,0.18)',
                background: 'linear-gradient(135deg, rgba(0,212,255,0.14), rgba(255,255,255,0.03) 38%, rgba(167,139,250,0.08))',
              }}
            >
              <div style={{ color: 'rgba(255,255,255,0.46)', fontSize: '10px', letterSpacing: '0.08em' }}>当前穿透上下文</div>
              <div style={{ marginTop: '6px', color: '#FFFFFF', fontSize: '14px', fontWeight: 700 }}>
                {selectedPerson?.name || '未选择人员'}
              </div>
              <div style={{ marginTop: '6px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <DataScreenPhase2Chip label={`预设 ${viewPresetLabel}`} accentColor="#00D4FF" />
                <DataScreenPhase2Chip label={`筛选 ${ABNORMAL_FILTER_LABELS[activeAbnormalFilter]}`} accentColor={ABNORMAL_FILTER_ACCENT[activeAbnormalFilter]} />
                <DataScreenPhase2Chip label={`时间 ${formatDateLabel(startDate)} - ${formatDateLabel(endDate)}`} accentColor="#6EE7FF" />
              </div>
            </div>

            <div
              style={{
                padding: '12px 14px',
                borderRadius: '16px',
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.03)',
                display: 'grid',
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                gap: '10px',
              }}
            >
              <MiniSignalCell label="当前筛选条数" value={formatCount(data?.itemList.pagination.total ?? 0)} accentColor="#00D4FF" />
              <MiniSignalCell label="当前异常口径" value={ABNORMAL_FILTER_LABELS[activeAbnormalFilter]} accentColor={ABNORMAL_FILTER_ACCENT[activeAbnormalFilter]} />
            </div>
          </div>

          <div
            data-testid="data-screen-personnel-abnormal-filters"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
              gap: '10px',
              marginBottom: '12px',
            }}
          >
            {(data?.itemAbnormalSummary ?? []).map((filterItem) => {
              const isActive = activeAbnormalFilter === filterItem.key;
              const accentColor = ABNORMAL_FILTER_ACCENT[filterItem.key];
              return (
                <button
                  key={filterItem.key}
                  data-testid={`data-screen-personnel-abnormal-filter-${filterItem.key}`}
                  type="button"
                  onClick={() => onSelectAbnormalFilter(filterItem.key)}
                  style={{
                    padding: isActive ? '12px 13px' : '10px 12px',
                    borderRadius: '14px',
                    border: `1px solid ${isActive ? `${accentColor}66` : 'rgba(255,255,255,0.08)'}`,
                    background: isActive ? `linear-gradient(135deg, ${accentColor}24, rgba(255,255,255,0.04))` : 'rgba(255,255,255,0.03)',
                    textAlign: 'left',
                    cursor: 'pointer',
                    boxShadow: isActive ? `0 12px 26px -22px ${accentColor}` : 'none',
                  }}
                >
                  <div style={{ color: isActive ? accentColor : 'rgba(255,255,255,0.54)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.04em' }}>
                    {isActive ? '当前筛选' : '筛选项'}
                  </div>
                  <div style={{ marginTop: '6px', color: accentColor, fontSize: '11px', fontWeight: 700 }}>{filterItem.label}</div>
                  <div style={{ marginTop: '6px', color: '#FFFFFF', fontSize: isActive ? '20px' : '18px', fontWeight: 700 }}>{formatCount(filterItem.count)}</div>
                  <div style={{ marginTop: '5px', color: 'rgba(255,255,255,0.48)', fontSize: '10px', lineHeight: 1.5 }}>{filterItem.description}</div>
                </button>
              );
            })}
          </div>

          <div style={{ minHeight: 0, display: 'grid', gridTemplateColumns: 'minmax(0, 0.95fr) minmax(320px, 0.85fr)', gap: '12px', overflow: 'hidden' }}>
            <div data-testid="data-screen-personnel-item-list" style={{ minHeight: 0, overflow: 'auto', paddingRight: '4px', display: 'grid', gap: '10px' }}>
              {(data?.itemList.items ?? []).length ? data?.itemList.items.map((item) => {
                const isActive = activeItemId === item.id;
                return (
                  <button
                    key={item.id}
                    data-testid={`data-screen-personnel-item-${item.id}`}
                    type="button"
                    onClick={() => onSelectItem(item.id)}
                    style={{
                      padding: '14px 16px',
                      borderRadius: '16px',
                      background: isActive ? 'rgba(0,212,255,0.12)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${isActive ? 'rgba(0,212,255,0.32)' : item.isOverdue ? 'rgba(255,138,101,0.24)' : 'rgba(255,255,255,0.08)'}`,
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ color: 'rgba(255,255,255,0.46)', fontSize: '10px', letterSpacing: '0.08em' }}>事项标题</div>
                        <div style={{ color: '#FFFFFF', fontSize: '13px', fontWeight: 700 }}>{item.title}</div>
                      </div>
                      <div style={{ display: 'grid', gap: '8px', justifyItems: 'end' }}>
                        <RiskTag label={PERSONNEL_ITEM_TYPE_LABELS[item.type]} accentColor={item.isOverdue ? '#FF8A65' : '#00D4FF'} />
                        {item.isOverdue ? <RiskTag label="已逾期" accentColor="#FF8A65" /> : null}
                      </div>
                    </div>

                    <div
                      style={{
                        marginTop: '10px',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                        gap: '8px',
                      }}
                    >
                      <ItemSignalCell label="客户 / 项目" value={`${item.customerName || '--'} / ${item.projectName || '--'}`} />
                      <ItemSignalCell label="方案 / 截止" value={`${item.solutionName || '--'} / ${item.dueDate || '--'}`} tone={item.isOverdue ? 'danger' : 'normal'} />
                    </div>

                    <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      <DataScreenPhase2Chip label={`优先级 ${item.priority || '--'}`} accentColor="#FBBF24" />
                      <DataScreenPhase2Chip label={`状态 ${item.status || '--'}`} accentColor="#34D399" />
                      <DataScreenPhase2Chip label={`更新 ${formatDateLabel(item.lastUpdatedAt)}`} accentColor="#A78BFA" />
                      {typeof item.progress === 'number' ? <DataScreenPhase2Chip label={`进度 ${item.progress}%`} accentColor="#00D4FF" /> : null}
                    </div>

                    {item.abnormalFlags.length ? (
                      <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {item.abnormalFlags.map((flag) => (
                          <RiskTag key={flag} label={ABNORMAL_FILTER_LABELS[flag]} accentColor={ABNORMAL_FILTER_ACCENT[flag]} />
                        ))}
                      </div>
                    ) : null}
                  </button>
                );
              }) : (
                <DataScreenPhase2StateMessage
                  tone={stateFeedback?.tone || 'empty'}
                  title={stateFeedback?.title || (selectedPerson ? '暂无事项' : '等待选择人员')}
                  description={stateFeedback?.description || (selectedPerson ? '当前筛选条件下暂无事项。' : '请先从风险排行或人员列表中选中一个人员。')}
                  compact
                />
              )}
            </div>

            <div data-testid="data-screen-personnel-selected-item-detail" style={{ minHeight: 0, overflow: 'auto', paddingRight: '4px' }}>
              {selectedItem ? (
                <div style={{ display: 'grid', gap: '12px' }}>
                  <div style={phase2DetailPanelStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ color: '#00D4FF', fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px' }}>C3-1. 当前事项详情</div>
                        <div style={{ marginTop: '6px', color: '#FFFFFF', fontSize: '18px', fontWeight: 700 }}>{selectedItem.title}</div>
                        <div style={{ marginTop: '5px', color: 'rgba(255,255,255,0.56)', fontSize: '11px', lineHeight: 1.6 }}>
                          {PERSONNEL_ITEM_TYPE_LABELS[selectedItem.type]} / {selectedItem.status || '--'} / 最近更新 {formatDateLabel(selectedItem.lastUpdatedAt)}
                        </div>
                      </div>
                      <DataScreenPhase2Chip label={ABNORMAL_FILTER_LABELS[activeAbnormalFilter]} accentColor={ABNORMAL_FILTER_ACCENT[activeAbnormalFilter]} />
                    </div>

                    <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      <RiskTag label={`优先级 ${selectedItem.priority || '--'}`} accentColor="#FBBF24" />
                      {typeof selectedItem.progress === 'number' ? <RiskTag label={`进度 ${selectedItem.progress}%`} accentColor="#00D4FF" /> : null}
                      {selectedItem.abnormalFlags.map((flag) => (
                        <RiskTag key={flag} label={ABNORMAL_FILTER_LABELS[flag]} accentColor={ABNORMAL_FILTER_ACCENT[flag]} />
                      ))}
                    </div>

                    <div style={{ marginTop: '14px', display: 'grid', gap: '12px' }}>
                      <DetailBlock title="完整描述" content={selectedItem.description || '当前事项暂未沉淀完整描述。'} />
                      <DetailBlock title="阻塞原因" content={selectedItem.blockerReason || '当前暂无明显阻塞，可按正常节奏推进。'} accentColor={selectedItem.blockerReason ? '#FF8A65' : 'rgba(255,255,255,0.56)'} />
                    </div>
                  </div>

                  <div style={{ ...phase2DetailPanelStyle, display: 'grid', gap: '12px' }}>
                    <div>
                      <div style={phase2DetailSectionTitleStyle}>协同对象</div>
                      {selectedItem.collaborationContext.length ? (
                        <div style={{ marginTop: '10px', display: 'grid', gap: '8px' }}>
                          {selectedItem.collaborationContext.map((entry) => (
                            <div key={`${entry.label}-${entry.value}`} style={phase2DetailListRowStyle}>
                              <span style={{ color: 'rgba(255,255,255,0.48)', fontSize: '11px' }}>{entry.label}</span>
                              <span style={{ color: '#FFFFFF', fontSize: '12px', fontWeight: 600 }}>{entry.value}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={phase2DetailEmptyTextStyle}>当前没有可展示的协同对象。</div>
                      )}
                    </div>

                    <div>
                      <div style={phase2DetailSectionTitleStyle}>推进时间线</div>
                      {selectedItem.timeline.length ? (
                        <div style={{ marginTop: '10px', display: 'grid', gap: '8px' }}>
                          {selectedItem.timeline.map((entry) => (
                            <div key={`${entry.label}-${entry.value}`} style={phase2DetailListRowStyle}>
                              <span style={{ color: timelineToneColor(entry.tone), fontSize: '11px', fontWeight: 700 }}>{entry.label}</span>
                              <span style={{ color: '#E6F5FF', fontSize: '12px' }}>{entry.value}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={phase2DetailEmptyTextStyle}>当前没有可展示的时间线信息。</div>
                      )}
                    </div>

                    <div>
                      <div style={phase2DetailSectionTitleStyle}>管理入口</div>
                      {selectedItem.jumpLinks.length ? (
                        <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                          {selectedItem.jumpLinks.map((link) => (
                            <Link key={`${link.label}-${link.href}`} href={link.href} style={jumpLinkStyle}>
                              {link.label}
                            </Link>
                          ))}
                        </div>
                      ) : (
                        <div style={phase2DetailEmptyTextStyle}>当前事项没有可用的业务跳转入口。</div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={phase2DetailPanelStyle}>
                  <div style={{ color: '#00D4FF', fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px' }}>C3-1. 当前事项详情</div>
                  <div style={{ marginTop: '8px' }}>
                    <DataScreenPhase2StateMessage
                      tone={selectedPerson ? 'empty' : stateFeedback?.tone || 'empty'}
                      title={stateFeedback?.title || (selectedPerson ? '等待选择事项' : '等待选择人员')}
                      description={stateFeedback?.description || (selectedPerson ? '请从左侧事项列表中选中一个事项，查看其异常原因、协同对象和跳转入口。' : '请先选中人员，再查看事项详情。')}
                      compact
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}

function MetricCell({ label, value, accentColor }: { label: string; value: string; accentColor: string }) {
  return (
    <div style={{ padding: '10px 12px', borderRadius: '12px', border: `1px solid ${accentColor}26`, background: 'rgba(255,255,255,0.03)' }}>
      <div style={{ color: 'rgba(255,255,255,0.52)', fontSize: '10px' }}>{label}</div>
      <div style={{ marginTop: '8px', color: accentColor, fontSize: '18px', fontWeight: 700 }}>{value}</div>
    </div>
  );
}

function MiniSignalCell({ label, value, accentColor }: { label: string; value: string; accentColor: string }) {
  return (
    <div style={{ padding: '10px 12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.03)' }}>
      <div style={{ color: 'rgba(255,255,255,0.48)', fontSize: '10px' }}>{label}</div>
      <div style={{ marginTop: '7px', color: accentColor, fontSize: '14px', fontWeight: 700, lineHeight: 1.4 }}>{value}</div>
    </div>
  );
}

function ItemSignalCell({ label, value, tone = 'normal' }: { label: string; value: string; tone?: 'normal' | 'danger' }) {
  return (
    <div style={{ padding: '9px 10px', borderRadius: '12px', border: `1px solid ${tone === 'danger' ? 'rgba(255,138,101,0.22)' : 'rgba(255,255,255,0.06)'}`, background: tone === 'danger' ? 'rgba(255,138,101,0.08)' : 'rgba(255,255,255,0.03)' }}>
      <div style={{ color: 'rgba(255,255,255,0.44)', fontSize: '10px' }}>{label}</div>
      <div style={{ marginTop: '6px', color: tone === 'danger' ? '#FFD2C6' : '#E6F5FF', fontSize: '11px', fontWeight: 600, lineHeight: 1.6 }}>{value}</div>
    </div>
  );
}

function RiskTag({ label, accentColor }: { label: string; accentColor: string }) {
  return <DataScreenPhase2Chip label={label} accentColor={accentColor} emphasized />;
}

function DetailBlock({ title, content, accentColor = '#FFFFFF' }: { title: string; content: string; accentColor?: string }) {
  return (
    <div>
      <div style={phase2DetailSectionTitleStyle}>{title}</div>
      <div style={{ marginTop: '8px', color: accentColor, fontSize: '12px', lineHeight: 1.8 }}>{content}</div>
    </div>
  );
}

function formatDateLabel(value: string | null) {
  if (!value) {
    return '--';
  }

  return value.slice(0, 10).replace(/-/g, '.');
}

function formatCount(value: number) {
  return new Intl.NumberFormat('zh-CN').format(value);
}

function loadBucketLabel(bucket: DataScreenPersonnelLoadBucket) {
  switch (bucket) {
    case 'reserve':
      return '储备';
    case 'balanced':
      return '平衡';
    case 'busy':
      return '繁忙';
    case 'overloaded':
      return '过载';
    default:
      return '--';
  }
}

function timelineToneColor(tone: 'neutral' | 'warning' | 'danger') {
  switch (tone) {
    case 'warning':
      return '#FBBF24';
    case 'danger':
      return '#FF8A65';
    default:
      return '#00D4FF';
  }
}


const jumpLinkStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  minHeight: '34px',
  padding: '0 12px',
  borderRadius: '999px',
  border: '1px solid rgba(0,212,255,0.28)',
  background: 'rgba(0,212,255,0.10)',
  color: '#8CE7FF',
  fontSize: '11px',
  fontWeight: 700,
  textDecoration: 'none',
} as const;