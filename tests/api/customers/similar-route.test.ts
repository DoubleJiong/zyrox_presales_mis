import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const customersTable = {
  __table: 'customers',
  id: 'customers.id',
  customerId: 'customers.customerId',
  customerName: 'customers.customerName',
  customerTypeId: 'customers.customerTypeId',
  createdBy: 'customers.createdBy',
  region: 'customers.region',
  contactName: 'customers.contactName',
  updatedAt: 'customers.updatedAt',
  deletedAt: 'customers.deletedAt',
};

const customerTypesTable = { __table: 'customer_types', id: 'customer_types.id', name: 'customer_types.name', code: 'customer_types.code' };
const usersTable = { __table: 'users', id: 'users.id', realName: 'users.realName' };
const projectsTable = { __table: 'projects', id: 'projects.id' };

let similarCustomerRows: any[];

vi.mock('@/lib/auth-middleware', () => ({
  withAuth: (handler: (req: NextRequest, context: { userId: number; user?: any }) => Promise<Response>) => {
    return (req: NextRequest) => handler(req, { userId: 7, user: { roleCode: 'admin' } });
  },
}));

vi.mock('@/lib/api-response', () => ({
  successResponse: (data: unknown, options?: { status?: number }) => NextResponse.json({ success: true, data }, { status: options?.status ?? 200 }),
  errorResponse: (code: string, message: string, options?: { status?: number }) => NextResponse.json({ success: false, error: { code, message } }, { status: options?.status ?? 500 }),
  validatePagination: () => ({ valid: true, page: 1, pageSize: 20 }),
}));

vi.mock('@/lib/permissions/data-scope', () => ({
  getPermissionContext: vi.fn(async () => ({ dataPermission: { scope: 'all' } })),
  buildScopeCondition: vi.fn(() => null),
}));

vi.mock('@/lib/permissions/middleware', () => ({
  hasFullAccess: vi.fn(() => true),
}));

vi.mock('@/lib/xss', () => ({
  sanitizeString: (value: string) => value,
  containsHtml: () => false,
  isValidEmail: () => true,
  isValidPhone: () => true,
  sanitizeSearchString: (value: string) => value,
}));

vi.mock('@/lib/customer-types', () => ({
  mapCustomerTypeCodeToDictValue: (value: string) => value,
  resolveCustomerTypeId: vi.fn(async () => null),
}));

vi.mock('@/lib/utils', () => ({
  formatDateField: (value: string | Date | null) => {
    if (value instanceof Date) {
      return value.toISOString();
    }
    return value;
  },
}));

vi.mock('@/db/schema', () => ({
  customers: customersTable,
  customerTypes: customerTypesTable,
  users: usersTable,
  projects: projectsTable,
}));

vi.mock('drizzle-orm', () => ({
  asc: vi.fn(() => 'asc'),
  desc: vi.fn(() => 'desc'),
  eq: vi.fn(() => 'eq'),
  sql: vi.fn((strings: TemplateStringsArray) => strings.join('')),
  count: vi.fn(() => 'count'),
  and: vi.fn(() => 'and'),
  or: vi.fn(() => 'or'),
  isNull: vi.fn(() => 'isNull'),
  lt: vi.fn(() => 'lt'),
}));

vi.mock('@/db', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        leftJoin: vi.fn(() => ({
          leftJoin: vi.fn(() => ({
            where: vi.fn(() => ({
              orderBy: vi.fn(() => ({
                limit: vi.fn(async () => similarCustomerRows),
              })),
            })),
          })),
        })),
      })),
    })),
  },
}));

describe('customers route similar query', () => {
  beforeEach(() => {
    similarCustomerRows = [
      {
        id: 12,
        customerId: 'CUST012',
        customerName: '杭州数智科技',
        customerTypeName: '制造',
        customerTypeCode: 'manufacturing',
        region: '杭州市',
        contactName: '王敏',
        updatedAt: new Date('2026-04-11T09:00:00Z'),
      },
      {
        id: 13,
        customerId: 'CUST013',
        customerName: '杭州数智科技有限公司',
        customerTypeName: '制造',
        customerTypeCode: 'manufacturing',
        region: '杭州市',
        contactName: '李雷',
        updatedAt: new Date('2026-04-12T09:00:00Z'),
      },
      {
        id: 14,
        customerId: 'CUST014',
        customerName: '完全无关客户',
        customerTypeName: '零售',
        customerTypeCode: 'retail',
        region: '上海市',
        contactName: '韩梅梅',
        updatedAt: new Date('2026-04-10T09:00:00Z'),
      },
    ];
    vi.resetModules();
  });

  it('returns exact and similar candidates ordered by match strength', async () => {
    const { GET } = await import('../../../src/app/api/customers/route');

    const response = await GET(new NextRequest('http://localhost/api/customers?similarTo=杭州数智科技有限公司&excludeId=12&similarLimit=5'));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.customers).toHaveLength(2);
    expect(payload.data.customers.map((customer: any) => customer.id).sort((left: number, right: number) => left - right)).toEqual([12, 13]);
    expect(payload.data.customers.every((customer: any) => customer.matchType === 'exact')).toBe(true);
  });
});