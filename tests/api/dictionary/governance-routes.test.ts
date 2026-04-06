import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const selectMock = vi.fn();
const insertMock = vi.fn();
const updateMock = vi.fn();

vi.mock('@/lib/auth-middleware', () => ({
  withAuth: (handler: (req: NextRequest, context: { userId: number }) => Promise<Response>) => {
    return (req: NextRequest) => handler(req, { userId: 1 });
  },
}));

vi.mock('@/db', () => ({
  db: {
    select: selectMock,
    insert: insertMock,
    update: updateMock,
  },
}));

vi.mock('@/db/schema', () => ({
  attributeCategories: {
    id: 'attributeCategories.id',
    categoryCode: 'attributeCategories.categoryCode',
    categoryName: 'attributeCategories.categoryName',
    description: 'attributeCategories.description',
    icon: 'attributeCategories.icon',
    isSystem: 'attributeCategories.isSystem',
    sortOrder: 'attributeCategories.sortOrder',
    status: 'attributeCategories.status',
    deletedAt: 'attributeCategories.deletedAt',
  },
  attributes: {
    id: 'attributes.id',
    category: 'attributes.category',
    code: 'attributes.code',
    deletedAt: 'attributes.deletedAt',
  },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((...args: unknown[]) => ({ type: 'eq', args })),
  isNull: vi.fn((...args: unknown[]) => ({ type: 'isNull', args })),
  and: vi.fn((...args: unknown[]) => ({ type: 'and', args })),
  asc: vi.fn((...args: unknown[]) => ({ type: 'asc', args })),
  inArray: vi.fn((...args: unknown[]) => ({ type: 'inArray', args })),
}));

vi.mock('@/lib/config/dictionary-config', () => ({
  DICT_CATEGORIES: [
    {
      code: 'industry',
      name: '客户类型',
      description: '客户类型分类',
      icon: 'Building',
      isSystem: true,
    },
    {
      code: 'project_status',
      name: '项目状态',
      description: '项目状态',
      icon: 'CircleDot',
      isSystem: true,
    },
  ],
  ALL_DICT_ITEMS: [
    {
      category: 'industry',
      items: [
        { code: 'education', name: '教育', sortOrder: 1, value: 'education' },
      ],
    },
    {
      category: 'project_status',
      items: [
        { code: 'lead', name: '商机线索', sortOrder: 1, value: 'lead' },
      ],
    },
  ],
}));

function mockSelectResult(rows: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn(async () => rows),
      }),
      orderBy: vi.fn(async () => rows),
    }),
  };
}

function mockUpdateReturning(row: unknown = {}) {
  return {
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn(async () => [row]),
      }),
    }),
  };
}

describe('dictionary governance routes', () => {
  beforeEach(() => {
    vi.resetModules();
    selectMock.mockReset();
    insertMock.mockReset();
    updateMock.mockReset();
  });

  it('blocks creating items under workflow-controlled system categories', async () => {
    selectMock.mockImplementationOnce(() => mockSelectResult([{ isSystem: true }]));

    const { POST } = await import('../../../src/app/api/dictionary/items/route');
    const response = await POST(
      new NextRequest('http://localhost/api/dictionary/items', {
        method: 'POST',
        body: JSON.stringify({
          category: 'project_status',
          code: 'custom_status',
          name: '自定义状态',
        }),
        headers: { 'content-type': 'application/json' },
      }),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: expect.stringContaining('代码状态机'),
      },
    });
  });

  it('allows deleting GUI-managed system categories', async () => {
    selectMock.mockImplementationOnce(() => mockSelectResult([
      { id: 9, categoryCode: 'industry', isSystem: true, deletedAt: null },
    ]));
    updateMock.mockImplementationOnce(() => ({
      set: vi.fn().mockReturnValue({
        where: vi.fn(async () => undefined),
      }),
    }));

    const { DELETE } = await import('../../../src/app/api/dictionary/categories/route');
    const response = await DELETE(new NextRequest('http://localhost/api/dictionary/categories?id=9', {
      method: 'DELETE',
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ success: true });
    expect(updateMock).toHaveBeenCalledTimes(1);
  });

  it('skips config sync overrides for GUI-managed business dictionary categories', async () => {
    selectMock
      .mockImplementationOnce(() => mockSelectResult([{ id: 1, categoryCode: 'project_status' }]))
      .mockImplementationOnce(() => mockSelectResult([{ id: 2, category: 'project_status', code: 'project_status.lead' }]));
    updateMock
      .mockImplementationOnce(() => mockUpdateReturning())
      .mockImplementationOnce(() => mockUpdateReturning());

    const { POST } = await import('../../../src/app/api/dictionary/sync/route');
    const response = await POST(new NextRequest('http://localhost/api/dictionary/sync', {
      method: 'POST',
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      results: expect.arrayContaining([
        expect.stringContaining('分类 industry: 保留业务 GUI 维护，跳过配置覆盖'),
        expect.stringContaining('分类 industry: 保留业务 GUI 维护，跳过字典项覆盖'),
      ]),
      stats: {
        categories: { updated: 1 },
        items: { updated: 1 },
      },
    });
    expect(updateMock).toHaveBeenCalledTimes(2);
  });

  it('blocks importing dedicated master data categories through the dictionary import route', async () => {
    const { POST } = await import('../../../src/app/api/dictionary/import/route');
    const response = await POST(new NextRequest('http://localhost/api/dictionary/import', {
      method: 'POST',
      body: JSON.stringify({
        data: [
          {
            category: {
              code: 'project_type',
              name: '项目类型',
            },
            items: [
              { code: 'consulting', name: '咨询' },
            ],
          },
        ],
      }),
      headers: { 'content-type': 'application/json' },
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      results: {
        categories: {
          skipped: 1,
        },
        items: {
          created: 0,
          updated: 0,
        },
        errors: [
          expect.stringContaining('project_type'),
        ],
      },
    });
    expect(selectMock).not.toHaveBeenCalled();
    expect(insertMock).not.toHaveBeenCalled();
  });
});