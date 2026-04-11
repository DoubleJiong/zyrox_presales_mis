// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DataScreenPersonnelItemDetailDrawer } from '@/components/dashboard/DataScreenPersonnelItemDetailDrawer';

vi.mock('@/components/ui/drawer', () => ({
  Drawer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DrawerContent: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  DrawerDescription: ({ children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => <p {...props}>{children}</p>,
  DrawerHeader: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  DrawerTitle: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => <h2 {...props}>{children}</h2>,
}));

describe('DataScreenPersonnelItemDetailDrawer', () => {
  it('renders the unified personnel item drilldown drawer content', () => {
    render(
      <DataScreenPersonnelItemDetailDrawer
        item={{
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
            { label: '最近更新', value: '2026-04-08 09:30', tone: 'warning' },
          ],
          jumpLinks: [
            { label: '打开任务中心', href: '/tasks?scope=mine' },
            { label: '查看项目', href: '/projects/23' },
          ],
        }}
        activeAbnormalFilter="overdue"
        selectedPersonName="张晨"
        onClose={() => {}}
      />
    );

    expect(screen.getByTestId('data-screen-personnel-item-detail-drawer')).toBeInTheDocument();
    expect(screen.getByTestId('data-screen-personnel-item-detail-title')).toHaveTextContent('提交初版方案 事项下钻');
    expect(screen.getByText('事项详情摘要')).toBeInTheDocument();
    expect(screen.getByText('完整描述')).toBeInTheDocument();
    expect(screen.getByText('阻塞原因')).toBeInTheDocument();
    expect(screen.getByText('协同对象')).toBeInTheDocument();
    expect(screen.getByText('推进时间线')).toBeInTheDocument();
    expect(screen.getByText('打开任务中心')).toBeInTheDocument();
  });
});