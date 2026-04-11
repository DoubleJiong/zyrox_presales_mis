// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/dynamic', () => ({
  default: () => {
    return function DynamicStub() {
      return <div data-testid="dynamic-module-stub">dynamic module</div>;
    };
  },
}));

vi.mock('@/components/dashboard/DataScreenDrilldownDrawer', () => ({
  DataScreenDrilldownDrawer: ({
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

import { DataScreenLeftRail, DataScreenRightRail } from '@/components/dashboard/DataScreenChrome';
import { MapDataType } from '@/lib/map-types';

describe('DataScreenChrome zone rails', () => {
  it('renders a summary-first left rail in zone mode and opens the full panel in a drawer', () => {
    render(
      <DataScreenLeftRail
        globalStatsTab="sales"
        onTabChange={vi.fn()}
        activePanelData={{
          topPerformers: [
            { rank: 1, id: 11, name: '张晨', region: '杭州', score: '¥320万', amount: 3200000, activities: 4 },
            { rank: 2, id: 12, name: '李岩', region: '宁波', score: '¥180万', amount: 1800000, activities: 3 },
          ],
          workSaturation: [],
          regionDistribution: [],
          stageDistribution: [],
          opportunityStages: [
            { stage: '投标', count: 6, amount: 2600000 },
            { stage: '商机', count: 4, amount: 1800000 },
          ],
          conversionRate: 42,
          monthlyTrends: [],
          summary: { totalActivities: 18, avgConversionRate: 42, totalAmount: 5600000 },
        }}
        isPanelLoading={false}
        viewPresetLabel="管理层视图"
        viewPresetHelperText="优先看区域贡献、目标覆盖与经营风险。"
        viewPresetAccentColor="#00D4FF"
        variant="zone"
      />
    );

    expect(screen.getByTestId('data-screen-left-rail-zone-summary')).toBeInTheDocument();
    expect(screen.getByText('活动数')).toBeInTheDocument();
    expect(screen.getByText('月度之星')).toBeInTheDocument();
    expect(screen.getAllByText('张晨').length).toBeGreaterThan(0);
    expect(screen.getByTestId('data-screen-left-rail-primary-series')).toBeInTheDocument();
    expect(screen.getByTestId('data-screen-left-rail-secondary-series')).toBeInTheDocument();
    expect(screen.getByText('分析预览 01 / 横向对比')).toBeInTheDocument();
    expect(screen.getByText('分析预览 02 / 柱状节奏')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('data-screen-left-rail-open-detail'));

    expect(screen.getByTestId('data-screen-left-rail-detail-drawer')).toBeInTheDocument();
    expect(screen.getByTestId('data-screen-left-rail-detail-drawer-title')).toHaveTextContent('售前数据完整面板');
  });

  it('renders condensed secondary modules in the right rail and opens a secondary intelligence drawer', () => {
    render(
      <DataScreenRightRail
        activeViewPreset="management"
        activeViewPresetLabel="管理层视图"
        currentDataType={MapDataType.CUSTOMER_COUNT_HEATMAP}
        onDataTypeChange={vi.fn()}
        heatmapLabel="客户总数"
        heatmapUnit="家"
        currentMapData={[
          { name: '杭州', value: 18, customerCount: 18, projectCount: 9, projectAmount: 2600000, contractAmount: 1800000, preSalesActivity: 6, solutionUsage: 7 },
        ]}
        isLazyLoading={false}
        workbenchSummary={{
          summary: { pendingCount: 0, overdueCount: 0, highPriorityCount: 0, stalledCount: 0 },
          starredProjects: [],
          myProjects: [],
        }}
        isWorkbenchLoading={false}
        presalesFocusSummary={{
          summary: { totalSupportHours: 0, activeSupportProjects: 0, overloadedStaffCount: 0, solutionReuseCoverageRate: 0, missingWorklogRecordCount: 0 },
          topStaffLoad: [],
          keyProjects: [],
          serviceMix: [],
        }}
        isPresalesFocusLoading={false}
        overviewMetrics={{ totalCustomers: 80, totalProjects: 36, totalRevenue: 6800000, wonProjects: 8 }}
        topRegions={[{ name: '杭州', value: 18, amount: 2600000 }]}
        topRevenueRegions={[{ name: '杭州', value: 18, amount: 2600000 }]}
        funnel={{ totalOpenCount: 12, totalOpenAmount: 4200000, weightedPipeline: 2100000, avgWinProbability: 46, missingWinProbabilityCount: 0, stages: [] }}
        forecastSummary={{ targetBasis: 'rolling_90d_run_rate', targetLabel: '滚动90天中标 run-rate', periodDays: 30, targetAmount: 5000000, currentWonAmount: 2400000, forecastAmount: 4300000, weightedOpenAmount: 2100000, gapAmount: 700000, coverageRate: 86, averageWinProbability: 46, requiredNewOpportunityAmount: 1600000, confidence: 'watch' }}
        riskSummary={{ total: 6, high: 2, medium: 4, overdueActions: 3, overdueBids: 1, staleProjects: 1, dueThisWeek: 2, items: [] }}
        isOverviewLoading={false}
        variant="zone"
      />
    );

    expect(screen.getByTestId('data-screen-right-rail-secondary-modules')).toBeInTheDocument();
    expect(screen.getByTestId('data-screen-right-rail-secondary-card-funnel')).toHaveTextContent('经营漏斗');
    expect(screen.getByTestId('data-screen-right-rail-secondary-card-risk')).toHaveTextContent('风险摘要');
    expect(screen.getByTestId('data-screen-right-rail-secondary-card-funnel-chart')).toBeInTheDocument();
    expect(screen.getByTestId('data-screen-right-rail-secondary-card-risk-chart')).toBeInTheDocument();
    expect(screen.getByText('在手')).toBeInTheDocument();
    expect(screen.getByText('高风险')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('data-screen-right-rail-secondary-card-risk'));

    expect(screen.getByTestId('data-screen-right-rail-secondary-drawer')).toBeInTheDocument();
    expect(screen.getByTestId('data-screen-right-rail-secondary-drawer-title')).toHaveTextContent('风险摘要');
  });
});