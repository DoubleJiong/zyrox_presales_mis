// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { HeatmapTopRank } from '@/components/dashboard/HeatmapTopRank';
import { MapDataType } from '@/lib/map-types';

describe('HeatmapTopRank', () => {
  it('renders a semantic heatmap ranking card and forwards region clicks', () => {
    const onRegionClick = vi.fn();

    render(
      <HeatmapTopRank
        data={[
          { name: '杭州市', customerCount: 18, projectCount: 9, projectAmount: 2600000, contractAmount: 1800000, preSalesActivity: 6, solutionUsage: 7 },
          { name: '宁波市', customerCount: 12, projectCount: 5, projectAmount: 1800000, contractAmount: 1200000, preSalesActivity: 4, solutionUsage: 3 },
          { name: '温州市', customerCount: 9, projectCount: 4, projectAmount: 1200000, contractAmount: 800000, preSalesActivity: 3, solutionUsage: 2 },
        ]}
        dataType={MapDataType.CUSTOMER_COUNT_HEATMAP}
        label="客户总数"
        unit="家"
        onRegionClick={onRegionClick}
      />
    );

    expect(screen.getByTestId('data-screen-heatmap-top-rank')).toBeInTheDocument();
    expect(screen.getByText('客户总数热区主榜')).toBeInTheDocument();
    expect(screen.getByText('分析图 / 横向对比')).toBeInTheDocument();
    expect(screen.getByText('头部占比')).toBeInTheDocument();
    expect(screen.getByTestId('data-screen-heatmap-top-rank-chart')).toHaveTextContent('杭州市');

    fireEvent.click(screen.getByTestId('data-screen-heatmap-top-rank-item-杭州市'));

    expect(onRegionClick).toHaveBeenCalledWith(expect.objectContaining({ name: '杭州市' }));
  });
});