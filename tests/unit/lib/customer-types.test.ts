import { beforeEach, describe, expect, it, vi } from 'vitest';

const limitMock = vi.fn();
const whereMock = vi.fn(() => ({ limit: limitMock }));
const fromMock = vi.fn(() => ({ where: whereMock }));
const selectMock = vi.fn(() => ({ from: fromMock }));

vi.mock('@/db', () => ({
  db: {
    select: selectMock,
  },
}));

vi.mock('@/db/schema', () => ({
  customerTypes: {
    id: 'customerTypes.id',
    code: 'customerTypes.code',
    name: 'customerTypes.name',
    deletedAt: 'customerTypes.deletedAt',
  },
}));

vi.mock('drizzle-orm', () => ({
  and: vi.fn((...args: unknown[]) => ({ type: 'and', args })),
  eq: vi.fn((...args: unknown[]) => ({ type: 'eq', args })),
  isNull: vi.fn((value: unknown) => ({ type: 'isNull', value })),
  sql: vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => ({ type: 'sql', strings, values })),
}));

describe('customer type helpers', () => {
  beforeEach(() => {
    vi.resetModules();
    selectMock.mockClear();
    fromMock.mockClear();
    whereMock.mockClear();
    limitMock.mockReset();
  });

  it('maps customer type codes to current dictionary values', async () => {
    const { mapCustomerTypeCodeToDictValue } = await import('../../../src/lib/customer-types');

    expect(mapCustomerTypeCodeToDictValue('GOVERNMENT')).toBe('government');
    expect(mapCustomerTypeCodeToDictValue('UNIVERSITY')).toBe('university');
    expect(mapCustomerTypeCodeToDictValue('HIGHER_VOCATIONAL')).toBe('higher_vocational');
    expect(mapCustomerTypeCodeToDictValue('MILITARY_POLICE')).toBe('military_police');
    expect(mapCustomerTypeCodeToDictValue('')).toBe('');
  });

  it('resolves dictionary aliases to the canonical customer type row', async () => {
    limitMock.mockResolvedValueOnce([{ id: 2, code: 'GOVERNMENT', name: '政府' }]);

    const { resolveCustomerTypeRecord } = await import('../../../src/lib/customer-types');
    const record = await resolveCustomerTypeRecord('政府');

    expect(record).toEqual({ id: 2, code: 'GOVERNMENT', name: '政府' });
    expect(limitMock).toHaveBeenCalledTimes(1);
  });

  it('maps old aliases like finance and healthcare to the converged customer types', async () => {
    const { resolveCanonicalCustomerTypeCode, resolveCustomerTypeId } = await import('../../../src/lib/customer-types');

    expect(resolveCanonicalCustomerTypeCode('金融')).toBe('ENTERPRISE');
    expect(resolveCanonicalCustomerTypeCode('healthcare')).toBe('HOSPITAL');

    limitMock.mockResolvedValueOnce([{ id: 4, code: 'HOSPITAL', name: '医院' }]);

    const customerTypeId = await resolveCustomerTypeId('healthcare');

    expect(customerTypeId).toBe(4);
  });
});