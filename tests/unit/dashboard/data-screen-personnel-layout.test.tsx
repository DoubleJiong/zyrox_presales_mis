// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DataScreenPersonnelLayout } from '@/components/dashboard/DataScreenPersonnelLayout';

describe('DataScreenPersonnelLayout', () => {
  it('renders abnormal filters, item drillthrough, and selected item detail', () => {
    const onSelectPerson = vi.fn();
    const onSelectAbnormalFilter = vi.fn();
    const onSelectItem = vi.fn();

    render(
      <DataScreenPersonnelLayout
        data={{
          filtersEcho: {
            startDate: '2026-04-01',
            endDate: '2026-04-08',
            preset: 'presales-focus',
            personId: 11,
            abnormalFilter: 'overdue',
            selectedItemId: 'task-100',
            peoplePage: 1,
            peoplePageSize: 8,
            itemPage: 1,
            itemPageSize: 8,
          },
          summary: {
            managedPeopleCount: 12,
            activePeopleCount: 10,
            overloadedPeopleCount: 3,
            lowActivityPeopleCount: 2,
            riskPeopleCount: 4,
            pendingItemCount: 29,
            overdueItemCount: 5,
            highPriorityItemCount: 8,
            activeProjectPeopleCount: 9,
            activeSolutionPeopleCount: 4,
          },
          loadDistribution: [
            { bucket: 'reserve', label: '储备', count: 2, description: '当前待处理较少，可承接新增事项。' },
            { bucket: 'balanced', label: '平衡', count: 4, description: '负载平衡，推进节奏正常。' },
            { bucket: 'busy', label: '繁忙', count: 3, description: '事项集中，需要持续关注节奏。' },
            { bucket: 'overloaded', label: '过载', count: 3, description: '待处理或逾期明显偏高，应优先干预。' },
          ],
          roleGroups: [
            { roleName: '架构师', memberCount: 5, pendingTotal: 12, overdueTotal: 3, avgRiskScore: 48, overloadedCount: 2, lowActivityCount: 1 },
          ],
          regionGroups: [
            { region: '杭州', memberCount: 6, overloadedCount: 2, riskCount: 3 },
          ],
          itemStatusSummary: [
            { key: 'pending', label: '待处理', count: 12, overdueCount: 1 },
            { key: 'in_progress', label: '处理中', count: 8, overdueCount: 2 },
            { key: 'review_pending', label: '待评审', count: 4, overdueCount: 1 },
            { key: 'overdue', label: '逾期事项', count: 5, overdueCount: 5 },
          ],
          itemAbnormalSummary: [
            { key: 'all', label: '全部事项', count: 8, description: '完整事项池' },
            { key: 'overdue', label: '逾期', count: 2, description: '已超过截止时间且仍未闭环的事项。' },
            { key: 'high-priority-stalled', label: '高优未推进', count: 3, description: '高优推进缓慢。' },
            { key: 'stale', label: '长时间未更新', count: 1, description: '最近 7 天没有有效推进痕迹。' },
            { key: 'cross-project-overload', label: '跨项目过载', count: 4, description: '跨多个项目且人员过载。' },
          ],
          riskRanking: [
            {
              userId: 11,
              name: '张晨',
              roleName: '架构师',
              department: '解决方案部',
              position: '高级架构师',
              region: '杭州',
              pendingCount: 8,
              overdueCount: 2,
              highPriorityCount: 3,
              activeProjectCount: 4,
              activeSolutionCount: 2,
              riskScore: 66,
              loadBucket: 'overloaded',
              lowActivity: false,
              lastActivityAt: '2026-04-08T10:00:00.000Z',
              reasons: ['当前待处理 8 项', '逾期事项 2 项'],
            },
          ],
          peopleList: {
            items: [
              {
                userId: 11,
                name: '张晨',
                roleName: '架构师',
                department: '解决方案部',
                position: '高级架构师',
                region: '杭州',
                pendingCount: 8,
                overdueCount: 2,
                highPriorityCount: 3,
                activeProjectCount: 4,
                activeSolutionCount: 2,
                riskScore: 66,
                loadBucket: 'overloaded',
                lowActivity: false,
                lastActivityAt: '2026-04-08T10:00:00.000Z',
                reasons: ['当前待处理 8 项', '逾期事项 2 项'],
              },
            ],
            pagination: { page: 1, pageSize: 8, total: 1, totalPages: 1 },
          },
          selectedPerson: {
            userId: 11,
            name: '张晨',
            roleName: '架构师',
            department: '解决方案部',
            position: '高级架构师',
            region: '杭州',
            currentTaskCount: 6,
            overdueItemCount: 2,
            highPriorityItemCount: 3,
            lastActivityAt: '2026-04-08T10:00:00.000Z',
            activeProjectCount: 4,
            activeSolutionCount: 2,
            riskScore: 66,
            loadBucket: 'overloaded',
            reasons: ['当前待处理 8 项', '逾期事项 2 项'],
          },
          itemList: {
            items: [
              {
                id: 'task-100',
                sourceId: 100,
                type: 'task',
                title: '提交初版方案',
                customerName: '杭州数智集团',
                projectName: '算力中心升级',
                solutionName: null,
                priority: 'high',
                dueDate: '2026-04-08',
                status: 'in_progress',
                progress: 20,
                isOverdue: true,
                lastUpdatedAt: '2026-04-08T09:30:00.000Z',
                abnormalFlags: ['overdue', 'high-priority-stalled'],
              },
            ],
            pagination: { page: 1, pageSize: 8, total: 1, totalPages: 1 },
          },
          selectedItem: {
            id: 'task-100',
            sourceId: 100,
            type: 'task',
            title: '提交初版方案',
            customerName: '杭州数智集团',
            projectName: '算力中心升级',
            solutionName: null,
            priority: 'high',
            dueDate: '2026-04-08',
            status: 'in_progress',
            progress: 20,
            isOverdue: true,
            lastUpdatedAt: '2026-04-08T09:30:00.000Z',
            abnormalFlags: ['overdue', 'high-priority-stalled'],
            description: '需要补齐主线方案和关键里程碑。',
            blockerReason: '事项已超过截止时间但仍未完成，需要立即干预推进。',
            collaborationContext: [
              { label: '客户', value: '杭州数智集团' },
              { label: '项目', value: '算力中心升级' },
            ],
            timeline: [
              { label: '创建时间', value: '2026-04-01 09:00', tone: 'neutral' },
              { label: '最近更新', value: '2026-04-08 09:30', tone: 'warning' },
            ],
            jumpLinks: [
              { label: '打开任务中心', href: '/tasks?scope=mine' },
              { label: '查看项目', href: '/projects/23' },
            ],
          },
          timestamp: '2026-04-09T09:00:00.000Z',
        }}
        isLoading={false}
        error={null}
        activeViewPreset="presales-focus"
        viewPresetLabel="售前负责人视图"
        viewPresetSubtitle="优先看售前活动、项目支撑密度和方案推进。"
        startDate="2026-04-01"
        endDate="2026-04-08"
        selectedPersonId={11}
        activeAbnormalFilter="overdue"
        onSelectPerson={onSelectPerson}
        onSelectAbnormalFilter={onSelectAbnormalFilter}
        onSelectItem={onSelectItem}
      />
    );

    expect(screen.getByTestId('data-screen-personnel-layout')).toBeInTheDocument();
    expect(screen.getByTestId('data-screen-personnel-summary-belt')).toBeInTheDocument();
    expect(screen.getByTestId('data-screen-personnel-middle-grid')).toBeInTheDocument();
    expect(screen.getByTestId('data-screen-personnel-load-zone')).toHaveTextContent('团队负载分层');
    expect(screen.getByTestId('data-screen-personnel-load-chart-band')).toHaveTextContent('分析图 01 / 负载梯度');
    expect(screen.getByTestId('data-screen-personnel-load-chart-band')).toHaveTextContent('分析图 02 / 事项状态压力');
    expect(screen.getByTestId('data-screen-personnel-risk-zone')).toHaveTextContent('最该盯的人');
    expect(screen.getByTestId('data-screen-personnel-role-zone')).toHaveTextContent('岗位结构失衡观察');
    expect(screen.getByTestId('data-screen-personnel-bottom-grid')).toBeInTheDocument();
    expect(screen.getByTestId('data-screen-personnel-selected-summary')).toHaveTextContent('张晨');
    expect(screen.getByTestId('data-screen-personnel-people-list')).toHaveTextContent('当前人员清单');
    expect(screen.getByTestId('data-screen-personnel-item-zone')).toHaveTextContent('当前事项列表');
    expect(screen.getByTestId('data-screen-personnel-abnormal-filter-overdue')).toHaveTextContent('逾期');
    expect(screen.getByTestId('data-screen-personnel-item-task-100')).toHaveTextContent('提交初版方案');
    expect(screen.getByTestId('data-screen-personnel-selected-item-detail')).toHaveTextContent('阻塞原因');
    expect(screen.getByText('打开任务中心')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('data-screen-personnel-risk-person-11'));
    fireEvent.click(screen.getByTestId('data-screen-personnel-abnormal-filter-high-priority-stalled'));
    fireEvent.click(screen.getByTestId('data-screen-personnel-item-task-100'));

    expect(onSelectPerson).toHaveBeenCalledWith(11);
    expect(onSelectAbnormalFilter).toHaveBeenCalledWith('high-priority-stalled');
    expect(onSelectItem).toHaveBeenCalledWith('task-100');
  });

  it('renders unified loading feedback when personnel data is not ready yet', () => {
    render(
      <DataScreenPersonnelLayout
        data={null}
        isLoading
        error={null}
        activeViewPreset="presales-focus"
        viewPresetLabel="售前负责人视图"
        viewPresetSubtitle="优先看售前活动、项目支撑密度和方案推进。"
        startDate="2026-04-01"
        endDate="2026-04-08"
        selectedPersonId={null}
        activeAbnormalFilter="all"
        onSelectPerson={vi.fn()}
        onSelectAbnormalFilter={vi.fn()}
        onSelectItem={vi.fn()}
      />
    );

    expect(screen.getAllByText('人员视角加载中').length).toBeGreaterThan(0);
    expect(screen.getAllByText('正在同步当前筛选条件下的人员、事项和异常分层。').length).toBeGreaterThan(0);
  });
});