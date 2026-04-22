import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const orderByMock = vi.fn(async () => [
  { id: 1, value: 'software', name: '软件', description: null },
  { id: 2, value: 'integration', name: '集成', description: null },
]);
const selectWhere = vi.fn(() => ({ orderBy: orderByMock }));
const selectFrom = vi.fn(() => ({ where: selectWhere }));
const selectMock = vi.fn(() => ({ from: selectFrom }));
const returningMock = vi.fn(async () => [{ id: 5, value: 'saas', name: 'SaaS', description: null }]);
const insertValues = vi.fn(() => ({ returning: returningMock }));
const insertMock = vi.fn(() => ({ values: insertValues }));

vi.mock('@/db', () => ({
  db: {
    select: selectMock,
    insert: insertMock,
  },
}));

vi.mock('@/db/schema', () => ({
  attributes: {
    id: 'attrs.id', category: 'attrs.category', value: 'attrs.value',
    name: 'attrs.name', description: 'attrs.desc', status: 'attrs.status',
    isSystem: 'attrs.isSystem', sortOrder: 'attrs.sortOrder', deletedAt: 'attrs.deletedAt',
    code: 'attrs.code',
  },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  and: vi.fn(),
  isNull: vi.fn(),
  asc: vi.fn(),
}));

vi.mock('@/lib/auth-middleware', () => ({
  withAuth: (handler: (req: NextRequest, context: { userId: number }) => Promise<Response>) =>
    (req: NextRequest) => handler(req, { userId: 1 }),
}));

vi.mock('@/lib/api-response', () => ({
  successResponse: (data: unknown) =>
    new Response(JSON.stringify({ success: true, data }), { status: 200, headers: { 'content-type': 'application/json' } }),
  errorResponse: (code: string, msg: string, opts?: { status?: number }) =>
    new Response(JSON.stringify({ success: false, error: { code, message: msg } }), { status: opts?.status ?? 500 }),
}));

describe('/api/project-types', () => {
  beforeEach(() => {
    vi.resetModules();
    selectMock.mockClear();
    selectFrom.mockClear();
    insertMock.mockClear();
  });

  it('GET returns project type list', async () => {
    const { GET } = await import('../../../src/app/api/project-types/route');
    const response = await GET(new NextRequest('http://localhost/api/project-types'));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data[0]).toMatchObject({ id: 1, code: 'software', name: '软件' });
  });

  it('POST validates required fields and creates a project type', async () => {
    const { POST } = await import('../../../src/app/api/project-types/route');
    const response = await POST(
      new NextRequest('http://localhost/api/project-types', {
        method: 'POST',
        body: JSON.stringify({ code: 'saas', name: 'SaaS' }),
        headers: { 'content-type': 'application/json' },
      })
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data).toMatchObject({ id: 5, code: 'saas', name: 'SaaS' });
    expect(insertValues).toHaveBeenCalledWith(expect.objectContaining({ value: 'saas', name: 'SaaS', category: 'project_type' }));
  });

  it('POST returns 500 when required fields are missing', async () => {
    const { POST } = await import('../../../src/app/api/project-types/route');
    const response = await POST(
      new NextRequest('http://localhost/api/project-types', {
        method: 'POST',
        body: JSON.stringify({ code: '' }),
        headers: { 'content-type': 'application/json' },
      })
    );
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.success).toBe(false);
  });
});
