// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DataScreenRegionDetailDrawer } from '@/components/dashboard/DataScreenRegionDetailDrawer';

vi.mock('@/components/ui/drawer', () => ({
  Drawer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DrawerContent: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  DrawerDescription: ({ children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => <p {...props}>{children}</p>,
  DrawerHeader: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  DrawerTitle: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => <h2 {...props}>{children}</h2>,
}));

describe('DataScreenRegionDetailDrawer', () => {
  it('renders the unified region detail sections', () => {
    render(
      <DataScreenRegionDetailDrawer
        selection={{ name: '杭州市', source: 'ranking' }}
        data={{
          filtersEcho: { region: '杭州市', map: 'zhejiang', heatmap: 'contract', startDate: '2026-04-01', endDate: '2026-04-08' },
          regionLabel: '杭州市',
          summary: {
            customerCount: 6,
            projectCount: 4,
            projectAmount: 1800000,
            contractAmount: 950000,
            riskCount: 3,
            highRiskCount: 1,
            activeStaffCount: 5,
            solutionUsage: 7,
            preSalesActivity: 9,
          },
          customerSnapshot: {
            items: [{ id: 1, name: '浙江大学', status: 'active', totalAmount: 800000, currentProjectCount: 2, lastInteractionTime: '2026-04-08T10:00:00.000Z', address: '浙江省杭州市西湖区' }],
          },
          projectSnapshot: {
            wonCount: 2,
            items: [{ id: 2, name: '智算中心建设', customerName: '浙江大学', stage: 'execution', status: 'ongoing', amount: 1200000, managerName: '李工' }],
          },
          riskSnapshot: {
            items: [{ id: 3, projectId: 2, projectName: '智算中心建设', riskLevel: 'high', description: '招标窗口收紧', status: 'active' }],
          },
          collaborationSnapshot: {
            items: [{ userId: 4, realName: '王工', position: '售前经理', projectCount: 3 }],
          },
          actions: [
            { label: '查看客户列表', href: '/customers' },
            { label: '查看项目列表', href: '/projects' },
          ],
          timestamp: '2026-04-09T09:00:00.000Z',
        }}
        isLoading={false}
        error={null}
        onClose={() => {}}
      />
    );

    expect(screen.getByTestId('data-screen-region-detail-drawer')).toBeInTheDocument();
    expect(screen.getByTestId('data-screen-region-detail-title')).toHaveTextContent('杭州市 区域下钻');
    expect(screen.getByTestId('data-screen-region-detail-summary')).toHaveTextContent('客户数');
    expect(screen.getByText('客户快照')).toBeInTheDocument();
    expect(screen.getByText('项目快照')).toBeInTheDocument();
    expect(screen.getByText('风险快照')).toBeInTheDocument();
    expect(screen.getByText('协同快照')).toBeInTheDocument();
    expect(screen.getByText('浙江大学')).toBeInTheDocument();
    expect(screen.getAllByText('智算中心建设')).toHaveLength(2);
  });
});