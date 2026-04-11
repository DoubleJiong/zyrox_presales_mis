'use client';

import Link from 'next/link';
import { useState, type CSSProperties, type ReactNode } from 'react';
import ReactECharts from 'echarts-for-react';
import { DataScreenDrilldownDrawer } from '@/components/dashboard/DataScreenDrilldownDrawer';
import { techTheme } from '@/lib/tech-theme';
import { AlertTriangle, Award, ShieldAlert, Users, Target, TrendingUp, Zap, FolderKanban, FileText } from 'lucide-react';
import type { 
  SalesPanelData, 
  CustomersPanelData, 
  ProjectsPanelData, 
  SolutionsPanelData 
} from '@/hooks/use-panel-data';
import type { WorkbenchSummaryData } from '@/hooks/use-workbench-summary';
import type { PresalesFocusSummaryData } from '@/hooks/use-presales-focus-summary';
import type { MapRegionData } from '@/lib/map-types';
import type { DataScreenDrilldownAction, DataScreenDrilldownObjectType } from '@/lib/data-screen-drilldown';

const compactMetricValueStyle: CSSProperties = {
  fontSize: '15px',
  fontWeight: '600',
  lineHeight: 1.2,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const compactMetricLabelStyle: CSSProperties = {
  color: techTheme.text.secondary,
  fontSize: '10px',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const singleLineTextStyle: CSSProperties = {
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  minWidth: 0,
};

const twoLineClampStyle: CSSProperties = {
  display: '-webkit-box',
  WebkitBoxOrient: 'vertical',
  WebkitLineClamp: 2,
  overflow: 'hidden',
  minWidth: 0,
  wordBreak: 'break-word',
};

const compactCardStyle: CSSProperties = {
  padding: '8px',
  borderRadius: '6px',
  background: 'rgba(0,0,0,0.18)',
  border: '1px solid rgba(255,255,255,0.08)',
  minWidth: 0,
};

const detailCardStyle: CSSProperties = {
  padding: '10px 12px',
  borderRadius: '10px',
  border: '1px solid rgba(0, 212, 255, 0.18)',
  background: 'rgba(255,255,255,0.03)',
  display: 'grid',
  gap: '8px',
  minWidth: 0,
};

interface ExpandablePanelSectionProps<T> {
  title: string;
  drawerTitle: string;
  drawerDescription: string;
  objectType: DataScreenDrilldownObjectType;
  items: T[];
  emptyText: string;
  compactCount?: number;
  actions?: DataScreenDrilldownAction[];
  renderCompactItem: (item: T, index: number) => ReactNode;
  renderDetailItem: (item: T, index: number) => ReactNode;
}

function ExpandablePanelSection<T>({
  title,
  drawerTitle,
  drawerDescription,
  objectType,
  items,
  emptyText,
  compactCount = 2,
  actions = [],
  renderCompactItem,
  renderDetailItem,
}: ExpandablePanelSectionProps<T>) {
  const [open, setOpen] = useState(false);
  const visibleItems = items.slice(0, compactCount);
  const canExpand = items.length > compactCount;

  return (
    <>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '8px' }}>
          <div style={{ color: techTheme.text.primary, fontSize: '11px', fontWeight: '600', ...singleLineTextStyle }}>{title}</div>
          {canExpand ? (
            <button
              type="button"
              onClick={() => setOpen(true)}
              style={{
                border: '1px solid rgba(0, 212, 255, 0.22)',
                background: 'rgba(0, 212, 255, 0.08)',
                color: techTheme.colors.primary,
                borderRadius: '999px',
                padding: '3px 10px',
                fontSize: '10px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              查看全部
            </button>
          ) : null}
        </div>

        {visibleItems.length ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {visibleItems.map((item, index) => renderCompactItem(item, index))}
          </div>
        ) : (
          <div style={{ color: techTheme.text.secondary, fontSize: '11px', textAlign: 'center', padding: '10px 0' }}>{emptyText}</div>
        )}
      </div>

      <DataScreenDrilldownDrawer
        open={open}
        objectType={objectType}
        title={drawerTitle}
        description={drawerDescription}
        actions={actions}
        onClose={() => setOpen(false)}
        testId={`panel-drawer-${drawerTitle}`}
        titleTestId={`panel-drawer-title-${drawerTitle}`}
      >
        {items.length ? (
          items.map((item, index) => renderDetailItem(item, index))
        ) : (
          <div style={{ color: techTheme.text.secondary, fontSize: '12px' }}>{emptyText}</div>
        )}
      </DataScreenDrilldownDrawer>
    </>
  );
}

function FocusMetricGrid({
  items,
}: {
  items: Array<{ label: string; value: string | number; color: string; testId?: string }>;
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px', marginBottom: '12px' }}>
      {items.map((item) => (
        <div key={item.label} style={{ textAlign: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', padding: '8px 6px', minWidth: 0 }}>
          <div data-testid={item.testId} style={{ ...compactMetricValueStyle, color: item.color }}>{item.value}</div>
          <div style={compactMetricLabelStyle}>{item.label}</div>
        </div>
      ))}
    </div>
  );
}

function FocusPreviewChart({
  title,
  items,
  variant,
  emptyText,
}: {
  title: string;
  items: Array<{ label: string; value: string; ratio: number; accentColor: string }>;
  variant: 'bars' | 'columns' | 'gauges';
  emptyText: string;
}) {
  return (
    <div style={{ marginBottom: '12px', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.18)' }}>
      <div style={{ color: techTheme.text.primary, fontSize: '11px', fontWeight: '600', marginBottom: '8px', ...singleLineTextStyle }}>{title}</div>
      {items.length ? (
        variant === 'columns' ? (
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`, gap: '8px', alignItems: 'end', minHeight: '88px' }}>
            {items.map((item) => (
              <div key={`${title}-${item.label}`} style={{ display: 'grid', gap: '5px', alignItems: 'end' }}>
                <div style={{ height: '44px', display: 'flex', alignItems: 'end' }}>
                  <div style={{ width: '100%', height: `${Math.max(18, Math.min(100, item.ratio * 100))}%`, borderRadius: '8px 8px 3px 3px', background: `linear-gradient(180deg, ${item.accentColor}, ${item.accentColor}77)` }} />
                </div>
                <span style={{ color: techTheme.text.secondary, fontSize: '9px', textAlign: 'center', ...singleLineTextStyle }}>{item.label}</span>
                <span style={{ color: item.accentColor, fontSize: '9px', fontWeight: '700', textAlign: 'center', ...singleLineTextStyle }}>{item.value}</span>
              </div>
            ))}
          </div>
        ) : variant === 'gauges' ? (
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`, gap: '8px' }}>
            {items.map((item) => (
              <div key={`${title}-${item.label}`} style={{ display: 'grid', justifyItems: 'center', gap: '4px' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '999px', background: `conic-gradient(${item.accentColor} 0deg ${Math.max(18, Math.min(360, item.ratio * 360))}deg, rgba(255,255,255,0.08) ${Math.max(18, Math.min(360, item.ratio * 360))}deg 360deg)`, display: 'grid', placeItems: 'center' }}>
                  <div style={{ width: '25px', height: '25px', borderRadius: '999px', background: 'rgba(8,14,24,0.94)', display: 'grid', placeItems: 'center', color: item.accentColor, fontSize: '8px', fontWeight: 700 }}>{Math.round(item.ratio * 100)}%</div>
                </div>
                <span style={{ color: techTheme.text.secondary, fontSize: '9px', ...singleLineTextStyle }}>{item.label}</span>
                <span style={{ color: item.accentColor, fontSize: '9px', fontWeight: '700', ...singleLineTextStyle }}>{item.value}</span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '6px' }}>
            {items.map((item) => (
              <div key={`${title}-${item.label}`} style={{ display: 'grid', gap: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <span style={{ color: techTheme.text.secondary, fontSize: '10px', ...singleLineTextStyle }}>{item.label}</span>
                  <span style={{ color: item.accentColor, fontSize: '10px', fontWeight: '700', ...singleLineTextStyle }}>{item.value}</span>
                </div>
                <div style={{ height: '6px', borderRadius: '999px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.max(12, Math.min(100, item.ratio * 100))}%`, height: '100%', borderRadius: '999px', background: `linear-gradient(90deg, ${item.accentColor}bb, ${item.accentColor})` }} />
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        <div style={{ color: techTheme.text.secondary, fontSize: '11px', textAlign: 'center', padding: '8px 0' }}>{emptyText}</div>
      )}
    </div>
  );
}

// ==================== 售前数据面板 ====================
interface SalesPanelProps {
  data: SalesPanelData | null;
}

export function SalesPanel({ data }: SalesPanelProps) {
  if (!data) {
    return <div style={{ color: techTheme.text.secondary, textAlign: 'center', padding: '20px' }}>加载中...</div>;
  }

  // 月度之星
  const renderTopPerformers = () => {
    const performers = data.topPerformers || [];
    if (performers.length === 0) {
      return <div style={{ color: techTheme.text.secondary, textAlign: 'center', padding: '20px' }}>暂无数据</div>;
    }

    return (
      <div style={{
        background: 'rgba(0, 212, 255, 0.05)',
        border: '1px solid rgba(0, 212, 255, 0.2)',
        borderRadius: '8px',
        padding: '12px',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '12px',
        }}>
          <Award size={16} style={{ color: techTheme.colors.primary }} />
          <span style={{ color: techTheme.colors.primary, fontSize: '12px', fontWeight: '600' }}>月度之星</span>
        </div>
        <ExpandablePanelSection
          title="签约贡献排名"
          drawerTitle="月度之星完整榜单"
          drawerDescription="查看当前统计范围内的签约金额和项目活跃度排行。"
          objectType="project"
          items={performers}
          emptyText="暂无排行数据"
          compactCount={3}
          renderCompactItem={(p, i) => (
            <div key={p.id} style={{
              ...compactCardStyle,
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              background: i === 0 ? 'rgba(255, 215, 0, 0.1)' : i === 1 ? 'rgba(192, 192, 192, 0.1)' : i === 2 ? 'rgba(205, 127, 50, 0.1)' : compactCardStyle.background,
              border: i === 0 ? '1px solid rgba(255, 215, 0, 0.3)' : i === 1 ? '1px solid rgba(192, 192, 192, 0.3)' : i === 2 ? '1px solid rgba(205, 127, 50, 0.3)' : compactCardStyle.border,
            }}>
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: i === 0 ? 'linear-gradient(135deg, #FFD700, #FFA500)' : i === 1 ? 'linear-gradient(135deg, #C0C0C0, #A0A0A0)' : i === 2 ? 'linear-gradient(135deg, #CD7F32, #8B4513)' : techTheme.colors.primary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#000',
                fontSize: '12px',
                fontWeight: 'bold',
                flexShrink: 0,
              }}>
                {p.rank}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: techTheme.text.primary, fontSize: '13px', fontWeight: '500', ...twoLineClampStyle }}>{p.name}</div>
                <div style={{ color: techTheme.text.secondary, fontSize: '10px', marginTop: '3px' }}>{p.region}</div>
              </div>
              <div style={{ textAlign: 'right', minWidth: '72px', flexShrink: 0 }}>
                <div style={{ color: i === 0 ? '#FFD700' : techTheme.colors.primary, fontSize: '14px', fontWeight: '600', wordBreak: 'break-word' }}>{p.score}</div>
                <div style={{ color: techTheme.text.secondary, fontSize: '10px' }}>{p.activities}个项目</div>
              </div>
            </div>
          )}
          renderDetailItem={(p, i) => (
            <div key={p.id} style={detailCardStyle}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: techTheme.text.primary, fontSize: '14px', fontWeight: '700' }}>{i + 1}. {p.name}</div>
                  <div style={{ color: techTheme.text.secondary, fontSize: '11px', marginTop: '4px' }}>{p.region}</div>
                </div>
                <div style={{ color: techTheme.colors.primary, fontSize: '13px', fontWeight: '700', textAlign: 'right' }}>{p.score}</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px' }}>
                <div style={{ color: techTheme.text.secondary, fontSize: '11px' }}>签约金额</div>
                <div style={{ color: '#E6F5FF', fontSize: '11px', textAlign: 'right' }}>{formatWan(p.amount)}</div>
                <div style={{ color: techTheme.text.secondary, fontSize: '11px' }}>关联项目</div>
                <div style={{ color: '#E6F5FF', fontSize: '11px', textAlign: 'right' }}>{p.activities} 个</div>
              </div>
            </div>
          )}
        />
      </div>
    );
  };

  // 工作饱和度
  const renderWorkSaturation = () => {
    const saturation = data.workSaturation || [];
    
    const option = {
      grid: {
        top: 10,
        right: 20,
        bottom: 20,
        left: 60,
      },
      xAxis: {
        type: 'value',
        max: 100,
        axisLine: { show: false },
        axisLabel: { color: techTheme.text.secondary, fontSize: 10 },
        splitLine: { lineStyle: { color: 'rgba(0, 212, 255, 0.1)' } },
      },
      yAxis: {
        type: 'category',
        data: saturation.map(s => s.name).reverse(),
        axisLine: { show: false },
        axisLabel: { color: techTheme.text.secondary, fontSize: 10 },
      },
      series: [{
        type: 'bar',
        data: saturation.map(s => ({
          value: s.value,
          itemStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 1, y2: 0,
              colorStops: [
                { offset: 0, color: s.value > 80 ? '#FF6B6B' : s.value > 50 ? '#FFA500' : techTheme.colors.primary },
                { offset: 1, color: s.value > 80 ? '#FF8E8E' : s.value > 50 ? '#FFB732' : techTheme.colors.secondary },
              ],
            },
            borderRadius: [0, 4, 4, 0],
          },
        })).reverse(),
        barWidth: 12,
        label: {
          show: true,
          position: 'right',
          color: techTheme.text.secondary,
          fontSize: 10,
          formatter: '{c}%',
        },
      }],
    };

    return (
      <div style={{
        background: 'rgba(0, 212, 255, 0.05)',
        border: '1px solid rgba(0, 212, 255, 0.2)',
        borderRadius: '8px',
        padding: '12px',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '8px',
        }}>
          <Zap size={16} style={{ color: techTheme.colors.warning }} />
          <span style={{ color: techTheme.colors.warning, fontSize: '12px', fontWeight: '600' }}>工作饱和度</span>
        </div>
        <ReactECharts option={option} style={{ height: '150px' }} />
      </div>
    );
  };

  // 商机转化漏斗
  const renderConversionFunnel = () => {
    const stages = data.opportunityStages || [];
    const stageLabels: Record<string, string> = {
      prospecting: '挖掘中',
      qualified: '已验证',
      proposal: '方案阶段',
      negotiation: '谈判中',
      won: '赢单',
      lost: '输单',
    };
    
    const funnelData = stages
      .filter(s => s.stage && s.stage !== 'lost')
      .map(s => ({
        name: stageLabels[s.stage] || s.stage,
        value: s.count,
      }));

    const option = {
      series: [{
        type: 'funnel',
        data: funnelData,
        width: '70%',
        gap: 2,
        label: {
          show: true,
          position: 'inside',
          color: '#fff',
          fontSize: 10,
        },
        itemStyle: {
          borderWidth: 0,
        },
        emphasis: {
          label: {
            fontSize: 12,
          },
        },
      }],
      color: [techTheme.colors.primary, techTheme.colors.secondary, techTheme.colors.success, techTheme.colors.warning],
    };

    return (
      <div style={{
        background: 'rgba(0, 212, 255, 0.05)',
        border: '1px solid rgba(0, 212, 255, 0.2)',
        borderRadius: '8px',
        padding: '12px',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '8px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Target size={16} style={{ color: techTheme.colors.success }} />
            <span style={{ color: techTheme.colors.success, fontSize: '12px', fontWeight: '600' }}>商机转化</span>
          </div>
          <div style={{
            padding: '2px 8px',
            background: 'rgba(0, 255, 136, 0.2)',
            borderRadius: '4px',
            color: techTheme.colors.success,
            fontSize: '11px',
          }}>
            转化率: {data.conversionRate || 0}%
          </div>
        </div>
        <ReactECharts option={option} style={{ height: '120px' }} />
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {renderTopPerformers()}
      {renderWorkSaturation()}
      {renderConversionFunnel()}
    </div>
  );
}

// ==================== 客户数据面板 ====================
interface CustomersPanelProps {
  data: CustomersPanelData | null;
}

export function CustomersPanel({ data }: CustomersPanelProps) {
  if (!data) {
    return <div style={{ color: techTheme.text.secondary, textAlign: 'center', padding: '20px' }}>加载中...</div>;
  }

  // 重点客户
  const renderTopCustomers = () => {
    const customers = data.topCustomers || [];
    if (customers.length === 0) {
      return <div style={{ color: techTheme.text.secondary, textAlign: 'center', padding: '20px' }}>暂无数据</div>;
    }

    return (
      <div style={{
        background: 'rgba(0, 212, 255, 0.05)',
        border: '1px solid rgba(0, 212, 255, 0.2)',
        borderRadius: '8px',
        padding: '12px',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '12px',
        }}>
          <Users size={16} style={{ color: techTheme.colors.primary }} />
          <span style={{ color: techTheme.colors.primary, fontSize: '12px', fontWeight: '600' }}>重点客户</span>
        </div>
        <ExpandablePanelSection
          title="客户价值排名"
          drawerTitle="重点客户完整榜单"
          drawerDescription="查看当前统计周期内的客户价值、项目数量和区域分布。"
          objectType="customer"
          items={customers}
          emptyText="暂无重点客户数据"
          compactCount={3}
          renderCompactItem={(c, i) => (
            <div key={c.id} style={{ ...compactCardStyle, borderBottom: i < 2 ? '1px solid rgba(0, 212, 255, 0.1)' : compactCardStyle.border, display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: techTheme.text.primary, fontSize: '12px', ...twoLineClampStyle }}>{c.name}</div>
                <div style={{ color: techTheme.text.secondary, fontSize: '10px', marginTop: '4px' }}>{c.region || '未分配区域'}</div>
              </div>
              <div style={{ textAlign: 'right', minWidth: '72px', flexShrink: 0 }}>
                <div style={{ color: techTheme.colors.primary, fontSize: '12px', fontWeight: '600', wordBreak: 'break-word' }}>¥{(c.amount / 10000).toFixed(0)}万</div>
                <div style={{ color: techTheme.text.secondary, fontSize: '10px' }}>{c.projectCount}个项目</div>
              </div>
            </div>
          )}
          renderDetailItem={(c) => (
            <div key={c.id} style={detailCardStyle}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: techTheme.text.primary, fontSize: '14px', fontWeight: '700' }}>{c.name}</div>
                  <div style={{ color: techTheme.text.secondary, fontSize: '11px', marginTop: '4px' }}>{c.region || '未分配区域'} / {c.type}</div>
                </div>
                <div style={{ color: techTheme.colors.primary, fontSize: '13px', fontWeight: '700', textAlign: 'right' }}>¥{(c.amount / 10000).toFixed(1)}万</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px' }}>
                <div style={{ color: techTheme.text.secondary, fontSize: '11px' }}>项目数量</div>
                <div style={{ color: '#E6F5FF', fontSize: '11px', textAlign: 'right' }}>{c.projectCount} 个</div>
                <div style={{ color: techTheme.text.secondary, fontSize: '11px' }}>合作年限</div>
                <div style={{ color: '#E6F5FF', fontSize: '11px', textAlign: 'right' }}>{c.cooperationYears || 0} 年</div>
              </div>
            </div>
          )}
        />
      </div>
    );
  };

  // 区域分布饼图
  const renderRegionPie = () => {
    const regions = data.regionDistribution || [];
    
    const option = {
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c}个 ({d}%)',
      },
      series: [{
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['50%', '50%'],
        data: regions.slice(0, 6).map(r => ({
          name: r.name || '未知',
          value: r.value,
        })),
        label: {
          show: true,
          color: techTheme.text.secondary,
          fontSize: 10,
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 12,
            fontWeight: 'bold',
          },
        },
      }],
      color: [techTheme.colors.primary, techTheme.colors.secondary, techTheme.colors.success, techTheme.colors.warning, techTheme.colors.danger, '#9B59B6'],
    };

    return (
      <div style={{
        background: 'rgba(0, 212, 255, 0.05)',
        border: '1px solid rgba(0, 212, 255, 0.2)',
        borderRadius: '8px',
        padding: '12px',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '8px',
        }}>
          <span style={{ color: techTheme.colors.primary, fontSize: '12px', fontWeight: '600' }}>区域分布</span>
        </div>
        <ReactECharts option={option} style={{ height: '150px' }} />
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {renderTopCustomers()}
      {renderRegionPie()}
    </div>
  );
}

// ==================== 项目数据面板 ====================
interface ProjectsPanelProps {
  data: ProjectsPanelData | null;
}

export function ProjectsPanel({ data }: ProjectsPanelProps) {
  if (!data) {
    return <div style={{ color: techTheme.text.secondary, textAlign: 'center', padding: '20px' }}>加载中...</div>;
  }

  const stageLabels: Record<string, string> = {
    opportunity: '商机',
    bidding: '投标',
    execution: '执行',
    settlement: '结算',
    archived: '归档',
  };

  // 最近项目
  const renderRecentProjects = () => {
    const projects = data.recentProjects || [];
    if (projects.length === 0) {
      return <div style={{ color: techTheme.text.secondary, textAlign: 'center', padding: '20px' }}>暂无数据</div>;
    }

    return (
      <div style={{
        background: 'rgba(0, 212, 255, 0.05)',
        border: '1px solid rgba(0, 212, 255, 0.2)',
        borderRadius: '8px',
        padding: '12px',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '12px',
        }}>
          <FolderKanban size={16} style={{ color: techTheme.colors.primary }} />
          <span style={{ color: techTheme.colors.primary, fontSize: '12px', fontWeight: '600' }}>最近项目</span>
        </div>
        <ExpandablePanelSection
          title="最近更新项目"
          drawerTitle="最近项目完整清单"
          drawerDescription="查看当前项目阶段、客户和金额信息。"
          objectType="project"
          items={projects}
          emptyText="暂无近期项目数据"
          compactCount={3}
          renderCompactItem={(p, i) => (
            <div key={p.id} style={{ ...compactCardStyle, borderBottom: i < 2 ? '1px solid rgba(0, 212, 255, 0.1)' : compactCardStyle.border, display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{
                padding: '2px 6px',
                background: p.stage === 'execution' ? 'rgba(0, 255, 136, 0.2)' : 'rgba(0, 212, 255, 0.2)',
                borderRadius: '4px',
                color: p.stage === 'execution' ? techTheme.colors.success : techTheme.colors.primary,
                fontSize: '9px',
                flexShrink: 0,
                marginTop: '2px',
              }}>
                {stageLabels[p.stage] || p.stage}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: techTheme.text.primary, fontSize: '12px', ...twoLineClampStyle }}>{p.name}</div>
                <div style={{ color: techTheme.text.secondary, fontSize: '10px', marginTop: '4px', ...twoLineClampStyle }}>{p.customerName}</div>
              </div>
              <div style={{ color: techTheme.colors.primary, fontSize: '12px', fontWeight: '600', textAlign: 'right', minWidth: '74px', flexShrink: 0, wordBreak: 'break-word' }}>¥{(p.amount / 10000).toFixed(0)}万</div>
            </div>
          )}
          renderDetailItem={(p) => (
            <div key={p.id} style={detailCardStyle}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: techTheme.text.primary, fontSize: '14px', fontWeight: '700' }}>{p.name}</div>
                  <div style={{ color: techTheme.text.secondary, fontSize: '11px', marginTop: '4px' }}>{p.customerName}</div>
                </div>
                <div style={{ color: techTheme.colors.primary, fontSize: '13px', fontWeight: '700', textAlign: 'right' }}>¥{(p.amount / 10000).toFixed(1)}万</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px' }}>
                <div style={{ color: techTheme.text.secondary, fontSize: '11px' }}>当前阶段</div>
                <div style={{ color: '#E6F5FF', fontSize: '11px', textAlign: 'right' }}>{stageLabels[p.stage] || p.stage}</div>
                <div style={{ color: techTheme.text.secondary, fontSize: '11px' }}>项目状态</div>
                <div style={{ color: '#E6F5FF', fontSize: '11px', textAlign: 'right' }}>{p.status}</div>
                <div style={{ color: techTheme.text.secondary, fontSize: '11px' }}>最近更新时间</div>
                <div style={{ color: '#E6F5FF', fontSize: '11px', textAlign: 'right' }}>{p.time}</div>
              </div>
            </div>
          )}
        />
      </div>
    );
  };

  // 阶段分布
  const renderStageDistribution = () => {
    const stages = data.stageDistribution || [];
    
    const option = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
      },
      grid: {
        top: 10,
        right: 20,
        bottom: 30,
        left: 40,
      },
      xAxis: {
        type: 'category',
        data: stages.map(s => stageLabels[s.stage] || s.stage),
        axisLine: { lineStyle: { color: 'rgba(0, 212, 255, 0.3)' } },
        axisLabel: { color: techTheme.text.secondary, fontSize: 10 },
      },
      yAxis: {
        type: 'value',
        axisLine: { show: false },
        axisLabel: { color: techTheme.text.secondary, fontSize: 10 },
        splitLine: { lineStyle: { color: 'rgba(0, 212, 255, 0.1)' } },
      },
      series: [{
        type: 'bar',
        data: stages.map(s => s.count),
        itemStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: techTheme.colors.primary },
              { offset: 1, color: techTheme.colors.secondary },
            ],
          },
          borderRadius: [4, 4, 0, 0],
        },
        barWidth: 20,
      }],
    };

    return (
      <div style={{
        background: 'rgba(0, 212, 255, 0.05)',
        border: '1px solid rgba(0, 212, 255, 0.2)',
        borderRadius: '8px',
        padding: '12px',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '8px',
        }}>
          <span style={{ color: techTheme.colors.primary, fontSize: '12px', fontWeight: '600' }}>阶段分布</span>
        </div>
        <ReactECharts option={option} style={{ height: '150px' }} />
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {renderRecentProjects()}
      {renderStageDistribution()}
    </div>
  );
}

