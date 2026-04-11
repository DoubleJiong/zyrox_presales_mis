// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/dynamic', () => ({
  default: () => {
    return function DynamicStub(props: {
      data: Array<{ name: string }>;
      onRegionClick?: (region: { name: string }) => void;
      onRequestExpand?: () => void;
    }) {
      return (
        <div data-testid="tech-map-chart-stub">
          <div>{props.data.map((region) => region.name).join(',')}</div>
          <button type="button" title="放大查看地图" onClick={() => props.onRequestExpand?.()}>
            expand
          </button>
          <button type="button" onClick={() => props.onRegionClick?.(props.data[0])}>
            select first region
          </button>
        </div>
      );
    };
  },
}));

vi.mock('@/components/dashboard/DataScreenChrome', () => ({
  HeavyModulePlaceholder: ({ title, subtitle }: { title: string; subtitle: string }) => (
    <div>
      <div>{title}</div>
      <div>{subtitle}</div>
    </div>
  ),
}));

import { DataScreenCenterStage } from '@/components/dashboard/DataScreenCenterStage';
import { MapDataType } from '@/lib/map-types';

describe('DataScreenCenterStage', () => {
  it('renders stage overlay content, supports spotlight actions, and opens the expanded dialog', () => {
    const onRegionSelect = vi.fn();

    render(
      <DataScreenCenterStage
        currentMapType="province-outside"
        currentMapData={[
          { name: '杭州', customerCount: 18, projectCount: 9, projectAmount: 2600000, ongoingProjectAmount: 1200000, preSalesActivity: 6, solutionUsage: 7 },
          { name: '宁波', customerCount: 12, projectCount: 5, projectAmount: 1800000, ongoingProjectAmount: 800000, preSalesActivity: 3, solutionUsage: 4 },
        ]}
        currentDataType={MapDataType.CUSTOMER_COUNT_HEATMAP}
        showMapPlaceholder={false}
        stageMetrics={[
          { label: '异常热区', value: '3', accentColor: '#FF8A65' },
          { label: '客户总数峰值', value: '18', accentColor: '#00D4FF' },
          { label: '行动逾期', value: '2', accentColor: '#FBBF24' },
        ]}
        spotlightRegions={[
          { region: { name: '杭州', customerCount: 18, projectCount: 9, projectAmount: 2600000, ongoingProjectAmount: 1200000 }, value: '18', detail: '客户 18 / 项目 9', accentColor: '#00D4FF' },
          { region: { name: '宁波', customerCount: 12, projectCount: 5, projectAmount: 1800000, ongoingProjectAmount: 800000 }, value: '12', detail: '客户 12 / 项目 5', accentColor: '#34D399' },
        ]}
        alertItems={[
          { region: { name: '绍兴', customerCount: 10, projectCount: 6, projectAmount: 2000000, ongoingProjectAmount: 900000 }, title: '项目预警 / 客户异动 需要优先处理', detail: '10 家客户 / 6 个项目 / 售前 4', accentColor: '#FF8A65' },
        ]}
        onRegionSelect={onRegionSelect}
        onDrillDown={vi.fn()}
      />
    );

    expect(screen.getByTestId('data-screen-center-stage-overlay')).toBeInTheDocument();
    expect(screen.getByTestId('data-screen-center-stage-metrics')).toHaveTextContent('异常热区');
    expect(screen.getByTestId('data-screen-center-stage-spotlight')).toHaveTextContent('重点关注区域');
    expect(screen.getByTestId('data-screen-center-stage-alert-feed')).toHaveTextContent('区域告警流');

    fireEvent.click(screen.getByTestId('data-screen-center-stage-spotlight-杭州'));
    expect(onRegionSelect).toHaveBeenCalledWith(expect.objectContaining({ name: '杭州' }));

    fireEvent.click(screen.getByTestId('data-screen-center-stage-alert-绍兴'));
    expect(onRegionSelect).toHaveBeenCalledWith(expect.objectContaining({ name: '绍兴' }));

    fireEvent.click(screen.getByTitle('放大查看地图'));
    expect(screen.getByTestId('data-screen-map-detail-dialog')).toBeInTheDocument();
    expect(screen.getByText('地图详细查看')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '关闭查看' }));
    expect(screen.queryByTestId('data-screen-map-detail-dialog')).not.toBeInTheDocument();
  });
});