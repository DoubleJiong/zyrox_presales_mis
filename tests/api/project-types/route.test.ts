import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const selectMock = vi.fn();
const updateMock = vi.fn();
const insertMock = vi.fn();
const transactionMock = vi.fn();
const executeMock = vi.fn();

vi.mock('@/db', () => ({
  db: {
    select: selectMock,
    update: updateMock,
    insert: insertMock,
    transaction: transactionMock,
    execute: executeMock,
  },
}));

vi.mock('@/db/schema', () => ({
  projectTypes: {
    id: 'projectTypes.id',
    code: 'projectTypes.code',
    name: 'projectTypes.name',
    description: 'projectTypes.description',
    status: 'projectTypes.status',
    deletedAt: 'projectTypes.deletedAt',
    updatedAt: 'projectTypes.updatedAt',
  },
  projects: {
    projectTypeId: 'projects.projectTypeId',
    projectType: 'projects.projectType',
    deletedAt: 'projects.deletedAt',
    updatedAt: 'projects.updatedAt',
  },
  customerTypes: {
    defaultProjectTypeCode: 'customerTypes.defaultProjectTypeCode',
    deletedAt: 'customerTypes.deletedAt',
    updatedAt: 'customerTypes.updatedAt',
  },
}));

vi.mock('drizzle-orm', () => ({
  and: vi.fn((...args: unknown[]) => ({ type: 'and', args })),
  asc: vi.fn((...args: unknown[]) => ({ type: 'asc', args })),
  count: vi.fn(() => 'count'),
  eq: vi.fn((...args: unknown[]) => ({ type: 'eq', args })),
  isNull: vi.fn((...args: unknown[]) => ({ type: 'isNull', args })),
  ne: vi.fn((...args: unknown[]) => ({ type: 'ne', args })),
  or: vi.fn((...args: unknown[]) => ({ type: 'or', args })),
  sql: vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => ({ type: 'sql', strings, values })),
}));

function mockSelectWithLimit(rows: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn(async () => rows),
      }),
    }),
  };
}

function mockSelectWithWhere(rows: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn(async () => rows),
    }),
  };
}

describe('project types route', () => {
  beforeEach(() => {
    vi.resetModules();
    selectMock.mockReset();
    updateMock.mockReset();
    insertMock.mockReset();
    transactionMock.mockReset();
    executeMock.mockReset();
  });

  it('cascades code changes to project and customer type references', async () => {
    selectMock
      .mockImplementationOnce(() => mockSelectWithLimit([
        { id: 2, code: 'consulting', name: '咨询', description: null, status: 'active', deletedAt: null },
      ]))
      .mockImplementationOnce(() => mockSelectWithLimit([]))
      .mockImplementationOnce(() => mockSelectWithWhere([{ count: 3 }]))
      .mockImplementationOnce(() => mockSelectWithWhere([{ count: 1 }]));

    const txUpdate = vi.fn()
      .mockImplementationOnce(() => ({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn(async () => [{
              id: 2,
              code: 'consulting_service',
              name: '咨询服务',
              description: '升级后的口径',
              status: 'active',
            }]),
          }),
        }),
      }))
      .mockImplementationOnce(() => ({
        set: vi.fn().mockReturnValue({
          where: vi.fn(async () => undefined),
        }),
      }))
      .mockImplementationOnce(() => ({
        set: vi.fn().mockReturnValue({
          where: vi.fn(async () => undefined),
        }),
      }));

    transactionMock.mockImplementation(async (callback: (tx: { update: typeof txUpdate }) => Promise<unknown>) => callback({ update: txUpdate }));

    const { PUT } = await import('../../../src/app/api/project-types/route');
    const response = await PUT(new NextRequest('http://localhost/api/project-types', {
      method: 'PUT',
      body: JSON.stringify({
        id: 2,
        code: 'consulting service',
        name: '咨询服务',
        description: '升级后的口径',
      }),
      headers: { 'content-type': 'application/json' },
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      data: {
        code: 'consulting_service',
        name: '咨询服务',
        projectCount: 3,
        customerTypeCount: 1,
      },
    });
    expect(transactionMock).toHaveBeenCalledTimes(1);
    expect(txUpdate).toHaveBeenCalledTimes(3);
  });

  it('normalizes project type codes when creating a new project type', async () => {
    selectMock.mockImplementationOnce(() => mockSelectWithLimit([]));
    executeMock.mockResolvedValueOnce(undefined);

    insertMock.mockImplementationOnce(() => ({
      values: vi.fn().mockReturnValue({
        returning: vi.fn(async () => [{
          id: 6,
          code: 'solution_service',
          name: '解决方案服务',
          description: '新增类型',
          status: 'active',
        }]),
      }),
    }));

    const { POST } = await import('../../../src/app/api/project-types/route');
    const response = await POST(new NextRequest('http://localhost/api/project-types', {
      method: 'POST',
      body: JSON.stringify({
        code: 'Solution Service',
        name: '解决方案服务',
        description: '新增类型',
      }),
      headers: { 'content-type': 'application/json' },
    }));

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      data: {
        code: 'solution_service',
        name: '解决方案服务',
        projectCount: 0,
        customerTypeCount: 0,
      },
    });
    expect(insertMock).toHaveBeenCalledTimes(1);
    expect(executeMock).toHaveBeenCalledTimes(1);
  });

  it('rejects project type codes that exceed the schema length limit', async () => {
    const { POST } = await import('../../../src/app/api/project-types/route');
    const response = await POST(new NextRequest('http://localhost/api/project-types', {
      method: 'POST',
      body: JSON.stringify({
        code: 'project_type_code_too_long',
        name: '超长编码项目类型',
      }),
      headers: { 'content-type': 'application/json' },
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: {
        code: 'BAD_REQUEST',
        message: expect.stringContaining('编码不能超过 20 个字符'),
      },
    });
    expect(insertMock).not.toHaveBeenCalled();
    expect(executeMock).not.toHaveBeenCalled();
  });

  it('blocks deleting project types that are still referenced', async () => {
    selectMock
      .mockImplementationOnce(() => mockSelectWithLimit([
        { id: 4, code: 'integration', name: '集成', status: 'active', deletedAt: null },
      ]))
      .mockImplementationOnce(() => mockSelectWithWhere([{ count: 2 }]))
      .mockImplementationOnce(() => mockSelectWithWhere([{ count: 1 }]));

    const { DELETE } = await import('../../../src/app/api/project-types/route');
    const response = await DELETE(new NextRequest('http://localhost/api/project-types?id=4', {
      method: 'DELETE',
    }));

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: {
        code: 'CONFLICT',
        message: expect.stringContaining('已被项目或客户类型引用'),
        details: {
          projectCount: 2,
          customerTypeCount: 1,
        },
      },
    });
    expect(updateMock).not.toHaveBeenCalled();
  });
});