// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DataScreenTopicLayout } from '@/components/dashboard/DataScreenTopicLayout';

describe('DataScreenTopicLayout', () => {
  it('renders the project risk topic prototype and supports tab switching and project drilldown', () => {
    const onTopicChange = vi.fn();
    const onSelectRiskProject = vi.fn();

    render(
      <DataScreenTopicLayout
        activeTopic="project-risk"
        onTopicChange={onTopicChange}
        regionViewData={{
          filtersEcho: { startDate: '2026-04-01', endDate: '2026-04-08', map: 'province-outside', heatmap: 'customer' },
          summary: { totalCustomers: 10, totalProjects: 8, totalSolutions: 4, totalStaff: 6, totalRevenue: 1000000, wonProjects: 2, riskProjectCount: 3, activeRegionCount: 4 },
          map: { mode: 'province-outside', heatmap: 'customer', label: '客户总数', unit: '家', regions: [] },
          rankings: { topRegions: [], topRevenueRegions: [] },
          funnel: { totalOpenCount: 0, totalOpenAmount: 0, weightedPipeline: 0, avgWinProbability: 0, missingWinProbabilityCount: 0, stages: [] },
          forecastSummary: { targetBasis: 'rolling_90d_run_rate', targetLabel: '滚动90天中标 run-rate', periodDays: 30, targetAmount: 0, currentWonAmount: 0, forecastAmount: 0, weightedOpenAmount: 0, gapAmount: 0, coverageRate: 0, averageWinProbability: 0, requiredNewOpportunityAmount: 0, confidence: 'gap' },
          riskSummary: {
            total: 5,
            high: 2,
            medium: 3,
            overdueActions: 2,
            overdueBids: 1,
            staleProjects: 1,
            dueThisWeek: 2,
            items: [
              { projectId: 23, projectName: '智算中心建设', region: '杭州', stage: 'execution', riskLevel: 'high', score: 87, amount: 1200000, winProbability: 68, reason: '招标窗口收紧' },
              { projectId: 24, projectName: '城市大脑升级', region: '宁波', stage: 'proposal', riskLevel: 'medium', score: 71, amount: 800000, winProbability: 42, reason: '预算尚未锁定' },
            ],
          },
          trend: { monthlyData: [], stageStats: [], statusStats: [] },
          timestamp: '2026-04-09T10:00:00.000Z',
        }}
        personnelViewData={{
          filtersEcho: { startDate: '2026-04-01', endDate: '2026-04-08', preset: 'management', personId: null, abnormalFilter: 'all', selectedItemId: null, peoplePage: 1, peoplePageSize: 8, itemPage: 1, itemPageSize: 8 },
          summary: { managedPeopleCount: 8, activePeopleCount: 7, overloadedPeopleCount: 2, lowActivityPeopleCount: 1, riskPeopleCount: 3, pendingItemCount: 20, overdueItemCount: 4, highPriorityItemCount: 5, activeProjectPeopleCount: 5, activeSolutionPeopleCount: 3 },
          loadDistribution: [],
          roleGroups: [],
          regionGroups: [],
          itemStatusSummary: [],
          itemAbnormalSummary: [
            { key: 'all', label: '全部事项', count: 20, description: '完整事项池' },
            { key: 'overdue', label: '逾期', count: 4, description: '逾期事项' },
            { key: 'high-priority-stalled', label: '高优未推进', count: 3, description: '高优未推进' },
            { key: 'stale', label: '长时间未更新', count: 2, description: '长时间未更新' },
            { key: 'cross-project-overload', label: '跨项目过载', count: 2, description: '跨项目过载' },
          ],
          riskRanking: [
            { userId: 11, name: '张晨', roleName: '架构师', department: '解决方案部', position: '高级架构师', region: '杭州', pendingCount: 8, overdueCount: 2, highPriorityCount: 3, activeProjectCount: 4, activeSolutionCount: 2, riskScore: 66, loadBucket: 'overloaded', lowActivity: false, lastActivityAt: '2026-04-08T10:00:00.000Z', reasons: ['当前待处理 8 项'] },
          ],
          peopleList: { items: [], pagination: { page: 1, pageSize: 8, total: 0, totalPages: 1 } },
          selectedPerson: null,
          itemList: { items: [], pagination: { page: 1, pageSize: 8, total: 0, totalPages: 1 } },
          selectedItem: null,
          timestamp: '2026-04-09T10:00:00.000Z',
        }}
        startDate="2026-04-01"
        endDate="2026-04-08"
        onSelectRiskProject={onSelectRiskProject}
      />
    );

    expect(screen.getByTestId('data-screen-topic-layout')).toBeInTheDocument();
    expect(screen.getByTestId('data-screen-topic-switch-bar')).toBeInTheDocument();
    expect(screen.getByTestId('data-screen-topic-summary-belt')).toHaveTextContent('风险总量');
    expect(screen.getByTestId('data-screen-topic-main-grid')).toBeInTheDocument();
    expect(screen.getByTestId('data-screen-topic-risk-command-band')).toBeInTheDocument();
    expect(screen.getByTestId('data-screen-topic-risk-action-strip')).toHaveTextContent('分析带 01 / 今日优先处理');
    expect(screen.getByTestId('data-screen-topic-execution-guidance')).toHaveTextContent('分析图 04 / 处置建议');
    expect(screen.getByTestId('data-screen-topic-next-step-strip')).toHaveTextContent('协同负责人');
    expect(screen.getByTestId('data-screen-topic-risk-project-23')).toHaveTextContent('智算中心建设');
    expect(screen.getByText('优先协同 张晨')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('data-screen-topic-tab-customer-progress'));
    fireEvent.click(screen.getByTestId('data-screen-topic-risk-action-23'));
    fireEvent.click(screen.getByTestId('data-screen-topic-risk-project-23'));

    expect(onTopicChange).toHaveBeenCalledWith('customer-progress');
    expect(onSelectRiskProject).toHaveBeenCalledWith(23);
  });

  it('renders unified loading and error feedback when canonical topic dependencies are unavailable', () => {
    render(
      <DataScreenTopicLayout
        activeTopic="project-risk"
        onTopicChange={vi.fn()}
        regionViewData={null}
        personnelViewData={null}
        isRegionLoading
        regionError="region failed"
        startDate="2026-04-01"
        endDate="2026-04-08"
        onSelectRiskProject={vi.fn()}
      />
    );

    expect(screen.getByText('专题热区加载中')).toBeInTheDocument();
    expect(screen.getByText('风险对象同步中')).toBeInTheDocument();
    expect(screen.getByText('联动提醒加载中')).toBeInTheDocument();
  });
});