'use client';

import type { DataScreenRegionViewInitData } from '@/lib/data-screen-region-view';
import type { DataScreenPersonnelViewInitData } from '@/lib/data-screen-personnel-view';
import {
  DataScreenPhase2Chip,
  DataScreenPhase2MicroLabel,
  DataScreenPhase2MetricCard,
  DataScreenPhase2SectionHeader,
  DataScreenPhase2StateMessage,
  phase2SubtleCardStyle,
  phase2ZoneCardStyle,
} from '@/components/dashboard/DataScreenPhase2Primitives';

export type DataScreenTopicPrototype = 'project-risk' | 'customer-progress' | 'solution-review' | 'target-forecast';

interface DataScreenTopicLayoutProps {
  activeTopic: DataScreenTopicPrototype;
  onTopicChange: (topic: DataScreenTopicPrototype) => void;
  regionViewData: DataScreenRegionViewInitData | null;
  personnelViewData: DataScreenPersonnelViewInitData | null;
  isRegionLoading?: boolean;
  isPersonnelLoading?: boolean;
  regionError?: string | null;
  personnelError?: string | null;
  startDate: string;
  endDate: string;
  onSelectRiskProject: (projectId: number) => void;
}

const TOPIC_OPTIONS: Array<{ key: DataScreenTopicPrototype; label: string; description: string }> = [
  { key: 'project-risk', label: '项目风险专题', description: '跨区域和跨人员看最需要立即处理的风险对象。' },
  { key: 'customer-progress', label: '客户推进专题', description: '预留客户推进原型位，后续承接客户分层与阶段推进。' },
  { key: 'solution-review', label: '方案评审专题', description: '预留方案评审压力专题位，后续承接评审负载和返工风险。' },
  { key: 'target-forecast', label: '经营目标专题', description: '预留目标与预测专题位，后续承接缺口和 run-rate 分析。' },
];

