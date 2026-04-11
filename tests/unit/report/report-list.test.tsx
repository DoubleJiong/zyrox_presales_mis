// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onClick, className }: { children: React.ReactNode; onClick?: () => void; className?: string }) => (
    <button type="button" onClick={onClick} className={className}>
      {children}
    </button>
  ),
}));

describe('ReportList', () => {
  it('shows the report owner in management view and hides edit/delete for another users personal report', async () => {
    const { ReportList } = await import('../../../src/components/report/report-list');

    render(
      <ReportList
        reports={[
          {
            id: 31,
            type: 'personal',
            userId: 99,
            userName: '王工程师',
            weekStart: '2026-04-06',
            weekEnd: '2026-04-12',
            content: {
              summary: '下属周报摘要',
              statistics: {
                newCustomers: 0,
                followUpCount: 1,
                projectProgress: 80,
                taskCompleted: 2,
                opportunityCount: 0,
                biddingCount: 0,
              },
              highlights: [],
              nextWeekPlan: [],
              issues: [],
              supportNeeds: [],
            },
            generatedAt: '2026-04-11T09:00:00.000Z',
            sentAt: null,
            sent: false,
          },
        ]}
        currentUserId={7}
        managementView
        onView={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByText('汇报人')).toBeTruthy();
    expect(screen.getByText('王工程师')).toBeTruthy();

    expect(screen.getByText('查看')).toBeTruthy();

    expect(screen.queryByText('编辑')).toBeNull();
    expect(screen.queryByText('删除')).toBeNull();
  });
});