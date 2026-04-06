import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const executeMock = vi.fn();
const isSystemAdminMock = vi.fn();
const getAccessibleProjectIdsMock = vi.fn();
const sqlMock = Object.assign(
  (strings: TemplateStringsArray) => ({ text: strings.join('?') }),
  {
    raw: (value: string) => ({ text: value }),
  },
);

vi.mock('@/lib/auth-middleware', () => ({
  withAuth: (handler: (req: NextRequest, context: { userId: number }) => Promise<Response>) => {
    return (req: NextRequest) => handler(req, { userId: 7 });
  },
}));

vi.mock('@/db', () => ({
  db: {
    execute: executeMock,
  },
}));

vi.mock('drizzle-orm', () => ({
  sql: sqlMock,
}));

vi.mock('@/lib/permissions/project', () => ({
  isSystemAdmin: (...args: unknown[]) => isSystemAdminMock(...args),
  getAccessibleProjectIds: (...args: unknown[]) => getAccessibleProjectIdsMock(...args),
}));

vi.mock('@/lib/api-response', () => ({
  successResponse: (data: unknown, options?: { status?: number }) => NextResponse.json({ success: true, data }, { status: options?.status ?? 200 }),
  errorResponse: (code: string, message: string, status = 500) => NextResponse.json({ success: false, error: code, message }, { status }),
}));

describe('data-screen presales-focus summary route', () => {
  beforeEach(() => {
    vi.resetModules();
    executeMock.mockReset();
    isSystemAdminMock.mockReset();
    getAccessibleProjectIdsMock.mockReset();
  });

  it('returns support-load and key project summary for accessible projects', async () => {
    isSystemAdminMock.mockResolvedValue(false);
    getAccessibleProjectIdsMock.mockResolvedValue([11, 12]);

    executeMock
      .mockResolvedValueOnce([
        {
          total_support_hours: '42.5',
          active_support_projects: '3',
          active_service_types: '4',
          missing_worklog_record_count: '1',
          overloaded_staff_count: '1',
        },
      ])
      .mockResolvedValueOnce([
        { staff_id: 2, staff_name: '张伟', total_hours: '26', project_count: '2', service_count: '4' },
        { staff_id: 3, staff_name: '刘华', total_hours: '16.5', project_count: '1', service_count: '2' },
      ])
      .mockResolvedValueOnce([
        { project_id: 11, project_name: '政企专网一期', region: '浙江', project_stage: 'bidding', support_hours: '18', participant_count: '2', service_count: '3' },
      ])
      .mockResolvedValueOnce([
        { service_category: 'design', total_hours: '24', service_count: '3' },
        { service_category: 'presentation', total_hours: '18.5', service_count: '2' },
      ])
      .mockResolvedValueOnce([
        { usage_projects: '2', usage_count: '5' },
      ]);

    const { GET } = await import('../../../src/app/api/data-screen/presales-focus-summary/route');
    const response = await GET(new NextRequest('http://localhost/api/data-screen/presales-focus-summary?startDate=2026-03-01&endDate=2026-04-06'));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(isSystemAdminMock).toHaveBeenCalledWith(7);
    expect(getAccessibleProjectIdsMock).toHaveBeenCalledWith(7);
    expect(payload.data.summary).toEqual({
      totalSupportHours: 42.5,
      activeSupportProjects: 3,
      overloadedStaffCount: 1,
      activeServiceTypes: 4,
      solutionReuseCoverageRate: 67,
      solutionUsageProjects: 2,
      missingWorklogRecordCount: 1,
    });
    expect(payload.data.topStaffLoad).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: '张伟', totalHours: 26, projectCount: 2, serviceCount: 4 }),
    ]));
    expect(payload.data.keyProjects).toEqual(expect.arrayContaining([
      expect.objectContaining({ projectId: 11, projectName: '政企专网一期', stage: 'bidding', supportHours: 18 }),
    ]));
    expect(payload.data.serviceMix).toEqual(expect.arrayContaining([
      expect.objectContaining({ category: 'design', totalHours: 24, serviceCount: 3 }),
    ]));
  });

  it('returns an empty payload when a non-admin user has no accessible projects', async () => {
    isSystemAdminMock.mockResolvedValue(false);
    getAccessibleProjectIdsMock.mockResolvedValue([]);

    const { GET } = await import('../../../src/app/api/data-screen/presales-focus-summary/route');
    const response = await GET(new NextRequest('http://localhost/api/data-screen/presales-focus-summary'));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(executeMock).not.toHaveBeenCalled();
    expect(payload.data.summary).toEqual({
      totalSupportHours: 0,
      activeSupportProjects: 0,
      overloadedStaffCount: 0,
      activeServiceTypes: 0,
      solutionReuseCoverageRate: 0,
      solutionUsageProjects: 0,
      missingWorklogRecordCount: 0,
    });
  });
});