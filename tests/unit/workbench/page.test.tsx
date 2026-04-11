// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/contexts/auth-context', () => ({
  useAuth: () => ({
    user: { id: 7, realName: '张伟' },
    isAuthenticated: true,
  }),
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('../../../src/components/weekly-report-dialog', () => ({
  WeeklyReportDialog: () => <div data-testid="weekly-report-dialog-stub" />,
}));

describe('WorkbenchPage', () => {
  it('renders metrics before the compact module tag section', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({
        success: true,
        data: {
          stats: {
            pendingTodos: 3,
            myTasks: 4,
            pendingAlerts: 2,
            unreadMessages: 5,
            myProjects: 6,
          },
          focusQueue: [],
          todayTodos: [],
          weekSchedules: [],
          starredProjects: [],
          inboxFeed: [],
        },
      }),
    } as Response);

    const { default: WorkbenchPage } = await import('../../../src/app/workbench/page');

    render(<WorkbenchPage />);

    await waitFor(() => {
      expect(screen.getByTestId('workbench-metric-grid')).toBeInTheDocument();
      expect(screen.getByTestId('workbench-module-tags-section')).toBeInTheDocument();
    });

    const metricGrid = screen.getByTestId('workbench-metric-grid');
    const moduleSection = screen.getByTestId('workbench-module-tags-section');
    const position = metricGrid.compareDocumentPosition(moduleSection);

    expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByTestId('workbench-module-tag-日程管理')).toBeInTheDocument();
    expect(screen.getByTestId('workbench-module-tag-任务中心')).toBeInTheDocument();
    expect(screen.getByTestId('workbench-module-tag-消息中心')).toBeInTheDocument();
    expect(screen.getByTestId('workbench-module-tag-预警管理')).toBeInTheDocument();
  });
});