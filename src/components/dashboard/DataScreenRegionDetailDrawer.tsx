'use client';

import { DataScreenDrilldownDrawer } from '@/components/dashboard/DataScreenDrilldownDrawer';
import type { DataScreenRegionDetailData } from '@/lib/data-screen-region-detail';

type RegionSelection = {
  name: string;
  source: 'map' | 'ranking' | 'risk';
} | null;

interface DataScreenRegionDetailDrawerProps {
  selection: RegionSelection;
  data: DataScreenRegionDetailData | null;
  isLoading: boolean;
  error: string | null;
  onClose: () => void;
}

const SOURCE_LABELS = {
  map: '地图点击',
  ranking: '榜单联动',
  risk: '风险联动',
} as const;

export function DataScreenRegionDetailDrawer({
  selection,
  data,
  isLoading,
  error,
  onClose,
}: DataScreenRegionDetailDrawerProps) {
  const open = !!selection;
  const badges = data ? [
    { label: data.regionLabel, accentColor: '#00D4FF', backgroundColor: '#00D4FF22' },
    { label: data.filtersEcho.map === 'zhejiang' ? '浙江视角' : '全国区域视角', accentColor: 'rgba(255,255,255,0.72)', backgroundColor: 'rgba(255,255,255,0.08)' },
    { label: `${data.filtersEcho.startDate} ~ ${data.filtersEcho.endDate}`, accentColor: 'rgba(255,255,255,0.72)', backgroundColor: 'rgba(255,255,255,0.08)' },
  ] : [];

  return (
    <DataScreenDrilldownDrawer
      open={open}
      objectType="region"
      title={selection ? `${selection.name} 区域下钻` : '区域下钻'}
      description={`统一详情层承接地图、榜单和风险入口，保持当前大屏筛选口径不变。${selection ? `当前入口：${SOURCE_LABELS[selection.source]}` : ''}`}
      badges={badges}
      actions={data?.actions || []}
      onClose={onClose}
      testId="data-screen-region-detail-drawer"
      titleTestId="data-screen-region-detail-title"
    >
          {isLoading ? (
            <div data-testid="data-screen-region-detail-loading" style={{ display: 'grid', gap: '12px' }}>
              {[0, 1, 2].map((item) => (
                <div key={item} style={{ height: '96px', borderRadius: '18px', background: 'rgba(255,255,255,0.06)' }} />
              ))}
            </div>
          ) : error ? (
            <div data-testid="data-screen-region-detail-error" style={emptyStateStyle}>
              <div style={{ color: '#FF8A65', fontSize: '16px', fontWeight: 700 }}>详情加载失败</div>
              <div style={{ marginTop: '8px', color: 'rgba(255,255,255,0.62)', fontSize: '12px', lineHeight: 1.7 }}>{error}</div>
            </div>
          ) : data ? (
            <>
              <section style={heroCardStyle}>
                <div style={{ marginTop: '12px', color: '#FFFFFF', fontSize: '20px', fontWeight: 700 }}>区域经营摘要</div>
                <div style={{ marginTop: '8px', color: 'rgba(255,255,255,0.62)', fontSize: '12px', lineHeight: 1.7 }}>
                  当前抽屉聚合该区域的客户盘子、项目推进、风险阻塞和人员协同快照，后续业务跳转继续复用这个入口。
                </div>
              </section>

              <section data-testid="data-screen-region-detail-summary" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '10px' }}>
                {[
                  { label: '客户数', value: formatCount(data.summary.customerCount), accentColor: '#00D4FF' },
                  { label: '项目数', value: formatCount(data.summary.projectCount), accentColor: '#00FF88' },
                  { label: '项目金额', value: formatWanAmount(data.summary.projectAmount), accentColor: '#6EE7FF' },
                  { label: '合同金额', value: formatWanAmount(data.summary.contractAmount), accentColor: '#FBBF24' },
                  { label: '风险项目', value: formatCount(data.summary.riskCount), accentColor: '#FF8A65' },
                  { label: '协同人员', value: formatCount(data.summary.activeStaffCount), accentColor: '#A78BFA' },
                ].map((metric) => (
                  <div key={metric.label} style={{ ...metricCardStyle, border: `1px solid ${metric.accentColor}28` }}>
                    <div style={{ color: 'rgba(255,255,255,0.52)', fontSize: '11px' }}>{metric.label}</div>
                    <div style={{ marginTop: '8px', color: metric.accentColor, fontSize: '19px', fontWeight: 700 }}>{metric.value}</div>
                  </div>
                ))}
              </section>

              <DrawerSection
                title="客户快照"
                subtitle="优先看该区域盘子最重、项目关联最高的客户。"
                emptyText="暂无客户快照。"
                items={data.customerSnapshot.items.map((item) => ({
                  key: String(item.id),
                  title: item.name,
                  subtitle: `${item.status} / 当前关联 ${formatCount(item.currentProjectCount)} 个项目`,
                  meta: `${formatWanAmount(item.totalAmount)} / ${formatTime(item.lastInteractionTime)}`,
                }))}
              />

              <DrawerSection
                title="项目快照"
                subtitle={`已中标 ${formatCount(data.projectSnapshot.wonCount)} 个，优先展示金额最高的项目。`}
                emptyText="暂无项目快照。"
                items={data.projectSnapshot.items.map((item) => ({
                  key: String(item.id),
                  title: item.name,
                  subtitle: `${item.customerName} / ${item.stage} / ${item.status}`,
                  meta: `${formatWanAmount(item.amount)} / 负责人 ${item.managerName}`,
                }))}
              />

              <DrawerSection
                title="风险快照"
                subtitle={`高风险 ${formatCount(data.summary.highRiskCount)} 个，当前展示最需要处理的阻塞对象。`}
                emptyText="暂无风险项。"
                items={data.riskSnapshot.items.map((item) => ({
                  key: String(item.id),
                  title: item.projectName,
                  subtitle: `${item.riskLevel} / ${item.status}`,
                  meta: item.description,
                  accentColor: item.riskLevel === 'critical' || item.riskLevel === 'high' ? '#FF8A65' : '#FBBF24',
                }))}
              />

              <DrawerSection
                title="协同快照"
                subtitle={`方案引用 ${formatCount(data.summary.solutionUsage)} 次，售前活动 ${formatCount(data.summary.preSalesActivity)} 次。`}
                emptyText="暂无协同人员快照。"
                items={data.collaborationSnapshot.items.map((item) => ({
                  key: String(item.userId),
                  title: item.realName,
                  subtitle: item.position,
                  meta: `关联 ${formatCount(item.projectCount)} 个项目`,
                }))}
              />
            </>
          ) : (
            <div data-testid="data-screen-region-detail-empty" style={emptyStateStyle}>
              <div style={{ color: '#E6F5FF', fontSize: '16px', fontWeight: 700 }}>暂无区域数据</div>
              <div style={{ marginTop: '8px', color: 'rgba(255,255,255,0.62)', fontSize: '12px', lineHeight: 1.7 }}>当前区域还没有可用于下钻的客户、项目或协同快照。</div>
            </div>
          )}
    </DataScreenDrilldownDrawer>
  );
}

