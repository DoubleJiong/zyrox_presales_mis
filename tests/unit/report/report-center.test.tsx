// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let currentUser = { id: 7, roleCode: 'user', realName: '张伟' };

vi.mock('../../../src/contexts/auth-context', () => ({
  useAuth: () => ({ user: currentUser }),
}));

vi.mock('../../../src/shared/policy/dashboard-policy', () => ({
  canViewGlobalDashboard: (user?: { roleCode?: string | null }) => user?.roleCode === 'presales_manager' || user?.roleCode === 'admin',
}));

vi.mock('../../../src/components/ui/user-select', () => ({
  UserSelect: ({
    value,
    onValueChange,
  }: {
    value: number | null;
    onValueChange?: (value: number | null) => void;
  }) => (
    <button type="button" onClick={() => onValueChange?.(value === 99 ? 0 : 99)}>
      {`人员筛选:${value ?? 0}`}
    </button>
  ),
}));

vi.mock('../../../src/components/report/report-list', () => ({
  ReportList: ({
    reports,
    onEdit,
  }: {
    reports: Array<{ id: number; content: { summary: string } }>;
    onEdit?: (report: { id: number; content: { summary: string } }) => void;
  }) => (
    <div data-testid="report-list">
      {reports.map((report) => (
        <div key={report.id}>
          <span>{`${report.id}:${report.content.summary}`}</span>
          <button type="button" onClick={() => onEdit?.(report)}>
            编辑{report.id}
          </button>
        </div>
      ))}
    </div>
  ),
}));

vi.mock('../../../src/components/report/report-viewer', () => ({
  ReportViewer: ({
    report,
    editableContent,
    isEditing,
    onContentChange,
    onSave,
  }: {
    report: { content: { summary: string; highlights?: string[] } };
    editableContent?: { summary: string; highlights?: string[] };
    isEditing?: boolean;
    onContentChange?: (content: { summary: string; highlights?: string[] }) => void;
    onSave?: () => void;
  }) => (
    <div data-testid="report-viewer">
      <div>{`viewer:${(editableContent ?? report.content).summary}`}</div>
      {isEditing ? (
        <>
          <button
            type="button"
            onClick={() => onContentChange?.({
              ...(editableContent ?? report.content),
              summary: '编辑后摘要',
            })}
          >
            修改内容
          </button>
          <button type="button" onClick={onSave}>保存编辑</button>
        </>
      ) : null}
    </div>
  ),
}));