export function DataScreenTopicLayout({
  activeTopic,
  onTopicChange,
  regionViewData,
  personnelViewData,
  isRegionLoading = false,
  isPersonnelLoading = false,
  regionError = null,
  personnelError = null,
  startDate,
  endDate,
  onSelectRiskProject,
}: DataScreenTopicLayoutProps) {
  const riskSummary = regionViewData?.riskSummary;
  const riskItems = riskSummary?.items ?? [];
  const riskPeople = personnelViewData?.riskRanking ?? [];
  const abnormalSummary = personnelViewData?.itemAbnormalSummary ?? [];
  const topRiskRegions = Array.from(
    riskItems.reduce((map, item) => {
      const current = map.get(item.region) || { region: item.region, count: 0, amount: 0, highCount: 0 };
      current.count += 1;
      current.amount += item.amount;
      if (item.riskLevel === 'high') {
        current.highCount += 1;
      }
      map.set(item.region, current);
      return map;
    }, new Map<string, { region: string; count: number; amount: number; highCount: number }>())
  ).map(([, value]) => value).sort((left, right) => right.count - left.count || right.amount - left.amount).slice(0, 5);

  const summaryMetrics = [
    { label: '风险总量', value: formatCount(riskSummary?.total ?? 0), accentColor: '#FF8A65', detail: '当前风险专题纳管对象总数' },
    { label: '高风险项目', value: formatCount(riskSummary?.high ?? 0), accentColor: '#F87171', detail: '优先需要管理干预的项目' },
    { label: '行动逾期', value: formatCount(riskSummary?.overdueActions ?? 0), accentColor: '#FBBF24', detail: '已逾期但尚未闭环的动作' },
    { label: '滞后项目', value: formatCount(riskSummary?.staleProjects ?? 0), accentColor: '#A78BFA', detail: '推进节奏明显滞后的项目' },
    { label: '高风险人员', value: formatCount(riskPeople.length), accentColor: '#00D4FF', detail: '来自人员视角的风险排行联动' },
    { label: '异常事项池', value: formatCount(abnormalSummary.find((item) => item.key === 'all')?.count ?? 0), accentColor: '#34D399', detail: '复用人员事项异常池作为风险协同底座' },
  ];
  const maxRiskRegionCount = topRiskRegions.reduce((max, item) => Math.max(max, item.count), 0);
  const maxRiskRegionAmount = topRiskRegions.reduce((max, item) => Math.max(max, item.amount), 0);
  const abnormalMaxCount = abnormalSummary.reduce((max, item) => Math.max(max, item.count), 0);
  const avgRiskWinProbability = riskItems.length ? Math.round(riskItems.reduce((sum, item) => sum + item.winProbability, 0) / riskItems.length) : 0;
  const riskStageDistribution = Array.from(
    riskItems.reduce((map, item) => {
      const current = map.get(item.stage) || { label: item.stage, count: 0 };
      current.count += 1;
      map.set(item.stage, current);
      return map;
    }, new Map<string, { label: string; count: number }>())
  )
    .map(([, value]) => value)
    .sort((left, right) => right.count - left.count)
    .slice(0, 4);
  const riskActionQueue = [...riskItems]
    .sort((left, right) => buildRiskActionPriority(right) - buildRiskActionPriority(left))
    .slice(0, 3);
  const topRiskPerson = riskPeople[0] ?? null;
  const topAbnormalItem = abnormalSummary.find((item) => item.key !== 'all') ?? abnormalSummary[0] ?? null;
  const executionGuides = [
    {
      key: 'risk-closure',
      title: '先压高风险和逾期动作',
      detail: `当前高风险 ${formatCount(riskSummary?.high ?? 0)} 项，逾期动作 ${formatCount(riskSummary?.overdueActions ?? 0)} 项，建议先拉齐风险闭环节奏。`,
      accentColor: '#FF8A65',
    },
    topRiskPerson
      ? {
          key: 'owner-focus',
          title: `优先协同 ${topRiskPerson.name}`,
          detail: `${topRiskPerson.region || '未设置区域'} / 待处理 ${formatCount(topRiskPerson.pendingCount)} 项 / 逾期 ${formatCount(topRiskPerson.overdueCount)} 项。`,
          accentColor: '#00D4FF',
        }
      : null,
    topAbnormalItem
      ? {
          key: 'abnormal-pool',
          title: `优先清理${topAbnormalItem.label}`,
          detail: `${formatCount(topAbnormalItem.count)} 项待处理，先把异常事项池里的高密度问题削峰。`,
          accentColor: '#A78BFA',
        }
      : null,
  ].filter(Boolean) as Array<{ key: string; title: string; detail: string; accentColor: string }>;

  const nextStepActions = [
    { label: '今日拉会', value: riskActionQueue[0]?.projectName || '暂无', accentColor: '#FF8A65' },
    { label: '协同负责人', value: topRiskPerson?.name || '待分配', accentColor: '#00D4FF' },
    { label: '先处理池', value: topAbnormalItem?.label || '暂无', accentColor: '#34D399' },
  ];
  const topicLoading = isRegionLoading || isPersonnelLoading;
  const topicError = regionError || personnelError;

  return (
    <div data-testid="data-screen-topic-layout" style={{ flex: 1, display: 'grid', gridTemplateRows: 'auto auto minmax(0, 1fr)', gap: '14px', padding: '14px 18px 18px', overflow: 'hidden' }}>
      <section data-testid="data-screen-topic-switch-bar" className="data-screen-topic-switch-bar" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '10px' }}>
        {TOPIC_OPTIONS.map((topic) => {
          const isActive = topic.key === activeTopic;
          return (
            <button
              key={topic.key}
              data-testid={`data-screen-topic-tab-${topic.key}`}
              type="button"
              onClick={() => onTopicChange(topic.key)}
              style={{
                minHeight: '88px',
                padding: '14px 16px',
                borderRadius: '18px',
                border: `1px solid ${isActive ? 'rgba(0,212,255,0.34)' : 'rgba(255,255,255,0.08)'}`,
                background: isActive ? 'linear-gradient(180deg, rgba(0,212,255,0.16), rgba(8,16,30,0.86))' : 'linear-gradient(180deg, rgba(10, 25, 42, 0.92), rgba(8, 16, 30, 0.86))',
                textAlign: 'left',
                cursor: 'pointer',
              }}
            >
              <div style={{ color: isActive ? '#8CE7FF' : '#FFFFFF', fontSize: '14px', fontWeight: 700 }}>{topic.label}</div>
              <div style={{ marginTop: '8px', color: 'rgba(255,255,255,0.52)', fontSize: '11px', lineHeight: 1.6 }}>{topic.description}</div>
            </button>
          );
        })}
      </section>

      <section data-testid="data-screen-topic-summary-belt" className="data-screen-topic-summary-belt" style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: '10px' }}>
        {summaryMetrics.map((metric) => (
          <DataScreenPhase2MetricCard
            key={metric.label}
            label={metric.label}
            value={topicLoading && !regionViewData && !personnelViewData ? '--' : metric.value}
            detail={metric.detail}
            accentColor={metric.accentColor}
          />
        ))}
      </section>

      {activeTopic === 'project-risk' ? (
        <section data-testid="data-screen-topic-main-grid" className="data-screen-topic-main-grid" style={{ minHeight: 0, display: 'grid', gridTemplateColumns: 'minmax(300px, 0.9fr) minmax(0, 1.25fr) minmax(320px, 0.9fr)', gap: '12px' }}>
          <article data-testid="data-screen-topic-left-zone" style={phase2ZoneCardStyle}>
            <DataScreenPhase2SectionHeader eyebrow="T1. 风险热区" title="风险区域分布" subtitle="把区域风险对象重新组织成专题热区，而不是停留在单次地图点击。" badge={`${formatCount(topRiskRegions.length)} 区`} />
            {topRiskRegions.length ? (
              <div
                style={{
                  marginBottom: '12px',
                  padding: '12px 14px',
                  borderRadius: '16px',
                  border: '1px solid rgba(0,212,255,0.14)',
                  background: 'linear-gradient(180deg, rgba(0,212,255,0.08), rgba(255,255,255,0.03))',
                  display: 'grid',
                  gap: '10px',
                }}
              >
                <DataScreenPhase2MicroLabel label="分析图 01 / 区域风险强度" />
                {topRiskRegions.slice(0, 4).map((item) => (
                  <div key={`risk-bar-${item.region}`} style={{ display: 'grid', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', fontSize: '11px' }}>
                      <span style={{ color: '#E6F5FF' }}>{item.region}</span>
                      <span style={{ color: 'rgba(255,255,255,0.58)' }}>{formatCount(item.count)} 项 / {formatWanAmount(item.amount)}</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 72px', gap: '8px', alignItems: 'center' }}>
                      <div style={{ height: '8px', borderRadius: '999px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                        <div style={{ width: `${Math.max(12, maxRiskRegionCount ? (item.count / maxRiskRegionCount) * 100 : 0)}%`, height: '100%', borderRadius: '999px', background: 'linear-gradient(90deg, rgba(255,138,101,0.72), #FF8A65)' }} />
                      </div>
                      <div style={{ height: '8px', borderRadius: '999px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                        <div style={{ width: `${Math.max(10, maxRiskRegionAmount ? (item.amount / maxRiskRegionAmount) * 100 : 0)}%`, height: '100%', borderRadius: '999px', background: 'linear-gradient(90deg, rgba(0,212,255,0.72), #00D4FF)' }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
            <div style={{ display: 'grid', gap: '10px' }}>
              {topicLoading && !riskItems.length ? (
                <DataScreenPhase2StateMessage tone="loading" title="专题热区加载中" description="正在汇总区域风险对象和热区分布。" compact />
              ) : topicError && !topRiskRegions.length ? (
                <DataScreenPhase2StateMessage tone="error" title="专题热区加载异常" description={topicError} compact />
              ) : topRiskRegions.length ? topRiskRegions.map((item) => (
                <div key={item.region} style={phase2SubtleCardStyle}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                    <div>
                      <div style={{ color: '#FFFFFF', fontSize: '13px', fontWeight: 700 }}>{item.region}</div>
                      <div style={{ marginTop: '6px', color: 'rgba(255,255,255,0.52)', fontSize: '11px' }}>风险 {formatCount(item.count)} / 高风险 {formatCount(item.highCount)}</div>
                    </div>
                    <div style={{ color: '#FF8A65', fontSize: '16px', fontWeight: 700 }}>{formatWanAmount(item.amount)}</div>
                  </div>
                </div>
              )) : <DataScreenPhase2StateMessage title="暂无风险热区" description="当前没有可展示的风险热区。" compact />}
            </div>
          </article>

          <article data-testid="data-screen-topic-center-zone" style={{ ...phase2ZoneCardStyle, minHeight: 0, overflow: 'hidden' }}>
            <DataScreenPhase2SectionHeader eyebrow="T2. 风险对象主图" title="项目风险对象榜" subtitle={`时间 ${formatDateLabel(startDate)} - ${formatDateLabel(endDate)}，点击对象进入统一下钻层。`} badge={`${formatCount(riskItems.length)} 项`} />
            <div
              data-testid="data-screen-topic-risk-command-band"
              style={{
                marginBottom: '12px',
                padding: '12px 14px',
                borderRadius: '18px',
                border: '1px solid rgba(255,138,101,0.16)',
                background: 'linear-gradient(180deg, rgba(255,138,101,0.10), rgba(8,16,30,0.92) 58%, rgba(10,18,34,0.92))',
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1.05fr) minmax(240px, 0.95fr)',
                gap: '12px',
              }}
            >
              <div style={{ display: 'grid', gap: '10px' }}>
                <div>
                  <DataScreenPhase2MicroLabel label="分析图 02 / 风险处置指挥板" accentColor="#FFB4A2" />
                  <div style={{ marginTop: '6px', color: '#FFFFFF', fontSize: '16px', fontWeight: 700 }}>把高风险、逾期动作和赢率压力放在同一块主图里看</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '8px' }}>
                  {[
                    { label: '高风险', value: formatCount(riskSummary?.high ?? 0), accentColor: '#FF8A65' },
                    { label: '逾期动作', value: formatCount(riskSummary?.overdueActions ?? 0), accentColor: '#FBBF24' },
                    { label: '本周到期', value: formatCount(riskSummary?.dueThisWeek ?? 0), accentColor: '#00D4FF' },
                    { label: '平均赢率', value: `${avgRiskWinProbability}%`, accentColor: '#34D399' },
                  ].map((item) => (
                    <div key={item.label} style={{ padding: '10px 12px', borderRadius: '14px', border: `1px solid ${item.accentColor}26`, background: 'rgba(255,255,255,0.03)' }}>
                      <div style={{ color: 'rgba(255,255,255,0.48)', fontSize: '10px' }}>{item.label}</div>
                      <div style={{ marginTop: '8px', color: item.accentColor, fontSize: '18px', fontWeight: 700 }}>{item.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div
                data-testid="data-screen-topic-risk-action-strip"
                style={{
                  padding: '10px 12px',
                  borderRadius: '16px',
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: 'rgba(255,255,255,0.03)',
                  display: 'grid',
                  gap: '8px',
                  alignContent: 'start',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                  <DataScreenPhase2MicroLabel label="分析带 01 / 今日优先处理" />
                  <div style={{ color: 'rgba(255,255,255,0.46)', fontSize: '10px' }}>点击直接进入项目下钻</div>
                </div>
                {riskActionQueue.length ? riskActionQueue.map((item) => (
                  <button
                    key={`action-${item.projectId}`}
                    data-testid={`data-screen-topic-risk-action-${item.projectId}`}
                    type="button"
                    onClick={() => onSelectRiskProject(item.projectId)}
                    style={{
                      display: 'grid',
                      gap: '5px',
                      textAlign: 'left',
                      padding: '10px 12px',
                      borderRadius: '14px',
                      border: `1px solid ${item.riskLevel === 'high' ? 'rgba(255,138,101,0.24)' : 'rgba(251,191,36,0.22)'}`,
                      background: 'rgba(255,255,255,0.03)',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                      <span style={{ color: '#FFFFFF', fontSize: '12px', fontWeight: 600 }}>{item.projectName}</span>
                      <span style={{ color: item.riskLevel === 'high' ? '#FF8A65' : '#FBBF24', fontSize: '11px', fontWeight: 700 }}>{item.riskLevel === 'high' ? '立即处理' : '继续跟进'}</span>
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.52)', fontSize: '10px', lineHeight: 1.55 }}>{item.region} / {item.reason}</div>
                  </button>
                )) : (
                  <DataScreenPhase2StateMessage title="暂无优先动作" description="当前没有需要立即拉起的风险对象。" compact />
                )}
              </div>
            </div>

            {riskStageDistribution.length ? (
              <div
                style={{
                  marginBottom: '12px',
                  padding: '12px 14px',
                  borderRadius: '16px',
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: 'rgba(255,255,255,0.03)',
                }}
              >
                <DataScreenPhase2MicroLabel label="分析图 03 / 风险阶段分布" />
                <div style={{ marginTop: '10px', display: 'grid', gridTemplateColumns: `repeat(${riskStageDistribution.length}, minmax(0, 1fr))`, gap: '10px', alignItems: 'end', minHeight: '86px' }}>
                  {riskStageDistribution.map((item, index) => {
                    const accent = ['#00D4FF', '#34D399', '#FBBF24', '#FF8A65'][index % 4];
                    const maxCount = riskStageDistribution[0]?.count || 1;
                    return (
                      <div key={`stage-${item.label}`} style={{ display: 'grid', gap: '8px', alignItems: 'end' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', color: accent, fontSize: '12px', fontWeight: 700 }}>{formatCount(item.count)}</div>
                        <div style={{ height: '56px', display: 'flex', alignItems: 'end', justifyContent: 'center' }}>
                          <div style={{ width: '100%', maxWidth: '56px', height: `${Math.max(18, (item.count / maxCount) * 56)}px`, borderRadius: '14px 14px 8px 8px', background: `linear-gradient(180deg, ${accent}, ${accent}33)` }} />
                        </div>
                        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.56)', fontSize: '10px', lineHeight: 1.5 }}>{item.label}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
            <div style={{ display: 'grid', gap: '10px', overflow: 'auto', paddingRight: '4px' }}>
              {topicLoading && !riskItems.length ? (
                <DataScreenPhase2StateMessage tone="loading" title="风险对象同步中" description="正在同步项目风险榜和专题对象池。" compact />
              ) : topicError && !riskItems.length ? (
                <DataScreenPhase2StateMessage tone="error" title="风险对象加载异常" description={topicError} compact />
              ) : riskItems.length ? riskItems.slice(0, 8).map((item) => (
                <button
                  key={item.projectId}
                  data-testid={`data-screen-topic-risk-project-${item.projectId}`}
                  type="button"
                  onClick={() => onSelectRiskProject(item.projectId)}
                  style={{ padding: '14px 16px', borderRadius: '16px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${item.riskLevel === 'high' ? 'rgba(255,138,101,0.24)' : 'rgba(251,191,36,0.22)'}`, textAlign: 'left', cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ color: '#FFFFFF', fontSize: '13px', fontWeight: 700 }}>{item.projectName}</div>
                      <div style={{ marginTop: '6px', color: 'rgba(255,255,255,0.56)', fontSize: '11px' }}>{item.region} / {item.stage}</div>
                    </div>
                    <div style={{ color: item.riskLevel === 'high' ? '#FF8A65' : '#FBBF24', fontSize: '12px', fontWeight: 700 }}>{item.riskLevel === 'high' ? '高风险' : '需关注'}</div>
                  </div>
                  <div style={{ marginTop: '10px', color: 'rgba(255,255,255,0.62)', fontSize: '11px', lineHeight: 1.7 }}>{item.reason}</div>
                  <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    <DataScreenPhase2Chip label={`金额 ${formatWanAmount(item.amount)}`} accentColor="#00D4FF" />
                    <DataScreenPhase2Chip label={`赢率 ${item.winProbability}%`} accentColor="#34D399" />
                    <DataScreenPhase2Chip label={`评分 ${item.score}`} accentColor="#A78BFA" />
                  </div>
                </button>
              )) : <DataScreenPhase2StateMessage title="暂无风险对象" description="当前没有风险对象可供专题分析。" compact />}
            </div>
          </article>

          <article data-testid="data-screen-topic-right-zone" style={phase2ZoneCardStyle}>
            <DataScreenPhase2SectionHeader eyebrow="T3. 排行、提醒与建议" title="人员与异常联动" subtitle="复用人员视角的风险排行和异常事项池，并给出当前专题的处置建议。" badge={`${formatCount(riskPeople.length)} 人`} />
            <div
              data-testid="data-screen-topic-execution-guidance"
              style={{
                marginBottom: '12px',
                padding: '12px 14px',
                borderRadius: '16px',
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'linear-gradient(180deg, rgba(0,212,255,0.08), rgba(255,255,255,0.03))',
                display: 'grid',
                gap: '8px',
              }}
            >
              <DataScreenPhase2MicroLabel label="分析图 04 / 处置建议" />
              {executionGuides.map((item) => (
                <div key={item.key} style={{ padding: '10px 12px', borderRadius: '14px', border: `1px solid ${item.accentColor}22`, background: 'rgba(255,255,255,0.03)' }}>
                  <div style={{ color: item.accentColor, fontSize: '11px', fontWeight: 700 }}>{item.title}</div>
                  <div style={{ marginTop: '5px', color: 'rgba(255,255,255,0.56)', fontSize: '10px', lineHeight: 1.6 }}>{item.detail}</div>
                </div>
              ))}
            </div>

            <div
              data-testid="data-screen-topic-next-step-strip"
              style={{
                marginBottom: '12px',
                display: 'grid',
                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                gap: '8px',
              }}
            >
              {nextStepActions.map((item) => (
                <div key={item.label} style={{ padding: '10px 12px', borderRadius: '14px', border: `1px solid ${item.accentColor}22`, background: 'rgba(255,255,255,0.03)' }}>
                  <div style={{ color: 'rgba(255,255,255,0.48)', fontSize: '10px' }}>{item.label}</div>
                  <div style={{ marginTop: '8px', color: item.accentColor, fontSize: '12px', fontWeight: 700, lineHeight: 1.45 }}>{item.value}</div>
                </div>
              ))}
            </div>

            {abnormalSummary.length ? (
              <div
                style={{
                  marginBottom: '12px',
                  padding: '12px 14px',
                  borderRadius: '16px',
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: 'linear-gradient(180deg, rgba(167,139,250,0.10), rgba(255,255,255,0.03))',
                }}
              >
                <DataScreenPhase2MicroLabel label="分析图 05 / 异常事项池" accentColor="#C4B5FD" />
                <div style={{ marginTop: '10px', display: 'grid', gap: '8px' }}>
                  {abnormalSummary.slice(0, 4).map((item, index) => {
                    const accent = ['#A78BFA', '#FF8A65', '#FBBF24', '#34D399'][index % 4];
                    return (
                      <div key={`abnormal-${item.key}`} style={{ display: 'grid', gridTemplateColumns: '82px minmax(0, 1fr) 42px', gap: '8px', alignItems: 'center' }}>
                        <div style={{ color: 'rgba(255,255,255,0.58)', fontSize: '10px' }}>{item.label}</div>
                        <div style={{ height: '8px', borderRadius: '999px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                          <div style={{ width: `${Math.max(10, abnormalMaxCount ? (item.count / abnormalMaxCount) * 100 : 0)}%`, height: '100%', borderRadius: '999px', background: `linear-gradient(90deg, ${accent}, ${accent}55)` }} />
                        </div>
                        <div style={{ color: accent, fontSize: '11px', fontWeight: 700, textAlign: 'right' }}>{formatCount(item.count)}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
            <div style={{ display: 'grid', gap: '10px' }}>
              {(topicLoading && !riskPeople.length ? (
                <DataScreenPhase2StateMessage tone="loading" title="联动提醒加载中" description="正在同步人员风险排行和异常事项池。" compact />
              ) : topicError && !riskPeople.length ? (
                <DataScreenPhase2StateMessage tone="error" title="联动提醒加载异常" description={topicError} compact />
              ) : riskPeople.length ? riskPeople.slice(0, 5).map((person) => (
                <div key={person.userId} style={phase2SubtleCardStyle}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                    <div>
                      <div style={{ color: '#FFFFFF', fontSize: '13px', fontWeight: 700 }}>{person.name}</div>
                      <div style={{ marginTop: '5px', color: 'rgba(255,255,255,0.58)', fontSize: '11px' }}>{person.roleName} / {person.region || '未设置区域'}</div>
                    </div>
                    <div style={{ color: '#FF8A65', fontSize: '16px', fontWeight: 700 }}>{person.riskScore}</div>
                  </div>
                  <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    <DataScreenPhase2Chip label={`待处理 ${formatCount(person.pendingCount)}`} accentColor="#00D4FF" emphasized />
                    <DataScreenPhase2Chip label={`逾期 ${formatCount(person.overdueCount)}`} accentColor={person.overdueCount > 0 ? '#FF8A65' : '#FBBF24'} emphasized />
                  </div>
                </div>
              )) : <DataScreenPhase2StateMessage title="暂无联动人员" description="当前没有高风险人员联动数据。" compact />)}
            </div>

            <div style={{ marginTop: '14px', display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px' }}>
              {abnormalSummary.slice(0, 4).map((item) => (
                <div key={item.key} style={phase2SubtleCardStyle}>
                  <div style={{ color: '#FFFFFF', fontSize: '11px', fontWeight: 700 }}>{item.label}</div>
                  <div style={{ marginTop: '8px', color: '#E6F5FF', fontSize: '18px', fontWeight: 700 }}>{formatCount(item.count)}</div>
                  <div style={{ marginTop: '6px', color: 'rgba(255,255,255,0.48)', fontSize: '10px', lineHeight: 1.5 }}>{item.description}</div>
                </div>
              ))}
            </div>
          </article>
        </section>
      ) : (
        <section data-testid="data-screen-topic-placeholder" style={{ ...phase2ZoneCardStyle, display: 'grid', placeItems: 'center' }}>
          <div style={{ maxWidth: '760px', textAlign: 'center' }}>
            <div style={{ color: '#00D4FF', fontSize: '14px', fontWeight: 700 }}>扩展插槽已预留</div>
            <div style={{ marginTop: '12px', color: '#FFFFFF', fontSize: '24px', fontWeight: 700 }}>{TOPIC_OPTIONS.find((item) => item.key === activeTopic)?.label}</div>
            <div style={{ marginTop: '10px', color: 'rgba(255,255,255,0.68)', fontSize: '13px', lineHeight: 1.9 }}>
              当前版本先提供“项目风险专题”作为轻量原型，其余专题保持稳定扩展位，后续可直接复用统一筛选和下钻协议继续挂接。
            </div>
          </div>
        </section>
      )}
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

function formatWanAmount(value: number) {
  const wanValue = value / 10000;
  const digits = Math.abs(wanValue) >= 100 ? 0 : 1;
  return `¥${wanValue.toFixed(digits)}万`;
}

function buildRiskActionPriority(item: {
  riskLevel: 'high' | 'medium';
  score: number;
  amount: number;
  winProbability: number;
}) {
  return (item.riskLevel === 'high' ? 1000 : 0) + item.score * 10 + item.amount / 10000 + Math.max(0, 100 - item.winProbability);
}