function DrawerSection({
  title,
  subtitle,
  items,
  emptyText,
}: {
  title: string;
  subtitle: string;
  items: Array<{ key: string; title: string; subtitle: string; meta: string; accentColor?: string }>;
  emptyText: string;
}) {
  return (
    <section style={sectionStyle}>
      <div style={{ color: '#FFFFFF', fontSize: '14px', fontWeight: 700 }}>{title}</div>
      <div style={{ marginTop: '6px', color: 'rgba(255,255,255,0.52)', fontSize: '11px', lineHeight: 1.6 }}>{subtitle}</div>
      <div style={{ marginTop: '12px', display: 'grid', gap: '10px' }}>
        {items.length ? items.map((item) => (
          <div key={item.key} style={{ ...itemCardStyle, border: `1px solid ${(item.accentColor || '#00D4FF')}26` }}>
            <div style={{ color: item.accentColor || '#E6F5FF', fontSize: '13px', fontWeight: 700 }}>{item.title}</div>
            <div style={{ marginTop: '6px', color: 'rgba(255,255,255,0.68)', fontSize: '11px' }}>{item.subtitle}</div>
            <div style={{ marginTop: '8px', color: 'rgba(255,255,255,0.48)', fontSize: '10px', lineHeight: 1.7 }}>{item.meta}</div>
          </div>
        )) : (
          <div style={{ color: 'rgba(255,255,255,0.48)', fontSize: '11px' }}>{emptyText}</div>
        )}
      </div>
    </section>
  );
}

function formatCount(value: number) {
  return new Intl.NumberFormat('zh-CN').format(value);
}

function formatWanAmount(value: number) {
  const wanValue = value / 10000;
  const digits = Math.abs(wanValue) >= 100 ? 0 : 1;
  return `¥${wanValue.toFixed(digits)}万`;
}

function formatTime(value: string | null) {
  if (!value) {
    return '最近无互动';
  }

  return value.slice(0, 10);
}

const heroCardStyle = {
  padding: '18px 18px 16px',
  borderRadius: '22px',
  border: '1px solid rgba(0, 212, 255, 0.18)',
  background: 'linear-gradient(180deg, rgba(8, 18, 34, 0.96), rgba(9, 15, 28, 0.88))',
} as const;

const sectionStyle = {
  padding: '16px',
  borderRadius: '20px',
  border: '1px solid rgba(255,255,255,0.08)',
  background: 'rgba(255,255,255,0.03)',
} as const;

const metricCardStyle = {
  padding: '12px 14px',
  borderRadius: '16px',
  background: 'rgba(255,255,255,0.03)',
} as const;

const itemCardStyle = {
  padding: '12px 14px',
  borderRadius: '16px',
  background: 'rgba(255,255,255,0.03)',
} as const;

const emptyStateStyle = {
  padding: '28px 20px',
  borderRadius: '20px',
  border: '1px solid rgba(255,255,255,0.08)',
  background: 'rgba(255,255,255,0.03)',
} as const;