describe('ReportCenter', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    currentUser = { id: 7, roleCode: 'user', realName: '张伟' };
    global.fetch = vi.fn();
  });

  it('upserts a generated weekly report instead of duplicating the same record in the list', async () => {
    vi.mocked(global.fetch)
      .mockResolvedValueOnce({
        json: async () => ({
          success: true,
          data: {
            projects: { total: 1, active: 1, completed: 0 },
            tasks: { total: 1, pending: 0, inProgress: 1, completed: 0, overdue: 0 },
            customers: { total: 1, active: 1, potential: 0 },
            opportunities: { total: 1, newThisMonth: 1, totalAmount: '0' },
          },
        }),
      } as Response)
      .mockResolvedValueOnce({
        json: async () => ({
          success: true,
          data: {
            reports: [
              {
                id: 31,
                type: 'personal',
                userId: 7,
                userName: '张伟',
                weekStart: '2026-04-06',
                weekEnd: '2026-04-12',
                content: { summary: '旧摘要' },
                generatedAt: '2026-04-11T09:00:00.000Z',
                sentAt: null,
                sent: false,
              },
            ],
          },
        }),
      } as Response)
      .mockResolvedValueOnce({
        json: async () => ({
          success: true,
          data: {
            id: 31,
            type: 'personal',
            userId: 7,
            userName: '张伟',
            weekStart: '2026-04-06',
            weekEnd: '2026-04-12',
            content: { summary: '新摘要' },
            generatedAt: '2026-04-11T10:00:00.000Z',
            sentAt: null,
            sent: false,
          },
        }),
      } as Response);

    const { ReportCenter } = await import('../../../src/components/report/report-center');

    render(<ReportCenter />);

    await waitFor(() => {
      expect(screen.getByText('31:旧摘要')).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: /生成周报/i }));

    await waitFor(() => {
      expect(screen.getByText('31:新摘要')).toBeTruthy();
    });

    expect(screen.queryByText('31:旧摘要')).toBeNull();
    expect(screen.getAllByText('31:新摘要')).toHaveLength(1);
  });

  it('saves edited weekly report content back into the formal record list', async () => {
    vi.mocked(global.fetch)
      .mockResolvedValueOnce({
        json: async () => ({
          success: true,
          data: {
            projects: { total: 1, active: 1, completed: 0 },
            tasks: { total: 1, pending: 0, inProgress: 1, completed: 0, overdue: 0 },
            customers: { total: 1, active: 1, potential: 0 },
            opportunities: { total: 1, newThisMonth: 1, totalAmount: '0' },
          },
        }),
      } as Response)
      .mockResolvedValueOnce({
        json: async () => ({
          success: true,
          data: {
            reports: [
              {
                id: 31,
                type: 'personal',
                userId: 7,
                userName: '张伟',
                weekStart: '2026-04-06',
                weekEnd: '2026-04-12',
                content: { summary: '旧摘要' },
                generatedAt: '2026-04-11T09:00:00.000Z',
                sentAt: null,
                sent: false,
              },
            ],
          },
        }),
      } as Response)
      .mockResolvedValueOnce({
        json: async () => ({
          success: true,
          data: {
            id: 31,
            type: 'personal',
            userId: 7,
            userName: '张伟',
            weekStart: '2026-04-06',
            weekEnd: '2026-04-12',
            content: {
              summary: '旧摘要',
              statistics: {
                newCustomers: 0,
                followUpCount: 0,
                projectProgress: 50,
                taskCompleted: 1,
                opportunityCount: 0,
                biddingCount: 0,
              },
              highlights: [],
              nextWeekPlan: [],
              issues: [],
              supportNeeds: [],
            },
            generatedAt: '2026-04-11T10:00:00.000Z',
            sentAt: null,
            sent: false,
            user: null,
          },
        }),
      } as Response)
      .mockResolvedValueOnce({
        json: async () => ({
          success: true,
          data: {
            id: 31,
            type: 'personal',
            userId: 7,
            userName: '张伟',
            weekStart: '2026-04-06',
            weekEnd: '2026-04-12',
            content: {
              summary: '编辑后摘要',
              statistics: {
                newCustomers: 0,
                followUpCount: 0,
                projectProgress: 50,
                taskCompleted: 1,
                opportunityCount: 0,
                biddingCount: 0,
              },
              highlights: [],
              nextWeekPlan: [],
              issues: [],
              supportNeeds: [],
            },
            generatedAt: '2026-04-11T10:00:00.000Z',
            sentAt: null,
            sent: false,
            user: null,
          },
        }),
      } as Response);

    const { ReportCenter } = await import('../../../src/components/report/report-center');

    render(<ReportCenter />);

    await waitFor(() => {
      expect(screen.getByText('31:旧摘要')).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: '编辑31' }));

    await waitFor(() => {
      expect(screen.getByText('viewer:旧摘要')).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: '修改内容' }));
    fireEvent.click(screen.getByRole('button', { name: '保存编辑' }));

    await waitFor(() => {
      expect(screen.getByText('31:编辑后摘要')).toBeTruthy();
    });

    expect(screen.queryByText('31:旧摘要')).toBeNull();
    expect(global.fetch).toHaveBeenCalledWith('/api/reports/weekly/31', expect.objectContaining({
      method: 'PUT',
    }));
  });

  it('requests a filtered weekly report list when management view selects a report owner', async () => {
    currentUser = { id: 8, roleCode: 'presales_manager', realName: '李经理' };

    vi.mocked(global.fetch)
      .mockResolvedValueOnce({
        json: async () => ({
          success: true,
          data: {
            projects: { total: 1, active: 1, completed: 0 },
            tasks: { total: 1, pending: 0, inProgress: 1, completed: 0, overdue: 0 },
            customers: { total: 1, active: 1, potential: 0 },
            opportunities: { total: 1, newThisMonth: 1, totalAmount: '0' },
          },
        }),
      } as Response)
      .mockResolvedValueOnce({
        json: async () => ({
          success: true,
          data: {
            reports: [],
          },
        }),
      } as Response)
      .mockResolvedValueOnce({
        json: async () => ({
          success: true,
          data: [
            { id: 99, realName: '王工程师', department: '售前部' },
          ],
        }),
      } as Response)
      .mockResolvedValueOnce({
        json: async () => ({
          success: true,
          data: {
            projects: { total: 1, active: 1, completed: 0 },
            tasks: { total: 1, pending: 0, inProgress: 1, completed: 0, overdue: 0 },
            customers: { total: 1, active: 1, potential: 0 },
            opportunities: { total: 1, newThisMonth: 1, totalAmount: '0' },
          },
        }),
      } as Response)
      .mockResolvedValueOnce({
        json: async () => ({
          success: true,
          data: {
            reports: [
              {
                id: 66,
                type: 'personal',
                userId: 99,
                userName: '王工程师',
                weekStart: '2026-04-06',
                weekEnd: '2026-04-12',
                content: { summary: '筛选后的周报' },
                generatedAt: '2026-04-11T09:00:00.000Z',
                sentAt: null,
                sent: false,
              },
            ],
          },
        }),
      } as Response)
      .mockResolvedValueOnce({
        json: async () => ({
          success: true,
          data: [
            { id: 99, realName: '王工程师', department: '售前部' },
          ],
        }),
      } as Response);

    const { ReportCenter } = await import('../../../src/components/report/report-center');

    render(<ReportCenter />);

    await waitFor(() => {
      expect(screen.getByText('人员筛选:0')).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: '人员筛选:0' }));

    await waitFor(() => {
      expect(vi.mocked(global.fetch)).toHaveBeenCalledWith('/api/reports/weekly?userId=99');
    });
  });

  it('switches summary cards to filtered weekly report aggregates when report filters are active', async () => {
    currentUser = { id: 8, roleCode: 'presales_manager', realName: '李经理' };

    vi.mocked(global.fetch)
      .mockResolvedValueOnce({
        json: async () => ({
          success: true,
          data: {
            projects: { total: 10, active: 5, completed: 5 },
            tasks: { total: 20, pending: 0, inProgress: 5, completed: 15, overdue: 0 },
            customers: { total: 9, active: 8, potential: 1 },
            opportunities: { total: 7, newThisMonth: 2, totalAmount: '0' },
          },
        }),
      } as Response)
      .mockResolvedValueOnce({
        json: async () => ({
          success: true,
          data: {
            reports: [],
          },
        }),
      } as Response)
      .mockResolvedValueOnce({
        json: async () => ({
          success: true,
          data: [
            { id: 99, realName: '王工程师', department: '售前部' },
          ],
        }),
      } as Response)
      .mockResolvedValueOnce({
        json: async () => ({
          success: true,
          data: {
            reports: [
              {
                id: 66,
                type: 'personal',
                userId: 99,
                userName: '王工程师',
                weekStart: '2026-04-06',
                weekEnd: '2026-04-12',
                content: {
                  summary: '筛选后的周报',
                  statistics: {
                    taskCompleted: 3,
                    newCustomers: 2,
                    opportunityCount: 1,
                  },
                },
                generatedAt: '2026-04-11T09:00:00.000Z',
                sentAt: null,
                sent: false,
              },
            ],
          },
        }),
      } as Response)
      .mockResolvedValueOnce({
        json: async () => ({
          success: true,
          data: [
            { id: 99, realName: '王工程师', department: '售前部' },
          ],
        }),
      } as Response);

    const { ReportCenter } = await import('../../../src/components/report/report-center');

    render(<ReportCenter />);

    await waitFor(() => {
      expect(screen.getByText('人员筛选:0')).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: '人员筛选:0' }));

    await waitFor(() => {
      expect(screen.getByText('周报数量')).toBeTruthy();
      expect(screen.getByText('完成任务')).toBeTruthy();
      expect(screen.getByText('新增客户')).toBeTruthy();
      expect(screen.getByText('当前筛选条件下的正式记录')).toBeTruthy();
    });

    expect(screen.getByText('3')).toBeTruthy();
    expect(screen.getByText('2')).toBeTruthy();
  });
});