// ==================== 解决方案数据面板 ====================
interface SolutionsPanelProps {
  data: SolutionsPanelData | null;
}

export function SolutionsPanel({ data }: SolutionsPanelProps) {
  if (!data) {
    return <div style={{ color: techTheme.text.secondary, textAlign: 'center', padding: '20px' }}>加载中...</div>;
  }

  // 热门方案
  const renderTopSolutions = () => {
    const solutions = data.topSolutions || [];
    if (solutions.length === 0) {
      return <div style={{ color: techTheme.text.secondary, textAlign: 'center', padding: '20px' }}>暂无数据</div>;
    }

    return (
      <div style={{
        background: 'rgba(0, 212, 255, 0.05)',
        border: '1px solid rgba(0, 212, 255, 0.2)',
        borderRadius: '8px',
        padding: '12px',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '12px',
        }}>
          <FileText size={16} style={{ color: techTheme.colors.primary }} />
          <span style={{ color: techTheme.colors.primary, fontSize: '12px', fontWeight: '600' }}>热门方案</span>
        </div>
        <ExpandablePanelSection
          title="浏览热度排名"
          drawerTitle="热门方案完整榜单"
          drawerDescription="查看方案的浏览热度、类型和当前状态。"
          objectType="solution"
          items={solutions}
          emptyText="暂无热门方案数据"
          compactCount={3}
          renderCompactItem={(s, i) => (
            <div key={s.id} style={{ ...compactCardStyle, display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{
                width: '20px',
                height: '20px',
                borderRadius: '4px',
                background: i === 0 ? 'linear-gradient(135deg, #FFD700, #FFA500)' : 'rgba(0, 212, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: i === 0 ? '#000' : techTheme.colors.primary,
                fontSize: '10px',
                fontWeight: 'bold',
                flexShrink: 0,
              }}>
                {s.rank}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: techTheme.text.primary, fontSize: '12px', ...twoLineClampStyle }}>{s.name}</div>
                <div style={{ color: techTheme.text.secondary, fontSize: '10px', marginTop: '4px' }}>{s.type}</div>
              </div>
              <div style={{ textAlign: 'right', minWidth: '82px', flexShrink: 0 }}>
                <div style={{ color: techTheme.colors.primary, fontSize: '12px', fontWeight: '600', wordBreak: 'break-word' }}>{s.viewCount}次浏览</div>
                <div style={{ color: techTheme.colors.success, fontSize: '10px' }}>{s.status}</div>
              </div>
            </div>
          )}
          renderDetailItem={(s, i) => (
            <div key={s.id} style={detailCardStyle}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: techTheme.text.primary, fontSize: '14px', fontWeight: '700' }}>{i + 1}. {s.name}</div>
                  <div style={{ color: techTheme.text.secondary, fontSize: '11px', marginTop: '4px' }}>{s.type}</div>
                </div>
                <div style={{ color: techTheme.colors.primary, fontSize: '13px', fontWeight: '700', textAlign: 'right' }}>{s.viewCount} 次</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px' }}>
                <div style={{ color: techTheme.text.secondary, fontSize: '11px' }}>当前状态</div>
                <div style={{ color: '#E6F5FF', fontSize: '11px', textAlign: 'right' }}>{s.status}</div>
                <div style={{ color: techTheme.text.secondary, fontSize: '11px' }}>浏览热度</div>
                <div style={{ color: '#E6F5FF', fontSize: '11px', textAlign: 'right' }}>{s.viewCount} 次</div>
              </div>
            </div>
          )}
        />
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {renderTopSolutions()}
    </div>
  );
}

