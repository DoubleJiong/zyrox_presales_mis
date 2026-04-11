// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/dashboard/DataScreenRegionInsightDialog', () => ({
  DataScreenRegionInsightDialog: ({
    open,
    title,
    children,
    testId,
    titleTestId,
  }: {
    open: boolean;
    title: string;
    children: React.ReactNode;
    testId: string;
    titleTestId: string;
  }) =>
    open ? (
      <div data-testid={testId}>
        <div data-testid={titleTestId}>{title}</div>
        {children}
      </div>
    ) : null,
}));

import { DataScreenRegionLayout } from '@/components/dashboard/DataScreenRegionLayout';

describe('DataScreenRegionLayout', () => {
  it('renders the DTC-05 summary belt, main grid, and bottom analysis band with dialog-based details', () => {
    render(
      <DataScreenRegionLayout
        summaryMetrics={[
          {
            key: 'customers',
            label: '客户总览',
            value: '128',
            detail: '覆盖 8 个活跃区域',
            accentColor: '#00D4FF',
            variant: 'hero',
            secondaryMetrics: [
              { label: '异常区域', value: '2' },
              { label: '售前活动', value: '18' },
            ],
          },
          {
            key: 'projects',
            label: '项目总览',
            value: '64',
            detail: '中标 12 个',
            accentColor: '#00FF88',
            variant: 'hero',
            secondaryMetrics: [
              { label: '项目金额', value: '¥320万' },
              { label: '风险项目', value: '6' },
            ],
          },
        ]}
        viewPresetLabel="管理层视图"
        viewPresetSubtitle="优先看区域贡献、目标覆盖与经营风险。"
        mapScopeLabel="区域热力"
        heatmapLabel="客户总数"
        isRefreshing
        leftZone={<div>left zone</div>}
        centerStage={<div>center stage</div>}
        rightZone={<div>right zone</div>}
        bottomPanels={[
          {
            key: 'customers',
            title: '客户盘子',
            subtitle: '客户分析',
            ctaLabel: '查看客户全景',
            previewSeries: [
              { label: '杭州', value: '18 家', ratio: 1, accentColor: '#00D4FF' },
              { label: '宁波', value: '12 家', ratio: 0.66, accentColor: '#34D399' },
            ],
            content: <div>customer panel</div>,
          },
          { key: 'projects', title: '项目节奏', subtitle: '项目分析', content: <div>project panel</div> },
          { key: 'solutions', title: '方案支撑', subtitle: '方案分析', content: <div>solution panel</div> },
          { key: 'risks', title: '风险价值', subtitle: '风险分析', content: <div>risk panel</div> },
        ]}
      />
    );

    expect(screen.getByTestId('data-screen-region-layout')).toBeInTheDocument();
    expect(screen.getByTestId('data-screen-region-summary-belt')).toBeInTheDocument();
    expect(screen.getByTestId('data-screen-region-summary-card-customers')).toHaveTextContent('客户总览');
    expect(screen.getByTestId('data-screen-region-summary-card-customers')).toHaveTextContent('异常区域');
    expect(screen.getByTestId('data-screen-region-summary-card-projects')).toHaveTextContent('项目总览');
    expect(screen.getByTestId('data-screen-region-left-zone')).toHaveTextContent('left zone');
    expect(screen.getByTestId('data-screen-region-map-stage')).toBeInTheDocument();
    expect(screen.getByTestId('data-screen-region-map-stage')).toHaveTextContent('区域热力');
    expect(screen.getByTestId('data-screen-region-right-zone')).toHaveTextContent('right zone');
    expect(screen.getByTestId('data-screen-region-bottom-band')).toBeInTheDocument();
    expect(screen.getByTestId('data-screen-region-bottom-panel-customers')).toHaveTextContent('客户盘子');
    expect(screen.getByTestId('data-screen-region-bottom-panel-customers')).toHaveTextContent('查看客户全景');
    expect(screen.getByTestId('data-screen-region-bottom-panel-customers-chart')).toHaveTextContent('主图表 / 横向对比');
    expect(screen.getByTestId('data-screen-region-bottom-panel-customers-chart')).toHaveTextContent('杭州');
    expect(screen.getByTestId('data-screen-region-bottom-panel-risks')).toHaveTextContent('风险价值');
    expect(screen.queryByText('customer panel')).not.toBeInTheDocument();
    expect(screen.getByTestId('data-screen-region-refresh-badge')).toHaveTextContent('数据刷新中');

    fireEvent.click(within(screen.getByTestId('data-screen-region-bottom-panel-customers')).getByRole('button', { name: '查看客户全景' }));

    expect(screen.getByTestId('data-screen-region-bottom-drawer')).toBeInTheDocument();
    expect(screen.getByTestId('data-screen-region-bottom-drawer-title')).toHaveTextContent('客户盘子');
    expect(screen.getByText('customer panel')).toBeInTheDocument();
  });
});