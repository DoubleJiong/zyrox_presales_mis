'use client';

import { DataScreenDrilldownDrawer } from '@/components/dashboard/DataScreenDrilldownDrawer';
import type { DataScreenPersonnelAbnormalFilter, DataScreenPersonnelViewItemDetail } from '@/lib/data-screen-personnel-view';

interface DataScreenPersonnelItemDetailDrawerProps {
  open: boolean;
  item: DataScreenPersonnelViewItemDetail | null;
  activeAbnormalFilter: DataScreenPersonnelAbnormalFilter;
  selectedPersonName: string | null;
  onClose: () => void;
}

const ABNORMAL_FILTER_LABELS: Record<DataScreenPersonnelAbnormalFilter, string> = {
  all: '全部事项',
  overdue: '逾期',
  'high-priority-stalled': '高优未推进',
  stale: '长时间未更新',
  'cross-project-overload': '跨项目过载',
};

const ABNORMAL_FILTER_ACCENT: Record<DataScreenPersonnelAbnormalFilter, string> = {
  all: '#00D4FF',
  overdue: '#FF8A65',
  'high-priority-stalled': '#FBBF24',
  stale: '#A78BFA',
  'cross-project-overload': '#34D399',
};

export function DataScreenPersonnelItemDetailDrawer({
  open,
  item,
  activeAbnormalFilter,
  selectedPersonName,
  onClose,
}: DataScreenPersonnelItemDetailDrawerProps) {
  return (
    <DataScreenDrilldownDrawer
      open={open}
      objectType="personnel-item"
      title={item ? `${item.title} 事项下钻` : '事项下钻'}
      description={`统一详情层承接人员视角的事项点击入口，保持当前大屏筛选口径不变。${selectedPersonName ? `当前人员：${selectedPersonName}。` : ''}`}
      badges={item ? [
        { label: ABNORMAL_FILTER_LABELS[activeAbnormalFilter], accentColor: ABNORMAL_FILTER_ACCENT[activeAbnormalFilter], backgroundColor: `${ABNORMAL_FILTER_ACCENT[activeAbnormalFilter]}22` },
        { label: item.type, accentColor: '#00D4FF', backgroundColor: 'rgba(0,212,255,0.10)' },
        { label: item.status || '--', accentColor: 'rgba(255,255,255,0.72)', backgroundColor: 'rgba(255,255,255,0.08)' },
      ] : []}
      actions={item?.jumpLinks || []}
      onClose={onClose}
      testId="data-screen-personnel-item-detail-drawer"
      titleTestId="data-screen-personnel-item-detail-title"
    >
      {item ? (
        <>
          <section style={heroCardStyle}>
            <div style={{ color: '#FFFFFF', fontSize: '20px', fontWeight: 700 }}>事项详情摘要</div>
            <div style={{ marginTop: '8px', color: 'rgba(255,255,255,0.62)', fontSize: '12px', lineHeight: 1.7 }}>
              统一详情层优先承接事项异常分析、协同对象和业务跳转，整页跳转作为二次动作提供。
            </div>
          </section>

          <section style={sectionStyle}>
            <div style={sectionTitleStyle}>完整描述</div>
            <div style={{ marginTop: '8px', color: '#FFFFFF', fontSize: '12px', lineHeight: 1.8 }}>{item.description || '当前事项暂未沉淀完整描述。'}</div>
          </section>

          <section style={sectionStyle}>
            <div style={sectionTitleStyle}>阻塞原因</div>
            <div style={{ marginTop: '8px', color: item.blockerReason ? '#FF8A65' : 'rgba(255,255,255,0.62)', fontSize: '12px', lineHeight: 1.8 }}>
              {item.blockerReason || '当前暂无明显阻塞，可按正常节奏推进。'}
            </div>
          </section>

          <section style={sectionStyle}>
            <div style={sectionTitleStyle}>协同对象</div>
            {item.collaborationContext.length ? (
              <div style={{ marginTop: '10px', display: 'grid', gap: '8px' }}>
                {item.collaborationContext.map((entry) => (
                  <div key={`${entry.label}-${entry.value}`} style={rowStyle}>
                    <span style={{ color: 'rgba(255,255,255,0.48)', fontSize: '11px' }}>{entry.label}</span>
                    <span style={{ color: '#FFFFFF', fontSize: '12px', fontWeight: 600 }}>{entry.value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={emptyTextStyle}>当前没有可展示的协同对象。</div>
            )}
          </section>

          <section style={sectionStyle}>
            <div style={sectionTitleStyle}>推进时间线</div>
            {item.timeline.length ? (
              <div style={{ marginTop: '10px', display: 'grid', gap: '8px' }}>
                {item.timeline.map((entry) => (
                  <div key={`${entry.label}-${entry.value}`} style={rowStyle}>
                    <span style={{ color: toneColor(entry.tone), fontSize: '11px', fontWeight: 700 }}>{entry.label}</span>
                    <span style={{ color: '#E6F5FF', fontSize: '12px' }}>{entry.value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={emptyTextStyle}>当前没有可展示的时间线信息。</div>
            )}
          </section>
        </>
      ) : (
        <section style={sectionStyle}>
          <div style={{ color: '#E6F5FF', fontSize: '16px', fontWeight: 700 }}>暂无事项详情</div>
          <div style={emptyTextStyle}>请先在人员视角中选中一个事项，再打开统一下钻层查看详细信息。</div>
        </section>
      )}
    </DataScreenDrilldownDrawer>
  );
}

function toneColor(tone: 'neutral' | 'warning' | 'danger') {
  switch (tone) {
    case 'warning':
      return '#FBBF24';
    case 'danger':
      return '#FF8A65';
    default:
      return '#00D4FF';
  }
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

const sectionTitleStyle = {
  color: '#00D4FF',
  fontSize: '11px',
  fontWeight: 700,
  letterSpacing: '0.6px',
} as const;

const rowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: '12px',
  padding: '10px 12px',
  borderRadius: '12px',
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.06)',
} as const;

const emptyTextStyle = {
  marginTop: '10px',
  color: 'rgba(255,255,255,0.46)',
  fontSize: '12px',
  lineHeight: 1.7,
} as const;