// ==================== 区域详情面板 ====================
interface RegionDetailPanelProps {
  regionData: MapRegionData;
  onClose: () => void;
}

export function RegionDetailPanel({ regionData, onClose }: RegionDetailPanelProps) {
  return (
    <div style={{
      position: 'absolute',
      top: '20px',
      right: '20px',
      width: '300px',
      background: 'rgba(10, 15, 26, 0.95)',
      border: '1px solid rgba(0, 212, 255, 0.3)',
      borderRadius: '8px',
      padding: '16px',
      zIndex: 100,
      animation: 'slideInRight 0.3s ease-out',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
      }}>
        <h3 style={{ color: techTheme.colors.primary, fontSize: '14px', margin: 0 }}>{regionData.name}</h3>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: techTheme.text.secondary,
            cursor: 'pointer',
          }}
        >
          ✕
        </button>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div style={{
          padding: '12px',
          background: 'rgba(0, 212, 255, 0.1)',
          borderRadius: '6px',
        }}>
          <div style={{ color: techTheme.text.secondary, fontSize: '10px', marginBottom: '4px' }}>客户数量</div>
          <div style={{ color: techTheme.colors.primary, fontSize: '18px', fontWeight: '600' }}>{regionData.customerCount || 0}</div>
        </div>
        <div style={{
          padding: '12px',
          background: 'rgba(0, 255, 136, 0.1)',
          borderRadius: '6px',
        }}>
          <div style={{ color: techTheme.text.secondary, fontSize: '10px', marginBottom: '4px' }}>项目数量</div>
          <div style={{ color: techTheme.colors.success, fontSize: '18px', fontWeight: '600' }}>{regionData.projectCount || 0}</div>
        </div>
        <div style={{
          padding: '12px',
          background: 'rgba(255, 165, 0, 0.1)',
          borderRadius: '6px',
        }}>
          <div style={{ color: techTheme.text.secondary, fontSize: '10px', marginBottom: '4px' }}>项目金额</div>
          <div style={{ color: techTheme.colors.warning, fontSize: '18px', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>¥{((regionData.projectAmount || 0) / 10000).toFixed(0)}万</div>
        </div>
        <div style={{
          padding: '12px',
          background: 'rgba(255, 107, 107, 0.1)',
          borderRadius: '6px',
        }}>
          <div style={{ color: techTheme.text.secondary, fontSize: '10px', marginBottom: '4px' }}>中标金额</div>
          <div style={{ color: techTheme.colors.danger, fontSize: '18px', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>¥{((regionData.contractAmount || 0) / 10000).toFixed(0)}万</div>
        </div>
      </div>
    </div>
  );
}

// ==================== 实时数据面板 ====================
export function RealTimeDataPanel() {
  return (
    <div data-testid="data-screen-realtime-panel" style={{
      background: 'rgba(0, 212, 255, 0.05)',
      border: '1px solid rgba(0, 212, 255, 0.2)',
      borderRadius: '8px',
      padding: '12px',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '12px',
      }}>
        <span style={{ color: techTheme.colors.success, fontSize: '12px', fontWeight: '600' }}>实时动态</span>
        <div style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: techTheme.colors.success,
          animation: 'pulse 2s infinite',
        }} />
      </div>
      <div style={{ color: techTheme.text.secondary, fontSize: '11px', textAlign: 'center', padding: '20px' }}>
        暂无实时数据
      </div>
    </div>
  );
}

