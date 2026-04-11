'use client';

import { DataScreenDrilldownDrawer } from '@/components/dashboard/DataScreenDrilldownDrawer';
import type { DataScreenRegionViewInitData } from '@/lib/data-screen-region-view';

interface DataScreenTopicProjectRiskDrawerProps {
  project: DataScreenRegionViewInitData['riskSummary']['items'][number] | null;
  onClose: () => void;
}

export function DataScreenTopicProjectRiskDrawer({ project, onClose }: DataScreenTopicProjectRiskDrawerProps) {
  return (
    <DataScreenDrilldownDrawer
      open={!!project}
      objectType="project"
      title={project ? `${project.projectName} 风险专题下钻` : '项目风险下钻'}
      description="统一详情层承接专题视角中的风险对象点击入口，整页跳转保留为二次动作。"
      badges={project ? [
        { label: project.region, accentColor: '#00D4FF', backgroundColor: '#00D4FF22' },
        { label: project.stage, accentColor: 'rgba(255,255,255,0.72)', backgroundColor: 'rgba(255,255,255,0.08)' },
        { label: project.riskLevel === 'high' ? '高风险' : '需关注', accentColor: project.riskLevel === 'high' ? '#FF8A65' : '#FBBF24', backgroundColor: project.riskLevel === 'high' ? 'rgba(255,138,101,0.18)' : 'rgba(251,191,36,0.14)' },
      ] : []}
      actions={project ? [
        { label: '查看项目详情', href: `/projects/${project.projectId}` },
        { label: '进入任务中心', href: '/tasks?scope=mine&type=alert' },
      ] : []}
      onClose={onClose}
      testId="data-screen-topic-project-risk-drawer"
      titleTestId="data-screen-topic-project-risk-title"
    >
      {project ? (
        <div style={{ display: 'grid', gap: '16px' }}>
          <section style={sectionStyle}>
            <div style={sectionTitleStyle}>风险原因</div>
            <div style={{ marginTop: '8px', color: '#FFFFFF', fontSize: '12px', lineHeight: 1.8 }}>{project.reason}</div>
          </section>

          <section style={sectionStyle}>
            <div style={sectionTitleStyle}>风险指标</div>
            <div style={{ marginTop: '10px', display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '10px' }}>
              <MetricCard label="风险评分" value={String(project.score)} accentColor="#FF8A65" />
              <MetricCard label="项目金额" value={formatWanAmount(project.amount)} accentColor="#00D4FF" />
              <MetricCard label="赢率" value={`${project.winProbability}%`} accentColor="#34D399" />
            </div>
          </section>
        </div>
      ) : null}
    </DataScreenDrilldownDrawer>
  );
}

function MetricCard({ label, value, accentColor }: { label: string; value: string; accentColor: string }) {
  return (
    <div style={{ padding: '12px 14px', borderRadius: '14px', border: `1px solid ${accentColor}26`, background: 'rgba(255,255,255,0.03)' }}>
      <div style={{ color: 'rgba(255,255,255,0.52)', fontSize: '10px' }}>{label}</div>
      <div style={{ marginTop: '8px', color: accentColor, fontSize: '18px', fontWeight: 700 }}>{value}</div>
    </div>
  );
}

function formatWanAmount(value: number) {
  const wanValue = value / 10000;
  const digits = Math.abs(wanValue) >= 100 ? 0 : 1;
  return `¥${wanValue.toFixed(digits)}万`;
}

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