interface PersonalFocusPanelProps {
  summary: WorkbenchSummaryData;
  isLoading?: boolean;
}

interface PresalesFocusPanelProps {
  summary: PresalesFocusSummaryData;
  isLoading?: boolean;
}

interface ManagementFocusPanelProps {
  overviewMetrics: {
    totalCustomers: number;
    totalProjects: number;
    totalRevenue: number;
    wonProjects: number;
  };
  topRevenueRegions: Array<{
    name: string;
    value: number;
    amount: number;
  }>;
  forecastSummary?: {
    coverageRate: number;
    gapAmount: number;
  } | null;
  riskSummary?: {
    high: number;
    total: number;
  } | null;
  isLoading?: boolean;
}

interface BusinessFocusPanelProps {
  funnel?: {
    totalOpenCount: number;
    totalOpenAmount: number;
    avgWinProbability: number;
    missingWinProbabilityCount: number;
    stages: Array<{
      key: string;
      label: string;
      count: number;
      amount: number;
    }>;
  } | null;
  topRegions: Array<{
    name: string;
    value: number;
    amount: number;
  }>;
  riskSummary?: {
    overdueActions: number;
    dueThisWeek: number;
  } | null;
  isLoading?: boolean;
}

// ==================== 快速统计面板 ====================
interface QuickStatsPanelProps {
  data: MapRegionData[];
}

interface FunnelSummaryPanelProps {
  funnel?: {
    totalOpenCount: number;
    totalOpenAmount: number;
    weightedPipeline: number;
    avgWinProbability: number;
    missingWinProbabilityCount: number;
    stages: Array<{
      key: string;
      label: string;
      count: number;
      amount: number;
      weightedAmount: number;
    }>;
  } | null;
  isLoading?: boolean;
}

interface RiskSummaryPanelProps {
  riskSummary?: {
    total: number;
    high: number;
    medium: number;
    overdueActions: number;
    overdueBids: number;
    staleProjects: number;
    dueThisWeek: number;
    items: Array<{
      projectId: number;
      projectName: string;
      region: string;
      stage: string;
      riskLevel: 'high' | 'medium';
      score: number;
      amount: number;
      winProbability: number;
      reason: string;
    }>;
  } | null;
  isLoading?: boolean;
}

interface ForecastSummaryPanelProps {
  forecastSummary?: {
    targetBasis: string;
    targetLabel: string;
    periodDays: number;
    targetAmount: number;
    currentWonAmount: number;
    forecastAmount: number;
    weightedOpenAmount: number;
    gapAmount: number;
    coverageRate: number;
    averageWinProbability: number;
    requiredNewOpportunityAmount: number;
    confidence: 'on-track' | 'watch' | 'gap';
  } | null;
  isLoading?: boolean;
}

function formatWan(amount: number) {
  return `¥${(amount / 10000).toFixed(amount >= 1000000 ? 0 : 1)}万`;
}

const cockpitLinkStyle: React.CSSProperties = {
  color: techTheme.colors.primary,
  fontSize: '10px',
  fontWeight: 600,
  textDecoration: 'none',
};

function getPersonalPriorityLabel(priority: string) {
  switch (priority) {
    case 'urgent':
      return '紧急';
    case 'high':
      return '高优先';
    case 'low':
      return '低优先';
    default:
      return '中优先';
  }
}

function getPersonalSourceLabel(source: string) {
  switch (source) {
    case 'todo':
      return '待办';
    case 'task':
      return '任务';
    case 'schedule':
      return '日程';
    default:
      return '事项';
  }
}

export function PersonalFocusPanel({ summary, isLoading = false }: PersonalFocusPanelProps) {
  const personalMetricItems = [
    { label: '我的项目', value: summary.stats.myProjects, color: techTheme.colors.primary, testId: 'data-screen-personal-focus-my-projects' },
    { label: '待办动作', value: summary.stats.pendingTodos, color: techTheme.colors.success, testId: 'data-screen-personal-focus-pending-todos' },
    { label: '风险事项', value: summary.stats.pendingAlerts, color: '#FF8A65', testId: 'data-screen-personal-focus-pending-alerts' },
    { label: '未读消息', value: summary.stats.unreadMessages, color: techTheme.colors.warning, testId: 'data-screen-personal-focus-unread-messages' },
  ];

  return (
    <div data-testid="data-screen-personal-focus-panel" style={{
      background: 'rgba(255, 138, 101, 0.06)',
      border: '1px solid rgba(255, 138, 101, 0.22)',
      borderRadius: '8px',
      padding: '12px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <Users size={16} style={{ color: '#FF8A65' }} />
        <span style={{ color: '#FF8A65', fontSize: '12px', fontWeight: '600' }}>个人推进视图</span>
      </div>

      {isLoading ? (
        <div style={{ color: techTheme.text.secondary, fontSize: '11px', textAlign: 'center', padding: '18px 0' }}>个人工作台摘要加载中...</div>
      ) : (
        <>
          <FocusPreviewChart
            title="个人事项压力"
            variant="gauges"
            emptyText="暂无个人事项数据"
            items={personalMetricItems.map((item) => ({
              label: item.label,
              value: String(item.value),
              ratio: Math.min(1, Number(item.value) / Math.max(1, Math.max(...personalMetricItems.map((metric) => Number(metric.value))))),
              accentColor: item.color,
            }))}
          />

          <FocusMetricGrid items={personalMetricItems} />

          <div style={{ marginBottom: '12px' }}>
            <ExpandablePanelSection
              title="今日优先队列"
              drawerTitle="个人优先事项清单"
              drawerDescription="查看当前需要优先推进的任务、待办和日程。"
              objectType="personnel-item"
              items={summary.focusQueue}
              emptyText="当前没有需要优先推进的事项"
              compactCount={2}
              renderCompactItem={(item) => (
                <Link key={item.id} href={item.href} style={{ textDecoration: 'none' }}>
                  <div style={compactCardStyle}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                      <span style={{ color: techTheme.text.primary, fontSize: '11px', fontWeight: '600', ...twoLineClampStyle }}>{item.title}</span>
                      <span style={{ color: '#FF8A65', fontSize: '10px', whiteSpace: 'nowrap', flexShrink: 0 }}>{getPersonalSourceLabel(item.source)}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginTop: '6px' }}>
                      <span style={{ color: techTheme.text.secondary, fontSize: '10px', ...twoLineClampStyle }}>{item.description || item.meta || '优先处理事项'}</span>
                      <span style={{ color: techTheme.colors.warning, fontSize: '10px', whiteSpace: 'nowrap', flexShrink: 0 }}>{getPersonalPriorityLabel(item.priority)}</span>
                    </div>
                  </div>
                </Link>
              )}
              renderDetailItem={(item) => (
                <Link key={item.id} href={item.href} style={{ textDecoration: 'none' }}>
                  <div style={detailCardStyle}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ color: techTheme.text.primary, fontSize: '14px', fontWeight: '700' }}>{item.title}</div>
                        <div style={{ color: techTheme.text.secondary, fontSize: '11px', marginTop: '4px' }}>{item.description || item.meta || '优先处理事项'}</div>
                      </div>
                      <div style={{ color: '#FF8A65', fontSize: '11px', fontWeight: '600', flexShrink: 0 }}>{getPersonalSourceLabel(item.source)}</div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', color: techTheme.text.secondary, fontSize: '11px' }}>
                      <span>{getPersonalPriorityLabel(item.priority)}</span>
                      <span>{item.meta || '立即查看详情'}</span>
                    </div>
                  </div>
                </Link>
              )}
            />
          </div>

          <div>
            <ExpandablePanelSection
              title="我的重点项目"
              drawerTitle="个人重点项目清单"
              drawerDescription="查看当前重点项目的推进度、客户和状态。"
              objectType="project"
              items={summary.starredProjects}
              emptyText="当前没有重点项目关注项"
              compactCount={2}
              renderCompactItem={(project) => (
                <Link key={project.id} href={`/projects/${project.id}`} style={{ textDecoration: 'none' }}>
                  <div style={compactCardStyle}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                      <span style={{ color: techTheme.text.primary, fontSize: '11px', fontWeight: '600', ...twoLineClampStyle }}>{project.projectName}</span>
                      <span style={{ color: techTheme.colors.primary, fontSize: '10px', whiteSpace: 'nowrap', flexShrink: 0 }}>{project.progress}%</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginTop: '6px' }}>
                      <span style={{ color: techTheme.text.secondary, fontSize: '10px', ...twoLineClampStyle }}>{project.customerName || '未关联客户'}</span>
                      <span style={{ color: techTheme.colors.success, fontSize: '10px', whiteSpace: 'nowrap', flexShrink: 0 }}>{project.statusLabel || project.status}</span>
                    </div>
                  </div>
                </Link>
              )}
              renderDetailItem={(project) => (
                <Link key={project.id} href={`/projects/${project.id}`} style={{ textDecoration: 'none' }}>
                  <div style={detailCardStyle}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ color: techTheme.text.primary, fontSize: '14px', fontWeight: '700' }}>{project.projectName}</div>
                        <div style={{ color: techTheme.text.secondary, fontSize: '11px', marginTop: '4px' }}>{project.customerName || '未关联客户'}</div>
                      </div>
                      <div style={{ color: techTheme.colors.primary, fontSize: '12px', fontWeight: '700', flexShrink: 0 }}>{project.progress}%</div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', color: techTheme.text.secondary, fontSize: '11px' }}>
                      <span>{project.statusLabel || project.status}</span>
                      <span>进入项目详情</span>
                    </div>
                  </div>
                </Link>
              )}
            />
          </div>

          <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: techTheme.text.secondary, fontSize: '10px', ...singleLineTextStyle }}>个人看板来自工作台读模型</span>
            <Link href="/workbench" data-testid="data-screen-personal-focus-open-workbench" style={cockpitLinkStyle}>
              打开工作台
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

function getServiceCategoryLabel(category: string) {
  switch (category) {
    case 'analysis':
      return '需求分析';
    case 'design':
      return '方案设计';
    case 'presentation':
      return '演示汇报';
    case 'negotiation':
      return '答疑谈判';
    default:
      return category || '其他';
  }
}

function getProjectStageLabel(stage: string) {
  switch (stage) {
    case 'opportunity':
      return '商机';
    case 'bidding':
      return '投标';
    case 'execution':
      return '执行';
    case 'archived':
      return '归档';
    default:
      return stage || '未分类';
  }
}

export function PresalesFocusPanel({ summary, isLoading = false }: PresalesFocusPanelProps) {
  const missingWorklogRecordCount = summary.summary.missingWorklogRecordCount || 0;
  const presalesMetricItems = [
    { label: '支持工时', value: `${summary.summary.totalSupportHours.toFixed(1)}h`, color: '#FFB020', testId: 'data-screen-presales-total-hours' },
    { label: '支撑项目', value: summary.summary.activeSupportProjects, color: techTheme.colors.primary, testId: 'data-screen-presales-active-projects' },
    { label: '高负载人员', value: summary.summary.overloadedStaffCount, color: '#FF8A65', testId: 'data-screen-presales-overloaded-staff' },
    { label: '复用覆盖率', value: `${summary.summary.solutionReuseCoverageRate}%`, color: techTheme.colors.success, testId: 'data-screen-presales-solution-reuse-rate' },
  ];

  return (
    <div data-testid="data-screen-presales-focus-panel" style={{
      background: 'rgba(255, 176, 32, 0.08)',
      border: '1px solid rgba(255, 176, 32, 0.22)',
      borderRadius: '8px',
      padding: '12px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <Award size={16} style={{ color: '#FFB020' }} />
        <span style={{ color: '#FFB020', fontSize: '12px', fontWeight: '600' }}>售前支持负载</span>
      </div>

      {isLoading ? (
        <div style={{ color: techTheme.text.secondary, fontSize: '11px', textAlign: 'center', padding: '18px 0' }}>售前支持摘要加载中...</div>
      ) : (
        <>
          {missingWorklogRecordCount > 0 ? (
            <div
              data-testid="data-screen-presales-worklog-warning"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '12px',
                padding: '8px 10px',
                borderRadius: '6px',
                background: 'rgba(255, 138, 101, 0.12)',
                border: '1px solid rgba(255, 138, 101, 0.25)',
                color: '#FFB020',
                fontSize: '10px',
              }}
            >
              <AlertTriangle size={14} />
              <span>{missingWorklogRecordCount} 条支撑记录未填工时，当前 0h 不代表无负载</span>
            </div>
          ) : null}

          <FocusPreviewChart
            title="支撑类型节奏"
            variant="columns"
            emptyText="暂无支撑类型统计"
            items={summary.serviceMix.slice(0, 4).map((item) => ({
              label: getServiceCategoryLabel(item.category),
              value: `${item.serviceCount} 次`,
              ratio: Math.min(1, item.totalHours / Math.max(1, ...summary.serviceMix.map((entry) => entry.totalHours || 0))),
              accentColor: '#FFB020',
            }))}
          />

          <FocusMetricGrid items={presalesMetricItems} />

          <div style={{ marginBottom: '12px' }}>
            <ExpandablePanelSection
              title="高负载售前"
              drawerTitle="售前负载明细"
              drawerDescription="查看高负载人员的工时、支撑项目和服务频次。"
              objectType="project"
              items={summary.topStaffLoad}
              emptyText="当前时间范围内暂无售前支撑记录"
              compactCount={2}
              renderCompactItem={(item) => (
                <div key={item.staffId} style={compactCardStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <span style={{ color: techTheme.text.primary, fontSize: '11px', fontWeight: '600', minWidth: 0, ...twoLineClampStyle }}>{item.name}</span>
                    <span style={{ color: '#FFB020', fontSize: '10px', whiteSpace: 'nowrap', flexShrink: 0 }}>{item.totalHours.toFixed(1)}h</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', color: techTheme.text.secondary, fontSize: '10px' }}>
                    <span>{item.projectCount} 个项目</span>
                    <span>{item.serviceCount} 次支撑</span>
                  </div>
                </div>
              )}
              renderDetailItem={(item) => (
                <div key={item.staffId} style={detailCardStyle}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ color: techTheme.text.primary, fontSize: '14px', fontWeight: '700' }}>{item.name}</div>
                      <div style={{ color: techTheme.text.secondary, fontSize: '11px', marginTop: '4px' }}>{item.projectCount} 个项目 / {item.serviceCount} 次支撑</div>
                    </div>
                    <div style={{ color: '#FFB020', fontSize: '12px', fontWeight: '700', flexShrink: 0 }}>{item.totalHours.toFixed(1)}h</div>
                  </div>
                </div>
              )}
            />
          </div>

          <div style={{ marginBottom: '12px' }}>
            <ExpandablePanelSection
              title="重点支撑项目"
              drawerTitle="售前支撑项目清单"
              drawerDescription="查看重点支撑项目的工时消耗、阶段和协同人数。"
              objectType="project"
              items={summary.keyProjects}
              emptyText="暂无重点支撑项目"
              compactCount={2}
              renderCompactItem={(project) => (
                <Link key={project.projectId} href={`/projects/${project.projectId}`} style={{ textDecoration: 'none' }}>
                  <div style={compactCardStyle}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                      <span style={{ color: techTheme.text.primary, fontSize: '11px', fontWeight: '600', minWidth: 0, ...twoLineClampStyle }}>{project.projectName}</span>
                      <span style={{ color: techTheme.colors.primary, fontSize: '10px', whiteSpace: 'nowrap', flexShrink: 0 }}>{project.supportHours.toFixed(1)}h</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', color: techTheme.text.secondary, fontSize: '10px', gap: '8px' }}>
                      <span style={{ ...twoLineClampStyle }}>{project.region} / {getProjectStageLabel(project.stage)}</span>
                      <span style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>{project.participantCount} 人协同</span>
                    </div>
                  </div>
                </Link>
              )}
              renderDetailItem={(project) => (
                <Link key={project.projectId} href={`/projects/${project.projectId}`} style={{ textDecoration: 'none' }}>
                  <div style={detailCardStyle}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ color: techTheme.text.primary, fontSize: '14px', fontWeight: '700' }}>{project.projectName}</div>
                        <div style={{ color: techTheme.text.secondary, fontSize: '11px', marginTop: '4px' }}>{project.region} / {getProjectStageLabel(project.stage)}</div>
                      </div>
                      <div style={{ color: techTheme.colors.primary, fontSize: '12px', fontWeight: '700', flexShrink: 0 }}>{project.supportHours.toFixed(1)}h</div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', color: techTheme.text.secondary, fontSize: '11px' }}>
                      <span>{project.participantCount} 人协同</span>
                      <span>打开项目详情</span>
                    </div>
                  </div>
                </Link>
              )}
            />
          </div>

          <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: techTheme.text.secondary, fontSize: '10px', ...singleLineTextStyle }}>当前口径按可见项目上的售前服务记录聚合</span>
            <Link href="/staff" data-testid="data-screen-presales-open-staff" style={cockpitLinkStyle}>
              查看人员管理
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

export function ManagementFocusPanel({ overviewMetrics, topRevenueRegions, forecastSummary, riskSummary, isLoading = false }: ManagementFocusPanelProps) {
  const managementMetricItems = [
    { label: '客户总数', value: overviewMetrics.totalCustomers, color: techTheme.colors.primary },
    { label: '项目总数', value: overviewMetrics.totalProjects, color: techTheme.colors.success },
    { label: '中标项目', value: overviewMetrics.wonProjects, color: techTheme.colors.warning },
    { label: '覆盖率', value: `${forecastSummary?.coverageRate || 0}%`, color: (forecastSummary?.coverageRate || 0) >= 100 ? techTheme.colors.success : '#FF8A65' },
  ];

  return (
    <div data-testid="data-screen-management-focus-panel" style={{
      background: 'rgba(0, 212, 255, 0.06)',
      border: '1px solid rgba(0, 212, 255, 0.22)',
      borderRadius: '8px',
      padding: '12px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <Target size={16} style={{ color: techTheme.colors.primary }} />
        <span style={{ color: techTheme.colors.primary, fontSize: '12px', fontWeight: '600' }}>管理层经营总览</span>
      </div>

      {isLoading ? (
        <div style={{ color: techTheme.text.secondary, fontSize: '11px', textAlign: 'center', padding: '18px 0' }}>管理层视图加载中...</div>
      ) : (
        <>
          <FocusPreviewChart
            title="区域金额格局"
            variant="bars"
            emptyText="暂无区域金额贡献数据"
            items={topRevenueRegions.slice(0, 3).map((region) => ({
              label: region.name,
              value: formatWan(region.amount),
              ratio: Math.min(1, region.amount / Math.max(1, ...topRevenueRegions.map((item) => item.amount || 0))),
              accentColor: techTheme.colors.primary,
            }))}
          />

          <FocusMetricGrid items={managementMetricItems} />

          <div style={{ padding: '8px', borderRadius: '6px', background: 'rgba(0,0,0,0.18)', marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: techTheme.text.secondary, fontSize: '10px', marginBottom: '4px' }}>
              <span style={singleLineTextStyle}>经营收入基线</span>
              <span style={singleLineTextStyle}>高风险 {riskSummary?.high || 0} / 总风险 {riskSummary?.total || 0}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
              <span style={{ color: techTheme.text.primary, fontSize: '13px', fontWeight: '600', ...singleLineTextStyle }}>{formatWan(overviewMetrics.totalRevenue)}</span>
              <span style={{ color: forecastSummary?.gapAmount ? '#FF8A65' : techTheme.colors.success, fontSize: '11px', ...singleLineTextStyle }}>
                {forecastSummary?.gapAmount ? `缺口 ${formatWan(forecastSummary.gapAmount)}` : '当前目标已覆盖'}
              </span>
            </div>
          </div>

          <ExpandablePanelSection
            title="区域金额贡献"
            drawerTitle="区域贡献完整榜单"
            drawerDescription="查看各区域的金额贡献和热区值。"
            objectType="region"
            items={topRevenueRegions}
            emptyText="暂无区域金额贡献数据"
            compactCount={3}
            renderCompactItem={(region) => (
              <div key={region.name} style={compactCardStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <span style={{ color: techTheme.text.primary, fontSize: '11px', fontWeight: '600', minWidth: 0, ...twoLineClampStyle }}>{region.name}</span>
                  <span style={{ color: techTheme.colors.primary, fontSize: '10px', whiteSpace: 'nowrap', flexShrink: 0 }}>{formatWan(region.amount)}</span>
                </div>
                <div style={{ color: techTheme.text.secondary, fontSize: '10px', marginTop: '6px' }}>热点值 {region.value}</div>
              </div>
            )}
            renderDetailItem={(region) => (
              <div key={region.name} style={detailCardStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ color: techTheme.text.primary, fontSize: '14px', fontWeight: '700' }}>{region.name}</div>
                  <div style={{ color: techTheme.colors.primary, fontSize: '12px', fontWeight: '700', flexShrink: 0 }}>{formatWan(region.amount)}</div>
                </div>
                <div style={{ color: techTheme.text.secondary, fontSize: '11px' }}>热点值 {region.value}</div>
              </div>
            )}
          />
        </>
      )}
    </div>
  );
}

export function BusinessFocusPanel({ funnel, topRegions, riskSummary, isLoading = false }: BusinessFocusPanelProps) {
  const hottestStage = [...(funnel?.stages || [])].sort((left, right) => right.amount - left.amount)[0];
  const missingWinProbabilityCount = funnel?.missingWinProbabilityCount || 0;
  const businessMetricItems = [
    { label: '在手机会', value: funnel?.totalOpenCount || 0, color: techTheme.colors.primary },
    { label: '敞口金额', value: formatWan(funnel?.totalOpenAmount || 0), color: techTheme.colors.warning },
    { label: '平均赢率', value: `${funnel?.avgWinProbability || 0}%`, color: techTheme.colors.success },
    { label: '本周到期', value: riskSummary?.dueThisWeek || 0, color: '#FF8A65' },
  ];

  return (
    <div data-testid="data-screen-business-focus-panel" style={{
      background: 'rgba(0, 255, 136, 0.06)',
      border: '1px solid rgba(0, 255, 136, 0.2)',
      borderRadius: '8px',
      padding: '12px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <TrendingUp size={16} style={{ color: techTheme.colors.success }} />
        <span style={{ color: techTheme.colors.success, fontSize: '12px', fontWeight: '600' }}>经营负责人视图</span>
      </div>

      {isLoading ? (
        <div style={{ color: techTheme.text.secondary, fontSize: '11px', textAlign: 'center', padding: '18px 0' }}>经营负责人视图加载中...</div>
      ) : (
        <>
          {missingWinProbabilityCount > 0 ? (
            <div
              data-testid="data-screen-business-win-probability-warning"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '12px',
                padding: '8px 10px',
                borderRadius: '6px',
                background: 'rgba(255, 176, 32, 0.12)',
                border: '1px solid rgba(255, 176, 32, 0.22)',
                color: techTheme.colors.warning,
                fontSize: '10px',
              }}
            >
              <AlertTriangle size={14} />
              <span>{missingWinProbabilityCount} 条在手机会未填赢率，加权合同池按 0 计入</span>
            </div>
          ) : null}

          <FocusPreviewChart
            title="阶段推进节奏"
            variant="columns"
            emptyText="暂无项目阶段数据"
            items={(funnel?.stages || []).slice(0, 4).map((stage) => ({
              label: stage.label,
              value: `${stage.count} 项`,
              ratio: Math.min(1, stage.count / Math.max(1, ...(funnel?.stages || []).map((entry) => entry.count || 0))),
              accentColor: techTheme.colors.success,
            }))}
          />

          <FocusMetricGrid items={businessMetricItems} />

          <div style={{ padding: '8px', borderRadius: '6px', background: 'rgba(0,0,0,0.18)', marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: techTheme.text.secondary, fontSize: '10px', marginBottom: '4px' }}>
              <span style={singleLineTextStyle}>当前最大盘子阶段</span>
              <span style={singleLineTextStyle}>行动逾期 {riskSummary?.overdueActions || 0}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
              <span style={{ color: techTheme.text.primary, fontSize: '13px', fontWeight: '600', ...singleLineTextStyle }}>{hottestStage?.label || '暂无数据'}</span>
              <span style={{ color: techTheme.colors.success, fontSize: '11px', ...singleLineTextStyle }}>{hottestStage ? formatWan(hottestStage.amount) : '-'}</span>
            </div>
          </div>

          <ExpandablePanelSection
            title="商机热区"
            drawerTitle="商机热区完整榜单"
            drawerDescription="查看各区域的商机热度和金额规模。"
            objectType="region"
            items={topRegions}
            emptyText="暂无商机热区数据"
            compactCount={3}
            renderCompactItem={(region) => (
              <div key={region.name} style={compactCardStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <span style={{ color: techTheme.text.primary, fontSize: '11px', fontWeight: '600', minWidth: 0, ...twoLineClampStyle }}>{region.name}</span>
                  <span style={{ color: techTheme.colors.primary, fontSize: '10px', whiteSpace: 'nowrap', flexShrink: 0 }}>{formatWan(region.amount)}</span>
                </div>
                <div style={{ color: techTheme.text.secondary, fontSize: '10px', marginTop: '6px' }}>热点值 {region.value}</div>
              </div>
            )}
            renderDetailItem={(region) => (
              <div key={region.name} style={detailCardStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ color: techTheme.text.primary, fontSize: '14px', fontWeight: '700' }}>{region.name}</div>
                  <div style={{ color: techTheme.colors.primary, fontSize: '12px', fontWeight: '700', flexShrink: 0 }}>{formatWan(region.amount)}</div>
                </div>
                <div style={{ color: techTheme.text.secondary, fontSize: '11px' }}>热点值 {region.value}</div>
              </div>
            )}
          />
        </>
      )}
    </div>
  );
}

export function FunnelSummaryPanel({ funnel, isLoading = false }: FunnelSummaryPanelProps) {
  const maxCount = Math.max(...(funnel?.stages.map((stage) => stage.count) || [0]), 1);

  return (
    <div style={{
      background: 'rgba(0, 212, 255, 0.05)',
      border: '1px solid rgba(0, 212, 255, 0.2)',
      borderRadius: '8px',
      padding: '12px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <TrendingUp size={16} style={{ color: techTheme.colors.primary }} />
        <span style={{ color: techTheme.colors.primary, fontSize: '12px', fontWeight: '600' }}>经营漏斗</span>
      </div>

      {isLoading ? (
        <div style={{ color: techTheme.text.secondary, fontSize: '11px', textAlign: 'center', padding: '18px 0' }}>数据加载中...</div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '12px' }}>
            <div style={{ textAlign: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', padding: '8px 6px' }}>
              <div data-testid="data-screen-funnel-total-open" style={{ color: techTheme.colors.primary, fontSize: '16px', fontWeight: '600' }}>{funnel?.totalOpenCount || 0}</div>
              <div style={{ color: techTheme.text.secondary, fontSize: '10px' }}>在手商机</div>
            </div>
            <div style={{ textAlign: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', padding: '8px 6px' }}>
              <div style={{ color: techTheme.colors.warning, fontSize: '16px', fontWeight: '600' }}>{formatWan(funnel?.totalOpenAmount || 0)}</div>
              <div style={{ color: techTheme.text.secondary, fontSize: '10px' }}>敞口金额</div>
            </div>
            <div style={{ textAlign: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', padding: '8px 6px' }}>
              <div style={{ color: techTheme.colors.success, fontSize: '16px', fontWeight: '600' }}>{funnel?.avgWinProbability || 0}%</div>
              <div style={{ color: techTheme.text.secondary, fontSize: '10px' }}>平均赢率</div>
            </div>
          </div>

          <ExpandablePanelSection
            title="阶段拆解"
            drawerTitle="经营漏斗阶段明细"
            drawerDescription="查看漏斗各阶段的项目数量、金额和相对占比。"
            objectType="project"
            items={funnel?.stages || []}
            emptyText="暂无漏斗阶段数据"
            compactCount={3}
            renderCompactItem={(stage) => (
              <div key={stage.key} style={compactCardStyle}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ color: techTheme.text.primary, fontSize: '11px', minWidth: 0, ...twoLineClampStyle }}>{stage.label}</span>
                  <span style={{ color: techTheme.text.secondary, fontSize: '10px', whiteSpace: 'nowrap', flexShrink: 0 }}>{stage.count}项 / {formatWan(stage.amount)}</span>
                </div>
                <div style={{ height: '6px', borderRadius: '999px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                  <div style={{ width: `${(stage.count / maxCount) * 100}%`, height: '100%', borderRadius: '999px', background: 'linear-gradient(90deg, rgba(0,212,255,0.5), rgba(0,255,136,0.85))' }} />
                </div>
              </div>
            )}
            renderDetailItem={(stage) => (
              <div key={stage.key} style={detailCardStyle}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                  <div style={{ color: techTheme.text.primary, fontSize: '14px', fontWeight: '700' }}>{stage.label}</div>
                  <div style={{ color: techTheme.colors.primary, fontSize: '12px', fontWeight: '700', flexShrink: 0 }}>{stage.count}项</div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', color: techTheme.text.secondary, fontSize: '11px' }}>
                  <span>阶段金额 {formatWan(stage.amount)}</span>
                  <span>加权 {formatWan(stage.weightedAmount)}</span>
                </div>
              </div>
            )}
          />

          <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: techTheme.text.secondary, fontSize: '10px' }}>加权合同池</span>
            <span style={{ color: techTheme.colors.success, fontSize: '12px', fontWeight: '600' }}>{formatWan(funnel?.weightedPipeline || 0)}</span>
          </div>

          <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Link href="/projects?stage=opportunity" data-testid="data-screen-funnel-open-projects-link" style={cockpitLinkStyle}>
              查看在手机会
            </Link>
            <Link href="/projects?stage=bidding" style={cockpitLinkStyle}>
              查看投标推进
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

export function RiskSummaryPanel({ riskSummary, isLoading = false }: RiskSummaryPanelProps) {
  return (
    <div style={{
      background: 'rgba(255, 107, 107, 0.06)',
      border: '1px solid rgba(255, 107, 107, 0.22)',
      borderRadius: '8px',
      padding: '12px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <ShieldAlert size={16} style={{ color: '#FF8A65' }} />
        <span style={{ color: '#FF8A65', fontSize: '12px', fontWeight: '600' }}>风险摘要</span>
      </div>

      {isLoading ? (
        <div style={{ color: techTheme.text.secondary, fontSize: '11px', textAlign: 'center', padding: '18px 0' }}>数据加载中...</div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '12px' }}>
            {[
              { label: '高风险', value: riskSummary?.high || 0, color: '#FF8A65', testId: 'data-screen-risk-high-count' },
              { label: '行动逾期', value: riskSummary?.overdueActions || 0, color: '#FBBF24' },
              { label: '投标临界', value: riskSummary?.overdueBids || 0, color: '#F87171' },
              { label: '本周到期', value: riskSummary?.dueThisWeek || 0, color: techTheme.colors.primary },
            ].map((item) => (
              <div key={item.label} style={{ textAlign: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', padding: '8px 4px' }}>
                <div data-testid={item.testId} style={{ color: item.color, fontSize: '15px', fontWeight: '600' }}>{item.value}</div>
                <div style={{ color: techTheme.text.secondary, fontSize: '10px' }}>{item.label}</div>
              </div>
            ))}
          </div>

          <ExpandablePanelSection
            title="重点风险对象"
            drawerTitle="风险对象完整清单"
            drawerDescription="查看全部高风险与需关注项目，并进入项目或任务中心处理。"
            objectType="risk"
            items={riskSummary?.items || []}
            emptyText="暂无高优先级风险"
            compactCount={2}
            actions={[{ label: '打开任务中心', href: '/tasks?scope=mine&type=alert' }]}
            renderCompactItem={(item) => (
              <div key={item.projectId} style={{ ...compactCardStyle, border: `1px solid ${item.riskLevel === 'high' ? 'rgba(255,138,101,0.28)' : 'rgba(251,191,36,0.22)'}` }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '4px' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ color: techTheme.text.primary, fontSize: '11px', fontWeight: '600', ...twoLineClampStyle }}>{item.projectName}</div>
                    <div style={{ color: techTheme.text.secondary, fontSize: '10px', marginTop: '4px' }}>{item.region} / {item.stage}</div>
                  </div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: item.riskLevel === 'high' ? '#FF8A65' : '#FBBF24', fontSize: '10px', fontWeight: '600', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    <AlertTriangle size={11} />
                    {item.riskLevel === 'high' ? '高风险' : '需关注'}
                  </div>
                </div>
                <div style={{ color: techTheme.text.secondary, fontSize: '10px', ...twoLineClampStyle }}>{item.reason}</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: techTheme.text.secondary, fontSize: '10px', marginTop: '6px' }}>
                  <span>赢率 {item.winProbability}%</span>
                  <span>{formatWan(item.amount)}</span>
                </div>
              </div>
            )}
            renderDetailItem={(item) => (
              <div key={item.projectId} style={{ ...detailCardStyle, border: `1px solid ${item.riskLevel === 'high' ? 'rgba(255,138,101,0.28)' : 'rgba(251,191,36,0.22)'}` }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ color: techTheme.text.primary, fontSize: '14px', fontWeight: '700' }}>{item.projectName}</div>
                    <div style={{ color: techTheme.text.secondary, fontSize: '11px', marginTop: '4px' }}>{item.region} / {item.stage}</div>
                  </div>
                  <div style={{ color: item.riskLevel === 'high' ? '#FF8A65' : '#FBBF24', fontSize: '11px', fontWeight: '700', flexShrink: 0 }}>
                    {item.riskLevel === 'high' ? '高风险' : '需关注'}
                  </div>
                </div>
                <div style={{ color: techTheme.text.secondary, fontSize: '11px' }}>{item.reason}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', color: techTheme.text.secondary, fontSize: '11px' }}>
                  <span>赢率 {item.winProbability}%</span>
                  <span>{formatWan(item.amount)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                  <Link href={`/projects/${item.projectId}`} data-testid={`data-screen-risk-project-link-${item.projectId}`} style={cockpitLinkStyle}>
                    查看项目
                  </Link>
                  <Link href="/tasks?scope=mine&type=alert" style={cockpitLinkStyle}>
                    去任务中心
                  </Link>
                </div>
              </div>
            )}
          />

          <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', color: techTheme.text.secondary, fontSize: '10px' }}>
            <span>中风险 {riskSummary?.medium || 0}</span>
            <span>滞后项目 {riskSummary?.staleProjects || 0}</span>
            <Link href="/tasks?scope=mine&type=alert" data-testid="data-screen-risk-alerts-link" style={cockpitLinkStyle}>
              风险总量 {riskSummary?.total || 0}
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

export function ForecastSummaryPanel({ forecastSummary, isLoading = false }: ForecastSummaryPanelProps) {
  const confidenceColor = forecastSummary?.confidence === 'on-track'
    ? techTheme.colors.success
    : forecastSummary?.confidence === 'watch'
      ? techTheme.colors.warning
      : '#FF8A65';

  return (
    <div data-testid="data-screen-forecast-panel" style={{
      background: 'rgba(251, 191, 36, 0.06)',
      border: '1px solid rgba(251, 191, 36, 0.22)',
      borderRadius: '8px',
      padding: '12px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <Target size={16} style={{ color: techTheme.colors.warning }} />
        <span style={{ color: techTheme.colors.warning, fontSize: '12px', fontWeight: '600' }}>目标与预测</span>
      </div>

      {isLoading ? (
        <div style={{ color: techTheme.text.secondary, fontSize: '11px', textAlign: 'center', padding: '18px 0' }}>数据加载中...</div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '12px' }}>
            <div style={{ textAlign: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', padding: '8px 6px' }}>
              <div data-testid="data-screen-forecast-target-amount" style={{ color: techTheme.colors.warning, fontSize: '15px', fontWeight: '600' }}>{formatWan(forecastSummary?.targetAmount || 0)}</div>
              <div style={{ color: techTheme.text.secondary, fontSize: '10px' }}>目标基线</div>
            </div>
            <div style={{ textAlign: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', padding: '8px 6px' }}>
              <div data-testid="data-screen-forecast-amount" style={{ color: techTheme.colors.success, fontSize: '15px', fontWeight: '600' }}>{formatWan(forecastSummary?.forecastAmount || 0)}</div>
              <div style={{ color: techTheme.text.secondary, fontSize: '10px' }}>预测完成</div>
            </div>
            <div style={{ textAlign: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', padding: '8px 6px' }}>
              <div data-testid="data-screen-forecast-coverage-rate" style={{ color: confidenceColor, fontSize: '15px', fontWeight: '600' }}>{forecastSummary?.coverageRate || 0}%</div>
              <div style={{ color: techTheme.text.secondary, fontSize: '10px' }}>覆盖率</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '12px' }}>
            <div style={{ padding: '8px', borderRadius: '6px', background: 'rgba(0,0,0,0.18)' }}>
              <div style={{ color: techTheme.text.secondary, fontSize: '10px', marginBottom: '4px' }}>已完成金额</div>
              <div style={{ color: techTheme.text.primary, fontSize: '13px', fontWeight: '600' }}>{formatWan(forecastSummary?.currentWonAmount || 0)}</div>
            </div>
            <div style={{ padding: '8px', borderRadius: '6px', background: 'rgba(0,0,0,0.18)' }}>
              <div style={{ color: techTheme.text.secondary, fontSize: '10px', marginBottom: '4px' }}>在手加权补量</div>
              <div style={{ color: techTheme.colors.primary, fontSize: '13px', fontWeight: '600' }}>{formatWan(forecastSummary?.weightedOpenAmount || 0)}</div>
            </div>
          </div>

          <div style={{ padding: '10px', borderRadius: '6px', background: 'rgba(0,0,0,0.18)', border: `1px solid ${forecastSummary?.gapAmount ? 'rgba(255,138,101,0.24)' : 'rgba(0,255,136,0.2)'}` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '6px' }}>
              <span style={{ color: techTheme.text.secondary, fontSize: '10px' }}>预测缺口</span>
              <span data-testid="data-screen-forecast-gap-amount" style={{ color: forecastSummary?.gapAmount ? '#FF8A65' : techTheme.colors.success, fontSize: '12px', fontWeight: '600' }}>{formatWan(forecastSummary?.gapAmount || 0)}</span>
            </div>
            <div style={{ color: techTheme.text.secondary, fontSize: '10px', lineHeight: 1.5 }}>
              {forecastSummary?.gapAmount
                ? `若按当前平均赢率 ${forecastSummary.averageWinProbability}% 估算，还需新增约 ${formatWan(forecastSummary.requiredNewOpportunityAmount)} 商机储备。`
                : '当前在手盘对本周期 run-rate 目标已形成覆盖。'}
            </div>
          </div>

          <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: techTheme.text.secondary, fontSize: '10px' }}>{forecastSummary?.targetLabel || '滚动90天中标 run-rate'}</span>
            <Link href="/projects?stage=opportunity" data-testid="data-screen-forecast-gap-link" style={cockpitLinkStyle}>
              补机会池
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

export function QuickStatsPanel({ data }: QuickStatsPanelProps) {
  const totalCustomers = data.reduce((sum, d) => sum + (d.customerCount || 0), 0);
  const totalProjects = data.reduce((sum, d) => sum + (d.projectCount || 0), 0);
  const totalAmount = data.reduce((sum, d) => sum + (d.projectAmount || 0), 0);

  return (
    <div data-testid="data-screen-quick-stats-panel" style={{
      background: 'rgba(0, 212, 255, 0.05)',
      border: '1px solid rgba(0, 212, 255, 0.2)',
      borderRadius: '8px',
      padding: '12px',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '12px',
      }}>
        <span style={{ color: techTheme.colors.primary, fontSize: '12px', fontWeight: '600' }}>快速统计</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
        <div style={{ textAlign: 'center' }}>
          <div data-testid="data-screen-total-customers" style={{ color: techTheme.colors.primary, fontSize: '16px', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{totalCustomers}</div>
          <div style={{ color: techTheme.text.secondary, fontSize: '10px' }}>客户</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div data-testid="data-screen-total-projects" style={{ color: techTheme.colors.success, fontSize: '16px', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{totalProjects}</div>
          <div style={{ color: techTheme.text.secondary, fontSize: '10px' }}>项目</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div data-testid="data-screen-total-amount" style={{ color: techTheme.colors.warning, fontSize: '16px', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>¥{(totalAmount / 10000).toFixed(0)}万</div>
          <div style={{ color: techTheme.text.secondary, fontSize: '10px' }}>金额</div>
        </div>
      </div>
    </div>
  );
}
